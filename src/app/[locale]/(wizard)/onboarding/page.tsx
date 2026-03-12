import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getAppLayoutContext } from '@/lib/auth';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import type { StepId } from '@/components/onboarding/OnboardingWizard';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('onboarding');
  return { title: `${t('title')} – Brixa` };
}

export default async function OnboardingPage() {
  const ctx = await getAppLayoutContext();
  const orgId = ctx?.profile?.organization_id;
  const hasSubscription = ctx?.hasSubscription ?? false;

  // Fetch Moxie + Billing state
  let moxieConnected = false;
  let billingConfigured = false;

  if (orgId) {
    const supabase = await createClient();
    const [moxieResult, billingResult] = await Promise.all([
      supabase.from('moxie_connections').select('base_url').eq('org_id', orgId).maybeSingle(),
      supabase.from('billing_providers').select('provider').eq('org_id', orgId).maybeSingle(),
    ]);
    moxieConnected = !!moxieResult.data?.base_url;
    billingConfigured = !!billingResult.data?.provider;
  }

  // Smart initial step: land on the first incomplete step
  function computeInitialStep(): StepId {
    if (!hasSubscription) return 'subscription';
    if (!moxieConnected) return 'moxie';
    if (!billingConfigured) return 'billing';
    // All done → welcome shows "everything configured" state
    return 'welcome';
  }

  const initialStep = computeInitialStep();

  return (
    // Negative margins escape the AppShell's p-4 md:p-6 padding for full-bleed layout
    <div className="-m-4 md:-m-6 -mt-4 md:-mt-6">
      <OnboardingWizard
        initialStep={initialStep}
        hasSubscription={hasSubscription}
        moxieConnected={moxieConnected}
        billingConfigured={billingConfigured}
      />
    </div>
  );
}
