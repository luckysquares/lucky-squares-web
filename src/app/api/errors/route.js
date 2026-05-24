/**
 * POST /api/errors
 * Receives client-side error reports and writes them to error_logs.
 * Rate-limited to prevent abuse. No auth required (errors can happen before login).
 */
import { NextResponse } from 'next/server';
import { logError } from '@/lib/logError';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export async function POST(req) {
  // Rate limit: 20 errors per IP per 10 minutes
  const ip = getClientIp(req);
  const { allowed } = checkRateLimit(`errors:${ip}`, { limit: 20, windowMs: 10 * 60 * 1000 });
  if (!allowed) return NextResponse.json({ ok: false }, { status: 429 });

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }

  const { message, stack, route, userId, metadata } = body;
  if (!message || typeof message !== 'string') return NextResponse.json({ ok: false }, { status: 400 });

  await logError({
    level:    'error',
    source:   'client',
    route:    route   || null,
    message:  message.slice(0, 2000),
    stack:    stack   ? String(stack).slice(0, 5000) : null,
    userId:   userId  || null,
    metadata: {
      ...(metadata || {}),
      ip,
    },
  });

  return NextResponse.json({ ok: true });
}
