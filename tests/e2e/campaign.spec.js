import { test, expect } from '@playwright/test';
import {
  setupOrgOwner, setupTestCoupon, teardown,
  TEST_EMAIL_OWNER, TEST_PASSWORD, TEST_ORG_NAME, TEST_COUPON,
} from '../helpers/supabase.js';
import { signInAsFundraiser } from '../helpers/auth.js';

test.describe('Campaign creation and management', () => {
  let createdSlug = null;

  test.beforeAll(async () => {
    await setupOrgOwner();
    await setupTestCoupon();
  });

  test.afterAll(async () => {
    await teardown();
  });

  test('org owner can log in and reach the dashboard', async ({ page }) => {
    const jsErrors = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await signInAsFundraiser(page, TEST_EMAIL_OWNER, TEST_PASSWORD);

    expect(jsErrors).toHaveLength(0);
    await expect(page.locator('text=New campaign')).toBeVisible();
  });

  test('wizard opens and step 0 (Who) renders', async ({ page }) => {
    await signInAsFundraiser(page, TEST_EMAIL_OWNER, TEST_PASSWORD);
    await page.click('text=New campaign');
    await expect(page.locator("text=Who's running this fundraiser?")).toBeVisible({ timeout: 10000 });
  });

  test('full campaign wizard: org campaign to launch', async ({ page }) => {
    const jsErrors = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await signInAsFundraiser(page, TEST_EMAIL_OWNER, TEST_PASSWORD);
    await page.click('text=New campaign');

    // ── Step 0: Who ────────────────────────────────────────────────────────
    await expect(page.locator("text=Who's running this fundraiser?")).toBeVisible({ timeout: 10000 });
    await page.click('text=An organisation');
    // Org name field appears — fill it
    await page.fill('input[placeholder="e.g. Sunbury Primary P&C"]', TEST_ORG_NAME);
    await page.click('button:has-text("Next")');

    // ── Step 1: Grid size ──────────────────────────────────────────────────
    await expect(page.locator('text=Choose grid size')).toBeVisible({ timeout: 10000 });
    // Select 25-square grid (smallest — fastest to fill in tests)
    await page.click('text=25');
    await page.click('button:has-text("Next")');

    // ── Step 2: Pricing ────────────────────────────────────────────────────
    await expect(page.locator('text=Set your price')).toBeVisible({ timeout: 10000 });
    const priceInput = page.locator('input[type="number"]').first();
    await priceInput.fill('5');
    await page.click('button:has-text("Next")');

    // ── Step 3: Prizes ─────────────────────────────────────────────────────
    await expect(page.locator('text=Set your prizes')).toBeVisible({ timeout: 10000 });
    // Fill in the auto-created 1st prize fields
    const descInputs  = page.locator('input[placeholder="e.g. $150 cash"]');
    const valueInputs = page.locator('input[placeholder="$150"]');
    await descInputs.fill('E2E Test Prize — $100 cash');
    await valueInputs.fill('$100');
    await page.click('button:has-text("Next")');

    // ── Step 4: Campaign details ───────────────────────────────────────────
    await expect(page.locator('text=Your campaign')).toBeVisible({ timeout: 10000 });
    await page.fill('input[placeholder="e.g. Help our under 18s get to regionals"]', 'E2E Test Campaign — please ignore');
    // Contact name, email, phone
    const inputs = page.locator('.form-input');
    // Find contact name input by placeholder
    await page.fill('input[placeholder="e.g. Jamie Smith"]', 'E2E Tester');
    await page.fill('input[placeholder="e.g. jamie@club.org.au"]', TEST_EMAIL_OWNER);
    await page.fill('input[placeholder="e.g. 0412 345 678"]', '0400000000');
    await page.click('button:has-text("Next")');

    // ── Step 5: Draw rules ─────────────────────────────────────────────────
    await expect(page.locator('text=Draw rules')).toBeVisible({ timeout: 10000 });
    await page.click('button:has-text("Next")');

    // ── Step 6: Payment method ─────────────────────────────────────────────
    await expect(page.locator('text=Payment')).toBeVisible({ timeout: 10000 });
    // Choose bank transfer to avoid Stripe bank-connect step
    await page.click('text=Bank transfer');
    await page.click('button:has-text("Next")');

    // ── Step 7: Review ─────────────────────────────────────────────────────
    await expect(page.locator('text=Launch your fundraiser').or(page.locator('text=Review'))).toBeVisible({ timeout: 10000 });
    // Apply 100% test coupon
    const couponInput = page.locator('input[placeholder*="oupon"], input[placeholder*="code"]').first();
    await couponInput.fill(TEST_COUPON);
    await page.click('button:has-text("Apply")');
    await expect(page.locator('text=Free').or(page.locator('text=🎉'))).toBeVisible({ timeout: 8000 });

    // Launch
    await page.click('button:has-text("Launch free")');

    // ── Post-launch: dashboard shows the new campaign as active ───────────
    await expect(page.locator('text=New campaign')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('text=E2E Test Campaign').first()).toBeVisible({ timeout: 10000 });

    // Capture slug for live-grid verification
    const campaignLink = page.locator('a[href*="/"]').filter({ hasText: 'E2E Test Campaign' }).first();
    const href = await campaignLink.getAttribute('href').catch(() => null);
    if (href) createdSlug = href.replace(/^\//, '');

    expect(jsErrors).toHaveLength(0);
  });

  test('launched campaign is publicly accessible via live grid', async ({ page }) => {
    test.skip(!createdSlug, 'No slug captured from previous test');

    const jsErrors = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await page.goto(`/${createdSlug}`, { waitUntil: 'networkidle' });
    expect(jsErrors).toHaveLength(0);
    await expect(page.locator('text=E2E Test Campaign')).toBeVisible({ timeout: 10000 });
    // Grid must be present
    await expect(page.locator('[data-testid="grid"], .grid-square, text=squares left').first()).toBeVisible({ timeout: 10000 });
  });

  test('org owner can edit campaign description', async ({ page }) => {
    await signInAsFundraiser(page, TEST_EMAIL_OWNER, TEST_PASSWORD);
    // Find the edit button next to the test campaign
    const row = page.locator('text=E2E Test Campaign').locator('..').locator('..');
    await row.locator('button:has-text("Edit"), button[aria-label*="edit"]').first().click();
    // Edit modal opens — update description
    const descField = page.locator('textarea, input').filter({ hasText: '' }).nth(1);
    await descField.fill('Updated by E2E test');
    await page.click('button:has-text("Save")');
    await expect(page.locator('text=Updated by E2E test').or(page.locator('text=Saved'))).toBeVisible({ timeout: 8000 });
  });
});
