'use client';

export type StepStatus = 'done' | 'active' | 'pending';

export interface WizardStep {
  id: string;
  label: string;
}

interface StepIndicatorProps {
  steps: WizardStep[];
  currentStep: string;
  completedSteps: string[];
}

function CheckIcon() {
  return (
    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function StepIndicator({ steps, currentStep, completedSteps }: StepIndicatorProps) {
  return (
    <nav aria-label="Setup progress" className="space-y-1">
      {steps.map((step, i) => {
        const isDone = completedSteps.includes(step.id);
        const isActive = step.id === currentStep;
        const status: StepStatus = isDone ? 'done' : isActive ? 'active' : 'pending';

        return (
          <div key={step.id} className="flex items-center gap-3 py-2">
            {/* Step number / check */}
            <span
              className={[
                'flex items-center justify-center w-7 h-7 rounded-full shrink-0 text-xs font-bold transition-all duration-200',
                status === 'done'
                  ? 'bg-status-success'
                  : status === 'active'
                  ? 'bg-amber-500 shadow-lg shadow-amber-500/30'
                  : 'bg-white/10 text-white/40',
              ].join(' ')}
              aria-hidden
            >
              {status === 'done' ? (
                <CheckIcon />
              ) : (
                <span className={status === 'active' ? 'text-white' : 'text-white/40'}>
                  {i + 1}
                </span>
              )}
            </span>

            {/* Step label */}
            <span
              className={[
                'text-sm font-medium transition-colors duration-200',
                status === 'done'
                  ? 'text-white/50 line-through'
                  : status === 'active'
                  ? 'text-white'
                  : 'text-white/40',
              ].join(' ')}
            >
              {step.label}
            </span>

            {/* Active indicator dot */}
            {isActive && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" aria-hidden />
            )}
          </div>
        );
      })}
    </nav>
  );
}
