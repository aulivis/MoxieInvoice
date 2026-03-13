'use client';

/** Brixa brand logo. Uses the single source of truth: public/icon.svg (favicon + all in-app uses). */
export function BrixaLogoMark({ size = 48 }: { size?: number }) {
  return (
    <img
      src="/icon.svg"
      alt=""
      width={size}
      height={size}
      className="shrink-0"
      aria-hidden
    />
  );
}
