import { getTranslations } from 'next-intl/server';

export default async function AppLoading() {
  const t = await getTranslations('loading');
  return (
    <div
      className="min-h-[40vh] flex flex-col items-center justify-center p-6"
      aria-busy="true"
    >
      <div
        className="w-10 h-10 border-2 border-border-light border-t-primary rounded-full animate-spin"
        aria-hidden
      />
      <p className="mt-4 text-text-secondary text-base">
        {t('default')}
      </p>
    </div>
  );
}
