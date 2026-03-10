import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {},
  serverExternalPackages: ['stripe'],
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
