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
    const query = getSearchableNameToken();
    const countLabel = page.getByTestId("directory-results-count");
    const beforeText = await countLabel.innerText();
    const beforeCount = Number((beforeText.match(/\d[\d,]*/)?.[0] ?? "0").replace(/,/g, ""));

    await page.getByTestId("directory-search-input").fill(query);

    await expect.poll(async () => page.getByTestId("officer-card").count()).toBeGreaterThan(0);
    const filteredName = (
      await page.getByTestId("officer-card").first().getByTestId("officer-card-name").innerText()
    ).toLowerCase();

    expect(filteredName).toContain(query.toLowerCase());

    await expect
      .poll(async () => {
        const text = await countLabel.innerText();
        return Number((text.match(/\d[\d,]*/)?.[0] ?? "0").replace(/,/g, ""));
      })
      .toBeLessThanOrEqual(beforeCount);
  });

  test("searching by employee ID returns matching officer", async ({ page }) => {
    const firstCard = page.getByTestId("officer-card").first();
    const employeeId = await firstCard.getAttribute("data-employee-id");

    expect(employeeId).toBeTruthy();

    await page.getByTestId("directory-search-input").fill(employeeId!);

    const exactCard = page.locator(
      `[data-testid="officer-card"][data-employee-id="${employeeId}"]`
    );

    await expect.poll(async () => exactCard.count()).toBeGreaterThan(0);
  });

  test("empty state appears when no results match", async ({ page }) => {
    await page.getByTestId("directory-search-input").fill("ZZZ_NON_EXISTENT_OFFICER_123456789");

    await expect(page.getByTestId("directory-empty-state")).toBeVisible();
    await expect(page.getByTestId("officer-card")).toHaveCount(0);
  });

  test("full officer card click opens profile", async ({ page }) => {
    const firstCard = page.getByTestId("officer-card").first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();

    await expect(page).toHaveURL(/\/officers\/.+/);
    await expect(page.getByTestId("officer-header")).toBeVisible();
  });
});
