'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { defaultLocale } from '@/i18n/constants';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type Identity = {
  id: string;
  identity_id?: string;
  user_id?: string;
  provider: string;
  email?: string;
  isPrimary: boolean;
};

function CheckIcon() {
  return (
    <svg className="w-4 h-4 shrink-0 text-status-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function fetchIdentities(): Promise<Identity[]> {
  return fetch('/api/auth/identities', { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : { identities: [] }))
    .then((d) => d.identities ?? [])
    .catch(() => []);
}

export function SignInMethods() {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  const searchParams = useSearchParams();
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [addGoogleLoading, setAddGoogleLoading] = useState(false);
  const [addGoogleError, setAddGoogleError] = useState<string | null>(null);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const [linkExistingEmail, setLinkExistingEmail] = useState('');
  const [linkExistingLoading, setLinkExistingLoading] = useState(false);
  const [linkExistingError, setLinkExistingError] = useState<string | null>(null);
  const [linkExistingSent, setLinkExistingSent] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetchIdentities().then((list) => {
      setIdentities(list);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Toast from URL: linked=google or linked=existing
  useEffect(() => {
    const linked = searchParams.get('linked');
    if (linked === 'google') {
      setToast(t('linkGoogleSuccess'));
      const params = new URLSearchParams(window.location.search);
      params.delete('linked');
      const q = params.toString();
      window.history.replaceState(null, '', window.location.pathname + (q ? `?${q}` : ''));
    } else if (linked === 'existing') {
      setToast(t('linkExistingRemovedDuplicate'));
      const params = new URLSearchParams(window.location.search);
      params.delete('linked');
      const q = params.toString();
      window.history.replaceState(null, '', window.location.pathname + (q ? `?${q}` : ''));
    }
  }, [searchParams, t]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  function label(identity: Identity): string {
    if (identity.provider === 'email') {
      return identity.email ? `${t('emailMagicLink')} (${identity.email})` : t('emailMagicLink');
    }
    if (identity.provider === 'google') {
      return identity.email ? `${t('googleProvider')} (${identity.email})` : t('googleProvider');
    }
    return identity.provider;
  }

  function IconFor({ provider }: { provider: string }) {
    if (provider === 'google') return <GoogleIcon />;
    return <EmailIcon />;
  }

  async function handleAddGoogle() {
    setAddGoogleError(null);
    setAddGoogleLoading(true);
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL ?? '');
    const locale = typeof window !== 'undefined' && window.location.pathname.startsWith('/en') ? 'en' : defaultLocale;
    const nextPath = locale === defaultLocale ? '/settings?tab=account&linked=google' : `/${locale}/settings?tab=account&linked=google`;
    const redirectTo = `${baseUrl}/auth/callback`;
    const supabase = createClient();
    const { data, error } = await supabase.auth.linkIdentity({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: { next: nextPath },
      },
    });
    if (error) {
      setAddGoogleLoading(false);
      const msg = error.message || '';
      setAddGoogleError(msg.includes('already') || msg.includes('registered') ? t('linkGoogleAlreadyUsed') : error.message);
      return;
    }
    if (data?.url) {
      window.location.href = data.url;
    } else {
      setAddGoogleLoading(false);
    }
  }

  async function handleUnlink(identity: Identity) {
    const confirmMsg = identity.provider === 'google' ? t('removeLinkConfirmGoogle') : t('removeLinkConfirm');
    if (!window.confirm(confirmMsg)) return;
    setUnlinkingId(identity.id);
    const supabase = createClient();
    const { error } = await supabase.auth.unlinkIdentity({
      id: identity.id,
      identity_id: identity.identity_id ?? identity.id,
      user_id: identity.user_id ?? '',
      provider: identity.provider,
    });
    setUnlinkingId(null);
    if (error) {
      setToast(error.message || tCommon('error'));
      return;
    }
    load();
  }

  async function handleLinkExistingSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLinkExistingError(null);
    const email = linkExistingEmail.trim();
    if (!email) return;
    setLinkExistingLoading(true);
    try {
      const res = await fetch('/api/auth/link-existing-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLinkExistingError(data.error === 'no_account' ? t('linkExistingNoAccount') : (data.error || tCommon('error')));
        setLinkExistingLoading(false);
        return;
      }
      setLinkExistingSent(true);
      setLinkExistingEmail('');
    } catch {
      setLinkExistingError(tCommon('error'));
    }
    setLinkExistingLoading(false);
  }

  const hasGoogle = identities.some((i) => i.provider === 'google');
  const onlyGoogle = identities.length === 1 && identities[0]?.provider === 'google';
  const canUnlink = identities.length > 1;

  if (loading && identities.length === 0) {
    return (
      <div className="mb-4">
        <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">{t('signInMethods')}</p>
        <p className="text-sm text-text-tertiary">…</p>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">
        {t('signInMethods')}
      </p>
      {toast && (
        <div className="mb-3 rounded-lg bg-status-success/10 border border-status-success/30 text-sm text-status-success px-3 py-2" role="status">
          {toast}
        </div>
      )}
      <p className="text-sm text-text-secondary mb-3">{t('signInMethodsHelp')}</p>
      <ul className="space-y-2 rounded-lg border border-border-light bg-background-card p-3 mb-4">
        {identities.map((id) => (
          <li
            key={id.id}
            className="flex items-center justify-between gap-3 text-sm text-text-primary flex-wrap"
          >
            <div className="flex items-center gap-2 min-w-0">
              <IconFor provider={id.provider} />
              <span className="truncate">{label(id)}</span>
              <span className="text-xs text-text-tertiary shrink-0">
                {id.isPrimary ? t('signInMethodsPrimary') : t('signInMethodsLinked')}
              </span>
            </div>
            {!id.isPrimary && canUnlink && (
              <button
                type="button"
                onClick={() => handleUnlink(id)}
                disabled={!!unlinkingId}
                className="text-xs font-medium text-text-tertiary hover:text-status-error focus:outline-none focus:ring-2 focus:ring-primary rounded disabled:opacity-50"
              >
                {unlinkingId === id.id ? '…' : t('removeLink')}
              </button>
            )}
          </li>
        ))}
      </ul>

      {!hasGoogle && (
        <div className="mb-4">
          <Button
            type="button"
            variant="secondary"
            onClick={handleAddGoogle}
            loading={addGoogleLoading}
            disabled={addGoogleLoading}
          >
            {t('addGoogle')}
          </Button>
          {addGoogleError && (
            <p className="mt-2 text-sm text-status-error">{addGoogleError}</p>
          )}
        </div>
      )}

      {onlyGoogle && (
        <div className="rounded-lg border border-border-light bg-background-card p-4 space-y-3">
          <p className="text-sm font-medium text-text-primary">{t('linkExistingTitle')}</p>
          <p className="text-sm text-text-secondary">{t('linkExistingDescription')}</p>
          {linkExistingSent ? (
            <p className="text-sm text-status-success">{t('linkExistingSuccess')}</p>
          ) : (
            <form onSubmit={handleLinkExistingSubmit} className="flex flex-col sm:flex-row gap-2">
              <Input
                type="email"
                label={t('linkExistingEmailPlaceholder')}
                value={linkExistingEmail}
                onChange={(e) => setLinkExistingEmail(e.target.value)}
                placeholder={t('linkExistingEmailPlaceholder')}
                className="flex-1 min-w-0"
                required
                disabled={linkExistingLoading}
              />
              <Button type="submit" loading={linkExistingLoading} disabled={linkExistingLoading}>
                {t('linkExistingSubmit')}
              </Button>
            </form>
          )}
          {linkExistingError && (
            <p className="text-sm text-status-error">{linkExistingError}</p>
          )}
        </div>
      )}
    </div>
  );
}
