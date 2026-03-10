import type { ReactNode } from 'react';

const variants = {
  default:
    'bg-background-card rounded-xl border border-border-light shadow-card transition-shadow duration-200 hover:shadow-elevated',
  compact:
    'bg-background-card rounded-lg border border-border-light',
  elevated:
    'bg-background-elevated rounded-xl shadow-elevated border-none',
  gradient:
    'rounded-xl border-none bg-gradient-to-br from-primary to-[#EC407A] text-primary-foreground',
  metric:
    'bg-background-card rounded-xl border border-border-light shadow-stat',
  glass:
    'rounded-xl border border-white/20 bg-white/80 backdrop-blur-md shadow-elevated',
};

export interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  titleAction?: ReactNode;
  variant?: keyof typeof variants;
  contentClassName?: string;
}

export function Card({
  children,
  className = '',
  title,
  titleAction,
  variant = 'default',
  contentClassName,
}: CardProps) {
  const defaultContentClass =
    variant === 'compact' ? 'py-3 px-4' : 'p-5';
  const contentClass = contentClassName ?? defaultContentClass;

  return (
    <div className={`${variants[variant]} ${className}`}>
      {title && (
        <div className="border-b border-border-light px-5 py-3.5 rounded-t-xl flex items-center justify-between gap-3">
          <h2 className="text-section-title">{title}</h2>
          {titleAction && <div className="shrink-0">{titleAction}</div>}
        </div>
      )}
      <div className={contentClass}>{children}</div>
    </div>
  );
}
