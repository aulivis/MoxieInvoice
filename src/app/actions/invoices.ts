'use server';

import { createClient } from '@/lib/supabase/server';

export type DeleteInvoiceState = { error?: string; success?: boolean };

export async function deleteInvoiceAction(
  _prev: DeleteInvoiceState | null,
  invoiceId: string
): Promise<DeleteInvoiceState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile?.organization_id) return { error: 'No organization' };

  const { data: row, error: fetchErr } = await supabase
    .from('invoices')
    .select('id, status, org_id')
    .eq('id', invoiceId)
    .eq('org_id', profile.organization_id)
    .maybeSingle();

  if (fetchErr || !row) return { error: 'Invoice not found' };
  if (row.status !== 'failed') return { error: 'Only failed invoices can be deleted' };

  const { error: deleteErr } = await supabase.from('invoices').delete().eq('id', invoiceId);

  if (deleteErr) return { error: deleteErr.message };
  return { success: true };
}
