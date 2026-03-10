import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { syncBillingoPaymentsForOrg } from '@/lib/invoices/sync-billingo-payments';

/**
 * Vercel Cron: sync Billingo payment status for all orgs using Billingo.
 * Runs hourly. Secured with CRON_SECRET.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const supabase = createClient(url, key);

  const { data: rows } = await supabase
    .from('billing_providers')
    .select('org_id')
    .eq('provider', 'billingo')
    .not('credentials_encrypted', 'is', null);

  const orgIds = [...new Set((rows ?? []).map((r) => r.org_id))];

  let totalUpdated = 0;
  let totalMoxieNotified = 0;

  for (const orgId of orgIds) {
    const { updated, moxieNotified } = await syncBillingoPaymentsForOrg(orgId, supabase);
    totalUpdated += updated;
    totalMoxieNotified += moxieNotified;
  }

  return NextResponse.json({
    orgs: orgIds.length,
    updated: totalUpdated,
    moxieNotified: totalMoxieNotified,
  });
}
