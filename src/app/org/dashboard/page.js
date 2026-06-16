'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getSupabaseClient, supabaseConfigured } from '@/lib/supabase/client';

async function getAuthToken() {
  const { data: { session } } = await getSupabaseClient().auth.getSession();
  return session?.access_token || null;
}

function fmtAud(cents) {
  return (cents / 100).toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });
}

const DEMO_STATS = { org_name: 'Demo Organisation', campaigns: 8, active: 2, drawn: 6, gross_cents: 1284000, members: 3 };
const DEMO_CAMPAIGNS = [
  { id: '1', title: 'Under 14s State Championships', org: 'Demo Organisation', status: 'active', grid_size: 50, sold_count: 37, price_per_sq: 5, launched_at: new Date(Date.now() - 5 * 86400000).toISOString(), owner_name: 'Marcus Webb', emoji: '🏆', payment_method: 'bank' },
  { id: '2', title: 'New playground equipment', org: 'Demo Organisation', status: 'active', grid_size: 100, sold_count: 27, price_per_sq: 5, launched_at: new Date(Date.now() - 10 * 86400000).toISOString(), owner_name: 'Priya Nair', emoji: '🌱', payment_method: 'bank' },
  { id: '3', title: 'PANPACS Gold Coast 2026', org: 'Demo Organisation', status: 'drawn', grid_size: 50, sold_count: 50, price_per_sq: 5, launched_at: new Date(Date.now() - 20 * 86400000).toISOString(), owner_name: 'Jamie', emoji: '⚾', payment_method: 'bank' },
];

export default function OrgDashboard() {
  const [stats,              setStats]          = useState(null);
  const [campaigns,          setCampaigns]      = useState([]);
  const [loading,            setLoading]        = useState(true);
  const [membershipBusy,     setMembershipBusy] = useState(false);
  const [membershipSuccess,  setMembershipSuccess] = useState(false);

  useEffect(() => {
    // Check for membership success return from Stripe
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('membership') === '1') {
        setMembershipSuccess(true);
        window.history.replaceState({}, '', window.location.pathname);
      }
    }

    if (!supabaseConfigured) {
      setStats(DEMO_STATS);
      setCampaigns(DEMO_CAMPAIGNS);
      setLoading(false);
      return;
    }
    const sb = getSupabaseClient();
    Promise.all([
      sb.rpc('get_org_stats'),
      sb.rpc('get_org_campaigns'),
    ]).then(([{ data: s }, { data: c }]) => {
      setStats(s);
      setCampaigns((c ?? []).slice(0, 5));
      setLoading(false);
    });
  }, []);

  const fmtDate      = (d) => new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
  const fmtDateLong  = (d) => new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
  const isOrgMember  = stats?.plan === 'org' && stats?.org_member_until;

  const handleGetMembership = async () => {
    if (!supabaseConfigured) return;
    setMembershipBusy(true);
    try {
      const token = await getAuthToken();
      const res   = await fetch('/api/stripe/create-org-membership-checkout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const { url, error } = await res.json();
      if (error) { alert(error); return; }
      window.location.href = url;
    } catch (err) {
      alert('Something went wrong. Please try again.');
    } finally {
      setMembershipBusy(false);
    }
  };

  const handleManageMembership = async () => {
    if (!supabaseConfigured) return;
    setMembershipBusy(true);
    try {
      const token = await getAuthToken();
      const res   = await fetch('/api/stripe/org-portal', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const { url, error } = await res.json();
      if (error) { alert(error); return; }
      window.location.href = url;
    } catch (err) {
      alert('Something went wrong. Please try again.');
    } finally {
      setMembershipBusy(false);
    }
  };

  if (loading) return <div style={{ color: 'var(--text2)' }}>Loading…</div>;

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 900, marginBottom: 4 }}>
        {stats?.org_name || 'Dashboard'}
      </h1>
      <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 28 }}>Organisation overview</p>

      {/* Membership success banner */}
      {membershipSuccess && (
        <div style={{ background: '#D4F5E9', border: '1.5px solid #6EE7B7', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 600, color: '#065F46' }}>
          <span style={{ fontSize: 20 }}>🎉</span>
          Welcome to Annual Organisation Membership! Your account has been upgraded.
        </div>
      )}

      {/* Membership card */}
      {isOrgMember ? (
        <div className="scratch-card" style={{ padding: '20px 24px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 16 }}>⭐</span>
              <span style={{ fontWeight: 800, fontSize: 15 }}>Annual Organisation Member</span>
              <span className="tag tag-green" style={{ fontSize: 11 }}>Active</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>
              Membership renews on {fmtDateLong(stats.org_member_until)}. You have unlimited campaigns with up to 10 live simultaneously.
            </div>
          </div>
          <button
            onClick={handleManageMembership}
            disabled={membershipBusy}
            className="btn btn-outline btn-sm"
            style={{ flexShrink: 0 }}
          >
            {membershipBusy ? 'Loading…' : 'Manage membership →'}
          </button>
        </div>
      ) : (
        <div className="scratch-card" style={{ padding: '20px 24px', marginBottom: 28, background: 'linear-gradient(135deg, var(--purple-bg) 0%, var(--purple-tint) 100%)', border: '1.5px solid var(--purple-tint-border)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--purple-text)', marginBottom: 6 }}>
                Get Annual Organisation Membership
              </div>
              <p style={{ fontSize: 13, color: '#6D28D9', lineHeight: 1.65, margin: '0 0 16px' }}>
                Upgrade to run unlimited campaigns for your organisation for just <strong>$149/year</strong>, with up to 10 live simultaneously.
                Your membership renews automatically each year — you can cancel any time before your renewal date and you'll retain full access until the end of your paid period.
              </p>
              <button
                onClick={handleGetMembership}
                disabled={membershipBusy}
                className="btn btn-primary btn-sm"
              >
                {membershipBusy ? 'Loading…' : 'Get Annual Membership — $149/year →'}
              </button>
            </div>
            <div style={{ fontSize: 13, color: 'var(--purple2)', lineHeight: 1.8, flexShrink: 0 }}>
              <div>✓ Unlimited campaigns per year</div>
              <div>✓ Up to 10 live simultaneously</div>
              <div>✓ Team member access</div>
              <div>✓ Dedicated org dashboard</div>
            </div>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Total raised',    value: fmtAud(stats?.gross_cents || 0), color: '#16A34A' },
          { label: 'Active campaigns', value: stats?.active ?? 0,             color: 'var(--purple2)' },
          { label: 'Draws completed',  value: stats?.drawn ?? 0,              color: '#F59E0B' },
          { label: 'Team members',     value: (stats?.members ?? 0) + 1,      color: '#0EA5E9' },
        ].map(({ label, value, color }) => (
          <div key={label} className="scratch-card" style={{ padding: '20px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Recent campaigns */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800 }}>Recent campaigns</h2>
        <Link href="/org/campaigns" style={{ fontSize: 13, color: 'var(--green)', fontWeight: 700, textDecoration: 'none' }}>View all</Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {campaigns.map((c) => {
          const soldPct = c.grid_size > 0 ? Math.round((c.sold_count / c.grid_size) * 100) : 0;
          const raised  = Math.round(c.sold_count * (parseFloat(c.price_per_sq) || 0));
          return (
            <div key={c.id} className="scratch-card" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 24 }}>{c.emoji || '🍀'}</span>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 2 }}>
                    <Link href={`/${c.slug ?? c.id}`} style={{ color: 'var(--text)', textDecoration: 'none' }}>{c.title}</Link>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                    {c.owner_name} · Launched {fmtDate(c.launched_at)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px' }}>Sold</div>
                    <div style={{ fontSize: 15, fontWeight: 900 }}>{c.sold_count}/{c.grid_size} <span style={{ fontSize: 11, color: 'var(--text2)' }}>({soldPct}%)</span></div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px' }}>Raised</div>
                    <div style={{ fontSize: 15, fontWeight: 900, color: '#16A34A' }}>${raised}</div>
                  </div>
                  <span className={`tag ${c.status === 'active' ? 'tag-green' : c.status === 'drawn' ? 'tag-drawn' : 'tag-muted'}`} style={{ fontSize: 11, textTransform: 'capitalize' }}>
                    {c.status}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        {campaigns.length === 0 && (
          <div style={{ background: '#fff', border: '2px dashed #E5E0D5', borderRadius: 12, padding: '32px', textAlign: 'center' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>🍀</div>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>No campaigns yet</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>Start your first campaign to see it here.</div>
            <Link href="/fundraise" className="btn btn-primary btn-sm">Start a campaign</Link>
          </div>
        )}
      </div>
    </div>
  );
}
