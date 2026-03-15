'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';

const MOXIE_ONBOARDING_URL = 'https://hello.withmoxie.com/01/5-ronin-media/brixa-onbarding';
const MOXIE_ORIGIN = 'https://hello.withmoxie.com';
const IFRAME_ID = 'moxie-brixa-onbarding';

declare global {
  interface Window {
    iFrameResize?: (options: object, selector: string) => void;
  }
}

interface OnboardingBookingDialogProps {
  open: boolean;
  onClose: () => void;
}

export function OnboardingBookingDialog({ open, onClose }: OnboardingBookingDialogProps) {
  const t = useTranslations('onboarding');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, handleClose]);

  useEffect(() => {
    if (!open) return;

    const handleMessage = (event: MessageEvent) => {
      if (
        event.origin === MOXIE_ORIGIN &&
        typeof event.data === 'string' &&
        event.data.startsWith('[Redirect]')
      ) {
        const url = event.data.slice(10);
        window.location.href = url;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [open]);

  useEffect(() => {
    if (!open || typeof window === 'undefined') return;

    const timer = setTimeout(() => {
      if (window.iFrameResize && document.getElementById(IFRAME_ID)) {
        window.iFrameResize(
          {
            heightCalculationMethod: 'min',
            sizeWidth: true,
            sizeHeight: true,
            log: false,
            checkOrigin: false,
          },
          `#${IFRAME_ID}`,
        );
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [open]);

  if (!open) return null;

  const iframeSrc =
    typeof window !== 'undefined'
      ? `${MOXIE_ONBOARDING_URL}?inFrame=true&sourceUrl=${encodeURIComponent(window.location.href)}`
      : '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-booking-dialog-title"
      aria-label="Book onboarding call"
    >
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
        aria-hidden="true"
      />
      <div
        className="relative w-full max-w-2xl rounded-xl border border-border-medium bg-background-card shadow-card overflow-hidden flex flex-col animate-fade-in"
        style={{ minHeight: 500, maxHeight: '90vh' }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-light bg-surface-50 shrink-0">
          <h2 id="onboarding-booking-dialog-title" className="text-sm font-semibold text-text-primary">
            {t('bookingDialogTitle')}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-background-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 min-h-[460px] w-full p-0 overflow-auto">
          <iframe
            ref={iframeRef}
            id={IFRAME_ID}
            src={iframeSrc}
            allowTransparency
            allow="fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            className="block w-full min-w-full border-0"
            style={{ minHeight: 460 }}
            title="Book onboarding call"
          />
        </div>
      </div>
    </div>
  );
}
