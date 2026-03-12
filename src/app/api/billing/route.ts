import { NextResponse } from 'next/server';
import { requireAuthAndSubscription } from '@/lib/api-auth';
import { billingProviderBodySchema, validate, validationErrorResponse } from '@/lib/schemas';
import { encrypt } from '@/lib/crypto';
import { logError } from '@/lib/logger';

export async function GET() {
  const auth = await requireAuthAndSubscription();
  if (!auth.ok) return auth.response;
  const { supabase, orgId } = auth;

  // Select credentials_encrypted only to derive hasCredentials; never expose to client
  const { data } = await supabase
    .from('billing_providers')
    .select('id, provider, seller_name, credentials_encrypted')
    .eq('org_id', orgId)
    .maybeSingle();

  return NextResponse.json({
    orgId,
    provider: data?.provider ?? null,
    sellerName: data?.seller_name ?? null,
    hasCredentials: !!data?.credentials_encrypted,
  });
}

export async function POST(request: Request) {
  const auth = await requireAuthAndSubscription();
  if (!auth.ok) return auth.response;
  const { supabase, orgId } = auth;

  const raw = await request.json().catch(() => ({}));
  const parsed = validate(billingProviderBodySchema, raw);
  if (!parsed.success) return validationErrorResponse(parsed);
  const body = parsed.data;

  const credentials: Record<string, string> = {};
  if (body.provider === 'billingo' && body.apiKey) credentials.apiKey = body.apiKey;
  if (body.provider === 'szamlazz') {
    if (body.agentKey) credentials.agentKey = body.agentKey;
    else if (body.username && body.password) {
      credentials.username = body.username;
      credentials.password = body.password;
    }
  }

  // Encrypt credentials before storing
  let encryptedCredentials: string | undefined;
  if (Object.keys(credentials).length) {
    try {
      encryptedCredentials = await encrypt(JSON.stringify(credentials));
    } catch (err) {
      logError(err, { step: 'encrypt_billing_credentials', orgId });
      return NextResponse.json({ error: 'Encryption not configured' }, { status: 500 });
    }
  }

  const updatePayload: Record<string, unknown> = {
    org_id: orgId,
    provider: body.provider,
    seller_name: body.sellerName || null,
    seller_tax_number: body.sellerTaxNumber || null,
    seller_bank_account: body.sellerBankAccount || null,
    updated_at: new Date().toISOString(),
  };

  if (encryptedCredentials !== undefined) {
    updatePayload.credentials_encrypted = encryptedCredentials;
  }

  const { error: upsertError } = await supabase
    .from('billing_providers')
    .upsert(updatePayload, { onConflict: 'org_id' });

  if (upsertError) {
    logError(upsertError, { step: 'upsert_billing', orgId });
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
