'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

export function RefreshInvoicesButton() {
  const router = useRouter();
  const t = useTranslations('invoices');
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await fetch('/api/invoices/sync-billingo-payments', { method: 'POST' });
    } finally {
      setLoading(false);
      router.refresh();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-lg border border-border-medium bg-background-card px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-background-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60 disabled:pointer-events-none"
      aria-label={t('refresh')}
    >
      <svg
        className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      {t('refresh')}
    </button>
  );
}
