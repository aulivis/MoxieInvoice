import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#C2185B', // Darkened from #E91E63 → WCAG AA 5.5:1 on white
          light: '#F06292',
          dark: '#AD1457',
          foreground: '#FFFFFF',
          hover: '#AD1457',
          focus: 'rgba(194, 24, 91, 0.1)',
        },
        secondary: {
          pink: '#FF4081',
          magenta: '#D81B60',
          rose: '#F8BBD0',
        },
        accent: {
          blue: '#2196F3',
          teal: '#00BCD4',
          purple: '#9C27B0',
          orange: '#FF9800',
          green: '#4CAF50',
          amber: '#FFC107',
        },
        // Dark sidebar palette
        sidebar: {
          bg: '#0F0D16',
          surface: '#1A1726',
          border: '#1E1B2C',
          text: '#E8E6F0',
          muted: '#9490A8',
          'active-bg': 'rgba(194, 24, 91, 0.15)',
          'active-text': '#F06292',
          hover: '#1E1B2C',
        },
        background: {
          main: '#F8F7FA',
          sidebar: '#FFFFFF',
          card: '#FFFFFF',
          elevated: '#FFFFFF',
          hover: '#F5F5F5',
          selected: '#FFF0F5',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          50: '#F8F7FA',
          100: '#F1F0F5',
          muted: '#FAFAFA',
        },
        text: {
          primary: '#1A1A1A',
          secondary: '#666666',
          tertiary: '#999999',
          disabled: '#BDBDBD',
          onPrimary: '#FFFFFF',
          label: '#757575',
        },
        border: {
          light: '#EEEEEE',
          DEFAULT: '#E0E0E0',
          medium: '#E0E0E0',
          dark: '#BDBDBD',
          focus: '#C2185B',
        },
        status: {
          success: '#4CAF50',
          warning: '#FF9800',
          error: '#F44336',
          info: '#2196F3',
          positive: '#00C853',
          negative: '#D32F2F',
        },
        stat: {
          positive: '#00C896',
          negative: '#F44336',
          neutral: '#8B87A0',
        },
        chart: {
          primary: '#E91E63',
          secondary: '#9C27B0',
          tertiary: '#2196F3',
          quaternary: '#FF9800',
          grid: '#F5F5F5',
          axis: '#E0E0E0',
        },
        badge: {
          pink: '#C2185B',
          red: '#F44336',
          blue: '#2196F3',
          green: '#4CAF50',
          gray: '#757575',
          black: '#1A1A1A',
        },
        muted: {
          DEFAULT: '#666666',
          foreground: '#999999',
        },
        success: {
          DEFAULT: '#4CAF50',
          foreground: '#FFFFFF',
          muted: '#E8F5E9',
        },
        error: {
          DEFAULT: '#F44336',
          foreground: '#FFFFFF',
          muted: '#FFEBEE',
        },
        warning: {
          DEFAULT: '#FF9800',
          foreground: '#FFFFFF',
          muted: '#FFF3E0',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'JetBrains Mono', 'Courier New', 'monospace'],
      },
      fontSize: {
        // 2026 standard scale — aligned with Tailwind defaults for readability
        xs:      ['0.75rem',   { lineHeight: '1.3'  }], // 12px  (was 10px)
        sm:      ['0.875rem',  { lineHeight: '1.45' }], // 14px  (was 12px)
        base:    ['1rem',      { lineHeight: '1.55' }], // 16px  (was 14px)
        md:      ['1.0625rem', { lineHeight: '1.5'  }], // 17px  (was 16px)
        lg:      ['1.125rem',  { lineHeight: '1.45' }], // 18px
        xl:      ['1.25rem',   { lineHeight: '1.4'  }], // 20px
        '2xl':   ['1.5rem',    { lineHeight: '1.35' }], // 24px
        '3xl':   ['2rem',      { lineHeight: '1.2'  }], // 32px
        '4xl':   ['2.5rem',    { lineHeight: '1.15' }], // 40px
        '5xl':   ['3rem',      { lineHeight: '1.1'  }], // 48px
        display: ['2.25rem',   { lineHeight: '1.2'  }], // 36px
      },
      fontWeight: {
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800',
      },
      lineHeight: {
        tight: '1.25',
        snug: '1.375',
        normal: '1.5',
        relaxed: '1.625',
        loose: '2',
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '24px',
        '3xl': '32px',
        '4xl': '40px',
        '5xl': '48px',
        cardPadding: '20px',
        cardPaddingLg: '24px',
        sidebarPadding: '16px 12px',
        sectionGap: '20px',
        gridGap: '16px',
        itemGap: '8px',
        inlineGap: '12px',
        sidebarWidth: '240px',
        headerHeight: '64px',
        bottomNavHeight: '64px',
      },
      borderRadius: {
        DEFAULT: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
        pill: '12px',
        full: '9999px',
      },
      boxShadow: {
        subtle: '0 1px 3px rgba(0, 0, 0, 0.04)',
        card: '0 1px 3px rgba(0, 0, 0, 0.04)',
        elevated: '0 4px 12px rgba(0, 0, 0, 0.08)',
        dropdown: '0 4px 16px rgba(0, 0, 0, 0.08)',
        fab: '0 4px 12px rgba(194, 24, 91, 0.3)',
        stat: '0 2px 8px rgba(0, 0, 0, 0.06)',
        'sidebar-active': 'inset 3px 0 0 #C2185B',
        bottomnav: '0 -1px 0 #E0E0E0, 0 -8px 24px rgba(0,0,0,0.06)',
        'inner-sm': 'inset 0 1px 2px rgba(0,0,0,0.06)',
      },
      transitionDuration: {
        DEFAULT: '200ms',
        slow: '300ms',
        fast: '150ms',
      },
      transitionTimingFunction: {
        DEFAULT: 'ease',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'pulse-dot': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.4)', opacity: '0.7' },
        },
        'skeleton-shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'bounce-in': {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '60%': { transform: 'scale(1.02)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease forwards',
        'fade-up-1': 'fade-up 0.4s ease 60ms forwards',
        'fade-up-2': 'fade-up 0.4s ease 120ms forwards',
        'fade-up-3': 'fade-up 0.4s ease 180ms forwards',
        'fade-up-4': 'fade-up 0.4s ease 240ms forwards',
        'fade-in': 'fade-in 0.3s ease forwards',
        'slide-in': 'slide-in-right 0.25s ease forwards',
        'pulse-dot': 'pulse-dot 2s ease-in-out infinite',
        'spin': 'spin 0.8s linear infinite',
        'bounce-in': 'bounce-in 0.35s ease forwards',
      },
    },
  },
  plugins: [],
};
export default config;
