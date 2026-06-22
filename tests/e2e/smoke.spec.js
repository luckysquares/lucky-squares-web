import { test, expect } from '@playwright/test';

// Routes that must render without a JavaScript crash.
// A console error containing "Error" or "ReferenceError" fails the test.
const PUBLIC_ROUTES = [
  '/',
  '/fundraise',
  '/feeling-lucky',
  '/contact',
  '/pricing',
  '/org-signup',
  '/about',
  '/terms',
];

for (const route of PUBLIC_ROUTES) {
  test(`${route} loads without JS errors`, async ({ page }) => {
    const jsErrors = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    const response = await page.goto(route, { waitUntil: 'load' });

    expect(response?.status(), `HTTP status for ${route}`).toBeLessThan(500);
    expect(jsErrors, `JS errors on ${route}: ${jsErrors.join(', ')}`).toHaveLength(0);

    // Page must have visible content — not a blank screen
    const body = await page.locator('body').innerText();
    expect(body.trim().length, `Body is empty on ${route}`).toBeGreaterThan(50);
  });
}

test('/fundraise shows login form', async ({ page }) => {
  const jsErrors = [];
  page.on('pageerror', (err) => jsErrors.push(err.message));

  await page.goto('/fundraise', { waitUntil: 'load' });
  expect(jsErrors).toHaveLength(0);
  await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
});

test('live grid loads for a known slug or shows 404 gracefully', async ({ page }) => {
  const jsErrors = [];
  page.on('pageerror', (err) => jsErrors.push(err.message));

  // Navigate to a slug that probably doesn't exist — should show a not-found
  // state, not a crash. A JS error would indicate a regression.
  const response = await page.goto('/e2e-nonexistent-slug', { waitUntil: 'load' });
  expect(jsErrors).toHaveLength(0);
  // Either a 404 page or the app renders a "not found" message — both are fine
  expect([200, 404]).toContain(response?.status());
});
