'use client';

import { useState, useEffect, useRef } from 'react';
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

const NAV_LINKS = [
  { href: '/',              label: 'Home' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/pricing',      label: 'Pricing' },
  { href: '/blog',         label: 'Blog' },
  { href: '/contact',      label: 'Contact' },
];

function HamburgerMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ background: 'none', border: '1.5px solid var(--border)', borderRadius: 8, width: 40, height: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer', padding: 0 }}
        aria-label="Menu"
      >
        {[0, 1, 2].map((i) => (
          <span key={i} style={{ display: 'block', width: 18, height: 2, background: 'var(--text)', borderRadius: 2, transition: 'opacity .15s', opacity: open && i === 1 ? 0 : 1 }} />
        ))}
      </button>

      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,.12)', minWidth: 200, zIndex: 200, overflow: 'hidden' }}>
          {NAV_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} onClick={() => setOpen(false)}
              style={{ display: 'block', padding: '12px 20px', fontSize: 14, fontWeight: 600, color: 'var(--text)', textDecoration: 'none', borderBottom: '1px solid var(--border)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {label}
            </Link>
          ))}
          <div style={{ padding: '12px 16px' }}>
            <Link href="/fundraise?register=1" className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setOpen(false)}>
              Start for free →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
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
      supabase.from('fundraisers').select('*, profiles!owner_id(is_founding_member)').eq('id', id).in('status', ['active', 'drawn']).single(),
      supabase.from('prizes').select('*').eq('fundraiser_id', id).order('sort_order'),
    ]).then(([{ data, error }, { data: prizes }]) => {
      if (error || !data) { setNotFound(true); } else {
        setFundraiser({ ...dbToFundraiser(data, prizes || []), ownerIsFoundingMember: data.profiles?.is_founding_member ?? false });
      }
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
        <Link href="/" style={{ textDecoration: 'none' }}>
          <Logo size={88} />
        </Link>
        {/* Desktop nav */}
        <nav style={{ alignItems: 'center', gap: 4 }} className="fundraiser-desktop-nav">
          {NAV_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} style={{ padding: '6px 12px', fontSize: 14, fontWeight: 600, color: 'var(--text2)', textDecoration: 'none', borderRadius: 8 }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text2)'}
            >{label}</Link>
          ))}
          <Link href="/fundraise?register=1" className="btn btn-primary btn-sm" style={{ marginLeft: 8 }}>Start for free →</Link>
        </nav>
        {/* Mobile hamburger */}
        <div className="fundraiser-mobile-nav">
          <HamburgerMenu />
        </div>
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
