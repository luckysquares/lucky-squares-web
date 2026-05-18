'use client';

import { useState } from 'react';
import MarketingNav from '@/components/marketing/MarketingNav';
import Link from 'next/link';

const FAQS = [
  {
    category: 'Getting Started',
    emoji: '🍀',
    items: [
      {
        q: 'What is Lucky Squares Australia?',
        a: 'Lucky Squares Australia is a platform that makes it easy for community organisations to run grid-based fundraisers online. An Organiser sets up a numbered grid, sets a price per square and prizes, then shares a link with their community. Participants pick their squares, pay the Organiser, and a randomised draw picks the winner.',
      },
      {
        q: 'Who can run a Lucky Squares fundraiser?',
        a: 'Lucky Squares is designed for incorporated associations, registered charities, recognised sporting clubs, school P&Cs, and other legitimate community organisations. It is not intended for personal commercial use. Organisers must be at least 18 years of age and have authority to act on behalf of their organisation.',
      },
      {
        q: 'Is it free to set up?',
        a: 'Yes. You can create an account, set up your fundraiser, and preview everything for free. A one-off Campaign Fee is charged only when you launch your fundraiser and make it live. There are no monthly fees or hidden costs.',
      },
      {
        q: 'What devices does it work on?',
        a: 'Lucky Squares works on any modern browser on desktop, tablet, or mobile. No app download is required. Your fundraiser link can be shared via WhatsApp, SMS, email, or social media and participants can buy squares from any device.',
      },
    ],
  },
  {
    category: 'For Organisers',
    emoji: '📣',
    items: [
      {
        q: 'What grid size should I choose?',
        a: 'It depends on your community size and how quickly you want to sell out. A 25-square grid is great for smaller groups and sells out faster, giving you a quick win. A 50-square grid suits medium-sized clubs and P&Cs. A 100-square grid suits larger organisations with a wide network. You can set your price per square to hit your fundraising target at any grid size.',
      },
      {
        q: 'How much does it cost to launch?',
        a: 'A one-off platform fee of $19 applies per fundraiser, regardless of grid size. This fee is charged at launch and is inclusive of GST where applicable. There are no ongoing fees.',
      },
      {
        q: 'How do I get paid?',
        a: 'You have four options. In person: collect payment yourself via cash or EFTPOS when you approach participants. Bank transfer: participants pay directly into your nominated BSB/account with no transaction fees. In person and bank transfer: participants choose whichever suits them. Secure online card payment: participants pay by card online via Stripe, with a 1.75% + 30c transaction fee per purchase added to the square price.',
      },
      {
        q: 'Do I need a permit to run a Lucky Squares fundraiser?',
        a: 'Permit requirements vary significantly by state and territory. In many jurisdictions, incorporated associations and registered charities can conduct low-value fundraising activities without a permit. Larger prize pools or commercial activities may require a permit from your state gaming authority. Lucky Squares Australia does not obtain or verify permits. This is the Organiser\'s responsibility. See our Raffle Compliance page for a state-by-state summary.',
        link: { label: 'Raffle Compliance', href: '/raffle-compliance' },
      },
      {
        q: 'How does the draw work?',
        a: 'When you are ready to draw, click the "Run draw" button on your fundraiser page. The platform randomly selects one of the sold squares as the winner. The result is recorded instantly and cannot be changed. All participants viewing the page at the time of the draw will see the winning square highlighted live.',
      },
      {
        q: 'When do I receive the funds raised?',
        a: 'This depends on how you set up your payment method. Bank transfer: buyers pay directly into your nominated BSB/account number throughout the campaign. You have the funds as they arrive, with no transfer needed from Lucky Squares. In person: you collect payment directly from participants. Online card via Stripe: Lucky Squares collects the funds on your behalf and transfers the net amount (after transaction fees) to your nominated bank account within 2 business days of the draw completing.',
      },
      {
        q: 'What happens if not all squares sell before my draw date?',
        a: 'You have full control. You can draw from squares sold to that point, extend the selling period, or cancel the fundraiser and arrange refunds for participants. The platform does not automatically close or draw your fundraiser. You decide when to run the draw.',
      },
      {
        q: 'Is there a time limit on how long a campaign can run?',
        a: 'Yes. Live campaigns must be finalised and drawn within 30 days of launch. If a campaign has not reached its break-even point (funds raised from squares sold covering the cost of non-donated prizes) after 30 days, it is automatically cancelled. Buyers who paid by secure online card are automatically refunded. Buyers who paid by bank transfer or in person will be contacted by you directly to arrange refunds. Transaction fees for online payments are not recoverable and are passed on to the organiser. You will receive email reminders at 7, 14, and 21 days to help keep your campaign on track.',
      },
      {
        q: 'Can I delete my fundraiser?',
        a: 'Yes, but only if no squares have been sold. Once participants have purchased squares, the fundraiser cannot be deleted. If you need to cancel a live fundraiser with sales, you will need to manually refund participants and contact us at support@luckysquares.com.au.',
      },
      {
        q: 'How do I share my fundraiser?',
        a: 'Once your fundraiser is live, use the Share button on your fundraiser page to copy your unique link or share directly via social media, WhatsApp, or email. The more people who see the link, the faster your grid fills.',
      },
      {
        q: 'Can I see who has bought squares?',
        a: 'Yes. As the Organiser, you can see each square\'s status on the live grid. Sold squares display the buyer\'s first name. Your dashboard also shows total squares sold and your funds raised to date.',
      },
      {
        q: 'Can I set multiple prizes?',
        a: 'Yes. During setup you can add as many prizes as you like, including 1st, 2nd, 3rd, and additional places. Prize descriptions and values are displayed on the fundraiser page so participants know what they could win.',
      },
      {
        q: 'Is there a plan for organisations that run fundraisers regularly?',
        a: 'Yes. The Organisation plan is $149 per year and gives you unlimited Lucky Squares campaigns with up to 10 running simultaneously. It\'s designed for schools, sporting clubs, and charities that fundraise throughout the year. One account per organisation, verified by ABN.',
        link: { label: 'Register your organisation', href: '/org-signup' },
      },
    ],
  },
  {
    category: 'For Participants',
    emoji: '🎟️',
    items: [
      {
        q: 'How do I buy a square?',
        a: 'Click any available square on the grid to select it. You can select up to 10 squares at a time. Once you are happy with your selection, click Checkout, enter your name and email address, and follow the payment instructions provided by the Organiser.',
      },
      {
        q: 'How long do I have to complete my purchase?',
        a: 'Once you select squares, they are reserved for you for 7 minutes while you complete checkout. A countdown timer is shown on the page. If you do not complete your purchase within 7 minutes, your squares are released back to the grid. The timer pauses while you are actively in the checkout flow.',
      },
      {
        q: 'How many squares can I buy?',
        a: 'You can purchase a maximum of 10 squares per person per fundraiser. If you try to select an 11th square, you will see a message letting you know you have reached the limit.',
      },
      {
        q: 'How will I know if I have won?',
        a: 'Draw results are shown live on the fundraiser page. The winning square is highlighted in green with a rainbow symbol. If you have purchased squares, you will also receive an email notification. Winners are contacted by the Organiser with instructions for claiming their prize.',
      },
      {
        q: 'Is my payment secure?',
        a: 'Yes. Online card payments are processed by a PCI-DSS compliant payment provider. Lucky Squares Australia never stores your card details. Bank transfer payments go directly to the Organiser\'s nominated bank account. In person payments are collected directly by the Organiser.',
      },
      {
        q: 'Can I get a refund?',
        a: 'Refund requests should be directed to the Organiser who created the fundraiser, not to Lucky Squares Australia. If a fundraiser is cancelled before the draw, the Organiser is responsible for refunding all participants.',
      },
      {
        q: 'What if I have a problem with a fundraiser?',
        a: 'In the first instance, contact the Organiser directly. If you believe the Platform has been used improperly or unlawfully, you can contact Lucky Squares Australia at support@luckysquares.com.au and we will investigate.',
      },
    ],
  },
  {
    category: 'Payments and Fees',
    emoji: '💳',
    items: [
      {
        q: 'What does the processing fee cover?',
        a: 'A processing fee of 1.7% + $0.30 is added to the participant total only when payment is made by secure online card payment. No processing fee applies to bank transfer or in person payments. The fee is displayed clearly before participants confirm their purchase.',
      },
      {
        q: 'Is the Campaign Fee refundable?',
        a: 'The Campaign Fee is non-refundable once a fundraiser has been launched, except where required by Australian Consumer Law. It is charged for access to the platform tools, not for any particular outcome or number of squares sold.',
      },
      {
        q: 'Do you charge a percentage of funds raised?',
        a: 'No. Lucky Squares Australia charges only a flat Campaign Fee at launch. We do not take a percentage of your fundraising proceeds. The only transaction-related costs are secure online payment processing fees, which apply only when participants choose to pay by card.',
      },
      {
        q: 'Are prices inclusive of GST?',
        a: 'Campaign Fees are inclusive of GST where applicable. Online payment processing fees follow the payment provider\'s own GST treatment. Lucky Squares Australia will issue a tax invoice for all Campaign Fee charges upon request.',
      },
    ],
  },
  {
    category: 'Technical',
    emoji: '⚙️',
    items: [
      {
        q: 'Do participants need to create an account?',
        a: 'No. Participants can browse the grid and purchase squares without creating an account. Only Organisers need to create an account to set up and manage fundraisers.',
      },
      {
        q: 'What happens if two people try to buy the same square at the same time?',
        a: 'The reservation system prevents double-selling. When a participant clicks a square, it is reserved instantly for that person for 7 minutes. Other visitors will see it shown in orange as reserved and cannot select it. If the reservation expires without a completed purchase, the square is automatically released.',
      },
      {
        q: 'Is my data stored in Australia?',
        a: 'Yes. Lucky Squares Australia uses Supabase for data storage, with infrastructure located in Australia. Your data is not transferred or stored offshore. See our Privacy Policy for full details.',
        link: { label: 'Privacy Policy', href: '/privacy' },
      },
      {
        q: 'What if the platform goes down during a draw?',
        a: 'Draw results are recorded to our database as soon as the draw is run. If there is any interruption during the draw process, the result is preserved and can be displayed once the connection is restored. Contact support@luckysquares.com.au if you experience any issues.',
      },
    ],
  },
];

function Accordion({ question, answer, link }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '18px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, cursor: 'pointer', fontFamily: 'inherit' }}
      >
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', lineHeight: 1.5 }}>{question}</span>
        <span style={{ fontSize: 20, color: 'var(--green)', flexShrink: 0, transform: open ? 'rotate(45deg)' : 'none', transition: 'transform .2s' }}>+</span>
      </button>
      {open && (
        <div style={{ paddingBottom: 18, fontSize: 14, color: 'var(--text2)', lineHeight: 1.8 }}>
          <p style={{ margin: 0 }}>{answer}</p>
          {link && (
            <Link href={link.href} style={{ display: 'inline-block', marginTop: 10, color: 'var(--green)', fontWeight: 700, fontSize: 13 }}>
              {link.label} →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export default function FaqPage() {
  return (
    <>
      <MarketingNav />

      <section className="section section-hero-bg" style={{ paddingTop: 80, paddingBottom: 40 }}>
        <div className="section-inner" style={{ textAlign: 'center' }}>
          <div className="section-label">Help</div>
          <h1 className="section-heading" style={{ margin: '0 auto 16px' }}>Frequently Asked Questions</h1>
          <p className="section-body" style={{ margin: '0 auto' }}>
            Everything you need to know about running or participating in a Lucky Squares fundraiser.
          </p>
        </div>
      </section>

      <section className="section section-solid-bg" style={{ paddingTop: 0 }}>
        <div className="section-inner" style={{ maxWidth: 780 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {FAQS.map((section) => (
              <div key={section.category} style={{ background: '#fff', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', border: '1.5px solid var(--border)', padding: '28px 36px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 24 }}>{section.emoji}</span>
                  <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 900, color: 'var(--text)', margin: 0 }}>
                    {section.category}
                  </h2>
                </div>
                <div>
                  {section.items.map((item) => (
                    <Accordion key={item.q} question={item.q} answer={item.a} link={item.link} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: '#fff', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', border: '1.5px solid var(--border)', padding: '32px 36px', marginTop: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 900, marginBottom: 8 }}>Still have questions?</h2>
            <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 20, lineHeight: 1.7 }}>
              Our team is happy to help. Reach out and we will get back to you within one business day.
            </p>
            <Link href="/contact" className="btn btn-primary">Contact us →</Link>
          </div>
        </div>
      </section>
    </>
  );
}
