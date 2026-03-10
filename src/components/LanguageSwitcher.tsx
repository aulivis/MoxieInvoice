'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { locales, localeNames, localeFlags } from '@/i18n';
import type { Locale } from '@/i18n';
import { Select } from '@/components/ui/Select';

interface LanguageSwitcherProps {
  dark?: boolean;
}

const languageOptions = locales.map((loc) => ({
  value: loc,
  label: localeNames[loc],
  leading: localeFlags[loc],
}));

export function LanguageSwitcher({ dark = false }: LanguageSwitcherProps) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  return (
    <Select<Locale>
      value={locale}
      options={languageOptions}
      onChange={(newLocale) => router.replace(pathname, { locale: newLocale })}
      variant={dark ? 'compact' : 'default'}
      dark={dark}
      placement={dark ? 'top' : 'bottom'}
      aria-label="Select language"
    />
  );
}
