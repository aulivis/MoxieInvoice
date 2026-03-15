import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

/** Security headers: HSTS, CSP, and related. Applied to all routes. */
function getSecurityHeaders() {
  return [
    { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    {
      key: 'Content-Security-Policy',
      value: [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "connect-src 'self' https: *.supabase.co wss: *.supabase.co",
        "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://hello.withmoxie.com",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; '),
    },
  ];
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {},
  serverExternalPackages: ['stripe'],
  async headers() {
    return [{ source: '/:path*', headers: getSecurityHeaders() }];
  },
  experimental: {
    optimizePackageImports: [
      '@supabase/supabase-js',
      '@supabase/ssr',
    ],
    turbopackFileSystemCacheForDev: true,
    turbopackFileSystemCacheForBuild: true,
  },
};

const config = withNextIntl(nextConfig);

// Migrate experimental.turbo → turbopack (next-intl and others may inject it) to avoid deprecation warning
if (config.experimental?.turbo) {
  config.turbopack = { ...config.turbopack, ...config.experimental.turbo };
  const { turbo, ...rest } = config.experimental;
  config.experimental = Object.keys(rest).length > 0 ? rest : undefined;
}

export default config;
