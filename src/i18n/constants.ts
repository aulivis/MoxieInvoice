/**
 * Routing-only i18n constants. No next-intl/server or message imports.
 * Used by middleware/routing so the middleware bundle stays small.
 */

export const locales = ['hu', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'hu';

export const localeNames: Record<Locale, string> = {
  hu: 'Magyar',
  en: 'English',
};
