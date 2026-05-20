'use client';

import { useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/ui/Logo';

export default function ComingSoonPage() {
  const [name,      setName]      = useState('');
  const [email,     setEmail]     = useState('');
  const [status,    setStatus]    = useState('idle'); // idle | loading | done | error
  const [errMsg,    setErrMsg]    = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('loading');
    setErrMsg('');
    try {
      const res  = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setErrMsg(data.error ?? 'Something went wrong.'); setStatus('error'); return; }
      setStatus('done');
    } catch (err) {
      setErrMsg(err.message);
      setStatus('error');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F5F3EE', display: 'flex', flexDirection: 'column' }}>
      <div className="rainbow-strip" />

      <header style={{ background: '#fff', padding: '14px 24px', borderBottom: '1px solid #E5E0D5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <Logo size={88} />
        </Link>
      </header>

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ maxWidth: 520, width: '100%', textAlign: 'center' }}>

          <div style={{ fontSize: 56, marginBottom: 16 }}>🍀</div>

          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 36, fontWeight: 900, color: '#1A1209', lineHeight: 1.15, margin: '0 0 16px' }}>
            Something exciting<br />is coming
          </h1>

          <p style={{ fontSize: 16, color: '#6B7280', lineHeight: 1.7, margin: '0 0 8px' }}>
            LuckySquares Australia is in early access. We are inviting a small group of founding members to be the first to run fundraising campaigns on the platform.
          </p>
          <p style={{ fontSize: 15, color: '#6B7280', lineHeight: 1.7, margin: '0 0 36px' }}>
            Join the waitlist and we will be in touch when we open up to everyone.
          </p>

          {status === 'done' ? (
            <div style={{ background: '#F0FDF8', border: '1.5px solid #B6EDD8', borderRadius: 16, padding: '28px 32px' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 900, color: '#1A1209', marginBottom: 8 }}>You are on the list</div>
              <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>We will reach out as soon as spots open up. Keep an eye on your inbox.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ background: '#fff', border: '1.5px solid #E5E0D5', borderRadius: 16, padding: '28px 32px', textAlign: 'left' }}>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Your name</label>
                <input
                  type="text"
                  placeholder="Jamie Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Email address <span style={{ color: '#C0392B' }}>*</span></label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>

              {status === 'error' && (
                <div style={{ marginBottom: 16, padding: '10px 14px', background: '#FFF2F2', border: '1.5px solid #FFBBBB', borderRadius: 8, fontSize: 13, color: '#C0392B' }}>
                  {errMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'loading'}
                style={{ width: '100%', background: '#1A7A55', color: '#fff', border: 'none', borderRadius: 10, padding: '14px', fontSize: 15, fontWeight: 700, cursor: status === 'loading' ? 'not-allowed' : 'pointer', opacity: status === 'loading' ? 0.7 : 1, fontFamily: 'inherit' }}
              >
                {status === 'loading' ? 'Joining…' : 'Join the waitlist →'}
              </button>
            </form>
          )}

          <p style={{ marginTop: 24, fontSize: 13, color: '#9C8060' }}>
            Already have an account?{' '}
            <Link href="/fundraise" style={{ color: '#1A7A55', fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
          </p>
        </div>
      </main>

      <footer style={{ padding: '20px 24px', textAlign: 'center', fontSize: 12, color: '#9C8060', borderTop: '1px solid #E5E0D5' }}>
        © {new Date().getFullYear()} Play With Heart Pty Ltd. All rights reserved.
      </footer>
    </div>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: 13,
  fontWeight: 700,
  color: '#1A1209',
  marginBottom: 6,
};

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  border: '1.5px solid #E5E0D5',
  borderRadius: 8,
  fontSize: 14,
  color: '#1A1209',
  background: '#FAFAF8',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  outline: 'none',
};
