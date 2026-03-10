import type { ReactNode } from 'react';
import { Badge } from './Badge';

const iconFailed = (
  <svg
    className="h-4 w-4 shrink-0"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);
const iconSuccess = (
  <svg
    className="h-4 w-4 shrink-0"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);
const iconSynced = (
  <svg
    className="h-4 w-4 shrink-0"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
);

export type InvoiceStatus =
  | 'failed'
  | 'created'
  | 'synced_to_moxie'
  | string;

export interface StatusCellProps {
  status: InvoiceStatus;
  label: ReactNode;
  className?: string;
  /** If true, render as Badge pill only (no icon). Default false for backward compatibility. */
  pillOnly?: boolean;
}

export function StatusCell({
  status,
  label,
  className = '',
  pillOnly = false,
}: StatusCellProps) {
  const isFailed = status === 'failed';
  const isCreated = status === 'created';
  const isSynced = status === 'synced_to_moxie';
  const icon = isFailed
    ? iconFailed
    : isSynced
      ? iconSynced
      : isCreated
        ? iconSuccess
        : null;

  const badgeVariant = isFailed ? 'red' : isSynced || isCreated ? 'green' : 'gray';

  if (pillOnly) {
    return (
      <Badge variant={badgeVariant} className={className}>
        {label}
      </Badge>
    );
  }

  const colorClass = isFailed
    ? 'text-status-error font-medium'
    : isSynced || isCreated
      ? 'text-status-success'
      : 'text-text-secondary';

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${colorClass} ${className}`}
    >
      {icon}
      <span>{label}</span>
    </span>
  );
}
