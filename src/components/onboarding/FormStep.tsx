'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';

export interface FormStepProps {
  /** Translation key for step title (onboarding namespace) */
  titleKey: string;
  /** Translation key for step description (onboarding namespace) */
  descriptionKey: string;
  /** Whether the step was already configured before this session (e.g. from API) */
  initialConfigured: boolean;
  /** Translation key for the "saved, you can continue" message (onboarding namespace) */
  savedMessageKey: string;
  /** Form content; receives onSaved callback to mark step as completed this session */
  children: (props: { onSaved: () => void }) => React.ReactNode;
  /** Optional note below the form (e.g. "Advanced settings in Settings → Billing") */
  footerNote?: React.ReactNode;
  onBack: () => void;
  onNext: () => void;
}

/**
 * Generic onboarding step: title, description, form card, saved feedback, back/next.
 * Used by BillingStep and MoxieStep to avoid duplication.
 */
export function FormStep({
  titleKey,
  descriptionKey,
  initialConfigured,
  savedMessageKey,
  children,
  footerNote,
  onBack,
  onNext,
}: FormStepProps) {
  const t = useTranslations('onboarding');
  const [savedThisSession, setSavedThisSession] = useState(false);
  const canAdvance = initialConfigured || savedThisSession;

  function handleSaved() {
    setSavedThisSession(true);
  }

  return (
    <div className="flex-1 flex flex-col p-6 md:p-8 w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-text-primary mb-2">{t(titleKey)}</h2>
        <p className="text-sm text-text-secondary">{t(descriptionKey)}</p>
      </div>

      <div className="bg-background-card rounded-xl border border-border-light p-6">
        {children({ onSaved: handleSaved })}
      </div>

      {savedThisSession && (
        <Alert variant="success" className="mt-4">{t(savedMessageKey)}</Alert>
      )}

      {footerNote && (
        <p className="text-xs text-text-tertiary mt-3 flex items-start gap-1.5">
          {footerNote}
        </p>
      )}

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
