import Link from 'next/link';

export const metadata = { title: 'Lucky Squares — Promo Poster', robots: { index: false } };

const QR_MAIN    = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https%3A%2F%2Fluckysquares.com.au&color=1A0A3C&bgcolor=ffffff&margin=4';
const QR_SIGNUP  = 'https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=https%3A%2F%2Fluckysquares.com.au%2Ffundraise%3Fregister%3D1&color=6B46F5&bgcolor=ffffff&margin=4';

const css = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #D6D0C4; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }

  .no-print { background: #1A1209; padding: 14px 24px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
  .print-btn { background: #F5C842; border: none; color: #1A1209; padding: 10px 22px; border-radius: 8px; font-size: 13px; font-weight: 800; cursor: pointer; font-family: inherit; }
  .back-link { font-size: 13px; color: rgba(255,255,255,.6); text-decoration: none; }

  .page-wrap { display: flex; flex-direction: column; gap: 40px; padding: 40px 20px 60px; align-items: center; }

  /* A4 portrait: 210mm × 297mm */
  .a4 { width: 210mm; min-height: 297mm; background: #fff; box-shadow: 0 8px 48px rgba(0,0,0,.35); overflow: hidden; position: relative; }

  @page { size: A4 portrait; margin: 0; }
  @media print {
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
    body { background: #fff !important; }
    .no-print { display: none !important; }
    .page-wrap { padding: 0; gap: 0; background: none; }
    .a4 { box-shadow: none; page-break-after: always; break-after: page; width: 210mm; min-height: 297mm; }
  }
`;

export default function HockeySAPromo() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {/* Print controls */}
      <div className="no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/admin/marketing" className="back-link">← Back to Marketing</Link>
          <span style={{ color: 'rgba(255,255,255,.4)', fontSize: 13 }}>Double-sided A4 · Hockey SA Junior Country Championships</span>
        </div>
        <button className="print-btn" onClick={() => {}} id="printBtn">🖨 Print both sides</button>
        <script dangerouslySetInnerHTML={{ __html: `document.getElementById('printBtn').onclick=()=>window.print()` }} />
      </div>

      <div className="page-wrap">

        {/* ═══ SIDE 1 — HERO ═══ */}
        <div className="a4" style={{ display: 'flex', flexDirection: 'column' }}>

          {/* Hero — dark gradient top half */}
          <div style={{
            background: 'linear-gradient(165deg, #0D0820 0%, #1A0A3C 45%, #2D0E6B 80%, #6B46F5 100%)',
            padding: '36px 36px 0',
            flex: '0 0 auto',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Decorative grid dots */}
            <div style={{ position: 'absolute', top: 0, right: 0, width: 220, height: 220, opacity: 0.08,
              backgroundImage: 'radial-gradient(circle, #fff 1.5px, transparent 1.5px)',
              backgroundSize: '18px 18px' }} />

            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/lucky-squares-logo.png" alt="Lucky Squares Australia" style={{ height: 32, display: 'block' }} />
            </div>

            {/* Main headline */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#F5C820', letterSpacing: 4, textTransform: 'uppercase', marginBottom: 12 }}>
                For sporting clubs and associations
              </div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: 52, fontWeight: 900, color: '#fff', lineHeight: 1.0, letterSpacing: '-1px', marginBottom: 16 }}>
                Level up<br/>your<br/>fundraising.
              </div>
              <div style={{ fontSize: 17, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, maxWidth: 360, marginBottom: 28 }}>
                Run a Lucky Squares fundraiser entirely online. Set up in minutes, sell squares by link, watch your grid fill up, and draw live.
              </div>
            </div>

            {/* Stats strip */}
            <div style={{ display: 'flex', gap: 0, background: 'rgba(255,255,255,0.07)', borderRadius: '12px 12px 0 0', overflow: 'hidden' }}>
              {[
                { n: '5 min', label: 'to set up' },
                { n: '$0', label: 'to get started' },
                { n: '$19', label: 'flat fee to launch' },
                { n: '100%', label: 'of funds to your cause' },
              ].map(({ n, label }, i) => (
                <div key={n} style={{ flex: 1, padding: '16px 12px', textAlign: 'center', borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#F5C820', marginBottom: 2 }}>{n}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Sports image strip */}
          <div style={{ height: 110, overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/sports-club-fundraiser.PNG" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 40%', display: 'block' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, #2D0E6B 0%, transparent 30%, transparent 70%, rgba(255,255,255,1) 100%)' }} />
          </div>

          {/* How it works — light section */}
          <div style={{ padding: '8px 36px 24px', flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#6B46F5', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>How it works</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              {[
                { n: '1', icon: '🎯', title: 'Set up your grid', body: 'Choose your grid size, set your price per square, and add your prizes. Takes about five minutes.' },
                { n: '2', icon: '🔗', title: 'Share your link', body: 'Send your link to members via WhatsApp, Facebook or email. Buyers pick their square and pay by card on the spot.' },
                { n: '3', icon: '🎲', title: 'Run the live draw', body: 'Hit draw when your grid is full and the winning square is revealed live to everyone watching. Winners notified instantly.' },
              ].map(({ n, icon, title, body }) => (
                <div key={n} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#A78BFA,#6B46F5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{icon}</div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13, color: '#1A1209', marginBottom: 2 }}>{title}</div>
                    <div style={{ fontSize: 12, color: '#6B5E4E', lineHeight: 1.5 }}>{body}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Partner badge */}
            <div style={{ background: 'linear-gradient(135deg,#ECFDF5,#D1FAE5)', border: '1px solid #6EE7B7', borderRadius: 10, padding: '10px 14px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>🤝</span>
              <div style={{ fontSize: 11, color: '#065F46', lineHeight: 1.5 }}>
                <strong>Sport SA launch partner.</strong> Lucky Squares Australia is the fundraising platform backed by Sport SA — built specifically for South Australian sporting clubs and communities.
              </div>
            </div>
          </div>

          {/* Footer CTA */}
          <div style={{ background: 'linear-gradient(135deg,#1A0A3C,#6B46F5)', padding: '20px 36px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Start free at</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#F5C820', letterSpacing: '-0.5px' }}>luckysquares.com.au</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>No credit card needed to get started</div>
            </div>
            <div style={{ background: '#fff', borderRadius: 12, padding: 8, flexShrink: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={QR_MAIN} alt="Scan to visit" width="80" height="80" />
            </div>
          </div>
        </div>


        {/* ═══ SIDE 2 — DETAIL ═══ */}
        <div className="a4" style={{ display: 'flex', flexDirection: 'column', background: '#F5F3EE' }}>

          {/* Header */}
          <div style={{ background: '#fff', borderBottom: '3px solid #6B46F5', padding: '24px 36px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/lucky-squares-logo.png" alt="Lucky Squares Australia" style={{ height: 28, display: 'block' }} />
            <div style={{ fontSize: 12, fontWeight: 700, color: '#6B46F5' }}>luckysquares.com.au</div>
          </div>

          {/* Hero image — full width */}
          <div style={{ height: 130, overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/help-for-sports-clubs-to-raise-money.PNG" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%', display: 'block' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(107,70,245,0.85) 0%, rgba(107,70,245,0.3) 50%, transparent 100%)' }} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', padding: '0 36px' }}>
              <div>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: 28, fontWeight: 900, color: '#fff', lineHeight: 1.2, marginBottom: 4 }}>
                  Your club deserves<br/>a better way to fundraise.
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>No spreadsheets. No cash. No chaos.</div>
              </div>
            </div>
          </div>

          <div style={{ padding: '24px 36px', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Why clubs love it */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#6B46F5', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Why sporting clubs choose us</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { icon: '📱', title: 'Works on any device', body: 'Buyers pick their square and pay by card from their phone. No app download needed.' },
                  { icon: '💸', title: 'Funds go directly to you', body: 'Proceeds transfer straight to your bank account. We charge a flat $19 fee, nothing more.' },
                  { icon: '🎯', title: 'No spreadsheets', body: 'The grid manages itself. You can see who has which square in real time, from anywhere.' },
                  { icon: '🎲', title: 'Live draw your whole club can watch', body: 'Run the draw on any screen. Winners are revealed live. Everyone loves it.' },
                  { icon: '🔗', title: 'Share via WhatsApp, Facebook or email', body: 'One link. Share it wherever your community is active. That\'s all it takes.' },
                  { icon: '🏆', title: 'Multiple prizes supported', body: 'First, second, and third prize — or as many as you like. All drawn automatically.' },
                ].map(({ icon, title, body }) => (
                  <div key={title} style={{ background: '#fff', borderRadius: 10, padding: '12px 14px', border: '1px solid #E5E0D5' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 12, color: '#1A1209', marginBottom: 2 }}>{title}</div>
                        <div style={{ fontSize: 11, color: '#6B5E4E', lineHeight: 1.5 }}>{body}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1.5px solid #E5E0D5' }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#9B8F80', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Casual fundraiser</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: '#6B46F5', marginBottom: 2 }}>$19</div>
                <div style={{ fontSize: 11, color: '#6B5E4E', lineHeight: 1.6 }}>Flat fee per campaign. No subscription. Free to set up and share. Pay only when you launch.</div>
                <div style={{ marginTop: 10, fontSize: 11, fontWeight: 700, color: '#16A34A' }}>✓ Perfect for one-off fundraisers</div>
              </div>
              <div style={{ background: 'linear-gradient(135deg,#1A0A3C,#4A28D4)', borderRadius: 12, padding: '16px 20px', border: '1.5px solid #6B46F5' }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Organisation plan</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: '#F5C820', marginBottom: 2 }}>$149<span style={{ fontSize: 14, fontWeight: 400, color: 'rgba(255,255,255,0.6)' }}>/year</span></div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>Up to 10 campaigns running at once. Team access. Ideal for clubs running regular fundraisers.</div>
                <div style={{ marginTop: 10, fontSize: 11, fontWeight: 700, color: '#F5C820' }}>✓ Best for clubs and associations</div>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div style={{ background: '#1A0A3C', padding: '18px 36px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Scan to create your free account</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#F5C820' }}>luckysquares.com.au</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>hello@luckysquares.com.au</div>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ background: '#fff', borderRadius: 10, padding: 6, marginBottom: 4 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={QR_SIGNUP} alt="Scan to sign up" width="72" height="72" />
                </div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Create account</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ background: '#fff', borderRadius: 10, padding: 6, marginBottom: 4 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={QR_MAIN} alt="Scan to visit" width="72" height="72" />
                </div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Visit website</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
