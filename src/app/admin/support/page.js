'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { adminFetch } from '@/lib/adminFetch';

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUSES   = ['open', 'in_progress', 'waiting_customer', 'resolved', 'closed'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];
const CATEGORIES = ['general', 'billing', 'campaign_help', 'technical', 'abuse'];

const STATUS_LABELS = {
  open:             'Open',
  in_progress:      'In progress',
  waiting_customer: 'Waiting',
  resolved:         'Resolved',
  closed:           'Closed',
};

const STATUS_COLOURS = {
  open:             { bg: '#EFF6FF', text: '#1D4ED8' },
  in_progress:      { bg: '#FEF9C3', text: '#854D0E' },
  waiting_customer: { bg: '#FEF3C7', text: '#92400E' },
  resolved:         { bg: '#F0FDF4', text: '#15803D' },
  closed:           { bg: '#F3F4F6', text: '#6B7280' },
};

const PRIORITY_COLOURS = {
  low:    '#9CA3AF',
  normal: '#3B82F6',
  high:   '#F97316',
  urgent: '#DC2626',
};

const CATEGORY_LABELS = {
  general:       'General',
  billing:       'Billing',
  campaign_help: 'Campaign Help',
  technical:     'Technical',
  abuse:         'Abuse',
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return `${mins}m ago`;
}

// ── Styles ───────────────────────────────────────────────────────────────────

const card = {
  background: '#FFFFFF',
  borderRadius: 16,
  border: '1.5px solid #E5E0D5',
  padding: '20px 24px',
};

const badge = (colours) => ({
  display: 'inline-block',
  padding: '2px 10px',
  borderRadius: 20,
  fontSize: 11,
  fontWeight: 700,
  background: colours.bg,
  color: colours.text,
});

const select = {
  padding: '6px 10px',
  borderRadius: 8,
  border: '1.5px solid #E5E0D5',
  fontSize: 12,
  fontFamily: 'inherit',
  background: '#fff',
  color: '#1A1209',
  cursor: 'pointer',
};

const btn = (bg = '#7C3AED', text = '#fff') => ({
  padding: '8px 16px',
  borderRadius: 8,
  border: 'none',
  background: bg,
  color: text,
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit',
});

// ── Main Component ────────────────────────────────────────────────────────────

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState('tickets');

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 900, color: '#1A1209', margin: 0 }}>Support</h1>
          <p style={{ color: '#9C8060', fontSize: 13, marginTop: 4, marginBottom: 0 }}>Manage customer support tickets</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1.5px solid #E5E0D5', paddingBottom: 0 }}>
        {[
          { id: 'tickets', label: 'Tickets' },
          { id: 'canned',  label: 'Canned Responses' },
          { id: 'metrics', label: 'Metrics' },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderBottom: activeTab === id ? '2px solid #7C3AED' : '2px solid transparent',
              background: 'none',
              color: activeTab === id ? '#7C3AED' : '#6B7280',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'inherit',
              marginBottom: -2,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'tickets' && <TicketsTab />}
      {activeTab === 'canned'  && <CannedTab />}
      {activeTab === 'metrics' && <MetricsTab />}
    </div>
  );
}

// ── Tickets Tab ───────────────────────────────────────────────────────────────

function TicketsTab() {
  const [tickets,      setTickets]      = useState([]);
  const [total,        setTotal]        = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [selectedId,   setSelectedId]   = useState(null);
  const [search,       setSearch]       = useState('');
  const [filterStatus,   setFilterStatus]   = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [adminProfiles, setAdminProfiles] = useState([]);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: '1', limit: '50' });
    if (filterStatus)   params.set('status',   filterStatus);
    if (filterPriority) params.set('priority', filterPriority);
    if (filterCategory) params.set('category', filterCategory);
    if (search)         params.set('search',   search);

    try {
      const res  = await adminFetch(`/api/admin/support/tickets?${params}`);
      const data = await res.json();
      setTickets(data.tickets || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    }
    setLoading(false);
  }, [filterStatus, filterPriority, filterCategory, search]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  // Fetch admin profiles for assignee selector
  useEffect(() => {
    adminFetch('/api/admin/support/tickets?limit=1')
      .then(() => {})
      .catch(() => {});
  }, []);

  const openCount      = tickets.filter((t) => t.status === 'open').length;
  const inProgressCount = tickets.filter((t) => t.status === 'in_progress').length;
  const breachedCount  = tickets.filter((t) => t.sla_level).length;

  return (
    <div style={{ display: 'flex', gap: 0, height: 'calc(100vh - 180px)', minHeight: 500 }}>
      {/* Left Panel */}
      <div style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: '1.5px solid #E5E0D5', paddingRight: 20, overflowY: 'auto' }}>
        {/* Search */}
        <input
          placeholder="Search tickets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid #E5E0D5', fontSize: 12, fontFamily: 'inherit', marginBottom: 10, color: '#1A1209' }}
        />

        {/* Filters */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ ...select, flex: 1 }}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} style={{ ...select, flex: 1 }}>
            <option value="">All priorities</option>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} style={{ ...select, flex: 1 }}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
          </select>
        </div>

        {/* Metrics bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {[
            { label: 'Open', count: openCount, bg: '#EFF6FF', text: '#1D4ED8' },
            { label: 'Active', count: inProgressCount, bg: '#FEF9C3', text: '#854D0E' },
            { label: 'Breached', count: breachedCount, bg: '#FEF2F2', text: '#DC2626' },
          ].map(({ label, count, bg, text }) => (
            <div key={label} style={{ flex: 1, textAlign: 'center', background: bg, borderRadius: 8, padding: '6px 4px' }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: text }}>{count}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: text, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Ticket list */}
        {loading ? (
          <div style={{ color: '#9C8060', fontSize: 13, textAlign: 'center', paddingTop: 20 }}>Loading...</div>
        ) : tickets.length === 0 ? (
          <div style={{ color: '#9C8060', fontSize: 13, textAlign: 'center', paddingTop: 20 }}>No tickets found</div>
        ) : (
          tickets.map((t) => (
            <TicketListItem
              key={t.id}
              ticket={t}
              selected={selectedId === t.id}
              onClick={() => setSelectedId(t.id)}
            />
          ))
        )}
      </div>

      {/* Right Panel */}
      <div style={{ flex: 1, paddingLeft: 24, overflowY: 'auto', minWidth: 0 }}>
        {selectedId ? (
          <TicketDetail
            ticketId={selectedId}
            onUpdate={fetchTickets}
            onClose={() => setSelectedId(null)}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9C8060', fontSize: 14 }}>
            Select a ticket to view the conversation
          </div>
        )}
      </div>
    </div>
  );
}

function TicketListItem({ ticket, selected, onClick }) {
  const sc = STATUS_COLOURS[ticket.status] || STATUS_COLOURS.open;
  return (
    <div
      onClick={onClick}
      style={{
        padding: '12px 14px',
        borderRadius: 10,
        border: `1.5px solid ${selected ? '#7C3AED' : '#E5E0D5'}`,
        background: selected ? '#F5F0FF' : '#fff',
        marginBottom: 8,
        cursor: 'pointer',
        transition: 'all .15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 900, color: '#7C3AED', fontFamily: 'monospace' }}>{ticket.ticket_ref}</span>
        {ticket.sla_level && <span title={`SLA breach: ${ticket.sla_level}`} style={{ fontSize: 12 }}>⚠️</span>}
        <span style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: PRIORITY_COLOURS[ticket.priority] || '#9CA3AF', display: 'inline-block', flexShrink: 0 }} title={`Priority: ${ticket.priority}`} />
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#1A1209', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {ticket.subject}
      </div>
      <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 6 }}>
        {ticket.contact_name} — <span style={{ background: '#F0EDE5', borderRadius: 4, padding: '1px 6px', fontWeight: 700 }}>{CATEGORY_LABELS[ticket.category] || ticket.category}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ ...badge(sc), fontSize: 10 }}>{STATUS_LABELS[ticket.status]}</span>
        <span style={{ fontSize: 10, color: '#9C8060' }}>{timeAgo(ticket.created_at)}</span>
      </div>
    </div>
  );
}

// ── Ticket Detail ─────────────────────────────────────────────────────────────

function TicketDetail({ ticketId, onUpdate, onClose }) {
  const [data,          setData]          = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [replyBody,     setReplyBody]     = useState('');
  const [isInternal,    setIsInternal]    = useState(false);
  const [sending,       setSending]       = useState(false);
  const [canned,        setCanned]        = useState([]);
  const [showCanned,    setShowCanned]    = useState(false);
  const [adminProfiles, setAdminProfiles] = useState([]);
  const [mergeInput,    setMergeInput]    = useState('');
  const [showMerge,     setShowMerge]     = useState(false);
  const bottomRef = useRef(null);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch(`/api/admin/support/tickets/${ticketId}`);
      const d   = await res.json();
      setData(d);
    } catch (err) {
      console.error('Failed to fetch ticket detail:', err);
    }
    setLoading(false);
  }, [ticketId]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  useEffect(() => {
    adminFetch('/api/admin/support/canned')
      .then((r) => r.json())
      .then((d) => setCanned(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data?.messages]);

  const patchTicket = async (updates) => {
    await adminFetch(`/api/admin/support/tickets/${ticketId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(updates),
    });
    fetchDetail();
    onUpdate();
  };

  const sendReply = async () => {
    if (!replyBody.trim()) return;
    setSending(true);
    await adminFetch(`/api/admin/support/tickets/${ticketId}/reply`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ body: replyBody.trim(), is_internal: isInternal }),
    });
    setReplyBody('');
    setSending(false);
    fetchDetail();
    onUpdate();
  };

  const closeTicket = async () => {
    if (!confirm('Close this ticket and send a satisfaction survey to the customer?')) return;
    await adminFetch(`/api/admin/support/tickets/${ticketId}/close`, { method: 'POST' });
    fetchDetail();
    onUpdate();
  };

  const mergeTicket = async () => {
    if (!mergeInput.trim()) return;
    // Accept either a ticket ID or ticket_ref like TKT-0001
    const res  = await adminFetch(`/api/admin/support/tickets/${ticketId}/merge`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ merge_into_id: mergeInput.trim() }),
    });
    const json = await res.json();
    if (json.ok) {
      alert(`Merged into ${json.target_ref}`);
      setShowMerge(false);
      onClose();
      onUpdate();
    } else {
      alert(json.error || 'Merge failed');
    }
  };

  if (loading) return <div style={{ color: '#9C8060', fontSize: 13 }}>Loading...</div>;
  if (!data || !data.ticket) return <div style={{ color: '#DC2626', fontSize: 13 }}>Ticket not found.</div>;

  const { ticket, messages } = data;
  const sc = STATUS_COLOURS[ticket.status] || STATUS_COLOURS.open;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 900, color: '#7C3AED', fontSize: 13 }}>{ticket.ticket_ref}</span>
              <span style={{ ...badge(sc) }}>{STATUS_LABELS[ticket.status]}</span>
              {ticket.satisfaction && (
                <span style={{ fontSize: 13 }}>{ticket.satisfaction === 'positive' ? '👍' : '👎'}</span>
              )}
            </div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#1A1209', lineHeight: 1.3 }}>{ticket.subject}</h2>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
              {ticket.contact_name} — <a href={`mailto:${ticket.contact_email}`} style={{ color: '#7C3AED' }}>{ticket.contact_email}</a>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={() => setShowMerge((v) => !v)} style={{ ...btn('#F5F3EE', '#4A3728'), border: '1.5px solid #E5E0D5' }}>Merge</button>
            {ticket.status !== 'closed' && (
              <button onClick={closeTicket} style={{ ...btn('#DC2626') }}>Close ticket</button>
            )}
          </div>
        </div>

        {/* Inline controls */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#6B7280' }}>
            Status
            <select value={ticket.status} onChange={(e) => patchTicket({ status: e.target.value })} style={{ ...select, display: 'block', marginTop: 3 }}>
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </label>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#6B7280' }}>
            Priority
            <select value={ticket.priority} onChange={(e) => patchTicket({ priority: e.target.value })} style={{ ...select, display: 'block', marginTop: 3 }}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </label>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#6B7280' }}>
            Category
            <select value={ticket.category} onChange={(e) => patchTicket({ category: e.target.value })} style={{ ...select, display: 'block', marginTop: 3 }}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
          </label>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#6B7280' }}>
            Opened
            <div style={{ fontSize: 12, color: '#4A3728', marginTop: 3, paddingTop: 7 }}>{new Date(ticket.created_at).toLocaleString('en-AU')}</div>
          </label>
        </div>

        {/* Merge input */}
        {showMerge && (
          <div style={{ marginTop: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              placeholder="Paste target ticket UUID..."
              value={mergeInput}
              onChange={(e) => setMergeInput(e.target.value)}
              style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: '1.5px solid #E5E0D5', fontSize: 12, fontFamily: 'inherit' }}
            />
            <button onClick={mergeTicket} style={{ ...btn('#7C3AED') }}>Merge into</button>
            <button onClick={() => setShowMerge(false)} style={{ ...btn('#F5F3EE', '#4A3728'), border: '1.5px solid #E5E0D5' }}>Cancel</button>
          </div>
        )}
      </div>

      {/* Conversation thread */}
      <div style={{ flex: 1, overflowY: 'auto', marginBottom: 16 }}>
        {messages.length === 0 && (
          <div style={{ color: '#9C8060', fontSize: 13, textAlign: 'center', padding: 20 }}>No messages yet.</div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Reply composer */}
      <div style={{ ...card, flexShrink: 0 }}>
        {/* Toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          {[
            { val: false, label: 'Reply to customer' },
            { val: true,  label: 'Internal note' },
          ].map(({ val, label }) => (
            <button
              key={String(val)}
              onClick={() => setIsInternal(val)}
              style={{
                padding: '5px 14px', borderRadius: 20, border: '1.5px solid',
                borderColor: isInternal === val ? (val ? '#D97706' : '#7C3AED') : '#E5E0D5',
                background:  isInternal === val ? (val ? '#FEF3C7' : '#F5F0FF') : '#fff',
                color:        isInternal === val ? (val ? '#92400E' : '#7C3AED') : '#6B7280',
                fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {label}
            </button>
          ))}
          <div style={{ marginLeft: 'auto', position: 'relative' }}>
            <button
              onClick={() => setShowCanned((v) => !v)}
              style={{ ...btn('#F5F3EE', '#4A3728'), border: '1.5px solid #E5E0D5', fontSize: 11 }}
            >
              Canned responses
            </button>
            {showCanned && (
              <div style={{ position: 'absolute', right: 0, bottom: '100%', marginBottom: 6, background: '#fff', border: '1.5px solid #E5E0D5', borderRadius: 10, padding: 8, width: 280, boxShadow: '0 4px 20px rgba(0,0,0,.1)', zIndex: 100, maxHeight: 260, overflowY: 'auto' }}>
                {canned.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#9C8060', padding: '8px 4px' }}>No canned responses yet.</div>
                ) : (
                  canned.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => { setReplyBody(c.body); setShowCanned(false); }}
                      style={{ padding: '8px 10px', borderRadius: 8, cursor: 'pointer', marginBottom: 4 }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#F5F3EE'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                    >
                      <div style={{ fontWeight: 700, fontSize: 12, color: '#1A1209' }}>{c.title}</div>
                      <div style={{ fontSize: 11, color: '#6B7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.body}</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <textarea
          rows={4}
          placeholder={isInternal ? 'Internal note (not visible to customer)...' : 'Reply to customer...'}
          value={replyBody}
          onChange={(e) => setReplyBody(e.target.value)}
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 13,
            border: `1.5px solid ${isInternal ? '#D97706' : '#E5E0D5'}`,
            background: isInternal ? '#FFFBEB' : '#F9F8F5',
            fontFamily: 'inherit', resize: 'vertical', color: '#1A1209', boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <button
            onClick={sendReply}
            disabled={sending || !replyBody.trim()}
            style={{
              ...btn(sending || !replyBody.trim() ? '#E5E0D5' : '#7C3AED'),
              color: sending || !replyBody.trim() ? '#9C8060' : '#fff',
            }}
          >
            {sending ? 'Sending...' : isInternal ? 'Add note' : 'Send reply'}
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }) {
  if (message.is_internal) {
    return (
      <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '12px 16px', marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Internal note</span>
          <span style={{ fontSize: 11, color: '#9C8060' }}>{message.sender_name} — {new Date(message.created_at).toLocaleString('en-AU')}</span>
        </div>
        <div style={{ fontSize: 13, color: '#78350F', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{message.body}</div>
      </div>
    );
  }

  const isAdmin = message.sender_type === 'admin';
  return (
    <div style={{ display: 'flex', justifyContent: isAdmin ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
      <div style={{
        maxWidth: '80%',
        background: isAdmin ? '#F5F0FF' : '#F5F3EE',
        border: `1px solid ${isAdmin ? '#DDD6FE' : '#E5E0D5'}`,
        borderRadius: isAdmin ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        padding: '12px 16px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: isAdmin ? '#7C3AED' : '#4A3728' }}>
            {message.sender_name || (isAdmin ? 'Support team' : 'Customer')}
          </span>
          <span style={{ fontSize: 11, color: '#9C8060', whiteSpace: 'nowrap' }}>{new Date(message.created_at).toLocaleString('en-AU')}</span>
        </div>
        <div style={{ fontSize: 13, color: '#1A1209', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{message.body}</div>
      </div>
    </div>
  );
}

// ── Canned Responses Tab ──────────────────────────────────────────────────────

function CannedTab() {
  const [responses, setResponses] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [title,     setTitle]     = useState('');
  const [body,      setBody]      = useState('');
  const [category,  setCategory]  = useState('');
  const [saving,    setSaving]    = useState(false);

  const fetchCanned = async () => {
    setLoading(true);
    const res  = await adminFetch('/api/admin/support/canned');
    const data = await res.json();
    setResponses(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { fetchCanned(); }, []);

  const handleCreate = async () => {
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    await adminFetch('/api/admin/support/canned', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ title: title.trim(), body: body.trim(), category: category.trim() || null }),
    });
    setTitle(''); setBody(''); setCategory('');
    setSaving(false);
    fetchCanned();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this canned response?')) return;
    await adminFetch(`/api/admin/support/canned/${id}`, { method: 'DELETE' });
    fetchCanned();
  };

  return (
    <div style={{ maxWidth: 720 }}>
      {/* Create form */}
      <div style={{ ...card, marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 800, color: '#1A1209' }}>New canned response</h3>
        <input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #E5E0D5', fontSize: 13, fontFamily: 'inherit', marginBottom: 10, color: '#1A1209', boxSizing: 'border-box' }}
        />
        <textarea
          placeholder="Response body..."
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #E5E0D5', fontSize: 13, fontFamily: 'inherit', marginBottom: 10, resize: 'vertical', color: '#1A1209', boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...select }}>
            <option value="">No category</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
          </select>
          <button
            onClick={handleCreate}
            disabled={saving || !title.trim() || !body.trim()}
            style={{ ...btn(saving || !title.trim() || !body.trim() ? '#E5E0D5' : '#7C3AED'), color: saving || !title.trim() || !body.trim() ? '#9C8060' : '#fff' }}
          >
            {saving ? 'Saving...' : 'Save response'}
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ color: '#9C8060', fontSize: 13 }}>Loading...</div>
      ) : responses.length === 0 ? (
        <div style={{ color: '#9C8060', fontSize: 13 }}>No canned responses yet. Create one above.</div>
      ) : (
        responses.map((r) => (
          <div key={r.id} style={{ ...card, marginBottom: 12, display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: '#1A1209', marginBottom: 4 }}>
                {r.title}
                {r.category && <span style={{ marginLeft: 8, background: '#F0EDE5', borderRadius: 4, padding: '1px 7px', fontSize: 10, fontWeight: 700, color: '#6B7280' }}>{CATEGORY_LABELS[r.category] || r.category}</span>}
              </div>
              <div style={{ fontSize: 13, color: '#4A3728', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{r.body}</div>
            </div>
            <button onClick={() => handleDelete(r.id)} style={{ ...btn('#FEF2F2', '#DC2626'), border: '1px solid #FECACA', flexShrink: 0, alignSelf: 'flex-start' }}>Delete</button>
          </div>
        ))
      )}
    </div>
  );
}

// ── Metrics Tab ───────────────────────────────────────────────────────────────

function MetricsTab() {
  const [tickets,  setTickets]  = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    adminFetch('/api/admin/support/tickets?limit=200')
      .then((r) => r.json())
      .then((d) => { setTickets(d.tickets || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ color: '#9C8060', fontSize: 13 }}>Loading...</div>;

  const open     = tickets.filter((t) => t.status === 'open').length;
  const resolved = tickets.filter((t) => ['resolved','closed'].includes(t.status));
  const now      = new Date();
  const weekAgo  = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const resolvedThisWeek = resolved.filter((t) => new Date(t.closed_at || t.updated_at) > weekAgo).length;

  const positiveCount = tickets.filter((t) => t.satisfaction === 'positive').length;
  const ratedCount    = tickets.filter((t) => t.satisfaction).length;
  const satisfactionPct = ratedCount > 0 ? Math.round((positiveCount / ratedCount) * 100) : null;

  // Category breakdown
  const catCounts = {};
  for (const c of CATEGORIES) catCounts[c] = tickets.filter((t) => t.category === c).length;

  return (
    <div style={{ maxWidth: 800 }}>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Open tickets',           value: open,                                     colour: '#1D4ED8' },
          { label: 'Resolved this week',     value: resolvedThisWeek,                         colour: '#15803D' },
          { label: 'Total tickets',          value: tickets.length,                           colour: '#7C3AED' },
          { label: 'Satisfaction score',     value: satisfactionPct !== null ? `${satisfactionPct}%` : 'N/A', colour: '#D97706' },
        ].map(({ label, value, colour }) => (
          <div key={label} style={{ ...card, textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 900, color: colour }}>{value}</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* By category */}
      <div style={card}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 800, color: '#1A1209' }}>Tickets by category</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1.5px solid #E5E0D5' }}>
              <th style={{ textAlign: 'left', padding: '8px 0', color: '#6B7280', fontWeight: 700 }}>Category</th>
              <th style={{ textAlign: 'right', padding: '8px 0', color: '#6B7280', fontWeight: 700 }}>Count</th>
              <th style={{ textAlign: 'right', padding: '8px 0', color: '#6B7280', fontWeight: 700 }}>% of total</th>
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map((c) => (
              <tr key={c} style={{ borderBottom: '1px solid #F0EAE0' }}>
                <td style={{ padding: '10px 0', color: '#1A1209', fontWeight: 600 }}>{CATEGORY_LABELS[c]}</td>
                <td style={{ padding: '10px 0', textAlign: 'right', color: '#4A3728' }}>{catCounts[c]}</td>
                <td style={{ padding: '10px 0', textAlign: 'right', color: '#9C8060' }}>
                  {tickets.length > 0 ? `${Math.round((catCounts[c] / tickets.length) * 100)}%` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
