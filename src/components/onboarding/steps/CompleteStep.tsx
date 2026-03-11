'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/Button';
import { ConfettiEffect } from '@/components/onboarding/ConfettiEffect';

interface CompleteStepProps {
  hasSubscription: boolean;
  moxieConnected: boolean;
  billingConfigured: boolean;
}

function AnimatedCheck({ delay = 0 }: { delay?: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <span
      className={`flex items-center justify-center w-6 h-6 rounded-full shrink-0 transition-all duration-300 ${
        visible ? 'bg-status-success scale-100 opacity-100' : 'bg-transparent scale-50 opacity-0'
      }`}
    >
      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
      </svg>
    </span>
  );
}

export function CompleteStep({ hasSubscription, moxieConnected, billingConfigured }: CompleteStepProps) {
  const t = useTranslations('onboarding');
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(true), 200);
    return () => clearTimeout(timer);
  }, []);

  const checks = [
    { label: t('completeCheckSubscription'), done: hasSubscription },
    { label: t('completeCheckMoxie'), done: moxieConnected },
    { label: t('completeCheckBilling'), done: billingConfigured },
  ];

  return (
    <>
      {showConfetti && <ConfettiEffect />}

      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md text-center animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }}>
          {/* Big amber gradient banner */}
          <div
            className="rounded-2xl p-8 mb-8 text-white"
            style={{ background: 'linear-gradient(135deg, #C96E22 0%, #F4A85C 100%)', boxShadow: '0 8px 32px rgba(232,137,58,0.35)' }}
          >
            {/* Animated checkmark */}
            <div className="flex justify-center mb-4">
              <span className="flex items-center justify-center w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </span>
            </div>

            <h2 className="text-2xl font-bold mb-2">{t('completeTitle')}</h2>
            <p className="text-sm text-white/80">{t('completeSubtitle')}</p>
          </div>

          {/* Status checklist */}
          <div className="bg-background-card rounded-xl border border-border-light p-5 mb-8 text-left">
            <ul className="space-y-3">
              {checks.map((check, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-text-primary">
                  <AnimatedCheck delay={300 + i * 150} />
                  {check.label}
                </li>
              ))}
            </ul>
          </div>

          {/* CTAs */}
          <div className="space-y-3">
            <Link href="/" className="block">
              <Button variant="gradient" className="w-full">
                {t('finish')} →
              </Button>
            </Link>
            <Link href="/settings" className="block">
              <Button variant="ghost" className="w-full text-text-secondary">
                {t('completeGoSettings')}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
