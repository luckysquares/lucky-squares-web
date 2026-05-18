/**
 * Central transactional email dispatcher.
 * Called by the frontend or other Edge Functions with { type, data }.
 * All template content lives in _shared/templates.ts.
 */

import { sendEmail, ADMIN_EMAIL } from '../_shared/resend.ts';
import * as T from '../_shared/templates.ts';

// These types go to internal admin addresses — skip opt-out checks and unsubscribe links
const ADMIN_TYPES = new Set(['admin_new_org_application']);

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const APP_URL      = Deno.env.get('NEXT_PUBLIC_APP_URL') ?? 'https://luckysquares.com.au';

async function rpc(fn: string, args: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify(args),
  });
  if (!res.ok) return null;
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let body: { type: string; to: string; data: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  const { type, to, data } = body;
  if (!type || !to) {
    return new Response('type and to are required', { status: 400 });
  }

  const template = buildTemplate(type, data ?? {});
  if (!template) {
    return new Response(`Unknown email type: ${type}`, { status: 400 });
  }

  const isAdmin = ADMIN_TYPES.has(type);

  // Check opt-out for non-admin emails
  if (!isAdmin) {
    const optedOut = await rpc('is_email_opted_out', { p_email: to });
    if (optedOut === true) {
      console.log(`[email] Skipping ${type} to ${to} — opted out`);
      return new Response(JSON.stringify({ ok: true, skipped: true }), { status: 200 });
    }
  }

  // Generate unsubscribe URL for non-admin emails
  let unsubscribeUrl: string | undefined;
  if (!isAdmin) {
    const token = await rpc('get_unsubscribe_token', { p_email: to });
    if (token) {
      unsubscribeUrl = `${APP_URL}/unsubscribe?token=${token}`;
    }
  }

  await sendEmail({ to, subject: template.subject, text: template.text, unsubscribe_url: unsubscribeUrl });

  return new Response(JSON.stringify({ ok: true, type }), { status: 200 });
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildTemplate(type: string, d: any): { subject: string; text: string } | null {
  switch (type) {
    // Organiser
    case 'organizer_welcome':             return T.emailOrganizerWelcome(d);
    case 'campaign_launched':             return T.emailCampaignLaunched(d);
    case 'square_sold':                   return T.emailSquareSold(d);
    case 'expiry_reminder_7':             return T.emailExpiryReminder7(d);
    case 'expiry_reminder_14':            return T.emailExpiryReminder14(d);
    case 'expiry_reminder_21':            return T.emailExpiryReminder21(d);
    case 'campaign_cancelled_organiser':  return T.emailCampaignCancelled(d);
    case 'draw_complete_organiser':       return T.emailDrawCompleteOrganiser(d);
    case 'referral_reward':               return T.emailReferralReward(d);
    case 'account_suspended':             return T.emailAccountSuspended(d);
    // Organisation plan
    case 'org_welcome':                   return T.emailOrgWelcome(d);
    case 'org_campaign_launched':         return T.emailOrgCampaignLaunched(d);
    case 'org_square_sold':               return T.emailOrgSquareSold(d);
    case 'org_monthly_summary':           return T.emailOrgMonthlySummary(d);
    case 'org_application_received':      return T.emailOrgApplicationReceived(d);
    case 'org_application_approved':      return T.emailOrgApplicationApproved(d);
    // Buyer
    case 'square_purchase_confirmation':  return T.emailSquarePurchaseConfirmation(d);
    case 'draw_result_winner':            return T.emailDrawResultWinner(d);
    case 'draw_result_no_win':            return T.emailDrawResultDidNotWin(d);
    case 'refund_notification':           return T.emailRefundNotification(d);
    // Org member invite
    case 'org_member_invite':             return T.emailOrgMemberInvite(d);
    // Admin internal
    case 'admin_new_org_application':     return T.emailAdminNewOrgApplication(d);
    // Welcome sequence
    case 'welcome_day1':                  return T.emailWelcomeDay1(d);
    case 'welcome_day3_no_campaign':      return T.emailWelcomeDay3NoCampaign(d);
    case 'welcome_day7_no_campaign':      return T.emailWelcomeDay7NoCampaign(d);
    case 'first_campaign_tips':           return T.emailFirstCampaignTips(d);
    case 're_engagement':                 return T.emailReEngagement(d);
    case 'seasonal':                      return T.emailSeasonal(d);
    case 'draw_milestone':                return T.emailDrawMilestone(d);

    default: return null;
  }
}
