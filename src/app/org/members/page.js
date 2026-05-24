'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient, supabaseConfigured } from '@/lib/supabase/client';

const DEMO_DATA = {
  members: [
    { id: '1', user_id: 'u1', name: 'Priya Nair',        email: 'priya@org.com',   joined_at: new Date(Date.now() - 30 * 86400000).toISOString() },
    { id: '2', user_id: 'u2', name: 'Marcus Webb',       email: 'marcus@org.com',  joined_at: new Date(Date.now() - 15 * 86400000).toISOString() },
    { id: '3', user_id: 'u3', name: 'Danni Forsyth',     email: 'danni@org.com',   joined_at: new Date(Date.now() - 5  * 86400000).toISOString() },
  ],
  invites: [
    { id: 'i1', email: 'helen@org.com', expires_at: new Date(Date.now() + 5 * 86400000).toISOString(), created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
  ],
};

export default function OrgMembers() {
  const [data,      setData]      = useState({ members: [], invites: [] });
  const [loading,   setLoading]   = useState(true);
  const [isOwner,   setIsOwner]   = useState(true); // only org owners can manage members
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting,  setInviting]  = useState(false);
  const [inviteMsg, setInviteMsg] = useState('');
  const [acting,    setActing]    = useState({});

  useEffect(() => {
    if (!supabaseConfigured) { setData(DEMO_DATA); setLoading(false); return; }
    const sb = getSupabaseClient();
    sb.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const { data: profile } = await sb.from('profiles').select('plan').eq('id', session.user.id).single();
      setIsOwner(profile?.plan === 'org');
      const { data: membersData } = await sb.rpc('get_org_members');
      setData(membersData ?? { members: [], invites: [] });
      setLoading(false);
    });
  }, []);

  const fmtDate = (d) => new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true); setInviteMsg('');
    if (!supabaseConfigured) {
      setInviteMsg('Invite sent (demo mode).');
      setInviteEmail('');
      setInviting(false);
      return;
    }
    const { data: result } = await getSupabaseClient().rpc('invite_org_member', { p_email: inviteEmail.trim().toLowerCase() });
    if (result?.error) {
      setInviteMsg(result.error);
    } else {
      setInviteMsg('Invite sent! They will receive an email with a link to join.');
      setInviteEmail('');
      // Refresh
      const { data: fresh } = await getSupabaseClient().rpc('get_org_members');
      setData(fresh ?? data);
    }
    setInviting(false);
  };

  const handleRevokeMember = async (userId, name) => {
    if (!window.confirm(`Remove ${name} from your organisation?`)) return;
    setActing((p) => ({ ...p, [userId]: true }));
    if (!supabaseConfigured) {
      setData((d) => ({ ...d, members: d.members.filter((m) => m.user_id !== userId) }));
      setActing((p) => { const n = { ...p }; delete n[userId]; return n; });
      return;
    }
    await getSupabaseClient().rpc('revoke_org_member', { p_member_user_id: userId });
    const { data: fresh } = await getSupabaseClient().rpc('get_org_members');
    setData(fresh ?? data);
    setActing((p) => { const n = { ...p }; delete n[userId]; return n; });
  };

  const handleRevokeInvite = async (inviteId, email) => {
    if (!window.confirm(`Cancel invite for ${email}?`)) return;
    setActing((p) => ({ ...p, [inviteId]: true }));
    if (!supabaseConfigured) {
      setData((d) => ({ ...d, invites: d.invites.filter((i) => i.id !== inviteId) }));
      setActing((p) => { const n = { ...p }; delete n[inviteId]; return n; });
      return;
    }
    await getSupabaseClient().rpc('revoke_org_invite', { p_invite_id: inviteId });
    const { data: fresh } = await getSupabaseClient().rpc('get_org_members');
    setData(fresh ?? data);
    setActing((p) => { const n = { ...p }; delete n[inviteId]; return n; });
  };

  const members = data?.members ?? [];
  const invites = data?.invites ?? [];
  const totalSlots = 3;
  const usedSlots  = members.length + invites.length;

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 900, marginBottom: 4 }}>Members</h1>
      <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 28 }}>Manage who can run campaigns under your organisation</p>

      {/* Invite panel (owner only) */}
      {isOwner && (
        <div className="scratch-card" style={{ padding: '24px', marginBottom: 28 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Invite a team member</h2>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>
            Contributors can run campaigns under your organisation. You can have up to {totalSlots} contributors ({usedSlots} of {totalSlots} used).
          </p>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              className="form-input"
              type="email"
              placeholder="team.member@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
              style={{ maxWidth: 300 }}
              disabled={usedSlots >= totalSlots}
            />
            <button
              className="btn btn-primary btn-sm"
              onClick={handleInvite}
              disabled={inviting || !inviteEmail.trim() || usedSlots >= totalSlots}
            >
              {inviting ? 'Sending…' : 'Send invite'}
            </button>
          </div>
          {inviteMsg && (
            <p style={{ marginTop: 10, fontSize: 13, color: inviteMsg.includes('sent') ? '#16A34A' : '#DC2626', fontWeight: 600 }}>
              {inviteMsg}
            </p>
          )}
          {usedSlots >= totalSlots && (
            <p style={{ marginTop: 10, fontSize: 13, color: 'var(--text2)' }}>
              You have reached the maximum of {totalSlots} contributors. Remove a member to invite someone new.
            </p>
          )}
        </div>
      )}

      {/* Active members */}
      <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>Active members</h2>
      {loading ? <div style={{ color: 'var(--text2)' }}>Loading…</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
          {/* Owner (you) */}
          <div className="scratch-card" style={{ padding: '14px 20px', borderLeft: '4px solid #F59E0B' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <span style={{ fontWeight: 800, fontSize: 14 }}>You (organisation owner)</span>
              </div>
              <span className="tag" style={{ fontSize: 11, background: '#FEF3C7', color: '#92400E' }}>Owner</span>
            </div>
          </div>

          {members.map((m) => (
            <div key={m.id} className="scratch-card" style={{ padding: '14px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>{m.email} · Joined {fmtDate(m.joined_at)}</div>
                </div>
                {isOwner && (
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ color: '#DC2626', borderColor: '#DC2626' }}
                    disabled={acting[m.user_id]}
                    onClick={() => handleRevokeMember(m.user_id, m.name)}
                  >
                    {acting[m.user_id] ? 'Removing…' : 'Remove'}
                  </button>
                )}
              </div>
            </div>
          ))}

          {members.length === 0 && (
            <div style={{ color: 'var(--text2)', fontSize: 13, padding: '16px 0' }}>
              No contributors yet. Invite your first team member above.
            </div>
          )}
        </div>
      )}

      {/* Pending invites */}
      {invites.length > 0 && (
        <>
          <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>Pending invites</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {invites.map((inv) => (
              <div key={inv.id} className="scratch-card" style={{ padding: '14px 20px', opacity: 0.85 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{inv.email}</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)' }}>Invited {fmtDate(inv.created_at)} · Expires {fmtDate(inv.expires_at)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className="tag tag-muted" style={{ fontSize: 11 }}>Pending</span>
                    {isOwner && (
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ color: '#DC2626', borderColor: '#DC2626' }}
                        disabled={acting[inv.id]}
                        onClick={() => handleRevokeInvite(inv.id, inv.email)}
                      >
                        {acting[inv.id] ? 'Cancelling…' : 'Cancel'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
