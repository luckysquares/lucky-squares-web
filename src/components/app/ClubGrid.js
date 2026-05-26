'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getSupabaseClient, supabaseConfigured } from '@/lib/supabase/client';

const MAX_CART = 10;

const fmtTime  = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const sanitize = (str) => String(str ?? '').trim().replace(/<[^>]*>/g, '');

function localizeSquare(row, myNums) {
  const expiredAt = row.reserved_until ? new Date(row.reserved_until).getTime() : null;
  const expired   = expiredAt && Date.now() > expiredAt;
  const dbStatus  = expired ? 'available' : row.status;
  return {
    id:           row.number,
    status:       myNums.has(row.number) ? 'mine' : dbStatus === 'sold' ? 'taken' : dbStatus,
    owner:        row.buyer_name || null,
    reservedUntil: expiredAt,
  };
}

function makeEmptyGrid(size) {
  return [...Array(size)].map((_, i) => ({ id: i + 1, status: 'available', owner: null, reservedUntil: null }));
}

function abbrevName(name) {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

const COLOR_KEY = [
  ['#fff',     '#D4EFE6',       'Available'],
  ['#E8FFF6',  'var(--green)',  'In cart'  ],
  ['#FFF0E8',  'var(--orange)', 'Reserved' ],
  ['#F0EDE5',  '#DDD5C0',      'Sold'     ],
];

// ─────────────────────────────────────────────────────────────────────────────

export default function ClubGrid({ fundraiser, onToggle }) {
  const [squares,     setSquares]     = useState([]);
  const [loadingGrid, setLoadingGrid] = useState(true);
  const [cart,        setCart]        = useState([]);
  const [phase,       setPhase]       = useState('browse'); // browse | checkout | thanks
  const [buyerName,   setBuyerName]   = useState('');
  const [buyerPhone,  setBuyerPhone]  = useState('');
  const [buyerEmail,  setBuyerEmail]  = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [showQR,      setShowQR]      = useState(false);
  const [cartToast,   setCartToast]   = useState(false);
  const [tick,        setTick]        = useState(0);
  const [confirmedSquareIds, setConfirmedSquareIds] = useState([]);

  const myNumsRef = useRef(new Set());

  // ── Load grid from Supabase ─────────────────────────────────────────────────
  useEffect(() => {
    if (!supabaseConfigured) {
      setSquares(makeEmptyGrid(fundraiser.grid));
      setLoadingGrid(false);
      return;
    }
    const supabase = getSupabaseClient();
    supabase.rpc('expire_stale_reservations').then(() =>
      supabase.from('squares').select('*').eq('fundraiser_id', fundraiser.id).order('number')
        .then(({ data, error }) => {
          setSquares(error || !data?.length ? makeEmptyGrid(fundraiser.grid) : data.map((row) => localizeSquare(row, myNumsRef.current)));
          setLoadingGrid(false);
        })
    );

    const channel = supabase
      .channel(`club:${fundraiser.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'squares', filter: `fundraiser_id=eq.${fundraiser.id}` },
        (payload) => setSquares((prev) => prev.map((sq) => sq.id === payload.new.number ? localizeSquare(payload.new, myNumsRef.current) : sq)))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fundraiser.id, fundraiser.grid]);

  // ── Tick to expire stale reservations locally ───────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setSquares((prev) => prev.map((sq) =>
      sq.status === 'reserved' && sq.reservedUntil && Date.now() > sq.reservedUntil
        ? { ...sq, status: 'available', reservedUntil: null, owner: null } : sq
    ));
  }, [tick]);

  // ── Square toggle ───────────────────────────────────────────────────────────
  const toggleSquare = useCallback(async (sq) => {
    if (sq.status === 'taken' || sq.status === 'mine') return;
    if (sq.status === 'reserved') return;

    if (cart.includes(sq.id)) {
      setCart((prev) => prev.filter((id) => id !== sq.id));
      if (supabaseConfigured) await getSupabaseClient().rpc('release_square', { p_fundraiser_id: fundraiser.id, p_square_number: sq.id });
      return;
    }

    if (cart.length >= MAX_CART) {
      setCartToast(true);
      setTimeout(() => setCartToast(false), 2500);
      return;
    }

    if (supabaseConfigured) {
      const { data: reserved } = await getSupabaseClient().rpc('reserve_square', { p_fundraiser_id: fundraiser.id, p_square_number: sq.id });
      if (!reserved) return;
    }
    setCart((prev) => [...prev, sq.id]);
  }, [cart, fundraiser.id]);

  // ── Confirm sale ────────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    const name  = sanitize(buyerName);
    const phone = sanitize(buyerPhone);
    const email = sanitize(buyerEmail).toLowerCase();
    if (!name || !phone) return;

    setSubmitting(true);
    const squaresBeingBought = [...cart];

    if (supabaseConfigured) {
      await getSupabaseClient().rpc('claim_squares', {
        p_fundraiser_id: fundraiser.id,
        p_square_numbers: squaresBeingBought,
        p_buyer_name:    name,
        p_buyer_email:   email,
        p_buyer_phone:   phone,
      });
    }

    squaresBeingBought.forEach((num) => myNumsRef.current.add(num));
    setSquares((prev) => prev.map((sq) =>
      squaresBeingBought.includes(sq.id) ? { ...sq, status: 'mine', owner: name } : sq
    ));

    setConfirmedSquareIds(squaresBeingBought);
    setSubmitting(false);
    setPhase('thanks');
  };

  // ── Next buyer reset ────────────────────────────────────────────────────────
  const handleNextBuyer = () => {
    // Immediately show confirmed squares as sold (no waiting for realtime)
    myNumsRef.current = new Set();
    setSquares((prev) => prev.map((sq) =>
      sq.status === 'mine' ? { ...sq, status: 'taken' } : sq
    ));
    setCart([]);
    setBuyerName('');
    setBuyerPhone('');
    setBuyerEmail('');
    setConfirmedSquareIds([]);
    setPhase('browse');
    window.scrollTo(0, 0);
  };

  // ── Derived ─────────────────────────────────────────────────────────────────
  const subtotal   = cart.length * fundraiser.pricePerSq;
  const confirmedSubtotal = confirmedSquareIds.length * fundraiser.pricePerSq;
  const soldCount  = squares.filter((sq) => sq.status === 'taken' || sq.status === 'mine').length;
  const gridClass  = fundraiser.grid === 25 ? 'grid-25' : 'grid-100';
  const gridMax    = fundraiser.grid === 25 ? 330 : 640;
  const campaignUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/${fundraiser.slug ?? fundraiser.id}`
    : `https://luckysquares.com.au/${fundraiser.slug ?? fundraiser.id}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(campaignUrl)}&bgcolor=FAFAF7&color=2D2A26&margin=12`;

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loadingGrid) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)' }}>
      <div style={{ fontSize: 14, color: 'var(--text2)', fontWeight: 600 }}>Loading grid…</div>
    </div>
  );

  // ── THANKS PHASE ────────────────────────────────────────────────────────────
  if (phase === 'thanks') {
    const confirmedName = sanitize(buyerName) || 'Buyer';
    return (
      <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <div className="scratch-card" style={{ padding: '52px 44px', maxWidth: 480, width: '100%' }}>
          <div style={{ fontSize: 72, marginBottom: 16 }}>🎉</div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 900, color: 'var(--green)', marginBottom: 10 }}>
            You&apos;re in!
          </h2>
          <p style={{ fontSize: 16, color: 'var(--text2)', marginBottom: 28, lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--text)' }}>{confirmedName}</strong> has secured their squares. Collect payment and hit the button when ready.
          </p>

          {confirmedSquareIds.length > 0 && (
            <div style={{ background: '#F0FDF8', borderRadius: 14, padding: '18px 22px', marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: .8, color: 'var(--text2)', marginBottom: 10 }}>
                Squares secured
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 10 }}>
                {confirmedSquareIds.map((id) => (
                  <span key={id} className="num-pill">{id}</span>
                ))}
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)', fontFamily: 'var(--font-serif)' }}>
                ${confirmedSubtotal.toFixed(2)}
              </div>
            </div>
          )}

          <button
            className="btn btn-gold btn-lg"
            style={{ width: '100%', justifyContent: 'center', fontSize: 17, padding: '16px 24px' }}
            onClick={handleNextBuyer}
          >
            ✓ Payment received — next buyer →
          </button>
        </div>
      </div>
    );
  }

  // ── CHECKOUT PHASE ──────────────────────────────────────────────────────────
  if (phase === 'checkout') {
    const isValid = buyerName.trim().length > 0 && buyerPhone.trim().length > 0;
    return (
      <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
        {/* Sticky header */}
        <div style={{ background: 'var(--card)', borderBottom: '1.5px solid var(--border)', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 900, lineHeight: 1.2 }}>
              {fundraiser.emoji} {fundraiser.title}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>{fundraiser.org}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ background: 'var(--purple)', color: '#fff', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 800, letterSpacing: .5 }}>
              🏟️ CLUB MODE
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 540, margin: '0 auto', padding: '28px 24px 64px' }}>
          <button
            className="btn btn-outline btn-sm"
            style={{ marginBottom: 24 }}
            onClick={() => setPhase('browse')}
          >
            ← Back to grid
          </button>

          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 900, marginBottom: 20 }}>
            Checkout
          </h2>

          {/* Purchase summary */}
          <div className="scratch-card" style={{ padding: 24, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: .8, color: 'var(--text2)', marginBottom: 12 }}>
              Purchase summary
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {cart.map((id) => <span key={id} className="num-pill">{id}</span>)}
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 14, color: 'var(--text2)' }}>
                {cart.length} square{cart.length !== 1 ? 's' : ''} × ${fundraiser.pricePerSq}
              </span>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 900, color: 'var(--text)' }}>
                ${subtotal.toFixed(2)}
              </span>
            </div>
            <div style={{ marginTop: 10, fontSize: 13, color: 'var(--green)', fontWeight: 700 }}>
              💵 Collect cash or EFTPOS
            </div>
          </div>

          {/* Buyer details */}
          <div className="scratch-card" style={{ padding: 24, marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: .8, color: 'var(--text2)', marginBottom: 16 }}>
              Buyer details
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">
                  Full name <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  className="form-input"
                  placeholder="Buyer's full name"
                  maxLength={80}
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  autoFocus
                  style={{ fontSize: 16 }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Phone <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  className="form-input"
                  type="tel"
                  placeholder="04XX XXX XXX"
                  maxLength={15}
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  style={{ fontSize: 16 }}
                />
                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>
                  In case they win and can&apos;t be reached on the day
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">
                  Email{' '}
                  <span style={{ color: 'var(--text3)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                    (optional — only if they want a receipt)
                  </span>
                </label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="buyer@example.com"
                  maxLength={254}
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  style={{ fontSize: 16 }}
                />
              </div>
            </div>
          </div>

          <button
            className="btn btn-purple btn-lg"
            style={{ width: '100%', justifyContent: 'center', opacity: (!isValid || submitting) ? 0.6 : 1, fontSize: 16 }}
            disabled={!isValid || submitting}
            onClick={handleConfirm}
          >
            {submitting ? 'Recording sale…' : 'Confirm & record sale →'}
          </button>
          <p style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', marginTop: 10 }}>
            This records the sale in the system. Collect payment separately.
          </p>
        </div>
      </div>
    );
  }

  // ── BROWSE PHASE ────────────────────────────────────────────────────────────
  return (
    <>
      {/* QR Modal */}
      {showQR && (
        <div
          onClick={() => setShowQR(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 32, cursor: 'pointer' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#FAFAF7', borderRadius: 24, padding: '40px 40px 32px', textAlign: 'center', maxWidth: 380, width: '100%', cursor: 'default' }}
          >
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
              Scan to buy on your own device
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 20 }}>
              {fundraiser.emoji} {fundraiser.title}
            </div>
            <img
              src={qrSrc}
              alt="QR code for this campaign"
              style={{ width: 220, height: 220, borderRadius: 12, display: 'block', margin: '0 auto 18px' }}
            />
            <div style={{ fontSize: 12, color: 'var(--text3)', wordBreak: 'break-all', marginBottom: 20 }}>
              {campaignUrl}
            </div>
            <button className="btn btn-outline" style={{ width: '100%' }} onClick={() => setShowQR(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      {cartToast && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#3D2E1A', color: '#fff', padding: '14px 24px', borderRadius: 50, fontSize: 14, fontWeight: 700, zIndex: 9999, boxShadow: '0 4px 24px rgba(0,0,0,.25)', whiteSpace: 'nowrap' }}>
          Maximum 10 squares per purchase
        </div>
      )}

      <div className="dot-bg" style={{ minHeight: '100vh' }}>

        {/* Club Mode sticky header */}
        <div style={{ background: 'var(--card)', borderBottom: '1.5px solid var(--border)', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, position: 'sticky', top: 0, zIndex: 100 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 900, color: 'var(--text)', lineHeight: 1.2 }}>
              {fundraiser.emoji} {fundraiser.title}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
              {fundraiser.org} · <strong>${fundraiser.pricePerSq}</strong> per square
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setShowQR(true)}
              style={{ fontSize: 12, gap: 5 }}
            >
              📱 Share QR
            </button>
            {onToggle && (
              <button
                onClick={onToggle}
                style={{ background: 'none', border: '1.5px solid var(--purple)', color: 'var(--purple)', borderRadius: 20, padding: '5px 12px', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
              >
                Exit Club Mode
              </button>
            )}
          </div>
        </div>

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 20px 100px' }}>

          {/* Stats */}
          <div style={{ textAlign: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text2)' }}>
              <strong style={{ color: 'var(--text)', fontSize: 20, fontFamily: 'var(--font-serif)' }}>{soldCount}</strong>
              <span style={{ margin: '0 4px' }}>/</span>
              {fundraiser.grid} squares sold
            </div>
          </div>

          {/* Colour key */}
          <div style={{ maxWidth: gridMax, margin: '0 auto 14px', display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, fontWeight: 700 }}>
            {COLOR_KEY.map(([bg, bc, lbl]) => (
              <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 16, height: 16, borderRadius: 4, background: bg, border: `1.5px solid ${bc}`, flexShrink: 0 }} />
                <span style={{ color: 'var(--text2)' }}>{lbl}</span>
              </div>
            ))}
          </div>

          {/* Instruction */}
          <div style={{ maxWidth: gridMax, margin: '0 auto 16px', textAlign: 'center' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', margin: 0 }}>
              Tap squares to select, then tap Checkout
            </p>
          </div>

          {/* Grid */}
          <div className={`grid-container ${gridClass}`}>
            {squares.map((sq) => {
              const inCart    = cart.includes(sq.id);
              const isExpired = sq.status === 'reserved' && sq.reservedUntil && Date.now() > sq.reservedUntil;
              const secsLeft  = sq.reservedUntil && !isExpired ? Math.max(0, Math.round((sq.reservedUntil - Date.now()) / 1000)) : null;
              const cls       = inCart ? 'in-cart' : isExpired ? 'available' : sq.status;
              return (
                <div
                  key={sq.id}
                  className={`sq ${cls}`}
                  onClick={() => toggleSquare(sq)}
                  title={sq.owner ? `#${sq.id}: ${sq.owner}` : `Square #${sq.id}`}
                >
                  {sq.status === 'taken' && <span className="sq-sold-overlay">SOLD</span>}
                  <span className="sq-num">{sq.id}</span>
                  {sq.status === 'taken'    && sq.owner  && <span className="sq-label">{abbrevName(sq.owner)}</span>}
                  {inCart                  && sq.status === 'available' && <span className="sq-label" style={{ color: 'var(--green)' }}>✓</span>}
                  {sq.status === 'mine'                  && <span className="sq-label" style={{ color: '#007A5C' }}>✓</span>}
                  {secsLeft !== null                     && <span className="sq-timer">{fmtTime(secsLeft)}</span>}
                </div>
              );
            })}
          </div>

          {/* Cart bar */}
          {cart.length > 0 && (
            <div
              className="cart-bar"
              style={{ maxWidth: gridMax, margin: '24px auto 0', borderRadius: 16, overflow: 'hidden' }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, opacity: .85, marginBottom: 6 }}>
                  {cart.length} square{cart.length !== 1 ? 's' : ''} selected
                </div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {cart.map((id) => (
                    <span key={id} style={{ background: 'rgba(255,255,255,.18)', borderRadius: 6, padding: '3px 8px', fontSize: 12, fontWeight: 700 }}>#{id}</span>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 700, color: 'var(--green)' }}>
                    ${subtotal.toFixed(2)}
                  </div>
                </div>
                <button
                  className="btn btn-primary"
                  style={{ fontSize: 15, padding: '10px 20px' }}
                  onClick={() => { setPhase('checkout'); window.scrollTo(0, 0); }}
                >
                  Checkout →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
