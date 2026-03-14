import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

type IdentityRow = {
  id: string;
  identity_id: string;
  user_id: string;
  provider: string;
  email?: string;
  isPrimary: boolean;
};

/**
 * Returns the current user's linked auth identities (e.g. email, google)
 * for display in Settings > Account > Sign-in methods.
 * Each identity includes id (for unlinkIdentity), provider, optional email, and isPrimary (first = primary).
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const raw = user.identities ?? [];
  const identities: IdentityRow[] = raw.map((id, index) => {
    const provider = id.provider ?? 'unknown';
    const identityData = id.identity_data as { email?: string } | undefined;
    const email = provider === 'email' ? user.email ?? identityData?.email : identityData?.email;
    const identityId = id.id ?? `${provider}-${index}`;
    return {
      id: identityId,
      identity_id: identityId,
      user_id: user.id,
      provider,
      email: email ?? undefined,
      isPrimary: index === 0,
    };
  });

  return NextResponse.json({ identities });
}
