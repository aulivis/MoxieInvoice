'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

type Identity = { provider: string };

function CheckIcon() {
  return (
    <svg className="w-4 h-4 shrink-0 text-status-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function SignInMethods() {
  const [identities, setIdentities] = useState<Identity[]>([]);
  const t = useTranslations('settings');

  useEffect(() => {
    fetch('/api/auth/identities', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { identities: [] }))
      .then((d) => setIdentities(d.identities ?? []))
      .catch(() => setIdentities([]));
  }, []);

  function label(provider: string): string {
    if (provider === 'email') return t('emailMagicLink');
    if (provider === 'google') return t('googleProvider');
    return provider;
  }

  if (identities.length === 0) return null;

  return (
    <div className="mb-4">
      <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">
        {t('signInMethods')}
      </p>
      <ul className="space-y-2 rounded-lg border border-border-light bg-background-card p-3">
        {identities.map((id) => (
          <li
            key={id.provider}
            className="flex items-center justify-between gap-2 text-sm text-text-primary"
          >
            <span>{label(id.provider)}</span>
            <span className="flex items-center gap-1.5 text-text-tertiary" aria-hidden>
              <CheckIcon />
              <span className="text-xs">{t('connected')}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
