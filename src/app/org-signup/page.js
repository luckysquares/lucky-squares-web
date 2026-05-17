'use client';

import { useState } from 'react';
import Link from 'next/link';
import MarketingNav from '@/components/marketing/MarketingNav';
import Logo from '@/components/ui/Logo';
import { getSupabaseClient, supabaseConfigured } from '@/lib/supabase/client';

const sanitize = (str) => String(str ?? '').trim().replace(/<[^>]*>/g, '');

// ABN validation per ATO algorithm
function validateAbn(raw) {
  const digits = raw.replace(/\s/g, '');
  if (!/^\d{11}$/.test(digits)) return false;
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  const adjusted = digits.split('').map((d, i) => (i === 0 ? Number(d) - 1 : Number(d)));
  const sum = adjusted.reduce((acc, d, i) => acc + d * weights[i], 0);
  return sum % 89 === 0;
}

function formatAbn(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
}

const ORG_TYPES = [
  'Sporting club',
  'School / P&C',
  'Charity / NFP',
  'Community group',
  'Religious organisation',
  'Other',
];

const STATES = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'];

const FEATURES = [
  'Run unlimited Lucky Squares campaigns per year',
  'Up to 10 live campaigns simultaneously',
  'All payment methods (in person, bank transfer, secure online)',
  'Real-time reservations and live draw',
  'Notify buyers of results',
  'Multi-user access',
  'Organisation branding',
  'Priority support',
  'Early access to new features',
];

export default function OrgSignupPage() {
  const [step, setStep] = useState('form'); // 'form' | 'submitted'

  const [orgName,        setOrgName]        = useState('');
  const [abn,            setAbn]            = useState('');
  const [orgType,        setOrgType]        = useState('');
  const [street,         setStreet]         = useState('');
  const [suburb,         setSuburb]         = useState('');
  const [state,          setState]          = useState('');
  const [postcode,       setPostcode]       = useState('');
  const [name,           setName]           = useState('');
  const [email,          setEmail]          = useState('');
  const [phone,          setPhone]          = useState('');
  const [password,       setPassword]       = useState('');
  const [confirm,        setConfirm]        = useState('');
  const [agreed,         setAgreed]         = useState(false);
  const [agreedFairPlay, setAgreedFairPlay] = useState(false);

  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [abnExists,   setAbnExists]   = useState(false);
  const [abnChecking, setAbnChecking] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [emailChecking, setEmailChecking] = useState(false);

  const abnDigits  = abn.replace(/\s/g, '');
  const abnValid   = abnDigits.length === 11 && validateAbn(abn);
  const abnTouched = abnDigits.length > 0;

  const checkAbn = async () => {
    if (!abnValid || !supabaseConfigured) return;
    setAbnChecking(true);
    const { data } = await getSupabaseClient().rpc('org_abn_exists', { p_abn: abnDigits });
    setAbnExists(!!data);
    setAbnChecking(false);
  };

  const checkEmail = async () => {
    if (!email.trim() || !supabaseConfigured) return;
    setEmailChecking(true);
    const { data } = await getSupabaseClient().rpc('org_email_exists', { p_email: email.trim().toLowerCase() });
    setEmailExists(!!data);
    setEmailChecking(false);
  };

  const canSubmit =
    orgName.trim() && abnValid && !abnExists && orgType &&
    street.trim() && suburb.trim() && state && postcode.trim() &&
    name.trim() && email.trim() && !emailExists && phone.trim() &&
    password.length >= 8 && password === confirm && agreed && agreedFairPlay;

  const handleSubmit = async () => {
    setError('');
    if (!canSubmit) return;

    setLoading(true);
    try {
      if (supabaseConfigured) {
        const supabase = getSupabaseClient();

        // Create auth account
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: name.trim(), organisation: orgName.trim() },
          },
        });

        if (authError) {
          const msg = authError.message.toLowerCase();
          if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('email address is already')) {
            setEmailExists(true);
            setError('An account with this email address already exists. Please sign in or use a different email.');
          } else {
            setError(authError.message);
          }
          setLoading(false);
          return;
        }

        // Store application details
        const { error: appError } = await supabase.from('org_applications').insert({
          user_id:      authData.user?.id ?? null,
          org_name:     sanitize(orgName),
          abn:          abnDigits,
          org_type:     sanitize(orgType),
          street:       sanitize(street),
          suburb:       sanitize(suburb),
          state:        sanitize(state),
          postcode:     postcode.replace(/\D/g, '').slice(0, 4),
          contact_name: sanitize(name),
          email:        sanitize(email),
          phone:        sanitize(phone),
        });

        if (appError) {
          setError('Account created but we could not save your application details. Please email support@luckysquares.com.au.');
          setLoading(false);
          return;
        }
      }

      setStep('submitted');
    } catch (e) {
      setError('Something went wrong. Please try again or contact support@luckysquares.com.au.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'submitted') {
    return (
      <>
        <MarketingNav />
        <section className="section dot-bg" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center' }}>
          <div className="section-inner" style={{ maxWidth: 560, textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
            <h1 className="section-heading" style={{ margin: '0 auto 16px' }}>Application submitted!</h1>
            <p className="section-body" style={{ margin: '0 auto 24px' }}>
              Thanks, {name.split(' ')[0]}. We have received your Organisation plan application for{' '}
              <strong>{orgName}</strong>.
            </p>
            <div className="scratch-card" style={{ padding: 28, textAlign: 'left', marginBottom: 32 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 14 }}>
                <Row label="What happens next">
                  We will verify your ABN and review your application. You will hear from us within 1 business day.
                </Row>
                <Row label="In the meantime">
                  Check your inbox for a confirmation email and click the link to verify your account. You can start
                  exploring the platform on the Trial plan straight away.
                </Row>
                <Row label="Questions">
                  Email us at{' '}
                  <a href="mailto:support@luckysquares.com.au" style={{ color: 'var(--green)', fontWeight: 700 }}>
                    support@luckysquares.com.au
                  </a>
                </Row>
              </div>
            </div>
            <Link href="/fundraise" className="btn btn-primary">Go to the app →</Link>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <MarketingNav />

      <section className="section dot-bg" style={{ paddingTop: 72, paddingBottom: 24 }}>
        <div className="section-inner" style={{ textAlign: 'center' }}>
          <div className="section-label">Organisation plan</div>
          <h1 className="section-heading" style={{ margin: '0 auto 12px' }}>Register your organisation</h1>
          <p className="section-body" style={{ margin: '0 auto' }}>
            $149 / year for UNLIMITED LuckySquares fundraising campaigns
          </p>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--cream)', paddingTop: 0 }}>
        <div className="section-inner">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 48, maxWidth: 1000, margin: '0 auto', alignItems: 'start' }}>

            {/* Left: benefits */}
            <div style={{ position: 'sticky', top: 100 }}>
              <div className="scratch-card" style={{ padding: 32 }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 900, marginBottom: 4 }}>
                  Organisation plan
                </div>
                <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--text)', marginBottom: 4 }}>
                  $149 <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text2)' }}>/year</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 24 }}>Inclusive of GST</div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {FEATURES.map((f) => (
                    <li key={f} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14 }}>
                      <span style={{ color: 'var(--green)', fontWeight: 900, marginTop: 1, flexShrink: 0 }}>✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <div style={{ marginTop: 24, padding: '14px 16px', background: 'var(--cream)', borderRadius: 10, fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
                  <strong style={{ color: 'var(--text)' }}>Fair play note:</strong> One Organisation account per organisation.
                  We verify ABNs to ensure the plan is used as intended.
                </div>
              </div>
            </div>

            {/* Right: form */}
            <div>
              <div className="scratch-card" style={{ padding: '32px 36px' }}>

                {/* Section: Organisation */}
                <SectionHeading>Your organisation</SectionHeading>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
                  <div className="form-group">
                    <label className="form-label">Organisation name <Req /></label>
                    <input
                      className="form-input"
                      placeholder="e.g. Tibooburra Eagles AFC"
                      maxLength={120}
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      ABN <Req />
                      <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0, marginLeft: 6 }}>
                        (Australian Business Number)
                      </span>
                    </label>
                    <input
                      className="form-input"
                      placeholder="XX XXX XXX XXX"
                      maxLength={14}
                      value={abn}
                      onChange={(e) => { setAbn(formatAbn(e.target.value)); setAbnExists(false); }}
                      onBlur={checkAbn}
                      style={{
                        borderColor: abnTouched ? (abnExists || !abnValid ? '#FF4444' : '#00C875') : undefined,
                      }}
                    />
                    {abnTouched && !abnValid && (
                      <span style={{ fontSize: 12, color: '#CC0000' }}>Please enter a valid 11-digit ABN.</span>
                    )}
                    {abnValid && abnChecking && (
                      <span style={{ fontSize: 12, color: 'var(--text2)' }}>Checking…</span>
                    )}
                    {abnValid && !abnChecking && abnExists && (
                      <span style={{ fontSize: 12, color: '#CC0000' }}>This ABN is already registered. If this is your organisation, please <a href="/fundraise" style={{ color: '#CC0000', fontWeight: 700 }}>sign in</a> or contact support@luckysquares.com.au.</span>
                    )}
                    {abnValid && !abnChecking && !abnExists && (
                      <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 700 }}>ABN format valid ✓</span>
                    )}
                    <span style={{ fontSize: 12, color: 'var(--text2)' }}>
                      Don&apos;t know your organisation&apos;s ABN?{' '}
                      <a href="https://www.abr.business.gov.au" target="_blank" rel="noreferrer" style={{ color: 'var(--green)', fontWeight: 700 }}>
                        Look up on abr.business.gov.au
                      </a>
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="form-group">
                      <label className="form-label">Organisation type <Req /></label>
                      <select className="form-input" value={orgType} onChange={(e) => setOrgType(e.target.value)}>
                        <option value="">Select type</option>
                        {ORG_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Street address <Req /></label>
                    <input
                      className="form-input"
                      placeholder="e.g. 123 Main Street"
                      maxLength={120}
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16 }}>
                    <div className="form-group">
                      <label className="form-label">Suburb <Req /></label>
                      <input
                        className="form-input"
                        placeholder="e.g. Tibooburra"
                        maxLength={80}
                        value={suburb}
                        onChange={(e) => setSuburb(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">State <Req /></label>
                      <select className="form-input" value={state} onChange={(e) => setState(e.target.value)}>
                        <option value="">Select</option>
                        {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Postcode <Req /></label>
                      <input
                        className="form-input"
                        placeholder="e.g. 2880"
                        maxLength={4}
                        value={postcode}
                        onChange={(e) => setPostcode(e.target.value.replace(/\D/g, ''))}
                      />
                    </div>
                  </div>
                </div>

                {/* Section: Primary contact */}
                <SectionHeading>Primary contact</SectionHeading>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
                  <div className="form-group">
                    <label className="form-label">Full name <Req /></label>
                    <input
                      className="form-input"
                      placeholder="e.g. Jane Smith"
                      maxLength={80}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="form-group">
                      <label className="form-label">Email address <Req /></label>
                      <input
                        className="form-input"
                        type="email"
                        placeholder="e.g. jane@club.org.au"
                        maxLength={254}
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setEmailExists(false); }}
                        onBlur={checkEmail}
                        style={{ borderColor: emailExists ? '#FF4444' : undefined }}
                      />
                      {emailChecking && (
                        <span style={{ fontSize: 12, color: 'var(--text2)' }}>Checking…</span>
                      )}
                      {!emailChecking && emailExists && (
                        <span style={{ fontSize: 12, color: '#CC0000' }}>An application with this email already exists. Please <a href="/fundraise" style={{ color: '#CC0000', fontWeight: 700 }}>sign in</a> or contact support@luckysquares.com.au.</span>
                      )}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phone number <Req /></label>
                      <input
                        className="form-input"
                        type="tel"
                        placeholder="e.g. 04XX XXX XXX"
                        maxLength={20}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Section: Account */}
                <SectionHeading>Create your account</SectionHeading>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="form-group">
                      <label className="form-label">Password <Req /></label>
                      <input
                        className="form-input"
                        type="password"
                        placeholder="8+ characters"
                        maxLength={128}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Confirm password <Req /></label>
                      <input
                        className="form-input"
                        type="password"
                        placeholder="Repeat password"
                        maxLength={128}
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        style={{
                          borderColor: confirm.length > 0 ? (password === confirm ? '#00C875' : '#FF4444') : undefined,
                        }}
                      />
                      {confirm.length > 0 && password !== confirm && (
                        <span style={{ fontSize: 12, color: '#CC0000' }}>Passwords do not match.</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Terms */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
                  <label style={{ display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer', fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }}>
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      style={{ marginTop: 3, flexShrink: 0, width: 16, height: 16, accentColor: 'var(--green)', cursor: 'pointer' }}
                    />
                    <span>
                      I confirm this is a legitimate community organisation and I agree to the{' '}
                      <Link href="/terms" target="_blank" style={{ color: 'var(--green)', fontWeight: 700 }}>Terms of Service</Link>
                      {' '}and{' '}
                      <Link href="/participant-terms" target="_blank" style={{ color: 'var(--green)', fontWeight: 700 }}>Participant Terms</Link>.
                    </span>
                  </label>
                  <label style={{ display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer', fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }}>
                    <input
                      type="checkbox"
                      checked={agreedFairPlay}
                      onChange={(e) => setAgreedFairPlay(e.target.checked)}
                      style={{ marginTop: 3, flexShrink: 0, width: 16, height: 16, accentColor: 'var(--green)', cursor: 'pointer' }}
                    />
                    <span>
                      I have read and agree to the{' '}
                      <Link href="/terms#fair-play" target="_blank" style={{ color: 'var(--green)', fontWeight: 700 }}>Fair Play policy</Link>.
                      I understand that one Organisation account is permitted per ABN and that this account may not be
                      shared with affiliated clubs, branches, or other organisations.
                    </span>
                  </label>
                </div>

                {error && (
                  <div style={{ padding: '12px 16px', background: '#FFF0F0', border: '1.5px solid #FFCCCC', borderRadius: 12, fontSize: 13, color: '#CC0000', marginBottom: 20 }}>
                    {error}
                  </div>
                )}

                <button
                  className="btn btn-gold btn-lg"
                  style={{ width: '100%', justifyContent: 'center', opacity: canSubmit ? 1 : .5, cursor: canSubmit ? 'pointer' : 'not-allowed' }}
                  onClick={handleSubmit}
                  disabled={loading || !canSubmit}
                >
                  {loading ? 'Submitting…' : 'Submit application →'}
                </button>

                <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text2)', marginTop: 16 }}>
                  Already have an account?{' '}
                  <Link href="/fundraise" style={{ color: 'var(--green)', fontWeight: 700 }}>Sign in</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function SectionHeading({ children }) {
  return (
    <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 900, color: 'var(--text)', marginBottom: 14, paddingBottom: 10, borderBottom: '1.5px solid var(--border)' }}>
      {children}
    </h2>
  );
}

function Req() {
  return <span style={{ color: 'var(--green)', marginLeft: 2 }}>*</span>;
}

function Row({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: .8, color: 'var(--text2)' }}>{label}</span>
      <span style={{ color: 'var(--text)', lineHeight: 1.6 }}>{children}</span>
    </div>
  );
}
