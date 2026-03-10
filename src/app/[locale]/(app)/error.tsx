'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('common');

  useEffect(() => {
    console.error('App error boundary:', error);
  }, [error]);

  return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center p-6">
      <h2 className="text-xl font-semibold text-status-error mb-2">
        {t('errorTitle')}
      </h2>
      <p className="text-text-secondary mb-4 text-center max-w-md">
        {error.message || t('errorFallback')}
      </p>
      <Button onClick={reset}>{t('tryAgain')}</Button>
    </div>
  );
}
