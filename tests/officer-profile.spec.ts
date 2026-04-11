import { expect, test } from "@playwright/test";

test.describe("Officer profile page", () => {
  test("opens profile from directory and shows key sections", async ({ page }) => {
    await page.goto("/officers");

    const firstCard = page.getByTestId("officer-card").first();
    await expect(firstCard).toBeVisible();

    await firstCard.click();

    await expect(page).toHaveURL(/\/officers\/.+/);
    await expect(page.getByTestId("officer-header")).toBeVisible();
    await expect(page.getByTestId("current-posting-card")).toBeVisible();
    await expect(page.getByTestId("timeline-section")).toBeVisible();
    await expect(page.getByTestId("station-history-section")).toBeVisible();
    await expect(page.getByTestId("rank-progression-section")).toBeVisible();
    await expect(page.getByTestId("data-quality-panel")).toBeVisible();
  });
});
