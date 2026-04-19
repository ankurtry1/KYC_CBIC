import type { OfficerFilters, OfficerIndexRecord } from "@/lib/officers/types";
import {
  normalizeSearchText,
  sanitizeDisplayLabel,
  sanitizeDisplayLocation
} from "@/lib/officers/normalize";

export const DEFAULT_FILTERS: OfficerFilters = {
  q: "",
  cadre: "all",
  batch: "all",
  designation: "all",
  timelineQuality: "all",
  verification: "all",
  location: "all",
  sortBy: "name",
  sortOrder: "asc"
};

export type OfficerSearchMatch = {
  level: "exact" | "strong" | "partial" | "fuzzy";
  score: number;
  primaryLabel: string;
  cues: string[];
  matchedFields: {
    employeeId: boolean;
    name: boolean;
    station: boolean;
    designation: boolean;
  };
};

export type OfficerSearchResult = {
  officer: OfficerIndexRecord;
  match: OfficerSearchMatch | null;
};

function compareText(left: string | null, right: string | null): number {
  return (left ?? "").localeCompare(right ?? "");
}

function compareDate(left: string | null, right: string | null): number {
  const a = left ? new Date(left).getTime() : 0;
  const b = right ? new Date(right).getTime() : 0;
  return a - b;
}

export function filterOfficers(
  officers: OfficerIndexRecord[],
  filters: OfficerFilters
): OfficerIndexRecord[] {
  return officers.filter((officer) => {
    if (filters.cadre !== "all" && officer.cadre !== filters.cadre) return false;
    if (filters.batch !== "all" && String(officer.batch ?? "") !== filters.batch) return false;
    if (
      filters.designation !== "all" &&
      sanitizeDisplayLabel(officer.current_designation) !== sanitizeDisplayLabel(filters.designation)
    ) {
      return false;
    }
    if (filters.timelineQuality !== "all" && officer.timeline_quality !== filters.timelineQuality) return false;
    if (filters.verification !== "all" && officer.verification_flag !== filters.verification) return false;

    if (filters.location !== "all") {
      if (sanitizeDisplayLocation(officer.current_location) !== sanitizeDisplayLocation(filters.location)) {
        return false;
      }
    }

    return true;
  });
}

export function sortOfficers(
  officers: OfficerIndexRecord[],
  sortBy: OfficerFilters["sortBy"],
  sortOrder: OfficerFilters["sortOrder"]
): OfficerIndexRecord[] {
  const direction = sortOrder === "asc" ? 1 : -1;

  return [...officers].sort((left, right) => {
    let value = 0;

    if (sortBy === "name") value = compareText(left.name, right.name);
    if (sortBy === "batch") value = (left.batch ?? 0) - (right.batch ?? 0);
    if (sortBy === "employee_id") value = compareText(left.employee_id, right.employee_id);
    if (sortBy === "present_rank_date") {
      value = compareDate(left.present_rank_date, right.present_rank_date);
    }
    if (sortBy === "timeline_richness") {
      value = left.timeline_richness_score - right.timeline_richness_score;
    }

    if (value === 0) {
      value = compareText(left.name, right.name);
    }

    return value * direction;
  });
}

function compareSearchResults(
  left: OfficerSearchResult,
  right: OfficerSearchResult,
  sortBy: OfficerFilters["sortBy"],
  sortOrder: OfficerFilters["sortOrder"],
  prioritizeSearch: boolean
): number {
  if (prioritizeSearch) {
    const scoreDelta = (right.match?.score ?? 0) - (left.match?.score ?? 0);
    if (scoreDelta !== 0) return scoreDelta;
  }

  return sortOfficers([left.officer, right.officer], sortBy, sortOrder)[0]?.id === left.officer.id ? -1 : 1;
}

function uniqueCues(cues: string[]): string[] {
  return [...new Set(cues)].slice(0, 2);
}

function tokenExactCount(queryTokens: string[], fieldTokens: string[]): number {
  return queryTokens.filter((token) => fieldTokens.includes(token)).length;
}

function tokenPrefixCount(queryTokens: string[], fieldTokens: string[]): number {
  return queryTokens.filter((token) => fieldTokens.some((fieldToken) => fieldToken.startsWith(token))).length;
}

function buildSearchMatch(officer: OfficerIndexRecord, query: string): OfficerSearchMatch | null {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return null;

  const compactQuery = normalizedQuery.replace(/\s+/g, "");
  const queryTokens = normalizedQuery.split(" ").filter(Boolean);
  const employeeId = officer.employee_id.trim();
  const name = normalizeSearchText(officer.name ?? "");
  const location = normalizeSearchText(sanitizeDisplayLocation(officer.current_location) ?? "");
  const designation = normalizeSearchText(sanitizeDisplayLabel(officer.current_designation) ?? "");
  const batch = officer.batch != null ? String(officer.batch) : "";
  const cadre = normalizeSearchText(officer.cadre ?? "");
  const blob = normalizeSearchText(officer.search_blob);

  const nameTokens = name ? name.split(" ") : [];
  const locationTokens = location ? location.split(" ") : [];
  const designationTokens = designation ? designation.split(" ") : [];

  const exactNameHits = tokenExactCount(queryTokens, nameTokens);
  const prefixNameHits = tokenPrefixCount(queryTokens, nameTokens);
  const exactLocationHits = tokenExactCount(queryTokens, locationTokens);
  const prefixLocationHits = tokenPrefixCount(queryTokens, locationTokens);
  const exactDesignationHits = tokenExactCount(queryTokens, designationTokens);
  const prefixDesignationHits = tokenPrefixCount(queryTokens, designationTokens);

  let score = 0;
  let level: OfficerSearchMatch["level"] = "fuzzy";
  const cues: string[] = [];

  const matchedFields = {
    employeeId: false,
    name: false,
    station: false,
    designation: false
  };

  if (employeeId === compactQuery) {
    score = Math.max(score, 6000);
    level = "exact";
    matchedFields.employeeId = true;
    cues.push("Employee ID match");
  } else if (employeeId.startsWith(compactQuery) && compactQuery.length >= 2) {
    score = Math.max(score, 3300);
    level = "strong";
    matchedFields.employeeId = true;
    cues.push("Employee ID prefix");
  }

  if (name && name === normalizedQuery) {
    score = Math.max(score, 5000);
    level = "exact";
    matchedFields.name = true;
    cues.push("Exact name match");
  }

  if (exactNameHits > 0) {
    score = Math.max(score, 3500 + exactNameHits * 180 + (exactNameHits === queryTokens.length ? 220 : 0));
    if (level !== "exact") level = "strong";
    matchedFields.name = true;
    cues.push("Exact token match");
  } else if (prefixNameHits > 0) {
    score = Math.max(score, 3000 + prefixNameHits * 140);
    if (level === "fuzzy") level = "partial";
    matchedFields.name = true;
    cues.push("Prefix token match");
  }

  if (location && location === normalizedQuery) {
    score = Math.max(score, 2200);
    matchedFields.station = true;
  } else if (exactLocationHits > 0) {
    score = Math.max(score, 1800 + exactLocationHits * 110);
    matchedFields.station = true;
  } else if (prefixLocationHits > 0) {
    score = Math.max(score, 1450 + prefixLocationHits * 80);
    matchedFields.station = true;
  }

  if (designation && designation === normalizedQuery) {
    score = Math.max(score, 2100);
    matchedFields.designation = true;
  } else if (exactDesignationHits > 0) {
    score = Math.max(score, 1750 + exactDesignationHits * 100);
    matchedFields.designation = true;
  } else if (prefixDesignationHits > 0) {
    score = Math.max(score, 1400 + prefixDesignationHits * 80);
    matchedFields.designation = true;
  }

  if (batch && batch === compactQuery) {
    score = Math.max(score, 1650);
  }

  if (cadre && cadre === normalizedQuery) {
    score = Math.max(score, 1500);
  }

  if (queryTokens.length > 1 && matchedFields.name && (matchedFields.station || matchedFields.designation)) {
    score += matchedFields.station ? 650 : 520;
    if (level === "fuzzy") level = "strong";
    cues.push(matchedFields.station ? "Name + station match" : "Name + designation match");
  }

  const allTokensInBlob = queryTokens.every((token) => blob.includes(token));
  const queryInName = normalizedQuery.length >= 4 && name.includes(normalizedQuery);

  if (score < 1000 && queryInName) {
    score = Math.max(score, 900);
    level = "fuzzy";
    matchedFields.name = true;
    cues.push("Fuzzy name match");
  } else if (score < 800 && normalizedQuery.length >= 5 && allTokensInBlob && matchedFields.name) {
    score = Math.max(score, 760);
    level = "fuzzy";
    cues.push("Contextual match");
  }

  const primaryFieldHits =
    exactNameHits +
    prefixNameHits +
    exactLocationHits +
    prefixLocationHits +
    exactDesignationHits +
    prefixDesignationHits +
    (matchedFields.employeeId ? 1 : 0);

  if (queryTokens.length === 1 && normalizedQuery.length < 3 && score < 3000) return null;
  if (queryTokens.length === 1 && normalizedQuery.length >= 3 && score < 700) return null;
  if (queryTokens.length > 1 && !allTokensInBlob && score < 1400) return null;
  if (primaryFieldHits === 0 && score < 1500) return null;

  return {
    level,
    score,
    primaryLabel: uniqueCues(cues)[0] ?? "Search match",
    cues: uniqueCues(cues),
    matchedFields
  };
}

export function searchOfficers(
  officers: OfficerIndexRecord[],
  filters: OfficerFilters
): OfficerSearchResult[] {
  const query = normalizeSearchText(filters.q);
  const candidates = filterOfficers(officers, filters)
    .map((officer) => ({
      officer,
      match: query ? buildSearchMatch(officer, query) : null
    }))
    .filter((entry) => !query || entry.match != null);

  return [...candidates].sort((left, right) =>
    compareSearchResults(left, right, filters.sortBy, filters.sortOrder, Boolean(query))
  );
}

export function deriveFilterOptions(officers: OfficerIndexRecord[]): {
  cadres: string[];
  batches: string[];
  designations: string[];
  locations: string[];
} {
  const cadres = new Set<string>();
  const batches = new Set<string>();
  const designations = new Set<string>();
  const locations = new Set<string>();

  for (const officer of officers) {
    if (officer.cadre) cadres.add(officer.cadre);
    if (officer.batch != null) batches.add(String(officer.batch));
    const designation = sanitizeDisplayLabel(officer.current_designation);
    const location = sanitizeDisplayLocation(officer.current_location);
    if (designation) designations.add(designation);
    if (location) locations.add(location);
  }

  return {
    cadres: [...cadres].sort((a, b) => a.localeCompare(b)),
    batches: [...batches].sort((a, b) => Number(a) - Number(b)),
    designations: [...designations].sort((a, b) => a.localeCompare(b)),
    locations: [...locations].sort((a, b) => a.localeCompare(b))
  };
}
