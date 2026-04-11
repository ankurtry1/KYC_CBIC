import { cache } from "react";
import fs from "node:fs/promises";
import path from "node:path";
import type { Officer, OfficerIndexRecord, OfficerMetrics } from "@/lib/officers/types";
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
