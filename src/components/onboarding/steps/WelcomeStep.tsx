'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/Button';

interface WelcomeStepProps {
  allSetupDone: boolean;
  onNext: () => void;
}

function BrixaLogoMark({ size = 72 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 110 110" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect width="110" height="110" rx="28" fill="#1A2744"/>
      <path d="M22 75 L22 50 Q22 28 44 28 L55 28" stroke="white" strokeWidth="11" strokeLinecap="round" fill="none"/>
      <path d="M88 75 L88 50 Q88 28 66 28 L55 28" stroke="white" strokeOpacity="0.35" strokeWidth="11" strokeLinecap="round" fill="none"/>
      <line x1="30" y1="75" x2="80" y2="75" stroke="#E8893A" strokeWidth="9" strokeLinecap="round"/>
      <circle cx="55" cy="28" r="6" fill="#E8893A"/>
    </svg>
  );
}

export function WelcomeStep({ allSetupDone, onNext }: WelcomeStepProps) {
  const t = useTranslations('onboarding');

  const bullets = [
    t('welcomeBullet1'),
    t('welcomeBullet2'),
    t('welcomeBullet3'),
  ];

  return (
    <div className="flex-1 flex items-center justify-center p-6 md:p-12">
      <div className="w-full max-w-md animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }}>
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <BrixaLogoMark size={72} />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-text-primary text-center mb-3">
          {t('welcomeTitle')}
        </h1>
        <p className="text-sm text-text-secondary text-center mb-8 leading-relaxed">
          {t('welcomeSubtitle')}
        </p>

        {allSetupDone ? (
          /* All done – show summary */
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-status-success mb-3">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-green-800">{t('welcomeAlreadyDone')}</p>
            </div>
            <Link href="/" className="block">
              <Button variant="gradient" className="w-full">
                {t('welcomeViewDashboard')}
              </Button>
            </Link>
            <Link href="/settings" className="block">
              <Button variant="secondary" className="w-full">
                {t('welcomeViewSettings')}
              </Button>
            </Link>
          </div>
        ) : (
          /* Normal welcome */
          <div className="space-y-6">
            {/* What we'll set up */}
            <ul className="space-y-3">
              {bullets.map((bullet, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-text-secondary">
                  <span
                    className="flex items-center justify-center w-6 h-6 rounded-full shrink-0"
                    style={{ background: 'rgba(232,137,58,0.15)' }}
                    aria-hidden
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="#E8893A" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  {bullet}
                </li>
              ))}
            </ul>

            {/* Estimated time */}
            <div className="flex items-center gap-2 text-xs text-text-tertiary">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t('estimatedTime')}
            </div>

            <Button variant="gradient" className="w-full" onClick={onNext}>
              {t('welcomeCta')} →
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
