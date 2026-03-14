'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';

const isProduction = process.env.NODE_ENV === 'production';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('common');

  useEffect(() => {
    console.error('App error boundary:', error.message, error.digest ? `[digest: ${error.digest}]` : '');
  }, [error]);

  const message = isProduction
    ? t('errorFallback')
    : (error.message || t('errorFallback'));

  return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center p-6">
      <h2 className="text-xl font-semibold text-status-error mb-2">
        {t('errorTitle')}
      </h2>
      <p className="text-text-secondary mb-4 text-center max-w-md">
        {message}
      </p>
      <Button onClick={reset}>{t('tryAgain')}</Button>
    </div>
  );
}
