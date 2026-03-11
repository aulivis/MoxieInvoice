'use client';

import { useActionState, useState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { loginAction, type AuthState } from '@/app/actions/auth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

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

/** Brixa "Broken Bridge" logo mark */
function BrixaLogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 110 110" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect width="110" height="110" rx="28" fill="#1A2744"/>
      <path d="M22 75 L22 50 Q22 28 44 28 L55 28" stroke="white" strokeWidth="11" strokeLinecap="round" fill="none"/>
      <path d="M88 75 L88 50 Q88 28 66 28 L55 28" stroke="rgba(255,255,255,0.35)" strokeWidth="11" strokeLinecap="round" fill="none"/>
      <line x1="30" y1="75" x2="80" y2="75" stroke="#E8893A" strokeWidth="9" strokeLinecap="round"/>
      <circle cx="55" cy="28" r="6" fill="#E8893A"/>
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

export default function LoginPage() {
  const [state, formAction] = useActionState<AuthState | null, FormData>(
    loginAction,
    null
  );
  const [hashError, setHashError] = useState<boolean>(false);
  const searchParams = useSearchParams();
  const errorAuth = searchParams.get('error') === 'auth';
  const t = useTranslations('auth');
  const tNav = useTranslations('nav');

  useEffect(() => {
    if (parseMagicLinkErrorFromHash()) {
      setHashError(true);
      window.history.replaceState(
        null,
        '',
        window.location.pathname + window.location.search
      );
    }
  }, []);

  const showSuccess = state?.success === true;
  const showForm = !showSuccess;
  const errorMessage =
    state?.error || (hashError || errorAuth ? t('linkExpired') : null);

  const features = [t('feature1'), t('feature2'), t('feature3')];

  return (
    <div className="min-h-[calc(100vh-56px)] flex">
      {/* Left brand panel – hidden on mobile */}
      <div
        className="hidden lg:flex lg:w-[420px] xl:w-[480px] shrink-0 flex-col justify-between p-10"
        style={{
          background: 'linear-gradient(160deg, #0E1628 0%, #1A2744 60%, #2A3A5C 100%)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <BrixaLogoMark size={36} />
          <span
            className="font-extrabold text-lg tracking-tight text-white"
            style={{ fontFamily: "var(--font-syne), 'Syne', sans-serif" }}
          >
            Brixa
          </span>
        </div>

        {/* Center content */}
        <div>
          <h2
            className="text-3xl font-bold text-white leading-tight mb-3"
            style={{ fontFamily: "var(--font-syne), 'Syne', sans-serif" }}
          >
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
          <p className="text-base leading-relaxed mb-8" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {t('heroDescription')}
          </p>
          <ul className="space-y-3">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-3 text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
                <span
                  className="flex items-center justify-center w-5 h-5 rounded-full shrink-0"
                  style={{ background: 'rgba(232,137,58,0.2)' }}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="#E8893A" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {t('copyright')}
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <BrixaLogoMark size={32} />
            <span
              className="font-extrabold text-base text-text-primary tracking-tight"
              style={{ fontFamily: "var(--font-syne), 'Syne', sans-serif" }}
            >
              Brixa
            </span>
          </div>

          {showForm ? (
            <>
              <h1 className="text-2xl font-bold text-text-primary mb-1">{t('loginTitle')}</h1>
              <p className="text-sm text-text-secondary mb-6">
                {t('emailHint')}
              </p>

              <form action={formAction} className="space-y-4">
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

              <p className="mt-5 text-sm text-text-secondary text-center">
                {t('noAccount')}{' '}
                <Link
                  href="/signup"
                  className="text-primary font-medium hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
                >
                  {tNav('signup')}
                </Link>
              </p>
            </>
          ) : (
            <div className="text-center animate-bounce-in" role="status">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success-muted mb-4">
                <span className="text-status-success">
                  <CheckCircleIcon />
                </span>
              </div>
              <h2 className="text-xl font-bold text-text-primary mb-2">
                {t('linkSent')}
              </h2>
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
  );
}
