'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { MoxieConnectionForm } from '@/components/MoxieConnectionForm';
import { HelpAccordion } from '@/components/onboarding/HelpAccordion';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';

interface MoxieStepProps {
  hasSubscription: boolean;
  moxieConnected: boolean;
  onNext: () => void;
  onBack: () => void;
}

export function MoxieHelpPanel() {
  const t = useTranslations('onboarding');
  const helpItems = [
    {
      question: t('moxieHelpBaseUrl'),
      answer: t('moxieHelpBaseUrlText'),
      imageSrc: '/onboarding/moxie-base-url.png',
      imageAlt: t('moxieHelpBaseUrl'),
      imageType: 'image' as const,
    },
    {
      question: t('moxieHelpApiKey'),
      answer: t('moxieHelpApiKeyText'),
      imageSrc: '/onboarding/moxie-api-key.png',
      imageAlt: t('moxieHelpApiKey'),
      imageType: 'image' as const,
    },
    {
      question: t('moxieHelpWebhook'),
      answer: t('moxieHelpWebhookText'),
      imageSrc: '/onboarding/moxie-webhook.gif',
      imageAlt: t('moxieHelpWebhook'),
      imageType: 'gif' as const,
    },
  ];
  return <HelpAccordion items={helpItems} />;
}

export function MoxieStep({ hasSubscription, moxieConnected, onNext, onBack }: MoxieStepProps) {
  const t = useTranslations('onboarding');
  const [savedThisSession, setSavedThisSession] = useState(false);
  const canAdvance = moxieConnected || savedThisSession;

  function handleSaved() {
    setSavedThisSession(true);
  }

  return (
    <div className="flex-1 flex flex-col p-6 md:p-8 w-full">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-text-primary mb-2">{t('moxieTitle')}</h2>
        <p className="text-sm text-text-secondary">{t('moxieDesc')}</p>
      </div>

      {/* Form */}
      <div className="bg-background-card rounded-xl border border-border-light p-6">
        <MoxieConnectionForm hasSubscription={hasSubscription} onSaved={handleSaved} />
      </div>

      {/* Saved feedback */}
      {savedThisSession && (
        <Alert variant="success" className="mt-4">{t('moxieSavedNext')}</Alert>
      )}

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
