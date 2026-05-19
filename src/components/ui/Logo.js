export default function Logo({ size = 44 }) {
  return (
    <img
      src="/lucky-squares-logo.png"
      alt="LuckySquares Australia"
      height={size}
      style={{ width: 'auto', display: 'block', objectFit: 'contain' }}
    />
  );
}
