'use client';

import Image from 'next/image';

const LOGO_SRC = '/icon.svg';

/** Brixa brand logo. Uses the single source of truth: public/icon.svg (favicon + all in-app uses). */
export function BrixaLogoMark({ size = 48 }: { size?: number }) {
  return (
    <Image
      src={LOGO_SRC}
      alt=""
      width={size}
      height={size}
      className="shrink-0"
      aria-hidden
      unoptimized
    />
  );
}
