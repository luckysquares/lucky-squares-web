'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient, supabaseConfigured } from '@/lib/supabase/client';

export default function MariposaLogsPage() {
  const [sessions,    setSessions]    = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages,    setMessages]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [loadError,   setLoadError]   = useState('');
  const [search,      setSearch]      = useState('');
  const [filterType,  setFilterType]  = useState('all'); // all | fundraiser | general

  const [attributions,    setAttributions]    = useState({}); // session_id -> { contact_id, name, organisation }
  const [contacts,        setContacts]        = useState([]);
  const [showPicker,      setShowPicker]      = useState(false);
  const [contactSearch,   setContactSearch]   = useState('');
  const [newContactName,  setNewContactName]  = useState('');
  const [savingAttribution, setSavingAttribution] = useState(false);

  const loadContacts = async () => {
    if (!supabaseConfigured) { setContacts(DEMO_CONTACTS); return; }
    const { data } = await getSupabaseClient()
      .from('marketing_contacts')
      .select('id, name, organisation')
      .order('name');
    setContacts(data ?? []);
  };

  const loadAttributions = async (sessionIds) => {
    if (!supabaseConfigured || !sessionIds.length) return {};
    const { data } = await getSupabaseClient()
      .from('mariposa_chat_attributions')
      .select('session_id, contact_id, marketing_contacts(name, organisation)')
      .in('session_id', sessionIds);
    const map = {};
    for (const row of (data ?? [])) {
      map[row.session_id] = {
        contact_id:   row.contact_id,
        name:         row.marketing_contacts?.name ?? 'Unknown contact',
        organisation: row.marketing_contacts?.organisation ?? '',
      };
    }
    return map;
  };

  const loadSessions = async () => {
    setLoading(true);
    setLoadError('');
    if (!supabaseConfigured) { setSessions(DEMO_SESSIONS); setLoading(false); return; }

    const { data, error } = await getSupabaseClient()
      .from('mariposa_chats')
      .select('session_id, fundraiser_id, created_at, fundraisers(title, org)')
      .order('created_at', { ascending: false })
      .limit(2000);

    if (error) {
      setLoadError(`${error.message} (${error.code})`);
      setLoading(false);
      return;
    }

    // Group rows into sessions client-side
    const map = new Map();
    for (const row of (data ?? [])) {
      if (!map.has(row.session_id)) {
        map.set(row.session_id, {
          session_id:    row.session_id,
          fundraiser_id: row.fundraiser_id,
          fundraiser:    row.fundraisers ?? null,
          last_at:       row.created_at,
          count:         1,
        });
      } else {
        const s = map.get(row.session_id);
        s.count++;
        if (row.created_at > s.last_at) s.last_at = row.created_at;
      }
    }

    const list = [...map.values()].sort((a, b) => b.last_at.localeCompare(a.last_at));
    setSessions(list);
    setLoading(false);

    const attrs = await loadAttributions(list.map((s) => s.session_id));
    setAttributions(attrs);
  };

  useEffect(() => { loadSessions(); loadContacts(); }, []);

  const attributeTo = async (sessionId, contactId) => {
    setSavingAttribution(true);
    if (supabaseConfigured) {
      const { data: { user } } = await getSupabaseClient().auth.getUser();
      await getSupabaseClient()
        .from('mariposa_chat_attributions')
        .upsert({ session_id: sessionId, contact_id: contactId, attributed_by: user?.id ?? null }, { onConflict: 'session_id' });
    }
    const contact = contacts.find((c) => c.id === contactId);
    setAttributions((prev) => ({ ...prev, [sessionId]: { contact_id: contactId, name: contact?.name ?? '', organisation: contact?.organisation ?? '' } }));
    setSavingAttribution(false);
    setShowPicker(false);
    setContactSearch('');
  };

  const createAndAttribute = async (sessionId, name) => {
    if (!name.trim()) return;
    setSavingAttribution(true);
    let contactId = null;
    if (supabaseConfigured) {
      const { data } = await getSupabaseClient()
        .from('marketing_contacts')
        .insert({ name: name.trim(), type: 'Mari chat lead' })
        .select('id')
        .single();
      contactId = data?.id;
      if (contactId) setContacts((prev) => [...prev, { id: contactId, name: name.trim(), organisation: null }]);
    } else {
      contactId = `demo-${Date.now()}`;
      setContacts((prev) => [...prev, { id: contactId, name: name.trim(), organisation: null }]);
    }
    if (contactId) await attributeTo(sessionId, contactId);
    setNewContactName('');
    setSavingAttribution(false);
  };

  const removeAttribution = async (sessionId) => {
    if (supabaseConfigured) {
      await getSupabaseClient().from('mariposa_chat_attributions').delete().eq('session_id', sessionId);
    }
    setAttributions((prev) => { const n = { ...prev }; delete n[sessionId]; return n; });
  };

  const loadMessages = async (session) => {
    setActiveSession(session);
    setLoadingMsgs(true);
    setMessages([]);
    setShowPicker(false);
    setContactSearch('');
    setNewContactName('');

    if (!supabaseConfigured) {
      setMessages(DEMO_MESSAGES);
      setLoadingMsgs(false);
      return;
    }

    const { data, error } = await getSupabaseClient()
      .from('mariposa_chats')
      .select('id, role, content, created_at')
      .eq('session_id', session.session_id)
      .order('created_at', { ascending: true });

    if (error) console.error('loadMessages error:', error);
    setMessages(data ?? []);
    setLoadingMsgs(false);
  };

  const filtered = sessions.filter((s) => {
    if (filterType === 'fundraiser' && !s.fundraiser_id) return false;
    if (filterType === 'general'    &&  s.fundraiser_id) return false;
    if (search) {
      const q = search.toLowerCase();
      if (s.session_id.toLowerCase().includes(q)) return true;
      if (s.fundraiser?.title?.toLowerCase().includes(q)) return true;
      if (s.fundraiser?.org?.toLowerCase().includes(q)) return true;
      return false;
    }
    return true;
  });

  const formatTime = (iso) => new Date(iso).toLocaleString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const shortId = (uuid) => uuid?.slice(0, 8) ?? '';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 900, margin: 0 }}>Mariposa chat logs</h1>
        <button onClick={loadSessions} disabled={loading} className="btn btn-outline btn-sm">
          {loading ? 'Loading…' : '↻ Refresh'}
        </button>
      </div>
      <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 28 }}>All conversations, retained for 90 days. Purged daily.</p>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

        {/* Session list */}
        <div style={{ width: 320, flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <input
              className="form-input"
              placeholder="Search sessions…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: 140 }}
            />
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {[['all','All'],['fundraiser','Fundraiser'],['general','General']].map(([v,l]) => (
              <button key={v} onClick={() => setFilterType(v)} className={`btn btn-sm ${filterType === v ? 'btn-primary' : 'btn-outline'}`}>{l}</button>
            ))}
          </div>

          {loading ? (
            <div style={{ color: 'var(--text2)', fontSize: 13, padding: '20px 0' }}>Loading sessions…</div>
          ) : loadError ? (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: '#B91C1C', lineHeight: 1.6 }}>
              <strong>RPC error:</strong> {loadError}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ color: 'var(--text2)', fontSize: 13, padding: '20px 0' }}>No sessions found.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, marginBottom: 2 }}>{filtered.length} session{filtered.length !== 1 ? 's' : ''}</div>
              {filtered.map((s) => (
                <button
                  key={s.session_id}
                  onClick={() => loadMessages(s)}
                  style={{
                    textAlign: 'left', background: activeSession?.session_id === s.session_id ? 'var(--purple-tint)' : '#fff',
                    border: `1.5px solid ${activeSession?.session_id === s.session_id ? 'var(--purple2)' : 'var(--border)'}`,
                    borderRadius: 10, padding: '10px 14px', cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'all .15s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--purple)', fontFamily: 'monospace' }}>
                      {shortId(s.session_id)}…
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600 }}>{s.count} msg{s.count !== 1 ? 's' : ''}</span>
                  </div>
                  {s.fundraiser ? (
                    <div style={{ fontSize: 11, color: 'var(--purple-text)', fontWeight: 600, marginBottom: 2 }}>
                      🗂️ {s.fundraiser.title}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>General visitor</div>
                  )}
                  {attributions[s.session_id] && (
                    <div style={{ fontSize: 11, color: '#0F766E', fontWeight: 700, marginBottom: 2 }}>
                      👤 {attributions[s.session_id].name}
                      {attributions[s.session_id].organisation ? ` (${attributions[s.session_id].organisation})` : ''}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: 'var(--text2)' }}>
                    {formatTime(s.last_at)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Conversation view */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!activeSession ? (
            <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 16, padding: '60px 40px', textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🐰</div>
              <div style={{ fontSize: 14, color: 'var(--text2)' }}>Select a session to view the conversation.</div>
            </div>
          ) : (
            <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ background: 'linear-gradient(135deg, #2D1B69, #4A28D4)', padding: '16px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 800, fontSize: 13, fontFamily: 'monospace' }}>
                      Session: {activeSession.session_id}
                    </div>
                    {activeSession.fundraiser && (
                      <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 12, marginTop: 2 }}>
                        {activeSession.fundraiser.title} — {activeSession.fundraiser.org}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', fontWeight: 600 }}>
                    {messages.length} messages
                  </div>
                </div>
              </div>

              {/* Attribution bar */}
              <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)', background: '#FAFAF8' }}>
                {attributions[activeSession.session_id] ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: 'var(--text2)' }}>Attributed to:</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#0F766E', background: '#CCFBF1', borderRadius: 99, padding: '4px 12px' }}>
                      👤 {attributions[activeSession.session_id].name}
                      {attributions[activeSession.session_id].organisation ? ` — ${attributions[activeSession.session_id].organisation}` : ''}
                    </span>
                    <button className="btn btn-outline btn-sm" style={{ fontSize: 11 }} onClick={() => setShowPicker((v) => !v)}>Change</button>
                    <button className="btn btn-outline btn-sm" style={{ fontSize: 11 }} onClick={() => removeAttribution(activeSession.session_id)}>Remove</button>
                  </div>
                ) : (
                  <button className="btn btn-outline btn-sm" style={{ fontSize: 12 }} onClick={() => setShowPicker((v) => !v)}>
                    + Attribute to a known contact
                  </button>
                )}

                {showPicker && (
                  <div style={{ marginTop: 10, background: '#fff', border: '1.5px solid var(--border)', borderRadius: 10, padding: 14, maxWidth: 360 }}>
                    <input
                      className="form-input"
                      placeholder="Search contacts…"
                      value={contactSearch}
                      onChange={(e) => setContactSearch(e.target.value)}
                      style={{ marginBottom: 8, fontSize: 13 }}
                      autoFocus
                    />
                    <div style={{ maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
                      {contacts
                        .filter((c) => !contactSearch || c.name.toLowerCase().includes(contactSearch.toLowerCase()) || c.organisation?.toLowerCase().includes(contactSearch.toLowerCase()))
                        .slice(0, 20)
                        .map((c) => (
                          <button
                            key={c.id}
                            disabled={savingAttribution}
                            onClick={() => attributeTo(activeSession.session_id, c.id)}
                            style={{ textAlign: 'left', background: 'none', border: 'none', padding: '6px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--cream)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                          >
                            {c.name}{c.organisation ? <span style={{ color: 'var(--text2)' }}> — {c.organisation}</span> : null}
                          </button>
                        ))}
                      {contacts.length === 0 && (
                        <div style={{ fontSize: 12, color: 'var(--text2)', padding: '4px 8px' }}>No contacts in the CRM yet.</div>
                      )}
                    </div>
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', gap: 8 }}>
                      <input
                        className="form-input"
                        placeholder="Or add a new contact by name…"
                        value={newContactName}
                        onChange={(e) => setNewContactName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && createAndAttribute(activeSession.session_id, newContactName)}
                        style={{ fontSize: 12, flex: 1 }}
                      />
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={!newContactName.trim() || savingAttribution}
                        onClick={() => createAndAttribute(activeSession.session_id, newContactName)}
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '65vh', overflowY: 'auto' }}>
                {loadingMsgs ? (
                  <div style={{ color: 'var(--text2)', fontSize: 13 }}>Loading…</div>
                ) : messages.map((m) => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', gap: 8 }}>
                    {m.role === 'assistant' && (
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--purple-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, marginTop: 2 }}>🐰</div>
                    )}
                    <div style={{ maxWidth: '70%' }}>
                      <div style={{
                        padding: '10px 14px', borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        background: m.role === 'user' ? 'linear-gradient(135deg, var(--purple2), #4A28D4)' : '#F5F3EE',
                        color: m.role === 'user' ? '#fff' : '#1A1209',
                        fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      }}>
                        {m.content}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3, textAlign: m.role === 'user' ? 'right' : 'left' }}>
                        {formatTime(m.created_at)}
                      </div>
                    </div>
                    {m.role === 'user' && (
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#E0E7FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, marginTop: 2 }}>👤</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Demo data ─────────────────────────────────────────────────────────────────
const DEMO_CONTACTS = [
  { id: 'demo-c1', name: 'Mel Thompson', organisation: 'Sunbury Primary P&C' },
  { id: 'demo-c2', name: 'Dave Kowalski', organisation: "L'Aces Masters Baseball" },
];

const DEMO_SESSIONS = [
  { session_id: 'a1b2c3d4-0000-0000-0000-000000000001', fundraiser_id: '1', fundraiser: { title: 'Koala Rescue Raffle', org: 'Wildlife Friends' }, last_at: new Date(Date.now() - 3600000).toISOString(), count: 8 },
  { session_id: 'e5f6a7b8-0000-0000-0000-000000000002', fundraiser_id: null, fundraiser: null, last_at: new Date(Date.now() - 7200000).toISOString(), count: 4 },
  { session_id: 'c9d0e1f2-0000-0000-0000-000000000003', fundraiser_id: '2', fundraiser: { title: 'School Fete Lucky Dip', org: 'Sunbury Primary P&C' }, last_at: new Date(Date.now() - 86400000).toISOString(), count: 12 },
];

const DEMO_MESSAGES = [
  { id: '1', role: 'assistant', content: "G'day! I'm Mariposa, a baseball-loving jackrabbit and your Lucky Squares guide. 🍀⚾\n\nWhat can I help you with today?", created_at: new Date(Date.now() - 3700000).toISOString() },
  { id: '2', role: 'user',      content: 'How does the draw work?', created_at: new Date(Date.now() - 3650000).toISOString() },
  { id: '3', role: 'assistant', content: "Great question! When you're ready to draw, just hit the Run Draw button on your fundraiser page. The platform randomly selects one of the sold squares as the winner. The result is recorded instantly and everyone viewing the page at that moment sees the winning square light up live. You can't run the draw until at least one square is sold. Go get 'em!", created_at: new Date(Date.now() - 3640000).toISOString() },
];
