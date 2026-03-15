'use client';

import { useCallback, useEffect, useRef } from 'react';

const MOXIE_SUPPORT_URL = 'https://hello.withmoxie.com/01/5-ronin-media/brixa-support';
const MOXIE_ORIGIN = 'https://hello.withmoxie.com';
const IFRAME_ID = 'moxie-brixa-support';

declare global {
  interface Window {
    iFrameResize?: (options: object, selector: string) => void;
  }
}

interface SupportDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SupportDialog({ open, onClose }: SupportDialogProps) {
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
      ? `${MOXIE_SUPPORT_URL}?inFrame=true&sourceUrl=${encodeURIComponent(window.location.href)}`
      : '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Support"
    >
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
        aria-hidden="true"
      />
      <div
        className="relative w-full max-w-3xl rounded-xl border border-border-medium bg-background-card shadow-card animate-fade-in overflow-hidden"
        style={{ minHeight: 500 }}
      >
        <div className="w-full min-h-[500px] p-0">
          <iframe
            ref={iframeRef}
            id={IFRAME_ID}
            src={iframeSrc}
            allowTransparency
            className="block w-full min-w-full border-0"
            style={{ minHeight: 500 }}
            title="Support"
          />
        </div>
      </div>
    </div>
  );
}
