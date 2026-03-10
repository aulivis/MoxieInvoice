import type { Locale } from '@/i18n';

export interface LocaleLayoutProps {
  children: React.ReactNode;
  /** Next.js 15: params is async; locale is string at type level, narrow to Locale when needed */
  params: Promise<{ locale: string }>;
}

export type { Locale };
