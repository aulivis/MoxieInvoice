import { getTranslations } from 'next-intl/server';

export default async function AppLoading() {
  const t = await getTranslations('loading');
  return (
    <div className="space-y-6 max-w-7xl animate-fade-in" aria-busy="true" aria-live="polite">
      <div className="skeleton h-9 w-48 rounded-lg" aria-hidden />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="skeleton h-28 rounded-xl" aria-hidden />
        <div className="skeleton h-28 rounded-xl" aria-hidden />
        <div className="skeleton h-28 rounded-xl" aria-hidden />
      </div>
      <div className="skeleton h-[260px] rounded-xl" aria-hidden />
      <div className="rounded-xl border border-border-light overflow-hidden">
        <div className="skeleton h-12 rounded-t-xl" aria-hidden />
        <div className="divide-y divide-border-light p-0">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton h-16 rounded-none" aria-hidden />
          ))}
        </div>
      </div>
      <p className="sr-only">{t('default')}</p>
    </div>
  );
}
