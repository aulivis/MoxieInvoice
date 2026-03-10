import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { LocaleLayoutProps } from '@/types';
import { AppShell } from '@/components/AppShell';

export const metadata: Metadata = {
  title: 'MoxieInvoice',
  description: 'Moxie → Billingo / Számlázz.hu számlázás',
};

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const messages = await getMessages();
  return (
    <NextIntlClientProvider messages={messages}>
      <AppShell>{children}</AppShell>
    </NextIntlClientProvider>
  );
}
