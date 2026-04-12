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
    await expect(page.getByTestId("officer-intelligence-summary")).toBeVisible();
    await expect(page.getByTestId("related-officers-preview")).toBeVisible();
    await expect(page.getByTestId("officer-guide-link")).toBeVisible();
  });

  test("intelligence summary appears earlier than deep timeline content", async ({ page }) => {
    await page.goto("/officers");
    await page.getByTestId("officer-card").first().click();

    const summary = page.getByTestId("officer-intelligence-summary");
    const timeline = page.getByTestId("timeline-section");

    await expect(summary).toBeVisible();
    await expect(timeline).toBeVisible();

    const summaryTop = await summary.evaluate((el) => el.getBoundingClientRect().top);
    const timelineTop = await timeline.evaluate((el) => el.getBoundingClientRect().top);

    expect(summaryTop).toBeLessThan(timelineTop);
  });

  test("archetype explainability guide is accessible from profile", async ({ page }) => {
    await page.goto("/officers");
    await page.getByTestId("officer-card").first().click();

    await page.getByTestId("officer-guide-link").click();
    await expect(page).toHaveURL(/\/guide\/intelligence/);
    await expect(page.getByTestId("intelligence-guide-page")).toBeVisible();
    await expect(page.getByTestId("archetype-glossary-section")).toBeVisible();
  });
});
