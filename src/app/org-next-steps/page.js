import Link from 'next/link';
import MarketingNav from '@/components/marketing/MarketingNav';

export const metadata = {
  title: 'Application received — Lucky Squares Australia',
  robots: { index: false },
};

function Step({ number, title, children }) {
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%', background: 'var(--purple)',
        color: '#fff', fontWeight: 900, fontSize: 14, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {number}
      </div>
      <div style={{ paddingTop: 4 }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)', marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7 }}>{children}</div>
      </div>
    </div>
  );
}

export default function OrgNextStepsPage() {
  return (
    <>
      <MarketingNav />
      <section className="section dot-bg" style={{ minHeight: '85vh', display: 'flex', alignItems: 'center' }}>
        <div className="section-inner" style={{ maxWidth: 580 }}>

          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
            <h1 className="section-heading" style={{ margin: '0 auto 16px' }}>
              Application received!
            </h1>
            <p className="section-body" style={{ margin: '0 auto' }}>
              Thanks for applying for the Lucky Squares Organisation Plan.
              Here is what happens next.
            </p>
          </div>

          <div className="scratch-card" style={{ padding: '32px 36px', marginBottom: 32 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

              <Step number="1" title="Confirm your email address">
                We have sent a confirmation email to the address you provided. Click the link in that email to verify your account.
                Check your spam folder if you do not see it within a few minutes.
              </Step>

              <div style={{ borderTop: '1px solid var(--border)' }} />

              <Step number="2" title="We review your application">
                Our team reviews every organisation application personally, including verifying your ABN.
                You will hear back from us within 1 business day.
              </Step>

              <div style={{ borderTop: '1px solid var(--border)' }} />

              <Step number="3" title="Get full access">
                Once approved, your account is upgraded to the Organisation Plan and you get access to all
                organisation features, including team management, multi-campaign reporting, and priority support.
              </Step>

            </div>
          </div>

          <div style={{ background: '#F0FBF6', border: '1.5px solid #C8E8D8', borderRadius: 'var(--radius)', padding: '18px 24px', marginBottom: 32, fontSize: 14, color: '#1A3A25', lineHeight: 1.7 }}>
            <strong>While you wait:</strong> you can explore the platform on the Trial plan straight away.
            Once your application is approved your account will be automatically upgraded.
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/fundraise" className="btn btn-purple">
              Explore the platform →
            </Link>
            <Link href="/contact" className="btn btn-outline">
              Contact us
            </Link>
          </div>

        </div>
      </section>
    </>
  );
}
