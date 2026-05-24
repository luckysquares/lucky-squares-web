import { Fraunces, Nunito } from 'next/font/google';
import { Suspense } from 'react';
import Script from 'next/script';
import { headers } from 'next/headers';
import './globals.css';
import Footer from '@/components/marketing/Footer';
import ReferralCapture from '@/components/app/ReferralCapture';
import MariposaChatWidget from '@/components/app/MariposaChatWidget';
import ErrorReporter from '@/components/app/ErrorReporter';
import { Analytics } from '@vercel/analytics/next';

const GA_ID = 'G-X20WB95ZM1';
const SITE_URL = 'https://luckysquares.com.au';

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  style: ['normal', 'italic'],
  variable: '--font-fraunces',
  display: 'swap',
});

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-nunito',
  display: 'swap',
});

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata = {
  metadataBase: new URL(SITE_URL),
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Lucky Squares',
  },
  title: {
    default: 'Lucky Squares Australia: Online Fundraising for Schools, Clubs and Charities',
    template: '%s | Lucky Squares Australia',
  },
  description:
    'The easiest way to run a Lucky Squares fundraiser in Australia. Set up your grid in minutes, sell squares online, and run a live draw. Perfect for schools, sports clubs, and charities.',
  keywords: ['lucky squares', 'fundraiser', 'australia', 'school fundraiser', 'raffle', 'sports club', 'charity fundraising', 'P&C fundraiser'],
  authors: [{ name: 'Lucky Squares Australia', url: SITE_URL }],
  creator: 'Lucky Squares Australia',
  openGraph: {
    title: 'Lucky Squares Australia: Online Fundraising for Schools, Clubs and Charities',
    description: 'Set up a Lucky Squares fundraiser in minutes. Sell squares online, run a live draw, and raise more for your community.',
    url: SITE_URL,
    siteName: 'Lucky Squares Australia',
    locale: 'en_AU',
    type: 'website',
    images: [
      {
        url: '/og-default.png',
        width: 1200,
        height: 630,
        alt: 'Lucky Squares Australia: Online fundraising for schools, clubs and charities',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lucky Squares Australia: Online Fundraising for Schools, Clubs and Charities',
    description: 'Set up a Lucky Squares fundraiser in minutes. Sell squares online, run a live draw, and raise more for your community.',
    images: ['/og-default.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  verification: {
    google: '1nLNp-dfjY8lWCR6K7l18oMGgiD4ZXlTe1Iu2biFmn4',
  },
};

export default async function RootLayout({ children }) {
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') ?? '';
  const isStandalone = pathname.endsWith('/certificate');

  return (
    <html lang="en-AU" className={`${fraunces.variable} ${nunito.variable}`}>
      <body style={isStandalone ? {} : { display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {!isStandalone && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
            <Script id="ga4-init" strategy="afterInteractive">{`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_ID}', { page_path: window.location.pathname });
            `}</Script>
            <Suspense fallback={null}><ReferralCapture /></Suspense>
          </>
        )}
        {isStandalone
          ? children
          : <div style={{ flex: '1 0 auto', display: 'flex', flexDirection: 'column' }}>{children}</div>
        }
        {!isStandalone && <Footer />}
        {!isStandalone && <div data-mariposa-widget><MariposaChatWidget /></div>}
        <ErrorReporter />
        <Analytics />
      </body>
    </html>
  );
}
