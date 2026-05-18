'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Logo from '@/components/ui/Logo';
import { getSupabaseClient, supabaseConfigured } from '@/lib/supabase/client';
import LiveGrid from '@/components/app/LiveGrid';

// ─── constants ────────────────────────────────────────────────────────────────

const GRID_OPTIONS = [
  { size: 100, label: '100 Squares', priceDefault: 10 },
  { size: 50,  label: '50 Squares',  priceDefault: 15 },
  { size: 25,  label: '25 Squares',  priceDefault: 20 },
];

const RESERVE_SECS = 420;
const WARN_SECS    = 390;
const MAX_CART     = 10;

const WIZARD_STEPS = ['Grid Size', 'Pricing', 'Prizes', 'Campaign', 'Draw Rules', 'Payment', 'Review'];

const EMOJIS = ['🍀', '🌈', '🏆', '⚾', '🐨', '🏉', '⭐', '🎯', '💛', '🌺'];

const SAMPLE_FUNDRAISERS = [
  { id: 1, title: 'Koala Rescue Raffle 🐨', org: 'Wildlife Friends', grid: 100, pricePerSq: 10, sold: 63, status: 'active', emoji: '🐨', totalPrizeValue: 800, payment: { method: 'bank', accountName: 'Wildlife Friends Inc', bsb: '062-000', account: '12345678' } },
  { id: 2, title: 'School Fete Lucky Dip 🎪', org: 'Sunbury Primary P&C', grid: 50, pricePerSq: 15, sold: 31, status: 'active', emoji: '🎪', totalPrizeValue: 500, payment: { method: 'stripe' } },
  { id: 3, title: 'Footy Club Finals Fund 🏉', org: 'Werribee Eagles AFC', grid: 25, pricePerSq: 20, sold: 18, status: 'draft', emoji: '🏉', totalPrizeValue: 200, payment: { method: 'bank', accountName: 'Werribee Eagles AFC', bsb: '033-000', account: '87654321' } },
];

// ─── helpers ──────────────────────────────────────────────────────────────────

const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

// Strip HTML tags and trim whitespace from any free-text field before storing
const sanitize = (str) => String(str ?? '').trim().replace(/<[^>]*>/g, '');

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

async function fetchPlan(userId) {
  const { data } = await getSupabaseClient().from('profiles').select('plan').eq('id', userId).single();
  return data?.plan ?? 'trial';
}

function dbToFundraiser(row, soldCount = 0, prizes = []) {
  return {
    id:              row.id,
    title:           row.title,
    org:             row.org,
    description:     row.description || '',
    thankYou:        row.thank_you || '',
    contactName:     row.contact_name || '',
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
      <header style={{ background: 'var(--card)', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 12px rgba(61,46,26,.07)', position: 'sticky', top: 0, zIndex: 100 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <Logo size={40} />
          <div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 900, color: 'var(--text)', letterSpacing: '-.5px' }}>LuckySquares</div>
            <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>Australia</div>
          </div>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user && (
            <>
              <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600 }}>{user.name}</span>
              <button className="btn btn-outline btn-sm" onClick={onHome}>Dashboard</button>
              <button className="btn btn-outline btn-sm" onClick={onLogout}>Sign out</button>
            </>
          )}
        </div>
      </header>
    </>
  );
}

// ─── LoginScreen ──────────────────────────────────────────────────────────────

function LoginScreen({ onLogin, onRegister, loading, error }) {
  const [email, setEmail] = useState('');
  const [pass,  setPass]  = useState('');
  return (
    <div className="dot-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Logo size={72} />
          <h1 className="section-title" style={{ marginTop: 16 }}>Welcome back!</h1>
          <p className="section-sub">Sign in to manage your fundraisers</p>
        </div>
        <div className="scratch-card" style={{ padding: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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
            <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading} onClick={() => onLogin({ email, password: pass })}>
              {loading ? 'Signing in…' : 'Sign in 🍀'}
            </button>
          </div>
          <div className="divider" />
          <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text2)' }}>
            New here?{' '}
            <button onClick={onRegister} style={{ background: 'none', border: 'none', color: 'var(--green)', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>
              Create account →
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── RegisterScreen ───────────────────────────────────────────────────────────

function RegisterScreen({ onRegister, onBack, loading, error }) {
  const [name,  setName]  = useState('');
  const [email, setEmail] = useState('');
  const [org,   setOrg]   = useState('');
  const [pass,  setPass]  = useState('');
  return (
    <div className="dot-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Logo size={72} />
          <h1 className="section-title" style={{ marginTop: 16 }}>Create account</h1>
          <p className="section-sub">Start raising funds in minutes</p>
        </div>
        <div className="scratch-card" style={{ padding: 32 }}>
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
              <input className="form-input" type="email" placeholder="you@example.com" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="8+ characters" maxLength={128} value={pass} onChange={(e) => setPass(e.target.value)} />
            </div>
            {error && <div style={{ padding: '10px 14px', background: '#FFF0F0', border: '1px solid #FFCCCC', borderRadius: 10, fontSize: 13, color: '#CC0000' }}>{error}</div>}
            <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading} onClick={() => onRegister({ name, email, org, password: pass })}>
              {loading ? 'Creating account…' : 'Create account 🎉'}
            </button>
          </div>
          <div className="divider" />
          <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text2)' }}>
            Already have an account?{' '}
            <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--green)', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>
              Sign in →
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── VerifyScreen ─────────────────────────────────────────────────────────────

function VerifyScreen({ email, onVerify, loading, error }) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef([]);

  const handleDigit = useCallback((i, val) => {
    if (!/^\d?$/.test(val)) return;
    setDigits((prev) => { const next = [...prev]; next[i] = val; return next; });
    if (val && i < 5) inputRefs.current[i + 1]?.focus();
  }, []);

  const handleKey = useCallback((i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputRefs.current[i - 1]?.focus();
  }, [digits]);

  return (
    <div className="dot-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 64 }}>📬</div>
          <h1 className="section-title" style={{ marginTop: 16 }}>Check your email</h1>
          <p className="section-sub">We sent a 6-digit code to<br /><strong>{email || 'your email'}</strong></p>
        </div>
        <div className="scratch-card" style={{ padding: 32, textAlign: 'center' }}>
          <div className="verify-digits">
            {digits.map((d, i) => (
              <input key={i} ref={(el) => { inputRefs.current[i] = el; }} className="verify-digit" maxLength={1} value={d}
                onChange={(e) => handleDigit(i, e.target.value)} onKeyDown={(e) => handleKey(i, e)} />
            ))}
          </div>
          {error && <div style={{ margin: '12px 0', padding: '10px 14px', background: '#FFF0F0', border: '1px solid #FFCCCC', borderRadius: 10, fontSize: 13, color: '#CC0000' }}>{error}</div>}
          <button className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 8 }} disabled={loading} onClick={() => onVerify(digits.join(''))}>
            {loading ? 'Verifying…' : 'Verify & continue ✓'}
          </button>
          <button style={{ marginTop: 16, background: 'none', border: 'none', color: 'var(--text2)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            Didn&apos;t get it? Resend code
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

function Dashboard({ user, fundraisers, onNew, onView, onReport, canCreate, planLimit, referralInfo, suspension, orgInfo, sendTxEmail }) {
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
                  You cannot launch new campaigns while your account is suspended. To appeal or get help, contact{' '}
                  <a href="mailto:support@luckysquares.com.au" style={{ color: '#991B1B', fontWeight: 700 }}>support@luckysquares.com.au</a>.
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 className="section-title">G&apos;day, {user?.name?.split(' ')[0] ?? 'there'}! 👋</h1>
            <p className="section-sub">
              {fundraisers.length === 0
                ? "You don't have any active fundraising campaigns yet. Click New fundraiser below to get started."
                : 'Here are your fundraising campaigns'}
            </p>
          </div>
          {canCreate
            ? <button className="btn btn-gold" onClick={onNew}>＋ New fundraiser</button>
            : (
              <div style={{ textAlign: 'right' }}>
                <button className="btn btn-outline" disabled style={{ opacity: .5, cursor: 'not-allowed' }}>＋ New fundraiser</button>
                {!suspension?.suspended && (
                  <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 6 }}>
                    {PLAN_LABELS[user?.plan ?? 'trial']} plan limit of {planLimit} reached.{' '}
                    <Link href="/pricing" style={{ color: 'var(--green)', fontWeight: 700 }}>Upgrade</Link>
                  </p>
                )}
              </div>
            )
          }
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 20, marginTop: 24 }}>
          {fundraisers.map((f) => (
            <FundraiserCard key={f.id} f={f} onView={() => onView(f)} onReport={() => onReport(f)} />
          ))}
          {canCreate && <NewFundraiserCard onClick={onNew} />}
        </div>

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

function FundraiserCard({ f, onView, onReport }) {
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
        <button className="btn btn-primary btn-sm" style={{ width: '100%' }} onClick={onView}>View my campaign →</button>
        <button className="btn btn-outline btn-sm" style={{ width: '100%' }} onClick={onReport}>View campaign report</button>
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
      <div style={{ fontWeight: 800, color: 'var(--text2)' }}>New fundraiser</div>
      <div style={{ fontSize: 13, color: 'var(--muted)' }}>Set up in under 5 minutes</div>
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

  return (
    <div className="dot-bg" style={{ flex: 1 }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>
        <button className="btn btn-outline btn-sm" style={{ marginBottom: 24 }} onClick={onBack}>← Dashboard</button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
          <span style={{ fontSize: 40 }}>{fundraiser.emoji}</span>
          <div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 900, marginBottom: 2 }}>Campaign Report</h1>
            <div style={{ fontSize: 14, color: 'var(--text2)' }}>{fundraiser.title}</div>
          </div>
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

function SetupWizard({ onComplete, onCancel }) {
  const [step,      setStep]      = useState(0);
  const [gridOpt,   setGridOpt]   = useState(GRID_OPTIONS[0]);
  const [price,     setPrice]     = useState('5');
  const [prizes,    setPrizes]    = useState([{ place: '1st', desc: '', value: '', donated: false }, { place: '2nd', desc: '', value: '', donated: false }, { place: '3rd', desc: '', value: '', donated: false }]);
  const [campaign,       setCampaign]       = useState({ title: '', org: '', contactName: '', contactEmail: '', contactPhone: '', description: '', thankYou: '', emoji: '🍀' });
  const [campaignImageUrl,  setCampaignImageUrl]  = useState('');
  const [imageUploading,    setImageUploading]    = useState(false);
  const [drawRules,         setDrawRules]         = useState({ type: 'manual', date: '' });
  const [payment,           setPayment]           = useState({ method: 'inperson', accountName: '', bsb: '', account: '' });
  const [paymentConfirming, setPaymentConfirming] = useState(false);
  const [showLaunchModal,   setShowLaunchModal]   = useState(false);
  const [couponCode,        setCouponCode]        = useState('');
  const [couponState,       setCouponState]       = useState('idle'); // idle | checking | valid | invalid
  const [couponData,        setCouponData]        = useState(null);   // { type, value }

  const PAYMENT_STEP = WIZARD_STEPS.indexOf('Payment');

  const handleImageSelect = async (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Please choose an image under 5 MB.'); return; }
    const preview = URL.createObjectURL(file);
    setCampaignImageUrl(preview);
    if (!supabaseConfigured) return;
    setImageUploading(true);
    const ext  = file.name.split('.').pop().toLowerCase() || 'jpg';
    const path = `uploads/${Date.now()}.${ext}`;
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.storage
      .from('fundraiser-images')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (!error && data) {
      const { data: { publicUrl } } = supabase.storage.from('fundraiser-images').getPublicUrl(data.path);
      setCampaignImageUrl(publicUrl);
    }
    setImageUploading(false);
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

  const closeLaunchModal = () => {
    setShowLaunchModal(false);
    setCouponCode(''); setCouponState('idle'); setCouponData(null);
  };

  const bankComplete = ['bank', 'bank_inperson'].includes(payment.method)
    ? payment.accountName.trim() && payment.bsb.trim() && payment.account.trim()
    : true;

  const canNext = () => {
    if (step === 0) return !!gridOpt;
    if (step === 1) return parseFloat(price) > 0;
    if (step === 2) return prizes.some((p) => p.desc.trim());
    if (step === 3) return campaign.title.trim() && campaign.contactName.trim() && campaign.contactEmail.trim() && campaign.contactPhone.trim();
    if (step === PAYMENT_STEP) return bankComplete;
    return true;
  };

  const stepContent = [
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
            <input className="form-input" type="number" min="1" step="1" value={price} onChange={(e) => setPrice(e.target.value)} style={{ paddingLeft: 36, fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-serif)' }} />
          </div>
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
        return (
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
        );
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
                <input className="form-input" placeholder={i === 0 ? 'e.g. $150 cash' : i === 1 ? 'e.g. Restaurant voucher' : i === 2 ? 'e.g. $25 club drinks tab' : 'Enter prize description'} maxLength={80} value={p.desc} onChange={(e) => { const n = [...prizes]; n[i] = { ...n[i], desc: e.target.value }; setPrizes(n); }} />
              </div>
              <div className="form-group" style={{ width: 120 }}>
                <label className="form-label">Value</label>
                <input className="form-input" placeholder={i === 0 ? '$150' : i === 1 ? '$50' : i === 2 ? '$25' : '$0'} maxLength={20} value={p.value} onChange={(e) => { const n = [...prizes]; n[i] = { ...n[i], value: e.target.value }; setPrizes(n); }} />
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
            <input className="form-input" placeholder="e.g. Help our under 18s get to regionals" maxLength={80} value={campaign.title} onChange={(e) => setCampaign({ ...campaign, title: e.target.value })} />
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
            <input className="form-input" placeholder="Your school, club or charity" maxLength={100} value={campaign.org} onChange={(e) => setCampaign({ ...campaign, org: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input" rows={3} placeholder="Tell your story: why you're fundraising and what the money supports" maxLength={500} value={campaign.description} onChange={(e) => setCampaign({ ...campaign, description: e.target.value })} style={{ resize: 'vertical' }} />
          </div>
          <div className="form-group">
            <label className="form-label">Campaign photo <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 400 }}>(optional)</span></label>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>Show supporters what they are fundraising for</div>
            {campaignImageUrl ? (
              <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1.5px solid var(--border)' }}>
                <img src={campaignImageUrl} alt="Campaign" style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }} />
                {imageUploading && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700 }}>
                    Uploading...
                  </div>
                )}
                {!imageUploading && (
                  <button onClick={() => setCampaignImageUrl('')} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,.55)', color: '#fff', border: 'none', borderRadius: 8, padding: '4px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                    Remove
                  </button>
                )}
              </div>
            ) : (
              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '28px 20px', border: '2px dashed var(--border2)', borderRadius: 12, cursor: 'pointer', background: 'var(--cream)', transition: 'border-color .15s' }}>
                <span style={{ fontSize: 32 }}>📷</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text2)' }}>Tap to upload a photo</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>JPG, PNG or WEBP · max 5 MB</span>
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
          { method: 'stripe',        icon: '💳', title: 'Online card payment',            desc: 'Buyers pay securely by card. A 1.75% + 30c processing fee is added to the buyer total. Funds transferred to your bank after the draw.' },
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
            After saving your fundraiser, you&apos;ll connect your bank account from your dashboard. This takes about 2 minutes and only needs to be done once. Funds are transferred directly to your bank after the draw.
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
            ['Payment',          payment.method === 'bank'          ? `Bank transfer${payment.bsb ? ` (BSB: ${payment.bsb})` : ''}`
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
  ];

  return (
    <div className="dot-bg" style={{ minHeight: '100vh' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <button className="btn btn-outline btn-sm" onClick={onCancel}>← Back</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5 }}>Step {step + 1} of {WIZARD_STEPS.length}</div>
            <div style={{ fontSize: 14, fontWeight: 800 }}>{WIZARD_STEPS[step]}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 32, flexWrap: 'wrap' }}>
          {WIZARD_STEPS.map((s, i) => (
            <div key={i} className={`step-dot ${i < step ? 'done' : i === step ? 'active' : 'future'}`} onClick={() => i < step && setStep(i)} style={{ cursor: i < step ? 'pointer' : 'default' }} title={s}>
              {i < step ? '✓' : i + 1}
            </div>
          ))}
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

        <div style={{ display: 'flex', gap: 12, marginTop: 32, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={() => {
            if (paymentConfirming) { setPaymentConfirming(false); return; }
            step > 0 ? setStep((s) => s - 1) : onCancel();
          }}>
            {paymentConfirming ? '← Edit details' : step === 0 ? 'Cancel' : '← Back'}
          </button>
          {paymentConfirming ? (
            <button className="btn btn-primary btn-lg" onClick={() => { setPaymentConfirming(false); setStep((s) => s + 1); }}>
              ✓ Yes, details are correct
            </button>
          ) : step < WIZARD_STEPS.length - 1 ? (
            <button className="btn btn-primary" disabled={!canNext()} onClick={() => {
              if (step === PAYMENT_STEP && ['bank', 'bank_inperson'].includes(payment.method)) { setPaymentConfirming(true); return; }
              setStep((s) => s + 1);
            }}>Next →</button>
          ) : (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-outline" onClick={() => onComplete({ gridOpt, price, prizes, campaign, campaignImageUrl, drawRules, payment }, true)}>
                Save as draft
              </button>
              <button className="btn btn-gold btn-lg" style={{ flexDirection: 'column', gap: 2, lineHeight: 1.2 }} onClick={() => setShowLaunchModal(true)}>
                <span>🚀 Launch fundraiser</span>
                <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.8 }}>
                  {couponState === 'valid' && couponData
                    ? (() => {
                        const base = PLATFORM_FEES[gridOpt?.size || 100];
                        const final = couponData.type === 'percent' ? Math.max(0, base * (1 - couponData.value / 100)) : Math.max(0, base - couponData.value);
                        return final === 0 ? 'Free with coupon' : `$${final.toFixed(2)} with coupon`;
                      })()
                    : `Requires payment of $${PLATFORM_FEES[gridOpt?.size || 100]}`}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Launch payment modal */}
      {showLaunchModal && (() => {
        const baseFee   = PLATFORM_FEES[gridOpt?.size || 100];
        const finalFee  = couponState === 'valid' && couponData
          ? couponData.type === 'percent' ? Math.max(0, baseFee * (1 - couponData.value / 100)) : Math.max(0, baseFee - couponData.value)
          : baseFee;
        const isFree    = finalFee === 0;
        const fmt       = (n) => Number.isInteger(n) ? String(n) : n.toFixed(2);
        const doLaunch  = async () => {
          if (couponState === 'valid' && couponCode.trim() && supabaseConfigured) {
            await getSupabaseClient().rpc('redeem_coupon', { p_code: couponCode.trim().toUpperCase() });
          }
          closeLaunchModal();
          onComplete({ gridOpt, price, prizes, campaign, campaignImageUrl, drawRules, payment, coupon: couponState === 'valid' ? couponCode.trim().toUpperCase() : null }, false);
        };
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
            <div className="scratch-card" style={{ padding: 36, maxWidth: 440, width: '100%', textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🚀</div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Launch your fundraiser</h2>
              <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 24, lineHeight: 1.6 }}>
                A one-off platform fee applies to go live. Once paid, your fundraiser is active and buyers can start purchasing squares immediately.
              </p>

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
                        {couponData.type === 'percent' ? `−${couponData.value}%` : `−$${fmt(couponData.value)}`}
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
                      {couponState === 'checking' ? '…' : 'Apply'}
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#D4F5E9', borderRadius: 10, padding: '10px 14px' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>✓ Coupon applied</span>
                    <button onClick={() => { setCouponCode(''); setCouponState('idle'); setCouponData(null); }} style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'inherit' }}>Remove</button>
                  </div>
                )}
                {couponState === 'invalid' && (
                  <p style={{ fontSize: 12, color: '#CC0000', marginTop: 6, textAlign: 'left' }}>Invalid or expired coupon code.</p>
                )}
              </div>


              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-outline" style={{ flex: 1 }} onClick={closeLaunchModal}>Cancel</button>
                <button className="btn btn-gold btn-lg" style={{ flex: 2 }} onClick={doLaunch}>
                  {isFree ? '🚀 Launch free →' : 'Pay & launch →'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
// ─── FundraiseApp (root) ──────────────────────────────────────────────────────

export default function FundraiseApp() {
  const [phase,            setPhase]            = useState('loading');
  const [user,             setUser]             = useState(null);
  const [pendingEmail,     setPendingEmail]     = useState('');
  const [fundraisers,      setFundraisers]      = useState([]);
  const [activeFundraiser, setActiveFundraiser] = useState(null);
  const [authLoading,      setAuthLoading]      = useState(false);
  const [authError,        setAuthError]        = useState('');
  const [referralInfo,      setReferralInfo]      = useState(null);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [suspension,        setSuspension]        = useState(null); // null | { suspended: true, reason }
  const [orgInfo,           setOrgInfo]           = useState(null); // null | { role, org_user_id, org_name }

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

  useEffect(() => {
    if (!supabaseConfigured) { setPhase('login'); return; }
    const supabase = getSupabaseClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const u = session.user;
        const supabase = getSupabaseClient();
        const plan = await fetchPlan(u.id);
        setUser({ id: u.id, name: u.user_metadata?.full_name || u.email, email: u.email, org: u.user_metadata?.organisation || '', plan });
        // Load org role (contributor or admin)
        const { data: oi } = await supabase.rpc('get_my_org_info');
        setOrgInfo(oi);
        const fundraiserOwnerId = oi?.role === 'contributor' ? oi.org_user_id : u.id;
        loadFundraisers(fundraiserOwnerId);
        loadReferralInfo();
        // Check suspension status
        supabase.rpc('get_my_suspension_status').then(({ data: s }) => {
          if (s?.[0]?.suspended) setSuspension({ suspended: true, reason: s[0].suspension_reason });
        });
        setPhase('dashboard');
      } else {
        setPhase('login');
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
    const plan = await fetchPlan(u.id);
    setUser({ id: u.id, name: u.user_metadata?.full_name || u.email, email: u.email, org: u.user_metadata?.organisation || '', plan });
    await loadFundraisers(u.id);
    setPhase('dashboard');
  };

  const handleRegister = async ({ name, email, org, password }) => {
    setAuthError('');
    if (!supabaseConfigured) { setPendingEmail(email); setPhase('verify'); return; }
    setAuthLoading(true);
    const { data, error } = await getSupabaseClient().auth.signUp({ email, password, options: { data: { full_name: name, organisation: org } } });
    setAuthLoading(false);
    if (error) { setAuthError(error.message); return; }
    // If email confirmation is disabled, user is auto-confirmed with a session
    if (data?.session && data?.user) {
      const u = data.user;
      const plan = await fetchPlan(u.id);
      const firstName = name?.split(' ')[0] || u.email;
      setUser({ id: u.id, name: u.user_metadata?.full_name || u.email, email: u.email, org: u.user_metadata?.organisation || '', plan });
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
    const plan = await fetchPlan(u.id);
    const firstName = u.user_metadata?.full_name?.split(' ')[0] || u.email;
    setUser({ id: u.id, name: u.user_metadata?.full_name || u.email, email: u.email, org: u.user_metadata?.organisation || '', plan });
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

  const handleDrawComplete = useCallback((fundraiserId) => {
    setFundraisers((prev) => prev.map((f) => f.id === fundraiserId ? { ...f, status: 'drawn' } : f));
    setActiveFundraiser((prev) => prev?.id === fundraiserId ? { ...prev, status: 'drawn' } : prev);
  }, []);

  const handleLaunch = useCallback((fundraiserId) => {
    setFundraisers((prev) => prev.map((f) => f.id === fundraiserId ? { ...f, status: 'active' } : f));
    setActiveFundraiser((prev) => prev?.id === fundraiserId ? { ...prev, status: 'active' } : prev);
  }, []);

  const handleLogout = async () => {
    if (supabaseConfigured) await getSupabaseClient().auth.signOut();
    setUser(null); setFundraisers([]); setPhase('login');
  };

  const handleViewGrid   = (f) => { setActiveFundraiser(f); setPhase('live'); };
  const handleViewReport = (f) => { setActiveFundraiser(f); setPhase('report'); };

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
      const { data: saved, error } = await getSupabaseClient()
        .from('fundraisers')
        .insert({
          owner_id: user.id, title: sanitize(nf.title), org: sanitize(nf.org) || null,
          contact_name: sanitize(data.campaign.contactName) || null,
          contact_email: sanitize(data.campaign.contactEmail) || null,
          contact_phone: sanitize(data.campaign.contactPhone) || null,
          emoji: nf.emoji, image_url: data.campaignImageUrl || null, description: sanitize(data.campaign.description), thank_you: sanitize(data.campaign.thankYou),
          grid_size: nf.grid, price_per_sq: nf.pricePerSq, status: nf.status,
          launched_at: nf.status === 'active' ? new Date().toISOString() : null,
          draw_type: data.drawRules.type, draw_date: data.drawRules.date || null,
          payment_method: data.payment.method, bank_account_name: sanitize(data.payment.accountName) || null,
          bank_bsb: sanitize(data.payment.bsb) || null, bank_account: sanitize(data.payment.account) || null,
        })
        .select().single();
      if (!error && saved) {
        nf.id = saved.id;
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
      const campaignUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://luckysquares.com.au'}/f/${nf.id}`;
      const firstName = user.name?.split(' ')[0] || 'there';
      sendTxEmail('campaign_launched', user.email, {
        first_name: firstName,
        campaign_title: nf.title,
        campaign_url: campaignUrl,
      });
      if (supabaseConfigured && user?.id) {
        getSupabaseClient().rpc('check_referral_reward', { p_user_id: user.id });
        loadReferralInfo();
        setShowReferralModal(true);
      }
    }
  };

  const showHeader = !['login', 'register', 'verify', 'loading'].includes(phase);

  const activeCampaignCount = fundraisers.filter((f) => ['draft', 'active'].includes(f.status)).length;
  const planLimit           = PLAN_LIMITS[user?.plan ?? 'trial'];
  const isSuspended         = suspension?.suspended === true;
  const isContributor       = orgInfo?.role === 'contributor';
  const canCreate           = activeCampaignCount < planLimit && !isSuspended && !isContributor;

  const handleNewFundraiser = () => {
    if (!canCreate) return;
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {showHeader && <AppHeader user={user} onLogout={handleLogout} onHome={() => setPhase('dashboard')} />}
      {phase === 'login'     && <LoginScreen    onLogin={handleLogin}        onRegister={() => { setAuthError(''); setPhase('register'); }} loading={authLoading} error={authError} />}
      {phase === 'register'  && <RegisterScreen onRegister={handleRegister}  onBack={() => { setAuthError(''); setPhase('login'); }} loading={authLoading} error={authError} />}
      {phase === 'verify'    && <VerifyScreen   email={pendingEmail}         onVerify={handleVerify} loading={authLoading} error={authError} />}
      {phase === 'dashboard' && user && <Dashboard user={user} fundraisers={fundraisers} onNew={handleNewFundraiser} onView={handleViewGrid} onReport={handleViewReport} canCreate={canCreate} planLimit={planLimit} referralInfo={referralInfo} suspension={suspension} orgInfo={orgInfo} sendTxEmail={sendTxEmail} />}
      {phase === 'report'    && activeFundraiser && <CampaignReport fundraiser={activeFundraiser} onBack={() => setPhase('dashboard')} />}
      {phase === 'wizard'    && <SetupWizard    onComplete={handleWizardComplete} onCancel={() => setPhase('dashboard')} />}
      {phase === 'live'      && activeFundraiser && <LiveGrid fundraiser={activeFundraiser} user={user} onBack={() => { if (user?.id) loadFundraisers(user.id); setPhase('dashboard'); }} onDrawComplete={handleDrawComplete} onDelete={handleDelete} onLaunch={handleLaunch} />}

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
