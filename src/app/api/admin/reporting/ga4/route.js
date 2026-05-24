import { NextResponse } from 'next/server';
import { getAdminClient as getSupabase } from '@/lib/supabase/server';

// ── Auth verification ─────────────────────────────────────────────────────────

async function verifyAdmin(req) {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return false;
  const token = auth.slice(7);
  const supabase = getSupabase();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return false;
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  return profile?.is_admin === true;
}

// ── OAuth2 token refresh ──────────────────────────────────────────────────────

async function getAccessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id:     process.env.GOOGLE_OAUTH_CLIENT_ID,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
      grant_type:    'refresh_token',
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token refresh failed: ${err}`);
  }
  const { access_token } = await res.json();
  return access_token;
}

// ── GA4 batch report ──────────────────────────────────────────────────────────

function dateRange(daysAgo) {
  return { startDate: `${daysAgo}daysAgo`, endDate: 'today' };
}

export async function GET(req) {
  if (!await verifyAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const propertyId = process.env.GA4_PROPERTY_ID;
  const clientId   = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

  // Diagnostic — remove after confirming env vars are set
  if (!propertyId || !clientId || !clientSecret || !refreshToken) {
    const missing = [
      !propertyId    && 'GA4_PROPERTY_ID',
      !clientId      && 'GOOGLE_OAUTH_CLIENT_ID',
      !clientSecret  && 'GOOGLE_OAUTH_CLIENT_SECRET',
      !refreshToken  && 'GOOGLE_OAUTH_REFRESH_TOKEN',
    ].filter(Boolean);
    return NextResponse.json({
      error: `GA4 not configured — missing: ${missing.join(', ')}`,
    }, { status: 503 });
  }

  try {
    const accessToken = await getAccessToken();

    const batchRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:batchRunReports`,
      {
        method: 'POST',
        headers: {
          Authorization:  `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            // 0: Daily sessions trend (30 days)
            {
              dateRanges: [dateRange(30)],
              dimensions: [{ name: 'date' }],
              metrics:    [
                { name: 'sessions' },
                { name: 'activeUsers' },
                { name: 'newUsers' },
              ],
              orderBys: [{ dimension: { dimensionName: 'date' } }],
            },
            // 1: Top pages by views
            {
              dateRanges: [dateRange(30)],
              dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
              metrics:    [{ name: 'screenPageViews' }, { name: 'sessions' }],
              orderBys:   [{ metric: { metricName: 'screenPageViews' }, desc: true }],
              limit: 10,
            },
            // 2: Traffic sources
            {
              dateRanges: [dateRange(30)],
              dimensions: [{ name: 'sessionDefaultChannelGroup' }],
              metrics:    [{ name: 'sessions' }, { name: 'activeUsers' }],
              orderBys:   [{ metric: { metricName: 'sessions' }, desc: true }],
            },
            // 3: Landing pages (entry pages)
            {
              dateRanges: [dateRange(30)],
              dimensions: [{ name: 'landingPage' }],
              metrics:    [
                { name: 'sessions' },
                { name: 'bounceRate' },
                { name: 'averageSessionDuration' },
              ],
              orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
              limit: 10,
            },
            // 4: Geography
            {
              dateRanges: [dateRange(30)],
              dimensions: [{ name: 'country' }],
              metrics:    [{ name: 'sessions' }, { name: 'activeUsers' }],
              orderBys:   [{ metric: { metricName: 'sessions' }, desc: true }],
              limit: 15,
            },
            // 5: Device category
            {
              dateRanges: [dateRange(30)],
              dimensions: [{ name: 'deviceCategory' }],
              metrics:    [{ name: 'sessions' }, { name: 'activeUsers' }],
              orderBys:   [{ metric: { metricName: 'sessions' }, desc: true }],
            },
            // 6: Exit pages (pages with most exits)
            {
              dateRanges: [dateRange(30)],
              dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
              metrics:    [{ name: 'exits' }, { name: 'screenPageViews' }],
              orderBys:   [{ metric: { metricName: 'exits' }, desc: true }],
              limit: 10,
            },
          ],
        }),
      },
    );

    if (!batchRes.ok) {
      const err = await batchRes.text();
      console.error('[ga4] API error:', err);
      return NextResponse.json({ error: `GA4 API error: ${batchRes.status}` }, { status: 502 });
    }

    const { reports } = await batchRes.json();

    // ── Parse helpers ────────────────────────────────────────────────────────

    const rows = (report) => (report?.rows ?? []).map((row) => ({
      dimensions: row.dimensionValues?.map((d) => d.value) ?? [],
      metrics:    row.metricValues?.map((m) => m.value) ?? [],
    }));

    const [trend, topPages, sources, landingPages, geography, devices, exitPages] = reports;

    return NextResponse.json({
      trend: rows(trend).map((r) => ({
        date:     r.dimensions[0],
        sessions: parseInt(r.metrics[0], 10),
        users:    parseInt(r.metrics[1], 10),
        newUsers: parseInt(r.metrics[2], 10),
      })),
      topPages: rows(topPages).map((r) => ({
        path:     r.dimensions[0],
        title:    r.dimensions[1],
        views:    parseInt(r.metrics[0], 10),
        sessions: parseInt(r.metrics[1], 10),
      })),
      sources: rows(sources).map((r) => ({
        channel:  r.dimensions[0],
        sessions: parseInt(r.metrics[0], 10),
        users:    parseInt(r.metrics[1], 10),
      })),
      landingPages: rows(landingPages).map((r) => ({
        path:       r.dimensions[0],
        sessions:   parseInt(r.metrics[0], 10),
        bounceRate: parseFloat(r.metrics[1]),
        avgDuration: parseFloat(r.metrics[2]),
      })),
      geography: rows(geography).map((r) => ({
        country:  r.dimensions[0],
        sessions: parseInt(r.metrics[0], 10),
        users:    parseInt(r.metrics[1], 10),
      })),
      devices: rows(devices).map((r) => ({
        device:   r.dimensions[0],
        sessions: parseInt(r.metrics[0], 10),
        users:    parseInt(r.metrics[1], 10),
      })),
      exitPages: rows(exitPages).map((r) => ({
        path:   r.dimensions[0],
        title:  r.dimensions[1],
        exits:  parseInt(r.metrics[0], 10),
        views:  parseInt(r.metrics[1], 10),
      })),
    });

  } catch (err) {
    console.error('[ga4] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
