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

test.describe("Homepage SSR metrics", () => {
  test.use({ javaScriptEnabled: false });

  test("metrics remain non-zero without client hydration", async ({ page }) => {
    await page.goto("/");

    const expectedMetrics = [
      "metric-total-officers",
      "metric-timeline-rich",
      "metric-cadres-covered",
      "metric-designation-spread"
    ];

    for (const metricId of expectedMetrics) {
      const metric = page.getByTestId(metricId);
      await expect(metric).toBeVisible();

      const text = (await metric.innerText()).replace(/,/g, "");
      const values = text.match(/\d+/g) ?? [];
      expect(Number(values[0] ?? "0")).toBeGreaterThan(0);
    }
  });
});
