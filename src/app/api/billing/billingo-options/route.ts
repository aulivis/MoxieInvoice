import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasActiveSubscription } from '@/lib/subscription';
import {
  BILLINGO_PAYMENT_METHODS,
  BILLINGO_LANGUAGES,
  BILLINGO_VAT_OPTIONS,
} from '@/lib/invoices/billingo';

/**
 * GET /api/billing/billingo-options
 * Returns Billingo-accepted values for payment method, language, and VAT
 * so the user can choose from these (same idea as billingo-blocks).
 * Only available when Billingo is configured for the org.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile?.organization_id) {
    return NextResponse.json({ error: 'No organization' }, { status: 400 });
  }

  const hasSub = await hasActiveSubscription(profile.organization_id);
  if (!hasSub) {
    return NextResponse.json({ error: 'Subscription required' }, { status: 403 });
  }

  const { data: billing } = await supabase
    .from('billing_providers')
    .select('provider')
    .eq('org_id', profile.organization_id)
    .maybeSingle();

  if (!billing || billing.provider !== 'billingo') {
    return NextResponse.json(
      {
        error: 'Billingo not configured',
        paymentMethods: [],
        languages: [],
        vat: [],
      },
      { status: 200 }
    );
  }

  return NextResponse.json({
    paymentMethods: BILLINGO_PAYMENT_METHODS.map((value) => ({
      value,
      label: value.replace(/_/g, ' '),
    })),
    languages: BILLINGO_LANGUAGES.map((value) => ({
      value,
      label: languageLabel(value),
    })),
    vat: BILLINGO_VAT_OPTIONS.map((value) => ({ value, label: value })),
  });
}

function languageLabel(code: string): string {
  const labels: Record<string, string> = {
    hu: 'Magyar',
    en: 'English',
    de: 'Deutsch',
    fr: 'Français',
    hr: 'Hrvatski',
    it: 'Italiano',
    ro: 'Română',
    sk: 'Slovenčina',
    us: 'English (US)',
  };
  return labels[code] ?? code;
}
