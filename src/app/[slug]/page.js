'use client';

import { useState, useEffect, useRef } from 'react';
import { use } from 'react';
import Link from 'next/link';
import Logo from '@/components/ui/Logo';
import LiveGrid from '@/components/app/LiveGrid';
import ClubGrid from '@/components/app/ClubGrid';
import { getSupabaseClient, supabaseConfigured } from '@/lib/supabase/client';

function dbToFundraiser(row, prizes = []) {
  return {
    id:              row.id,
    slug:            row.slug,
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
    imageFocalY:     row.image_focal_y ?? 50,
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

// Club Mode is only available for non-Stripe payment methods
const CLUB_MODE_PAYMENT_METHODS = ['inperson', 'bank', 'bank_inperson'];

export default function PublicFundraiserPage({ params }) {
  const { slug } = use(params);
  const [fundraiser,   setFundraiser]   = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [notFound,     setNotFound]     = useState(false);
  const [isOrganiser,  setIsOrganiser]  = useState(false);
  const [clubMode,     setClubMode]     = useState(false);

  // Initialise Club Mode from localStorage after mount
  useEffect(() => {
    try { setClubMode(localStorage.getItem(`ls_clubmode_${slug}`) === '1'); } catch {}
  }, [slug]);

  const toggleClubMode = () => {
    setClubMode((prev) => {
      const next = !prev;
      try { localStorage.setItem(`ls_clubmode_${slug}`, next ? '1' : '0'); } catch {}
      return next;
    });
  };

  useEffect(() => {
    if (!supabaseConfigured) { setNotFound(true); setLoading(false); return; }
    const supabase = getSupabaseClient();
    // Resolve by UUID (existing campaigns) or slug (new human-readable URLs)
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const col = UUID_RE.test(slug) ? 'id' : 'slug';
    Promise.all([
      supabase.from('fundraisers').select('*, profiles!owner_id(is_founding_member, is_beta_tester)').eq(col, slug).in('status', ['active', 'drawn']).single(),
      supabase.auth.getUser(),
    ]).then(([{ data, error }, { data: { user } }]) => {
      if (error || !data) { setNotFound(true); setLoading(false); return; }
      // Fetch prizes using the resolved UUID (data.id), not the slug param
      supabase.from('prizes').select('*').eq('fundraiser_id', data.id).order('sort_order')
        .then(({ data: prizes }) => {
          setFundraiser({
            ...dbToFundraiser(data, prizes || []),
            ownerIsFoundingMember: data.profiles?.is_founding_member ?? false,
            ownerIsBetaTester:     data.profiles?.is_beta_tester     ?? false,
            ownerId: data.owner_id,
          });
          if (user?.id && data.owner_id && user.id === data.owner_id) {
            setIsOrganiser(true);
          }
          setLoading(false);
          // Tell the Mariposa widget which campaign is loaded (more reliable than URL parsing)
          window.dispatchEvent(new CustomEvent('ls:campaign-loaded', { detail: { id: data.id } }));
        });
    });
  }, [slug]);

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
        <Link href="/" className="btn btn-primary">Back to Lucky Squares</Link>
      </div>
    </div>
  );

  // ── Club Mode — full-screen stripped view for in-person selling ──────────────
  const clubModeAvailable = isOrganiser && CLUB_MODE_PAYMENT_METHODS.includes(fundraiser.payment?.method);

  if (clubMode && clubModeAvailable) {
    return <ClubGrid fundraiser={fundraiser} onToggle={toggleClubMode} />;
  }

  // ── Normal campaign view ────────────────────────────────────────────────────
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
        {/* Club Mode toggle — only shown to the logged-in organiser of this campaign */}
        {clubModeAvailable && (
          <button
            onClick={toggleClubMode}
            style={{ background: 'var(--purple)', color: '#fff', border: 'none', borderRadius: 20, padding: '7px 14px', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', flexShrink: 0 }}
            title="Switch to Club Mode for in-person square selling"
          >
            🏟️ Club Mode
          </button>
        )}
        {/* Mobile hamburger */}
        <div className="fundraiser-mobile-nav">
          <HamburgerMenu />
        </div>
      </header>

      <LiveGrid fundraiser={fundraiser} user={null} onBack={isOrganiser ? () => { window.location.href = '/fundraise'; } : null} />
      <ReportCampaign fundraiserId={fundraiser.id} />
    </>
  );
}

function ReportCampaign({ fundraiserId }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [status, setStatus] = useState('idle');

  const REASONS = [
    { value: 'inappropriate_content',  label: 'Inappropriate content' },
    { value: 'suspicious_activity',    label: 'Suspicious or fraudulent activity' },
    { value: 'misleading_information', label: 'Misleading prize or campaign information' },
    { value: 'spam',                   label: 'Spam' },
    { value: 'other',                  label: 'Other' },
  ];

  const handleSubmit = async () => {
    if (!reason) return;
    setStatus('submitting');
    const res = await fetch('/api/campaigns/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fundraiser_id: fundraiserId, reason, details: details.trim() }),
    });
    setStatus(res.ok ? 'done' : 'error');
  };

  if (!open) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 24px 40px' }}>
        <button
          onClick={() => setOpen(true)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text3)', textDecoration: 'underline' }}
        >
          Something not right? Report this campaign
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 24px 48px' }}>
      <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 16, padding: '24px 28px' }}>
        {status === 'done' ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
            <p style={{ fontSize: 14, color: 'var(--text2)', margin: 0 }}>Thanks for letting us know. Our team will review this campaign.</p>
          </div>
        ) : (
          <>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>Report this campaign</h3>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>Help us keep the platform safe. All reports are reviewed by our team.</p>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: .5, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>Reason</label>
              <select className="form-input" value={reason} onChange={(e) => setReason(e.target.value)}>
                <option value="">Select a reason…</option>
                {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: .5, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>Additional details <span style={{ fontWeight: 400 }}>(optional)</span></label>
              <textarea className="form-input" rows={3} placeholder="Tell us more about what you saw…" value={details} onChange={(e) => setDetails(e.target.value)} maxLength={500} style={{ resize: 'none' }} />
            </div>
            {status === 'error' && <p style={{ fontSize: 13, color: '#DC2626', marginBottom: 12 }}>Something went wrong. Please try again.</p>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn btn-purple" style={{ flex: 1, justifyContent: 'center', opacity: (!reason || status === 'submitting') ? 0.6 : 1 }} disabled={!reason || status === 'submitting'} onClick={handleSubmit}>
                {status === 'submitting' ? 'Sending…' : 'Submit report'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
