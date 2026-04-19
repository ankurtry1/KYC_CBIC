import { cache } from "react";
import fs from "node:fs/promises";
import path from "node:path";
import type { Officer, OfficerIndexRecord, OfficerMetrics } from "@/lib/officers/types";
import { hasReliableOfficerName } from "@/lib/officers/derive";
import type {
  BatchIntelligence,
  CadreIntelligence,
  CareerPathIntelligence,
  DiscoveryIntelligence,
  StationIntelligence
} from "@/lib/intelligence/types";

const officersPath = path.join(process.cwd(), "data", "officers.json");
const officersIndexPath = path.join(process.cwd(), "data", "officers-index.json");
const metricsPath = path.join(process.cwd(), "data", "officers-metrics.json");
const batchesPath = path.join(process.cwd(), "data", "batches.json");
const cadresPath = path.join(process.cwd(), "data", "cadres.json");
const stationsPath = path.join(process.cwd(), "data", "stations.json");
const careerPathsPath = path.join(process.cwd(), "data", "career-paths.json");
const discoveryPath = path.join(process.cwd(), "data", "discovery.json");

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

export const getOfficerIndexMap = cache(async (): Promise<Map<string, OfficerIndexRecord>> => {
  const index = await getOfficerIndex();
  return new Map(index.map((officer) => [officer.id, officer]));
});

export const getOfficerMetrics = cache(async (): Promise<OfficerMetrics> => {
  return readJson<OfficerMetrics>(metricsPath);
});

export const getOfficerById = cache(async (id: string): Promise<Officer | null> => {
  const officers = await getOfficers();
  return officers.find((officer) => officer.id === id || officer.employee_id === id) ?? null;
});

export const getFeaturedOfficers = cache(async (count = 6): Promise<OfficerIndexRecord[]> => {
  const [index, officersMap] = await Promise.all([getOfficerIndex(), getOfficersMap()]);
  return [...index]
    .map((record) => ({ record, score: surfacedOfficerScore(officersMap.get(record.id) ?? null) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .map((item) => item.record)
    .slice(0, count);
});

export const getBatches = cache(async (): Promise<BatchIntelligence[]> => {
  return readJson<BatchIntelligence[]>(batchesPath);
});

export const getBatchByYear = cache(async (year: number): Promise<BatchIntelligence | null> => {
  const batches = await getBatches();
  return batches.find((batch) => batch.year === year) ?? null;
});

export const getCadres = cache(async (): Promise<CadreIntelligence[]> => {
  return readJson<CadreIntelligence[]>(cadresPath);
});

export const getCadreBySlug = cache(async (slugOrCode: string): Promise<CadreIntelligence | null> => {
  const normalized = slugOrCode.toLowerCase();
  const cadres = await getCadres();
  return (
    cadres.find((cadre) => cadre.slug === normalized || cadre.cadre.toLowerCase() === normalized) ?? null
  );
});

export const getStations = cache(async (): Promise<StationIntelligence[]> => {
  return readJson<StationIntelligence[]>(stationsPath);
});

export const getStationBySlug = cache(async (slug: string): Promise<StationIntelligence | null> => {
  const stations = await getStations();
  return stations.find((station) => station.slug === slug) ?? null;
});

export const getCareerPaths = cache(async (): Promise<CareerPathIntelligence> => {
  return readJson<CareerPathIntelligence>(careerPathsPath);
});

export const getDiscovery = cache(async (): Promise<DiscoveryIntelligence> => {
  return readJson<DiscoveryIntelligence>(discoveryPath);
});

export async function getOfficersByIds(ids: string[]): Promise<Officer[]> {
  const officersMap = await getOfficersMap();
  return ids
    .map((id) => officersMap.get(id))
    .filter((officer): officer is Officer => officer != null);
}

export const getOfficersMap = cache(async (): Promise<Map<string, Officer>> => {
  const officers = await getOfficers();
  return new Map(officers.map((officer) => [officer.id, officer]));
});

function hasSevereSurfaceWarning(officer: Officer): boolean {
  return (officer.data_quality?.warnings ?? []).some((warning) =>
    /precedes entry date|identity/i.test(warning)
  );
}

function surfacedOfficerScore(officer: Officer | null): number {
  if (!officer) return -1;
  if (!hasReliableOfficerName(officer.name)) return -1;
  if (officer.data_quality_label === "Needs Review") return -1;
  if (hasSevereSurfaceWarning(officer)) return -1;

  let score = 0;
  score += officer.timeline_richness_score * 40;
  score += officer.timeline_entry_count * 10;
  score += officer.unique_station_count * 6;
  score += officer.verification_flag === "verified" ? 80 : 20;
  score += officer.data_quality_label === "Strong" ? 70 : 30;
  score += officer.current_posting?.confidence != null ? Math.round(officer.current_posting.confidence * 50) : 0;
  score -= (officer.data_quality?.warnings ?? []).length * 20;
  score -= (officer.data_quality?.missing_fields ?? []).length * 10;

  return score;
}

export async function getSurfaceableOfficersByIds(ids: string[], count = ids.length): Promise<Officer[]> {
  const officers = await getOfficersByIds(ids);
  const ranked = officers
    .map((officer) => ({ officer, score: surfacedOfficerScore(officer) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .map((item) => item.officer);

  if (ranked.length >= count) {
    return ranked.slice(0, count);
  }

  const fallback = officers.filter(
    (officer) =>
      !ranked.some((candidate) => candidate.id === officer.id) &&
      hasReliableOfficerName(officer.name) &&
      officer.data_quality_label !== "Needs Review" &&
      !hasSevereSurfaceWarning(officer)
  );

  return [...ranked, ...fallback].slice(0, count);
}
