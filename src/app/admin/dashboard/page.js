'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient, supabaseConfigured } from '@/lib/supabase/client';

const DEMO = {
  casual_clients: 24, org_clients: 3, live_campaigns: 11, drawn_campaigns: 47,
  draft_campaigns: 8, total_fees: 1102, total_raised: 38450, total_prizes: 14200,
  new_org_applications: 2, campaigns_expiring_soon: 3,
};

function Metric({ icon, label, value, sub, accent }) {
  return (
    <div className="scratch-card" style={{ padding: '24px 28px' }}>
      <div style={{ fontSize: 28, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 900, color: accent || 'var(--text)', marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text2)' }}>{sub}</div>}
    </div>
  );
}

export default function AdminDashboard() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabaseConfigured) { setData(DEMO); setLoading(false); return; }
    getSupabaseClient().rpc('admin_dashboard_metrics').then(({ data: d }) => {
      setData(d ?? DEMO); setLoading(false);
    });
  }, []);

  const fmt  = (n) => Number(n).toLocaleString('en-AU');
  const fmtd = (n) => `$${Number(n).toLocaleString('en-AU', { minimumFractionDigits: 0 })}`;

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 900, marginBottom: 4 }}>Dashboard</h1>
      <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 36 }}>Platform overview — all time</p>

      {loading ? (
        <div style={{ color: 'var(--text2)', fontSize: 14 }}>Loading…</div>
      ) : (
        <>
          {/* Alerts */}
          {(data.campaigns_expiring_soon > 0 || data.new_org_applications > 0) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
              {data.campaigns_expiring_soon > 0 && (
                <div style={{ background: '#FFF6EE', border: '1.5px solid #FFD8B0', borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 20 }}>⏰</span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--orange)' }}>{data.campaigns_expiring_soon} campaign{data.campaigns_expiring_soon !== 1 ? 's' : ''} past 21 days</div>
                    <div style={{ fontSize: 13, color: 'var(--text2)' }}>These are approaching the 30-day cancellation threshold. Consider reaching out.</div>
                  </div>
                  <a href="/admin/reporting" style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: 'var(--orange)', textDecoration: 'none', flexShrink: 0 }}>View →</a>
                </div>
              )}
              {data.new_org_applications > 0 && (
                <div style={{ background: '#F0FBF6', border: '1.5px solid #C8E8D8', borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 20 }}>🏫</span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--green)' }}>{data.new_org_applications} new organisation application{data.new_org_applications !== 1 ? 's' : ''}</div>
                    <div style={{ fontSize: 13, color: 'var(--text2)' }}>New organisations have applied in the last 30 days.</div>
                  </div>
                  <a href="/admin/organisations" style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: 'var(--green)', textDecoration: 'none', flexShrink: 0 }}>View →</a>
                </div>
              )}
            </div>
          )}

          {/* Client metrics */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text2)', marginBottom: 16 }}>Clients</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
              <Metric icon="🧑" label="Casual clients"      value={fmt(data.casual_clients)}  sub="Pay per fundraiser" />
              <Metric icon="🏫" label="Organisation clients" value={fmt(data.org_clients)}     sub="Annual plan" />
            </div>
          </div>

          {/* Campaign metrics */}
          <div style={{ marginBottom: 12, marginTop: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text2)', marginBottom: 16 }}>Campaigns</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
              <Metric icon="🟢" label="Live campaigns"      value={fmt(data.live_campaigns)}   sub="Currently active" accent="var(--green)" />
              <Metric icon="🏆" label="Completed draws"     value={fmt(data.drawn_campaigns)}  sub="Successfully drawn" />
              <Metric icon="📝" label="Drafts"              value={fmt(data.draft_campaigns)}  sub="Not yet launched" />
            </div>
          </div>

          {/* Financial metrics */}
          <div style={{ marginTop: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text2)', marginBottom: 16 }}>Financials (completed campaigns)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
              <Metric icon="💰" label="Total funds raised"   value={fmtd(data.total_raised)}  sub="Gross across all draws"  accent="var(--green)" />
              <Metric icon="🏅" label="Total prizes paid out" value={fmtd(data.total_prizes)} sub="Non-donated prize pools" />
              <Metric icon="🧾" label="Platform fees collected" value={fmtd(data.total_fees)} sub={`${fmt(data.drawn_campaigns + data.live_campaigns)} campaigns × $19`} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
