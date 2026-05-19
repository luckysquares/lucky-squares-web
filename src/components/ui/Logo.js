export default function Logo({ size = 44 }) {
  return (
    <img
      src="/lucky squares fundraiser logo.png"
      alt="LuckySquares Australia"
      width={size}
      height={size}
      style={{ objectFit: 'contain', display: 'block' }}
    />
  );
}
