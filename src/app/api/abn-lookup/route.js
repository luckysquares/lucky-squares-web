import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

// Extract a single XML tag value (first occurrence)
function extractTag(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i');
  const m = xml.match(re);
  return m ? m[1].trim() : null;
}

// Extract all values for a tag
function extractAll(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'gi');
  const results = [];
  let m;
  while ((m = re.exec(xml)) !== null) results.push(m[1].trim());
  return results;
}

// Pull a named block out of the XML
function extractBlock(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const m = xml.match(re);
  return m ? m[1] : null;
}

export async function GET(req) {
  // Rate limit: 10 lookups per IP per minute.
  // Each lookup proxies a request to the ABR API. The shared ABR authentication
  // GUID can be suspended if hit too frequently, which would disable ABN
  // validation for all users. The 5-minute Next.js cache handles repeat lookups
  // for the same ABN; this guard protects against a burst of unique ABNs.
  const ip = getClientIp(req);
  const { allowed } = checkRateLimit(`abn:${ip}`, {
    limit:    10,
    windowMs: 60 * 1000, // 1 minute
  });
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const abn = searchParams.get('abn')?.replace(/\s/g, '');

  if (!abn || !/^\d{11}$/.test(abn)) {
    return NextResponse.json({ error: 'Invalid ABN' }, { status: 400 });
  }

  const guid = process.env.ABR_GUID;
  if (!guid) {
    return NextResponse.json({ error: 'ABR GUID not configured' }, { status: 500 });
  }

  try {
    const url = `https://abr.business.gov.au/abrxmlsearch/AbrXmlSearch.asmx/ABRSearchByABN` +
      `?authenticationGuid=${guid}&includeHistoricalDetails=N&searchString=${abn}`;

    const res = await fetch(url, { next: { revalidate: 300 } }); // cache 5 min
    if (!res.ok) {
      return NextResponse.json({ error: 'ABR service unavailable' }, { status: 502 });
    }

    const xml = await res.text();

    // Check for exception / not found
    if (xml.includes('<exception>') || xml.includes('No records found')) {
      return NextResponse.json({ found: false });
    }

    const entity = extractBlock(xml, 'businessEntity202001');

    if (!entity) {
      return NextResponse.json({ found: false });
    }

    // ABN status
    const abnBlock  = extractBlock(entity, 'ABN');
    const abnActive = abnBlock ? extractTag(abnBlock, 'isCurrentIndicator') === 'Y' : false;

    // Entity status
    const statusBlock  = extractBlock(entity, 'entityStatus');
    const statusCode   = statusBlock ? extractTag(statusBlock, 'entityStatusCode') : null;
    const active       = abnActive && statusCode === 'Active';

    // Entity type
    const entityTypeBlock = extractBlock(entity, 'entityType');
    const entityType      = entityTypeBlock ? extractTag(entityTypeBlock, 'entityDescription') : null;

    // Organisation name — try mainName first, then mainTradingName
    let name = null;
    const mainNameBlock = extractBlock(entity, 'mainName');
    if (mainNameBlock) {
      const isCurrent = extractTag(mainNameBlock, 'isCurrentIndicator');
      if (isCurrent === 'Y') name = extractTag(mainNameBlock, 'organisationName');
    }

    if (!name) {
      const tradingBlock = extractBlock(entity, 'mainTradingName');
      if (tradingBlock) {
        const isCurrent = extractTag(tradingBlock, 'isCurrentIndicator');
        if (isCurrent === 'Y') name = extractTag(tradingBlock, 'organisationName');
      }
    }

    // Sole trader / individual — legalName
    if (!name) {
      const legalBlock = extractBlock(entity, 'legalName');
      if (legalBlock) {
        const given  = extractTag(legalBlock, 'givenName') || '';
        const family = extractTag(legalBlock, 'familyName') || '';
        name = `${given} ${family}`.trim() || null;
      }
    }

    // State
    const mainAddressBlock = extractBlock(entity, 'mainBusinessPhysicalAddress');
    const state = mainAddressBlock ? extractTag(mainAddressBlock, 'stateCode') : null;

    return NextResponse.json({
      found:      true,
      active,
      statusCode,
      name:       name || null,
      entityType: entityType || null,
      state:      state || null,
    });

  } catch (err) {
    console.error('[abn-lookup]', err.message);
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  }
}
