'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient, supabaseConfigured } from '@/lib/supabase/client';

const ORG_TYPES = ['Sporting club', 'School / P&C', 'Charity / NFP', 'Community group', 'Religious organisation', 'Other'];
const STATES    = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'];

export default function OrgSettings() {
  const [form,    setForm]    = useState({ name: '', abn: '', org_type: '', address: '', suburb: '', state: '', postcode: '', website: '' });
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!supabaseConfigured) {
      setForm({ name: 'Demo Organisation', abn: '12 345 678 901', org_type: 'Sporting club', address: '1 Club Lane', suburb: 'Adelaide', state: 'SA', postcode: '5000', website: '' });
      setLoading(false);
      return;
    }
    getSupabaseClient().rpc('get_my_org').then(({ data }) => {
      if (data && data[0]) {
        const o = data[0];
        setForm({ name: o.name || '', abn: o.abn || '', org_type: o.org_type || '', address: o.address || '', suburb: o.suburb || '', state: o.state || '', postcode: o.postcode || '', website: o.website || '' });
      }
      setLoading(false);
    });
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Organisation name is required.'); return; }
    setSaving(true); setError(''); setSaved(false);
    if (!supabaseConfigured) {
      await new Promise((r) => setTimeout(r, 600));
      setSaved(true); setSaving(false); return;
    }
    const { error: err } = await getSupabaseClient().rpc('upsert_my_org', {
      p_name:     form.name.trim(),
      p_abn:      form.abn.trim() || null,
      p_org_type: form.org_type || null,
      p_address:  form.address.trim() || null,
      p_suburb:   form.suburb.trim() || null,
      p_state:    form.state || null,
      p_postcode: form.postcode.trim() || null,
      p_website:  form.website.trim() || null,
    });
    if (err) { setError(err.message); } else { setSaved(true); }
    setSaving(false);
  };

  if (loading) return <div style={{ color: 'var(--text2)' }}>Loading…</div>;

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 900, marginBottom: 4 }}>Settings</h1>
      <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 32 }}>Organisation profile and details</p>

      <div className="scratch-card" style={{ padding: '28px 32px' }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 20 }}>Organisation details</h2>

        <div style={{ display: 'grid', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: 6 }}>Organisation name</label>
            <input className="form-input" value={form.name} onChange={set('name')} placeholder="e.g. Sunbury Primary School P&C" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: 6 }}>ABN</label>
              <input className="form-input" value={form.abn} onChange={set('abn')} placeholder="12 345 678 901" />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: 6 }}>Organisation type</label>
              <select className="form-input" value={form.org_type} onChange={set('org_type')}>
                <option value="">Select type…</option>
                {ORG_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: 6 }}>Street address</label>
            <input className="form-input" value={form.address} onChange={set('address')} placeholder="1 Club Lane" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: 6 }}>Suburb</label>
              <input className="form-input" value={form.suburb} onChange={set('suburb')} placeholder="Adelaide" />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: 6 }}>State</label>
              <select className="form-input" value={form.state} onChange={set('state')}>
                <option value="">State…</option>
                {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: 6 }}>Postcode</label>
              <input className="form-input" value={form.postcode} onChange={set('postcode')} placeholder="5000" maxLength={4} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: 6 }}>Website (optional)</label>
            <input className="form-input" value={form.website} onChange={set('website')} placeholder="https://yourorg.org.au" type="url" />
          </div>
        </div>

        {error && <p style={{ marginTop: 16, fontSize: 13, color: '#DC2626', fontWeight: 600 }}>{error}</p>}
        {saved && <p style={{ marginTop: 16, fontSize: 13, color: '#16A34A', fontWeight: 600 }}>Settings saved.</p>}

        <div style={{ marginTop: 24, display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
