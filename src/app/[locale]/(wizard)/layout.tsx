import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import Script from 'next/script';
import { getAppLayoutContext } from '@/lib/auth';
import { AppShell } from '@/components/AppShell';

// Wizard layout: requires auth, has AppShell (sidebar), but NO SubscriptionGuard
// (the wizard itself guides the user through subscription setup)
export default async function WizardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getAppLayoutContext();
  if (!ctx) {
    const locale = await getLocale();
    redirect(`/${locale}/login`);
  }
  return (
    <>
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/iframe-resizer/4.3.10/iframeResizer.min.js"
        strategy="lazyOnload"
      />
      <AppShell>{children}</AppShell>
    </>
  );
}
