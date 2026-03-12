'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

export function RestoredToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations('deleteAccount');
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (searchParams.get('restored') === '1') {
      setShow(true);
      const url = new URL(window.location.href);
      url.searchParams.delete('restored');
      window.history.replaceState(null, '', url.pathname + url.search);
      const tid = setTimeout(() => setShow(false), 6000);
      return () => clearTimeout(tid);
    }
  }, [searchParams]);

  if (!show) return null;

  return (
    <div
      className="rounded-lg border border-status-success/50 bg-status-success/10 px-4 py-3 text-sm text-text-primary"
      role="status"
    >
      {t('restoredToast')}
    </div>
  );
}
