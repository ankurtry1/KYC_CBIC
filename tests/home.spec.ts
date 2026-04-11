import { expect, test } from "@playwright/test";

test.describe("Homepage", () => {
  test("homepage loads with key sections", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/CBIC Officer Universe/i);
    await expect(page.getByTestId("app-nav")).toBeVisible();
    await expect(page.getByTestId("home-hero")).toBeVisible();
    await expect(page.getByTestId("home-search-input")).toBeVisible();
    await expect(page.getByTestId("home-metrics-grid")).toBeVisible();

    const metricCards = page.locator(
      '[data-testid="metric-total-officers"], [data-testid="metric-timeline-rich"], [data-testid="metric-cadres-covered"], [data-testid="metric-designation-spread"]'
    );
    await expect(metricCards).toHaveCount(4);
  });
});
