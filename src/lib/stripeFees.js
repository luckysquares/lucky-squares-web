/**
 * Stripe processing fee configuration for square purchases.
 *
 * Update STRIPE_FEE_PCT and STRIPE_FEE_FIXED here if Stripe changes their
 * rates or Lucky Squares negotiates a different agreement.
 *
 * Do NOT apply these to the $19 Campaign Fee or Organisation membership —
 * Lucky Squares absorbs Stripe's cost on those as cost of doing business.
 * These are for buyer square purchase transactions only.
 */
export const STRIPE_FEE_PCT   = 0.0175; // 1.75% per transaction (Stripe AU standard rate)
export const STRIPE_FEE_FIXED = 0.30;   // $0.30 flat per transaction

/**
 * Calculate the transaction fee to add to a square purchase subtotal.
 *
 * Uses a gross-up formula so that when Stripe charges their fee on the
 * total amount (subtotal + tx fee), it equals exactly the tx fee the buyer
 * paid — meaning Lucky Squares nets zero on the fee component.
 *
 * Without gross-up: Stripe charges on the total, leaving a small shortfall.
 * With gross-up: fee is self-covering regardless of square price.
 *
 * @param {number} subtotal - Square price(s) before fees, in dollars
 * @returns {number} Transaction fee in dollars (unrounded)
 */
export function calcTxFee(subtotal) {
  return (subtotal * STRIPE_FEE_PCT + STRIPE_FEE_FIXED) / (1 - STRIPE_FEE_PCT);
}
