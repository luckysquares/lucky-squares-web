'use client';

import { useState, useEffect } from 'react';
import { adminFetch } from '@/lib/adminFetch';

const toSlug = (s) =>
  s.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

const EMPTY_FORM = {
  id: null, slug: '', title: '', excerpt: '', content: '',
  author: 'LuckySquares Australia', cover_image_url: '',
  image_prompt: '', tags: '', status: 'draft',
};

const EMPTY_GENERATE = { title: '', audience: '', tone: 'Helpful and informative', keyPoints: '' };

export default function AdminBlogPage() {
  const [posts,         setPosts]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [editing,       setEditing]       = useState(null);
  const [saving,        setSaving]        = useState(false);
  const [deletingId,    setDeletingId]    = useState(null);
  const [saveError,     setSaveError]     = useState('');
  const [showGenerate,  setShowGenerate]  = useState(false);
  const [generateForm,  setGenerateForm]  = useState(EMPTY_GENERATE);
  const [generating,    setGenerating]    = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [slugManual,    setSlugManual]    = useState(false);
  const [seedProgress,  setSeedProgress]  = useState(null); // null | { current, total, log[] }
  const [copied,        setCopied]        = useState(false);
  const [imageTab,      setImageTab]      = useState('upload'); // 'upload' | 'url'
  const [uploading,     setUploading]     = useState(false);
  const [uploadError,   setUploadError]   = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/admin/blog');
      const data = await res.json();
      setPosts(Array.isArray(data) ? data : []);
    } catch { setPosts([]); }
    setLoading(false);
  };

  const openNew = () => {
    setEditing({ ...EMPTY_FORM });
    setSlugManual(false); setSaveError('');
    setShowGenerate(false); setGenerateForm(EMPTY_GENERATE); setGenerateError('');
  };

  const openEdit = (post) => {
    setEditing({
      id: post.id, slug: post.slug, title: post.title,
      excerpt: post.excerpt ?? '', content: post.content ?? '',
      author: post.author ?? 'LuckySquares Australia',
      cover_image_url: post.cover_image_url ?? '',
      image_prompt: post.image_prompt ?? '',
      tags: Array.isArray(post.tags) ? post.tags.join(', ') : '',
      status: post.status ?? 'draft',
    });
    setSlugManual(true); setSaveError('');
    setShowGenerate(false); setGenerateForm(EMPTY_GENERATE); setGenerateError('');
  };

  const fld = (k, v) => setEditing((prev) => {
    const next = { ...prev, [k]: v };
    if (k === 'title' && !slugManual) next.slug = toSlug(v);
    return next;
  });

  const fldSlug = (v) => { setSlugManual(true); setEditing((p) => ({ ...p, slug: v })); };

  const handleSave = async () => {
    if (!editing.title.trim()) { setSaveError('Title is required.'); return; }
    if (!editing.slug.trim())  { setSaveError('Slug is required.');  return; }
    setSaving(true); setSaveError('');
    const tags = editing.tags.split(',').map((t) => t.trim()).filter(Boolean);
    const res = await adminFetch('/api/admin/blog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id:              editing.id || undefined,
        slug:            editing.slug.trim(),
        title:           editing.title.trim(),
        excerpt:         editing.excerpt.trim(),
        content:         editing.content,
        author:          editing.author.trim() || 'LuckySquares Australia',
        cover_image_url: editing.cover_image_url.trim() || null,
        image_prompt:    editing.image_prompt.trim() || '',
        tags, status: editing.status,
      }),
    });
    const json = await res.json();
    if (!res.ok || json.error) { setSaveError(json.error ?? 'Save failed.'); setSaving(false); return; }
    await load(); setEditing(null); setSaving(false);
  };

  const handleDelete = async (id, title) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setDeletingId(id);
    await adminFetch('/api/admin/blog', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    await load(); setDeletingId(null);
  };

  const gfld = (k, v) => setGenerateForm((p) => ({ ...p, [k]: v }));

  const handleGenerate = async () => {
    setGenerating(true); setGenerateError('');
    try {
      const res = await adminFetch('/api/admin/blog/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generateForm),
      });
      const json = await res.json();
      if (!res.ok || json.error) { setGenerateError(json.error ?? 'Generation failed.'); setGenerating(false); return; }

      const content = json.content ?? '';
      const titleMatch = content.match(/^#\s+(.+)/m);
      const generatedTitle = json.title || (titleMatch ? titleMatch[1].trim() : '');

      setEditing((prev) => ({
        ...prev,
        content,
        title:        prev.title.trim() ? prev.title : generatedTitle,
        slug:         prev.title.trim() ? prev.slug  : (!slugManual && generatedTitle ? toSlug(generatedTitle) : prev.slug),
        excerpt:      json.excerpt  || prev.excerpt,
        tags:         json.tags?.length ? json.tags.join(', ') : prev.tags,
        image_prompt: json.image_prompt || prev.image_prompt,
      }));
      setShowGenerate(false);
    } catch { setGenerateError('Generation failed. Please try again.'); }
    setGenerating(false);
  };

  // ── Seed 20 starter posts ─────────────────────────────────────────────────
  const handleSeed = async () => {
    if (!confirm('Generate and publish 20 starter blog posts? This may take a few minutes.')) return;
    const totalRes = await adminFetch('/api/admin/blog/seed');
    const { total } = await totalRes.json();
    setSeedProgress({ current: 0, total, log: [] });

    for (let i = 0; i < total; i++) {
      setSeedProgress((p) => ({ ...p, current: i + 1, log: [...p.log, { i, status: 'generating', title: `Post ${i + 1}/${total}…` }] }));
      try {
        const res = await adminFetch('/api/admin/blog/seed', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ index: i }),
        });
        const data = await res.json();
        const label = data.skipped ? `Skipped (exists): ${data.slug}` : `Published: ${data.title || data.slug}`;
        setSeedProgress((p) => ({ ...p, log: p.log.map((l, idx) => idx === p.log.length - 1 ? { ...l, status: data.skipped ? 'skipped' : 'done', title: label } : l) }));
      } catch (err) {
        setSeedProgress((p) => ({ ...p, log: p.log.map((l, idx) => idx === p.log.length - 1 ? { ...l, status: 'error', title: `Error on post ${i + 1}` } : l) }));
      }
    }

    await load();
    setSeedProgress((p) => ({ ...p, current: total, done: true }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setUploadError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await adminFetch('/api/admin/blog/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok || json.error) { setUploadError(json.error ?? 'Upload failed.'); setUploading(false); return; }
      fld('cover_image_url', json.url);
    } catch { setUploadError('Upload failed. Please try again.'); }
    setUploading(false);
  };

  const copyImagePrompt = () => {
    if (!editing?.image_prompt) return;
    navigator.clipboard.writeText(editing.image_prompt);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const tagChips = editing ? editing.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 900, marginBottom: 4 }}>Blog Posts</h1>
          <p style={{ fontSize: 14, color: 'var(--text2)' }}>
            {loading ? 'Loading…' : `${posts.length} post${posts.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-outline btn-sm" onClick={handleSeed} disabled={!!seedProgress && !seedProgress.done} style={{ fontSize: 12 }}>
            ✨ Seed starter posts
          </button>
          <button className="btn btn-purple btn-sm" onClick={openNew}>+ New post</button>
        </div>
      </div>

      {/* Seed progress */}
      {seedProgress && (
        <div className="scratch-card" style={{ padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>
              {seedProgress.done ? `Done — ${seedProgress.log.filter((l) => l.status === 'done').length} posts published` : `Generating ${seedProgress.current} / ${seedProgress.total}…`}
            </div>
            {seedProgress.done && (
              <button className="btn btn-outline btn-sm" onClick={() => setSeedProgress(null)} style={{ fontSize: 11 }}>Dismiss</button>
            )}
          </div>
          <div style={{ height: 6, background: 'var(--border)', borderRadius: 99, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ height: '100%', width: `${(seedProgress.current / seedProgress.total) * 100}%`, background: 'linear-gradient(90deg,#A78BFA,#7C3AED)', borderRadius: 99, transition: 'width .3s' }} />
          </div>
          <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {seedProgress.log.map((l, i) => (
              <div key={i} style={{ fontSize: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                <span>{l.status === 'done' ? '✅' : l.status === 'skipped' ? '⏭️' : l.status === 'error' ? '❌' : '⏳'}</span>
                <span style={{ color: l.status === 'error' ? '#CC0000' : 'var(--text2)' }}>{l.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Post list */}
      {loading ? (
        <div style={{ color: 'var(--text2)', fontSize: 14 }}>Loading…</div>
      ) : posts.length === 0 ? (
        <div className="scratch-card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📝</div>
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>No posts yet. Create your first one or use Seed starter posts.</p>
        </div>
      ) : (
        <div className="scratch-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--cream)', borderBottom: '1px solid var(--border)' }}>
                {['Title', 'Status', 'Published', 'Author', ''].map((h) => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: .5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '13px 16px', maxWidth: 320 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 300 }}>{post.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>/blog/{post.slug}</div>
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <span style={{
                      display: 'inline-block', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: .5,
                      borderRadius: 4, padding: '3px 8px',
                      background: post.status === 'published' ? 'rgba(0,169,110,.12)' : 'rgba(0,0,0,.06)',
                      color: post.status === 'published' ? 'var(--green)' : 'var(--text2)',
                    }}>{post.status === 'published' ? 'Published' : 'Draft'}</span>
                  </td>
                  <td style={{ padding: '13px 16px', color: 'var(--text2)' }}>{fmtDate(post.published_at) || '—'}</td>
                  <td style={{ padding: '13px 16px', color: 'var(--text2)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.author}</td>
                  <td style={{ padding: '13px 16px', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(post)}>Edit</button>
                      <button className="btn btn-outline btn-sm" style={{ color: '#CC0000', borderColor: '#FFCCCC' }}
                        onClick={() => handleDelete(post.id, post.title)} disabled={deletingId === post.id}>
                        {deletingId === post.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit / Create modal */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,11,42,.65)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '24px 16px' }}>
          <div className="scratch-card" style={{ width: '100%', maxWidth: 820, padding: 36, position: 'relative' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 900 }}>{editing.id ? 'Edit post' : 'New post'}</h2>
              <button onClick={() => setEditing(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text2)', lineHeight: 1 }}>×</button>
            </div>

            {/* Title */}
            <div className="form-group">
              <label className="form-label">Title</label>
              <input className="form-input" value={editing.title} onChange={(e) => fld('title', e.target.value)} placeholder="e.g. 5 Tips for Running a Successful P&C Fundraiser" />
            </div>

            {/* Slug */}
            <div className="form-group" style={{ marginBottom: 8 }}>
              <label className="form-label">Slug</label>
              <input className="form-input" value={editing.slug} onChange={(e) => fldSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="auto-generated-from-title" style={{ fontFamily: 'monospace', fontSize: 13 }} />
            </div>
            {editing.slug && <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 20 }}>Preview: <strong>/blog/{editing.slug}</strong></div>}

            {/* Excerpt */}
            <div className="form-group">
              <label className="form-label">Excerpt</label>
              <textarea className="form-input" rows={3} value={editing.excerpt} onChange={(e) => fld('excerpt', e.target.value)} placeholder="A short summary shown on the blog listing page…" style={{ resize: 'vertical' }} />
            </div>

            {/* Author + Status */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Author</label>
                <input className="form-input" value={editing.author} onChange={(e) => fld('author', e.target.value)} placeholder="LuckySquares Australia" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Status</label>
                <select className="form-input" value={editing.status} onChange={(e) => fld('status', e.target.value)}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>

            {/* Tags */}
            <div className="form-group">
              <label className="form-label">Tags (comma-separated)</label>
              <input className="form-input" value={editing.tags} onChange={(e) => fld('tags', e.target.value)} placeholder="e.g. fundraising, sport, community" />
              {tagChips.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  {tagChips.map((tag) => (
                    <span key={tag} style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: .5, background: 'var(--purple-light)', color: 'var(--purple)', borderRadius: 4, padding: '2px 8px' }}>{tag}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Cover image */}
            <div className="form-group">
              <label className="form-label">Cover image (optional)</label>

              {/* Tab toggle */}
              <div style={{ display: 'flex', gap: 0, marginBottom: 10, border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', width: 'fit-content' }}>
                {['upload', 'url'].map((tab) => (
                  <button key={tab} type="button" onClick={() => { setImageTab(tab); setUploadError(''); }}
                    style={{ padding: '6px 16px', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', background: imageTab === tab ? 'var(--purple)' : 'transparent', color: imageTab === tab ? '#fff' : 'var(--text2)', transition: 'background .15s' }}>
                    {tab === 'upload' ? '⬆ Upload file' : '🔗 Enter URL'}
                  </button>
                ))}
              </div>

              {imageTab === 'upload' ? (
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: uploading ? 'not-allowed' : 'pointer', background: 'var(--cream)', border: '1.5px dashed var(--border)', borderRadius: 'var(--radius)', padding: '14px 18px' }}>
                    <span style={{ fontSize: 22 }}>{uploading ? '⏳' : '🖼️'}</span>
                    <span style={{ fontSize: 13, color: 'var(--text2)' }}>
                      {uploading ? 'Uploading…' : 'Click to choose an image (JPEG, PNG, WebP — max 5 MB)'}
                    </span>
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageUpload} disabled={uploading} style={{ display: 'none' }} />
                  </label>
                  {uploadError && <p style={{ fontSize: 12, color: '#CC0000', marginTop: 6 }}>{uploadError}</p>}
                </div>
              ) : (
                <input className="form-input" value={editing.cover_image_url} onChange={(e) => fld('cover_image_url', e.target.value)} placeholder="https://example.com/image.jpg" type="url" />
              )}

              {/* Preview thumbnail */}
              {editing.cover_image_url && (
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <img src={editing.cover_image_url} alt="Cover preview" style={{ width: 120, height: 63, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} onError={(e) => { e.target.style.display = 'none'; }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--text2)', wordBreak: 'break-all' }}>{editing.cover_image_url}</div>
                    <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: 6, fontSize: 11, color: '#CC0000', borderColor: '#FFCCCC' }} onClick={() => { fld('cover_image_url', ''); setUploadError(''); }}>Remove</button>
                  </div>
                </div>
              )}
            </div>

            {/* Image prompt */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="form-label" style={{ marginBottom: 0 }}>AI image prompt</label>
                {editing.image_prompt && (
                  <button className="btn btn-outline btn-sm" style={{ fontSize: 11 }} onClick={copyImagePrompt}>
                    {copied ? 'Copied!' : 'Copy prompt'}
                  </button>
                )}
              </div>
              <textarea className="form-input" rows={3} value={editing.image_prompt} onChange={(e) => fld('image_prompt', e.target.value)}
                placeholder="Paste into Midjourney, DALL-E, or Ideogram to generate a cover image…"
                style={{ resize: 'vertical', fontSize: 13, background: editing.image_prompt ? '#FAFFF8' : undefined }} />
              {editing.image_prompt && <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 5 }}>Copy this prompt into your preferred AI image generator, then paste the resulting URL into Cover image URL above.</p>}
            </div>

            {/* AI Generate panel */}
            {showGenerate && (
              <div style={{ background: '#FFFBF0', border: '1.5px solid #F0D070', borderRadius: 'var(--radius)', padding: 24, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#7A5C00' }}>✨ Generate with AI</div>
                  <button onClick={() => { setShowGenerate(false); setGenerateError(''); }} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#7A5C00', lineHeight: 1 }}>×</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 800, color: '#7A5C00', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: .5 }}>Topic / working title</label>
                    <input className="form-input" value={generateForm.title} onChange={(e) => gfld('title', e.target.value)} placeholder="e.g. How to run a school raffle online" />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 800, color: '#7A5C00', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: .5 }}>Target audience</label>
                    <input className="form-input" value={generateForm.audience} onChange={(e) => gfld('audience', e.target.value)} placeholder="e.g. P&C committees, school coordinators" />
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, fontWeight: 800, color: '#7A5C00', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: .5 }}>Tone</label>
                  <select className="form-input" value={generateForm.tone} onChange={(e) => gfld('tone', e.target.value)}>
                    <option>Helpful and informative</option>
                    <option>Warm and community-focused</option>
                    <option>Professional and authoritative</option>
                  </select>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, fontWeight: 800, color: '#7A5C00', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: .5 }}>Key points to cover</label>
                  <textarea className="form-input" rows={3} value={generateForm.keyPoints} onChange={(e) => gfld('keyPoints', e.target.value)} placeholder="e.g. Why online is better than paper, how to share with parents…" style={{ resize: 'vertical' }} />
                </div>
                {generateError && <p style={{ fontSize: 12, color: '#CC0000', marginBottom: 12 }}>{generateError}</p>}
                <p style={{ fontSize: 12, color: '#7A5C00', marginBottom: 14, lineHeight: 1.6 }}>
                  AI will generate the full post, excerpt, tags, and an image prompt you can drop into Midjourney or DALL-E.
                </p>
                <button className="btn btn-primary btn-sm" onClick={handleGenerate} disabled={generating}>
                  {generating ? 'Generating…' : 'Generate post →'}
                </button>
              </div>
            )}

            {/* Content */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Content (markdown)</label>
                {!showGenerate && (
                  <button className="btn btn-outline btn-sm" style={{ color: 'var(--purple)', borderColor: 'var(--purple)', fontSize: 12 }} onClick={() => { setShowGenerate(true); setGenerateError(''); }}>
                    ✨ Generate with AI
                  </button>
                )}
              </div>
              <textarea className="form-input" rows={22} value={editing.content} onChange={(e) => fld('content', e.target.value)} placeholder="Write in markdown…" style={{ fontFamily: 'monospace', fontSize: 13, resize: 'vertical' }} />
            </div>

            {saveError && <p style={{ fontSize: 13, color: '#CC0000', marginBottom: 14 }}>{saveError}</p>}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : (editing.id ? 'Save changes' : 'Create post')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
