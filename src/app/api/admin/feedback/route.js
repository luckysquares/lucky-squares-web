// Replaced by admin_get_survey_responses() RPC — admin/feedback/page.js calls that directly.
export async function GET() {
  return Response.json({ error: 'Use the admin_get_survey_responses RPC instead.' }, { status: 410 });
}
