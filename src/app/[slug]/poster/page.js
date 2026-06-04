import { getAnonClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import PosterPrintButton from './PosterPrintButton';

export const dynamic = 'force-dynamic';

const UUID_RE  = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SITE_URL = 'https://luckysquares.com.au';

const PLACE_LABELS = ['1st', '2nd', '3rd', '4th', '5th'];
const PLACE_EMOJIS = ['🥇', '🥈', '🥉', '🎖️', '🎖️'];

export default async function PosterPage({ params }) {
  const { slug } = await params;
  const supabase  = getAnonClient();
  const col       = UUID_RE.test(slug) ? 'id' : 'slug';

  const { data, error } = await supabase
    .from('fundraisers')
    .select('id, slug, title, org, grid_size, price_per_sq, image_url, image_focal_y')
    .eq(col, slug)
    .in('status', ['active', 'drawn'])
    .single();

  if (error || !data) notFound();

  const { data: prizeRows } = await supabase
    .from('prizes')
    .select('place, description, value, donated, sort_order')
    .eq('fundraiser_id', data.id)
    .order('sort_order');

  const prizes = (prizeRows || [])
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .filter((p) => p.description);

  const campaignUrl = `${SITE_URL}/${data.slug ?? data.id}`;
  const orgSlug     = (data.org || 'lucky-squares')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  const footerQrUrl = `${SITE_URL}?utm_source=poster&utm_medium=print&utm_campaign=${orgSlug}&utm_content=${data.slug ?? data.id}`;
  const focalY      = data.image_focal_y ?? 50;

  // QR codes via qrserver.com (reliable free API, no client JS needed)
  const mainQr   = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(campaignUrl)}&color=1A1209&bgcolor=ffffff&margin=2`;
  const footerQr = `https://api.qrserver.com/v1/create-qr-code/?size=56x56&data=${encodeURIComponent(footerQrUrl)}&color=1A0A3C&bgcolor=ffffff&margin=1`;

  const css = `
    *{box-sizing:border-box}
    body{margin:0;padding:0;background:#D6D0C4}
    @page{size:A4 portrait;margin:0}
    @media print{
      *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}
      body>*{display:none!important}
      body>.poster-page{display:block!important}
      html,body{height:297mm!important;overflow:hidden!important;margin:0!important;padding:0!important;background:#fff!important}
      .no-print{display:none!important}
      .poster-page{padding:0!important;margin:0!important;background:#fff!important;overflow:hidden!important;height:297mm!important}
      .poster-sheet{box-shadow:none!important;overflow:hidden!important}
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <PosterPrintButton />

      {/* Screen wrapper */}
      <div className="poster-page" style={{ padding: '40px 20px 60px', display: 'flex', justifyContent: 'center', background: '#D6D0C4' }}>

        {/* A4 poster sheet */}
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

          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg,#A78BFA 0%,#7C3AED 45%,#4A28D4 100%)', padding: '14px 28px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <svg width="44" height="44" viewBox="0 0 46 46" xmlns="http://www.w3.org/2000/svg">
              <rect width="46" height="46" rx="11" fill="#6B46F5"/>
              <rect x="5"  y="5"  width="8" height="8" rx="2" fill="rgba(255,255,255,.22)"/>
              <rect x="15" y="5"  width="8" height="8" rx="2" fill="rgba(255,255,255,.22)"/>
              <rect x="25" y="5"  width="8" height="8" rx="2" fill="rgba(255,255,255,.22)"/>
              <rect x="35" y="5"  width="6" height="8" rx="2" fill="rgba(255,255,255,.22)"/>
              <rect x="5"  y="15" width="8" height="8" rx="2" fill="rgba(255,255,255,.22)"/>
              <rect x="15" y="15" width="8" height="8" rx="2" fill="#F5C820"/>
              <rect x="25" y="15" width="8" height="8" rx="2" fill="rgba(255,255,255,.22)"/>
              <rect x="35" y="15" width="6" height="8" rx="2" fill="rgba(255,255,255,.22)"/>
              <rect x="5"  y="25" width="8" height="8" rx="2" fill="rgba(255,255,255,.22)"/>
              <rect x="15" y="25" width="8" height="8" rx="2" fill="rgba(255,255,255,.22)"/>
              <rect x="25" y="25" width="8" height="8" rx="2" fill="rgba(255,255,255,.22)"/>
              <rect x="35" y="25" width="6" height="8" rx="2" fill="rgba(255,255,255,.22)"/>
              <rect x="5"  y="35" width="8" height="6" rx="2" fill="rgba(255,255,255,.22)"/>
              <rect x="15" y="35" width="8" height="6" rx="2" fill="rgba(255,255,255,.22)"/>
              <rect x="25" y="35" width="8" height="6" rx="2" fill="rgba(255,255,255,.22)"/>
              <rect x="35" y="35" width="6" height="6" rx="2" fill="rgba(255,255,255,.22)"/>
            </svg>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-0.3px', lineHeight: 1.1 }}>
                Lucky <span style={{ fontWeight: 400, fontStyle: 'italic' }}>Squares</span>
              </div>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.6)', letterSpacing: '2px', textTransform: 'uppercase', marginTop: 1 }}>Australia</div>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.8)' }}>{data.org}</div>
          </div>

          {/* Campaign title */}
          <div style={{ background: '#FFFBEC', borderBottom: '4px solid #F5C842', padding: '14px 28px', textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#1A1209', lineHeight: 1.2 }}>{data.title}</div>
          </div>

          {/* Campaign image */}
          {data.image_url && (
            <div style={{ flexShrink: 0, height: '200px', overflow: 'hidden' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={data.image_url}
                alt={data.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `center ${focalY}%`, display: 'block' }}
              />
            </div>
          )}

          {/* Two-column body */}
          <div style={{ display: 'flex', flex: 1 }}>

            {/* Left: prizes */}
            <div style={{ flex: 1, padding: '20px 20px 20px 28px', borderRight: '2px dashed #E5E0D5', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#6B46F5', marginBottom: 14 }}>You could win...</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {prizes.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: i === 0 ? '#FFFBEC' : '#FAFAF8', border: `1.5px solid ${i === 0 ? '#F5C842' : '#E5E0D5'}`, borderRadius: 10, padding: '9px 12px' }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{PLACE_EMOJIS[i] ?? '🎖️'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: i === 0 ? '#9A6800' : '#9C8060', marginBottom: 1 }}>{PLACE_LABELS[i] ?? `${i+1}th`} Prize</div>
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
              <div style={{ fontSize: 13, fontWeight: 800, color: '#1A1209', textAlign: 'center' }}>Grab your square for just</div>
              <div style={{ fontSize: 34, fontWeight: 900, color: '#6B46F5', lineHeight: 1, marginTop: -6 }}>${parseFloat(data.price_per_sq)}</div>
              <div style={{ background: '#fff', borderRadius: 12, padding: 10, border: '3px solid #6B46F5' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mainQr} alt="QR code" width="160" height="160" />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: '#1A1209', marginBottom: 4 }}>Scan to choose your square!</div>
                <div style={{ fontSize: 9, color: '#6B7280', wordBreak: 'break-all' }}>{campaignUrl}</div>
                <div style={{ fontSize: 10, color: '#9C8060', marginTop: 6 }}>Up to {Math.min(10, data.grid_size)} squares per person</div>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div style={{ background: '#1A0A3C', borderTop: '3px solid #6B46F5', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="36" height="36" viewBox="0 0 46 46" xmlns="http://www.w3.org/2000/svg">
                <rect width="46" height="46" rx="11" fill="#7C5CF6"/>
                <rect x="5"  y="5"  width="8" height="8" rx="2" fill="rgba(255,255,255,.25)"/>
                <rect x="15" y="5"  width="8" height="8" rx="2" fill="rgba(255,255,255,.25)"/>
                <rect x="25" y="5"  width="8" height="8" rx="2" fill="rgba(255,255,255,.25)"/>
                <rect x="35" y="5"  width="6" height="8" rx="2" fill="rgba(255,255,255,.25)"/>
                <rect x="5"  y="15" width="8" height="8" rx="2" fill="rgba(255,255,255,.25)"/>
                <rect x="15" y="15" width="8" height="8" rx="2" fill="#F5C820"/>
                <rect x="25" y="15" width="8" height="8" rx="2" fill="rgba(255,255,255,.25)"/>
                <rect x="35" y="15" width="6" height="8" rx="2" fill="rgba(255,255,255,.25)"/>
                <rect x="5"  y="25" width="8" height="8" rx="2" fill="rgba(255,255,255,.25)"/>
                <rect x="15" y="25" width="8" height="8" rx="2" fill="rgba(255,255,255,.25)"/>
                <rect x="25" y="25" width="8" height="8" rx="2" fill="rgba(255,255,255,.25)"/>
                <rect x="35" y="25" width="6" height="8" rx="2" fill="rgba(255,255,255,.25)"/>
                <rect x="5"  y="35" width="8" height="6" rx="2" fill="rgba(255,255,255,.25)"/>
                <rect x="15" y="35" width="8" height="6" rx="2" fill="rgba(255,255,255,.25)"/>
                <rect x="25" y="35" width="8" height="6" rx="2" fill="rgba(255,255,255,.25)"/>
                <rect x="35" y="35" width="6" height="6" rx="2" fill="rgba(255,255,255,.25)"/>
              </svg>
              <div>
                <div style={{ fontSize: 11, fontWeight: 900, color: '#fff' }}>Lucky Squares Australia</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>luckysquares.com.au — run your own fundraiser free</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.5)' }}>Scan to start your own</div>
              </div>
              <div style={{ background: '#fff', borderRadius: 8, padding: 4 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={footerQr} alt="Lucky Squares QR" width="56" height="56" />
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
