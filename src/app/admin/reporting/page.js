'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient, supabaseConfigured } from '@/lib/supabase/client';

export default function AdminReporting() {
  const [campaigns, setCampaigns] = useState([]);
  const [orgs,      setOrgs]      = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!supabaseConfigured) {
        setCampaigns(DEMO_CAMPAIGNS); setOrgs(DEMO_ORGS); setLoading(false); return;
      }
      const [{ data: c }, { data: o }] = await Promise.all([
        getSupabaseClient().rpc('admin_get_fundraisers'),
        getSupabaseClient().rpc('admin_get_org_applications'),
      ]);
      setCampaigns(c ?? []); setOrgs(o ?? []); setLoading(false);
    };
    load();
  }, []);

  const now = Date.now();
  const daysLive = (c) => c.launched_at ? Math.floor((now - new Date(c.launched_at).getTime()) / 86400000) : null;

  const expiring = campaigns
    .filter((c) => c.status === 'active' && daysLive(c) !== null && daysLive(c) >= 21)
    .sort((a, b) => daysLive(b) - daysLive(a));

  const newOrgs = orgs
    .filter((o) => new Date(o.created_at) > new Date(now - 30 * 86400000))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const fmtDate = (d) => new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 900, marginBottom: 4 }}>Reporting</h1>
      <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 36 }}>Alerts and activity that may need your attention</p>

      {loading ? <div style={{ color: 'var(--text2)' }}>Loading…</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>

          {/* Campaigns approaching 30 days */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 22 }}>⏰</span>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 800, margin: 0 }}>Campaigns approaching 30 days</h2>
              {expiring.length > 0 && <span className="tag" style={{ background: '#FFF6EE', color: 'var(--orange)', border: '1px solid #FFD8B0' }}>{expiring.length}</span>}
            </div>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>These campaigns have been live for 21 or more days. If they have not reached break-even by day 30 they will be auto-cancelled.</p>
            {expiring.length === 0 ? (
              <div className="scratch-card" style={{ padding: '28px', textAlign: 'center', color: 'var(--text2)', fontSize: 14 }}>No campaigns approaching the 30-day limit.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {expiring.map((c) => {
                  const days      = daysLive(c);
                  const remaining = Math.max(0, 30 - days);
                  const revenue   = c.sold_count * c.price_per_sq;
                  const urgent    = remaining <= 3;
                  return (
                    <div key={c.id} className="scratch-card" style={{ padding: '18px 22px', border: `1.5px solid ${urgent ? '#FFCCCC' : '#FFD8B0'}`, background: urgent ? '#FFF5F5' : '#FFF9F4' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 24 }}>{c.emoji}</span>
                        <div style={{ flex: 1, minWidth: 200 }}>
                          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 3 }}>{c.title}</div>
                          <div style={{ fontSize: 13, color: 'var(--text2)' }}>{c.org} · {c.contact_name} · {c.contact_email}</div>
                          <div style={{ fontSize: 13, marginTop: 6, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                            <span><strong>{c.sold_count}</strong> / {c.grid_size} squares sold</span>
                            <span><strong>${revenue.toLocaleString()}</strong> raised</span>
                            <span>Day <strong>{days}</strong> of 30</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 22, fontWeight: 900, color: urgent ? '#CC0000' : 'var(--orange)', fontFamily: 'var(--font-serif)' }}>{remaining}d</div>
                          <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 700 }}>remaining</div>
                          <a href={`mailto:${c.contact_email}?subject=Your LuckySquares campaign "${c.title}"&body=Hi ${c.contact_name},%0A%0AJust checking in on your Lucky Squares fundraiser "${c.title}". You have ${remaining} days remaining before the campaign expires. How can we help?%0A%0ACheers,%0ALuckySquares Australia`}
                            className="btn btn-outline btn-sm" style={{ marginTop: 8, display: 'inline-block' }}>
                            ✉ Reach out
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* New org applications */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 22 }}>🏫</span>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 800, margin: 0 }}>New organisation applications</h2>
              {newOrgs.length > 0 && <span className="tag tag-green">{newOrgs.length}</span>}
            </div>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>Organisations that have applied in the last 30 days. Reach out to say hello and welcome them.</p>
            {newOrgs.length === 0 ? (
              <div className="scratch-card" style={{ padding: '28px', textAlign: 'center', color: 'var(--text2)', fontSize: 14 }}>No new applications in the last 30 days.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {newOrgs.map((o) => (
                  <div key={o.id} className="scratch-card" style={{ padding: '18px 22px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 3 }}>{o.org_name}</div>
                        <div style={{ fontSize: 13, color: 'var(--text2)' }}>{o.contact_name} · <a href={`mailto:${o.email}`} style={{ color: 'var(--green)', fontWeight: 700 }}>{o.email}</a> · {o.org_type}</div>
                        <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>ABN {o.abn} · {[o.suburb, o.state].filter(Boolean).join(', ')} · Applied {fmtDate(o.created_at)}</div>
                      </div>
                      <a href={`mailto:${o.email}?subject=Welcome to LuckySquares Australia!&body=Hi ${o.contact_name},%0A%0AWelcome to LuckySquares Australia! We noticed your organisation ${o.org_name} has applied for an organisation plan. We'd love to help you get started.%0A%0ACheers,%0ALuckySquares Australia`}
                        className="btn btn-outline btn-sm" style={{ flexShrink: 0 }}>
                        ✉ Say hello
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}

const DEMO_CAMPAIGNS = [
  { id: '1', emoji: '🐨', title: 'Koala Rescue Raffle', org: 'Wildlife Friends', contact_name: 'Priya S.', contact_email: 'priya@wildlife.org.au', status: 'active', grid_size: 100, price_per_sq: 10, sold_count: 44, launched_at: new Date(Date.now() - 24 * 86400000).toISOString() },
  { id: '2', emoji: '⚽', title: 'Bayside FC Gear Fund', org: 'Bayside FC', contact_name: 'Tom R.', contact_email: 'tom@baysidefc.com.au', status: 'active', grid_size: 50, price_per_sq: 10, sold_count: 18, launched_at: new Date(Date.now() - 28 * 86400000).toISOString() },
];
const DEMO_ORGS = [
  { id: '1', org_name: 'Sunbury Primary P&C', abn: '12 345 678 901', org_type: 'School P&C', contact_name: 'Mel Thompson', email: 'mel@sunburyprimary.edu.au', suburb: 'Sunbury', state: 'VIC', created_at: new Date(Date.now() - 3 * 86400000).toISOString() },
  { id: '2', org_name: 'Werribee Eagles AFC', abn: '45 678 901 234', org_type: 'Sporting club', contact_name: 'Dave Kowalski', email: 'dave@werribeeeagles.com.au', suburb: 'Werribee', state: 'VIC', created_at: new Date(Date.now() - 1 * 86400000).toISOString() },
];
