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

export default function PosterPage({ params }) {
  const { id }        = use(params);
  const [f,  setF]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin]   = useState('https://luckysquares.com.au');

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

  const prizeEmojis = ['🥇', '🥈', '🥉', '🎖️', '🎖️'];

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; background: #E8E4DC; }
        @media print {
          body { background: #fff; }
          .no-print { display: none !important; }
          .poster-wrap { padding: 0 !important; }
          @page { size: A4 portrait; margin: 0; }
        }
      `}</style>

      {/* Print control bar */}
      <div className="no-print" style={{ background: '#0F0B2A', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: 'sans-serif', fontSize: 14, color: 'rgba(255,255,255,.7)' }}>
          <strong style={{ color: '#fff' }}>Poster preview</strong> — click Print to save as PDF or send to a printer
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => window.history.back()}
            style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', color: '#fff', padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'sans-serif' }}
          >
            ← Back
          </button>
          <button
            onClick={() => window.print()}
            style={{ background: '#F5C842', border: 'none', color: '#1A1209', padding: '9px 22px', borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'sans-serif' }}
          >
            🖨 Print / Save as PDF
          </button>
        </div>
      </div>

      {/* Poster wrapper — centres the A4 on screen */}
      <div className="poster-wrap" style={{ padding: '40px 20px 60px', display: 'flex', justifyContent: 'center' }}>

        {/* A4 poster */}
        <div style={{
          width: '210mm',
          minHeight: '297mm',
          background: '#fff',
          boxShadow: '0 8px 48px rgba(0,0,0,.25)',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
          overflow: 'hidden',
          position: 'relative',
        }}>

          {/* ── Header band ─────────────────────────────────────────────── */}
          <div style={{ background: '#0F2E1A', padding: '28px 36px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 40, lineHeight: 1, flexShrink: 0 }}>🍀</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#5EBF8A', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 2 }}>Lucky Squares Fundraiser</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', letterSpacing: '1px', textTransform: 'uppercase' }}>Powered by LuckySquares Australia</div>
            </div>
          </div>

          {/* ── Campaign title block ─────────────────────────────────────── */}
          <div style={{ background: '#F9F7F2', padding: '32px 36px 28px', borderBottom: '3px solid #F0D878' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9A6800', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 10 }}>Organised by</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#1A1209', marginBottom: 6, lineHeight: 1.2 }}>{f.org}</div>
            <div style={{ fontSize: 34, fontWeight: 900, color: '#0F2E1A', lineHeight: 1.15 }}>{f.title}</div>
          </div>

          {/* ── Main body ───────────────────────────────────────────────── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '32px 36px' }}>

            {/* QR code section */}
            <div style={{ display: 'flex', gap: 36, alignItems: 'flex-start', marginBottom: 36 }}>
              <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div style={{ background: '#fff', border: '3px solid #0F2E1A', borderRadius: 16, padding: 14, display: 'inline-block' }}>
                  <QRCodeSVG value={fundraiserUrl} size={180} fgColor="#0F2E1A" bgColor="#ffffff" level="M" />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0F2E1A' }}>Scan to choose your square</div>
                  <div style={{ fontSize: 11, color: '#6B7280', marginTop: 3 }}>or visit the link below</div>
                </div>
              </div>

              <div style={{ flex: 1 }}>
                {/* Price callout */}
                <div style={{ background: '#0F2E1A', borderRadius: 14, padding: '20px 24px', marginBottom: 20, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#5EBF8A', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 6 }}>Entry price</div>
                  <div style={{ fontSize: 44, fontWeight: 900, color: '#F5C842', lineHeight: 1 }}>${f.pricePerSq}</div>
                  <div style={{ fontSize: 14, color: 'rgba(255,255,255,.7)', marginTop: 4 }}>per square</div>
                </div>

                {/* Grid size */}
                <div style={{ background: '#F0FBF4', border: '1.5px solid #A8DFBF', borderRadius: 10, padding: '12px 18px', textAlign: 'center' }}>
                  <div style={{ fontSize: 13, color: '#1A7A55', fontWeight: 700 }}>{f.grid}-square grid</div>
                  <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Maximum {Math.min(10, f.grid)} squares per person</div>
                </div>
              </div>
            </div>

            {/* Prizes */}
            {f.prizes.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#9A6800', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 14 }}>🏆 Prizes up for grabs</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {f.prizes.map((p, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, background: i === 0 ? '#FFFBEC' : '#FAFAF8', border: `1.5px solid ${i === 0 ? '#F0D878' : '#E5E0D5'}`, borderRadius: 10, padding: '12px 18px' }}>
                      <span style={{ fontSize: 24, flexShrink: 0 }}>{prizeEmojis[i] ?? '🎖️'}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: i === 0 ? '#9A6800' : '#6B7280', textTransform: 'uppercase', letterSpacing: '1px' }}>{p.place} Prize</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#1A1209' }}>{p.description}</div>
                      </div>
                      {p.value && !p.donated && (
                        <div style={{ fontSize: 18, fontWeight: 900, color: '#1A7A55', flexShrink: 0 }}>${p.value}</div>
                      )}
                      {p.donated && (
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#1A7A55', background: '#F0FBF4', border: '1px solid #A8DFBF', borderRadius: 6, padding: '3px 8px', flexShrink: 0 }}>Donated</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {f.description && (
              <div style={{ background: 'rgba(107,70,245,.04)', border: '1.5px solid rgba(107,70,245,.2)', borderRadius: 12, padding: '16px 20px', marginBottom: 28 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 8 }}>About this fundraiser</div>
                <p style={{ fontSize: 13, color: '#4A3728', lineHeight: 1.7, margin: 0 }}>{f.description}</p>
              </div>
            )}

            {/* URL */}
            <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid #E5E0D5', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#9C8060', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Direct link</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0F2E1A', wordBreak: 'break-all' }}>{fundraiserUrl}</div>
            </div>
          </div>

          {/* ── Footer band ─────────────────────────────────────────────── */}
          <div style={{ background: '#F5F3EE', borderTop: '1.5px solid #E5E0D5', padding: '16px 36px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <QRCodeSVG value={HOME_URL} size={44} fgColor="#0F2E1A" bgColor="#F5F3EE" level="M" />
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#0F2E1A' }}>Powered by LuckySquares Australia</div>
                <div style={{ fontSize: 10, color: '#9C8060' }}>luckysquares.com.au — run your own fundraiser in minutes</div>
              </div>
            </div>
            <span style={{ fontSize: 28 }}>🍀</span>
          </div>

        </div>
      </div>
    </>
  );
}
