export default function Logo({ size = 44, dark = false }) {
  if (dark) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: size * 0.27, fontWeight: 900, color: '#fff', letterSpacing: '-.3px' }}>LuckySquares</span>
        <span style={{ fontSize: size * 0.12, color: 'rgba(255,255,255,.55)', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: 2 }}>Australia</span>
      </div>
    );
  }
  return (
    <img
      src="/lucky-squares-logo.png"
      alt="LuckySquares Australia"
      height={size}
      style={{ width: 'auto', display: 'block', objectFit: 'contain' }}
    />
  );
}
