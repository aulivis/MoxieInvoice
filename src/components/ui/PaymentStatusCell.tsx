import type { ReactNode } from 'react';

/** Same icon as StatusCell success (check in circle) — paid */
const iconPaid = (
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

/** Clock icon — open/pending */
const iconOpen = (
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
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

export interface PaymentStatusCellProps {
  paymentStatus: 'open' | 'paid';
  label: ReactNode;
  className?: string;
}

/**
 * Renders payment status with the same visual style as StatusCell:
 * same color tokens (status-success / status-warning), same icon size (h-4 w-4), same gap and layout.
 */
export function PaymentStatusCell({
  paymentStatus,
  label,
  className = '',
}: PaymentStatusCellProps) {
  const isPaid = paymentStatus === 'paid';
  const icon = isPaid ? iconPaid : iconOpen;
  const colorClass = isPaid ? 'text-status-success' : 'text-status-warning';

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${colorClass} ${className}`}
    >
      {icon}
      <span>{label}</span>
    </span>
  );
}
