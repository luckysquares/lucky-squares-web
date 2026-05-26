/**
 * Generate a human-readable URL slug for a campaign.
 *
 * Format: {title-kebab}-{year}-{4-char-random}
 * e.g.  sunbury-primary-pandc-2025-k4m2
 *
 * The 4-char random suffix guarantees uniqueness without a DB round-trip.
 */
export function generateCampaignSlug(title) {
  const base = (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // strip punctuation / special chars
    .trim()
    .replace(/\s+/g, '-')        // spaces to hyphens
    .replace(/-+/g, '-')         // collapse double-hyphens
    .slice(0, 48);               // keep it reasonable

  const year   = new Date().getFullYear();
  const suffix = Math.random().toString(36).slice(2, 6); // 4-char a-z0-9

  return base ? `${base}-${year}-${suffix}` : `campaign-${year}-${suffix}`;
}
