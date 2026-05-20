// ABN validation using the published ATO checksum algorithm.
// Returns { valid: boolean, digits: string } where digits is the stripped 11-digit string.
export function validateAbn(raw) {
  const digits = raw.replace(/\s/g, '');
  if (!/^\d{11}$/.test(digits)) return { valid: false, digits };

  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  const adjusted = [Number(digits[0]) - 1, ...digits.slice(1).split('').map(Number)];
  const sum = adjusted.reduce((acc, d, i) => acc + d * weights[i], 0);

  return { valid: sum % 89 === 0, digits };
}

// Format an 11-digit ABN string as "XX XXX XXX XXX"
export function formatAbn(digits) {
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
}
