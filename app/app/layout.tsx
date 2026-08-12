import type { Metadata } from 'next';
import {
  Geist,
  Geist_Mono,
  IBM_Plex_Sans_Devanagari,
} from 'next/font/google';

import { QueryProvider } from '@/components/providers/query-provider';
import { cn } from '@/lib/utils';

import './globals.css';

// Latin → Geist; Devanagari falls through to Plex Sans Devanagari.
// Stack order lives in globals.css (`--font-sans`); these publish CSS vars.
const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

const plexDevanagari = IBM_Plex_Sans_Devanagari({
  variable: '--font-plex-deva',
  subsets: ['devanagari', 'latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'ज़मीन · Zamin',
    template: '%s · ज़मीन',
  },
  description: 'सीमांकन प्रकरण ट्रैकर — लोक सेवा गारंटी के साथ',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
  },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="hi"
      className={cn(
        'h-full',
        'antialiased',
        geistSans.variable,
        geistMono.variable,
        plexDevanagari.variable,
      )}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
