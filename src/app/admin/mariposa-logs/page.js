'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient, supabaseConfigured } from '@/lib/supabase/client';

export default function MariposaLogsPage() {
  const [sessions,    setSessions]    = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages,    setMessages]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [search,      setSearch]      = useState('');
  const [filterType,  setFilterType]  = useState('all'); // all | fundraiser | general

  useEffect(() => { loadSessions(); }, []);

  const loadSessions = async () => {
    setLoading(true);
    if (!supabaseConfigured) { setSessions(DEMO_SESSIONS); setLoading(false); return; }

    // Aggregate by session_id: last message time, message count, fundraiser_id
    const { data, error } = await getSupabaseClient()
      .from('mariposa_chats')
      .select('session_id, fundraiser_id, created_at, fundraisers(title, org)')
      .order('created_at', { ascending: false })
      .limit(2000);

    if (error) { console.error(error); setLoading(false); return; }

    // Group into sessions
    const map = new Map();
    for (const row of (data ?? [])) {
      if (!map.has(row.session_id)) {
        map.set(row.session_id, {
          session_id:    row.session_id,
          fundraiser_id: row.fundraiser_id,
          fundraiser:    row.fundraisers,
          last_at:       row.created_at,
          count:         1,
        });
      } else {
        const s = map.get(row.session_id);
        s.count++;
        if (row.created_at > s.last_at) s.last_at = row.created_at;
      }
    }

    const sorted = [...map.values()].sort((a, b) => b.last_at.localeCompare(a.last_at));
    setSessions(sorted);
    setLoading(false);
  };

  const loadMessages = async (session) => {
    setActiveSession(session);
    setLoadingMsgs(true);
    setMessages([]);

    if (!supabaseConfigured) {
      setMessages(DEMO_MESSAGES);
      setLoadingMsgs(false);
      return;
    }

    const { data, error } = await getSupabaseClient()
      .from('mariposa_chats')
      .select('*')
      .eq('session_id', session.session_id)
      .order('created_at', { ascending: true });

    if (error) console.error(error);
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
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 900, marginBottom: 4 }}>Mariposa chat logs</h1>
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
                    textAlign: 'left', background: activeSession?.session_id === s.session_id ? '#EDE9FE' : '#fff',
                    border: `1.5px solid ${activeSession?.session_id === s.session_id ? '#7C3AED' : 'var(--border)'}`,
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
                    <div style={{ fontSize: 11, color: '#5B21B6', fontWeight: 600, marginBottom: 2 }}>
                      🗂️ {s.fundraiser.title}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>General visitor</div>
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

              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '65vh', overflowY: 'auto' }}>
                {loadingMsgs ? (
                  <div style={{ color: 'var(--text2)', fontSize: 13 }}>Loading…</div>
                ) : messages.map((m) => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', gap: 8 }}>
                    {m.role === 'assistant' && (
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, marginTop: 2 }}>🐰</div>
                    )}
                    <div style={{ maxWidth: '70%' }}>
                      <div style={{
                        padding: '10px 14px', borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        background: m.role === 'user' ? 'linear-gradient(135deg, #7C3AED, #4A28D4)' : '#F5F3EE',
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
