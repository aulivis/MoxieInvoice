'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { StepIndicator } from './StepIndicator';
import { StepProgressBar } from './StepProgressBar';
import type { WizardStep } from './StepIndicator';

interface WizardLayoutProps {
  steps: WizardStep[];
  currentStep: string;
  completedSteps: string[];
  children: React.ReactNode;
  showSkip?: boolean;
}

function BrixaLogoMark({ size = 40 }: { size?: number }) {
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

export function WizardLayout({ steps, currentStep, completedSteps, children, showSkip = true }: WizardLayoutProps) {
  const t = useTranslations('onboarding');
  const router = useRouter();

  const currentIndex = steps.findIndex((s) => s.id === currentStep);
  const totalVisible = steps.length;

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* ── Mobile progress bar (hidden on md+) ── */}
      <div className="md:hidden">
        <StepProgressBar steps={steps} currentStep={currentStep} completedSteps={completedSteps} />
      </div>

      {/* ── Left panel – navy (desktop only) ── */}
      <div
        className="hidden md:flex md:w-[40%] shrink-0 flex-col justify-between p-10 xl:p-14"
        style={{ background: 'linear-gradient(160deg, #0E1628 0%, #1A2744 60%, #2A3A5C 100%)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <BrixaLogoMark size={40} />
          <span
            className="font-extrabold text-xl tracking-tight text-white"
            style={{ fontFamily: "var(--font-syne), 'Syne', sans-serif" }}
          >
            Brixa
          </span>
        </div>

        {/* Steps tree */}
        <div className="flex-1 flex items-center py-12">
          <div className="w-full">
            <p className="text-xs font-semibold uppercase tracking-widest mb-5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {t('stepOf', { current: currentIndex + 1, total: totalVisible })}
            </p>
            <StepIndicator steps={steps} currentStep={currentStep} completedSteps={completedSteps} />
          </div>
        </div>

        {/* Estimated time */}
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {t('estimatedTime')}
        </p>
      </div>

      {/* ── Right panel – content ── */}
      <div className="flex-1 flex flex-col bg-surface-50 min-h-screen md:min-h-0">
        {/* Top bar: skip button */}
        {showSkip && (
          <div className="flex justify-end px-6 pt-5">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="flex items-center gap-1.5 text-sm text-text-tertiary hover:text-text-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              {t('skip')}
            </button>
          </div>
        )}

        {/* Scrollable content area */}
        <div className="flex-1 flex flex-col">
          {children}
        </div>
      </div>
    </div>
  );
}
