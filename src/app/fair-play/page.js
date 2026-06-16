import MarketingNav from '@/components/marketing/MarketingNav';
import Link from 'next/link';

export const metadata = {
  title: 'Fair Play Policy',
  description: 'Our commitment to fair, honest use of the Lucky Squares platform by community organisations across Australia.',
  alternates: { canonical: 'https://luckysquares.com.au/fair-play' },
};

export default function FairPlayPage() {
  return (
    <>
      <MarketingNav />
      <section className="section-hero-bg" style={{ padding: '56px 24px 48px', textAlign: 'center' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🤝</div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px,4vw,44px)', fontWeight: 900, marginBottom: 16 }}>
            Fair Play Policy
          </h1>
          <p style={{ fontSize: 16, color: 'var(--text2)', lineHeight: 1.7, maxWidth: 520, margin: '0 auto' }}>
            Lucky Squares Australia exists to help genuine community organisations raise funds. This policy explains what fair use looks like and why it matters.
          </p>
        </div>
      </section>

      <section style={{ padding: '48px 24px 80px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32 }}>

          <div className="scratch-card" style={{ padding: '32px 36px' }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>
              <span style={{ fontSize: 28, flexShrink: 0 }}>🏛️</span>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 900 }}>One account per organisation</h2>
            </div>
            <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.8 }}>
              The Organisation plan is available to individual community organisations only. Each organisation may hold one Organisation plan account. The plan is not transferable to, and may not be shared with, affiliated entities, member clubs, branches, or any other organisation, regardless of any formal relationship between those entities.
            </p>
          </div>

          <div className="scratch-card" style={{ padding: '32px 36px' }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>
              <span style={{ fontSize: 28, flexShrink: 0 }}>🌐</span>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 900 }}>Umbrella organisations</h2>
            </div>
            <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.8 }}>
              A state-based body, league, association, or governing body may not purchase a single Organisation plan and extend its benefits to member clubs or affiliated organisations under its umbrella. Each individual club, school, or charitable entity that wishes to access the Organisation plan must hold its own account and pay the applicable annual fee.
            </p>
          </div>

          <div className="scratch-card" style={{ padding: '32px 36px' }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>
              <span style={{ fontSize: 28, flexShrink: 0 }}>🔍</span>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 900 }}>ABN verification</h2>
            </div>
            <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.8 }}>
              We verify the Australian Business Number (ABN) provided at registration. By submitting an ABN, the Organiser confirms that the ABN belongs to the organisation for which the account is being created. Providing an ABN that belongs to another entity, or using an Organisation plan account on behalf of an entity other than the registered organisation, constitutes a material breach of these Terms and may result in immediate termination of the account without refund.
            </p>
          </div>

          <div className="scratch-card" style={{ padding: '32px 36px', background: 'linear-gradient(135deg, color-mix(in srgb, var(--purple3) 13%, transparent), color-mix(in srgb, var(--purple2) 7%, transparent))', border: '1.5px solid rgba(107,70,245,.2)' }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>
              <span style={{ fontSize: 28, flexShrink: 0 }}>💜</span>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 900 }}>Our intent</h2>
            </div>
            <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.8 }}>
              The Organisation plan is priced to make ongoing fundraising accessible and affordable for genuine community organisations. We ask that Organisers honour the spirit of this pricing. Lucky Squares Australia reserves the right to investigate suspected misuse and to take appropriate action, including account suspension or termination, where misuse is identified.
            </p>
          </div>

          <div style={{ textAlign: 'center', paddingTop: 8 }}>
            <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 20 }}>
              This policy forms part of our full <Link href="/terms" style={{ color: 'var(--purple)', fontWeight: 700 }}>Terms of Service</Link>. Questions? We're happy to chat.
            </p>
            <Link href="/contact" className="btn btn-primary">Contact us</Link>
          </div>

        </div>
      </section>
    </>
  );
}
