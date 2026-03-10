import { getRequestConfig } from 'next-intl/server';
import {
  locales,
  defaultLocale,
  localeNames,
  localeFlags,
  type Locale,
} from './i18n/constants';

export { locales, defaultLocale, localeNames, localeFlags, type Locale };

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !locales.includes(locale as Locale)) locale = defaultLocale;
  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
