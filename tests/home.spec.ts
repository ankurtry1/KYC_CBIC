import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

function getSearchableNameToken(): string {
  const indexPath = path.join(process.cwd(), "data", "officers-index.json");
  const payload = fs.readFileSync(indexPath, "utf8");
  const officers: Array<{ name: string | null }> = JSON.parse(payload);

  const candidate =
    officers.find(
      (officer) =>
        officer.name &&
        !/^Officer\s+\d+$/i.test(officer.name) &&
        officer.name.trim().split(/\s+/).some((token) => token.length > 3)
    )?.name ?? "Raj";

  const token = candidate
    .split(/\s+/)
    .find((part) => /^[A-Za-z]+$/.test(part) && part.length > 3);

  return token ?? "Raj";
}

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

test.describe("Homepage search", () => {
  test("homepage search routes into filtered directory results", async ({ page }) => {
    const query = getSearchableNameToken();

    await page.goto("/");
    await page.getByTestId("home-search-input").fill(query);
    await page.getByTestId("home-search-input").press("Enter");

    await expect(page).toHaveURL(new RegExp(`/officers\\?q=${query}`, "i"));
    await expect(page.getByTestId("directory-search-input")).toHaveValue(query);
    await expect(page.getByTestId("officer-card").first()).toBeVisible();
  });
});
