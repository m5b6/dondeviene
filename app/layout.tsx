import type { Metadata, Viewport } from 'next';
import { Archivo } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';

const archivo = Archivo({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-archivo',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#121212',
};

export const metadata: Metadata = {
  title: { default: 'Dónde viene', template: '%s · Dónde viene' },
  description: 'Cuándo llega tu micro en Santiago, con los datos de Red Movilidad.',
  applicationName: 'Dónde viene',
  appleWebApp: { capable: true, title: 'Dónde viene', statusBarStyle: 'black-translucent' },
  formatDetection: { telephone: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={archivo.variable}>
      <body>{children}</body>
    </html>
  );
}
