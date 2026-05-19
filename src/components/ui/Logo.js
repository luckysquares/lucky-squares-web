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
      {/* Rainbow — drawn first so square tile covers the left leg */}
      <path d="M4 64 Q4 8 40 8 Q76 8 76 64"  stroke="#E8150A" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      <path d="M8 64 Q8 12 40 12 Q72 12 72 64" stroke="#FF7A00" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      <path d="M12 64 Q12 16 40 16 Q68 16 68 64" stroke="#FFD700" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      <path d="M16 64 Q16 20 40 20 Q64 20 64 64" stroke="#22BB44" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      <path d="M20 64 Q20 24 40 24 Q60 24 60 64" stroke="#0066EE" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      <path d="M24 64 Q24 28 40 28 Q56 28 56 64" stroke="#7722CC" strokeWidth="4.5" fill="none" strokeLinecap="round" />

      {/* Square tile — depth layer */}
      <rect x="5" y="45" width="40" height="35" rx="8" fill="#6BAE88" />
      {/* Square tile — face */}
      <rect x="2" y="42" width="40" height="35" rx="8" fill="#C5EDD5" stroke="#8EC9A8" strokeWidth="1.5" />

      {/* "42" */}
      <text x="22" y="61" fontSize="15" fontWeight="800" textAnchor="middle" fill="#1B6B3A" fontFamily="'Arial Black', Arial, sans-serif">42</text>
      {/* Checkmark */}
      <text x="22" y="72" fontSize="11" textAnchor="middle" fill="#2A8A4A" fontFamily="Arial, sans-serif">✓</text>
    </svg>
  );
}
