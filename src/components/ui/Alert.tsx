import type { ReactNode } from 'react';

const styles = {
  success:
    'bg-success-muted border-status-success/30 text-status-success',
  error:
    'bg-error-muted border-status-error/30 text-status-error',
  warning:
    'bg-warning-muted border-status-warning/30 text-status-warning',
};

const icons = {
  success: (
    <svg
      className="h-5 w-5 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  ),
  error: (
    <svg
      className="h-5 w-5 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  ),
  warning: (
    <svg
      className="h-5 w-5 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  ),
};

export interface AlertProps {
  variant: 'success' | 'error' | 'warning';
  children: ReactNode;
  className?: string;
  role?: 'alert' | 'status';
}

export function Alert({
  variant,
  children,
  className = '',
  role = 'alert',
}: AlertProps) {
  return (
    <div
      role={role}
      className={`flex gap-3 rounded-lg border p-4 ${styles[variant]} ${className}`}
    >
      {icons[variant]}
      <div className="flex-1 text-sm font-medium">{children}</div>
    </div>
  );
}
