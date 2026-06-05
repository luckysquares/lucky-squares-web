import Link from 'next/link';
import Logo from '@/components/ui/Logo';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-top">
          <div className="footer-brand">
            <div style={{ marginBottom: 12 }}>
              <Logo size={36} white />
            </div>
            <p className="footer-tagline">
              The easiest way to run a Lucky Squares fundraiser in Australia.
              Built for schools, clubs, and charities.
            </p>
          </div>

          <div className="footer-col">
            <div className="footer-col-title">Product</div>
            <Link href="/how-it-works">How it works</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/fundraise">Start a fundraiser</Link>
            <Link href="/org-signup">Organisation plan</Link>
            <Link href="/feeling-lucky">Feeling Lucky</Link>
            <Link href="/whats-new">What&apos;s new</Link>
          </div>

          <div className="footer-col">
            <div className="footer-col-title">Support</div>
            <Link href="/faq">FAQ</Link>
            <Link href="/contact">Contact us</Link>
            <Link href="/blog">Blog</Link>
            <Link href="/media">Media</Link>
          </div>

          <div className="footer-col">
            <div className="footer-col-title">Legal</div>
            <Link href="/terms">Terms of service</Link>
            <Link href="/participant-terms">Participant terms</Link>
            <Link href="/privacy">Privacy policy</Link>
            <Link href="/fair-play">Fair Play policy</Link>
            <Link href="/raffle-compliance">Raffle compliance</Link>
            <Link href="/investor">Investors</Link>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Play With Heart Pty Ltd ACN 698 202 069 (trading as Lucky Squares Australia)</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,.35)' }}>
            Fundraising regulations vary by state. Always check your local requirements.
          </span>
        </div>
      </div>
    </footer>
  );
}
