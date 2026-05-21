'use client';

/**
 * MemberBadge
 *
 * Renders a small inline badge for Foundation Members and/or Beta Testers.
 * Designed to sit next to an organiser's name in dashboard rows,
 * live grid headers, and campaign pages.
 *
 * Props:
 *   isFoundingMember  boolean
 *   isBetaTester      boolean
 *   size              'sm' | 'md'  (default 'sm')
 */
export default function MemberBadge({ isFoundingMember, isBetaTester, size = 'sm' }) {
  if (!isFoundingMember && !isBetaTester) return null;

  const fontSize   = size === 'md' ? 12 : 10;
  const padding    = size === 'md' ? '3px 8px' : '2px 6px';
  const gap        = size === 'md' ? 6 : 4;
  const marginLeft = size === 'md' ? 8 : 6;

  const baseStyle = {
    display:       'inline-flex',
    alignItems:    'center',
    gap,
    fontSize,
    fontWeight:    700,
    fontFamily:    'var(--font-nunito), sans-serif',
    letterSpacing: '0.02em',
    borderRadius:  99,
    padding,
    marginLeft,
    verticalAlign: 'middle',
    whiteSpace:    'nowrap',
    lineHeight:    1,
  };

  if (isFoundingMember) {
    return (
      <span
        style={{
          ...baseStyle,
          background: 'linear-gradient(135deg, #6B46F5 0%, #a855f7 100%)',
          color: '#fff',
        }}
        title="Foundation Member: one of the first 100 organisers to complete a Lucky Squares campaign"
      >
        <span style={{ fontSize: fontSize + 1 }}>🌟</span>
        Foundation Member
      </span>
    );
  }

  // Beta Tester
  return (
    <span
      style={{
        ...baseStyle,
        background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
        color: '#fff',
      }}
      title="Beta Tester: helped shape Lucky Squares before launch"
    >
      <span style={{ fontSize: fontSize + 1 }}>🧪</span>
      Beta Tester
    </span>
  );
}
