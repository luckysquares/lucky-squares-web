'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getSupabaseClient, supabaseConfigured } from '@/lib/supabase/client';
import Logo from '@/components/ui/Logo';

const NAV = [
  { href: '/org/dashboard',  icon: '📊', label: 'Dashboard'  },
  { href: '/org/campaigns',  icon: '🗂️',  label: 'Campaigns'  },
  { href: '/org/members',    icon: '👥', label: 'Members'    },
  { href: '/org/reporting',  icon: '📋', label: 'Reporting'  },
  { href: '/org/settings',   icon: '⚙️',  label: 'Settings'   },
];

export default function OrgLayout({ children }) {
  const [status,  setStatus]  = useState('loading'); // loading | auth | unauth | notorg
  const [orgName, setOrgName] = useState('');
  const [email,   setEmail]   = useState('');
  const pathname = usePathname();
  const router   = useRouter();

  useEffect(() => {
    if (!supabaseConfigured) { setStatus('auth'); setOrgName('Demo Organisation'); return; }
    const supabase = getSupabaseClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setStatus('unauth'); return; }
      setEmail(session.user.email ?? '');
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan, organisation, full_name')
        .eq('id', session.user.id)
        .single();
      // Also check if user is an org member
      const { data: membership } = await supabase
        .from('org_members')
        .select('org_user_id')
        .eq('member_user_id', session.user.id)
        .maybeSingle();
      const isOrg = profile?.plan === 'org' || !!membership;
      if (!isOrg) { setStatus('notorg'); return; }
      setOrgName(profile?.organisation || profile?.full_name || 'My Organisation');
      setStatus('auth');
    });
  }, []);

  useEffect(() => {
    document.body.classList.add('org-layout');
    return () => document.body.classList.remove('org-layout');
  }, []);

  const handleSignOut = async () => {
    if (supabaseConfigured) await getSupabaseClient().auth.signOut();
    router.push('/');
  };

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F3EE' }}>
        <div style={{ fontSize: 14, color: 'var(--text2)' }}>Loading…</div>
      </div>
    );
  }

  if (status === 'unauth') {
    return <OrgGate reason="Please sign in to access your organisation portal." router={router} />;
  }

  if (status === 'notorg') {
    return <OrgGate reason="Your account doesn't have an active organisation plan." router={router} />;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'linear-gradient(to right, #1A1209 220px, #F5F3EE 220px)' }}>

      {/* Sidebar */}
      <aside style={{ width: 220, background: '#1A1209', display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
        <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 12 }}>
            <Logo size={52} dark />
          </Link>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 2 }}>Organisation</div>
          <div style={{ fontSize: 13, color: '#fff', fontWeight: 800, lineHeight: 1.3 }}>{orgName}</div>
        </div>

        <nav style={{ padding: '12px 0', flex: 1 }}>
          {NAV.map(({ href, icon, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link key={href} href={href} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px',
                fontSize: 13, fontWeight: 700, textDecoration: 'none',
                color: active ? '#fff' : 'rgba(255,255,255,.5)',
                background: active ? 'rgba(255,255,255,.08)' : 'none',
                borderLeft: active ? '3px solid #F59E0B' : '3px solid transparent',
                transition: 'all .15s',
              }}>
                <span style={{ fontSize: 16 }}>{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,.08)' }}>
          <Link href="/fundraise" style={{ display: 'block', textAlign: 'center', background: '#F59E0B', color: '#1A1209', borderRadius: 8, padding: '8px 0', fontSize: 12, fontWeight: 800, textDecoration: 'none', marginBottom: 10 }}>
            + New campaign
          </Link>
          {email && <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginBottom: 8, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</div>}
          <button onClick={handleSignOut} style={{ width: '100%', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.12)', color: 'rgba(255,255,255,.7)', borderRadius: 8, padding: '7px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
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

function OrgGate({ reason, router }) {
  return (
    <div style={{ minHeight: '100vh', background: '#F5F3EE', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 40, maxWidth: 400, width: '100%', textAlign: 'center', border: '2px solid #E5E0D5' }}>
        <div style={{ fontSize: 36, marginBottom: 16 }}>🍀</div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 900, marginBottom: 12 }}>Organisation portal</h1>
        <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 24, lineHeight: 1.6 }}>{reason}</p>
        <button className="btn btn-primary" style={{ width: '100%', marginBottom: 10 }} onClick={() => router.push('/fundraise')}>
          Go to my dashboard
        </button>
        <Link href="/org-signup" style={{ fontSize: 13, color: 'var(--text2)' }}>Apply for an organisation plan</Link>
      </div>
    </div>
  );
}
