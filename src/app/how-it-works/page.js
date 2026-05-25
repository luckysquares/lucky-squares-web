import Link from 'next/link';
import MarketingNav from '@/components/marketing/MarketingNav';

export const metadata = {
  title: 'How It Works',
  description: 'Learn how Lucky Squares fundraisers work: create your grid, set a price per square, share the link, and run a live draw. Takes less than 5 minutes to set up.',
  alternates: { canonical: 'https://luckysquares.com.au/how-it-works' },
};

const howToSchema = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to run a Lucky Squares fundraiser',
  description: 'Set up and run a Lucky Squares grid-based fundraiser online in under five minutes. Share your link, sell squares to your community, and run a live draw.',
  totalTime: 'PT5M',
  step: [
    {
      '@type': 'HowToStep',
      position: 1,
      name: 'Create your grid',
      text: 'Choose 25, 50, or 100 squares. Set your price per square, add your prizes, and write a short description of what you are raising money for. Takes about 5 minutes.',
      url: 'https://luckysquares.com.au/how-it-works#step-1',
    },
    {
      '@type': 'HowToStep',
      position: 2,
      name: 'Share and sell',
      text: 'Share your fundraiser link via social media, WhatsApp, email, or your club app. Buyers pick their squares and pay however suits them: in person, by bank transfer, or online by card.',
      url: 'https://luckysquares.com.au/how-it-works#step-2',
    },
    {
      '@type': 'HowToStep',
      position: 3,
      name: 'Run your draw',
      text: 'When you are ready, hit the draw button. A winner is randomly selected from all purchased squares. Share the moment live.',
      url: 'https://luckysquares.com.au/how-it-works#step-3',
    },
  ],
};

export default function HowItWorksPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
      <MarketingNav />

      <section className="section section-hero-bg" style={{ paddingTop: 80 }}>
        <div className="section-inner" style={{ textAlign: 'center' }}>
          <div className="section-label">How it works</div>
          <h1 className="section-heading" style={{ margin: '0 auto 24px' }}>
            Setup and launch in under five minutes
          </h1>
          <p className="section-body" style={{ margin: '0 auto 48px', textAlign: 'center' }}>
            Lucky Squares gives your organisation everything it needs to run a Lucky Squares fundraiser. No spreadsheets, no unrecognisable handwriting, no cash handling, no stress.
          </p>
        </div>
      </section>

      <section className="section" style={{ background: '#FFFCF8' }}>
        <div className="section-inner">
          <div className="steps-grid">

            <div style={{ background: '#fff', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', border: '1.5px solid var(--border)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ width: '100%', height: 220, overflow: 'hidden', background: 'var(--cream2)' }}>
                <img
                  src="/sports-club-fundraiser.PNG"
                  alt="Campaign setup wizard screen"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
                />
              </div>
              <div className="step-card" style={{ padding: '24px 28px 28px' }}>
                <div className="step-num">1</div>
                <h3 className="step-title">Create your grid</h3>
                <p className="step-desc">
                  Choose 25, 50, or 100 squares. Set your price per square, add your prizes, and write a short description
                  of what you&apos;re raising money for. Takes about 5 minutes.
                </p>
              </div>
            </div>

            <div style={{ background: '#fff', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', border: '1.5px solid var(--border)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ width: '100%', height: 220, overflow: 'hidden', background: 'var(--cream2)' }}>
                <img
                  src="/lucky-squares-fundraiser.PNG"
                  alt="Person selling squares on an iPad at a sporting event"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
                />
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
                <img
                  src="/help-for-sports-clubs-to-raise-money.PNG"
                  alt="Winner announcement screen showing the winning square"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
                />
              </div>
              <div className="step-card" style={{ padding: '24px 28px 28px' }}>
                <div className="step-num">3</div>
                <h3 className="step-title">Run your draw</h3>
                <p className="step-desc">
                  When you&apos;re ready, hit the draw button. A winner is randomly selected from all purchased squares.
                  Share the moment live. It&apos;s always a crowd pleaser!
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Deep-dive panels ── */}
      <section className="section section-solid-bg">
        <div className="section-inner">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div className="section-label">A closer look</div>
            <h2 className="section-heading" style={{ margin: '0 auto' }}>Everything you need to know</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

            {/* Panel 1: Campaign setup wizard */}
            <div style={{ background: '#fff', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', border: '1.5px solid var(--border)', padding: '36px 40px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <span style={{ fontSize: 32 }}>🧙</span>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 900, color: 'var(--text)', margin: 0 }}>
                  Setting up your campaign
                </h3>
              </div>
              <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 28 }}>
                When you click <strong>Start a fundraiser</strong> you are walked through a short setup wizard. Here is what each step covers.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { num: '1', icon: '⚙️', title: 'Grid and price', desc: 'Choose 25, 50, or 100 squares and set your price per square. The platform shows you a live estimate of how much you could raise at sell-out.' },
                  { num: '2', icon: '🏆', title: 'Prizes', desc: 'Add your prizes: 1st, 2nd, 3rd and any extras. Give each a description, an estimated value, and tick "donated" if a local business has sponsored it.' },
                  { num: '3', icon: '📝', title: 'Campaign details', desc: 'Write a title, choose an emoji, and describe what the funds are going towards. This appears on the public page your buyers will see.' },
                  { num: '4', icon: '💳', title: 'Payment method', desc: 'Choose how you want to collect money: in person, bank transfer, both, or secure online card payments. You can offer more than one option.' },
                  { num: '5', icon: '👁️', title: 'Preview and launch', desc: 'Review everything before it goes live. When you are happy, click Launch. Your unique share link is ready to send to your community.' },
                ].map((s) => (
                  <div key={s.num} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', background: 'var(--cream)', borderRadius: 12, padding: '16px 20px', border: '1px solid var(--border)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #A78BFA, #7C3AED)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14, flexShrink: 0 }}>
                      {s.num}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 16 }}>{s.icon}</span>
                        <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>{s.title}</span>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Panel 2: Grid colour guide */}
            <div style={{ background: '#fff', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', border: '1.5px solid var(--border)', padding: '36px 40px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <span style={{ fontSize: 32 }}>🎨</span>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 900, color: 'var(--text)', margin: 0 }}>
                  Reading the grid
                </h3>
              </div>
              <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 28 }}>
                Every square on your live grid is colour coded so you and your buyers can see exactly what is happening at a glance.
              </p>
              <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap' }}>

                {/* 6×6 demo grid */}
                <div style={{ flexShrink: 0 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 48px)', gap: 5 }}>
                    {[
                      { s: 'taken',     n: 1,  name: 'Sarah' },
                      { s: 'taken',     n: 2,  name: 'Tom'   },
                      { s: 'available', n: 3              },
                      { s: 'taken',     n: 4,  name: 'Emily' },
                      { s: 'available', n: 5              },
                      { s: 'taken',     n: 6,  name: 'Lucy'  },
                      { s: 'available', n: 7              },
                      { s: 'reserved',  n: 8              },
                      { s: 'taken',     n: 9,  name: 'Ben'   },
                      { s: 'available', n: 10             },
                      { s: 'taken',     n: 11, name: 'Anna'  },
                      { s: 'in-cart',   n: 12             },
                      { s: 'taken',     n: 13, name: 'Jack'  },
                      { s: 'available', n: 14             },
                      { s: 'taken',     n: 15, name: 'Mia'   },
                      { s: 'taken',     n: 16, name: 'Noah'  },
                      { s: 'available', n: 17             },
                      { s: 'winner',    n: 18, name: 'Dave'  },
                      { s: 'available', n: 19             },
                      { s: 'taken',     n: 20, name: 'Zoe'   },
                      { s: 'taken',     n: 21, name: 'Finn'  },
                      { s: 'reserved',  n: 22             },
                      { s: 'mine',      n: 23, name: 'You'   },
                      { s: 'taken',     n: 24, name: 'Rosa'  },
                      { s: 'available', n: 25             },
                      { s: 'taken',     n: 26, name: 'Liam'  },
                      { s: 'taken',     n: 27, name: 'Chloe' },
                      { s: 'available', n: 28             },
                      { s: 'taken',     n: 29, name: 'Oscar' },
                      { s: 'taken',     n: 30, name: 'Ruby'  },
                      { s: 'taken',     n: 31, name: 'Harry' },
                      { s: 'available', n: 32             },
                      { s: 'taken',     n: 33, name: 'Grace' },
                      { s: 'available', n: 34             },
                      { s: 'taken',     n: 35, name: 'Leo'   },
                      { s: 'available', n: 36             },
                    ].map((sq) => (
                      <div key={sq.n} className={`sq ${sq.s}`} style={{ width: 48, height: 48, borderRadius: 7, fontSize: 11, cursor: 'default' }}>
                        <span className="sq-num">{sq.n}</span>
                        {sq.name && <span className="sq-label">{sq.name}</span>}
                        {sq.s === 'in-cart' && <span className="sq-label" style={{ color: 'var(--green)' }}>✓</span>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Legend */}
                <div style={{ flex: 1, minWidth: 260, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    { state: 'available', label: 'Available',    num: '5',  desc: 'White with a green border. Open for anyone to claim. Buyers click to add it to their cart.' },
                    { state: 'in-cart',   label: 'In your cart', num: '12', desc: 'Light green. The buyer has selected this square and it is sitting in their cart ready to checkout.' },
                    { state: 'mine',      label: 'Your square',  num: '23', name: 'You',   desc: 'Bold green. Shown to the buyer who purchased it. Confirms their number is locked in.' },
                    { state: 'reserved',  label: 'Reserved',     num: '8',  desc: 'Orange. Someone else has this in their cart right now. Held for up to 7 minutes, then released automatically.' },
                    { state: 'taken',     label: 'Sold',         num: '11', name: 'Anna',  desc: 'Grey/beige. Purchased and no longer available. The buyer\'s first name is shown.' },
                    { state: 'winner',    label: 'Winning squares', num: '18', name: 'Dave', desc: 'Bright green with a glow. Shown after the draw. The winning squares are highlighted live for everyone on the page.' },
                  ].map((sq) => (
                    <div key={sq.state} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: 'var(--cream)', borderRadius: 10, border: '1px solid var(--border)' }}>
                      <div className={`sq ${sq.state}`} style={{ width: 44, height: 44, borderRadius: 7, flexShrink: 0, fontSize: 11, cursor: 'default' }}>
                        <span className="sq-num">{sq.num}</span>
                        {sq.name && <span className="sq-label">{sq.name}</span>}
                        {sq.state === 'in-cart' && <span className="sq-label" style={{ color: 'var(--green)' }}>✓</span>}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--text)', marginBottom: 2 }}>{sq.label}</div>
                        <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{sq.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            </div>

            {/* Panel 3: Checking sales */}
            <div style={{ background: '#fff', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', border: '1.5px solid var(--border)', padding: '36px 40px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <span style={{ fontSize: 32 }}>📊</span>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 900, color: 'var(--text)', margin: 0 }}>
                  Tracking your sales
                </h3>
              </div>
              <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 28 }}>
                Your organiser dashboard keeps you across how the campaign is going in real time.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                {[
                  { icon: '🟢', title: 'Live sales counter', desc: 'Your dashboard shows how many squares have sold, how many are still available, and a running total of funds raised based on your price per square.' },
                  { icon: '👤', title: 'Buyer names on the grid', desc: 'Sold squares display the buyer\'s first name. You can see at a glance who has purchased and which numbers they hold.' },
                  { icon: '✅', title: 'Marking payments received', desc: 'For in-person and bank transfer campaigns, you can mark individual squares as paid once you have collected the money. This keeps your records tidy.' },
                  { icon: '📤', title: 'Sharing your live grid', desc: 'Share your unique fundraiser link at any time. Buyers can check back on the grid to watch it fill up, which builds excitement and encourages others to buy in.' },
                ].map((item) => (
                  <div key={item.title} style={{ background: 'var(--cream)', borderRadius: 12, padding: '18px 20px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 20 }}>{item.icon}</span>
                      <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--text)' }}>{item.title}</span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Panel 4: Running the draw */}
            <div style={{ background: '#fff', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', border: '1.5px solid var(--border)', padding: '36px 40px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <span style={{ fontSize: 32 }}>🏆</span>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 900, color: 'var(--text)', margin: 0 }}>
                  Running your draw
                </h3>
              </div>
              <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 28 }}>
                There is no minimum number of squares that need to sell before you can draw. You decide when the time is right.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { step: '1', icon: '📅', title: 'Decide when to draw', desc: 'You are in full control of timing. Draw when you are satisfied with sales, at a scheduled event, or on a date you announced to your community. The platform does not close your campaign automatically. Make sure you have sold enough squares to cover your prize money before drawing.' },
                  { step: '2', icon: '🔴', title: 'Hit the Draw button', desc: 'From your organiser dashboard, open your campaign and click Run draw. The platform will ask you to confirm before proceeding. Once the draw runs the result is final and cannot be changed.' },
                  { step: '3', icon: '🎉', title: 'The winners are revealed', desc: 'Winners are randomly selected from all sold squares, not the whole grid. The winning squares light up in bright green on the organiser\'s screen. It\'s perfect for a live event where you show the screen to the room, or share a photo of the result with your community.' },
                  { step: '4', icon: '📬', title: 'Notifying your winners', desc: 'The platform automatically notifies buyers of the draw results by email. You can also follow up directly using the contact details each winner provided at checkout to arrange prize delivery.' },
                ].map((s) => (
                  <div key={s.step} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', padding: '16px 18px', background: 'var(--cream)', borderRadius: 12, border: '1px solid var(--border)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #A78BFA, #7C3AED)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14, flexShrink: 0 }}>
                      {s.step}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 16 }}>{s.icon}</span>
                        <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>{s.title}</span>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="section section-hero-bg" style={{ textAlign: 'center' }}>
        <div className="section-inner">
          <h2 className="section-heading" style={{ margin: '0 auto 16px' }}>Ready to try it?</h2>
          <p className="section-body" style={{ margin: '0 auto 32px', textAlign: 'center' }}>
            Set up your first fundraiser free. No credit card needed.
          </p>
          <Link href="/fundraise?register=1" className="btn btn-purple btn-xl">
            Start your fundraiser free →
          </Link>
        </div>
      </section>

    </>
  );
}
