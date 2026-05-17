'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient, supabaseConfigured } from '@/lib/supabase/client';

const STATUS_COLOURS = { active: 'tag-green', drawn: 'tag-drawn', draft: 'tag-muted', cancelled: 'tag-muted' };
const STATUS_LABELS  = { active: '● Live', drawn: '🏆 Drawn', draft: 'Draft', cancelled: 'Cancelled' };

export default function AdminCampaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [filter,    setFilter]    = useState('all');
  const [editing,   setEditing]   = useState(null); // campaign being edited
  const [saving,    setSaving]    = useState(false);
  const [buyModal,  setBuyModal]  = useState(null); // { campaign, squares }
  const [buyNum,    setBuyNum]    = useState('');
  const [buyMsg,    setBuyMsg]    = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    if (!supabaseConfigured) { setCampaigns(DEMO_CAMPAIGNS); setLoading(false); return; }
    const { data } = await getSupabaseClient().rpc('admin_get_fundraisers');
    setCampaigns(data ?? []); setLoading(false);
  };

  const filtered = campaigns.filter((c) => {
    const matchSearch = !search || [c.title, c.org, c.contact_name, c.contact_email].some((f) => f?.toLowerCase().includes(search.toLowerCase()));
    const matchFilter = filter === 'all' || c.status === filter;
    return matchSearch && matchFilter;
  });

  const daysLive = (c) => c.launched_at ? Math.floor((Date.now() - new Date(c.launched_at).getTime()) / 86400000) : null;

  const saveEdit = async () => {
    setSaving(true);
    if (supabaseConfigured) {
      await getSupabaseClient().rpc('admin_update_fundraiser', {
        p_id: editing.id, p_title: editing.title, p_org: editing.org,
        p_contact_name: editing.contact_name, p_contact_email: editing.contact_email,
        p_contact_phone: editing.contact_phone, p_description: editing.description,
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
    if (supabaseConfigured) {
      await getSupabaseClient().rpc('admin_gift_square', { p_fundraiser_id: buyModal.campaign.id, p_square_number: num });
    }
    setBuyMsg(`Square #${num} gifted successfully.`);
    setBuyNum('');
    setBuyModal((prev) => ({ ...prev, squares: prev.squares.filter((s) => s.number !== num) }));
  };

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 900, marginBottom: 4 }}>Campaigns</h1>
      <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 28 }}>All fundraisers across the platform</p>

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
                <button className="btn btn-primary" onClick={giftSquare} disabled={!buyNum}>Gift it</button>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 6 }}>
                {buyModal.squares.length} available square{buyModal.squares.length !== 1 ? 's' : ''}: {buyModal.squares.slice(0,20).map((s) => s.number).join(', ')}{buyModal.squares.length > 20 ? '…' : ''}
              </div>
            </div>
            {buyMsg && <p style={{ fontSize: 13, color: 'var(--green)', fontWeight: 700, marginBottom: 16 }}>✓ {buyMsg}</p>}
            <button className="btn btn-outline" style={{ width: '100%' }} onClick={() => { setBuyModal(null); setBuyMsg(''); }}>Close</button>
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
