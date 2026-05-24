'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';

export default function ClaimPrizePage({ params }) {
  const { token }             = use(params);
  const [status, setStatus]   = useState('loading'); // loading | found | already_claimed | not_found | success | error
  const [claim, setClaim]     = useState(null);
  const [form, setForm]       = useState({ account_name: '', bsb: '', account_number: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError]   = useState('');

  // Fetch claim details on mount
  useEffect(() => {
    fetch(`/api/claim-prize/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error === 'Claim not found') {
          setStatus('not_found');
        } else if (data.status === 'claimed' || data.status === 'purged') {
          setClaim(data);
          setStatus('already_claimed');
        } else if (data.status === 'pending') {
          setClaim(data);
          // Pre-fill account name with winner's name as a convenience
          setForm((f) => ({ ...f, account_name: data.buyer_name ?? '' }));
          setStatus('found');
        } else {
          setStatus('not_found');
        }
      })
      .catch(() => setStatus('not_found'));
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const res = await fetch(`/api/claim-prize/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_name:   form.account_name.trim(),
          bsb:            form.bsb.trim(),
          account_number: form.account_number.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Something went wrong. Please try again.');
      } else {
        setStatus('success');
      }
    } catch {
      setFormError('Something went wrong. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div style={pageWrap}>
        <div style={card}>
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#9C8060', fontSize: 14 }}>
            Loading your claim...
          </div>
        </div>
      </div>
    );
  }

  // ── Not found ─────────────────────────────────────────────────────────────
  if (status === 'not_found') {
    return (
      <div style={pageWrap}>
        <Logo />
        <div style={card}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <h1 style={headingStyle}>Link not found</h1>
            <p style={bodyStyle}>
              This link is not valid or may have expired. If you believe this is an error, please contact
              the organiser directly using the email in your draw notification.
            </p>
            <Link href="/" style={btnSecondary}>Go to Lucky Squares</Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Already claimed ───────────────────────────────────────────────────────
  if (status === 'already_claimed') {
    return (
      <div style={pageWrap}>
        <Logo />
        <div style={card}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <h1 style={headingStyle}>Already submitted</h1>
            <p style={bodyStyle}>
              Your bank details have already been submitted for{' '}
              <strong>{claim?.campaign_title}</strong>. {claim?.org_name} will transfer your prize shortly.
            </p>
            <p style={{ ...bodyStyle, fontSize: 13, marginTop: 8 }}>
              If you have not received your prize within 5 business days, contact{' '}
              <a href={`mailto:${claim?.contact_email}`} style={{ color: '#1A7A55', fontWeight: 700 }}>
                {claim?.org_name}
              </a>{' '}
              directly.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Success ───────────────────────────────────────────────────────────────
  if (status === 'success') {
    return (
      <div style={pageWrap}>
        <Logo />
        <div style={card}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
            <h1 style={headingStyle}>Details received!</h1>
            <p style={bodyStyle}>
              Your bank details have been passed on to <strong>{claim?.org_name}</strong>. They will
              transfer your <strong>{claim?.prize_description}</strong> prize to your account within a
              few business days.
            </p>
            <p style={{ ...bodyStyle, fontSize: 13, marginTop: 8 }}>
              A confirmation has also been sent to your email address. If you have any questions, contact{' '}
              <a href={`mailto:${claim?.contact_email}`} style={{ color: '#1A7A55', fontWeight: 700 }}>
                {claim?.org_name}
              </a>{' '}
              directly.
            </p>
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#9C8060' }}>
          Your bank details will be automatically deleted from our system after 7 days.
        </div>
      </div>
    );
  }

  // ── Claim form ────────────────────────────────────────────────────────────
  return (
    <div style={pageWrap}>
      <Logo />

      <div style={card}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🏆</div>
          <h1 style={{ ...headingStyle, marginBottom: 8 }}>
            Congratulations{claim?.buyer_name ? `, ${claim.buyer_name.split(' ')[0]}` : ''}!
          </h1>
          <p style={{ fontSize: 14, color: '#9C8060', margin: 0 }}>
            {claim?.place} in <strong style={{ color: '#1A1209' }}>{claim?.campaign_title}</strong>
          </p>
        </div>

        {/* Prize highlight */}
        <div style={prizeBox}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9C8060', letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: 4 }}>
            Your prize
          </div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#1A1209' }}>
            {claim?.prize_description}
          </div>
        </div>

        {/* Explanation */}
        <p style={{ ...bodyStyle, marginBottom: 20 }}>
          To pay your prize, <strong>{claim?.org_name}</strong> needs to transfer the funds directly
          to your bank account. Please enter your Australian bank account details below.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div style={fieldGroup}>
            <label style={labelStyle} htmlFor="account_name">Account holder name</label>
            <input
              id="account_name"
              type="text"
              autoComplete="name"
              placeholder="As shown on your bank account"
              value={form.account_name}
              onChange={(e) => setForm((f) => ({ ...f, account_name: e.target.value }))}
              style={inputStyle}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ ...fieldGroup, flex: '0 0 120px' }}>
              <label style={labelStyle} htmlFor="bsb">BSB</label>
              <input
                id="bsb"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="062-000"
                maxLength={7}
                value={form.bsb}
                onChange={(e) => {
                  // Auto-insert dash after 3 digits
                  let v = e.target.value.replace(/[^\d-]/g, '');
                  if (v.length === 3 && !v.includes('-')) v = v + '-';
                  setForm((f) => ({ ...f, bsb: v }));
                }}
                style={inputStyle}
                required
              />
            </div>
            <div style={{ ...fieldGroup, flex: 1 }}>
              <label style={labelStyle} htmlFor="account_number">Account number</label>
              <input
                id="account_number"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="123456789"
                maxLength={10}
                value={form.account_number}
                onChange={(e) => setForm((f) => ({ ...f, account_number: e.target.value.replace(/\D/g, '') }))}
                style={inputStyle}
                required
              />
            </div>
          </div>

          {formError && (
            <div style={errorBox}>{formError}</div>
          )}

          <button type="submit" disabled={submitting} style={btnPrimary}>
            {submitting ? 'Submitting...' : 'Submit bank details'}
          </button>
        </form>

        {/* Security note */}
        <div style={securityNote}>
          <span style={{ marginRight: 6 }}>🔒</span>
          Your bank details are only shared with {claim?.org_name} and are automatically deleted
          from our system after 7 days. Lucky Squares never stores your details long term.
        </div>
      </div>

      {/* Contact fallback */}
      <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#9C8060' }}>
        Prefer not to use this form?{' '}
        <a href={`mailto:${claim?.contact_email}`} style={{ color: '#1A7A55', fontWeight: 700 }}>
          Contact {claim?.org_name} directly
        </a>{' '}
        to arrange an alternative.
      </div>
    </div>
  );
}

function Logo() {
  return (
    <div style={{ textAlign: 'center', marginBottom: 24 }}>
      <Link href="/" style={{ textDecoration: 'none', display: 'inline-block' }}>
        <span style={{ fontSize: 28 }}>🍀</span>
        <div style={{ fontSize: 14, fontWeight: 900, color: '#1A1209', letterSpacing: '-0.3px', marginTop: 2 }}>
          Lucky Squares
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
          Australia
        </div>
      </Link>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const pageWrap = {
  minHeight: '100vh',
  background: '#F5F3EE',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'flex-start',
  padding: '48px 16px 64px',
  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
};

const card = {
  background: '#fff',
  borderRadius: 16,
  border: '1.5px solid #E5E0D5',
  boxShadow: '0 2px 12px rgba(61,46,26,0.07)',
  padding: '36px 36px 32px',
  width: '100%',
  maxWidth: 480,
};

const headingStyle = {
  fontSize: 22,
  fontWeight: 900,
  color: '#1A1209',
  margin: '0 0 12px',
  letterSpacing: '-0.3px',
};

const bodyStyle = {
  fontSize: 14,
  color: '#4A3728',
  lineHeight: 1.8,
  margin: '0 0 12px',
};

const prizeBox = {
  background: '#F5F3EE',
  borderRadius: 10,
  padding: '14px 18px',
  marginBottom: 20,
};

const fieldGroup = {
  marginBottom: 16,
  display: 'flex',
  flexDirection: 'column',
};

const labelStyle = {
  fontSize: 12,
  fontWeight: 700,
  color: '#4A3728',
  marginBottom: 6,
  letterSpacing: '0.3px',
};

const inputStyle = {
  border: '1.5px solid #D6CFC4',
  borderRadius: 8,
  padding: '10px 12px',
  fontSize: 15,
  color: '#1A1209',
  outline: 'none',
  fontFamily: 'inherit',
  background: '#fff',
  width: '100%',
  boxSizing: 'border-box',
};

const errorBox = {
  background: '#FEF2F2',
  border: '1px solid #FECACA',
  borderRadius: 8,
  padding: '10px 14px',
  fontSize: 13,
  color: '#B91C1C',
  marginBottom: 14,
};

const btnPrimary = {
  display: 'block',
  width: '100%',
  background: '#1A7A55',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '13px 0',
  fontSize: 15,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit',
  marginTop: 4,
};

const btnSecondary = {
  display: 'inline-block',
  marginTop: 16,
  padding: '10px 20px',
  background: '#F5F3EE',
  color: '#1A1209',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 700,
  textDecoration: 'none',
};

const securityNote = {
  marginTop: 20,
  padding: '12px 14px',
  background: '#F0FDF4',
  border: '1px solid #BBF7D0',
  borderRadius: 8,
  fontSize: 12,
  color: '#166534',
  lineHeight: 1.6,
};
