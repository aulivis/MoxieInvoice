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

export function WizardLayout({ steps, currentStep, completedSteps, children, showSkip = true }: WizardLayoutProps) {
  const t = useTranslations('onboarding');
  const router = useRouter();

  const currentIndex = steps.findIndex((s) => s.id === currentStep);
  const activeStepLabel = steps[currentIndex]?.label ?? '';
  const doneCount = completedSteps.filter((s) => steps.some((step) => step.id === s)).length;
  // Progress expressed as 0-100, moves from first step (0%) to last (100%)
  const progress = steps.length > 1
    ? Math.round((currentIndex / (steps.length - 1)) * 100)
    : 0;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-surface-50">

      {/* ── Mobile progress bar (hidden on md+) ── */}
      <div className="md:hidden">
        <StepProgressBar steps={steps} currentStep={currentStep} completedSteps={completedSteps} />
      </div>

      {/* ── Left sidebar (desktop only, 260px) ── */}
      <aside className="hidden md:block md:w-[260px] shrink-0 border-r border-border-light bg-background-card/50">
        {/* Sticky inner so the card follows scroll */}
        <div className="sticky top-0 p-5 pt-8">

          {/* Progress card */}
          <div className="bg-background-card rounded-xl border border-border-light shadow-sm overflow-hidden">

            {/* ── Pill row ── */}
            <div className="flex items-center justify-center px-4 py-3 bg-surface-50 border-b border-border-light">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/70">
                <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t('estimatedTime')}
              </span>
            </div>

            {/* ── Progress section ── */}
            <div className="px-4 pt-4 pb-3 border-b border-border-light">
              {/* Labels */}
              <div className="flex items-baseline justify-between gap-2 mb-2.5">
                <span className="text-xs font-semibold text-text-primary truncate leading-tight">
                  {activeStepLabel || t('title')}
                </span>
                <span className="text-[11px] font-medium tabular-nums text-text-tertiary shrink-0">
                  {doneCount}<span className="mx-0.5 text-border-medium">/</span>{steps.length}
                </span>
              </div>

              {/* Bar */}
              <div className="relative h-1.5 bg-border-light rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${Math.max(4, progress)}%`,
                    background: 'linear-gradient(90deg, #C96E22, #F4A85C)',
                    boxShadow: '0 0 4px rgba(232,137,58,0.35)',
                  }}
                />
              </div>

              {/* Step tick marks aligned under the bar */}
              <div className="flex justify-between mt-1.5 px-px">
                {steps.map((step) => {
                  const isDone = completedSteps.includes(step.id);
                  const isActive = step.id === currentStep;

                  let dotColor = 'bg-border-medium';
                  if (isDone) dotColor = 'bg-emerald-500';
                  else if (isActive) dotColor = 'bg-amber-500';

                  return (
                    <span
                      key={step.id}
                      className={`w-1 h-1 rounded-full transition-colors duration-300 ${dotColor}`}
                      aria-hidden="true"
                    />
                  );
                })}
              </div>
            </div>

            {/* ── Steps list ── */}
            <div className="px-2 py-3">
              <StepIndicator
                steps={steps}
                currentStep={currentStep}
                completedSteps={completedSteps}
              />
            </div>
          </div>
        </div>
      </aside>

      {/* ── Right panel – main content ── */}
      <div className="flex-1 flex flex-col min-h-screen md:min-h-0 bg-surface-50">

        {/* Skip button top-right */}
        {showSkip && (
          <div className="flex justify-end px-6 pt-5">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-text-tertiary hover:text-text-secondary hover:bg-background-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              {t('skip')}
            </button>
          </div>
        )}

        {/* Page content */}
        <div className="flex-1 flex flex-col">
          {children}
        </div>
      </div>
    </div>
  );
}
