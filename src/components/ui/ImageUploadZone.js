'use client';

import { useState, useRef } from 'react';

/**
 * Reusable image upload zone with click-to-browse and drag-and-drop support.
 *
 * Props:
 *   onFile(file)  — called with a File object when the user picks or drops an image
 *   uploading     — shows a loading overlay when true
 *   hint          — optional extra hint line (e.g. "landscape works best")
 *   accept        — MIME types string (default: image/jpeg,image/png,image/webp)
 */
export default function ImageUploadZone({ onFile, uploading = false, hint, accept = 'image/jpeg,image/png,image/webp' }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    onFile(file);
  };

  const onDragOver  = (e) => { e.preventDefault(); setDragging(true);  };
  const onDragLeave = (e) => { e.preventDefault(); setDragging(false); };
  const onDrop      = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div
      onClick={() => !uploading && inputRef.current?.click()}
      onDragOver={onDragOver}
      onDragEnter={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: '28px 20px',
        border: `2px dashed ${dragging ? 'var(--purple)' : 'var(--border2)'}`,
        borderRadius: 12,
        cursor: uploading ? 'default' : 'pointer',
        background: dragging ? 'var(--purple-light)' : 'var(--cream)',
        transition: 'border-color .15s, background .15s',
        userSelect: 'none',
      }}
    >
      <span style={{ fontSize: 32 }}>{dragging ? '⬇️' : '📷'}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: dragging ? 'var(--purple)' : 'var(--text2)' }}>
        {uploading ? 'Uploading…' : dragging ? 'Drop to upload' : 'Drag and drop, or click to browse'}
      </span>
      {hint && !uploading && (
        <span style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>{hint}</span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
    </div>
  );
}
