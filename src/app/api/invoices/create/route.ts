import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { hasActiveSubscription } from '@/lib/subscription';
import { createInvoice } from '@/lib/invoices/orchestrator';
import { mergeInvoiceRequestWithDefaults } from '@/lib/invoices/merge-defaults';
import { computeTotalAmount } from '@/lib/invoices/total-amount';
import { createInvoiceBodySchema, validate, validationErrorResponse } from '@/lib/schemas';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { decrypt } from '@/lib/crypto';

/** Decrypt billing credentials — handles both encrypted (new) and plain-object (legacy) formats. */
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

const INVOICE_CREATE_LIMIT_PER_MIN = 30;

export async function POST(request: Request) {
  const id = getClientIdentifier(request);
  const limit = checkRateLimit(`invoice-create:${id}`, INVOICE_CREATE_LIMIT_PER_MIN);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many requests', retryAfter: limit.retryAfter },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized', errorCode: 'unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile?.organization_id) {
    return NextResponse.json({ error: 'No organization', errorCode: 'noOrganization' }, { status: 400 });
  }

  const hasSub = await hasActiveSubscription(profile.organization_id);
  if (!hasSub) {
    return NextResponse.json({ error: 'Subscription required', errorCode: 'subscriptionRequired' }, { status: 403 });
  }

  const raw = await request.json().catch(() => ({}));
  const parsed = validate(createInvoiceBodySchema, raw);
  if (!parsed.success) return validationErrorResponse(parsed);
  const body = parsed.data;

  const { data: billing } = await supabase
    .from('billing_providers')
    .select('provider, credentials_encrypted')
    .eq('org_id', profile.organization_id)
    .maybeSingle();

  if (!billing?.credentials_encrypted) {
    return NextResponse.json(
      { error: 'Billing provider not configured. Set up Billingo or Számlázz.hu in Settings.', errorCode: 'billingNotConfigured' },
      { status: 400 }
    );
  }

  const { data: moxie } = await supabase
    .from('moxie_connections')
    .select('base_url, api_key_encrypted')
    .eq('org_id', profile.organization_id)
    .maybeSingle();

  const { data: orgSettings } = await supabase
    .from('org_settings')
    .select('default_invoice_block_id, default_invoice_language, default_payment_method')
    .eq('org_id', profile.organization_id)
    .maybeSingle();

  const mergedRequest = mergeInvoiceRequestWithDefaults(body.request, orgSettings ?? null);

  const locale = body.locale === 'en' ? 'en' : 'hu';
  const result = await createInvoice({
    orgId: profile.organization_id,
    provider: billing.provider,
    credentials: await decryptCredentials(billing.credentials_encrypted),
    request: mergedRequest,
    moxieBaseUrl: moxie?.base_url ?? undefined,
    moxieApiKey: moxie?.api_key_encrypted ? await decrypt(moxie.api_key_encrypted) : undefined,
    locale,
  });

  if (!result.success) {
    const totalAmount = computeTotalAmount(mergedRequest);
    await supabase.from('invoices').insert({
      org_id: profile.organization_id,
      provider: billing.provider,
      status: 'failed',
      error_message: result.errorMessage,
      total_amount: totalAmount,
      payload_snapshot: mergedRequest as unknown as Record<string, unknown>,
    });
    return NextResponse.json(
      { error: result.errorMessage, success: false },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    invoiceId: result.invoiceId,
    invoiceNumber: result.invoiceNumber,
    pdfUrl: result.pdfUrl,
  });
}
