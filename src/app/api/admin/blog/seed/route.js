import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
  const systemPrompt = `You are a skilled content writer for LuckySquares Australia, a platform that helps community organisations run Lucky Squares grid fundraisers online. Write in a warm, helpful, Australian English voice. Never use em-dashes or middle dots. You MUST respond with a single valid JSON object and nothing else.`;

  const userPrompt = `Write a blog post for LuckySquares Australia.

Topic: ${topic.title}
Target audience: ${topic.audience}
Tone: ${topic.tone}
Key points: ${topic.keyPoints}

Return JSON with these exact keys:
{
  "title": "Final post title",
  "excerpt": "2-3 sentence summary under 180 characters",
  "tags": ["tag1", "tag2"],
  "image_prompt": "Detailed AI image generator prompt for the cover image, under 80 words, photorealistic style",
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
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const url    = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key    = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 503 });
  if (!url || !key) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });

  const { index } = await req.json();
  if (typeof index !== 'number' || index < 0 || index >= SEED_TOPICS.length) {
    return NextResponse.json({ error: 'Invalid index', total: SEED_TOPICS.length }, { status: 400 });
  }

  const topic = SEED_TOPICS[index];
  const supabase = createClient(url, key);

  const slug = toSlug(topic.title);
  const { data: existing } = await supabase.from('blog_posts').select('id').eq('slug', slug).maybeSingle();
  if (existing) {
    return NextResponse.json({ skipped: true, slug, index, total: SEED_TOPICS.length });
  }

  const generated = await generatePost(apiKey, topic);

  await supabase.rpc('admin_upsert_blog_post', {
    p_id:              null,
    p_slug:            slug,
    p_title:           generated.title || topic.title,
    p_excerpt:         generated.excerpt || '',
    p_content:         generated.content || '',
    p_author:          'LuckySquares Australia',
    p_cover_image_url: null,
    p_image_prompt:    generated.image_prompt || '',
    p_tags:            Array.isArray(generated.tags) ? generated.tags : [],
    p_status:          'published',
  });

  return NextResponse.json({ ok: true, slug, title: generated.title, index, total: SEED_TOPICS.length });
}

export async function GET() {
  return NextResponse.json({ total: SEED_TOPICS.length, topics: SEED_TOPICS.map((t) => t.title) });
}
