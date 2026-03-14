'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { deleteInvoiceAction } from '@/app/actions/invoices';

interface DeleteInvoiceButtonProps {
  invoiceId: string;
  status: string;
  iconOnly?: boolean;
}

const CONFIRM_TIMEOUT_MS = 3000;

export function DeleteInvoiceButton({ invoiceId, iconOnly = false }: DeleteInvoiceButtonProps) {
  const router = useRouter();
  const t = useTranslations('invoices');
  const tCommon = useTranslations('common');
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  // Auto-dismiss confirming state after 3 seconds
  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), CONFIRM_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [confirming]);

  const handleDeleteConfirmed = useCallback(async () => {
    if (pending) return;
    setConfirming(false);
    setPending(true);
    try {
      const result = await deleteInvoiceAction(null, invoiceId);
      if (result.success) {
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }, [pending, invoiceId, router]);

  const trashIcon = (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );

  // Confirming state: pill pair [Delete] [×]
  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1 animate-fade-in">
        <button
          type="button"
          onClick={handleDeleteConfirmed}
          disabled={pending}
          className="inline-flex items-center h-7 px-2 rounded-md bg-status-error text-white text-xs font-semibold hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-error focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none transition-opacity"
          aria-label={t('deleteConfirm')}
        >
          {pending ? t('deleting') : t('deleteConfirm')}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="inline-flex items-center justify-center h-7 w-7 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 transition-colors"
          aria-label={tCommon('cancel')}
          title={tCommon('cancel')}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </span>
    );
  }

  // Icon-only default state (used in list rows)
  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={pending}
        className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] md:min-h-[36px] md:min-w-[36px] text-text-tertiary hover:text-status-error hover:bg-error-muted/20 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none transition-colors"
        aria-label={t('delete')}
        title={t('delete')}
      >
        {trashIcon}
      </button>
    );
  }

  // Full button (non-icon mode)
  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      disabled={pending}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-status-error hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded disabled:opacity-50 transition-colors"
      aria-label={t('delete')}
    >
      {trashIcon}
      {t('delete')}
    </button>
  );
}
