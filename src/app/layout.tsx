import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Syne, Inter, JetBrains_Mono, Encode_Sans_Expanded } from 'next/font/google';
import './globals.css';

export const metadata: Metadata = {};

const syne = Syne({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-syne',
  display: 'swap',
});

const encodeSansExpanded = Encode_Sans_Expanded({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-encode-sans-expanded',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="hu" suppressHydrationWarning className={`${syne.variable} ${inter.variable} ${jetbrainsMono.variable} ${encodeSansExpanded.variable}`}>
      <body className={`${inter.className} min-h-screen bg-background-main antialiased`}>
        {children}
      </body>
    </html>
  );
}
