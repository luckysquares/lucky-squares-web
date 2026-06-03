import Link from 'next/link';
import MarketingNav from '@/components/marketing/MarketingNav';

export const metadata = {
  title: 'Get Started',
  description: 'Start a Lucky Squares fundraiser or register your organisation.',
};

const CARD_STYLE = {
  padding: '36px 32px',
  cursor: 'pointer',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'border-color .15s',
};

export default function GetStartedPage() {
  return (
    <div style={{ background: 'var(--cream)', minHeight: '100vh' }}>
      <MarketingNav />

      <section style={{ padding: '72px 24px 80px', textAlign: 'center' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>

          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(30px, 5vw, 46px)', fontWeight: 900, lineHeight: 1.1, marginBottom: 16, color: 'var(--text)' }}>
            How would you like to get started?
          </h1>
          <p style={{ fontSize: 17, color: 'var(--text2)', lineHeight: 1.7, maxWidth: 520, margin: '0 auto 52px' }}>
            Register free and explore the platform. A flat $19 fee applies when you choose to launch a live campaign.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, textAlign: 'left' }}>

            {/* Individual / Casual */}
            <Link href="/fundraise?register=1" style={{ textDecoration: 'none' }} className="get-started-card">
              <div className="scratch-card" style={CARD_STYLE}>
                <div style={{ fontSize: 44, marginBottom: 20 }}>🍀</div>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 900, color: 'var(--text)', marginBottom: 10 }}>
                  I want to run a fundraiser
                </h2>
                <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.7, flex: 1, marginBottom: 28 }}>
                  For individuals, clubs, schools or charities. Register free, set up your grid and preview everything before you decide to launch.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: 'var(--text2)', marginBottom: 28 }}>
                  {['Free to register and explore', '$19 flat fee when you launch', 'No percentage cut from proceeds', 'Bank transfer, in-person or online card payments'].map((f) => (
                    <div key={f} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ color: 'var(--green)', fontWeight: 800, flexShrink: 0 }}>✓</span>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
                <div className="btn btn-purple" style={{ width: '100%', justifyContent: 'center' }}>
                  Create my account →
                </div>
              </div>
            </Link>

            {/* Organisation Plan */}
            <Link href="/org-signup" style={{ textDecoration: 'none' }} className="get-started-card">
              <div className="scratch-card" style={CARD_STYLE}>
                <div style={{ fontSize: 44, marginBottom: 20 }}>🏫</div>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 900, color: 'var(--text)', marginBottom: 10 }}>
                  I'm registering my organisation
                </h2>
                <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.7, flex: 1, marginBottom: 28 }}>
                  For clubs, schools and charities that fundraise regularly. Unlimited campaigns, team access, and an organisation dashboard for $149/year.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: 'var(--text2)', marginBottom: 28 }}>
                  {['Unlimited campaigns per year', 'Up to 10 live simultaneously', 'Team member access', 'Organisation dashboard and reporting'].map((f) => (
                    <div key={f} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ color: 'var(--green)', fontWeight: 800, flexShrink: 0 }}>✓</span>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
                <div className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }}>
                  Register my organisation →
                </div>
              </div>
            </Link>

          </div>

          <p style={{ marginTop: 32, fontSize: 14, color: 'var(--text2)' }}>
            Already have an account?{' '}
            <Link href="/fundraise" style={{ color: 'var(--green)', fontWeight: 700 }}>Sign in →</Link>
          </p>

        </div>
      </section>
    </div>
  );
}
