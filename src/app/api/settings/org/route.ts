import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { hasActiveSubscription } from '@/lib/subscription';
import { rateLimitResponse } from '@/lib/rate-limit';

export async function GET(request: Request) {
  const rateLimited = rateLimitResponse(request, 'api-settings-org');
  if (rateLimited) return rateLimited;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile?.organization_id) return NextResponse.json({ error: 'No organization' }, { status: 400 });
  const hasSub = await hasActiveSubscription(profile.organization_id);
  if (!hasSub) return NextResponse.json({ error: 'Subscription required' }, { status: 403 });

  const { data } = await supabase
    .from('org_settings')
    .select('*')
    .eq('org_id', profile.organization_id)
    .maybeSingle();
  return NextResponse.json(data ?? {});
}
