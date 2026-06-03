// Lucky Squares logo — SVG icon + Fraunces wordmark
// size     = icon height in px
// dark     = true on dark/coloured backgrounds (#7C5CF6 container, light text)
// priority = legacy prop (no-op, kept for call-site compatibility)

function LogoIcon({ size, dark }) {
  const container = dark ? '#7C5CF6'               : '#6B46F5';
  const squares   = dark ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.22)';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 46 46"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ flexShrink: 0, display: 'block' }}
    >
      <rect width="46" height="46" rx="11" fill={container} />

      {/* Row 1 — y=5, all 8px tall */}
      <rect x="5"  y="5"  width="8" height="8" rx="2" fill={squares} />
      <rect x="15" y="5"  width="8" height="8" rx="2" fill={squares} />
      <rect x="25" y="5"  width="8" height="8" rx="2" fill={squares} />
      <rect x="35" y="5"  width="6" height="8" rx="2" fill={squares} />

      {/* Row 2 — y=15, winner square at col 2 (x=15) */}
      <rect x="5"  y="15" width="8" height="8" rx="2" fill={squares} />
      <rect x="15" y="15" width="8" height="8" rx="2" fill="#F5C820" />
      <rect x="25" y="15" width="8" height="8" rx="2" fill={squares} />
      <rect x="35" y="15" width="6" height="8" rx="2" fill={squares} />

      {/* Row 3 — y=25 */}
      <rect x="5"  y="25" width="8" height="8" rx="2" fill={squares} />
      <rect x="15" y="25" width="8" height="8" rx="2" fill={squares} />
      <rect x="25" y="25" width="8" height="8" rx="2" fill={squares} />
      <rect x="35" y="25" width="6" height="8" rx="2" fill={squares} />

      {/* Row 4 — y=35, bottom row 6px tall */}
      <rect x="5"  y="35" width="8" height="6" rx="2" fill={squares} />
      <rect x="15" y="35" width="8" height="6" rx="2" fill={squares} />
      <rect x="25" y="35" width="8" height="6" rx="2" fill={squares} />
      <rect x="35" y="35" width="6" height="6" rx="2" fill={squares} />
    </svg>
  );
}

export default function Logo({ size = 44, dark = false, priority = false }) {
  // Wordmark colours per spec
  const luckyColor   = dark ? '#C4B5FD'                : '#6B46F5';
  const squaresColor = dark ? 'rgba(255,255,255,0.88)' : '#2A1F0F';
  const ausColor     = dark ? 'rgba(255,255,255,0.28)' : '#9C8060';

  // Font size: ~0.47× icon height, matching reference (36px icon → 18px, 44px → 21px)
  const fontSize = Math.round(size * 0.47);

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 11, lineHeight: 1 }}>
      <LogoIcon size={size} dark={dark} />
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {/* "Lucky Squares" — Lucky in brand purple, Squares in dark brown */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, lineHeight: 1.15 }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 900, fontSize, color: luckyColor, letterSpacing: '-0.3px' }}>Lucky</span>
          <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontStyle: 'italic', fontSize, color: squaresColor, letterSpacing: '-0.3px' }}>Squares</span>
        </div>
        {/* "AUSTRALIA" — Nunito 700, 8px, 2.2px letter-spacing */}
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 8, fontWeight: 700, letterSpacing: '2.2px', textTransform: 'uppercase', color: ausColor, marginTop: 3 }}>
          Australia
        </span>
      </div>
    </div>
  );
}
