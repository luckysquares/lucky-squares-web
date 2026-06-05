/**
 * Org renewal reminder emails.
 * Runs daily via pg_cron. Sends reminders 30 days and 7 days before renewal.
 * Uses org_member_until on profiles to determine renewal date.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendEmail } from '../_shared/resend.ts';
import { emailOrgRenewalReminder } from '../_shared/templates.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function fmtDate(date: Date): string {
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
}

Deno.serve(async () => {
  const now   = new Date();
  const in7   = addDays(now, 7);
  const in30  = addDays(now, 30);

  // Find profiles with org plan renewing in ~7 or ~30 days
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, organisation, org_member_until')
    .eq('plan', 'org')
    .not('org_member_until', 'is', null)
    .not('org_subscription_id', 'is', null);

  if (!profiles?.length) return new Response(JSON.stringify({ sent: 0 }), { status: 200 });

  let sent = 0;

  for (const p of profiles) {
    const renewalDate = new Date(p.org_member_until);
    const daysUntil   = Math.round((renewalDate.getTime() - now.getTime()) / 86_400_000);

    if (daysUntil !== 7 && daysUntil !== 30) continue;

    // Get email from auth.users
    const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const user = users?.find((u) => u.id === p.id);
    if (!user?.email) continue;

    const firstName = (p.full_name || 'there').split(' ')[0];
    const tpl = emailOrgRenewalReminder({
      first_name:   firstName,
      org_name:     p.organisation || 'your organisation',
      renewal_date: fmtDate(renewalDate),
      amount:       '$149',
    });

    await sendEmail({ to: user.email, subject: tpl.subject, text: tpl.text });
    sent++;
  }

  return new Response(JSON.stringify({ sent }), { status: 200 });
});
