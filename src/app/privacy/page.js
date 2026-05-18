import MarketingNav from '@/components/marketing/MarketingNav';

export const metadata = {
  title: 'Privacy Policy',
};

export default function PrivacyPage() {
  return (
    <>
      <MarketingNav />

      <section className="section dot-bg" style={{ paddingTop: 80, paddingBottom: 40 }}>
        <div className="section-inner" style={{ textAlign: 'center' }}>
          <div className="section-label">Legal</div>
          <h1 className="section-heading" style={{ margin: '0 auto 16px' }}>Privacy Policy</h1>
          <p className="section-body" style={{ margin: '0 auto' }}>Lucky Squares Australia · Last updated: May 2026</p>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--cream)', paddingTop: 0 }}>
        <div className="section-inner" style={{ maxWidth: 780 }}>
          <div className="scratch-card" style={{ padding: '40px 48px' }}>

            <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.8, marginBottom: 32 }}>
              Lucky Squares Australia is committed to protecting the privacy of all individuals who interact
              with our Platform. This Privacy Policy explains how we collect, use, store, and disclose
              personal information.
            </p>

            <Section n="1" title="Who We Are">
              <p>
                Play With Heart Pty Ltd (trading as Lucky Squares Australia) (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;)
                operates the Lucky Squares Australia platform at luckysquares.com.au. We are based in
                South Australia, Australia.
              </p>
            </Section>

            <Section n="2" title="What Information We Collect">
              <SubSection label="From Organisers">
                <ul>
                  <li>Full name and contact details</li>
                  <li>Organisation name and type</li>
                  <li>Email address and phone number</li>
                  <li>Payment information (processed securely by our online payment provider; we do not store card details)</li>
                  <li>Fundraiser content including campaign descriptions, images, and prize details</li>
                </ul>
              </SubSection>
              <SubSection label="From Participants">
                <ul>
                  <li>Full name</li>
                  <li>Email address</li>
                  <li>Phone number</li>
                  <li>Square selections and purchase history</li>
                </ul>
              </SubSection>
              <SubSection label="Automatically Collected Information">
                <ul>
                  <li>Browser type and device information</li>
                  <li>IP address</li>
                  <li>Pages visited and time spent on the Platform</li>
                  <li>Referral source</li>
                </ul>
              </SubSection>
            </Section>

            <Section n="3" title="How We Use Your Information">
              <p>We use personal information to:</p>
              <ul>
                <li>Create and manage Organiser accounts</li>
                <li>Process Platform Fee payments</li>
                <li>Operate fundraiser grids and manage square reservations</li>
                <li>Notify Participants of draw results</li>
                <li>Facilitate prize notification between Organisers and Participants</li>
                <li>Provide customer support</li>
                <li>Improve the Platform and user experience</li>
                <li>Comply with legal obligations</li>
              </ul>
              <p>We do not use your personal information for advertising purposes or sell it to third parties.</p>
            </Section>

            <Section n="4" title="Sharing Your Information">
              <SubSection n="4.1" label="With Organisers">
                Participant names, email addresses, and square allocations are shared with the Organiser who
                created the fundraiser for the purposes of running the fundraiser and notifying winners.
              </SubSection>
              <SubSection n="4.2" label="With Service Providers">
                <p style={{ marginBottom: 10 }}>
                  We share information with trusted third-party service providers who assist us in operating
                  the Platform, including:
                </p>
                <ul>
                  <li><strong>Stripe</strong>: secure online payment processing. Card details are handled exclusively by Stripe and are never stored on LuckySquares systems. Stripe operates under PCI-DSS compliance.</li>
                  <li><strong>Supabase</strong>: secure database and file storage (Australian data residency)</li>
                  <li><strong>Resend</strong>: transactional email communications (confirmation emails, draw notifications)</li>
                </ul>
                <p style={{ marginTop: 10 }}>
                  These providers are contractually required to handle your information securely and only
                  for the purposes for which it is shared.
                </p>
              </SubSection>
              <SubSection n="4.3" label="Legal Requirements">
                We may disclose personal information where required by law, court order, or regulatory
                authority, or where we believe disclosure is necessary to protect the safety of any person
                or to prevent unlawful activity.
              </SubSection>
              <SubSection n="4.4" label="We will never">
                <ul>
                  <li>Sell your personal information to third parties</li>
                  <li>Share your information with advertisers</li>
                  <li>Use your information for purposes unrelated to the operation of the Platform</li>
                </ul>
              </SubSection>
            </Section>

            <Section n="5" title="Data Storage and Security">
              <SubSection n="5.1">Personal information is stored securely using Supabase infrastructure located in Australia.</SubSection>
              <SubSection n="5.2">We implement reasonable technical and organisational measures to protect personal information from unauthorised access, loss, misuse, or disclosure.</SubSection>
              <SubSection n="5.3">Payment card information is processed exclusively by our online payment provider and is never stored on Lucky Squares Australia systems.</SubSection>
              <SubSection n="5.4">Despite our security measures, no data transmission over the internet is completely secure. We cannot guarantee the absolute security of information transmitted to or from the Platform.</SubSection>
            </Section>

            <Section n="6" title="Data Retention">
              <SubSection n="6.1">Organiser account information is retained for the duration of the account and for seven years following account closure for legal and tax compliance purposes.</SubSection>
              <SubSection n="6.2">Participant information relating to a specific fundraiser is retained for two years following the close of that fundraiser, after which it is deleted or anonymised.</SubSection>
              <SubSection n="6.3">You may request deletion of your personal information at any time, subject to any legal retention obligations.</SubSection>
            </Section>

            <Section n="7" title="Your Rights">
              <p>You have the right to:</p>
              <ul>
                <li>Access the personal information we hold about you</li>
                <li>Request correction of inaccurate or incomplete information</li>
                <li>Request deletion of your personal information (subject to legal retention requirements)</li>
                <li>Withdraw consent for non-essential processing</li>
                <li>Lodge a complaint with the Office of the Australian Information Commissioner (OAIC) at <a href="https://www.oaic.gov.au" style={{ color: 'var(--green)', fontWeight: 700 }}>oaic.gov.au</a></li>
              </ul>
              <p>To exercise any of these rights, contact us at <a href="mailto:privacy@luckysquares.com.au" style={{ color: 'var(--green)', fontWeight: 700 }}>privacy@luckysquares.com.au</a>.</p>
            </Section>

            <Section n="8" title="Cookies">
              <p>The Platform uses cookies and similar technologies to:</p>
              <ul>
                <li>Maintain your session while using the Platform</li>
                <li>Remember your preferences</li>
                <li>Analyse Platform usage and performance</li>
              </ul>
              <p>You may disable cookies in your browser settings, however this may affect the functionality of the Platform.</p>
            </Section>

            <Section n="9" title="Marketing Communications and Opt-Out">
              <p>
                We may send you transactional emails related to your use of the Platform, including purchase
                confirmations, draw notifications, and fundraiser updates. These communications are necessary
                for the operation of the service.
              </p>
              <p>
                We may also send optional communications such as tips, updates, and seasonal promotions.
                Every non-transactional email we send includes an unsubscribe link. You can opt out at any
                time by clicking that link or by contacting us at{' '}
                <a href="mailto:privacy@luckysquares.com.au" style={{ color: 'var(--green)', fontWeight: 700 }}>privacy@luckysquares.com.au</a>.
              </p>
              <p>
                Once you opt out, your email address is recorded on our suppression list and we will not
                send you further marketing communications. Opting out does not affect your ability to
                participate in fundraisers.
              </p>
            </Section>

            <Section n="10" title="Children's Privacy">
              <p>
                Participation in Lucky Squares fundraisers is restricted to persons aged 18 years or over.
                The Platform is not directed at minors. We do not knowingly collect personal information
                from persons under 18. Participants are required to confirm their age at the point of
                purchase. If you believe a minor has provided personal information through the Platform,
                please contact us and we will delete it promptly.
              </p>
            </Section>

            <Section n="11" title="Changes to This Policy">
              <p>
                We may update this Privacy Policy from time to time. Updated versions will be published on
                the Platform with a revised date. We encourage you to review this Policy periodically.
              </p>
            </Section>

            <Section n="12" title="Contact" last>
              <p>For any privacy-related queries or requests:</p>
              <div style={{ margin: '8px 0 16px', display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
                <a href="mailto:privacy@luckysquares.com.au" style={{ color: 'var(--green)', fontWeight: 700 }}>privacy@luckysquares.com.au</a>
                <span style={{ color: 'var(--text2)' }}>Play With Heart Pty Ltd, Adelaide, South Australia</span>
              </div>
              <p>For complaints that are not resolved to your satisfaction, you may contact the Office of the Australian Information Commissioner:</p>
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
                <a href="https://www.oaic.gov.au" style={{ color: 'var(--green)', fontWeight: 700 }}>oaic.gov.au</a>
                <span style={{ color: 'var(--text2)' }}>1300 363 992</span>
              </div>
            </Section>

          </div>
        </div>
      </section>
    </>
  );
}

function Section({ n, title, children, last }) {
  return (
    <div style={{ marginBottom: last ? 0 : 40 }}>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 900, color: 'var(--text)', marginBottom: 14, paddingBottom: 10, borderBottom: '1.5px solid var(--border)' }}>
        {n}. {title}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14, color: 'var(--text)', lineHeight: 1.8 }}>
        {children}
      </div>
    </div>
  );
}

function SubSection({ n, label, children }) {
  return (
    <div>
      {(n || label) && (
        <div style={{ fontWeight: 800, marginBottom: 6 }}>
          {n && <span>{n}{label ? ': ' : ''}</span>}{label && <span>{label}</span>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}
