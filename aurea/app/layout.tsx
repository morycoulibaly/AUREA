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
  title: {
    default: 'AUREA — Bijoux et accessoires de beauté en 3D',
    template: '%s | AUREA',
  },
  description:
    "Découvrez AUREA, maison d'accessoires de beauté et de haute fantaisie. Explorez en 3D nos montres, bagues et chaînes, puis composez votre pièce dans l'alliage et la taille de votre choix.",
  keywords: [
    'AUREA',
    'bijoux de créateur',
    'accessoires de beauté',
    'haute fantaisie',
    'montre design',
    'bague contemporaine',
    'chaîne de créateur',
    'bijoux 3D',
    'bijoux personnalisables',
  ],
  applicationName: 'AUREA',
  authors: [{ name: 'AUREA' }],
  creator: 'AUREA',
  category: 'Jewelry and fashion accessories',
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: 'AUREA',
    title: 'AUREA — Bijoux et accessoires de beauté en 3D',
    description:
      'Montres, bagues et chaînes imaginées comme des galets de lumière. Explorez la collection AUREA et composez votre pièce en 3D.',
  },
  twitter: {
    card: 'summary',
    title: 'AUREA — Bijoux et accessoires de beauté en 3D',
    description:
      'Explorez les montres, bagues et chaînes AUREA en 3D et composez votre pièce.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0E0D12',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'AUREA',
    description:
      "Maison d'accessoires de beauté et de haute fantaisie : montres, bagues et chaînes configurables en 3D.",
    brand: { '@type': 'Brand', name: 'AUREA' },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Collection AUREA',
      itemListElement: [
        { '@type': 'Offer', itemOffered: { '@type': 'Product', name: 'Montre AUREA' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Product', name: 'Bague AUREA' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Product', name: 'Chaîne AUREA' } },
      ],
    },
  };

  return (
    <html lang="fr" className={jakarta.variable} suppressHydrationWarning>
      <body className="bg-[#0E0D12] font-sans text-[#F5F4F7] antialiased">
        {children}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      </body>
    </html>
  );
}
