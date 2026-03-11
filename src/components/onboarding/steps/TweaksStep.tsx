'use client';

import { useTranslations } from 'next-intl';
import { CurrencyForm } from '@/components/CurrencyForm';
import { ScheduleForm } from '@/components/ScheduleForm';
import { Button } from '@/components/ui/Button';

interface TweaksStepProps {
  hasSubscription: boolean;
  onNext: () => void;
  onBack: () => void;
}

export function TweaksStep({ hasSubscription, onNext, onBack }: TweaksStepProps) {
  const t = useTranslations('onboarding');

  return (
    <div className="flex-1 flex flex-col p-6 md:p-12 max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-text-primary mb-2">{t('tweaksTitle')}</h2>
        <p className="text-sm text-text-secondary">{t('tweaksDesc')}</p>
      </div>

      {/* Forms stacked */}
      <div className="space-y-4">
        <div className="bg-background-card rounded-xl border border-border-light p-6">
          <CurrencyForm hasSubscription={hasSubscription} />
        </div>
        <div className="bg-background-card rounded-xl border border-border-light p-6">
          <ScheduleForm hasSubscription={hasSubscription} />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3 mt-8 pt-4 border-t border-border-light">
        <Button variant="ghost" onClick={onBack}>
          ← {t('back')}
        </Button>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onNext} className="text-text-tertiary">
            {t('skipTweaks')}
          </Button>
          <Button variant="gradient" onClick={onNext}>
            {t('next')} →
          </Button>
        </div>
      </div>
    </div>
  );
}
