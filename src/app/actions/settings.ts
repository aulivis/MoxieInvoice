'use server';

import { createClient } from '@/lib/supabase/server';
import { hasActiveSubscription } from '@/lib/subscription';
import {
  moxieConnectionBodySchema,
  billingProviderBodySchema,
  currencySettingsSchema,
  scheduleSettingsSchema,
  validate,
} from '@/lib/schemas';

export type SettingsState = { error?: string; success?: boolean };

async function getOrgId(): Promise<{ orgId: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile?.organization_id) return { error: 'No organization' };
  const hasSub = await hasActiveSubscription(profile.organization_id);
  if (!hasSub) return { error: 'Subscription required' };
  return { orgId: profile.organization_id };
}

export async function saveMoxieConnectionAction(
  _prev: SettingsState | null,
  formData: FormData
): Promise<SettingsState> {
  const org = await getOrgId();
  if ('error' in org) return { error: org.error };
  const raw = {
    baseUrl: formData.get('baseUrl') ?? '',
    apiKey: formData.get('apiKey') || undefined,
  };
  const parsed = validate(moxieConnectionBodySchema, raw);
  if (!parsed.success) return { error: parsed.error };
  const supabase = await createClient();
  const { error } = await supabase.from('moxie_connections').upsert(
    {
      org_id: org.orgId,
      base_url: parsed.data.baseUrl,
      api_key_encrypted: parsed.data.apiKey?.trim() || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'org_id' }
  );
  if (error) return { error: error.message };
  return { success: true };
}

export async function saveBillingAction(
  _prev: SettingsState | null,
  formData: FormData
): Promise<SettingsState> {
  const org = await getOrgId();
  if ('error' in org) return { error: org.error };
  const raw = {
    provider: formData.get('provider') ?? 'billingo',
    apiKey: formData.get('apiKey') || undefined,
    agentKey: formData.get('agentKey') || undefined,
    username: formData.get('username') || undefined,
    password: formData.get('password') || undefined,
    sellerName: formData.get('sellerName') || undefined,
    sellerTaxNumber: formData.get('sellerTaxNumber') || undefined,
    sellerBankAccount: formData.get('sellerBankAccount') || undefined,
  };
  const parsed = validate(billingProviderBodySchema, raw);
  if (!parsed.success) return { error: parsed.error };
  const body = parsed.data;
  const credentials: Record<string, string> = {};
  if (body.provider === 'billingo' && body.apiKey) credentials.apiKey = body.apiKey;
  if (body.provider === 'szamlazz') {
    if (body.agentKey) credentials.agentKey = body.agentKey;
    else if (body.username && body.password) {
      credentials.username = body.username;
      credentials.password = body.password;
    }
  }
  const supabase = await createClient();
  await supabase.from('billing_providers').upsert(
    {
      org_id: org.orgId,
      provider: body.provider,
      credentials_encrypted: Object.keys(credentials).length ? credentials : undefined,
      seller_name: body.sellerName || null,
      seller_tax_number: body.sellerTaxNumber || null,
      seller_bank_account: body.sellerBankAccount || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'org_id' }
  );
  return { success: true };
}

export async function saveCurrencySettingsAction(
  _prev: SettingsState | null,
  formData: FormData
): Promise<SettingsState> {
  const org = await getOrgId();
  if ('error' in org) return { error: org.error };
  const raw = {
    conversion_source: formData.get('conversion_source') || undefined,
    manual_eur_huf: formData.get('manual_eur_huf') ? Number(formData.get('manual_eur_huf')) : undefined,
    manual_usd_huf: formData.get('manual_usd_huf') ? Number(formData.get('manual_usd_huf')) : undefined,
    manual_usd_eur: (() => {
      const v = formData.get('manual_usd_eur');
      if (v === null || v === '') return null;
      const n = Number(v);
      return Number.isNaN(n) ? null : n;
    })(),
  };
  const parsed = validate(currencySettingsSchema, raw);
  if (!parsed.success) return { error: parsed.error };
  const supabase = await createClient();
  const b = parsed.data;
  await supabase.from('org_settings').upsert(
    {
      org_id: org.orgId,
      conversion_source: b.conversion_source,
      manual_eur_huf: b.manual_eur_huf ?? undefined,
      manual_usd_huf: b.manual_usd_huf ?? undefined,
      manual_usd_eur: b.manual_usd_eur !== undefined ? b.manual_usd_eur : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'org_id' }
  );
  return { success: true };
}

export async function saveScheduleSettingsAction(
  _prev: SettingsState | null,
  formData: FormData
): Promise<SettingsState> {
  const org = await getOrgId();
  if ('error' in org) return { error: org.error };
  const raw = {
    schedule_type: formData.get('schedule_type') || undefined,
    timezone: formData.get('timezone') || undefined,
    start_time: formData.get('start_time') || undefined,
    end_time: formData.get('end_time') || undefined,
  };
  const parsed = validate(scheduleSettingsSchema, raw);
  if (!parsed.success) return { error: parsed.error };
  const supabase = await createClient();
  const b = parsed.data;
  await supabase.from('org_settings').upsert(
    {
      org_id: org.orgId,
      schedule_type: b.schedule_type,
      timezone: b.timezone,
      start_time: b.start_time,
      end_time: b.end_time,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'org_id' }
  );
  return { success: true };
}
