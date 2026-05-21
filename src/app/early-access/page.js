'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Logo from '@/components/ui/Logo';

function EarlyAccessContent() {
  const params = useSearchParams();
  const name   = params.get('name') || '';
  const firstName = name.split(' ')[0] || '';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', flexDirection: 'column' }}>
      <div className="rainbow-strip" />

      <header style={{ padding: '20px 24px', display: 'flex', justifyContent: 'center' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <Logo size={96} />
        </Link>
      </header>

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ maxWidth: 560, width: '100%', textAlign: 'center' }}>

          {/* Star badge */}
          <div style={{ marginBottom: 24 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'linear-gradient(135deg, #6B46F5 0%, #a855f7 100%)',
              color: '#fff', fontSize: 13, fontWeight: 800, borderRadius: 99,
              padding: '6px 16px', letterSpacing: '0.03em',
            }}>
              🌟 Foundation Member Early Access
            </span>
          </div>

          {/* Headline */}
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 900, lineHeight: 1.2, marginBottom: 20, color: 'var(--text)' }}>
            {firstName
              ? <>G&apos;day, {firstName}!<br />Welcome to Lucky Squares. 🍀</>
              : <>Welcome to Lucky Squares. 🍀</>}
          </h1>

          <p style={{ fontSize: 16, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 32 }}>
            You&apos;re one of a small group of people getting early access to Lucky Squares
            before we open to the public. We&apos;re grateful you&apos;re here.
          </p>

          {/* Foundation Member box */}
          <div className="scratch-card" style={{ padding: '28px 32px', marginBottom: 32, textAlign: 'left' }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 900, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>🌟</span> The Foundation Member program
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { icon: '🎁', text: 'Your first Lucky Squares campaign launches for free (normally $19).' },
                { icon: '🏅', text: 'Complete your campaign and you earn a permanent Foundation Member badge, shown next to your name on every campaign you run.' },
                { icon: '🎟️', text: 'You go in the draw for a $150 voucher of your choice, drawn when we hit 100 Foundation Members.' },
                { icon: '💌', text: "After your draw we'll ask for a quick testimonial to help other organisers discover Lucky Squares. No pressure." },
              ].map(({ icon, text }) => (
                <div key={icon} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, fontSize: 14, color: 'var(--text2)', lineHeight: 1.6 }}>
                  <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{icon}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text3)' }}>
              The first 100 people to register and complete a campaign become Foundation Members.
              Spots are limited and assigned in order of campaign completion.
            </div>
          </div>

          {/* CTA */}
          <Link
            href="/fundraise?register=1"
            className="btn btn-gold btn-lg"
            style={{ width: '100%', justifyContent: 'center', fontSize: 17 }}
          >
            I&apos;m ready to get started →
          </Link>

          <p style={{ marginTop: 16, fontSize: 12, color: 'var(--text3)' }}>
            Takes you to the Lucky Squares platform. Free to sign up and build your fundraiser.
          </p>
        </div>
      </main>
    </div>
  );
}

export default function EarlyAccessPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)' }}>
        <Logo size={72} />
      </div>
    }>
      <EarlyAccessContent />
    </Suspense>
  );
}
