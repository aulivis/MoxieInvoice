import type { ReactNode } from 'react';

const pillVariants = {
  pink: 'bg-primary text-primary-foreground',
  red: 'bg-badge-red text-white',
  blue: 'bg-badge-blue text-white',
  green: 'bg-badge-green text-white',
  gray: 'bg-background-hover text-text-secondary',
  outline:
    'bg-transparent border border-border-medium text-text-secondary',
};

export interface BadgeProps {
  variant?: keyof typeof pillVariants;
  children: ReactNode;
  className?: string;
}

export function Badge({
  variant = 'gray',
  children,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center rounded-pill px-3 py-1 text-xs font-semibold leading-none
        ${pillVariants[variant]} ${className}
      `}
    >
      {children}
    </span>
  );
}
