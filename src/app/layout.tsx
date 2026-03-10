import type { ReactNode } from 'react';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
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
    <html lang="hu" suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className={`${inter.className} min-h-screen bg-background-main antialiased`}>
        {children}
      </body>
    </html>
  );
}
