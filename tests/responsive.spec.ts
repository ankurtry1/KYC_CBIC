import { expect, test } from "@playwright/test";

test.describe("Responsive behavior (mobile)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("homepage remains usable on mobile", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("app-nav")).toBeVisible();
    await expect(page.getByTestId("home-search-input")).toBeVisible();
    await page.getByTestId("home-search-input").fill("Raj");
  });

  test("officers directory remains usable on mobile", async ({ page }) => {
    await page.goto("/officers");

    await expect(page.getByTestId("directory-search-input")).toBeVisible();
    await expect(page.getByTestId("directory-toggle-filters")).toBeVisible();
    await expect(page.getByTestId("officer-card").first()).toBeVisible();
  });

  test("officer profile remains usable on mobile", async ({ page }) => {
    await page.goto("/officers");
    await page.getByTestId("officer-card").first().click();

    await expect(page.getByTestId("officer-header")).toBeVisible();
    await expect(page.getByTestId("current-posting-card")).toBeVisible();

    const timeline = page.getByTestId("timeline-section");
    await timeline.scrollIntoViewIfNeeded();
    await expect(timeline).toBeVisible();
  });
});
