'use client';

import { useTranslations } from 'next-intl';
import { MoxieConnectionForm } from '@/components/MoxieConnectionForm';
import { HelpAccordion } from '@/components/onboarding/HelpAccordion';
import { FormStep } from '@/components/onboarding/FormStep';

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
  return (
    <FormStep
      titleKey="moxieTitle"
      descriptionKey="moxieDesc"
      initialConfigured={moxieConnected}
      savedMessageKey="moxieSavedNext"
      onBack={onBack}
      onNext={onNext}
    >
      {({ onSaved }) => (
        <MoxieConnectionForm hasSubscription={hasSubscription} onSaved={onSaved} />
      )}
    </FormStep>
  );
}
