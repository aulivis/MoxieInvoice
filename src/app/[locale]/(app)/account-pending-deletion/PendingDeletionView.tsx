'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

interface PendingDeletionViewProps {
  withinGracePeriod: boolean;
  deletionDeadline: string;
}

export function PendingDeletionView({
  withinGracePeriod,
  deletionDeadline,
}: PendingDeletionViewProps) {
  const t = useTranslations('deleteAccount');
  const tErrors = useTranslations('deleteAccountErrors');
  const router = useRouter();
  const [loading, setLoading] = useState<'restore' | 'signout' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRestore() {
    setError(null);
    setLoading('restore');
    try {
      const res = await fetch('/api/account/cancel-deletion', {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.errorCode === 'restoreExpired') {
          setError(tErrors('restoreExpired'));
          return;
        }
        setError(data.error || tErrors('restoreFailed'));
        return;
      }
      router.replace('/dashboard?restored=1');
      router.refresh();
    } catch {
      setError(tErrors('restoreFailed'));
    } finally {
      setLoading(null);
    }
  }

  async function handleSignOut() {
    setLoading('signout');
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/login');
  }

  if (!withinGracePeriod) {
    return (
      <div className="rounded-xl border border-border-medium bg-background-card p-6 text-center">
        <h1 className="text-xl font-semibold text-text-primary">
          {tErrors('restoreExpired')}
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          {t('pendingDescription')}
        </p>
        <Button
          type="button"
          variant="secondary"
          className="mt-6"
          onClick={handleSignOut}
          disabled={!!loading}
        >
          {loading === 'signout' ? <Spinner size="sm" /> : t('signOut')}
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border-medium bg-background-card p-6">
      <h1 className="text-xl font-semibold text-text-primary">
        {t('pendingTitle')}
      </h1>
      <p className="mt-2 text-sm text-text-secondary">
        {t('pendingDescription')}
      </p>
      <p className="mt-2 text-xs text-text-tertiary">
        {t('deadline')}: {new Date(deletionDeadline).toLocaleString()}
      </p>
      {error && (
        <p className="mt-3 text-sm text-status-error" role="alert">
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        <Button
          type="button"
          variant="primary"
          onClick={handleRestore}
          disabled={!!loading}
        >
          {loading === 'restore' ? <Spinner size="sm" /> : t('restoreAccount')}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={handleSignOut}
          disabled={!!loading}
        >
          {loading === 'signout' ? <Spinner size="sm" /> : t('signOut')}
        </Button>
      </div>
    </div>
  );
}
