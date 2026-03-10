import { forwardRef } from 'react';
import type { ReactNode } from 'react';

const inputBase =
  'w-full rounded-lg border border-border-medium bg-background-card px-3 py-2.5 text-base min-h-[44px] text-text-primary placeholder:text-text-disabled focus-visible:outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/10 transition-shadow duration-150 disabled:opacity-50 aria-invalid:border-status-error aria-invalid:ring-status-error/20';

const inputWithIcon = 'pl-10';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  optional?: boolean;
  leadingIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ id: idProp, label, error, optional, leadingIcon, className = '', ...props }, ref) => {
    const id =
      idProp ||
      props.name ||
      `input-${Math.random().toString(36).slice(2, 9)}`;
    const errorId = error ? `${id}-error` : undefined;
    return (
      <div className="space-y-1.5">
        <label
          htmlFor={id}
          className="block text-sm font-medium text-text-label"
        >
          {label}
          {optional && (
            <span className="ml-1 text-text-tertiary font-normal">(optional)</span>
          )}
        </label>
        <div className="relative">
          {leadingIcon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none">
              {leadingIcon}
            </span>
          )}
          <input
            ref={ref}
            id={id}
            aria-invalid={!!error}
            aria-describedby={errorId}
            className={`${inputBase} ${leadingIcon ? inputWithIcon : ''} ${className}`}
            {...props}
          />
        </div>
        {error && (
          <p
            id={errorId}
            className="text-sm text-status-error"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
