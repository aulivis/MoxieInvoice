'use client';

import type { WizardStep } from './StepIndicator';

interface StepProgressBarProps {
  steps: WizardStep[];
  currentStep: string;
  completedSteps: string[];
}

export function StepProgressBar({ steps, currentStep, completedSteps }: StepProgressBarProps) {
  const currentIndex = steps.findIndex((s) => s.id === currentStep);
  const progress = steps.length > 1 ? (currentIndex / (steps.length - 1)) * 100 : 0;

  return (
    <div className="px-4 py-3 bg-background-card border-b border-border-light">
      {/* Progress bar */}
      <div className="relative h-1 bg-border-light rounded-full mb-3 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
          style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #C96E22, #F4A85C)',
          }}
        />
      </div>

      {/* Step dots */}
      <div className="flex items-center justify-between gap-1">
        {steps.map((step) => {
          const isDone = completedSteps.includes(step.id);
          const isActive = step.id === currentStep;

          return (
            <div key={step.id} className="flex flex-col items-center gap-1 flex-1">
              <span
                className={[
                  'w-2 h-2 rounded-full transition-all duration-200',
                  isDone
                    ? 'bg-status-success'
                    : isActive
                    ? 'bg-amber-500 scale-125'
                    : 'bg-border-medium',
                ].join(' ')}
                aria-hidden
              />
              <span
                className={[
                  'text-[10px] font-medium text-center leading-tight truncate max-w-full',
                  isActive ? 'text-amber-600' : isDone ? 'text-status-success' : 'text-text-tertiary',
                ].join(' ')}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
