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

  const { data: current } = await supabase
    .from('org_settings')
    .select('*')
    .eq('org_id', profile.organization_id)
    .maybeSingle();

  const payload: Record<string, unknown> = {
    org_id: profile.organization_id,
    ...(current ?? {}),
    updated_at: new Date().toISOString(),
    // Ensure NOT NULL columns when creating a new row (no existing org_settings)
    ...(current == null
      ? {
          currency_convert_to_huf: false,
          schedule_type: 'always',
          timezone: 'Europe/Budapest',
        }
      : {}),
  };
  if (body.currency_convert_to_huf !== undefined) payload.currency_convert_to_huf = body.currency_convert_to_huf;
  if (body.conversion_source !== undefined) payload.conversion_source = body.conversion_source;
  if (body.fixed_eur_huf_rate !== undefined) payload.fixed_eur_huf_rate = body.fixed_eur_huf_rate;
  if (body.schedule_type !== undefined) payload.schedule_type = body.schedule_type;
  if (body.timezone !== undefined) payload.timezone = body.timezone;
  if (body.start_time !== undefined) payload.start_time = body.start_time;
  if (body.end_time !== undefined) payload.end_time = body.end_time;
  if (body.default_invoice_block_id !== undefined) payload.default_invoice_block_id = body.default_invoice_block_id;
  if (body.default_invoice_language !== undefined) payload.default_invoice_language = body.default_invoice_language;
  if (body.default_payment_method !== undefined) payload.default_payment_method = body.default_payment_method;

  await supabase.from('org_settings').upsert(payload as Record<string, never>, { onConflict: 'org_id' });
  return NextResponse.json({ ok: true });
}
