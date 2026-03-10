import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/types/database';
import type { User } from '@supabase/supabase-js';

export async function getSession() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/** Use for server-side auth checks; validates token. Prefer over getSession() in protected routes. */
export async function getAuthenticatedUser(): Promise<User | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/** Single cached context for app layout: one client, user + profile + subscription. */
export const getAppLayoutContext = cache(async (): Promise<{
  user: User;
  profile: Profile;
  hasSubscription: boolean;
} | null> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  let { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.organization_id) {
    const { data: orgId, error } = await supabase.rpc('create_organization_for_user');
    if (error || !orgId) throw new Error(error?.message ?? 'Failed to create organization');
    const next = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    profile = next.data as Profile | null;
  }
  if (!profile) return null;

  const orgId = profile.organization_id;
  let hasSubscription = false;
  if (orgId) {
    const { data: sc } = await supabase
      .from('stripe_customers')
      .select('status')
      .eq('org_id', orgId)
      .maybeSingle();
    hasSubscription = sc?.status === 'active' || sc?.status === 'trialing';
  }

  return { user, profile: profile as Profile, hasSubscription };
});

/** Profile for current user; uses cached getAppLayoutContext when available. */
export async function getProfile(): Promise<Profile | null> {
  const ctx = await getAppLayoutContext();
  return ctx?.profile ?? null;
}

export async function ensureOrganizationAndProfile(userId: string) {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, organization_id')
    .eq('id', userId)
    .maybeSingle();

  if (profile?.organization_id)
    return { profile, orgId: profile.organization_id };

  const { data: orgId, error } = await supabase.rpc('create_organization_for_user');

  if (error || !orgId) {
    throw new Error(error?.message ?? 'Failed to create organization');
  }

  return { orgId };
}

export async function requireAuth(): Promise<{ user: User; profile: Profile } | null> {
  const ctx = await getAppLayoutContext();
  if (!ctx) return null;
  return { user: ctx.user, profile: ctx.profile };
}
