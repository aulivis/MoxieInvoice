'use client';

export interface ConnectionStatusBadgeProps {
  connected: boolean;
  connectedLabel: string;
  disconnectedLabel: string;
  /** Compact: dot + text inline (e.g. in sidebar). Default true. */
  compact?: boolean;
  /** When true, only the dot is shown (no label). Used in sidebar for "Csatlakoztatva". Default false. */
  dotOnly?: boolean;
  className?: string;
}

export function ConnectionStatusBadge({
  connected,
  connectedLabel,
  disconnectedLabel,
  compact = true,
  dotOnly = false,
  className = '',
}: ConnectionStatusBadgeProps) {
  const label = connected ? connectedLabel : disconnectedLabel;
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 text-xs font-medium
        ${connected ? 'text-emerald-600 dark:text-emerald-400' : 'text-text-secondary'}
        ${className}
      `}
      title={label}
      aria-label={label}
      role="status"
    >
      <span
        className={`
          shrink-0 w-1.5 h-1.5 rounded-full
          ${connected ? 'bg-emerald-400 animate-pulse-dot' : 'bg-text-disabled'}
        `}
      />
      {!dotOnly && compact ? <span>{label}</span> : null}
    </span>
  );
}
