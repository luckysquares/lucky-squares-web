'use client';

import { useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/ui/Logo';

const DEFAULT_NAV_LINKS = [
  { href: '/how-it-works', label: 'How it works' },
  { href: '/pricing',      label: 'Pricing' },
  { href: '/feeling-lucky', label: '🍀 Feeling Lucky?' },
];

export default function MarketingNav({ links } = {}) {
  const NAV_LINKS = links ?? DEFAULT_NAV_LINKS;
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="marketing-header">
      <div className="rainbow-strip" />
      <nav className="marketing-nav">
        <div className="marketing-nav-inner">
          <Link href="/" onClick={close}>
            <Logo size={88} priority />
          </Link>

          {/* Desktop links */}
          <div className="nav-links">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="nav-link">{l.label}</Link>
            ))}
          </div>

          {/* Desktop CTA buttons */}
          <div className="nav-cta">
            <Link href="/fundraise" className="btn btn-outline btn-sm">Sign in</Link>
            <Link href="/fundraise?register=1" className="btn btn-purple btn-sm">Start for free →</Link>
          </div>

          {/* Hamburger — mobile only */}
          <button
            className="nav-hamburger"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            <span className={`ham-bar ${open ? 'open' : ''}`} />
            <span className={`ham-bar ${open ? 'open' : ''}`} />
            <span className={`ham-bar ${open ? 'open' : ''}`} />
          </button>
        </div>

        {/* Mobile drawer */}
        {open && (
          <div className="mobile-menu">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="mobile-menu-link" onClick={close}>
                {l.label}
              </Link>
            ))}
            <div className="mobile-menu-cta">
              <Link href="/fundraise" className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={close}>
                Sign in
              </Link>
              <Link href="/fundraise?register=1" className="btn btn-purple" style={{ flex: 1, justifyContent: 'center' }} onClick={close}>
                Start for free →
              </Link>
            </div>
          </div>
        )}
      </nav>
    </div>
  );
}
