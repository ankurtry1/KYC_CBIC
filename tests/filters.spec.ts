import { expect, test } from "@playwright/test";

test.describe("Directory filters and sorting", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/officers");
    await expect(page.getByTestId("officer-card").first()).toBeVisible();
    await page.getByTestId("directory-toggle-filters").click();
    await expect(page.getByTestId("directory-filters")).toBeVisible();
  });

  test("cadre filter changes results", async ({ page }) => {
    const cards = page.getByTestId("officer-card");
    const before = await cards.count();

    await page.getByTestId("filter-cadre").selectOption("DR");

    await expect.poll(async () => cards.count()).toBeGreaterThan(0);
    const after = await cards.count();

    expect(after).toBeLessThanOrEqual(before);
    await expect(cards.first()).toHaveAttribute("data-cadre", "DR");
  });

  test("sorting controls change ordering", async ({ page }) => {
    await page.getByTestId("filter-sort-by").selectOption("employee_id");
    await page.getByTestId("filter-sort-order").selectOption("asc");

    const firstAsc = await page.getByTestId("officer-card").first().getAttribute("data-employee-id");
    expect(firstAsc).toBeTruthy();

    await page.getByTestId("filter-sort-order").selectOption("desc");

    await expect
      .poll(async () => page.getByTestId("officer-card").first().getAttribute("data-employee-id"))
      .not.toBe(firstAsc);
  });

  test("timeline quality filter works", async ({ page }) => {
    await page.getByTestId("filter-timeline-quality").selectOption("full");

    const cards = page.getByTestId("officer-card");
    await expect.poll(async () => cards.count()).toBeGreaterThan(0);
    await expect(cards.first()).toHaveAttribute("data-timeline-quality", "full");
  });
});
