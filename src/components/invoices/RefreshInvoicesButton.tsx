'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

type SyncResult = {
  ok: boolean;
  updated: number;
  moxieNotified: number;
  moxieErrors?: string[];
};

type FeedbackState =
  | { kind: 'none' }
  | { kind: 'success'; updated: number; moxieNotified: number }
  | { kind: 'warning'; updated: number; moxieErrors: string[] }
  | { kind: 'no_update' }
  | { kind: 'error'; message: string };

export function RefreshInvoicesButton() {
  const router = useRouter();
  const t = useTranslations('invoices');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>({ kind: 'none' });

  // Auto-clear feedback after 6 seconds
  useEffect(() => {
    if (feedback.kind === 'none') return;
    const id = setTimeout(() => setFeedback({ kind: 'none' }), 6000);
    return () => clearTimeout(id);
  }, [feedback]);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    setFeedback({ kind: 'none' });
    try {
      const res = await fetch('/api/invoices/sync-billingo-payments', { method: 'POST' });
      const data = (await res.json()) as SyncResult;

      if (!res.ok) {
        setFeedback({ kind: 'error', message: t('refreshError') });
      } else if (data.updated === 0) {
        setFeedback({ kind: 'no_update' });
      } else if (data.moxieErrors?.length) {
        setFeedback({ kind: 'warning', updated: data.updated, moxieErrors: data.moxieErrors });
      } else {
        setFeedback({ kind: 'success', updated: data.updated, moxieNotified: data.moxieNotified });
      }

      router.refresh();
    } catch {
      setFeedback({ kind: 'error', message: t('refreshError') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg border border-border-medium bg-background-card px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-background-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60 disabled:pointer-events-none"
        aria-label={t('refresh')}
      >
        <svg
          className={`w-4 h-4 shrink-0 ${loading ? 'animate-spin' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        {t('refresh')}
      </button>

      {/* Inline feedback */}
      {feedback.kind === 'no_update' && (
        <p className="text-xs text-text-tertiary animate-fade-in">{t('refreshNoUpdate')}</p>
      )}
      {feedback.kind === 'success' && (
        <p className="text-xs text-status-success animate-fade-in">
          {t('refreshSuccess', { updated: feedback.updated, moxieNotified: feedback.moxieNotified })}
        </p>
      )}
      {feedback.kind === 'warning' && (
        <div className="text-xs text-amber-600 animate-fade-in max-w-xs text-right">
          <p className="font-medium">{t('refreshMoxieWarning', { updated: feedback.updated })}</p>
          {feedback.moxieErrors.map((err, i) => (
            <p key={i} className="text-[11px] text-text-tertiary truncate" title={err}>{err}</p>
          ))}
        </div>
      )}
      {feedback.kind === 'error' && (
        <p className="text-xs text-status-error animate-fade-in">{feedback.message}</p>
      )}
    </div>
  );
}
