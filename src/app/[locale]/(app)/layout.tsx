import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { headers } from 'next/headers';
import Script from 'next/script';
import { getAppLayoutContext } from '@/lib/auth';
import { SubscriptionGuard } from '@/components/SubscriptionGuard';
import { AppShell } from '@/components/AppShell';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getAppLayoutContext();
  if (!ctx) {
    const locale = await getLocale();
    redirect(`/${locale}/login`);
  }

  const headersList = await headers();
  const nextUrl =
    headersList.get('next-url') ??
    headersList.get('x-pathname') ??
    headersList.get('x-url') ??
    '';
  const isOnboarding = nextUrl.includes('/onboarding');
  const isPendingDeletionPage = nextUrl.includes('/account-pending-deletion');

  const deletionRequestedAt = ctx.profile.deletion_requested_at;
  if (deletionRequestedAt && !isPendingDeletionPage) {
    const locale = await getLocale();
    redirect(`/${locale}/account-pending-deletion`);
  }

  const skipGuard = isOnboarding || isPendingDeletionPage;

  return (
    <>
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/iframe-resizer/4.3.10/iframeResizer.min.js"
        strategy="lazyOnload"
      />
      <AppShell>
        {skipGuard ? (
          children
        ) : (
          <SubscriptionGuard hasSubscription={ctx.hasSubscription}>
            {children}
          </SubscriptionGuard>
        )}
      </AppShell>
    </>
  );
}
