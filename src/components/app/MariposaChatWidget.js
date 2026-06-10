'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { getSupabaseClient, supabaseConfigured } from '@/lib/supabase/client';

// Named routes that are never campaign slugs — skip the DB lookup for these
const KNOWN_ROUTES = new Set([
  'fundraise', 'admin', 'org', 'blog', 'betatest', 'api',
  'privacy', 'terms', 'faq', 'how-it-works', 'pricing',
  'contact', 'coming-soon', 'feeling-lucky', 'org-signup',
]);

// Extract fundraiser UUID from the current URL.
// Handles both legacy UUID paths (/f/uuid via redirect) and new slug paths (/sunbury-primary-2025).
// Also listens for the 'ls:campaign-loaded' event dispatched by the campaign page itself,
// which is more reliable than URL parsing (works for all URL formats, no timing issues).
function useFundraiserId() {
  const pathname = usePathname();
  const [fundraiserId, setFundraiserId] = useState(null);

  // Primary: listen for the campaign page to broadcast its resolved ID
  useEffect(() => {
    const handler = (e) => setFundraiserId(e.detail?.id ?? null);
    window.addEventListener('ls:campaign-loaded', handler);
    return () => window.removeEventListener('ls:campaign-loaded', handler);
  }, []);

  // Fallback: URL-based resolution — also resets the ID on every navigation
  // so Mariposa doesn't carry campaign context to unrelated pages
  useEffect(() => {
    setFundraiserId(null); // clear on any navigation first

    // Try UUID anywhere in the path (fast, no DB needed)
    const uuidMatch = pathname?.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
    if (uuidMatch) { setFundraiserId(uuidMatch[1]); return; }

    // For slug-based URLs: first path segment that isn't a known route
    const segment = pathname?.split('/').filter(Boolean)[0];
    if (!segment || KNOWN_ROUTES.has(segment) || !supabaseConfigured) return;

    getSupabaseClient()
      .from('fundraisers')
      .select('id')
      .eq('slug', segment)
      .maybeSingle()
      .then(({ data }) => { if (data?.id) setFundraiserId(data.id); });
  }, [pathname]);

  return fundraiserId;
}

// Read visitor's first name from the buyer details saved by the checkout "remember me" feature
function useVisitorName() {
  const [name, setName] = useState(null);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('ls_buyer_details') || 'null');
      if (saved?.name) setName(saved.name.trim().split(' ')[0]); // first name only
    } catch { /* ignore */ }
  }, []);
  return name;
}

// Extract blog slug when on a blog article page (/blog/[slug])
function useBlogSlug() {
  const pathname = usePathname();
  const match = pathname?.match(/^\/blog\/([^/]+)/);
  return match ? match[1] : null;
}

// Get the organiser's auth token when on /fundraise pages (so Mariposa can see their campaigns)
function useOrganiserToken() {
  const pathname = usePathname();
  const [token, setToken] = useState(null);
  const isOrganiserPage = pathname?.startsWith('/fundraise');

  useEffect(() => {
    if (!isOrganiserPage || !supabaseConfigured) { setToken(null); return; }
    getSupabaseClient().auth.getSession()
      .then(({ data: { session } }) => {
        setToken(session?.access_token ?? null);
      });
  }, [isOrganiserPage]);

  return token;
}


const GREETING = `G'day! I'm Mariposa, a baseball-loving jackrabbit and your Lucky Squares guide. 🍀⚾

Whether you're setting up your first fundraiser, figuring out how squares work, or just curious about me and my story, I'm here for all of it.

What can I help you with today?`;

export default function MariposaChatWidget() {
  const fundraiserId   = useFundraiserId();
  const visitorName    = useVisitorName();
  const blogSlug       = useBlogSlug();
  const organiserToken = useOrganiserToken();
  const [open,     setOpen]     = useState(false);
  const [messages, setMessages] = useState([{ role: 'assistant', content: GREETING }]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [escalate, setEscalate] = useState(false);
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
      const res = await fetch('/api/mariposa-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages:      next.filter((m) => m.role !== 'system'),
          fundraiser_id: fundraiserId,
          visitor_name:  visitorName,
          blog_slug:     blogSlug,
          auth_token:    organiserToken,
        }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply ?? "Hmm, I fumbled that one! Try again?" }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: "Something went sideways on my end! Give it another pitch." }]);
    }
    setLoading(false);
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
          style={{ color: role === 'user' ? 'rgba(255,255,255,0.9)' : 'var(--purple-text)', textDecoration: 'underline', wordBreak: 'break-all' }}
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
          background: 'linear-gradient(135deg, var(--purple3), var(--purple2), var(--purple-dark))',
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
            background: 'linear-gradient(135deg, #2D1B69, #4A28D4, var(--purple2))',
            padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: '50%',
              background: 'rgba(255,255,255,.12)', border: '2px solid rgba(255,255,255,.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0,
            }}>🐰</div>
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 15, fontFamily: 'var(--font-serif)' }}>Mariposa</div>
              <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 11, fontWeight: 600 }}>Lucky Squares guide</div>
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
                  background: m.role === 'user' ? 'linear-gradient(135deg, var(--purple2), #4A28D4)' : '#F5F3EE',
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
                      <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--purple2)', display: 'inline-block', animation: `bounce 1s ${i * 0.2}s infinite` }} />
                    ))}
                  </span>
                </div>
              </div>
            )}

            {/* Escalate to support */}
            {!escalate && messages.length > 2 && (
              <div style={{ textAlign: 'center', margin: '4px 0 8px' }}>
                <button
                  onClick={() => setEscalate(true)}
                  style={{ background: 'none', border: 'none', fontSize: 11, color: '#9CA3AF', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
                >
                  Still need help? Contact our support team
                </button>
              </div>
            )}

            {escalate && (
              <div style={{ background: '#F5F3EE', borderRadius: 12, padding: 14, margin: '4px 0 8px', fontSize: 13 }}>
                <div style={{ fontWeight: 700, marginBottom: 8, color: '#1A1209' }}>Need more help?</div>
                <p style={{ margin: '0 0 12px', fontSize: 12, lineHeight: 1.6, color: '#4A3728' }}>
                  For detailed support, please visit our <a href="/contact" style={{ color: 'var(--purple2)', fontWeight: 700 }}>contact page</a> and submit a support request. Our team typically responds within one business day.
                </p>
                <button
                  onClick={() => setEscalate(false)}
                  style={{ background: 'none', border: 'none', fontSize: 11, color: '#9CA3AF', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline', padding: 0 }}
                >
                  Dismiss
                </button>
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
                background: input.trim() ? 'linear-gradient(135deg, var(--purple2), #4A28D4)' : '#E5E0D5',
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
