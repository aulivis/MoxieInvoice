import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { hasActiveSubscription } from '@/lib/subscription';
import { fieldMappingBodySchema, validate, validationErrorResponse } from '@/lib/schemas';

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
    .from('moxie_field_mappings')
    .select('id, moxie_custom_field_key, provider, provider_field, value_mapping')
    .eq('org_id', profile.organization_id);
  return NextResponse.json({ mappings: data ?? [] });
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
  const parsed = validate(fieldMappingBodySchema, raw);
  if (!parsed.success) return validationErrorResponse(parsed);
  const body = parsed.data;

  await supabase.from('moxie_field_mappings').upsert(
    {
      org_id: profile.organization_id,
      moxie_custom_field_key: body.moxie_custom_field_key,
      provider: body.provider,
      provider_field: body.provider_field,
      value_mapping: body.value_mapping ?? {},
    },
    { onConflict: 'org_id,moxie_custom_field_key,provider_field' }
  );
  return NextResponse.json({ ok: true });
}
