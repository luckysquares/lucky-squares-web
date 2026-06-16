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
  } catch (err) {
    return NextResponse.json({ error: 'Import failed', detail: String(err) }, { status: 500 });
  }

  let browser;
  try {
    chromium.setHeadlessMode = true;
    chromium.setGraphicsMode = false;

    browser = await puppeteer.launch({
      args:            chromium.args,
      defaultViewport: { width: 1280, height: 900 },
      executablePath:  await chromium.executablePath(),
      headless:        true,
    });

    const page = await browser.newPage();
    await page.emulateMediaType('print');
    await page.goto(pageUrl, { waitUntil: 'networkidle0', timeout: 30000 });

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
  } catch (err) {
    console.error('[hockey-sa-pdf]', err);
    return NextResponse.json({ error: 'PDF generation failed', detail: String(err) }, { status: 500 });
  } finally {
    if (browser) await browser.close();
  }
}
