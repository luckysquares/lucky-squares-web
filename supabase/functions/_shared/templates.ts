import { SUPPORT_EMAIL } from './resend.ts';

const SIG = `Cheers,\nThe Lucky Squares team\n${SUPPORT_EMAIL}`;

function firstName(name: string): string {
  return (name || 'there').split(' ')[0];
}

function amt(v: string | number): string {
  return `$${String(v).replace(/^\$/, '')}`;
}

// ── Organiser emails ──────────────────────────────────────────────────────────

export function emailOrganizerWelcome(d: { first_name: string }) {
  return {
    subject: `Welcome to Lucky Squares, ${d.first_name}!`,
    text: `Hi ${d.first_name},

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

export function emailCampaignLaunched(d: {
  first_name: string;
  campaign_title: string;
  campaign_url: string;
}) {
  return {
    subject: `Your fundraiser is live, ${d.first_name}!`,
    text: `Hi ${d.first_name},

${d.campaign_title} is live and ready for buyers. Here's your unique fundraiser link to share:

${d.campaign_url}

A few tips to get your first squares sold quickly:

- Share in your club or school WhatsApp group first. The first 10 squares usually sell within the first hour when it's shared with people who already know you.
- Post it on your Facebook or Instagram page with a quick note about what you're raising money for.
- If you're selling in person at a game or event, pull up the grid on your phone and let people pick their square right there.

Good luck! We're cheering you on.

${SIG}`,
  };
}

export function emailSquareSold(d: {
  first_name: string;
  campaign_title: string;
  org_name: string;
  buyer_name: string;
  square_number: number;
  sold_count: number;
  grid_size: number;
  amount_raised: string;
  is_first: boolean;
}) {
  const subject = d.is_first
    ? `You've sold your first square in ${d.campaign_title}!`
    : `Square #${d.square_number} just sold in ${d.campaign_title}`;

  const body = d.is_first
    ? `Hi ${d.first_name},

You've just sold your very first square in ${d.campaign_title} and we think that deserves a little celebration! Every great fundraiser starts exactly like this. The grid has officially come to life.

${d.buyer_name} has claimed square #${d.square_number}. Now get sharing — the more people who see your link, the faster that grid fills up.`
    : `Hi ${d.first_name},

Great news! ${d.buyer_name} just bought square #${d.square_number} in ${d.campaign_title}.

Running total: ${d.sold_count} of ${d.grid_size} squares sold ($${d.amount_raised} raised so far).`;

  return {
    subject,
    text: `${body}

${SIG}

---
Prefer fewer emails? Log in to your dashboard to switch to a daily summary or turn off square sold notifications.`,
  };
}

export function emailExpiryReminder7(d: {
  first_name: string;
  campaign_title: string;
  sold_count: number;
  grid_size: number;
  amount_raised: string;
  org_name: string;
  below_breakeven: boolean;
}) {
  return {
    subject: `How's your fundraiser going, ${d.first_name}?`,
    text: `Hi ${d.first_name},

${d.campaign_title} has been live for 7 days. You've sold ${d.sold_count} of ${d.grid_size} squares so far, which means $${d.amount_raised} raised for ${d.org_name}.

${d.below_breakeven
  ? `You're still a few squares away from covering your prize costs. A fresh share to your network this week can make a big difference — people often need to see something twice before they act.`
  : `You've already covered your prize costs, so anything more you sell is pure profit for your cause. Keep going!`}

Log in to view your grid:
https://luckysquares.com.au/fundraise

${SIG}`,
  };
}

export function emailExpiryReminder14(d: {
  first_name: string;
  campaign_title: string;
  sold_count: number;
  grid_size: number;
  amount_raised: string;
  days_remaining: number;
}) {
  return {
    subject: `Two weeks in: ${d.sold_count} squares sold`,
    text: `Hi ${d.first_name},

${d.campaign_title} is two weeks old. You've sold ${d.sold_count} of ${d.grid_size} squares, raising $${d.amount_raised} so far.

You have ${d.days_remaining} days remaining before the campaign expires. If your fundraiser hasn't covered prize costs by day 30, it will be automatically cancelled and buyers will be refunded.

If you need a boost, now is a great time to personally message a few people who haven't bought yet. A direct message converts much better than a group post.

Log in to view your grid:
https://luckysquares.com.au/fundraise

${SIG}`,
  };
}

export function emailExpiryReminder21(d: {
  first_name: string;
  campaign_title: string;
  sold_count: number;
  grid_size: number;
  amount_raised: string;
  days_remaining: number;
  squares_needed: number;
  below_breakeven: boolean;
  is_stripe: boolean;
}) {
  const urgencyBlock = d.below_breakeven
    ? `You still need ${d.squares_needed} more square${d.squares_needed !== 1 ? 's' : ''} to cover your prize costs before you can run the draw. If the campaign expires without reaching that threshold it will be cancelled and buyers refunded.

Now is the time to make a final push. Share it widely this week.`
    : `You've covered your prize costs, which means you're good to draw whenever you're ready. You don't have to wait until day 30. Run your draw when it feels right!`;

  const stripeWarning = d.is_stripe
    ? `\nOne thing we want to be upfront about: if the campaign does expire, all Stripe payments will be automatically refunded to buyers in full. Unfortunately the payment processing fees (1.7% + 30c per transaction) are non-refundable by Stripe, which means those costs would need to be covered. We genuinely hate having to mention it, and it's one more reason we'd love to help you get those last few squares sold before the deadline.\n`
    : '';

  return {
    subject: `${d.days_remaining} days left for ${d.campaign_title}`,
    text: `Hi ${d.first_name},

Quick heads-up: ${d.campaign_title} expires in ${d.days_remaining} days.

You've sold ${d.sold_count} of ${d.grid_size} squares and raised $${d.amount_raised}.

${urgencyBlock}
${stripeWarning}
Log in to view your grid:
https://luckysquares.com.au/fundraise

Need help? Just reply to this email.

${SIG}`,
  };
}

export function emailCampaignCancelled(d: {
  first_name: string;
  campaign_title: string;
  is_stripe: boolean;
  is_bank: boolean;
  contact_name?: string;
  contact_email?: string;
}) {
  const refundNote = d.is_stripe
    ? `Stripe payments will be automatically refunded within 5 to 10 business days.`
    : d.is_bank
      ? `For bank transfer payments, you'll need to process refunds manually. The contact details for each buyer are available in your campaign report in your dashboard.`
      : `Please arrange refunds directly with each buyer. Their contact details are available in your campaign report.`;

  return {
    subject: `${d.campaign_title} has been cancelled`,
    text: `Hi ${d.first_name},

Unfortunately ${d.campaign_title} was cancelled because it didn't reach the minimum sales needed to cover prize costs before the 30-day limit.

All buyers will be refunded in full.

${refundNote}

We know that's not the outcome you were hoping for. If you'd like to try again, our team is happy to chat about what works well for your type of organisation. Just reply to this email.

${SIG}`,
  };
}

export function emailDrawCompleteOrganiser(d: {
  first_name: string;
  campaign_title: string;
  org_name: string;
  amount_raised: string;
  sold_count: number;
  grid_size: number;
  winners: Array<{ place: string; prize: string; square_number: number; buyer_name: string }>;
  is_stripe: boolean;
}) {
  const winnerLines = d.winners
    .map((w) => `${w.place} Prize (${w.prize}): Square #${w.square_number}, ${w.buyer_name}`)
    .join('\n');

  const nextSteps = d.is_stripe
    ? `Because your campaign used online card payments, here is what happens next:

- Winners have been notified by email and asked to provide their bank details via a secure claim link. You will receive an email with each winner's details as they submit them.
- Once you have a winner's bank details, transfer their prize directly from your bank account. Aim to pay within a few business days of receiving their details.
- Your square sales were transferred to your connected bank account progressively as each square sold. The full prize reserve has also been transferred to your account to cover winner payments.

For donated prizes, or if a winner has not submitted their details within a few days, you can contact them directly using the details in your campaign report.`
    : `Next steps:

1. Winners have been notified by email automatically.
2. Contact each winner using their details in your campaign report to arrange prize delivery.
3. If you need to send a follow-up, reply to this email and we can help.`;

  return {
    subject: `The draw is done! Here are your winners`,
    text: `Hi ${d.first_name},

Your draw for ${d.campaign_title} is complete. Here are your results:

${winnerLines}

${nextSteps}

You raised ${amt(d.amount_raised)} for ${d.org_name} from ${d.sold_count} of ${d.grid_size} squares sold.

Want to share the result? Here's a quick message you can post:

"${d.campaign_title} draw is done! Big thanks to everyone who took part. We raised ${amt(d.amount_raised)} for ${d.org_name}. Congratulations to all our winners!"

Whenever you're ready to run your next campaign, we'll be here:
https://luckysquares.com.au/fundraise

${SIG}`,
  };
}

export function emailReferralReward(d: {
  first_name: string;
  referred_name: string;
  coupon_code: string;
}) {
  return {
    subject: `You've earned a free campaign, ${d.first_name}!`,
    text: `Hi ${d.first_name},

Great news: ${d.referred_name} just launched their first Lucky Squares fundraiser after you referred them. As promised, your next campaign is on us.

Your free campaign coupon code is:

${d.coupon_code}

Enter this code when launching your next campaign to waive the platform fee entirely.

Thanks for spreading the word. It means a lot to us and to the causes you're helping.

${SIG}`,
  };
}

export function emailAccountSuspended(d: {
  first_name: string;
  reason: string;
}) {
  return {
    subject: `Important notice about your Lucky Squares account`,
    text: `Hi ${d.first_name},

We're writing to let you know that your Lucky Squares account has been temporarily suspended.

Reason: ${d.reason}

While your account is suspended, you will not be able to launch new campaigns. Any campaigns already live and drawing will continue to operate normally.

If you believe this is an error or you'd like to discuss the matter, please reply to this email or contact us at ${SUPPORT_EMAIL}. We aim to respond within 1 business day.

${SIG}`,
  };
}

// ── Organisation emails ───────────────────────────────────────────────────────

export function emailOrgWelcome(d: {
  first_name: string;
  org_name: string;
  campaign_limit: number;
}) {
  return {
    subject: `Welcome to Lucky Squares, ${d.org_name}!`,
    text: `Hi ${d.first_name},

Welcome to the Lucky Squares Organisation Plan. You're all set to run fundraising campaigns for ${d.org_name}.

Here's what's available to you:

- Up to ${d.campaign_limit} active campaigns at once
- Full campaign management and reporting
- Buyer contact details for every campaign
- Priority support

Your organisation dashboard is ready to go. Create your first campaign whenever you're ready:
https://luckysquares.com.au/fundraise

If you have any questions or would like a walkthrough, just reply to this email and we'll get back to you quickly.

${SIG}`,
  };
}

export function emailOrgCampaignLaunched(d: {
  first_name: string;
  org_name: string;
  campaign_title: string;
  grid_size: number;
  price_per_sq: string;
  max_raise: string;
  campaign_url: string;
}) {
  return {
    subject: `New campaign live: ${d.campaign_title}`,
    text: `Hi ${d.first_name},

A new Lucky Squares campaign has just gone live under ${d.org_name}.

Campaign: ${d.campaign_title}
Grid size: ${d.grid_size} squares
Price per square: $${d.price_per_sq}
Potential raise at sell-out: $${d.max_raise}

View the campaign:
${d.campaign_url}

${SIG}`,
  };
}

export function emailOrgSquareSold(d: {
  first_name: string;
  org_name: string;
  campaign_title: string;
  buyer_name: string;
  square_number: number;
  sold_count: number;
  grid_size: number;
  amount_raised: string;
  is_first: boolean;
}) {
  const subject = d.is_first
    ? `Your first square just sold in ${d.campaign_title}!`
    : `Square sold in ${d.campaign_title}`;

  const body = d.is_first
    ? `Hi ${d.first_name},

The first square in ${d.campaign_title} has just been sold and we think that deserves a moment. This is where every successful fundraiser begins!

${d.buyer_name} has claimed square #${d.square_number}. The grid is officially open for business.`
    : `Hi ${d.first_name},

${d.buyer_name} just purchased square #${d.square_number} in ${d.campaign_title}.

Running total: ${d.sold_count} of ${d.grid_size} squares ($${d.amount_raised} raised).`;

  return {
    subject,
    text: `${body}

${SIG}

---
Prefer fewer emails? Log in to your dashboard to switch to a daily summary or turn off square sold notifications.`,
  };
}

export function emailOrgMonthlySummary(d: {
  first_name: string;
  org_name: string;
  month_name: string;
  campaign_count: number;
  total_squares_sold: number;
  total_raised: string;
  draws_completed: number;
  active_campaign_count: number;
}) {
  const activeLine = d.active_campaign_count > 0
    ? `\nYou currently have ${d.active_campaign_count} active campaign${d.active_campaign_count !== 1 ? 's' : ''} running. Keep sharing those links!\n`
    : '';

  return {
    subject: `Your Lucky Squares summary for ${d.month_name}`,
    text: `Hi ${d.first_name},

Here's a quick look at how ${d.org_name} performed on Lucky Squares in ${d.month_name}.

Campaigns run: ${d.campaign_count}
Squares sold: ${d.total_squares_sold}
Total raised: $${d.total_raised}
Draws completed: ${d.draws_completed}
${activeLine}
Log in to your dashboard:
https://luckysquares.com.au/fundraise

${SIG}`,
  };
}

export function emailOrgApplicationReceived(d: {
  first_name: string;
  org_name: string;
  abn: string;
  org_type: string;
}) {
  return {
    subject: `We've received your application, ${d.org_name}`,
    text: `Hi ${d.first_name},

Thanks for applying for the Lucky Squares Organisation Plan. We've received your application and will be in touch shortly.

Here's what we received:

Organisation: ${d.org_name}
ABN: ${d.abn}
Type: ${d.org_type}

We review all applications personally and aim to get back to you within 2 business days.

In the meantime, you can get started on your first campaign straight away. Just log in and create one when you're ready.

${SIG}`,
  };
}

export function emailOrgApplicationApproved(d: {
  first_name: string;
  org_name: string;
  portal_url?: string;
}) {
  const url = d.portal_url || 'https://luckysquares.com.au/org/dashboard';
  return {
    subject: `Great news: ${d.org_name} is approved!`,
    text: `Hi ${d.first_name},

We've reviewed your application and ${d.org_name} has been approved for the Lucky Squares Organisation Plan.

Your account has been upgraded and you now have access to all organisation features. Sign in to your organisation portal to get started:
${url}

Welcome to the team. We're really glad to have ${d.org_name} on board. If there's anything we can do to help you hit the ground running, just reply to this email.

${SIG}`,
  };
}

export function emailOrgApplicationRejected(d: {
  first_name: string;
  org_name: string;
}) {
  return {
    subject: `Your Lucky Squares application`,
    text: `Hi ${d.first_name},

Thank you for applying for the Lucky Squares Organisation Plan for ${d.org_name}.

After reviewing your application, we are unable to approve it at this time. If you believe this is an error or would like more information, please reply to this email and we will be happy to help.

You can still run individual campaigns as a personal organiser:
https://luckysquares.com.au/fundraise

${SIG}`,
  };
}

// ── Buyer emails ──────────────────────────────────────────────────────────────

export function emailSquarePurchaseConfirmation(d: {
  buyer_name: string;
  campaign_title: string;
  org_name: string;
  square_numbers: string;
  amount_paid: string;
  draw_type_description: string;
  campaign_url: string;
}) {
  return {
    subject: `You're in! Square${d.square_numbers.includes(',') ? 's' : ''} confirmed`,
    text: `Hi ${firstName(d.buyer_name)},

You've secured your square${d.square_numbers.includes(',') ? 's' : ''} in ${d.campaign_title} — good luck in the draw!

Square${d.square_numbers.includes(',') ? 's' : ''}: #${d.square_numbers.split(', ').join(', #')}
Amount paid: ${amt(d.amount_paid)}
Draw: ${d.draw_type_description}

Thanks for supporting ${d.org_name}'s fundraiser. We'll send you the result as soon as the draw is complete.

View the live grid:
${d.campaign_url}

${SIG}`,
  };
}

export function emailDrawResultWinner(d: {
  buyer_name: string;
  campaign_title: string;
  org_name: string;
  winning_square: number;
  prize_place: string;
  prize_description: string;
  contact_email: string;
}) {
  return {
    subject: `You won in ${d.campaign_title}!`,
    text: `Hi ${firstName(d.buyer_name)},

Congratulations, you're a winner!

${d.campaign_title} has been drawn and your square #${d.winning_square} won the ${d.prize_place}.

Prize: ${d.prize_description}

${d.org_name} will be in touch shortly to arrange delivery of your prize. If you haven't heard from them within a few days, you can contact them directly at ${d.contact_email}.

Thanks for supporting ${d.org_name}. Enjoy your prize!

${SIG}`,
  };
}

export function emailDrawResultDidNotWin(d: {
  buyer_name: string;
  campaign_title: string;
  org_name: string;
  amount_raised: string;
  winners: Array<{ prize_place: string; prize_description: string; square_number: number }>;
}) {
  const winnerLines = d.winners
    .map((w) => `${w.prize_place} (${w.prize_description}): Square #${w.square_number}`)
    .join('\n');

  return {
    subject: `The results are in for ${d.campaign_title}`,
    text: `Hi ${firstName(d.buyer_name)},

The draw for ${d.campaign_title} has been completed.

The winning square(s):

${winnerLines}

You didn't win this time, but your support made a real difference to ${d.org_name}. The fundraiser raised $${d.amount_raised} in total. Thank you for being part of it.

${SIG}`,
  };
}

export function emailRefundNotification(d: {
  buyer_name: string;
  campaign_title: string;
  amount_paid: string;
  square_numbers: string;
  is_stripe: boolean;
  contact_name?: string;
  contact_email?: string;
}) {
  const refundNote = d.is_stripe
    ? `Your refund will appear on your card within 5 to 10 business days.`
    : `The organiser will process your refund directly. If you haven't received it within 10 business days, please contact ${d.contact_name} at ${d.contact_email}.`;

  return {
    subject: `Refund for your squares in ${d.campaign_title}`,
    text: `Hi ${firstName(d.buyer_name)},

${d.campaign_title} has been cancelled before the draw took place.

Your payment of $${d.amount_paid} for square(s) #${d.square_numbers} will be refunded in full.

${refundNote}

We're sorry this one didn't go ahead. Thanks for your support.

${SIG}`,
  };
}

// ── Admin internal notifications ─────────────────────────────────────────────

export function emailAdminNewOrgApplication(d: {
  org_name: string;
  abn: string;
  org_type: string;
  contact_name: string;
  contact_email: string;
  suburb?: string;
  state?: string;
  applied_date: string;
}) {
  return {
    subject: `ADMIN NOTICE: New org application: ${d.org_name}`,
    text: `New organisation application received.

Organisation: ${d.org_name}
ABN: ${d.abn}
Type: ${d.org_type}
Contact: ${d.contact_name} (${d.contact_email})
${d.suburb ? `Location: ${d.suburb}${d.state ? `, ${d.state}` : ''}` : ''}
Applied: ${d.applied_date}

Review in admin portal:
https://luckysquares.com.au/admin/organisations`,
  };
}

// ── Welcome sequence (marketing) ─────────────────────────────────────────────

export function emailWelcomeDay1(d: {
  first_name: string;
}) {
  return {
    subject: `Set up your first campaign in 5 minutes`,
    text: `Hi ${d.first_name},

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

export function emailWelcomeDay3NoCampaign(d: {
  first_name: string;
}) {
  return {
    subject: `A primary school in Melbourne raised $1,000 in four days`,
    text: `Hi ${d.first_name},

We wanted to share a quick story from one of our organisers.

A P&C treasurer at a primary school in Melbourne set up a 100-square grid at $10 per square. She shared it in the school WhatsApp group on a Tuesday morning. By Friday afternoon, every square was sold and the school had raised $1,000 before prizes.

She told us the hardest part was deciding what prizes to offer. Everything else just happened.

If you haven't had a chance to set up your campaign yet, it takes about five minutes. We'd love to help you have a similar story to share.

Set up your campaign:
https://luckysquares.com.au/fundraise

${SIG}`,
  };
}

export function emailWelcomeDay7NoCampaign(d: {
  first_name: string;
}) {
  return {
    subject: `Can we help you get started?`,
    text: `Hi ${d.first_name},

You signed up a week ago and we haven't seen a campaign from you yet. That's completely fine, life gets busy.

But if there's something holding you back, we'd genuinely love to help. A lot of first-time organisers have questions about things like prize sourcing, how bank transfers work, or whether their organisation type is a good fit.

Just reply to this email and tell us where you're up to. We'll get back to you personally.

Or jump straight in:
https://luckysquares.com.au/fundraise

${SIG}`,
  };
}

export function emailFirstCampaignTips(d: {
  first_name: string;
  campaign_title: string;
  org_name: string;
  price_per_sq: string;
  prize_summary: string;
  campaign_url: string;
}) {
  return {
    subject: `Tips to sell out ${d.campaign_title} fast`,
    text: `Hi ${d.first_name},

Congratulations on launching your first campaign! Here are a few things that work really well for getting squares sold quickly.

Share in waves, not all at once. Post in your main group first, then follow up with a personal message to 5 or 10 people who you know would support you. A direct message converts much better than a group post.

Make it visual. A screenshot of the grid with a few squares already sold creates urgency. People are more likely to buy when they can see others already have.

Use this message as a template (feel free to edit it):

"Hey! I'm running a Lucky Squares fundraiser for ${d.org_name}. Pick a number, pay $${d.price_per_sq}, and you're in the draw to win ${d.prize_summary}. Here's the link: ${d.campaign_url}"

Good luck, we're rooting for you!

${SIG}`,
  };
}

export function emailReEngagement(d: {
  first_name: string;
  org_name: string;
}) {
  return {
    subject: `Ready for your next fundraiser, ${d.first_name}?`,
    text: `Hi ${d.first_name},

It's been a little while since your last Lucky Squares campaign. We hope ${d.org_name} is going well.

When you're ready to run another fundraiser, everything is still set up and waiting for you. Your previous campaign details are saved in your dashboard so you can use them as a starting point.

Go to your dashboard:
https://luckysquares.com.au/fundraise

No pressure, just wanted to check in and let you know we're here when you need us.

${SIG}`,
  };
}

export function emailSeasonal(d: {
  first_name: string;
  org_name: string;
  season_name: string;
  season_opener_line: string;
}) {
  return {
    subject: `${d.season_name} is here: is ${d.org_name} ready to fundraise?`,
    text: `Hi ${d.first_name},

${d.season_opener_line}

It's one of the most popular times of year for Lucky Squares fundraisers. People are engaged, communities are gathering, and everyone's in the spirit of it.

If you're thinking about running a fundraiser this season, now is a great time to get set up so your campaign is live when the energy is highest.

Set up a campaign:
https://luckysquares.com.au/fundraise

${SIG}`,
  };
}

// ── Org contributor invite ─────────────────────────────────────────────────────

export function emailOrgMemberInvite(d: {
  org_name: string;
  invited_by_name: string;
  invite_url: string;
  expires_days: number;
}) {
  return {
    subject: `You've been invited to join ${d.org_name} on Lucky Squares`,
    text: `Hi there,

${d.invited_by_name} has invited you to join ${d.org_name} as a contributor on Lucky Squares Australia.

As a contributor, you'll be able to view and help manage the organisation's fundraising campaigns.

Accept your invite here (link expires in ${d.expires_days} days):
${d.invite_url}

If you don't have a Lucky Squares account yet, you'll be able to create one when you click the link above.

If you weren't expecting this invite, you can safely ignore this email.

${SIG}`,
  };
}

export function emailSquareDailyDigest(d: {
  first_name: string;
  campaign_title: string;
  sales_today: number;
  buyer_names: string;  // e.g. "Sarah, Tom and 3 others" or "Jamie"
  sold_count: number;
  grid_size: number;
  amount_raised: string;
  campaign_url: string;
}) {
  return {
    subject: `${d.sales_today} square${d.sales_today !== 1 ? 's' : ''} sold today in ${d.campaign_title}`,
    text: `Hi ${d.first_name},

Here's your daily update for ${d.campaign_title}.

Squares sold today: ${d.sales_today} (${d.buyer_names})
Running total: ${d.sold_count} of ${d.grid_size} squares sold, ${amt(d.amount_raised)} raised

Keep sharing your link to keep the momentum going!

${d.campaign_url}

${SIG}

---
Prefer fewer emails? Log in to your dashboard to manage notification settings.`,
  };
}

export function emailSquareNoSalesNudge(d: {
  first_name: string;
  campaign_title: string;
  sold_count: number;
  grid_size: number;
  campaign_url: string;
}) {
  return {
    subject: `A fresh share could get ${d.campaign_title} moving again`,
    text: `Hi ${d.first_name},

It's been a few days since the last square was sold in ${d.campaign_title}. A fresh share to your network is often all it takes to get things moving again.

${d.sold_count} of ${d.grid_size} squares sold so far. Here's your link to share:

${d.campaign_url}

A personal message to 3 or 4 people who haven't bought yet often works better than a group post at this stage.

${SIG}`,
  };
}

// ── Buyer campaign notification ───────────────────────────────────────────────

export function emailCampaignLaunchedNotification(d: {
  organiser_name: string;
  campaign_title: string;
  campaign_url: string;
}) {
  return {
    subject: `New fundraiser from ${d.organiser_name}: ${d.campaign_title}`,
    text: `Hi there,

You asked to be notified when ${d.organiser_name} launched their next fundraiser — and it's now live!

${d.campaign_title}

Get your squares here:
${d.campaign_url}

Good luck!

${SIG}

---
You're receiving this because you opted in after purchasing squares in a previous ${d.organiser_name} fundraiser. To stop receiving these notifications, click the unsubscribe link in any Lucky Squares email.`,
  };
}

// ── Foundation Member congratulation ─────────────────────────────────────────

// ── Prize claim emails ────────────────────────────────────────────────────────

// Sent to a winner (Stripe campaign, non-donated prize) with a link to submit bank details.
export function emailDrawResultWinnerClaim(d: {
  buyer_name:        string;
  campaign_title:    string;
  org_name:          string;
  winning_square:    number;
  prize_place:       string;
  prize_description: string;
  contact_email:     string;
  claim_url:         string;
}) {
  return {
    subject: `You won in ${d.campaign_title}!`,
    text: `Hi ${firstName(d.buyer_name)},

Congratulations, you're a winner!

${d.campaign_title} has been drawn and your square #${d.winning_square} won the ${d.prize_place}.

Prize: ${d.prize_description}

To receive your prize, ${d.org_name} will transfer the funds directly to your bank account. Please use the link below to securely submit your bank details:

${d.claim_url}

It takes less than a minute. Your details are only shared with ${d.org_name} and are automatically deleted after 7 days.

If you'd prefer not to use the link, contact ${d.org_name} directly at ${d.contact_email} to arrange an alternative.

Thanks for supporting ${d.org_name}. Enjoy your prize!

${SIG}`,
  };
}

// Sent to the organiser when a winner submits their bank details.
export function emailOrganizerPrizeClaim(d: {
  organiser_first_name: string;
  campaign_title:       string;
  winner_name:          string;
  winner_email:         string;
  prize_place:          string;
  prize_description:    string;
  bank_account_name:    string;
  bank_bsb:             string;
  bank_account:         string;
}) {
  return {
    subject: `Prize claim received: ${d.prize_place} for ${d.campaign_title}`,
    text: `Hi ${d.organiser_first_name},

A winner from ${d.campaign_title} has submitted their bank details for the ${d.prize_place}.

Winner: ${d.winner_name} (${d.winner_email})
Prize: ${d.prize_description}

Bank transfer details:

  Account name: ${d.bank_account_name}
  BSB: ${d.bank_bsb}
  Account number: ${d.bank_account}

Please transfer the prize amount to the above account as soon as possible. The winner has been told to expect payment within a few business days.

IMPORTANT: For security, these bank details will be automatically deleted from our system after 7 days. Please save them and action this payment promptly.

${SIG}`,
  };
}

// Sent to the winner after they submit their bank details.
export function emailWinnerClaimConfirmation(d: {
  buyer_name:        string;
  campaign_title:    string;
  org_name:          string;
  prize_description: string;
  contact_email:     string;
}) {
  return {
    subject: `Your bank details have been received`,
    text: `Hi ${firstName(d.buyer_name)},

We have received your bank details and passed them on to ${d.org_name}.

They will arrange your prize transfer (${d.prize_description}) as soon as possible. Please allow a few business days for the payment to arrive.

If you have not received your prize within 5 business days, contact ${d.org_name} directly at ${d.contact_email}.

Thanks again for supporting ${d.org_name}!

${SIG}`,
  };
}

export function emailFoundationMember(d: {
  first_name: string;
  org_name:   string;
  member_num: number;
}) {
  return {
    subject: `You're a Lucky Squares Foundation Member!`,
    text: `Hi ${d.first_name},

You did it. ${d.org_name}'s Lucky Squares draw is complete, and that makes you officially a Foundation Member.

You're member #${d.member_num} out of 100. That's something to be proud of.

Here's what comes with your Foundation Member status:

A permanent Foundation Member badge (shown next to your name on every campaign you run from now on, so your community knows you were one of the first).

You're in the draw for a $150 voucher of your choice, which we'll draw once all 100 Foundation Member spots are filled.

One last thing: once your campaign is fully wrapped up and you've connected with your winners, we'd love a short note from you about the experience. A sentence or two is plenty. If you're happy to share, just reply to this email.

Thank you for being here early. It means a lot to us.

${SIG}`,
  };
}

// ── 50/50 Raffle emails ───────────────────────────────────────────────────────

export function emailFiftyFiftyTicketConfirmation(d: {
  buyer_name: string;
  campaign_title: string;
  org_name: string;
  ticket_numbers: string;
  quantity: number;
  amount_paid: string;
  jackpot_at_purchase: string;
  campaign_url: string;
}) {
  return {
    subject: `Your 50/50 raffle tickets: ${d.campaign_title}`,
    text: `Hi ${firstName(d.buyer_name)},

You're in the draw! Here are your ticket details for ${d.campaign_title}.

Your tickets: ${d.ticket_numbers}
Number of tickets: ${d.quantity}
Amount paid: ${amt(d.amount_paid)}
Jackpot at time of purchase: ${d.jackpot_at_purchase}

The jackpot keeps growing as more tickets are sold. The winner takes home 50% of total ticket sales.

View the live jackpot:
${d.campaign_url}

Good luck!

${SIG}`,
  };
}

export function emailFiftyFiftyDrawWinner(d: {
  buyer_name: string;
  campaign_title: string;
  org_name: string;
  winning_ticket: number;
  prize_amount: string;
  contact_email: string;
}) {
  return {
    subject: `Congratulations! You won the ${d.campaign_title} raffle!`,
    text: `Hi ${firstName(d.buyer_name)},

You're a winner! Ticket #${String(d.winning_ticket).padStart(3, '0')} was drawn in the ${d.campaign_title} 50/50 raffle.

Your prize: ${amt(d.prize_amount)} (50% of total ticket sales)

The organiser will be in touch shortly to arrange your prize.${d.contact_email ? ` If you have any questions, contact them at ${d.contact_email}.` : ''}

Congratulations!

${SIG}`,
  };
}

export function emailFiftyFiftyDrawNoWin(d: {
  buyer_name: string;
  campaign_title: string;
  org_name: string;
  winning_ticket: number;
  total_raised: string;
}) {
  return {
    subject: `The ${d.campaign_title} raffle has been drawn`,
    text: `Hi ${firstName(d.buyer_name)},

The ${d.campaign_title} 50/50 raffle draw has taken place.

Winning ticket: #${String(d.winning_ticket).padStart(3, '0')}

Unfortunately your ticket wasn't the lucky one this time, but your support helped raise ${amt(d.total_raised)} in total for this cause.

Thank you for taking part. Better luck next time!

${SIG}`,
  };
}

// ── Early access invitation ────────────────────────────────────────────────────

export function emailEarlyAccessInvite(d: {
  first_name: string;
  coupon_code?: string;
  coupon_label?: string;
}) {
  const couponBlock = d.coupon_code ? `
I'd also like to offer you a little gift for being one of the first through the door:

Your invite code: ${d.coupon_code}
${d.coupon_label ? `(${d.coupon_label})` : ''}

Use it when you launch your first campaign.
` : '';

  return {
    subject: `Your Lucky Squares early access is ready`,
    text: `Hi ${d.first_name},

You signed up to hear when Lucky Squares Australia opened its doors. That day is today.

Lucky Squares lets you run a fully online Lucky Squares fundraiser in minutes. Set up your grid, share a link with your community, and watch the squares sell. When you're ready, run the draw live. No spreadsheets, no cash handling, no stress.
${couponBlock}
Head here to create your account and get started:
https://luckysquares.com.au/get-started

We built this specifically for Australian schools, clubs, and charities, and we'd love to see what you raise with it.

If you have any questions just reply to this email. I read everything.

${SIG}`,
  };
}
