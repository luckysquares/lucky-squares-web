'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Logo from '@/components/ui/Logo';
import { getSupabaseClient, supabaseConfigured } from '@/lib/supabase/client';
import { validateAbn, formatAbn } from '@/lib/abn';
import { containsProfanity } from '@/lib/profanity';
import LiveGrid from '@/components/app/LiveGrid';
import StripeConnectSetup from '@/components/app/StripeConnectSetup';
import { QRCodeSVG } from 'qrcode.react';
import MemberBadge from '@/components/app/MemberBadge';
import SurveyModal from '@/components/app/SurveyModal';
import { resolveUniqueSlug } from '@/lib/slug';
import { fmtTime, shuffle, sanitize } from '@/lib/utils';

// ─── constants ────────────────────────────────────────────────────────────────

const GRID_OPTIONS = [
  { size: 100, label: '100 Squares', priceDefault: 10 },
  { size: 50,  label: '50 Squares',  priceDefault: 15 },
  { size: 25,  label: '25 Squares',  priceDefault: 20 },
];

const RESERVE_SECS = 420;
const WARN_SECS    = 390;
const MAX_CART     = 10;

const WIZARD_STEPS = ['Who', 'Grid Size', 'Pricing', 'Prizes', 'Campaign', 'Draw Rules', 'Payment', 'Review', 'Connect Bank', 'Launch'];

const EMOJIS = ['🍀', '🌈', '🏆', '⚾', '🐨', '🏉', '⭐', '🎯', '💛', '🌺'];

const SAMPLE_FUNDRAISERS = [
  { id: 1, title: 'Koala Rescue Raffle 🐨', org: 'Wildlife Friends', grid: 100, pricePerSq: 10, sold: 63, status: 'active', emoji: '🐨', totalPrizeValue: 800, payment: { method: 'bank', accountName: 'Wildlife Friends Inc', bsb: '062-000', account: '12345678' } },
  { id: 2, title: 'School Fete Lucky Dip 🎪', org: 'Sunbury Primary P&C', grid: 50, pricePerSq: 15, sold: 31, status: 'active', emoji: '🎪', totalPrizeValue: 500, payment: { method: 'stripe' } },
  { id: 3, title: 'Footy Club Finals Fund 🏉', org: 'Werribee Eagles AFC', grid: 25, pricePerSq: 20, sold: 18, status: 'draft', emoji: '🏉', totalPrizeValue: 200, payment: { method: 'bank', accountName: 'Werribee Eagles AFC', bsb: '033-000', account: '87654321' } },
];


function makeGrid(size) {
  const takenCount    = Math.floor(size * 0.22);
  const reservedCount = Math.floor(size * 0.08);
  const allIdxs       = [...Array(size).keys()];
  const takenIdxs     = new Set(shuffle(allIdxs).slice(0, takenCount));
  const remaining     = allIdxs.filter((i) => !takenIdxs.has(i));
  const reservedIdxs  = new Set(shuffle(remaining).slice(0, reservedCount));
  const names = ['Sarah M.', 'James T.', 'Emily R.', 'David K.', 'Lucy P.', 'Tom H.', 'Anna S.', 'Ben W.', 'Claire F.', 'Mike O.'];
  let ni = 0;
  return allIdxs.map((i) => {
    if (takenIdxs.has(i))    return { id: i + 1, status: 'taken',    owner: names[ni++ % names.length], reservedUntil: null };
    if (reservedIdxs.has(i)) return { id: i + 1, status: 'reserved', owner: names[ni++ % names.length], reservedUntil: Date.now() + (90 + Math.random() * 250) * 1000 };
    return { id: i + 1, status: 'available', owner: null, reservedUntil: null };
  });
}

function localizeSquare(row, myNums) {
  const isMine = myNums.has(row.number);
  return {
    id:            row.number,
    status:        isMine ? 'mine' : row.status === 'sold' ? 'taken' : row.status,
    owner:         row.buyer_name || null,
    reservedUntil: row.reserved_until ? new Date(row.reserved_until).getTime() : null,
  };
}

const parsePrizeValue = (v) => parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')) || 0;

const AU_STATES = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'];
const STATE_PRIZE_CAPS = { ACT: 5000, NSW: 25000, NT: 5000, QLD: 2000, SA: 5000, TAS: 5000, VIC: 5000, WA: 10000 };
const STATE_LABELS = { ACT: 'Australian Capital Territory', NSW: 'New South Wales', NT: 'Northern Territory', QLD: 'Queensland', SA: 'South Australia', TAS: 'Tasmania', VIC: 'Victoria', WA: 'Western Australia' };

async function fetchProfile(userId) {
  const { data } = await getSupabaseClient().from('profiles').select('plan, is_founding_member, is_beta_tester, stripe_account_id, stripe_onboarding_complete, full_name').eq('id', userId).single();
  return {
    plan:                     data?.plan                      ?? 'trial',
    isFoundingMember:         data?.is_founding_member        ?? false,
    isBetaTester:             data?.is_beta_tester            ?? false,
    stripeAccountId:          data?.stripe_account_id         ?? null,
    stripeOnboardingComplete: data?.stripe_onboarding_complete ?? false,
    fullName:                 data?.full_name                  ?? '',
  };
}

function dbToFundraiser(row, soldCount = 0, prizes = []) {
  return {
    id:              row.id,
    slug:            row.slug || null,
    fundraiserType:  row.fundraiser_type || 'individual',
    title:           row.title,
    org:             row.org,
    description:     row.description || '',
    thankYou:        row.thank_you || '',
    contactName:     row.contact_name  || '',
    contactEmail:    row.contact_email || '',
    contactPhone:    row.contact_phone || '',
    grid:            row.grid_size,
    pricePerSq:      parseFloat(row.price_per_sq),
    sold:            soldCount,
    status:          row.status,
    emoji:           row.emoji || '🍀',
    drawType:        row.draw_type || 'manual',
    drawDate:        row.draw_date || null,
    winnerSquareNum:  row.winner_square_num ?? null,
    winnerSquareNums: Array.isArray(row.winner_square_nums) ? row.winner_square_nums : (row.winner_square_num != null ? [row.winner_square_num] : []),
    launchedAt:      row.launched_at || null,
    imageUrl:        row.image_url || null,
    imageFocalY:     row.image_focal_y ?? 50,
    state:           row.state || 'SA',
    totalPrizeValue: prizes.reduce((sum, p) => p.donated ? sum : sum + parsePrizeValue(p.value), 0),
    prizes: prizes
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((p) => ({ place: p.place, description: p.description, value: p.value, donated: p.donated ?? false })),
    payment: {
      method:                  row.payment_method,
      accountName:             row.bank_account_name,
      bsb:                     row.bank_bsb,
      account:                 row.bank_account,
      stripeAccountId:         row.stripe_account_id || null,
      stripeOnboardingComplete: row.stripe_onboarding_complete ?? false,
    },
  };
}

// ─── Confetti ─────────────────────────────────────────────────────────────────

const CONFETTI_COLORS = ['#FF0000', '#FF7700', '#FFDD00', '#00CC44', '#0088FF', '#7700FF', '#FF0088', '#F5A623'];

function Confetti() {
  const pieces = [...Array(70)].map((_, i) => ({
    id:       i,
    left:     `${Math.random() * 100}vw`,
    color:    CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    delay:    `${Math.random() * 1.5}s`,
    duration: `${2.5 + Math.random() * 2}s`,
    width:    `${6 + Math.random() * 8}px`,
    height:   `${6 + Math.random() * 8}px`,
  }));
  return (
    <>
      {pieces.map((p) => (
        <div key={p.id} className="confetti-piece" style={{ left: p.left, top: '-20px', width: p.width, height: p.height, background: p.color, animationDuration: p.duration, animationDelay: p.delay }} />
      ))}
    </>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

function AppHeader({ user, onLogout, onHome }) {
  return (
    <>
      <div className="rainbow-strip" />
      <header className="app-header" style={{ background: 'var(--card)', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 12px rgba(61,46,26,.07)', position: 'sticky', top: 0, zIndex: 100 }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <Logo size={88} />
        </Link>
        <div className="app-header-actions">
          {user && (
            <>
              <div className="app-header-user-info">
                <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600 }}>{user.name}</span>
                <MemberBadge isFoundingMember={user.isFoundingMember} isBetaTester={user.isBetaTester} />
              </div>
              <button className="btn btn-outline btn-sm app-header-dashboard-btn" onClick={onHome}>Dashboard</button>
              <button className="btn btn-outline btn-sm" onClick={onLogout}>Sign out</button>
            </>
          )}
        </div>
      </header>
    </>
  );
}

// ─── shared auth layout shell ─────────────────────────────────────────────────

function AuthShell({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      <div className="rainbow-strip" />
      <div style={{ padding: '18px 28px', borderBottom: '1px solid var(--border)', background: 'rgba(253,248,240,.92)', backdropFilter: 'blur(8px)' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Logo size={80} />
          </Link>
        </div>
      </div>
      {children}
    </div>
  );
}

// ─── LoginScreen ──────────────────────────────────────────────────────────────

function LoginScreen({ onLogin, onRegister, loading, error }) {
  const [email, setEmail] = useState('');
  const [pass,  setPass]  = useState('');
  return (
    <AuthShell>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '60px 24px 80px' }}>
        <div style={{ width: '100%', maxWidth: 440 }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div className="section-label" style={{ justifyContent: 'center', display: 'flex' }}>Organiser sign in</div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(26px,4vw,36px)', fontWeight: 900, color: 'var(--text)', margin: '10px 0 8px', lineHeight: 1.2 }}>
              Welcome back
            </h1>
            <p style={{ fontSize: 15, color: 'var(--text2)', margin: 0 }}>Sign in to manage your fundraisers</p>
          </div>
          <div className="scratch-card" style={{ padding: '32px 36px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" placeholder="you@example.com" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-input" type="password" placeholder="••••••••" maxLength={128} value={pass} onChange={(e) => setPass(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onLogin({ email, password: pass })} />
              </div>
              {error && <div style={{ padding: '10px 14px', background: '#FFF0F0', border: '1px solid #FFCCCC', borderRadius: 10, fontSize: 13, color: '#CC0000' }}>{error}</div>}
              <button className="btn btn-purple btn-lg" style={{ width: '100%', justifyContent: 'center' }} disabled={loading} onClick={() => onLogin({ email, password: pass })}>
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </div>
            <div className="divider" />
            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text2)', margin: 0 }}>
              New to Lucky Squares?{' '}
              <button onClick={onRegister} style={{ background: 'none', border: 'none', color: 'var(--green)', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>
                Create a free account →
              </button>
            </p>
          </div>
        </div>
      </div>
    </AuthShell>
  );
}

// ─── RegisterScreen ───────────────────────────────────────────────────────────

const REGISTER_FEATURES = [
  { icon: '🎯', title: 'Live online grid', desc: 'Participants pick squares from any device. Reservations are instant.' },
  { icon: '💳', title: 'Flexible payments', desc: 'In person, bank transfer, or secure card payments via Stripe.' },
  { icon: '🏆', title: 'One-click draw', desc: 'Run your draw live. Winners are highlighted instantly on the grid.' },
  { icon: '🍀', title: 'Pay only to go live', desc: 'Set up and preview everything free. $19 flat fee when you launch.' },
];

function RegisterScreen({ onRegister, onBack, loading, error }) {
  const [name,  setName]  = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [org,   setOrg]   = useState('');
  const [pass,  setPass]  = useState('');

  // Detect email-already-registered errors so we can show inline field feedback
  const emailTaken = !!error && (
    error.toLowerCase().includes('already registered') ||
    error.toLowerCase().includes('already exists') ||
    error.toLowerCase().includes('email address is already') ||
    error.toLowerCase().includes('user already registered')
  );

  return (
    <AuthShell>
      <div style={{ maxWidth: 1060, margin: '0 auto', padding: '52px 28px 80px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 52, alignItems: 'flex-start' }}>

          {/* Left: pitch */}
          <div style={{ flex: '1 1 320px', paddingTop: 4 }}>
            <div className="section-label">Free to start</div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px,3.5vw,42px)', fontWeight: 900, color: 'var(--text)', margin: '12px 0 16px', lineHeight: 1.2 }}>
              The easiest way to run a Lucky Squares fundraiser in Australia
            </h1>
            <p style={{ fontSize: 16, color: 'var(--text2)', lineHeight: 1.7, margin: '0 0 36px', maxWidth: 460 }}>
              Set up your grid in minutes, share a link with your community, and watch the squares fill up. No spreadsheets, no cash handling, no stress.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {REGISTER_FEATURES.map((f) => (
                <div key={f.title} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--green-light)', border: '1.5px solid var(--green-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{f.icon}</div>
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--text)', fontSize: 14, lineHeight: 1.3 }}>{f.title}</div>
                    <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.55, marginTop: 2 }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <p style={{ marginTop: 36, fontSize: 13, color: 'var(--text2)' }}>
              Already have an account?{' '}
              <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--green)', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>
                Sign in →
              </button>
            </p>
          </div>

          {/* Right: form */}
          <div style={{ flex: '1 1 340px', maxWidth: 460 }}>
            <div className="scratch-card" style={{ padding: '36px 40px' }}>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 900, color: 'var(--text)', margin: '0 0 4px' }}>Create your account</h2>
              <p style={{ fontSize: 13, color: 'var(--text2)', margin: '0 0 24px' }}>Free to register and explore. $19 flat fee when you launch.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Full name</label>
                  <input className="form-input" placeholder="Jane Smith" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Organisation</label>
                  <input className="form-input" placeholder="School, club or charity name" maxLength={100} value={org} onChange={(e) => setOrg(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" placeholder="you@example.com" maxLength={254}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ borderColor: emailTaken ? '#FF4444' : undefined }}
                  />
                  {emailTaken && (
                    <span style={{ fontSize: 12, color: '#CC0000', marginTop: 4, display: 'block' }}>
                      This email is already registered.{' '}
                      <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#CC0000', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, textDecoration: 'underline', padding: 0 }}>
                        Sign in instead →
                      </button>
                    </span>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" type="tel" placeholder="04XX XXX XXX" maxLength={20} value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input className="form-input" type="password" placeholder="8+ characters" maxLength={128} value={pass} onChange={(e) => setPass(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onRegister({ name, email, org, phone, password: pass })} />
                </div>
                {error && !emailTaken && <div style={{ padding: '10px 14px', background: '#FFF0F0', border: '1px solid #FFCCCC', borderRadius: 10, fontSize: 13, color: '#CC0000' }}>{error}</div>}
                <button className="btn btn-purple btn-lg" style={{ width: '100%', justifyContent: 'center' }} disabled={loading} onClick={() => onRegister({ name, email, org, phone, password: pass })}>
                  {loading ? 'Creating account…' : 'Create account'}
                </button>
              </div>
              <div className="divider" />
              <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text3)', margin: 0, lineHeight: 1.6 }}>
                By creating an account you agree to our{' '}
                <Link href="/terms" style={{ color: 'var(--green)', fontWeight: 700 }}>Terms of Service</Link>
                {' '}and{' '}
                <Link href="/privacy" style={{ color: 'var(--green)', fontWeight: 700 }}>Privacy Policy</Link>.
              </p>
            </div>
          </div>

        </div>
      </div>
    </AuthShell>
  );
}

// ─── VerifyScreen ─────────────────────────────────────────────────────────────

function VerifyScreen({ email, onResend }) {
  const [resent, setResent] = useState(false);

  const handleResend = async () => {
    await onResend();
    setResent(true);
    setTimeout(() => setResent(false), 5000);
  };

  return (
    <div className="dot-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 64 }}>📬</div>
          <h1 className="section-title" style={{ marginTop: 16 }}>Check your email</h1>
          <p className="section-sub">We sent a verification link to<br /><strong>{email || 'your email'}</strong></p>
        </div>
        <div className="scratch-card" style={{ padding: 32, textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7, margin: '0 0 24px' }}>
            Click the link in the email to confirm your account and continue. Check your spam folder if it doesn&apos;t arrive within a minute.
          </p>
          <button
            style={{ background: 'none', border: 'none', color: resent ? 'var(--green)' : 'var(--text2)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', textDecoration: resent ? 'none' : 'underline' }}
            onClick={handleResend}
          >
            {resent ? '✓ Email resent' : 'Didn\'t get it? Resend email'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function OrgTeamSection({ sendTxEmail }) {
  const [teamData,     setTeamData]     = useState(null);
  const [inviteEmail,  setInviteEmail]  = useState('');
  const [inviting,     setInviting]     = useState(false);
  const [inviteMsg,    setInviteMsg]    = useState('');
  const [revoking,     setRevoking]     = useState(null);

  const load = useCallback(async () => {
    const { data } = await getSupabaseClient().rpc('get_org_members');
    if (data) setTeamData(data);
  }, []);

  useEffect(() => { load(); }, [load]);

  const sendInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteMsg('');
    const { data } = await getSupabaseClient().rpc('invite_org_member', { p_email: inviteEmail.trim().toLowerCase() });
    setInviting(false);
    if (data?.error) { setInviteMsg(data.error); return; }
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const inviteUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://luckysquares.com.au'}/invite/${data.token}`;
    if (supabaseUrl) {
      fetch(`${supabaseUrl}/functions/v1/transactional-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'org_member_invite',
          to: inviteEmail.trim().toLowerCase(),
          data: { org_name: data.org_name || 'your organisation', invited_by_name: 'your organisation admin', invite_url: inviteUrl, expires_days: 7 },
        }),
      }).catch(() => {});
    }
    setInviteEmail('');
    setInviteMsg('Invite sent!');
    load();
  };

  const revokeMember = async (userId) => {
    setRevoking(userId);
    await getSupabaseClient().rpc('revoke_org_member', { p_member_user_id: userId });
    setRevoking(null);
    load();
  };

  const revokeInvite = async (inviteId) => {
    setRevoking(inviteId);
    await getSupabaseClient().rpc('revoke_org_invite', { p_invite_id: inviteId });
    setRevoking(null);
    load();
  };

  const memberCount  = (teamData?.members ?? []).length;
  const inviteCount  = (teamData?.invites ?? []).length;
  const totalUsed    = memberCount + inviteCount;
  const slotsLeft    = Math.max(0, 3 - totalUsed);

  return (
    <div style={{ background: '#fff', border: '1.5px solid #E5E0D5', borderRadius: 16, padding: '24px 28px', marginTop: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 800, margin: 0 }}>Team contributors</h2>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>
            {totalUsed} of 3 contributor slots used{slotsLeft > 0 ? ` (${slotsLeft} remaining)` : ''}
          </p>
        </div>
      </div>

      {(teamData?.members ?? []).length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {teamData.members.map((m) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F0EDE5', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{m.name || m.email}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>{m.email}</div>
              </div>
              <button
                onClick={() => revokeMember(m.user_id)}
                disabled={revoking === m.user_id}
                style={{ background: 'none', border: '1px solid #FCA5A5', borderRadius: 8, padding: '4px 12px', fontSize: 12, color: '#991B1B', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
              >
                {revoking === m.user_id ? '...' : 'Revoke access'}
              </button>
            </div>
          ))}
        </div>
      )}

      {(teamData?.invites ?? []).length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Pending invites</div>
          {teamData.invites.map((inv) => (
            <div key={inv.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F0EDE5', gap: 12 }}>
              <div style={{ fontSize: 13, color: 'var(--text2)' }}>{inv.email}</div>
              <button
                onClick={() => revokeInvite(inv.id)}
                disabled={revoking === inv.id}
                style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline', flexShrink: 0 }}
              >
                {revoking === inv.id ? '...' : 'Cancel invite'}
              </button>
            </div>
          ))}
        </div>
      )}

      {slotsLeft > 0 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input
            className="form-input"
            placeholder="contributor@email.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendInvite()}
            style={{ flex: 1, fontSize: 13 }}
          />
          <button className="btn btn-primary btn-sm" onClick={sendInvite} disabled={inviting || !inviteEmail.trim()} style={{ flexShrink: 0 }}>
            {inviting ? 'Sending...' : 'Send invite'}
          </button>
        </div>
      )}
      {inviteMsg && (
        <p style={{ fontSize: 13, marginTop: 8, color: inviteMsg === 'Invite sent!' ? 'var(--green)' : '#CC0000', fontWeight: 600 }}>{inviteMsg}</p>
      )}
    </div>
  );
}

function Dashboard({ user, fundraisers, fiftyFiftyCampaigns, onNew, onView, onReport, onConnectBank, onDuplicate, canCreate, planLimit, referralInfo, suspension, orgInfo, sendTxEmail, onNewFiftyFifty, onViewFiftyFifty }) {
  const [copied, setCopied] = useState(false);
  const referralLink = referralInfo?.referral_code
    ? `${typeof window !== 'undefined' ? window.location.origin : 'https://luckysquares.com.au'}/app?ref=${referralInfo.referral_code}`
    : null;
  const copyLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const hasAnyCampaign = fundraisers.some((f) => ['active', 'drawn'].includes(f.status));

  return (
    <div className="dot-bg" style={{ flex: 1 }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>

        {/* Contributor banner */}
        {orgInfo?.role === 'contributor' && (
          <div style={{ background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)', border: '1.5px solid #BFDBFE', borderRadius: 14, padding: '14px 20px', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 20 }}>👥</span>
            <div style={{ fontSize: 13, color: '#1E40AF', lineHeight: 1.5 }}>
              You are contributing to <strong>{orgInfo.org_name}</strong>. You can view and manage their campaigns but cannot create new ones.
            </div>
          </div>
        )}

        {/* Suspension banner */}
        {suspension?.suspended && (
          <div style={{ background: '#FEF2F2', border: '2px solid #FCA5A5', borderRadius: 14, padding: '18px 24px', marginBottom: 24 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 22 }}>🚫</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, color: '#991B1B', marginBottom: 4 }}>Your account has been suspended</div>
                {suspension.reason && <div style={{ fontSize: 13, color: '#7F1D1D', lineHeight: 1.6 }}>{suspension.reason}</div>}
                <div style={{ fontSize: 13, color: '#991B1B', marginTop: 8 }}>
                  You cannot launch new campaigns while your account is suspended. To appeal or get help, <a href="/contact" style={{ color: '#991B1B', fontWeight: 700 }}>contact us</a>.
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 className="section-title">G&apos;day, {user?.name?.split(' ')[0] || 'there'}! 👋</h1>
            <p className="section-sub">
              {fundraisers.length === 0 && (!fiftyFiftyCampaigns || fiftyFiftyCampaigns.length === 0)
                ? 'Ready to run your first Lucky Squares fundraiser? It takes about 5 minutes to set up.'
                : 'Here are your fundraising campaigns'}
            </p>
          </div>
        </div>

        {/* First-time onboarding steps — shown only when no campaigns exist */}
        {fundraisers.length === 0 && (!fiftyFiftyCampaigns || fiftyFiftyCampaigns.length === 0) && !orgInfo?.role && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, margin: '24px 0 8px', padding: '28px 24px', background: 'var(--card)', borderRadius: 16, border: '1.5px solid var(--border)' }}>
            {[
              { step: '1', icon: '🎯', title: 'Set up your grid', desc: 'Choose your grid size, set a price per square, and add your prizes.' },
              { step: '2', icon: '🔗', title: 'Share your link', desc: 'Send your campaign link via WhatsApp, email, or social media.' },
              { step: '3', icon: '🎲', title: 'Run the draw', desc: 'Hit draw when ready and the winner is revealed live to everyone watching.' },
              { step: '4', icon: '💸', title: 'Funds go to you', desc: 'Proceeds transfer directly to your account. We charge a flat $19 fee, nothing more.' },
            ].map(({ step, icon, title, desc }) => (
              <div key={step} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--purple-light)', border: '1.5px solid #C4B5FD', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{icon}</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)', marginBottom: 3 }}>{title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 20, marginTop: 24 }}>
          {fundraisers.map((f) => (
            <FundraiserCard key={f.id} f={f} onView={() => onView(f)} onReport={() => onReport(f)} onConnectBank={() => onConnectBank(f)} onDuplicate={() => onDuplicate(f)} />
          ))}
          {(fiftyFiftyCampaigns ?? []).map((ff) => (
            <FiftyFiftyCard key={ff.id} ff={ff} onView={() => onViewFiftyFifty(ff)} />
          ))}
          {canCreate && <NewFundraiserCard onClick={onNew} />}
          {canCreate && <NewFiftyFiftyCard />}
        </div>

        {/* Referral card */}
        {hasAnyCampaign && referralLink && (
          <div style={{ background: 'linear-gradient(135deg, #0D2B1F, #1A4A30)', borderRadius: 16, padding: '20px 24px', marginTop: 24, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 32 }}>🍀</div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 4 }}>Refer a friend, get your next campaign free</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', lineHeight: 1.5 }}>
                Share your link. When a friend signs up and launches their first campaign, you get a free campaign coupon.
                {referralInfo.rewarded_count > 0 && <span style={{ color: '#6EE7B7', fontWeight: 700 }}> You have earned {referralInfo.rewarded_count} free campaign{referralInfo.rewarded_count !== 1 ? 's' : ''}!</span>}
                {referralInfo.pending_count > 0 && <span style={{ color: 'rgba(255,255,255,.6)' }}> {referralInfo.pending_count} friend{referralInfo.pending_count !== 1 ? 's' : ''} signed up, waiting on their first launch.</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
              <input readOnly value={referralLink} style={{ fontSize: 12, padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,.2)', background: 'rgba(255,255,255,.1)', color: '#fff', width: 240, fontFamily: 'monospace' }} onClick={(e) => e.target.select()} />
              <button className="btn btn-primary btn-sm" onClick={copyLink} style={{ flexShrink: 0 }}>
                {copied ? '✓ Copied' : 'Copy link'}
              </button>
            </div>
          </div>
        )}

        {/* Team section: visible to org plan admins only */}
        {user?.plan === 'org' && orgInfo?.role !== 'contributor' && (
          <OrgTeamSection sendTxEmail={sendTxEmail} />
        )}
      </div>
    </div>
  );
}

const PLATFORM_FEES = { 25: 19, 50: 19, 100: 19 };

const PLAN_LIMITS  = { trial: 3, casual: 5, org: 10 };
const PLAN_LABELS  = { trial: 'Trial', casual: 'Casual', org: 'Organisation' };

function FiftyFiftyCard({ ff, onView }) {
  const fmt = (n) => Number(n).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <div>
      <div className="scratch-card" style={{ padding: 24, borderLeft: '4px solid #F59E0B' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 40 }}>{ff.emoji || '🎟️'}</div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <span className={`tag ${ff.status === 'active' ? 'tag-green' : ff.status === 'drawn' ? 'tag-drawn' : 'tag-muted'}`}>
              {ff.status === 'active' ? '● Live' : ff.status === 'drawn' ? '🏆 Drawn' : 'Draft'}
            </span>
            <span className="tag" style={{ background: '#FEF3C7', color: '#92400E', fontSize: 11 }}>🎟️ 50/50 Raffle</span>
          </div>
        </div>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{ff.title}</div>
        <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>
          {ff.tickets_sold} tickets sold
        </div>
        <div style={{ display: 'flex', gap: 20, marginBottom: 4, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text2)', marginBottom: 2 }}>Live jackpot</div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 900, color: '#92400E' }}>${fmt(ff.jackpot ?? 0)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text2)', marginBottom: 2 }}>Ticket price</div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 900, color: 'var(--text)' }}>${fmt(ff.ticket_price)}</div>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
        {ff.status === 'draft' ? (
          <div style={{ padding: '10px 12px', background: '#FFF6EE', border: '1.5px solid #FFD8B0', borderRadius: 10, fontSize: 13, marginBottom: 4 }}>
            <div style={{ fontWeight: 800, color: 'var(--orange)', marginBottom: 4 }}>⏳ Payment pending</div>
            <div style={{ color: 'var(--text2)', lineHeight: 1.5 }}>Your raffle is saved. Complete the $19 launch payment to go live.</div>
          </div>
        ) : null}
        <button className="btn btn-primary btn-sm" style={{ width: '100%' }} onClick={onView}>Manage raffle →</button>
        {ff.status === 'drawn' && (
          <button className="btn btn-outline btn-sm" style={{ width: '100%' }} disabled>
            🔁 Duplicate (coming soon)
          </button>
        )}
      </div>
    </div>
  );
}

function NewFiftyFiftyCard() {
  return (
    <div className="card"
      style={{ padding: 24, cursor: 'not-allowed', border: '2px dashed #E5E0D5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200, background: 'transparent', textAlign: 'center', gap: 12, opacity: 0.5 }}>
      <div style={{ fontSize: 40 }}>🎟️</div>
      <div style={{ fontWeight: 800, color: 'var(--text2)' }}>New 50/50 Raffle</div>
      <div style={{ fontSize: 13, color: 'var(--muted)' }}>Sell tickets, winner takes half the pot</div>
      <div style={{ marginTop: 4, padding: '4px 12px', background: '#F3F4F6', border: '1.5px solid #D1D5DB', borderRadius: 20, fontSize: 11, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1 }}>Coming soon</div>
    </div>
  );
}

function FundraiserCard({ f, onView, onReport, onConnectBank, onDuplicate }) {
  const [hovered, setHovered] = useState(false);
  const pct            = Math.round((f.sold / f.grid) * 100);
  const platformFee    = PLATFORM_FEES[f.grid] ?? 0;
  const grossRaised    = f.sold * f.pricePerSq;
  const netRaised      = Math.max(0, grossRaised - (f.totalPrizeValue ?? 0) - platformFee);
  const fmt            = (n) => n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const costPrizes     = f.totalPrizeValue ?? 0;
  const breakEvenSold  = costPrizes > 0 && f.pricePerSq > 0 ? Math.ceil(costPrizes / f.pricePerSq) : 0;
  const atBreakEven    = breakEvenSold === 0 || f.sold >= breakEvenSold;
  const daysLive       = f.launchedAt ? Math.floor((Date.now() - new Date(f.launchedAt).getTime()) / 86400000) : null;
  const daysRemaining  = daysLive !== null ? Math.max(0, 30 - daysLive) : null;

  return (
    <div>
      <div className="scratch-card" style={{ padding: 24, position: 'relative' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}>

        {hovered && (
          <div style={{ position: 'absolute', inset: 0, background: '#1A3C2E', color: '#fff', borderRadius: 'var(--radius)', padding: '24px 20px', zIndex: 20, display: 'flex', flexDirection: 'column', justifyContent: 'center', pointerEvents: 'none' }}>
            <div style={{ fontSize: 11, opacity: .6, fontWeight: 800, textTransform: 'uppercase', letterSpacing: .8, marginBottom: 16 }}>Fundraiser snapshot</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24 }}>
                <span style={{ fontSize: 13, opacity: .8 }}>Squares sold</span>
                <span style={{ fontWeight: 800 }}>{f.sold} / {f.grid}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24 }}>
                <span style={{ fontSize: 13, opacity: .8 }}>Gross raised</span>
                <span style={{ fontWeight: 700 }}>${fmt(grossRaised)}</span>
              </div>
              <div style={{ height: 1, background: 'rgba(255,255,255,.15)', margin: '4px 0' }} />
              {(f.totalPrizeValue ?? 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24 }}>
                  <span style={{ fontSize: 13, opacity: .8 }}>Prize pool</span>
                  <span style={{ fontWeight: 700, color: '#FFAA66' }}>−${fmt(f.totalPrizeValue)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24 }}>
                <span style={{ fontSize: 13, opacity: .8 }}>Platform fee</span>
                <span style={{ fontWeight: 700, color: '#FFAA66' }}>−${fmt(platformFee)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24 }}>
                <span style={{ fontSize: 14, fontWeight: 800 }}>Net raised</span>
                <span style={{ fontWeight: 900, color: '#00C875', fontFamily: 'var(--font-serif)', fontSize: 18 }}>${fmt(netRaised)}</span>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 40 }}>{f.emoji}</div>
          <span className={`tag ${f.status === 'active' ? 'tag-green' : f.status === 'drawn' ? 'tag-drawn' : 'tag-muted'}`}>
            {f.status === 'active' ? '● Live' : f.status === 'drawn' ? '🏆 Drawn' : 'Draft'}
          </span>
        </div>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{f.title}</div>
        <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 16 }}>by {f.org}</div>
        <div style={{ background: '#EDE5D0', borderRadius: 4, height: 8, marginBottom: 8, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg,var(--green),var(--green2))', borderRadius: 4, transition: 'width 1s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>
          <span><strong style={{ color: 'var(--text)' }}>{f.sold}</strong> / {f.grid} squares</span>
          <span style={{ color: 'var(--green)', fontWeight: 800 }}>${grossRaised.toLocaleString()} raised</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text2)' }}>${f.pricePerSq} per square</div>

        {f.status === 'active' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
            {!atBreakEven && (
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--orange)', background: '#FFF6EE', border: '1px solid #FFD8B0', borderRadius: 8, padding: '6px 10px' }}>
                ⚠️ {breakEvenSold - f.sold} more square{(breakEvenSold - f.sold) !== 1 ? 's' : ''} needed to cover prize costs
              </div>
            )}
            {daysRemaining !== null && daysRemaining <= 7 && (
              <div style={{ fontSize: 12, fontWeight: 700, color: daysRemaining <= 2 ? '#CC0000' : 'var(--orange)', background: daysRemaining <= 2 ? '#FFF0F0' : '#FFF6EE', border: `1px solid ${daysRemaining <= 2 ? '#FFCCCC' : '#FFD8B0'}`, borderRadius: 8, padding: '6px 10px' }}>
                🕐 {daysRemaining === 0 ? 'Expires today' : `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`} — campaigns auto-cancel after 30 days if below break-even
              </div>
            )}
          </div>
        )}
      </div>

      {f.status === 'active' && f.payment?.method === 'stripe' && !f.payment?.stripeAccountId && (
        <div style={{ marginTop: 10, padding: '10px 12px', background: '#FFF6EE', border: '1.5px solid #FFD8B0', borderRadius: 10, fontSize: 13 }}>
          <div style={{ fontWeight: 800, color: 'var(--orange)', marginBottom: 4 }}>⚠️ Bank account not connected</div>
          <div style={{ color: 'var(--text2)', marginBottom: 8, lineHeight: 1.5 }}>Participants can't pay by card until you connect your bank account.</div>
          <button className="btn btn-sm" style={{ background: 'var(--orange)', color: '#fff', width: '100%' }} onClick={onConnectBank}>Connect bank account →</button>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
        <button className="btn btn-primary btn-sm" style={{ width: '100%' }} onClick={onView}>View my campaign →</button>
        <button className="btn btn-outline btn-sm" style={{ width: '100%' }} onClick={onReport}>View campaign report</button>
        {f.status === 'drawn' && (
          <button className="btn btn-outline btn-sm" style={{ width: '100%' }} onClick={() => onDuplicate(f)}>
            🔁 Duplicate this campaign
          </button>
        )}
      </div>
    </div>
  );
}

function NewFundraiserCard({ onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div className="card" onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ padding: 24, cursor: 'pointer', border: `2px dashed ${hovered ? 'var(--green)' : '#D4C9AE'}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200, background: hovered ? '#F0FDF8' : 'transparent', textAlign: 'center', gap: 12, transition: 'border-color .2s, background .2s' }}>
      <div style={{ fontSize: 40, color: hovered ? 'var(--green)' : 'var(--muted)', transition: 'color .2s' }}>＋</div>
      <div style={{ fontWeight: 800, color: 'var(--text2)' }}>New Lucky Squares Fundraiser</div>
      <div style={{ fontSize: 13, color: 'var(--muted)' }}>Set up a grid-based fundraiser</div>
    </div>
  );
}

// ─── CampaignReport ───────────────────────────────────────────────────────────

function CampaignReport({ fundraiser, onBack }) {
  const [squares,  setSquares]  = useState([]);
  const [loading,  setLoading]  = useState(true);

  const needsPayment = ['bank', 'bank_inperson'].includes(fundraiser.payment?.method);

  useEffect(() => {
    if (!supabaseConfigured) {
      setSquares([]);
      setLoading(false);
      return;
    }
    getSupabaseClient()
      .from('squares')
      .select('*')
      .eq('fundraiser_id', fundraiser.id)
      .eq('status', 'sold')
      .order('buyer_name')
      .then(({ data }) => { setSquares(data || []); setLoading(false); });
  }, [fundraiser.id]);

  // Group sold squares by buyer (keyed by email, fallback to name)
  const buyerMap = {};
  squares.forEach((sq) => {
    const key = sq.buyer_email || sq.buyer_name || 'unknown';
    if (!buyerMap[key]) buyerMap[key] = { key, name: sq.buyer_name, email: sq.buyer_email, phone: sq.buyer_phone, squares: [], paid: true };
    buyerMap[key].squares.push(sq.number);
    if (!sq.paid) buyerMap[key].paid = false;
  });
  const buyers = Object.values(buyerMap);

  const handleTogglePaid = async (buyerKey) => {
    const buyer  = buyerMap[buyerKey];
    const newVal = !buyer.paid;
    setSquares((prev) => prev.map((sq) => {
      const k = sq.buyer_email || sq.buyer_name || 'unknown';
      return k === buyerKey ? { ...sq, paid: newVal } : sq;
    }));
    if (supabaseConfigured) {
      const q = getSupabaseClient().from('squares').update({ paid: newVal }).eq('fundraiser_id', fundraiser.id).eq('status', 'sold');
      if (buyer.email) await q.eq('buyer_email', buyer.email);
      else             await q.eq('buyer_name',  buyer.name);
    }
  };

  const fmt          = (n) => n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const totalSold    = squares.length;
  const paidSquares  = squares.filter((sq) => sq.paid).length;
  const fundsRcvd    = paidSquares * fundraiser.pricePerSq;
  const allPrizes    = (fundraiser.prizes || []).reduce((s, p) => s + parsePrizeValue(p.value), 0);
  const costPrizes   = (fundraiser.prizes || []).reduce((s, p) => p.donated ? s : s + parsePrizeValue(p.value), 0);
  const platformFee  = PLATFORM_FEES[fundraiser.grid] ?? 0;
  const netRaised    = Math.max(0, fundsRcvd - costPrizes - platformFee);

  const isDrawn      = fundraiser.status === 'drawn';
  const winnerNums   = fundraiser.winnerSquareNums ?? [];
  // Match each winning square number to its buyer from the loaded squares list
  const winnerRows   = winnerNums.map((num, idx) => {
    const sq    = squares.find((s) => s.number === num);
    const prize = (fundraiser.prizes || [])[idx] ?? null;
    return { squareNum: num, name: sq?.buyer_name || 'Unknown', email: sq?.buyer_email || null, phone: sq?.buyer_phone || null, prize };
  });

  return (
    <div className="dot-bg" style={{ flex: 1 }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>
        <button className="btn btn-outline btn-sm" style={{ marginBottom: 24 }} onClick={onBack}>← Dashboard</button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 40 }}>{fundraiser.emoji}</span>
            <div>
              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 900, marginBottom: 2 }}>Campaign Report</h1>
              <div style={{ fontSize: 14, color: 'var(--text2)' }}>{fundraiser.title}</div>
            </div>
          </div>
          {isDrawn && (
            <a
              href={`/${fundraiser.slug ?? fundraiser.id}/certificate`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline btn-sm"
              style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}
            >
              📜 Download integrity certificate
            </a>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 16, marginBottom: 32 }}>
          {[
            { label: 'Squares sold',      value: `${totalSold} / ${fundraiser.grid}` },
            { label: 'Funds received',    value: `$${fmt(fundsRcvd)}` },
            { label: 'Prize pool value',  value: `$${fmt(allPrizes)}` },
            { label: 'Total funds raised', value: `$${fmt(netRaised)}`, highlight: true },
          ].map(({ label, value, highlight }) => (
            <div key={label} className="scratch-card" style={{ padding: '20px 24px', borderColor: highlight ? 'var(--green)' : undefined, background: highlight ? '#F0FDF8' : undefined }}>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: .8, color: 'var(--text2)', marginBottom: 8 }}>{label}</div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 900, color: highlight ? 'var(--green)' : 'var(--text)' }}>{value}</div>
            </div>
          ))}
        </div>

        {isDrawn && winnerRows.length > 0 && (
          <div className="scratch-card" style={{ padding: 28, marginBottom: 20, background: 'linear-gradient(135deg,#F5FBF3,#EAF7F0)', borderColor: '#B6EDD8' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 900, marginBottom: 16 }}>🏆 Draw results</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {winnerRows.map((w, i) => (
                <div key={w.squareNum} style={{ background: '#fff', border: '1.5px solid #B6EDD8', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: i === 0 ? '#F0D878' : i === 1 ? '#D1D5DB' : '#D4A574', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 2 }}>{w.name}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 16px', fontSize: 13, color: 'var(--text2)' }}>
                      <span>Square #{w.squareNum}</span>
                      {w.prize && <span>{w.prize.place} place{w.prize.description ? `: ${w.prize.description}` : ''}{w.prize.value ? ` (${w.prize.value})` : ''}</span>}
                    </div>
                    {(w.email || w.phone) && (
                      <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                        {w.email && <a href={`mailto:${w.email}`} style={{ fontSize: 12, color: 'var(--purple)', textDecoration: 'none', fontWeight: 600 }}>✉ {w.email}</a>}
                        {w.phone && <a href={`tel:${w.phone}`} style={{ fontSize: 12, color: 'var(--purple)', textDecoration: 'none', fontWeight: 600 }}>📞 {w.phone}</a>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="scratch-card" style={{ padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 900 }}>Buyers</h2>
            {needsPayment && (
              <div style={{ display: 'flex', gap: 16, fontSize: 12, fontWeight: 700 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 14, height: 14, borderRadius: 3, background: '#FFF8EC', border: '1.5px solid #F0D878' }} />
                  <span style={{ color: 'var(--text2)' }}>Payment not confirmed</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 14, height: 14, borderRadius: 3, background: '#F0FDF8', border: '1.5px solid #B6EDD8' }} />
                  <span style={{ color: 'var(--text2)' }}>Payment confirmed</span>
                </div>
              </div>
            )}
          </div>

          {loading && <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text2)' }}>Loading…</div>}
          {!loading && buyers.length === 0 && <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text2)' }}>No squares sold yet</div>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {buyers.map((buyer) => {
              const bg     = needsPayment ? (buyer.paid ? '#F0FDF8' : '#FFF8EC') : 'var(--cream)';
              const border = needsPayment ? (buyer.paid ? '#B6EDD8' : '#F0D878') : 'var(--border)';
              return (
                <div key={buyer.key} style={{ background: bg, border: `1.5px solid ${border}`, borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', transition: 'background .3s, border-color .3s' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 20px', marginBottom: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 800 }}>{buyer.name || 'Unknown'}</span>
                      {buyer.phone && <a href={`tel:${buyer.phone}`} style={{ fontSize: 13, color: 'var(--text2)', textDecoration: 'none' }}>📞 {buyer.phone}</a>}
                      {buyer.email && <a href={`mailto:${buyer.email}`} style={{ fontSize: 13, color: 'var(--text2)', textDecoration: 'none' }}>✉ {buyer.email}</a>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 700 }}>{buyer.squares.length} square{buyer.squares.length !== 1 ? 's' : ''}</span>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {[...buyer.squares].sort((a, b) => a - b).map((n) => <span key={n} className="num-pill" style={{ fontSize: 11 }}>#{n}</span>)}
                      </div>
                    </div>
                  </div>
                  {needsPayment && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flexShrink: 0 }}>
                      <input type="checkbox" checked={buyer.paid} onChange={() => handleTogglePaid(buyer.key)}
                        style={{ width: 18, height: 18, accentColor: 'var(--green)', cursor: 'pointer' }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: buyer.paid ? 'var(--green)' : '#9A6800' }}>
                        {buyer.paid ? 'Paid' : 'Mark as paid'}
                      </span>
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SetupWizard ──────────────────────────────────────────────────────────────

const WIZARD_STORAGE_KEY = 'ls_wizard_draft';

function SetupWizard({ onComplete, onCancel, onLaunchPay, onSaveDraft, isFoundingMember = false, userPrefill = null, stripeOnboardingComplete = false, onBankConnectDone = null, campaignPrefill = null }) {
  // campaignPrefill (from duplicate) takes priority over any localStorage draft
  const savedDraft = campaignPrefill ?? (() => { try { return JSON.parse(localStorage.getItem(WIZARD_STORAGE_KEY) || 'null'); } catch { return null; } })();

  // Clear localStorage draft on mount when starting from a duplicate prefill so
  // the auto-save loop doesn't immediately overwrite the prefilled values
  useEffect(() => {
    if (campaignPrefill) {
      try { localStorage.removeItem(WIZARD_STORAGE_KEY); } catch {}
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [step,            setStep]            = useState(savedDraft?.step ?? 0);
  const [profanityFlags,  setProfanityFlags]  = useState({});
  const [fundraiserType,  setFundraiserType]  = useState(savedDraft?.fundraiserType ?? (userPrefill?.plan === 'org' ? 'org' : '')); // 'individual' | 'org'
  const [orgDetails,      setOrgDetails]      = useState(() => {
    const defaults = { name: userPrefill?.org || '', orgType: userPrefill?.orgType || '', abn: userPrefill?.orgAbn || '' };
    if (!savedDraft?.orgDetails) return defaults;
    return {
      ...defaults,
      ...savedDraft.orgDetails,
      name:    savedDraft.orgDetails.name    || userPrefill?.org     || '',
      orgType: savedDraft.orgDetails.orgType || userPrefill?.orgType || '',
      abn:     savedDraft.orgDetails.abn     || userPrefill?.orgAbn  || '',
    };
  });
  const [gridOpt,         setGridOpt]         = useState(savedDraft?.gridOpt ?? GRID_OPTIONS[0]);
  const [price,     setPrice]     = useState(savedDraft?.price ?? '5');
  const [prizes,    setPrizes]    = useState(savedDraft?.prizes ?? [{ place: '1st', desc: '', value: '', donated: false }, { place: '2nd', desc: '', value: '', donated: false }, { place: '3rd', desc: '', value: '', donated: false }]);
  const [campaign,       setCampaign]       = useState(() => {
    const defaults = { title: '', org: userPrefill?.org || '', state: 'SA', contactName: userPrefill?.name || '', contactEmail: userPrefill?.email || '', contactPhone: userPrefill?.phone || '', description: '', thankYou: '', emoji: '🍀' };
    if (!savedDraft?.campaign) return defaults;
    // Merge draft over defaults, but fall back to prefill for any contact fields the draft left blank
    return {
      ...defaults,
      ...savedDraft.campaign,
      contactName:  savedDraft.campaign.contactName  || userPrefill?.name  || '',
      contactEmail: savedDraft.campaign.contactEmail || userPrefill?.email || '',
      contactPhone: savedDraft.campaign.contactPhone || userPrefill?.phone || '',
    };
  });
  const [campaignImageUrl,  setCampaignImageUrl]  = useState(savedDraft?.campaignImageUrl ?? '');
  const [imageFocalY,       setImageFocalY]       = useState(savedDraft?.imageFocalY ?? 50);
  const [imageUploading,    setImageUploading]    = useState(false);
  const [drawRules,         setDrawRules]         = useState(savedDraft?.drawRules ?? { type: 'manual', date: '' });
  const [payment,           setPayment]           = useState(savedDraft?.payment ?? { method: 'inperson', accountName: '', bsb: '', account: '' });
  const [paymentConfirming, setPaymentConfirming] = useState(false);
  const [couponCode,        setCouponCode]        = useState('');
  const [couponState,       setCouponState]       = useState('idle'); // idle | checking | valid | invalid
  const [couponData,        setCouponData]        = useState(null);   // { type, value }
  const [bankDraftId,       setBankDraftId]       = useState(null);
  const [bankSaving,        setBankSaving]        = useState(false);
  const [bankSaveError,     setBankSaveError]     = useState(false);
  const [bankConnectDone,   setBankConnectDone]   = useState(false);
  const [launchError,       setLaunchError]       = useState(null); // null | 'COUPON_INVALID' | 'UNKNOWN'

  // Auto-populate campaign.org from org details when type is 'org'
  useEffect(() => {
    if (fundraiserType === 'org' && orgDetails.name.trim() && !campaign.org.trim()) {
      setCampaign((c) => ({ ...c, org: orgDetails.name.trim() }));
    }
  }, [fundraiserType, orgDetails.name]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to top on every step change
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [step]);

  // Auto-save wizard state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify({ step, fundraiserType, orgDetails, gridOpt, price, prizes, campaign, campaignImageUrl, imageFocalY, drawRules, payment }));
    } catch {}
  }, [step, gridOpt, price, prizes, campaign, campaignImageUrl, drawRules, payment]);

  const clearDraft = () => { try { localStorage.removeItem(WIZARD_STORAGE_KEY); } catch {} };

  const PAYMENT_STEP = WIZARD_STEPS.indexOf('Payment'); // 6
  const BANK_STEP    = WIZARD_STEPS.indexOf('Connect Bank'); // 8
  const LAUNCH_STEP  = WIZARD_STEPS.indexOf('Launch'); // 9
  const isStripePayment = payment.method === 'stripe';

  // When the user arrives at step 8 (Connect Bank), save the draft so StripeConnectSetup
  // has a real fundraiser_id to pass to the account-session API.
  useEffect(() => {
    if (step !== BANK_STEP || bankDraftId || bankSaving) return;
    setBankSaving(true);
    setBankSaveError(false);
    onSaveDraft({ fundraiserType, orgDetails, gridOpt, price, prizes, campaign, campaignImageUrl, imageFocalY, drawRules, payment })
      .then((id) => {
        setBankSaving(false);
        if (id) setBankDraftId(id);
        else setBankSaveError(true);
      });
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleImageSelect = async (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Please choose an image under 5 MB.'); return; }
    const preview = URL.createObjectURL(file);
    setCampaignImageUrl(preview);
    setImageUploading(true);
    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      const token = session?.access_token;
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/fundraiser/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const json = await res.json();
      if (res.ok && json.url) setCampaignImageUrl(json.url);
    } finally {
      setImageUploading(false);
    }
  };

  const checkCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) return;
    setCouponState('checking');
    if (!supabaseConfigured) {
      if (code === 'DEMO100') { setCouponData({ type: 'percent', value: 100 }); setCouponState('valid'); }
      else { setCouponData(null); setCouponState('invalid'); }
      return;
    }
    const { data } = await getSupabaseClient().rpc('validate_coupon', { p_code: code });
    const result = Array.isArray(data) ? data[0] : data;
    if (result?.valid) { setCouponData({ type: result.discount_type, value: result.discount_value }); setCouponState('valid'); }
    else { setCouponData(null); setCouponState('invalid'); }
  };

  const bankComplete = ['bank', 'bank_inperson'].includes(payment.method)
    ? payment.accountName.trim() && payment.bsb.trim() && payment.account.trim()
    : true;

  const hasProfanityFlag = Object.values(profanityFlags).some(Boolean);
  const flagField = (key, val) => setProfanityFlags((f) => ({ ...f, [key]: containsProfanity(val) }));

  const canNext = () => {
    if (hasProfanityFlag) return false;
    if (step === 0) return fundraiserType === 'individual' || (fundraiserType === 'org' && orgDetails.name.trim());
    if (step === 1) return !!gridOpt;
    if (step === 2) return parseFloat(price) > 0;
    if (step === 3) {
      const filled = prizes.filter((p) => p.desc.trim());
      const totalPrizes = prizes.reduce((sum, p) => sum + parsePrizeValue(p.value), 0);
      const stateCap = STATE_PRIZE_CAPS[campaign.state || 'SA'] ?? 5000;
      return filled.length > 0 && filled.every((p) => p.donated || p.value.trim()) && totalPrizes <= stateCap;
    }
    if (step === 4) return campaign.title.trim() && campaign.contactName.trim() && campaign.contactEmail.trim() && campaign.contactPhone.trim();
    if (step === PAYMENT_STEP) return bankComplete;
    if (step === BANK_STEP) return bankConnectDone;
    return true;
  };

  const ORG_TYPE_OPTIONS = [
    { value: 'sporting_club',   label: 'Sporting club' },
    { value: 'school',         label: 'School / P&C' },
    { value: 'charity',        label: 'Charity' },
    { value: 'community_group',label: 'Community group' },
    { value: 'business',       label: 'Business' },
    { value: 'other',          label: 'Other' },
  ];

  const stepContent = [
    <div key="who">
      <h2 className="section-title">Who's running this fundraiser?</h2>
      <p className="section-sub" style={{ marginBottom: 24 }}>This helps us set up the right payment details for your campaign.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
        {[
          { type: 'individual', icon: '👤', title: 'Just me', desc: 'An individual running a personal fundraiser. Funds go to your own bank account.' },
          { type: 'org',        icon: '🏢', title: 'An organisation', desc: 'A club, school, charity, or business. Funds go to your organisation\'s account.' },
        ].map((opt) => (
          <div
            key={opt.type}
            className="scratch-card"
            style={{ padding: '20px 24px', cursor: 'pointer', borderColor: fundraiserType === opt.type ? 'var(--green)' : undefined, borderWidth: fundraiserType === opt.type ? 2 : 1.5 }}
            onClick={() => setFundraiserType(opt.type)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: fundraiserType === opt.type ? '#D4F5E9' : '#F0EDE5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, transition: 'all .2s' }}>
                {opt.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 2 }}>{opt.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>{opt.desc}</div>
              </div>
              {fundraiserType === opt.type && <div style={{ fontSize: 20, color: 'var(--green)', flexShrink: 0 }}>✓</div>}
            </div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <a href="/pricing" target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'var(--green)', fontWeight: 600, textDecoration: 'none' }}>
          Read about the unlimited campaign plan for Organisations →
        </a>
      </div>

      {fundraiserType === 'individual' && (
        <div style={{ background: '#FFFBEB', border: '1.5px solid #F59E0B', borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6, color: '#92400E' }}>A note on personal fundraising</div>
          <div style={{ fontSize: 13, color: '#78350F', lineHeight: 1.6 }}>
            As an individual organiser, you are acting as the facilitator of this fundraiser. You are responsible for paying out prizes to winners and ensuring funds are used as described. Funds raised will transfer to your personal bank account via Stripe.
          </div>
        </div>
      )}

      {fundraiserType === 'org' && (
        <div className="scratch-card" style={{ padding: 24 }}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>Organisation details</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--text2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>Organisation name <span style={{ color: 'var(--orange)' }}>*</span></label>
              <input
                className="form-input"
                placeholder="e.g. Sunbury Primary P&C"
                value={orgDetails.name}
                onChange={(e) => setOrgDetails((o) => ({ ...o, name: e.target.value }))}
                onBlur={(e) => flagField('orgName', e.target.value)}
                maxLength={100}
              />
              {profanityFlags.orgName && <div style={{ marginTop: 5, fontSize: 12, color: '#E53E3E' }}>Please keep campaign content appropriate for all audiences.</div>}
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--text2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>Organisation type</label>
              <select
                className="form-input"
                value={orgDetails.orgType}
                onChange={(e) => setOrgDetails((o) => ({ ...o, orgType: e.target.value }))}
              >
                <option value="">Select a type…</option>
                {ORG_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--text2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>ABN <span style={{ fontWeight: 400, fontSize: 11 }}>(optional)</span></label>
              <input
                className="form-input"
                placeholder="e.g. 12 345 678 901"
                value={orgDetails.abn}
                onChange={(e) => setOrgDetails((o) => ({ ...o, abn: e.target.value }))}
                onBlur={() => {
                  const { valid, digits } = validateAbn(orgDetails.abn);
                  if (valid) setOrgDetails((o) => ({ ...o, abn: formatAbn(digits) }));
                }}
                maxLength={14}
                style={{ borderColor: orgDetails.abn.replace(/\s/g, '').length === 11 && !validateAbn(orgDetails.abn).valid ? '#E53E3E' : undefined }}
              />
              {orgDetails.abn.replace(/\s/g, '').length === 11 && !validateAbn(orgDetails.abn).valid && (
                <div style={{ marginTop: 5, fontSize: 12, color: '#E53E3E' }}>That doesn&apos;t look like a valid ABN. Please check the number and try again.</div>
              )}
              {orgDetails.abn.replace(/\s/g, '').length === 11 && validateAbn(orgDetails.abn).valid && (
                <div style={{ marginTop: 5, fontSize: 12, color: 'var(--green)', fontWeight: 700 }}>✓ Valid ABN</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>,

    <div key="grid">
      <h2 className="section-title">Choose grid size</h2>
      <p className="section-sub" style={{ marginBottom: 24 }}>How many squares will you sell?</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {GRID_OPTIONS.map((opt) => (
          <div key={opt.size} className="scratch-card" style={{ padding: '20px 24px', cursor: 'pointer', borderColor: gridOpt?.size === opt.size ? 'var(--green)' : undefined, borderWidth: gridOpt?.size === opt.size ? 2 : 1.5 }} onClick={() => setGridOpt(opt)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: gridOpt?.size === opt.size ? '#D4F5E9' : '#F0EDE5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, fontFamily: 'var(--font-serif)', color: gridOpt?.size === opt.size ? 'var(--green)' : 'var(--muted)', transition: 'all .2s' }}>
                {opt.size}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{opt.label}</div>
              </div>
              {gridOpt?.size === opt.size && <div style={{ marginLeft: 'auto', fontSize: 20, color: 'var(--green)' }}>✓</div>}
            </div>
          </div>
        ))}
      </div>
    </div>,

    <div key="price">
      <h2 className="section-title">Set your price</h2>
      <p className="section-sub" style={{ marginBottom: 24 }}>How much per square?</p>

      {(() => {
        const gridSize    = gridOpt?.size || 100;
        const priceVal    = parseFloat(price) || 0;
        const totalSales  = gridSize * priceVal;
        const costPrizes  = prizes.reduce((sum, p) => p.donated ? sum : sum + parsePrizeValue(p.value), 0);
        const platformFee = PLATFORM_FEES[gridSize] ?? 0;
        const netRaised   = Math.max(0, totalSales - costPrizes - platformFee);
        const fmt         = (n) => n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return (
          <div className="scratch-card" style={{ padding: '20px 24px', marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: .8, color: 'var(--text2)', marginBottom: 14 }}>Potential funds raised at full sale</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span style={{ color: 'var(--text2)' }}>Total potential sales <span style={{ fontSize: 12 }}>({gridSize} sq × ${priceVal || 0})</span></span>
                <span style={{ fontWeight: 700 }}>${fmt(totalSales)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                {costPrizes > 0 ? (
                  <>
                    <span style={{ color: 'var(--text2)' }}>Prize pool cost</span>
                    <span style={{ fontWeight: 700, color: 'var(--orange)' }}>−${fmt(costPrizes)}</span>
                  </>
                ) : (
                  <>
                    <span style={{ color: 'var(--text2)' }}>Prize pool cost <span style={{ fontSize: 12, fontStyle: 'italic' }}>(set in the next step)</span></span>
                    <span style={{ fontWeight: 700, color: 'var(--muted)' }}>−$0.00</span>
                  </>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span style={{ color: 'var(--text2)' }}>Platform fee</span>
                <span style={{ fontWeight: 700, color: 'var(--orange)' }}>−${fmt(platformFee)}</span>
              </div>
              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, fontSize: 15 }}>Total potential funds raised</span>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 900, color: 'var(--green)' }}>${fmt(netRaised)}</span>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="scratch-card" style={{ padding: 32 }}>
        <div className="form-group">
          <label className="form-label">Price per square (AUD)</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 18, fontWeight: 800, color: 'var(--text2)' }}>$</span>
            <input
              className="form-input"
              type="number"
              min="1"
              step="1"
              value={price}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                setPrice(val === '' ? '' : String(parseInt(val, 10)));
              }}
              onBlur={(e) => {
                const val = parseInt(e.target.value, 10);
                setPrice(String(isNaN(val) || val < 1 ? 1 : val));
              }}
              style={{ paddingLeft: 36, fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-serif)' }}
            />
          </div>
          {parseFloat(price) > 15 && (
            <div style={{ marginTop: 12, background: '#FFF8E1', border: '1.5px solid #FDE68A', borderRadius: 12, padding: '14px 18px', fontSize: 13, color: '#92400E', lineHeight: 1.6 }}>
              <strong>Just a heads up:</strong> in our experience, the sweet spot for successful Lucky Squares campaigns is around $2 to $5 per square. At higher prices, some supporters may hesitate. Remember, if someone wants to spend $20 they can always buy multiple squares — 10 at $2 or 4 at $5. You know your community best, but it's worth keeping the barrier to entry low.
            </div>
          )}
          <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 8 }}>Whole dollar amounts only. No cents.</p>
        </div>
        <div className="form-group" style={{ marginTop: 20 }}>
          <label className="form-label">State / Territory</label>
          <select className="form-input" value={campaign.state || 'SA'} onChange={(e) => setCampaign({ ...campaign, state: e.target.value })}>
            {AU_STATES.map((s) => <option key={s} value={s}>{s} — {STATE_LABELS[s]}</option>)}
          </select>
          <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 6 }}>
            Determines the maximum prize pool for your fundraiser under state lottery laws.
          </p>
        </div>
      </div>
    </div>,

    <div key="prizes">
      <h2 className="section-title">Set your prizes</h2>
      <p className="section-sub" style={{ marginBottom: 24 }}>What will lucky winners receive?</p>

      {(() => {
        const gridSize    = gridOpt?.size || 100;
        const priceVal    = parseFloat(price) || 0;
        const totalSales  = gridSize * priceVal;
        const totalPrizes = prizes.reduce((sum, p) => sum + parsePrizeValue(p.value), 0);
        const costPrizes  = prizes.reduce((sum, p) => p.donated ? sum : sum + parsePrizeValue(p.value), 0);
        const donatedVal  = totalPrizes - costPrizes;
        const platformFee = PLATFORM_FEES[gridSize] ?? 0;
        const netRaised   = Math.max(0, totalSales - costPrizes - platformFee);
        const fmt         = (n) => n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const stateCap    = STATE_PRIZE_CAPS[campaign.state || 'SA'] ?? 5000;
        const capPct      = totalPrizes / stateCap;
        return (<>
          {capPct >= 0.8 && (
            <div style={{ borderRadius: 12, padding: '14px 18px', marginBottom: 16, fontSize: 13, lineHeight: 1.5,
              background: capPct > 1 ? '#FEE2E2' : '#FFF8E1',
              border: `1.5px solid ${capPct > 1 ? '#FCA5A5' : '#FDE68A'}`,
              color: capPct > 1 ? '#991B1B' : '#92400E' }}>
              {capPct > 1
                ? <><strong>Prize pool exceeds the {campaign.state || 'SA'} limit of ${stateCap.toLocaleString()}.</strong> Under {STATE_LABELS[campaign.state || 'SA']} lottery laws, a total prize pool above this value requires a licence. Please reduce your prizes to continue.</>
                : <><strong>Approaching the {campaign.state || 'SA'} limit of ${stateCap.toLocaleString()}.</strong> Your total prize pool is ${fmt(totalPrizes)}. Fundraisers with prizes over ${stateCap.toLocaleString()} require a lottery licence in {STATE_LABELS[campaign.state || 'SA']}.</>
              }
            </div>
          )}
          <div className="scratch-card" style={{ padding: '20px 24px', marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: .8, color: 'var(--text2)', marginBottom: 14 }}>Potential funds raised at full sale</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span style={{ color: 'var(--text2)' }}>Total potential sales <span style={{ fontSize: 12 }}>({gridSize} sq × ${priceVal || 0})</span></span>
                <span style={{ fontWeight: 700 }}>${fmt(totalSales)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span style={{ color: 'var(--text2)' }}>
                  Prize pool cost
                  {donatedVal > 0 && <span style={{ fontSize: 11, fontStyle: 'italic', marginLeft: 6 }}>(${fmt(donatedVal)} donated)</span>}
                </span>
                <span style={{ fontWeight: 700, color: costPrizes > 0 ? 'var(--orange)' : 'var(--muted)' }}>{costPrizes > 0 ? `−$${fmt(costPrizes)}` : 'none'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span style={{ color: 'var(--text2)' }}>Platform fee</span>
                <span style={{ fontWeight: 700, color: 'var(--orange)' }}>−${fmt(platformFee)}</span>
              </div>
              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, fontSize: 15 }}>Total potential funds raised</span>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 900, color: 'var(--green)' }}>${fmt(netRaised)}</span>
              </div>
            </div>
          </div>
        </>);
      })()}

      <div style={{ background: 'var(--cream)', border: '1.5px solid var(--border)', borderRadius: 12, padding: '12px 16px', marginBottom: 4, fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>
        💡 At least one prize is required. Add as many as you like.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {prizes.map((p, i) => (
          <div key={i} className="scratch-card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--text2)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: .5 }}>{p.place} Prize</div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Description</label>
                <input className="form-input" placeholder={i === 0 ? 'e.g. $150 cash' : i === 1 ? 'e.g. Restaurant voucher' : i === 2 ? 'e.g. $25 club drinks tab' : 'Enter prize description'} maxLength={80} value={p.desc} onChange={(e) => { const n = [...prizes]; n[i] = { ...n[i], desc: e.target.value }; setPrizes(n); }} onBlur={(e) => flagField(`prize${i}`, e.target.value)} />
                {profanityFlags[`prize${i}`] && <div style={{ marginTop: 5, fontSize: 12, color: '#E53E3E' }}>Please keep campaign content appropriate for all audiences.</div>}
              </div>
              <div className="form-group" style={{ width: 120 }}>
                <label className="form-label">Value</label>
                <input
                  className="form-input"
                  placeholder={i === 0 ? '$150' : i === 1 ? '$50' : i === 2 ? '$25' : '$0'}
                  maxLength={20}
                  value={p.value}
                  onChange={(e) => { const n = [...prizes]; n[i] = { ...n[i], value: e.target.value }; setPrizes(n); }}
                  style={p.desc.trim() && !p.donated && !p.value.trim() ? { borderColor: 'var(--orange)' } : undefined}
                />
                {p.desc.trim() && !p.donated && !p.value.trim() && (
                  <div style={{ fontSize: 11, color: 'var(--orange)', fontWeight: 700, marginTop: 4 }}>Required</div>
                )}
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, cursor: 'pointer', width: 'fit-content' }}>
              <input
                type="checkbox"
                checked={p.donated}
                onChange={(e) => { const n = [...prizes]; n[i] = { ...n[i], donated: e.target.checked }; setPrizes(n); }}
                style={{ width: 16, height: 16, accentColor: 'var(--green)', cursor: 'pointer', flexShrink: 0 }}
              />
              <span style={{ fontSize: 13, color: 'var(--text2)', userSelect: 'none' }}>This prize has been donated</span>
            </label>
          </div>
        ))}
        <button className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setPrizes([...prizes, { place: `${prizes.length + 1}th`, desc: '', value: '', donated: false }])}>
          ＋ Add another prize
        </button>
      </div>
    </div>,

    <div key="campaign">
      <h2 className="section-title">Your campaign</h2>
      <p className="section-sub" style={{ marginBottom: 24 }}>Tell buyers what they&apos;re supporting</p>
      <div className="scratch-card" style={{ padding: 28 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="form-group">
            <label className="form-label">Campaign title</label>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>Tell people what they are supporting</div>
            <input className="form-input" placeholder="e.g. Help our under 18s get to regionals" maxLength={80} value={campaign.title} onChange={(e) => setCampaign({ ...campaign, title: e.target.value })} onBlur={(e) => flagField('title', e.target.value)} />
            {profanityFlags.title && <div style={{ marginTop: 5, fontSize: 12, color: '#E53E3E' }}>Please keep campaign content appropriate for all audiences.</div>}
          </div>
          <div className="form-group">
            <label className="form-label">Your name <span style={{ color: '#CC0000' }}>*</span></label>
            <input className="form-input" placeholder="e.g. Jane Smith" maxLength={80} value={campaign.contactName} onChange={(e) => setCampaign({ ...campaign, contactName: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Your email <span style={{ color: '#CC0000' }}>*</span></label>
            <input className="form-input" type="email" placeholder="e.g. jane@example.com" maxLength={254} value={campaign.contactEmail} onChange={(e) => setCampaign({ ...campaign, contactEmail: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Your phone <span style={{ color: '#CC0000' }}>*</span></label>
            <input className="form-input" type="tel" placeholder="e.g. 04XX XXX XXX" maxLength={15} value={campaign.contactPhone} onChange={(e) => setCampaign({ ...campaign, contactPhone: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Organisation name <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 400 }}>(optional)</span></label>
            <input className="form-input" placeholder="Your school, club or charity" maxLength={100} value={campaign.org} onChange={(e) => setCampaign({ ...campaign, org: e.target.value })} onBlur={(e) => flagField('org', e.target.value)} />
            {profanityFlags.org && <div style={{ marginTop: 5, fontSize: 12, color: '#E53E3E' }}>Please keep campaign content appropriate for all audiences.</div>}
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input" rows={3} placeholder="Tell your story: why you're fundraising and what the money supports" maxLength={500} value={campaign.description} onChange={(e) => setCampaign({ ...campaign, description: e.target.value })} onBlur={(e) => flagField('description', e.target.value)} style={{ resize: 'vertical' }} />
            {profanityFlags.description && <div style={{ marginTop: 5, fontSize: 12, color: '#E53E3E' }}>Please keep campaign content appropriate for all audiences.</div>}
          </div>
          <div className="form-group">
            <label className="form-label">Campaign photo <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 400 }}>(optional)</span></label>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>Show supporters what they are fundraising for</div>
            {campaignImageUrl ? (
              <div>
                <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1.5px solid var(--border)' }}>
                  <img src={campaignImageUrl} alt="Campaign" style={{ width: '100%', height: 200, objectFit: 'cover', objectPosition: `center ${imageFocalY}%`, display: 'block' }} />
                  {imageUploading && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700 }}>
                      Uploading...
                    </div>
                  )}
                  {!imageUploading && (
                    <button onClick={() => { setCampaignImageUrl(''); setImageFocalY(50); }} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,.55)', color: '#fff', border: 'none', borderRadius: 8, padding: '4px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                      Remove
                    </button>
                  )}
                </div>
                <div style={{ marginTop: 10 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>Image position</span>
                    <span>{imageFocalY === 0 ? 'Top' : imageFocalY === 100 ? 'Bottom' : imageFocalY < 40 ? 'Upper' : imageFocalY > 60 ? 'Lower' : 'Centre'}</span>
                  </label>
                  <input type="range" min={0} max={100} value={imageFocalY} onChange={(e) => setImageFocalY(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--purple)' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                    <span>Top</span><span>Bottom</span>
                  </div>
                </div>
              </div>
            ) : (
              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '28px 20px', border: '2px dashed var(--border2)', borderRadius: 12, cursor: 'pointer', background: 'var(--cream)', transition: 'border-color .15s' }}>
                <span style={{ fontSize: 32 }}>📷</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text2)' }}>Tap to upload a photo</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>JPG, PNG or WEBP · max 5 MB · landscape works best · we'll compress and optimise it automatically</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={(e) => e.target.files[0] && handleImageSelect(e.target.files[0])} />
              </label>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Thank-you message</label>
            <input className="form-input" placeholder="e.g. Thank you so much for your support!" maxLength={160} value={campaign.thankYou} onChange={(e) => setCampaign({ ...campaign, thankYou: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Campaign emoji</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {EMOJIS.map((em) => (
                <button key={em} onClick={() => setCampaign({ ...campaign, emoji: em })} style={{ width: 44, height: 44, borderRadius: 10, border: `2px solid ${campaign.emoji === em ? 'var(--green)' : 'var(--border)'}`, background: campaign.emoji === em ? '#D4F5E9' : 'transparent', fontSize: 22, cursor: 'pointer', transition: 'all .15s' }}>
                  {em}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>,

    <div key="draw">
      <h2 className="section-title">Draw rules</h2>
      <p className="section-sub" style={{ marginBottom: 24 }}>When and how will winners be chosen?</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[
          { type: 'manual', icon: '🎲', title: 'Manual draw',         desc: "You run the draw whenever you're ready. Pull a number live!" },
          { type: 'auto',   icon: '📅', title: 'Scheduled draw',      desc: 'Automatically draws on a set date and time.' },
          { type: 'full',   icon: '✅', title: 'Draw when grid fills', desc: 'Winner picked the instant the last square is sold.' },
        ].map((opt) => (
          <div key={opt.type} className="scratch-card" style={{ padding: '20px 24px', cursor: 'pointer', borderColor: drawRules.type === opt.type ? 'var(--green)' : undefined, borderWidth: drawRules.type === opt.type ? 2 : 1.5 }} onClick={() => setDrawRules({ ...drawRules, type: opt.type })}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 28 }}>{opt.icon}</span>
              <div>
                <div style={{ fontWeight: 800 }}>{opt.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>{opt.desc}</div>
              </div>
              {drawRules.type === opt.type && <div style={{ marginLeft: 'auto', fontSize: 20, color: 'var(--green)' }}>✓</div>}
            </div>
          </div>
        ))}
        {drawRules.type === 'auto' && (
          <div className="form-group" style={{ marginTop: 8 }}>
            <label className="form-label">Draw date &amp; time</label>
            <input className="form-input" type="datetime-local" value={drawRules.date} onChange={(e) => setDrawRules({ ...drawRules, date: e.target.value })} />
          </div>
        )}
      </div>
    </div>,

    <div key="payment">
      <h2 className="section-title">Payment setup</h2>
      <p className="section-sub" style={{ marginBottom: 24 }}>How will you receive funds?</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
        {[
          { method: 'inperson',      icon: '🤝', title: 'In person',                     desc: 'Collect payment face-to-face via cash, card tap, or EFTPOS terminal. No online payment required.' },
          { method: 'bank',          icon: '🏦', title: 'Bank transfer',                 desc: 'Buyers pay via BSB/account number, free with no platform transaction fees.' },
          { method: 'bank_inperson', icon: '🤝', title: 'In person + bank transfer',     desc: 'Accept payment in person or by bank transfer. Your buyers choose whichever suits them.' },
          { method: 'stripe',        icon: '💳', title: 'Online card payment',            desc: 'Buyers pay securely by card. A 1.7% + 30c processing fee is added to the buyer total. Funds transferred to your bank after the draw.' },
        ].map((opt) => (
          <div key={opt.method} className="scratch-card" style={{ padding: '20px 24px', cursor: 'pointer', borderColor: payment.method === opt.method ? 'var(--purple)' : undefined, borderWidth: payment.method === opt.method ? 2 : 1.5 }} onClick={() => setPayment({ ...payment, method: opt.method })}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 28 }}>{opt.icon}</span>
              <div>
                <div style={{ fontWeight: 800 }}>{opt.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>{opt.desc}</div>
              </div>
              {payment.method === opt.method && <div style={{ marginLeft: 'auto', fontSize: 20, color: 'var(--purple)' }}>✓</div>}
            </div>
          </div>
        ))}
      </div>
      {payment.method === 'inperson' && (
        <div className="scratch-card" style={{ padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🤝</div>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>In person payments</div>
          <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>Buyers register their squares online or in person and you collect payment directly, via cash or an EFTPOS terminal. No bank details needed.</div>
        </div>
      )}
      {payment.method === 'stripe' && (
        <div className="scratch-card" style={{ padding: 24, background: '#F5F3FF', border: '1.5px solid #C4B5FD' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>💳</div>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Online card payments</div>
          <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
            After completing your campaign details, you&apos;ll connect your bank account once as part of the launch process. This takes about 2 minutes. Funds are transferred directly to your bank account after the draw completes — Lucky Squares never holds your money.
          </div>
        </div>
      )}
      {['bank', 'bank_inperson'].includes(payment.method) && (
        <div className="scratch-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Account name</label>
              <input className="form-input" placeholder="e.g. Sunbury Primary P&C" maxLength={100} value={payment.accountName} onChange={(e) => setPayment({ ...payment, accountName: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="form-group" style={{ width: 140 }}>
                <label className="form-label">BSB</label>
                <input className="form-input" placeholder="000-000" maxLength={7} value={payment.bsb} onChange={(e) => setPayment({ ...payment, bsb: e.target.value })} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Account number</label>
                <input className="form-input" placeholder="12345678" maxLength={10} value={payment.account} onChange={(e) => setPayment({ ...payment, account: e.target.value })} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>,

    <div key="review">
      <h2 className="section-title">Ready to launch? 🚀</h2>
      <p className="section-sub" style={{ marginBottom: 24 }}>Review your fundraising campaign details</p>
      <div className="scratch-card" style={{ padding: 28 }}>
        <div style={{ display: 'flex', gap: 16, marginBottom: 24, alignItems: 'center' }}>
          <span style={{ fontSize: 48 }}>{campaign.emoji || '🍀'}</span>
          <div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 700 }}>{campaign.title || 'Untitled Fundraiser'}</div>
            <div style={{ fontSize: 14, color: 'var(--text2)' }}>by {campaign.org || 'Your Organisation'}</div>
          </div>
        </div>
        {(() => {
          const gridSize      = gridOpt?.size || 100;
          const priceVal      = parseFloat(price) || 0;
          const totalSales    = gridSize * priceVal;
          const costPrizes    = prizes.reduce((sum, p) => p.donated ? sum : sum + parsePrizeValue(p.value), 0);
          const platformFee   = PLATFORM_FEES[gridSize] ?? 0;
          const netRaised     = Math.max(0, totalSales - costPrizes - platformFee);
          const activePrizes  = prizes.filter((p) => p.desc);
          const rows = [
            ['Grid',             `${gridSize} squares`],
            ['Price',            `$${price} per square`],
            ['Potential profit', `$${netRaised.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
            ['Draw',             drawRules.type === 'manual' ? 'Manual' : drawRules.type === 'full' ? 'When grid fills' : `Scheduled: ${drawRules.date || 'no date set'}`],
            ['Payment',          payment.method === 'stripe'        ? 'Online card payment (Stripe)'
                               : payment.method === 'bank'          ? `Bank transfer${payment.bsb ? ` (BSB: ${payment.bsb})` : ''}`
                               : payment.method === 'bank_inperson' ? `In person + bank transfer${payment.bsb ? ` (BSB: ${payment.bsb})` : ''}`
                               : 'In person'],
          ];
          return (
            <>
              {rows.map(([k, v]) => (
                <div key={k} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 700, width: 140, flexShrink: 0 }}>{k}</span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{v}</span>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 700, width: 140, flexShrink: 0 }}>Prizes</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {activePrizes.length > 0
                    ? activePrizes.map((p) => (
                        <span key={p.place} style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          {p.place}: {p.desc}{p.value ? ` (${p.value})` : ''}
                          {p.donated && <span style={{ fontSize: 11, fontWeight: 700, background: '#D4F5E9', color: 'var(--green)', borderRadius: 6, padding: '2px 7px' }}>Donated</span>}
                        </span>
                      ))
                    : <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>(none set)</span>
                  }
                </div>
              </div>
            </>
          );
        })()}
      </div>
    </div>,

    // ── Step 8: Connect Bank (stripe only) ────────────────────────────────────
    <div key="bank">
      <div style={{ marginBottom: 28 }}>
        <h2 className="section-title" style={{ marginBottom: 8 }}>Connect your bank account</h2>
        <p className="section-sub">
          Because your buyers pay by card, Lucky Squares needs to know where to send the money. Funds are transferred directly to your bank account once the draw is complete.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        {[
          { icon: '🔒', text: 'Your details are secured by Stripe, the same payment infrastructure used by millions of businesses worldwide.' },
          { icon: '🏦', text: 'Funds land directly in your nominated account within 2 business days of your draw completing.' },
          { icon: '✅', text: 'You only need to do this once. Future campaigns reuse the same account automatically.' },
        ].map((item) => (
          <div key={item.icon} style={{ flex: 1, fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, textAlign: 'center' }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{item.icon}</div>
            {item.text}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#EEF2FF', border: '1.5px solid #C7D2FE', borderRadius: 12, padding: '14px 16px', marginBottom: 16, fontSize: 13, color: '#3730A3', lineHeight: 1.6 }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>💡</span>
        <span><strong>Heads up:</strong> Stripe will ask for a customer support phone number. Just enter your contact number — it appears on payment receipts so buyers can reach you if needed.</span>
      </div>

      <div className="scratch-card" style={{ padding: 28 }}>
        {bankSaving && (
          <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text2)', fontSize: 14 }}>Saving your campaign…</div>
        )}
        {bankSaveError && (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: '#CC0000', marginBottom: 12 }}>Something went wrong saving your campaign. Please try again.</div>
            <button className="btn btn-outline btn-sm" onClick={() => {
              setBankSaveError(false);
              setBankSaving(true);
              onSaveDraft({ fundraiserType, orgDetails, gridOpt, price, prizes, campaign, campaignImageUrl, imageFocalY, drawRules, payment })
                .then((id) => {
                  setBankSaving(false);
                  if (id) setBankDraftId(id);
                  else setBankSaveError(true);
                });
            }}>Try again</button>
          </div>
        )}
        {bankDraftId && (
          <StripeConnectSetup
            key={bankDraftId}
            fundraiserId={bankDraftId}
            onComplete={() => setBankConnectDone(true)}
            prefill={fundraiserType === 'org' && orgDetails.name.trim()
              ? { businessType: 'company', orgName: orgDetails.name, orgAbn: orgDetails.abn, orgType: orgDetails.orgType, email: userPrefill?.email, phone: userPrefill?.phone }
              : { name: userPrefill?.name, email: userPrefill?.email, phone: userPrefill?.phone }}
          />
        )}
        {!bankConnectDone && !bankSaving && !bankSaveError && bankDraftId && (
          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text2)', marginTop: 16 }}>
            Complete the bank account setup above to continue to your campaign launch.
          </p>
        )}
      </div>
    </div>,

    // ── Step 9: Launch ────────────────────────────────────────────────────────
    <div key="launch">
      {(() => {
        const baseFee  = PLATFORM_FEES[gridOpt?.size || 100];
        const finalFee = couponState === 'valid' && couponData
          ? couponData.type === 'percent' ? Math.max(0, baseFee * (1 - couponData.value / 100)) : Math.max(0, baseFee - couponData.value)
          : baseFee;
        const isFree   = finalFee === 0;
        const fmt      = (n) => Number.isInteger(n) ? String(n) : n.toFixed(2);
        return (
          <>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>{isFree ? '🎉' : '🚀'}</div>
              <h2 className="section-title" style={{ marginBottom: 8 }}>
                {isFree && isFoundingMember ? 'Your first campaign is on us' : 'Launch your fundraiser'}
              </h2>
              <p className="section-sub">
                {isFree && isFoundingMember
                  ? 'As a founding member, your first campaign launches for free. Apply your coupon code below and go live instantly.'
                  : isFree
                    ? 'Your coupon covers the full launch fee. Apply it below and go live instantly.'
                    : 'A one-off platform fee applies to go live. Once paid, your fundraiser is active and buyers can start purchasing squares immediately.'}
              </p>
            </div>

            <div className="scratch-card" style={{ padding: 28 }}>
              {/* Fee breakdown */}
              <div style={{ background: 'var(--cream)', borderRadius: 12, padding: '14px 20px', marginBottom: 16, fontSize: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: couponState === 'valid' ? 8 : 0 }}>
                  <span style={{ color: 'var(--text2)' }}>{gridOpt?.size || 100}-square fundraiser</span>
                  <span style={{ fontWeight: 800, textDecoration: couponState === 'valid' ? 'line-through' : 'none', opacity: couponState === 'valid' ? 0.5 : 1 }}>${fmt(baseFee)}</span>
                </div>
                {couponState === 'valid' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ color: 'var(--green)', fontWeight: 700 }}>Coupon {couponCode.toUpperCase()}</span>
                      <span style={{ color: 'var(--green)', fontWeight: 700 }}>
                        {couponData.type === 'percent' ? `-${couponData.value}%` : `-$${fmt(couponData.value)}`}
                      </span>
                    </div>
                    <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 800 }}>Total</span>
                      <span style={{ fontWeight: 900, color: isFree ? 'var(--green)' : 'var(--text)', fontSize: 16 }}>
                        {isFree ? 'Free' : `$${fmt(finalFee)}`}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Coupon input */}
              <div style={{ marginBottom: 20 }}>
                {couponState !== 'valid' ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      className="form-input"
                      placeholder="Coupon code"
                      value={couponCode}
                      onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponState('idle'); setCouponData(null); }}
                      onKeyDown={(e) => e.key === 'Enter' && checkCoupon()}
                      style={{ flex: 1, textTransform: 'uppercase', letterSpacing: 1 }}
                      maxLength={32}
                    />
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={checkCoupon}
                      disabled={!couponCode.trim() || couponState === 'checking'}
                      style={{ flexShrink: 0 }}
                    >
                      {couponState === 'checking' ? '...' : 'Apply'}
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#D4F5E9', borderRadius: 10, padding: '10px 14px' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>Coupon applied</span>
                    <button onClick={() => { setCouponCode(''); setCouponState('idle'); setCouponData(null); }} style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'inherit' }}>Remove</button>
                  </div>
                )}
                {couponState === 'invalid' && (
                  <p style={{ fontSize: 12, color: '#CC0000', marginTop: 6 }}>Invalid or expired coupon code.</p>
                )}
              </div>

              {launchError && (
                <div style={{ background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#991B1B' }}>
                  {launchError === 'COUPON_INVALID'
                    ? 'This coupon code is no longer valid or has expired. Please remove it and try again.'
                    : 'Something went wrong. Please try again or contact support if the problem continues.'}
                </div>
              )}

              <p style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 20, lineHeight: 1.6 }}>
                By launching this campaign you confirm that it complies with all applicable fundraising and lottery laws in {STATE_LABELS[campaign.state || 'SA'] || 'your state'}, including that total prizes do not exceed the permitted threshold. <a href="/terms" target="_blank" rel="noopener" style={{ color: 'var(--purple)' }}>Platform terms</a>
              </p>

              <button className="btn btn-gold btn-lg" style={{ width: '100%' }} onClick={async () => {
                const launchData = {
                  fundraiserType, orgDetails, gridOpt, price, prizes, campaign, campaignImageUrl, imageFocalY, drawRules, payment,
                  finalFee,
                  couponCode: couponState === 'valid' ? couponCode.trim().toUpperCase() : null,
                  existingFundraiserId: bankDraftId || null,
                };
                if (isFree) {
                  if (couponState === 'valid' && couponCode.trim() && supabaseConfigured) {
                    await getSupabaseClient().rpc('redeem_coupon', { p_code: couponCode.trim().toUpperCase() });
                  }
                  clearDraft();
                  onComplete({ fundraiserType, orgDetails, gridOpt, price, prizes, campaign, campaignImageUrl, imageFocalY, drawRules, payment, coupon: launchData.couponCode }, false);
                } else {
                  setLaunchError(null);
                  const result = await onLaunchPay(launchData);
                  if (result?.error) {
                    setLaunchError(result.error);
                    if (result.error === 'COUPON_INVALID') setCouponState('invalid');
                  }
                }
              }}>
                {isFree ? '🚀 Launch free' : 'Pay and launch'}
              </button>
            </div>
          </>
        );
      })()}
    </div>,
  ];

  return (
    <div className="dot-bg" style={{ minHeight: '100vh' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <button className="btn btn-outline btn-sm" onClick={() => step > 0 ? setStep((s) => s - 1) : (clearDraft(), onCancel())}>{step === 0 ? '← Dashboard' : '← Back'}</button>
          <div style={{ flex: 1 }}>
            {(() => {
              const visibleSteps = WIZARD_STEPS.filter((_, i) => i !== BANK_STEP || isStripePayment);
              const visibleIdx   = isStripePayment ? step : (step < BANK_STEP ? step : step - 1);
              return (
                <>
                  <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5 }}>Step {visibleIdx + 1} of {visibleSteps.length}</div>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>{WIZARD_STEPS[step]}</div>
                </>
              );
            })()}
          </div>
          {step > 0 && (
            <button className="btn btn-outline btn-sm" style={{ fontSize: 12 }} onClick={() => onCancel()}>
              Save &amp; exit
            </button>
          )}
        </div>
        {/* Step dots — hide Connect Bank step for non-stripe users */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 32, flexWrap: 'wrap' }}>
          {WIZARD_STEPS.map((s, i) => {
            if (i === BANK_STEP && !isStripePayment) return null;
            // Remap display number: for non-stripe users, skip the bank step number
            const displayNum = !isStripePayment && i > BANK_STEP ? i : i + 1;
            return (
              <div key={i} className={`step-dot ${i < step ? 'done' : i === step ? 'active' : 'future'}`} onClick={() => i < step && setStep(i)} style={{ cursor: i < step ? 'pointer' : 'default' }} title={s}>
                {i < step ? '✓' : displayNum}
              </div>
            );
          })}
        </div>
        {paymentConfirming ? (
          <div>
            <h2 className="section-title">Double-check your bank details</h2>
            <p className="section-sub" style={{ marginBottom: 24 }}>Please confirm these are correct. Buyers will use them to pay you.</p>
            <div className="scratch-card" style={{ padding: 28 }}>
              {[
                ['Account name', payment.accountName],
                ['BSB',          payment.bsb],
                ['Account #',    payment.account],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 700 }}>{label}</span>
                  <span style={{ fontSize: 16, fontWeight: 800 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        ) : stepContent[step]}

        {/* Footer navigation — step 9 (Launch) has no Next button; its action is inline */}
        {step !== LAUNCH_STEP && (
          <div style={{ display: 'flex', gap: 12, marginTop: 32, justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <button className="btn btn-outline" onClick={() => {
              if (paymentConfirming) { setPaymentConfirming(false); return; }
              if (step === 0) { clearDraft(); onCancel(); return; }
              // Back from Launch: skip over bank step for non-stripe users
              if (step === LAUNCH_STEP && !isStripePayment) { setStep(BANK_STEP - 1); return; }
              setStep((s) => s - 1);
            }}>
              {paymentConfirming ? '← Edit details' : step === 0 ? 'Cancel' : '← Back'}
            </button>
            {paymentConfirming ? (
              <button className="btn btn-primary btn-lg" onClick={() => { setPaymentConfirming(false); setStep((s) => s + 1); }}>
                Confirmed, details are correct
              </button>
            ) : step === BANK_STEP - 1 ? (
              // Review step (7): Next navigates to bank step (stripe) or launch step (others)
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <button className="btn btn-outline" onClick={() => { clearDraft(); onComplete({ fundraiserType, orgDetails, gridOpt, price, prizes, campaign, campaignImageUrl, imageFocalY, drawRules, payment }, true); }}>
                  Save as draft
                </button>
                <button className="btn btn-primary btn-lg" disabled={!canNext()} onClick={() => {
                  if (isStripePayment && !stripeOnboardingComplete) {
                    setStep(BANK_STEP);
                  } else {
                    // Already onboarded or non-stripe: skip straight to Launch
                    setStep(LAUNCH_STEP);
                  }
                }}>
                  Next →
                </button>
              </div>
            ) : (
              <button className="btn btn-primary" disabled={!canNext()} onClick={async () => {
                if (step === PAYMENT_STEP && ['bank', 'bank_inperson'].includes(payment.method)) { setPaymentConfirming(true); return; }
                // Leaving the bank connect step: refresh user profile so stripeOnboardingComplete is up to date
                if (step === BANK_STEP) {
                  await onBankConnectDone?.();
                }
                setStep((s) => s + 1);
              }}>Next →</button>
            )}
          </div>
        )}
        {step === LAUNCH_STEP && (
          <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-start' }}>
            <button className="btn btn-outline" onClick={() => {
              // Back from Launch: go to bank step (stripe) or review step (others)
              setStep(isStripePayment ? BANK_STEP : BANK_STEP - 1);
            }}>← Back</button>
          </div>
        )}
      </div>
    </div>
  );
}
// ─── FiftyFiftyWizard ─────────────────────────────────────────────────────────

const FF_EMOJIS = ['🎟️', '🍀', '🏆', '🎉', '⭐', '💛', '🌈', '🎯', '🏉', '🐨'];
const FF_TICKET_PRESETS = [1, 2, 5, 10, 20];

// Maximum prize pool before a lottery/raffle licence is required.
// In a 50/50 raffle the prize pool = 50% of total ticket sales, so the
// equivalent ticket sales limit = threshold × 2.
// Figures are indicative only — organisers should verify with the relevant
// authority before running their raffle.
const STATE_THRESHOLDS = {
  NSW: { label: 'New South Wales',             threshold: 30000,  note: 'No permit needed for a prize pool under $30,000. Above that, an Art Union permit is required from Liquor & Gaming NSW.' },
  VIC: { label: 'Victoria',                    threshold: 5000,   note: 'No permit needed for a prize pool under $5,000. Above that, a Community/Charitable Lottery permit is required from the VCGLR.' },
  QLD: { label: 'Queensland',                  threshold: 100000, note: 'Incorporated associations may run raffles with a prize pool up to $100,000 without a permit. Above that, a licence is required from the OLGR.' },
  SA:  { label: 'South Australia',             threshold: 5000,   note: 'No licence needed for a prize pool under $5,000. Above this, a permit is required from Consumer and Business Services SA.' },
  WA:  { label: 'Western Australia',           threshold: 10000,  note: 'No licence required for a prize pool under $10,000 by an approved association. Above that, contact the Department of Local Government.' },
  TAS: { label: 'Tasmania',                    threshold: 5000,   note: 'No permit needed for a prize pool under $5,000. Above this threshold, contact the Tasmanian Liquor and Gaming Commission.' },
  ACT: { label: 'Australian Capital Territory',threshold: 25000,  note: 'No permit needed for a prize pool under $25,000. Above this, a licence is required from the ACT Gambling and Racing Commission.' },
  NT:  { label: 'Northern Territory',          threshold: 5000,   note: 'No permit needed for a prize pool under $5,000. Contact the NT Racing Commission for amounts above this threshold.' },
};

function FiftyFiftyWizard({ onComplete, onCancel, user, stripeOnboardingComplete }) {
  const [step,           setStep]           = useState(0);
  const [emoji,          setEmoji]          = useState('🎟️');
  const [title,          setTitle]          = useState('');
  const [description,    setDescription]    = useState('');
  const [state,          setState]          = useState('');
  const [lotteryLicence, setLotteryLicence] = useState('');
  const [ticketPrice,    setTicketPrice]    = useState('');
  const [customPrice,    setCustomPrice]    = useState('');
  const [maxTickets,     setMaxTickets]     = useState(''); // '' = unlimited
  const [paymentMethod,  setPaymentMethod]  = useState('stripe');
  const [bankDetails,    setBankDetails]    = useState({ accountName: '', bsb: '', account: '' });
  const [stripeReady,    setStripeReady]    = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [saveError,      setSaveError]      = useState('');

  const selectedPrice = ticketPrice === 'custom' ? parseFloat(customPrice) || 0 : parseFloat(ticketPrice) || 0;

  // (No pre-save needed: StripeConnectSetup works with null fundraiserId for user-level onboarding.
  // The campaign is saved on launch.)

  const saveCampaign = async () => {
    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      const token = session?.access_token;
      const res = await fetch('/api/fifty-fifty/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title:          sanitize(title),
          emoji,
          description:    sanitize(description),
          state:          state || null,
          ticket_price:   selectedPrice,
          payment_method: paymentMethod,
          lottery_licence:   sanitize(lotteryLicence) || null,
          max_tickets:       maxTickets ? parseInt(maxTickets, 10) || null : null,
          stripe_account_id: paymentMethod === 'stripe' ? (user?.stripeAccountId || null) : null,
          bank_account_name: paymentMethod !== 'stripe' ? sanitize(bankDetails.accountName) || null : null,
          bank_bsb:          paymentMethod !== 'stripe' ? sanitize(bankDetails.bsb) || null : null,
          bank_account:      paymentMethod !== 'stripe' ? sanitize(bankDetails.account) || null : null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.campaign?.id) return null;
      return json.campaign.id;
    } catch (e) {
      console.error('FiftyFiftyWizard saveCampaign:', e);
      return null;
    }
  };

  const canNext = () => {
    if (step === 0) return title.trim().length > 0;
    if (step === 1) return selectedPrice > 0 && state.trim().length > 0;
    if (step === 2) {
      if (paymentMethod === 'stripe') return stripeReady || stripeOnboardingComplete;
      return bankDetails.accountName.trim() && bankDetails.bsb.trim() && bankDetails.account.trim();
    }
    return true;
  };

  const handleLaunch = async () => {
    setSaving(true);
    setSaveError('');
    // Save as draft first
    const campaignId = await saveCampaign();
    if (!campaignId) {
      setSaveError('Something went wrong saving your raffle. Please try again.');
      setSaving(false);
      return;
    }
    // Create Stripe checkout for the $19 launch fee
    try {
      const { data: { session: authSession } } = await getSupabaseClient().auth.getSession();
      const token = authSession?.access_token;
      const res = await fetch('/api/stripe/create-fifty-fifty-launch-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ campaign_id: campaignId }),
      });
      const json = await res.json();
      if (json.url) {
        window.location.href = json.url;
      } else {
        setSaveError(json.error || 'Payment setup failed. Please try again.');
        setSaving(false);
      }
    } catch {
      setSaveError('Something went wrong. Please try again.');
      setSaving(false);
    }
  };

  const steps = ['Details', 'Location and pricing', 'Payment', 'Launch'];

  return (
    <div className="dot-bg" style={{ minHeight: '100vh' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <button className="btn btn-outline btn-sm" onClick={() => step > 0 ? setStep((s) => s - 1) : onCancel()}>
            {step === 0 ? '← Dashboard' : '← Back'}
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Step {step + 1} of {steps.length}</div>
            <div style={{ fontSize: 14, fontWeight: 800 }}>{steps[step]}</div>
          </div>
        </div>

        {/* Step dots */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
          {steps.map((s, i) => (
            <div key={i} className={`step-dot ${i < step ? 'done' : i === step ? 'active' : 'future'}`}
              onClick={() => i < step && setStep(i)}
              style={{ cursor: i < step ? 'pointer' : 'default' }}
              title={s}>
              {i < step ? '✓' : i + 1}
            </div>
          ))}
        </div>

        {/* Step 0: Details */}
        {step === 0 && (
          <div>
            <h2 className="section-title">New 50/50 Raffle</h2>
            <p className="section-sub" style={{ marginBottom: 24 }}>Tell people what they are entering</p>
            <div className="scratch-card" style={{ padding: 28 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div className="form-group">
                  <label className="form-label">Raffle emoji</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {FF_EMOJIS.map((em) => (
                      <button key={em} onClick={() => setEmoji(em)}
                        style={{ width: 44, height: 44, borderRadius: 10, border: `2px solid ${emoji === em ? '#F59E0B' : 'var(--border)'}`, background: emoji === em ? '#FEF3C7' : 'transparent', fontSize: 22, cursor: 'pointer', transition: 'all .15s' }}>
                        {em}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Raffle title <span style={{ color: '#CC0000' }}>*</span></label>
                  <input className="form-input" placeholder="e.g. Footy Club 50/50 Raffle" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-input" rows={3} placeholder="What is this raffle supporting? Any important details for buyers." maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} style={{ resize: 'vertical' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: State, ticket price, licence */}
        {step === 1 && (
          <div>
            <h2 className="section-title">Location and ticket price</h2>
            <p className="section-sub" style={{ marginBottom: 24 }}>Your state determines licensing requirements. The ticket price sets how fast the jackpot grows.</p>

            {/* State selector */}
            <div className="scratch-card" style={{ padding: 28, marginBottom: 20 }}>
              <label className="form-label" style={{ marginBottom: 12, display: 'block' }}>Which state or territory is this raffle running in? <span style={{ color: '#CC0000' }}>*</span></label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {Object.entries(STATE_THRESHOLDS).map(([code, info]) => (
                  <button key={code}
                    onClick={() => setState(code)}
                    style={{ padding: '8px 14px', borderRadius: 10, border: `2px solid ${state === code ? '#F59E0B' : 'var(--border)'}`, background: state === code ? '#FEF3C7' : 'transparent', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s', color: state === code ? '#92400E' : 'var(--text)' }}>
                    {code}
                  </button>
                ))}
              </div>

              {/* Threshold callout */}
              {state && (() => {
                const info = STATE_THRESHOLDS[state];
                // Prize pool = tickets × price × 0.5, so max tickets = threshold × 2 / price
                const thresholdTickets = selectedPrice > 0 ? Math.floor((info.threshold * 2) / selectedPrice) : null;
                const needsLicence = selectedPrice > 0 && thresholdTickets !== null;
                return (
                  <div style={{ marginTop: 16, padding: '16px 20px', background: '#FFFBEB', border: '1.5px solid #FCD34D', borderRadius: 12 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: '#92400E', marginBottom: 6 }}>
                      {info.label} — maximum prize pool without a licence: ${info.threshold.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 13, color: '#78350F', lineHeight: 1.6, marginBottom: needsLicence ? 8 : 0 }}>
                      {info.note}
                    </div>
                    {needsLicence && (
                      <div style={{ fontSize: 13, color: '#92400E', fontWeight: 700, marginTop: 4 }}>
                        At ${selectedPrice.toFixed(2)}/ticket, the prize pool reaches ${info.threshold.toLocaleString()} after approximately {thresholdTickets.toLocaleString()} tickets sold (${(thresholdTickets * selectedPrice).toLocaleString()} in total sales).
                      </div>
                    )}
                    {!selectedPrice && (
                      <div style={{ fontSize: 12, color: '#92400E', marginTop: 4, fontStyle: 'italic' }}>
                        Set your ticket price below to see how many tickets you can sell before a licence is required.
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Ticket price */}
            <div className="scratch-card" style={{ padding: 28, marginBottom: 20 }}>
              <div style={{ padding: '12px 16px', background: '#FFFBEB', border: '1.5px solid #FCD34D', borderRadius: 10, marginBottom: 20, fontSize: 13, color: '#92400E', lineHeight: 1.6 }}>
                Jackpot grows as tickets sell. The winner receives 50% of total ticket sales. Your organisation keeps the other 50%.
              </div>
              <label className="form-label" style={{ marginBottom: 12, display: 'block' }}>Price per ticket <span style={{ color: '#CC0000' }}>*</span></label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
                {FF_TICKET_PRESETS.map((p) => (
                  <button key={p}
                    onClick={() => { setTicketPrice(String(p)); setCustomPrice(''); }}
                    style={{ padding: '10px 20px', borderRadius: 10, border: `2px solid ${ticketPrice === String(p) ? '#F59E0B' : 'var(--border)'}`, background: ticketPrice === String(p) ? '#FEF3C7' : 'transparent', fontWeight: 800, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}>
                    ${p}
                  </button>
                ))}
                <button
                  onClick={() => setTicketPrice('custom')}
                  style={{ padding: '10px 20px', borderRadius: 10, border: `2px solid ${ticketPrice === 'custom' ? '#F59E0B' : 'var(--border)'}`, background: ticketPrice === 'custom' ? '#FEF3C7' : 'transparent', fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}>
                  Custom
                </button>
              </div>
              {ticketPrice === 'custom' && (
                <div className="form-group">
                  <label className="form-label">Custom price (AUD)</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 18, fontWeight: 800, color: 'var(--text2)' }}>$</span>
                    <input
                      className="form-input"
                      type="number"
                      min="0.50"
                      step="0.50"
                      placeholder="0.00"
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value)}
                      style={{ paddingLeft: 36, fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-serif)' }}
                    />
                  </div>
                </div>
              )}
              {selectedPrice > 0 && (
                <div style={{ marginTop: 16, padding: '14px 20px', background: 'var(--cream)', borderRadius: 12, fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
                  At <strong>${selectedPrice.toFixed(2)}</strong> per ticket, every 10 tickets sold adds <strong>${(selectedPrice * 10 * 0.5).toFixed(2)}</strong> to the jackpot and <strong>${(selectedPrice * 10 * 0.5).toFixed(2)}</strong> to your organisation.
                </div>
              )}
            </div>

            {/* Max tickets cap */}
            <div className="scratch-card" style={{ padding: 28, marginBottom: 20 }}>
              <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>Maximum number of tickets <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 400 }}>(optional)</span></label>
              <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16, lineHeight: 1.6 }}>
                Set a cap and the raffle closes automatically when all tickets are sold. Leave blank for unlimited tickets.
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                {[100, 200, 500, 1000].map((preset) => (
                  <button key={preset}
                    onClick={() => setMaxTickets(maxTickets === String(preset) ? '' : String(preset))}
                    style={{ padding: '8px 16px', borderRadius: 10, border: `2px solid ${maxTickets === String(preset) ? '#F59E0B' : 'var(--border)'}`, background: maxTickets === String(preset) ? '#FEF3C7' : 'transparent', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}>
                    {preset.toLocaleString()}
                  </button>
                ))}
                <button
                  onClick={() => setMaxTickets('')}
                  style={{ padding: '8px 16px', borderRadius: 10, border: `2px solid ${!maxTickets ? '#F59E0B' : 'var(--border)'}`, background: !maxTickets ? '#FEF3C7' : 'transparent', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}>
                  Unlimited
                </button>
              </div>
              <input
                className="form-input"
                type="number"
                min="1"
                placeholder="Or enter a custom number"
                value={maxTickets}
                onChange={(e) => setMaxTickets(e.target.value)}
                style={{ maxWidth: 220 }}
              />
              {maxTickets && parseInt(maxTickets, 10) > 0 && selectedPrice > 0 && (
                <div style={{ marginTop: 12, padding: '10px 14px', background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 10, fontSize: 13, color: '#92400E' }}>
                  Max jackpot at sell-out: <strong>${((parseInt(maxTickets, 10) * selectedPrice) * 0.5).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                </div>
              )}
            </div>

            {/* Lottery licence — shown with state context */}
            <div className="scratch-card" style={{ padding: 28 }}>
              <label className="form-label">Lottery/Raffle licence number (if applicable)</label>
              <input className="form-input" placeholder="e.g. LSA-12345" maxLength={60} value={lotteryLicence} onChange={(e) => setLotteryLicence(e.target.value)} style={{ marginTop: 8 }} />
              <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 8, lineHeight: 1.6 }}>
                {state && STATE_THRESHOLDS[state]
                  ? `If your prize pool will exceed $${STATE_THRESHOLDS[state].threshold.toLocaleString()} in ${STATE_THRESHOLDS[state].label}, enter your licence number here. Leave blank if not required.`
                  : 'If your prize pool will exceed your state\'s threshold, enter your licence number here. Leave blank if not required.'}
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Payment */}
        {step === 2 && (
          <div>
            <h2 className="section-title">Payment setup</h2>
            <p className="section-sub" style={{ marginBottom: 24 }}>How will buyers pay for their tickets?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              {[
                { method: 'stripe', icon: '💳', title: 'Online card payment', desc: 'Buyers pay securely by card. A 1.7% + 30c processing fee is added to the buyer total. Funds held on platform until the draw.' },
                { method: 'bank',   icon: '🏦', title: 'Bank transfer',       desc: 'Buyers pay via BSB/account number. Free with no transaction fees.' },
              ].map((opt) => (
                <div key={opt.method} className="scratch-card"
                  style={{ padding: '20px 24px', cursor: 'pointer', borderColor: paymentMethod === opt.method ? 'var(--purple)' : undefined, borderWidth: paymentMethod === opt.method ? 2 : 1.5 }}
                  onClick={() => { setPaymentMethod(opt.method); }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span style={{ fontSize: 28 }}>{opt.icon}</span>
                    <div>
                      <div style={{ fontWeight: 800 }}>{opt.title}</div>
                      <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>{opt.desc}</div>
                    </div>
                    {paymentMethod === opt.method && <div style={{ marginLeft: 'auto', fontSize: 20, color: 'var(--purple)' }}>✓</div>}
                  </div>
                </div>
              ))}
            </div>

            {paymentMethod === 'stripe' && (
              <div className="scratch-card" style={{ padding: 28 }}>
                {!stripeOnboardingComplete && (
                  <StripeConnectSetup
                    key="ff-stripe-setup"
                    fundraiserId={null}
                    onComplete={() => setStripeReady(true)}
                    prefill={user ? { name: user.name, email: user.email, phone: user.phone || '' } : null}
                  />
                )}
                {stripeOnboardingComplete && (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ fontSize: 22, marginBottom: 8 }}>✅</div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>Bank account already connected</div>
                    <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>Your existing Stripe account will be used for this raffle.</div>
                  </div>
                )}
              </div>
            )}

            {paymentMethod === 'bank' && (
              <div className="scratch-card" style={{ padding: 28 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Account name</label>
                    <input className="form-input" placeholder="e.g. Sunbury Footy Club" maxLength={100} value={bankDetails.accountName} onChange={(e) => setBankDetails((b) => ({ ...b, accountName: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div className="form-group" style={{ width: 140 }}>
                      <label className="form-label">BSB</label>
                      <input className="form-input" placeholder="000-000" maxLength={7} value={bankDetails.bsb} onChange={(e) => setBankDetails((b) => ({ ...b, bsb: e.target.value }))} />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Account number</label>
                      <input className="form-input" placeholder="12345678" maxLength={10} value={bankDetails.account} onChange={(e) => setBankDetails((b) => ({ ...b, account: e.target.value }))} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Launch */}
        {step === 3 && (
          <div>
            <h2 className="section-title">Ready to launch</h2>
            <p className="section-sub" style={{ marginBottom: 24 }}>Review your raffle, then pay the one-off launch fee to go live.</p>

            {/* Summary card */}
            <div className="scratch-card" style={{ padding: 28, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                <span style={{ fontSize: 40 }}>{emoji}</span>
                <div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 800 }}>{title}</div>
                  {description && <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>{description}</div>}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px', fontSize: 13 }}>
                <div><span style={{ color: 'var(--text2)' }}>Ticket price:</span> <strong>${selectedPrice.toFixed(2)}</strong></div>
                <div><span style={{ color: 'var(--text2)' }}>State:</span> <strong>{state}</strong></div>
                <div><span style={{ color: 'var(--text2)' }}>Payment:</span> <strong>{paymentMethod === 'stripe' ? 'Online card' : 'Bank transfer'}</strong></div>
                <div><span style={{ color: 'var(--text2)' }}>Max tickets:</span> <strong>{maxTickets && parseInt(maxTickets, 10) > 0 ? parseInt(maxTickets, 10).toLocaleString() : 'Unlimited'}</strong></div>
                {lotteryLicence && <div><span style={{ color: 'var(--text2)' }}>Licence:</span> <strong>{lotteryLicence}</strong></div>}
              </div>
            </div>

            {/* Fee card */}
            <div className="scratch-card" style={{ padding: 28, background: '#FFFBEB', border: '2px solid #F59E0B' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>One-off launch fee</div>
                  <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4, lineHeight: 1.5 }}>
                    Same flat fee as Lucky Squares campaigns. No ongoing charges. The winner takes 50% of all ticket sales and your organisation keeps the rest.
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 36, fontWeight: 900, color: '#92400E', flexShrink: 0 }}>$19</div>
              </div>
            </div>
          </div>
        )}

        {/* Footer nav */}
        <div style={{ display: 'flex', gap: 12, marginTop: 32, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={() => step === 0 ? onCancel() : setStep((s) => s - 1)}>
            {step === 0 ? 'Cancel' : '← Back'}
          </button>
          {step < steps.length - 1 ? (
            <button className="btn btn-primary" disabled={!canNext()} onClick={() => setStep((s) => s + 1)}>Next →</button>
          ) : (
            <button
              className="btn btn-gold btn-lg"
              disabled={!canNext() || saving}
              onClick={handleLaunch}>
              {saving ? 'Processing…' : '🚀 Pay $19 and launch'}
            </button>
          )}
        </div>
        {saveError && step === steps.length - 1 && (
          <p style={{ marginTop: 12, fontSize: 13, color: '#CC0000', textAlign: 'center' }}>{saveError}</p>
        )}
      </div>
    </div>
  );
}

// ─── FiftyFiftyManage ─────────────────────────────────────────────────────────

function FiftyFiftyManage({ ff: initialFf, onBack, sendTxEmail }) {
  const [ff,               setFf]               = useState(initialFf);
  const [tickets,          setTickets]          = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [copiedLink,       setCopiedLink]       = useState(false);
  const [showDrawModal,    setShowDrawModal]    = useState(false);
  const [drawing,          setDrawing]          = useState(false);
  const [drawError,        setDrawError]        = useState('');
  const [drawResult,       setDrawResult]       = useState(null); // { winnerTicket, buyerName, buyerEmail }
  const [showConfetti,     setShowConfetti]     = useState(false);
  const [resumingPayment,  setResumingPayment]  = useState(false);

  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://luckysquares.com.au';
  const publicUrl = `${appUrl}/raffle/${ff.id}`;

  const fmt = (n) => Number(n).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const loadTickets = async () => {
    if (!supabaseConfigured) { setLoading(false); return; }
    const { data } = await getSupabaseClient()
      .from('fifty_fifty_tickets')
      .select('*')
      .eq('campaign_id', ff.id)
      .eq('payment_status', 'paid')
      .order('created_at', { ascending: true });
    setTickets(data || []);
    setLoading(false);
  };

  const refreshCampaign = async () => {
    if (!supabaseConfigured) return;
    const { data } = await getSupabaseClient().rpc('get_my_fifty_fifty_campaigns');
    if (Array.isArray(data)) {
      const updated = data.find((c) => c.id === ff.id);
      if (updated) setFf(updated);
    }
  };

  useEffect(() => { loadTickets(); refreshCampaign(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleResumePayment = async () => {
    setResumingPayment(true);
    try {
      const { data: { session: authSession } } = await getSupabaseClient().auth.getSession();
      const token = authSession?.access_token;
      const res = await fetch('/api/stripe/create-fifty-fifty-launch-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ campaign_id: ff.id }),
      });
      const json = await res.json();
      if (json.url) { window.location.href = json.url; }
      else { alert(json.error || 'Something went wrong. Please try again.'); }
    } catch {
      alert('Something went wrong. Please try again.');
    } finally {
      setResumingPayment(false);
    }
  };

  // Build all sold ticket numbers from ticket rows
  const allSoldNumbers = tickets.flatMap((t) => t.ticket_numbers || []);
  const totalRaised = (ff.tickets_sold || 0) * parseFloat(ff.ticket_price || 0);
  const jackpot = totalRaised * 0.5;

  // Winner ticket info
  const winnerTicket = ff.winner_ticket_num;
  const winnerRow = winnerTicket ? tickets.find((t) => (t.ticket_numbers || []).includes(winnerTicket)) : null;

  const handleRunDraw = async () => {
    if (allSoldNumbers.length === 0) return;
    setDrawing(true);
    setDrawError('');
    const winnerNum = allSoldNumbers[Math.floor(Math.random() * allSoldNumbers.length)];
    const { data, error } = await getSupabaseClient().rpc('record_fifty_fifty_draw', {
      p_campaign_id:   ff.id,
      p_winner_ticket: winnerNum,
    });
    if (error || data?.error) {
      setDrawError(data?.error || error?.message || 'Something went wrong. Please try again.');
      setDrawing(false);
      return;
    }
    const winRow = tickets.find((t) => (t.ticket_numbers || []).includes(winnerNum));
    setDrawResult({ winnerTicket: winnerNum, buyerName: winRow?.buyer_name || 'Unknown', buyerEmail: winRow?.buyer_email || null });
    setShowDrawModal(false);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 5000);
    await refreshCampaign();
    await loadTickets();
    setDrawing(false);
    // Send winner notification email
    if (winRow?.buyer_email && supabaseConfigured) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (supabaseUrl) {
        fetch(`${supabaseUrl}/functions/v1/transactional-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'fifty_fifty_draw_winner',
            to: winRow.buyer_email,
            data: {
              buyer_name:     winRow.buyer_name,
              campaign_title: ff.title,
              org_name:       '',
              winning_ticket: winnerNum,
              prize_amount:   fmt(jackpot),
              contact_email:  '',
            },
          }),
        }).catch(() => {});
        // Send no-win emails to all other buyers
        const otherEmails = new Set();
        tickets.forEach((t) => {
          if (t.buyer_email && t.buyer_email !== winRow.buyer_email) otherEmails.add(t.buyer_email);
        });
        otherEmails.forEach((email) => {
          const tRow = tickets.find((t) => t.buyer_email === email);
          fetch(`${supabaseUrl}/functions/v1/transactional-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'fifty_fifty_draw_no_win',
              to: email,
              data: {
                buyer_name:     tRow?.buyer_name || 'Supporter',
                campaign_title: ff.title,
                org_name:       '',
                winning_ticket: winnerNum,
                total_raised:   fmt(totalRaised),
              },
            }),
          }).catch(() => {});
        });
      }
    }
  };

  return (
    <div className="dot-bg" style={{ flex: 1 }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>
        {showConfetti && <Confetti />}

        {/* Back button and header */}
        <button className="btn btn-outline btn-sm" style={{ marginBottom: 24 }} onClick={onBack}>← Dashboard</button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 48 }}>{ff.emoji || '🎟️'}</span>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 900, margin: 0 }}>{ff.title}</h1>
              <span className="tag" style={{ background: '#FEF3C7', color: '#92400E', fontSize: 12 }}>🎟️ 50/50 Raffle</span>
              <span className={`tag ${ff.status === 'active' ? 'tag-green' : ff.status === 'drawn' ? 'tag-drawn' : 'tag-muted'}`}>
                {ff.status === 'active' ? '● Live' : ff.status === 'drawn' ? '🏆 Drawn' : 'Draft'}
              </span>
            </div>
            {ff.description && <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--text2)' }}>{ff.description}</p>}
          </div>
        </div>

        {/* Draft / pending payment banner */}
        {ff.status === 'draft' && (
          <div style={{ background: '#FFF6EE', border: '2px solid #FFD8B0', borderRadius: 14, padding: '20px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 28 }}>⏳</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--orange)', marginBottom: 4 }}>Payment required to go live</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>Your raffle is saved but not yet live. Pay the $19 launch fee to start accepting ticket purchases.</div>
            </div>
            <button
              className="btn btn-lg"
              style={{ background: '#F59E0B', color: '#fff', border: 'none', flexShrink: 0 }}
              disabled={resumingPayment}
              onClick={handleResumePayment}>
              {resumingPayment ? 'Redirecting…' : '🚀 Complete payment ($19)'}
            </button>
          </div>
        )}

        {/* Draw result hero */}
        {(ff.status === 'drawn' || drawResult) && (
          <div className="scratch-card" style={{ padding: 28, marginBottom: 24, background: 'linear-gradient(135deg,#FFFBEB,#FEF3C7)', border: '2px solid #F59E0B' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>🏆</div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 900, marginBottom: 4, color: '#92400E' }}>
                Winning Ticket #{drawResult?.winnerTicket ?? winnerTicket}
              </div>
              {(drawResult?.buyerName || winnerRow?.buyer_name) && (
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
                  {drawResult?.buyerName || winnerRow?.buyer_name}
                </div>
              )}
              {(drawResult?.buyerEmail || winnerRow?.buyer_email) && (
                <a href={`mailto:${drawResult?.buyerEmail || winnerRow?.buyer_email}`}
                  style={{ fontSize: 14, color: 'var(--purple)', fontWeight: 600, textDecoration: 'none' }}>
                  {drawResult?.buyerEmail || winnerRow?.buyer_email}
                </a>
              )}
              {winnerRow?.buyer_phone && (
                <div style={{ marginTop: 4 }}>
                  <a href={`tel:${winnerRow.buyer_phone}`} style={{ fontSize: 14, color: 'var(--purple)', fontWeight: 600, textDecoration: 'none' }}>{winnerRow.buyer_phone}</a>
                </div>
              )}
              <div style={{ marginTop: 16, fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 900, color: '#92400E' }}>
                Prize: ${fmt(jackpot || (ff.jackpot ?? 0))}
              </div>
              {(drawResult?.buyerEmail || winnerRow?.buyer_email) && (
                <button
                  className="btn btn-sm"
                  style={{ marginTop: 16, background: '#F59E0B', color: '#fff', border: 'none' }}
                  onClick={() => {
                    const email = drawResult?.buyerEmail || winnerRow?.buyer_email;
                    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
                    if (!supabaseUrl || !email) return;
                    fetch(`${supabaseUrl}/functions/v1/transactional-email`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        type: 'fifty_fifty_draw_winner',
                        to: email,
                        data: {
                          buyer_name:     drawResult?.buyerName || winnerRow?.buyer_name,
                          campaign_title: ff.title,
                          org_name:       '',
                          winning_ticket: drawResult?.winnerTicket ?? winnerTicket,
                          prize_amount:   fmt(jackpot || (ff.jackpot ?? 0)),
                          contact_email:  '',
                        },
                      }),
                    }).catch(() => {});
                    alert('Winner notification sent!');
                  }}>
                  Send winner notification
                </button>
              )}
            </div>
          </div>
        )}

        {/* Stats row */}
        {(() => {
          const soldOut = ff.max_tickets != null && (ff.tickets_sold ?? 0) >= ff.max_tickets;
          const remaining = ff.max_tickets != null ? Math.max(0, ff.max_tickets - (ff.tickets_sold ?? 0)) : null;
          const stats = [
            { label: 'Tickets sold', value: ff.max_tickets != null ? `${ff.tickets_sold ?? 0} / ${ff.max_tickets.toLocaleString()}` : String(ff.tickets_sold ?? 0) },
            { label: 'Current jackpot (50%)', value: `$${fmt(ff.jackpot ?? 0)}`, highlight: true },
            { label: 'Total raised',  value: `$${fmt(totalRaised)}` },
            { label: 'Ticket price',  value: `$${fmt(ff.ticket_price)}` },
          ];
          if (remaining !== null && !soldOut) stats.push({ label: 'Tickets remaining', value: remaining.toLocaleString(), warn: remaining < 20 });
          if (soldOut) stats.push({ label: 'Status', value: 'SOLD OUT', warn: true });
          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 16, marginBottom: 24 }}>
              {stats.map(({ label, value, highlight, warn }) => (
                <div key={label} className="scratch-card" style={{ padding: '20px 24px', borderColor: highlight ? '#F59E0B' : warn ? '#FCA5A5' : undefined, background: highlight ? '#FFFBEB' : warn ? '#FFF0F0' : undefined }}>
                  <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--text2)', marginBottom: 8 }}>{label}</div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 900, color: highlight ? '#92400E' : warn ? '#991B1B' : 'var(--text)' }}>{value}</div>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Campaign link */}
        <div className="scratch-card" style={{ padding: 24, marginBottom: 24 }}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 12 }}>Public buy page</div>
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flexShrink: 0 }}>
              <QRCodeSVG value={publicUrl} size={140} bgColor="#FFFFFF" fgColor="#1A3C2E" />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 0, marginBottom: 12, lineHeight: 1.6 }}>
                Share this link or QR code so people can buy tickets. Scan the code to open the buy page on any device.
              </p>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input readOnly value={publicUrl}
                  style={{ flex: 1, fontSize: 13, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--cream)', fontFamily: 'monospace', color: 'var(--text)' }}
                  onClick={(e) => e.target.select()} />
                <button className="btn btn-primary btn-sm" style={{ flexShrink: 0 }} onClick={() => {
                  navigator.clipboard.writeText(publicUrl);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}>
                  {copiedLink ? '✓ Copied' : 'Copy link'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Draw section */}
        {ff.status === 'active' && !drawResult && (
          <div className="scratch-card" style={{ padding: 28, marginBottom: 24, border: '2px solid #F59E0B', background: '#FFFBEB' }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Run the Draw</div>
            <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 16, lineHeight: 1.6 }}>
              Once you run the draw, a winning ticket is randomly selected from all paid tickets. This action is irreversible.
              {allSoldNumbers.length === 0 && <strong style={{ color: '#CC0000' }}> No tickets have been sold yet.</strong>}
            </p>
            <button
              className="btn btn-lg"
              style={{ background: '#F59E0B', color: '#fff', border: 'none' }}
              disabled={allSoldNumbers.length === 0}
              onClick={() => setShowDrawModal(true)}>
              🎲 Run the draw
            </button>
          </div>
        )}

        {/* Tickets list */}
        <div className="scratch-card" style={{ padding: 28 }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 900, marginBottom: 20 }}>Ticket purchases</h2>
          {loading && <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text2)' }}>Loading…</div>}
          {!loading && tickets.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text2)' }}>No tickets sold yet. Share your buy page link to get started!</div>
          )}
          {!loading && tickets.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    {['Buyer', 'Tickets', 'Amount paid', 'Date'].map((h) => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 800, color: 'var(--text2)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 12px' }}>
                        <div style={{ fontWeight: 700 }}>{t.buyer_name}</div>
                        {t.buyer_email && <div style={{ color: 'var(--text2)', fontSize: 12 }}>{t.buyer_email}</div>}
                        {t.buyer_phone && <div style={{ color: 'var(--text2)', fontSize: 12 }}>{t.buyer_phone}</div>}
                      </td>
                      <td style={{ padding: '12px 12px' }}>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {(t.ticket_numbers || []).map((n) => (
                            <span key={n} className="num-pill" style={{ fontSize: 11, background: n === winnerTicket ? '#F59E0B' : undefined, color: n === winnerTicket ? '#fff' : undefined }}>#{n}</span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '12px 12px', fontWeight: 700 }}>${fmt(t.amount_paid)}</td>
                      <td style={{ padding: '12px 12px', color: 'var(--text2)' }}>{new Date(t.created_at).toLocaleDateString('en-AU')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Draw confirmation modal */}
        {showDrawModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 24 }}>
            <div className="scratch-card" style={{ padding: 36, maxWidth: 440, width: '100%', textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎲</div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Ready to run the draw?</h2>
              <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 8, lineHeight: 1.6 }}>
                <strong>{ff.tickets_sold}</strong> tickets sold across <strong>{tickets.length}</strong> purchase{tickets.length !== 1 ? 's' : ''}.
              </p>
              <p style={{ fontSize: 13, color: '#CC0000', marginBottom: 24, lineHeight: 1.5 }}>
                This action is irreversible. A winning ticket will be randomly selected and the raffle will be marked as drawn.
              </p>
              {drawError && <p style={{ fontSize: 13, color: '#CC0000', marginBottom: 12 }}>{drawError}</p>}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button className="btn btn-outline" onClick={() => setShowDrawModal(false)} disabled={drawing}>Cancel</button>
                <button
                  className="btn btn-lg"
                  style={{ background: '#F59E0B', color: '#fff', border: 'none' }}
                  onClick={handleRunDraw}
                  disabled={drawing}>
                  {drawing ? 'Drawing…' : 'Yes, run the draw'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── BankConnectScreen ────────────────────────────────────────────────────────

function BankConnectScreen({ fundraiserId, onDone, user = null }) {
  const [done, setDone] = useState(false);
  const prefill = user ? { name: user.name, email: user.email, phone: user.phone || '' } : null;
  return (
    <div className="dot-bg" style={{ minHeight: '100vh' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>Payment setup</div>
          <h2 className="section-title" style={{ marginBottom: 8 }}>Connect your bank account</h2>
          <p className="section-sub">Your buyers pay by card and funds are transferred directly to your nominated bank account once the draw is complete.</p>
        </div>
        <div className="scratch-card" style={{ padding: 28, marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
            {[
              { icon: '🔒', text: 'Your details are secured by Stripe, the same payment infrastructure used by millions of businesses worldwide.' },
              { icon: '🏦', text: 'Funds land directly in your nominated account within 2 business days of your draw completing.' },
              { icon: '✅', text: 'You only need to do this once. Future campaigns can reuse the same account.' },
            ].map((item) => (
              <div key={item.icon} style={{ flex: 1, fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, textAlign: 'center' }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>{item.icon}</div>
                {item.text}
              </div>
            ))}
          </div>
          <StripeConnectSetup fundraiserId={fundraiserId} onComplete={() => setDone(true)} prefill={prefill} />
        </div>
        <button className="btn btn-purple btn-lg" style={{ width: '100%' }} disabled={!done} onClick={onDone}>
          {done ? 'Done — back to dashboard →' : 'Complete bank account setup above to continue'}
        </button>
      </div>
    </div>
  );
}

// ─── FundraiseApp (root) ──────────────────────────────────────────────────────

export default function FundraiseApp() {
  const [phase,              setPhase]              = useState('loading');
  const [user,               setUser]               = useState(null);
  const [pendingEmail,       setPendingEmail]       = useState('');
  const [fundraisers,        setFundraisers]        = useState([]);
  const [fiftyFiftyCampaigns, setFiftyFiftyCampaigns] = useState([]);
  const [activeFundraiser,   setActiveFundraiser]   = useState(null);
  const [wizardPrefill,     setWizardPrefill]     = useState(null);
  const [authLoading,        setAuthLoading]        = useState(false);
  const [authError,          setAuthError]          = useState('');
  const [referralInfo,        setReferralInfo]        = useState(null);
  const [showReferralModal,   setShowReferralModal]   = useState(false);
  const [suspension,          setSuspension]          = useState(null); // null | { suspended: true, reason }
  const [orgInfo,             setOrgInfo]             = useState(null); // null | { role, org_user_id, org_name }
  const [myOrgDetails,       setMyOrgDetails]        = useState(null); // null | { name, abn, org_type }
  const [bankConnectId,       setBankConnectId]       = useState(null);
  const [surveyFundraiserId,  setSurveyFundraiserId]  = useState(null);
  const [showFiftyFiftyWizard, setShowFiftyFiftyWizard] = useState(false);
  const [viewingFiftyFifty,   setViewingFiftyFifty]   = useState(null);

  // Call the transactional-email Edge Function (fire-and-forget)
  const sendTxEmail = useCallback((type, to, data) => {
    if (!supabaseConfigured || !to) return;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return;
    fetch(`${supabaseUrl}/functions/v1/transactional-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, to, data }),
    }).catch(() => {});
  }, []);

  const loadReferralInfo = useCallback(async () => {
    if (!supabaseConfigured) return;
    const { data } = await getSupabaseClient().rpc('get_my_referral_info');
    if (data?.[0]) setReferralInfo(data[0]);
  }, []);

  const loadFundraisers = useCallback(async (userId) => {
    if (!supabaseConfigured) { setFundraisers(SAMPLE_FUNDRAISERS); return; }
    const supabase = getSupabaseClient();
    const { data: rows } = await supabase
      .from('fundraisers').select('*').eq('owner_id', userId).order('created_at', { ascending: false });
    if (!rows?.length) { setFundraisers([]); return; }
    const ids = rows.map((r) => r.id);
    const [{ data: stats }, { data: prizes }] = await Promise.all([
      supabase.from('fundraiser_stats').select('*').in('fundraiser_id', ids),
      supabase.from('prizes').select('*').in('fundraiser_id', ids),
    ]);
    const statsMap  = Object.fromEntries((stats  || []).map((s) => [s.fundraiser_id, s]));
    const prizesMap = (prizes || []).reduce((acc, p) => {
      (acc[p.fundraiser_id] ??= []).push(p); return acc;
    }, {});
    setFundraisers(rows.map((r) => dbToFundraiser(r, Number(statsMap[r.id]?.sold_count ?? 0), prizesMap[r.id] || [])));
  }, []);

  const loadFiftyFiftyCampaigns = useCallback(async () => {
    if (!supabaseConfigured) return;
    const { data } = await getSupabaseClient().rpc('get_my_fifty_fifty_campaigns');
    setFiftyFiftyCampaigns(Array.isArray(data) ? data : []);
  }, []);

  // Scroll to top on every phase change
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [phase]);

  useEffect(() => {
    const wantsRegister = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('register') === '1';
    if (!supabaseConfigured) { setPhase(wantsRegister ? 'register' : 'login'); return; }
    const supabase = getSupabaseClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const u = session.user;
        const supabase = getSupabaseClient();
        const { plan, isFoundingMember, isBetaTester, stripeAccountId, stripeOnboardingComplete, fullName } = await fetchProfile(u.id);
        setUser({ id: u.id, name: u.user_metadata?.full_name || fullName || '', email: u.email, org: u.user_metadata?.organisation || '', phone: u.user_metadata?.phone || '', plan, isFoundingMember, isBetaTester, stripeAccountId, stripeOnboardingComplete });
        // Send welcome emails if this is a new signup returning after email verification
        const newSignup = (() => { try { return JSON.parse(localStorage.getItem('ls_new_signup') || 'null'); } catch { return null; } })();
        if (newSignup?.email === u.email) {
          const firstName = newSignup.name?.split(' ')[0] || u.user_metadata?.full_name?.split(' ')[0] || 'there';
          sendTxEmail('organizer_welcome', u.email, { first_name: firstName });
          sendTxEmail('welcome_day1', u.email, { first_name: firstName });
          localStorage.removeItem('ls_new_signup');
        }
        // Load org role (contributor or admin) and org details for wizard pre-fill
        const [{ data: oi }, { data: od }] = await Promise.all([
          supabase.rpc('get_my_org_info'),
          supabase.rpc('get_my_org_details'),
        ]);
        setOrgInfo(oi);
        if (od?.[0]) setMyOrgDetails(od[0]);
        const fundraiserOwnerId = oi?.role === 'contributor' ? oi.org_user_id : u.id;
        loadFundraisers(fundraiserOwnerId);
        loadFiftyFiftyCampaigns();
        loadReferralInfo();
        // Check suspension status
        supabase.rpc('get_my_suspension_status').then(({ data: s }) => {
          if (s?.[0]?.suspended) setSuspension({ suspended: true, reason: s[0].suspension_reason });
        });
        setPhase('dashboard');
      } else {
        if (process.env.NEXT_PUBLIC_SITE_PHASE === 'preview' && typeof window !== 'undefined') {
          window.location.href = '/coming-soon';
        } else {
          setPhase(wantsRegister ? 'register' : 'login');
        }
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') { setUser(null); setFundraisers([]); setPhase('login'); }
    });
    return () => subscription.unsubscribe();
  }, [loadFundraisers]);

  // Keep dashboard fresh: realtime for status changes, poll every 60s for sold counts
  useEffect(() => {
    if (phase !== 'dashboard' || !user?.id || !supabaseConfigured) return;
    const supabase = getSupabaseClient();

    const channel = supabase
      .channel('dashboard-live')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'fundraisers', filter: `owner_id=eq.${user.id}` },
        () => loadFundraisers(user.id))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'squares' },
        () => loadFundraisers(user.id))
      .subscribe();

    const pollId = setInterval(() => loadFundraisers(user.id), 60_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollId);
    };
  }, [phase, user?.id, loadFundraisers]);

  const handleLogin = async ({ email, password }) => {
    setAuthError('');
    if (!supabaseConfigured) {
      setUser({ name: 'Demo User', email });
      setFundraisers(SAMPLE_FUNDRAISERS);
      setPhase('dashboard');
      return;
    }
    setAuthLoading(true);
    const { data, error } = await getSupabaseClient().auth.signInWithPassword({ email, password });
    setAuthLoading(false);
    if (error) { setAuthError(error.message); return; }
    const u = data.user;
    const { plan, isFoundingMember, stripeAccountId, stripeOnboardingComplete, fullName } = await fetchProfile(u.id);
    setUser({ id: u.id, name: u.user_metadata?.full_name || fullName || '', email: u.email, org: u.user_metadata?.organisation || '', phone: u.user_metadata?.phone || '', plan, isFoundingMember, stripeAccountId, stripeOnboardingComplete });
    await loadFundraisers(u.id);
    setPhase('dashboard');
  };

  const handleRegister = async ({ name, email, org, phone, password }) => {
    setAuthError('');
    if (!supabaseConfigured) { setPendingEmail(email); setPhase('verify'); return; }
    setAuthLoading(true);
    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/fundraise` : 'https://luckysquares.com.au/fundraise';
    const { data, error } = await getSupabaseClient().auth.signUp({ email, password, options: { data: { full_name: name, organisation: org, phone }, emailRedirectTo: redirectTo } });
    setAuthLoading(false);
    if (error) { setAuthError(error.message); return; }
    // If email confirmation is disabled, user is auto-confirmed with a session
    if (data?.session && data?.user) {
      const u = data.user;
      const { plan, isFoundingMember, stripeAccountId, stripeOnboardingComplete, fullName } = await fetchProfile(u.id);
      const firstName = name?.split(' ')[0] || 'there';
      setUser({ id: u.id, name: name || u.user_metadata?.full_name || fullName || '', email: u.email, org: u.user_metadata?.organisation || '', phone: phone || u.user_metadata?.phone || '', plan, isFoundingMember, stripeAccountId, stripeOnboardingComplete });
      const storedRef = typeof window !== 'undefined' ? localStorage.getItem('ls_ref') : null;
      if (storedRef) {
        await getSupabaseClient().rpc('apply_referral', { p_code: storedRef });
        localStorage.removeItem('ls_ref');
      }
      await loadReferralInfo();
      setFundraisers([]);
      sendTxEmail('organizer_welcome', email, { first_name: firstName });
      sendTxEmail('welcome_day1', email, { first_name: firstName });
      setPhase('dashboard');
      return;
    }
    // Email confirmation required — store new-signup metadata so welcome emails
    // fire when the user returns after clicking the verification link
    if (typeof window !== 'undefined') {
      localStorage.setItem('ls_new_signup', JSON.stringify({ email, name: name || '' }));
    }
    setPendingEmail(email);
    setPhase('verify');
  };

  const handleVerify = async (token) => {
    setAuthError('');
    if (!supabaseConfigured) {
      setUser({ name: 'Demo User', email: pendingEmail });
      setFundraisers([]);
      setPhase('dashboard');
      return;
    }
    setAuthLoading(true);
    const { data, error } = await getSupabaseClient().auth.verifyOtp({ email: pendingEmail, token, type: 'signup' });
    setAuthLoading(false);
    if (error) { setAuthError(error.message); return; }
    const u = data.user;
    const { plan, isFoundingMember, stripeAccountId, stripeOnboardingComplete, fullName } = await fetchProfile(u.id);
    const firstName = u.user_metadata?.full_name?.split(' ')[0] || fullName?.split(' ')[0] || 'there';
    setUser({ id: u.id, name: u.user_metadata?.full_name || fullName || u.email, email: u.email, org: u.user_metadata?.organisation || '', phone: u.user_metadata?.phone || '', plan, isFoundingMember, stripeAccountId, stripeOnboardingComplete });
    const storedRef = typeof window !== 'undefined' ? localStorage.getItem('ls_ref') : null;
    if (storedRef) {
      await getSupabaseClient().rpc('apply_referral', { p_code: storedRef });
      localStorage.removeItem('ls_ref');
    }
    await loadReferralInfo();
    setFundraisers([]);
    sendTxEmail('organizer_welcome', pendingEmail, { first_name: firstName });
    sendTxEmail('welcome_day1', pendingEmail, { first_name: firstName });
    setPhase('dashboard');
  };

  const handleDelete = useCallback(async (fundraiserId) => {
    if (supabaseConfigured) {
      await getSupabaseClient().from('fundraisers').delete().eq('id', fundraiserId);
    }
    setFundraisers((prev) => prev.filter((f) => f.id !== fundraiserId));
    setActiveFundraiser(null);
    setPhase('dashboard');
  }, []);

  const handleDrawComplete = useCallback(async (fundraiserId) => {
    setFundraisers((prev) => prev.map((f) => f.id === fundraiserId ? { ...f, status: 'drawn' } : f));
    setActiveFundraiser((prev) => prev?.id === fundraiserId ? { ...prev, status: 'drawn' } : prev);
    // Show post-draw survey after a short delay so the draw result settles first
    setTimeout(() => setSurveyFundraiserId(fundraiserId), 2000);
    // Re-fetch profile so Foundation Member badge appears immediately after a successful draw
    if (user?.id) {
      const prevWasFoundingMember = user.isFoundingMember;
      const { isFoundingMember, isBetaTester, plan } = await fetchProfile(user.id);
      setUser((prev) => prev ? { ...prev, plan, isFoundingMember, isBetaTester } : prev);
      // Send Foundation Member congratulation email if this draw just earned them the badge
      if (!prevWasFoundingMember && isFoundingMember && user.email) {
        // Get member number (count of founding members)
        const { data: countData } = await getSupabaseClient().rpc('get_founding_member_count');
        const memberNum = typeof countData === 'number' ? countData : 1;
        const drawnFundraiser = fundraisers.find((f) => f.id === fundraiserId);
        sendTxEmail('foundation_member', user.email, {
          first_name: user.name?.split(' ')[0] || 'there',
          org_name:   drawnFundraiser?.org || user.org || 'your organisation',
          member_num: memberNum,
        });
      }
    }
  }, [user?.id, user?.isFoundingMember, user?.email, user?.name, user?.org, fundraisers, sendTxEmail]);

  const handleLaunch = useCallback((fundraiserId) => {
    setFundraisers((prev) => prev.map((f) => f.id === fundraiserId ? { ...f, status: 'active' } : f));
    setActiveFundraiser((prev) => prev?.id === fundraiserId ? { ...prev, status: 'active' } : prev);
  }, []);

  const handleDuplicate = useCallback((f) => {
    // Strip any existing "#N" suffix to get the base title
    const baseTitle = f.title.replace(/\s*#\d+$/, '').trim();
    // Escape special regex chars in the base title
    const escaped   = baseTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Count all existing campaigns (any status) that share this base title
    const baseRegex = new RegExp(`^${escaped}(\\s*#\\d+)?$`, 'i');
    const count     = fundraisers.filter((fr) => baseRegex.test(fr.title.trim())).length;
    const newTitle  = `${baseTitle} #${count + 1}`;

    const gridOpt = GRID_OPTIONS.find((g) => g.size === f.grid) ?? GRID_OPTIONS[0];

    setWizardPrefill({
      step:          0,
      fundraiserType: f.fundraiserType || 'individual',
      orgDetails:    { name: f.org || '', orgType: '', abn: '' },
      gridOpt,
      price:         String(f.pricePerSq),
      prizes:        f.prizes?.length > 0
        ? f.prizes.map((p) => ({ place: p.place, desc: p.description, value: p.value, donated: p.donated ?? false }))
        : [{ place: '1st', desc: '', value: '', donated: false }, { place: '2nd', desc: '', value: '', donated: false }, { place: '3rd', desc: '', value: '', donated: false }],
      campaign: {
        title:        newTitle,
        org:          f.org          || '',
        state:        f.state        || 'SA',
        contactName:  f.contactName  || '',
        contactEmail: f.contactEmail || '',
        contactPhone: f.contactPhone || '',
        description:  f.description  || '',
        thankYou:     f.thankYou     || '',
        emoji:        f.emoji        || '🍀',
      },
      campaignImageUrl: '',    // fresh image — don't inherit old one
      imageFocalY:      50,
      drawRules: { type: f.drawType || 'manual', date: '' }, // reset draw date
      payment: {
        method:      f.payment?.method      || 'inperson',
        accountName: f.payment?.accountName || '',
        bsb:         f.payment?.bsb         || '',
        account:     f.payment?.account     || '',
      },
    });
    setPhase('wizard');
  }, [fundraisers]);

  const handleLogout = async () => {
    if (supabaseConfigured) await getSupabaseClient().auth.signOut();
    setUser(null); setFundraisers([]); setPhase('login');
  };

  const handleViewGrid   = (f) => { setActiveFundraiser(f); setPhase('live'); };
  const handleViewReport = (f) => { setActiveFundraiser(f); setPhase('report'); };
  const handleConnectBank = (f) => { setBankConnectId(f.id); setPhase('bankconnect'); };

  const handleWizardComplete = async (data, isDraft = false) => {
    const currentCount = fundraisers.filter((f) => ['draft', 'active'].includes(f.status)).length;
    if (currentCount >= PLAN_LIMITS[user?.plan ?? 'trial']) { setPhase('dashboard'); return; }
    const totalPrizeValue = data.prizes.reduce((sum, p) => p.donated ? sum : sum + parsePrizeValue(p.value), 0);
    const nf = {
      id:              Date.now(),
      title:           data.campaign.title || 'New Fundraiser',
      org:             data.campaign.org   || 'Your Organisation',
      description:     data.campaign.description || '',
      thankYou:        data.campaign.thankYou || '',
      contactName:     data.campaign.contactName || '',
      grid:            data.gridOpt?.size  || 100,
      pricePerSq:      parseFloat(data.price) || 10,
      sold:            0,
      status:          isDraft ? 'draft' : 'active',
      emoji:           data.campaign.emoji || '🍀',
      imageUrl:        data.campaignImageUrl || null,
      drawType:        data.drawRules.type,
      drawDate:        data.drawRules.date || null,
      totalPrizeValue,
      prizes: data.prizes
        .filter((p) => p.desc)
        .map((p) => ({ place: p.place, description: p.desc, value: p.value })),
      payment: data.payment,
    };
    if (supabaseConfigured && user?.id) {
      let orgId = null;
      if (data.fundraiserType === 'org' && data.orgDetails?.name?.trim()) {
        const { data: oid } = await getSupabaseClient().rpc('upsert_my_org', {
          p_name: sanitize(data.orgDetails.name),
          p_abn: sanitize(data.orgDetails.abn) || null,
          p_org_type: data.orgDetails.orgType || null,
        });
        orgId = oid;
      }
      const { data: saved, error } = await getSupabaseClient()
        .from('fundraisers')
        .insert({
          owner_id: user.id, title: sanitize(nf.title), org: sanitize(nf.org) || null,
          contact_name: sanitize(data.campaign.contactName) || null,
          contact_email: sanitize(data.campaign.contactEmail) || null,
          contact_phone: sanitize(data.campaign.contactPhone) || null,
          emoji: nf.emoji, image_url: data.campaignImageUrl || null, image_focal_y: data.imageFocalY ?? 50, description: sanitize(data.campaign.description), thank_you: sanitize(data.campaign.thankYou),
          state: data.campaign.state || 'SA',
          grid_size: nf.grid, price_per_sq: nf.pricePerSq, status: nf.status,
          launched_at: nf.status === 'active' ? new Date().toISOString() : null,
          draw_type: data.drawRules.type, draw_date: data.drawRules.date || null,
          payment_method: data.payment.method, bank_account_name: sanitize(data.payment.accountName) || null,
          bank_bsb: sanitize(data.payment.bsb) || null, bank_account: sanitize(data.payment.account) || null,
          fundraiser_type: data.fundraiserType || 'individual',
          org_id: orgId,
          slug: await resolveUniqueSlug(nf.title, getSupabaseClient()),
          // Link user-level Stripe account for free stripe launches (paid path uses handleLaunchPay)
          stripe_account_id: data.payment.method === 'stripe' ? (user?.stripeAccountId || null) : null,
        })
        .select().single();
      if (error) {
        console.error('handleWizardComplete insert error:', error);
        if (error.message?.includes('CAMPAIGN_LIMIT_REACHED')) {
          const planLabel = user?.plan === 'org' ? 'Organisation' : user?.plan === 'casual' ? 'Casual' : 'Trial';
          const limit     = PLAN_LIMITS[user?.plan ?? 'trial'];
          alert(`You have reached the ${planLabel} plan limit of ${limit} active campaigns. Please complete or cancel an existing campaign before launching a new one.`);
          setPhase('dashboard');
        }
        return;
      }
      if (saved) {
        nf.id   = saved.id;
        nf.slug = saved.slug;
        const prizeRows = data.prizes
          .filter((p) => p.desc)
          .map((p, i) => ({ fundraiser_id: saved.id, place: p.place, description: sanitize(p.desc), value: sanitize(p.value), donated: p.donated ?? false, sort_order: i }));
        await Promise.all([
          getSupabaseClient().rpc('create_fundraiser_squares', { p_fundraiser_id: saved.id, p_grid_size: nf.grid }),
          prizeRows.length ? getSupabaseClient().from('prizes').insert(prizeRows) : Promise.resolve(),
        ]);
      }
    }
    setFundraisers((prev) => [nf, ...prev]);
    setActiveFundraiser(nf);
    setPhase('live');
    // Send campaign launched email and check referral reward
    if (!isDraft && user?.email) {
      const campaignUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://luckysquares.com.au'}/${nf.slug ?? nf.id}`;
      const firstName = user.name?.split(' ')[0] || 'there';
      sendTxEmail('campaign_launched', user.email, {
        first_name: firstName,
        campaign_title: nf.title,
        campaign_url: campaignUrl,
      });
      if (user?.plan === 'org') {
        const maxRaise = (nf.grid * nf.pricePerSq).toFixed(2);
        sendTxEmail('org_campaign_launched', user.email, {
          first_name:     firstName,
          org_name:       nf.org,
          campaign_title: nf.title,
          grid_size:      nf.grid,
          price_per_sq:   nf.pricePerSq.toFixed(2),
          max_raise:      maxRaise,
          campaign_url:   campaignUrl,
        });
      }
      if (supabaseConfigured && user?.id) {
        getSupabaseClient().rpc('check_referral_reward', { p_user_id: user.id })
          .then(({ data: rewards }) => {
            if (!rewards?.length) return;
            const { referrer_email, referrer_name, coupon_code } = rewards[0];
            if (!referrer_email) return;
            sendTxEmail('referral_reward', referrer_email, {
              first_name:    (referrer_name || 'there').split(' ')[0],
              referred_name: user.name || 'Someone you referred',
              coupon_code,
            });
          });
        loadReferralInfo();
        setShowReferralModal(true);
        // Notify opted-in buyers from previous campaigns (fire-and-forget)
        if (nf.id && typeof nf.id === 'string') {
          getSupabaseClient().rpc('get_campaign_notification_followers', { p_fundraiser_id: nf.id }).then(({ data: followers }) => {
            if (!followers?.length) return;
            followers.forEach((f) => sendTxEmail('campaign_launched_notification', f.email, {
              organiser_name: nf.org || user.org || 'the organiser',
              campaign_title: nf.title,
              campaign_url: campaignUrl,
            }));
          });
        }
      }
    }
  };

  // Handle redirect back from Stripe after Lucky Squares launch fee payment
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('launch_success') === '1') {
      const fid = params.get('fid');
      window.history.replaceState({}, '', window.location.pathname);
      if (fid && user?.id) {
        // Reload fundraisers then open the campaign
        loadFundraisers(user.id).then(() => {
          setFundraisers((prev) => {
            const f = prev.find((x) => x.id === fid);
            if (f) { setActiveFundraiser(f); setPhase('live'); }
            return prev;
          });
        });
      }
    }
  }, [user]);

  // Handle redirect back from Stripe after 50/50 launch fee payment
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('ff_launch') === '1') {
      const ffid = params.get('ffid');
      window.history.replaceState({}, '', window.location.pathname);
      if (ffid) {
        // Reload 50/50 campaigns then open the newly launched one
        loadFiftyFiftyCampaigns().then(() => {
          setFiftyFiftyCampaigns((prev) => {
            const ff = prev.find((x) => x.id === ffid);
            if (ff) setViewingFiftyFifty(ff);
            return prev;
          });
        });
      }
    }
  }, [user, loadFiftyFiftyCampaigns]);

  const handleSaveDraft = async (data) => {
    if (!supabaseConfigured || !user?.id) return null;
    const db = getSupabaseClient();
    const grid = data.gridOpt?.size || 100;
    let orgId = null;
    if (data.fundraiserType === 'org' && data.orgDetails?.name?.trim()) {
      const { data: oid } = await db.rpc('upsert_my_org', {
        p_name: sanitize(data.orgDetails.name),
        p_abn: sanitize(data.orgDetails.abn) || null,
        p_org_type: data.orgDetails.orgType || null,
      });
      orgId = oid;
    }
    const { data: saved, error } = await db.from('fundraisers').insert({
      owner_id: user.id, title: sanitize(data.campaign.title || 'New Fundraiser'),
      org: sanitize(data.campaign.org) || null,
      contact_name: sanitize(data.campaign.contactName) || null,
      contact_email: sanitize(data.campaign.contactEmail) || null,
      contact_phone: sanitize(data.campaign.contactPhone) || null,
      emoji: data.campaign.emoji || '🍀', image_url: data.campaignImageUrl || null, image_focal_y: data.imageFocalY ?? 50,
      description: sanitize(data.campaign.description), thank_you: sanitize(data.campaign.thankYou),
      state: data.campaign.state || 'SA',
      grid_size: grid, price_per_sq: parseFloat(data.price) || 10, status: 'draft',
      draw_type: data.drawRules.type, draw_date: data.drawRules.date || null,
      payment_method: data.payment.method,
      bank_account_name: sanitize(data.payment.accountName) || null,
      bank_bsb: sanitize(data.payment.bsb) || null, bank_account: sanitize(data.payment.account) || null,
      fundraiser_type: data.fundraiserType || 'individual',
      org_id: orgId,
    }).select().single();
    if (error || !saved) { console.error('handleSaveDraft error:', error); return null; }
    const prizeRows = data.prizes.filter((p) => p.desc)
      .map((p, i) => ({ fundraiser_id: saved.id, place: p.place, description: sanitize(p.desc), value: sanitize(p.value), donated: p.donated ?? false, sort_order: i }));
    await Promise.all([
      db.rpc('create_fundraiser_squares', { p_fundraiser_id: saved.id, p_grid_size: grid }),
      prizeRows.length ? db.from('prizes').insert(prizeRows) : Promise.resolve(),
    ]);
    return saved.id;
  };

  const handleLaunchPay = async (data) => {
    if (!supabaseConfigured || !user?.id) return;
    const db = getSupabaseClient();
    const grid = data.gridOpt?.size || 100;
    let fundraiserId;

    if (data.existingFundraiserId) {
      // Stripe path: draft already created during bank setup and has stripe_account_id linked.
      // Update fields only — squares/prizes already exist from handleSaveDraft.
      fundraiserId = data.existingFundraiserId;
      let orgId = null;
      if (data.fundraiserType === 'org' && data.orgDetails?.name?.trim()) {
        const { data: oid } = await db.rpc('upsert_my_org', {
          p_name: sanitize(data.orgDetails.name),
          p_abn: sanitize(data.orgDetails.abn) || null,
          p_org_type: data.orgDetails.orgType || null,
        });
        orgId = oid;
      }
      await db.from('fundraisers').update({
        title:             sanitize(data.campaign.title || 'New Fundraiser'),
        org:               sanitize(data.campaign.org) || null,
        contact_name:      sanitize(data.campaign.contactName) || null,
        contact_email:     sanitize(data.campaign.contactEmail) || null,
        contact_phone:     sanitize(data.campaign.contactPhone) || null,
        emoji:             data.campaign.emoji || '🍀',
        image_url:         data.campaignImageUrl || null,
        image_focal_y:     data.imageFocalY ?? 50,
        description:       sanitize(data.campaign.description),
        thank_you:         sanitize(data.campaign.thankYou),
        state:             data.campaign.state || 'SA',
        grid_size:         grid,
        price_per_sq:      parseFloat(data.price) || 10,
        draw_type:         data.drawRules.type,
        draw_date:         data.drawRules.date || null,
        payment_method:    data.payment.method,
        fundraiser_type:   data.fundraiserType || 'individual',
        // Ensure user-level stripe account is linked (account-session route also does this,
        // but belt-and-braces in case the skip-bankPhase path is used)
        ...(user?.stripeAccountId ? { stripe_account_id: user.stripeAccountId } : {}),
        ...(orgId ? { org_id: orgId } : {}),
      }).eq('id', fundraiserId).eq('owner_id', user.id);
    } else {
      // Non-stripe path (bank transfer / in-person) OR stripe with skip-bankPhase:
      // create a fresh fundraiser
      let orgId = null;
      if (data.fundraiserType === 'org' && data.orgDetails?.name?.trim()) {
        const { data: oid } = await db.rpc('upsert_my_org', {
          p_name: sanitize(data.orgDetails.name),
          p_abn: sanitize(data.orgDetails.abn) || null,
          p_org_type: data.orgDetails.orgType || null,
        });
        orgId = oid;
      }
      const { data: saved, error } = await db.from('fundraisers').insert({
        owner_id:          user.id,
        title:             sanitize(data.campaign.title || 'New Fundraiser'),
        org:               sanitize(data.campaign.org) || null,
        contact_name:      sanitize(data.campaign.contactName) || null,
        contact_email:     sanitize(data.campaign.contactEmail) || null,
        contact_phone:     sanitize(data.campaign.contactPhone) || null,
        emoji:             data.campaign.emoji || '🍀',
        image_url:         data.campaignImageUrl || null,
        image_focal_y:     data.imageFocalY ?? 50,
        description:       sanitize(data.campaign.description),
        thank_you:         sanitize(data.campaign.thankYou),
        state:             data.campaign.state || 'SA',
        grid_size:         grid,
        price_per_sq:      parseFloat(data.price) || 10,
        status:            'draft',
        draw_type:         data.drawRules.type,
        draw_date:         data.drawRules.date || null,
        payment_method:    data.payment.method,
        bank_account_name: sanitize(data.payment.accountName) || null,
        bank_bsb:          sanitize(data.payment.bsb) || null,
        bank_account:      sanitize(data.payment.account) || null,
        fundraiser_type:   data.fundraiserType || 'individual',
        org_id:            orgId,
        slug:              await resolveUniqueSlug(sanitize(data.campaign.title || 'New Fundraiser'), db),
        // Link user-level Stripe account (set when payment.method === 'stripe' and skip-bankPhase)
        stripe_account_id: data.payment.method === 'stripe' ? (user?.stripeAccountId || null) : null,
      }).select().single();
      if (error || !saved) { console.error('Draft save failed:', error); return; }
      fundraiserId = saved.id;
      const prizeRows = data.prizes
        .filter((p) => p.desc)
        .map((p, i) => ({ fundraiser_id: fundraiserId, place: p.place, description: sanitize(p.desc), value: sanitize(p.value), donated: p.donated ?? false, sort_order: i }));
      await Promise.all([
        db.rpc('create_fundraiser_squares', { p_fundraiser_id: fundraiserId, p_grid_size: grid }),
        prizeRows.length ? db.from('prizes').insert(prizeRows) : Promise.resolve(),
      ]);
    }

    // NOTE: final_fee is intentionally NOT sent here — the server calculates the
    // correct fee independently from the database and coupon validation. Never
    // trust the client to supply a price.
    const { data: { session: checkoutSession } } = await getSupabaseClient().auth.getSession();
    const checkoutToken = checkoutSession?.access_token;
    const res = await fetch('/api/stripe/create-launch-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(checkoutToken ? { Authorization: `Bearer ${checkoutToken}` } : {}),
      },
      body: JSON.stringify({ fundraiser_id: fundraiserId, coupon_code: data.couponCode || '' }),
    });
    const { url, error: stripeErr } = await res.json();
    if (stripeErr || !url) {
      console.error('Checkout creation failed:', stripeErr);
      return { error: stripeErr || 'UNKNOWN' };
    }

    try { localStorage.removeItem(WIZARD_STORAGE_KEY); } catch {}
    window.location.href = url;
  };

  const showHeader = !['login', 'register', 'verify', 'loading'].includes(phase);

  const activeCampaignCount = fundraisers.filter((f) => ['draft', 'active'].includes(f.status)).length;
  const planLimit           = PLAN_LIMITS[user?.plan ?? 'trial'];
  const isSuspended         = suspension?.suspended === true;
  const isContributor       = orgInfo?.role === 'contributor';
  const canCreate           = activeCampaignCount < planLimit && !isSuspended && !isContributor;

  const handleNewFundraiser = () => {
    if (!canCreate) return;
    try { localStorage.removeItem(WIZARD_STORAGE_KEY); } catch {}
    setPhase('wizard');
  };

  if (phase === 'loading') return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)' }}>
      <div style={{ textAlign: 'center' }}>
        <Logo size={72} />
        <div style={{ marginTop: 20, fontSize: 14, color: 'var(--text2)', fontWeight: 600 }}>Loading…</div>
      </div>
    </div>
  );

  const handleHome = () => {
    setShowFiftyFiftyWizard(false);
    setViewingFiftyFifty(null);
    setPhase('dashboard');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {showHeader && <AppHeader user={user} onLogout={handleLogout} onHome={handleHome} />}
      {phase === 'login'     && <LoginScreen    onLogin={handleLogin}        onRegister={() => { setAuthError(''); setPhase('register'); }} loading={authLoading} error={authError} />}
      {phase === 'register'  && <RegisterScreen onRegister={handleRegister}  onBack={() => { setAuthError(''); setPhase('login'); }} loading={authLoading} error={authError} />}
      {phase === 'verify'    && <VerifyScreen   email={pendingEmail}         onResend={async () => { if (supabaseConfigured) await getSupabaseClient().auth.resend({ type: 'signup', email: pendingEmail }); }} />}
      {phase === 'dashboard' && user && !showFiftyFiftyWizard && !viewingFiftyFifty && (
        <Dashboard
          user={user}
          fundraisers={fundraisers}
          fiftyFiftyCampaigns={fiftyFiftyCampaigns}
          onNew={handleNewFundraiser}
          onView={handleViewGrid}
          onReport={handleViewReport}
          onConnectBank={handleConnectBank}
          onDuplicate={handleDuplicate}
          canCreate={canCreate}
          planLimit={planLimit}
          referralInfo={referralInfo}
          suspension={suspension}
          orgInfo={orgInfo}
          sendTxEmail={sendTxEmail}
          onNewFiftyFifty={() => setShowFiftyFiftyWizard(true)}
          onViewFiftyFifty={(ff) => setViewingFiftyFifty(ff)}
        />
      )}
      {phase === 'dashboard' && user && showFiftyFiftyWizard && (
        <FiftyFiftyWizard
          user={user}
          stripeOnboardingComplete={user?.stripeOnboardingComplete ?? false}
          onCancel={() => setShowFiftyFiftyWizard(false)}
          onComplete={async (campaignId) => {
            setShowFiftyFiftyWizard(false);
            await loadFiftyFiftyCampaigns();
            // Open the new campaign in manage view
            const { data } = await getSupabaseClient().rpc('get_my_fifty_fifty_campaigns');
            const campaigns = Array.isArray(data) ? data : [];
            setFiftyFiftyCampaigns(campaigns);
            const newCampaign = campaigns.find((c) => c.id === campaignId);
            if (newCampaign) setViewingFiftyFifty(newCampaign);
          }}
        />
      )}
      {phase === 'dashboard' && user && viewingFiftyFifty && (
        <FiftyFiftyManage
          ff={viewingFiftyFifty}
          sendTxEmail={sendTxEmail}
          onBack={async () => {
            setViewingFiftyFifty(null);
            await loadFiftyFiftyCampaigns();
          }}
        />
      )}
      {phase === 'report'    && activeFundraiser && <CampaignReport fundraiser={activeFundraiser} onBack={() => setPhase('dashboard')} />}
      {phase === 'bankconnect' && bankConnectId && <BankConnectScreen fundraiserId={bankConnectId} user={user} onDone={async () => { if (user?.id) await loadFundraisers(user.id); setBankConnectId(null); setPhase('dashboard'); }} />}
      {phase === 'wizard'    && <SetupWizard    onComplete={(data) => { setWizardPrefill(null); handleWizardComplete(data); }} onCancel={() => { setWizardPrefill(null); setPhase('dashboard'); }} onLaunchPay={handleLaunchPay} onSaveDraft={handleSaveDraft} isFoundingMember={user?.isFoundingMember ?? false} userPrefill={user ? { name: user.name, email: user.email, org: myOrgDetails?.name || user.org || fundraisers[0]?.org || '', orgType: myOrgDetails?.org_type || '', orgAbn: myOrgDetails?.abn || '', plan: user.plan || 'trial', phone: user.phone || fundraisers[0]?.contactPhone || '' } : null} stripeOnboardingComplete={user?.stripeOnboardingComplete ?? false} onBankConnectDone={async () => { if (user?.id) { const p = await fetchProfile(user.id); setUser((prev) => prev ? { ...prev, stripeAccountId: p.stripeAccountId, stripeOnboardingComplete: p.stripeOnboardingComplete } : prev); } }} campaignPrefill={wizardPrefill} />}
      {phase === 'live'      && activeFundraiser && <LiveGrid fundraiser={activeFundraiser} user={user} onBack={() => { if (user?.id) loadFundraisers(user.id); setPhase('dashboard'); }} onDrawComplete={handleDrawComplete} onDelete={handleDelete} onLaunch={handleLaunch} />}

      {/* Post-draw survey modal */}
      {surveyFundraiserId && (
        <SurveyModal
          fundraiserId={surveyFundraiserId}
          ownerId={user?.id}
          onDismiss={() => setSurveyFundraiserId(null)}
        />
      )}

      {/* Referral prompt modal */}
      {showReferralModal && referralInfo?.referral_code && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 24 }}>
          <div className="scratch-card" style={{ padding: 36, maxWidth: 460, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🍀</div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Your fundraiser is live!</h2>
            <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 24, lineHeight: 1.6 }}>
              Know someone else who needs to raise money? Refer them to LuckySquares and when they launch their first campaign, you get your next one free.
            </p>
            <div style={{ background: 'var(--cream)', borderRadius: 12, padding: '14px 16px', marginBottom: 20, display: 'flex', gap: 8, alignItems: 'center' }}>
              <input readOnly value={`${typeof window !== 'undefined' ? window.location.origin : ''}/app?ref=${referralInfo.referral_code}`}
                style={{ flex: 1, fontSize: 12, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'monospace', color: 'var(--text)' }}
                onClick={(e) => e.target.select()} />
              <button className="btn btn-primary btn-sm" onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/app?ref=${referralInfo.referral_code}`);
              }}>Copy</button>
            </div>
            <button className="btn btn-outline" style={{ width: '100%' }} onClick={() => setShowReferralModal(false)}>Maybe later</button>
          </div>
        </div>
      )}
    </div>
  );
}
