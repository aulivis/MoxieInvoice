'use client';

import { useEffect } from 'react';
import { useLocale } from 'next-intl';

/** Sets document.documentElement.lang to the active locale for accessibility and SEO. */
export function LocaleLang() {
  const locale = useLocale();

  useEffect(() => {
    if (locale && typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  return null;
}
