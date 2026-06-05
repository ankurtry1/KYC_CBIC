import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

type SearchFixture = {
  token: string;
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
    employeeId: candidate.employee_id
  };
}

test.describe("Officers directory", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/officers");
    await expect(page.getByTestId("officers-directory")).toBeVisible();
  });

  test("directory loads and shows cards/search", async ({ page }) => {
    await expect(page.getByTestId("directory-search-input")).toBeVisible();
    await expect(page.getByTestId("directory-quick-filters")).toBeVisible();

    const cards = page.getByTestId("officer-card");
    await expect.poll(async () => cards.count()).toBeGreaterThan(0);
  });

  test("advanced filters are collapsible and hidden by default", async ({ page }) => {
    await expect(page.getByTestId("directory-filters")).toHaveCount(0);

    await page.getByTestId("directory-toggle-filters").click();
    await expect(page.getByTestId("directory-filters")).toBeVisible();

    await page.getByTestId("directory-toggle-filters").click();
    await expect(page.getByTestId("directory-filters")).toHaveCount(0);
  });

  test("searching by valid officer name filters results", async ({ page }) => {
    const { token: query } = getSearchFixture();
    const countLabel = page.getByTestId("directory-results-count");
    const beforeText = await countLabel.innerText();
    const beforeCount = Number((beforeText.match(/\d[\d,]*/)?.[0] ?? "0").replace(/,/g, ""));

    await page.getByTestId("directory-search-input").fill(query);
    await page.getByTestId("directory-search-submit").click();

    await expect.poll(async () => page.getByTestId("officer-card").count()).toBeGreaterThan(0);
    await expect(
      page.getByTestId("officer-card-name").filter({ hasText: new RegExp(query, "i") }).first()
    ).toBeVisible();

    await expect
      .poll(async () => {
        const text = await countLabel.innerText();
        return Number((text.match(/\d[\d,]*/)?.[0] ?? "0").replace(/,/g, ""));
      })
      .toBeLessThanOrEqual(beforeCount);
  });

  test("search submits on Enter key and button is visible", async ({ page }) => {
    const { token: query } = getSearchFixture();
    const input = page.getByTestId("directory-search-input");

    await expect(page.getByTestId("directory-search-submit")).toBeVisible();
    await input.fill(query);
    await input.press("Enter");

    await expect.poll(async () => page.getByTestId("officer-card").count()).toBeGreaterThan(0);
    await expect(page.getByTestId("officer-card").first().getByTestId("officer-card-name")).toContainText(
      new RegExp(query, "i")
    );
  });

  test("searching by employee ID returns matching officer", async ({ page }) => {
    const firstCard = page.getByTestId("officer-card").first();
    const employeeId = await firstCard.getAttribute("data-employee-id");

    expect(employeeId).toBeTruthy();

    await page.getByTestId("directory-search-input").fill(employeeId!);
    await page.getByTestId("directory-search-submit").click();

    const exactCard = page.locator(
      `[data-testid="officer-card"][data-employee-id="${employeeId}"]`
    );

    await expect.poll(async () => exactCard.count()).toBeGreaterThan(0);
    await expect(page.getByTestId("directory-best-match")).toContainText(employeeId!);
  });

  test("directory search shows autosuggestions and Enter can open the direct profile", async ({ page }) => {
    const fixture = getSearchFixture();
    const input = page.getByTestId("directory-search-input");

    await input.fill(fixture.token.slice(0, 3));
    await expect(page.getByTestId("directory-search-suggestions")).toBeVisible();
    await expect(page.getByTestId("directory-search-suggestions-item-0")).toBeVisible();

    await input.fill(fixture.employeeId);
    await expect(page.getByTestId("directory-search-suggestions")).toBeVisible();
    await input.press("Enter");

    await expect(page).toHaveURL(/\/officers\/.+/);
    await expect(page.getByTestId("officer-header")).toContainText(fixture.employeeId);
  });

  test("empty state appears when no results match", async ({ page }) => {
    await page.getByTestId("directory-search-input").fill("ZZZ_NON_EXISTENT_OFFICER_123456789");
    await page.getByTestId("directory-search-submit").click();

    await expect(page.getByTestId("directory-empty-state")).toBeVisible();
    await expect(page.getByTestId("officer-card")).toHaveCount(0);
  });

  test("results appear early in viewport with compact controls", async ({ page }) => {
    const firstCard = page.getByTestId("officer-card").first();
    await expect(firstCard).toBeVisible();
    await expect(firstCard).toBeInViewport();
  });

  test("quick filter chips refine results", async ({ page }) => {
    const countLabel = page.getByTestId("directory-results-count");
    const before = Number(((await countLabel.innerText()).match(/\d[\d,]*/)?.[0] ?? "0").replace(/,/g, ""));

    await page.getByTestId("quick-filter-timeline-full").click();

    await expect
      .poll(async () => {
        const text = await countLabel.innerText();
        return Number((text.match(/\d[\d,]*/)?.[0] ?? "0").replace(/,/g, ""));
      })
      .toBeLessThanOrEqual(before);
  });

  test("filters sync to URL and survive reload", async ({ page }) => {
    await page.getByTestId("directory-toggle-filters").click();
    await page.getByTestId("filter-cadre").selectOption("DR");
    await page.getByTestId("filter-sort-by").selectOption("employee_id");
    await page.getByTestId("filter-sort-order").selectOption("desc");

    await expect(page).toHaveURL(/cadre=DR/);
    await expect(page).toHaveURL(/sortBy=employee_id/);
    await expect(page).toHaveURL(/sortOrder=desc/);

    await page.reload();

    await expect(page.getByTestId("filter-cadre")).toHaveValue("DR");
    await expect(page.getByTestId("filter-sort-by")).toHaveValue("employee_id");
    await expect(page.getByTestId("filter-sort-order")).toHaveValue("desc");
  });

  test("directory context survives opening a profile and returning", async ({ page }) => {
    await page.getByTestId("directory-toggle-filters").click();
    await page.getByTestId("filter-cadre").selectOption("DR");

    await expect(page).toHaveURL(/cadre=DR/);
    await page.getByTestId("officer-card").first().click();

    await expect(page).toHaveURL(/\/officers\/.+\?from=%2Fofficers%3Fcadre%3DDR/);
    await page.getByRole("link", { name: /back to results/i }).click();

    await expect(page).toHaveURL(/\/officers\?cadre=DR/);
    await expect(page.getByTestId("officer-card").first()).toHaveAttribute("data-cadre", "DR");
  });

  test("full officer card click opens profile", async ({ page }) => {
    const firstCard = page.getByTestId("officer-card").first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();

    await expect(page).toHaveURL(/\/officers\/.+/);
    await expect(page.getByTestId("officer-header")).toBeVisible();
  });
});
