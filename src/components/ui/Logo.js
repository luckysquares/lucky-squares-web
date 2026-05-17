export default function Logo({ size = 44 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M12 54 Q12 18 40 18 Q68 18 68 54" stroke="#FF0000" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M16 54 Q16 22 40 22 Q64 22 64 54" stroke="#FF7700" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M20 54 Q20 26 40 26 Q60 26 60 54" stroke="#FFDD00" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M24 54 Q24 30 40 30 Q56 30 56 54" stroke="#00CC44" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M28 54 Q28 34 40 34 Q52 34 52 54" stroke="#0088FF" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M32 54 Q32 38 40 38 Q48 38 48 54" stroke="#7700FF" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <ellipse cx="40" cy="54" rx="16" ry="4" fill="#3D2E1A" opacity=".18" />
      <path d="M26 54 Q24 70 40 70 Q56 70 54 54 Z" fill="#2A1F0E" />
      <rect x="23" y="51" width="34" height="7" rx="3.5" fill="#3D2E1A" />
      <circle cx="35" cy="53" r="3.5" fill="#F5A623" />
      <circle cx="40" cy="51" r="3.5" fill="#FFD04A" />
      <circle cx="45" cy="53" r="3.5" fill="#F5A623" />
      <circle cx="37.5" cy="49" r="2.5" fill="#FFD04A" />
      <circle cx="42.5" cy="48.5" r="2.5" fill="#F5A623" />
      <text x="6"  y="30" fontSize="10" fill="#FFD04A">✦</text>
      <text x="62" y="28" fontSize="8"  fill="#FFD04A">✦</text>
      <text x="58" y="14" fontSize="7"  fill="#FFD04A">✧</text>
    </svg>
  );
}
