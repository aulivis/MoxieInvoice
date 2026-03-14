'use client';

import { useTranslations } from 'next-intl';
import { BillingProviderForm } from '@/components/BillingProviderForm';
import { HelpAccordion } from '@/components/onboarding/HelpAccordion';
import { FormStep } from '@/components/onboarding/FormStep';

interface BillingStepProps {
  hasSubscription: boolean;
  billingConfigured: boolean;
  onNext: () => void;
  onBack: () => void;
}

export function BillingHelpPanel() {
  const t = useTranslations('onboarding');
  const helpItems = [
    {
      question: t('billingHelpBillingo'),
      answer: t('billingHelpBillingoText'),
      imageSrc: '/onboarding/billingo-api-key.png',
      imageAlt: t('billingHelpBillingo'),
      imageType: 'image' as const,
    },
    {
      question: t('billingHelpSzamlazz'),
      answer: t('billingHelpSzamlazzText'),
      imageSrc: '/onboarding/szamlazz-agent-key.png',
      imageAlt: t('billingHelpSzamlazz'),
      imageType: 'image' as const,
    },
  ];
  return <HelpAccordion items={helpItems} />;
}

export function BillingStep({ hasSubscription, billingConfigured, onNext, onBack }: BillingStepProps) {
  const t = useTranslations('onboarding');

  return (
    <FormStep
      titleKey="billingTitle"
      descriptionKey="billingDesc"
      initialConfigured={billingConfigured}
      savedMessageKey="billingSavedNext"
      onBack={onBack}
      onNext={onNext}
      footerNote={
        <>
          <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {t('billingAdvancedSettings')}
        </>
      }
    >
      {({ onSaved }) => (
        <BillingProviderForm hasSubscription={hasSubscription} onSaved={onSaved} wizardMode />
      )}
    </FormStep>
  );
}
