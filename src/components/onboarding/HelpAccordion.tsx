'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

interface HelpItem {
  question: string;
  answer: string;
  imageSrc?: string;
  imageAlt?: string;
  imageType?: 'image' | 'gif';
}

interface HelpAccordionProps {
  items: HelpItem[];
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-4 h-4 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function HelpAccordionItem({ item }: { item: HelpItem }) {
  const [open, setOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const t = useTranslations('onboarding');

  return (
    <div className="border border-border-light rounded-lg overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-text-primary hover:bg-surface-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset transition-colors"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {item.question}
        </span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 text-sm text-text-secondary space-y-3">
          <p>{item.answer}</p>
          {item.imageSrc && !imgError && (
            <div className="relative rounded-lg overflow-hidden border border-border-light bg-surface-50 mt-3">
              <Image
                src={item.imageSrc}
                alt={item.imageAlt ?? item.question}
                width={600}
                height={340}
                className="w-full h-auto object-contain"
                onError={() => setImgError(true)}
                unoptimized={item.imageType === 'gif'}
              />
            </div>
          )}
          {item.imageSrc && imgError && (
            <p className="text-xs text-text-tertiary italic border border-dashed border-border-light rounded px-3 py-2">
              [{t('imageSoon')}]
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function HelpAccordion({ items }: HelpAccordionProps) {
  if (!items.length) return null;

  return (
    <div className="space-y-2 mt-4">
      {items.map((item, i) => (
        <HelpAccordionItem key={i} item={item} />
      ))}
    </div>
  );
}
