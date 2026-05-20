'use client';

import { useState } from 'react';
import Link from 'next/link';
import MarketingNav from '@/components/marketing/MarketingNav';

export default function ComingSoonPage() {
  const [name,   setName]   = useState('');
  const [email,  setEmail]  = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [errMsg, setErrMsg] = useState('');

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
    <>
      <MarketingNav />

      <section className="hero" style={{ paddingBottom: 80 }}>
        <div className="hero-blob hero-blob-1" />
        <div className="hero-blob hero-blob-2" />
        <div className="hero-blob hero-blob-3" />
        <div className="hero-blob hero-blob-4" />
        <div className="hero-dots" />

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(107,70,245,.12)', borderRadius: 20, padding: '6px 14px', marginBottom: 24, fontSize: 13, fontWeight: 700, color: 'var(--purple)' }}>
          🍀 Founding member early access
        </div>

        <h1 className="hero-title" style={{ maxWidth: 640 }}>
          Something{' '}
          <span style={{ background: 'linear-gradient(135deg, #A78BFA 0%, #7C3AED 50%, #4A28D4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            exciting
          </span>{' '}
          is coming
        </h1>

        <p className="hero-sub" style={{ maxWidth: 520 }}>
          LuckySquares Australia is in early access. We&apos;re inviting a small group of founding members to be the first to run fundraising campaigns on the platform.
        </p>
        <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 40 }}>
          Join the waitlist and we&apos;ll be in touch when we open up to everyone.
        </p>

        <div style={{ maxWidth: 460, width: '100%' }}>
          {status === 'done' ? (
            <div className="scratch-card" style={{ padding: '36px 40px', textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 900, marginBottom: 8 }}>You&apos;re on the list</h2>
              <p style={{ fontSize: 14, color: 'var(--text2)', margin: 0, lineHeight: 1.6 }}>We&apos;ll reach out as soon as spots open up. Keep an eye on your inbox.</p>
            </div>
          ) : (
            <div className="scratch-card" style={{ padding: '32px 36px' }}>
              <div style={{ marginBottom: 16 }}>
                <label className="form-label">Your name</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Jamie Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label className="form-label">Email address <span style={{ color: 'var(--orange)' }}>*</span></label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {status === 'error' && (
                <div style={{ marginBottom: 16, padding: '10px 14px', background: '#FFF2F2', border: '1.5px solid #FFBBBB', borderRadius: 8, fontSize: 13, color: '#C0392B' }}>
                  {errMsg}
                </div>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={status === 'loading'}
                className="btn btn-purple btn-lg"
                style={{ width: '100%', justifyContent: 'center', opacity: status === 'loading' ? 0.7 : 1 }}
              >
                {status === 'loading' ? 'Joining…' : 'Join the waitlist →'}
              </button>

              <p style={{ marginTop: 16, fontSize: 13, color: 'var(--text2)', textAlign: 'center' }}>
                Already have an account?{' '}
                <Link href="/fundraise" style={{ color: 'var(--green)', fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
              </p>
            </div>
          )}
        </div>
      </section>

      <footer style={{ padding: '24px', textAlign: 'center', fontSize: 12, color: 'var(--text2)', borderTop: '1px solid var(--border)', background: 'var(--cream)' }}>
        © {new Date().getFullYear()} Play With Heart Pty Ltd. All rights reserved.
      </footer>
    </>
  );
}
