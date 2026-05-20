'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function UnsubscribeContent() {
  const params = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState('loading');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }

    fetch(`/api/unsubscribe?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) { setEmail(data.email); setStatus('done'); }
        else setStatus('invalid');
      })
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="scratch-card" style={{ maxWidth: 460, width: '100%', padding: '48px 40px', textAlign: 'center' }}>
        {status === 'loading' && (
          <>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
            <p style={{ color: 'var(--text2)', fontSize: 15 }}>Unsubscribing…</p>
          </>
        )}
        {status === 'done' && (
          <>
            <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 800, marginBottom: 12 }}>You've been unsubscribed</h1>
            <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.6 }}>
              <strong>{email}</strong> has been removed from our mailing list. You won't receive any further emails from Lucky Squares.
            </p>
          </>
        )}
        {(status === 'invalid' || status === 'error') && (
          <>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🤔</div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 800, marginBottom: 12 }}>Link not recognised</h1>
            <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.6 }}>
              This unsubscribe link may have already been used or is invalid. If you're still receiving emails, please <a href="/contact" style={{ color: 'var(--purple)' }}>contact us</a>.
            </p>
          </>
        )}
        <a href="/" style={{ display: 'inline-block', marginTop: 28, fontSize: 13, color: 'var(--text2)' }}>← Back to Lucky Squares</a>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense>
      <UnsubscribeContent />
    </Suspense>
  );
}
