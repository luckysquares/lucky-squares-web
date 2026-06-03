'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient, supabaseConfigured } from '@/lib/supabase/client';
import { adminFetch } from '@/lib/adminFetch';

export default function AdminOrganisations() {
  const [orgs,    setOrgs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('pending');
  const [search,  setSearch]  = useState('');
  const [acting,  setActing]  = useState({}); // { [id]: 'approve' | 'reject' }

  useEffect(() => {
    if (!supabaseConfigured) { setOrgs(DEMO_ORGS); setLoading(false); return; }
    getSupabaseClient().rpc('admin_get_org_applications').then(({ data }) => {
      setOrgs(data ?? []); setLoading(false);
    });
  }, []);

  const filtered = orgs.filter((o) => {
    const matchSearch = !search || [o.org_name, o.contact_name, o.email, o.abn].some((f) => f?.toLowerCase().includes(search.toLowerCase()));
    const matchFilter = filter === 'all' || o.status === filter;
    return matchSearch && matchFilter;
  });

  const isNew   = (o) => new Date(o.created_at) > new Date(Date.now() - 14 * 86400000);
  const fmtDate = (d) => new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });

  const handleAction = async (id, action) => {
    setActing((prev) => ({ ...prev, [id]: action }));
    try {
      const res  = await adminFetch(`/api/admin/organisations/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Failed');
      setOrgs((prev) => prev.map((o) => o.id === id ? { ...o, status: json.status } : o));
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setActing((prev) => { const n = { ...prev }; delete n[id]; return n; });
    }
  };

  const counts = {
    all:      orgs.length,
    pending:  orgs.filter((o) => !o.status || o.status === 'pending').length,
    approved: orgs.filter((o) => o.status === 'approved').length,
    rejected: orgs.filter((o) => o.status === 'rejected').length,
  };

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 900, marginBottom: 4 }}>Organisations</h1>
      <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 28 }}>Organisation plan applications</p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <input className="form-input" placeholder="Search name, email, ABN…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 300 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          {['pending','approved','rejected','all'].map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-outline'}`} style={{ textTransform: 'capitalize' }}>
              {s} {counts[s] > 0 && <span style={{ marginLeft: 4, background: 'rgba(255,255,255,.2)', borderRadius: 99, padding: '1px 6px', fontSize: 11 }}>{counts[s]}</span>}
            </button>
          ))}
        </div>
      </div>

      {loading ? <div style={{ color: 'var(--text2)' }}>Loading…</div> : (
        <>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12, fontWeight: 700 }}>{filtered.length} application{filtered.length !== 1 ? 's' : ''}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map((o) => {
              const isPending  = !o.status || o.status === 'pending';
              const isApproved = o.status === 'approved';
              const isRejected = o.status === 'rejected';
              const busy       = acting[o.id];
              return (
                <div key={o.id} className="scratch-card" style={{ padding: '20px 24px', borderLeft: isApproved ? '4px solid var(--green)' : isRejected ? '4px solid #D1D5DB' : '4px solid #F59E0B' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 240 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 700 }}>{o.org_name}</span>
                        {isNew(o) && isPending && <span className="tag tag-green" style={{ fontSize: 11 }}>New</span>}
                        <span className={`tag ${isApproved ? 'tag-green' : isRejected ? 'tag-muted' : ''}`} style={{ fontSize: 11, textTransform: 'capitalize', background: isPending ? '#FEF3C7' : undefined, color: isPending ? '#92400E' : undefined }}>
                          {isPending ? 'Pending review' : o.status}
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '4px 24px', fontSize: 13, color: 'var(--text2)' }}>
                        <span>ABN: <strong style={{ color: 'var(--text)' }}>{o.abn}</strong></span>
                        <span>Type: {o.org_type}</span>
                        <span>Contact: <strong style={{ color: 'var(--text)' }}>{o.contact_name}</strong></span>
                        <span><a href={`mailto:${o.email}`} style={{ color: 'var(--green)', fontWeight: 700 }}>{o.email}</a></span>
                        {o.phone && <span>{o.phone}</span>}
                        <span>{[o.suburb, o.state, o.postcode].filter(Boolean).join(' ')}</span>
                        <span style={{ color: 'var(--text2)' }}>Applied {fmtDate(o.created_at)}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'flex-start' }}>
                      <a href={`mailto:${o.email}?subject=Your Lucky Squares Organisation Application`} className="btn btn-outline btn-sm">
                        ✉ Email
                      </a>
                      {isPending && (
                        <>
                          <button
                            className="btn btn-sm"
                            style={{ background: '#16A34A', color: '#fff', border: 'none' }}
                            disabled={!!busy}
                            onClick={() => handleAction(o.id, 'approve')}
                          >
                            {busy === 'approve' ? 'Approving…' : 'Approve'}
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ color: '#DC2626', borderColor: '#DC2626' }}
                            disabled={!!busy}
                            onClick={() => { if (window.confirm(`Reject ${o.org_name}?`)) handleAction(o.id, 'reject'); }}
                          >
                            {busy === 'reject' ? 'Rejecting…' : 'Reject'}
                          </button>
                        </>
                      )}
                      {isApproved && (
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ color: '#DC2626', borderColor: '#DC2626' }}
                          disabled={!!busy}
                          onClick={() => { if (window.confirm(`Revoke approval for ${o.org_name}?`)) handleAction(o.id, 'reject'); }}
                        >
                          Revoke
                        </button>
                      )}
                      {isRejected && (
                        <button
                          className="btn btn-sm"
                          style={{ background: '#16A34A', color: '#fff', border: 'none' }}
                          disabled={!!busy}
                          onClick={() => { if (window.confirm(`Re-approve ${o.org_name}?`)) handleAction(o.id, 'approve'); }}
                        >
                          {busy === 'approve' ? 'Approving…' : 'Re-approve'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ color: 'var(--text2)', fontSize: 14, padding: '40px 0', textAlign: 'center' }}>
                {filter === 'pending' ? 'No pending applications. All caught up!' : 'No applications found.'}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const DEMO_ORGS = [
  { id: '1', org_name: 'Sunbury Primary P&C', abn: '12 345 678 901', org_type: 'School P&C', contact_name: 'Mel Thompson', email: 'mel@sunburyprimary.edu.au', phone: '0412 345 678', suburb: 'Sunbury', state: 'SA', postcode: '3429', status: 'pending',  created_at: new Date(Date.now() - 3 * 86400000).toISOString() },
  { id: '2', org_name: 'Wildlife Friends VIC', abn: '98 765 432 109', org_type: 'Registered charity', contact_name: 'Priya Sharma', email: 'priya@wildlife.org.au', phone: '0423 456 789', suburb: 'Geelong', state: 'SA', postcode: '3220', status: 'approved', created_at: new Date(Date.now() - 18 * 86400000).toISOString() },
  { id: '3', org_name: 'L'Aces Masters Baseball ⚾',  abn: '45 678 901 234', org_type: 'Sporting club', contact_name: 'Dave Kowalski', email: 'contact@lacesmasters.com.au', phone: '0434 567 890', suburb: 'Adelaide', state: 'SA', postcode: '5000', status: 'pending',  created_at: new Date(Date.now() - 1 * 86400000).toISOString() },
];
