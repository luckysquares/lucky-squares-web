import { test, expect } from '@playwright/test';
import {
  setupOrgOwner, setupContributor, setupTestCoupon, teardown,
  getInviteToken,
  TEST_EMAIL_OWNER, TEST_EMAIL_CONTRIB, TEST_PASSWORD,
} from '../helpers/supabase.js';
import { signInAsFundraiser } from '../helpers/auth.js';

test.describe('Contributor invite and campaign access', () => {
  test.beforeAll(async () => {
    await setupOrgOwner();
    await setupContributor();
    await setupTestCoupon();
  });

  test.afterAll(async () => {
    await teardown();
  });

  test('org owner can send a contributor invite', async ({ page }) => {
    const jsErrors = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await signInAsFundraiser(page, TEST_EMAIL_OWNER, TEST_PASSWORD);

    // Navigate to team members page
    await page.goto('/org/members', { waitUntil: 'networkidle' });
    await expect(page.locator('text=Team members').or(page.locator('text=Members'))).toBeVisible({ timeout: 10000 });

    // Fill invite email and send
    await page.fill('input[type="email"], input[placeholder*="email"]', TEST_EMAIL_CONTRIB);
    await page.click('button:has-text("Send invite"), button:has-text("Invite")');

    // Invite should appear in pending list
    await expect(page.locator(`text=${TEST_EMAIL_CONTRIB}`)).toBeVisible({ timeout: 8000 });
    expect(jsErrors).toHaveLength(0);
  });

  test('contributor can accept invite and reach fundraise dashboard', async ({ page }) => {
    const jsErrors = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    // Get token from DB without touching email
    const token = await getInviteToken(TEST_EMAIL_CONTRIB);
    expect(token, 'Invite token should exist in DB').toBeTruthy();

    // Sign in as contributor first so the invite auto-accepts on page load
    await signInAsFundraiser(page, TEST_EMAIL_CONTRIB, TEST_PASSWORD);

    // Navigate to invite acceptance URL
    await page.goto(`/invite/${token}`, { waitUntil: 'networkidle' });

    // Should auto-accept (email matches logged-in user) and reach set-password or done phase
    await expect(
      page.locator('text=accepted').or(page.locator('text=You\'re in')).or(page.locator('text=done'))
    ).toBeVisible({ timeout: 15000 });

    expect(jsErrors).toHaveLength(0);
  });

  test('accepted contributor sees org dashboard on /fundraise', async ({ page }) => {
    const jsErrors = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await signInAsFundraiser(page, TEST_EMAIL_CONTRIB, TEST_PASSWORD);

    // Contributor should see "New campaign" — the org dashboard, not a plain individual dashboard
    await expect(page.locator('text=New campaign')).toBeVisible({ timeout: 15000 });
    // Contributor badge or org name should appear
    await expect(
      page.locator('text=Contributor').or(page.locator('text=contributor'))
    ).toBeVisible({ timeout: 10000 });

    expect(jsErrors).toHaveLength(0);
  });

  test('contributor can start the campaign wizard', async ({ page }) => {
    const jsErrors = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await signInAsFundraiser(page, TEST_EMAIL_CONTRIB, TEST_PASSWORD);
    await page.click('text=New campaign');

    await expect(page.locator("text=Who's running this fundraiser?")).toBeVisible({ timeout: 10000 });
    expect(jsErrors).toHaveLength(0);
  });
});
