'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Logo from '@/components/ui/Logo';
import { getSupabaseClient } from '@/lib/supabase/client';

export default function AcceptInvitePage() {
  const { token } = useParams();
  const router    = useRouter();

  const [invite,  setInvite]  = useState(null);
  const [phase,   setPhase]   = useState('loading'); // loading | info | otp | accepting | done | invalid
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const doAccept = useCallback(async (supabase) => {
    setPhase('accepting');
    const { data } = await supabase.rpc('accept_org_invite', { p_token: token });
    if (data?.ok) {
      setPhase('done');
    } else {
      setError(data?.error ?? 'Something went wrong accepting the invite.');
      setPhase('invalid');
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const supabase = getSupabaseClient();

    supabase.rpc('get_invite_by_token', { p_token: token }).then(async ({ data }) => {
      if (data?.error) { setError(data.error); setPhase('invalid'); return; }
      setInvite(data);

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        doAccept(supabase);
      } else {
        setPhase('info');
      }
    });
  }, [token, doAccept]);

  // Listen for magic link sign-in completing (user clicked the email button)
  useEffect(() => {
    const supabase = getSupabaseClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user && phase === 'otp') {
        doAccept(supabase);
      }
    });
    return () => subscription.unsubscribe();
  }, [phase, doAccept]);

  const sendOtp = async () => {
    setLoading(true);
    setError('');
    const redirectTo = typeof window !== 'undefined' ? window.location.href : `https://luckysquares.com.au/invite/${token}`;
    const { error: e } = await getSupabaseClient().auth.signInWithOtp({
      email: invite.email,
      options: { emailRedirectTo: redirectTo },
    });
    setLoading(false);
    if (e) { setError(e.message); return; }
    setPhase('otp');
  };


  return (
    <div className="dot-bg" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ marginBottom: 32 }}><Logo /></div>

      <div className="scratch-card" style={{ maxWidth: 420, width: '100%', padding: 40, textAlign: 'center' }}>

        {phase === 'loading' && (
          <p style={{ color: 'var(--text2)' }}>Loading invite...</p>
        )}

        {phase === 'invalid' && (
          <>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, marginBottom: 12 }}>Invite not available</h2>
            <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.6 }}>{error}</p>
          </>
        )}

        {phase === 'info' && invite && (
          <>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🍀</div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, marginBottom: 8 }}>
              You&apos;re invited to join {invite.org_name}
            </h2>
            <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
              You&apos;ve been invited as a contributor to help manage {invite.org_name}&apos;s fundraising campaigns on Lucky Squares.
              The invite was sent to <strong>{invite.email}</strong>.
            </p>
            <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={sendOtp} disabled={loading}>
              {loading ? 'Sending confirmation link...' : 'Accept invite'}
            </button>
            {error && <p style={{ color: '#CC0000', fontSize: 13, marginTop: 12 }}>{error}</p>}
          </>
        )}

        {phase === 'otp' && invite && (
          <>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📬</div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, marginBottom: 8 }}>Check your email</h2>
            <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 8, lineHeight: 1.6 }}>
              We sent a confirmation link to <strong>{invite.email}</strong>.
            </p>
            <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
              Click the link in that email to confirm your address and join {invite.org_name}.
              This page will update automatically once confirmed.
            </p>
            {error && <p style={{ color: '#CC0000', fontSize: 13 }}>{error}</p>}
          </>
        )}

        {phase === 'accepting' && (
          <>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
            <p style={{ color: 'var(--text2)' }}>Accepting invite...</p>
          </>
        )}

        {phase === 'done' && invite && (
          <>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🎉</div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, marginBottom: 8 }}>You&apos;re in!</h2>
            <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
              You&apos;ve joined {invite.org_name} as a contributor and can now view and help manage their campaigns.
            </p>
            <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={() => router.push('/fundraise')}>
              Go to dashboard
            </button>
          </>
        )}

      </div>
    </div>
  );
}
