import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-jakarta',
});

export const metadata: Metadata = {
  title: 'AUREA — Accessoires de beauté & haute fantaisie',
  description:
    "AUREA, maison d'accessoires de beauté et de haute fantaisie : montres, bagues et chaînes à configurer en 3D.",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0E0D12',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={jakarta.variable} suppressHydrationWarning>
      <body className="bg-[#0E0D12] font-sans text-[#F5F4F7] antialiased">{children}</body>
    </html>
  );
}
