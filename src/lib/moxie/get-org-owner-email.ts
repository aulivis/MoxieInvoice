import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Get the email of the org's "owner" (first profile by created_at) for Moxie task assignment.
 * Uses auth.admin.getUserById, so requires service role Supabase client.
 */
export async function getOrgOwnerEmail(
  supabase: SupabaseClient,
  orgId: string
): Promise<string | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!profile?.id) return null;

  const { data: userData } = await supabase.auth.admin.getUserById(profile.id);
  const email = userData?.user?.email?.trim();
  return email && email.length > 0 ? email : null;
}
