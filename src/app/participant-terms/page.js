import MarketingNav from '@/components/marketing/MarketingNav';

export const metadata = {
  title: 'Participant Terms',
};

export default function ParticipantTermsPage() {
  return (
    <>
      <MarketingNav />

      <section className="section section-hero-bg" style={{ paddingTop: 80, paddingBottom: 40 }}>
        <div className="section-inner" style={{ textAlign: 'center' }}>
          <div className="section-label">Legal</div>
          <h1 className="section-heading" style={{ margin: '0 auto 16px' }}>Participant Terms</h1>
          <p className="section-body" style={{ margin: '0 auto' }}>Lucky Squares Australia · Last updated: May 2026</p>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--cream)', paddingTop: 0 }}>
        <div className="section-inner" style={{ maxWidth: 780 }}>
          <div className="scratch-card" style={{ padding: '40px 48px' }}>

            <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.8, marginBottom: 32 }}>
              These Participant Terms apply to any person who purchases one or more squares in a fundraiser
              conducted through the Lucky Squares Australia platform. Please read these terms carefully before
              completing your purchase.
            </p>

            <Section n="1" title="Who You Are Dealing With">
              <p>
                When you purchase a square in a Lucky Squares fundraiser, you are participating in a fundraising
                activity organised and operated by the Organiser (the community group, sporting club, or charity
                that created the fundraiser). You are not entering into a transaction with Lucky Squares Australia.
              </p>
              <p>
                Play With Heart Pty Ltd ACN 698 202 069 ABN 19 698 202 069 (trading as Lucky Squares Australia) provides the software platform only.
                It is not the organiser, operator, or promoter of any fundraiser conducted through the Platform.
              </p>
            </Section>

            <Section n="2" title="Your Purchase">
              <SubSection n="2.1">By purchasing one or more squares, you are paying the Organiser for the chance to win a prize in a randomised draw conducted through the Platform.</SubSection>
              <SubSection n="2.2">The price per square, prize structure, draw method, and closing date are set by the Organiser and displayed on the fundraiser page. Lucky Squares Australia does not set or guarantee these details.</SubSection>
              <SubSection n="2.3">Your purchase does not guarantee that you will win a prize.</SubSection>
              <SubSection n="2.4">Each square is allocated a unique number between 1 and the grid size (25, 50, or 100). Square numbers are assigned sequentially in the order they are selected.</SubSection>
              <SubSection n="2.5">A maximum number of 10 squares may be purchased per person per transaction.</SubSection>
            </Section>

            <Section n="3" title="Reservation and Checkout">
              <SubSection n="3.1">When you select squares, they are temporarily reserved for you for 7 minutes while you complete your details and payment.</SubSection>
              <SubSection n="3.2">Squares reserved by you will appear green on the grid and will be visible to other visitors as reserved (shown in orange with a countdown timer) during this period.</SubSection>
              <SubSection n="3.3">If you do not complete your purchase within 7 minutes, your reservation will expire and your squares will be released back to the grid for others to purchase.</SubSection>
              <SubSection n="3.4">Your reservation timer is paused while you are actively in the checkout process and resumes if you navigate away from checkout without completing your purchase.</SubSection>
            </Section>

            <Section n="4" title="Payment">
              <SubSection n="4.1">Payment instructions are provided at checkout. Depending on the fundraiser, payment may be collected in person by the Organiser (cash or EFTPOS), by bank transfer to the Organiser&apos;s nominated account, or by secure online card payment.</SubSection>
              <SubSection n="4.2">A processing fee of 1.7% + $0.30 is added to your total only when paying by secure online card payment. No processing fee applies to bank transfer or in person payments. Any applicable fee is displayed clearly before you confirm your purchase.</SubSection>
              <SubSection n="4.3">Your square(s) will be confirmed once payment is received by the Organiser. In the event of any payment dispute, your query should be directed to the Organiser, not to Lucky Squares Australia.</SubSection>
            </Section>

            <Section n="5" title="The Draw">
              <SubSection n="5.1">Winners are selected by a randomised draw conducted through the Lucky Squares Australia platform. The draw is automated and impartial.</SubSection>
              <SubSection n="5.2">The draw may be triggered automatically when all squares are sold, or manually by the Organiser, depending on the settings chosen by the Organiser.</SubSection>
              <SubSection n="5.3">Where a closing deadline has been set and not all squares have sold, the Organiser may draw from squares sold to that point or cancel and refund participants, in accordance with the rules displayed on the fundraiser page.</SubSection>
              <SubSection n="5.4">Draw results are final. Lucky Squares Australia does not review, override, or re-run draws except in the case of a verified technical error.</SubSection>
            </Section>

            <Section n="6" title="Prizes">
              <SubSection n="6.1">Prizes are paid by the Organiser, not by Lucky Squares Australia. Lucky Squares Australia has no liability for prize payment under any circumstances.</SubSection>
              <SubSection n="6.2">Prize amounts displayed on the fundraiser page are set by the Organiser. Where a 50/50 prize split is selected, prize amounts shown are estimates based on squares sold and will be confirmed following the close of the fundraiser.</SubSection>
              <SubSection n="6.3">If you win a prize, you will be notified by email and provided with instructions for claiming your prize from the Organiser.</SubSection>
              <SubSection n="6.4">Prize claims must be made in accordance with any instructions provided by the Organiser. Lucky Squares Australia is not responsible for unclaimed prizes.</SubSection>
            </Section>

            <Section n="7" title="Refunds and Cancellations">
              <SubSection n="7.1">Refunds are managed by the Organiser, not by Lucky Squares Australia.</SubSection>
              <SubSection n="7.2">If a fundraiser is cancelled before the draw, the Organiser is responsible for refunding all participants.</SubSection>
              <SubSection n="7.3">Lucky Squares Australia is not liable for any refund obligation arising from a cancelled or incomplete fundraiser.</SubSection>
            </Section>

            <Section n="8" title="Your Personal Information">
              <p>Your name, phone number, and email address are collected when you purchase a square. This information is used to:</p>
              <ul>
                <li>Confirm your square allocation</li>
                <li>Notify you of the draw result</li>
                <li>Contact you if you win a prize</li>
              </ul>
              <p>
                Your information is handled in accordance with the Lucky Squares Australia{' '}
                <a href="/privacy" style={{ color: 'var(--green)', fontWeight: 700 }}>Privacy Policy</a>.
                Your details will be shared with the Organiser for the purposes of running the fundraiser.
              </p>
            </Section>

            <Section n="9" title="Eligibility">
              <p>By participating in a Lucky Squares fundraiser, you confirm that:</p>
              <ul>
                <li>You meet any minimum age requirement applicable in your jurisdiction</li>
                <li>Your participation is permitted under the laws of your state or territory</li>
                <li>You are not participating on behalf of a syndicate or commercial enterprise unless disclosed to the Organiser</li>
              </ul>
            </Section>

            <Section n="10" title="Complaints">
              <p>
                If you have a complaint about a fundraiser, please contact the Organiser in the first instance.
                If you believe the Platform has been used unlawfully, you may <a href="/contact" style={{ color: 'var(--green)', fontWeight: 700 }}>contact Lucky Squares Australia</a>.
                Lucky Squares Australia will cooperate with any relevant regulatory authority investigation.
              </p>
            </Section>

            <Section n="11" title="Governing Law" last>
              <p>These Participant Terms are governed by the laws of South Australia, Australia.</p>
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

function SubSection({ n, children }) {
  return (
    <div>
      <span style={{ fontWeight: 800, marginRight: 6 }}>{n}</span>
      {children}
    </div>
  );
}
