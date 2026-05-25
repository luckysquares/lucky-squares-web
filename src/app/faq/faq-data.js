export const FAQS = [
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
        a: 'You have four payment options. In person: collect cash or EFTPOS from participants directly. Bank transfer: participants pay into your nominated BSB and account number with no transaction fees. In person and bank transfer: participants choose whichever suits them. Secure online card payment: participants pay by card via Stripe and funds are transferred directly to your connected bank account as squares are sold. A transaction fee of 1.7% + $0.30 per purchase (paid by the buyer on top of the square price) covers all payment processing. Online card payments require a free Stripe Connect account linked to your Lucky Squares profile.',
      },
      {
        q: 'What is Stripe Connect and why do I need to verify my identity?',
        a: 'Stripe Connect is how Lucky Squares transfers online card payments directly to your bank account. To comply with Australian financial regulations (including Anti-Money Laundering and Know Your Customer laws), Stripe is required to verify the identity of all account holders before funds can be transferred. This is the same process as opening a bank account. You will be asked to provide your full legal name, date of birth, residential address, and a government-issued photo ID such as a drivers licence or passport. This is a legal requirement, not a Lucky Squares policy. Your information is held securely by Stripe and is not stored by Lucky Squares.',
      },
      {
        q: 'Do I need a permit to run a Lucky Squares fundraiser?',
        a: "Permit requirements vary significantly by state and territory. In many jurisdictions, incorporated associations and registered charities can conduct low-value fundraising activities without a permit. Larger prize pools or commercial activities may require a permit from your state gaming authority. Lucky Squares Australia does not obtain or verify permits. This is the Organiser's responsibility. See our Raffle Compliance page for a state-by-state summary.",
        link: { label: 'Raffle Compliance', href: '/raffle-compliance' },
      },
      {
        q: 'How does the draw work?',
        a: 'When you are ready to draw, click the "Run draw" button on your fundraiser page. The platform randomly selects one of the sold squares as the winner. The result is recorded instantly and cannot be changed. All participants viewing the page at the time of the draw will see the winning square highlighted live.',
      },
      {
        q: 'When do I receive the funds raised?',
        a: 'This depends on your payment method. Bank transfer: buyers pay directly into your nominated BSB and account number throughout the campaign. You have the funds as they arrive. In person: you collect payment directly from participants. Online card via Stripe: funds transfer to your connected bank account progressively as each square is sold. A portion is held back on the platform to cover the prize pool. When the draw is complete, the full prize reserve is also transferred to your account and you pay the winners directly. There is no waiting until after the draw for the bulk of your funds.',
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
        a: 'Yes, but only if no squares have been sold. Once participants have purchased squares, the fundraiser cannot be deleted. If you need to cancel a live fundraiser with sales, you will need to manually refund participants and contact us via our contact page.',
      },
      {
        q: 'How do I share my fundraiser?',
        a: 'Once your fundraiser is live, use the Share button on your fundraiser page to copy your unique link or share directly via social media, WhatsApp, or email. The more people who see the link, the faster your grid fills.',
      },
      {
        q: 'Can I see who has bought squares?',
        a: "Yes. As the Organiser, you can see each square's status on the live grid. Sold squares display the buyer's first name. Your dashboard also shows total squares sold and your funds raised to date.",
      },
      {
        q: 'Can I set multiple prizes?',
        a: 'Yes. During setup you can add as many prizes as you like, including 1st, 2nd, 3rd, and additional places. Prize descriptions and values are displayed on the fundraiser page so participants know what they could win.',
      },
      {
        q: 'What is Club Mode?',
        a: 'Club Mode is a full-screen, stripped-back view of your live grid designed for in-person square selling at events such as club nights, fetes, and sporting events. When you switch to Club Mode on your phone or tablet, you see just the live grid, price per square, and a simple checkout form for recording each sale. Once a buyer has made their purchase and seen the confirmation screen, you tap "Payment received, next buyer" to reset the screen ready for the next person. Club Mode is only available to the campaign organiser and only for campaigns using in-person, bank transfer, or blended payment methods.',
      },
      {
        q: 'Is there a plan for organisations that run fundraisers regularly?',
        a: "Yes. The Organisation plan is $149 per year and gives you unlimited Lucky Squares campaigns with up to 10 running simultaneously. It's designed for schools, sporting clubs, and charities that fundraise throughout the year. One account per organisation, verified by ABN.",
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
        a: 'You can purchase a maximum of 10 squares per transaction. If you try to select an 11th square, you will see a message letting you know you have reached the limit.',
      },
      {
        q: 'How will I know if I have won?',
        a: 'Draw results are shown live on the fundraiser page. The winning square is highlighted with a rainbow symbol. If you have purchased squares, you will also receive an email notification. For campaigns using online card payments, winning participants will receive a follow-up email asking for bank account details so the organiser can pay the prize directly. For bank transfer and in person campaigns, the organiser will contact you with prize instructions. If you have not heard from the organiser within a couple of days of the draw, reach out to them directly.',
      },
      {
        q: 'Is my payment secure?',
        a: "Yes. Online card payments are processed by a PCI-DSS compliant payment provider. Lucky Squares Australia never stores your card details. Bank transfer payments go directly to the Organiser's nominated bank account. In person payments are collected directly by the Organiser.",
      },
      {
        q: 'Can I get a refund?',
        a: 'Refund requests should be directed to the Organiser who created the fundraiser, not to Lucky Squares Australia. If a fundraiser is cancelled before the draw, the Organiser is responsible for refunding all participants.',
      },
      {
        q: 'What if I have a problem with a fundraiser?',
        a: 'In the first instance, contact the Organiser directly. If you believe the Platform has been used improperly or unlawfully, you can contact Lucky Squares Australia via our contact page and we will investigate.',
      },
    ],
  },
  {
    category: 'Payments and Fees',
    emoji: '💳',
    items: [
      {
        q: 'What does the processing fee cover?',
        a: 'A transaction fee of 1.7% + $0.30 is added on top of the square price only when payment is made by secure online card payment. The buyer pays this fee, not the organiser. No processing fee applies to bank transfer or in person payments. The fee amount is displayed clearly before participants confirm their purchase.',
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
        q: 'Does the Campaign Fee include GST?',
        a: 'Lucky Squares Australia (Play With Heart Pty Ltd) is not currently registered for GST. The $19 Campaign Fee contains no GST component and is charged as a flat fee. If our GST registration status changes, we will update our pricing and notify organisers accordingly.',
      },
      {
        q: 'Do organisers need to charge GST on funds raised through Lucky Squares?',
        a: "GST treatment of fundraising proceeds depends on your organisation's GST registration status and the nature of the activity. Most fundraising activities conducted by incorporated associations, registered charities, and sporting clubs benefit from favourable GST treatment under ATO guidelines, and proceeds from a genuine fundraising event are generally not subject to GST even for GST-registered organisations. However, every organisation's circumstances are different. Lucky Squares Australia does not provide tax advice. We recommend consulting your accountant or referring to the ATO's guidance on fundraising and GST if you are unsure of your obligations.",
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
        a: 'Draw results are recorded to our database as soon as the draw is run. If there is any interruption during the draw process, the result is preserved and can be displayed once the connection is restored. Contact us via our contact page if you experience any issues.',
      },
    ],
  },
  {
    category: 'Lucky Squares Glossary',
    emoji: '📖',
    items: [
      {
        q: 'Lucky Square',
        a: 'A single numbered cell on the grid. You buy one (or up to ten), and if your number comes up in the draw, you win. Simple as that.',
      },
      {
        q: 'LiveGrid',
        a: 'The interactive numbered grid at the heart of every campaign. It updates in real time as squares are reserved and sold, so everyone watching sees the same thing at the same moment.',
      },
      {
        q: 'Campaign',
        a: 'A Lucky Squares fundraising event. We deliberately avoid the words "raffle" or "lottery" because a Campaign is its own thing: a grid-based, community-driven fundraiser with a transparent live draw.',
      },
      {
        q: 'Organiser',
        a: 'The person or organisation running a Campaign. The Organiser sets up the grid, sets the price per square and prizes, shares the link with their community, and runs the draw when ready.',
      },
      {
        q: 'Participant',
        a: 'Anyone who buys squares in a Campaign. Not a punter, not a ticket holder: a Participant. They pick their squares, pay the Organiser, and watch the LiveGrid.',
      },
      {
        q: 'Org Admin',
        a: "The person who established or is responsible for an Organisation's Lucky Squares account. The Org Admin controls the account, manages billing, and can assign Org Assistants to help run Campaigns.",
      },
      {
        q: 'Org Assistant',
        a: "A person assigned by an Org Admin to help run an Organisation's Campaigns. Org Assistants can create and manage Campaigns on behalf of the Organisation.",
      },
      {
        q: 'Organisation Member',
        a: 'An Organisation that holds an annual Lucky Squares membership, giving them access to unlimited Campaigns (up to 10 running simultaneously). Designed for schools, sporting clubs, and charities that fundraise throughout the year.',
      },
      {
        q: 'The Draw',
        a: "The moment of truth. When the Organiser is ready, they click Run Draw and the platform randomly selects one of the sold squares as the winner. The result is recorded instantly, cannot be changed, and is shown live on the grid for everyone watching.",
      },
      {
        q: 'Club Mode',
        a: 'A full-screen, stripped-back view of the LiveGrid designed for in-person square selling at events such as club nights, fetes, and sporting events. Once a buyer completes their purchase and sees the confirmation screen, the Organiser taps "Payment received, next buyer" and the screen resets for the next person.',
      },
      {
        q: 'Rainbow Square',
        a: 'A square gifted to a Campaign by Lucky Squares Australia. It appears on the LiveGrid as an animated, rainbow-coloured square: cycling through all the colours of the spectrum. It enters the draw the same as any other sold square.',
      },
      {
        q: 'Reserved',
        a: 'A square that has been selected by a Participant but not yet paid for. Reserved squares are shown in orange on the LiveGrid and held for 7 minutes while the Participant completes checkout. If the timer expires without payment, the square is released back to the grid.',
      },
      {
        q: 'Break-even',
        a: 'The point at which the funds raised from squares sold cover the cost of the non-donated prizes. Campaigns that have not reached break-even within 30 days of launch are automatically cancelled and Stripe payments are refunded.',
      },
      {
        q: 'Campaign Fee',
        a: 'The flat $19 fee charged when an Organiser launches a Campaign and makes it live. It covers access to the platform for the life of that Campaign. There are no ongoing fees and we do not take a percentage of funds raised.',
      },
      {
        q: 'Lucky Squares Blitz',
        a: "A whole-of-club fundraising event where multiple Campaigns run simultaneously across a club's teams or groups, all under one coordinated push. Coming soon.",
      },
      {
        q: 'Mariposa (Mari)',
        a: 'Our AI guide. Full name Maria Conejo, but everyone calls her Mariposa (or Mari for short). She is a baseball-loving jackrabbit from Woodland River and she knows everything about Lucky Squares. Look for the purple chat button in the corner of any page.',
      },
    ],
  },
];
