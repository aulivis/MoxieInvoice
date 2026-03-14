import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { LocaleLayoutProps } from '@/types';
import { LocaleLang } from '@/components/LocaleLang';

export const metadata: Metadata = {
  title: 'Brixa',
  description: 'Moxie → Billingo / Számlázz.hu számlázás',
};

export default async function LocaleLayout({
  children,
}: LocaleLayoutProps) {
  const messages = await getMessages();
  return (
    <NextIntlClientProvider messages={messages}>
      <LocaleLang />
      {children}
    </NextIntlClientProvider>
  );
}
