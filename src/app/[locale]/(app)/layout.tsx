import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { headers } from 'next/headers';
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

  // Skip SubscriptionGuard on the onboarding wizard – it handles subscription
  // setup itself and the warning banner would interfere with the wizard layout.
  // Try multiple headers since availability depends on Next.js version/deployment.
  const headersList = await headers();
  const nextUrl =
    headersList.get('next-url') ??
    headersList.get('x-pathname') ??
    headersList.get('x-url') ??
    '';
  const isOnboarding = nextUrl.includes('/onboarding');

  return (
    <AppShell>
      {isOnboarding ? (
        children
      ) : (
        <SubscriptionGuard hasSubscription={ctx.hasSubscription}>
          {children}
        </SubscriptionGuard>
      )}
    </AppShell>
  );
}
