import { createClient } from '@supabase/supabase-js';

// Supabase clients for server-side use (API routes, server components, sitemap).
// These are created fresh per request — not singletons — and never exposed to the browser.
const SERVER_OPTIONS = { auth: { persistSession: false } };

/**
 * Service-role client — bypasses RLS.
 * Use in API routes and trusted server-side operations only.
 */
export function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    SERVER_OPTIONS,
  );
}

/**
 * Anon client for server components — respects RLS, safe for public reads.
 */
export function getAnonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SERVER_OPTIONS,
  );
}
