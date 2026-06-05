'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

const aud = (n) => `$${Math.round(n).toLocaleString('en-AU')}`;

// ── Password Gate ─────────────────────────────────────────────────────────────

function PasswordGate({ onSuccess }) {
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) { setError('Please complete all fields.'); return; }
    setLoading(true); setError('');
    const res  = await fetch('/api/investor/access', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok || json.error) { setError(json.error || 'Incorrect password.'); return; }
    sessionStorage.setItem('investor_access', '1');
    sessionStorage.setItem('investor_name', name);
    onSuccess();
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0D0820', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 4, fontFamily: 'Georgia, serif' }}>
            Lucky <span style={{ fontWeight: 400, fontStyle: 'italic' }}>Squares</span>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 3, textTransform: 'uppercase' }}>Australia</div>
          <div style={{ marginTop: 28, fontSize: 16, color: 'rgba(255,255,255,0.6)' }}>Investor Information</div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '36px 32px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: 1, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Your name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: 1, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Email address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: 1, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Access password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={inputStyle}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)} />
            </div>
            {error && <p style={{ fontSize: 13, color: '#FCA5A5', margin: 0 }}>{error}</p>}
            <button type="submit" disabled={loading} style={{ background: 'linear-gradient(135deg,#7C3AED,#6B46F5)', color: '#fff', border: 'none', borderRadius: 10, padding: '13px', fontSize: 15, fontWeight: 800, cursor: 'pointer', marginTop: 4, fontFamily: 'inherit' }}>
              {loading ? 'Verifying…' : 'View investor information →'}
            </button>
          </form>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 20, lineHeight: 1.6 }}>
            This information is confidential and intended for sophisticated investors only. Access is logged.
          </p>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8, padding: '11px 14px', fontSize: 14, color: '#fff', fontFamily: 'inherit',
  outline: 'none', boxSizing: 'border-box',
};

// ── Investor Portal ───────────────────────────────────────────────────────────

function InvestorPortal({ visitorName }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch('/api/investor/stats').then((r) => r.json()).then(setStats).catch(() => {});
  }, []);

  const fmt = (n) => Number(n || 0).toLocaleString('en-AU');

  return (
    <div style={{ background: '#F9F8F6', minHeight: '100vh', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>

      {/* Disclaimer */}
      <div style={{ background: '#1A0A3C', padding: '12px 24px', textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
        <strong style={{ color: 'rgba(255,255,255,0.8)' }}>Confidential: not a public offer.</strong> This document is intended solely for sophisticated investors and does not constitute an offer to sell or a solicitation of an offer to buy securities in any jurisdiction. Past performance is not indicative of future results.
      </div>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(160deg, #0D0820 0%, #1A0A3C 50%, #2D1060 100%)', padding: '80px 24px 96px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 70% 50%, rgba(107,70,245,0.15) 0%, transparent 60%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 900, margin: '0 auto', position: 'relative' }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', marginBottom: 20 }}>Investor Information: Confidential</div>
          <div style={{ fontSize: 36, fontWeight: 900, color: '#fff', fontFamily: 'Georgia, serif', marginBottom: 8, lineHeight: 1.1 }}>
            Lucky <span style={{ fontWeight: 400, fontStyle: 'italic' }}>Squares</span> Australia
          </div>
          <p style={{ fontSize: 22, color: 'rgba(255,255,255,0.75)', maxWidth: 640, lineHeight: 1.5, marginBottom: 40 }}>
            Australia's first purpose-built Lucky Squares fundraising platform, live, revenue-generating, and backed by strategic partnerships with Sport SA, the Marjorie Jackson Centre for Women's Sport, and the Ashleigh Young Foundation.
          </p>

          {/* Live stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, maxWidth: 700 }}>
            {[
              { label: 'Campaigns launched', value: stats ? fmt(stats.campaigns) : '—', sub: 'Live on platform now' },
              { label: 'Squares sold', value: stats ? fmt(stats.totalSold) : '—', sub: 'Real paid transactions' },
              { label: 'Total raised for causes', value: stats ? aud(stats.totalRaised) : '—', sub: 'By Australian communities' },
              { label: 'Organisation clients', value: stats ? fmt(stats.orgClients) : '—', sub: 'Paying $149/year' },
            ].map(({ label, value, sub }) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '18px 20px' }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#F5C820', marginBottom: 4 }}>{value}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.8)', marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{sub}</div>
              </div>
            ))}
          </div>

          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 16 }}>Live figures pulled directly from the platform database</p>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 80px' }}>

        {/* The Opportunity */}
        <Section title="The Opportunity" label="Why now">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
            <div>
              <h3 style={h3Style}>The problem we solved</h3>
              <p style={bodyStyle}>
                Lucky Squares fundraisers (where participants pay to claim a numbered square on a grid, with prizes drawn at the end) have been run by Australian sporting clubs and schools for decades. Until now, entirely by hand: SMS group chats, paper grids, spreadsheets, and cash in envelopes.
              </p>
              <p style={bodyStyle}>
                Watching a volunteer struggle to coordinate a fundraiser across a WhatsApp group while managing a spreadsheet of 100 squares, Jamie Stott went looking for an online tool to help her. None existed. So she built one.
              </p>
            </div>
            <div>
              <h3 style={h3Style}>Why the timing is right</h3>
              <p style={bodyStyle}>
                Volunteer culture is under pressure across Australia. Committees are smaller, people are time-poor, and expectations of digital convenience are higher than ever. Organisations that once ran fundraisers through networks of dedicated volunteers are losing capacity.
              </p>
              <p style={bodyStyle}>
                Lucky Squares Australia reduces the admin burden to minutes. Any committee member can set up a campaign, share a link, and let the platform do the rest: payments, tracking, the live draw, everything.
              </p>
            </div>
          </div>
        </Section>

        {/* Market Size */}
        <Section title="Market Opportunity" label="Total addressable market">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
            {[
              { icon: '⚽', label: 'Registered sporting clubs', value: '65,000+', sub: 'Across all states and codes' },
              { icon: '🏫', label: 'Schools and P&Cs', value: '50,000+', sub: 'Primary, secondary, independent' },
              { icon: '❤️', label: 'Registered charities', value: '60,000+', sub: 'ACNC-registered NFPs' },
            ].map(({ icon, label, value, sub }) => (
              <div key={label} style={{ background: '#fff', border: '1.5px solid #E5E0D5', borderRadius: 14, padding: '22px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>{icon}</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: '#6B46F5', marginBottom: 4 }}>{value}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1209', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 12, color: '#9B8F80' }}>{sub}</div>
              </div>
            ))}
          </div>

          <div style={{ background: 'linear-gradient(135deg,#1A0A3C,#2D1060)', borderRadius: 16, padding: '28px 32px', color: '#fff' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>The Sport SA Channel: One Relationship, Hundreds of Customers</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, margin: 0 }}>
                  Sport SA represents approximately 1,800 sporting clubs across South Australia. At conservative 5% adoption in year one (90 clubs), the $149 annual Organisation Plan subscription alone generates material recurring revenue from a single state body relationship.
                </p>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, marginTop: 12, marginBottom: 0 }}>
                  Replicate across QLD, VIC, and NSW equivalents and the sporting club channel alone represents a <strong style={{ color: '#F5C820' }}>$200K+ ARR pathway</strong>, before schools, charities, or P&Cs.
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'Sport SA member clubs', value: '1,800' },
                  { label: 'Year 1 adoption (5%)', value: '90 clubs' },
                  { label: 'Annual subscription revenue', value: aud(149 * 90) },
                  { label: 'Blitz events (Phase 2, 50% adoption)', value: aud(Math.round(90 * 0.5 * 99)) },
                  { label: 'SA channel year 1 total', value: aud(149 * 90 + Math.round(90 * 0.5 * 99)), highlight: true },
                ].map(({ label, value, highlight }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 8 }}>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{label}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: highlight ? '#F5C820' : '#fff' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* Business Model */}
        <Section title="Business Model" label="Revenue streams">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Organisation Plan', price: '$149/year', desc: 'Annual subscription for clubs, schools and charities. Up to 10 concurrent campaigns, team management, priority support.', badge: 'Recurring ARR' },
              { label: 'Per-Campaign Fee', price: '$19/campaign', desc: 'Flat fee per launched campaign for casual organisers. No subscription required. Simple, transparent pricing.', badge: 'Transactional' },
              { label: 'Blitz Events', price: '$99/event', desc: 'Whole-of-club coordinated fundraising activation. Multiple campaigns running simultaneously with leaderboard. Launching Phase 2.', badge: 'Coming Phase 2' },
              { label: 'Stripe Processing', price: '1.7% + 30c', desc: 'Pass-through transaction fee added to buyer totals. Stripe handles all payment infrastructure. Margin neutral.', badge: 'Pass-through' },
            ].map(({ label, price, desc, badge }) => (
              <div key={label} style={{ background: '#fff', border: '1.5px solid #E5E0D5', borderRadius: 14, padding: '22px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#1A1209' }}>{label}</div>
                  <span style={{ fontSize: 10, fontWeight: 800, background: '#EDE9FE', color: '#5B21B6', borderRadius: 99, padding: '3px 8px' }}>{badge}</span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#6B46F5', marginBottom: 8 }}>{price}</div>
                <p style={{ fontSize: 13, color: '#6B5E4E', lineHeight: 1.6, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>

          <div style={{ background: '#F5F0FF', border: '1.5px solid #C4B5FD', borderRadius: 14, padding: '20px 24px' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#5B21B6', marginBottom: 12 }}>Unit Economics</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              {[
                { label: 'Org LTV (3yr)', value: '$640+', sub: '$149/yr subscription + Blitz events at 50% adoption' },
                { label: 'CAC target', value: '<$50', sub: 'Channel partnerships reduce CAC dramatically' },
                { label: 'Gross margin', value: '~85%', sub: 'SaaS margins at scale' },
                { label: 'Payback period', value: '<12mo', sub: 'At target org CAC' },
              ].map(({ label, value, sub }) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#6B46F5', marginBottom: 4 }}>{value}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1A1209', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 11, color: '#9B8F80' }}>{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Traction */}
        <Section title="Traction" label="Early validation">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <h3 style={h3Style}>Strategic partnerships</h3>
              {[
                { name: 'Sport SA', desc: 'Verbal commitment to promote the platform to their network of 1,800+ member sporting clubs across South Australia, and to host the Lucky Squares launch event. Provides warm access to the largest single channel of potential customers in the state.', badge: 'Verbal commitment' },
                { name: 'Marjorie Jackson Centre for Women\'s Sport', desc: 'Verbal commitment to use Lucky Squares Australia as a fundraising tool for women\'s sport initiatives in South Australia.', badge: 'Verbal commitment' },
                { name: 'Ashleigh Young Foundation', desc: 'Verbal commitment to run campaigns through the platform, validating the charity sector use case. Ashleigh Young is a two-time Olympic medallist.', badge: 'Verbal commitment' },
              ].map(({ name, desc, badge }) => (
                <div key={name} style={{ borderLeft: '3px solid #6B46F5', paddingLeft: 16, marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#1A1209' }}>{name}</div>
                    <span style={{ fontSize: 10, fontWeight: 700, background: '#ECFDF5', color: '#065F46', borderRadius: 99, padding: '2px 8px' }}>{badge}</span>
                  </div>
                  <p style={{ fontSize: 13, color: '#6B5E4E', lineHeight: 1.6, margin: 0 }}>{desc}</p>
                </div>
              ))}
            </div>
            <div>
              <h3 style={h3Style}>Platform milestones</h3>
              {[
                'Live product at luckysquares.com.au: fully operational',
                'First paying customers on the platform',
                'Stripe Connect live: real money flowing to organisers',
                'Online card payments and bank transfer both operational',
                'Support portal, admin dashboard, and org team management built',
                'Legal compliance review in progress with Lynch Meyer (SA)',
                'Company incorporated: Play With Heart Pty Ltd ACN 698 202 069',
                'First successful Lucky Squares draw completed on platform',
              ].map((item) => (
                <div key={item} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
                  <span style={{ color: '#16A34A', fontWeight: 900, flexShrink: 0, marginTop: 1 }}>✓</span>
                  <span style={{ fontSize: 13, color: '#4A3728', lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* The Raise */}
        <Section title="The Raise" label="Seed round">
          <div style={{ background: 'linear-gradient(135deg,#0D0820,#1A0A3C)', borderRadius: 16, padding: '36px', color: '#fff', marginBottom: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 32 }}>
              {[
                { label: 'Raising', value: '$500,000' },
                { label: 'Pre-money valuation', value: '$4M–$6M' },
                { label: 'Equity offered', value: '10–15%' },
                { label: 'Structure', value: 'SAFE Note' },
              ].map(({ label, value }) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 26, fontWeight: 900, color: '#F5C820', marginBottom: 6 }}>{value}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '20px 24px' }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 8 }}>SAFE Terms</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Valuation cap</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>$5,000,000</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Discount rate</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>20%</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>MFN clause</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>Included</div>
                </div>
              </div>
            </div>
          </div>

          {/* Use of funds */}
          <h3 style={h3Style}>Use of funds</h3>
          <div style={{ background: '#fff', border: '1.5px solid #E5E0D5', borderRadius: 14, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F5F3EE' }}>
                  <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: '#9B8F80', textTransform: 'uppercase', letterSpacing: 0.8 }}>Use</th>
                  <th style={{ padding: '12px 20px', textAlign: 'right', fontSize: 11, fontWeight: 800, color: '#9B8F80', textTransform: 'uppercase', letterSpacing: 0.8 }}>Amount</th>
                  <th style={{ padding: '12px 20px', textAlign: 'right', fontSize: 11, fontWeight: 800, color: '#9B8F80', textTransform: 'uppercase', letterSpacing: 0.8 }}>%</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { use: 'Founder salary (12–18 months)', amount: 90000 },
                  { use: 'Product development (contractor)', amount: 120000 },
                  { use: 'Marketing and customer acquisition', amount: 80000 },
                  { use: 'Working capital and contingency', amount: 65000 },
                  { use: 'Accounting, audit, insurance', amount: 18000 },
                  { use: 'Legal: compliance, company structure', amount: 15000 },
                  { use: 'Infrastructure and tools', amount: 12000 },
                ].map(({ use, amount }, i) => (
                  <tr key={use} style={{ borderTop: '1px solid #F0EDE5' }}>
                    <td style={{ padding: '13px 20px', fontSize: 14, color: '#1A1209' }}>{use}</td>
                    <td style={{ padding: '13px 20px', textAlign: 'right', fontSize: 14, fontWeight: 700, color: '#6B46F5' }}>{aud(amount)}</td>
                    <td style={{ padding: '13px 20px', textAlign: 'right', fontSize: 13, color: '#9B8F80' }}>{Math.round(amount / 4000)}%</td>
                  </tr>
                ))}
                <tr style={{ borderTop: '2px solid #E5E0D5', background: '#F5F3EE' }}>
                  <td style={{ padding: '13px 20px', fontSize: 14, fontWeight: 800, color: '#1A1209' }}>Total</td>
                  <td style={{ padding: '13px 20px', textAlign: 'right', fontSize: 14, fontWeight: 900, color: '#6B46F5' }}>$400,000</td>
                  <td style={{ padding: '13px 20px', textAlign: 'right', fontSize: 13, fontWeight: 800, color: '#9B8F80' }}>100%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 12, color: '#9B8F80', marginTop: 10 }}>Initial draw of $400,000. Remaining $100,000 available in tranches subject to milestone achievement.</p>
        </Section>

        {/* Roadmap */}
        <Section title="18-Month Roadmap" label="From launch to Series A">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 40 }}>
            {[
              {
                phase: '1', months: 'Months 1–3', title: 'Foundation', subtitle: 'Prove the model works', colour: '#16A34A',
                items: ['Sport SA launch event: platform introduced to SA club network', 'Ashleigh Young Foundation first live campaign', '10 paying organisations on platform', 'Stripe Connect production payments live', 'Legal sign-off obtained: written compliance opinion', 'GST registration and accounting structure in place'],
              },
              {
                phase: '2', months: 'Months 3–6', title: 'Early Traction', subtitle: 'SA market validation', colour: '#2563EB',
                items: ['50 paying organisations', '$25,000 ARR', 'First 500 fundraising participants across platform', '$50,000 total raised for community causes', 'Net Promoter Score baseline established', 'Second state body partnership signed (QLD or VIC)'],
              },
              {
                phase: '3', months: 'Months 6–9', title: 'Channel Expansion', subtitle: 'Replicate the SA model', colour: '#7C3AED',
                items: ['100 paying organisations', '$60,000 ARR', 'Second state body fully launched', 'School and P&C channel opened: first 10 schools', '5 registered charities beyond Ashleigh Young Foundation', 'Referral program launched: clubs referring clubs'],
              },
              {
                phase: '4', months: 'Months 9–12', title: 'Scale', subtitle: 'National footprint emerging', colour: '#D97706',
                items: ['200 paying organisations', '$120,000 ARR', 'Three states commercially active', 'Blitz launch: whole-of-club activation targeting Sport SA clubs', '$500,000 total raised through platform (major social proof milestone)', 'National sporting body in active discussions'],
              },
              {
                phase: '5', months: 'Months 12–15', title: 'Deepening', subtitle: 'Strengthen and systematise', colour: '#DC2626',
                items: ['300 paying organisations', '$175,000 ARR', 'Enterprise/Network plan live: umbrella organisations', 'RevSport or PlayHQ API integration in development', 'First annual external audit completed: clean result', '1,000 campaigns completed on platform'],
              },
              {
                phase: '6', months: 'Months 15–18', title: 'Series A Preparation', subtitle: 'Demonstrate path to $1M ARR', colour: '#6B46F5',
                items: ['500 paying organisations', '$250,000 ARR', 'Five states commercially active', 'RevSport or PlayHQ API live: embedded in club management software', '$2,000,000 total raised through platform', 'Series A raise initiated'],
              },
            ].map(({ phase, months, title, subtitle, colour, items }) => (
              <div key={phase} style={{ display: 'flex', gap: 20 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: colour, color: '#fff', fontWeight: 900, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 4 }}>
                  {phase}
                </div>
                <div style={{ flex: 1, background: '#fff', border: '1.5px solid #E5E0D5', borderRadius: 14, padding: '20px 24px' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, background: colour + '18', color: colour, borderRadius: 99, padding: '3px 10px' }}>{months}</span>
                    <span style={{ fontFamily: 'Georgia, serif', fontSize: 17, fontWeight: 800, color: '#1A1209' }}>Phase {phase}: {title}</span>
                    <span style={{ fontSize: 13, color: '#9B8F80' }}>{subtitle}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 12 }}>
                    {items.map((item) => (
                      <div key={item} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, color: '#4A3728', lineHeight: 1.5 }}>
                        <span style={{ color: colour, fontWeight: 900, flexShrink: 0, fontSize: 11, marginTop: 3 }}>▸</span>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary table */}
          <div style={{ background: '#fff', border: '1.5px solid #E5E0D5', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', background: '#F5F3EE', fontSize: 13, fontWeight: 800, color: '#1A1209' }}>Key Metrics Summary</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid #E5E0D5' }}>
                  {['Milestone', 'Month 6', 'Month 12', 'Month 18'].map((h) => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: h === 'Milestone' ? 'left' : 'right', fontSize: 11, fontWeight: 800, color: '#9B8F80', textTransform: 'uppercase', letterSpacing: 0.8 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Paying organisations', m6: '50', m12: '200', m18: '500' },
                  { label: 'Annual Recurring Revenue', m6: '$25,000', m12: '$120,000', m18: '$250,000' },
                  { label: 'States commercially active', m6: '1', m12: '3', m18: '5' },
                  { label: 'Total raised through platform', m6: '$50,000', m12: '$500,000', m18: '$2,000,000' },
                  { label: 'Campaigns completed', m6: '~100', m12: '~400', m18: '~1,000' },
                ].map(({ label, m6, m12, m18 }) => (
                  <tr key={label} style={{ borderBottom: '1px solid #F0EDE5' }}>
                    <td style={{ padding: '11px 16px', color: '#1A1209', fontWeight: 600 }}>{label}</td>
                    <td style={{ padding: '11px 16px', textAlign: 'right', color: '#6B46F5', fontWeight: 700 }}>{m6}</td>
                    <td style={{ padding: '11px 16px', textAlign: 'right', color: '#6B46F5', fontWeight: 700 }}>{m12}</td>
                    <td style={{ padding: '11px 16px', textAlign: 'right', color: '#6B46F5', fontWeight: 700 }}>{m18}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Team */}
        <Section title="The Team" label="Who's behind it">
          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 32, alignItems: 'start', marginBottom: 32 }}>
            <div>
              <div style={{ width: 160, height: 160, borderRadius: '50%', overflow: 'hidden', border: '3px solid #6B46F5' }}>
                <Image src="/ceo-jamie.png" alt="Jamie Stott" width={160} height={160} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
              </div>
            </div>
            <div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 900, color: '#1A1209', marginBottom: 4 }}>Jamie Stott</div>
              <div style={{ fontSize: 13, color: '#6B46F5', fontWeight: 700, marginBottom: 16 }}>Founder and CEO, Lucky Squares Australia</div>
              <p style={{ fontSize: 14, color: '#4A3728', lineHeight: 1.8, marginBottom: 12 }}>
                Jamie brings three decades of business leadership across multiple industries. As a business owner, CEO, and company director, she has led organisations through launch, growth, and scale, including a ground-breaking award-winning mental health business and an ecommerce agency in the late 1990s that built South Australia's first home delivery grocery shopping website.
              </p>
              <p style={{ fontSize: 14, color: '#4A3728', lineHeight: 1.8, marginBottom: 12 }}>
                A 25-year background in community sport (for physical and mental health, and social connection) gave Jamie firsthand understanding of the fundraising challenges facing clubs and committees. When she watched a volunteer struggle to coordinate a Lucky Squares fundraiser using SMS and spreadsheets, she went looking for a purpose-built tool. Finding none, she built Lucky Squares Australia.
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['30+ years business leadership', 'Multiple industries', 'Community sport advocate', 'Award-winning founder', 'First-to-market product builder'].map((tag) => (
                  <span key={tag} style={{ fontSize: 11, fontWeight: 700, background: '#EDE9FE', color: '#5B21B6', borderRadius: 99, padding: '4px 10px' }}>{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* NZ Callout */}
        <div style={{ background: 'linear-gradient(135deg,#F0FDF4,#DCFCE7)', border: '1.5px solid #86EFAC', borderRadius: 16, padding: '24px 28px', marginBottom: 48 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Beyond 18 Months</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#15803D', marginBottom: 8 }}>🇳🇿 New Zealand</div>
          <p style={{ fontSize: 14, color: '#166534', lineHeight: 1.7, margin: 0 }}>
            New Zealand represents a natural first international market: same language, comparable regulatory environment, and 13,000+ sporting clubs. The luckysquares.co domain is secured and NZ expansion is targeted for exploration post-Series A with minimal additional infrastructure cost.
          </p>
        </div>

        {/* Disclaimer */}
        <div style={{ background: '#F5F3EE', border: '1.5px solid #E5E0D5', borderRadius: 14, padding: '24px 28px' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#9B8F80', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Important Disclaimer</div>
          <p style={{ fontSize: 13, color: '#6B5E4E', lineHeight: 1.8, margin: '0 0 10px' }}>
            This document is confidential and is intended solely for the use of the individual or entity to whom it is addressed. It does not constitute an offer to sell, or a solicitation of an offer to buy, any securities in any jurisdiction. This is not a prospectus and has not been lodged with ASIC.
          </p>
          <p style={{ fontSize: 13, color: '#6B5E4E', lineHeight: 1.8, margin: '0 0 10px' }}>
            This document is directed only at sophisticated investors and professional investors as defined under the Corporations Act 2001 (Cth). Any investment involves risk, including loss of capital. Past performance and forward-looking projections are not indicative of future results.
          </p>
          <p style={{ fontSize: 13, color: '#6B5E4E', lineHeight: 1.8, margin: 0 }}>
            Play With Heart Pty Ltd ACN 698 202 069 trading as Lucky Squares Australia. All figures are estimates only. Interested parties should conduct their own due diligence and seek independent legal, financial, and tax advice before making any investment decision.
          </p>
        </div>

        {/* Contact */}
        <div style={{ textAlign: 'center', marginTop: 48 }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 900, color: '#1A1209', marginBottom: 8 }}>Interested in learning more?</div>
          <p style={{ fontSize: 14, color: '#6B5E4E', marginBottom: 20 }}>Reach out directly for a conversation, data room access, or to arrange a platform demo.</p>
          <a href="mailto:hello@luckysquares.com.au" style={{ display: 'inline-block', background: '#6B46F5', color: '#fff', textDecoration: 'none', padding: '13px 28px', borderRadius: 10, fontWeight: 800, fontSize: 15 }}>
            hello@luckysquares.com.au
          </a>
        </div>

      </div>
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const h3Style = {
  fontFamily: 'Georgia, serif', fontSize: 16, fontWeight: 900, color: '#1A1209', marginBottom: 14, marginTop: 0,
};
const bodyStyle = {
  fontSize: 14, color: '#4A3728', lineHeight: 1.8, marginBottom: 14,
};

function Section({ title, label, children }) {
  return (
    <div style={{ marginTop: 64 }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#9B8F80', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>{label}</div>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 28, fontWeight: 900, color: '#1A1209', margin: 0 }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function InvestorPage() {
  const [authed,       setAuthed]       = useState(false);
  const [visitorName,  setVisitorName]  = useState('');
  const [checking,     setChecking]     = useState(true);

  useEffect(() => {
    if (sessionStorage.getItem('investor_access') === '1') {
      setVisitorName(sessionStorage.getItem('investor_name') || '');
      setAuthed(true);
    }
    setChecking(false);
  }, []);

  if (checking) return null;

  if (!authed) return (
    <PasswordGate onSuccess={() => {
      setVisitorName(sessionStorage.getItem('investor_name') || '');
      setAuthed(true);
    }} />
  );

  return <InvestorPortal visitorName={visitorName} />;
}
