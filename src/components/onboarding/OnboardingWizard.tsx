'use client';

import { useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { WizardLayout } from './WizardLayout';
import { WelcomeStep } from './steps/WelcomeStep';
import { SubscriptionStep } from './steps/SubscriptionStep';
import { MoxieStep } from './steps/MoxieStep';
import { BillingStep } from './steps/BillingStep';
import { TweaksStep } from './steps/TweaksStep';
import { CompleteStep } from './steps/CompleteStep';

export type StepId = 'welcome' | 'subscription' | 'moxie' | 'billing' | 'tweaks' | 'complete';

interface OnboardingWizardProps {
  initialStep: StepId;
  hasSubscription: boolean;
  moxieConnected: boolean;
  billingConfigured: boolean;
}

const ALL_STEPS: StepId[] = ['welcome', 'subscription', 'moxie', 'billing', 'tweaks', 'complete'];

// Steps shown in the left panel (welcome and complete are not in the numbered list)
const PANEL_STEPS: StepId[] = ['subscription', 'moxie', 'billing', 'tweaks'];

function computeCompletedSteps(
  hasSubscription: boolean,
  moxieConnected: boolean,
  billingConfigured: boolean
): StepId[] {
  const completed: StepId[] = [];
  if (hasSubscription) completed.push('subscription');
  if (moxieConnected) completed.push('moxie');
  if (billingConfigured) completed.push('billing');
  return completed;
}

export function OnboardingWizard({
  initialStep,
  hasSubscription,
  moxieConnected,
  billingConfigured,
}: OnboardingWizardProps) {
  const t = useTranslations('onboarding');
  const router = useRouter();
  const searchParams = useSearchParams();

  // Derive current step from URL param, fallback to initialStep
  const stepParam = searchParams.get('step') as StepId | null;
  const currentStep: StepId =
    stepParam && ALL_STEPS.includes(stepParam) ? stepParam : initialStep;

  const completedSteps = computeCompletedSteps(hasSubscription, moxieConnected, billingConfigured);
  const allSetupDone = hasSubscription && moxieConnected && billingConfigured;

  // Navigate to a step via URL
  const goToStep = useCallback(
    (step: StepId) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('step', step);
      // Remove checkout param when navigating away from subscription
      if (step !== 'subscription') params.delete('checkout');
      router.push(`/onboarding?${params.toString()}`);
    },
    [router, searchParams]
  );

  // Handle Stripe checkout=success → auto advance from subscription
  useEffect(() => {
    const checkoutSuccess = searchParams.get('checkout') === 'success';
    if (checkoutSuccess && currentStep === 'subscription' && hasSubscription) {
      setTimeout(() => goToStep('moxie'), 1500);
    }
  }, [searchParams, currentStep, hasSubscription, goToStep]);

  const getNextStep = (current: StepId): StepId => {
    const idx = ALL_STEPS.indexOf(current);
    // Skip subscription if already has it
    if (current === 'welcome' && hasSubscription) return 'moxie';
    // Skip subscription if going forward and already has it
    if (current === 'subscription' && hasSubscription) return 'moxie';
    return ALL_STEPS[Math.min(idx + 1, ALL_STEPS.length - 1)];
  };

  const getPrevStep = (current: StepId): StepId => {
    const idx = ALL_STEPS.indexOf(current);
    if (current === 'moxie' && hasSubscription) return 'welcome';
    return ALL_STEPS[Math.max(idx - 1, 0)];
  };

  // Build wizard step list for sidebar panel
  const wizardSteps = PANEL_STEPS.map((id) => ({
    id,
    label: t(`step${id.charAt(0).toUpperCase() + id.slice(1)}` as Parameters<typeof t>[0]),
  }));

  // For the sidebar, use panel steps only; welcome/complete get no sidebar
  const showSidebar = currentStep !== 'welcome' && currentStep !== 'complete';

  // Panel steps completed
  const panelCompleted = completedSteps.filter((s) => PANEL_STEPS.includes(s));

  return (
    <WizardLayout
      steps={wizardSteps}
      currentStep={showSidebar ? currentStep : wizardSteps[0]?.id ?? 'subscription'}
      completedSteps={panelCompleted}
      showSkip={currentStep !== 'welcome' && currentStep !== 'complete'}
    >
      {currentStep === 'welcome' && (
        <WelcomeStep
          allSetupDone={allSetupDone}
          onNext={() => goToStep(getNextStep('welcome'))}
        />
      )}

      {currentStep === 'subscription' && (
        <SubscriptionStep
          hasSubscription={hasSubscription}
          onNext={() => goToStep(getNextStep('subscription'))}
          onBack={() => goToStep(getPrevStep('subscription'))}
        />
      )}

      {currentStep === 'moxie' && (
        <MoxieStep
          hasSubscription={hasSubscription}
          moxieConnected={moxieConnected}
          onNext={() => goToStep(getNextStep('moxie'))}
          onBack={() => goToStep(getPrevStep('moxie'))}
        />
      )}

      {currentStep === 'billing' && (
        <BillingStep
          hasSubscription={hasSubscription}
          billingConfigured={billingConfigured}
          onNext={() => goToStep(getNextStep('billing'))}
          onBack={() => goToStep(getPrevStep('billing'))}
        />
      )}

      {currentStep === 'tweaks' && (
        <TweaksStep
          hasSubscription={hasSubscription}
          onNext={() => goToStep('complete')}
          onBack={() => goToStep(getPrevStep('tweaks'))}
        />
      )}

      {currentStep === 'complete' && (
        <CompleteStep
          hasSubscription={hasSubscription}
          moxieConnected={moxieConnected}
          billingConfigured={billingConfigured}
        />
      )}
    </WizardLayout>
  );
}
