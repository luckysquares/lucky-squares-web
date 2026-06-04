'use client';

import { useState, useEffect } from 'react';
import { adminFetch } from '@/lib/adminFetch';

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function currentMonthValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function prevMonthValue() {
  const d = new Date();
  d.setDate(1); d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(yyyyMM) {
  if (!yyyyMM) return '';
  const [y, m] = yyyyMM.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
}

const STATUS_COLOURS = {
  pending:   { bg: '#F9F8F6', colour: '#9B8F80', label: 'Pending' },
  submitted: { bg: '#FFFBEB', colour: '#92400E', label: 'Submitted' },
  approved:  { bg: '#F0FDF4', colour: '#15803D', label: 'Approved' },
  rejected:  { bg: '#FEF2F2', colour: '#B91C1C', label: 'Rejected' },
};

export default function AdminTestimonialsPage() {
  const [items,       setItems]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [editing,     setEditing]     = useState(null);
  const [saving,      setSaving]      = useState(null);
  const [filter,      setFilter]      = useState('submitted');

  // Draw state
  const [drawMonth,   setDrawMonth]   = useState(prevMonthValue());
  const [drawStatus,  setDrawStatus]  = useState(null); // { draw, entry_count }
  const [drawLoading, setDrawLoading] = useState(false);
  const [drawing,     setDrawing]     = useState(false);
  const [drawResult,  setDrawResult]  = useState(null);
  const [drawError,   setDrawError]   = useState('');

  // Winners history
  const [winners,     setWinners]     = useState([]);
  const [winnersLoad, setWinnersLoad] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res  = await adminFetch('/api/admin/testimonials');
      const json = await res.json();
      setItems(Array.isArray(json) ? json : []);
    } catch { setItems([]); }
    setLoading(false);
  };

  const loadWinners = async () => {
    setWinnersLoad(true);
    try {
      const res  = await adminFetch('/api/admin/testimonials/draws');
      const json = await res.json();
      setWinners(Array.isArray(json) ? json : []);
    } catch { setWinners([]); }
    setWinnersLoad(false);
  };

  const loadDrawStatus = async (month) => {
    setDrawLoading(true); setDrawError('');
    try {
      const res  = await adminFetch(`/api/admin/testimonials/draw?month=${month}`);
      const json = await res.json();
      setDrawStatus(json);
    } catch { setDrawStatus(null); }
    setDrawLoading(false);
  };

  useEffect(() => { load(); loadWinners(); }, []);
  useEffect(() => { loadDrawStatus(drawMonth); }, [drawMonth]);

  const handleDraw = async () => {
    if (!confirm(`Run the Testimonial Prize Draw for ${monthLabel(drawMonth)}? This cannot be undone.`)) return;
    setDrawing(true); setDrawError(''); setDrawResult(null);
    try {
      const res  = await adminFetch('/api/admin/testimonials/draw', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: drawMonth }),
      });
      const json = await res.json();
      if (!res.ok || json.error) { setDrawError(json.error ?? 'Draw failed'); }
      else { setDrawResult(json); await loadDrawStatus(drawMonth); await loadWinners(); }
    } catch { setDrawError('Something went wrong. Please try again.'); }
    setDrawing(false);
  };

  const handleAction = async (id, action, overrides = {}) => {
    setSaving(id + action);
    await adminFetch(`/api/admin/testimonials/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action, ...overrides }),
    });
    setEditing(null);
    await load();
    setSaving(null);
  };

  const visible = filter === 'all' ? items : items.filter((t) => t.status === filter);

  const counts = {
    submitted: items.filter((t) => t.status === 'submitted').length,
    approved:  items.filter((t) => t.status === 'approved').length,
    rejected:  items.filter((t) => t.status === 'rejected').length,
    pending:   items.filter((t) => t.status === 'pending').length,
  };

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 900, marginBottom: 4 }}>Testimonials</h1>
        <p style={{ fontSize: 14, color: 'var(--text2)' }}>Review and approve organiser testimonials for the homepage.</p>
      </div>

      {/* ── Prize Draw Panel ───────────────────────────────────────── */}
      <div className="scratch-card" style={{ padding: 24, marginBottom: 32, background: '#FFFBEB', borderColor: '#F0D070' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 22 }}>🎁</span>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16, color: '#7A5C00' }}>Testimonial Prize Draw</div>
            <div style={{ fontSize: 12, color: '#9A7A00' }}>$100 Visa debit gift card — drawn on the first business day of each month</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#7A5C00', display: 'block', marginBottom: 4 }}>Draw month</label>
            <input
              type="month"
              value={drawMonth}
              onChange={(e) => setDrawMonth(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid #E0C840', fontSize: 14, background: '#FFFFF0', fontFamily: 'inherit' }}
            />
          </div>
          <div style={{ fontSize: 13, color: '#7A5C00' }}>
            {drawLoading ? 'Checking…' : drawStatus ? (
              drawStatus.draw
                ? <span style={{ color: '#16A34A', fontWeight: 700 }}>✓ Draw already run — winner: {drawStatus.draw.winner_name} ({drawStatus.draw.winner_email})</span>
                : <span><strong>{drawStatus.entry_count}</strong> eligible {drawStatus.entry_count === 1 ? 'entry' : 'entries'} for {monthLabel(drawMonth)}</span>
            ) : '—'}
          </div>
        </div>

        {drawResult && (
          <div style={{ background: '#F0FDF4', border: '1.5px solid #86EFAC', borderRadius: 10, padding: '14px 18px', marginBottom: 14 }}>
            <div style={{ fontWeight: 800, color: '#15803D', marginBottom: 4 }}>🎉 Winner drawn!</div>
            <div style={{ fontSize: 14, color: '#1A3A25' }}>
              <strong>{drawResult.winner.name}</strong> ({drawResult.winner.org})<br />
              <span style={{ fontSize: 13, color: '#6B5E4E' }}>{drawResult.winner.email}</span>
            </div>
            <div style={{ fontSize: 12, color: '#6B5E4E', marginTop: 6 }}>
              Winner email sent. Contact them to arrange the $100 Visa debit card.
            </div>
          </div>
        )}

        {drawError && <p style={{ fontSize: 13, color: '#CC0000', marginBottom: 12 }}>{drawError}</p>}

        <button
          onClick={handleDraw}
          disabled={drawing || !!drawStatus?.draw || !drawStatus?.entry_count || drawLoading}
          style={{
            padding: '10px 24px', borderRadius: 8, fontSize: 14, fontWeight: 800,
            border: 'none', cursor: drawing || !!drawStatus?.draw || !drawStatus?.entry_count ? 'not-allowed' : 'pointer',
            background: drawStatus?.draw ? '#E5E0D5' : '#F5C820',
            color: drawStatus?.draw ? '#9B8F80' : '#1A1209',
            fontFamily: 'inherit',
          }}
        >
          {drawing ? 'Drawing…' : drawStatus?.draw ? 'Already drawn' : `Draw winner for ${monthLabel(drawMonth)}`}
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { key: 'submitted', label: `Needs review (${counts.submitted})` },
          { key: 'approved',  label: `Approved (${counts.approved})`  },
          { key: 'rejected',  label: `Rejected (${counts.rejected})`  },
          { key: 'pending',   label: `Invited (${counts.pending})`    },
          { key: 'all',       label: `All (${items.length})`          },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            style={{
              padding: '7px 16px', borderRadius: 99, fontSize: 13, fontWeight: 700,
              border: '1.5px solid', cursor: 'pointer', fontFamily: 'inherit',
              background:   filter === key ? '#6B46F5' : '#fff',
              color:        filter === key ? '#fff' : 'var(--text2)',
              borderColor:  filter === key ? '#6B46F5' : '#E5E0D5',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: 'var(--text2)', fontSize: 14 }}>Loading…</div>
      ) : visible.length === 0 ? (
        <div className="scratch-card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>💬</div>
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>
            {filter === 'submitted' ? 'No testimonials waiting for review.' : 'Nothing here yet.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {visible.map((t) => {
            const sc = STATUS_COLOURS[t.status] ?? STATUS_COLOURS.pending;
            const isEditing = editing?.id === t.id;

            return (
              <div key={t.id} className="scratch-card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)', marginBottom: 2 }}>
                      {t.org_name ?? '(unknown org)'}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                      {t.organiser_name ?? '—'} · Invited {fmtDate(t.created_at)}
                      {t.submitted_at && ` · Submitted ${fmtDate(t.submitted_at)}`}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: .5,
                    background: sc.bg, color: sc.colour, borderRadius: 4, padding: '3px 10px',
                  }}>
                    {sc.label}
                  </span>
                </div>

                {t.quote ? (
                  isEditing ? (
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Quote</label>
                      <textarea
                        rows={4}
                        className="form-input"
                        value={editing.quote}
                        onChange={(e) => setEditing((p) => ({ ...p, quote: e.target.value }))}
                        style={{ resize: 'vertical', fontSize: 14 }}
                      />
                      <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 4, marginTop: 12 }}>Display name</label>
                      <input
                        className="form-input"
                        value={editing.display_name}
                        onChange={(e) => setEditing((p) => ({ ...p, display_name: e.target.value }))}
                        placeholder="e.g. Mel T., P&C President"
                      />
                    </div>
                  ) : (
                    <div style={{ marginBottom: 16 }}>
                      {t.rating && (
                        <div style={{ color: '#F59E0B', fontSize: 18, marginBottom: 6 }}>
                          {'★'.repeat(t.rating)}{'☆'.repeat(5 - t.rating)}
                        </div>
                      )}
                      <blockquote style={{ margin: 0, padding: '12px 16px', background: '#F9F8F6', borderLeft: '3px solid #E5E0D5', borderRadius: 6, fontSize: 14, color: 'var(--text)', lineHeight: 1.7, fontStyle: 'italic' }}>
                        &quot;{t.quote}&quot;
                      </blockquote>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', marginTop: 8 }}>
                        — {t.display_name || t.organiser_name || 'Anonymous'}
                      </div>
                    </div>
                  )
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16, fontStyle: 'italic' }}>
                    Invite sent — awaiting submission.
                  </div>
                )}

                {/* Actions */}
                {t.quote && (
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {t.status !== 'approved' && (
                      isEditing ? (
                        <>
                          <button
                            className="btn btn-primary btn-sm"
                            disabled={saving === t.id + 'approve'}
                            onClick={() => handleAction(t.id, 'approve', { quote: editing.quote, display_name: editing.display_name })}
                          >
                            {saving === t.id + 'approve' ? 'Saving…' : 'Save and approve'}
                          </button>
                          <button className="btn btn-outline btn-sm" onClick={() => setEditing(null)}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button
                            className="btn btn-primary btn-sm"
                            disabled={!!saving}
                            onClick={() => handleAction(t.id, 'approve')}
                          >
                            {saving === t.id + 'approve' ? 'Approving…' : 'Approve'}
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => setEditing({ id: t.id, quote: t.quote, display_name: t.display_name || t.organiser_name || '' })}
                          >
                            Edit then approve
                          </button>
                        </>
                      )
                    )}
                    {t.status !== 'rejected' && !isEditing && (
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ color: '#CC0000', borderColor: '#FFCCCC' }}
                        disabled={!!saving}
                        onClick={() => handleAction(t.id, 'reject')}
                      >
                        {saving === t.id + 'reject' ? 'Rejecting…' : 'Reject'}
                      </button>
                    )}
                    {t.status === 'approved' && !isEditing && (
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => setEditing({ id: t.id, quote: t.quote, display_name: t.display_name || t.organiser_name || '' })}
                      >
                        Edit
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Winners History ─────────────────────────────────────────── */}
      <div style={{ marginTop: 48 }}>
        <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text2)', marginBottom: 16 }}>
          Prize Draw History
        </div>
        {winnersLoad ? (
          <div style={{ fontSize: 13, color: 'var(--text2)' }}>Loading…</div>
        ) : winners.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text2)', fontStyle: 'italic' }}>No draws run yet.</div>
        ) : (
          <div className="scratch-card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--cream)', borderBottom: '1px solid var(--border)' }}>
                  {['Month', 'Winner', 'Organisation', 'Email', 'Entries', 'Drawn'].map((h) => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: .5 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {winners.map((w) => (
                  <tr key={w.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700 }}>{w.month_label || monthLabel(w.draw_month)}</td>
                    <td style={{ padding: '12px 16px' }}>{w.winner_name || '—'}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text2)' }}>{w.winner_org || '—'}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text2)', fontSize: 12 }}>{w.winner_email || '—'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text2)' }}>{w.entry_count}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text2)' }}>{fmtDate(w.drawn_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
