import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { syncBillingoPaymentsForOrg } from '@/lib/invoices/sync-billingo-payments';

/**
 * POST /api/invoices/sync-billingo-payments
 * Pull payment status from Billingo or Számlázz.hu for the current org's open invoices and update DB + Moxie.
 * Used by the Invoice list "Refresh" button.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.organization_id) {
    return NextResponse.json({ error: 'No organization' }, { status: 400 });
  }

  const { updated, moxieNotified, moxieErrors } = await syncBillingoPaymentsForOrg(
    profile.organization_id,
    supabase
  );

  return NextResponse.json({ ok: true, updated, moxieNotified, moxieErrors });
}
