'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { locales, localeNames } from '@/i18n';
import type { Locale } from '@/i18n';
import { Select } from '@/components/ui/Select';
import { CircleFlag } from '@/components/CircleFlag';

interface LanguageSwitcherProps {
  dark?: boolean;
}

const languageOptions = locales.map((loc) => ({
  value: loc,
  label: localeNames[loc],
  leading: <CircleFlag locale={loc} />,
}));

export function LanguageSwitcher({ dark = false }: LanguageSwitcherProps) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('common');

  return (
    <Select<Locale>
      value={locale}
      options={languageOptions}
      onChange={(newLocale) => router.replace(pathname, { locale: newLocale })}
      variant={dark ? 'compact' : 'default'}
      dark={dark}
      placement={dark ? 'top' : 'bottom'}
      aria-label={t('selectLanguage')}
    />
  );
}
