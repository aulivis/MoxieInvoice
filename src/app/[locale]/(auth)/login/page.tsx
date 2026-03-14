'use client';

import { useActionState, useState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations, useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { loginAction, type AuthState } from '@/app/actions/auth';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { TextWithMoxieLogo } from '@/components/MoxieLogoInline';
import { BrixaLogoMark } from '@/components/BrixaLogoMark';
import { defaultLocale } from '@/i18n/constants';

function EmailIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations('auth');
  return (
    <Button type="submit" loading={pending} variant="gradient" className="w-full">
      {t('sendMagicLink')}
    </Button>
  );
}

function parseMagicLinkErrorFromHash(): boolean {
  if (typeof window === 'undefined' || !window.location.hash) return false;
  const params = new URLSearchParams(window.location.hash.slice(1));
  const error = params.get('error');
  const errorCode = params.get('error_code');
  if (error === 'access_denied' || errorCode === 'otp_expired') return true;
  if (error && (errorCode || params.get('error_description'))) return true;
  return false;
}

function getTranslatedAuthError(
  rawError: string,
  t: (key: string, values?: Record<string, number | string>) => string
): string {
  if (rawError === 'AUTH_EMAIL_REQUIRED') return t('errors.emailRequired');
  if (rawError === 'AUTH_EMAIL_RATE_LIMIT') return t('errors.emailRateLimit');
  if (rawError.startsWith('AUTH_RETRY_AFTER:')) {
    const seconds = rawError.slice('AUTH_RETRY_AFTER:'.length);
    return t('errors.retryAfterSeconds', { seconds });
  }
  return rawError;
}

export default function LoginPage() {
  const [state, formAction] = useActionState<AuthState | null, FormData>(
    loginAction,
    null
  );
  const [hashError, setHashError] = useState<boolean>(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const searchParams = useSearchParams();
  const locale = useLocale();
  const errorAuth = searchParams.get('error') === 'auth';
  const errorGoogleAlreadyLinked = searchParams.get('error') === 'google_already_used';
  const messageSuspended = searchParams.get('message') === 'account_suspended';
  const t = useTranslations('auth');
  const tDelete = useTranslations('deleteAccount');

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    const baseUrl =
      typeof window !== 'undefined'
        ? window.location.origin
        : (process.env.NEXT_PUBLIC_APP_URL ?? '');
    const next = locale === defaultLocale ? '/' : `/${locale}`;
    const redirectTo = `${baseUrl}/auth/callback`;
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: { next },
      },
    });
    if (error) {
      setGoogleLoading(false);
      return;
    }
    if (data?.url) {
      window.location.href = data.url;
    } else {
      setGoogleLoading(false);
    }
  }

  useEffect(() => {
    if (parseMagicLinkErrorFromHash()) {
      setHashError(true);
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  const showSuccess = state?.success === true;
  const showForm = !showSuccess;
  const rawError = state?.error;
  const errorMessage =
    (rawError && getTranslatedAuthError(rawError, t)) ||
    (errorGoogleAlreadyLinked ? t('errors.googleAlreadyLinked') : null) ||
    (hashError || errorAuth ? t('linkExpired') : null);

  const features = [t('feature1'), t('feature2'), t('feature3'), t('feature4')];

  return (
    <div className="min-h-screen flex bg-surface-50">
      <div className="w-full max-w-6xl mx-auto flex min-h-screen px-6 sm:px-8 lg:px-12">
      {/* ── Left brand panel (md+, 50%) ─────────────────────────────────── */}
      <div
        className="hidden md:flex md:w-1/2 shrink-0 flex-col justify-between p-12 xl:p-16"
        style={{ background: 'linear-gradient(160deg, #0E1628 0%, #1A2744 60%, #2A3A5C 100%)' }}
      >
        {/* Logo + tagline. Wordmark = icon height −10%. */}
        <div>
          {(() => {
            const heroIconSize = 52;
            const heroWordmarkSize = heroIconSize * 0.9;
            return (
              <div className="flex items-end gap-[1ch] mb-5">
                <BrixaLogoMark size={heroIconSize} />
                <span
                  style={{ fontFamily: "var(--font-encode-sans-expanded), 'Encode Sans Expanded', sans-serif", fontWeight: 400, fontSize: `${heroWordmarkSize}px`, lineHeight: 1, color: 'white' }}
                >
                  Brixa
                </span>
              </div>
            );
          })()}
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
            {t('heroTagline')}
          </p>
        </div>

        {/* Hero + features */}
        <div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            {t('heroTitlePrefix')}{' '}
            <span
              className="text-transparent"
              style={{
                background: 'linear-gradient(90deg, #E8893A, #F4A85C)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {t('heroHighlight')}
            </span>
          </h2>
          <p className="text-sm leading-relaxed mb-8" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <TextWithMoxieLogo logoVariant="white">{t('heroDescription')}</TextWithMoxieLogo>
          </p>
          <ul className="space-y-3">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-3 text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
                <span
                  className="flex items-center justify-center w-5 h-5 rounded-full shrink-0"
                  style={{ background: 'rgba(232,137,58,0.2)' }}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="#E8893A" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <TextWithMoxieLogo logoVariant="white">{f}</TextWithMoxieLogo>
              </li>
            ))}
          </ul>
        </div>

        {/* Copyright and cookie notice */}
        <div className="space-y-1.5">
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {t('copyright')}
          </p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {t('cookieNoticePrefix')}
            {process.env.NEXT_PUBLIC_PRIVACY_POLICY_URL ? (
              <a
                href={process.env.NEXT_PUBLIC_PRIVACY_POLICY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:opacity-90"
              >
                {t('privacyPolicyLinkText')}
              </a>
            ) : (
              <Link href="/settings?tab=dataHandling" className="underline hover:opacity-90">
                {t('privacyPolicyLinkText')}
              </Link>
            )}
            {t('cookieNoticeSuffix')}
          </p>
        </div>
      </div>

      {/* ── Right form panel ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-screen bg-surface-50">
        {/* Language switcher top-right */}
        <div className="flex justify-end p-4">
          <LanguageSwitcher />
        </div>

        {/* Centered form */}
        <div className="flex-1 flex items-center justify-center px-6 pb-12">
          <div className="w-full max-w-sm">
            {/* Mobile logo. Wordmark = icon height −10%. */}
            {(() => {
              const mobileIconSize = 35;
              const mobileWordmarkSize = mobileIconSize * 0.9;
              return (
                <div className="flex items-end gap-[1ch] mb-8 md:hidden">
                  <BrixaLogoMark size={mobileIconSize} />
                  <span
                    style={{ fontFamily: "var(--font-encode-sans-expanded), 'Encode Sans Expanded', sans-serif", fontWeight: 400, fontSize: `${mobileWordmarkSize}px`, lineHeight: 1, color: 'var(--color-text-primary)' }}
                  >
                    Brixa
                  </span>
                </div>
              );
            })()}

            {messageSuspended && (
              <div className="mb-6 rounded-lg border border-border-medium bg-background-card p-4 text-sm text-text-primary" role="status">
                {tDelete('suspendedToast')}
              </div>
            )}
            {showForm ? (
              <>
                <h1 className="text-2xl font-bold text-text-primary mb-1">{t('loginTitle')}</h1>
                <p className="text-sm text-text-secondary mb-6">{t('emailHint')}</p>

                <form action={formAction} className="space-y-4">
                  <input type="hidden" name="language" value={locale} />
                  <Input
                    id="login-email"
                    type="email"
                    name="email"
                    label={t('email')}
                    required
                    autoComplete="email"
                    inputMode="email"
                    placeholder={t('emailPlaceholder')}
                    leadingIcon={<EmailIcon />}
                    aria-invalid={!!errorMessage}
                    aria-describedby={errorMessage ? 'login-error' : undefined}
                    error={errorMessage ?? undefined}
                  />
                  <SubmitButton />
                </form>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center" aria-hidden>
                    <span className="w-full border-t border-border-light" />
                  </div>
                  <p className="relative flex justify-center text-xs font-medium text-text-tertiary">
                    <span className="bg-surface-50 px-2">{t('orContinueWith')}</span>
                  </p>
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading}
                  loading={googleLoading}
                  aria-label={t('signInWithGoogle')}
                >
                  <GoogleIcon />
                  {t('signInWithGoogle')}
                </Button>

                <p className="mt-5 text-xs text-text-tertiary text-center leading-relaxed">
                  {t('noPassword')}
                </p>
              </>
            ) : (
              <div className="text-center animate-bounce-in" role="status">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success-muted mb-4">
                  <span className="text-status-success">
                    <CheckCircleIcon />
                  </span>
                </div>
                <h2 className="text-xl font-bold text-text-primary mb-2">{t('linkSent')}</h2>
                <p className="text-sm text-text-secondary mb-1">
                  {t('magicLinkSent', { email: state?.email ?? '' })}
                </p>
                <p className="text-sm text-text-tertiary mb-1">{t('checkInbox')}</p>
                <p className="text-xs text-text-tertiary">{t('resendAfter')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
