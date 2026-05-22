'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient, supabaseConfigured } from '@/lib/supabase/client';
import { adminFetch } from '@/lib/adminFetch';

const STATUS_COLOURS = { active: 'tag-green', drawn: 'tag-drawn', draft: 'tag-muted', cancelled: 'tag-muted' };
const STATUS_LABELS  = { active: '● Live', drawn: '🏆 Drawn', draft: 'Draft', cancelled: 'Cancelled' };

const PAYMENT_LABELS = {
  stripe:        'Online card (Stripe)',
  bank:          'Bank transfer',
  bank_inperson: 'In person + bank transfer',
  inperson:      'In person',
};

export default function AdminCampaigns() {
  const [campaigns,      setCampaigns]      = useState([]);
  const [payouts,        setPayouts]        = useState([]);
  const [reports,        setReports]        = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState('');
  const [filter,         setFilter]         = useState('all');
  const [editing,        setEditing]        = useState(null);
  const [saving,         setSaving]         = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [buyModal,       setBuyModal]       = useState(null);
  const [buyNum,         setBuyNum]         = useState('');
  const [buyMsg,         setBuyMsg]         = useState('');
  const [giftRedirecting, setGiftRedirecting] = useState(false);
  const [payoutNotes,  setPayoutNotes]  = useState('');
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    load();
    const params = new URLSearchParams(window.location.search);
    if (params.get('gift_success') === '1') {
      window.history.replaceState({}, '', window.location.pathname);
      alert('Payment successful — the square has been gifted.');
    }
  }, []);

  const load = async () => {
    setLoading(true);
    if (!supabaseConfigured) {
      setCampaigns(DEMO_CAMPAIGNS);
      setPayouts(DEMO_PAYOUTS);
      setLoading(false);
      return;
    }
    const [{ data: camps }, { data: pq }, rpts] = await Promise.all([
      getSupabaseClient().rpc('admin_get_fundraisers'),
      getSupabaseClient().rpc('admin_get_payout_queue', { p_status: 'pending' }),
      adminFetch('/api/admin/campaigns/reports'),
    ]);
    setCampaigns(camps ?? []);
    setPayouts(pq ?? []);
    setReports(Array.isArray(rpts) ? rpts : []);
    setLoading(false);
  };

  const markProcessed = async (id) => {
    setProcessingId(id);
    if (supabaseConfigured) {
      await getSupabaseClient().rpc('admin_mark_payout_processed', {
        p_id: id,
        p_notes: payoutNotes || null,
      });
    }
    setPayouts((prev) => prev.filter((p) => p.id !== id));
    setProcessingId(null);
    setPayoutNotes('');
  };

  const filtered = campaigns.filter((c) => {
    const matchSearch = !search || [c.title, c.org, c.contact_name, c.contact_email].some((f) => f?.toLowerCase().includes(search.toLowerCase()));
    const matchFilter = filter === 'all' || c.status === filter;
    return matchSearch && matchFilter;
  });

  const daysLive = (c) => c.launched_at ? Math.floor((Date.now() - new Date(c.launched_at).getTime()) / 86400000) : null;

  const handleImageUpload = async (file) => {
    if (!file || !editing) return;
    if (file.size > 5 * 1024 * 1024) { alert('Please choose an image under 5 MB.'); return; }
    setImageUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('fundraiser_id', editing.id);
    const res = await adminFetch('/api/admin/campaigns/upload', { method: 'POST', body: fd });
    const json = await res.json();
    if (!res.ok || json.error) { alert('Upload failed: ' + (json.error || 'Unknown error')); setImageUploading(false); return; }
    setEditing((p) => ({ ...p, image_url: json.url }));
    setImageUploading(false);
  };

  const saveEdit = async () => {
    setSaving(true);
    if (supabaseConfigured) {
      await getSupabaseClient().rpc('admin_update_fundraiser', {
        p_id: editing.id, p_title: editing.title, p_org: editing.org,
        p_contact_name: editing.contact_name, p_contact_email: editing.contact_email,
        p_contact_phone: editing.contact_phone, p_description: editing.description,
        p_image_url: editing.image_url ?? null,
        p_image_focal_y: editing.image_focal_y ?? 50,
      });
    }
    setCampaigns((prev) => prev.map((c) => c.id === editing.id ? { ...c, ...editing } : c));
    setEditing(null); setSaving(false);
  };

  const openBuyModal = async (campaign) => {
    if (!supabaseConfigured) { setBuyModal({ campaign, squares: [] }); return; }
    const { data } = await getSupabaseClient()
      .from('squares')
      .select('number, status, buyer_name, is_sponsored')
      .eq('fundraiser_id', campaign.id)
      .eq('status', 'available')
      .order('number');
    setBuyModal({ campaign, squares: data ?? [] });
    setBuyNum(''); setBuyMsg('');
  };

  const giftSquare = async () => {
    const num = parseInt(buyNum);
    if (!num || isNaN(num)) return;
    setGiftRedirecting(true);
    try {
      const res = await fetch('/api/stripe/create-gift-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fundraiser_id: buyModal.campaign.id, square_number: num }),
      });
      const { url, error } = await res.json();
      if (error || !url) {
        alert(error || 'Could not start payment. Please try again.');
        setGiftRedirecting(false);
        return;
      }
      window.location.href = url;
    } catch {
      alert('Could not start payment. Please try again.');
      setGiftRedirecting(false);
    }
  };

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 900, marginBottom: 4 }}>Campaigns</h1>
      <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 28 }}>All fundraisers across the platform</p>

      {/* Campaign Reports */}
      {reports.length > 0 && (
        <div style={{ marginBottom: 36, background: '#FFF2F2', border: '2px solid #FCA5A5', borderRadius: 16, padding: '24px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 22 }}>🚩</span>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 900, margin: 0, color: '#991B1B' }}>
              Campaign Reports ({reports.length})
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {reports.map((r) => (
              <div key={r.id} style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', border: '1px solid #FECACA' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 2 }}>{r.fundraisers?.title ?? r.fundraiser_id}</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>{r.fundraisers?.org} · {r.fundraisers?.status}</div>
                    <div style={{ fontSize: 12 }}>
                      <span style={{ fontWeight: 700 }}>{r.reason.replace(/_/g, ' ')}</span>
                      {r.details && <span style={{ color: 'var(--text2)' }}> — {r.details}</span>}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                    {new Date(r.created_at).toLocaleDateString('en-AU')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Payouts */}
      {payouts.length > 0 && (
        <div style={{ marginBottom: 36, background: '#FFF8EC', border: '2px solid #F59E0B', borderRadius: 16, padding: '24px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 22 }}>💸</span>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 900, margin: 0, color: '#92400E' }}>
              Pending Payouts ({payouts.length})
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {payouts.map((p) => {
              const needsTransfer = p.payment_method === 'stripe';
              return (
                <div key={p.id} style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', border: '1px solid #FDE68A' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>{p.campaign_title}</div>
                      <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 6 }}>
                        {p.org_name} · {p.contact_name} · {p.contact_email}
                      </div>
                      <div style={{ display: 'flex', gap: 16, fontSize: 13, flexWrap: 'wrap' }}>
                        <span><strong>{p.sold_count}</strong> squares sold</span>
                        <span style={{ fontWeight: 800, color: '#065F46' }}>${Number(p.funds_raised ?? 0).toLocaleString('en-AU', { minimumFractionDigits: 2 })} raised</span>
                        <span>{PAYMENT_LABELS[p.payment_method] ?? p.payment_method}</span>
                        <span style={{ color: 'var(--text2)' }}>Drawn {new Date(p.drawn_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                      {(p.payout_bsb || p.payout_account) && (
                        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text2)', background: 'var(--cream)', borderRadius: 8, padding: '8px 12px', display: 'inline-block' }}>
                          {p.payout_bank_name && <span style={{ marginRight: 12 }}>Account: {p.payout_bank_name}</span>}
                          {p.payout_bsb && <span style={{ marginRight: 12 }}>BSB: {p.payout_bsb}</span>}
                          {p.payout_account && <span>Acct: {p.payout_account}</span>}
                        </div>
                      )}
                      {needsTransfer && (
                        <div style={{ marginTop: 8, fontSize: 12, fontWeight: 800, color: '#B45309', background: '#FEF3C7', borderRadius: 6, padding: '4px 10px', display: 'inline-block' }}>
                          Action required: transfer funds to organiser
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 180 }}>
                      <input
                        className="form-input"
                        placeholder="Notes (optional)"
                        value={processingId === p.id ? payoutNotes : ''}
                        onChange={(e) => { setProcessingId(p.id); setPayoutNotes(e.target.value); }}
                        style={{ fontSize: 12 }}
                      />
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => markProcessed(p.id)}
                        disabled={processingId === p.id && processingId !== null && payoutNotes === '' && false}
                      >
                        {processingId === p.id ? 'Processing…' : '✓ Mark as processed'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <input className="form-input" placeholder="Search title, org, contact…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 300 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          {['all','active','drawn','draft','cancelled'].map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-outline'}`} style={{ textTransform: 'capitalize' }}>{s}</button>
          ))}
        </div>
      </div>

      {loading ? <div style={{ color: 'var(--text2)' }}>Loading…</div> : (
        <>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12, fontWeight: 700 }}>{filtered.length} campaign{filtered.length !== 1 ? 's' : ''}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map((c) => {
              const days = daysLive(c);
              const remaining = days !== null ? Math.max(0, 30 - days) : null;
              const revenue = c.sold_count * c.price_per_sq;
              return (
                <div key={c.id} className="scratch-card" style={{ padding: '20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 28 }}>{c.emoji}</div>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 700 }}>{c.title}</span>
                        <span className={`tag ${STATUS_COLOURS[c.status] ?? 'tag-muted'}`}>{STATUS_LABELS[c.status] ?? c.status}</span>
                        {remaining !== null && c.status === 'active' && remaining <= 7 && (
                          <span className="tag" style={{ background: '#FFF6EE', color: 'var(--orange)', border: '1px solid #FFD8B0' }}>⏰ {remaining}d left</span>
                        )}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>{c.org} · {c.contact_name} · {c.contact_email}</div>
                      <div style={{ display: 'flex', gap: 20, fontSize: 13, flexWrap: 'wrap' }}>
                        <span>{c.grid_size} squares · ${c.price_per_sq}/sq</span>
                        <span><strong>{c.sold_count}</strong> sold · <strong>${revenue.toLocaleString()}</strong> raised</span>
                        <span style={{ textTransform: 'capitalize' }}>{c.payment_method?.replace('_', ' + ')}</span>
                        {days !== null && <span>{days} days live</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      {c.status === 'active' && (
                        <button className="btn btn-outline btn-sm" onClick={() => openBuyModal(c)}>🍀 Gift square</button>
                      )}
                      <button className="btn btn-outline btn-sm" onClick={() => setEditing({ ...c })}>Edit</button>
                    </div>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && <div style={{ color: 'var(--text2)', fontSize: 14, padding: '40px 0', textAlign: 'center' }}>No campaigns match your search.</div>}
          </div>
        </>
      )}

      {/* Edit modal */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
          <div className="scratch-card" style={{ padding: 36, maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 800, marginBottom: 24 }}>Edit campaign</h2>
            {[
              ['Title',         'title'],
              ['Organisation',  'org'],
              ['Contact name',  'contact_name'],
              ['Contact email', 'contact_email'],
              ['Contact phone', 'contact_phone'],
            ].map(([label, field]) => (
              <div key={field} style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--text2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>{label}</label>
                <input className="form-input" value={editing[field] ?? ''} onChange={(e) => setEditing((p) => ({ ...p, [field]: e.target.value }))} />
              </div>
            ))}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--text2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>Campaign photo</label>
              {editing.image_url && (
                <img src={editing.image_url} alt="Campaign" style={{ width: '100%', height: 140, objectFit: 'cover', objectPosition: `center ${editing.image_focal_y ?? 50}%`, borderRadius: 10, marginBottom: 8, display: 'block' }} />
              )}
              <label style={{ display: 'inline-block', cursor: 'pointer' }}>
                <span className="btn btn-outline btn-sm">{imageUploading ? 'Uploading…' : editing.image_url ? 'Replace image' : 'Upload image'}</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} disabled={imageUploading} onChange={(e) => e.target.files[0] && handleImageUpload(e.target.files[0])} />
              </label>
              {editing.image_url && (
                <div style={{ marginTop: 10 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>Image position</span>
                    <span>{(editing.image_focal_y ?? 50) < 40 ? 'Upper' : (editing.image_focal_y ?? 50) > 60 ? 'Lower' : 'Centre'}</span>
                  </label>
                  <input type="range" min={0} max={100} value={editing.image_focal_y ?? 50} onChange={(e) => setEditing((p) => ({ ...p, image_focal_y: Number(e.target.value) }))} style={{ width: '100%', accentColor: 'var(--purple)' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                    <span>Top</span><span>Bottom</span>
                  </div>
                </div>
              )}
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--text2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>Description</label>
              <textarea className="form-input" rows={3} value={editing.description ?? ''} onChange={(e) => setEditing((p) => ({ ...p, description: e.target.value }))} style={{ resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={saveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Gift square modal */}
      {buyModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
          <div className="scratch-card" style={{ padding: 36, maxWidth: 440, width: '100%' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 800, marginBottom: 8 }}>🍀 Gift a square</h2>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20, lineHeight: 1.6 }}>
              Choose an available square to gift to <strong>{buyModal.campaign.title}</strong>. It will appear as a rainbow square on their grid.
            </p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--text2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>Square number</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="form-input" type="number" min={1} max={buyModal.campaign.grid_size} placeholder={`1 – ${buyModal.campaign.grid_size}`} value={buyNum} onChange={(e) => setBuyNum(e.target.value)} style={{ flex: 1 }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 6 }}>
                {buyModal.squares.length} available square{buyModal.squares.length !== 1 ? 's' : ''}: {buyModal.squares.slice(0,20).map((s) => s.number).join(', ')}{buyModal.squares.length > 20 ? '…' : ''}
              </div>
            </div>
            {buyNum && (() => {
              const price = parseFloat(buyModal.campaign.price_per_sq) || 0;
              const fee = price * 0.0175 + 0.30;
              const total = (price + fee).toFixed(2);
              return (
                <div style={{ background: 'var(--cream)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>Square #{buyNum}</span><span>${price.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text2)', marginBottom: 8 }}>
                    <span>Transaction fee (1.75% + $0.30)</span><span>${fee.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                    <span>Total</span><span>${total}</span>
                  </div>
                </div>
              );
            })()}
            <button className="btn btn-primary" style={{ width: '100%', marginBottom: 10 }} onClick={giftSquare} disabled={!buyNum || giftRedirecting}>
              {giftRedirecting ? 'Redirecting to payment…' : `Pay now${buyNum ? ` — $${((parseFloat(buyModal.campaign.price_per_sq) || 0) * 1.0175 + 0.30).toFixed(2)}` : ''}`}
            </button>
            <button className="btn btn-outline" style={{ width: '100%' }} onClick={() => { setBuyModal(null); setBuyMsg(''); setGiftRedirecting(false); }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

const DEMO_CAMPAIGNS = [
  { id: '1', emoji: '🐨', title: 'Koala Rescue Raffle', org: 'Wildlife Friends', contact_name: 'Priya S.', contact_email: 'priya@wildlife.org.au', contact_phone: '0412 345 678', status: 'active',  grid_size: 100, price_per_sq: 10, sold_count: 63, payment_method: 'stripe',       launched_at: new Date(Date.now() - 22 * 86400000).toISOString(), description: 'Raising funds for koala habitat restoration.' },
  { id: '2', emoji: '🎪', title: 'School Fete Lucky Dip', org: 'Sunbury Primary P&C', contact_name: 'Mel T.', contact_email: 'mel@sunburyprimary.edu.au', contact_phone: '0423 456 789', status: 'active', grid_size: 50, price_per_sq: 15, sold_count: 31, payment_method: 'bank', launched_at: new Date(Date.now() - 8 * 86400000).toISOString(), description: 'School camp fundraiser.' },
  { id: '3', emoji: '🏉', title: 'Footy Club Finals Fund', org: 'Werribee Eagles AFC', contact_name: 'Dave K.', contact_email: 'dave@werribeeeagles.com.au', contact_phone: '0434 567 890', status: 'drawn',  grid_size: 25, price_per_sq: 20, sold_count: 25, payment_method: 'bank',   launched_at: new Date(Date.now() - 35 * 86400000).toISOString(), description: 'Finals trip fund.' },
];

const DEMO_PAYOUTS = [
  { id: 'p1', fundraiser_id: '3', campaign_title: 'Footy Club Finals Fund', org_name: 'Werribee Eagles AFC', contact_name: 'Dave K.', contact_email: 'dave@werribeeeagles.com.au', payment_method: 'bank', sold_count: 25, funds_raised: 500, drawn_at: new Date(Date.now() - 2 * 86400000).toISOString(), payout_bank_name: 'Werribee Eagles AFC', payout_bsb: '033-000', payout_account: '87654321', status: 'pending', notes: null },
];
