import { redirect } from 'next/navigation';
import { getAppLayoutContext } from '@/lib/auth';
import { PendingDeletionView } from './PendingDeletionView';

const GRACE_DAYS = 14;

export default async function AccountPendingDeletionPage() {
  const ctx = await getAppLayoutContext();
  if (!ctx) redirect('/login');

  const deletionRequestedAt = ctx.profile.deletion_requested_at;
  if (!deletionRequestedAt) {
    redirect('/dashboard');
  }

  const requestedAt = new Date(deletionRequestedAt);
  const deadline = new Date(requestedAt);
  deadline.setDate(deadline.getDate() + GRACE_DAYS);
  const withinGracePeriod = new Date() <= deadline;

  return (
    <div className="max-w-lg mx-auto py-12 px-4">
      <PendingDeletionView
        withinGracePeriod={withinGracePeriod}
        deletionDeadline={deadline.toISOString()}
      />
    </div>
  );
}
