import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { markInvoicePaidAndNotifyMoxie } from '@/lib/invoices/sync-billingo-payments';
import { logError } from '@/lib/logger';

const WEBHOOK_LIMIT_PER_MIN = 60;

/** Számlázz.hu IPN source IPs (from 2025-08-01). See official docs. */
const SZAMLAZZ_IPN_WHITELIST = new Set([
  '3.73.214.98',
  '3.76.149.232',
  '18.153.156.51',
]);

const supabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );

/**
 * Számlázz.hu IPN (Instant Payment Notification): receive payment status updates.
 * POST body: application/x-www-form-urlencoded with szlahu_szamlaszam, etc.
 * Must return HTTP 200 OK on success so Számlázz.hu does not retry.
 * @see Official Számlázz.hu IPN documentation
 */
export async function POST(request: NextRequest) {
  const orgId = request.nextUrl.searchParams.get('org');
  if (!orgId) {
    return new NextResponse(null, { status: 200 });
  }

  const limit = checkRateLimit(`webhook-szamlazz-ipn:${orgId}`, WEBHOOK_LIMIT_PER_MIN);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many requests', retryAfter: limit.retryAfter },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    );
  }

  const clientIp = getClientIdentifier(request);
  if (!SZAMLAZZ_IPN_WHITELIST.has(clientIp)) {
    return new NextResponse(null, { status: 403 });
  }

  let body: Record<string, string> = {};
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/x-www-form-urlencoded')) {
    try {
      const formData = await request.formData();
      formData.forEach((value, key) => {
        body[key] = typeof value === 'string' ? value : value?.toString() ?? '';
      });
    } catch {
      // Malformed body; still return 200 to avoid retries
      return new NextResponse(null, { status: 200 });
    }
  }

  const szlahuSzamlaszam = (body.szlahu_szamlaszam ?? '').trim();
  if (!szlahuSzamlaszam) {
    return new NextResponse(null, { status: 200 });
  }

  const supabase = supabaseAdmin();

  const { data: billing } = await supabase
    .from('billing_providers')
    .select('id')
    .eq('org_id', orgId)
    .eq('provider', 'szamlazz')
    .maybeSingle();

  if (!billing) {
    return new NextResponse(null, { status: 200 });
  }

  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, org_id, moxie_invoice_id, total_amount, payload_snapshot, payment_status')
    .eq('org_id', orgId)
    .eq('provider', 'szamlazz')
    .eq('invoice_number', szlahuSzamlaszam)
    .maybeSingle();

  if (!invoice) {
    return new NextResponse(null, { status: 200 });
  }

  if (invoice.payment_status === 'paid') {
    return new NextResponse(null, { status: 200 });
  }

  try {
    await markInvoicePaidAndNotifyMoxie(supabase, {
      id: invoice.id,
      org_id: invoice.org_id,
      moxie_invoice_id: invoice.moxie_invoice_id,
      total_amount: invoice.total_amount,
      payload_snapshot: invoice.payload_snapshot,
    });
  } catch (err) {
    logError(err instanceof Error ? err : new Error(String(err)), {
      step: 'szamlazz_ipn_mark_paid',
      invoiceId: invoice.id,
      orgId,
    });
    // Still return 200 so Számlázz.hu does not retry; we can fix data via cron sync
    return new NextResponse(null, { status: 200 });
  }

  return new NextResponse(null, { status: 200 });
}
