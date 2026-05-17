import { Fraunces, Nunito } from 'next/font/google';
import './globals.css';
import Footer from '@/components/marketing/Footer';

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
  title: {
    default: 'LuckySquares Australia: Fundraise with a Lucky Squares grid',
    template: '%s | LuckySquares Australia',
  },
  description:
    'The easiest way to run a Lucky Squares fundraiser in Australia. Set up your grid in minutes, sell squares online, and run a live draw. Perfect for schools, sports clubs, and charities.',
  keywords: ['lucky squares', 'fundraiser', 'australia', 'school fundraiser', 'raffle', 'sports club'],
  openGraph: {
    title: 'LuckySquares Australia',
    description: 'Set up a Lucky Squares fundraiser in minutes. Sell squares, run your draw, raise funds.',
    locale: 'en_AU',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en-AU" className={`${fraunces.variable} ${nunito.variable}`}>
      <body style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <div style={{ flex: '1 0 auto', display: 'flex', flexDirection: 'column' }}>{children}</div>
        <Footer />
      </body>
    </html>
  );
}
