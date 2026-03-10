/**
 * Shared auth helper for API routes that require authentication + active subscription.
 * Returns { ok: true, supabase, orgId } or { ok: false, response }.
 */

import { createClient } from '@/lib/supabase/server';
import { hasActiveSubscription } from '@/lib/subscription';
import type { SupabaseClient } from '@supabase/supabase-js';

const json = (body: object, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

type AuthSuccess = { ok: true; supabase: SupabaseClient; orgId: string };
type AuthFailure = { ok: false; response: Response };
export type AuthResult = AuthSuccess | AuthFailure;

export async function requireAuthAndSubscription(): Promise<AuthResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, response: json({ error: 'Unauthorized' }, 401) };

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile?.organization_id) {
    return { ok: false, response: json({ error: 'No organization' }, 400) };
  }

  const hasSub = await hasActiveSubscription(profile.organization_id);
  if (!hasSub) {
    return { ok: false, response: json({ error: 'Subscription required' }, 403) };
  }

  return { ok: true, supabase, orgId: profile.organization_id };
}
