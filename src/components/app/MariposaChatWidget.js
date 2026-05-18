'use client';

import { useState, useRef, useEffect } from 'react';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

const GREETING = `G'day! I'm Mariposa — a baseball-loving jackrabbit and your LuckySquares guide. 🍀⚾

Whether you're setting up your first fundraiser, trying to figure out how squares work, or just curious about me and my story — I'm here for all of it.

What can I help you with today?`;

export default function MariposaChatWidget() {
  const [open,     setOpen]     = useState(false);
  const [messages, setMessages] = useState([{ role: 'assistant', content: GREETING }]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [escalate, setEscalate] = useState(false);
  const [email,    setEmail]    = useState('');
  const [question, setQuestion] = useState('');
  const [sent,     setSent]     = useState(false);
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');

    const next = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setLoading(true);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/mariposa-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next.filter((m) => m.role !== 'system') }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply ?? "Hmm, I fumbled that one! Try again?" }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: "Something went sideways on my end! Give it another pitch." }]);
    }
    setLoading(false);
  };

  const handleEscalate = async () => {
    if (!email.trim()) return;
    const lastQ = question.trim() || messages.filter((m) => m.role === 'user').slice(-1)[0]?.content || 'General enquiry';
    // Send via transactional-email Edge Function
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/transactional-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'admin_new_org_application',
          to: 'support@luckysquares.com.au',
          data: {
            org_name:     'Chat escalation',
            abn:          'N/A',
            org_type:     'Support request via Mariposa chat',
            contact_name: email,
            contact_email: email,
            applied_date:  new Date().toLocaleDateString('en-AU'),
            suburb:        lastQ,
          },
        }),
      });
    } catch { /* silent */ }
    setSent(true);
  };

  const renderMessage = (text, role) => {
    const parts = text.split(/(https?:\/\/[^\s]+)/g);
    return parts.map((part, i) =>
      part.startsWith('http') ? (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: role === 'user' ? 'rgba(255,255,255,0.9)' : '#5B21B6', textDecoration: 'underline', wordBreak: 'break-all' }}
        >
          {part}
        </a>
      ) : (
        part
      )
    );
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Chat with Mariposa"
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9000,
          width: 60, height: 60, borderRadius: '50%',
          background: 'linear-gradient(135deg, #A78BFA, #7C3AED, #4A28D4)',
          border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(107,70,245,.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, transition: 'transform .2s, box-shadow .2s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(107,70,245,.55)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(107,70,245,.4)'; }}
      >
        {open ? '✕' : '💬'}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 96, right: 24, zIndex: 8999,
          width: 340, maxHeight: '70vh',
          display: 'flex', flexDirection: 'column',
          background: '#fff', borderRadius: 20,
          boxShadow: '0 8px 48px rgba(61,46,26,.18)',
          border: '1.5px solid #E5E0D5', overflow: 'hidden',
        }}>

          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #2D1B69, #4A28D4, #7C3AED)',
            padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: '50%',
              background: 'rgba(255,255,255,.12)', border: '2px solid rgba(255,255,255,.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0,
            }}>🐰</div>
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 15, fontFamily: 'var(--font-serif)' }}>Mariposa</div>
              <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 11, fontWeight: 600 }}>LuckySquares guide</div>
            </div>
            <div style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: '#4ADE80' }} title="Online" />
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '16px 16px 0',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '85%', padding: '10px 14px', borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: m.role === 'user' ? 'linear-gradient(135deg, #7C3AED, #4A28D4)' : '#F5F3EE',
                  color: m.role === 'user' ? '#fff' : '#1A1209',
                  fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {renderMessage(m.content, m.role)}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ background: '#F5F3EE', borderRadius: '16px 16px 16px 4px', padding: '10px 16px' }}>
                  <span style={{ display: 'inline-flex', gap: 4 }}>
                    {[0,1,2].map((i) => (
                      <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#7C3AED', display: 'inline-block', animation: `bounce 1s ${i * 0.2}s infinite` }} />
                    ))}
                  </span>
                </div>
              </div>
            )}

            {/* Escalate to support */}
            {!escalate && !sent && messages.length > 2 && (
              <div style={{ textAlign: 'center', margin: '4px 0 8px' }}>
                <button
                  onClick={() => setEscalate(true)}
                  style={{ background: 'none', border: 'none', fontSize: 11, color: '#9CA3AF', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
                >
                  Still need help? Email our support team
                </button>
              </div>
            )}

            {escalate && !sent && (
              <div style={{ background: '#F5F3EE', borderRadius: 12, padding: 14, margin: '4px 0 8px', fontSize: 13 }}>
                <div style={{ fontWeight: 700, marginBottom: 8, color: '#1A1209' }}>Send us a message</div>
                <input
                  className="form-input"
                  placeholder="Your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ marginBottom: 8, fontSize: 12 }}
                />
                <textarea
                  className="form-input"
                  placeholder="Your question (optional)"
                  rows={2}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  style={{ marginBottom: 8, fontSize: 12, resize: 'none' }}
                />
                <button className="btn btn-purple" style={{ width: '100%', fontSize: 12 }} onClick={handleEscalate} disabled={!email.trim()}>
                  Send to support
                </button>
              </div>
            )}

            {sent && (
              <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 12, padding: 12, margin: '4px 0 8px', fontSize: 13, color: '#065F46', textAlign: 'center' }}>
                Got it! The support team will be in touch within one business day.
              </div>
            )}

            <div ref={bottomRef} style={{ height: 1 }} />
          </div>

          {/* Input */}
          <div style={{ padding: '12px 12px 14px', borderTop: '1px solid #F0EDE5', flexShrink: 0, display: 'flex', gap: 8 }}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Ask Mariposa anything…"
              disabled={loading}
              style={{
                flex: 1, padding: '10px 14px', border: '1.5px solid #E5E0D5', borderRadius: 24,
                fontSize: 13, fontFamily: 'inherit', outline: 'none', background: '#F9F8F5',
                color: '#1A1209',
              }}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              style={{
                width: 38, height: 38, borderRadius: '50%', border: 'none',
                background: input.trim() ? 'linear-gradient(135deg, #7C3AED, #4A28D4)' : '#E5E0D5',
                color: '#fff', cursor: input.trim() ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, flexShrink: 0, transition: 'background .2s',
              }}
            >
              ➤
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
      `}</style>
    </>
  );
}
