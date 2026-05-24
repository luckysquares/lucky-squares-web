'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { getSupabaseClient, supabaseConfigured } from '@/lib/supabase/client';

/**
 * ErrorReporter — mounts once in the root layout.
 * Catches unhandled JS errors and promise rejections and sends them to /api/errors.
 * Silent on failure — never impacts the user experience.
 */
export default function ErrorReporter() {
  const pathname = usePathname();

  useEffect(() => {
    let userId = null;

    // Attempt to get current user id for richer logs (best effort, non-blocking)
    if (supabaseConfigured) {
      getSupabaseClient().auth.getSession().then(({ data }) => {
        userId = data?.session?.user?.id ?? null;
      }).catch(() => {});
    }

    const report = (message, stack = null) => {
      // Don't report noise from browser extensions or cross-origin scripts
      if (!message || message === 'Script error.' || message.includes('extension://')) return;

      fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          stack,
          route:  window.location.pathname,
          userId,
          metadata: {
            href:      window.location.href,
            userAgent: navigator.userAgent,
          },
        }),
      }).catch(() => {}); // silent
    };

    const handleError = (event) => {
      report(
        event.message || String(event.error),
        event.error?.stack || null,
      );
    };

    const handleUnhandledRejection = (event) => {
      const err = event.reason;
      report(
        err?.message || String(err) || 'Unhandled promise rejection',
        err?.stack || null,
      );
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null;
}
