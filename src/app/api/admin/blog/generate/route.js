import { NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are a skilled content writer for Lucky Squares Australia, a platform that helps community organisations (schools, sporting clubs, charities) run Lucky Squares grid fundraisers online. Write in a warm, helpful, Australian English voice. Never use em-dashes or middle dots.

You MUST respond with a single valid JSON object and nothing else. No markdown fences, no explanation — just the raw JSON.`;

export async function POST(req) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI generation not configured. Add ANTHROPIC_API_KEY to environment variables.' },
      { status: 503 }
    );
  }

  const { title, audience, tone, keyPoints } = await req.json();

  const userPrompt = `Write a blog post for Lucky Squares Australia.

Topic / working title: ${title || 'Community fundraising tips'}
Target audience: ${audience || 'Community organisation fundraising coordinators'}
Tone: ${tone || 'Helpful and informative'}
Key points to cover: ${keyPoints || 'General tips for running a successful fundraiser'}

Return a JSON object with these exact keys:
{
  "title": "The final post title (may refine the working title)",
  "excerpt": "2-3 sentence summary for the blog listing page, under 200 characters",
  "tags": ["tag1", "tag2", "tag3"],
  "image_prompt": "A detailed prompt for an AI image generator (Midjourney or DALL-E) describing the ideal cover image for this post. The image must feel warm and community-focused: think local sporting clubs, school fetes, volunteers, families at fundraising events, grassroots Australian community life. Only use professional or corporate imagery if the post is specifically about seeking business sponsorship. Include style, mood, subjects, colours. Specify 1200x630 pixels, landscape orientation. Under 100 words.",
  "content": "The full post in markdown format"
}

Content requirements:
- Start content with # heading (the post title)
- Engaging introduction paragraph
- 3 to 5 ## subheadings with body paragraphs
- End with a ## call-to-action section mentioning Lucky Squares Australia
- Australian English, 600 to 900 words
- Do not use em-dashes or middle dots
- Use bullet points or numbered lists where helpful

Tag requirements:
- 2 to 4 lowercase tags from: fundraising, sport, community, marketing, education, digital, lucky-squares, planning, volunteers, sponsorship
- First tag should be the primary category`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2500,
        temperature: 0.7,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[blog/generate] Anthropic error:', res.status, err);
      return NextResponse.json({ error: 'AI generation failed. Please try again.' }, { status: 500 });
    }

    const json = await res.json();
    const raw = json.content?.[0]?.text ?? '';

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Fallback: try to extract JSON from response
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]); } catch { parsed = null; }
      }
    }

    if (!parsed?.content) {
      // Last resort: treat raw as plain content
      return NextResponse.json({ content: raw, title: '', excerpt: '', tags: [], image_prompt: '' });
    }

    return NextResponse.json({
      content:      parsed.content ?? '',
      title:        parsed.title ?? '',
      excerpt:      parsed.excerpt ?? '',
      tags:         Array.isArray(parsed.tags) ? parsed.tags : [],
      image_prompt: parsed.image_prompt ?? '',
    });
  } catch (err) {
    console.error('[blog/generate] fetch error:', err);
    return NextResponse.json({ error: 'AI generation failed. Please try again.' }, { status: 500 });
  }
}
