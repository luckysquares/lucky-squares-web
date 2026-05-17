'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient, supabaseConfigured } from '@/lib/supabase/client';

const PLAN_LABELS = { trial: 'Trial', casual: 'Casual', org: 'Organisation' };
const PLAN_COLOURS = { trial: 'tag-muted', casual: 'tag-green', org: 'tag-drawn' };

export default function AdminUsers() {
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [editing,  setEditing]  = useState(null);
  const [editSq,   setEditSq]   = useState(null); // { fundraiserId, squareNumber, name, email, phone }
  const [saving,   setSaving]   = useState(false);

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
    // Profile updates (name, plan) — would need an admin_update_profile RPC
    // For now, save locally in demo mode
    setUsers((prev) => prev.map((u) => u.id === editing.id ? { ...u, ...editing } : u));
    setEditing(null); setSaving(false);
  };

  const saveBuyer = async () => {
    setSaving(true);
    if (supabaseConfigured && editSq) {
      await getSupabaseClient().rpc('admin_update_buyer', {
        p_fundraiser_id: editSq.fundraiserId,
        p_square_number: editSq.squareNumber,
        p_buyer_name:    editSq.name,
        p_buyer_email:   editSq.email,
        p_buyer_phone:   editSq.phone,
      });
    }
    setEditSq(null); setSaving(false);
  };

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 900, marginBottom: 4 }}>Users</h1>
      <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 28 }}>Organiser accounts across the platform</p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <input className="form-input" placeholder="Search name or email…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 360 }} />
      </div>

      {/* Buyer details edit note */}
      <div style={{ background: '#F0FBF6', border: '1px solid #C8E8D8', borderRadius: 10, padding: '12px 16px', marginBottom: 24, fontSize: 13, color: 'var(--text2)' }}>
        <strong style={{ color: 'var(--text)' }}>Editing buyer details:</strong> To correct a buyer's name, email, or phone on a specific square, open the relevant campaign on the Campaigns page, find the square in question, and use the buyer edit function there.
      </div>

      {loading ? <div style={{ color: 'var(--text2)' }}>Loading…</div> : (
        <>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12, fontWeight: 700 }}>{filtered.length} user{filtered.length !== 1 ? 's' : ''}</div>
          <div className="scratch-card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--cream)', borderBottom: '1px solid var(--border)' }}>
                  {['Name', 'Email', 'Plan', 'Joined', ''].map((h) => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: .5 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700 }}>{u.full_name || '—'}</td>
                    <td style={{ padding: '12px 16px' }}><a href={`mailto:${u.email}`} style={{ color: 'var(--green)', fontWeight: 600 }}>{u.email}</a></td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`tag ${PLAN_COLOURS[u.plan] ?? 'tag-muted'}`} style={{ fontSize: 11 }}>{PLAN_LABELS[u.plan] ?? u.plan}</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text2)' }}>{fmtDate(u.created_at)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <button className="btn btn-outline btn-sm" onClick={() => setEditing({ ...u })}>Edit</button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text2)' }}>No users found.</td></tr>
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
              <input className="form-input" value={editing.email ?? ''} onChange={(e) => setEditing((p) => ({ ...p, email: e.target.value }))} />
              <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>Note: changing the email here updates the profile record. The auth login email is managed separately in Supabase.</div>
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
    </div>
  );
}

const DEMO_USERS = [
  { id: '1', email: 'mel@sunburyprimary.edu.au',   full_name: 'Mel Thompson',  plan: 'casual', created_at: new Date(Date.now() - 45 * 86400000).toISOString() },
  { id: '2', email: 'dave@werribeeeagles.com.au',   full_name: 'Dave Kowalski', plan: 'org',    created_at: new Date(Date.now() - 90 * 86400000).toISOString() },
  { id: '3', email: 'priya@wildlife.org.au',        full_name: 'Priya Sharma',  plan: 'casual', created_at: new Date(Date.now() - 12 * 86400000).toISOString() },
  { id: '4', email: 'tom@baysidefc.com.au',         full_name: 'Tom Reynolds',  plan: 'trial',  created_at: new Date(Date.now() - 5 * 86400000).toISOString() },
];
