import { getTranslations } from 'next-intl/server';

export default async function InvoicesLoading() {
  const t = await getTranslations('loading');
  return (
    <div className="space-y-5 max-w-7xl animate-fade-in" aria-busy="true" aria-live="polite">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="skeleton h-9 w-40 rounded-lg mb-2" aria-hidden />
          <div className="skeleton h-4 w-24 rounded" aria-hidden />
        </div>
        <div className="skeleton h-10 w-28 rounded-lg" aria-hidden />
      </div>
      <div className="rounded-xl border border-border-light overflow-hidden">
        <div className="flex gap-2 px-4 pt-4 pb-3 border-b border-border-light">
          <div className="skeleton h-9 w-20 rounded-full" aria-hidden />
          <div className="skeleton h-9 w-24 rounded-full" aria-hidden />
          <div className="skeleton h-9 w-20 rounded-full" aria-hidden />
        </div>
        <div className="divide-y divide-border-light">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="skeleton h-14 rounded-none" aria-hidden />
          ))}
        </div>
      </div>
      <p className="sr-only">{t('invoices')}</p>
    </div>
  );
}
