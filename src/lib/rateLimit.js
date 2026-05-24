/**
 * Simple in-memory rate limiter for Next.js API routes.
 *
 * ARCHITECTURE NOTE
 * This is an in-process, single-instance implementation. It works correctly for
 * local development and single-region serverless deployments. In a multi-region
 * or multi-instance setup (e.g. Vercel with >1 concurrent function invocations),
 * each instance maintains its own counter, so the effective limit is
 * (limit * number_of_instances) across the cluster.
 *
 * For production at scale, replace the `store` Map with a Redis-backed store
 * (e.g. Upstash Redis with @upstash/ratelimit). The API of checkRateLimit()
 * is designed to be a drop-in replacement when that time comes.
 *
 * USAGE
 *   import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
 *
 *   const ip = getClientIp(req);
 *   const { allowed } = checkRateLimit(`contact:${ip}`, { limit: 5, windowMs: 60 * 60 * 1000 });
 *   if (!allowed) return Response.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
 */

// In-process store: Map<key, { count: number, resetAt: number }>
// Entries are cleaned up lazily on access; no background timer needed.
const store = new Map();

/**
 * Check (and increment) the rate limit for a given key.
 *
 * @param {string} key       - Unique identifier, e.g. `'mariposa:1.2.3.4'`
 * @param {{ limit: number, windowMs: number }} opts
 *   limit     - Max requests allowed within the window
 *   windowMs  - Window duration in milliseconds
 *
 * @returns {{ allowed: boolean, remaining: number, resetIn: number }}
 *   allowed   - Whether this request should be permitted
 *   remaining - Requests remaining in the current window
 *   resetIn   - Milliseconds until the window resets
 */
export function checkRateLimit(key, { limit, windowMs }) {
  const now   = Date.now();
  const entry = store.get(key);

  // New window: no entry, or previous window has expired.
  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetIn: windowMs };
  }

  // Within the current window and limit not yet reached.
  if (entry.count < limit) {
    entry.count += 1;
    return { allowed: true, remaining: limit - entry.count, resetIn: entry.resetAt - now };
  }

  // Limit exceeded.
  return { allowed: false, remaining: 0, resetIn: entry.resetAt - now };
}

/**
 * Extract the real client IP from a Next.js Request.
 *
 * Vercel sets x-forwarded-for; other proxies may use x-real-ip.
 * Falls back to '0.0.0.0' if neither header is present (local dev).
 *
 * @param {Request} req
 * @returns {string}
 */
export function getClientIp(req) {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '0.0.0.0'
  );
}
