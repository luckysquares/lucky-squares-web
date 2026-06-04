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

  // Footer QR: homepage with UTM attribution so GA4 records which organiser's
  // poster drove the visit. org slug used as campaign name for readability.
  const orgSlug = f?.org
    ? f.org.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
    : 'unknown';
  const footerQrUrl = f
    ? `${HOME_URL}?utm_source=poster&utm_medium=print&utm_campaign=${orgSlug}&utm_content=${f.slug ?? f.id}`
    : HOME_URL;

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
          /* Reliable "print only the poster" technique:
             hide everything via visibility, then un-hide just the poster.
             Works regardless of Next.js DOM nesting. */
          @page { size: A4 portrait; margin: 0; }
          body { background: #fff !important; }
          body * { visibility: hidden; }
          .poster-sheet,
          .poster-sheet * { visibility: visible; }
          .poster-sheet {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Control bar — hidden on print */}
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

      {/* Screen wrapper — centres the A4 preview */}
      <div style={{ padding: '40px 20px 60px', display: 'flex', justifyContent: 'center' }}>

        {/* ── Poster sheet (A4) ─────────────────────────────────────────── */}
        <div className="poster-sheet" style={{
          width: '210mm',
          height: '297mm',
          background: '#fff',
          boxShadow: '0 8px 48px rgba(0,0,0,.3)',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
          overflow: 'hidden',
        }}>

          {/* ── Header ───────────────────────────────────────────────── */}
          <div style={{ background: 'linear-gradient(135deg, #A78BFA 0%, #7C3AED 45%, #4A28D4 100%)', padding: '14px 28px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <LogoIcon size={44} />
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-0.3px', lineHeight: 1.1 }}>
                <span style={{ fontWeight: 900 }}>Lucky</span>{' '}
                <span style={{ fontWeight: 400, fontStyle: 'italic' }}>Squares</span>
              </div>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '2px', textTransform: 'uppercase', marginTop: 1 }}>Australia</div>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.8)', textAlign: 'right' }}>
              {f.org}
            </div>
          </div>

          {/* ── Campaign title ────────────────────────────────────────── */}
          <div style={{ background: '#FFFBEC', borderBottom: '4px solid #F5C842', padding: '14px 28px', textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#1A1209', lineHeight: 1.2 }}>{f.title}</div>
          </div>

          {/* ── Campaign image ────────────────────────────────────────── */}
          {f.imageUrl && (
            <div style={{ flexShrink: 0, height: '210px', overflow: 'hidden' }}>
              <img
                src={f.imageUrl}
                alt={f.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 40%', display: 'block' }}
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
          <div style={{
            background: '#1A0A3C',
            borderTop: '3px solid #6B46F5',
            padding: '14px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexShrink: 0,
          }}>
            {/* Left: branding */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <LogoIcon size={36} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 900, color: '#fff', letterSpacing: 0.3 }}>Lucky Squares Australia</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>luckysquares.com.au — run your own fundraiser free</div>
              </div>
            </div>
            {/* Right: campaign QR for attribution */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>Powered by</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', wordBreak: 'break-all', maxWidth: 120 }}>{HOME_URL}</div>
              </div>
              <div style={{ background: '#fff', borderRadius: 8, padding: 5 }}>
                <QRCodeSVG value={footerQrUrl} size={56} fgColor="#1A0A3C" bgColor="#ffffff" level="L" />
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
