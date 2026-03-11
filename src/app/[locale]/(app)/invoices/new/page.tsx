import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { CreateInvoiceForm } from '@/components/CreateInvoiceForm';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('invoicesNew');
  return { title: `${t('title')} – Brixa` };
}
import { Card } from '@/components/ui/Card';

export default async function NewInvoicePage() {
  const t = await getTranslations('invoicesNew');
  return (
    <div className="space-y-6">
      <h1 className="text-page-title mb-4">{t('title')}</h1>
      <Card>
        <CreateInvoiceForm />
      </Card>
    </div>
  );
}
