// Signs in via the /fundraise login screen using email + password.
// Waits until the dashboard ("New campaign" button) is visible.
export async function signInAsFundraiser(page, email, password) {
  await page.goto('/fundraise');
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button:has-text("Sign in")');
  // Dashboard renders when "New campaign" is available
  await page.waitForSelector('text=New campaign', { timeout: 20000 });
}
