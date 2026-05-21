import MarketingNav from '@/components/marketing/MarketingNav';
import Link from 'next/link';

export const metadata = {
  title: 'Beta Testers | Lucky Squares Australia',
  description: 'You have been invited to help shape Lucky Squares Australia before we go live. Welcome, beta tester.',
  robots: 'noindex, nofollow',
};

const DEMO_CAMPAIGNS = [
  { id: 'd746fddb-f8bb-4a25-bfcb-a7d4a1df4e9e', emoji: '🏆', title: 'Werribee Junior FC: State Championships', org: 'Werribee Junior Football Club', sold: 50, total: 50 },
  { id: '8cd6f1ef-1eb6-4dec-8ba6-f4e24a6dc4af', emoji: '🌱', title: 'New playground for Sunbury Primary', org: 'Sunbury Primary School P&C', sold: 27, total: 100 },
  { id: '41466307-b68b-4b4c-bfc7-8c13547549c4', emoji: '⭐', title: 'New patrol boards: Bayside SLSC', org: 'Bayside Surf Lifesaving Club', sold: 16, total: 50 },
  { id: '35e4dc13-13a0-43b2-81d0-20205e326e75', emoji: '⚾', title: 'PANPACS Gold Coast: Chuggernauts', org: 'Glenelg Baseball Club', sold: 50, total: 50 },
  { id: '415ff60b-ed99-4050-9c07-c68f9e890713', emoji: '🐾', title: 'New rescue vehicle: Wildlife Friends SA', org: 'Wildlife Friends SA', sold: 12, total: 50 },
];

const TASKS = [
  {
    emoji: '🆕',
    title: 'Sign up and create a campaign',
    steps: [
      'Hit "Start for free" and create a new account with your own email',
      'Set up a campaign, give it a fun name, pick a grid size, set a price per square',
      'Launch it and grab the share link',
      'Use the Stripe test card below to pay the campaign fee',
    ],
  },
  {
    emoji: '🎯',
    title: 'Buy squares on a demo campaign',
    steps: [
      'Visit one of the demo campaigns below (they open in a new tab so you can come back here easily)',
      'Pick a few squares and go through the checkout',
      'Use the Stripe test card. Does the confirmation feel right?',
      'Check the grid updates in real time',
    ],
  },
  {
    emoji: '📬',
    title: 'Try the contact form',
    steps: [
      'Head to the Contact page',
      'Send a message, try a few different categories',
      'Does it confirm nicely? Does anything feel off?',
    ],
  },
  {
    emoji: '📧',
    title: 'Check your emails',
    steps: [
      'After signing up, buying squares, or contacting us, did you get a confirmation email?',
      'Did it arrive quickly, or land in spam?',
      'Does it look right? Does anything feel off or unprofessional?',
    ],
  },
  {
    emoji: '📤',
    title: 'Share a campaign',
    steps: [
      'Launch a campaign and grab the share link',
      'Send it to someone in WhatsApp, Messenger, or by text',
      'Was sharing it easy and obvious? Does the link preview look good?',
      'Did the other person understand what it was immediately?',
    ],
  },
  {
    emoji: '📰',
    title: 'Browse the blog',
    steps: [
      'Check out the blog. Does the layout work well?',
      'Click into a few posts',
      'Would you share any of them in a club Facebook group?',
    ],
  },
  {
    emoji: '📱',
    title: 'Test on mobile',
    steps: [
      'Open the site on your phone',
      'Try the grid on a small screen. Can you tap squares easily?',
      'Go through the whole checkout on mobile',
      'Is anything hard to read, too small, or awkward to use?',
    ],
  },
  {
    emoji: '💸',
    title: 'Trust the checkout',
    steps: [
      'When you get to the payment step, does it feel safe?',
      'Does anything make you hesitate or second-guess?',
      'Would you feel comfortable entering your real card details here?',
    ],
  },
  {
    emoji: '🎰',
    title: 'Watch the live draw',
    steps: [
      'Run the draw on your test campaign',
      'Watch the winning square get revealed',
      'Was it exciting? Satisfying? Did it feel fair and trustworthy?',
      'Would your club members enjoy watching this together?',
    ],
  },
  {
    emoji: '💥',
    title: 'Try to break it',
    steps: [
      'Submit empty forms',
      'Try weird inputs: very long names, emoji, special characters',
      'Try naughty words (go on, we can take it)',
      'Go back and forward during checkout',
      'Try the same action twice in a row',
      'Anything that feels wrong, note it down',
    ],
  },
];

export default function BetaTestPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <MarketingNav />

      {/* Hero */}
      <section className="section-hero-bg" style={{ padding: '72px 24px 64px', textAlign: 'center' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(107,70,245,.12)', borderRadius: 20, padding: '6px 16px', marginBottom: 24, fontSize: 13, fontWeight: 800, color: 'var(--purple)', textTransform: 'uppercase', letterSpacing: .5 }}>
            🔒 Beta Testers Only
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(32px,5vw,52px)', fontWeight: 900, lineHeight: 1.1, marginBottom: 20 }}>
            You're one of the first people to see this. 👀
          </h1>
          <p style={{ fontSize: 18, color: 'var(--text2)', lineHeight: 1.7, maxWidth: 540, margin: '0 auto 32px' }}>
            Lucky Squares Australia is almost ready to go live. Before we do, we want people we trust to kick the tyres, find the rough edges, and tell us what's not working.
          </p>
          <p style={{ fontSize: 16, color: 'var(--text2)', lineHeight: 1.7, maxWidth: 540, margin: '0 auto' }}>
            That's you. Welcome, trusty beta tester!
          </p>
        </div>
      </section>

      {/* Thank you note */}
      <section style={{ padding: '0 24px', marginTop: -24 }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ background: 'linear-gradient(135deg, #A78BFA22, #7C3AED11)', border: '1.5px solid var(--purple-light)', borderRadius: 'var(--radius-lg)', padding: '32px 36px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🎁</div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 900, marginBottom: 12 }}>A thank-you from me</h2>
            <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.7, maxWidth: 480, margin: '0 auto' }}>
              As my way of saying thanks, every beta tester who helps put the platform through its paces will receive <strong style={{ color: 'var(--purple)' }}>three free campaigns</strong> when we go live (no campaign fee, on me). Just let me know once you've had a good go.
            </p>
            <p style={{ fontSize: 15, color: 'var(--text2)', marginTop: 16, fontWeight: 700 }}>Jamie</p>
          </div>
        </div>
      </section>

      {/* Test card */}
      <section style={{ padding: '48px 24px 0' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 900, marginBottom: 8, textAlign: 'center' }}>Stripe test card</h2>
          <p style={{ fontSize: 15, color: 'var(--text2)', textAlign: 'center', lineHeight: 1.7, marginBottom: 6 }}>
            How cool is this?! Online shopping that doesn't cost you anything!
          </p>
          <p style={{ fontSize: 15, color: 'var(--text2)', textAlign: 'center', lineHeight: 1.7, marginBottom: 24 }}>
            It's like being given a penalty stroke in hockey with no goalkeeper. Just you, the stick, and an open net. Take all the time you want. Flick it in the corner. No one can stop you.
          </p>
          <p style={{ fontSize: 13, color: 'var(--text3)', textAlign: 'center', marginBottom: 24 }}>Use these details anywhere a payment is required. No real money changes hands.</p>
          <div className="scratch-card" style={{ padding: 28, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20 }}>
            {[
              { label: 'Card number',     value: '4242 4242 4242 4242' },
              { label: 'Expiry',          value: 'Any future date, e.g. 12/29' },
              { label: 'CVC',             value: 'Any 3 digits, e.g. 123' },
              { label: 'Name / postcode', value: 'Anything' },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: .5, color: 'var(--text3)', marginBottom: 6 }}>{label}</div>
                <div style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 700, color: 'var(--purple)' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tasks */}
      <section style={{ padding: '48px 24px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 900, marginBottom: 8, textAlign: 'center' }}>Your testing checklist</h2>
          <p style={{ fontSize: 14, color: 'var(--text2)', textAlign: 'center', marginBottom: 8 }}>Please work through as many of these as you can. Note anything that feels broken, confusing, or just a bit off.</p>
          <p style={{ fontSize: 14, color: 'var(--text2)', textAlign: 'center', marginBottom: 32 }}>You'll notice all the example campaigns and testimonials are fictional organisations. That's deliberate while we're in beta. Real ones are coming soon.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {TASKS.map((task) => (
              <div key={task.title} className="scratch-card" style={{ padding: '24px 28px' }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 28, flexShrink: 0, marginTop: 2 }}>{task.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>{task.title}</h3>
                    <ol style={{ paddingLeft: 18, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {task.steps.map((step) => (
                        <li key={step} style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.6 }}>{step}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo campaigns */}
      <section style={{ padding: '0 24px 0' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 900, marginBottom: 8, textAlign: 'center' }}>Demo campaigns to buy squares on</h2>
          <p style={{ fontSize: 14, color: 'var(--text2)', textAlign: 'center', marginBottom: 28 }}>These are loaded with dummy data. Use the test card and go for it. Each opens in a new tab so you can easily find your way back here.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {DEMO_CAMPAIGNS.map((c) => (
              <a key={c.id} href={`/f/${c.id}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }} className="beta-campaign-link">
                <div className="scratch-card beta-campaign-card" style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ fontSize: 28, flexShrink: 0 }}>{c.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)', marginBottom: 2 }}>{c.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>{c.org}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: c.sold === c.total ? 'var(--green)' : 'var(--purple)' }}>
                      {c.sold === c.total ? 'Full (draw ready)' : `${c.sold}/${c.total} sold`}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>opens in new tab ↗</div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* QR codes for mobile testing */}
      <section style={{ padding: '48px 24px 0' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 900, marginBottom: 8, textAlign: 'center' }}>Test on your phone</h2>
          <p style={{ fontSize: 14, color: 'var(--text2)', textAlign: 'center', marginBottom: 8 }}>
            Point your phone camera at any QR code below to open that campaign directly on your device. No typing required.
          </p>
          <p style={{ fontSize: 14, color: 'var(--text2)', textAlign: 'center', marginBottom: 28 }}>
            This is the most important test. Most real buyers will be on mobile. Check that you can pick a square, enter your details, and pay without any friction.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            {DEMO_CAMPAIGNS.map((c) => {
              const url = `https://luckysquares.com.au/f/${c.id}`;
              const qr = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(url)}&bgcolor=FAFAF7&color=2D2A26&margin=8`;
              return (
                <div key={c.id} className="scratch-card" style={{ padding: '20px 16px', textAlign: 'center' }}>
                  <img src={qr} alt={`QR code for ${c.title}`} width={160} height={160} style={{ borderRadius: 8, marginBottom: 12 }} />
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)', lineHeight: 1.4 }}>{c.title}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing feedback */}
      <section style={{ padding: '48px 24px 0' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div className="scratch-card" style={{ padding: '36px 40px' }}>
            <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 12 }}>💸</div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 900, marginBottom: 16, textAlign: 'center' }}>What do you think of the pricing?</h2>
            <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 12 }}>
              The platform charges <strong style={{ color: 'var(--text)' }}>$19 per live fundraising campaign</strong>, one flat fee with no percentage cuts and no hidden charges. For organisations running multiple campaigns there is an annual plan at $149/year for unlimited campaigns.
            </p>
            <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 8 }}>We would love to know:</p>
            <ul style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.7, paddingLeft: 20, marginBottom: 20 }}>
              <li>Does $19 feel fair for what you get?</li>
              <li>Is there a price point that would feel like a no-brainer for a school or club?</li>
              <li>Would the pricing put you off, or would you happily recommend it to a committee treasurer?</li>
            </ul>
            <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 24 }}>
              No right or wrong answers. Even "that feels expensive" is genuinely useful. You can also check out the <Link href="/pricing" style={{ color: 'var(--green)', fontWeight: 700 }}>full pricing page</Link> if you want context before you answer.
            </p>
            <div style={{ textAlign: 'center' }}>
              <a href="sms:0423795501?body=Pricing%20feedback:%20" className="btn btn-purple">SMS your thoughts →</a>
            </div>
          </div>
        </div>
      </section>

      {/* Look and feel */}
      <section style={{ padding: '48px 24px 0' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div className="scratch-card" style={{ padding: '36px 40px' }}>
            <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 12 }}>🎨</div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 900, marginBottom: 16, textAlign: 'center' }}>And finally ... what do you think of the look and feel?</h2>
            <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 16 }}>
              You have now seen a fair bit of the site. We would love your honest first impressions.
            </p>
            <ul style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.7, paddingLeft: 20, marginBottom: 20 }}>
              <li>What impression does the site give you? Does it feel trustworthy? Professional? Fun?</li>
              <li>Would you feel comfortable handing over your email address or payment details?</li>
              <li>Does it feel like something a school P&C, a footy club, or a charity committee would take seriously?</li>
              <li>Is there anything about the design or wording that gives you pause?</li>
              <li>What is the one thing you would change if you could?</li>
            </ul>
            <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 24 }}>
              Gut reactions are just as valuable as detailed feedback here. If something feels off but you can not quite put your finger on why, tell us that too.
            </p>
            <div style={{ textAlign: 'center' }}>
              <a href="sms:0423795501?body=Look%20and%20feel%20feedback:%20" className="btn btn-purple">SMS your thoughts →</a>
            </div>
          </div>
        </div>
      </section>

      {/* Feedback CTA */}
      <section style={{ padding: '48px 24px 80px' }}>
        <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
          <div className="scratch-card" style={{ padding: '40px 36px' }}>
            <div style={{ fontSize: 36, marginBottom: 16 }}>📲</div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 900, marginBottom: 12 }}>Found something? Just SMS me.</h2>
            <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 24 }}>
              Screenshot it, take a photo of your screen, or just type what happened. Send it straight to Jamie on <strong style={{ color: 'var(--text)' }}>0423 795 501</strong>. No forms, no fuss.
            </p>
            <a href="sms:0423795501" className="btn btn-primary">SMS Jamie →</a>
          </div>
        </div>
      </section>
    </div>
  );
}
