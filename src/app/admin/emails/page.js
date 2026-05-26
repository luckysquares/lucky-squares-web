'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminFetch } from '@/lib/adminFetch';

// ── Placeholder data ──────────────────────────────────────────────────────────

const D = {
  first_name: 'Jamie',
  buyer_name: 'Alex Chen',
  campaign_title: 'Sunbury Primary P&C Fundraiser',
  org_name: 'Sunbury Primary School P&C',
  amount_raised: '1250.00',
  grid_size: 100,
  sold_count: 73,
  price_per_sq: '10',
  max_raise: '1000.00',
  campaign_url: 'https://luckysquares.com.au/c/sunbury-primary-2025',
  square_number: 42,
  square_numbers: '42, 67',
  amount_paid: '20.00',
  coupon_code: 'THANKS-XK9Q',
  referred_name: 'Sunbury Netball Club',
  reason: 'Suspected fraudulent activity on your account.',
  campaign_limit: 5,
  abn: '12 345 678 901',
  org_type: 'P&C Association',
  month_name: 'April 2025',
  campaign_count: 3,
  total_squares_sold: 218,
  total_raised: '2180.00',
  draws_completed: 2,
  active_campaign_count: 1,
  days_remaining: 9,
  squares_needed: 4,
  prize_summary: 'a $200 gift card',
  sales_today: 5,
  buyer_names: 'Sarah, Tom and 3 others',
  draw_type_description: 'Random draw at close of campaign',
  contact_email: 'treasurer@sunburypandc.org.au',
  contact_name: 'Jamie',
  prize_place: '1st',
  prize_description: '$200 Coles Myer gift card',
  winning_square: 42,
  winners: [
    { place: '1st', prize: '$200 Coles Myer gift card', square_number: 42, buyer_name: 'Alex Chen', prize_place: '1st', prize_description: '$200 Coles Myer gift card' },
    { place: '2nd', prize: '$100 JB Hi-Fi gift card', square_number: 17, buyer_name: 'Sarah Johnson', prize_place: '2nd', prize_description: '$100 JB Hi-Fi gift card' },
  ],
  org_name_invited: 'Sunbury Primary School P&C',
  invited_by_name: 'Jamie',
  invite_url: 'https://luckysquares.com.au/join/abc123',
  expires_days: 7,
  organiser_name: 'Jamie',
  season_name: 'Football season',
  season_opener_line: 'The footy season is just getting started and clubs all over Australia are looking for easy ways to raise money for their communities.',
};

const SIG = `Cheers,\nThe Lucky Squares team\nhello@luckysquares.com.au`;

function amt(v) {
  return `$${String(v).replace(/^\$/, '')}`;
}

// ── Template renderers ────────────────────────────────────────────────────────

function tplOrganizerWelcome() {
  return {
    subject: `Welcome to Lucky Squares, ${D.first_name}!`,
    text: `Hi ${D.first_name},

Welcome aboard! You've just joined a community of Australian schools, clubs, and charities using Lucky Squares to run simple, fun fundraisers.

Here's how it works in three steps:

1. Set up your grid: choose your grid size, set your price per square, and add your prizes. Takes about 5 minutes.
2. Share your link: send it via WhatsApp, social media, or email. Buyers pick their squares and pay on the spot.
3. Run your draw: when you're ready, hit the draw button and the winners are revealed instantly.

Ready to get started? Log in to create your first fundraiser:
https://luckysquares.com.au/fundraise

If you have any questions along the way, just reply to this email and we'll help you out.

${SIG}`,
  };
}

function tplCampaignLaunched() {
  return {
    subject: `Your fundraiser is live, ${D.first_name}!`,
    text: `Hi ${D.first_name},

${D.campaign_title} is live and ready for buyers. Here's your unique fundraiser link to share:

${D.campaign_url}

A few tips to get your first squares sold quickly:

- Share in your club or school WhatsApp group first. The first 10 squares usually sell within the first hour when it's shared with people who already know you.
- Post it on your Facebook or Instagram page with a quick note about what you're raising money for.
- If you're selling in person at a game or event, pull up the grid on your phone and let people pick their square right there.

Good luck! We're cheering you on.

${SIG}`,
  };
}

function tplSquareSold() {
  const subject = `You've sold your first square in ${D.campaign_title}!`;
  const body = `Hi ${D.first_name},

You've just sold your very first square in ${D.campaign_title} and we think that deserves a little celebration! Every great fundraiser starts exactly like this. The grid has officially come to life.

${D.buyer_name} has claimed square #${D.square_number}. Now get sharing — the more people who see your link, the faster that grid fills up.`;

  return {
    subject,
    text: `${body}

${SIG}

---
Prefer fewer emails? Log in to your dashboard to switch to a daily summary or turn off square sold notifications.`,
  };
}

function tplSquareDailyDigest() {
  return {
    subject: `${D.sales_today} squares sold today in ${D.campaign_title}`,
    text: `Hi ${D.first_name},

Here's your daily update for ${D.campaign_title}.

Squares sold today: ${D.sales_today} (${D.buyer_names})
Running total: ${D.sold_count} of ${D.grid_size} squares sold, ${amt(D.amount_raised)} raised

Keep sharing your link to keep the momentum going!

${D.campaign_url}

${SIG}

---
Prefer fewer emails? Log in to your dashboard to manage notification settings.`,
  };
}

function tplSquareNoSalesNudge() {
  return {
    subject: `A fresh share could get ${D.campaign_title} moving again`,
    text: `Hi ${D.first_name},

It's been a few days since the last square was sold in ${D.campaign_title}. A fresh share to your network is often all it takes to get things moving again.

${D.sold_count} of ${D.grid_size} squares sold so far. Here's your link to share:

${D.campaign_url}

A personal message to 3 or 4 people who haven't bought yet often works better than a group post at this stage.

${SIG}`,
  };
}

function tplExpiryReminder7() {
  return {
    subject: `How's your fundraiser going, ${D.first_name}?`,
    text: `Hi ${D.first_name},

${D.campaign_title} has been live for 7 days. You've sold ${D.sold_count} of ${D.grid_size} squares so far, which means $${D.amount_raised} raised for ${D.org_name}.

You've already covered your prize costs, so anything more you sell is pure profit for your cause. Keep going!

Log in to view your grid:
https://luckysquares.com.au/fundraise

${SIG}`,
  };
}

function tplExpiryReminder14() {
  return {
    subject: `Two weeks in: ${D.sold_count} squares sold`,
    text: `Hi ${D.first_name},

${D.campaign_title} is two weeks old. You've sold ${D.sold_count} of ${D.grid_size} squares, raising $${D.amount_raised} so far.

You have ${D.days_remaining} days remaining before the campaign expires. If your fundraiser hasn't covered prize costs by day 30, it will be automatically cancelled and buyers will be refunded.

If you need a boost, now is a great time to personally message a few people who haven't bought yet. A direct message converts much better than a group post.

Log in to view your grid:
https://luckysquares.com.au/fundraise

${SIG}`,
  };
}

function tplExpiryReminder21() {
  return {
    subject: `${D.days_remaining} days left for ${D.campaign_title}`,
    text: `Hi ${D.first_name},

Quick heads-up: ${D.campaign_title} expires in ${D.days_remaining} days.

You've sold ${D.sold_count} of ${D.grid_size} squares and raised $${D.amount_raised}.

You've covered your prize costs, which means you're good to draw whenever you're ready. You don't have to wait until day 30. Run your draw when it feels right!

Log in to view your grid:
https://luckysquares.com.au/fundraise

Need help? Just reply to this email.

${SIG}`,
  };
}

function tplCampaignCancelledOrganiser() {
  return {
    subject: `${D.campaign_title} has been cancelled`,
    text: `Hi ${D.first_name},

Unfortunately ${D.campaign_title} was cancelled because it didn't reach the minimum sales needed to cover prize costs before the 30-day limit.

All buyers will be refunded in full.

Stripe payments will be automatically refunded within 5 to 10 business days.

We know that's not the outcome you were hoping for. If you'd like to try again, our team is happy to chat about what works well for your type of organisation. Just reply to this email.

${SIG}`,
  };
}

function tplDrawCompleteOrganiser() {
  const winnerLines = D.winners
    .map((w) => `${w.place} Prize (${w.prize}): Square #${w.square_number}, ${w.buyer_name}`)
    .join('\n');

  const nextSteps = `Because your campaign used online payments, here's what happens next:

- Winners have been notified by email automatically.
- Your net funds raised (total collected minus platform fee and prize amounts) will be transferred to your registered account within 2 business days.
- Prize delivery is handled directly between you and each winner. Use the contact details in your campaign report to get in touch with them and arrange handover.`;

  return {
    subject: `The draw is done! Here are your winners`,
    text: `Hi ${D.first_name},

Your draw for ${D.campaign_title} is complete. Here are your results:

${winnerLines}

${nextSteps}

You raised ${amt(D.amount_raised)} for ${D.org_name} from ${D.sold_count} of ${D.grid_size} squares sold.

Want to share the result? Here's a quick message you can post:

"${D.campaign_title} draw is done! Big thanks to everyone who took part. We raised ${amt(D.amount_raised)} for ${D.org_name}. Congratulations to all our winners!"

Whenever you're ready to run your next campaign, we'll be here:
https://luckysquares.com.au/fundraise

${SIG}`,
  };
}

function tplReferralReward() {
  return {
    subject: `You've earned a free campaign, ${D.first_name}!`,
    text: `Hi ${D.first_name},

Great news: ${D.referred_name} just launched their first Lucky Squares fundraiser after you referred them. As promised, your next campaign is on us.

Your free campaign coupon code is:

${D.coupon_code}

Enter this code when launching your next campaign to waive the platform fee entirely.

Thanks for spreading the word. It means a lot to us and to the causes you're helping.

${SIG}`,
  };
}

function tplAccountSuspended() {
  return {
    subject: `Important notice about your Lucky Squares account`,
    text: `Hi ${D.first_name},

We're writing to let you know that your Lucky Squares account has been temporarily suspended.

Reason: ${D.reason}

While your account is suspended, you will not be able to launch new campaigns. Any campaigns already live and drawing will continue to operate normally.

If you believe this is an error or you'd like to discuss the matter, please reply to this email or contact us at hello@luckysquares.com.au. We aim to respond within 1 business day.

${SIG}`,
  };
}

function tplOrgWelcome() {
  return {
    subject: `Welcome to Lucky Squares, ${D.org_name}!`,
    text: `Hi ${D.first_name},

Welcome to the Lucky Squares Organisation Plan. You're all set to run fundraising campaigns for ${D.org_name}.

Here's what's available to you:

- Up to ${D.campaign_limit} active campaigns at once
- Full campaign management and reporting
- Buyer contact details for every campaign
- Priority support

Your organisation dashboard is ready to go. Create your first campaign whenever you're ready:
https://luckysquares.com.au/fundraise

If you have any questions or would like a walkthrough, just reply to this email and we'll get back to you quickly.

${SIG}`,
  };
}

function tplOrgCampaignLaunched() {
  return {
    subject: `New campaign live: ${D.campaign_title}`,
    text: `Hi ${D.first_name},

A new Lucky Squares campaign has just gone live under ${D.org_name}.

Campaign: ${D.campaign_title}
Grid size: ${D.grid_size} squares
Price per square: $${D.price_per_sq}
Potential raise at sell-out: $${D.max_raise}

View the campaign:
${D.campaign_url}

${SIG}`,
  };
}

function tplOrgSquareSold() {
  const subject = `Your first square just sold in ${D.campaign_title}!`;
  const body = `Hi ${D.first_name},

The first square in ${D.campaign_title} has just been sold and we think that deserves a moment. This is where every successful fundraiser begins!

${D.buyer_name} has claimed square #${D.square_number}. The grid is officially open for business.`;

  return {
    subject,
    text: `${body}

${SIG}

---
Prefer fewer emails? Log in to your dashboard to switch to a daily summary or turn off square sold notifications.`,
  };
}

function tplOrgMonthlySummary() {
  const activeLine = `\nYou currently have ${D.active_campaign_count} active campaign running. Keep sharing those links!\n`;

  return {
    subject: `Your Lucky Squares summary for ${D.month_name}`,
    text: `Hi ${D.first_name},

Here's a quick look at how ${D.org_name} performed on Lucky Squares in ${D.month_name}.

Campaigns run: ${D.campaign_count}
Squares sold: ${D.total_squares_sold}
Total raised: $${D.total_raised}
Draws completed: ${D.draws_completed}
${activeLine}
Log in to your dashboard:
https://luckysquares.com.au/fundraise

${SIG}`,
  };
}

function tplOrgApplicationReceived() {
  return {
    subject: `We've received your application, ${D.org_name}`,
    text: `Hi ${D.first_name},

Thanks for applying for the Lucky Squares Organisation Plan. We've received your application and will be in touch shortly.

Here's what we received:

Organisation: ${D.org_name}
ABN: ${D.abn}
Type: ${D.org_type}

We review all applications personally and aim to get back to you within 2 business days.

In the meantime, you can get started on your first campaign straight away. Just log in and create one when you're ready.

${SIG}`,
  };
}

function tplOrgApplicationApproved() {
  return {
    subject: `Great news: ${D.org_name} is approved!`,
    text: `Hi ${D.first_name},

We've reviewed your application and ${D.org_name} has been approved for the Lucky Squares Organisation Plan.

Your account has been upgraded and you now have access to all organisation features. Head to your dashboard to get your next campaign started:
https://luckysquares.com.au/fundraise

Welcome to the team. We're really glad to have ${D.org_name} on board. If there's anything we can do to help you hit the ground running, just reply to this email.

${SIG}`,
  };
}

function tplSquarePurchaseConfirmation() {
  return {
    subject: `You're in! Squares confirmed`,
    text: `Hi Alex,

You've secured your squares in ${D.campaign_title} — good luck in the draw!

Squares: #42, #67
Amount paid: ${amt(D.amount_paid)}
Draw: ${D.draw_type_description}

Thanks for supporting ${D.org_name}'s fundraiser. We'll send you the result as soon as the draw is complete.

View the live grid:
${D.campaign_url}

${SIG}`,
  };
}

function tplDrawResultWinner() {
  return {
    subject: `You won in ${D.campaign_title}!`,
    text: `Hi Alex,

Congratulations, you're a winner!

${D.campaign_title} has been drawn and your square #${D.winning_square} won the ${D.prize_place}.

Prize: ${D.prize_description}

${D.org_name} will be in touch shortly to arrange delivery of your prize. If you haven't heard from them within a few days, you can contact them directly at ${D.contact_email}.

Thanks for supporting ${D.org_name}. Enjoy your prize!

${SIG}`,
  };
}

function tplDrawResultNoWin() {
  const winnerLines = D.winners
    .map((w) => `${w.prize_place} (${w.prize_description}): Square #${w.square_number}`)
    .join('\n');

  return {
    subject: `The results are in for ${D.campaign_title}`,
    text: `Hi Alex,

The draw for ${D.campaign_title} has been completed.

The winning square(s):

${winnerLines}

You didn't win this time, but your support made a real difference to ${D.org_name}. The fundraiser raised $${D.amount_raised} in total. Thank you for being part of it.

${SIG}`,
  };
}

function tplRefundNotification() {
  return {
    subject: `Refund for your squares in ${D.campaign_title}`,
    text: `Hi Alex,

${D.campaign_title} has been cancelled before the draw took place.

Your payment of $${D.amount_paid} for square(s) #${D.square_numbers} will be refunded in full.

Your refund will appear on your card within 5 to 10 business days.

We're sorry this one didn't go ahead. Thanks for your support.

${SIG}`,
  };
}

function tplCampaignLaunchedNotification() {
  return {
    subject: `New fundraiser from ${D.organiser_name}: ${D.campaign_title}`,
    text: `Hi there,

You asked to be notified when ${D.organiser_name} launched their next fundraiser — and it's now live!

${D.campaign_title}

Get your squares here:
${D.campaign_url}

Good luck!

${SIG}

---
You're receiving this because you opted in after purchasing squares in a previous ${D.organiser_name} fundraiser. To stop receiving these notifications, click the unsubscribe link in any Lucky Squares email.`,
  };
}

function tplWelcomeDay1() {
  return {
    subject: `Set up your first campaign in 5 minutes`,
    text: `Hi ${D.first_name},

Now that you're set up, here's the quickest way to get your first fundraiser live.

Step 1: Create your grid. Choose 25, 50, or 100 squares. Set your price per square (most campaigns price squares between $5 and $10). Add a prize or two and a short description of what you're raising money for.

Step 2: Launch it. Pay the one-off platform fee and your live link is ready to share immediately.

Step 3: Share it. Drop the link into your WhatsApp group, post it on Facebook, or hand out the URL at your next game or meeting.

Most first-time organisers have their first square sold within an hour of launching.

Create your first campaign:
https://luckysquares.com.au/fundraise

${SIG}`,
  };
}

function tplWelcomeDay3NoCampaign() {
  return {
    subject: `A primary school in Melbourne raised $1,000 in four days`,
    text: `Hi ${D.first_name},

We wanted to share a quick story from one of our organisers.

A P&C treasurer at a primary school in Melbourne set up a 100-square grid at $10 per square. She shared it in the school WhatsApp group on a Tuesday morning. By Friday afternoon, every square was sold and the school had raised $1,000 before prizes.

She told us the hardest part was deciding what prizes to offer. Everything else just happened.

If you haven't had a chance to set up your campaign yet, it takes about five minutes. We'd love to help you have a similar story to share.

Set up your campaign:
https://luckysquares.com.au/fundraise

${SIG}`,
  };
}

function tplWelcomeDay7NoCampaign() {
  return {
    subject: `Can we help you get started?`,
    text: `Hi ${D.first_name},

You signed up a week ago and we haven't seen a campaign from you yet. That's completely fine, life gets busy.

But if there's something holding you back, we'd genuinely love to help. A lot of first-time organisers have questions about things like prize sourcing, how bank transfers work, or whether their organisation type is a good fit.

Just reply to this email and tell us where you're up to. We'll get back to you personally.

Or jump straight in:
https://luckysquares.com.au/fundraise

${SIG}`,
  };
}

function tplFirstCampaignTips() {
  return {
    subject: `Tips to sell out ${D.campaign_title} fast`,
    text: `Hi ${D.first_name},

Congratulations on launching your first campaign! Here are a few things that work really well for getting squares sold quickly.

Share in waves, not all at once. Post in your main group first, then follow up with a personal message to 5 or 10 people who you know would support you. A direct message converts much better than a group post.

Make it visual. A screenshot of the grid with a few squares already sold creates urgency. People are more likely to buy when they can see others already have.

Use this message as a template (feel free to edit it):

"Hey! I'm running a Lucky Squares fundraiser for ${D.org_name}. Pick a number, pay $${D.price_per_sq}, and you're in the draw to win ${D.prize_summary}. Here's the link: ${D.campaign_url}"

Good luck, we're rooting for you!

${SIG}`,
  };
}

function tplReEngagement() {
  return {
    subject: `Ready for your next fundraiser, ${D.first_name}?`,
    text: `Hi ${D.first_name},

It's been a little while since your last Lucky Squares campaign. We hope ${D.org_name} is going well.

When you're ready to run another fundraiser, everything is still set up and waiting for you. Your previous campaign details are saved in your dashboard so you can use them as a starting point.

Go to your dashboard:
https://luckysquares.com.au/fundraise

No pressure, just wanted to check in and let you know we're here when you need us.

${SIG}`,
  };
}

function tplSeasonal() {
  return {
    subject: `${D.season_name} is here: is ${D.org_name} ready to fundraise?`,
    text: `Hi ${D.first_name},

${D.season_opener_line}

It's one of the most popular times of year for Lucky Squares fundraisers. People are engaged, communities are gathering, and everyone's in the spirit of it.

If you're thinking about running a fundraiser this season, now is a great time to get set up so your campaign is live when the energy is highest.

Set up a campaign:
https://luckysquares.com.au/fundraise

${SIG}`,
  };
}

function tplOrgMemberInvite() {
  return {
    subject: `You've been invited to join ${D.org_name} on Lucky Squares`,
    text: `Hi there,

${D.invited_by_name} has invited you to join ${D.org_name} as a contributor on Lucky Squares Australia.

As a contributor, you'll be able to view and help manage the organisation's fundraising campaigns.

Accept your invite here (link expires in ${D.expires_days} days):
${D.invite_url}

If you don't have a Lucky Squares account yet, you'll be able to create one when you click the link above.

If you weren't expecting this invite, you can safely ignore this email.

${SIG}`,
  };
}

// ── Email list ────────────────────────────────────────────────────────────────

const EMAIL_GROUPS = [
  {
    label: 'Organiser',
    items: [
      { key: 'organizer_welcome',            label: 'Welcome email',              render: tplOrganizerWelcome },
      { key: 'campaign_launched',            label: 'Campaign launched',          render: tplCampaignLaunched },
      { key: 'square_sold',                  label: 'First square sold',          render: tplSquareSold },
      { key: 'square_daily_digest',          label: 'Daily sales digest',         render: tplSquareDailyDigest },
      { key: 'square_no_sales_nudge',        label: 'No sales nudge (3 days)',    render: tplSquareNoSalesNudge },
      { key: 'expiry_reminder_7',            label: '7-day reminder',             render: tplExpiryReminder7 },
      { key: 'expiry_reminder_14',           label: '14-day reminder',            render: tplExpiryReminder14 },
      { key: 'expiry_reminder_21',           label: '21-day reminder',            render: tplExpiryReminder21 },
      { key: 'campaign_cancelled_organiser', label: 'Campaign cancelled',         render: tplCampaignCancelledOrganiser },
      { key: 'draw_complete_organiser',      label: 'Draw complete',              render: tplDrawCompleteOrganiser },
      { key: 'referral_reward',              label: 'Referral reward',            render: tplReferralReward },
      { key: 'account_suspended',            label: 'Account suspended',          render: tplAccountSuspended },
    ],
  },
  {
    label: 'Organisation plan',
    items: [
      { key: 'org_welcome',                  label: 'Org welcome',                render: tplOrgWelcome },
      { key: 'org_campaign_launched',        label: 'Org campaign launched',      render: tplOrgCampaignLaunched },
      { key: 'org_square_sold',              label: 'Org first square sold',      render: tplOrgSquareSold },
      { key: 'org_monthly_summary',          label: 'Org monthly summary',        render: tplOrgMonthlySummary },
      { key: 'org_application_received',     label: 'Application received',       render: tplOrgApplicationReceived },
      { key: 'org_application_approved',     label: 'Application approved',       render: tplOrgApplicationApproved },
    ],
  },
  {
    label: 'Buyer',
    items: [
      { key: 'square_purchase_confirmation', label: 'Purchase confirmation',      render: tplSquarePurchaseConfirmation },
      { key: 'draw_result_winner',           label: 'Draw result: winner',        render: tplDrawResultWinner },
      { key: 'draw_result_no_win',           label: 'Draw result: no win',        render: tplDrawResultNoWin },
      { key: 'refund_notification',          label: 'Refund notification',        render: tplRefundNotification },
      { key: 'campaign_launched_notification', label: 'New campaign notification', render: tplCampaignLaunchedNotification },
    ],
  },
  {
    label: 'Welcome sequence',
    items: [
      { key: 'welcome_day1',                 label: 'Welcome Day 1',              render: tplWelcomeDay1 },
      { key: 'welcome_day3_no_campaign',     label: 'Welcome Day 3 (no campaign)', render: tplWelcomeDay3NoCampaign },
      { key: 'welcome_day7_no_campaign',     label: 'Welcome Day 7 (no campaign)', render: tplWelcomeDay7NoCampaign },
      { key: 'first_campaign_tips',          label: 'First campaign tips',        render: tplFirstCampaignTips },
      { key: 're_engagement',                label: 'Re-engagement',              render: tplReEngagement },
      { key: 'seasonal',                     label: 'Seasonal',                   render: tplSeasonal },
    ],
  },
  {
    label: 'Org member',
    items: [
      { key: 'org_member_invite',            label: 'Org member invite',          render: tplOrgMemberInvite },
    ],
  },
];

const ALL_ITEMS = EMAIL_GROUPS.flatMap((g) => g.items);

// ── Variables available in templates ─────────────────────────────────────────
const COMMON_VARS = [
  'first_name','buyer_name','campaign_title','org_name','campaign_url',
  'amount_raised','amount_paid','square_number','square_numbers','sold_count',
  'grid_size','price_per_sq','draw_type_description','contact_email',
  'contact_name','prize_description','prize_place','winning_square',
  'invite_url','invited_by_name','expires_days','organiser_name',
  'coupon_code','days_remaining','squares_needed','prize_summary',
  'month_name','total_raised','total_squares_sold','draws_completed',
  'active_campaign_count','abn','org_type','reason','campaign_limit',
];

// Render a plain-text string with bare URLs converted to clickable <a> tags
function TextWithLinks({ text }) {
  if (!text) return null;
  const URL_RE = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(URL_RE);
  return (
    <>
      {parts.map((part, i) =>
        URL_RE.test(part)
          ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: '#1A7A55', textDecoration: 'underline' }}>{part}</a>
          : part
      )}
    </>
  );
}

// Substitute {{var}} in a string using the preview D object
function previewSubstitute(str) {
  if (!str) return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = D[key];
    return val !== undefined && val !== null ? String(val) : `{{${key}}}`;
  });
}

// ── Page component ────────────────────────────────────────────────────────────

export default function EmailPreviewPage() {
  const [selectedKey,   setSelectedKey]   = useState(ALL_ITEMS[0].key);
  const [mode,          setMode]          = useState('preview'); // 'preview' | 'edit'
  const [customKeys,    setCustomKeys]    = useState(new Set());
  const [dbTemplate,    setDbTemplate]    = useState(null);   // {subject,body} from DB or null
  const [editSubject,   setEditSubject]   = useState('');
  const [editBody,      setEditBody]      = useState('');
  const [saving,        setSaving]        = useState(false);
  const [saveMsg,       setSaveMsg]       = useState('');

  // Load the list of customised template keys on mount
  useEffect(() => {
    adminFetch('/api/admin/emails/templates/list')
      .then((r) => r.ok ? r.json() : [])
      .then((rows) => setCustomKeys(new Set((rows || []).map((r) => r.key))))
      .catch(() => {});
  }, []);

  // When selected template changes, load its DB override (if any)
  const loadDbTemplate = useCallback(async (key) => {
    setDbTemplate(null);
    try {
      const res = await adminFetch(`/api/admin/emails/templates/${key}`);
      if (!res.ok) { setDbTemplate(null); return; }
      const data = await res.json();
      setDbTemplate(data || null);
      if (data) {
        setEditSubject(data.subject);
        setEditBody(data.body);
      } else {
        // Pre-populate with the hardcoded default
        const item = ALL_ITEMS.find((i) => i.key === key);
        const def  = item ? item.render() : null;
        setEditSubject(def?.subject || '');
        setEditBody(def?.text || '');
      }
    } catch {
      setDbTemplate(null);
    }
  }, []);

  useEffect(() => {
    setMode('preview');
    setSaveMsg('');
    loadDbTemplate(selectedKey);
  }, [selectedKey, loadDbTemplate]);

  const handleSave = async () => {
    setSaving(true); setSaveMsg('');
    try {
      const res = await adminFetch(`/api/admin/emails/templates/${selectedKey}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ subject: editSubject, body: editBody }),
      });
      if (res.ok) {
        setSaveMsg('Saved');
        setCustomKeys((prev) => new Set([...prev, selectedKey]));
        setDbTemplate({ subject: editSubject, body: editBody });
        setMode('preview');
      } else {
        setSaveMsg('Error saving');
      }
    } catch {
      setSaveMsg('Error saving');
    }
    setSaving(false);
  };

  const handleReset = async () => {
    if (!confirm('Reset this template to the default? Your edits will be permanently removed.')) return;
    await adminFetch(`/api/admin/emails/templates/${selectedKey}`, { method: 'DELETE' });
    setCustomKeys((prev) => { const s = new Set(prev); s.delete(selectedKey); return s; });
    setDbTemplate(null);
    const item = ALL_ITEMS.find((i) => i.key === selectedKey);
    const def  = item ? item.render() : null;
    setEditSubject(def?.subject || '');
    setEditBody(def?.text || '');
    setSaveMsg('Reset to default');
    setMode('preview');
  };

  const selected    = ALL_ITEMS.find((i) => i.key === selectedKey);
  const isCustom    = customKeys.has(selectedKey);
  const previewEmail = dbTemplate
    ? { subject: previewSubstitute(dbTemplate.subject), text: previewSubstitute(dbTemplate.body) }
    : (selected ? selected.render() : null);

  const inp = {
    width: '100%', padding: '8px 12px', borderRadius: 8,
    border: '1.5px solid #E5E0D5', fontSize: 13, fontFamily: 'inherit',
    color: '#1A1209', boxSizing: 'border-box', background: '#fff',
  };

  return (
    <div style={{ display: 'flex', gap: 0, minHeight: 'calc(100vh - 80px)', alignItems: 'flex-start' }}>

      {/* Sidebar */}
      <div style={{
        width: 240, flexShrink: 0, background: '#fff',
        border: '1.5px solid #E5E0D5', borderRadius: 16, overflow: 'hidden',
        position: 'sticky', top: 24, maxHeight: 'calc(100vh - 108px)', overflowY: 'auto',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #F0EAE0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9C8060', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Email templates</div>
        </div>
        {EMAIL_GROUPS.map((group) => (
          <div key={group.label}>
            <div style={{ padding: '10px 20px 4px', fontSize: 10, fontWeight: 700, color: '#C8BFB0', textTransform: 'uppercase', letterSpacing: '0.9px' }}>
              {group.label}
            </div>
            {group.items.map((item) => {
              const isActive  = item.key === selectedKey;
              const isCust    = customKeys.has(item.key);
              return (
                <button
                  key={item.key}
                  onClick={() => setSelectedKey(item.key)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', textAlign: 'left', padding: '8px 20px', fontSize: 12,
                    fontWeight: isActive ? 700 : 400,
                    color: isActive ? '#1A7A55' : '#1A1209',
                    background: isActive ? '#F0FBF4' : 'transparent',
                    border: 'none', borderLeft: isActive ? '3px solid #1A7A55' : '3px solid transparent',
                    cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1.4,
                  }}
                >
                  <span>{item.label}</span>
                  {isCust && (
                    <span style={{ fontSize: 9, fontWeight: 800, background: '#FEF3C7', color: '#92400E', borderRadius: 4, padding: '1px 5px', marginLeft: 4, flexShrink: 0 }}>
                      CUSTOM
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Main panel */}
      <div style={{ flex: 1, minWidth: 0, paddingLeft: 24 }}>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 900, color: '#1A1209', margin: '0 0 4px' }}>Email templates</h1>
            <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>
              {mode === 'preview'
                ? (isCustom ? 'Showing your custom version. Preview uses placeholder data.' : 'Showing default template. Preview uses placeholder data.')
                : 'Editing mode. Use {{variable}} for dynamic values.'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {saveMsg && <span style={{ fontSize: 12, color: saveMsg.startsWith('Error') ? '#DC2626' : '#15803D', fontWeight: 700 }}>{saveMsg}</span>}
            {mode === 'preview' && (
              <button
                onClick={() => { setMode('edit'); setSaveMsg(''); }}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #E5E0D5', background: '#fff', color: '#1A1209', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Edit template
              </button>
            )}
            {mode === 'edit' && (
              <>
                <button
                  onClick={() => { setMode('preview'); setSaveMsg(''); }}
                  style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #E5E0D5', background: '#fff', color: '#1A1209', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Cancel
                </button>
                {isCustom && (
                  <button
                    onClick={handleReset}
                    style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #FECACA', background: '#FEF2F2', color: '#DC2626', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    Reset to default
                  </button>
                )}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: saving ? '#E5E0D5' : '#7C3AED', color: saving ? '#9C8060' : '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  {saving ? 'Saving...' : 'Save template'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Preview mode */}
        {mode === 'preview' && previewEmail && (
          <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #E5E0D5', overflow: 'hidden' }}>
            <div style={{ padding: '20px 28px', borderBottom: '1px solid #F0EAE0', background: '#FAFAF8' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#9C8060', textTransform: 'uppercase', letterSpacing: '0.8px', paddingTop: 2, flexShrink: 0, width: 64 }}>Template</span>
                <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#4A3728', background: '#F0EAE0', padding: '1px 8px', borderRadius: 5 }}>{selectedKey}</span>
                {isCustom && <span style={{ fontSize: 10, fontWeight: 800, background: '#FEF3C7', color: '#92400E', borderRadius: 4, padding: '2px 7px' }}>CUSTOM</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#9C8060', textTransform: 'uppercase', letterSpacing: '0.8px', paddingTop: 3, flexShrink: 0, width: 64 }}>Subject</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#1A1209', lineHeight: 1.4 }}>{previewEmail.subject}</span>
              </div>
            </div>
            <div style={{ padding: '28px 28px 20px' }}>
              <pre style={{ fontFamily: '"Georgia","Times New Roman",serif', fontSize: 14, lineHeight: 1.8, color: '#1A1209', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, maxWidth: 640 }}>
                <TextWithLinks text={previewEmail.text} />
              </pre>
            </div>
            <div style={{ padding: '12px 28px', borderTop: '1px solid #F0EAE0', background: '#FAFAF8', fontSize: 11, color: '#9C8060' }}>
              {isCustom
                ? 'This is your custom version. Click "Edit template" to modify it.'
                : 'Using default template from code. Click "Edit template" to create a custom version.'}
            </div>
          </div>
        )}

        {/* Edit mode */}
        {mode === 'edit' && (
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            {/* Editor */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #E5E0D5', padding: '24px 28px' }}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Subject line</label>
                  <input
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    style={inp}
                    placeholder="Subject line..."
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Body</label>
                  <textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    rows={24}
                    style={{ ...inp, resize: 'vertical', lineHeight: 1.7, fontFamily: 'monospace', fontSize: 12 }}
                    placeholder="Email body... use {{variable}} for dynamic values."
                  />
                </div>
              </div>

              {/* Live preview */}
              {editSubject && editBody && (
                <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #E5E0D5', overflow: 'hidden', marginTop: 16 }}>
                  <div style={{ padding: '12px 20px', borderBottom: '1px solid #F0EAE0', background: '#FAFAF8', fontSize: 11, fontWeight: 800, color: '#9C8060', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                    Live preview (placeholder data)
                  </div>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #F0EAE0' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#9C8060', marginRight: 8 }}>Subject:</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#1A1209' }}>{previewSubstitute(editSubject)}</span>
                  </div>
                  <div style={{ padding: '16px 20px' }}>
                    <pre style={{ fontFamily: '"Georgia","Times New Roman",serif', fontSize: 13, lineHeight: 1.7, color: '#1A1209', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
                      <TextWithLinks text={previewSubstitute(editBody)} />
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Variables reference panel */}
            <div style={{ width: 220, flexShrink: 0, background: '#fff', border: '1.5px solid #E5E0D5', borderRadius: 16, padding: '18px 16px', position: 'sticky', top: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12 }}>Available variables</div>
              <div style={{ fontSize: 10, color: '#9C8060', marginBottom: 10, lineHeight: 1.5 }}>
                Click to insert at cursor. Not all variables are present in every email — check the default template.
              </div>
              {COMMON_VARS.map((v) => (
                <button
                  key={v}
                  onClick={() => setEditBody((b) => b + `{{${v}}}`)}
                  style={{
                    display: 'inline-block', margin: '0 4px 6px 0',
                    padding: '2px 8px', borderRadius: 4,
                    background: '#F5F3EE', border: '1px solid #E5E0D5',
                    fontSize: 10, fontFamily: 'monospace', color: '#4A3728',
                    cursor: 'pointer',
                  }}
                >
                  {`{{${v}}}`}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
