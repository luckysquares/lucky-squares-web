'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getSupabaseClient, supabaseConfigured } from '@/lib/supabase/client';
import Logo from '@/components/ui/Logo';

const NAV = [
  { href: '/admin/dashboard',      icon: '📊', label: 'Dashboard'     },
  { href: '/admin/campaigns',      icon: '🗂️',  label: 'Campaigns'     },
  { href: '/admin/organisations',  icon: '🏫',  label: 'Organisations' },
  { href: '/admin/users',          icon: '👤',  label: 'Users'         },
  { href: '/admin/coupons',        icon: '🎟️',  label: 'Coupons'       },
  { href: '/admin/reporting',      icon: '📋',  label: 'Reporting'     },
];

export default function AdminLayout({ children }) {
  const [status, setStatus] = useState('loading'); // loading | auth | unauth | nonadmin
  const [email,  setEmail]  = useState('');
  const pathname = usePathname();
  const router   = useRouter();

  useEffect(() => {
    if (!supabaseConfigured) { setStatus('auth'); return; }
    const supabase = getSupabaseClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setStatus('unauth'); return; }
      setEmail(session.user.email ?? '');
      const { data } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', session.user.id)
        .single();
      setStatus(data?.is_admin ? 'auth' : 'nonadmin');
    });
  }, []);

  const handleSignOut = async () => {
    if (supabaseConfigured) await getSupabaseClient().auth.signOut();
    router.push('/admin');
  };

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0D1F17' }}>
        <div style={{ color: '#fff', fontSize: 14, opacity: .6 }}>Checking credentials…</div>
      </div>
    );
  }

  if (status === 'unauth' || status === 'nonadmin') {
    return <AdminLogin reason={status} onAuth={() => setStatus('auth')} />;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--cream)' }}>

      {/* Sidebar */}
      <aside style={{ width: 220, background: '#0D1F17', display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <Logo size={30} />
            <div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 900, color: '#fff', letterSpacing: '-.3px' }}>LuckySquares</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,.4)', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }}>Admin</div>
            </div>
          </Link>
        </div>

        <nav style={{ flex: 1, padding: '12px 0' }}>
          {NAV.map(({ href, icon, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link key={href} href={href} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px',
                fontSize: 13, fontWeight: 700, textDecoration: 'none',
                color: active ? '#fff' : 'rgba(255,255,255,.5)',
                background: active ? 'rgba(255,255,255,.08)' : 'none',
                borderLeft: active ? '3px solid #00C875' : '3px solid transparent',
                transition: 'all .15s',
              }}>
                <span style={{ fontSize: 16 }}>{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,.08)' }}>
          {email && <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginBottom: 10, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</div>}
          <button onClick={handleSignOut} style={{ width: '100%', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.12)', color: 'rgba(255,255,255,.7)', borderRadius: 8, padding: '8px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, minWidth: 0, padding: '36px 40px' }}>
        {children}
      </main>
    </div>
  );
}

function AdminLogin({ reason, onAuth }) {
  const [email,   setEmail]   = useState('');
  const [sent,    setSent]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleSend = async () => {
    setLoading(true); setError('');
    if (!supabaseConfigured) { setSent(true); setLoading(false); return; }
    const { error: e } = await getSupabaseClient().auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/admin/dashboard` } });
    if (e) { setError(e.message); } else { setSent(true); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0D1F17', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#1A3C2E', borderRadius: 20, padding: 40, maxWidth: 380, width: '100%', textAlign: 'center' }}>
        <Logo size={48} style={{ margin: '0 auto 20px' }} />
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 8 }}>Admin portal</h1>
        {reason === 'nonadmin' && (
          <p style={{ fontSize: 13, color: '#FF6B6B', marginBottom: 20 }}>This account does not have admin access.</p>
        )}
        {!sent ? (
          <>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', marginBottom: 24 }}>Enter your admin email address to receive a sign-in link.</p>
            <input
              className="form-input"
              type="email"
              placeholder="admin@luckysquares.com.au"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              style={{ marginBottom: 12, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', color: '#fff' }}
            />
            {error && <p style={{ fontSize: 12, color: '#FF6B6B', marginBottom: 12 }}>{error}</p>}
            <button className="btn btn-gold" style={{ width: '100%' }} onClick={handleSend} disabled={!email || loading}>
              {loading ? 'Sending…' : 'Send sign-in link →'}
            </button>
          </>
        ) : (
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,.7)', lineHeight: 1.7 }}>
            Check your inbox for a sign-in link. Once you click it you will be redirected to the admin dashboard.
          </p>
        )}
      </div>
    </div>
  );
}
