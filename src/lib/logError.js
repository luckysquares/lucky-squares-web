/**
 * Server-side error logger — writes to the error_logs table via the admin client.
 *
 * Usage:
 *   import { logError } from '@/lib/logError';
 *   await logError({ route: '/api/stripe/webhook', message: err.message, stack: err.stack });
 *
 * All fields except `message` are optional.
 * This function never throws — failures are printed to the server console only.
 */
export async function logError({
  level    = 'error',   // 'error' | 'warn' | 'info'
  source   = 'server',  // 'server' | 'client' | 'database' | 'edge'
  route    = null,
  message,
  stack    = null,
  userId   = null,
  metadata = null,
}) {
  try {
    const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) return;

    await fetch(`${supabaseUrl}/rest/v1/error_logs`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify({
        level,
        source,
        route:    route   || null,
        message:  String(message || 'Unknown error').slice(0, 2000),
        stack:    stack   ? String(stack).slice(0, 5000) : null,
        user_id:  userId  || null,
        metadata: metadata || null,
      }),
    });
  } catch (err) {
    // Never let logging break the caller
    console.error('[logError] Failed to write error log:', err.message);
  }
}

/**
 * Convenience wrapper: extracts message + stack from an Error object.
 *
 * Usage:
 *   await logException(err, { route: '/api/foo', source: 'database' });
 */
export async function logException(err, context = {}) {
  await logError({
    message: err?.message || String(err),
    stack:   err?.stack   || null,
    ...context,
  });
}
