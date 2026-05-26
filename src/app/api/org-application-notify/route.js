const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL   = 'jwstott@me.com';

function sendTxEmail(type, to, data) {
  return fetch(`${SUPABASE_URL}/functions/v1/transactional-email`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ type, to, data }),
  }).catch((err) => console.error(`[org-application-notify] ${type} failed:`, err.message));
}

export async function POST(req) {
  const { first_name, org_name, abn, org_type, contact_name, contact_email, suburb, state } = await req.json();

  if (!contact_email || !org_name) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  await Promise.all([
    // Confirmation to the applicant
    sendTxEmail('org_application_received', contact_email, {
      first_name: first_name || 'there',
      org_name,
      abn,
      org_type,
    }),
    // Internal admin alert
    sendTxEmail('admin_new_org_application', ADMIN_EMAIL, {
      org_name,
      abn,
      org_type,
      contact_name,
      contact_email,
      suburb,
      state,
      applied_date: new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }),
    }),
  ]);

  return Response.json({ ok: true });
}
