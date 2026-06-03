'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import MarketingNav from '@/components/marketing/MarketingNav';
import { getSupabaseClient, supabaseConfigured } from '@/lib/supabase/client';

function parsePrizeValue(val) {
  if (!val) return 0;
  const n = parseFloat(String(val).replace(/[^0-9.]/g, ''));
  return isNaN(n) ? 0 : n;
}

const SAMPLE_CAMPAIGNS = [
  {
    id: 'demo-1',
    title: 'School Camp Fund 🎒',
    org: 'Sunbury Primary P&C',
    contactName: 'Mel T.',
    description: 'Helping Year 5 and 6 students attend the annual outdoor education camp. Every square sold brings us closer to a fully-funded trip for every kid.',
    pricePerSq: 10,
    grid: 50,
    available: 23,
    prizes: [
      { place: '1st', description: '$200 Coles gift card', value: '$200', donated: false },
      { place: '2nd', description: 'Family movie night pack', value: '$80', donated: true },
      { place: '3rd', description: '$30 coffee voucher', value: '$30', donated: false },
    ],
    totalPrizeValue: 230,
  },
  {
    id: 'demo-2',
    title: 'Finals Trip Fund 🏉',
    org: "L\'Aces Masters Baseball ⚾",
    contactName: 'Dave K.',
    description: 'Our under-16s have made the state finals and we need to cover travel, accommodation, and uniforms. Help us get these kids there.',
    pricePerSq: 20,
    grid: 25,
    available: 9,
    prizes: [
      { place: '1st', description: '$500 cash', value: '$500', donated: false },
      { place: '2nd', description: 'Club merchandise pack', value: '$75', donated: true },
    ],
    totalPrizeValue: 500,
  },
];

export default function FeelingLuckyPage() {
  const [campaigns,       setCampaigns]       = useState([]);
  const [selected,        setSelected]        = useState(null);
  const [spinning,        setSpinning]        = useState(false);
  const [hasSpun,         setHasSpun]         = useState(false);
  const [loadError,       setLoadError]       = useState(false);
  const [noRealCampaigns, setNoRealCampaigns] = useState(false);

  useEffect(() => {
    if (!supabaseConfigured) { setCampaigns(SAMPLE_CAMPAIGNS); return; }
    const supabase = getSupabaseClient();
    (async () => {
      const { data: rows, error } = await supabase
        .from('fundraisers')
        .select('id, slug, title, org, contact_name, description, price_per_sq, grid_size, emoji')
        .eq('status', 'active')
        .eq('payment_method', 'stripe');

      if (error || !rows?.length) { setNoRealCampaigns(true); setCampaigns(SAMPLE_CAMPAIGNS); return; }

      const ids = rows.map((r) => r.id);
      const [{ data: stats }, { data: prizes }] = await Promise.all([
        supabase.from('fundraiser_stats').select('fundraiser_id, sold_count').in('fundraiser_id', ids),
        supabase.from('prizes').select('*').in('fundraiser_id', ids).order('sort_order'),
      ]);

      const statsMap  = Object.fromEntries((stats  || []).map((s) => [s.fundraiser_id, s.sold_count]));
      const prizesMap = (prizes || []).reduce((acc, p) => {
        if (!acc[p.fundraiser_id]) acc[p.fundraiser_id] = [];
        acc[p.fundraiser_id].push(p);
        return acc;
      }, {});

      setCampaigns(rows.map((r) => {
        const sold      = Number(statsMap[r.id] ?? 0);
        const ps        = (prizesMap[r.id] || []).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        const totalPrizeValue = ps.reduce((sum, p) => p.donated ? sum : sum + parsePrizeValue(p.value), 0);
        return {
          id:           r.id,
          slug:         r.slug,
          title:        r.title,
          org:          r.org,
          contactName:  r.contact_name || '',
          description:  r.description || '',
          pricePerSq:   parseFloat(r.price_per_sq),
          grid:         r.grid_size,
          available:    r.grid_size - sold,
          prizes:       ps.map((p) => ({ place: p.place, description: p.description, value: p.value, donated: p.donated ?? false })),
          totalPrizeValue,
        };
      }));
    })();
  }, []);

  const randomise = useCallback(() => {
    if (spinning) return;
    setSpinning(true);
    setHasSpun(true);
    setTimeout(() => {
      if (!campaigns.length) { setSpinning(false); return; }
      const pool = campaigns.filter((c) => c.id !== selected?.id);
      const pick = pool.length ? pool[Math.floor(Math.random() * pool.length)] : campaigns[Math.floor(Math.random() * campaigns.length)];
      setSelected(pick);
      setSpinning(false);
    }, 700);
  }, [campaigns, selected, spinning, noRealCampaigns]);

  const isDemo = !supabaseConfigured || loadError || noRealCampaigns;

  return (
    <>
      <MarketingNav />

      {/* Hero */}
      <section className="section section-hero-bg" style={{ paddingTop: 80, paddingBottom: 48, textAlign: 'center' }}>
        <div className="section-inner" style={{ maxWidth: 680 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🎲</div>
          <div className="section-label">Feeling Lucky</div>
          <h1 className="section-heading" style={{ margin: '0 auto 20px' }}>
            Support a grassroots cause today
          </h1>
          <p className="section-body" style={{ margin: '0 auto 36px', textAlign: 'center' }}>
            Feeling generous but not sure who to support? Love a game of chance? Hit the button below and
            we&apos;ll randomly pick a live fundraiser for you to back. Every square you buy goes directly
            to a real Australian school, club, or charity.
          </p>

          <button
            className="btn btn-gold btn-xl"
            onClick={randomise}
            disabled={spinning || (!campaigns.length && !noRealCampaigns)}
            style={{ gap: 10, fontSize: 18 }}
          >
            <span style={{ display: 'inline-block', animation: spinning ? 'spin 0.5s linear infinite' : 'none' }}>
              🎲
            </span>
            {spinning ? 'Finding a fundraiser…' : hasSpun ? 'Try another one' : 'Find me a fundraiser'}
          </button>

          {campaigns.length > 0 && !hasSpun && (
            <p style={{ marginTop: 16, fontSize: 13, color: 'var(--text2)', fontWeight: 600 }}>
              {isDemo ? 'Demo mode' : `${campaigns.length} campaign${campaigns.length !== 1 ? 's' : ''} currently live`}
            </p>
          )}
        </div>
      </section>

      {/* Selected campaign card */}
      {(selected || spinning) && (
        <section className="section section-solid-bg" style={{ paddingTop: 0, paddingBottom: 64 }}>
          <div className="section-inner" style={{ maxWidth: 680 }}>

            {spinning ? (
              <div className="scratch-card" style={{ padding: '56px 36px', textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 16, animation: 'spin 0.6s linear infinite' }}>🎲</div>
                <p style={{ color: 'var(--text2)', fontWeight: 600, fontSize: 15 }}>Shuffling campaigns…</p>
              </div>
            ) : selected ? (
              <>
                <div className="scratch-card" style={{ padding: '36px 40px' }}>

                  {/* Header */}
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                      Your randomly selected fundraiser
                    </div>
                    <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 900, color: 'var(--text)', margin: '0 0 4px' }}>
                      {selected.title}
                    </h2>
                    <div style={{ fontSize: 15, color: 'var(--text2)', fontWeight: 600 }}>
                      {selected.org}
                      {selected.contactName && (
                        <span style={{ fontWeight: 400 }}>, organised by {selected.contactName}</span>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                      What they&apos;re raising for
                    </div>
                    <p style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.7, margin: 0 }}>
                      {selected.description || 'This organisation is raising funds for their community.'}
                    </p>
                  </div>

                  {/* Prizes */}
                  {selected.prizes?.length > 0 && (
                    <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                        Prizes
                        {selected.totalPrizeValue > 0 && (
                          <span style={{ marginLeft: 8, background: 'var(--gold)', color: '#6B4F00', borderRadius: 10, padding: '2px 10px', fontSize: 11, fontWeight: 800, letterSpacing: 0 }}>
                            ${selected.totalPrizeValue.toLocaleString()} prize pool
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {selected.prizes.map((p) => (
                          <div key={p.place} style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--green)', minWidth: 32 }}>{p.place}</span>
                            <span style={{ fontSize: 14, color: 'var(--text)', fontWeight: 600 }}>{p.description}</span>
                            {p.value && !p.donated && (
                              <span style={{ fontSize: 13, color: 'var(--text2)', marginLeft: 'auto', flexShrink: 0 }}>{p.value}</span>
                            )}
                            {p.donated && (
                              <span style={{ fontSize: 11, color: 'var(--text2)', marginLeft: 'auto', flexShrink: 0, fontStyle: 'italic' }}>donated</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick stats */}
                  <div style={{ display: 'flex', gap: 24, marginBottom: 28, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 1 }}>Price per square</div>
                      <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)', fontFamily: 'var(--font-serif)' }}>
                        ${selected.pricePerSq % 1 === 0 ? selected.pricePerSq : selected.pricePerSq.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 1 }}>Squares available</div>
                      <div style={{ fontSize: 20, fontWeight: 900, color: selected.available <= 10 ? 'var(--orange)' : 'var(--text)', fontFamily: 'var(--font-serif)' }}>
                        {selected.available} of {selected.grid}
                        {selected.available <= 10 && selected.available > 0 && (
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--orange)', marginLeft: 6 }}>Going fast!</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* CTA */}
                  {noRealCampaigns ? (
                    <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 14, color: 'var(--text2)', fontWeight: 600 }}>
                      This is a sample fundraiser. Check back soon for live campaigns to support.
                    </div>
                  ) : selected.available > 0 ? (
                    <Link href={`/${selected.slug ?? selected.id}`} className="btn btn-purple btn-lg" style={{ width: '100%', justifyContent: 'center' }}>
                      Support this fundraiser →
                    </Link>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 14, color: 'var(--text2)', fontWeight: 600 }}>
                      All squares sold — draw coming soon! Hit randomise to find another.
                    </div>
                  )}
                </div>

                {/* Not feeling it */}
                <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text2)' }}>
                  Not feeling it?{' '}
                  <button
                    onClick={randomise}
                    style={{ background: 'none', border: 'none', color: 'var(--green)', fontWeight: 700, fontSize: 14, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
                  >
                    click here to find another fundraiser.
                  </button>
                </p>
              </>
            ) : null}
          </div>
        </section>
      )}

      {/* No campaigns state */}
      {!spinning && !selected && hasSpun && campaigns.length === 0 && (
        <section className="section section-solid-bg" style={{ paddingTop: 0, paddingBottom: 64 }}>
          <div className="section-inner" style={{ maxWidth: 560, textAlign: 'center' }}>
            <div className="scratch-card" style={{ padding: '48px 36px' }}>
              {noRealCampaigns ? (
                <>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🎲</div>
                  <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 900, marginBottom: 12 }}>Oops... nothing to show yet!</h2>
                  <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
                    We&apos;re in early release and there are no fundraisers live just yet. Check back soon, or be one of the first to start your own.
                  </p>
                  <Link href="/fundraise?register=1" className="btn btn-gold">Start a fundraiser free →</Link>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🍀</div>
                  <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 900, marginBottom: 12 }}>No live campaigns right now</h2>
                  <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
                    Check back soon. New fundraisers go live all the time. Or if your group is ready to raise some funds, start your own.
                  </p>
                  <Link href="/fundraise?register=1" className="btn btn-gold">Start a fundraiser free →</Link>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Bottom CTA */}
      <section className="section section-hero-bg" style={{ textAlign: 'center' }}>
        <div className="section-inner" style={{ maxWidth: 560 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🏫</div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(22px,3vw,32px)', fontWeight: 900, color: 'var(--text)', marginBottom: 12 }}>
            Running your own fundraiser?
          </h2>
          <p style={{ fontSize: 16, color: 'var(--text2)', marginBottom: 28, maxWidth: 420, margin: '0 auto 28px' }}>
            Set up your Lucky Squares campaign in minutes. Share a link, sell squares, run a live draw. Free to try.
          </p>
          <Link href="/fundraise?register=1" className="btn btn-purple btn-lg">
            Create your fundraiser free →
          </Link>
        </div>
      </section>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
