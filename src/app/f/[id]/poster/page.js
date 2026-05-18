'use client';

import { useState, useEffect } from 'react';
import { use } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { getSupabaseClient, supabaseConfigured } from '@/lib/supabase/client';

const HOME_URL = 'https://luckysquares.com.au';

function dbToFundraiser(row, prizes = []) {
  return {
    id:          row.id,
    title:       row.title,
    org:         row.org,
    description: row.description || '',
    grid:        row.grid_size,
    pricePerSq:  parseFloat(row.price_per_sq),
    emoji:       row.emoji || '🍀',
    prizes:      prizes
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((p) => ({ place: p.place, description: p.description, value: p.value, donated: p.donated ?? false }))
      .filter((p) => p.description),
  };
}

const PLACE_LABELS = ['1st', '2nd', '3rd', '4th', '5th'];
const PLACE_EMOJIS = ['🥇', '🥈', '🥉', '🎖️', '🎖️'];

export default function PosterPage({ params }) {
  const { id }      = use(params);
  const [f,  setF]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [origin,  setOrigin]  = useState('https://luckysquares.com.au');

  useEffect(() => { setOrigin(window.location.origin); }, []);

  useEffect(() => {
    if (!supabaseConfigured) { setLoading(false); return; }
    const supabase = getSupabaseClient();
    Promise.all([
      supabase.from('fundraisers').select('*').eq('id', id).single(),
      supabase.from('prizes').select('*').eq('fundraiser_id', id).order('sort_order'),
    ]).then(([{ data }, { data: prizes }]) => {
      if (data) setF(dbToFundraiser(data, prizes || []));
      setLoading(false);
    });
  }, [id]);

  const fundraiserUrl = `${origin}/f/${id}`;

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
          body { background: #fff; }
          .no-print { display: none !important; }
          .poster-wrap { padding: 0 !important; }
          @page { size: A4 portrait; margin: 0; }
        }
      `}</style>

      {/* Control bar */}
      <div className="no-print" style={{ background: '#1A1209', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: 'sans-serif', fontSize: 14, color: 'rgba(255,255,255,.6)' }}>
          <strong style={{ color: '#fff' }}>Poster preview</strong> — print or save as PDF to share with your club
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
      <div className="poster-wrap" style={{ padding: '40px 20px 60px', display: 'flex', justifyContent: 'center' }}>
        <div style={{
          width: '210mm',
          minHeight: '297mm',
          background: '#fff',
          boxShadow: '0 8px 48px rgba(0,0,0,.3)',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
          overflow: 'hidden',
        }}>

          {/* ── Warm green header ──────────────────────────────────────── */}
          <div style={{ background: '#1A7A55', padding: '30px 36px 26px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 6 }}>🍀</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.75)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 4 }}>Lucky Squares Fundraiser</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{f.org}</div>
          </div>

          {/* ── Campaign title ─────────────────────────────────────────── */}
          <div style={{ background: '#FFFBEC', borderBottom: '4px solid #F5C842', padding: '28px 36px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, fontWeight: 900, color: '#1A1209', lineHeight: 1.2 }}>{f.title}</div>
            {f.description && (
              <p style={{ fontSize: 14, color: '#4A3728', lineHeight: 1.7, margin: '14px 0 0', maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>{f.description}</p>
            )}
          </div>

          {/* ── You could win ─────────────────────────────────────────── */}
          {f.prizes.length > 0 && (
            <div style={{ padding: '28px 36px', borderBottom: '2px dashed #E5E0D5' }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#1A7A55', marginBottom: 18, textAlign: 'center' }}>
                You could win...
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {f.prizes.map((p, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    background: i === 0 ? '#FFFBEC' : '#FAFAF8',
                    border: `2px solid ${i === 0 ? '#F5C842' : '#E5E0D5'}`,
                    borderRadius: 14, padding: '14px 20px',
                  }}>
                    <span style={{ fontSize: 32, flexShrink: 0 }}>{PLACE_EMOJIS[i] ?? '🎖️'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: i === 0 ? '#9A6800' : '#9C8060', marginBottom: 2 }}>
                        {PLACE_LABELS[i] ?? `${i + 1}th`} Prize
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 900, color: '#1A1209', lineHeight: 1.2 }}>{p.description}</div>
                    </div>
                    {p.value && !p.donated && (
                      <div style={{ fontSize: 26, fontWeight: 900, color: '#1A7A55', flexShrink: 0 }}>${p.value}</div>
                    )}
                    {p.donated && (
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#1A7A55', background: '#F0FBF4', border: '1.5px solid #A8DFBF', borderRadius: 8, padding: '4px 10px', flexShrink: 0 }}>Kindly donated</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── QR code + price ───────────────────────────────────────── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 36px', gap: 20 }}>

            <div style={{ fontSize: 18, fontWeight: 800, color: '#1A1209', textAlign: 'center' }}>
              Grab your square for just <span style={{ color: '#1A7A55', fontSize: 26 }}>${f.pricePerSq}</span>
            </div>

            <div style={{ background: '#F5F3EE', borderRadius: 20, padding: '24px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, border: '2px solid #E5E0D5', width: '100%', maxWidth: 320 }}>
              <div style={{ background: '#fff', borderRadius: 14, padding: 12, border: '3px solid #1A7A55' }}>
                <QRCodeSVG value={fundraiserUrl} size={200} fgColor="#1A1209" bgColor="#ffffff" level="M" />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#1A1209', marginBottom: 4 }}>Scan to choose your square!</div>
                <div style={{ fontSize: 12, color: '#6B7280', wordBreak: 'break-all' }}>{fundraiserUrl}</div>
              </div>
            </div>

            <div style={{ fontSize: 13, color: '#6B7280', textAlign: 'center' }}>
              Up to {Math.min(10, f.grid)} squares per person
            </div>
          </div>

          {/* ── Footer ────────────────────────────────────────────────── */}
          <div style={{ background: '#F5F3EE', borderTop: '1.5px solid #E5E0D5', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <QRCodeSVG value={HOME_URL} size={36} fgColor="#1A7A55" bgColor="#F5F3EE" level="M" />
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#1A1209' }}>Powered by LuckySquares Australia</div>
                <div style={{ fontSize: 10, color: '#9C8060' }}>Run your own fundraiser at luckysquares.com.au</div>
              </div>
            </div>
            <span style={{ fontSize: 24 }}>🍀</span>
          </div>

        </div>
      </div>
    </>
  );
}
