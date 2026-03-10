'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { deleteInvoiceAction } from '@/app/actions/invoices';

interface DeleteInvoiceButtonProps {
  invoiceId: string;
  status: string;
}

export function DeleteInvoiceButton({ invoiceId, status }: DeleteInvoiceButtonProps) {
  const router = useRouter();
  const t = useTranslations('invoices');
  const [pending, setPending] = useState(false);

  if (status !== 'failed') return null;

  async function handleDelete() {
    if (pending) return;
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

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={pending}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-status-error hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded disabled:opacity-50"
      aria-label={t('deleteFailed')}
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
      {pending ? t('deleting') : t('delete')}
    </button>
  );
}
