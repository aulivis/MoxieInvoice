'use client';

import type { WizardStep } from './StepIndicator';

interface StepProgressBarProps {
  steps: WizardStep[];
  currentStep: string;
  completedSteps: string[];
}

export function StepProgressBar({ steps, currentStep, completedSteps }: StepProgressBarProps) {
  const currentIndex = steps.findIndex((s) => s.id === currentStep);
  const doneCount = completedSteps.filter((s) => steps.some((step) => step.id === s)).length;
  const progress = steps.length > 1 ? (currentIndex / (steps.length - 1)) * 100 : 0;

  return (
    <div className="bg-background-card border-b border-border-light px-4 py-3">
      {/* Step name + fraction */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-text-primary">
          {steps[currentIndex]?.label ?? ''}
        </span>
        <span className="text-[11px] tabular-nums text-text-tertiary">
          {doneCount}/{steps.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative h-1.5 bg-border-light rounded-full overflow-hidden mb-2">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
          style={{
            width: `${Math.max(4, progress)}%`,
            background: 'linear-gradient(90deg, #C96E22, #F4A85C)',
          }}
        />
      </div>

      {/* Step dots */}
      <div className="flex items-center justify-between gap-1">
        {steps.map((step) => {
          const isDone = completedSteps.includes(step.id);
          const isActive = step.id === currentStep;

          let dotColor = 'bg-border-medium';
          if (isDone) dotColor = 'bg-emerald-500';
          else if (isActive) dotColor = 'bg-amber-500 scale-125';

          let labelColor = 'text-text-tertiary';
          if (isActive) labelColor = 'text-amber-600';
          else if (isDone) labelColor = 'text-emerald-600';

          return (
            <div key={step.id} className="flex flex-col items-center gap-1 flex-1">
              <span
                className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${dotColor}`}
                aria-hidden="true"
              />
              <span
                className={`text-[9px] font-medium text-center leading-tight truncate max-w-full ${labelColor}`}
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
