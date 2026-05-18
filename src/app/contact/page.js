'use client';

import { useState } from 'react';
import MarketingNav from '@/components/marketing/MarketingNav';

const CATEGORIES = [
  'General enquiry',
  'Technical support',
  'Billing',
  'Compliance and permit questions',
  'Media and partnerships',
  'Other',
];

export default function ContactPage() {
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [message,  setMessage]  = useState('');
  const [status,   setStatus]   = useState('idle'); // idle | sending | done | error
  const [errMsg,   setErrMsg]   = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('sending');
    setErrMsg('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, category, message }),
      });
      const data = await res.json();
      if (!res.ok) { setErrMsg(data.error || 'Something went wrong.'); setStatus('error'); return; }
      setStatus('done');
    } catch {
      setErrMsg('Network error. Please try again.');
      setStatus('error');
    }
  }

  return (
    <>
      <MarketingNav />

      <section className="section section-hero-bg" style={{ paddingTop: 80, paddingBottom: 40 }}>
        <div className="section-inner" style={{ textAlign: 'center' }}>
          <div className="section-label">Get in touch</div>
          <h1 className="section-heading" style={{ margin: '0 auto 16px' }}>Contact us</h1>
          <p className="section-body" style={{ margin: '0 auto' }}>
            Have a question or need help? We aim to respond within one business day.
          </p>
        </div>
      </section>

      <section className="section section-solid-bg" style={{ paddingTop: 0 }}>
        <div className="section-inner" style={{ maxWidth: 900 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'flex-start' }}>

            {/* Form */}
            <div style={{ flex: '1 1 480px' }}>
              {status === 'done' ? (
                <div style={{ background: '#fff', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', border: '1.5px solid var(--border)', padding: '48px 40px', textAlign: 'center' }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                  <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 900, color: 'var(--text)', margin: '0 0 10px' }}>Message sent</h2>
                  <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7, margin: 0 }}>
                    Thanks for reaching out, {name.split(' ')[0]}. We will get back to you at <strong>{email}</strong> within one business day.
                  </p>
                </div>
              ) : (
                <div style={{ background: '#fff', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', border: '1.5px solid var(--border)', padding: '36px 40px' }}>
                  <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <div className="form-group" style={{ flex: '1 1 180px' }}>
                        <label className="form-label">Full name</label>
                        <input className="form-input" placeholder="Jane Smith" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} required />
                      </div>
                      <div className="form-group" style={{ flex: '1 1 180px' }}>
                        <label className="form-label">Email</label>
                        <input className="form-input" type="email" placeholder="you@example.com" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} required />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Category</label>
                      <select className="form-input" value={category} onChange={(e) => setCategory(e.target.value)} style={{ cursor: 'pointer' }}>
                        {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Message</label>
                      <textarea
                        className="form-input"
                        placeholder="Tell us how we can help…"
                        maxLength={2000}
                        rows={6}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        required
                        style={{ resize: 'vertical', lineHeight: 1.6 }}
                      />
                    </div>
                    {status === 'error' && (
                      <div style={{ padding: '10px 14px', background: '#FFF0F0', border: '1px solid #FFCCCC', borderRadius: 10, fontSize: 13, color: '#CC0000' }}>{errMsg}</div>
                    )}
                    <button className="btn btn-purple btn-lg" style={{ width: '100%', justifyContent: 'center' }} disabled={status === 'sending'}>
                      {status === 'sending' ? 'Sending…' : 'Send message'}
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Info sidebar */}
            <div style={{ flex: '0 1 240px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {[
                {
                  icon: '📧',
                  title: 'Email us directly',
                  body: 'support@luckysquares.com.au',
                  href: 'mailto:support@luckysquares.com.au',
                },
                {
                  icon: '⏱️',
                  title: 'Response time',
                  body: 'We aim to respond within one business day, Monday to Friday.',
                },
                {
                  icon: '📖',
                  title: 'Check the FAQ first',
                  body: 'Many common questions are answered in our FAQ.',
                  href: '/faq',
                  linkLabel: 'View FAQ →',
                },
                {
                  icon: '🔒',
                  title: 'Privacy enquiries',
                  body: 'privacy@luckysquares.com.au',
                  href: 'mailto:privacy@luckysquares.com.au',
                },
              ].map((item) => (
                <div key={item.title} style={{ background: '#fff', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', border: '1.5px solid var(--border)', padding: '20px 22px' }}>
                  <div style={{ fontSize: 22, marginBottom: 8 }}>{item.icon}</div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)', marginBottom: 4 }}>{item.title}</div>
                  {item.href && !item.linkLabel ? (
                    <a href={item.href} style={{ fontSize: 13, color: 'var(--green)', fontWeight: 700, wordBreak: 'break-all' }}>{item.body}</a>
                  ) : (
                    <p style={{ fontSize: 13, color: 'var(--text2)', margin: 0, lineHeight: 1.6 }}>{item.body}</p>
                  )}
                  {item.linkLabel && (
                    <a href={item.href} style={{ display: 'inline-block', marginTop: 8, fontSize: 13, color: 'var(--green)', fontWeight: 700 }}>{item.linkLabel}</a>
                  )}
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>
    </>
  );
}
