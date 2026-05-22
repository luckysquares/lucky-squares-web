'use client';

import { useState, useEffect } from 'react';

export default function AdminWaitlist() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [error,   setError]   = useState('');

  useEffect(() => {
    fetch('/api/waitlist')
      .then((r) => r.json())
      .then((data) => { setEntries(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { setError('Failed to load waitlist.'); setLoading(false); });
  }, []);

  const filtered = entries.filter((e) =>
    !search || [e.email, e.name].some((f) => f?.toLowerCase().includes(search.toLowerCase()))
  );

  const fmtDate = (d) => new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });

  const exportCsv = () => {
    const rows = [['Name', 'Email', 'Joined'], ...filtered.map((e) => [e.name ?? '', e.email, fmtDate(e.created_at)])];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'waitlist.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, fontFamily: 'var(--font-serif)', marginBottom: 4 }}>Waitlist</h1>
          <p style={{ fontSize: 13, color: 'var(--text2)' }}>
            {loading ? 'Loading…' : `${entries.length} ${entries.length === 1 ? 'person' : 'people'} on the waitlist`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            className="form-input"
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 220, fontSize: 13 }}
          />
          {filtered.length > 0 && (
            <button className="btn btn-outline btn-sm" onClick={exportCsv}>
              Export CSV
            </button>
          )}
        </div>
      </div>

      {error && <p style={{ color: '#DC2626', fontSize: 14, marginBottom: 16 }}>{error}</p>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text2)', fontSize: 14 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text2)', fontSize: 14 }}>
          {search ? 'No results match your search.' : 'No one on the waitlist yet.'}
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 'var(--radius)', border: '1.5px solid var(--border)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--cream)', borderBottom: '1.5px solid var(--border)' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: .5, color: 'var(--text2)' }}>Name</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: .5, color: 'var(--text2)' }}>Email</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: .5, color: 'var(--text2)' }}>Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e, i) => (
                <tr key={e.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <td style={{ padding: '12px 16px', color: 'var(--text)', fontWeight: 600 }}>
                    {e.name || <span style={{ color: 'var(--text3)', fontStyle: 'italic' }}>No name</span>}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <a href={`mailto:${e.email}`} style={{ color: 'var(--purple)', fontWeight: 600, textDecoration: 'none' }}>{e.email}</a>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text2)' }}>{fmtDate(e.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
