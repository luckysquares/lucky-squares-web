import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/adminAuth';
import { getAdminClient } from '@/lib/supabase/server';

const SEO_TOPICS = [
  // ── Bottom-of-funnel (3) ────────────────────────────────────────────────────
  { title: 'Lucky Squares Fundraisers: How They Work and Why They Raise More', audience: 'School and club fundraising coordinators researching lucky squares', tone: 'Helpful and informative', keyPoints: 'What a lucky squares fundraiser is, how the grid works, setting square prices, sharing online, running the live draw, why it raises more than traditional raffles, how to get started with Lucky Squares Australia', seoPillar: true },
  { title: 'How to Run a Footy Squares Fundraiser for Your Club', audience: 'Australian football club committee members and fundraising coordinators', tone: 'Warm and community-focused', keyPoints: 'Footy squares format explained, how to set up a grid for your football club, pricing squares, sharing with club members and supporters, running the draw on game day, AFL and community football clubs', seoPillar: true },
  { title: 'Grid Raffle Fundraisers: The Modern Alternative to Traditional Raffles', audience: 'Community organisations comparing fundraising options', tone: 'Helpful and informative', keyPoints: 'What a grid raffle is, how number squares fundraisers work, advantages over traditional ticket raffles, no printing costs, online sharing, real-time tracking, how Lucky Squares Australia makes it easy', seoPillar: true },

  // ── Middle-of-funnel (5) ────────────────────────────────────────────────────
  { title: 'P&C Fundraising Ideas That Actually Work for Australian Schools', audience: 'P&C committee members and school fundraising coordinators', tone: 'Helpful and informative', keyPoints: 'Best fundraising ideas for P&C associations, engaging parents and the school community, easy online fundraisers, lucky squares for schools, fetes and events, tips for hitting fundraising targets', seoPillar: true },
  { title: 'Netball Club Fundraising Ideas for Australian Clubs', audience: 'Netball club committee members and fundraising coordinators', tone: 'Warm and community-focused', keyPoints: 'Fundraising ideas specific to netball clubs, covering uniform costs and court fees, engaging players and families, online fundraisers that work for netball communities, lucky squares for netball clubs, seasonal timing', seoPillar: true },
  { title: 'AFL Club Fundraising Ideas for Grassroots Football', audience: 'AFL and community football club committee members', tone: 'Warm and community-focused', keyPoints: 'Fundraising ideas for grassroots AFL clubs, covering equipment and operational costs, engaging players families and supporters, footy squares fundraisers, match day fundraising, off-season ideas', seoPillar: true },
  { title: 'School Fundraising Ideas in Australia for 2026', audience: 'School principals, P&C committees, and school fundraising coordinators', tone: 'Helpful and informative', keyPoints: 'Best school fundraising ideas in Australia for 2026, easy online fundraisers, fun events that engage families, lucky squares for schools, avoiding fundraiser fatigue, setting and hitting targets', seoPillar: true },
  { title: 'Cricket Club Fundraising: How Australian Clubs Raise Money During and Between Seasons', audience: 'Cricket club committee members and fundraising coordinators', tone: 'Helpful and informative', keyPoints: 'Cricket club fundraising ideas Australia, covering pitch maintenance and equipment costs, engaging players and supporters, pre-season and off-season fundraising, online grid fundraisers for cricket clubs', seoPillar: true },

  // ── NSW (2) ─────────────────────────────────────────────────────────────────
  { title: 'Fundraising Rules for Schools and Clubs in New South Wales', audience: 'NSW school and club fundraising coordinators wanting compliance guidance', tone: 'Professional and authoritative', keyPoints: 'NSW raffle and lottery laws, Trade Promotion Lottery rules, Art Union permit requirements, what needs approval from Liquor and Gaming NSW, low-value fundraiser exemptions, linking to Lucky Squares and the raffle compliance guide at luckysquares.com.au/raffle-compliance', seoPillar: true },
  { title: 'School and Sporting Club Fundraising Ideas in NSW', audience: 'NSW school and sporting club fundraising coordinators', tone: 'Helpful and informative', keyPoints: 'Fundraising ideas suited to NSW schools and clubs, online fundraisers that work in New South Wales, lucky squares for NSW communities, compliance-friendly options, engaging the local community', seoPillar: true },

  // ── VIC (2) ─────────────────────────────────────────────────────────────────
  { title: 'Fundraising Permit Rules for Victorian Clubs and Schools', audience: 'Victorian school and club fundraising coordinators', tone: 'Professional and authoritative', keyPoints: 'Victoria raffle and lottery permit requirements, Victorian Commission for Gambling and Liquor Regulation, lucky square rules VIC, permit thresholds and exemptions, practical compliance tips for Victorian clubs and schools, linking to luckysquares.com.au/raffle-compliance', seoPillar: true },
  { title: 'Fundraising Ideas for Victorian Schools and Sporting Clubs', audience: 'Victorian school and sporting club fundraising coordinators', tone: 'Warm and community-focused', keyPoints: 'Fundraising ideas suited to Victorian schools and clubs, AFL club fundraising in Victoria, netball and community sport fundraising VIC, easy online fundraisers, lucky squares for Victorian communities', seoPillar: true },

  // ── QLD (2) ─────────────────────────────────────────────────────────────────
  { title: 'Running a Fundraiser in Queensland: What Community Groups Need to Know', audience: 'Queensland school and club fundraising coordinators', tone: 'Professional and authoritative', keyPoints: 'Queensland raffle and lottery rules, Office of Liquor and Gaming Regulation QLD, lucky square compliance QLD, permit requirements and exemptions, practical tips for Queensland community fundraisers, linking to luckysquares.com.au/raffle-compliance', seoPillar: true },
  { title: 'Fundraising Ideas for Queensland Schools and Sports Clubs', audience: 'Queensland school and sporting club fundraising coordinators', tone: 'Warm and community-focused', keyPoints: 'Fundraising ideas suited to Queensland schools and clubs, rugby league and AFL fundraising in QLD, school P&C fundraising Queensland, easy online fundraisers, lucky squares for Queensland communities', seoPillar: true },

  // ── SA (2) ──────────────────────────────────────────────────────────────────
  { title: 'Fundraising Rules for South Australian Community Organisations', audience: 'South Australian school and club fundraising coordinators', tone: 'Professional and authoritative', keyPoints: 'South Australia raffle and lottery rules, Consumer and Business Services SA, lucky square compliance SA, permit requirements and exemptions, practical tips for SA community fundraisers, linking to luckysquares.com.au/raffle-compliance', seoPillar: true },
  { title: 'Fundraising Ideas for South Australian Schools and Clubs', audience: 'South Australian school and sporting club fundraising coordinators', tone: 'Warm and community-focused', keyPoints: 'Fundraising ideas suited to South Australian schools and clubs, AFL and SANFL club fundraising, school P&C fundraising SA, easy online fundraisers, lucky squares for South Australian communities', seoPillar: true },

  // ── WA (2) ──────────────────────────────────────────────────────────────────
  { title: 'Running a Fundraiser in Western Australia: A Guide for Community Groups', audience: 'Western Australian school and club fundraising coordinators', tone: 'Professional and authoritative', keyPoints: 'WA raffle and lottery rules, Department of Local Government Sport and Cultural Industries WA, lucky square compliance WA, permit requirements and exemptions, practical tips for WA community fundraisers, linking to luckysquares.com.au/raffle-compliance', seoPillar: true },
  { title: 'Fundraising Ideas for Western Australian Schools and Clubs', audience: 'Western Australian school and sporting club fundraising coordinators', tone: 'Warm and community-focused', keyPoints: 'Fundraising ideas suited to WA schools and clubs, WAFL and community sport fundraising, school P&C fundraising Western Australia, easy online fundraisers, lucky squares for WA communities', seoPillar: true },

  // ── TAS (2) ─────────────────────────────────────────────────────────────────
  { title: 'Fundraising Rules for Tasmanian Schools and Community Groups', audience: 'Tasmanian school and club fundraising coordinators', tone: 'Professional and authoritative', keyPoints: 'Tasmania raffle and lottery rules, Tasmanian Liquor and Gaming Commission, lucky square compliance TAS, permit requirements and exemptions, practical tips for Tasmanian community fundraisers, linking to luckysquares.com.au/raffle-compliance', seoPillar: true },
  { title: 'Fundraising Ideas for Tasmanian Schools and Clubs', audience: 'Tasmanian school and sporting club fundraising coordinators', tone: 'Warm and community-focused', keyPoints: 'Fundraising ideas suited to Tasmanian schools and clubs, community sport fundraising TAS, school P&C fundraising Tasmania, easy online fundraisers, lucky squares for Tasmanian communities', seoPillar: true },

  // ── ACT (2) ─────────────────────────────────────────────────────────────────
  { title: 'Running a Fundraiser in the ACT: What Canberra Organisations Need to Know', audience: 'ACT school and club fundraising coordinators', tone: 'Professional and authoritative', keyPoints: 'ACT raffle and lottery rules, ACT Gambling and Racing Commission, lucky square compliance ACT, permit requirements and exemptions, practical tips for Canberra community fundraisers, linking to luckysquares.com.au/raffle-compliance', seoPillar: true },
  { title: 'Fundraising Ideas for ACT Schools and Community Groups', audience: 'ACT school and community group fundraising coordinators', tone: 'Warm and community-focused', keyPoints: 'Fundraising ideas suited to ACT schools and community groups, Canberra school P&C fundraising, community sport fundraising ACT, easy online fundraisers, lucky squares for Canberra communities', seoPillar: true },

  // ── NT (2) ──────────────────────────────────────────────────────────────────
  { title: 'Fundraising in the Northern Territory: A Guide for Community Organisations', audience: 'NT school and club fundraising coordinators', tone: 'Professional and authoritative', keyPoints: 'NT raffle and lottery rules, NT Racing Commission, lucky square compliance Northern Territory, permit requirements and exemptions, practical tips for NT community fundraisers, remote community considerations, linking to luckysquares.com.au/raffle-compliance', seoPillar: true },
  { title: 'Fundraising Ideas for NT Schools and Community Groups', audience: 'Northern Territory school and community group fundraising coordinators', tone: 'Warm and community-focused', keyPoints: 'Fundraising ideas suited to NT schools and community groups, Darwin and regional community fundraising, easy online fundraisers for the Territory, lucky squares for NT communities', seoPillar: true },
];

const SEED_TOPICS = [
  { title: 'How to Run a Lucky Squares Fundraiser That Sells Out', audience: 'Club and school fundraising coordinators', tone: 'Helpful and informative', keyPoints: 'Grid selection, pricing per square, sharing the link, running the draw, maximising participation' },
  { title: 'Why Lucky Squares Beat Traditional Raffles for Community Groups', audience: 'Club treasurers and P&C committees', tone: 'Helpful and informative', keyPoints: 'No printing, real-time tracking, flexible payment options, simple draw process, online sharing' },
  { title: '10 Proven Fundraising Ideas for Australian Sporting Clubs', audience: 'Sporting club committee members', tone: 'Warm and community-focused', keyPoints: 'Grid raffles, trivia nights, merchandise, club dinners, sponsorship, match day fundraising' },
  { title: 'How to Build a Stronger Sporting Club Community', audience: 'Club presidents and committee members', tone: 'Warm and community-focused', keyPoints: 'Volunteer culture, family involvement, communication, social events, recognition programs' },
  { title: 'Social Media Marketing Tips for Australian Sporting Clubs', audience: 'Club social media managers and marketers', tone: 'Helpful and informative', keyPoints: 'Facebook, Instagram, content ideas, match day posts, fundraiser promotion, growing followers' },
  { title: 'The Complete Guide to School P&C Fundraising in Australia', audience: 'P&C committee members and school fundraising coordinators', tone: 'Helpful and informative', keyPoints: 'Annual fundraising plan, event ideas, parent engagement, volunteer coordination, goal setting' },
  { title: 'How to Get Local Businesses to Sponsor Your Club', audience: 'Club committee members seeking sponsors', tone: 'Professional and authoritative', keyPoints: 'Sponsorship proposal, value exchange, local business approach, naming rights, package tiers' },
  { title: 'Setting Fundraising Goals Your Community Will Rally Behind', audience: 'Club and charity fundraising coordinators', tone: 'Warm and community-focused', keyPoints: 'SMART goals, community buy-in, visual progress tracking, celebrating milestones, accountability' },
  { title: 'How to Write a Fundraising Appeal That Actually Works', audience: 'Community organisation fundraising coordinators', tone: 'Professional and authoritative', keyPoints: 'Storytelling, urgency, clear CTA, personalisation, email vs social, results sharing' },
  { title: 'Volunteer Recruitment and Retention for Community Organisations', audience: 'Community organisation managers and club presidents', tone: 'Warm and community-focused', keyPoints: 'Recruiting volunteers, recognition, clear roles, avoiding burnout, building volunteer culture' },
  { title: 'How to Run a Charity Fundraiser Step by Step', audience: 'Charity and not-for-profit fundraising coordinators', tone: 'Helpful and informative', keyPoints: 'Planning, promotion, payment collection, draw or auction, thanking donors, reporting' },
  { title: 'The Rise of Online Fundraising in Australian Communities', audience: 'Community organisations exploring digital fundraising', tone: 'Professional and authoritative', keyPoints: 'Digital shift, online payment adoption, social sharing, remote participation, platforms available' },
  { title: 'Building a Fundraising Calendar for Your Sports Club', audience: 'Sporting club committee members and treasurers', tone: 'Helpful and informative', keyPoints: 'Annual planning, matching events to the season, avoiding clashes, spreading volunteer load, hitting revenue targets' },
  { title: 'How to Thank Your Donors and Keep Them Coming Back', audience: 'Fundraising coordinators for clubs and charities', tone: 'Warm and community-focused', keyPoints: 'Acknowledgement timing, personalisation, impact reporting, public recognition, small gestures' },
  { title: 'Community Events That Double as Fundraisers', audience: 'Community event organisers', tone: 'Warm and community-focused', keyPoints: 'Trivia nights, footy tipping, bingo, colour runs, fetes, combining fun with fundraising' },
  { title: 'How to Grow Your Club Membership Year on Year', audience: 'Sporting club presidents and committee members', tone: 'Professional and authoritative', keyPoints: 'Member retention, family packages, new member experience, referral programs, community involvement' },
  { title: 'Email Marketing Strategies for Community Organisations', audience: 'Club and charity communications coordinators', tone: 'Helpful and informative', keyPoints: 'Building an email list, newsletter templates, open rates, fundraising campaigns, unsubscribes' },
  { title: 'Engaging Junior Members and Their Families in Your Club', audience: 'Junior sports coordinators and club presidents', tone: 'Warm and community-focused', keyPoints: 'Junior programs, family involvement, communication with parents, fun events, pathways to senior levels' },
  { title: 'How to Run a 50/50 Raffle at Your Next Club Event', audience: 'Sporting clubs and community organisations', tone: 'Helpful and informative', keyPoints: '50/50 structure, permit requirements, ticket pricing, draw mechanics, maximising sales on the night' },
  { title: 'Creating a Sponsorship Package That Local Businesses Cannot Resist', audience: 'Club committee members seeking local sponsorship', tone: 'Professional and authoritative', keyPoints: 'What businesses want, exposure metrics, community reach, tiered packages, digital and physical naming rights' },
];

const toSlug = (s) =>
  s.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);

async function generatePost(apiKey, topic) {
  const systemPrompt = `You are a skilled content writer for Lucky Squares Australia, a platform that helps community organisations run Lucky Squares grid fundraisers online. Write in a warm, helpful, Australian English voice. Never use em-dashes or middle dots. You MUST respond with a single valid JSON object and nothing else.`;

  const complianceNote = topic.seoPillar && topic.keyPoints.includes('luckysquares.com.au/raffle-compliance')
    ? '\nWhere key points mention luckysquares.com.au/raffle-compliance, include a markdown link [Lucky Squares raffle compliance guide](https://luckysquares.com.au/raffle-compliance) in the content.'
    : '';

  const seoNote = topic.seoPillar
    ? '\nThis is an SEO pillar post. Write for search intent: someone researching this topic via Google. Use clear headings that match common search queries. Keep sentences direct and answers specific.'
    : '';

  const userPrompt = `Write a blog post for Lucky Squares Australia.

Topic: ${topic.title}
Target audience: ${topic.audience}
Tone: ${topic.tone}
Key points: ${topic.keyPoints}${seoNote}${complianceNote}

Return JSON with these exact keys:
{
  "title": "Final post title",
  "excerpt": "2-3 sentence summary under 180 characters",
  "tags": ["tag1", "tag2"],
  "image_prompt": "Detailed AI image generator prompt for the cover image. Must feel warm and community-focused: local sporting clubs, school fetes, volunteers, families at fundraising events, grassroots Australian community life. Only use professional or corporate imagery if the post is specifically about seeking business sponsorship. 1200x630 pixels, landscape orientation, photorealistic style, under 80 words.",
  "content": "Full post in markdown (# heading, 3-4 ## subheadings, CTA at end, 600-800 words, Australian English)"
}

Tags must be 2-3 lowercase values from: fundraising, sport, community, marketing, education, digital, lucky-squares, planning, volunteers, sponsorship`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      temperature: 0.7,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const json = await res.json();
  const raw = json.content?.[0]?.text ?? '';

  let parsed;
  try { parsed = JSON.parse(raw); } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) try { parsed = JSON.parse(match[0]); } catch { /* fall through */ }
  }
  if (!parsed) throw new Error('Could not parse AI response');
  return parsed;
}

export async function POST(req) {
  if (!await verifyAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 503 });

  const { index, source = 'seed' } = await req.json();
  const topics = source === 'seo' ? SEO_TOPICS : SEED_TOPICS;

  if (typeof index !== 'number' || index < 0 || index >= topics.length) {
    return NextResponse.json({ error: 'Invalid index', total: topics.length, source }, { status: 400 });
  }

  const topic = topics[index];
  const supabase = getAdminClient();

  const slug = toSlug(topic.title);
  const { data: existing } = await supabase.from('blog_posts').select('id').eq('slug', slug).maybeSingle();
  if (existing) {
    return NextResponse.json({ skipped: true, slug, index, total: topics.length, source });
  }

  const generated = await generatePost(apiKey, topic);

  // Force seo_pillar tag onto every SEO pillar post regardless of what the AI returned
  let tags = Array.isArray(generated.tags) ? generated.tags : [];
  if (topic.seoPillar && !tags.includes('seo_pillar')) {
    tags = ['seo_pillar', ...tags];
  }

  await supabase.rpc('admin_upsert_blog_post', {
    p_id:              null,
    p_slug:            slug,
    p_title:           generated.title || topic.title,
    p_excerpt:         generated.excerpt || '',
    p_content:         generated.content || '',
    p_author:          'Lucky Squares Australia',
    p_cover_image_url: null,
    p_image_prompt:    generated.image_prompt || '',
    p_tags:            tags,
    p_status:          'published',
  });

  return NextResponse.json({ ok: true, slug, title: generated.title, index, total: topics.length, source });
}

export async function GET(req) {
  if (!await verifyAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({
    seed: { total: SEED_TOPICS.length, topics: SEED_TOPICS.map((t) => t.title) },
    seo:  { total: SEO_TOPICS.length,  topics: SEO_TOPICS.map((t) => t.title)  },
    total: SEED_TOPICS.length + SEO_TOPICS.length,
  });
}
