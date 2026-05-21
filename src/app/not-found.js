'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import MarketingNav from '@/components/marketing/MarketingNav';

const BLOOPERS = [
  {
    image:    '/404/own-goal.png',
    headline: 'Own goal.',
    body:     "You've scored a perfect own goal. The page you were looking for isn't here, and somehow that's still impressive. The crowd is very confused.",
    label:    'At least you scored',
  },
  {
    image:    '/404/wrong-gear.png',
    headline: 'Right sport, wrong gear.',
    body:     "You've arrived at the right website with entirely the wrong URL. Confident energy. Completely wrong execution. Points for commitment.",
    label:    'Try again with the right equipment',
  },
  {
    image:    '/404/boundary-rope.png',
    headline: 'You\'ve run past the boundary rope.',
    body:     "Four runs. Except there's no ball, no pitch, and no page here. You sprinted beautifully into absolutely nothing. The umpire is signalling wide.",
    label:    'Back to the crease',
  },
  {
    image:    '/404/false-start.png',
    headline: 'False start.',
    body:     "Page disqualified. You were off before the gun and ended up somewhere that doesn't exist. Please return to your blocks and try again.",
    label:    'Back to the blocks',
  },
  {
    image:    '/404/sub-board.png',
    headline: 'You\'ve been subbed off.',
    body:     "Number 404 please leave the field. The page you were looking for has been replaced and nobody is quite sure by what. The coach looks as confused as you do.",
    label:    'Back to the bench',
  },
  {
    image:    '/404/coin-toss.png',
    headline: 'The coin went down a drain.',
    body:     "You won the toss and elected to visit a page that doesn't exist. The referee is on their hands and knees. Nobody is winning this one.",
    label:    'Call it again',
  },
  {
    image:    '/404/equipment-check.png',
    headline: 'Non-regulation URL.',
    body:     "The referee has inspected what you typed and found it to be completely non-regulation. Please return to the tunnel and try again with the correct equipment.",
    label:    'Back to the tunnel',
  },
  {
    image:    '/404/wrong-end.png',
    headline: 'Wrong end of the ground.',
    body:     "You've kicked a beautiful goal. Sadly it was straight into your own end and this page doesn't exist. The scoreboard tells an uncomfortable story.",
    label:    'Turn around',
  },
  {
    image:    '/404/umpires-call.png',
    headline: "Umpire's call.",
    body:     "Both arms pointing in completely opposite directions. The batter is baffled. The catcher is baffled. The page isn't here and nobody can explain why. Decision stands.",
    label:    'Request a review',
  },
];

export default function NotFound() {
  const [blooper, setBlooper] = useState(BLOOPERS[0]);
  const [loaded,  setLoaded]  = useState(false);

  useEffect(() => {
    setBlooper(BLOOPERS[Math.floor(Math.random() * BLOOPERS.length)]);
    setLoaded(true);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      <MarketingNav />

      <section style={{ padding: '64px 24px 80px', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>

          {/* Image */}
          <div style={{
            width: 280, height: 280,
            margin: '0 auto 32px',
            borderRadius: '50%',
            background: 'var(--cream2)',
            border: '3px solid var(--border)',
            overflow: 'hidden',
            opacity: loaded ? 1 : 0,
            transition: 'opacity .3s ease',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <img
              src={blooper.image}
              alt={blooper.headline}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          {/* 404 badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(107,70,245,.1)', borderRadius: 20,
            padding: '6px 16px', marginBottom: 20,
            fontSize: 13, fontWeight: 800, color: 'var(--purple)',
            textTransform: 'uppercase', letterSpacing: .5,
          }}>
            404
          </div>

          {/* Headline */}
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(28px, 5vw, 44px)',
            fontWeight: 900, lineHeight: 1.15,
            marginBottom: 20, color: 'var(--text)',
          }}>
            {blooper.headline}
          </h1>

          {/* Body */}
          <p style={{
            fontSize: 17, color: 'var(--text2)',
            lineHeight: 1.75, maxWidth: 460,
            margin: '0 auto 36px',
          }}>
            {blooper.body}
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/" className="btn btn-primary">
              Take me home →
            </Link>
            <Link href="/contact" className="btn btn-outline">
              Contact us
            </Link>
          </div>

          {/* Reload for another */}
          <button
            onClick={() => setBlooper(BLOOPERS[Math.floor(Math.random() * BLOOPERS.length)])}
            style={{
              marginTop: 32, background: 'none', border: 'none',
              fontSize: 13, color: 'var(--text3)', cursor: 'pointer',
              fontFamily: 'inherit', fontWeight: 600,
              textDecoration: 'underline', textUnderlineOffset: 3,
            }}
          >
            Show me another blooper
          </button>

        </div>
      </section>
    </div>
  );
}
