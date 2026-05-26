import { getAdminClient } from '@/lib/supabase/server';

export async function GET() {
  const db = getAdminClient();
  const { data, error } = await db
    .from('survey_responses')
    .select(`
      id,
      created_at,
      q1_key,
      q1_answer,
      q2_key,
      q2_answer,
      fundraiser_id,
      fundraisers ( title, org ),
      owner_id,
      profiles ( full_name )
    `)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ data });
}
