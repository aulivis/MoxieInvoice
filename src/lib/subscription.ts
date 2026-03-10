import { createClient } from '@/lib/supabase/server';

export async function hasActiveSubscription(orgId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('stripe_customers')
    .select('status')
    .eq('org_id', orgId)
    .maybeSingle();
  return data?.status === 'active' || data?.status === 'trialing';
}

export async function requireSubscription(orgId: string): Promise<boolean> {
  const ok = await hasActiveSubscription(orgId);
  return ok;
}
