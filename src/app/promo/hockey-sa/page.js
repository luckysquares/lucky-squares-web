'use client';

import Link from 'next/link';
import Logo from '@/components/ui/Logo';

const QR_MAIN = 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=https%3A%2F%2Fluckysquares.com.au&color=1A0A3C&bgcolor=ffffff&margin=4';

// Demo grid data — 5x5
const GRID = [
  { name: 'Sarah M',  status: 'taken'  },
  { name: 'Tom K',    status: 'taken'  },
  { name: 'You',       status: 'mine'   },
  { name: 'Jess W',   status: 'taken'  },
  { name: 'Luke B',   status: 'taken'  },
  { name: 'Priya S',  status: 'taken'  },
  { name: '',         status: 'reserved' },
  { name: 'Dan H',    status: 'taken'  },
  { name: 'Cath L',   status: 'winner' },
  { name: 'Mia T',    status: 'taken'  },
  { name: '',         status: 'available' },
  { name: 'Ben A',    status: 'taken'  },
  { name: '',         status: 'available' },
  { name: 'Jake R',   status: 'taken'  },
  { name: 'Amy C',    status: 'taken'  },
  { name: 'Liam F',   status: 'taken'  },
  { name: '',         status: 'available' },
  { name: 'Ruby S',   status: 'taken'  },
  { name: '',         status: 'available' },
  { name: 'Connor B', status: 'taken'  },
  { name: '',         status: 'available' },
  { name: 'Bella R',  status: 'taken'  },
  { name: 'Tyler M',  status: 'taken'  },
  { name: '',         status: 'available' },
  { name: 'Isla J',   status: 'taken'  },
];


const css = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #D6D0C4; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
  .no-print { background: #1A1209; padding: 14px 24px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
  .print-btn { background: #F5C842; border: none; color: #1A1209; padding: 10px 22px; border-radius: 8px; font-size: 13px; font-weight: 800; cursor: pointer; font-family: inherit; }
  .back-link { font-size: 13px; color: rgba(255,255,255,.6); text-decoration: none; }
  .page-wrap { display: flex; flex-direction: column; gap: 40px; padding: 40px 20px 60px; align-items: center; }
  .a4 { width: 210mm; height: 297mm; overflow: hidden; position: relative; box-shadow: 0 8px 48px rgba(0,0,0,.35); }
  .sq {
    aspect-ratio: 1; border-radius: 6px; border: 1.5px solid transparent;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    cursor: default; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: 11px; font-weight: 700; user-select: none; position: relative; overflow: hidden;
  }
  .sq.available  { background: #fff; border-color: #C8E8D8; color: #9C8060; }
  .sq.mine       { background: linear-gradient(135deg,#5B9FE8,#2165B5); border-color: #1A55A0; color: #fff; }
  .sq.reserved   { background: linear-gradient(135deg,#FFEADC,#FFD8C0); border-color: #FF9045; color: #FF6010; }
  .sq.taken      { background: #F0EDE5; border-color: #DDD5C0; color: #C4B09A; }
  .sq.winner     { background: #00C875; border-color: #009A5C; color: #fff; }
  .sq-num   { font-size: 16px; line-height: 1; font-weight: 800; }
  .sq-label { font-size: 8px; line-height: 1; margin-top: 2px; text-align: center; overflow: hidden; max-width: 100%; text-overflow: ellipsis; white-space: nowrap; padding: 0 2px; }
  @page { size: A4 portrait; margin: 0; }
  @media print {
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
    html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
    .no-print { display: none !important; }
    .page-wrap { padding: 0 !important; gap: 0 !important; background: none !important; display: block !important; }
    .a4 { box-shadow: none !important; width: 210mm !important; height: 297mm !important; overflow: hidden !important; page-break-inside: avoid !important; break-inside: avoid !important; }
    .a4 + .a4 { page-break-before: always !important; break-before: page !important; }
  }
`;

export default function HockeySAPromo() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/admin/marketing" className="back-link">Back to Marketing</Link>
          <span style={{ color: 'rgba(255,255,255,.4)', fontSize: 13 }}>Double-sided A4 — Hockey SA Junior Country Championships</span>
        </div>
        <a href="/Hockey-SA-Lucky-Squares.pdf" download="Hockey-SA-Lucky-Squares.pdf" className="print-btn">
          Download PDF
        </a>
      </div>

      <div className="page-wrap">

        {/* ══ SIDE 1 — HERO ══ */}
        <div className="a4" style={{ display: 'flex', flexDirection: 'column', background: '#fff' }}>

          {/* Dark hero */}
          <div style={{ background: 'linear-gradient(160deg,#0D0820 0%,#1A0A3C 50%,#2D0E6B 100%)', padding: '28px 32px 0', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, right: 0, width: 200, height: 200, opacity: 0.06, backgroundImage: 'radial-gradient(circle,#fff 1.5px,transparent 1.5px)', backgroundSize: '16px 16px' }} />
            <div style={{ marginBottom: 24 }}><Logo size={34} dark /></div>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#F5C820', letterSpacing: 3.5, textTransform: 'uppercase', marginBottom: 10 }}>For sporting clubs and associations</div>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: 48, fontWeight: 900, color: '#fff', lineHeight: 1.0, letterSpacing: '-0.5px', marginBottom: 14 }}>
              Level up<br/>your<br/>fundraising.
            </div>
            <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.72)', lineHeight: 1.6, maxWidth: 340, marginBottom: 20 }}>
              Run a Lucky Squares fundraiser entirely online. Set up in minutes, sell squares by link, and draw live.
            </div>
          </div>

          {/* Sports photo with stats overlay */}
          <div style={{ height: 420, overflow: 'hidden', flexShrink: 0, position: 'relative', backgroundImage: 'url(/sports-club-fundraiser.PNG)', backgroundSize: 'cover', backgroundPosition: 'center 35%' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,#2D0E6B 0%,transparent 30%,transparent 45%,rgba(0,0,0,0.72) 100%)' }} />
            {/* Stats strip — overlaid on photo */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)' }}>
              {[
                { n: '5 min', label: 'to set up' },
                { n: '$0', label: 'to get started' },
                { n: '$19', label: 'flat launch fee' },
                { n: '100%', label: 'raised to your cause' },
              ].map(({ n, label }, i) => (
                <div key={n} style={{ padding: '12px 8px', textAlign: 'center', borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.12)' : 'none' }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#F5C820', marginBottom: 2 }}>{n}</div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.65)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* How it works */}
          <div style={{ padding: '22px 32px 0', flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#6B46F5', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14 }}>How it works</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
              {[
                { icon: '🎯', title: 'Set up your grid', body: 'Choose your grid size, set your price per square, and add your prizes. Takes about five minutes.' },
                { icon: '🔗', title: 'Share your link', body: 'Send your link via WhatsApp, social media, SMS or email. Buyers pick their square and pay by card on the spot.' },
                { icon: '🎲', title: 'Run the live draw', body: 'Hit draw when ready and the winning square is highlighted live for everyone watching. Winners notified by email instantly.' },
              ].map(({ icon, title, body }) => (
                <div key={title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#A78BFA,#6B46F5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{icon}</div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13, color: '#1A1209', marginBottom: 1 }}>{title}</div>
                    <div style={{ fontSize: 11, color: '#6B5E4E', lineHeight: 1.5 }}>{body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer CTA */}
          <div style={{ background: 'linear-gradient(135deg,#1A0A3C,#6B46F5)', padding: '18px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Start free at</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#F5C820', letterSpacing: '-0.5px' }}>luckysquares.com.au</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>No credit card needed to get started</div>
            </div>
            <div style={{ background: '#fff', borderRadius: 10, padding: 6, flexShrink: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={QR_MAIN} alt="Scan to visit" width="70" height="70" />
            </div>
          </div>
        </div>


        {/* ══ SIDE 2 — DETAIL ══ */}
        <div className="a4" style={{ display: 'flex', flexDirection: 'column', background: '#F5F3EE' }}>

          {/* Header */}
          <div style={{ background: '#fff', borderBottom: '3px solid #6B46F5', padding: '18px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <Logo size={30} />
            <div style={{ fontSize: 12, fontWeight: 700, color: '#6B46F5' }}>luckysquares.com.au</div>
          </div>

          {/* Hero image */}
          <div style={{ height: 296, overflow: 'hidden', flexShrink: 0, position: 'relative', backgroundImage: 'url(/help-for-sports-clubs-to-raise-money.PNG)', backgroundSize: 'cover', backgroundPosition: 'center 30%' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right,rgba(107,70,245,0.82) 0%,rgba(107,70,245,0.25) 55%,transparent 100%)' }} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', padding: '0 32px' }}>
              <div>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: 24, fontWeight: 900, color: '#fff', lineHeight: 1.2, marginBottom: 4 }}>Your club deserves<br/>a better way to fundraise.</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>No spreadsheets. No cash. No chaos.</div>
              </div>
            </div>
          </div>

          <div style={{ padding: '16px 32px', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Why clubs love it */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#6B46F5', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>Why sporting clubs choose us</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { icon: '📱', title: 'Works on any device', body: 'Buyers pick their square and pay by card from their phone. No app needed.' },
                  { icon: '💸', title: 'Funds go directly to you', body: 'Simple flat-fee pricing. We don\'t take a percentage of the funds you raise.' },
                  { icon: '🎯', title: 'No spreadsheets', body: 'The grid manages itself. See who has which square in real time.' },
                  { icon: '🎲', title: 'Live draw everyone can watch', body: 'Run the draw on any screen. Winners revealed live. Everyone loves it.' },
                ].map(({ icon, title, body }) => (
                  <div key={title} style={{ background: '#fff', borderRadius: 8, padding: '10px 12px', border: '1px solid #E5E0D5' }}>
                    <div style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 11, color: '#1A1209', marginBottom: 1 }}>{title}</div>
                        <div style={{ fontSize: 10, color: '#6B5E4E', lineHeight: 1.5 }}>{body}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ background: '#fff', borderRadius: 10, padding: '14px 16px', border: '1.5px solid #E5E0D5' }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: '#9B8F80', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Casual fundraiser</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#6B46F5', marginBottom: 2 }}>$19</div>
                <div style={{ fontSize: 10, color: '#6B5E4E', lineHeight: 1.6 }}>Flat fee per campaign. Free to set up. Pay only when you launch.</div>
                <div style={{ marginTop: 8, fontSize: 10, fontWeight: 700, color: '#16A34A' }}>✓ Perfect for one-off fundraisers</div>
              </div>
              <div style={{ background: 'linear-gradient(135deg,#1A0A3C,#4A28D4)', borderRadius: 10, padding: '14px 16px', border: '1.5px solid #6B46F5' }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Organisation plan</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#F5C820', marginBottom: 2 }}>$149<span style={{ fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,0.6)' }}>/yr</span></div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>Up to 10 campaigns at once. Team access. Perfect for regular fundraisers.</div>
                <div style={{ marginTop: 8, fontSize: 10, fontWeight: 700, color: '#F5C820' }}>✓ Best for clubs and associations</div>
              </div>
            </div>

            {/* Live grid demo */}
            <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '1.5px solid #E5E0D5' }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#6B46F5', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>This is what a Lucky Squares grid looks like</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 44px)', gap: 5 }}>
                  {GRID.map((sq, i) => (
                    <div key={i} className={`sq ${sq.status}`} style={{ width: 44, height: 44, borderRadius: 7, cursor: 'default' }}>
                      <span className="sq-num">{i + 1}</span>
                      {sq.status !== 'available' && sq.status !== 'reserved' && <span className="sq-label">{sq.name.split(' ')[0]}</span>}
                    </div>
                  ))}
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {[
                    { state: 'available', label: 'Available',   num: '3',  name: null,   desc: 'Open for anyone to claim.' },
                    { state: 'mine',      label: 'Your square', num: '3',  name: 'You',  desc: 'Your square — confirmed after payment.' },
                    { state: 'reserved',  label: 'Reserved',    num: '7',  name: null,   desc: 'In someone\'s cart. Released if not paid.' },
                    { state: 'taken',     label: 'Sold',        num: '4',  name: 'Jess', desc: 'Purchased. Buyer\'s first name shown.' },
                    { state: 'winner',    label: 'Winner',      num: '9',  name: 'Cath', desc: 'Winning square, highlighted after the draw.' },
                  ].map(({ state, label, num, name, desc }) => (
                    <div key={state} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', background: '#FDF8F0', borderRadius: 8, border: '1px solid #E8DEC8' }}>
                      <div className={`sq ${state}`} style={{ width: 34, height: 34, borderRadius: 6, flexShrink: 0, cursor: 'default' }}>
                        <span className="sq-num" style={{ fontSize: 11 }}>{num}</span>
                        {name && <span className="sq-label">{name}</span>}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 10, color: '#2A1F0F', marginBottom: 1 }}>{label}</div>
                        <div style={{ fontSize: 9, color: '#6B5340', lineHeight: 1.4 }}>{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div style={{ background: '#1A0A3C', padding: '10px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#F5C820' }}>luckysquares.com.au</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>hello@luckysquares.com.au</div>
          </div>
        </div>

      </div>
    </>
  );
}
