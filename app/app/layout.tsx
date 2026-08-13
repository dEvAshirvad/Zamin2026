import type { Metadata } from 'next';
import {
  Courier_Prime,
  IBM_Plex_Sans_Devanagari,
  Special_Elite,
} from 'next/font/google';

import { QueryProvider } from '@/components/providers/query-provider';
import { cn } from '@/lib/utils';

import './globals.css';

// Archivist stack: Courier Prime body/mono, Special Elite headings.
// Devanagari falls through to Plex Sans Devanagari.
const courierPrime = Courier_Prime({
  variable: '--font-courier',
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
});

const specialElite = Special_Elite({
  variable: '--font-elite',
  subsets: ['latin'],
  weight: '400',
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
    default: 'सीमांकन · Simankan',
    template: '%s · सीमांकन',
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
        courierPrime.variable,
        specialElite.variable,
        plexDevanagari.variable,
      )}
    >
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
