'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import Link from 'next/link';
import MarketingNav from '@/components/marketing/MarketingNav';

const ORG_TYPES = ['School / P&C', 'Sporting club', 'Community group', 'Charity / NFP', 'Church / faith group', 'Other'];

function validateAbn(raw) {
  const d = raw.replace(/\s/g, '');
  if (d.length !== 11 || !/^\d+$/.test(d)) return { valid: false, digits: d };
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  const digits = d.split('').map(Number);
  digits[0] -= 1;
  const sum = digits.reduce((s, n, i) => s + n * weights[i], 0);
  return { valid: sum % 89 === 0, digits: d };
}

function sanitize(s) { return (s || '').replace(/<[^>]*>/g, '').trim(); }

export default function UpgradeToOrgPage() {
  const [user,     setUser]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [step,     setStep]     = useState('form'); // form | submitted

  const [orgName,  setOrgName]  = useState('');
  const [abn,      setAbn]      = useState('');
  const [orgType,  setOrgType]  = useState('');
  const [street,   setStreet]   = useState('');
  const [suburb,   setSuburb]   = useState('');
  const [orgState, setOrgState] = useState('');
  const [postcode, setPostcode] = useState('');
  const [phone,    setPhone]    = useState('');

  const [error,    setError]    = useState('');
  const [saving,   setSaving]   = useState(false);

  const [abnTouched, setAbnTouched] = useState(false);
  const abnVal = validateAbn(abn);

  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = '/fundraise'; return; }
      setUser({ id: session.user.id, name: session.user.user_metadata?.full_name || '', email: session.user.email });
      setLoading(false);
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!orgName.trim()) { setError('Organisation name is required.'); return; }
    if (!abnVal.valid)    { setError('Please enter a valid 11-digit ABN.'); return; }
    if (!orgType)         { setError('Please select an organisation type.'); return; }

    setSaving(true);
    try {
      const appRes = await fetch('/api/org-application', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id:      user.id,
          org_name:     sanitize(orgName),
          abn:          abnVal.digits,
          org_type:     orgType,
          street:       sanitize(street),
          suburb:       sanitize(suburb),
          state:        orgState,
          postcode:     postcode.replace(/\D/g, '').slice(0, 4),
          contact_name: sanitize(user.name),
          email:        user.email,
          phone:        sanitize(phone),
        }),
      });

      if (!appRes.ok) {
        const { error: appErr } = await appRes.json().catch(() => ({}));
        setError(appErr || 'Something went wrong. Please try again.');
        setSaving(false);
        return;
      }

      await fetch('/api/org-application-notify', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name:    (user.name || '').split(' ')[0] || 'there',
          org_name:      sanitize(orgName),
          abn:           abnVal.digits,
          org_type:      orgType,
          contact_name:  sanitize(user.name),
          contact_email: user.email,
          suburb:        sanitize(suburb),
          state:         orgState,
        }),
      }).catch(() => {});

      window.location.href = '/org-next-steps';
    } catch {
      setError('Something went wrong. Please try again.');
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <>
      <MarketingNav />
      <section className="section dot-bg" style={{ paddingTop: 60, paddingBottom: 80 }}>
        <div className="section-inner" style={{ maxWidth: 600 }}>

          <div style={{ marginBottom: 32 }}>
            <Link href="/fundraise" style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 700, textDecoration: 'none' }}>← Back to dashboard</Link>
          </div>

          <div style={{ marginBottom: 32 }}>
            <div className="section-label">Organisation Plan</div>
            <h1 className="section-heading" style={{ margin: '8px 0 12px' }}>Upgrade your account</h1>
            <p className="section-body" style={{ margin: 0 }}>
              You are applying to upgrade <strong>{user?.email}</strong> to the Organisation Plan.
              No new account needed — we will review your application and upgrade your existing account.
            </p>
          </div>

          {/* Benefits */}
          <div style={{ background: 'linear-gradient(135deg,#f5f0ff,#ede8ff)', border: '1.5px solid #d4c6ff', borderRadius: 'var(--radius)', padding: '18px 22px', marginBottom: 32 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--purple)', marginBottom: 10 }}>What you get on the Organisation Plan</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {['Up to 10 concurrent campaigns', 'Team member management', 'Priority support', '$149/year'].map((b) => (
                <div key={b} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: 'var(--text)' }}>
                  <span style={{ color: 'var(--purple)', fontWeight: 900 }}>✓</span> {b}
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Organisation name</label>
              <input className="form-input" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="e.g. Sunbury United FC" required />
            </div>

            <div className="form-group">
              <label className="form-label">ABN</label>
              <input
                className="form-input"
                value={abn}
                onChange={(e) => setAbn(e.target.value)}
                onBlur={() => setAbnTouched(true)}
                placeholder="e.g. 51 824 753 556"
                maxLength={14}
                style={{ borderColor: abnTouched && abn.replace(/\s/g,'').length === 11 && !abnVal.valid ? '#E53E3E' : undefined }}
              />
              {abnTouched && abn.replace(/\s/g,'').length === 11 && !abnVal.valid && (
                <p style={{ fontSize: 12, color: '#CC0000', marginTop: 4 }}>Invalid ABN — please check and try again.</p>
              )}
              {abnVal.valid && <p style={{ fontSize: 12, color: 'var(--green)', marginTop: 4 }}>✓ Valid ABN</p>}
            </div>

            <div className="form-group">
              <label className="form-label">Organisation type</label>
              <select className="form-input" value={orgType} onChange={(e) => setOrgType(e.target.value)} required>
                <option value="">Select type...</option>
                {ORG_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Street address</label>
              <input className="form-input" value={street} onChange={(e) => setStreet(e.target.value)} placeholder="123 Main Street" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, marginBottom: 20 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Suburb</label>
                <input className="form-input" value={suburb} onChange={(e) => setSuburb(e.target.value)} placeholder="Suburb" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">State</label>
                <select className="form-input" value={orgState} onChange={(e) => setOrgState(e.target.value)}>
                  <option value="">State</option>
                  {['NSW','VIC','QLD','SA','WA','TAS','ACT','NT'].map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0, width: 90 }}>
                <label className="form-label">Postcode</label>
                <input className="form-input" value={postcode} onChange={(e) => setPostcode(e.target.value.replace(/\D/g,'').slice(0,4))} placeholder="0000" maxLength={4} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Phone number</label>
              <input className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 0412 345 678" type="tel" />
            </div>

            {error && <p style={{ fontSize: 13, color: '#CC0000', marginBottom: 16 }}>{error}</p>}

            <button type="submit" className="btn btn-purple btn-lg" disabled={saving} style={{ width: '100%', justifyContent: 'center' }}>
              {saving ? 'Submitting...' : 'Submit application →'}
            </button>

            <p style={{ fontSize: 12, color: 'var(--text2)', textAlign: 'center', marginTop: 16, lineHeight: 1.6 }}>
              We review all applications within 1 business day. Your current account remains active while we review.
            </p>
          </form>

        </div>
      </section>
    </>
  );
}
