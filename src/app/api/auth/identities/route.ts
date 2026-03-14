import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Returns the current user's linked auth identities (e.g. email, google)
 * for display in Settings > Account > Sign-in methods.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const identities = (user.identities ?? []).map((id) => ({
    provider: id.provider ?? 'unknown',
  }));

  return NextResponse.json({ identities });
}
