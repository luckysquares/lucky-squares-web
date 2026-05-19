import { getSupabaseClient } from './supabase/client';

export async function adminFetch(url, options = {}) {
  const { data: { session } } = await getSupabaseClient().auth.getSession();
  const token = session?.access_token;
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}
