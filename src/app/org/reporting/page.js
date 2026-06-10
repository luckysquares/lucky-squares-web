'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient, supabaseConfigured } from '@/lib/supabase/client';

function fmtAud(cents) {
  return (cents / 100).toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });
}

const DEMO_CAMPAIGNS = [
  { id: '1', title: 'Under 14s State Championships', status: 'active', grid_size: 50, sold_count: 37, price_per_sq: 5, launched_at: new Date(Date.now() - 5 * 86400000).toISOString(), owner_name: 'Marcus Webb', emoji: '🏆' },
  { id: '2', title: 'New playground equipment', status: 'active', grid_size: 100, sold_count: 27, price_per_sq: 5, launched_at: new Date(Date.now() - 10 * 86400000).toISOString(), owner_name: 'Priya Nair', emoji: '🌱' },
  { id: '3', title: 'PANPACS Gold Coast 2026', status: 'drawn', grid_size: 50, sold_count: 50, price_per_sq: 5, launched_at: new Date(Date.now() - 20 * 86400000).toISOString(), owner_name: 'Jamie', emoji: '⚾' },
  { id: '4', title: 'New patrol boards', status: 'active', grid_size: 50, sold_count: 16, price_per_sq: 10, launched_at: new Date(Date.now() - 8 * 86400000).toISOString(), owner_name: 'Danni Forsyth', emoji: '⭐' },
  { id: '5', title: 'New rescue vehicle', status: 'active', grid_size: 50, sold_count: 12, price_per_sq: 5, launched_at: new Date(Date.now() - 3 * 86400000).toISOString(), owner_name: 'Helen Cartwright', emoji: '🐾' },
];

export default function OrgReporting() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    if (!supabaseConfigured) { setCampaigns(DEMO_CAMPAIGNS); setLoading(false); return; }
    getSupabaseClient().rpc('get_org_campaigns').then(({ data }) => {
      setCampaigns(data ?? []); setLoading(false);
    });
  }, []);

  const totalGross  = campaigns.reduce((s, c) => s + Math.round(Number(c.sold_count) * parseFloat(c.price_per_sq || 0) * 100), 0);
  const totalSold   = campaigns.reduce((s, c) => s + Number(c.sold_count), 0);
  const totalSquares = campaigns.reduce((s, c) => s + (c.grid_size || 0), 0);
  const avgFill     = totalSquares > 0 ? Math.round((totalSold / totalSquares) * 100) : 0;
  const drawn       = campaigns.filter((c) => c.status === 'drawn');
  const active      = campaigns.filter((c) => c.status === 'active');

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 900, marginBottom: 4 }}>Reporting</h1>
      <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 28 }}>Fundraising performance across all org campaigns</p>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 36 }}>
        {[
          { label: 'Total raised',     value: fmtAud(totalGross),           color: '#16A34A' },
          { label: 'Squares sold',     value: `${totalSold} / ${totalSquares}`, color: 'var(--purple2)' },
          { label: 'Avg fill rate',    value: `${avgFill}%`,                color: '#F59E0B' },
          { label: 'Campaigns active', value: active.length,                color: '#0EA5E9' },
          { label: 'Draws completed',  value: drawn.length,                 color: '#6B7280' },
        ].map(({ label, value, color }) => (
          <div key={label} className="scratch-card" style={{ padding: '18px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Campaign breakdown table */}
      <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>Campaign breakdown</h2>
      {loading ? <div style={{ color: 'var(--text2)' }}>Loading…</div> : (
        <div className="scratch-card" style={{ padding: '0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F5F3EE' }}>
                {['Campaign', 'Owner', 'Status', 'Sold / Grid', 'Fill', 'Raised', 'Launched'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 800, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #E5E0D5', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c, i) => {
                const sold    = Number(c.sold_count);
                const fill    = c.grid_size > 0 ? Math.round((sold / c.grid_size) * 100) : 0;
                const raised  = Math.round(sold * parseFloat(c.price_per_sq || 0) * 100);
                return (
                  <tr key={c.id} style={{ borderBottom: i < campaigns.length - 1 ? '1px solid #F0EAE0' : 'none' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700 }}>
                      <span style={{ marginRight: 6 }}>{c.emoji || '🍀'}</span>
                      {c.title}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text2)' }}>{c.owner_name}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`tag ${c.status === 'active' ? 'tag-green' : c.status === 'drawn' ? 'tag-drawn' : 'tag-muted'}`} style={{ fontSize: 11, textTransform: 'capitalize' }}>
                        {c.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700 }}>{sold} / {c.grid_size}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 48, height: 6, background: '#E5E0D5', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ width: `${fill}%`, height: '100%', background: fill >= 80 ? '#16A34A' : fill >= 50 ? '#F59E0B' : '#E5E0D5' }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700 }}>{fill}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 800, color: '#16A34A' }}>{fmtAud(raised)}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text2)', whiteSpace: 'nowrap' }}>{fmtDate(c.launched_at)}</td>
                  </tr>
                );
              })}
              {campaigns.length === 0 && (
                <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--text2)' }}>No campaigns yet.</td></tr>
              )}
            </tbody>
            {campaigns.length > 0 && (
              <tfoot>
                <tr style={{ background: '#F5F3EE', fontWeight: 800 }}>
                  <td colSpan={3} style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Total</td>
                  <td style={{ padding: '12px 16px' }}>{totalSold} / {totalSquares}</td>
                  <td style={{ padding: '12px 16px' }}>{avgFill}%</td>
                  <td style={{ padding: '12px 16px', color: '#16A34A' }}>{fmtAud(totalGross)}</td>
                  <td style={{ padding: '12px 16px' }} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}
