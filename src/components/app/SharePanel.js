'use client';

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function SharePanel({ fundraiser, onClose }) {
  const [url, setUrl]       = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(`${window.location.origin}/f/${fundraiser.id}`);
  }, [fundraiser.id]);

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200, backdropFilter: 'blur(3px)' }} />

      {/* Panel */}
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 201, width: '100%', maxWidth: 440, padding: '0 16px' }}>
        <div className="scratch-card" style={{ padding: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 900, marginBottom: 4 }}>Share your fundraiser</h2>
              <p style={{ fontSize: 13, color: 'var(--text2)' }}>Anyone with this link can buy squares</p>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text2)', lineHeight: 1, padding: 4 }}>×</button>
          </div>

          {/* QR code */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <div style={{ background: '#fff', padding: 16, borderRadius: 16, border: '1.5px solid var(--border)' }}>
              {url && <QRCodeSVG value={url} size={180} fgColor="var(--text)" />}
            </div>
          </div>

          {/* Copyable URL */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input
              readOnly
              value={url}
              style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border)', fontSize: 13, background: 'var(--cream)', color: 'var(--text)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis' }}
              onFocus={(e) => e.target.select()}
            />
            <button className="btn btn-primary btn-sm" onClick={copy} style={{ flexShrink: 0, minWidth: 80 }}>
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>

          {/* Share buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`🍀 ${fundraiser.title}: buy your lucky squares here: ${url}`)}`}
              target="_blank" rel="noreferrer"
              className="btn btn-outline btn-sm"
              style={{ flex: 1, justifyContent: 'center', textDecoration: 'none' }}
            >
              WhatsApp
            </a>
            <a
              href={`mailto:?subject=${encodeURIComponent(fundraiser.title)}&body=${encodeURIComponent(`🍀 ${fundraiser.title}\n\nBuy your lucky squares here:\n${url}`)}`}
              className="btn btn-outline btn-sm"
              style={{ flex: 1, justifyContent: 'center', textDecoration: 'none' }}
            >
              Email
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
