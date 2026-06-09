import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'VoltAdvance — Utility Credit Infrastructure for Africa',
    template: '%s | VoltAdvance',
  },
  description: 'A meter-centric utility advance and recovery network that automatically recovers advances from future electricity purchases regardless of where the purchase occurs.',
  keywords: ['prepaid electricity', 'utility advance', 'South Africa', 'meter credit', 'electricity advance'],
  openGraph: {
    title: 'VoltAdvance',
    description: 'Emergency electricity advances. Repaid automatically.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>" />
      </head>
      <body>{children}</body>
    </html>
  );
}
