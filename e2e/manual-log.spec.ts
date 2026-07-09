import { test, expect } from '@playwright/test';

const TEST_EMAIL = `manual-log-${Date.now()}@example.com`;
const TEST_EXTERNAL_ID = `manual-log-${Date.now()}`;

/**
 * Manual meal-logging regression spec.
 *
 * Covers the two manual-entry surfaces exercised in the manual-logging
 * battle plan (wargames/manual-logging-and-design-craft-battle-plan.md):
 *   1. Dashboard Quick Log — AI/Manual toggle → manual form → submit.
 *   2. Meals page — Edit Meal dialog → Save Changes.
 *
 * Uses test-auth to bypass Clerk, matching nutrimind-flow.spec.ts's pattern.
 */
test.describe.serial('Manual meal logging', () => {
  let TEST_USER_ID: string;

  test('1. Create test user and initialize profile', async ({ page }) => {
    const response = await page.request.post('http://localhost:3000/api/test-auth', {
      data: {
        email: TEST_EMAIL,
        externalId: TEST_EXTERNAL_ID,
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    TEST_USER_ID = data.user.id;

    const initResponse = await page.request.post('http://localhost:3000/api/user/initialize', {
      headers: { 'X-Test-User-Id': TEST_USER_ID },
      data: {},
    });
    expect(initResponse.ok()).toBeTruthy();
  });

  test('2. Dashboard Quick Log: Manual toggle logs a meal', async ({ page }) => {
    await page.goto(`http://localhost:3000/dashboard?test-user-id=${TEST_USER_ID}`);
    await page.waitForLoadState('networkidle');

    // Switch Quick Log from AI to Manual mode.
    await page.locator('button', { hasText: 'Manual' }).first().click();

    const nameInput = page.getByPlaceholder('e.g. Chicken rice bowl');
    await nameInput.waitFor({ state: 'visible', timeout: 5000 });
    await nameInput.fill('Repro bowl');

    const caloriesInput = page.getByRole('spinbutton', { name: /Calories/ });
    await caloriesInput.fill('350');

    const submitButton = page.getByRole('button', { name: 'Log meal' });
    await expect(submitButton).toBeEnabled();

    const [response] = await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes('/api/meals') && res.request().method() === 'POST'
      ),
      submitButton.click(),
    ]);

    expect(response.status()).toBe(200);

    await expect(page.getByText('Repro bowl')).toBeVisible({ timeout: 10000 });
    const pageText = await page.locator('body').innerText();
    expect(pageText).toContain('Repro bowl');
    expect(pageText).toMatch(/350 (?:cal|kcal)/);
  });

  test('3. Meals page: Edit Meal dialog saves without 401', async ({ page }) => {
    await page.goto(`http://localhost:3000/meals?test-user-id=${TEST_USER_ID}`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Repro bowl')).toBeVisible();

    await page.getByRole('button', { name: /^Edit /, exact: false }).first().click();

    const dialog = page.getByRole('dialog', { name: 'Edit meal entry' });
    await expect(dialog).toBeVisible();

    const caloriesField = dialog.getByRole('spinbutton', { name: 'Calories' });
    await caloriesField.fill('400');

    const saveButton = dialog.getByRole('button', { name: 'Post amendment' });

    const [response] = await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes('/api/meals/') && res.request().method() === 'PUT'
      ),
      saveButton.click(),
    ]);

    expect(response.status()).toBe(200);
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // The activity ledger refreshes after the amendment response. Auto-wait for
    // the refreshed statement instead of sampling while its skeleton is visible.
    await expect(page.locator('body')).toContainText(/400 (?:cal|kcal)/, { timeout: 10000 });
  });

  test('4. Merged planning, achievement, voice, and account-control surfaces render', async ({ page }) => {
    await page.goto(`http://localhost:3000/dashboard?test-user-id=${TEST_USER_ID}`);
    await expect(page.getByRole('button', { name: 'Enter meal description by voice' })).toBeVisible();

    await page.getByRole('tab', { name: 'Planning' }).click();
    await expect(page.getByText('Recipe Builder', { exact: true })).toBeVisible();
    await expect(page.getByText('Grocery List', { exact: true })).toBeVisible();

    await page.getByRole('tab', { name: 'Body' }).click();
    await expect(page.getByText('Achievements', { exact: true })).toBeVisible();

    await page.setExtraHTTPHeaders({ 'X-Test-User-Id': TEST_USER_ID });
    await page.goto('http://localhost:3000/settings');
    await expect(page.getByText('Daily account digest', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Health integrations', exact: true })).toBeVisible();
    await expect(page.getByText('Health Platform Integrations', { exact: true })).toBeVisible();
  });
});
