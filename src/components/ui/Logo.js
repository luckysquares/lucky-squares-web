import Image from 'next/image';

export default function Logo({ size = 44, dark = false, priority = false }) {
  if (dark) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: size * 0.27, fontWeight: 900, color: '#fff', letterSpacing: '-.3px' }}>Lucky Squares</span>
        <span style={{ fontSize: size * 0.12, color: 'rgba(255,255,255,.55)', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: 2 }}>Australia</span>
      </div>
    );
  }
  return (
    <Image
      src="/lucky-squares-logo.png"
      alt="Lucky Squares Australia"
      width={400}
      height={200}
      priority={priority}
      sizes={`${Math.round(size * 2)}px`}
      style={{ width: 'auto', height: size, display: 'block', objectFit: 'contain' }}
    />
  );
}
