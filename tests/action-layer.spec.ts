import { expect, test } from "@playwright/test";

test.describe("Shortlist and compare", () => {
  test("users can shortlist officers and open compare", async ({ page }) => {
    await page.goto("/officers");
    await expect(page.getByTestId("officer-card").first()).toBeVisible();

    await page.locator('[data-testid^="shortlist-toggle-"]').nth(0).click();
    await page.locator('[data-testid^="shortlist-toggle-"]').nth(1).click();

    await page.getByTestId("nav-shortlist-toggle").click();
    await expect(page.getByTestId("shortlist-drawer")).toBeVisible();

    await page.getByRole("button", { name: /select for compare/i }).first().click();
    await page.getByRole("button", { name: /select for compare/i }).first().click();
    await page.getByRole("link", { name: /compare 2 officers/i }).click();

    await expect(page).toHaveURL(/\/compare\?ids=/);
    await expect(page.getByTestId("compare-page")).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();
  });
});
