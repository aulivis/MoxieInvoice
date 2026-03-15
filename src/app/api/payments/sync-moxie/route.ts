import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { hasActiveSubscription } from '@/lib/subscription';
import { rateLimitResponse } from '@/lib/rate-limit';
import { createMoxieClient } from '@/lib/moxie/client';
import { syncPaymentBodySchema, validate, validationErrorResponse } from '@/lib/schemas';
import { decrypt } from '@/lib/crypto';

/**
 * Apply payment to Moxie (Billingo/Számlázz.hu → Moxie).
 * Body: { invoiceId (our DB id), amount, date, paymentType? }
 */
export async function POST(request: Request) {
  const rateLimited = rateLimitResponse(request, 'api-payments-sync-moxie');
  if (rateLimited) return rateLimited;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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

  const raw = await request.json().catch(() => ({}));
  const parsed = validate(syncPaymentBodySchema, raw);
  if (!parsed.success) return validationErrorResponse(parsed);
  const body = parsed.data;

  const { data: inv } = await supabase
    .from('invoices')
    .select('moxie_invoice_id, external_id')
    .eq('id', body.invoiceId)
    .eq('org_id', profile.organization_id)
    .maybeSingle();

  if (!inv?.moxie_invoice_id) {
    return NextResponse.json(
      { error: 'Invoice not linked to Moxie or not found' },
      { status: 400 }
    );
  }

  const { data: moxie } = await supabase
    .from('moxie_connections')
    .select('base_url, api_key_encrypted')
    .eq('org_id', profile.organization_id)
    .maybeSingle();

  if (!moxie?.base_url || !moxie?.api_key_encrypted) {
    return NextResponse.json({ error: 'Moxie not configured' }, { status: 400 });
  }

  try {
    const client = createMoxieClient(moxie.base_url, await decrypt(moxie.api_key_encrypted));
    await client.applyPayment({
      date: body.date || new Date().toISOString().slice(0, 10),
      amount: body.amount,
      invoiceNumber: inv.moxie_invoice_id,
      paymentType: body.paymentType || 'BANK_TRANSFER',
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
