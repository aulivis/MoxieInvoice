'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { deleteInvoiceAction } from '@/app/actions/invoices';

interface DeleteInvoiceButtonProps {
  invoiceId: string;
  status: string;
  iconOnly?: boolean;
}

export function DeleteInvoiceButton({ invoiceId, status, iconOnly = false }: DeleteInvoiceButtonProps) {
  const router = useRouter();
  const t = useTranslations('invoices');
  const [pending, setPending] = useState(false);
  const canDelete = status === 'failed';

  async function handleDelete() {
    if (pending || !canDelete) return;
    setPending(true);
    try {
      const result = await deleteInvoiceAction(null, invoiceId);
      if (result.success) {
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  const icon = (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );

  if (iconOnly) {
    return (
      <span className="inline-flex items-center justify-center min-h-[36px] min-w-[36px]">
        {canDelete ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            className="inline-flex items-center justify-center text-status-error hover:bg-error-muted/20 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
            aria-label={t('deleteFailed')}
            title={t('deleteFailed')}
          >
            {icon}
          </button>
        ) : (
          <span className="inline-flex items-center justify-center text-text-tertiary cursor-not-allowed" aria-hidden>
            {icon}
          </span>
        )}
      </span>
    );
  }

  if (!canDelete) return null;
    <button
      type="button"
      onClick={handleDelete}
      disabled={pending}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-status-error hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded disabled:opacity-50"
      aria-label={t('deleteFailed')}
    >
      {icon}
      {pending ? t('deleting') : t('delete')}
    </button>
  );
}
