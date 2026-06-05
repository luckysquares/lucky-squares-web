import MarketingNav from '@/components/marketing/MarketingNav';

export const metadata = {
  title: 'Raffle Compliance Guide',
  description: 'State-by-state guide to raffle and lucky squares permit requirements in Australia. Understand your obligations before running a fundraiser.',
  alternates: { canonical: 'https://luckysquares.com.au/raffle-compliance' },
};

export default function CompliancePage() {
  return (
    <>
      <MarketingNav />

      <section className="section section-hero-bg" style={{ paddingTop: 80, paddingBottom: 40 }}>
        <div className="section-inner" style={{ textAlign: 'center' }}>
          <div className="section-label">Legal</div>
          <h1 className="section-heading" style={{ margin: '0 auto 16px' }}>Compliance Statement</h1>
          <p className="section-body" style={{ margin: '0 auto' }}>Lucky Squares Australia · Last updated: May 2026</p>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--cream)', paddingTop: 0 }}>
        <div className="section-inner" style={{ maxWidth: 780 }}>
          <div className="scratch-card" style={{ padding: '40px 48px' }}>

            <Section n="1" title="Our Position">
              <p>
                Lucky Squares Australia is a software-as-a-service platform. We provide digital tools that enable
                community organisations to conduct grid-based fundraising activities. We are a technology provider,
                not a fundraising operator, lottery operator, or games of chance provider.
              </p>
              <p>
                This distinction is fundamental to how we operate and how we understand our obligations under Australian law.
              </p>
            </Section>

            <Section n="2" title="How the Platform Works">
              <p>An Organiser (a community group, sporting club, or registered charity) uses our software to:</p>
              <ul>
                <li>Create a numbered grid of 25, 50, or 100 squares</li>
                <li>Set a price per square and prize structure</li>
                <li>Share the grid with their community</li>
                <li>Conduct a randomised draw when squares are sold</li>
              </ul>
              <p>
                Lucky Squares Australia provides the software infrastructure for these activities. The Organiser
                recruits participants, collects funds, conducts the draw through our platform, and pays prizes.
                The entire fundraising activity is operated by the Organiser.
              </p>
            </Section>

            <Section n="3" title="Regulatory Framework">
              <p>
                Fundraising activities involving consideration, chance, and a prize may be classified as lotteries
                or games of chance under Australian state and territory legislation. Regulation varies significantly
                by jurisdiction.
              </p>
              <p>Lucky Squares Australia&apos;s position is that:</p>
              <ul>
                <li>The Organiser is the operator of any fundraising activity conducted through the Platform</li>
                <li>The permit and compliance obligations imposed by state and territory gaming legislation fall on the Organiser, not on Lucky Squares Australia</li>
                <li>Lucky Squares Australia&apos;s role is analogous to that of other SaaS platforms that provide tools used by operators in regulated industries, without themselves being operators</li>
                <li>The Platform does not solicit participants, collect prize funds, distribute prizes, or promote specific fundraisers to the general public</li>
              </ul>
            </Section>

            <Section n="4" title="Organiser Compliance Obligations">
              <p>Organisers are required by our Terms of Service to:</p>
              <ul>
                <li>Ensure their fundraiser complies with all applicable laws in their jurisdiction</li>
                <li>Obtain any required permits or authorisations before launching a fundraiser</li>
                <li>Accurately represent the prize structure and draw rules to participants</li>
                <li>Pay all prizes as advertised</li>
                <li>Manage all participant funds in accordance with applicable law</li>
              </ul>
              <p>
                Lucky Squares Australia does not verify that Organisers have obtained required permits.
                Organisers warrant compliance as a condition of using the Platform.
              </p>
            </Section>

            <Section n="5" title="State and Territory Permit Requirements">
              <p style={{ marginBottom: 4 }}>
                The following is a general summary of permit requirements for lucky squares style fundraisers
                in each Australian jurisdiction. This summary is provided for information only and does not
                constitute legal advice. Organisers should seek independent legal advice regarding their
                specific obligations.
              </p>
              <p style={{ marginBottom: 20, fontSize: 13, color: 'var(--text2)' }}>
                Prize thresholds shown are the general no-permit limit for eligible incorporated associations
                and registered charities. Different thresholds may apply depending on organisation type.
                Accurate as at 21 May 2026.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <Jurisdiction name="New South Wales" cap="$25,000">
                  Minor gaming permits are required for most fundraising activities involving chance. Incorporated
                  associations and registered charities may conduct certain activities without a permit where the
                  total prize value does not exceed $25,000. Relevant legislation: <em>Lotteries and Art Unions Act 1901</em>.
                </Jurisdiction>
                <Jurisdiction name="Victoria" cap="$5,000">
                  Community and charity fundraising activities may require registration with the Victorian Gambling
                  and Casino Control Commission (VGCCC). Incorporated associations have some exemptions for
                  activities where the total prize value does not exceed $5,000.
                  Relevant legislation: <em>Gambling Regulation Act 2003</em>.
                </Jurisdiction>
                <Jurisdiction name="Queensland" cap="$2,000">
                  Charitable gaming permits are required for most activities. The <em>Charitable and Non-Profit
                  Gaming Act 1999</em> provides exemptions for Category 1 activities conducted by eligible
                  organisations where the total prize value does not exceed $2,000.
                </Jurisdiction>
                <Jurisdiction name="South Australia" cap="$5,000">
                  Lucky envelopes and similar games of chance conducted by approved associations may require a
                  permit from Consumer and Business Services where the total prize value exceeds $5,000.
                  Relevant legislation: <em>Lotteries Act 2019</em>.
                </Jurisdiction>
                <Jurisdiction name="Western Australia" cap="$10,000">
                  Most fundraising games of chance require a permit from the Gaming and Wagering Commission.
                  Some exemptions apply for small-scale activities where the total prize value does not exceed
                  $10,000. Relevant legislation: <em>Gaming and Wagering Commission Act 1987</em>.
                </Jurisdiction>
                <Jurisdiction name="Tasmania" cap="$5,000">
                  Permits are required for most fundraising activities involving chance. Exemptions may apply
                  for eligible organisations where the total prize value does not exceed $5,000.
                  Relevant legislation: <em>Gaming Control Act 1993</em>.
                </Jurisdiction>
                <Jurisdiction name="Australian Capital Territory" cap="$5,000">
                  Lottery permits are required for fundraising activities involving chance. Exemptions may apply
                  for eligible organisations where the total prize value does not exceed $5,000.
                  Relevant legislation: <em>Lotteries Act 1964</em>.
                </Jurisdiction>
                <Jurisdiction name="Northern Territory" cap="$5,000" last>
                  Fundraising activities involving chance may require authorisation. Exemptions may apply for
                  eligible organisations where the total prize value does not exceed $5,000.
                  Relevant legislation: <em>Gaming Control Act 1993</em> and associated regulations.
                </Jurisdiction>
              </div>
            </Section>

            <Section n="6" title="Our Commitment">
              <p>
                Lucky Squares Australia is committed to operating responsibly and supporting Organisers to conduct
                compliant fundraising activities. We:
              </p>
              <ul>
                <li>Clearly disclose our role as a platform provider, not an operator, throughout the Platform</li>
                <li>Require Organisers to warrant compliance as a condition of use</li>
                <li>Display clear participant disclosures identifying the Organiser as the operator</li>
                <li>Cooperate with any regulatory authority inquiry or investigation</li>
                <li>Maintain legal review of our platform model and terms on an ongoing basis</li>
              </ul>
            </Section>

            <Section n="7" title="Legal Review" last>
              <p>
                5 June 2026: an independent legal review is being sought on this Compliance Statement and Lucky Squares Australia&apos;s overall platform model. The service will not be officially launched until that review has concluded.
              </p>
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

function Jurisdiction({ name, cap, children, last }) {
  return (
    <div style={{ padding: '16px 0', borderBottom: last ? 'none' : '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 800, fontSize: 14 }}>{name}</span>
        {cap && (
          <span style={{
            fontSize: 11, fontWeight: 800, color: 'var(--green)',
            background: 'rgba(0,169,110,.1)', border: '1px solid rgba(0,169,110,.25)',
            borderRadius: 4, padding: '2px 7px', whiteSpace: 'nowrap',
          }}>
            No-permit limit: {cap}
          </span>
        )}
      </div>
      <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.8, margin: 0 }}>{children}</p>
    </div>
  );
}
