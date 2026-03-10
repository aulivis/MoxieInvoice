'use client';

import { useTranslations } from 'next-intl';
import { Alert } from '@/components/ui/Alert';

export function SubscriptionGuard({
  children,
  hasSubscription,
}: {
  children: React.ReactNode;
  hasSubscription: boolean;
}) {
  const t = useTranslations('subscription');
  if (hasSubscription) return <>{children}</>;
  return (
    <div>
      <Alert variant="warning" className="mb-4">
        <div>
          <p className="font-medium text-text-primary">{t('guardTitle')}</p>
          <p className="mt-1 text-text-secondary">{t('guardMessage')}</p>
        </div>
      </Alert>
      {children}
    </div>
  );
}
