'use client';

import { useState, useEffect } from 'react';
import { use } from 'react';
import Link from 'next/link';
import Logo from '@/components/ui/Logo';
import LiveGrid from '@/components/app/LiveGrid';
import { getSupabaseClient, supabaseConfigured } from '@/lib/supabase/client';

function dbToFundraiser(row, prizes = []) {
  return {
    id:              row.id,
    title:           row.title,
    org:             row.org,
    description:     row.description || '',
    thankYou:        row.thank_you || '',
    contactName:     row.contact_name || '',
    grid:            row.grid_size,
    pricePerSq:      parseFloat(row.price_per_sq),
    sold:            0,
    status:          row.status,
    emoji:           row.emoji || '🍀',
    drawType:        row.draw_type || 'manual',
    drawDate:        row.draw_date || null,
    winnerSquareNum:  row.winner_square_num ?? null,
    winnerSquareNums: Array.isArray(row.winner_square_nums) ? row.winner_square_nums : (row.winner_square_num != null ? [row.winner_square_num] : []),
    imageUrl:        row.image_url || null,
    state:           row.state || 'SA',
    prizes:          prizes
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((p) => ({ place: p.place, description: p.description, value: p.value, donated: p.donated ?? false })),
    payment: {
      method:      row.payment_method,
      accountName: row.bank_account_name,
      bsb:         row.bank_bsb,
      account:     row.bank_account,
    },
  };
}

export default function PublicFundraiserPage({ params }) {
  const { id } = use(params);
  const [fundraiser, setFundraiser] = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [notFound,   setNotFound]   = useState(false);

  useEffect(() => {
    if (!supabaseConfigured) { setNotFound(true); setLoading(false); return; }
    const supabase = getSupabaseClient();
    Promise.all([
      supabase.from('fundraisers').select('*').eq('id', id).in('status', ['active', 'drawn']).single(),
      supabase.from('prizes').select('*').eq('fundraiser_id', id).order('sort_order'),
    ]).then(([{ data, error }, { data: prizes }]) => {
      if (error || !data) { setNotFound(true); } else { setFundraiser(dbToFundraiser(data, prizes || [])); }
      setLoading(false);
    });
  }, [id]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)' }}>
      <div style={{ textAlign: 'center' }}>
        <Logo size={72} />
        <div style={{ marginTop: 20, fontSize: 14, color: 'var(--text2)', fontWeight: 600 }}>Loading…</div>
      </div>
    </div>
  );

  if (notFound) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🍀</div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 900, marginBottom: 12 }}>Fundraiser not found</h1>
        <p style={{ color: 'var(--text2)', marginBottom: 32 }}>This fundraiser may have closed or the link may be incorrect.</p>
        <Link href="/" className="btn btn-primary">Back to LuckySquares</Link>
      </div>
    </div>
  );

  return (
    <>
      <div className="rainbow-strip" />
      <header style={{ background: 'var(--card)', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 12px rgba(61,46,26,.07)', position: 'sticky', top: 0, zIndex: 100 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <Logo size={40} />
          <div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 900, color: 'var(--text)', letterSpacing: '-.5px' }}>LuckySquares</div>
            <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>Australia</div>
          </div>
        </Link>
        <Link href="/" className="btn btn-outline btn-sm">Run your own Lucky Squares Fundraiser →</Link>
      </header>

      {fundraiser.imageUrl && (
        <div style={{ width: '100%', maxHeight: 320, overflow: 'hidden', lineHeight: 0 }}>
          <img
            src={fundraiser.imageUrl}
            alt={fundraiser.title}
            style={{ width: '100%', maxHeight: 320, objectFit: 'cover', objectPosition: 'center' }}
          />
        </div>
      )}
      <LiveGrid fundraiser={fundraiser} user={null} onBack={null} />
    </>
  );
}
