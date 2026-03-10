import { randomBytes } from 'node:crypto'; // randomBytes only (no cipher streams)
import { requireAuthAndSubscription } from '@/lib/api-auth';
import { moxieConnectionBodySchema, validate } from '@/lib/schemas';
import { encrypt } from '@/lib/crypto';
import { logError } from '@/lib/logger';

const json = (body: object, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export async function GET() {
  const auth = await requireAuthAndSubscription();
  if (!auth.ok) return auth.response;
  const { supabase, orgId } = auth;

  // Never select api_key_encrypted – do not expose to client
  const { data } = await supabase
    .from('moxie_connections')
    .select('id, base_url, last_tested_at, webhook_secret')
    .eq('org_id', orgId)
    .maybeSingle();

  const { data: keyRow } = await supabase
    .from('moxie_connections')
    .select('id')
    .eq('org_id', orgId)
    .not('api_key_encrypted', 'is', null)
    .maybeSingle();

  return json({
    connected: !!data,
    baseUrl: data?.base_url ?? '',
    hasApiKey: !!keyRow,
    lastTestedAt: data?.last_tested_at ?? null,
    organizationId: orgId,
    webhookSecret: data?.webhook_secret ?? null,
  });
}

export async function POST(request: Request) {
  const auth = await requireAuthAndSubscription();
  if (!auth.ok) return auth.response;
  const { supabase, orgId } = auth;

  const raw = await request.json().catch(() => ({}));
  const parsed = validate(moxieConnectionBodySchema, raw);
  if (!parsed.success) {
    return json({ error: parsed.error, details: parsed.details }, 400);
  }
  const { baseUrl, apiKey } = parsed.data;

  // Fetch existing record to preserve webhook_secret if already set
  const { data: existing } = await supabase
    .from('moxie_connections')
    .select('webhook_secret')
    .eq('org_id', orgId)
    .maybeSingle();

  const webhookSecret = existing?.webhook_secret ?? randomBytes(32).toString('hex');

  const updatePayload: Record<string, unknown> = {
    org_id: orgId,
    base_url: baseUrl,
    webhook_secret: webhookSecret,
    updated_at: new Date().toISOString(),
  };

  if (apiKey !== undefined) {
    const trimmed = apiKey.trim();
    if (trimmed) {
      try {
        updatePayload.api_key_encrypted = await encrypt(trimmed);
      } catch (err) {
        logError(err, { step: 'encrypt_moxie_api_key', orgId });
        return json({ error: 'Encryption not configured' }, 500);
      }
    } else {
      updatePayload.api_key_encrypted = null;
    }
  }

  const { error: upsertError } = await supabase
    .from('moxie_connections')
    .upsert(updatePayload, { onConflict: 'org_id' });

  if (upsertError) {
    logError(upsertError, { step: 'upsert_moxie_connection', orgId });
    return json({ error: upsertError.message }, 500);
  }

  return json({ ok: true });
}
