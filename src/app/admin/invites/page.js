'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminFetch } from '@/lib/adminFetch';

const COUPON_OPTIONS = [
  { value: '',          label: 'No coupon'                  },
  { value: 'free',      label: 'Free first campaign'        },
  { value: 'halfprice', label: 'Half price first campaign'  },
];

function blankRow() {
  return { id: Math.random().toString(36).slice(2), name: '', email: '', coupon: '' };
}

export default function InvitesPage() {
  const [rows,       setRows]       = useState([blankRow()]);
  const [sending,    setSending]    = useState(false);
  const [result,     setResult]     = useState(null);
  const [log,        setLog]        = useState([]);
  const [logLoad,    setLogLoad]    = useState(true);
  const [resending,  setResending]  = useState({});   // id → true while in-flight
  const [resendDone, setResendDone] = useState({});   // id → 'ok' | 'error'

  const fetchLog = useCallback(async () => {
    setLogLoad(true);
    try {
      const res = await adminFetch('/api/admin/invites');
      if (res.ok) setLog(await res.json());
    } finally {
      setLogLoad(false);
    }
  }, []);

  useEffect(() => { fetchLog(); }, [fetchLog]);

  const updateRow = (id, field, value) =>
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, [field]: value } : r));

  const addRow = () => setRows((prev) => [...prev, blankRow()]);

  const removeRow = (id) => setRows((prev) => prev.length > 1 ? prev.filter((r) => r.id !== id) : prev);

  const handleResend = async (entry) => {
    setResending((prev) => ({ ...prev, [entry.id]: true }));
    setResendDone((prev) => ({ ...prev, [entry.id]: null }));
    try {
      const res = await adminFetch('/api/admin/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resend: true, name: entry.name, email: entry.email, coupon_code: entry.coupon_code || null }),
      });
      setResendDone((prev) => ({ ...prev, [entry.id]: res.ok ? 'ok' : 'error' }));
    } catch {
      setResendDone((prev) => ({ ...prev, [entry.id]: 'error' }));
    } finally {
      setResending((prev) => ({ ...prev, [entry.id]: false }));
    }
  };

  const handleSend = async () => {
    const valid = rows.filter((r) => r.name.trim() && r.email.trim());
    if (valid.length === 0) { alert('Please add at least one person with a name and email.'); return; }

    setSending(true);
    setResult(null);

    const invites = valid.map((r) => ({
      name: r.name.trim(), email: r.email.trim(), coupon_type: r.coupon || null,
    }));

    try {
      const res  = await adminFetch('/api/admin/invites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ invites }) });
      const data = await res.json();
      if (!res.ok) { setResult({ error: data.error ?? 'Unknown error' }); return; }
      setResult({ sent: data.results.filter((r) => r.ok).length, failed: data.failed_count });
      setRows([blankRow()]);
      fetchLog();
    } catch (err) {
      setResult({ error: err.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 900, color: '#1A1209', margin: '0 0 6px' }}>Send Invites</h1>
        <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>Build your invite list, choose a coupon offer, and send personal invitations from Jamie.</p>
      </div>

      {/* Invite builder */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #E5E0D5', overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #F0EAE0' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1209' }}>Invite list</div>
        </div>

        {/* Header row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 220px 40px', gap: 12, padding: '12px 24px', borderBottom: '1px solid #F0EAE0', background: '#FAFAF8' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9C8060', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Name</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9C8060', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Email</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9C8060', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Coupon offer</div>
          <div />
        </div>

        {/* Invite rows */}
        <div>
          {rows.map((row) => (
            <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 220px 40px', gap: 12, padding: '10px 24px', alignItems: 'center', borderBottom: '1px solid #F8F5F0' }}>
              <input
                type="text"
                placeholder="Full name"
                value={row.name}
                onChange={(e) => updateRow(row.id, 'name', e.target.value)}
                style={inputStyle}
              />
              <input
                type="email"
                placeholder="email@example.com"
                value={row.email}
                onChange={(e) => updateRow(row.id, 'email', e.target.value)}
                style={inputStyle}
              />
              <select
                value={row.coupon}
                onChange={(e) => updateRow(row.id, 'coupon', e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                {COUPON_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <button
                onClick={() => removeRow(row.id)}
                disabled={rows.length === 1}
                style={{ width: 32, height: 32, border: '1.5px solid #E5E0D5', borderRadius: 8, background: 'none', cursor: rows.length === 1 ? 'not-allowed' : 'pointer', color: '#9C8060', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: rows.length === 1 ? 0.3 : 1, fontFamily: 'inherit' }}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div style={{ padding: '14px 24px', borderTop: '1px solid #F0EAE0' }}>
          <button
            onClick={addRow}
            style={{ background: 'none', border: '1.5px dashed #C8BFB0', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, color: '#6B7280', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            + Add another person
          </button>
        </div>
      </div>

      {/* Result banner */}
      {result && (
        <div style={{
          marginBottom: 20, padding: '14px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600,
          background: result.error ? '#FFF2F2' : '#F0FBF4',
          border: `1.5px solid ${result.error ? '#FFBBBB' : '#A8DFBF'}`,
          color: result.error ? '#C0392B' : '#1A7A55',
        }}>
          {result.error
            ? `Error: ${result.error}`
            : `${result.sent} invite${result.sent !== 1 ? 's' : ''} sent successfully.${result.failed > 0 ? ` ${result.failed} failed.` : ''}`
          }
        </div>
      )}

      {/* Send button */}
      <div style={{ marginBottom: 48 }}>
        <button
          onClick={handleSend}
          disabled={sending}
          style={{ background: '#1A7A55', color: '#fff', border: 'none', borderRadius: 10, padding: '14px 32px', fontSize: 15, fontWeight: 700, cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.7 : 1, fontFamily: 'inherit' }}
        >
          {sending ? 'Sending…' : `Send ${rows.filter((r) => r.name.trim() && r.email.trim()).length || ''} invite${rows.filter((r) => r.name.trim() && r.email.trim()).length === 1 ? '' : 's'} →`}
        </button>
        <p style={{ margin: '10px 0 0', fontSize: 12, color: '#9C8060' }}>
          Each person will receive a personal email from Jamie. Invites are logged below.
        </p>
      </div>

      {/* Invite log */}
      <div>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 900, color: '#1A1209', margin: '0 0 16px' }}>Invite log</h2>
        <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #E5E0D5', overflow: 'hidden' }}>
          {/* Log header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 160px 160px 80px', gap: 16, padding: '12px 24px', background: '#FAFAF8', borderBottom: '1px solid #F0EAE0' }}>
            {['Name', 'Email', 'Coupon', 'Sent', ''].map((h, i) => (
              <div key={i} style={{ fontSize: 11, fontWeight: 700, color: '#9C8060', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{h}</div>
            ))}
          </div>

          {logLoad ? (
            <div style={{ padding: '32px 24px', textAlign: 'center', fontSize: 13, color: '#9C8060' }}>Loading…</div>
          ) : log.length === 0 ? (
            <div style={{ padding: '32px 24px', textAlign: 'center', fontSize: 13, color: '#9C8060' }}>No invites sent yet.</div>
          ) : (
            log.map((entry) => (
              <div key={entry.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 160px 160px 80px', gap: 16, padding: '12px 24px', borderBottom: '1px solid #F8F5F0', fontSize: 13, color: '#1A1209', alignItems: 'center' }}>
                <div style={{ fontWeight: 600 }}>{entry.name}</div>
                <div style={{ color: '#4A3728' }}>{entry.email}</div>
                <div>
                  {entry.coupon_code
                    ? <span style={{ background: '#F0FBF4', border: '1px solid #A8DFBF', borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 700, color: '#1A7A55', fontFamily: 'monospace' }}>{entry.coupon_code}</span>
                    : <span style={{ color: '#C8BFB0', fontSize: 12 }}>None</span>
                  }
                </div>
                <div style={{ color: '#6B7280', fontSize: 12 }}>
                  {new Date(entry.sent_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
                <div>
                  {resendDone[entry.id] === 'ok' ? (
                    <span style={{ fontSize: 12, color: '#1A7A55', fontWeight: 700 }}>Sent</span>
                  ) : resendDone[entry.id] === 'error' ? (
                    <span style={{ fontSize: 12, color: '#C0392B', fontWeight: 700 }}>Failed</span>
                  ) : (
                    <button
                      onClick={() => handleResend(entry)}
                      disabled={resending[entry.id]}
                      style={{ background: 'none', border: '1.5px solid #E5E0D5', borderRadius: 7, padding: '4px 10px', fontSize: 12, fontWeight: 700, color: '#4A3728', cursor: resending[entry.id] ? 'not-allowed' : 'pointer', opacity: resending[entry.id] ? 0.5 : 1, fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                    >
                      {resending[entry.id] ? '…' : 'Resend'}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  border: '1.5px solid #E5E0D5',
  borderRadius: 8,
  fontSize: 13,
  color: '#1A1209',
  background: '#FAFAF8',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  outline: 'none',
};
