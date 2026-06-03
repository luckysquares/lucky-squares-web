// Lucky Squares logo — SVG icon + Fraunces wordmark
// size  = icon height in px (controls proportional scaling)
// dark  = true when rendering on dark/coloured backgrounds (#7C5CF6 container, white text)

function LogoIcon({ size, dark }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 46 46"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ flexShrink: 0, display: 'block' }}
    >
      {/* Container */}
      <rect width="46" height="46" rx="11" fill={dark ? '#7C5CF6' : '#6B46F5'} />

      {/* Row 1 — y=5, all 8px tall */}
      <rect x="5"  y="5" width="8" height="8" rx="2" fill="rgba(255,255,255,0.22)" />
      <rect x="15" y="5" width="8" height="8" rx="2" fill="rgba(255,255,255,0.22)" />
      <rect x="25" y="5" width="8" height="8" rx="2" fill="rgba(255,255,255,0.22)" />
      <rect x="35" y="5" width="6" height="8" rx="2" fill="rgba(255,255,255,0.22)" />

      {/* Row 2 — y=15, winner square at col 2 (x=15) */}
      <rect x="5"  y="15" width="8" height="8" rx="2" fill="rgba(255,255,255,0.22)" />
      <rect x="15" y="15" width="8" height="8" rx="2" fill="#F5C820" />
      <rect x="25" y="15" width="8" height="8" rx="2" fill="rgba(255,255,255,0.22)" />
      <rect x="35" y="15" width="6" height="8" rx="2" fill="rgba(255,255,255,0.22)" />

      {/* Row 3 — y=25 */}
      <rect x="5"  y="25" width="8" height="8" rx="2" fill="rgba(255,255,255,0.22)" />
      <rect x="15" y="25" width="8" height="8" rx="2" fill="rgba(255,255,255,0.22)" />
      <rect x="25" y="25" width="8" height="8" rx="2" fill="rgba(255,255,255,0.22)" />
      <rect x="35" y="25" width="6" height="8" rx="2" fill="rgba(255,255,255,0.22)" />

      {/* Row 4 — y=35, bottom row 6px tall */}
      <rect x="5"  y="35" width="8" height="6" rx="2" fill="rgba(255,255,255,0.22)" />
      <rect x="15" y="35" width="8" height="6" rx="2" fill="rgba(255,255,255,0.22)" />
      <rect x="25" y="35" width="8" height="6" rx="2" fill="rgba(255,255,255,0.22)" />
      <rect x="35" y="35" width="6" height="6" rx="2" fill="rgba(255,255,255,0.22)" />
    </svg>
  );
}

export default function Logo({ size = 44, dark = false, priority = false }) {
  const fontSize   = Math.round(size * 0.32);
  const textColor  = dark ? '#fff'                   : 'var(--text)';
  const subColor   = dark ? 'rgba(255,255,255,0.55)' : 'var(--text2)';

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: Math.round(size * 0.2), lineHeight: 1 }}>
      <LogoIcon size={size} dark={dark} />
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {/* "Lucky Squares" — Lucky bold, Squares italic */}
        <div style={{ lineHeight: 1.15 }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 900,              fontSize, color: textColor, letterSpacing: '-0.3px' }}>Lucky</span>
          <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 900,              fontSize, color: textColor, letterSpacing: '-0.3px' }}> </span>
          <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontStyle: 'italic', fontSize, color: textColor, letterSpacing: '-0.3px' }}>Squares</span>
        </div>
        {/* "AUSTRALIA" — Nunito, 8px, spaced caps */}
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 8, fontWeight: 700, letterSpacing: '2.2px', textTransform: 'uppercase', color: subColor, marginTop: 3 }}>
          Australia
        </span>
      </div>
    </div>
  );
}
