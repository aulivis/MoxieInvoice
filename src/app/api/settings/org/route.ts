import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { hasActiveSubscription } from '@/lib/subscription';
import { orgSettingsBodySchema, validate, validationErrorResponse } from '@/lib/schemas';

export async function GET() {
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

export async function POST(request: Request) {
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

  const raw = await request.json().catch(() => ({}));
  const parsed = validate(orgSettingsBodySchema, raw);
  if (!parsed.success) return validationErrorResponse(parsed);
  const body = parsed.data;

  await supabase.from('org_settings').upsert(
    {
      org_id: profile.organization_id,
      currency_convert_to_huf: body.currency_convert_to_huf,
      conversion_source: body.conversion_source,
      fixed_eur_huf_rate: body.fixed_eur_huf_rate ?? undefined,
      schedule_type: body.schedule_type,
      timezone: body.timezone,
      start_time: body.start_time,
      end_time: body.end_time,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'org_id' }
  );
  return NextResponse.json({ ok: true });
}
