'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getSupabaseClient, supabaseConfigured } from '@/lib/supabase/client';
import Logo from '@/components/ui/Logo';

const NAV = [
  { href: '/admin/dashboard',      icon: '📊', label: 'Dashboard'     },
  { href: '/admin/campaigns',      icon: '🗂️',  label: 'Campaigns'     },
  { href: '/admin/organisations',  icon: '🏫',  label: 'Organisations', alertKey: 'orgs'    },
  { href: '/admin/users',          icon: '👤',  label: 'Users'         },
  { href: '/admin/coupons',        icon: '🎟️',  label: 'Coupons'       },
  { href: '/admin/blog',           icon: '✍️',  label: 'Blog'          },
  { href: '/admin/waitlist',        icon: '⏳',  label: 'Waitlist'      },
  { href: '/admin/invites',        icon: '✉️',  label: 'Invites'       },
  { href: '/admin/emails',         icon: '📧',  label: 'Emails'        },
  { href: '/admin/support',        icon: '🎧',  label: 'Support',       alertKey: 'tickets' },
  { href: '/admin/mariposa-logs',  icon: '🐰',  label: 'Mari logs',     alertKey: 'mari'    },
  { href: '/admin/testimonials',    icon: '⭐',  label: 'Testimonials'  },
  { href: '/admin/marketing',       icon: '📣',  label: 'Marketing'     },
  { href: '/admin/feedback',        icon: '💬',  label: 'Feedback'      },
  { href: '/admin/reporting',      icon: '📋',  label: 'Reporting'     },
  { href: '/admin/errors',         icon: '🚨',  label: 'Error logs',    alertKey: 'errors'  },
];

const BADGE = {
  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
  background: '#DC2626', color: '#fff', borderRadius: 99, fontSize: 10, fontWeight: 800,
  minWidth: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '0 4px', lineHeight: 1,
};

export default function AdminLayout({ children }) {
  const [status,      setStatus]      = useState('loading'); // loading | auth | unauth | nonadmin
  const [email,       setEmail]       = useState('');
  const [alertCounts, setAlertCounts] = useState({ tickets: 0, mari: 0, errors: 0, orgs: 0 });
  const [notifPerm,   setNotifPerm]   = useState('unknown'); // unknown | default | granted | denied
  const prevCounts  = useRef(null);
  const pathname    = usePathname();

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

  useEffect(() => {
    document.body.classList.add('admin-layout');
    return () => document.body.classList.remove('admin-layout');
  }, []);

  // Detect notification permission state
  useEffect(() => {
    if (!('Notification' in window)) { setNotifPerm('denied'); return; }
    setNotifPerm(Notification.permission);
  }, []);

  const enableNotifications = async () => {
    const perm = await Notification.requestPermission();
    setNotifPerm(perm);
  };

  const fetchAlerts = useCallback(async () => {
    if (!supabaseConfigured) return;
    const sb = getSupabaseClient();
    const cutoff = new Date(Date.now() - 86400000).toISOString();

    const [ticketsRes, mariRes, errRes, orgsRes] = await Promise.all([
      sb.from('support_tickets').select('id', { count: 'exact', head: true })
        .eq('status', 'open').is('merged_into', null),
      sb.from('mariposa_chats').select('session_id').gte('created_at', cutoff).limit(500),
      sb.rpc('admin_error_log_summary', { p_days: 7 }),
      sb.from('organisations').select('id', { count: 'exact', head: true })
        .or('status.is.null,status.eq.pending'),
    ]);

    const mariSessions = new Set((mariRes.data ?? []).map((r) => r.session_id)).size;
    const next = {
      tickets: ticketsRes.count  ?? 0,
      mari:    mariSessions,
      errors:  errRes.data?.open ?? 0,
      orgs:    orgsRes.count     ?? 0,
    };

    // Fire browser notifications when counts increase
    if (Notification.permission === 'granted' && prevCounts.current) {
      const prev = prevCounts.current;
      if (next.tickets > prev.tickets) {
        new Notification('Lucky Squares: New support ticket', {
          body: `${next.tickets} open ticket${next.tickets !== 1 ? 's' : ''} need attention`,
          icon: '/favicon.ico',
          tag:  'ls-tickets',
        });
      }
      if (next.orgs > prev.orgs) {
        new Notification('Lucky Squares: Organisation application', {
          body: `${next.orgs} application${next.orgs !== 1 ? 's' : ''} pending review`,
          icon: '/favicon.ico',
          tag:  'ls-orgs',
        });
      }
      if (next.errors > prev.errors) {
        new Notification('Lucky Squares: New errors logged', {
          body: `${next.errors} unresolved error${next.errors !== 1 ? 's' : ''}`,
          icon: '/favicon.ico',
          tag:  'ls-errors',
        });
      }
    }

    prevCounts.current = next;
    setAlertCounts(next);
  }, []);

  useEffect(() => {
    if (status !== 'auth') return;
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, [status, fetchAlerts]);

  const handleSignOut = async () => {
    if (supabaseConfigured) await getSupabaseClient().auth.signOut();
    setStatus('unauth');
  };

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F0B2A' }}>
        <div style={{ color: '#fff', fontSize: 14, opacity: .6 }}>Checking credentials…</div>
      </div>
    );
  }

  if (status === 'unauth' || status === 'nonadmin') {
    return <AdminLogin reason={status} onAuth={() => setStatus('auth')} />;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'linear-gradient(to right, #0F0B2A 220px, var(--cream) 220px)' }}>

      {/* Sidebar */}
      <aside style={{ width: 220, background: '#0F0B2A', display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
          <Link href="/" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none', gap: 6 }}>
            <Logo size={48} dark stacked />
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,.35)', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase' }}>Admin</div>
          </Link>
        </div>

        <nav style={{ padding: '12px 0' }}>
          {NAV.map(({ href, icon, label, alertKey }) => {
            const active = pathname.startsWith(href);
            const count  = alertKey ? alertCounts[alertKey] : 0;
            return (
              <Link key={href} href={href} style={{
                position: 'relative', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px',
                fontSize: 13, fontWeight: 700, textDecoration: 'none',
                color: active ? '#fff' : 'rgba(255,255,255,.5)',
                background: active ? 'rgba(255,255,255,.08)' : 'none',
                borderLeft: active ? '3px solid var(--purple2)' : '3px solid transparent',
                transition: 'all .15s',
              }}>
                <span style={{ fontSize: 16 }}>{icon}</span>
                {label}
                {count > 0 && <span style={BADGE}>{count > 99 ? '99+' : count}</span>}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,.08)', marginTop: 'auto' }}>
          {notifPerm === 'default' && (
            <button
              onClick={enableNotifications}
              style={{ width: '100%', background: 'rgba(124,58,237,.3)', border: '1px solid rgba(124,58,237,.5)', color: 'rgba(255,255,255,.8)', borderRadius: 8, padding: '8px 0', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 8 }}
            >
              🔔 Enable notifications
            </button>
          )}
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
    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const { error: e } = await getSupabaseClient().auth.signInWithOtp({ email, options: { emailRedirectTo: `${siteUrl}/admin/dashboard` } });
    if (e) { setError(e.message); } else { setSent(true); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0F0B2A', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#1A1650', borderRadius: 20, padding: 40, maxWidth: 380, width: '100%', textAlign: 'center' }}>
        <Logo size={48} dark style={{ margin: '0 auto 20px' }} />
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
              placeholder="Administrator email address"
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
