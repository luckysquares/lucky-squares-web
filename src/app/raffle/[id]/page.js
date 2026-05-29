'use client';

import { useState, useEffect } from 'react';
import { use } from 'react';
import Link from 'next/link';
import Logo from '@/components/ui/Logo';
import MarketingNav from '@/components/marketing/MarketingNav';
import { getSupabaseClient, supabaseConfigured } from '@/lib/supabase/client';
import { calcTxFee } from '@/lib/stripeFees';

const RAFFLE_NAV_LINKS = [
  { href: '/how-it-works', label: 'How it works' },
  { href: '/pricing',      label: 'Pricing' },
];

function RaffleTicketStub({ ticketNumber, campaignTitle }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'stretch',
      borderRadius: 10,
      overflow: 'hidden',
      boxShadow: '0 2px 12px rgba(0,0,0,.12)',
      marginBottom: 12,
      maxWidth: 440,
    }}>
      {/* Tear stub on left */}
      <div style={{
        width: 56,
        background: '#F59E0B',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '10px 6px',
        borderRight: '3px dashed rgba(0,0,0,.15)',
        flexShrink: 0,
      }}>
        <div style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)', fontSize: 10, fontWeight: 800, color: '#fff', letterSpacing: 1, textTransform: 'uppercase' }}>Lucky Squares</div>
      </div>
      {/* Main ticket body */}
      <div style={{ flex: 1, background: '#FEF3C7', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#92400E', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>50/50 Raffle</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#78350F', maxWidth: 200, lineHeight: 1.3 }}>{campaignTitle}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#92400E', marginBottom: 2 }}>Ticket</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 900, color: '#92400E' }}>
            #{String(ticketNumber).padStart(3, '0')}
          </div>
        </div>
      </div>
    </div>
  );
}

const QUANTITY_PRESETS = [1, 2, 5, 10];

export default function RaffleBuyPage({ params }) {
  const { id } = use(params);

  const [campaign,       setCampaign]       = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [notFoundState,  setNotFound]       = useState(false);
  const [quantity,       setQuantity]       = useState(1);
  const [customQty,      setCustomQty]      = useState('');
  const [selectionMode,  setSelectionMode]  = useState('auto');
  const [pickedNumbers,  setPickedNumbers]  = useState('');
  const [buyerName,      setBuyerName]      = useState('');
  const [buyerEmail,     setBuyerEmail]     = useState('');
  const [buyerPhone,     setBuyerPhone]     = useState('');
  const [submitting,     setSubmitting]     = useState(false);
  const [formError,      setFormError]      = useState('');
  const [successTickets, setSuccessTickets] = useState(null); // array of ticket numbers on success
  const [showBankInfo,   setShowBankInfo]   = useState(false);
  const [bankSubmitting, setBankSubmitting] = useState(false);
  const [campaignBankDetails, setCampaignBankDetails] = useState(null);

  const fmt = (n) => Number(n).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const fetchCampaign = async () => {
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }
    const supabase = getSupabaseClient();
    const [{ data: rpcData, error: rpcError }, { data: rawRow }] = await Promise.all([
      supabase.rpc('get_fifty_fifty_campaign', { p_campaign_id: id }),
      supabase
        .from('fifty_fifty_campaigns')
        .select('bank_account_name, bank_bsb, bank_account')
        .eq('id', id)
        .single(),
    ]);
    if (rpcError || !rpcData || rpcData.error) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setCampaign(rpcData);
    if (rawRow) {
      setCampaignBankDetails({
        accountName: rawRow.bank_account_name,
        bsb:         rawRow.bank_bsb,
        account:     rawRow.bank_account,
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCampaign();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll jackpot every 30 seconds
  useEffect(() => {
    if (!campaign) return;
    const interval = setInterval(async () => {
      if (!supabaseConfigured) return;
      const { data } = await getSupabaseClient().rpc('get_fifty_fifty_campaign', { p_campaign_id: id });
      if (data && !data.error) setCampaign(data);
    }, 30_000);
    return () => clearInterval(interval);
  }, [campaign, id]);

  // Handle success redirect: load purchased ticket numbers from session
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') !== '1') return;
    // Clear the URL params
    window.history.replaceState({}, '', window.location.pathname);
    // We can't load ticket numbers without the session, but we can show a generic success
    setSuccessTickets([]);
  }, []);

  const ticketsRemaining = campaign?.tickets_remaining ?? null; // null = unlimited
  const isSoldOut        = ticketsRemaining !== null && ticketsRemaining === 0;
  const maxQty           = ticketsRemaining !== null ? Math.min(20, ticketsRemaining) : 20;

  const rawQty       = customQty ? (parseInt(customQty, 10) || 1) : quantity;
  const effectiveQty = Math.max(1, Math.min(rawQty, maxQty));

  const ticketPrice  = campaign ? parseFloat(campaign.ticket_price) : 0;
  const subtotal     = ticketPrice * effectiveQty;
  const txFee        = calcTxFee(subtotal);
  const totalWithFee = subtotal + txFee;
  const isStripe     = campaign?.payment_method === 'stripe';

  const pickedNums = selectionMode === 'pick'
    ? pickedNumbers.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => Number.isInteger(n) && n > 0)
    : [];

  const canSubmit = !isSoldOut && buyerName.trim() && buyerEmail.trim() && effectiveQty >= 1 && effectiveQty <= maxQty
    && (selectionMode === 'auto' || pickedNums.length === effectiveQty);

  const handleStripePurchase = async () => {
    setFormError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/stripe/create-fifty-fifty-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id:      id,
          quantity:         effectiveQty,
          buyer_name:       buyerName.trim(),
          buyer_email:      buyerEmail.trim(),
          buyer_phone:      buyerPhone.trim(),
          selection_mode:   selectionMode,
          specific_numbers: selectionMode === 'pick' ? pickedNums : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.url) {
        setFormError(json.error || 'Something went wrong. Please try again.');
        setSubmitting(false);
        return;
      }
      window.location.href = json.url;
    } catch (err) {
      setFormError('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  const handleBankPurchase = async () => {
    setFormError('');
    setBankSubmitting(true);
    try {
      // Reserve tickets via RPC (bank payment: paid=false initially, organiser marks as paid)
      const { data, error } = await getSupabaseClient().rpc('reserve_fifty_fifty_tickets', {
        p_campaign_id:              id,
        p_quantity:                 effectiveQty,
        p_buyer_name:               buyerName.trim(),
        p_buyer_email:              buyerEmail.trim(),
        p_buyer_phone:              buyerPhone.trim(),
        p_amount_paid:              subtotal,
        p_payment_method:           'bank',
        p_stripe_payment_intent_id: null,
      });
      if (error || data?.error) {
        setFormError(data?.error || error?.message || 'Something went wrong. Please try again.');
        setBankSubmitting(false);
        return;
      }
      setSuccessTickets(data?.ticket_numbers || []);
      setShowBankInfo(true);
      setBankSubmitting(false);
      fetchCampaign();
    } catch (err) {
      setFormError('Something went wrong. Please try again.');
      setBankSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)' }}>
        <div style={{ textAlign: 'center' }}>
          <Logo size={72} />
          <div style={{ marginTop: 20, fontSize: 14, color: 'var(--text2)', fontWeight: 600 }}>Loading…</div>
        </div>
      </div>
    );
  }

  if (notFoundState || (!loading && !campaign)) {
    if (typeof window !== 'undefined') window.location.replace('/404');
    return null;
  }

  // Success state
  if (successTickets !== null) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
        <MarketingNav links={RAFFLE_NAV_LINKS} />
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 900, marginBottom: 8 }}>
            You&apos;re in!
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text2)', marginBottom: 24, lineHeight: 1.6 }}>
            Good luck! Check your email for confirmation.
          </p>

          {showBankInfo && campaign && campaign.payment_method !== 'stripe' && (
            <div className="scratch-card" style={{ padding: 24, marginBottom: 24, textAlign: 'left' }}>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 12 }}>Bank transfer details</div>
              <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12, lineHeight: 1.6 }}>
                Your ticket{successTickets.length !== 1 ? 's are' : ' is'} reserved. Please transfer <strong>${fmt(subtotal)}</strong> to confirm your entry.
              </p>
              {campaignBankDetails?.accountName && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
                  {[
                    ['Account name', campaignBankDetails.accountName],
                    ['BSB', campaignBankDetails.bsb],
                    ['Account number', campaignBankDetails.account],
                    ['Reference', `${buyerName.trim().replace(/\s+/g, '').substring(0, 8).toUpperCase()}-RAFFLE`],
                  ].map(([label, value]) => value ? (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ color: 'var(--text2)', fontWeight: 600 }}>{label}</span>
                      <span style={{ fontWeight: 800 }}>{value}</span>
                    </div>
                  ) : null)}
                </div>
              )}
            </div>
          )}

          {successTickets.length > 0 && campaign && (
            <div style={{ marginBottom: 24, textAlign: 'left' }}>
              <div style={{ fontWeight: 800, marginBottom: 12, fontSize: 15 }}>Your tickets</div>
              {successTickets.map((n) => (
                <RaffleTicketStub key={n} ticketNumber={n} campaignTitle={campaign.title} />
              ))}
            </div>
          )}

          <button className="btn btn-outline" onClick={() => setSuccessTickets(null)}>
            ← Back to raffle
          </button>
        </div>
      </div>
    );
  }

  const isDrawn = campaign.status === 'drawn';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      <MarketingNav links={RAFFLE_NAV_LINKS} />

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* Campaign header */}
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 8 }}>{campaign.emoji || '🎟️'}</div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(22px,4vw,34px)', fontWeight: 900, marginBottom: 8, lineHeight: 1.2 }}>
            {campaign.title}
          </h1>
          {campaign.description && (
            <p style={{ fontSize: 15, color: 'var(--text2)', marginBottom: 12, lineHeight: 1.7, maxWidth: 560, margin: '0 auto 12px' }}>{campaign.description}</p>
          )}
          <span className="tag" style={{ background: '#FEF3C7', color: '#92400E', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            🎟️ 50/50 Raffle
          </span>
        </div>

        {/* Drawn banner */}
        {isDrawn && (
          <div style={{ background: 'linear-gradient(135deg,#FFFBEB,#FEF3C7)', border: '2px solid #F59E0B', borderRadius: 16, padding: '24px 28px', marginBottom: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🏆</div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 900, color: '#92400E', marginBottom: 4 }}>
              This raffle has been drawn!
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#78350F' }}>
              Winning ticket: #{String(campaign.winner_ticket_num).padStart(3, '0')}
            </div>
          </div>
        )}

        {/* Live jackpot hero */}
        {!isDrawn && (
          <div style={{ background: isSoldOut ? 'linear-gradient(135deg,#6B7280,#4B5563)' : 'linear-gradient(135deg,#F59E0B,#D97706)', borderRadius: 20, padding: '32px 28px', marginBottom: 32, textAlign: 'center', color: '#fff', boxShadow: isSoldOut ? '0 8px 32px rgba(0,0,0,.2)' : '0 8px 32px rgba(245,158,11,.35)' }}>
            {isSoldOut ? (
              <>
                <div style={{ fontSize: 40, marginBottom: 8 }}>🎟️</div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 900, marginBottom: 8 }}>Sold out!</div>
                <div style={{ fontSize: 15, opacity: 0.85, lineHeight: 1.5 }}>All tickets have been sold. The draw is coming up!</div>
                <div style={{ marginTop: 16, fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px,6vw,48px)', fontWeight: 900 }}>
                  Jackpot: ${fmt(campaign.jackpot ?? 0)}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.85, marginBottom: 8 }}>Current jackpot</div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(40px,8vw,72px)', fontWeight: 900, lineHeight: 1, marginBottom: 8 }}>
                  ${fmt(campaign.jackpot ?? 0)}
                </div>
                <div style={{ fontSize: 14, opacity: 0.85, lineHeight: 1.5 }}>
                  and growing — buy a ticket to enter!
                </div>
                <div style={{ marginTop: 16, fontSize: 13, opacity: 0.75 }}>
                  {campaign.tickets_sold} ticket{campaign.tickets_sold !== 1 ? 's' : ''} sold at ${fmt(campaign.ticket_price)} each
                  {ticketsRemaining !== null && (
                    <span style={{ marginLeft: 10, fontWeight: 800, opacity: 1, color: ticketsRemaining <= 20 ? '#FDE68A' : 'inherit' }}>
                      ({ticketsRemaining.toLocaleString()} remaining)
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Purchase form */}
        {!isDrawn && !isSoldOut && (
          <div className="scratch-card" style={{ padding: 28, marginBottom: 24 }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 800, marginBottom: 20 }}>Buy tickets</h2>

            {/* Quantity picker */}
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">How many tickets?</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                {QUANTITY_PRESETS.filter((q) => q <= maxQty).map((q) => (
                  <button key={q}
                    onClick={() => { setQuantity(q); setCustomQty(''); }}
                    style={{ padding: '10px 18px', borderRadius: 10, border: `2px solid ${quantity === q && !customQty ? '#F59E0B' : 'var(--border)'}`, background: quantity === q && !customQty ? '#FEF3C7' : 'transparent', fontWeight: 800, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}>
                    {q}
                  </button>
                ))}
                {maxQty > 1 && (
                  <input
                    type="number"
                    min={1}
                    max={maxQty}
                    placeholder="Other"
                    value={customQty}
                    onChange={(e) => setCustomQty(e.target.value)}
                    style={{ width: 90, padding: '10px 14px', borderRadius: 10, border: `2px solid ${customQty ? '#F59E0B' : 'var(--border)'}`, fontWeight: 800, fontSize: 14, fontFamily: 'inherit', background: customQty ? '#FEF3C7' : 'transparent', outline: 'none' }}
                  />
                )}
              </div>
              <p style={{ fontSize: 12, color: 'var(--text2)' }}>
                {ticketsRemaining !== null
                  ? `${ticketsRemaining.toLocaleString()} ticket${ticketsRemaining !== 1 ? 's' : ''} remaining. Maximum ${maxQty} per purchase.`
                  : 'Maximum 20 tickets per purchase.'}
              </p>
            </div>

            {/* Selection mode */}
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Ticket selection</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { mode: 'auto', label: 'Auto-assign' },
                  { mode: 'pick', label: 'Pick my numbers' },
                ].map((opt) => (
                  <button key={opt.mode}
                    onClick={() => setSelectionMode(opt.mode)}
                    style={{ padding: '8px 16px', borderRadius: 8, border: `2px solid ${selectionMode === opt.mode ? '#F59E0B' : 'var(--border)'}`, background: selectionMode === opt.mode ? '#FEF3C7' : 'transparent', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}>
                    {opt.label}
                  </button>
                ))}
              </div>
              {selectionMode === 'pick' && (
                <div style={{ marginTop: 10 }}>
                  <input
                    className="form-input"
                    placeholder={`Enter ${effectiveQty} number${effectiveQty !== 1 ? 's' : ''}, comma-separated (e.g. 7, 13, 42)`}
                    value={pickedNumbers}
                    onChange={(e) => setPickedNumbers(e.target.value)}
                  />
                  {pickedNums.length > 0 && (
                    <p style={{ fontSize: 12, marginTop: 6, color: pickedNums.length === effectiveQty ? 'var(--green)' : 'var(--text2)' }}>
                      {pickedNums.length === effectiveQty
                        ? `Your tickets: ${pickedNums.map((n) => `#${n}`).join(', ')}`
                        : `Select ${effectiveQty} number${effectiveQty !== 1 ? 's' : ''} (${pickedNums.length} selected)`}
                    </p>
                  )}
                </div>
              )}
              {selectionMode === 'auto' && (
                <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 6 }}>
                  Ticket numbers will be assigned automatically in sequence.
                </p>
              )}
            </div>

            {/* Buyer details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
              <div className="form-group">
                <label className="form-label">Your name <span style={{ color: '#CC0000' }}>*</span></label>
                <input className="form-input" placeholder="Jane Smith" maxLength={80} value={buyerName} onChange={(e) => setBuyerName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Email <span style={{ color: '#CC0000' }}>*</span></label>
                <input className="form-input" type="email" placeholder="jane@example.com" maxLength={254} value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 400 }}>(optional)</span></label>
                <input className="form-input" type="tel" placeholder="04XX XXX XXX" maxLength={20} value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} />
              </div>
            </div>

            {/* Total cost */}
            <div style={{ background: 'var(--cream)', borderRadius: 12, padding: '14px 18px', marginBottom: 20, fontSize: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: 'var(--text2)' }}>{effectiveQty} ticket{effectiveQty !== 1 ? 's' : ''} x ${fmt(ticketPrice)}</span>
                <span style={{ fontWeight: 700 }}>${fmt(subtotal)}</span>
              </div>
              {isStripe && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: 'var(--text2)' }}>Transaction fee</span>
                  <span style={{ fontWeight: 700 }}>${fmt(txFee)}</span>
                </div>
              )}
              <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 800 }}>Total</span>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 900, color: '#92400E' }}>
                  ${fmt(isStripe ? totalWithFee : subtotal)}
                </span>
              </div>
            </div>

            {formError && (
              <div style={{ padding: '10px 14px', background: '#FFF0F0', border: '1px solid #FFCCCC', borderRadius: 10, fontSize: 13, color: '#CC0000', marginBottom: 16 }}>{formError}</div>
            )}

            {isStripe ? (
              <button
                className="btn btn-lg"
                style={{ width: '100%', background: '#F59E0B', color: '#fff', border: 'none', justifyContent: 'center' }}
                disabled={!canSubmit || submitting}
                onClick={handleStripePurchase}>
                {submitting ? 'Redirecting to payment…' : `Buy ${effectiveQty} ticket${effectiveQty !== 1 ? 's' : ''} — $${fmt(totalWithFee)}`}
              </button>
            ) : (
              <button
                className="btn btn-lg"
                style={{ width: '100%', background: '#F59E0B', color: '#fff', border: 'none', justifyContent: 'center' }}
                disabled={!canSubmit || bankSubmitting}
                onClick={handleBankPurchase}>
                {bankSubmitting ? 'Reserving tickets…' : `Reserve ${effectiveQty} ticket${effectiveQty !== 1 ? 's' : ''} — pay by bank transfer`}
              </button>
            )}

            {isStripe && (
              <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text2)', marginTop: 12 }}>
                Secure payment via Stripe. Your card details are never stored by Lucky Squares.
              </p>
            )}
          </div>
        )}

        {/* How 50/50 works */}
        <div className="scratch-card" style={{ padding: 24 }}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 12 }}>How 50/50 raffles work</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { icon: '🎟️', text: 'Buy one or more tickets. Every ticket is a chance to win.' },
              { icon: '📈', text: 'The jackpot grows with every ticket sold. Half the total goes to the winner.' },
              { icon: '🎲', text: 'When the organiser runs the draw, one lucky ticket is randomly selected.' },
              { icon: '🏆', text: 'The winner receives 50% of total ticket sales. The organisation keeps the other 50%.' },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
                <span style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
