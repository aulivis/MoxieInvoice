import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export default async function NotFound() {
  const t = await getTranslations('common');
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center space-y-4 max-w-md">
        <p className="text-6xl font-bold text-text-disabled" aria-hidden>404</p>
        <h1 className="text-page-title">{t('notFound')}</h1>
        <p className="text-text-secondary">{t('notFoundDescription')}</p>
        <Link
          href="/"
          className="inline-flex items-center justify-center font-semibold rounded-lg min-h-[44px] px-5 py-2.5 text-base bg-primary text-primary-foreground hover:bg-primary-hover transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {t('backToHome')}
        </Link>
      </div>
    </div>
  );
}
