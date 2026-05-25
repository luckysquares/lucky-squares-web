'use client';

import { useEffect, useRef, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';

export default function StripeConnectSetup({ fundraiserId, onComplete, prefill = null }) {
  const containerRef = useRef(null);
  const [status, setStatus]   = useState('loading'); // loading | ready | checking | done | error
  const [errMsg, setErrMsg]   = useState('');

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { loadConnectAndInitialize } = await import('@stripe/connect-js');

        const instance = loadConnectAndInitialize({
          publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
          fetchClientSecret: async () => {
            const { data: { session } } = await getSupabaseClient().auth.getSession();
            const token = session?.access_token;
            const res = await fetch('/api/stripe/account-session', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({ fundraiser_id: fundraiserId, prefill: prefill || null }),
            });
            const data = await res.json();
            if (!data.client_secret) throw new Error(data.error || 'Could not start bank setup');
            return data.client_secret;
          },
          appearance: {
            variables: {
              colorPrimary: '#7C3AED',
              colorBackground: '#FAFAF5',
              colorText: '#1A1A1A',
              colorSecondaryText: '#6B7280',
              colorBorder: '#E8E3DB',
              borderRadius: '12px',
              buttonPrimaryColorBackground: '#7C3AED',
              buttonPrimaryColorText: '#FFFFFF',
              buttonBorderRadius: '10px',
              fontFamily: '"Nunito", "Nunito Sans", system-ui, -apple-system, sans-serif',
              fontSizeBase: '14px',
              spacingUnit: '4px',
            },
          },
        });

        if (!mounted || !containerRef.current) return;

        const component = instance.create('account-onboarding');
        // Only collect what's currently required — reduces the number of fields shown
        try {
          component.setCollectionOptions({ fields: 'currently_due', futureRequirements: 'omit' });
        } catch {}
        component.setOnExit(async () => {
          if (!mounted) return;
          setStatus('checking');
          try {
            const { data: { session: authSession } } = await getSupabaseClient().auth.getSession();
            const authToken = authSession?.access_token;
            const res = await fetch('/api/stripe/check-account', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
              },
              body: JSON.stringify({ fundraiser_id: fundraiserId }),
            });
            const { complete } = await res.json();
            if (complete) {
              setStatus('done');
              onComplete?.();
            } else {
              setStatus('ready');
            }
          } catch {
            setStatus('ready');
          }
        });

        containerRef.current.appendChild(component);
        setStatus('ready');
      } catch (err) {
        if (mounted) { setErrMsg(err.message); setStatus('error'); }
      }
    })();

    return () => { mounted = false; };
  }, [fundraiserId, onComplete]);

  return (
    <div>
      {status === 'loading' && (
        <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text2)', fontSize: 14 }}>
          Loading bank account setup…
        </div>
      )}
      {status === 'checking' && (
        <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text2)', fontSize: 14 }}>
          Checking your connection…
        </div>
      )}
      {status === 'done' && (
        <div style={{ padding: '24px', textAlign: 'center', background: '#F0FDF8', borderRadius: 12, border: '1.5px solid #B6EDD8' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
          <div style={{ fontWeight: 800, color: 'var(--green)' }}>Bank account connected</div>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>Your fundraiser is ready to accept card payments.</div>
        </div>
      )}
      {status === 'error' && (
        <div style={{ padding: 16, background: '#FFF1F1', borderRadius: 12, border: '1.5px solid #FCA5A5', fontSize: 13, color: '#B91C1C' }}>
          Setup error: {errMsg}
        </div>
      )}
      <div ref={containerRef} />
    </div>
  );
}
