import MarketingNav from '@/components/marketing/MarketingNav';

export const metadata = {
  title: 'Terms of Service',
};

export default function TermsPage() {
  return (
    <>
      <MarketingNav />

      <section className="section section-hero-bg" style={{ paddingTop: 80, paddingBottom: 40 }}>
        <div className="section-inner" style={{ textAlign: 'center' }}>
          <div className="section-label">Legal</div>
          <h1 className="section-heading" style={{ margin: '0 auto 16px' }}>Terms of Service</h1>
          <p className="section-body" style={{ margin: '0 auto' }}>Lucky Squares Australia · Last updated: May 2026</p>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--cream)', paddingTop: 0 }}>
        <div className="section-inner" style={{ maxWidth: 780 }}>
          <div className="scratch-card" style={{ padding: '40px 48px' }}>

            <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.8, marginBottom: 32 }}>
              These Terms of Service (&ldquo;Terms&rdquo;) govern your use of the Lucky Squares Australia platform
              (&ldquo;Platform&rdquo;). By creating an account or launching a fundraiser, you agree to be bound by these Terms.
            </p>

            <Section n="1" title="About Lucky Squares Australia">
              <p>
                Play With Heart Pty Ltd ACN 698 202 069 ABN 19 698 202 069 (trading as Lucky Squares Australia) (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) is a
                software-as-a-service platform that provides digital tools enabling community organisations
                to conduct grid-based fundraising activities. We are based in South Australia, Australia.
              </p>
              <p>
                Lucky Squares Australia is a technology provider only. We do not conduct, promote, or operate
                fundraising activities, lotteries, raffles, or games of chance. All fundraising activities
                conducted through the Platform are operated solely by the Organiser.
              </p>
            </Section>

            <Section n="2" title="Definitions">
              <dl>
                <Term term='"Platform"'>the Lucky Squares Australia website, software, and associated services available at luckysquares.com.au.</Term>
                <Term term='"Organiser"'>any individual, incorporated association, registered charity, or community organisation that creates an account and launches a fundraiser on the Platform.</Term>
                <Term term='"Participant"'>any person who purchases one or more squares in a fundraiser conducted through the Platform.</Term>
                <Term term='"Fundraiser"'>a grid-based lucky squares fundraising activity created and operated by an Organiser using the Platform.</Term>
                <Term term='"Campaign Fee"'>the fee charged by Lucky Squares Australia to the Organiser for access to the Platform tools required to create and manage a Fundraiser.</Term>
                <Term term='"Square"'>a numbered grid position within a Fundraiser that a Participant may purchase for the opportunity to win a prize.</Term>
              </dl>
            </Section>

            <Section n="3" title="Eligibility">
              <p>To use the Platform as an Organiser, you must:</p>
              <ul>
                <li>Be at least 18 years of age</li>
                <li>Be acting on behalf of an incorporated association, registered charity, recognised sporting club, or other legitimate community organisation</li>
                <li>Have authority to bind your organisation to these Terms</li>
                <li>Not be using the Platform for personal commercial gain</li>
                <li>Ensure your organisation is legally permitted to conduct fundraising activities in your jurisdiction</li>
              </ul>
              <p>Lucky Squares Australia reserves the right to refuse access to the Platform to any person or organisation at its sole discretion.</p>
            </Section>

            <Section n="4" title="Campaign Fee and Payment">
              <SubSection n="4.1">
                The Campaign Fee is charged to the Organiser at the time of launching a Fundraiser. Current fees are:
                <FeeTable />
              </SubSection>
              <SubSection n="4.2">The Campaign Fee is processed securely via our online payment provider and is charged in Australian dollars inclusive of GST where applicable.</SubSection>
              <SubSection n="4.3">The Campaign Fee is non-refundable once a Fundraiser has been launched, except where required by Australian Consumer Law.</SubSection>
              <SubSection n="4.4">Lucky Squares Australia reserves the right to amend Campaign Fees at any time. Amended fees will not apply to Fundraisers already launched prior to the fee change.</SubSection>
              <SubSection n="4.5">The Campaign Fee covers access to the Platform software tools only. It does not guarantee any particular outcome, number of participants, or funds raised.</SubSection>
            </Section>

            <Section n="5" title="Organiser Obligations">
              <SubSection n="5.1" label="Regulatory Compliance">
                The Organiser is solely responsible for ensuring that their Fundraiser complies with all applicable laws,
                regulations, and permit requirements in the jurisdiction(s) in which it is conducted, including all state
                and territory legislation governing raffles, lotteries, games of chance, and community fundraising.
              </SubSection>
              <SubSection n="5.2" label="Permits and Authorisations">
                Where required by applicable law, the Organiser must obtain all necessary permits, approvals, or
                authorisations from the relevant state or territory gaming authority before launching a Fundraiser.
                Lucky Squares Australia does not obtain, verify, or guarantee the existence of any such permits.
              </SubSection>
              <SubSection n="5.3" label="Accurate Information">
                The Organiser must ensure that all information provided on the Platform, including campaign descriptions,
                prize amounts, draw rules, and payment instructions, is accurate, truthful, and not misleading.
              </SubSection>
              <SubSection n="5.4" label="Prize Payment">
                The Organiser is solely responsible for paying all prizes to winners in the amounts advertised and within
                a reasonable timeframe following the draw. Lucky Squares Australia bears no responsibility for prize
                payment under any circumstances.
              </SubSection>
              <SubSection n="5.5" label="Participant Communications">
                The Organiser is responsible for all communications with Participants regarding the Fundraiser, including
                confirmation of participation, draw results, and prize notifications.
              </SubSection>
              <SubSection n="5.6" label="Fund Management">
                Where the Organiser collects participant payments directly (Standard Plan), the Organiser is solely
                responsible for the collection, holding, and disbursement of all funds in accordance with applicable law.
              </SubSection>
              <SubSection n="5.7" label="Age Restrictions">
                The Organiser must ensure that Participants meet any minimum age requirements imposed by applicable law
                in their jurisdiction.
              </SubSection>
            </Section>

            <Section n="6" title="Prohibited Uses">
              <p>You must not use the Platform to:</p>
              <ul>
                <li>Conduct fundraising activities that are unlawful in your jurisdiction</li>
                <li>Misrepresent the nature, purpose, or prize structure of a Fundraiser</li>
                <li>Collect participant funds without the genuine intention of conducting a draw and paying prizes</li>
                <li>Conduct fundraisers for personal commercial profit</li>
                <li>Impersonate another organisation or individual</li>
                <li>Circumvent, disable, or interfere with the security features of the Platform</li>
                <li>Use the Platform in any way that violates these Terms or applicable law</li>
              </ul>
            </Section>

            <Section n="7" title="Intellectual Property">
              <SubSection n="7.1">All intellectual property in the Platform, including software, design, trademarks, and content created by Lucky Squares Australia, remains the sole property of Lucky Squares Australia.</SubSection>
              <SubSection n="7.2">Organisers retain ownership of content they upload to the Platform, including campaign descriptions, logos, and images. By uploading content, Organisers grant Lucky Squares Australia a non-exclusive licence to display that content on the Platform for the purposes of operating the Fundraiser.</SubSection>
              <SubSection n="7.3">Organisers must not upload content that infringes the intellectual property rights of any third party.</SubSection>
            </Section>

            <Section n="8" title="Limitation of Liability">
              <SubSection n="8.1">To the maximum extent permitted by law, Lucky Squares Australia&apos;s total liability to any Organiser arising out of or in connection with these Terms or the Platform is limited to the Campaign Fee paid by that Organiser for the relevant Fundraiser.</SubSection>
              <SubSection n="8.2">
                Lucky Squares Australia is not liable for:
                <ul style={{ marginTop: 10 }}>
                  <li>Any regulatory penalties, fines, or legal costs incurred by Organisers as a result of non-compliant fundraising activities</li>
                  <li>Any failure by an Organiser to pay prizes to Participants</li>
                  <li>Any loss of funds by Participants arising from the conduct of a Fundraiser</li>
                  <li>Any indirect, consequential, special, or punitive loss or damage</li>
                  <li>Any loss arising from Platform downtime, technical errors, or interruptions to service</li>
                </ul>
              </SubSection>
              <SubSection n="8.3">Nothing in these Terms excludes, restricts, or modifies any right or remedy, or any guarantee, warranty, or other term or condition, implied or imposed by any legislation where it would be unlawful to do so, including obligations under the Australian Consumer Law.</SubSection>
            </Section>

            <Section n="9" title="Indemnity">
              <p>The Organiser agrees to indemnify and hold harmless Lucky Squares Australia, its officers, employees, and agents from and against any claims, losses, damages, costs, and expenses (including reasonable legal fees) arising out of or in connection with:</p>
              <ul>
                <li>The Organiser&apos;s use of the Platform</li>
                <li>Any Fundraiser conducted by the Organiser</li>
                <li>Any breach of these Terms by the Organiser</li>
                <li>Any claim by a Participant arising from the conduct of a Fundraiser</li>
              </ul>
            </Section>

            <Section n="10" title="Termination">
              <SubSection n="10.1">Lucky Squares Australia may suspend or terminate an Organiser&apos;s access to the Platform at any time if the Organiser breaches these Terms, engages in unlawful conduct, or for any other reason at Lucky Squares Australia&apos;s sole discretion.</SubSection>
              <SubSection n="10.2">Upon termination, the Organiser remains responsible for all obligations to Participants arising from any Fundraiser conducted prior to termination, including prize payment.</SubSection>
              <SubSection n="10.3">Campaign Fees are non-refundable upon termination except where required by law.</SubSection>
            </Section>

            <Section n="11" title="Amendments">
              <p>Lucky Squares Australia reserves the right to amend these Terms at any time. Amended Terms will be published on the Platform with an updated date. Continued use of the Platform following publication of amended Terms constitutes acceptance of those Terms.</p>
            </Section>

            <Section n="12" title="Fair Play" id="fair-play">
              <SubSection n="12.1" label="One account per organisation">
                The Organisation plan is available to individual community organisations only. Each organisation
                may hold one Organisation plan account. The plan is not transferable to, and may not be shared
                with, affiliated entities, member clubs, branches, or any other organisation, regardless of
                any formal relationship between those entities.
              </SubSection>
              <SubSection n="12.2" label="Umbrella organisations">
                A state-based body, league, association, or governing body may not purchase a single
                Organisation plan and extend its benefits to member clubs or affiliated organisations under
                its umbrella. Each individual club, school, or charitable entity that wishes to access the
                Organisation plan must hold its own account and pay the applicable annual fee.
              </SubSection>
              <SubSection n="12.3" label="ABN verification">
                We verify the Australian Business Number (ABN) provided at registration. By submitting an ABN,
                the Organiser confirms that the ABN belongs to the organisation for which the account is being
                created. Providing an ABN that belongs to another entity, or using an Organisation plan account
                on behalf of an entity other than the registered organisation, constitutes a material breach of
                these Terms and may result in immediate termination of the account without refund.
              </SubSection>
              <SubSection n="12.4" label="Our intent">
                The Organisation plan is priced to make ongoing fundraising accessible and affordable for
                genuine community organisations. We ask that Organisers honour the spirit of this pricing.
                Lucky Squares Australia reserves the right to investigate suspected misuse and to take
                appropriate action, including account suspension or termination, where misuse is identified.
              </SubSection>
            </Section>

            <Section n="13" title="Governing Law">
              <p>These Terms are governed by the laws of South Australia, Australia. Each party submits to the non-exclusive jurisdiction of the courts of South Australia for the resolution of any dispute arising under or in connection with these Terms.</p>
            </Section>

            <Section n="14" title="Contact" last>
              <p>For any questions regarding these Terms, please contact Play With Heart Pty Ltd ACN 698 202 069 (trading as Lucky Squares Australia) at:</p>
              <p><a href="/contact" style={{ color: 'var(--green)', fontWeight: 700 }}>Contact us</a></p>
            </Section>

          </div>
        </div>
      </section>
    </>
  );
}

function Section({ n, title, children, last, id }) {
  return (
    <div id={id} style={{ marginBottom: last ? 0 : 40 }}>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {(n || label) && (
        <div style={{ fontWeight: 800 }}>
          {n}{label ? `: ${label}` : ''}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}

function Term({ term, children }) {
  return (
    <div style={{ display: 'flex', gap: 12, paddingBottom: 8 }}>
      <dt style={{ fontWeight: 800, flexShrink: 0, minWidth: 140 }}>{term}</dt>
      <dd style={{ margin: 0 }}>means {children}</dd>
    </div>
  );
}

function FeeTable() {
  return (
    <div style={{ margin: '14px 0 4px', background: 'var(--cream)', borderRadius: 10, overflow: 'hidden', border: '1.5px solid var(--border)' }}>
      {[['Casual (per campaign)', '$19.00 AUD'], ['Organisation plan', '$149.00 AUD / year']].map(([plan, fee]) => (
        <div key={plan} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
          <span>{plan}</span>
          <span style={{ fontWeight: 800 }}>{fee}</span>
        </div>
      ))}
    </div>
  );
}
