import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { markInvoicePaidAndNotifyMoxie } from '@/lib/invoices/sync-billingo-payments';

const supabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );

const WEBHOOK_LIMIT_PER_MIN = 120;

/**
 * Billingo webhook: receive payment status updates (e.g. document paid).
 * When Billingo sends a "paid" signal for a document, we update the invoice's payment_status
 * and notify Moxie via applyPayment (Payment received) so Moxie stays in sync.
 *
 * Body: { document_id: number } or { document_id: number, payment_status: 'paid' }
 * We find the invoice by external_id = String(document_id), set payment_status = 'paid',
 * then call Moxie POST /action/payment/create if the invoice has moxie_invoice_id.
 */
export async function POST(request: NextRequest) {
  const id = getClientIdentifier(request);
  const limit = checkRateLimit(`webhook-billingo:${id}`, WEBHOOK_LIMIT_PER_MIN);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many requests', retryAfter: limit.retryAfter },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    );
  }

  let body: { document_id?: number; payment_status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const documentId = body?.document_id;
  if (documentId == null || typeof documentId !== 'number') {
    return NextResponse.json(
      { error: 'Missing or invalid document_id' },
      { status: 400 }
    );
  }

  const paymentStatus = 'paid';
  const externalId = String(documentId);

  const supabase = supabaseAdmin();
  const { data: invoice, error: findErr } = await supabase
    .from('invoices')
    .select('id, org_id, moxie_invoice_id, total_amount, payment_status, payload_snapshot')
    .eq('external_id', externalId)
    .maybeSingle();

  if (findErr) {
    return NextResponse.json(
      { error: 'Database error', details: findErr.message },
      { status: 500 }
    );
  }

  if (!invoice) {
    return NextResponse.json(
      { received: true, updated: false, reason: 'Invoice not found for document_id' },
      { status: 200 }
    );
  }

  if (invoice.payment_status === 'paid') {
    return NextResponse.json(
      { received: true, updated: false, reason: 'Already paid' },
      { status: 200 }
    );
  }

  let moxieNotified = false;
  try {
    const result = await markInvoicePaidAndNotifyMoxie(supabase, invoice);
    moxieNotified = result.moxieNotified;
  } catch (err) {
    return NextResponse.json(
      { error: 'Update failed', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }

  return NextResponse.json({
    received: true,
    updated: true,
    invoice_id: invoice.id,
    payment_status: paymentStatus,
    moxie_notified: moxieNotified,
  });
}
