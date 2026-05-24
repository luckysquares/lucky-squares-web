'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getSupabaseClient, supabaseConfigured } from '@/lib/supabase/client';

const DEMO_CAMPAIGNS = [
  { id: '1', title: 'Under 14s State Championships', status: 'active', grid_size: 50, sold_count: 37, price_per_sq: 5, launched_at: new Date(Date.now() - 5 * 86400000).toISOString(), draw_date: null, owner_name: 'Marcus Webb', emoji: '🏆', payment_method: 'bank' },
  { id: '2', title: 'New playground equipment', status: 'active', grid_size: 100, sold_count: 27, price_per_sq: 5, launched_at: new Date(Date.now() - 10 * 86400000).toISOString(), draw_date: null, owner_name: 'Priya Nair', emoji: '🌱', payment_method: 'bank' },
  { id: '3', title: 'PANPACS Gold Coast 2026', status: 'drawn', grid_size: 50, sold_count: 50, price_per_sq: 5, launched_at: new Date(Date.now() - 20 * 86400000).toISOString(), draw_date: '2026-05-24', owner_name: 'Jamie', emoji: '⚾', payment_method: 'bank' },
  { id: '4', title: 'New patrol boards', status: 'active', grid_size: 50, sold_count: 16, price_per_sq: 10, launched_at: new Date(Date.now() - 8 * 86400000).toISOString(), draw_date: null, owner_name: 'Danni Forsyth', emoji: '⭐', payment_method: 'bank' },
  { id: '5', title: 'New rescue vehicle', status: 'active', grid_size: 50, sold_count: 12, price_per_sq: 5, launched_at: new Date(Date.now() - 3 * 86400000).toISOString(), draw_date: null, owner_name: 'Helen Cartwright', emoji: '🐾', payment_method: 'bank' },
];

export default function OrgCampaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState('all');
  const [search,    setSearch]    = useState('');

  useEffect(() => {
    if (!supabaseConfigured) { setCampaigns(DEMO_CAMPAIGNS); setLoading(false); return; }
    getSupabaseClient().rpc('get_org_campaigns').then(({ data }) => {
      setCampaigns(data ?? []); setLoading(false);
    });
  }, []);

  const filtered = campaigns.filter((c) => {
    const matchFilter = filter === 'all' || c.status === filter;
    const matchSearch = !search || c.title?.toLowerCase().includes(search.toLowerCase()) || c.owner_name?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : null;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 900 }}>Campaigns</h1>
        <Link href="/fundraise" className="btn btn-primary btn-sm">+ New campaign</Link>
      </div>
      <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 28 }}>All campaigns across your organisation</p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <input className="form-input" placeholder="Search campaigns or members…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 280 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          {['all','active','drawn'].map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-outline'}`} style={{ textTransform: 'capitalize' }}>{s}</button>
          ))}
        </div>
      </div>

      {loading ? <div style={{ color: 'var(--text2)' }}>Loading…</div> : (
        <>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12, fontWeight: 700 }}>{filtered.length} campaign{filtered.length !== 1 ? 's' : ''}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((c) => {
              const soldPct = c.grid_size > 0 ? Math.round((Number(c.sold_count) / c.grid_size) * 100) : 0;
              const raised  = Math.round(Number(c.sold_count) * parseFloat(c.price_per_sq || 0));
              return (
                <div key={c.id} className="scratch-card" style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 24, flexShrink: 0 }}>{c.emoji || '🍀'}</span>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 2 }}>
                        <Link href={`/f/${c.id}`} style={{ color: 'var(--text)', textDecoration: 'none' }}>{c.title}</Link>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                        {c.owner_name} · Launched {fmtDate(c.launched_at)}
                        {c.draw_date && ` · Drawn ${fmtDate(c.draw_date)}`}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px' }}>Sold</div>
                        <div style={{ fontSize: 14, fontWeight: 900 }}>{c.sold_count}/{c.grid_size}</div>
                        <div style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 700 }}>{soldPct}%</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px' }}>Raised</div>
                        <div style={{ fontSize: 14, fontWeight: 900, color: '#16A34A' }}>${raised}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px' }}>Price</div>
                        <div style={{ fontSize: 14, fontWeight: 900 }}>${parseFloat(c.price_per_sq || 0).toFixed(0)}</div>
                      </div>
                      <span className={`tag ${c.status === 'active' ? 'tag-green' : ''}`} style={{ fontSize: 11, textTransform: 'capitalize', background: c.status === 'drawn' ? '#EDE9FE' : undefined, color: c.status === 'drawn' ? '#7C3AED' : undefined }}>
                        {c.status}
                      </span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Link href={`/f/${c.id}`} className="btn btn-outline btn-sm">View</Link>
                        {c.status === 'drawn' && (
                          <Link href={`/f/${c.id}/certificate`} className="btn btn-outline btn-sm">📜 Certificate</Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ color: 'var(--text2)', fontSize: 14, padding: '40px 0', textAlign: 'center' }}>No campaigns found.</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
