import Link from 'next/link';
import Image from 'next/image';
import MarketingNav from '@/components/marketing/MarketingNav';

export const metadata = {
  title: 'Media',
  description: 'Press resources, brand assets, and media enquiries for Lucky Squares Australia.',
};

const LOGO_DOWNLOADS = [
  { label: 'Colour (on light)',  file: '/logos/lucky-squares-logo-colour.svg',    bg: '#FDF8F0', note: 'Primary — use on cream, white, and light backgrounds' },
  { label: 'Colour (on dark)',   file: '/logos/lucky-squares-logo-white.svg',     bg: '#1A0A3C', note: 'Use on dark and deep-purple backgrounds' },
  { label: 'Mono black',         file: '/logos/lucky-squares-logo-mono-black.svg', bg: '#ffffff', note: 'Print, embroidery, single-colour applications' },
  { label: 'Icon only',          file: '/logos/lucky-squares-icon.svg',            bg: '#F5F3EE', note: 'App icon, favicon, small formats' },
];

const STATS = [
  { value: '70,000+', label: 'Registered sports clubs in Australia' },
  { value: '$0',      label: 'Taken from fundraising proceeds' },
  { value: '$19',     label: 'Flat fee per campaign launch' },
  { value: '600+',    label: 'Clubs targeted by end of 2026' },
];

export default function MediaPage() {
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
          <Link href="/contact?category=Media+and+partnerships" className="btn btn-purple btn-lg">
            Media enquiry via contact form
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
              { label: 'Pricing',  value: '$19 per campaign or $149/year' },
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
          <blockquote style={{ borderLeft: '4px solid var(--purple)', paddingLeft: 28, margin: '0 0 40px' }}>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 700, fontStyle: 'italic', lineHeight: 1.5, color: 'var(--text)', marginBottom: 16 }}>
              "I've seen firsthand how challenging fundraising can be. A friend was trying to run a Lucky Squares fundraiser using SMS messages and a spreadsheet and complained about how time-consuming it was. I went looking for an online version to help her and was surprised that nobody had already built one. So I did."
            </p>
            <cite style={{ fontSize: 14, fontWeight: 700, color: 'var(--text2)', fontStyle: 'normal' }}>Jamie Stott, Founder, Lucky Squares Australia</cite>
          </blockquote>
        </div>
      </section>

      {/* Founder */}
      <section style={{ padding: '64px 24px', background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--text2)', marginBottom: 36 }}>Founder</div>
          <div style={{ display: 'flex', gap: 40, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flexShrink: 0 }}>
              <div style={{ width: 160, height: 160, borderRadius: 16, overflow: 'hidden', background: 'var(--cream2)', border: '2px solid var(--border)' }}>
                <Image
                  src="/jamie-stott.jpg"
                  alt="Jamie Stott, founder of Lucky Squares Australia"
                  width={160}
                  height={160}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
                />
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 240 }}>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 900, marginBottom: 4, color: 'var(--text)' }}>Jamie Stott</h3>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--purple)', marginBottom: 16 }}>Founder, Lucky Squares Australia</p>
              <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.8, marginBottom: 16 }}>
                Jamie Stott is an Adelaide-based entrepreneur, sportswoman, and community advocate with a passion for helping grassroots organisations thrive. Having previously built and operated multiple businesses and represented South Australia in Masters Hockey, Jamie understands both the financial pressures facing community clubs and the power of sport to bring people together.
              </p>
              <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.8, marginBottom: 16 }}>
                Drawing on her experience in business, fundraising, and community sport, Jamie founded Lucky Squares Australia to give clubs, schools, and not-for-profits a modern, easy-to-use platform that reduces volunteer workload while helping organisations raise more for the causes that matter.
              </p>
              <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.8 }}>
                Away from the platform, Jamie is an active hockey and baseball player, and recently published her first children's book, <em>The Catcher With Heart</em>, a story about courage, kindness, and the joy of playing ball.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section style={{ padding: '64px 24px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--text2)', marginBottom: 36 }}>What clubs are saying</div>
          <div style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 20, padding: '40px 48px', maxWidth: 640, margin: '0 auto' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🏑</div>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 700, fontStyle: 'italic', lineHeight: 1.5, color: 'var(--text)', marginBottom: 20 }}>
              "There is lots of opportunity to do more. The current committee is flat out keeping the basics happening."
            </p>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Colin Hinze</div>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>Umpire Coordinator, Adelaide Hills Hockey Club</div>
          </div>
          <p style={{ marginTop: 20, fontSize: 14, color: 'var(--text2)', fontStyle: 'italic' }}>
            More testimonials coming as our early access campaigns wrap up.
          </p>
        </div>
      </section>

      {/* Logo downloads */}
      <section style={{ padding: '64px 24px', background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--text2)', marginBottom: 8 }}>Brand assets</div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 900, marginBottom: 8, color: 'var(--text)' }}>Logo downloads</h2>
          <p style={{ fontSize: 15, color: 'var(--text2)', marginBottom: 36, lineHeight: 1.7 }}>
            SVG format. Use the colour version for digital, screen, and full-colour print. Use the mono version for embroidery, screen printing, and single-colour applications. Do not alter the proportions, colours, or the position of the gold square.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {LOGO_DOWNLOADS.map(({ label, file, bg, note }) => (
              <div key={label} style={{ border: '1.5px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ background: bg, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                  <img src={file} alt={label} style={{ maxHeight: 52, maxWidth: '80%' }} />
                </div>
                <div style={{ padding: '16px 18px' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 14, lineHeight: 1.5 }}>{note}</div>
                  <a
                    href={file}
                    download
                    style={{ fontSize: 12, fontWeight: 800, color: 'var(--purple)', textDecoration: 'none', border: '1.5px solid var(--purple)', borderRadius: 8, padding: '6px 14px', display: 'inline-block' }}
                  >
                    Download SVG
                  </a>
                </div>
              </div>
            ))}
          </div>
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
            For interview requests, press releases, partnership enquiries, or anything else, reach us via the contact form and select "Media and partnerships" from the dropdown.
          </p>
          <Link href="/contact" className="btn btn-purple btn-lg">
            Get in touch
          </Link>
        </div>
      </section>

    </div>
  );
}
