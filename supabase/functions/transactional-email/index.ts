/**
 * Central transactional email dispatcher.
 * Called by the frontend or other Edge Functions with { type, data }.
 * All template content lives in _shared/templates.ts.
 */

import { sendEmail, ADMIN_EMAIL } from '../_shared/resend.ts';
import * as T from '../_shared/templates.ts';

// These types go to internal admin addresses — skip opt-out checks and unsubscribe links
const ADMIN_TYPES = new Set(['admin_new_org_application']);

// Direct consequences of user actions — respected even if user previously opted out but re-enabled transactional
const TRANSACTIONAL_TYPES = new Set([
  'square_purchase_confirmation',
  'draw_result_winner',
  'draw_result_no_win',
  'refund_notification',
  'campaign_launched',
  'campaign_cancelled_organiser',
  'draw_complete_organiser',
  'square_sold',
  'square_daily_digest',
  'square_no_sales_nudge',
  'expiry_reminder_7',
  'expiry_reminder_14',
  'expiry_reminder_21',
  'referral_reward',
  'organizer_welcome',
  'org_welcome',
  'org_campaign_launched',
  'org_square_sold',
  'org_application_received',
  'org_application_approved',
  'org_application_rejected',
  'org_member_invite',
  'org_subscription_cancelled',
  'org_payment_failed',
  'org_renewal_reminder',
  'campaign_launched_notification',
  'account_suspended',
  'early_access_invite',
  'foundation_member',
  // Prize claim flow
  'organizer_prize_claim',
  'winner_claim_confirmation',
  // 50/50 raffle
  'fifty_fifty_ticket_confirmation',
  'fifty_fifty_draw_winner',
  'fifty_fifty_draw_no_win',
]);

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

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }
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

  const template = await buildTemplate(type, data ?? {});
  if (!template) {
    return new Response(`Unknown email type: ${type}`, { status: 400 });
  }

  const isAdmin        = ADMIN_TYPES.has(type);
  const isTransactional = TRANSACTIONAL_TYPES.has(type);

  // Check opt-out for non-admin emails
  if (!isAdmin) {
    const optedOut = await rpc('is_email_opted_out', { p_email: to, p_is_transactional: isTransactional });
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

  return new Response(JSON.stringify({ ok: true, type }), { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } });
});

// ── DB template override ─────────────────────────────────────────────────────
// Replaces {{variable}} placeholders with values from the data object.
function substituteVars(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = data[key];
    return val !== undefined && val !== null ? String(val) : '';
  });
}

// Checks the email_templates table for an admin override before falling back
// to the hardcoded template. Silent on DB errors — always falls back.
async function fetchDbTemplate(
  type: string,
  d: Record<string, unknown>,
): Promise<{ subject: string; text: string } | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/email_templates?key=eq.${encodeURIComponent(type)}&select=subject,body&limit=1`,
      { headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` } },
    );
    if (!res.ok) return null;
    const rows: { subject: string; body: string }[] = await res.json();
    if (!rows.length) return null;
    return {
      subject: substituteVars(rows[0].subject, d),
      text:    substituteVars(rows[0].body,    d),
    };
  } catch {
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buildTemplate(type: string, d: any): Promise<{ subject: string; text: string } | null> {
  // Check for an admin-edited override in the database first.
  const dbOverride = await fetchDbTemplate(type, d);
  if (dbOverride) return dbOverride;

  // Fall back to hardcoded templates.
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
    case 'org_application_rejected':      return T.emailOrgApplicationRejected(d);
    // Buyer
    case 'campaign_launched_notification': return T.emailCampaignLaunchedNotification(d);
    case 'square_purchase_confirmation':  return T.emailSquarePurchaseConfirmation(d);
    case 'draw_result_winner':            return T.emailDrawResultWinner(d);
    case 'draw_result_no_win':            return T.emailDrawResultDidNotWin(d);
    case 'square_daily_digest':           return T.emailSquareDailyDigest(d);
    case 'square_no_sales_nudge':         return T.emailSquareNoSalesNudge(d);
    case 'refund_notification':           return T.emailRefundNotification(d);
    // Org member invite
    case 'org_member_invite':             return T.emailOrgMemberInvite(d);
    // Early access invitation
    case 'early_access_invite':           return T.emailEarlyAccessInvite(d);
    // Admin internal
    case 'admin_new_org_application':     return T.emailAdminNewOrgApplication(d);
    case 'org_subscription_cancelled':    return T.emailOrgSubscriptionCancelled(d);
    case 'org_payment_failed':            return T.emailOrgPaymentFailed(d);
    case 'org_renewal_reminder':          return T.emailOrgRenewalReminder(d);
    // Foundation Member
    case 'foundation_member':             return T.emailFoundationMember(d);
    // Prize claim flow
    case 'organizer_prize_claim':         return T.emailOrganizerPrizeClaim(d);
    case 'winner_claim_confirmation':     return T.emailWinnerClaimConfirmation(d);
    // 50/50 raffle
    case 'fifty_fifty_ticket_confirmation': return T.emailFiftyFiftyTicketConfirmation(d);
    case 'fifty_fifty_draw_winner':         return T.emailFiftyFiftyDrawWinner(d);
    case 'fifty_fifty_draw_no_win':         return T.emailFiftyFiftyDrawNoWin(d);
    // Welcome sequence
    case 'welcome_day1':                  return T.emailWelcomeDay1(d);
    case 'welcome_day3_no_campaign':      return T.emailWelcomeDay3NoCampaign(d);  // legacy
    case 'welcome_day5_coupon':           return T.emailWelcomeDay5Coupon(d);
    case 'welcome_day7_no_campaign':      return T.emailWelcomeDay7NoCampaign(d);  // legacy
    case 'welcome_day9_no_campaign':      return T.emailWelcomeDay3NoCampaign(d);  // same content, new timing
    case 'welcome_day21_no_campaign':     return T.emailWelcomeDay21NoCampaign(d);
    case 'welcome_coupon_manual':         return T.emailWelcomeCouponManual(d);
    case 'first_campaign_tips':           return T.emailFirstCampaignTips(d);
    case 're_engagement':                 return T.emailReEngagement(d);
    case 'seasonal':                      return T.emailSeasonal(d);

    default: return null;
  }
}
