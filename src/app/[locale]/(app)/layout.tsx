import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { getAppLayoutContext } from '@/lib/auth';
import { SubscriptionGuard } from '@/components/SubscriptionGuard';

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
  return (
    <SubscriptionGuard hasSubscription={ctx.hasSubscription}>
      {children}
    </SubscriptionGuard>
  );
}
