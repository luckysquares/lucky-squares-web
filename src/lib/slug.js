/**
 * Generate the base slug for a campaign: title-kebab-year
 * e.g. "Sunbury Primary P&C Fundraiser 2025" → "sunbury-primary-pc-fundraiser-2025"
 */
export function generateCampaignSlug(title) {
  const base = (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // strip punctuation / special chars
    .trim()
    .replace(/\s+/g, '-')        // spaces to hyphens
    .replace(/-+/g, '-')         // collapse double-hyphens
    .slice(0, 50);

  const year = new Date().getFullYear();
  return base ? `${base}-${year}` : `campaign-${year}`;
}

// Collision suffixes: first attempt is clean, then -b, -c, -d …
const SUFFIXES = ['', '-b', '-c', '-d', '-e', '-f', '-g', '-h', '-i', '-j'];

/**
 * Return a slug that doesn't already exist in the fundraisers table.
 * Checks each candidate in order and returns the first free one.
 * Extremely unlikely to exhaust all suffixes in practice.
 */
export async function resolveUniqueSlug(title, supabase) {
  const base = generateCampaignSlug(title);
  for (const suffix of SUFFIXES) {
    const candidate = base + suffix;
    const { data } = await supabase
      .from('fundraisers')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle();
    if (!data) return candidate;
  }
  // Absolute fallback — should never be reached
  return `${base}-${Date.now()}`;
}
