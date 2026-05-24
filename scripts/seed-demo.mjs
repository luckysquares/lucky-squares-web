import { createClient } from '@supabase/supabase-js';

const URL = 'https://yymppdzohiekzmjlbdqx.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5bXBwZHpvaGlla3ptamxiZHF4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTM2NjA1MSwiZXhwIjoyMDk0OTQyMDUxfQ.OmCH_2JOiv4sNN6CqFhyE8QIt1CvPrOmogVh2RO3WPE';
const sb = createClient(URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const DEMO_PASSWORD = 'Demo1234!';

// ── Organisers ────────────────────────────────────────────────────────────────
const ORGANISERS = [
  { email: 'marcus.webb@werribeejuniorfc.com.au',  name: 'Marcus Webb',       org: 'Werribee Junior Football Club' },
  { email: 'pandc@sunburyprimary.vic.edu.au',       name: 'Priya Nair',        org: 'Sunbury Primary School P&C' },
  { email: 'treasurer@baysideslsc.com.au',          name: 'Danni Forsyth',     org: 'Bayside Surf Lifesaving Club' },
  { email: 'jamie@glenelgbaseball.com.au',          name: 'Jamie Stott',       org: 'Glenelg Baseball Club: Chuggernauts' },
  { email: 'hello@wildlifefriendssa.org.au',        name: 'Helen Cartwright',  org: 'Wildlife Friends SA' },
];

// ── Campaigns ─────────────────────────────────────────────────────────────────
const CAMPAIGNS = [
  {
    organiserIdx: 0,
    title:        'Help our Under 14s get to the State Championships',
    org:          'Werribee Junior Football Club',
    emoji:        '🏆',
    description:  'Our Under 14 boys have had an incredible season and have qualified for the Victorian State Championships in Bendigo for the first time in the club\'s history. We need to raise funds to cover travel, accommodation and meals for 22 players and 4 coaches across a 3-day tournament. Every square you buy gets these kids one step closer to the biggest game of their young lives. Go Eagles! 🦅',
    thank_you:    'You legend! Your support means the world to our boys. We\'ll be thinking of you when we run out onto that oval in Bendigo. Go Eagles!',
    contact_name:  'Marcus Webb',
    contact_email: 'marcus.webb@werribeejuniorfc.com.au',
    contact_phone: '0412 388 741',
    grid_size:    50,
    price_per_sq: 5,
    payment_method: 'bank_inperson',
    state:        'VIC',
    fullySold:    true,
    buyers: [
      { name: 'Brayden Mitchell',  email: 'brayden.mitchell@gmail.com',   phone: '0411 222 001', squares: 7 },
      { name: 'Kylie Hennessy',    email: 'kylie.hennessy@hotmail.com',   phone: '0422 333 002', squares: 5 },
      { name: 'Todd Carmichael',   email: 'todd.carmichael@gmail.com',    phone: '0433 444 003', squares: 8 },
      { name: 'Rachel Dunlop',     email: 'rachel.dunlop@gmail.com',      phone: '0444 555 004', squares: 6 },
      { name: 'Dave Sproule',      email: 'dave.sproule@outlook.com',     phone: '0455 666 005', squares: 5 },
      { name: 'Mel Okonkwo',       email: 'mel.okonkwo@gmail.com',        phone: '0466 777 006', squares: 7 },
      { name: 'Craig Fairweather', email: 'craig.fairweather@gmail.com',  phone: '0477 888 007', squares: 5 },
      { name: 'Jess Alvaro',       email: 'jess.alvaro@hotmail.com',      phone: '0488 999 008', squares: 7 },
    ],
  },
  {
    organiserIdx: 1,
    title:        'New playground equipment for Sunbury Primary',
    org:          'Sunbury Primary School P&C',
    emoji:        '🌱',
    description:  'Our playground equipment is over 20 years old and well past its best. We\'re raising funds to install a brand new nature play area for our 340 students — including a climbing structure, balance beams, and a sand and water play zone. The school has matched the first $2,000 raised, so every dollar you contribute is doubled. Help us give our kids a playground they deserve!',
    thank_you:    'Thank you so much for supporting our kids! We\'ll put your name on our donor wall in the school foyer and make sure the children know how many wonderful people helped make their new playground happen. 🌱',
    contact_name:  'Priya Nair',
    contact_email: 'pandc@sunburyprimary.vic.edu.au',
    contact_phone: '0438 552 190',
    grid_size:    100,
    price_per_sq: 5,
    payment_method: 'bank_inperson',
    state:        'VIC',
    fullySold:    false,
    buyers: [
      { name: 'Amelia Cross',    email: 'amelia.cross@gmail.com',    phone: '0411 100 021', squares: 4 },
      { name: 'Simon Tran',      email: 'simon.tran@gmail.com',      phone: '0422 100 022', squares: 6 },
      { name: 'Natasha Bell',    email: 'natasha.bell@outlook.com',  phone: '0433 100 023', squares: 3 },
      { name: 'Phil Greco',      email: 'phil.greco@gmail.com',      phone: '0444 100 024', squares: 5 },
      { name: 'Wend Kaur',       email: 'wend.kaur@hotmail.com',     phone: '0455 100 025', squares: 4 },
      { name: 'Luke O\'Brien',   email: 'luke.obrien@gmail.com',     phone: '0466 100 026', squares: 5 },
    ],
  },
  {
    organiserIdx: 2,
    title:        'New patrol boards for Bayside Surf Lifesaving Club',
    org:          'Bayside Surf Lifesaving Club',
    emoji:        '⭐',
    description:  'Our club has been protecting Bayside Beach for 68 years and our volunteer lifesavers respond to hundreds of incidents every summer season. Our rescue boards are reaching the end of their service life and we urgently need two new boards to ensure we can respond quickly and safely. All funds raised go directly toward the purchase of two new IRB-grade rescue paddleboards. Help keep our beach safe this summer!',
    thank_you:    'From all of our volunteer lifesavers — thank you! You\'re helping keep our community safe. Come say g\'day at the clubhouse any Sunday morning and we\'ll shout you a snag. ❤️',
    contact_name:  'Danni Forsyth',
    contact_email: 'treasurer@baysideslsc.com.au',
    contact_phone: '0421 774 033',
    grid_size:    50,
    price_per_sq: 10,
    payment_method: 'bank_inperson',
    state:        'VIC',
    fullySold:    false,
    buyers: [
      { name: 'Hannah Shore',  email: 'hannah.shore@gmail.com',   phone: '0411 200 031', squares: 3 },
      { name: 'Russ Dalby',    email: 'russ.dalby@outlook.com',   phone: '0422 200 032', squares: 4 },
      { name: 'Fiona Lam',     email: 'fiona.lam@gmail.com',      phone: '0433 200 033', squares: 2 },
      { name: 'Brett Kovacs',  email: 'brett.kovacs@gmail.com',   phone: '0444 200 034', squares: 3 },
      { name: 'Steph Nguyen',  email: 'steph.nguyen@hotmail.com', phone: '0455 200 035', squares: 4 },
    ],
  },
  {
    organiserIdx: 3,
    title:        'PANPACS Gold Coast 2026 — Chuggernauts Women\'s Baseball',
    org:          'Glenelg Baseball Club: Chuggernauts',
    emoji:        '⚾',
    description:  'The Chuggernauts are heading to the Pan Pacific Masters Games on the Gold Coast in November 2026 — one of the biggest masters sports events in the world! We\'re raising funds to help cover travel, accommodation, entry fees and uniforms for our squad of 14 women aged 35 and over. Most of us have been playing together for years and this is a once-in-a-lifetime opportunity to represent South Australia on an international stage. Every square brings us one step closer to the Gold Coast!',
    thank_you:    'You absolute champion! The Chuggernauts are so grateful for your support. We\'ll be wearing your good wishes on our sleeves when we take the field on the Gold Coast. Go Chuggernauts! ⚾',
    contact_name:  'Jamie Stott',
    contact_email: 'jamie@glenelgbaseball.com.au',
    contact_phone: '0403 921 658',
    grid_size:    50,
    price_per_sq: 5,
    payment_method: 'bank_inperson',
    state:        'SA',
    fullySold:    true,
    buyers: [
      { name: 'Sophie Langdon',   email: 'sophie.langdon@gmail.com',    phone: '0411 300 041', squares: 6 },
      { name: 'Nick Ferreira',    email: 'nick.ferreira@hotmail.com',   phone: '0422 300 042', squares: 8 },
      { name: 'Gail Sutherland',  email: 'gail.sutherland@gmail.com',   phone: '0433 300 043', squares: 5 },
      { name: 'Rory Blackwood',   email: 'rory.blackwood@outlook.com',  phone: '0444 300 044', squares: 7 },
      { name: 'Trish Nakamura',   email: 'trish.nakamura@gmail.com',    phone: '0455 300 045', squares: 5 },
      { name: 'Aaron Godfrey',    email: 'aaron.godfrey@gmail.com',     phone: '0466 300 046', squares: 7 },
      { name: 'Carly Weston',     email: 'carly.weston@hotmail.com',    phone: '0477 300 047', squares: 5 },
      { name: 'Blake Moreau',     email: 'blake.moreau@gmail.com',      phone: '0488 300 048', squares: 7 },
    ],
  },
  {
    organiserIdx: 4,
    title:        'New rescue vehicle for Wildlife Friends SA',
    org:          'Wildlife Friends SA',
    emoji:        '🐾',
    description:  'Our volunteer wildlife carers respond to over 1,200 rescue calls every year across metropolitan Adelaide and the Adelaide Hills — injured wombats, orphaned joeys, distressed birds and everything in between. Our current rescue vehicle has over 280,000km on the clock and is costing us more in repairs than we can afford. We\'re raising funds toward a reliable second-hand 4WD that can handle the rough tracks our rescuers navigate every week. Help us keep our wildlife heroes on the road! 🐨',
    thank_you:    'On behalf of every wombat, joey, echidna and possum we\'ve ever rescued — thank you! We\'ll send you a photo of our first rescue in the new vehicle so you can see your generosity in action. 🐾',
    contact_name:  'Helen Cartwright',
    contact_email: 'hello@wildlifefriendssa.org.au',
    contact_phone: '0455 318 822',
    grid_size:    50,
    price_per_sq: 5,
    payment_method: 'bank_inperson',
    state:        'SA',
    fullySold:    false,
    buyers: [
      { name: 'Cath Nguyen',    email: 'cath.nguyen@gmail.com',    phone: '0411 400 051', squares: 3 },
      { name: 'Mark Brennan',   email: 'mark.brennan@outlook.com', phone: '0422 400 052', squares: 4 },
      { name: 'Jodi Papadopoulos', email: 'jodi.papa@gmail.com',   phone: '0433 400 053', squares: 2 },
      { name: 'Sam Elliott',    email: 'sam.elliott@hotmail.com',  phone: '0444 400 054', squares: 3 },
    ],
  },
];

async function createOrGetUser(organiser) {
  // Try creating; if already exists, look them up
  const { data, error } = await sb.auth.admin.createUser({
    email:             organiser.email,
    password:          DEMO_PASSWORD,
    email_confirm:     true,
    user_metadata:     { full_name: organiser.name, organisation: organiser.org },
  });

  if (error && error.message.includes('already been registered')) {
    const { data: list } = await sb.auth.admin.listUsers();
    const existing = list?.users?.find(u => u.email === organiser.email);
    if (existing) {
      console.log(`  ↩  User exists: ${organiser.email} (${existing.id})`);
      return existing.id;
    }
    throw new Error(`Could not find existing user: ${organiser.email}`);
  }

  if (error) throw new Error(`createUser failed for ${organiser.email}: ${error.message}`);
  console.log(`  ✅ Created user: ${organiser.email} (${data.user.id})`);
  return data.user.id;
}

async function createCampaign(campaign, ownerId) {
  const launchedAt = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(); // 10 days ago

  const { data, error } = await sb
    .from('fundraisers')
    .insert({
      owner_id:       ownerId,
      title:          campaign.title,
      org:            campaign.org,
      emoji:          campaign.emoji,
      description:    campaign.description,
      thank_you:      campaign.thank_you,
      contact_name:   campaign.contact_name,
      contact_email:  campaign.contact_email,
      contact_phone:  campaign.contact_phone,
      grid_size:      campaign.grid_size,
      price_per_sq:   campaign.price_per_sq,
      payment_method: campaign.payment_method,
      state:          campaign.state,
      status:         'active',
      launched_at:    launchedAt,
    })
    .select('id')
    .single();

  if (error) throw new Error(`Insert fundraiser failed: ${error.message}`);
  console.log(`  ✅ Campaign created: ${campaign.title} (${data.id})`);
  return data.id;
}

async function createSquares(fundraiserId, gridSize) {
  const rows = Array.from({ length: gridSize }, (_, i) => ({
    fundraiser_id: fundraiserId,
    number:        i + 1,
    status:        'available',
  }));

  const { error } = await sb.from('squares').insert(rows);
  if (error) throw new Error(`Insert squares failed: ${error.message}`);
  console.log(`  ✅ ${gridSize} squares created`);
}

async function assignBuyers(fundraiserId, buyers, gridSize) {
  // Fetch all available square numbers
  const { data: squares } = await sb
    .from('squares')
    .select('id, number')
    .eq('fundraiser_id', fundraiserId)
    .eq('status', 'available')
    .order('number');

  let idx = 0;
  for (const buyer of buyers) {
    const count = Math.min(buyer.squares, squares.length - idx);
    if (count <= 0) break;
    const ids = squares.slice(idx, idx + count).map(s => s.id);
    idx += count;

    const { error } = await sb
      .from('squares')
      .update({ status: 'sold', buyer_name: buyer.name, buyer_email: buyer.email, buyer_phone: buyer.phone, paid: true })
      .in('id', ids);

    if (error) throw new Error(`Update squares failed for ${buyer.name}: ${error.message}`);
    console.log(`    • ${buyer.name}: ${count} squares`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀 Seeding demo data...\n');

  const userIds = [];
  console.log('👤 Creating organiser accounts...');
  for (const organiser of ORGANISERS) {
    const id = await createOrGetUser(organiser);
    userIds.push(id);
  }

  console.log('\n📋 Creating campaigns...');
  for (const campaign of CAMPAIGNS) {
    const ownerId = userIds[campaign.organiserIdx];
    console.log(`\n  Campaign: ${campaign.title}`);

    const fundraiserId = await createCampaign(campaign, ownerId);
    await createSquares(fundraiserId, campaign.grid_size);

    console.log(`  Assigning buyers...`);
    await assignBuyers(fundraiserId, campaign.buyers, campaign.grid_size);

    const soldTotal = campaign.buyers.reduce((sum, b) => sum + b.squares, 0);
    console.log(`  ✅ ${soldTotal}/${campaign.grid_size} squares sold`);
  }

  console.log('\n✅ Done! All demo data seeded.\n');
  console.log('Demo login password for all organisers: Demo1234!\n');
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
