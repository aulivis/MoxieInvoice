'use client';

const LOGO_SRC = '/icon.svg';

/** Brixa brand logo. Uses the single source of truth: public/icon.svg (favicon + all in-app uses). */
export function BrixaLogoMark({ size = 48 }: { size?: number }) {
  return (
    <img
      src={LOGO_SRC}
      alt=""
      width={size}
      height={size}
      className="shrink-0"
      aria-hidden
    />
  );
}
