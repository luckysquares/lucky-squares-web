import { NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are a skilled content writer for LuckySquares Australia, a platform that helps community organisations (schools, sporting clubs, charities) run Lucky Squares grid fundraisers online. Write in a warm, helpful, Australian English voice. Never use em-dashes or middle dots.`;

export async function POST(req) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI generation not configured. Add ANTHROPIC_API_KEY to environment variables.' },
      { status: 503 }
    );
  }

  const { title, audience, tone, keyPoints } = await req.json();

  const userPrompt = `Write a blog post for LuckySquares Australia in markdown format.

Topic / working title: ${title || 'Community fundraising tips'}
Target audience: ${audience || 'Community organisation fundraising coordinators'}
Tone: ${tone || 'Helpful and informative'}
Key points to cover: ${keyPoints || 'General tips for running a successful fundraiser'}

Format the post as follows:
- Start with a # heading (the post title)
- Write an engaging introduction paragraph
- Include 3 to 5 ## subheadings with body paragraphs under each
- End with a ## call-to-action section encouraging readers to try LuckySquares Australia

Requirements:
- Write in Australian English
- Make it practical and relevant to Australian community fundraisers (schools, sporting clubs, P&Cs, charities)
- Target length: 600 to 900 words
- Do not use em-dashes or middle dots
- Use bullet points or numbered lists where they add clarity`;

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
        max_tokens: 2000,
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
    const content = json.content?.[0]?.text ?? '';
    return NextResponse.json({ content });
  } catch (err) {
    console.error('[blog/generate] fetch error:', err);
    return NextResponse.json({ error: 'AI generation failed. Please try again.' }, { status: 500 });
  }
}
