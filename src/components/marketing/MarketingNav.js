'use client';

import Link from 'next/link';
import Logo from '@/components/ui/Logo';

export default function MarketingNav() {
  return (
    <>
      <div className="rainbow-strip" />
      <nav className="marketing-nav">
        <div className="marketing-nav-inner">
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Logo size={36} />
            <div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 900, color: 'var(--text)', letterSpacing: '-.5px' }}>
                LuckySquares
              </div>
              <div style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
                Australia
              </div>
            </div>
          </Link>

          <div className="nav-links">
            <Link href="/how-it-works" className="nav-link">How it works</Link>
            <Link href="/pricing" className="nav-link">Pricing</Link>
            <Link href="/feeling-lucky" className="nav-link">🍀 Feeling Lucky?</Link>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link href="/fundraise" className="btn btn-outline btn-sm">Sign in</Link>
            <Link href="/fundraise" className="btn btn-gold btn-sm">Start for free →</Link>
          </div>
        </div>
      </nav>
    </>
  );
}
