import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasActiveSubscription } from '@/lib/subscription';
import { decrypt } from '@/lib/crypto';
import { listBillingoBlocks } from '@/lib/invoices/billingo';

/** Decrypt billing credentials (encrypted string or legacy plain object). */
async function decryptCredentials(raw: unknown): Promise<Record<string, unknown>> {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(await decrypt(raw)) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return (raw ?? {}) as Record<string, unknown>;
}

/**
 * GET /api/billing/billingo-blocks
 * Returns list of Billingo document blocks (számlatömbök) for the current org.
 * Uses stored Billingo API key; only available when provider is billingo and credentials are set.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile?.organization_id) {
    return NextResponse.json({ error: 'No organization' }, { status: 400 });
  }

  const hasSub = await hasActiveSubscription(profile.organization_id);
  if (!hasSub) {
    return NextResponse.json({ error: 'Subscription required' }, { status: 403 });
  }

  const { data: billing } = await supabase
    .from('billing_providers')
    .select('provider, credentials_encrypted')
    .eq('org_id', profile.organization_id)
    .maybeSingle();

  if (!billing || billing.provider !== 'billingo' || !billing.credentials_encrypted) {
    return NextResponse.json(
      { errorCode: 'billingoNotConfigured', blocks: [], defaultBlockId: null },
      { status: 200 }
    );
  }

  const credentials = await decryptCredentials(billing.credentials_encrypted);
  const apiKey = credentials.apiKey ?? credentials.api_key;
  if (typeof apiKey !== 'string' || !apiKey) {
    return NextResponse.json(
      { errorCode: 'billingoApiKeyMissing', blocks: [], defaultBlockId: null },
      { status: 200 }
    );
  }

  try {
    const { blocks, defaultBlockId } = await listBillingoBlocks({ apiKey });
    return NextResponse.json({
      blocks: blocks.map((b) => ({ id: b.id, name: b.name ?? '', prefix: b.prefix ?? '' })),
      defaultBlockId: defaultBlockId ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: message, blocks: [], defaultBlockId: null },
      { status: 400 }
    );
  }
}
