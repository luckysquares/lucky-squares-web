'use client';

import { useState, useEffect } from 'react';
import { use } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { getSupabaseClient, supabaseConfigured } from '@/lib/supabase/client';

const HOME_URL = 'https://luckysquares.com.au';
const UUID_RE  = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function dbToFundraiser(row, prizes = []) {
  return {
    id:          row.id,
    slug:        row.slug,
    title:       row.title,
    org:         row.org,
    description: row.description || '',
    grid:        row.grid_size,
    pricePerSq:  parseFloat(row.price_per_sq),
    emoji:       row.emoji || '🍀',
    imageUrl:    row.image_url || null,
    prizes:      prizes
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((p) => ({ place: p.place, description: p.description, value: p.value, donated: p.donated ?? false }))
      .filter((p) => p.description),
  };
}

const PLACE_LABELS = ['1st', '2nd', '3rd', '4th', '5th'];
const PLACE_EMOJIS = ['🥇', '🥈', '🥉', '🎖️', '🎖️'];

// Inline SVG logo icon — no web font dependency for print
function LogoIcon({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 46 46" xmlns="http://www.w3.org/2000/svg">
      <rect width="46" height="46" rx="11" fill="#6B46F5"/>
      <rect x="5"  y="5"  width="8" height="8" rx="2" fill="rgba(255,255,255,0.22)"/>
      <rect x="15" y="5"  width="8" height="8" rx="2" fill="rgba(255,255,255,0.22)"/>
      <rect x="25" y="5"  width="8" height="8" rx="2" fill="rgba(255,255,255,0.22)"/>
      <rect x="35" y="5"  width="6" height="8" rx="2" fill="rgba(255,255,255,0.22)"/>
      <rect x="5"  y="15" width="8" height="8" rx="2" fill="rgba(255,255,255,0.22)"/>
      <rect x="15" y="15" width="8" height="8" rx="2" fill="#F5C820"/>
      <rect x="25" y="15" width="8" height="8" rx="2" fill="rgba(255,255,255,0.22)"/>
      <rect x="35" y="15" width="6" height="8" rx="2" fill="rgba(255,255,255,0.22)"/>
      <rect x="5"  y="25" width="8" height="8" rx="2" fill="rgba(255,255,255,0.22)"/>
      <rect x="15" y="25" width="8" height="8" rx="2" fill="rgba(255,255,255,0.22)"/>
      <rect x="25" y="25" width="8" height="8" rx="2" fill="rgba(255,255,255,0.22)"/>
      <rect x="35" y="25" width="6" height="8" rx="2" fill="rgba(255,255,255,0.22)"/>
      <rect x="5"  y="35" width="8" height="6" rx="2" fill="rgba(255,255,255,0.22)"/>
      <rect x="15" y="35" width="8" height="6" rx="2" fill="rgba(255,255,255,0.22)"/>
      <rect x="25" y="35" width="8" height="6" rx="2" fill="rgba(255,255,255,0.22)"/>
      <rect x="35" y="35" width="6" height="6" rx="2" fill="rgba(255,255,255,0.22)"/>
    </svg>
  );
}

export default function PosterPage({ params }) {
  const { slug }  = use(params);
  const [f,       setF]      = useState(null);
  const [loading, setLoading] = useState(true);
  const [origin,  setOrigin]  = useState('https://luckysquares.com.au');

  useEffect(() => { setOrigin(window.location.origin); }, []);

  useEffect(() => {
    if (!supabaseConfigured) { setLoading(false); return; }
    const supabase = getSupabaseClient();
    const col = UUID_RE.test(slug) ? 'id' : 'slug';
    supabase.from('fundraisers').select('*').eq(col, slug).single()
      .then(({ data }) => {
        if (!data) { setLoading(false); return; }
        supabase.from('prizes').select('*').eq('fundraiser_id', data.id).order('sort_order')
          .then(({ data: prizes }) => {
            setF(dbToFundraiser(data, prizes || []));
            setLoading(false);
          });
      });
  }, [slug]);

  const fundraiserUrl = f ? `${origin}/${f.slug ?? f.id}` : origin;

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F3EE', fontFamily: 'sans-serif', fontSize: 14, color: '#6B7280' }}>
      Loading poster…
    </div>
  );

  if (!f) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F3EE', fontFamily: 'sans-serif', fontSize: 14, color: '#6B7280' }}>
      Fundraiser not found.
    </div>
  );

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; background: #D6D0C4; }
        @media print {
          /* Hide everything outside the poster */
          body { background: #fff; }
          body > * { display: none !important; }
          .poster-print-root { display: flex !important; }
          .no-print { display: none !important; }
          .poster-wrap { padding: 0 !important; }
          footer, header, nav, [class*="chat"], [class*="widget"] { display: none !important; }
          @page { size: A4 portrait; margin: 0; }
        }
      `}</style>

      {/* Control bar */}
      <div className="no-print" style={{ background: '#1A1209', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: 'sans-serif', fontSize: 14, color: 'rgba(255,255,255,.6)' }}>
          <strong style={{ color: '#fff' }}>Poster preview</strong> — print or save as PDF
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => window.history.back()} style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', color: '#fff', padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'sans-serif' }}>
            ← Back
          </button>
          <button onClick={() => window.print()} style={{ background: '#F5C842', border: 'none', color: '#1A1209', padding: '9px 22px', borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'sans-serif' }}>
            🖨 Print / Save as PDF
          </button>
        </div>
      </div>

      {/* Centre the A4 on screen */}
      <div className="poster-print-root poster-wrap" style={{ padding: '40px 20px 60px', display: 'flex', justifyContent: 'center' }}>
        <div style={{
          width: '210mm',
          minHeight: '297mm',
          maxHeight: '297mm',
          background: '#fff',
          boxShadow: '0 8px 48px rgba(0,0,0,.3)',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
          overflow: 'hidden',
        }}>

          {/* ── Header with logo ─────────────────────────────────────── */}
          <div style={{ background: 'linear-gradient(135deg, #A78BFA 0%, #7C3AED 45%, #4A28D4 100%)', padding: '14px 28px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <LogoIcon size={44} />
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-0.3px', lineHeight: 1.1 }}>
                <span style={{ fontWeight: 900 }}>Lucky</span>
                {' '}
                <span style={{ fontWeight: 400, fontStyle: 'italic' }}>Squares</span>
              </div>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '2px', textTransform: 'uppercase', marginTop: 1 }}>Australia</div>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textAlign: 'right' }}>
              <div>{f.org}</div>
            </div>
          </div>

          {/* ── Campaign title ────────────────────────────────────────── */}
          <div style={{ background: '#FFFBEC', borderBottom: '4px solid #F5C842', padding: '14px 28px', textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#1A1209', lineHeight: 1.2 }}>{f.title}</div>
          </div>

          {/* ── Campaign image (if set) ───────────────────────────────── */}
          {f.imageUrl && (
            <div style={{ flexShrink: 0, height: '160px', overflow: 'hidden' }}>
              <img
                src={f.imageUrl}
                alt={f.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>
          )}

          {/* ── Two-column body ───────────────────────────────────────── */}
          <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

            {/* Left: prizes */}
            <div style={{ flex: 1, padding: '20px 20px 20px 28px', borderRight: '2px dashed #E5E0D5', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#6B46F5', marginBottom: 14 }}>
                You could win...
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {f.prizes.map((p, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: i === 0 ? '#FFFBEC' : '#FAFAF8',
                    border: `1.5px solid ${i === 0 ? '#F5C842' : '#E5E0D5'}`,
                    borderRadius: 10, padding: '9px 12px',
                  }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{PLACE_EMOJIS[i] ?? '🎖️'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: i === 0 ? '#9A6800' : '#9C8060', marginBottom: 1 }}>
                        {PLACE_LABELS[i] ?? `${i + 1}th`} Prize
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#1A1209', lineHeight: 1.2 }}>{p.description}</div>
                    </div>
                    {p.value && (
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        {p.donated && <div style={{ fontSize: 9, fontWeight: 600, color: '#9C8060' }}>Valued at</div>}
                        <div style={{ fontSize: 16, fontWeight: 900, color: '#6B46F5' }}>${p.value}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: QR + price */}
            <div style={{ width: '44%', flexShrink: 0, padding: '20px 28px 20px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#1A1209', textAlign: 'center' }}>
                Grab your square for just
              </div>
              <div style={{ fontSize: 34, fontWeight: 900, color: '#6B46F5', lineHeight: 1, marginTop: -6 }}>
                ${f.pricePerSq}
              </div>
              <div style={{ background: '#fff', borderRadius: 12, padding: 10, border: '3px solid #6B46F5' }}>
                <QRCodeSVG value={fundraiserUrl} size={150} fgColor="#1A1209" bgColor="#ffffff" level="M" />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: '#1A1209', marginBottom: 4 }}>Scan to choose your square!</div>
                <div style={{ fontSize: 9, color: '#6B7280', wordBreak: 'break-all' }}>{fundraiserUrl}</div>
                <div style={{ fontSize: 10, color: '#9C8060', marginTop: 6 }}>Up to {Math.min(10, f.grid)} squares per person</div>
              </div>
            </div>

          </div>

          {/* ── Footer ────────────────────────────────────────────────── */}
          <div style={{ background: '#F5F3EE', borderTop: '1.5px solid #E5E0D5', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <QRCodeSVG value={HOME_URL} size={28} fgColor="#6B46F5" bgColor="#F5F3EE" level="M" />
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#1A1209' }}>Powered by Lucky Squares Australia</div>
                <div style={{ fontSize: 9, color: '#9C8060' }}>Run your own fundraiser at luckysquares.com.au</div>
              </div>
            </div>
            <LogoIcon size={28} />
          </div>

        </div>
      </div>
    </>
  );
}
