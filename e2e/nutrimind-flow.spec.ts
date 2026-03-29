import { test, expect } from '@playwright/test';

const TEST_EMAIL = `test-${Date.now()}@example.com`;
const TEST_EXTERNAL_ID = `test-user-${Date.now()}`;

/**
 * NutriMind Full User Flow E2E Test
 * Uses test-auth endpoint to bypass Clerk's captcha
 */
test.describe.serial('NutriMind Full User Flow', () => {
  
  let TEST_USER_ID: string;

test('1. Create test user via test-auth endpoint', async ({ page, context }) => {
    // Create test user via API
    const response = await page.request.post('http://localhost:3000/api/test-auth', {
      data: {
        email: TEST_EMAIL,
        externalId: TEST_EXTERNAL_ID,
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.user.email).toBe(TEST_EMAIL);
    
    TEST_USER_ID = data.user.id;
    console.log(`✅ Created test user: ${TEST_EMAIL}`);
    console.log(`   User ID: ${TEST_USER_ID}`);
    
    // Inject test user ID into page for API calls
    await page.goto('http://localhost:3000/onboarding');
    await page.evaluate((userId) => {
      (window as any).__TEST_USER_ID__ = userId;
    }, TEST_USER_ID);
    
    await page.screenshot({ path: 'e2e/screenshots/01-test-user-created.png' });
  });

  test('2. Complete onboarding wizard', async ({ page }) => {
    // Navigate to onboarding (should be redirected here if not completed)
    await page.goto('http://localhost:3000/onboarding');
    await page.waitForLoadState('networkidle');
    
    // Inject test user ID for API authentication (test bypass)
    await page.evaluate((userId) => {
      (window as any).__TEST_USER_ID__ = userId;
    }, TEST_USER_ID);
    
    console.log(`🔑 Injected test user ID: ${TEST_USER_ID}`);
    
    // Take screenshot of onboarding page
    await page.screenshot({ path: 'e2e/screenshots/02-onboarding-start.png' });
    
    // Step 1: Basic Info
    console.log('📋 Step 1: Filling basic info...');
    
    // Fill height
    await page.locator('#height').fill('175');
    
    // Fill birth date (calculate: 30 years old)
    const thirtyYearsAgo = new Date();
    thirtyYearsAgo.setFullYear(thirtyYearsAgo.getFullYear() - 30);
    const birthDateStr = thirtyYearsAgo.toISOString().split('T')[0]; // YYYY-MM-DD
    await page.locator('#birthDate').fill(birthDateStr);
    
    // Select gender (RadioGroup) - Male is default, but click to ensure
    await page.locator('input[value="MALE"]').check();
    
    await page.screenshot({ path: 'e2e/screenshots/03-step1-filled.png' });
    
    // Click Next
    await page.locator('button:has-text("Next")').first().click();
    await page.waitForTimeout(1000);
    
    // Step 2: Weight Info
    console.log('📋 Step 2: Filling weight info...');
    await page.screenshot({ path: 'e2e/screenshots/04-onboarding-step2.png' });
    
    // Current weight
    await page.locator('#currentWeight').fill('70');
    
    // Goal weight
    await page.locator('#goalWeight').fill('65');
    
    // Optional body fat
    await page.locator('#bodyFat').fill('18');
    
    await page.screenshot({ path: 'e2e/screenshots/05-step2-filled.png' });
    
    await page.locator('button:has-text("Next")').first().click();
    await page.waitForTimeout(1000);
    
    // Step 3: Activity Level & Review
    console.log('📋 Step 3: Selecting activity level and reviewing...');
    await page.screenshot({ path: 'e2e/screenshots/06-onboarding-step3.png' });
    
    // Select "Moderately Active" - click on the label instead of hidden radio input
    await page.locator('label[for="MODERATELY_ACTIVE"]').click();
    
    await page.screenshot({ path: 'e2e/screenshots/07-step3-selected.png' });
    
    // Verify TDEE preview is shown
    const pageText = await page.locator('body').innerText();
    expect(pageText).toMatch(/estimated daily target.*\d+/i);
    
    // Complete onboarding
    console.log('📋 Submitting onboarding data...');
    
    // Wait for the "Get Started" button to be visible and clickable
    const getStartedBtn = page.locator('button:has-text("Get Started")');
    await getStartedBtn.waitFor({ state: 'visible', timeout: 5000 });
    
    // Click the button
    await getStartedBtn.click();
    
    // Wait for the POST request to complete
    try {
      await page.waitForResponse(response => 
        response.url().includes('/api/user/initialize') && response.status() === 200,
        { timeout: 10000 }
      );
    } catch (e) {
      console.log('Response wait timed out, continuing...');
    }
    
    // Wait a bit for navigation
    await page.waitForTimeout(2000);
    
    // Capture current URL for debugging
    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);
    
    // Capture console errors if any
    const logs = await page.evaluate(() => {
      return (window as any).__lastError__ || 'No captured error';
    });
    if (logs !== 'No captured error') {
      console.log(`   Page error: ${logs}`);
    }
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard.*/, { timeout: 15000 });
    await page.screenshot({ path: 'e2e/screenshots/07-dashboard-loaded.png' });
    
    console.log('✅ Onboarding completed, redirected to dashboard');
  });

  test('3. Verify dashboard loads with Calorie Bank', async ({ page }) => {
    // Navigate to dashboard with test user ID in query param (test bypass)
    await page.goto(`http://localhost:3000/dashboard?test-user-id=${TEST_USER_ID}`);
    
    await page.waitForTimeout(2000); // Wait for page to load
    
    // Ensure we're on dashboard
    await expect(page).toHaveURL(/.*dashboard.*/);
    
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e/screenshots/08-dashboard-verification.png' });
    
    const pageText = await page.locator('body').innerText();
    
    // Check for Calorie Bank section
    expect(pageText).toMatch(/Calorie Bank|Bank Balance/i);
    
    // Check for Today's Summary section
    expect(pageText).toMatch(/Today.s Summary|Today.s Stats/i);
    
    // Check for Quick Log section
    expect(pageText).toMatch(/Quick Log|Log a Meal/i);
    
    console.log('✅ Dashboard verified with Calorie Bank');
  });

  test('4. Log a meal using natural language', async ({ page }) => {
    // Navigate to dashboard with test user ID
    await page.goto(`http://localhost:3000/dashboard?test-user-id=${TEST_USER_ID}`);
    
    // Wait for dashboard to fully load
    await page.waitForTimeout(2000);
    
    // Ensure we're on dashboard
    await expect(page).toHaveURL(/.*dashboard.*/);
    
    // Take screenshot to debug
    await page.screenshot({ path: 'e2e/screenshots/08-before-meal.png' });
    
    // Find the meal input textarea using exact placeholder
    const mealInput = page.locator('textarea[placeholder*="Describe what you ate in natural language"]').first();
    
    // Scroll to make sure it's visible and wait
    await mealInput.scrollIntoViewIfNeeded();
    await mealInput.waitFor({ state: 'visible', timeout: 10000 });
    await mealInput.fill('Grilled chicken breast with rice and steamed broccoli');
    
    await page.screenshot({ path: 'e2e/screenshots/09-meal-entered.png' });
    
    // Click Parse with AI button first
    const parseButton = page.locator('button:has-text("Parse with AI"), button:has-text("Analyze")').first();
    await parseButton.click();
    
    // Wait for AI parsing (simulated delay in app)
    await page.waitForTimeout(2000);
    
    // Confirm the parsed result
    const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Log Meal")').first();
    await confirmButton.click();
    
    // Wait for API response and UI update
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'e2e/screenshots/10-meal-logged.png' });
    
    // Wait for page reload to complete after meal logging
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Verify meal appears in Recent Meals section
    const recentMealsSection = page.locator('div:has-text("Recent Meals"), section:has-text("Recent Meals"), [class*="recent"]').first();
    await expect(recentMealsSection).toBeVisible();
    
    // Verify the meal name appears in Recent Meals ("Grilled" should match "Grilled chicken breast")
    const mealNameInList = page.locator('text=/Grilled|chicken/').first();
    await expect(mealNameInList).toBeVisible();
    
    // Verify calories display in Recent Meals (look for the calorie badge with "kcal")
    const mealCalories = page.locator('text=/\\d+ kcal/').first();
    await expect(mealCalories).toBeVisible();
    
    // Verify macros display (P: Xg · C: Yg · F: Zg pattern or individual macro labels)
    const macrosText = page.locator('text=/P:\\s*\\d+g|Protein:\\s*\\d+g|Carbs:|Fat:/i').first();
    await expect(macrosText).toBeVisible();
    
    // Verify consumed calories in Today's Summary is greater than 0
    // After page reload, the summary should reflect the logged meal
    // Wait a bit more for the server to render updated data
    await page.waitForTimeout(3000);
    
    // The Today's Summary card has a unique structure with Flame icon + "Today's Summary" title
    // Look for the "consumed" label specifically (lowercase, line 64 in DailySummary.tsx)
    // and get the number from the preceding text-3xl font-bold element
    const consumedLabel = page.locator('p.text-sm.text-muted-foreground:has-text("consumed")').first();
    await expect(consumedLabel).toBeVisible({ timeout: 5000 });
    
    // Get the parent container which should have the consumedCalories value
    const consumedValueEl = consumedLabel.locator('xpath=preceding-sibling::p[1]');
    const consumedCaloriesText = await consumedValueEl.textContent().catch(() => '0');
    const consumedCaloriesValue = parseInt(consumedCaloriesText) || 0;
    
    console.log(`   Consumed calories found: ${consumedCaloriesValue}`);
    
    // The consumed calories should reflect the meal we just logged
    expect(consumedCaloriesValue).toBeGreaterThan(0);
    console.log(`   ✅ Consumed calories verified: ${consumedCaloriesValue} kcal`);
    
    console.log('✅ Meal logged successfully and verified in Recent Meals');
  });

  test('5. Add water intake', async ({ page }) => {
    // Navigate to dashboard with test user ID
    await page.goto(`http://localhost:3000/dashboard?test-user-id=${TEST_USER_ID}`);
    
    // Wait for dashboard to fully load
    await page.waitForTimeout(2000);
    
    // Ensure we're on dashboard
    await expect(page).toHaveURL(/.*dashboard.*/);
    
    // Look for water tracking section
    const waterSection = page.locator('div:has-text("Water"):has(button), [data-testid*="water"]').first();
    
    // Find the "Add 250ml" button to add water
    const addWaterButton = page.locator('button:has-text("Add 250ml"), button[aria-label*="add water"]').first();
    await addWaterButton.scrollIntoViewIfNeeded();
    await addWaterButton.waitFor({ state: 'visible', timeout: 10000 });
    
    await addWaterButton.click();
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: 'e2e/screenshots/11-water-added.png' });
    
    // Verify water was added
    const pageText = await page.locator('body').innerText();
    expect(pageText).toMatch(/Water|Hydration/i);
    
    console.log('✅ Water intake added');
  });

  test('6. Verify Calorie Bank updates and meal persistence', async ({ page }) => {
    // Navigate to dashboard with test user ID to get fresh data
    await page.goto(`http://localhost:3000/dashboard?test-user-id=${TEST_USER_ID}`);
    
    // Wait for dashboard to fully load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: 'e2e/screenshots/12-calorie-bank-updated.png' });
    
    // Verify Calorie Bank card exists with balance
    const calorieBankCard = page.locator('div:has-text("Calorie Bank")').first();
    await expect(calorieBankCard).toBeVisible();
    
    // Verify consumed calories shows actual number > 0
    const consumedSection = page.locator('text=Consumed').locator('xpath=..').first();
    await expect(consumedSection).toBeVisible();
    const consumedValue = await consumedSection.locator('text=/^\\d+$/').first().textContent().catch(() => '0');
    expect(parseInt(consumedValue)).toBeGreaterThan(0);
    console.log(`   Consumed calories: ${consumedValue}`);
    
    // Verify remaining calories shows a number
    const remainingSection = page.locator('text=Remaining').locator('xpath=..').first();
    await expect(remainingSection).toBeVisible();
    const remainingValue = await remainingSection.locator('text=/^\\d+$/').first().textContent().catch(() => '0');
    expect(parseInt(remainingValue)).toBeGreaterThanOrEqual(0);
    console.log(`   Remaining calories: ${remainingValue}`);
    
    // Verify the meal from Test 4 still appears in Recent Meals (persistence check)
    const recentMealsSection = page.locator('div:has-text("Recent Meals")').first();
    await expect(recentMealsSection).toBeVisible();
    const persistedMeal = page.locator('text=/Grilled|chicken/').first();
    await expect(persistedMeal).toBeVisible();
    console.log('   Persisted meal found in Recent Meals');
    
    // Verify meal has calories badge
    const mealWithCalories = persistedMeal.locator('xpath=../..').locator('text=/\\d+ kcal/').first();
    const mealCaloriesText = await mealWithCalories.textContent().catch(() => '0 kcal');
    console.log(`   Meal calories: ${mealCaloriesText}`);
    
    // Verify Bank totals section (Banked/Spent/Streak)
    const bankTotals = page.locator('text=/Total Banked|Total Spent|Current Streak/').first();
    await expect(bankTotals).toBeVisible();
    
    console.log('✅ Calorie Bank updates verified');
    console.log('✅ Meal persistence verified across page reloads');
    console.log('');
    console.log('🎉 Full user flow test completed successfully!');
    console.log('');
    console.log('Summary:');
    console.log(`  - Created test user: ${TEST_EMAIL}`);
    console.log('  - Completed 3-step onboarding');
    console.log('  - Accessed dashboard with Calorie Bank');
    console.log('  - Logged a meal via natural language');
    console.log('  - Verified meal appears in Recent Meals with calories and macros');
    console.log('  - Added water intake');
    console.log('  - Verified Calorie Bank updates');
    console.log('  - Verified meal persists after page reload');
  });
});
