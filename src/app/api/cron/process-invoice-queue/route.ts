import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { isInvoicingAllowed } from '@/lib/schedule';
import { createInvoice } from '@/lib/invoices/orchestrator';
import { logError } from '@/lib/logger';
import { decrypt } from '@/lib/crypto';

function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_RETRIES = 3;

/**
 * Vercel Cron: process pending_invoice_jobs when schedule allows.
 * Secured with CRON_SECRET – always required, rejects if missing or wrong.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const now = new Date();
  const { data: jobs } = await supabase
    .from('pending_invoice_jobs')
    .select('id, org_id, payload, retry_count')
    .eq('status', 'pending')
    .or(`next_retry_at.is.null,next_retry_at.lte.${now.toISOString()}`)
    .limit(20);

  let processed = 0;
  for (const job of jobs ?? []) {
    const allowed = await isInvoicingAllowed(job.org_id, now);
    if (!allowed) continue;

    await supabase
      .from('pending_invoice_jobs')
      .update({ status: 'processing' })
      .eq('id', job.id);

    const payload = job.payload as { request: unknown; moxieInvoiceId?: string };
    const { data: billing } = await supabase
      .from('billing_providers')
      .select('provider, credentials_encrypted')
      .eq('org_id', job.org_id)
      .maybeSingle();
    const { data: moxie } = await supabase
      .from('moxie_connections')
      .select('base_url, api_key_encrypted')
      .eq('org_id', job.org_id)
      .maybeSingle();

    if (!billing?.credentials_encrypted) {
      await supabase
        .from('pending_invoice_jobs')
        .update({ status: 'failed', error_message: 'Billing not configured', processed_at: new Date().toISOString() })
        .eq('id', job.id);
      processed++;
      continue;
    }

    // Decrypt credentials
    let credentials: Record<string, unknown>;
    let moxieApiKey: string | undefined;
    try {
      const rawCreds = billing.credentials_encrypted;
      const decrypted = typeof rawCreds === 'string' ? await decrypt(rawCreds) : JSON.stringify(rawCreds);
      credentials = JSON.parse(decrypted) as Record<string, unknown>;
      moxieApiKey = moxie?.api_key_encrypted ? await decrypt(moxie.api_key_encrypted) : undefined;
    } catch (err) {
      logError(err, { jobId: job.id, step: 'decrypt_credentials' });
      await supabase
        .from('pending_invoice_jobs')
        .update({ status: 'failed', error_message: 'Failed to decrypt credentials', processed_at: new Date().toISOString() })
        .eq('id', job.id);
      processed++;
      continue;
    }

    const result = await createInvoice({
      orgId: job.org_id,
      provider: billing.provider,
      credentials,
      request: payload.request as Parameters<typeof createInvoice>[0]['request'],
      moxieInvoiceId: payload.moxieInvoiceId,
      moxieBaseUrl: moxie?.base_url,
      moxieApiKey,
      locale: 'hu',
      supabase,
    });

    if (result.success) {
      await supabase
        .from('pending_invoice_jobs')
        .update({ status: 'done', error_message: null, processed_at: new Date().toISOString() })
        .eq('id', job.id);
    } else {
      const retryCount = (job.retry_count ?? 0) + 1;
      if (retryCount < MAX_RETRIES) {
        // Exponential backoff: 2^retryCount minutes
        const backoffMs = Math.pow(2, retryCount) * 60 * 1000;
        const nextRetryAt = new Date(Date.now() + backoffMs).toISOString();
        await supabase
          .from('pending_invoice_jobs')
          .update({
            status: 'pending',
            retry_count: retryCount,
            next_retry_at: nextRetryAt,
            error_message: result.errorMessage,
          })
          .eq('id', job.id);
      } else {
        logError(new Error(result.errorMessage ?? 'Invoice creation failed'), { jobId: job.id, orgId: job.org_id });
        await supabase
          .from('pending_invoice_jobs')
          .update({
            status: 'failed',
            error_message: result.errorMessage,
            processed_at: new Date().toISOString(),
          })
          .eq('id', job.id);
      }
    }
    processed++;
  }

  return NextResponse.json({ processed });
}
