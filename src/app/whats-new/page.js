import MarketingNav from '@/components/marketing/MarketingNav';
import Link from 'next/link';

export const metadata = {
  title: "What's New",
  description: 'The latest features, improvements, and fixes from Lucky Squares Australia.',
};

// ── Changelog entries ─────────────────────────────────────────────────────────
// Add new entries at the TOP of this array.
// badge options: 'Feature' | 'Update' | 'Fixed' | 'Coming soon'
//   Feature  = major new functionality
//   Update   = improvement or tweak to existing feature
//   Fixed    = bug fix
const ENTRIES = [
  {
    date: 'June 2026',
    items: [
      {
        badge: 'Feature',
        title: 'Organisation plan',
        body: 'Clubs, schools and charities that run campaigns regularly can now apply for the Organisation plan. $149/year covers up to 10 concurrent campaigns, a team management dashboard, and priority support. Pay securely by card when you apply. Existing individual accounts can upgrade from their dashboard.',
      },
      {
        badge: 'Feature',
        title: 'Organisation dashboard',
        body: 'Organisation plan members get a dedicated dashboard showing total raised across all campaigns, squares sold, active campaigns, draws completed, and a live count of concurrent campaigns against the 10-campaign limit. Team members are managed from the same screen.',
      },
      {
        badge: 'Feature',
        title: 'Testimonial Prize Draw',
        body: 'After each completed draw, organisers are invited to share their experience. Every approved testimonial earns one entry into our monthly Testimonial Prize Draw. One winner is drawn on the first business day of each month and receives a $100 Visa debit gift card.',
      },
      {
        badge: 'Feature',
        title: 'Share links show your campaign preview',
        body: 'When you share your campaign link on WhatsApp, Facebook, iMessage or Slack, the recipient now sees your campaign photo, title and description (not just a generic Lucky Squares link).',
      },
      {
        badge: 'Feature',
        title: 'Club Mode for in-person selling',
        body: 'Running a sausage sizzle or game day stall? Open Club Mode from your campaign page for a full-screen grid optimised for face-to-face selling. Hand your phone or tablet to each buyer, they pick their square, you confirm payment. Hit "Next buyer" and you\'re ready to go again.',
      },
      {
        badge: 'Feature',
        title: 'QR code posters',
        body: 'Generate a print-ready A4 poster for your campaign from the campaign management page. Includes your campaign photo, prizes, price per square, and a QR code buyers can scan to go straight to your grid.',
      },
      {
        badge: 'Update',
        title: 'Smarter sale notifications',
        body: 'When your first square sells you get a celebration email with sharing tips. After that, all activity is bundled into a daily digest sent each evening — so you get a clean summary of the day\'s sales without a notification for every single square.',
      },
      {
        badge: 'Update',
        title: 'Image credits on blog photos',
        body: 'Blog cover images can now include a photographer credit and copyright year. The credit appears as a small overlay on the image.',
      },
      {
        badge: 'Update',
        title: 'Duplicate campaign',
        body: 'Need to run the same fundraiser again? Use the duplicate button on any completed campaign to copy its settings, prizes, and details into a new draft ready to edit and launch.',
      },
      {
        badge: 'Fixed',
        title: 'Daily digest and automated emails now running',
        body: 'A configuration issue was preventing the daily sales digest, welcome sequence, and other automated emails from firing. All scheduled emails are now working correctly.',
      },
      {
        badge: 'Fixed',
        title: 'Team invite emails not sending',
        body: 'Organisation team invites were not being delivered due to a missing authentication header. Fixed — invites now arrive reliably.',
      },
    ],
  },
  {
    date: 'May 2026',
    items: [
      {
        badge: 'Feature',
        title: 'Lucky Squares Australia launches',
        body: 'The platform is live. Set up a grid in minutes, share a link with your community, and watch the squares fill up. Online card payments, bank transfer, or in-person: your choice. A flat $19 fee when you launch, nothing more.',
      },
      {
        badge: 'Feature',
        title: 'Online card payments',
        body: 'Buyers can now pay securely by card directly from the grid. A 1.7% + 30c processing fee is added to the buyer total, so your fundraising proceeds stay intact. Funds transfer to your bank account after the draw completes.',
      },
      {
        badge: 'Feature',
        title: 'Live draw',
        body: 'When you\'re ready to draw, hit the button and the winning square is highlighted live on the grid for everyone watching. Winners are highlighted instantly. For multiple prizes, multiple squares are drawn in sequence.',
      },
      {
        badge: 'Feature',
        title: 'Email notifications for buyers',
        body: 'Buyers receive a confirmation email when they purchase squares, and are notified of the draw result. Organisers receive a daily sales digest while their campaign is live.',
      },
      {
        badge: 'Feature',
        title: 'Feeling Lucky',
        body: 'Not running a fundraiser but want to support one? The Feeling Lucky page randomly selects a live campaign for you to back. Every square you buy goes directly to a real Australian school, club or charity.',
      },
    ],
  },
];

const BADGE_STYLES = {
  'Feature':     { background: 'var(--purple-tint)', color: 'var(--purple-text)', border: '1px solid var(--purple-tint-border)' },
  'Update':      { background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' },
  'Fixed':       { background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' },
  'Coming soon': { background: '#F3F4F6', color: '#4B5563', border: '1px solid #D1D5DB' },
  // Legacy — kept for backwards compat with older entries
  'New':         { background: 'var(--purple-tint)', color: 'var(--purple-text)', border: '1px solid var(--purple-tint-border)' },
  'Improved':    { background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' },
};

export default function WhatsNewPage() {
  return (
    <div style={{ background: 'var(--cream)', minHeight: '100vh' }}>
      <MarketingNav />

      <section style={{ padding: '64px 24px 80px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ marginBottom: 56 }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--text2)', marginBottom: 12 }}>Changelog</div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 900, lineHeight: 1.1, marginBottom: 16, color: 'var(--text)' }}>
              What&apos;s new
            </h1>
            <p style={{ fontSize: 17, color: 'var(--text2)', lineHeight: 1.7, maxWidth: 520 }}>
              Features, improvements, and fixes from the Lucky Squares team. New entries added as we ship.
            </p>
          </div>

          {/* Timeline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {ENTRIES.map((group, gi) => (
              <div key={gi} style={{ display: 'flex', gap: 0, marginBottom: 56 }}>

                {/* Date column */}
                <div style={{ width: 120, flexShrink: 0, paddingTop: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text2)', position: 'sticky', top: 88 }}>
                    {group.date}
                  </div>
                </div>

                {/* Divider */}
                <div style={{ width: 1, background: 'var(--border)', flexShrink: 0, margin: '0 32px', position: 'relative' }}>
                  <div style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--purple)', border: '2px solid var(--cream)', position: 'absolute', top: 6, left: -4 }} />
                </div>

                {/* Items */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {group.items.map((item, ii) => (
                    <div key={ii} className="scratch-card" style={{ padding: '20px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <span style={{
                          fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20,
                          ...BADGE_STYLES[item.badge],
                        }}>
                          {item.badge}
                        </span>
                        <span style={{ fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
                          {item.title}
                        </span>
                      </div>
                      <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.75, margin: 0 }}>
                        {item.body}
                      </p>
                    </div>
                  ))}
                </div>

              </div>
            ))}
          </div>

          {/* CTAs */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 40, display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 900, marginBottom: 6, color: 'var(--text)' }}>Got a feature request?</div>
              <p style={{ fontSize: 14, color: 'var(--text2)', margin: 0 }}>
                We read every message. Tell us what would make Lucky Squares work better for you.
              </p>
            </div>
            <Link href="/contact?category=Feature+request" className="btn btn-outline" style={{ flexShrink: 0 }}>
              Send a request →
            </Link>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 40, marginTop: 40, textAlign: 'center' }}>
            <p style={{ fontSize: 15, color: 'var(--text2)', marginBottom: 20 }}>
              Ready to run your first campaign?
            </p>
            <Link href="/get-started" className="btn btn-purple btn-lg">
              Get started free →
            </Link>
          </div>

        </div>
      </section>
    </div>
  );
}
