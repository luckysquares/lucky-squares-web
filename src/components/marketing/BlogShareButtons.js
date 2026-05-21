'use client';

import { useState } from 'react';

const ICON_SIZE = 16;

function FacebookIcon() {
  return (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.234 2.686.234v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
    </svg>
  );
}

function XIcon() {
  return (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  );
}

export default function BlogShareButtons({ url, title }) {
  const [copied, setCopied] = useState(false);

  const encoded  = encodeURIComponent(url);
  const encTitle = encodeURIComponent(title);

  const shares = [
    {
      label: 'Share on Facebook',
      icon: <FacebookIcon />,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encoded}`,
      color: '#1877F2',
    },
    {
      label: 'Share on X',
      icon: <XIcon />,
      href: `https://twitter.com/intent/tweet?url=${encoded}&text=${encTitle}`,
      color: '#000',
    },
    {
      label: 'Share on LinkedIn',
      icon: <LinkedInIcon />,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`,
      color: '#0A66C2',
    },
  ];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const btnBase = {
    display:        'inline-flex',
    alignItems:     'center',
    gap:            7,
    padding:        '8px 14px',
    borderRadius:   8,
    fontSize:       13,
    fontWeight:     700,
    cursor:         'pointer',
    textDecoration: 'none',
    border:         '1.5px solid var(--border)',
    background:     '#fff',
    color:          'var(--text)',
    transition:     'background .15s, border-color .15s, color .15s',
    whiteSpace:     'nowrap',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 4 }}>
        Share
      </span>

      {shares.map(({ label, icon, href, color }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          title={label}
          style={btnBase}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = color;
            e.currentTarget.style.color = '#fff';
            e.currentTarget.style.borderColor = color;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#fff';
            e.currentTarget.style.color = 'var(--text)';
            e.currentTarget.style.borderColor = 'var(--border)';
          }}
        >
          {icon}
          <span>{label.replace('Share on ', '')}</span>
        </a>
      ))}

      <button
        onClick={handleCopy}
        aria-label="Copy link"
        title="Copy link"
        style={{ ...btnBase, background: copied ? 'var(--green)' : '#fff', color: copied ? '#fff' : 'var(--text)', borderColor: copied ? 'var(--green)' : 'var(--border)' }}
        onMouseEnter={(e) => { if (!copied) { e.currentTarget.style.background = 'var(--cream)'; } }}
        onMouseLeave={(e) => { if (!copied) { e.currentTarget.style.background = '#fff'; } }}
      >
        <LinkIcon />
        <span>{copied ? 'Copied!' : 'Copy link'}</span>
      </button>
    </div>
  );
}
