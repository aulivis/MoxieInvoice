import { defineRouting } from 'next-intl/routing';
import { locales, defaultLocale } from '@/i18n/constants';

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
});
