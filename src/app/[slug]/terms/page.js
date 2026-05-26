import Link from 'next/link';
import { getAdminClient as supabase } from '@/lib/supabase/server';
import Logo from '@/components/ui/Logo';

const STATE_LABELS = {
  ACT: 'Australian Capital Territory', NSW: 'New South Wales', NT: 'Northern Territory',
  QLD: 'Queensland', SA: 'South Australia', TAS: 'Tasmania', VIC: 'Victoria', WA: 'Western Australia',
};
const STATE_PRIZE_CAPS = { ACT: 5000, NSW: 25000, NT: 5000, QLD: 2000, SA: 5000, TAS: 5000, VIC: 5000, WA: 10000 };

const PAYMENT_LABELS = {
  stripe: 'secure online card payment via Stripe',
  bank: 'direct bank transfer',
  bank_inperson: 'in-person payment or direct bank transfer',
  inperson: 'in-person payment',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const col = UUID_RE.test(slug) ? 'id' : 'slug';
  const { data } = await supabase().from('fundraisers').select('title, org').eq(col, slug).single();
  return { title: data ? `Terms — ${data.title}` : 'Campaign Terms' };
}

export default async function CampaignTermsPage({ params }) {
  const { slug } = await params;
  const db = supabase();
  const col = UUID_RE.test(slug) ? 'id' : 'slug';

  const { data: f } = await db
    .from('fundraisers')
    .select('id, slug, title, org, state, grid_size, price_per_sq, draw_type, draw_date, payment_method, contact_name, contact_email')
    .eq(col, slug)
    .single();

  const prizes = f
    ? (await db.from('prizes').select('place, description, value, donated').eq('fundraiser_id', f.id).order('sort_order')).data
    : null;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://luckysquares.com.au';
  const campaignUrl = f ? `${appUrl}/${f.slug ?? f.id}` : appUrl;

  if (!f) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)', padding: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text2)' }}>Campaign not found.</p>
          <Link href="/" className="btn btn-outline" style={{ marginTop: 16 }}>Back to Lucky Squares</Link>
        </div>
      </div>
    );
  }

  const state     = f.state || 'SA';
  const stateName = STATE_LABELS[state] || state;
  const cap       = STATE_PRIZE_CAPS[state] ?? 5000;
  const prizeList = (prizes || []).filter((p) => p.description);
  const drawDesc  = f.draw_type === 'auto' && f.draw_date
    ? `The draw will take place on ${new Date(f.draw_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}.`
    : 'The draw date will be announced by the organiser.';
  const paymentDesc = PAYMENT_LABELS[f.payment_method] || f.payment_method;
  const today = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <>
      <div className="rainbow-strip" />
      <header style={{ background: 'var(--card)', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 12px rgba(61,46,26,.07)', position: 'sticky', top: 0, zIndex: 100 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <Logo size={40} />
          <div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 900, color: 'var(--text)', letterSpacing: '-.5px' }}>Lucky Squares</div>
            <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>Australia</div>
          </div>
        </Link>
        <Link href={campaignUrl} className="btn btn-outline btn-sm">← Back to campaign</Link>
      </header>

      <section style={{ background: 'var(--cream)', minHeight: '100vh', padding: '48px 24px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text2)' }}>Campaign Terms and Conditions</div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 900, marginBottom: 4 }}>{f.title}</h1>
          <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 32 }}>Conducted by {f.org} · Issued {today}</p>

          <div className="scratch-card" style={{ padding: '40px 48px', display: 'flex', flexDirection: 'column', gap: 32 }}>

            <Section n="1" title="About This Fundraiser">
              <p>This Lucky Squares fundraiser (&ldquo;the Fundraiser&rdquo;) is conducted by <strong>{f.org}</strong> (&ldquo;the Organiser&rdquo;) using the Lucky Squares Australia platform provided by Play With Heart Pty Ltd ACN 698 202 069 (&ldquo;Lucky Squares&rdquo;).</p>
              <p>This is a game of chance. There is no guaranteed prize and no skill involved in the outcome of the draw.</p>
              <p>All proceeds from this Fundraiser, after deducting prize costs and platform fees, go to <strong>{f.org}</strong> for their nominated fundraising purpose.</p>
            </Section>

            <Section n="2" title="Eligibility">
              <ul>
                <li>Participation is open to individuals aged 18 years or over.</li>
                <li>Participants must be located in Australia.</li>
                <li>The Organiser, their immediate family members, and employees of Lucky Squares Australia are not eligible to participate.</li>
                <li>By purchasing a square, you confirm that you meet these eligibility requirements.</li>
              </ul>
            </Section>

            <Section n="3" title="How to Enter">
              <ul>
                <li>Visit the campaign page at <a href={campaignUrl} style={{ color: 'var(--purple)', wordBreak: 'break-all' }}>{campaignUrl}</a>.</li>
                <li>Select one or more available squares on the grid (maximum 10 squares per transaction).</li>
                <li>Provide your name, email address, and phone number.</li>
                <li>Pay the square price of <strong>${parseFloat(f.price_per_sq).toFixed(2)} AUD per square</strong> via {paymentDesc}.</li>
                <li>Your entry is confirmed once payment is received and your square(s) are marked as sold.</li>
              </ul>
            </Section>

            <Section n="4" title="The Grid">
              <ul>
                <li>The grid contains <strong>{f.grid_size} squares</strong> in total.</li>
                <li>Each square is priced at <strong>${parseFloat(f.price_per_sq).toFixed(2)} AUD</strong>.</li>
                <li>A participant may purchase multiple squares subject to availability.</li>
                <li>The Fundraiser closes when all squares are sold or the Organiser closes the campaign, whichever occurs first.</li>
              </ul>
            </Section>

            <Section n="5" title="Prizes">
              {prizeList.length > 0 ? (
                <>
                  <p>The following prizes are on offer:</p>
                  <ul>
                    {prizeList.map((p, i) => (
                      <li key={i}>
                        <strong>{p.place} Prize:</strong> {p.description}
                        {p.donated ? ' (donated)' : p.value ? ` — retail value approximately $${p.value}` : ''}
                      </li>
                    ))}
                  </ul>
                  <p>The total retail value of all prizes does not exceed the no-permit threshold of <strong>${cap.toLocaleString('en-AU')} AUD</strong> applicable in {stateName} for minor lotteries.</p>
                </>
              ) : (
                <p>Prize details will be announced by the Organiser prior to the draw.</p>
              )}
              <p>Prizes are not transferable and cannot be exchanged for cash unless otherwise stated by the Organiser.</p>
            </Section>

            <Section n="6" title="The Draw">
              <ul>
                <li>{drawDesc}</li>
                <li>Winners are determined by a random draw conducted through the Lucky Squares platform.</li>
                <li>The draw is automated and uses a cryptographically random selection process.</li>
                <li>The draw result is final.</li>
                <li>If a winner cannot be contacted within 14 days of the draw, a redraw will take place.</li>
              </ul>
            </Section>

            <Section n="7" title="Prize Delivery">
              <ul>
                <li>The Organiser is responsible for contacting winners and arranging prize delivery.</li>
                <li>Winners will be notified by email to the address provided at the time of purchase.</li>
                <li>Prizes must be claimed within 30 days of notification. Unclaimed prizes will be subject to a redraw.</li>
              </ul>
            </Section>

            <Section n="8" title="Refunds and Cancellation">
              <ul>
                <li>If the Fundraiser is cancelled before the draw, all participants who paid online via card will receive a full refund to their original payment method.</li>
                <li>For bank transfer or in-person payments, refunds will be arranged directly by the Organiser.</li>
                <li>Once the draw has taken place, no refunds will be issued.</li>
              </ul>
            </Section>

            <Section n="9" title="Privacy">
              <p>Your personal information (name, email, phone) is collected for the purpose of managing your participation in this Fundraiser, contacting you regarding the draw, and delivering prizes if applicable.</p>
              <p>Your information is shared with the Organiser and handled in accordance with the <a href="/privacy" style={{ color: 'var(--purple)' }}>Lucky Squares Privacy Policy</a>.</p>
            </Section>

            <Section n="10" title="Disputes">
              <p>Any disputes regarding this Fundraiser should be directed in the first instance to the Organiser at <strong>{f.contact_email || f.contact_name}</strong>.</p>
              <p>Unresolved disputes may be escalated to Lucky Squares Australia via our <a href="/contact" style={{ color: 'var(--purple)' }}>contact page</a>.</p>
              <p>These terms are governed by the laws of {stateName}, Australia.</p>
            </Section>

            <Section n="11" title="Platform" last>
              <p>This Fundraiser is facilitated by Lucky Squares Australia (Play With Heart Pty Ltd ACN 698 202 069 ABN 19 698 202 069), Adelaide, South Australia. Lucky Squares Australia provides the platform software and processes payments but is not the organiser, operator, or promoter of this Fundraiser. The Organiser is solely responsible for the conduct of the Fundraiser and compliance with applicable state lottery and fundraising laws.</p>
              <p>By using the Lucky Squares platform you also agree to the <a href="/terms" style={{ color: 'var(--purple)' }}>Lucky Squares Platform Terms of Service</a>.</p>
            </Section>

          </div>

          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <Link href={campaignUrl} className="btn btn-primary">← Back to campaign</Link>
          </div>
        </div>
      </section>
    </>
  );
}

function Section({ n, title, children, last }) {
  return (
    <div style={{ paddingBottom: last ? 0 : 32, borderBottom: last ? 'none' : '1px solid var(--border)' }}>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 900, marginBottom: 12 }}>{n}. {title}</h2>
      <div style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {children}
      </div>
    </div>
  );
}
