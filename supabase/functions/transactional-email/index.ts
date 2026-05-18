/**
 * Central transactional email dispatcher.
 * Called by the frontend or other Edge Functions with { type, data }.
 * All template content lives in _shared/templates.ts.
 */

import { sendEmail, ADMIN_EMAIL } from '../_shared/resend.ts';
import * as T from '../_shared/templates.ts';

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

  await sendEmail({ to, subject: template.subject, text: template.text });

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
