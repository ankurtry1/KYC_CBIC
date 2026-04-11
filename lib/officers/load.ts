import { cache } from "react";
import fs from "node:fs/promises";
import path from "node:path";
import type { Officer, OfficerIndexRecord, OfficerMetrics } from "@/lib/officers/types";

const officersPath = path.join(process.cwd(), "data", "officers.json");
const officersIndexPath = path.join(process.cwd(), "data", "officers-index.json");
const metricsPath = path.join(process.cwd(), "data", "officers-metrics.json");

const readJson = async <T>(filePath: string): Promise<T> => {
  const payload = await fs.readFile(filePath, "utf8");
  return JSON.parse(payload) as T;
};

export const getOfficers = cache(async (): Promise<Officer[]> => {
  return readJson<Officer[]>(officersPath);
});

export const getOfficerIndex = cache(async (): Promise<OfficerIndexRecord[]> => {
  return readJson<OfficerIndexRecord[]>(officersIndexPath);
});

export const getOfficerMetrics = cache(async (): Promise<OfficerMetrics> => {
  return readJson<OfficerMetrics>(metricsPath);
});

export const getOfficerById = cache(async (id: string): Promise<Officer | null> => {
  const officers = await getOfficers();
  return officers.find((officer) => officer.id === id || officer.employee_id === id) ?? null;
});

export const getFeaturedOfficers = cache(async (count = 6): Promise<OfficerIndexRecord[]> => {
  const index = await getOfficerIndex();
  return [...index]
    .sort((left, right) => right.timeline_richness_score - left.timeline_richness_score)
    .slice(0, count);
});
