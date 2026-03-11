import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { LocaleLayoutProps } from '@/types';

export const metadata: Metadata = {
  title: 'Brixa',
  description: 'Moxie → Billingo / Számlázz.hu számlázás',
};

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const messages = await getMessages();
  return (
    <NextIntlClientProvider messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
