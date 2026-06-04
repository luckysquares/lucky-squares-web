'use client';

import { useState, useEffect } from 'react';
import { use } from 'react';

export default function TestimonialPage({ params }) {
  const { token } = use(params);

  const [info,        setInfo]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [notFound,    setNotFound]    = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);

  const [quote,       setQuote]       = useState('');
  const [displayName, setDisplayName] = useState('');
  const [rating,      setRating]      = useState(5);
  const [hovered,     setHovered]     = useState(null);
  const [submitting,  setSubmitting]  = useState(false);
  const [submitted,   setSubmitted]   = useState(false);
  const [error,       setError]       = useState('');

  useEffect(() => {
    fetch(`/api/testimonial/${token}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.error)             { setNotFound(true); }
        else if (j.already_submitted) { setAlreadyDone(true); }
        else                     { setInfo(j); setDisplayName(j.organiser_name ?? ''); }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const res = await fetch(`/api/testimonial/${token}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ quote, rating, display_name: displayName }),
    });
    const json = await res.json();

    if (!res.ok || json.error) { setError(json.error ?? 'Something went wrong. Please try again.'); setSubmitting(false); return; }
    setSubmitted(true);
    setSubmitting(false);
  };

  if (loading) return (
    <div style={page}>
      <div style={card}>
        <div style={{ color: 'var(--text2)', fontSize: 14 }}>Loading…</div>
      </div>
    </div>
  );

  if (notFound) return (
    <div style={page}>
      <Logo />
      <div style={card}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🔗</div>
        <h1 style={h1}>Link not found</h1>
        <p style={sub}>This testimonial link is invalid or has expired.</p>
      </div>
    </div>
  );

  if (alreadyDone) return (
    <div style={page}>
      <Logo />
      <div style={card}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
        <h1 style={h1}>Already submitted</h1>
        <p style={sub}>We already have your testimonial on file. Thank you!</p>
      </div>
    </div>
  );

  if (submitted) return (
    <div style={page}>
      <Logo />
      <div style={card}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🙏</div>
        <h1 style={h1}>Thank you!</h1>
        <p style={sub}>
          Your testimonial has been submitted and will appear on our website once reviewed.
          We really appreciate you taking the time.
        </p>
        <a href="https://luckysquares.com.au" style={btnPrimary}>Back to Lucky Squares</a>
      </div>
    </div>
  );

  return (
    <div style={page}>
      <Logo />
      <div style={card}>
        <h1 style={h1}>How did your fundraiser go?</h1>
        <p style={sub}>
          Share your experience with {info?.org_name ?? 'your organisation'}&apos;s Lucky Squares fundraiser.
          Your feedback helps other Australian communities discover us.
        </p>

        <form onSubmit={handleSubmit}>
          {/* Star rating */}
          <div style={{ marginBottom: 24 }}>
            <label style={label}>Your rating</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHovered(n)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    fontSize: 32,
                    opacity: (hovered ?? rating) >= n ? 1 : 0.25,
                    transition: 'opacity .1s',
                  }}
                  aria-label={`${n} star${n !== 1 ? 's' : ''}`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          {/* Quote */}
          <div style={{ marginBottom: 20 }}>
            <label style={label}>Your testimonial</label>
            <textarea
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              placeholder="Tell us how it went — what you raised, what worked well, what your community thought..."
              rows={5}
              maxLength={500}
              required
              style={{ ...input, resize: 'vertical', marginTop: 6 }}
            />
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4, textAlign: 'right' }}>
              {quote.length}/500
            </div>
          </div>

          {/* Display name */}
          <div style={{ marginBottom: 28 }}>
            <label style={label}>Your name (as it will appear)</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Sarah M., P&C Treasurer"
              style={{ ...input, marginTop: 6 }}
            />
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>
              Optional — we can show just your first name and role if you prefer.
            </div>
          </div>

          {error && <p style={{ fontSize: 13, color: '#CC0000', marginBottom: 16 }}>{error}</p>}

          <button type="submit" disabled={submitting || quote.trim().length < 20} style={btnPrimary}>
            {submitting ? 'Submitting…' : 'Submit testimonial'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const page = {
  minHeight: '100vh',
  background: '#F5F3EE',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '40px 16px 80px',
  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
};

const card = {
  background: '#fff',
  borderRadius: 20,
  border: '1.5px solid #E5E0D5',
  boxShadow: '0 4px 24px rgba(61,46,26,0.08)',
  padding: '40px 40px',
  width: '100%',
  maxWidth: 520,
  marginTop: 32,
};

const h1 = {
  fontFamily: 'Georgia, serif',
  fontSize: 26,
  fontWeight: 900,
  color: '#1A1209',
  marginBottom: 12,
  lineHeight: 1.2,
};

const sub = {
  fontSize: 15,
  color: '#6B5E4E',
  lineHeight: 1.7,
  marginBottom: 32,
};

const label = {
  fontSize: 13,
  fontWeight: 700,
  color: '#4A3728',
  display: 'block',
};

const input = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 10,
  border: '1.5px solid #E5E0D5',
  fontSize: 14,
  color: '#1A1209',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  outline: 'none',
};

const btnPrimary = {
  display: 'inline-block',
  background: '#6B46F5',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  padding: '12px 28px',
  fontSize: 15,
  fontWeight: 800,
  cursor: 'pointer',
  textDecoration: 'none',
  fontFamily: 'inherit',
};

function Logo() {
  return (
    <a href="https://luckysquares.com.au" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ fontSize: 22, fontWeight: 900, color: '#1A1209', fontFamily: 'inherit' }}>
        Lucky <span style={{ fontWeight: 400, fontStyle: 'italic' }}>Squares</span>
      </div>
      <div style={{ fontSize: 9, fontWeight: 700, color: '#6B7280', letterSpacing: '2px', textTransform: 'uppercase', marginTop: 2 }}>Australia</div>
    </a>
  );
}
