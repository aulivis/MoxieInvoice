'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { BillingProviderForm } from '@/components/BillingProviderForm';
import { HelpAccordion } from '@/components/onboarding/HelpAccordion';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';

interface BillingStepProps {
  hasSubscription: boolean;
  billingConfigured: boolean;
  onNext: () => void;
  onBack: () => void;
}

export function BillingStep({ hasSubscription, billingConfigured, onNext, onBack }: BillingStepProps) {
  const t = useTranslations('onboarding');
  const [savedThisSession, setSavedThisSession] = useState(false);
  const canAdvance = billingConfigured || savedThisSession;

  function handleSaved() {
    setSavedThisSession(true);
  }

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

  return (
    <div className="flex-1 flex flex-col p-6 md:p-12 max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-text-primary mb-2">{t('billingTitle')}</h2>
        <p className="text-sm text-text-secondary">{t('billingDesc')}</p>
      </div>

      {/* Form – wizardMode hides the Billingo defaults section */}
      <div className="bg-background-card rounded-xl border border-border-light p-6">
        <BillingProviderForm hasSubscription={hasSubscription} onSaved={handleSaved} wizardMode />
      </div>

      {/* Saved feedback */}
      {savedThisSession && (
        <Alert variant="success" className="mt-4">{t('billingSavedNext')}</Alert>
      )}

      {/* Advanced settings note */}
      <p className="text-xs text-text-tertiary mt-3 flex items-start gap-1.5">
        <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {t('billingAdvancedSettings')}
      </p>

      {/* Help accordion */}
      <HelpAccordion items={helpItems} />

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3 mt-8 pt-4 border-t border-border-light">
        <Button variant="ghost" onClick={onBack}>
          ← {t('back')}
        </Button>
        <Button
          variant={canAdvance ? 'gradient' : 'secondary'}
          onClick={onNext}
          disabled={!canAdvance}
        >
          {t('next')} →
        </Button>
      </div>
    </div>
  );
}
