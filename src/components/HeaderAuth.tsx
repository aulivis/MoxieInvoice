'use client';

import { createClient } from '@/lib/supabase/client';
import { useAuthSession } from '@/hooks/useAuthSession';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/Button';

interface HeaderAuthProps {
  dark?: boolean;
}

export function HeaderAuth({ dark = false }: HeaderAuthProps) {
  const signedIn = useAuthSession();
  const router = useRouter();
  const t = useTranslations('nav');

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push('/login');
  }

  if (signedIn) {
    if (dark) {
      return (
        <button
          type="button"
          onClick={signOut}
          className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary outline-none min-h-[36px]"
          style={{ color: 'var(--sidebar-muted)' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover)';
            (e.currentTarget as HTMLElement).style.color = 'var(--sidebar-text)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = '';
            (e.currentTarget as HTMLElement).style.color = 'var(--sidebar-muted)';
          }}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {t('signOut')}
        </button>
      );
    }

    return (
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="md"
          onClick={signOut}
          className="min-h-[44px]"
        >
          {t('signOut')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/login"
        className="text-base text-text-secondary hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg py-2 px-3 min-h-[44px] inline-flex items-center transition-colors"
      >
        {t('login')}
      </Link>
      <Link
        href="/signup"
        className="inline-flex items-center justify-center font-semibold rounded-lg min-h-[44px] px-5 py-2.5 text-base bg-primary text-primary-foreground hover:bg-primary-hover transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        {t('signup')}
      </Link>
    </div>
  );
}
