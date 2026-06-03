'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import MarketingNav from '@/components/marketing/MarketingNav';

// Inline logo icon — renders with page fonts, no import dependency issues
function LogoIcon({ size = 60, containerFill = '#6B46F5', squareFill = 'rgba(255,255,255,0.22)', winnerFill = '#F5C820' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 46 46" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="46" height="46" rx="11" fill={containerFill} />
      <rect x="5"  y="5"  width="8" height="8" rx="2" fill={squareFill} />
      <rect x="15" y="5"  width="8" height="8" rx="2" fill={squareFill} />
      <rect x="25" y="5"  width="8" height="8" rx="2" fill={squareFill} />
      <rect x="35" y="5"  width="6" height="8" rx="2" fill={squareFill} />
      <rect x="5"  y="15" width="8" height="8" rx="2" fill={squareFill} />
      <rect x="15" y="15" width="8" height="8" rx="2" fill={winnerFill} />
      <rect x="25" y="15" width="8" height="8" rx="2" fill={squareFill} />
      <rect x="35" y="15" width="6" height="8" rx="2" fill={squareFill} />
      <rect x="5"  y="25" width="8" height="8" rx="2" fill={squareFill} />
      <rect x="15" y="25" width="8" height="8" rx="2" fill={squareFill} />
      <rect x="25" y="25" width="8" height="8" rx="2" fill={squareFill} />
      <rect x="35" y="25" width="6" height="8" rx="2" fill={squareFill} />
      <rect x="5"  y="35" width="8" height="6" rx="2" fill={squareFill} />
      <rect x="15" y="35" width="8" height="6" rx="2" fill={squareFill} />
      <rect x="25" y="35" width="8" height="6" rx="2" fill={squareFill} />
      <rect x="35" y="35" width="6" height="6" rx="2" fill={squareFill} />
    </svg>
  );
}

function HorizontalLogo({ containerFill, squareFill, winnerFill, luckyColor, squaresColor, ausColor, iconSize = 44 }) {
  const fontSize = Math.round(iconSize * 0.47);
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 11 }}>
      <LogoIcon size={iconSize} containerFill={containerFill} squareFill={squareFill} winnerFill={winnerFill} />
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 900, fontSize, color: luckyColor, letterSpacing: '-0.3px' }}>Lucky</span>
          <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontStyle: 'italic', fontSize, color: squaresColor, letterSpacing: '-0.3px' }}>Squares</span>
        </div>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 8, fontWeight: 700, letterSpacing: '2.2px', textTransform: 'uppercase', color: ausColor, display: 'block', marginTop: 3 }}>Australia</span>
      </div>
    </div>
  );
}

function StackedLogo({ containerFill, squareFill, winnerFill, luckyColor, squaresColor, ausColor, iconSize = 56 }) {
  const fontSize = 21;
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
      <LogoIcon size={iconSize} containerFill={containerFill} squareFill={squareFill} winnerFill={winnerFill} />
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, justifyContent: 'center' }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 900, fontSize, color: luckyColor, letterSpacing: '-0.3px' }}>Lucky</span>
          <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontStyle: 'italic', fontSize, color: squaresColor, letterSpacing: '-0.3px' }}>Squares</span>
        </div>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 8, fontWeight: 700, letterSpacing: '2.2px', textTransform: 'uppercase', color: ausColor, display: 'block', marginTop: 3 }}>Australia</span>
      </div>
    </div>
  );
}

const LOGO_VARIANTS = [
  {
    id: 'horizontal-colour',
    label: 'Horizontal (colour)',
    note: 'Primary — light and cream backgrounds',
    bg: '#FDF8F0',
    download: '/logos/lucky-squares-logo-colour.svg',
    component: <HorizontalLogo containerFill="#6B46F5" squareFill="rgba(255,255,255,0.22)" winnerFill="#F5C820" luckyColor="#6B46F5" squaresColor="#2A1F0F" ausColor="#9C8060" />,
  },
  {
    id: 'horizontal-dark',
    label: 'Horizontal (dark)',
    note: 'Dark and deep-purple backgrounds',
    bg: '#1A0A3C',
    download: '/logos/lucky-squares-logo-white.svg',
    component: <HorizontalLogo containerFill="#7C5CF6" squareFill="rgba(255,255,255,0.25)" winnerFill="#F5C820" luckyColor="#C4B5FD" squaresColor="rgba(255,255,255,0.88)" ausColor="rgba(255,255,255,0.28)" />,
  },
  {
    id: 'horizontal-mono',
    label: 'Horizontal (mono black)',
    note: 'Print, embroidery, single-colour use',
    bg: '#ffffff',
    download: '/logos/lucky-squares-logo-mono-black.svg',
    component: <HorizontalLogo containerFill="#000000" squareFill="rgba(255,255,255,0.2)" winnerFill="rgba(255,255,255,0.9)" luckyColor="#000000" squaresColor="#000000" ausColor="#555555" />,
  },
  {
    id: 'stacked-colour',
    label: 'Stacked (colour)',
    note: 'Square formats, social media, posters',
    bg: '#FDF8F0',
    download: '/logos/lucky-squares-logo-colour.svg',
    component: <StackedLogo containerFill="#6B46F5" squareFill="rgba(255,255,255,0.22)" winnerFill="#F5C820" luckyColor="#6B46F5" squaresColor="#2A1F0F" ausColor="#9C8060" />,
  },
  {
    id: 'stacked-dark',
    label: 'Stacked (dark)',
    note: 'Dark backgrounds, square formats',
    bg: '#1A0A3C',
    download: '/logos/lucky-squares-logo-white.svg',
    component: <StackedLogo containerFill="#7C5CF6" squareFill="rgba(255,255,255,0.25)" winnerFill="#F5C820" luckyColor="#C4B5FD" squaresColor="rgba(255,255,255,0.88)" ausColor="rgba(255,255,255,0.28)" />,
  },
  {
    id: 'stacked-mono',
    label: 'Stacked (mono black)',
    note: 'Embossing, laser engraving, stamps',
    bg: '#F0F0F0',
    download: '/logos/lucky-squares-logo-mono-black.svg',
    component: <StackedLogo containerFill="#000000" squareFill="rgba(255,255,255,0.2)" winnerFill="rgba(255,255,255,0.9)" luckyColor="#000000" squaresColor="#000000" ausColor="#555555" />,
  },
];

const STATS = [
  { value: '70,000+', label: 'Registered sports clubs in Australia' },
  { value: '$0',      label: 'Taken from fundraising proceeds' },
  { value: '$19',     label: 'Flat fee per campaign' },
  { value: '600+',    label: 'Clubs targeted by end of 2026' },
];

export default function MediaPage() {
  const [copied, setCopied] = useState(false);

  return (
    <div style={{ background: 'var(--cream)', minHeight: '100vh' }}>
      <MarketingNav />

      {/* Hero */}
      <section style={{ padding: '72px 24px 56px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(107,70,245,.08)', borderRadius: 20, padding: '6px 16px', marginBottom: 20, fontSize: 13, fontWeight: 800, color: 'var(--purple)', textTransform: 'uppercase', letterSpacing: 1 }}>
            Press and Media
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(34px, 5vw, 52px)', fontWeight: 900, lineHeight: 1.1, marginBottom: 20, color: 'var(--text)' }}>
            Everything you need to write about Lucky Squares
          </h1>
          <p style={{ fontSize: 18, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 36 }}>
            We are on a mission to make fundraising less painful for the clubs, schools, and charities that keep Australian communities running. Help us spread the word.
          </p>
          <Link href="/contact" className="btn btn-purple btn-lg">
            Media enquiry
          </Link>
        </div>
      </section>

      {/* About */}
      <section style={{ padding: '64px 24px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--text2)', marginBottom: 16 }}>About</div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 900, marginBottom: 24, color: 'var(--text)', lineHeight: 1.2 }}>
            The easiest way to run a Lucky Squares fundraiser in Australia
          </h2>
          <div style={{ fontSize: 17, color: 'var(--text2)', lineHeight: 1.8, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p>
              Lucky Squares Australia is an online fundraising platform built for schools, sporting clubs, charities, and community organisations. It lets any organisation run a Lucky Squares grid fundraiser entirely online, from setup through to the live draw, without paper grids, cash handling, or the spreadsheet chaos that has made the format so burdensome for volunteers.
            </p>
            <p>
              Participants buy squares via a shared link, pay securely by card or bank transfer, and watch the draw happen live. Organisers get real-time visibility of sales, a digital record of every transaction, and more time to focus on their community rather than their admin.
            </p>
            <p>
              Lucky Squares Australia charges a flat fee per campaign with no percentage cut from proceeds, so every dollar raised by participants goes directly to the organisation. The platform is designed to be used by anyone, with no technical knowledge required.
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ padding: '64px 24px', background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--text2)', marginBottom: 36, textAlign: 'center' }}>At a glance</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 2 }}>
            {STATS.map(({ value, label }) => (
              <div key={label} style={{ textAlign: 'center', padding: '32px 20px' }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 40, fontWeight: 900, color: 'var(--purple)', marginBottom: 8, lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600, lineHeight: 1.4 }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 40, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {[
              { label: 'Founded',  value: '2026' },
              { label: 'Based',    value: 'Adelaide, South Australia' },
              { label: 'Pricing',  value: '$19 per campaign or $149/year unlimited' },
              { label: 'Platform', value: 'luckysquares.com.au' },
            ].map(({ label, value }) => (
              <div key={label} style={{ padding: '16px 20px', background: 'var(--cream)', borderRadius: 12, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--text2)', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Founder quote */}
      <section style={{ padding: '64px 24px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <blockquote style={{ borderLeft: '4px solid var(--purple)', paddingLeft: 28, margin: 0 }}>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 700, fontStyle: 'italic', lineHeight: 1.5, color: 'var(--text)', marginBottom: 16 }}>
              "I've seen firsthand how challenging fundraising can be. A friend was trying to run a Lucky Squares fundraiser using SMS messages and a spreadsheet and complained about how time-consuming it was. I went looking for an online version to help her and was surprised that nobody had already built one. So I did."
            </p>
            <cite style={{ fontSize: 14, fontWeight: 700, color: 'var(--text2)', fontStyle: 'normal' }}>Jamie Stott, Founder and CEO, Lucky Squares Australia</cite>
          </blockquote>
        </div>
      </section>

      {/* The problem */}
      <section style={{ padding: '64px 24px', background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--text2)', marginBottom: 16 }}>The challenge</div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 900, marginBottom: 24, color: 'var(--text)' }}>
            Volunteers are already stretched
          </h2>
          <p style={{ fontSize: 17, color: 'var(--text2)', lineHeight: 1.8, marginBottom: 32 }}>
            There are more than 70,000 registered sports clubs in Australia alone. Most rely heavily on volunteers who are already stretched just keeping operations running. Fundraising falls to the same small group of people, every time.
          </p>
          <div style={{ background: 'var(--cream)', border: '1.5px solid var(--border)', borderRadius: 16, padding: '28px 32px' }}>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 700, fontStyle: 'italic', lineHeight: 1.6, color: 'var(--text)', marginBottom: 16 }}>
              "There is lots of opportunity to do more. The current committee is flat out keeping the basics happening."
            </p>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Colin Hinze</div>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>Umpire Coordinator, Adelaide Hills Hockey Club</div>
          </div>
          <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.7, marginTop: 24 }}>
            Lucky Squares Australia was built specifically to reduce that load, turning a fundraiser that once required paper grids, cash handling, spreadsheets, and manual draws into something that runs itself online.
          </p>
        </div>
      </section>

      {/* Founder */}
      <section style={{ padding: '64px 24px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--text2)', marginBottom: 36 }}>Founder</div>
          <div style={{ display: 'flex', gap: 40, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flexShrink: 0 }}>
              <div style={{ width: 180, height: 180, borderRadius: 16, overflow: 'hidden', background: 'var(--cream2)', border: '2px solid var(--border)' }}>
                <Image
                  src="/jamie-stott.jpg"
                  alt="Jamie Stott, founder of Lucky Squares Australia"
                  width={180}
                  height={180}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
                />
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 260 }}>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 900, marginBottom: 4, color: 'var(--text)' }}>Jamie Stott</h3>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--purple)', marginBottom: 20 }}>Founder and CEO, Lucky Squares Australia</p>
              <div style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.85, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p>
                  Jamie Stott is an Adelaide-based entrepreneur, sportswoman, and community advocate with a long history in community sport. She has represented South Australia in Masters Hockey, played competitive baseball, and spent years giving back to the clubs and competitions that shaped her. Jamie understands both the financial pressures facing community organisations and the power of sport to bring people together.
                </p>
                <p>
                  Drawing on that experience, Jamie co-founded Play With Heart Pty Ltd (trading as Lucky Squares Australia) to give clubs, schools, and not-for-profits a modern, easy-to-use platform that reduces volunteer workload while helping organisations raise more for the causes that matter.
                </p>
                <p>
                  Jamie is a participant in the 2025 cohort of the Marjorie Jackson-Nelson Centre for Women in Sport at the University of South Australia, a program supporting women leaders across the Australian sport sector.
                </p>
                <p>
                  Away from the platform, Jamie recently published her first children's book, <em>The Catcher With Heart</em>, a story about courage, kindness, and the joy of playing ball.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logo downloads */}
      <section style={{ padding: '64px 24px', background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--text2)', marginBottom: 8 }}>Brand assets</div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 900, marginBottom: 8, color: 'var(--text)' }}>Logo downloads</h2>
          <p style={{ fontSize: 15, color: 'var(--text2)', marginBottom: 36, lineHeight: 1.7, maxWidth: 640 }}>
            SVG format. Use colour versions for digital and full-colour print. Use mono for embroidery, screen printing, and single-colour applications. Do not alter the proportions, colours, or the position of the gold winner square.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            {LOGO_VARIANTS.map(({ id, label, note, bg, download, component }) => (
              <div key={id} style={{ border: '1.5px solid var(--border)', borderRadius: 16, overflow: 'hidden', background: 'var(--cream)' }}>
                <div style={{ background: bg, minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 28 }}>
                  {component}
                </div>
                <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.4 }}>{note}</div>
                  </div>
                  <a
                    href={download}
                    download={`lucky-squares-${id}.svg`}
                    style={{ fontSize: 12, fontWeight: 800, color: 'var(--purple)', textDecoration: 'none', border: '1.5px solid var(--purple)', borderRadius: 8, padding: '6px 14px', whiteSpace: 'nowrap', flexShrink: 0 }}
                  >
                    SVG ↓
                  </a>
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 20, fontStyle: 'italic' }}>
            Downloaded SVGs use Fraunces and Nunito. These fonts are available free from Google Fonts.
          </p>
        </div>
      </section>

      {/* Media contact */}
      <section style={{ padding: '72px 24px 80px', textAlign: 'center' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>📬</div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 32, fontWeight: 900, marginBottom: 16, color: 'var(--text)' }}>
            Media enquiries
          </h2>
          <p style={{ fontSize: 16, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 32 }}>
            For interview requests, commentary, press releases, or partnership enquiries, reach us via the contact form and select "Media and partnerships" from the dropdown. We aim to respond within one business day.
          </p>
          <Link href="/contact" className="btn btn-purple btn-lg">
            Get in touch
          </Link>
        </div>
      </section>
    </div>
  );
}
