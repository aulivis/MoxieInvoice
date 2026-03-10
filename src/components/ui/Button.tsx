import { forwardRef } from 'react';
import { Spinner } from './Spinner';

const base =
  'inline-flex items-center justify-center gap-2 font-semibold rounded-lg min-h-[44px] text-base transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';

const variants = {
  primary:
    'bg-primary text-primary-foreground hover:bg-primary-hover hover:scale-[1.02] border-none',
  gradient:
    'bg-gradient-to-r from-primary to-[#E91E63] text-white hover:opacity-90 hover:scale-[1.02] border-none shadow-sm',
  secondary:
    'bg-background-card border border-border-medium text-text-primary hover:bg-background-hover',
  ghost:
    'bg-transparent text-text-secondary hover:bg-background-hover border-none',
  icon: 'w-9 h-9 min-h-[36px] min-w-[36px] p-0 bg-background-card border border-border-light text-text-primary hover:bg-background-hover',
  fab: 'w-14 h-14 min-h-[56px] min-w-[56px] rounded-full p-0 bg-primary text-primary-foreground shadow-fab hover:bg-primary-hover border-none',
};

const sizes = {
  sm: 'min-h-[36px] px-3 py-1.5 text-sm',
  md: 'min-h-[44px] px-5 py-2.5 text-base',
  lg: 'min-h-[48px] px-6 py-3 text-lg',
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', loading = false, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  )
);
Button.displayName = 'Button';
