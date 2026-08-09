import { expect, test } from "@playwright/test";

test.describe("Mobile layout", () => {
  test("public shell provides mobile Log navigation without page overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    await expect(page.getByRole("navigation", { name: "Mobile primary" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    await expect(page.getByRole("link", { name: "Log" })).toHaveAttribute("href", "/dashboard#quick-log");
  });
});
