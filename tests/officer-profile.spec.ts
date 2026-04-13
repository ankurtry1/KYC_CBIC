import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

type TimelinePosting = {
  start_date?: string | null;
  end_date?: string | null;
  designation?: string | null;
  rank_held?: string | null;
};

type TimelineOfficer = {
  id: string;
  posting_history: TimelinePosting[];
};

type TimelineFixture = {
  id: string;
  expectedGroupLabels: string[];
  expectedTopTitle: string;
};

function toTimestamp(value: string | null | undefined): number | null {
  if (!value) return null;
  const ts = new Date(value).getTime();
  return Number.isNaN(ts) ? null : ts;
}

function postingSortTimestamp(posting: TimelinePosting): number | null {
  return toTimestamp(posting.start_date) ?? toTimestamp(posting.end_date);
}

function sortPostingsDesc(postings: TimelinePosting[]): TimelinePosting[] {
  return postings
    .map((posting, originalIndex) => ({ posting, originalIndex }))
    .sort((left, right) => {
      const leftTs = postingSortTimestamp(left.posting);
      const rightTs = postingSortTimestamp(right.posting);

      if (leftTs != null && rightTs != null && leftTs !== rightTs) return rightTs - leftTs;
      if (leftTs != null && rightTs == null) return -1;
      if (leftTs == null && rightTs != null) return 1;

      const leftOpenEnded = left.posting.end_date == null && leftTs != null;
      const rightOpenEnded = right.posting.end_date == null && rightTs != null;
      if (leftOpenEnded && !rightOpenEnded) return -1;
      if (!leftOpenEnded && rightOpenEnded) return 1;

      return left.originalIndex - right.originalIndex;
    })
    .map((entry) => entry.posting);
}

function postingGroupLabel(posting: TimelinePosting): string {
  const ts = postingSortTimestamp(posting);
  if (ts == null) return "Undated records";
  const year = new Date(ts).getFullYear();
  if (!Number.isFinite(year) || year < 1950) return "Undated records";
  return `${Math.floor(year / 10) * 10}s`;
}

function createTimelineFixture(): TimelineFixture {
  const officersPath = path.join(process.cwd(), "data", "officers.json");
  const officers = JSON.parse(fs.readFileSync(officersPath, "utf8")) as TimelineOfficer[];

  const candidate =
    officers.find((officer) => {
      const sorted = sortPostingsDesc(officer.posting_history ?? []);
      if (sorted.length < 4) return false;
      const uniqueGroups = new Set(sorted.map(postingGroupLabel));
      return uniqueGroups.size >= 2;
    }) ??
    officers.find((officer) => (officer.posting_history ?? []).length >= 2);

  if (!candidate) {
    return { id: "officer-3386", expectedGroupLabels: ["Undated records"], expectedTopTitle: "Role details unavailable" };
  }

  const sorted = sortPostingsDesc(candidate.posting_history ?? []);
  const expectedGroupLabels = [...new Set(sorted.map(postingGroupLabel))];
  const top = sorted[0];

  return {
    id: candidate.id,
    expectedGroupLabels,
    expectedTopTitle: top?.designation ?? top?.rank_held ?? "Role details unavailable"
  };
}

const TIMELINE_FIXTURE = createTimelineFixture();

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

  test("profile section jump navigation works", async ({ page }) => {
    await page.goto("/officers");
    await page.getByTestId("officer-card").first().click();

    const nav = page.getByTestId("profile-section-nav");
    await expect(nav).toBeVisible();
    await nav.getByRole("link", { name: "Timeline" }).click();
    await expect(page).toHaveURL(/#timeline$/);
    await expect(page.getByTestId("timeline-section")).toBeInViewport();
  });

  test("timeline groups can collapse and expand", async ({ page }) => {
    await page.goto("/officers");
    await page.getByTestId("officer-card").first().click();

    const timeline = page.getByTestId("timeline-section");
    await timeline.scrollIntoViewIfNeeded();
    await expect(timeline).toBeVisible();

    await page.getByTestId("timeline-collapse-all").click();
    const firstToggle = page.getByTestId("timeline-group-toggle-0");
    await expect(firstToggle).toBeVisible();

    await firstToggle.click();
    await expect
      .poll(async () => page.locator('section[data-testid^="timeline-group-"]').first().locator("article").count())
      .toBeGreaterThan(0);
  });

  test("timeline renders newest decade and newest entry first", async ({ page }) => {
    await page.goto(`/officers/${TIMELINE_FIXTURE.id}`);

    const timeline = page.getByTestId("timeline-section");
    await timeline.scrollIntoViewIfNeeded();
    await expect(timeline).toBeVisible();

    await expect(page.getByTestId("timeline-group-toggle-0")).toContainText(TIMELINE_FIXTURE.expectedGroupLabels[0]);
    if (TIMELINE_FIXTURE.expectedGroupLabels.length > 1) {
      await expect(page.getByTestId("timeline-group-toggle-1")).toContainText(TIMELINE_FIXTURE.expectedGroupLabels[1]);
    }

    const topEntryTitle = page
      .locator('section[data-testid^="timeline-group-"]')
      .first()
      .locator("article h3")
      .first();
    await expect(topEntryTitle).toContainText(TIMELINE_FIXTURE.expectedTopTitle);

    await page.getByTestId("timeline-collapse-all").click();
    await page.getByTestId("timeline-expand-all").click();
    await expect(page.getByTestId("timeline-group-toggle-0")).toContainText(TIMELINE_FIXTURE.expectedGroupLabels[0]);
  });
});
