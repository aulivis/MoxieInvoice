'use client';

export interface ConnectionStatusBadgeProps {
  connected: boolean;
  connectedLabel: string;
  disconnectedLabel: string;
  /** Compact: dot + text inline (e.g. in sidebar). Default true. */
  compact?: boolean;
  /** When true, only the dot is shown (no label). Used in sidebar for "Csatlakoztatva". Default false. */
  dotOnly?: boolean;
  /** When true and not connected, show red triangle exclamation instead of gray dot (e.g. setup incomplete). */
  hasWarning?: boolean;
  /** Label for warning state (tooltip/aria). Falls back to disconnectedLabel if not set. */
  warningLabel?: string;
  className?: string;
}

/** Red triangle with exclamation – same concept as Alert warning icon, for sidebar status. */
function WarningTriangleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

export function ConnectionStatusBadge({
  connected,
  connectedLabel,
  disconnectedLabel,
  compact = true,
  dotOnly = false,
  hasWarning = false,
  warningLabel,
  className = '',
}: ConnectionStatusBadgeProps) {
  const label = connected ? connectedLabel : (hasWarning ? (warningLabel ?? disconnectedLabel) : disconnectedLabel);
  const showWarningIcon = !connected && hasWarning;

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 text-xs font-medium
        ${connected ? 'text-emerald-600 dark:text-emerald-400' : showWarningIcon ? 'text-status-error' : 'text-text-secondary'}
        ${className}
      `}
      title={label}
      aria-label={label}
      role="status"
    >
      {connected ? (
        <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />
      ) : showWarningIcon ? (
        <WarningTriangleIcon className="shrink-0 w-[14px] h-[14px] text-status-error" />
      ) : (
        <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-text-disabled" />
      )}
      {!dotOnly && compact ? <span>{label}</span> : null}
    </span>
  );
}
