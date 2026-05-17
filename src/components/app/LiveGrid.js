'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import SharePanel from './SharePanel';
import { getSupabaseClient, supabaseConfigured } from '@/lib/supabase/client';

const RESERVE_SECS   = 420;
const WARN_SECS      = 120;
const MAX_CART       = 10;
const PLATFORM_FEES  = { 25: 9, 50: 14, 100: 19 };

const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const parsePrizeValue = (v) => parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')) || 0;

// Strip HTML tags and trim whitespace from any free-text field before storing
const sanitize = (str) => String(str ?? '').trim().replace(/<[^>]*>/g, '');
const shuffle  = (arr) => [...arr].sort(() => Math.random() - 0.5);

function makeEmptyGrid(size) {
  return [...Array(size)].map((_, i) => ({ id: i + 1, status: 'available', owner: null, reservedUntil: null }));
}

function makeGrid(size) {
  const takenCount    = Math.floor(size * 0.22);
  const reservedCount = Math.floor(size * 0.08);
  const allIdxs       = [...Array(size).keys()];
  const takenIdxs     = new Set(shuffle(allIdxs).slice(0, takenCount));
  const remaining     = allIdxs.filter((i) => !takenIdxs.has(i));
  const reservedIdxs  = new Set(shuffle(remaining).slice(0, reservedCount));
  const names = ['Sarah M.', 'James T.', 'Emily R.', 'David K.', 'Lucy P.', 'Tom H.', 'Anna S.', 'Ben W.', 'Claire F.', 'Mike O.'];
  let ni = 0;
  return allIdxs.map((i) => {
    if (takenIdxs.has(i))    return { id: i + 1, status: 'taken',    owner: names[ni++ % names.length], reservedUntil: null };
    if (reservedIdxs.has(i)) return { id: i + 1, status: 'reserved', owner: names[ni++ % names.length], reservedUntil: Date.now() + (90 + Math.random() * 250) * 1000 };
    return { id: i + 1, status: 'available', owner: null, reservedUntil: null };
  });
}

function localizeSquare(row, myNums) {
  const isMine   = myNums.has(row.number);
  const expiredAt = row.reserved_until ? new Date(row.reserved_until).getTime() : null;
  const expired  = expiredAt && Date.now() > expiredAt;
  const dbStatus = expired ? 'available' : row.status;
  return {
    id:            row.number,
    status:        isMine ? 'mine' : dbStatus === 'sold' ? 'taken' : dbStatus,
    owner:         row.buyer_name || null,
    reservedUntil: expiredAt,
    isSponsored:   row.is_sponsored ?? false,
  };
}

function abbrevName(name) {
  if (!name) return 'Unknown';
  const parts = name.trim().split(/\s+/);
  return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

const CONFETTI_COLORS = ['#FF0000', '#FF7700', '#FFDD00', '#00CC44', '#0088FF', '#7700FF', '#FF0088', '#F5A623'];

function Confetti() {
  const pieces = [...Array(70)].map((_, i) => ({
    id: i, left: `${Math.random() * 100}vw`, color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    delay: `${Math.random() * 1.5}s`, duration: `${2.5 + Math.random() * 2}s`,
    width: `${6 + Math.random() * 8}px`, height: `${6 + Math.random() * 8}px`,
  }));
  return <>{pieces.map((p) => <div key={p.id} className="confetti-piece" style={{ left: p.left, top: '-20px', width: p.width, height: p.height, background: p.color, animationDuration: p.duration, animationDelay: p.delay }} />)}</>;
}

// onBack is null on the public buyer page (hides dashboard button + draw button)
const LAUNCH_FEES = { 25: 19, 50: 19, 100: 19 };

export default function LiveGrid({ fundraiser, user, onBack, onDrawComplete, onDelete, onLaunch }) {
  const [squares,     setSquares]     = useState([]);
  const [loadingGrid, setLoadingGrid] = useState(true);
  const [cart,        setCart]        = useState([]);
  const [phase,       setPhase]       = useState('browse');
  const [showShare,   setShowShare]   = useState(false);
  const [timerSecs,   setTimerSecs]   = useState(RESERVE_SECS);
  const [timerPaused, setTimerPaused] = useState(false);
  const [buyerName,   setBuyerName]   = useState(user?.name || '');
  const [buyerEmail,  setBuyerEmail]  = useState('');
  const [buyerPhone,  setBuyerPhone]  = useState('');
  const [winner,      setWinner]      = useState(null);
  const [winners,     setWinners]     = useState([]);
  const [drawnResult,        setDrawnResult]        = useState(null); // null | int[]
  const [notifiedSet,        setNotifiedSet]        = useState(new Set());
  const [cartToast,          setCartToast]          = useState(false);
  const [reservedToast,      setReservedToast]      = useState(false);
  const [showDeleteConfirm,  setShowDeleteConfirm]  = useState(false);
  const [deleting,           setDeleting]           = useState(false);
  const [hoveredSq,          setHoveredSq]          = useState(null);
  const [hoveredRect,        setHoveredRect]        = useState(null);
  const [localDrawDate,      setLocalDrawDate]      = useState(fundraiser.drawDate || '');
  const [showExtendDate,     setShowExtendDate]     = useState(false);
  const [newDrawDate,        setNewDrawDate]        = useState(fundraiser.drawDate || '');
  const [savingDate,         setSavingDate]         = useState(false);
  const [showLaunchModal,    setShowLaunchModal]    = useState(false);
  const [showUnpaidModal,    setShowUnpaidModal]    = useState(false);
  const [showBreakEvenModal, setShowBreakEvenModal] = useState(false);
  const drawTriggeredRef = useRef(false);
  const [tick,        setTick]        = useState(0);
  const timerRef  = useRef(null);
  const prevLen   = useRef(0);
  const myNumsRef = useRef(new Set());

  // Hoisted early so effects below can reference them
  const isOwner = !!onBack;
  const isDrawn = fundraiser.status === 'drawn' || drawnResult !== null;

  useEffect(() => {
    if (!supabaseConfigured) {
      setSquares(fundraiser.sold === 0 ? makeEmptyGrid(fundraiser.grid) : makeGrid(fundraiser.grid));
      setLoadingGrid(false);
      return;
    }
    const supabase = getSupabaseClient();
    // Clear any stale reservations before showing the grid so expired squares are truly available
    supabase.rpc('expire_stale_reservations').then(() =>
      supabase.from('squares').select('*').eq('fundraiser_id', fundraiser.id).order('number')
        .then(({ data, error }) => {
          setSquares(error || !data?.length ? makeGrid(fundraiser.grid) : data.map((row) => localizeSquare(row, myNumsRef.current)));
          setLoadingGrid(false);
        })
    );

    const channel = supabase
      .channel(`squares:${fundraiser.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'squares', filter: `fundraiser_id=eq.${fundraiser.id}` },
        (payload) => setSquares((prev) => prev.map((sq) => sq.id === payload.new.number ? localizeSquare(payload.new, myNumsRef.current) : sq)))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fundraiser.id, fundraiser.grid]);

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

  useEffect(() => {
    clearInterval(timerRef.current);
    if (cart.length === 0 || timerPaused) return;
    timerRef.current = setInterval(() => {
      setTimerSecs((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current);
          if (supabaseConfigured) cart.forEach((num) => getSupabaseClient().rpc('release_square', { p_fundraiser_id: fundraiser.id, p_square_number: num }));
          setCart([]); setPhase('expired');
          return RESERVE_SECS;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [cart.length, timerPaused, fundraiser.id]);

  useEffect(() => {
    if (prevLen.current === 0 && cart.length > 0) setTimerSecs(RESERVE_SECS);
    prevLen.current = cart.length;
  }, [cart.length]);

  // Auto-draw for scheduled fundraisers (owner view only)
  useEffect(() => {
    if (!isOwner || fundraiser.drawType !== 'auto' || isDrawn || drawTriggeredRef.current) return;
    if (!localDrawDate) return;
    const check = () => {
      if (drawTriggeredRef.current) return;
      if (Date.now() >= new Date(localDrawDate).getTime()) {
        drawTriggeredRef.current = true;
        handleDraw();
      }
    };
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner, fundraiser.drawType, isDrawn, localDrawDate]);

  const handleExtendDate = async () => {
    if (!newDrawDate) return;
    setSavingDate(true);
    if (supabaseConfigured) {
      await getSupabaseClient().from('fundraisers').update({ draw_date: newDrawDate }).eq('id', fundraiser.id);
    }
    setLocalDrawDate(newDrawDate);
    drawTriggeredRef.current = false;
    setSavingDate(false);
    setShowExtendDate(false);
  };

  const toggleSquare = useCallback(async (sq) => {
    if (fundraiser.status === 'draft' || fundraiser.status === 'drawn' || drawnResult !== null) return;
    if (sq.status === 'reserved') { setReservedToast(true); setTimeout(() => setReservedToast(false), 3000); return; }
    if (sq.status === 'taken' || sq.status === 'mine') return;
    if (cart.includes(sq.id)) {
      setCart((prev) => prev.filter((id) => id !== sq.id));
      if (supabaseConfigured) await getSupabaseClient().rpc('release_square', { p_fundraiser_id: fundraiser.id, p_square_number: sq.id });
      return;
    }
    if (cart.length >= MAX_CART) { setCartToast(true); setTimeout(() => setCartToast(false), 3000); return; }
    if (supabaseConfigured) {
      const { data: reserved } = await getSupabaseClient().rpc('reserve_square', { p_fundraiser_id: fundraiser.id, p_square_number: sq.id });
      if (!reserved) return;
    }
    setCart((prev) => [...prev, sq.id]);
  }, [cart, fundraiser.id]);

  const handleCheckout = () => { setTimerPaused(true); setPhase('checkout'); };

  const handlePay = async () => {
    const ownerName = sanitize(buyerName || user?.name || 'Buyer');
    const safeEmail = sanitize(buyerEmail).toLowerCase();
    const safePhone = sanitize(buyerPhone);
    if (supabaseConfigured) {
      await getSupabaseClient().rpc('claim_squares', { p_fundraiser_id: fundraiser.id, p_square_numbers: cart, p_buyer_name: ownerName, p_buyer_email: safeEmail, p_buyer_phone: safePhone });
    }
    cart.forEach((num) => myNumsRef.current.add(num));
    setSquares((prev) => prev.map((sq) => cart.includes(sq.id) ? { ...sq, status: 'mine', owner: ownerName } : sq));
    setCart([]); setTimerPaused(false); setTimerSecs(RESERVE_SECS); setPhase('success');
  };

  const handleDraw = async () => {
    const sold = squares.filter((sq) => sq.status === 'mine' || sq.status === 'taken');
    if (!sold.length) return;

    const costPrizes = (fundraiser.prizes || []).reduce((sum, p) => p.donated ? sum : sum + parsePrizeValue(p.value), 0);
    if (costPrizes > 0 && sold.length * fundraiser.pricePerSq < costPrizes) {
      setShowBreakEvenModal(true);
      return;
    }

    if (['bank', 'bank_inperson'].includes(fundraiser.payment?.method) && supabaseConfigured) {
      const { data: unpaid } = await getSupabaseClient()
        .from('squares')
        .select('id', { count: 'exact', head: true })
        .eq('fundraiser_id', fundraiser.id)
        .eq('status', 'sold')
        .eq('paid', false)
        .limit(1);
      if (unpaid !== null && (Array.isArray(unpaid) ? unpaid.length > 0 : unpaid > 0)) {
        setShowUnpaidModal(true);
        return;
      }
    }

    // Determine how many winners to draw (one per prize, minimum 1)
    const activePrizes = (fundraiser.prizes || []).filter((p) => p.description);
    const numWinners   = Math.max(1, activePrizes.length);

    // Shuffle sold squares and pick unique winners without replacement
    const shuffled    = [...sold].sort(() => Math.random() - 0.5);
    const pickedSquares = shuffled.slice(0, Math.min(numWinners, shuffled.length));

    const newWinners = pickedSquares.map((sq, i) => ({
      square: sq,
      place:  activePrizes[i]?.place       || `${i + 1}${i === 0 ? 'st' : i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'}`,
      prize:  activePrizes[i]?.description || '',
      value:  activePrizes[i]?.value       || '',
    }));

    setPhase('draw');

    // Run DB save and animation timer in parallel
    await Promise.all([
      supabaseConfigured
        ? getSupabaseClient().rpc('record_draw', { p_fundraiser_id: fundraiser.id, p_winner_square_nums: pickedSquares.map((sq) => sq.id) })
        : Promise.resolve(),
      new Promise((resolve) => setTimeout(resolve, 2500)),
    ]);

    onDrawComplete?.(fundraiser.id);
    setWinner(pickedSquares[0]);
    setWinners(newWinners);
    setDrawnResult(pickedSquares.map((sq) => sq.id));
    setPhase('winner');
  };

  const timerPct     = (timerSecs / RESERVE_SECS) * 100;
  const timerWarning = timerSecs <= WARN_SECS;
  const subtotal     = cart.length * fundraiser.pricePerSq;
  const txFee        = subtotal > 0 ? Math.round(((subtotal * 0.017) + 0.30) * 100) / 100 : 0;
  const totalCost    = subtotal + txFee;
  const mySquares    = squares.filter((sq) => sq.status === 'mine');
  const gridClass    = fundraiser.grid === 25 ? 'grid-25' : 'grid-100';
  const winnerNums   = drawnResult ?? fundraiser.winnerSquareNums ?? (fundraiser.winnerSquareNum != null ? [fundraiser.winnerSquareNum] : []);
  const winnerNum    = winnerNums[0] ?? null;
  const soldCount    = squares.filter((sq) => sq.status === 'taken' || sq.status === 'mine').length;
  const canDelete    = isOwner && soldCount === 0 && !isDrawn;

  if (loadingGrid) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: 'var(--text2)', fontWeight: 600 }}>Loading grid…</div>
    </div>
  );

  if (phase === 'expired') return (
    <div className="dot-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="scratch-card" style={{ padding: 40, textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>⏰</div>
        <h2 className="section-title">Time&apos;s up!</h2>
        <p className="section-sub" style={{ marginBottom: 24 }}>Your reserved squares were released after 7 minutes.</p>
        <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={() => setPhase('browse')}>Try again →</button>
      </div>
    </div>
  );

  if (phase === 'success') return (
    <div className="dot-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="scratch-card" style={{ padding: 40, textAlign: 'center', maxWidth: 460 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
        <h2 className="section-title" style={{ color: 'var(--green)' }}>You&apos;re in!</h2>
        <p className="section-sub" style={{ marginBottom: 24 }}>Your squares have been secured. Good luck!</p>
        {mySquares.length > 0 && (
          <div style={{ background: '#F0FDF8', borderRadius: 12, padding: '16px 20px', marginBottom: 24 }}>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>Your squares</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              {mySquares.map((sq) => <span key={sq.id} className="num-pill">{sq.id}</span>)}
            </div>
          </div>
        )}
        {fundraiser.thankYou && (
          <div style={{ background: '#F0FDF8', border: '1.5px solid #B6EDD8', borderRadius: 12, padding: '16px 20px', marginBottom: 24, textAlign: 'left' }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: .8, color: 'var(--green)', marginBottom: 8 }}>
              A message from {fundraiser.contactName || fundraiser.org}{fundraiser.contactName && fundraiser.org ? ` at ${fundraiser.org}` : ''}
            </div>
            <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>&ldquo;{fundraiser.thankYou}&rdquo;</p>
          </div>
        )}
        {['bank', 'bank_inperson'].includes(fundraiser.payment?.method) && (
          <div style={{ background: '#FFFBEC', border: '1.5px solid #F0D878', borderRadius: 12, padding: '20px 24px', marginBottom: 24, textAlign: 'left' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#9A6800', marginBottom: 12 }}>🏦 Don&apos;t forget to make the transfer now</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                <span style={{ color: 'var(--text2)' }}>Account name</span>
                <span style={{ fontWeight: 700 }}>{fundraiser.payment.accountName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                <span style={{ color: 'var(--text2)' }}>BSB</span>
                <span style={{ fontWeight: 700 }}>{fundraiser.payment.bsb}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                <span style={{ color: 'var(--text2)' }}>Account number</span>
                <span style={{ fontWeight: 700 }}>{fundraiser.payment.account}</span>
              </div>
            </div>
          </div>
        )}
        {fundraiser.payment?.method === 'inperson' && (
          <div style={{ background: '#F0FDF8', border: '1.5px solid #B6EDD8', borderRadius: 12, padding: '16px 20px', marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--green)', marginBottom: 4 }}>🤝 Payment collected in person</div>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>The organiser will be in touch to collect your payment directly.</div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setPhase('browse')}>View grid</button>
          {isOwner
            ? <button className="btn btn-primary" style={{ flex: 1 }} onClick={onBack}>Dashboard</button>
            : <a href="/" className="btn btn-primary" style={{ flex: 1, textDecoration: 'none', justifyContent: 'center' }}>Learn More →</a>
          }
        </div>
      </div>
    </div>
  );

  if (phase === 'draw' || phase === 'winner') return (
    <>
      {phase === 'winner' && <Confetti />}
      <div style={{ minHeight: '100vh', background: phase === 'winner' ? 'linear-gradient(135deg,#0D2B1F,#1A3C2E)' : 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, transition: 'background 1s' }}>
        <div style={{ textAlign: 'center', maxWidth: 560, width: '100%' }}>
          {phase === 'draw' ? (
            <>
              <div style={{ fontSize: 64, marginBottom: 24 }}>🎲</div>
              <h2 className="section-title">Drawing {(fundraiser.prizes || []).filter(p => p.description).length > 1 ? 'winners' : 'winner'}…</h2>
            </>
          ) : (
            <>
              <span className="winner-trophy">🏆</span>
              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 36, fontWeight: 900, color: '#fff', marginTop: 20, marginBottom: 8 }}>
                {winners.length === 1 ? 'We have a winner!' : 'We have our winners!'}
              </h1>
              <p style={{ color: 'rgba(255,255,255,.7)', marginBottom: 24 }}>Congratulations to all! 🎊</p>

              {/* Winners list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24, textAlign: 'left' }}>
                {winners.map((w, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,.1)', borderRadius: 14, padding: '16px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.55)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: .5 }}>
                          {w.place} Prize{w.prize ? `: ${w.prize}` : ''}
                          {w.value ? ` (${w.value})` : ''}
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: i === 0 ? '#FFD700' : '#fff' }}>{w.square.owner}</div>
                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,.45)', marginTop: 2 }}>Square #{w.square.id}</div>
                        {isOwner && (
                          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.55)', marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {(w.square.buyer_email || w.square.owner_email) && <span>✉ {w.square.buyer_email || w.square.owner_email}</span>}
                            {(w.square.buyer_phone || w.square.phone) && <span>📞 {w.square.buyer_phone || w.square.phone}</span>}
                          </div>
                        )}
                      </div>
                      {isOwner && (w.square.buyer_email || w.square.owner_email) && (
                        <a
                          href={`mailto:${w.square.buyer_email || w.square.owner_email}?subject=Congratulations! You won ${w.place} prize in ${fundraiser.title}&body=Hi ${w.square.owner},%0D%0A%0D%0ACongratulations! You have won the ${w.place} prize${w.prize ? ` (${w.prize})` : ''} in the ${fundraiser.title} LuckySquares fundraiser.%0D%0A%0D%0APlease contact us to arrange collection of your prize.%0D%0A%0D%0ARegards,%0D%0A${fundraiser.org}`}
                          onClick={() => setNotifiedSet((prev) => { const n = new Set(prev); n.add(i); return n; })}
                          style={{ flexShrink: 0, fontSize: 13, textDecoration: 'none', borderRadius: 8, padding: '7px 14px', whiteSpace: 'nowrap', ...(notifiedSet.has(i) ? { background: 'rgba(0,200,117,.25)', border: '1px solid rgba(0,200,117,.5)', color: '#00C875' } : { background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.25)', color: 'rgba(255,255,255,.85)' }) }}
                        >
                          {notifiedSet.has(i) ? '✓ Sent' : '✉ Notify'}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {isOwner && (
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', marginBottom: 20 }}>
                  Use the Notify buttons above to email each winner directly from your mail app.
                </p>
              )}

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                <button className="btn btn-lg" style={{ background: 'rgba(255,255,255,.15)', color: '#fff', border: '1.5px solid rgba(255,255,255,.3)' }} onClick={() => setPhase('browse')}>
                  View results on grid →
                </button>
                {isOwner && (
                  <button className="btn btn-gold btn-lg" onClick={onBack}>Back to dashboard</button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );

  if (phase === 'checkout') return (
    <div className="dot-bg" style={{ minHeight: '100vh' }}>
      <div style={{ maxWidth: 540, margin: '0 auto', padding: 32 }}>
        <button className="btn btn-outline btn-sm" style={{ marginBottom: 24 }} onClick={() => { setTimerPaused(false); setPhase('browse'); }}>← Back to grid</button>
        <h2 className="section-title" style={{ marginBottom: 24 }}>Checkout</h2>
        <div className="scratch-card" style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ fontWeight: 800, marginBottom: 16 }}>Your squares</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {cart.map((id) => <span key={id} className="num-pill">{id}</span>)}
          </div>
          <div className="divider" />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--text2)', marginBottom: fundraiser.payment?.method === 'stripe' ? 6 : 12 }}>
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          {fundraiser.payment?.method === 'stripe' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--text2)', marginBottom: 12 }}>
                <span>Processing fee</span>
                <span>${txFee.toFixed(2)}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.5 }}>
                Includes ${txFee.toFixed(2)} to cover secure payment processing fees (1.7% + 30c)
              </div>
            </>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 18 }}>
            <span>Total</span>
            <span style={{ color: 'var(--green)' }}>${(fundraiser.payment?.method === 'stripe' ? totalCost : subtotal).toFixed(2)}</span>
          </div>
        </div>
        <div className="scratch-card" style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ fontWeight: 800, marginBottom: 16 }}>Your details</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" placeholder="Your full name" maxLength={80} value={buyerName} onChange={(e) => setBuyerName(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Email (for receipt)</label>
              <input className="form-input" type="email" placeholder="you@example.com" maxLength={254} value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone number</label>
              <input className="form-input" type="tel" placeholder="04XX XXX XXX" maxLength={15} value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} />
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>Provided to the organiser only, in case you win and they need to reach you.</div>
            </div>
          </div>
        </div>
        {['bank', 'bank_inperson'].includes(fundraiser.payment?.method) ? (
          <div className="scratch-card" style={{ padding: 24, marginBottom: 20 }}>
            <div style={{ fontWeight: 800, marginBottom: 16 }}>🏦 Bank transfer details</div>
            {fundraiser.payment?.method === 'bank_inperson' && (
              <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>You can pay by bank transfer or in person, whichever suits you.</div>
            )}
            <div style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 12 }}>Transfer ${subtotal.toFixed(2)} to:</div>
            <div style={{ background: 'var(--cream)', borderRadius: 10, padding: '14px 16px', fontSize: 14 }}>
              <div style={{ marginBottom: 6 }}><strong>Account:</strong> {fundraiser.payment?.accountName || 'Organisation Account'}</div>
              <div style={{ marginBottom: 6 }}><strong>BSB:</strong> {fundraiser.payment?.bsb || '000-000'}</div>
              <div><strong>Account #:</strong> {fundraiser.payment?.account || '12345678'}</div>
            </div>
          </div>
        ) : fundraiser.payment?.method === 'inperson' ? (
          <div className="scratch-card" style={{ padding: 24, marginBottom: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🤝</div>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Pay in person</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>The organiser will collect your payment of <strong>${subtotal.toFixed(2)}</strong> directly via cash or card tap. Just confirm your squares below and they will be in touch.</div>
          </div>
        ) : (
          <div className="scratch-card" style={{ padding: 24, marginBottom: 20 }}>
            <div style={{ fontWeight: 800, marginBottom: 16 }}>💳 Card payment</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input className="form-input" placeholder="Card number" maxLength={19} />
              <div style={{ display: 'flex', gap: 12 }}>
                <input className="form-input" placeholder="MM / YY" maxLength={5} style={{ flex: 1 }} />
                <input className="form-input" placeholder="CVV" maxLength={4} style={{ width: 90 }} />
              </div>
            </div>
          </div>
        )}
        <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={handlePay}>
          {fundraiser.payment?.method === 'stripe'
            ? `Pay $${totalCost.toFixed(2)} →`
            : fundraiser.payment?.method === 'inperson'
            ? 'Confirm my squares →'
            : 'Confirm squares →'}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {showShare && <SharePanel fundraiser={fundraiser} onClose={() => setShowShare(false)} />}

      {/* Draft overlay — shown to non-owners when fundraiser is not yet live */}
      {fundraiser.status === 'draft' && !isOwner && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 900, padding: 24 }}>
          <div className="scratch-card" style={{ padding: 40, maxWidth: 420, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 800, marginBottom: 12 }}>Not open yet</h2>
            <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.6 }}>
              Please contact <strong>{fundraiser.org}</strong> to launch this LuckySquares fundraiser.
            </p>
          </div>
        </div>
      )}

      {/* Draft banner — shown to the owner as a reminder */}
      {fundraiser.status === 'draft' && isOwner && (
        <div style={{ background: '#FFF8E1', borderBottom: '2px solid #F0D878', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, fontSize: 14 }}>
          <span style={{ fontWeight: 800, color: '#9A6800' }}>Draft mode</span>
          <span style={{ color: '#7A5200' }}>Your fundraiser is saved but not yet live. Buyers cannot purchase squares until you launch.</span>
        </div>
      )}

      {cartToast && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#3D2E1A', color: '#fff', padding: '14px 24px', borderRadius: 50, fontSize: 14, fontWeight: 700, zIndex: 9999, boxShadow: '0 4px 24px rgba(0,0,0,.25)', whiteSpace: 'nowrap' }}>
          Sorry, you can only buy 10 squares at a time
        </div>
      )}
      {reservedToast && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#3D2E1A', color: '#fff', padding: '14px 24px', borderRadius: 50, fontSize: 14, fontWeight: 700, zIndex: 9999, boxShadow: '0 4px 24px rgba(0,0,0,.25)', whiteSpace: 'nowrap' }}>
          Sorry, someone else is already in the process of buying this square
        </div>
      )}

      <div className="dot-bg">
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
            <div>
              {isOwner && <button className="btn btn-outline btn-sm" style={{ marginBottom: 12 }} onClick={onBack}>← Dashboard</button>}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 32 }}>{fundraiser.emoji}</span>
                <div>
                  <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 700 }}>{fundraiser.title}</h1>
                  <div style={{ fontSize: 13, color: 'var(--text2)' }}>{fundraiser.org} · ${fundraiser.pricePerSq}/square</div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                <strong style={{ color: 'var(--text)' }}>{squares.filter((sq) => sq.status === 'taken' || sq.status === 'mine').length}</strong> / {fundraiser.grid} sold
              </div>
              {isOwner && !isDrawn && (() => {
                const costPrizes    = (fundraiser.prizes || []).reduce((sum, p) => p.donated ? sum : sum + parsePrizeValue(p.value), 0);
                const soldCount     = squares.filter((sq) => sq.status === 'taken' || sq.status === 'mine').length;
                const soldRevenue   = soldCount * fundraiser.pricePerSq;
                const belowBreakEven = costPrizes > 0 && soldRevenue < costPrizes;
                const squaresNeeded = costPrizes > 0 ? Math.ceil((costPrizes - soldRevenue) / fundraiser.pricePerSq) : 0;
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {belowBreakEven && (
                      <span style={{ fontSize: 12, color: 'var(--orange)', fontWeight: 700 }}>
                        ⚠️ {squaresNeeded} more square{squaresNeeded !== 1 ? 's' : ''} to cover prizes
                      </span>
                    )}
                    <button className="btn btn-gold btn-sm" onClick={handleDraw}>🎲 Run draw</button>
                  </div>
                );
              })()}
              {isDrawn && <span className="tag tag-drawn" style={{ fontSize: 13, padding: '5px 12px' }}>🏆 Drawn</span>}
            </div>
          </div>

          {isOwner && fundraiser.drawType === 'auto' && !isDrawn && localDrawDate && (() => {
            const drawAt      = new Date(localDrawDate);
            const isPast      = Date.now() >= drawAt.getTime();
            const fmtDraw     = drawAt.toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' });
            const gridMaxWidth = fundraiser.grid === 25 ? 330 : 640;
            return (
              <div style={{ maxWidth: gridMaxWidth, marginLeft: 'auto', marginRight: 'auto', marginBottom: 20 }}>
              <div style={{ padding: '14px 18px', background: isPast ? '#FFF5F5' : '#F0FDF8', border: `1.5px solid ${isPast ? '#FFCCCC' : '#B6EDD8'}`, borderRadius: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{isPast ? '⚠️' : '📅'}</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: isPast ? '#CC0000' : 'var(--text)' }}>
                        {isPast ? 'Scheduled draw overdue' : 'Scheduled draw'}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>
                        {isPast ? `Was scheduled for ${fmtDraw}` : `Draws automatically on ${fmtDraw}`}
                      </div>
                    </div>
                  </div>
                  <button className="btn btn-outline btn-sm" onClick={() => { setShowExtendDate((v) => !v); setNewDrawDate(localDrawDate); }}>
                    {showExtendDate ? 'Cancel' : isPast ? 'Set new date' : 'Extend date'}
                  </button>
                </div>
                {showExtendDate && (
                  <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      type="datetime-local"
                      className="form-input"
                      style={{ flex: 1, minWidth: 220 }}
                      value={newDrawDate}
                      min={new Date().toISOString().slice(0, 16)}
                      onChange={(e) => setNewDrawDate(e.target.value)}
                    />
                    <button className="btn btn-primary btn-sm" disabled={!newDrawDate || savingDate} onClick={handleExtendDate}>
                      {savingDate ? 'Saving...' : 'Confirm new date'}
                    </button>
                  </div>
                )}
              </div>
              </div>
            );
          })()}

          {(() => {
            const platformFee  = PLATFORM_FEES[fundraiser.grid] ?? 0;
            const prizePool    = fundraiser.totalPrizeValue ?? 0;
            const grossRaised  = soldCount * fundraiser.pricePerSq;
            const netRaised    = Math.max(0, grossRaised - prizePool - platformFee);
            const fmt          = (n) => n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const gridMaxWidth = fundraiser.grid === 25 ? 330 : 640;
            return (
              <div style={{ display: 'flex', gap: 16, marginLeft: 'auto', marginRight: 'auto', marginBottom: 20, flexWrap: 'wrap', alignItems: 'stretch', justifyContent: 'space-between', maxWidth: gridMaxWidth }}>

                {fundraiser.prizes?.length > 0 && (
                  <div style={{ padding: '14px 18px', background: 'linear-gradient(135deg,#FFFBEC,#FFF6D4)', borderRadius: 14, border: '1.5px solid #F0D878', flexShrink: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: .8, color: '#9A6800', marginBottom: 10 }}>🏆 Prizes</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {fundraiser.prizes.map((p, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 16, flexShrink: 0 }}>{['🥇','🥈','🥉'][i] ?? '🎖️'}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{p.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!isOwner && fundraiser.description && (
                  <div style={{ padding: '14px 18px', background: 'var(--card)', borderRadius: 14, border: '1.5px solid var(--border)', flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: .8, color: 'var(--text2)', marginBottom: 8 }}>💚 About this fundraiser</div>
                    <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, margin: 0 }}>{fundraiser.description}</p>
                  </div>
                )}

                {isOwner && (
                  <div style={{ padding: '14px 18px', background: 'var(--card)', borderRadius: 14, border: '1.5px solid var(--border)', minWidth: 220, flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: .8, color: 'var(--text2)', marginBottom: 10 }}>💰 Funds raised so far</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 13 }}>
                        <span style={{ color: 'var(--text2)' }}>{soldCount} squares sold so far × ${fundraiser.pricePerSq} per square</span>
                        <span style={{ fontWeight: 700 }}>${fmt(grossRaised)}</span>
                      </div>
                      {prizePool > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 13 }}>
                          <span style={{ color: 'var(--text2)' }}>Prize pool</span>
                          <span style={{ fontWeight: 700, color: 'var(--orange)' }}>−${fmt(prizePool)}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 13 }}>
                        <span style={{ color: 'var(--text2)' }}>Campaign fee</span>
                        <span style={{ fontWeight: 700, color: 'var(--orange)' }}>−${fmt(platformFee)}</span>
                      </div>
                      <div style={{ height: 1, background: 'var(--border)', margin: '2px 0' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                        <span style={{ fontSize: 13, fontWeight: 800 }}>Total funds raised so far</span>
                        <span style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 900, color: 'var(--green)' }}>${fmt(netRaised)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {isDrawn ? (
            <div style={{ maxWidth: fundraiser.grid === 25 ? 330 : 640, marginLeft: 'auto', marginRight: 'auto', marginBottom: 20 }}>
              <div style={{ background: 'linear-gradient(135deg,#1A3C2E,#0D2B1F)', color: '#fff', padding: '16px 20px', borderRadius: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 28, flexShrink: 0 }}>🏆</span>
                <div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 900 }}>Draw complete!</div>
                  <div style={{ fontSize: 13, opacity: .8, marginTop: 2 }}>
                    {winnerNums.length > 0
                      ? winnerNums.map((n, i) => {
                          const sq = squares.find((s) => s.id === n);
                          const place = ['1st','2nd','3rd'][i] ?? `${i + 1}th`;
                          return `${place}: #${n}${sq?.owner ? ` (${abbrevName(sq.owner)})` : ''}`;
                        }).join('  |  ')
                      : 'Draw has been run'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, fontWeight: 700 }}>
                {[['#00C875','#009A5C','Winners 🏆'],['#4A90D9','#2165B5','Your squares'],['#F0EDE5','#DDD5C0','Sold']].map(([bg,bc,lbl]) => (
                  <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 18, height: 18, borderRadius: 4, background: bg, border: `1.5px solid ${bc}` }} />
                    <span style={{ color: 'var(--text2)' }}>{lbl}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ maxWidth: fundraiser.grid === 25 ? 330 : 640, marginLeft: 'auto', marginRight: 'auto', marginBottom: 20, display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, fontWeight: 700 }}>
              {[['#fff','#D4EFE6','Available'],['#E8FFF6','var(--green)','In cart'],['#D4F5E9','var(--green)','Mine'],['#FFF0E8','var(--orange)','Reserved'],['#F0EDE5','#DDD5C0','Sold']].map(([bg,bc,lbl]) => (
                <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 18, height: 18, borderRadius: 4, background: bg, border: `1.5px solid ${bc}` }} />
                  <span style={{ color: 'var(--text2)' }}>{lbl}</span>
                </div>
              ))}
            </div>
          )}

          <div className={`grid-container ${gridClass}`}>
            {squares.map((sq) => {
              const winnerIdx  = isDrawn ? winnerNums.indexOf(sq.id) : -1;
              const isWinner   = winnerIdx !== -1;
              const isMineLost = isDrawn && sq.status === 'mine' && !isWinner;
              const inCart     = !isDrawn && cart.includes(sq.id);
              const secsLeft   = !isDrawn && sq.reservedUntil ? Math.max(0, Math.round((sq.reservedUntil - Date.now()) / 1000)) : null;
              const isExpired  = !isDrawn && sq.status === 'reserved' && sq.reservedUntil && Date.now() > sq.reservedUntil;
              const isSponsored = sq.isSponsored && (sq.status === 'taken' || sq.status === 'mine');
              const cls        = isWinner ? 'winner'
                               : isMineLost ? 'mine-lost'
                               : isSponsored ? 'sponsored'
                               : inCart ? 'in-cart'
                               : isExpired ? 'available'
                               : sq.status;
              const tooltip    = isWinner
                ? `🏆 Congratulations ${abbrevName(sq.owner)}!`
                : isMineLost
                ? `Not a winner sorry, better luck next time`
                : sq.owner ? `#${sq.id}: ${sq.owner}` : `Square #${sq.id}`;
              const isSold = sq.status === 'taken' || sq.status === 'mine';
              return (
                <div key={sq.id} className={`sq ${cls}`} onClick={() => toggleSquare(sq)} title={isSponsored ? undefined : tooltip}
                  onMouseEnter={isSold && sq.owner && !isSponsored ? (e) => { setHoveredSq(sq); setHoveredRect(e.currentTarget.getBoundingClientRect()); } : undefined}
                  onMouseLeave={isSold && !isSponsored ? () => { setHoveredSq(null); setHoveredRect(null); } : undefined}
                >
                  {isSponsored ? (
                    <>
                      <span className="sq-num">{sq.id}</span>
                      <span className="sq-tooltip">A gift from us 🍀 We bought this square as our way of saying we love your cause</span>
                    </>
                  ) : isWinner ? (
                    <>
                      <span style={{ fontSize: 11, lineHeight: 1 }}>{['🥇','🥈','🥉'][winnerIdx] ?? '🏅'}</span>
                      <span className="sq-num" style={{ marginTop: 1 }}>{sq.id}</span>
                    </>
                  ) : (
                    <>
                      {!isDrawn && sq.status === 'taken' && !isSponsored && <span style={{ fontSize: 7, fontWeight: 800, letterSpacing: .8, color: 'var(--muted)', textTransform: 'uppercase', lineHeight: 1 }}>SOLD</span>}
                      <span className="sq-num">{sq.id}</span>
                      {!isDrawn && sq.status === 'taken'    && sq.owner    && <span className="sq-label">{abbrevName(sq.owner)}</span>}
                      {!isDrawn && sq.status === 'mine'                    && <span className="sq-label" style={{ color: '#007A5C' }}>✓</span>}
                      {!isDrawn && sq.status === 'reserved' && secsLeft !== null && <span className="sq-timer">{fmtTime(secsLeft)}</span>}
                      {!isDrawn && inCart && sq.status === 'available'     && <span className="sq-label" style={{ color: 'var(--green)' }}>✓</span>}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {!isDrawn && cart.length > 0 && (
            <div className={`cart-bar${timerWarning ? ' warn' : ''}`} style={{ maxWidth: fundraiser.grid === 25 ? 330 : 640, margin: '24px auto 0', borderRadius: 16, overflow: 'hidden' }}>
              <div className="timer-bar">
                <div className="timer-fill" style={{ width: `${timerPct}%`, background: timerWarning ? 'var(--orange)' : 'var(--green)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, alignItems: 'center', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 900, fontFamily: 'var(--font-serif)', letterSpacing: '-.5px' }}>
                  ⏱ {fmtTime(timerSecs)}
                  {timerWarning && <span style={{ color: '#FFBB88', marginLeft: 8 }}>Hurry up!</span>}
                </div>
                <div style={{ fontSize: 11, opacity: .65, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5 }}>
                  remaining to complete checkout
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {cart.map((id) => <span key={id} style={{ background: 'rgba(255,255,255,.15)', borderRadius: 6, padding: '2px 7px', fontSize: 12, fontWeight: 700 }}>#{id}</span>)}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 700, color: 'var(--green)' }}>{cart.length} square{cart.length !== 1 ? 's' : ''}</div>
                  <div style={{ fontSize: 13, opacity: .7 }}>${subtotal.toFixed(2)}</div>
                </div>
                <button className="btn btn-primary" onClick={handleCheckout}>Checkout →</button>
              </div>
            </div>
          )}

          {isOwner && fundraiser.status === 'draft' && (
            <div style={{ maxWidth: fundraiser.grid === 25 ? 330 : 640, margin: '32px auto 0' }}>
              <div style={{ padding: '24px 28px', background: 'linear-gradient(135deg,#FFFBEC,#FFF8E1)', borderRadius: 18, border: '1.5px solid #F0D878', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 36, flexShrink: 0 }}>🔒</div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 900, color: 'var(--text)', marginBottom: 6 }}>This campaign is in draft</div>
                    <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, maxWidth: 460 }}>
                      Buyers cannot purchase squares until you launch. A one-off platform fee of <strong>${LAUNCH_FEES[fundraiser.grid] ?? 19}</strong> applies to go live. Once launched, your link is active and selling can begin straight away.
                    </div>
                  </div>
                </div>
                <button className="btn btn-gold" style={{ flexShrink: 0 }} onClick={() => setShowLaunchModal(true)}>
                  🚀 Launch now
                </button>
              </div>
            </div>
          )}

          {isOwner && fundraiser.status !== 'draft' && (
            <div style={{ maxWidth: fundraiser.grid === 25 ? 330 : 640, margin: '32px auto 0' }}>
            <div style={{ padding: '24px 28px', background: 'linear-gradient(135deg,#F0FDF8,#E6FAF2)', borderRadius: 18, border: '1.5px solid #B6EDD8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ fontSize: 36, flexShrink: 0 }}>📣</div>
                <div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 900, color: 'var(--text)', marginBottom: 6 }}>Now share it far and wide!</div>
                  <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, maxWidth: 460 }}>
                    Send your link via WhatsApp, SMS, email, or post it to your school app and socials. The more people who see it, the faster your grid fills up!
                  </div>
                </div>
              </div>
              <button className="btn btn-primary" style={{ flexShrink: 0 }} onClick={() => setShowShare(true)}>
                🔗 Share your fundraiser
              </button>
            </div>
            </div>
          )}

          {/* Launch modal for draft campaigns */}
          {showLaunchModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
              <div className="scratch-card" style={{ padding: 36, maxWidth: 440, width: '100%', textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🚀</div>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Launch your fundraiser</h2>
                <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 24, lineHeight: 1.6 }}>
                  A one-off platform fee of <strong>${LAUNCH_FEES[fundraiser.grid] ?? 19}</strong> applies to go live. Once paid, your fundraiser is active and buyers can start purchasing squares immediately.
                </p>
                <div style={{ background: 'var(--cream)', borderRadius: 12, padding: '14px 20px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                  <span style={{ color: 'var(--text2)' }}>{fundraiser.grid}-square fundraiser</span>
                  <span style={{ fontWeight: 800 }}>${LAUNCH_FEES[fundraiser.grid] ?? 19}</span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 24 }}>Online card payment coming soon. Contact us at support@luckysquares.com.au to launch now.</p>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowLaunchModal(false)}>Cancel</button>
                  <button className="btn btn-gold btn-lg" style={{ flex: 2 }} onClick={async () => {
                    setShowLaunchModal(false);
                    if (supabaseConfigured) await getSupabaseClient().from('fundraisers').update({ status: 'active' }).eq('id', fundraiser.id);
                    onLaunch?.(fundraiser.id);
                  }}>
                    Pay &amp; launch →
                  </button>
                </div>
              </div>
            </div>
          )}

          {showBreakEvenModal && (() => {
            const costPrizes  = (fundraiser.prizes || []).reduce((sum, p) => p.donated ? sum : sum + parsePrizeValue(p.value), 0);
            const soldCount   = squares.filter((sq) => sq.status === 'taken' || sq.status === 'mine').length;
            const soldRevenue = soldCount * fundraiser.pricePerSq;
            const stillNeeded = Math.ceil((costPrizes - soldRevenue) / fundraiser.pricePerSq);
            return (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
                <div className="scratch-card" style={{ padding: 36, maxWidth: 440, width: '100%', textAlign: 'center' }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
                  <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 800, marginBottom: 12 }}>Not enough squares sold</h2>
                  <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 8 }}>
                    Your prize pool costs <strong>${costPrizes.toLocaleString()}</strong> but you have only raised <strong>${soldRevenue.toLocaleString()}</strong> so far.
                  </p>
                  <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 24 }}>
                    You need to sell at least <strong>{stillNeeded} more square{stillNeeded !== 1 ? 's' : ''}</strong> before you can run the draw.
                  </p>
                  <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={() => setShowBreakEvenModal(false)}>Got it</button>
                </div>
              </div>
            );
          })()}

          {showUnpaidModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
              <div className="scratch-card" style={{ padding: 36, maxWidth: 440, width: '100%', textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 800, marginBottom: 12 }}>Unpaid purchases</h2>
                <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 24 }}>
                  Some purchases remain unpaid. Please visit the campaign report page and confirm all payments before you try again.
                </p>
                <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={() => setShowUnpaidModal(false)}>Got it</button>
              </div>
            </div>
          )}

          {canDelete && (
            <div style={{ maxWidth: fundraiser.grid === 25 ? 330 : 640, margin: '24px auto 0' }}>
              {!showDeleteConfirm ? (
                <div style={{ textAlign: 'center' }}>
                  <button onClick={() => setShowDeleteConfirm(true)} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 13, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}>
                    Delete this campaign
                  </button>
                </div>
              ) : (
                <div style={{ padding: '20px 24px', background: '#FFF5F5', border: '1.5px solid #FFCCCC', borderRadius: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>🗑️</div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 900, marginBottom: 8, color: '#CC0000' }}>Delete this campaign?</div>
                  <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20, lineHeight: 1.6 }}>
                    This will permanently delete your fundraiser and all its squares. This cannot be undone.
                  </p>
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                    <button className="btn btn-outline btn-sm" onClick={() => setShowDeleteConfirm(false)}>No, keep it</button>
                    <button className="btn btn-sm" style={{ background: '#CC0000', color: '#fff' }} disabled={deleting}
                      onClick={async () => {
                        setDeleting(true);
                        await onDelete?.(fundraiser.id);
                      }}>
                      {deleting ? 'Deleting…' : 'Yes, delete it'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {cart.length > 0 && cart.length < MAX_CART && (
            <p style={{ marginTop: 12, fontSize: 12, color: 'var(--text2)', textAlign: 'center' }}>
              Select up to {MAX_CART - cart.length} more square{MAX_CART - cart.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

      </div>

      {hoveredSq && hoveredRect && (() => {
        const size = hoveredRect.width * 2;
        const left = hoveredRect.left + hoveredRect.width / 2 - size / 2;
        const top  = hoveredRect.top  + hoveredRect.height / 2 - size / 2;
        const bg   = hoveredSq.status === 'mine' ? '#D4F5E9' : '#F0EDE5';
        const bc   = hoveredSq.status === 'mine' ? 'var(--green)' : '#DDD5C0';
        const col  = hoveredSq.status === 'mine' ? '#007A5C' : 'var(--muted)';
        return (
          <div style={{ position: 'fixed', left, top, width: size, height: size, zIndex: 9999, pointerEvents: 'none', background: bg, border: `2px solid ${bc}`, borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, boxShadow: '0 6px 24px rgba(0,0,0,.18)' }}>
            <span style={{ fontSize: 20, fontWeight: 900, color: col, fontFamily: 'var(--font-serif)', lineHeight: 1 }}>{hoveredSq.id}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: col, lineHeight: 1 }}>{abbrevName(hoveredSq.owner)}</span>
          </div>
        );
      })()}
    </>
  );
}
