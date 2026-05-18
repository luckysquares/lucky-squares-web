import Link from 'next/link';
import MarketingNav from '@/components/marketing/MarketingNav';

export default function HomePage() {
  return (
    <>
      <MarketingNav />

      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-blob hero-blob-1" />
        <div className="hero-blob hero-blob-2" />
        <div className="hero-blob hero-blob-3" />
        <div className="hero-blob hero-blob-4" />
        <div className="hero-dots" />

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(107,70,245,.12)', borderRadius: 20, padding: '6px 14px', marginBottom: 24, fontSize: 13, fontWeight: 700, color: 'var(--purple)' }}>
          🍀 Now in closed beta, free to try
        </div>
        <h1 className="hero-title">
          The <span style={{ background: 'linear-gradient(135deg, #A78BFA 0%, #7C3AED 50%, #4A28D4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>easiest</span> Lucky Squares <span style={{ background: 'linear-gradient(135deg, #A78BFA 0%, #7C3AED 50%, #4A28D4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>fundraiser</span> in Australia
        </h1>
        <p className="hero-sub">
          Set up your fundraising campaign in minutes, share a link, and watch the squares sell. Run a live draw when you&apos;re ready. No spreadsheets, no unintelligible handwriting and no cash handling headaches.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/fundraise?register=1" className="btn btn-purple btn-xl">
            Start your fundraiser free →
          </Link>
          <Link href="/how-it-works" className="btn btn-outline btn-lg">
            ▷ See how it works
          </Link>
        </div>

        {/* mini grid preview */}
        <div style={{ marginTop: 64, display: 'flex', justifyContent: 'center' }}>
          <MiniGridPreview />
        </div>
      </section>

      {/* ── Logos / social proof ── */}
      <section style={{ background: '#fff', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '28px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 20 }}>
            Trusted by schools, sports clubs &amp; charities across Australia
          </p>
          <div style={{ display: 'flex', gap: 32, justifyContent: 'center', flexWrap: 'wrap', opacity: .6 }}>
            {['🏫 Sunbury Primary', '🏉 Werribee Eagles', '🐨 Wildlife Friends', '⚽ Bayside FC', '🎓 St Brendan\'s P&C'].map((org) => (
              <span key={org} style={{ fontSize: 14, fontWeight: 700, color: 'var(--text2)' }}>{org}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="section section-hero-bg">
        <div className="section-inner">
          <div style={{ textAlign: 'center', marginBottom: 0 }}>
            <div className="section-label">Simple as 1, 2, 3</div>
            <h2 className="section-heading" style={{ margin: '0 auto' }}>
              Setup and launch in under five minutes
            </h2>
          </div>
          <div className="steps-grid">
            <div style={{ background: '#fff', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', border: '1.5px solid var(--border)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ width: '100%', height: 220, overflow: 'hidden', background: 'var(--cream2)' }}>
                <img src="/sports-club-fundraiser.PNG" alt="Sports club fundraiser" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
              </div>
              <div className="step-card" style={{ padding: '24px 28px 28px' }}>
                <div className="step-num">1</div>
                <h3 className="step-title">Create your grid</h3>
                <p className="step-desc">
                  Choose 25, 50, or 100 squares. Set your price per square, add your prizes, and write a short description of what you&apos;re raising money for. Takes about 5 minutes.
                </p>
              </div>
            </div>
            <div style={{ background: '#fff', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', border: '1.5px solid var(--border)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ width: '100%', height: 220, overflow: 'hidden', background: 'var(--cream2)' }}>
                <img src="/lucky-squares-fundraiser.PNG" alt="Lucky squares fundraiser" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
              </div>
              <div className="step-card" style={{ padding: '24px 28px 28px' }}>
                <div className="step-num">2</div>
                <h3 className="step-title">Share &amp; sell</h3>
                <p className="step-desc">
                  Share your fundraiser link via social media, WhatsApp, email, or your club app. Buyers pick their squares and pay however suits them: in person, by bank transfer, or online by card. Their numbers are confirmed instantly.
                </p>
              </div>
            </div>
            <div style={{ background: '#fff', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', border: '1.5px solid var(--border)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ width: '100%', height: 220, overflow: 'hidden', background: 'var(--cream2)' }}>
                <img src="/help-for-sports-clubs-to-raise-money.PNG" alt="Help for sports clubs to raise money" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
              </div>
              <div className="step-card" style={{ padding: '24px 28px 28px' }}>
                <div className="step-num">3</div>
                <h3 className="step-title">Run your draw</h3>
                <p className="step-desc">
                  When you&apos;re ready, hit the draw button. A winner is randomly selected from all purchased squares. Share the moment live. It&apos;s always a crowd pleaser!
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="section section-solid-bg">
        <div className="section-inner">
          <div className="section-label">Everything you need</div>
          <h2 className="section-heading">Built for Australian fundraisers</h2>
          <div className="feature-grid">
            {[
              { icon: '🔢', title: 'Sequential numbered squares', desc: 'Clean 25, 50, or 100 square grids. Each buyer gets a unique numbered square. No duplicates, no confusion.' },
              { icon: '📱', title: 'Works on any device', desc: 'Your buyers can pick squares from their phone, tablet, or desktop. No app download needed, just a link.' },
              { icon: '🏆', title: 'Live draw moment', desc: 'Run your draw inside the app. A winner is selected at random and the result is revealed with fanfare. Perfect for a live event.' },
              { icon: '💳', title: 'Flexible payments', desc: 'Collect in person, accept bank transfers, or take secure online card payments. Four options to suit any fundraiser style.' },
              { icon: '⏱️', title: '7-minute reservations', desc: "Squares are held for 7 minutes while someone pays. If they don't complete, the squares release automatically for someone else." },
              { icon: '🇦🇺', title: 'Built for Australia', desc: 'BSB/account bank transfers, AUD pricing, and compliance notes for each state\'s raffle regulations. We\'ve done the homework.' },
            ].map((f) => (
              <div key={f.title} style={{ background: '#fff', borderRadius: 'var(--radius)', border: '1.5px solid var(--border)', padding: 28, boxShadow: 'var(--shadow)' }}>
                <div className="feature-icon">{f.icon}</div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="section section-hero-bg">
        <div className="section-inner">
          <div style={{ textAlign: 'center', marginBottom: 0 }}>
            <div className="section-label">What people say</div>
            <h2 className="section-heading" style={{ margin: '0 auto' }}>Real fundraisers, real results</h2>
          </div>
          <div className="testimonial-grid">
            {[
              { quote: "We raised $1,800 in two days for our school camp. Parents loved picking their own squares. It felt personal and exciting. The live draw was a highlight at assembly.", name: 'Mel T.', role: 'P&C President, Sunbury Primary School' },
              { quote: "Used to do this on a whiteboard at the club. Now we share a link in the WhatsApp group and the grid fills itself. Saved me hours of admin and the kids love watching the squares get sold.", name: 'Dave K.', role: 'Treasurer, Werribee Eagles AFC' },
              { quote: "Simple, clean, Australian. I appreciated that bank transfer was a proper option. Half our donors are older and don't use card. Raised $2,500 for our koala rescue program.", name: 'Priya S.', role: 'Volunteer Coordinator, Wildlife Friends VIC' },
            ].map((t) => (
              <div key={t.name} className="testimonial-card">
                <p className="testimonial-quote">&quot;{t.quote}&quot;</p>
                <div className="testimonial-name">{t.name}</div>
                <div className="testimonial-role">{t.role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="section section-solid-bg">
        <div className="section-inner">
          <div style={{ textAlign: 'center' }}>
            <div className="section-label">Pricing</div>
            <h2 className="section-heading" style={{ margin: '0 auto' }}>Straightforward, no surprises</h2>
            <p className="section-body" style={{ margin: '12px auto 0', textAlign: 'center' }}>
              Try it free. Pay only when your fundraiser goes live.
            </p>
          </div>
          <div className="pricing-grid" style={{ maxWidth: 900, margin: '48px auto 0' }}>
            <div className="pricing-card">
              <div className="pricing-name">Trial</div>
              <div className="pricing-price">Free</div>
              <p className="pricing-desc">Try everything with a demo fundraiser before you commit.</p>
              <ul className="pricing-features">
                <li>Full grid builder &amp; wizard</li>
                <li>Demo grid (no real payments)</li>
                <li>Up to 3 draft fundraisers</li>
                <li>All screens &amp; draw features</li>
              </ul>
              <Link href="/fundraise?register=1" className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }}>
                Get started free
              </Link>
            </div>

            <div className="pricing-card featured">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="pricing-name">Casual</div>
                <span className="tag" style={{ background: 'var(--purple-light)', color: 'var(--purple)', border: '1px solid rgba(107,70,245,.2)' }}>Most popular</span>
              </div>
              <div className="pricing-price">$19 <span>per fundraiser</span></div>
              <p className="pricing-desc">One flat fee per live fundraising campaign. No percentage cuts, no hidden fees.</p>
              <ul className="pricing-features">
                <li>Unlimited squares sold</li>
                <li>In person payments</li>
                <li>Bank transfer support</li>
                <li>Secure online card payments</li>
                <li>Real-time reservations</li>
                <li>Live draw feature</li>
              </ul>
              <Link href="/fundraise?register=1" className="btn btn-purple" style={{ width: '100%', justifyContent: 'center' }}>
                Start your fundraiser →
              </Link>
            </div>

            <div className="pricing-card">
              <div className="pricing-name">Organisation</div>
              <div className="pricing-price">$149 <span>/ year</span></div>
              <p className="pricing-desc">Run unlimited Lucky Squares campaigns per year for your school, club, or charity.</p>
              <ul className="pricing-features">
                <li>Unlimited campaigns per year</li>
                <li>Up to 10 live simultaneously</li>
                <li>Multi-user access</li>
                <li>Organisation branding</li>
                <li>Priority support</li>
              </ul>
              <Link href="/org-signup" className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }}>
                Register your organisation →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="section" style={{ textAlign: 'center', background: '#fff' }}>
        <div className="section-inner">
          <div style={{ fontSize: 56, marginBottom: 16 }}>🍀</div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px,4vw,44px)', fontWeight: 900, color: 'var(--text)', marginBottom: 16 }}>
            Ready to start raising funds?
          </h2>
          <p style={{ fontSize: 18, color: 'var(--text2)', marginBottom: 36, maxWidth: 480, margin: '0 auto 36px' }}>
            Join hundreds of Australian schools, clubs, and charities who&apos;ve made fundraising fun again.
          </p>
          <Link href="/fundraise?register=1" className="btn btn-gold btn-xl">
            Create your first fundraiser, it&apos;s free →
          </Link>
        </div>
      </section>

    </>
  );
}

/* Mini grid preview — server component, static */
function MiniGridPreview() {
  const states = ['taken', 'taken', 'available', 'taken', 'mine',     'available', 'reserved', 'taken', 'available', 'taken',
                  'available', 'taken', 'available', 'taken', 'taken', 'available', 'taken',   'in-cart','taken',    'available',
                  'taken', 'available', 'taken', 'taken', 'available', 'taken',    'available', 'taken', 'taken',    'available',
                  'available', 'taken', 'reserved', 'available', 'taken', 'taken', 'available', 'taken', 'available','taken',
                  'taken', 'available', 'taken', 'available', 'taken', 'available', 'taken',   'taken',  'available','available'];
  const names  = ['Sarah', 'Tom',   null,    'Emily', 'You!', null,    null,    'Dave',  null,    'Lucy',
                  null,    'Anna',  null,    'Ben',   'Claire',null,   'Mike',  null,    'Zoe',   null,
                  'Finn',  null,    'Aria',  'Jack',  null,    'Rosa',  null,   'Liam',  'Mia',   null,
                  null,    'Noah',  null,    null,    'Isla',  'Ethan', null,   'Chloe', null,    'Oscar',
                  'Ruby',  null,    'Harry', null,    'Grace', null,    'Leo',  'Ava',   null,    null];
  return (
    <div style={{ background: 'var(--card)', borderRadius: 20, padding: 20, boxShadow: '0 8px 40px rgba(61,46,26,.15)', border: '1.5px solid var(--border)', display: 'inline-block' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', marginBottom: 12, textAlign: 'center' }}>
        Live grid preview
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 44px)', gap: 4 }}>
        {states.map((state, i) => (
          <div key={i} className={`sq ${state}`} style={{ width: 44, height: 44, fontSize: 10, borderRadius: 7 }}>
            <span className="sq-num">{i + 1}</span>
            {names[i] && <span className="sq-label">{names[i]}</span>}
            {state === 'in-cart' && <span className="sq-label" style={{ color: 'var(--green)' }}>✓</span>}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        {[['#fff','#D4EFE6','Available'],['#D4F5E9','var(--green)','Mine'],['#FFF0E8','var(--orange)','Reserved'],['#F0EDE5','#DDD5C0','Sold']].map(([bg,bc,lbl]) => (
          <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text2)', fontWeight: 700 }}>
            <div style={{ width: 14, height: 14, borderRadius: 3, background: bg, border: `1.5px solid ${bc}` }} />
            {lbl}
          </div>
        ))}
      </div>
    </div>
  );
}
