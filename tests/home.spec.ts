import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

type SearchFixture = {
  token: string;
  employeePrefix: string;
  employeeId: string;
};

function getSearchFixture(): SearchFixture {
  const indexPath = path.join(process.cwd(), "data", "officers-index.json");
  const payload = fs.readFileSync(indexPath, "utf8");
  const officers: Array<{ name: string | null; employee_id: string }> = JSON.parse(payload);

  const candidate =
    officers.find(
      (officer) =>
        officer.name &&
        !/^Officer\s+\d+$/i.test(officer.name) &&
        officer.name.trim().split(/\s+/).some((token) => token.length > 3)
    ) ?? { name: "Raj Kumar", employee_id: "3747" };

  const candidateName = candidate.name ?? "Raj Kumar";
  const token = candidateName
    .split(/\s+/)
    .find((part) => /^[A-Za-z]+$/.test(part) && part.length > 3);

  return {
    token: token ?? "Raj",
    employeePrefix: candidate.employee_id.slice(0, 3),
    employeeId: candidate.employee_id
  };
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
    const { token: query } = getSearchFixture();

    await page.goto("/");
    await page.getByTestId("home-search-input").fill(query);
    await page.getByTestId("home-search-input").press("Enter");

    await expect(page).toHaveURL(new RegExp(`/officers\\?q=${query}`, "i"));
    await expect(page.getByTestId("directory-search-input")).toHaveValue(query);
    await expect(page.getByTestId("officer-card").first()).toBeVisible();
  });

  test("homepage search shows autosuggestions for name and employee prefix", async ({ page }) => {
    const fixture = getSearchFixture();

    await page.goto("/");
    await page.getByTestId("home-search-input").fill(fixture.token.slice(0, 3));
    await expect(page.getByTestId("home-search-suggestions")).toBeVisible();
    await expect(page.getByTestId("home-search-suggestions-item-0")).toBeVisible();

    await page.getByTestId("home-search-input").fill(fixture.employeePrefix);
    await expect(page.getByTestId("home-search-suggestions")).toBeVisible();
    await expect(page.getByTestId("home-search-suggestions")).toContainText(fixture.employeePrefix);
  });

  test("homepage autosuggest supports keyboard selection and opens profile directly", async ({ page }) => {
    const fixture = getSearchFixture();

    await page.goto("/");
    await page.getByTestId("home-search-input").fill(fixture.token.slice(0, 3));
    await expect(page.getByTestId("home-search-suggestions")).toBeVisible();

    await page.getByTestId("home-search-input").press("ArrowDown");
    await page.getByTestId("home-search-input").press("Enter");

    await expect(page).toHaveURL(/\/officers\/.+/);
    await expect(page.getByTestId("officer-header")).toContainText(fixture.employeeId);
  });
});
