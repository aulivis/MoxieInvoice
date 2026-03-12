'use client';

type StepStatus = 'done' | 'active' | 'pending';

export interface WizardStep {
  id: string;
  label: string;
}

interface StepIndicatorProps {
  steps: WizardStep[];
  currentStep: string;
  completedSteps: string[];
}

function getIconClasses(status: StepStatus): string {
  switch (status) {
    case 'done':
      return 'bg-emerald-500';
    case 'active':
      return 'bg-amber-500 shadow-md shadow-amber-200';
    case 'pending':
      return 'bg-border-light';
  }
}

function getLabelClasses(status: StepStatus): string {
  switch (status) {
    case 'done':
      return 'text-text-tertiary line-through';
    case 'active':
      return 'text-text-primary font-semibold';
    case 'pending':
      return 'text-text-secondary';
  }
}

export function StepIndicator({ steps, currentStep, completedSteps }: StepIndicatorProps) {
  return (
    <nav aria-label="Setup progress">
      <ol className="space-y-0.5">
        {steps.map((step, i) => {
          const isDone = completedSteps.includes(step.id);
          const isActive = step.id === currentStep;
          const status: StepStatus = isDone ? 'done' : isActive ? 'active' : 'pending';

          return (
            <li key={step.id}>
              <div
                className={`flex items-center gap-3 px-2.5 py-2 rounded-lg transition-colors duration-150 ${isActive ? 'bg-amber-50' : ''}`}
              >
                {/* Icon */}
                <span
                  className={`flex items-center justify-center w-6 h-6 rounded-full shrink-0 text-[11px] font-bold transition-all duration-200 ${getIconClasses(status)}`}
                  aria-hidden="true"
                >
                  {status === 'done' ? (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className={status === 'active' ? 'text-white' : 'text-text-tertiary'}>
                      {i + 1}
                    </span>
                  )}
                </span>

                {/* Label */}
                <span
                  className={`text-sm transition-colors duration-150 leading-tight ${getLabelClasses(status)}`}
                >
                  {step.label}
                </span>

                {/* Active chevron */}
                {isActive && (
                  <svg
                    className="w-3.5 h-3.5 text-amber-500 ml-auto shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
