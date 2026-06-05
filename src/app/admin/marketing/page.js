'use client';

import { useState, useEffect } from 'react';
import { adminFetch } from '@/lib/adminFetch';

// ── Constants ─────────────────────────────────────────────────────────────────

const CAMPAIGN_CHANNELS = ['Facebook paid', 'Facebook organic', 'Sport SA', 'Email', 'Press / PR', 'Referral', 'Other'];
const CAMPAIGN_STATUSES = ['Planned', 'Active', 'Paused', 'Complete'];
const CONTENT_CHANNELS  = ['Facebook', 'Instagram', 'Email', 'Press release', 'Blog', 'Other'];
const CONTENT_STATUSES  = ['Draft', 'Scheduled', 'Published'];
const CONTACT_TYPES     = ['State sporting body', 'Media', 'Potential org client', 'Advisor', 'Sponsor', 'Other'];
const CONTACT_STATUSES  = ['To contact', 'Contacted', 'Warm', 'Converted', 'Not interested'];

const STATUS_COLOURS = {
  // Campaigns
  'Planned':        { bg: '#F3F4F6', colour: '#4B5563' },
  'Active':         { bg: '#DCFCE7', colour: '#15803D' },
  'Paused':         { bg: '#FEF3C7', colour: '#92400E' },
  'Complete':       { bg: '#EDE9FE', colour: '#5B21B6' },
  // Content
  'Draft':          { bg: '#F3F4F6', colour: '#4B5563' },
  'Scheduled':      { bg: '#FEF3C7', colour: '#92400E' },
  'Published':      { bg: '#DCFCE7', colour: '#15803D' },
  // Contacts
  'To contact':     { bg: '#F3F4F6', colour: '#4B5563' },
  'Contacted':      { bg: '#DBEAFE', colour: '#1E40AF' },
  'Warm':           { bg: '#FEF3C7', colour: '#92400E' },
  'Converted':      { bg: '#DCFCE7', colour: '#15803D' },
  'Not interested': { bg: '#FEE2E2', colour: '#991B1B' },
};

function Badge({ status }) {
  const s = STATUS_COLOURS[status] ?? { bg: '#F3F4F6', colour: '#4B5563' };
  return (
    <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 99, background: s.bg, color: s.colour }}>
      {status}
    </span>
  );
}

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

const aud = (n) => n ? `$${Number(n).toLocaleString('en-AU')}` : '';

// ── Shared modal shell ────────────────────────────────────────────────────────

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,11,42,.65)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '24px 16px' }}>
      <div className="scratch-card" style={{ width: '100%', maxWidth: 640, padding: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 900, margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text2)' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Campaigns tab ─────────────────────────────────────────────────────────────

function CampaignsTab() {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving,  setSaving]  = useState(false);

  const empty = { name: '', channel: '', status: 'Planned', start_date: '', end_date: '', budget_aud: '', spend_aud: '', signups_attributed: '', result_notes: '' };

  const load = async () => {
    setLoading(true);
    const res = await adminFetch('/api/admin/marketing/campaigns');
    const json = await res.json();
    setItems(Array.isArray(json) ? json : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    const method = editing.id ? 'PATCH' : 'POST';
    const url    = editing.id ? `/api/admin/marketing/campaigns/${editing.id}` : '/api/admin/marketing/campaigns';
    await adminFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing) });
    setSaving(false); setEditing(null); load();
  };

  const del = async (id) => {
    if (!confirm('Delete this campaign?')) return;
    await adminFetch(`/api/admin/marketing/campaigns/${id}`, { method: 'DELETE' });
    load();
  };

  const fld = (k, v) => setEditing((p) => ({ ...p, [k]: v }));

  const totalBudget = items.reduce((s, i) => s + (Number(i.budget_aud) || 0), 0);
  const totalSpend  = items.reduce((s, i) => s + (Number(i.spend_aud) || 0), 0);
  const totalSignups = items.reduce((s, i) => s + (Number(i.signups_attributed) || 0), 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 20 }}>
          {[
            { label: 'Total budget', value: aud(totalBudget) || '$0' },
            { label: 'Total spend', value: aud(totalSpend) || '$0' },
            { label: 'Signups attributed', value: totalSignups },
            { label: 'Cost per signup', value: totalSignups > 0 ? aud(Math.round(totalSpend / totalSignups)) : 'N/A' },
          ].map(({ label, value }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--purple)' }}>{value}</div>
              <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
            </div>
          ))}
        </div>
        <button className="btn btn-purple btn-sm" onClick={() => setEditing({ ...empty })}>+ New campaign</button>
      </div>

      {loading ? <div style={{ color: 'var(--text2)', fontSize: 13 }}>Loading...</div> : items.length === 0 ? (
        <div className="scratch-card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📣</div>
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>No campaigns yet. Add your first one.</p>
        </div>
      ) : (
        <div className="scratch-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--cream)', borderBottom: '1px solid var(--border)' }}>
                {['Campaign', 'Channel', 'Status', 'Dates', 'Budget', 'Spend', 'Signups', ''].map((h) => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 700 }}>
                    {item.name}
                    {item.result_notes && <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.result_notes}</div>}
                  </td>
                  <td style={{ padding: '12px 14px', color: 'var(--text2)' }}>{item.channel}</td>
                  <td style={{ padding: '12px 14px' }}><Badge status={item.status} /></td>
                  <td style={{ padding: '12px 14px', color: 'var(--text2)', fontSize: 12 }}>
                    {item.start_date ? fmtDate(item.start_date) : ''}
                    {item.end_date ? ` — ${fmtDate(item.end_date)}` : ''}
                  </td>
                  <td style={{ padding: '12px 14px', color: 'var(--text2)' }}>{aud(item.budget_aud)}</td>
                  <td style={{ padding: '12px 14px', color: 'var(--text2)' }}>{aud(item.spend_aud)}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700 }}>{item.signups_attributed || ''}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-outline btn-sm" onClick={() => setEditing({ ...item })}>Edit</button>
                      <button className="btn btn-outline btn-sm" style={{ color: '#CC0000', borderColor: '#FFCCCC' }} onClick={() => del(item.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <Modal title={editing.id ? 'Edit campaign' : 'New campaign'} onClose={() => setEditing(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Campaign name</label>
              <input className="form-input" value={editing.name} onChange={(e) => fld('name', e.target.value)} placeholder="e.g. Sport SA launch — Facebook awareness" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Channel</label>
                <select className="form-input" value={editing.channel} onChange={(e) => fld('channel', e.target.value)}>
                  <option value="">Select...</option>
                  {CAMPAIGN_CHANNELS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Status</label>
                <select className="form-input" value={editing.status} onChange={(e) => fld('status', e.target.value)}>
                  {CAMPAIGN_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Start date</label>
                <input className="form-input" type="date" value={editing.start_date || ''} onChange={(e) => fld('start_date', e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">End date</label>
                <input className="form-input" type="date" value={editing.end_date || ''} onChange={(e) => fld('end_date', e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Budget ($)</label>
                <input className="form-input" type="number" value={editing.budget_aud || ''} onChange={(e) => fld('budget_aud', e.target.value)} placeholder="0" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Spend ($)</label>
                <input className="form-input" type="number" value={editing.spend_aud || ''} onChange={(e) => fld('spend_aud', e.target.value)} placeholder="0" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Signups</label>
                <input className="form-input" type="number" value={editing.signups_attributed || ''} onChange={(e) => fld('signups_attributed', e.target.value)} placeholder="0" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Result notes</label>
              <textarea className="form-input" rows={3} value={editing.result_notes || ''} onChange={(e) => fld('result_notes', e.target.value)} placeholder="What worked, what didn't, key learnings..." style={{ resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving || !editing.name.trim()}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Content Calendar tab ──────────────────────────────────────────────────────

function ContentTab() {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving,  setSaving]  = useState(false);
  const [filter,  setFilter]  = useState('');

  const empty = { title: '', channel: '', status: 'Draft', scheduled_date: '', content: '', notes: '' };

  const load = async () => {
    setLoading(true);
    const res = await adminFetch('/api/admin/marketing/content');
    const json = await res.json();
    setItems(Array.isArray(json) ? json : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    const method = editing.id ? 'PATCH' : 'POST';
    const url    = editing.id ? `/api/admin/marketing/content/${editing.id}` : '/api/admin/marketing/content';
    await adminFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing) });
    setSaving(false); setEditing(null); load();
  };

  const del = async (id) => {
    if (!confirm('Delete this content item?')) return;
    await adminFetch(`/api/admin/marketing/content/${id}`, { method: 'DELETE' });
    load();
  };

  const fld = (k, v) => setEditing((p) => ({ ...p, [k]: v }));
  const visible = filter ? items.filter((i) => i.status === filter) : items;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {['', ...CONTENT_STATUSES].map((s) => (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 700, border: '1.5px solid', cursor: 'pointer', fontFamily: 'inherit',
              background: filter === s ? 'var(--purple)' : '#fff', color: filter === s ? '#fff' : 'var(--text2)', borderColor: filter === s ? 'var(--purple)' : 'var(--border)',
            }}>
              {s || `All (${items.length})`}
              {s && ` (${items.filter((i) => i.status === s).length})`}
            </button>
          ))}
        </div>
        <button className="btn btn-purple btn-sm" onClick={() => setEditing({ ...empty })}>+ New content</button>
      </div>

      {loading ? <div style={{ color: 'var(--text2)', fontSize: 13 }}>Loading...</div> : visible.length === 0 ? (
        <div className="scratch-card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📅</div>
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>No content yet. Add your first post or email.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {visible.map((item) => (
            <div key={item.id} className="scratch-card" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                    <Badge status={item.status} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', background: 'var(--cream)', borderRadius: 4, padding: '2px 7px' }}>{item.channel}</span>
                    {item.scheduled_date && <span style={{ fontSize: 12, color: 'var(--text2)' }}>{fmtDate(item.scheduled_date)}</span>}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)', marginBottom: item.content ? 6 : 0 }}>{item.title}</div>
                  {item.content && (
                    <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{item.content.slice(0, 200)}{item.content.length > 200 ? '...' : ''}</p>
                  )}
                  {item.notes && <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 6, fontStyle: 'italic' }}>{item.notes}</p>}
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button className="btn btn-outline btn-sm" onClick={() => setEditing({ ...item })}>Edit</button>
                  <button className="btn btn-outline btn-sm" style={{ color: '#CC0000', borderColor: '#FFCCCC' }} onClick={() => del(item.id)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <Modal title={editing.id ? 'Edit content' : 'New content'} onClose={() => setEditing(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Title</label>
              <input className="form-input" value={editing.title} onChange={(e) => fld('title', e.target.value)} placeholder="e.g. Facebook post — origin story" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Channel</label>
                <select className="form-input" value={editing.channel} onChange={(e) => fld('channel', e.target.value)}>
                  <option value="">Select...</option>
                  {CONTENT_CHANNELS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Status</label>
                <select className="form-input" value={editing.status} onChange={(e) => fld('status', e.target.value)}>
                  {CONTENT_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Scheduled date</label>
                <input className="form-input" type="date" value={editing.scheduled_date || ''} onChange={(e) => fld('scheduled_date', e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Content</label>
              <textarea className="form-input" rows={8} value={editing.content || ''} onChange={(e) => fld('content', e.target.value)} placeholder="Paste your post copy, email body, or press release here..." style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: 13 }} />
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <input className="form-input" value={editing.notes || ''} onChange={(e) => fld('notes', e.target.value)} placeholder="Targeting, image notes, posting instructions..." />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving || !editing.title.trim()}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Contacts tab ──────────────────────────────────────────────────────────────

function ContactsTab() {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving,  setSaving]  = useState(false);
  const [filter,  setFilter]  = useState('');

  const empty = { name: '', organisation: '', role: '', email: '', phone: '', type: '', status: 'To contact', last_contact_date: '', next_action: '', next_action_date: '', notes: '' };

  const load = async () => {
    setLoading(true);
    const res = await adminFetch('/api/admin/marketing/contacts');
    const json = await res.json();
    setItems(Array.isArray(json) ? json : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    const method = editing.id ? 'PATCH' : 'POST';
    const url    = editing.id ? `/api/admin/marketing/contacts/${editing.id}` : '/api/admin/marketing/contacts';
    await adminFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing) });
    setSaving(false); setEditing(null); load();
  };

  const del = async (id) => {
    if (!confirm('Delete this contact?')) return;
    await adminFetch(`/api/admin/marketing/contacts/${id}`, { method: 'DELETE' });
    load();
  };

  const fld = (k, v) => setEditing((p) => ({ ...p, [k]: v }));
  const visible = filter ? items.filter((i) => i.status === filter) : items;

  const overdue = items.filter((i) => i.next_action_date && new Date(i.next_action_date) < new Date() && !['Converted', 'Not interested'].includes(i.status));

  return (
    <div>
      {overdue.length > 0 && (
        <div style={{ background: '#FFF6EE', border: '1.5px solid #FFD8B0', borderRadius: 12, padding: '12px 18px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 18 }}>⏰</span>
          <div style={{ fontSize: 13, color: '#92400E' }}>
            <strong>{overdue.length} contact{overdue.length !== 1 ? 's' : ''}</strong> with overdue next actions: {overdue.map((c) => c.name).join(', ')}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['', ...CONTACT_STATUSES].map((s) => (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 700, border: '1.5px solid', cursor: 'pointer', fontFamily: 'inherit',
              background: filter === s ? 'var(--purple)' : '#fff', color: filter === s ? '#fff' : 'var(--text2)', borderColor: filter === s ? 'var(--purple)' : 'var(--border)',
            }}>
              {s || `All (${items.length})`}
              {s && ` (${items.filter((i) => i.status === s).length})`}
            </button>
          ))}
        </div>
        <button className="btn btn-purple btn-sm" onClick={() => setEditing({ ...empty })}>+ Add contact</button>
      </div>

      {loading ? <div style={{ color: 'var(--text2)', fontSize: 13 }}>Loading...</div> : visible.length === 0 ? (
        <div className="scratch-card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🤝</div>
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>No contacts yet. Add your first relationship to track.</p>
        </div>
      ) : (
        <div className="scratch-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--cream)', borderBottom: '1px solid var(--border)' }}>
                {['Contact', 'Type', 'Status', 'Last contact', 'Next action', ''].map((h) => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => {
                const isOverdue = item.next_action_date && new Date(item.next_action_date) < new Date() && !['Converted', 'Not interested'].includes(item.status);
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border)', background: isOverdue ? '#FFFBEB' : 'transparent' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 700 }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text2)' }}>{item.organisation}{item.role ? ` · ${item.role}` : ''}</div>
                      {item.email && <div style={{ fontSize: 11, color: 'var(--text2)' }}>{item.email}</div>}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text2)', fontSize: 12 }}>{item.type}</td>
                    <td style={{ padding: '12px 14px' }}><Badge status={item.status} /></td>
                    <td style={{ padding: '12px 14px', color: 'var(--text2)', fontSize: 12 }}>{fmtDate(item.last_contact_date)}</td>
                    <td style={{ padding: '12px 14px' }}>
                      {item.next_action && (
                        <div>
                          <div style={{ fontSize: 13, color: isOverdue ? '#92400E' : 'var(--text)', fontWeight: isOverdue ? 700 : 400 }}>{item.next_action}</div>
                          {item.next_action_date && <div style={{ fontSize: 11, color: isOverdue ? '#92400E' : 'var(--text2)' }}>{isOverdue ? '⚠️ ' : ''}{fmtDate(item.next_action_date)}</div>}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => setEditing({ ...item })}>Edit</button>
                        <button className="btn btn-outline btn-sm" style={{ color: '#CC0000', borderColor: '#FFCCCC' }} onClick={() => del(item.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <Modal title={editing.id ? 'Edit contact' : 'Add contact'} onClose={() => setEditing(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Name</label>
                <input className="form-input" value={editing.name} onChange={(e) => fld('name', e.target.value)} placeholder="Full name" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Organisation</label>
                <input className="form-input" value={editing.organisation || ''} onChange={(e) => fld('organisation', e.target.value)} placeholder="Sport SA, InDaily..." />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Role</label>
                <input className="form-input" value={editing.role || ''} onChange={(e) => fld('role', e.target.value)} placeholder="CEO, Journalist..." />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Type</label>
                <select className="form-input" value={editing.type || ''} onChange={(e) => fld('type', e.target.value)}>
                  <option value="">Select...</option>
                  {CONTACT_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={editing.email || ''} onChange={(e) => fld('email', e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Phone</label>
                <input className="form-input" type="tel" value={editing.phone || ''} onChange={(e) => fld('phone', e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Status</label>
                <select className="form-input" value={editing.status} onChange={(e) => fld('status', e.target.value)}>
                  {CONTACT_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Last contact date</label>
                <input className="form-input" type="date" value={editing.last_contact_date || ''} onChange={(e) => fld('last_contact_date', e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Next action</label>
                <input className="form-input" value={editing.next_action || ''} onChange={(e) => fld('next_action', e.target.value)} placeholder="Send intro email, Follow up..." />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Next action date</label>
                <input className="form-input" type="date" value={editing.next_action_date || ''} onChange={(e) => fld('next_action_date', e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-input" rows={3} value={editing.notes || ''} onChange={(e) => fld('notes', e.target.value)} placeholder="Context, conversation history, what they're interested in..." style={{ resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving || !editing.name.trim()}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminMarketingPage() {
  const [tab, setTab] = useState('campaigns');

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 900, marginBottom: 4 }}>Marketing</h1>
        <p style={{ fontSize: 14, color: 'var(--text2)' }}>Track campaigns, content, and key relationships.</p>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 28, borderBottom: '2px solid var(--border)' }}>
        {[
          { key: 'campaigns', label: 'Campaigns' },
          { key: 'content',   label: 'Content Calendar' },
          { key: 'contacts',  label: 'Contacts' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '10px 20px', fontSize: 14, fontWeight: 800,
            fontFamily: 'inherit', color: tab === key ? 'var(--purple)' : 'var(--text2)',
            borderBottom: tab === key ? '2px solid var(--purple)' : '2px solid transparent', marginBottom: -2, transition: 'all .15s',
          }}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'campaigns' && <CampaignsTab />}
      {tab === 'content'   && <ContentTab />}
      {tab === 'contacts'  && <ContactsTab />}
    </div>
  );
}
