'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient, supabaseConfigured } from '@/lib/supabase/client';

const LEVEL_COLOURS = {
  error: { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
  warn:  { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' },
  info:  { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' },
};

const SOURCE_ICONS = { server: '⚙️', client: '🌐', database: '🗄️', edge: '⚡' };

function fmtTs(iso) {
  return new Date(iso).toLocaleString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function fmtRelative(iso) {
  const secs = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (secs < 60)   return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

const DEMO_LOGS = [
  { id: '1', created_at: new Date(Date.now() - 2  * 60000).toISOString(),  level: 'error', source: 'server', route: '/api/stripe/webhook', message: 'Webhook signature verification failed: No signatures found matching the expected signature for payload.', stack: null, user_id: null, metadata: { type: 'signature_verification_failed' }, resolved: false },
  { id: '2', created_at: new Date(Date.now() - 18 * 60000).toISOString(),  level: 'error', source: 'client', route: '/f/abc123',            message: "TypeError: Cannot read properties of undefined (reading 'map')", stack: "TypeError: Cannot read properties of undefined (reading 'map')\n    at LiveGrid (LiveGrid.js:142)\n    at renderWithHooks", user_id: 'user-uuid-here', metadata: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)', href: 'https://dev.luckysquares.com.au/f/abc123' }, resolved: false },
  { id: '3', created_at: new Date(Date.now() - 3  * 3600000).toISOString(), level: 'warn',  source: 'server', route: '/api/admin/reporting/ga4', message: 'GA4 API returned 429 Too Many Requests — quota exceeded.', stack: null, user_id: null, metadata: { status: 429 }, resolved: true },
  { id: '4', created_at: new Date(Date.now() - 1  * 86400000).toISOString(), level: 'error', source: 'database', route: '/api/fundraiser', message: 'relation "fundraisers" does not exist', stack: null, user_id: null, metadata: { code: '42P01' }, resolved: true },
];

export default function AdminErrors() {
  const [logs,      setLogs]      = useState([]);
  const [summary,   setSummary]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [expanded,  setExpanded]  = useState(null);
  const [search,    setSearch]    = useState('');
  const [level,     setLevel]     = useState('');
  const [source,    setSource]    = useState('');
  const [days,      setDays]      = useState(7);
  const [resolved,  setResolved]  = useState(false); // false = show open only
  const [acting,    setActing]    = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    if (!supabaseConfigured) { setLogs(DEMO_LOGS); setSummary({ today: 1, week: 3, open: 2 }); setLoading(false); return; }
    const sb = getSupabaseClient();
    const [{ data: rows }, { data: sum }] = await Promise.all([
      sb.rpc('admin_get_error_logs', {
        p_search:   search   || null,
        p_level:    level    || null,
        p_source:   source   || null,
        p_resolved: resolved ? null : false,
        p_days:     days,
        p_limit:    200,
        p_offset:   0,
      }),
      sb.rpc('admin_error_log_summary'),
    ]);
    setLogs(rows ?? []);
    setSummary(sum ?? null);
    setLoading(false);
  }, [search, level, source, resolved, days]);

  useEffect(() => { load(); }, [load]);

  const handleResolve = async (id, isResolved) => {
    setActing((p) => ({ ...p, [id]: true }));
    if (!supabaseConfigured) {
      setLogs((prev) => prev.map((l) => l.id === id ? { ...l, resolved: !isResolved } : l));
    } else {
      await getSupabaseClient().rpc('admin_resolve_error_log', { p_id: id, p_resolved: !isResolved });
      setLogs((prev) => prev.map((l) => l.id === id ? { ...l, resolved: !isResolved } : l));
    }
    setActing((p) => { const n = { ...p }; delete n[id]; return n; });
  };

  const openCount   = logs.filter((l) => !l.resolved).length;
  const errorCount  = logs.filter((l) => l.level === 'error' && !l.resolved).length;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 900, marginBottom: 4 }}>Error logs</h1>
          <p style={{ fontSize: 14, color: 'var(--text2)' }}>Server, client and database errors</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={load} disabled={loading}>{loading ? 'Loading…' : '↻ Refresh'}</button>
      </div>

      {/* Summary chips */}
      {summary && (
        <div style={{ display: 'flex', gap: 12, margin: '20px 0', flexWrap: 'wrap' }}>
          {[
            { label: 'Errors today',    value: summary.today, colour: summary.today  > 0 ? '#DC2626' : '#16A34A' },
            { label: 'Errors this week', value: summary.week, colour: summary.week   > 0 ? '#D97706' : '#16A34A' },
            { label: 'Open errors',      value: summary.open, colour: summary.open   > 0 ? '#DC2626' : '#16A34A' },
          ].map(({ label, value, colour }) => (
            <div key={label} style={{ background: '#fff', border: '1.5px solid #E5E0D5', borderRadius: 10, padding: '12px 20px', textAlign: 'center', minWidth: 120 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: colour }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="form-input"
          placeholder="Search message or route…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 280 }}
        />
        <select className="form-input" value={level} onChange={(e) => setLevel(e.target.value)} style={{ width: 'auto' }}>
          <option value="">All levels</option>
          <option value="error">Error</option>
          <option value="warn">Warning</option>
          <option value="info">Info</option>
        </select>
        <select className="form-input" value={source} onChange={(e) => setSource(e.target.value)} style={{ width: 'auto' }}>
          <option value="">All sources</option>
          <option value="server">Server</option>
          <option value="client">Client</option>
          <option value="database">Database</option>
          <option value="edge">Edge</option>
        </select>
        <select className="form-input" value={days} onChange={(e) => setDays(Number(e.target.value))} style={{ width: 'auto' }}>
          <option value={1}>Last 24h</option>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={resolved} onChange={(e) => setResolved(e.target.checked)} />
          Include resolved
        </label>
      </div>

      <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12, fontWeight: 700 }}>
        {loading ? 'Loading…' : `${logs.length} log${logs.length !== 1 ? 's' : ''}${!resolved ? ` (${openCount} open)` : ''}`}
      </div>

      {/* Log list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {logs.map((log) => {
          const lc   = LEVEL_COLOURS[log.level] || LEVEL_COLOURS.error;
          const open = expanded === log.id;
          return (
            <div
              key={log.id}
              style={{ background: '#fff', border: `1.5px solid ${log.resolved ? '#E5E0D5' : lc.border}`, borderRadius: 10, overflow: 'hidden', opacity: log.resolved ? 0.65 : 1 }}
            >
              {/* Row header */}
              <div
                style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', cursor: 'pointer' }}
                onClick={() => setExpanded(open ? null : log.id)}
              >
                {/* Level badge */}
                <span style={{ flexShrink: 0, display: 'inline-block', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 99, background: lc.bg, color: lc.text, textTransform: 'uppercase', letterSpacing: '1px', marginTop: 1 }}>
                  {log.level}
                </span>

                {/* Source icon + route */}
                <div style={{ flexShrink: 0, fontSize: 12, color: 'var(--text2)', fontWeight: 700, minWidth: 80, marginTop: 1 }}>
                  <span title={log.source}>{SOURCE_ICONS[log.source] || '?'}</span>{' '}
                  <span style={{ fontSize: 11 }}>{log.source}</span>
                </div>

                {/* Message */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: open ? 'normal' : 'nowrap' }}>
                    {log.message}
                  </div>
                  {log.route && (
                    <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2, fontFamily: 'monospace' }}>{log.route}</div>
                  )}
                </div>

                {/* Timestamp */}
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', whiteSpace: 'nowrap' }}>{fmtRelative(log.created_at)}</div>
                  <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 1 }}>{fmtTs(log.created_at)}</div>
                </div>

                <span style={{ flexShrink: 0, fontSize: 16, color: 'var(--text2)', marginTop: 2 }}>{open ? '▲' : '▼'}</span>
              </div>

              {/* Expanded detail */}
              {open && (
                <div style={{ padding: '0 16px 16px', borderTop: '1px solid #F0EAE0' }}>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 12, marginTop: 12, flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-sm"
                      style={{ background: log.resolved ? '#F5F3EE' : '#16A34A', color: log.resolved ? 'var(--text)' : '#fff', border: log.resolved ? '1.5px solid #E5E0D5' : 'none' }}
                      disabled={acting[log.id]}
                      onClick={() => handleResolve(log.id, log.resolved)}
                    >
                      {acting[log.id] ? '…' : log.resolved ? 'Reopen' : 'Mark resolved'}
                    </button>
                    {log.user_id && (
                      <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 700, alignSelf: 'center' }}>
                        User: <code style={{ fontSize: 11, background: '#F5F3EE', padding: '2px 6px', borderRadius: 4 }}>{log.user_id}</code>
                      </span>
                    )}
                  </div>

                  {log.stack && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>Stack trace</div>
                      <pre style={{ fontSize: 11, background: '#1A1209', color: '#F5F3EE', borderRadius: 8, padding: '12px 16px', overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.6, maxHeight: 300 }}>
                        {log.stack}
                      </pre>
                    </div>
                  )}

                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>Metadata</div>
                      <pre style={{ fontSize: 11, background: '#F5F3EE', borderRadius: 8, padding: '10px 14px', overflow: 'auto', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    </div>
                  )}

                  <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text2)' }}>
                    ID: <code style={{ fontSize: 10, background: '#F5F3EE', padding: '2px 6px', borderRadius: 4 }}>{log.id}</code>
                    {' · '}
                    {fmtTs(log.created_at)}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {!loading && logs.length === 0 && (
          <div style={{ background: '#fff', border: '1.5px solid #E5E0D5', borderRadius: 10, padding: '48px', textAlign: 'center', color: 'var(--text2)' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>No errors found</div>
            <div style={{ fontSize: 13 }}>
              {search || level || source ? 'Try adjusting your filters.' : 'All clear for the selected time period.'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
