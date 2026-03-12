'use client';

import { useState, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';

const CONFIRM_TEXT_EN = 'DELETE';
const CONFIRM_TEXT_HU = 'TÖRÖL';

interface DeleteAccountDialogProps {
  open: boolean;
  onClose: () => void;
  hasSubscription: boolean;
}

export function DeleteAccountDialog({
  open,
  onClose,
  hasSubscription,
}: DeleteAccountDialogProps) {
  const t = useTranslations('deleteAccount');
  const tErrors = useTranslations('deleteAccountErrors');
  const locale = useLocale();
  const confirmText = locale === 'hu' ? CONFIRM_TEXT_HU : CONFIRM_TEXT_EN;
  const [step, setStep] = useState<1 | 2>(1);
  const [confirmInput, setConfirmInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const reset = useCallback(() => {
    setStep(1);
    setConfirmInput('');
    setError(null);
    setLoading(false);
  }, []);

  const handleClose = useCallback(() => {
    if (!loading) {
      reset();
      onClose();
    }
  }, [loading, onClose, reset]);

  async function handleRequestDeletion() {
    const trimmed = confirmInput.trim();
    if (trimmed !== confirmText) {
      setError(tErrors('invalidConfirm'));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/account/request-deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.errorCode === 'deletionAlreadyRequested') {
          setError(tErrors('alreadyRequested'));
          return;
        }
        setError(data.error || tErrors('requestFailed'));
        return;
      }
      const supabase = createClient();
      await supabase.auth.signOut();
      router.replace('/login?message=account_suspended');
    } catch {
      setError(tErrors('requestFailed'));
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-account-dialog-title"
    >
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md rounded-xl border border-border-medium bg-background-card shadow-card animate-fade-in">
        <div className="p-6">
          <h2
            id="delete-account-dialog-title"
            className="text-lg font-semibold text-text-primary"
          >
            {t('title')}
          </h2>

          {step === 1 && (
            <>
              <Alert variant="warning" className="mt-3">
                {t('step1Warning')}
              </Alert>
              <div className="mt-5 space-y-5">
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    {t('step1SectionImmediate')}
                  </h3>
                  <ul className="mt-2 list-outside list-disc space-y-2 pl-4 text-sm text-text-secondary">
                    <li>{t('subscriptionCancelled')}</li>
                    <li>{t('accountSuspended')}</li>
                  </ul>
                </section>
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    {t('step1SectionWithin14')}
                  </h3>
                  <p className="mt-2 text-sm text-text-secondary">
                    {t('restoreWithin14')}
                  </p>
                </section>
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    {t('step1SectionAfter14')}
                  </h3>
                  <p className="mt-2 text-sm text-text-secondary">
                    {t('deleteAfter14')}
                  </p>
                </section>
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    {t('step1SectionDataDeleted')}
                  </h3>
                  <p className="mt-2 text-sm text-text-secondary">
                    {t('dataDeleted')}
                  </p>
                </section>
              </div>
              <div className="mt-6 flex gap-3 justify-end">
                <Button type="button" variant="secondary" onClick={handleClose}>
                  {t('cancel')}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setStep(2)}
                  className="bg-status-error hover:bg-status-error/90"
                >
                  {t('understandContinue')}
                </Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="mt-3 text-sm text-text-secondary">
                {t('step2Title')}
              </p>
              <label
                htmlFor="delete-account-confirm-input"
                className="mt-4 block text-sm font-medium text-text-primary"
              >
                {t('typeToConfirm')}
              </label>
              <input
                id="delete-account-confirm-input"
                type="text"
                value={confirmInput}
                onChange={(e) => {
                  setConfirmInput(e.target.value);
                  setError(null);
                }}
                placeholder={t('confirmPlaceholder')}
                className="mt-2 w-full rounded-lg border border-border-medium bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label={t('confirmPlaceholder')}
                disabled={loading}
                autoFocus
              />
              {error && (
                <Alert variant="error" className="mt-3" role="alert">
                  {error}
                </Alert>
              )}
              <div className="mt-6 flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => { setStep(1); setError(null); }}
                  disabled={loading}
                >
                  {t('cancel')}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleRequestDeletion}
                  disabled={loading || confirmInput.trim() !== confirmText}
                  className="bg-status-error hover:bg-status-error/90"
                >
                  {loading ? (
                    <Spinner size="sm" />
                  ) : (
                    t('requestDeletion')
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
