import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

function readJson<T>(relativePath: string): T {
  const fullPath = path.join(process.cwd(), relativePath);
  return JSON.parse(fs.readFileSync(fullPath, "utf8")) as T;
}

type OfficerLite = {
  id: string;
  related_officer_ids: string[];
};

type BatchLite = { year: number };

type CadreLite = { slug: string };

type StationLite = { slug: string };

const officers = readJson<OfficerLite[]>("data/officers.json");
const batches = readJson<BatchLite[]>("data/batches.json");
const cadres = readJson<CadreLite[]>("data/cadres.json");
const stations = readJson<StationLite[]>("data/stations.json");

const officerWithRelated = officers.find((officer) => officer.related_officer_ids.length > 0) ?? officers[0];
const sampleBatch = batches[0] ?? { year: 2000 };
const sampleCadre = cadres[0] ?? { slug: "dr" };
const sampleStation = stations[0] ?? { slug: "delhi" };

test.describe("Layer 2 intelligence routes", () => {
  test("homepage KPI values render and are non-zero", async ({ page }) => {
    await page.goto("/");

    const kpis = [
      page.getByTestId("metric-total-officers"),
      page.getByTestId("metric-timeline-rich"),
      page.getByTestId("metric-cadres-covered"),
      page.getByTestId("metric-designation-spread")
    ];

    for (const kpi of kpis) {
      await expect(kpi).toBeVisible();
      await expect
        .poll(async () => {
          const text = (await kpi.innerText()).replace(/,/g, "");
          const values = text.match(/\d+/g) ?? [];
          return Number(values[0] ?? "0");
        })
        .toBeGreaterThan(0);
    }
  });

  test("discover and learn pages load", async ({ page }) => {
    await page.goto("/discover");
    await expect(page.getByTestId("discover-page")).toBeVisible();
    await expect(page.getByTestId("discover-journey-card").first()).toBeVisible();

    await page.goto("/learn");
    await expect(page.getByTestId("learn-page")).toBeVisible();
    await expect(page.getByTestId("learn-path-grid")).toBeVisible();

    await page.goto("/guide/intelligence");
    await expect(page.getByTestId("intelligence-guide-page")).toBeVisible();
  });

  test("batch, cadre, and station routes load", async ({ page }) => {
    await page.goto("/batches");
    await expect(page.getByTestId("batches-page")).toBeVisible();
    await expect(page.getByTestId("batches-grid")).toBeVisible();

    await page.goto(`/batches/${sampleBatch.year}`);
    await expect(page.getByTestId("batch-detail-page")).toBeVisible();

    await page.goto("/cadres");
    await expect(page.getByTestId("cadres-page")).toBeVisible();
    await expect(page.getByTestId("cadres-grid")).toBeVisible();

    await page.goto(`/cadres/${sampleCadre.slug}`);
    await expect(page.getByTestId("cadre-detail-page")).toBeVisible();

    await page.goto("/stations");
    await expect(page.getByTestId("stations-page")).toBeVisible();
    await expect(page.getByTestId("stations-grid")).toBeVisible();

    await page.goto(`/stations/${sampleStation.slug}`);
    await expect(page.getByTestId("station-detail-page")).toBeVisible();
  });

  test("officer profile shows intelligence summary, related officers, and recommendations", async ({ page }) => {
    await page.goto(`/officers/${officerWithRelated.id}`);

    await expect(page.getByTestId("profile-quick-summary")).toBeVisible();
    await expect(page.getByTestId("officer-intelligence-summary")).toBeVisible();
    await expect(page.getByTestId("officer-narrative-card")).toBeVisible();
    await expect(page.getByTestId("related-officers-section")).toBeVisible();
    await expect(page.getByTestId("officer-recommendation-strip")).toBeVisible();

    if (officerWithRelated.related_officer_ids.length > 0) {
      await expect(page.getByTestId("related-officers-section").locator('a[href^="/officers/"]').first()).toBeVisible();
    }
  });

  test("timeline score wording is removed and recommendation strips are navigable", async ({ page }) => {
    await page.goto("/officers");
    await expect(page.getByTestId("officers-recommendation-strip")).toBeVisible();

    await expect(page.getByText(/timeline score/i)).toHaveCount(0);

    const firstCard = page.getByTestId("officer-card").first();
    await firstCard.click();
    await expect(page.getByText(/timeline score/i)).toHaveCount(0);

    await page.goto("/discover");
    const firstExploreLink = page.getByTestId("discover-recommendation-strip").locator("a").first();
    await expect(firstExploreLink).toBeVisible();
    await firstExploreLink.click();
    await expect(page).toHaveURL(/\/(learn|officers|batches|career-paths)/);
  });
});
