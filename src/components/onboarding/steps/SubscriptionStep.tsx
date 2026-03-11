'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { SubscriptionSection } from '@/components/SubscriptionSection';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';

interface SubscriptionStepProps {
  hasSubscription: boolean;
  onNext: () => void;
  onBack: () => void;
}

export function SubscriptionStep({ hasSubscription, onNext, onBack }: SubscriptionStepProps) {
  const t = useTranslations('onboarding');
  const searchParams = useSearchParams();
  const checkoutSuccess = searchParams.get('checkout') === 'success';

  // Auto-advance if already subscribed
  useEffect(() => {
    if (hasSubscription) {
      onNext();
    }
  }, [hasSubscription, onNext]);

  return (
    <div className="flex-1 flex flex-col p-6 md:p-12 max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-text-primary mb-2">{t('subscriptionTitle')}</h2>
        <p className="text-sm text-text-secondary">{t('subscriptionDesc')}</p>
      </div>

      {checkoutSuccess && (
        <Alert variant="success" className="mb-6">{t('subscriptionCheckoutSuccess')}</Alert>
      )}

      {/* Subscription section from settings */}
      <div className="bg-background-card rounded-xl border border-border-light p-6 mb-8">
        <SubscriptionSection returnTo="/onboarding?step=subscription" />
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3 mt-auto pt-4 border-t border-border-light">
        <Button variant="ghost" onClick={onBack}>
          ← {t('back')}
        </Button>
        {hasSubscription && (
          <Button variant="gradient" onClick={onNext}>
            {t('next')} →
          </Button>
        )}
      </div>
    </div>
  );
}
