'use client';

import type { Locale } from '@/i18n';

const flagByLocale: Record<Locale, string> = {
  hu: '/flags/hu.svg',
  en: '/flags/gb.svg',
};

interface CircleFlagProps {
  locale: Locale;
  className?: string;
}

export function CircleFlag({ locale, className = '' }: CircleFlagProps) {
  const src = flagByLocale[locale];
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center w-6 h-6 rounded-full overflow-hidden bg-muted ${className}`}
      role="img"
      aria-hidden
    >
      <img
        src={src}
        alt=""
        className="w-full h-full object-cover"
        width={24}
        height={24}
      />
    </span>
  );
}
