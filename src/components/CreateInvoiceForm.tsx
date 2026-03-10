'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Select } from '@/components/ui/Select';

const inputClass =
  'rounded-lg border border-border-medium bg-background-card px-3 py-2.5 text-base min-h-[44px] text-text-primary placeholder:text-text-disabled focus-visible:outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/10 w-full';

const labelClass = 'block text-sm font-medium text-text-label mb-1';
const requiredMark = <span className="text-status-error ml-0.5" aria-hidden>*</span>;

interface InvoiceItem {
  id: string;
  name: string;
  quantity: number;
  netUnitPrice: number;
  vatPercent: number;
}

function newItem(): InvoiceItem {
  return { id: crypto.randomUUID(), name: '', quantity: 1, netUnitPrice: 0, vatPercent: 27 };
}

export function CreateInvoiceForm() {
  const router = useRouter();
  const locale = useLocale() as 'hu' | 'en';
  const t = useTranslations('invoicesNew');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');
  const [buyer, setBuyer] = useState({
    name: '',
    taxNumber: '',
    postCode: '',
    city: '',
    address: '',
    email: '',
  });
  const [items, setItems] = useState<InvoiceItem[]>([newItem()]);
  const [currency, setCurrency] = useState('HUF');
  const [fulfillmentDate, setFulfillmentDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoiceResult, setInvoiceResult] = useState<{ invoiceNumber: string; pdfUrl?: string } | null>(null);

  function addItem() {
    setItems((prev) => [...prev, newItem()]);
  }

  function updateItem(id: string, field: keyof Omit<InvoiceItem, 'id'>, value: string | number) {
    setItems((prev) =>
      prev.map((item) => item.id === id ? { ...item, [field]: value } : item)
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInvoiceResult(null);
    setLoading(true);
    try {
      const res = await fetch('/api/invoices/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request: {
            buyer: {
              name: buyer.name,
              taxNumber: buyer.taxNumber || undefined,
              postCode: buyer.postCode,
              city: buyer.city,
              address: buyer.address,
              email: buyer.email || undefined,
            },
            items: items.map((item) => ({
              name: item.name,
              quantity: item.quantity,
              unit: 'db',
              netUnitPrice: item.netUnitPrice,
              vatPercent: item.vatPercent,
              unitPriceType: 'net' as const,
            })),
            currency,
            fulfillmentDate,
          },
          locale: locale === 'en' ? 'en' : 'hu',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.errorCode ? tErrors(data.errorCode as 'billingNotConfigured') : (data.error || tCommon('error'));
        setError(msg);
        return;
      }
      setInvoiceResult({ invoiceNumber: data.invoiceNumber, pdfUrl: data.pdfUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon('error'));
    } finally {
      setLoading(false);
    }
  }

  if (invoiceResult) {
    return (
      <div role="status" aria-live="polite" className="space-y-4">
        <Alert variant="success">
          {t('created')}: {invoiceResult.invoiceNumber}
        </Alert>
        {invoiceResult.pdfUrl && (
          <a
            href={invoiceResult.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded inline-block"
          >
            {t('openPdf')}
          </a>
        )}
        <Button type="button" variant="secondary" onClick={() => router.push('/invoices')}>
          {t('backToList')}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl" aria-busy={loading}>
      <p className="text-xs text-text-secondary">
        <span className="text-status-error" aria-hidden>*</span> {tCommon('required')}
      </p>
      <section aria-labelledby="buyer-heading">
        <h2 id="buyer-heading" className="text-section-title mb-2">{t('buyer')}</h2>
        <div className="grid gap-3">
          <div>
            <label htmlFor="buyer-name" className={labelClass}>{t('name')}{requiredMark}</label>
            <input id="buyer-name" required placeholder={t('name')} value={buyer.name} onChange={(e) => setBuyer((b) => ({ ...b, name: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label htmlFor="buyer-taxNumber" className={labelClass}>{t('taxNumber')}</label>
            <input id="buyer-taxNumber" placeholder={t('taxNumber')} value={buyer.taxNumber} onChange={(e) => setBuyer((b) => ({ ...b, taxNumber: e.target.value }))} className={inputClass} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label htmlFor="buyer-postCode" className={labelClass}>{t('postCode')}{requiredMark}</label>
              <input id="buyer-postCode" required placeholder={t('postCode')} value={buyer.postCode} onChange={(e) => setBuyer((b) => ({ ...b, postCode: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label htmlFor="buyer-city" className={labelClass}>{t('city')}{requiredMark}</label>
              <input id="buyer-city" required placeholder={t('city')} value={buyer.city} onChange={(e) => setBuyer((b) => ({ ...b, city: e.target.value }))} className={inputClass} />
            </div>
          </div>
          <div>
            <label htmlFor="buyer-address" className={labelClass}>{t('address')}{requiredMark}</label>
            <input id="buyer-address" required placeholder={t('address')} value={buyer.address} onChange={(e) => setBuyer((b) => ({ ...b, address: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label htmlFor="buyer-email" className={labelClass}>{t('email')}</label>
            <input id="buyer-email" type="email" placeholder={t('email')} value={buyer.email} onChange={(e) => setBuyer((b) => ({ ...b, email: e.target.value }))} className={inputClass} />
          </div>
        </div>
      </section>
      <section aria-labelledby="items-heading">
        <div className="flex justify-between items-center mb-2">
          <h2 id="items-heading" className="text-section-title">{t('items')}</h2>
          <Button type="button" variant="ghost" size="sm" onClick={addItem}>
            + {t('addItem')}
          </Button>
        </div>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
              <div className="md:col-span-4">
                <label htmlFor={`item-name-${item.id}`} className={labelClass}>
                  {i === 0 ? <>{t('itemName')}{requiredMark}</> : <span className="sr-only">{t('itemName')} {i + 1}</span>}
                </label>
                <input id={`item-name-${item.id}`} required placeholder={t('itemName')} value={item.name} onChange={(e) => updateItem(item.id, 'name', e.target.value)} className={inputClass} />
              </div>
              <div className="md:col-span-2">
                <label htmlFor={`item-qty-${item.id}`} className={labelClass}>
                  {i === 0 ? t('quantity') : <span className="sr-only">{t('quantity')} {i + 1}</span>}
                </label>
                <input id={`item-qty-${item.id}`} type="number" min={0.01} step={1} placeholder={t('quantity')} value={item.quantity || ''} onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value) || 0)} className={inputClass} />
              </div>
              <div className="md:col-span-2">
                <label htmlFor={`item-price-${item.id}`} className={labelClass}>
                  {i === 0 ? t('netUnitPrice') : <span className="sr-only">{t('netUnitPrice')} {i + 1}</span>}
                </label>
                <input id={`item-price-${item.id}`} type="number" min={0} step={0.01} placeholder={t('netUnitPrice')} value={item.netUnitPrice || ''} onChange={(e) => updateItem(item.id, 'netUnitPrice', Number(e.target.value) || 0)} className={inputClass} />
              </div>
              <div className="md:col-span-2">
                <label htmlFor={`item-vat-${item.id}`} className={labelClass}>
                  {i === 0 ? t('vatPercent') : <span className="sr-only">{t('vatPercent')} {i + 1}</span>}
                </label>
                <input id={`item-vat-${item.id}`} type="number" min={0} max={100} step={1} placeholder={t('vatPercent')} value={item.vatPercent || ''} onChange={(e) => updateItem(item.id, 'vatPercent', Number(e.target.value) || 0)} className={inputClass} />
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="flex flex-wrap gap-4 items-center">
        <div>
          <label htmlFor="invoice-currency" className={labelClass}>{t('currency')}</label>
          <Select
            id="invoice-currency"
            value={currency}
            options={[
              { value: 'HUF', label: 'HUF' },
              { value: 'EUR', label: 'EUR' },
            ]}
            onChange={setCurrency}
            aria-label={t('currency')}
            className="mt-1"
          />
        </div>
        <div>
          <label htmlFor="invoice-fulfillmentDate" className={labelClass}>{t('fulfillmentDate')}</label>
          <input id="invoice-fulfillmentDate" type="date" value={fulfillmentDate} onChange={(e) => setFulfillmentDate(e.target.value)} className={inputClass} />
        </div>
      </section>
      {error && <Alert variant="error">{error}</Alert>}
      <Button type="submit" disabled={loading} variant="primary">
        {loading ? t('creating') : t('createButton')}
      </Button>
    </form>
  );
}
