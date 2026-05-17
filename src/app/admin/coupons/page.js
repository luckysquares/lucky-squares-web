'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient, supabaseConfigured } from '@/lib/supabase/client';

const ADJECTIVES = ['LUCKY','GOLDEN','SPRING','SUPER','MEGA','GREAT','HAPPY','WILD'];
const NOUNS      = ['SQUARES','DRAW','WIN','CHANCE','PRIZE','RAFFLE','FUNDS'];

function randomCode() {
  const adj  = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num  = String(Math.floor(Math.random() * 90) + 10);
  return `${adj}${noun}${num}`;
}

export default function AdminCoupons() {
  const [coupons,  setCoupons]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [form,     setForm]     = useState({ code: '', description: '', discount_type: 'percent', discount_value: '100', max_uses: '1', expires_at: '' });
  const [formErr,  setFormErr]  = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    if (!supabaseConfigured) { setCoupons(DEMO_COUPONS); setLoading(false); return; }
    const { data } = await getSupabaseClient().rpc('admin_get_coupons');
    setCoupons(data ?? []); setLoading(false);
  };

  const fld = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleCreate = async () => {
    if (!form.code.trim()) { setFormErr('Coupon code is required.'); return; }
    if (!form.discount_value || isNaN(Number(form.discount_value)) || Number(form.discount_value) <= 0) { setFormErr('Enter a valid discount value.'); return; }
    setSaving(true); setFormErr('');
    if (supabaseConfigured) {
      const { error } = await getSupabaseClient().rpc('admin_create_coupon', {
        p_code:           form.code.trim().toUpperCase(),
        p_description:    form.description.trim() || null,
        p_discount_type:  form.discount_type,
        p_discount_value: Number(form.discount_value),
        p_max_uses:       form.max_uses ? Number(form.max_uses) : null,
        p_expires_at:     form.expires_at || null,
      });
      if (error) { setFormErr(error.message); setSaving(false); return; }
    } else {
      setCoupons((prev) => [{
        id: String(Date.now()), code: form.code.toUpperCase(), description: form.description,
        discount_type: form.discount_type, discount_value: Number(form.discount_value),
        max_uses: form.max_uses ? Number(form.max_uses) : null, uses_count: 0,
        expires_at: form.expires_at || null, active: true, created_at: new Date().toISOString(),
      }, ...prev]);
    }
    await load();
    setForm({ code: '', description: '', discount_type: 'percent', discount_value: '100', max_uses: '1', expires_at: '' });
    setShowForm(false); setSaving(false);
  };

  const deactivate = async (id) => {
    if (!confirm('Deactivate this coupon? It cannot be used again.')) return;
    if (supabaseConfigured) await getSupabaseClient().rpc('admin_deactivate_coupon', { p_id: id });
    setCoupons((prev) => prev.map((c) => c.id === id ? { ...c, active: false } : c));
  };

  const fmtDiscount = (c) => c.discount_type === 'percent' ? `${c.discount_value}% off` : `$${c.discount_value} off`;
  const isExpired   = (c) => c.expires_at && new Date(c.expires_at) < new Date();
  const isExhausted = (c) => c.max_uses !== null && c.uses_count >= c.max_uses;

  const active   = coupons.filter((c) => c.active && !isExpired(c) && !isExhausted(c));
  const inactive = coupons.filter((c) => !c.active || isExpired(c) || isExhausted(c));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 900, marginBottom: 4 }}>Coupons</h1>
          <p style={{ fontSize: 14, color: 'var(--text2)' }}>Create and manage discount codes</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setForm((p) => ({ ...p, code: randomCode() })); }}>+ New coupon</button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="scratch-card" style={{ padding: 28, marginBottom: 28 }}>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 800, marginBottom: 20 }}>New coupon</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--text2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>Code</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="form-input" value={form.code} onChange={(e) => fld('code', e.target.value.toUpperCase())} placeholder="e.g. LUCKY2026" style={{ flex: 1, letterSpacing: 1, fontWeight: 700 }} maxLength={32} />
                <button className="btn btn-outline btn-sm" onClick={() => fld('code', randomCode())} title="Generate random code">🎲</button>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--text2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>Discount type</label>
              <select className="form-input" value={form.discount_type} onChange={(e) => fld('discount_type', e.target.value)}>
                <option value="percent">Percentage off</option>
                <option value="fixed">Fixed dollar off</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--text2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>{form.discount_type === 'percent' ? 'Discount %' : 'Discount $'}</label>
              <input className="form-input" type="number" min={1} max={form.discount_type === 'percent' ? 100 : undefined} value={form.discount_value} onChange={(e) => fld('discount_value', e.target.value)} placeholder={form.discount_type === 'percent' ? '100' : '19'} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--text2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>Max uses (blank = unlimited)</label>
              <input className="form-input" type="number" min={1} value={form.max_uses} onChange={(e) => fld('max_uses', e.target.value)} placeholder="e.g. 1" />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--text2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>Expiry date (optional)</label>
              <input className="form-input" type="date" value={form.expires_at} onChange={(e) => fld('expires_at', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--text2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>Internal note</label>
              <input className="form-input" value={form.description} onChange={(e) => fld('description', e.target.value)} placeholder="e.g. Sunbury Primary free launch" />
            </div>
          </div>
          {formErr && <p style={{ fontSize: 13, color: '#CC0000', marginBottom: 12 }}>{formErr}</p>}
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-outline" onClick={() => { setShowForm(false); setFormErr(''); }}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>{saving ? 'Creating…' : 'Create coupon'}</button>
          </div>
        </div>
      )}

      {loading ? <div style={{ color: 'var(--text2)' }}>Loading…</div> : (
        <>
          <CouponTable title="Active" coupons={active} fmtDiscount={fmtDiscount} onDeactivate={deactivate} />
          {inactive.length > 0 && <CouponTable title="Inactive / expired / exhausted" coupons={inactive} fmtDiscount={fmtDiscount} />}
        </>
      )}
    </div>
  );
}

function CouponTable({ title, coupons, fmtDiscount, onDeactivate }) {
  if (!coupons.length) return null;
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-AU') : '—';
  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text2)', marginBottom: 12 }}>{title} ({coupons.length})</div>
      <div className="scratch-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--cream)', borderBottom: '1px solid var(--border)' }}>
              {['Code','Discount','Uses','Max uses','Expires','Note','Created',''].map((h) => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: .5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id} style={{ borderBottom: '1px solid var(--border)', opacity: !c.active ? .5 : 1 }}>
                <td style={{ padding: '12px 16px', fontWeight: 800, letterSpacing: 1, fontFamily: 'monospace', fontSize: 13 }}>{c.code}</td>
                <td style={{ padding: '12px 16px', color: 'var(--green)', fontWeight: 700 }}>{fmtDiscount(c)}</td>
                <td style={{ padding: '12px 16px', fontWeight: 700 }}>{c.uses_count}</td>
                <td style={{ padding: '12px 16px' }}>{c.max_uses ?? '∞'}</td>
                <td style={{ padding: '12px 16px', color: c.expires_at && new Date(c.expires_at) < new Date() ? '#CC0000' : 'inherit' }}>{fmtDate(c.expires_at)}</td>
                <td style={{ padding: '12px 16px', color: 'var(--text2)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.description ?? '—'}</td>
                <td style={{ padding: '12px 16px', color: 'var(--text2)' }}>{fmtDate(c.created_at)}</td>
                <td style={{ padding: '12px 16px' }}>
                  {onDeactivate && c.active && (
                    <button className="btn btn-outline btn-sm" style={{ color: '#CC0000', borderColor: '#FFCCCC' }} onClick={() => onDeactivate(c.id)}>Deactivate</button>
                  )}
                  {!c.active && <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700 }}>Inactive</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const DEMO_COUPONS = [
  { id: '1', code: 'SUNBURY2026', description: 'Sunbury Primary free launch',    discount_type: 'percent', discount_value: 100, max_uses: 1,    uses_count: 0, expires_at: null,                                           active: true,  created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: '2', code: 'LUCKYSOCIAL50', description: 'Instagram promo — 50% off',   discount_type: 'percent', discount_value: 50,  max_uses: 20,   uses_count: 7, expires_at: new Date(Date.now() + 14 * 86400000).toISOString(), active: true,  created_at: new Date(Date.now() - 5 * 86400000).toISOString() },
  { id: '3', code: 'FRIEND2026',   description: 'Friends and family promo',      discount_type: 'fixed',   discount_value: 19,  max_uses: 5,    uses_count: 5, expires_at: null,                                           active: false, created_at: new Date(Date.now() - 30 * 86400000).toISOString() },
];
