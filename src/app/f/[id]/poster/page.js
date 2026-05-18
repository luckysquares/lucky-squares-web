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

          {/* ── Header ────────────────────────────────────────────────── */}
          <div style={{ background: 'linear-gradient(135deg, #A78BFA 0%, #7C3AED 45%, #4A28D4 100%)', padding: '22px 36px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px', marginBottom: 4 }}>Lucky Squares Fundraiser</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,.8)' }}>{f.org}</div>
          </div>

          {/* ── Campaign title ─────────────────────────────────────────── */}
          <div style={{ background: '#FFFBEC', borderBottom: '4px solid #F5C842', padding: '20px 36px', textAlign: 'center' }}>
            <div style={{ fontSize: 30, fontWeight: 900, color: '#1A1209', lineHeight: 1.2 }}>{f.title}</div>
            {f.description && (
              <p style={{ fontSize: 13, color: '#4A3728', lineHeight: 1.6, margin: '10px 0 0', maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>{f.description}</p>
            )}
          </div>

          {/* ── You could win ─────────────────────────────────────────── */}
          {f.prizes.length > 0 && (
            <div style={{ padding: '20px 36px', borderBottom: '2px dashed #E5E0D5' }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#6B46F5', marginBottom: 14, textAlign: 'center' }}>
                You could win...
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {f.prizes.map((p, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: i === 0 ? '#FFFBEC' : '#FAFAF8',
                    border: `1.5px solid ${i === 0 ? '#F5C842' : '#E5E0D5'}`,
                    borderRadius: 10, padding: '10px 16px',
                  }}>
                    <span style={{ fontSize: 24, flexShrink: 0 }}>{PLACE_EMOJIS[i] ?? '🎖️'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: i === 0 ? '#9A6800' : '#9C8060', marginBottom: 1 }}>
                        {PLACE_LABELS[i] ?? `${i + 1}th`} Prize
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#1A1209', lineHeight: 1.2 }}>{p.description}</div>
                    </div>
                    {p.value && (
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        {p.donated && <div style={{ fontSize: 10, fontWeight: 600, color: '#9C8060' }}>Valued at</div>}
                        <div style={{ fontSize: 20, fontWeight: 900, color: '#6B46F5' }}>${p.value}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── QR code + price ───────────────────────────────────────── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 36px', gap: 16 }}>

            <div style={{ fontSize: 16, fontWeight: 800, color: '#1A1209', textAlign: 'center' }}>
              Grab your square for just <span style={{ color: '#6B46F5', fontSize: 22 }}>${f.pricePerSq}</span>
            </div>

            <div style={{ background: '#F5F3EE', borderRadius: 18, padding: '20px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, border: '2px solid #E5E0D5', width: '100%', maxWidth: 300 }}>
              <div style={{ background: '#fff', borderRadius: 12, padding: 10, border: '3px solid #6B46F5' }}>
                <QRCodeSVG value={fundraiserUrl} size={180} fgColor="#1A1209" bgColor="#ffffff" level="M" />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#1A1209', marginBottom: 4 }}>Scan to choose your square!</div>
                <div style={{ fontSize: 11, color: '#6B7280', wordBreak: 'break-all' }}>{fundraiserUrl}</div>
              </div>
            </div>

            <div style={{ fontSize: 12, color: '#6B7280', textAlign: 'center' }}>
              Up to {Math.min(10, f.grid)} squares per person
            </div>
          </div>

          {/* ── Footer ────────────────────────────────────────────────── */}
          <div style={{ background: '#F5F3EE', borderTop: '1.5px solid #E5E0D5', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <QRCodeSVG value={HOME_URL} size={36} fgColor="#6B46F5" bgColor="#F5F3EE" level="M" />
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
