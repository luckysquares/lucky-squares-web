import Link from 'next/link';
import MarketingNav from '@/components/marketing/MarketingNav';

export const metadata = {
  title: 'Pricing',
  description: 'Start for free, or launch a live campaign for a flat $19 fee. No percentage cuts, no subscriptions. The Organisation plan is $149/year for unlimited campaigns.',
  alternates: { canonical: 'https://luckysquares.com.au/pricing' },
};

export default function PricingPage() {
  return (
    <>
      <MarketingNav />

      <section className="section section-hero-bg" style={{ paddingTop: 80 }}>
        <div className="section-inner" style={{ textAlign: 'center' }}>
          <div className="section-label">Pricing</div>
          <h1 className="section-heading" style={{ margin: '0 auto 16px' }}>
            Straightforward, no surprises
          </h1>
          <p className="section-body" style={{ margin: '0 auto', textAlign: 'center' }}>
            Try it free. Pay only when your fundraiser goes live.
          </p>
        </div>
      </section>

      <section className="section section-solid-bg">
        <div className="section-inner">
          <div className="pricing-grid" style={{ maxWidth: 900, margin: '0 auto' }}>
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
                <li>Notify buyers of results</li>
              </ul>
              <Link href="/fundraise?register=1" className="btn btn-purple" style={{ width: '100%', justifyContent: 'center' }}>
                Start your fundraiser →
              </Link>
            </div>

            <div className="pricing-card">
              <div className="pricing-name">Organisation</div>
              <div className="pricing-price">$149 <span>/ year</span></div>
              <p className="pricing-desc">Run unlimited fundraising campaigns per year for your school, club, or charity using the Lucky Squares platform.</p>
              <ul className="pricing-features">
                <li>Unlimited campaigns per year</li>
                <li>Multi-user access</li>
                <li>Organisation branding</li>
                <li>Priority support</li>
                <li>Early access to new features</li>
              </ul>
              <Link href="/org-signup" className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }}>
                Register your organisation →
              </Link>
            </div>
          </div>

          <div style={{ marginTop: 64, background: '#fff', border: '1.5px solid var(--border)', borderRadius: 16, padding: '32px 40px', maxWidth: 700, margin: '64px auto 0' }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 900, marginBottom: 12 }}>
              Frequently asked questions
            </h3>
            {[
              {
                q: 'Are there payment processing fees?',
                a: 'Only for secure online card payments (1.75% + 30c for Australian cards). These fees are passed on to buyers of squares, so you get to keep every dollar you raise. Bank transfers and in person payments have no processing fee at all.',
              },
              {
                q: 'When do funds arrive in my account?',
                a: 'We will send you the balance of your funds (money received from square sales, minus prize money paid out) within 2 business days of you drawing your winners.',
              },
              {
                q: 'Do I need a permit to run Lucky Squares?',
                a: null,
                custom: (
                  <p style={{ color: 'var(--text2)', lineHeight: 1.6 }}>
                    Raffle and lottery rules vary by Australian state and territory. We recommend you read our{' '}
                    <Link href="/terms" style={{ color: 'var(--green)', fontWeight: 700 }}>Terms of Service</Link>
                    {' '}and{' '}
                    <Link href="/participant-terms" style={{ color: 'var(--green)', fontWeight: 700 }}>Participant Terms</Link>
                    , and check your State government&apos;s website for rules about lotteries and fundraisers.
                  </p>
                ),
              },
              {
                q: 'Can I run multiple fundraisers at once?',
                a: 'Trial plan allows up to three campaigns. Casual plan allows up to five live campaigns simultaneously. Organisation plan lets you run unlimited Lucky Squares campaigns per year, with up to ten live simultaneously.',
              },
              {
                q: 'What is your fair play policy?',
                a: 'We want to support clubs, schools, and community groups to raise funds in a cost-effective and easy way. The $149 Organisation plan is per organisation, not per league or state body. For example, a state-based sporting body cannot purchase one Organisation plan and extend it to every club under its umbrella. One organisational account per organisation. We do verify ABNs, so we will know.',
              },
            ].map((faq) => (
              <div key={faq.q} style={{ borderTop: '1px solid var(--border)', paddingTop: 20, marginTop: 20 }}>
                <p style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{faq.q}</p>
                {faq.custom ?? <p style={{ color: 'var(--text2)', lineHeight: 1.6 }}>{faq.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

    </>
  );
}
