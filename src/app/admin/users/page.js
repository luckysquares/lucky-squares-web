'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient, supabaseConfigured } from '@/lib/supabase/client';
import { adminFetch } from '@/lib/adminFetch';

const PLAN_LABELS  = { trial: 'Trial', casual: 'Casual', org: 'Organisation' };
const PLAN_COLOURS = { trial: 'tag-muted', casual: 'tag-green', org: 'tag-drawn' };

export default function AdminUsers() {
  const [users,        setUsers]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [editing,      setEditing]      = useState(null);
  const [saving,       setSaving]       = useState(false);
  const [suspendModal, setSuspendModal] = useState(null); // user being suspended
  const [suspendReason,setSuspendReason]= useState('');
  const [suspending,   setSuspending]   = useState(false);
  const [sendingCoupon,setSendingCoupon]= useState(null); // user_id of in-flight coupon send
  const [couponSent,   setCouponSent]   = useState({});   // { [user_id]: coupon_code }

  useEffect(() => {
    if (!supabaseConfigured) { setUsers(DEMO_USERS); setLoading(false); return; }
    getSupabaseClient().rpc('admin_get_profiles').then(({ data }) => {
      setUsers(data ?? []); setLoading(false);
    });
  }, []);

  const filtered = users.filter((u) =>
    !search || [u.email, u.full_name].some((f) => f?.toLowerCase().includes(search.toLowerCase()))
  );

  const fmtDate = (d) => new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });

  const saveUser = async () => {
    setSaving(true);
    try {
      if (supabaseConfigured) {
        const { error } = await getSupabaseClient().rpc('admin_update_profile', {
          p_id: editing.id, p_full_name: editing.full_name, p_plan: editing.plan,
        });
        if (error) { alert(`Save failed: ${error.message}`); return; }
      }
      setUsers((prev) => prev.map((u) => u.id === editing.id ? { ...u, ...editing } : u));
      setEditing(null);
    } catch (e) {
      alert(`Save failed: ${e?.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const doSuspend = async () => {
    if (!suspendReason.trim()) return;
    setSuspending(true);
    if (supabaseConfigured) {
      await getSupabaseClient().rpc('admin_suspend_user', {
        p_user_id: suspendModal.id, p_reason: suspendReason.trim(),
      });
      // Notify the user their account has been suspended.
      if (suspendModal.email) {
        const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (supabaseUrl && supabaseAnon) {
          fetch(`${supabaseUrl}/functions/v1/transactional-email`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseAnon}` },
            body: JSON.stringify({
              type: 'account_suspended',
              to:   suspendModal.email,
              data: {
                first_name: (suspendModal.full_name || 'there').split(' ')[0],
                reason:     suspendReason.trim(),
              },
            }),
          }).catch(() => {});
        }
      }
    }
    setUsers((prev) => prev.map((u) =>
      u.id === suspendModal.id
        ? { ...u, suspended: true, suspension_reason: suspendReason.trim(), suspended_at: new Date().toISOString() }
        : u
    ));
    setSuspendModal(null); setSuspendReason(''); setSuspending(false);
  };

  const doUnsuspend = async (userId) => {
    if (!supabaseConfigured) {
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, suspended: false, suspension_reason: null } : u));
      return;
    }
    await getSupabaseClient().rpc('admin_unsuspend_user', { p_user_id: userId });
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, suspended: false, suspension_reason: null } : u));
  };

  const sendWelcomeCoupon = async (u) => {
    if (!confirm(`Send a free campaign coupon to ${u.full_name || u.email}?`)) return;
    setSendingCoupon(u.id);
    try {
      const res  = await adminFetch('/api/admin/send-welcome-coupon', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ user_id: u.id, email: u.email, first_name: u.full_name }),
      });
      const json = await res.json();
      if (!res.ok) { alert(`Failed: ${json.error}`); return; }
      setCouponSent((prev) => ({ ...prev, [u.id]: json.coupon_code }));
    } catch (e) {
      alert(`Error: ${e.message}`);
    } finally {
      setSendingCoupon(null);
    }
  };

  const toggleFoundingMember = async (u) => {
    const newVal = !u.is_founding_member;
    if (supabaseConfigured) {
      await getSupabaseClient().rpc('admin_set_founding_member', { p_user_id: u.id, p_value: newVal });
    }
    setUsers((prev) => prev.map((p) => p.id === u.id ? { ...p, is_founding_member: newVal } : p));
  };

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 900, marginBottom: 4 }}>Users</h1>
      <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 28 }}>Organiser accounts across the platform</p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <input className="form-input" placeholder="Search name or email…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 360 }} />
      </div>

      <div style={{ background: '#F0FBF6', border: '1px solid #C8E8D8', borderRadius: 10, padding: '12px 16px', marginBottom: 24, fontSize: 13, color: 'var(--text2)' }}>
        <strong style={{ color: 'var(--text)' }}>Editing buyer details:</strong> To correct a buyer's name, email, or phone on a specific square, open the relevant campaign on the Campaigns page and use the buyer edit function there.
      </div>

      {loading ? <div style={{ color: 'var(--text2)' }}>Loading…</div> : (
        <>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12, fontWeight: 700 }}>{filtered.length} user{filtered.length !== 1 ? 's' : ''}</div>
          <div className="scratch-card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--cream)', borderBottom: '1px solid var(--border)' }}>
                  {['Name', 'Email', 'Plan', 'Status', 'Joined', ''].map((h) => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: .5 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border)', background: u.suspended ? '#FFF8F8' : 'transparent' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {u.full_name || '—'}
                        {u.is_founding_member && (
                          <span style={{ fontSize: 10, fontWeight: 800, color: '#92400E', background: '#FEF3C7', border: '1.5px solid #F59E0B', borderRadius: 20, padding: '2px 8px', letterSpacing: '0.5px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Founding Member</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <a href={`mailto:${u.email}`} style={{ color: 'var(--green)', fontWeight: 600 }}>{u.email}</a>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {u.is_admin
                        ? <span className="tag" style={{ background: 'var(--purple-tint)', color: 'var(--purple-text)', border: '1px solid var(--purple-tint-border)', fontSize: 11, fontWeight: 800 }}>Admin</span>
                        : <span className={`tag ${PLAN_COLOURS[u.plan] ?? 'tag-muted'}`} style={{ fontSize: 11 }}>{PLAN_LABELS[u.plan] ?? u.plan}</span>
                      }
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {u.suspended ? (
                        <div>
                          <span className="tag" style={{ background: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5', fontSize: 11 }}>Suspended</span>
                          {u.suspension_reason && (
                            <div style={{ fontSize: 11, color: '#991B1B', marginTop: 4, maxWidth: 180 }}>{u.suspension_reason}</div>
                          )}
                        </div>
                      ) : (
                        <span className="tag tag-green" style={{ fontSize: 11 }}>Active</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text2)' }}>{fmtDate(u.created_at)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {u.is_admin ? (
                          <span style={{ fontSize: 11, color: 'var(--text2)', fontStyle: 'italic', alignSelf: 'center' }}>Manage in Supabase</span>
                        ) : (
                          <>
                            <button className="btn btn-outline btn-sm" onClick={() => setEditing({ ...u })}>Edit</button>
                            {u.plan === 'trial' && !u.suspended && (
                              couponSent[u.id] ? (
                                <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700, alignSelf: 'center' }} title={`Coupon: ${couponSent[u.id]}`}>✓ Coupon sent</span>
                              ) : (
                                <button
                                  className="btn btn-sm"
                                  style={{ background: '#F0FBF6', color: '#1A7A55', border: '1px solid #A8DFBF', fontSize: 11 }}
                                  onClick={() => sendWelcomeCoupon(u)}
                                  disabled={sendingCoupon === u.id}
                                >
                                  {sendingCoupon === u.id ? 'Sending…' : '🎁 Send coupon'}
                                </button>
                              )
                            )}
                            <button
                              className="btn btn-sm"
                              style={{ background: u.is_founding_member ? '#FEF3C7' : '#F9FAFB', color: u.is_founding_member ? '#92400E' : '#6B7280', border: `1px solid ${u.is_founding_member ? '#F59E0B' : '#D1D5DB'}`, fontSize: 11 }}
                              onClick={() => toggleFoundingMember(u)}
                            >
                              {u.is_founding_member ? '★ Founding' : '☆ Founding'}
                            </button>
                            {u.suspended ? (
                              <button
                                className="btn btn-sm"
                                style={{ background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' }}
                                onClick={() => doUnsuspend(u.id)}
                              >
                                Reinstate
                              </button>
                            ) : (
                              <button
                                className="btn btn-sm"
                                style={{ background: '#FEF2F2', color: '#991B1B', border: '1px solid #FCA5A5' }}
                                onClick={() => { setSuspendModal(u); setSuspendReason(''); }}
                              >
                                Suspend
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text2)' }}>No users found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Edit user modal */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
          <div className="scratch-card" style={{ padding: 36, maxWidth: 440, width: '100%' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 800, marginBottom: 24 }}>Edit user</h2>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--text2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>Full name</label>
              <input className="form-input" value={editing.full_name ?? ''} onChange={(e) => setEditing((p) => ({ ...p, full_name: e.target.value }))} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--text2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>Email</label>
              <input className="form-input" value={editing.email ?? ''} readOnly style={{ opacity: .6 }} />
              <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>Email changes are managed in Supabase Auth directly.</div>
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--text2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>Plan</label>
              <select className="form-input" value={editing.plan ?? 'trial'} onChange={(e) => setEditing((p) => ({ ...p, plan: e.target.value }))}>
                <option value="trial">Trial</option>
                <option value="casual">Casual</option>
                <option value="org">Organisation</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={saveUser} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend modal */}
      {suspendModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
          <div className="scratch-card" style={{ padding: 36, maxWidth: 480, width: '100%' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Suspend account</h2>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20, lineHeight: 1.6 }}>
              Suspending <strong>{suspendModal.full_name || suspendModal.email}</strong> will prevent them from launching new campaigns. Active campaigns will continue to operate normally.
            </p>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8, lineHeight: 1.6 }}>
              They will receive an email explaining the suspension. You will also need to manually follow up regarding any complaints.
            </p>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--text2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>Reason (shown to user)</label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="e.g. We have received a complaint that prizes were not paid out for campaign 'Footy Finals Fund'. Your account has been suspended while we investigate."
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setSuspendModal(null)}>Cancel</button>
              <button
                className="btn btn-sm"
                style={{ flex: 2, padding: '10px 0', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 800, cursor: suspendReason.trim() ? 'pointer' : 'not-allowed', opacity: suspendReason.trim() ? 1 : .5, fontFamily: 'inherit' }}
                onClick={doSuspend}
                disabled={!suspendReason.trim() || suspending}
              >
                {suspending ? 'Suspending…' : 'Confirm suspension'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const DEMO_USERS = [
  { id: '1', email: 'mel@sunburyprimary.edu.au',  full_name: 'Mel Thompson',  plan: 'casual', suspended: false, suspension_reason: null, created_at: new Date(Date.now() - 45 * 86400000).toISOString() },
  { id: '2', email: 'contact@lacesmasters.com.au',  full_name: 'Dave Kowalski', plan: 'org',    suspended: false, suspension_reason: null, created_at: new Date(Date.now() - 90 * 86400000).toISOString() },
  { id: '3', email: 'priya@wildlife.org.au',       full_name: 'Priya Sharma',  plan: 'casual', suspended: true,  suspension_reason: 'Complaint received: prizes not paid out for campaign Wildlife Raffle. Under investigation.', created_at: new Date(Date.now() - 12 * 86400000).toISOString() },
  { id: '4', email: 'tom@baysidefc.com.au',        full_name: 'Tom Reynolds',  plan: 'trial',  suspended: false, suspension_reason: null, created_at: new Date(Date.now() - 5 * 86400000).toISOString() },
];
