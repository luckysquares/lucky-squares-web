import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request) {
  const host  = request.headers.get('host') || 'localhost:3000';
  const proto = host.startsWith('localhost') ? 'http' : 'https';
  const pageUrl = `${proto}://${host}/promo/hockey-sa`;

  let chromium, puppeteer;
  try {
    chromium  = (await import('@sparticuz/chromium')).default;
    puppeteer = (await import('puppeteer-core')).default;
  } catch {
    return NextResponse.json({ error: 'PDF generation dependencies not available' }, { status: 500 });
  }

  const browser = await puppeteer.launch({
    args:            chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath:  await chromium.executablePath(),
    headless:        'new',
  });

  try {
    const page = await browser.newPage();

    // Hide the toolbar — same as @media print but for headless capture
    await page.emulateMediaType('print');
    await page.goto(pageUrl, { waitUntil: 'networkidle0', timeout: 30000 });

    // Wait for images to fully load
    await page.evaluate(() =>
      Promise.all(
        Array.from(document.images)
          .filter(img => !img.complete)
          .map(img => new Promise(resolve => { img.onload = img.onerror = resolve; }))
      )
    );

    const pdf = await page.pdf({
      format:          'A4',
      printBackground: true,
      margin:          { top: 0, right: 0, bottom: 0, left: 0 },
    });

    return new NextResponse(pdf, {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': 'attachment; filename="Hockey-SA-Lucky-Squares.pdf"',
      },
    });
  } finally {
    await browser.close();
  }
}
