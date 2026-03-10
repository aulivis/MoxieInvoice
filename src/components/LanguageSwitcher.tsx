'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { locales, localeNames } from '@/i18n';
import type { Locale } from '@/i18n';

interface LanguageSwitcherProps {
  dark?: boolean;
}

export function LanguageSwitcher({ dark = false }: LanguageSwitcherProps) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  const lightClass =
    'rounded-lg border border-border-light bg-background-card px-3 py-2 text-base text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 min-h-[44px] transition-colors';

  const darkClass =
    'w-full rounded-lg border px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary transition-colors min-h-[36px]';

  return (
    <select
      value={locale}
      onChange={(e) =>
        router.replace(pathname, { locale: e.target.value as Locale })
      }
      className={dark ? darkClass : lightClass}
      style={
        dark
          ? {
              background: 'var(--sidebar-surface)',
              borderColor: 'var(--sidebar-border)',
              color: 'var(--sidebar-muted)',
            }
          : undefined
      }
      aria-label="Select language"
    >
      {locales.map((loc) => (
        <option key={loc} value={loc}>
          {localeNames[loc]}
        </option>
      ))}
    </select>
  );
}
