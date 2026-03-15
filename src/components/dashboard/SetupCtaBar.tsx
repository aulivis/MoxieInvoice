'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { OnboardingBookingDialog } from '@/components/OnboardingBookingDialog';

interface SetupStepProps {
  done: boolean;
  label: string;
  href: string;
  ariaLabelDone: string;
  ariaLabelMissing: string;
}

function SetupStep({
  done,
  label,
  href,
  ariaLabelDone,
  ariaLabelMissing,
}: SetupStepProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 group outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
    >
      {done ? (
        <span
          className="flex items-center justify-center w-5 h-5 rounded-full bg-status-success shrink-0"
          aria-label={ariaLabelDone}
        >
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </span>
      ) : (
        <span
          className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-border-medium shrink-0"
          aria-label={ariaLabelMissing}
        />
      )}
      <span
        className={`text-sm ${done ? 'text-text-tertiary line-through' : 'text-text-primary group-hover:text-primary transition-colors'}`}
      >
        {label}
      </span>
    </Link>
  );
}

interface SetupCtaBarProps {
  hasSubscription: boolean;
  moxieConnected: boolean;
  billingConfigured: boolean;
}

export function SetupCtaBar({ hasSubscription, moxieConnected, billingConfigured }: SetupCtaBarProps) {
  const t = useTranslations('dashboard');
  const [bookingOpen, setBookingOpen] = useState(false);

  const anyStepDone = hasSubscription || moxieConnected || billingConfigured;

  return (
    <>
      <div className="opacity-0 animate-fade-up">
        <div
          className="bg-background-card border rounded-xl p-5 animate-setup-glow"
          style={{
            borderColor: 'rgba(232,137,58,0.35)',
            background: 'linear-gradient(135deg, rgba(232,137,58,0.04) 0%, rgba(255,255,255,1) 60%)',
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Icon */}
            <div
              className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
              style={{ background: 'rgba(232,137,58,0.12)' }}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="#E8893A"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary">{t('setupGuideTitle')}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                <SetupStep
                  done={hasSubscription}
                  label={t('setupStep1')}
                  href="/onboarding?step=subscription"
                  ariaLabelDone={t('ariaStepDone')}
                  ariaLabelMissing={t('ariaStepMissing')}
                />
                <SetupStep
                  done={moxieConnected}
                  label={t('setupStep2')}
                  href="/onboarding?step=moxie"
                  ariaLabelDone={t('ariaStepDone')}
                  ariaLabelMissing={t('ariaStepMissing')}
                />
                <SetupStep
                  done={billingConfigured}
                  label={t('setupStep3')}
                  href="/onboarding?step=billing"
                  ariaLabelDone={t('ariaStepDone')}
                  ariaLabelMissing={t('ariaStepMissing')}
                />
              </div>
            </div>

            {/* CTAs: primary + secondary */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setBookingOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-text-secondary bg-background-card border border-border-medium hover:bg-background-hover hover:text-text-primary transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none"
              >
                <svg
                  className="w-4 h-4 shrink-0 text-amber-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                {t('helpUsSetYouUp')}
              </button>
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none"
                style={{ background: 'linear-gradient(135deg, #C96E22 0%, #F4A85C 100%)' }}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {t(anyStepDone ? 'wizardCtaContinue' : 'wizardCta')}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <OnboardingBookingDialog open={bookingOpen} onClose={() => setBookingOpen(false)} />
    </>
  );
}
