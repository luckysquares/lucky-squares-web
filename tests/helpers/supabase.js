import { createClient } from '@supabase/supabase-js';

const supabaseUrl         = process.env.SUPABASE_URL;
const serviceRoleKey      = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for E2E tests');
}

export const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export const TEST_COUPON      = 'E2ETEST100';
export const TEST_EMAIL_OWNER = 'e2e-owner@luckysquares-test.invalid';
export const TEST_EMAIL_CONTRIB = 'e2e-contrib@luckysquares-test.invalid';
export const TEST_PASSWORD    = 'E2eTestPw99!';
export const TEST_ORG_NAME    = 'E2E Test Sporting Club';

// Creates the org owner test user with plan=org and an approved org_application.
// Returns { userId, orgAppId }.
export async function setupOrgOwner() {
  const sb = adminClient;

  // Create auth user with confirmed email so password login works immediately
  const { data: { user }, error } = await sb.auth.admin.createUser({
    email:          TEST_EMAIL_OWNER,
    password:       TEST_PASSWORD,
    email_confirm:  true,
    user_metadata:  { full_name: 'E2E Test Owner', organisation: TEST_ORG_NAME },
  });
  if (error) throw new Error(`setupOrgOwner: createUser failed — ${error.message}`);

  // Elevate to org plan
  await sb.from('profiles').update({ plan: 'org' }).eq('id', user.id);

  // Insert an approved org application so the admin portal shows it
  const { data: app } = await sb.from('org_applications').insert({
    user_id:      user.id,
    org_name:     TEST_ORG_NAME,
    abn:          '51824753556',
    org_type:     'Sporting club',
    street:       '1 Test Street',
    suburb:       'Adelaide',
    state:        'SA',
    postcode:     '5000',
    contact_name: 'E2E Test Owner',
    email:        TEST_EMAIL_OWNER,
    phone:        '0400000000',
    status:       'approved',
  }).select('id').single();

  return { userId: user.id, orgAppId: app?.id ?? null };
}

// Creates the contributor test user (plain account, no org plan).
export async function setupContributor() {
  const sb = adminClient;
  const { data: { user }, error } = await sb.auth.admin.createUser({
    email:         TEST_EMAIL_CONTRIB,
    password:      TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'E2E Test Contributor' },
  });
  if (error) throw new Error(`setupContributor: createUser failed — ${error.message}`);
  return { userId: user.id };
}

// Creates the 100% coupon used to bypass the $19 launch fee.
export async function setupTestCoupon() {
  await adminClient.from('coupons').upsert({
    code:           TEST_COUPON,
    description:    'E2E automated test coupon — do not delete manually',
    discount_type:  'percent',
    discount_value: 100,
    max_uses:       500,
    active:         true,
  }, { onConflict: 'code' });
}

// Reads the pending org_invite token for a given email so the test can
// navigate directly to /invite/{token} without touching email.
export async function getInviteToken(email) {
  const { data } = await adminClient
    .from('org_invites')
    .select('token')
    .eq('email', email.toLowerCase())
    .eq('accepted', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  return data?.token ?? null;
}

// Deletes all test data in the correct order to respect FK constraints.
export async function teardown() {
  const sb = adminClient;

  // Remove any fundraisers created by test users
  for (const email of [TEST_EMAIL_OWNER, TEST_EMAIL_CONTRIB]) {
    const { data: { users } } = await sb.auth.admin.listUsers({ perPage: 1000 });
    const u = users.find((x) => x.email === email);
    if (!u) continue;

    const { data: fundraisers } = await sb.from('fundraisers').select('id').eq('user_id', u.id);
    for (const f of fundraisers ?? []) {
      await sb.from('prizes').delete().eq('fundraiser_id', f.id);
      await sb.from('squares').delete().eq('fundraiser_id', f.id);
    }
    await sb.from('fundraisers').delete().eq('user_id', u.id);
    await sb.from('org_invites').delete().eq('email', email);
    await sb.from('org_applications').delete().eq('user_id', u.id);
    await sb.from('profiles').delete().eq('id', u.id);
    await sb.auth.admin.deleteUser(u.id);
  }

  // Remove test coupon
  await sb.from('coupons').delete().eq('code', TEST_COUPON);
}
