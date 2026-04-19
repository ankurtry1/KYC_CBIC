import type { OfficerFilters, OfficerIndexRecord } from "@/lib/officers/types";
import { nowMs } from "@/lib/officers/perf";
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

export const MIN_SEARCH_SUGGEST_CHARS = 2;

export type SearchableOfficerRecord = {
  id: string;
  employee_id: string;
  name: string | null;
  normalized_name: string | null;
  batch?: number | null;
  cadre?: string | null;
  current_designation: string | null;
  current_location: string | null;
  current_posting_summary?: string | null;
  search_blob?: string | null;
  present_rank_date?: string | null;
  timeline_quality?: OfficerIndexRecord["timeline_quality"];
  timeline_richness_score?: number;
  verification_flag?: OfficerIndexRecord["verification_flag"];
  data_quality_label?: OfficerIndexRecord["data_quality_label"];
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

export type OfficerSearchResult<
  T extends SearchableOfficerRecord = OfficerIndexRecord
> = {
  officer: T;
  match: OfficerSearchMatch | null;
};

export type OfficerSearchDiagnostics = {
  query: string;
  queryLength: number;
  filteredCount: number;
  candidateCount: number;
  resultCount: number;
  filterMs: number;
  candidateMs: number;
  scoreMs: number;
  sortMs: number;
  totalMs: number;
  mode: "browse" | "short-query" | "ranked";
};

export type OfficerSearchResponse<
  T extends SearchableOfficerRecord = OfficerIndexRecord
> = {
  results: OfficerSearchResult<T>[];
  diagnostics: OfficerSearchDiagnostics;
};

export type OfficerSearchIndexRecord<
  T extends SearchableOfficerRecord = OfficerIndexRecord
> = {
  officer: T;
  compactEmployeeId: string;
  normalizedName: string;
  normalizedLocation: string;
  normalizedDesignation: string;
  normalizedCadre: string;
  batchText: string;
  blob: string;
  nameTokens: string[];
  locationTokens: string[];
  designationTokens: string[];
};

type SearchQueryContext = {
  normalized: string;
  compact: string;
  tokens: string[];
  length: number;
  isShort: boolean;
  isVeryShort: boolean;
};

function compareText(left: string | null | undefined, right: string | null | undefined): number {
  return (left ?? "").localeCompare(right ?? "");
}

function compareDate(left: string | null | undefined, right: string | null | undefined): number {
  const a = left ? new Date(left).getTime() : 0;
  const b = right ? new Date(right).getTime() : 0;
  return a - b;
}

function compareOfficerSort<T extends SearchableOfficerRecord>(
  left: T,
  right: T,
  sortBy: OfficerFilters["sortBy"],
  sortOrder: OfficerFilters["sortOrder"]
): number {
  const direction = sortOrder === "asc" ? 1 : -1;
  let value = 0;

  if (sortBy === "name") value = compareText(left.name, right.name);
  if (sortBy === "batch") value = (left.batch ?? 0) - (right.batch ?? 0);
  if (sortBy === "employee_id") value = compareText(left.employee_id, right.employee_id);
  if (sortBy === "present_rank_date") {
    value = compareDate(left.present_rank_date, right.present_rank_date);
  }
  if (sortBy === "timeline_richness") {
    value = (left.timeline_richness_score ?? 0) - (right.timeline_richness_score ?? 0);
  }

  if (value === 0) {
    value = compareText(left.name, right.name);
  }

  return value * direction;
}

function compareSearchResults<T extends SearchableOfficerRecord>(
  left: OfficerSearchResult<T>,
  right: OfficerSearchResult<T>,
  sortBy: OfficerFilters["sortBy"],
  sortOrder: OfficerFilters["sortOrder"],
  prioritizeSearch: boolean
): number {
  if (prioritizeSearch) {
    const scoreDelta = (right.match?.score ?? 0) - (left.match?.score ?? 0);
    if (scoreDelta !== 0) return scoreDelta;
  }

  return compareOfficerSort(left.officer, right.officer, sortBy, sortOrder);
}

function uniqueCues(cues: string[]): string[] {
  return [...new Set(cues)].slice(0, 2);
}

function tokenize(value: string): string[] {
  return value.split(" ").filter(Boolean);
}

function createQueryContext(query: string): SearchQueryContext | null {
  const normalized = normalizeSearchText(query);
  if (!normalized) return null;

  return {
    normalized,
    compact: normalized.replace(/\s+/g, ""),
    tokens: tokenize(normalized),
    length: normalized.length,
    isShort: normalized.length <= 3,
    isVeryShort: normalized.length <= 2
  };
}

function tokenExactCount(queryTokens: string[], fieldTokens: string[]): number {
  return queryTokens.filter((token) => fieldTokens.includes(token)).length;
}

function tokenPrefixCount(queryTokens: string[], fieldTokens: string[]): number {
  return queryTokens.filter((token) =>
    fieldTokens.some((fieldToken) => fieldToken.startsWith(token))
  ).length;
}

function tokenMatchesField(fieldTokens: string[], token: string): boolean {
  return fieldTokens.some((fieldToken) => fieldToken === token || fieldToken.startsWith(token));
}

function buildOfficerBlob(officer: SearchableOfficerRecord): string {
  return normalizeSearchText(
    [
      officer.name,
      officer.normalized_name,
      officer.employee_id,
      officer.batch != null ? String(officer.batch) : "",
      officer.cadre,
      officer.current_designation,
      sanitizeDisplayLocation(officer.current_location),
      officer.current_posting_summary,
      officer.search_blob
    ]
      .filter(Boolean)
      .join(" ")
  );
}

export function buildOfficerSearchIndex<
  T extends SearchableOfficerRecord
>(officers: T[]): OfficerSearchIndexRecord<T>[] {
  return officers.map((officer) => {
    const normalizedName = normalizeSearchText(
      officer.normalized_name ?? officer.name ?? ""
    );
    const normalizedLocation = normalizeSearchText(
      sanitizeDisplayLocation(officer.current_location) ?? ""
    );
    const normalizedDesignation = normalizeSearchText(
      sanitizeDisplayLabel(officer.current_designation) ?? ""
    );
    const normalizedCadre = normalizeSearchText(officer.cadre ?? "");
    const batchText = officer.batch != null ? String(officer.batch) : "";

    return {
      officer,
      compactEmployeeId: officer.employee_id.trim(),
      normalizedName,
      normalizedLocation,
      normalizedDesignation,
      normalizedCadre,
      batchText,
      blob: buildOfficerBlob(officer),
      nameTokens: tokenize(normalizedName),
      locationTokens: tokenize(normalizedLocation),
      designationTokens: tokenize(normalizedDesignation)
    };
  });
}

export function filterOfficers<T extends SearchableOfficerRecord>(
  officers: T[],
  filters: OfficerFilters
): T[] {
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

function filterSearchIndex<T extends SearchableOfficerRecord>(
  searchIndex: OfficerSearchIndexRecord<T>[],
  filters: OfficerFilters
): OfficerSearchIndexRecord<T>[] {
  return searchIndex.filter(({ officer }) => {
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

export function sortOfficers<T extends SearchableOfficerRecord>(
  officers: T[],
  sortBy: OfficerFilters["sortBy"],
  sortOrder: OfficerFilters["sortOrder"]
): T[] {
  return [...officers].sort((left, right) => compareOfficerSort(left, right, sortBy, sortOrder));
}

function isCandidateMatch<T extends SearchableOfficerRecord>(
  entry: OfficerSearchIndexRecord<T>,
  query: SearchQueryContext
): boolean {
  if (query.length < MIN_SEARCH_SUGGEST_CHARS) return false;

  if (entry.compactEmployeeId.startsWith(query.compact)) return true;
  if (entry.normalizedName === query.normalized) return true;
  if (entry.normalizedName.startsWith(query.normalized)) return true;
  if (query.tokens.every((token) => tokenMatchesField(entry.nameTokens, token))) return true;

  const fieldCoverage = query.tokens.filter((token) => {
    if (tokenMatchesField(entry.nameTokens, token)) return true;
    if (query.length >= 3 && tokenMatchesField(entry.locationTokens, token)) return true;
    if (query.length >= 3 && tokenMatchesField(entry.designationTokens, token)) return true;
    if (entry.batchText === token || entry.normalizedCadre === token) return true;
    if (token.length >= 2 && entry.compactEmployeeId.startsWith(token)) return true;
    return false;
  }).length;

  if (query.tokens.length > 1 && fieldCoverage === query.tokens.length) return true;
  if (query.length >= 4 && entry.blob.includes(query.normalized)) return true;

  return query.isShort ? fieldCoverage > 0 : fieldCoverage >= Math.min(query.tokens.length, 2);
}

function buildSearchMatch<T extends SearchableOfficerRecord>(
  entry: OfficerSearchIndexRecord<T>,
  query: SearchQueryContext
): OfficerSearchMatch | null {
  const exactNameHits = tokenExactCount(query.tokens, entry.nameTokens);
  const prefixNameHits = tokenPrefixCount(query.tokens, entry.nameTokens);
  const exactLocationHits = tokenExactCount(query.tokens, entry.locationTokens);
  const prefixLocationHits = tokenPrefixCount(query.tokens, entry.locationTokens);
  const exactDesignationHits = tokenExactCount(query.tokens, entry.designationTokens);
  const prefixDesignationHits = tokenPrefixCount(query.tokens, entry.designationTokens);
  const exactNameMatch = entry.normalizedName === query.normalized;
  const fullNamePrefix = entry.normalizedName.startsWith(query.normalized);
  const employeeIdExact = entry.compactEmployeeId === query.compact;
  const employeeIdPrefix =
    query.compact.length >= MIN_SEARCH_SUGGEST_CHARS &&
    entry.compactEmployeeId.startsWith(query.compact);
  const allTokensInBlob = query.tokens.every((token) => entry.blob.includes(token));
  const queryInName = query.length >= 4 && entry.normalizedName.includes(query.normalized);

  let score = 0;
  let level: OfficerSearchMatch["level"] = "fuzzy";
  const cues: string[] = [];

  const matchedFields = {
    employeeId: false,
    name: false,
    station: false,
    designation: false
  };

  if (employeeIdExact) {
    score = Math.max(score, 6200);
    level = "exact";
    matchedFields.employeeId = true;
    cues.push("Employee ID match");
  } else if (employeeIdPrefix) {
    score = Math.max(score, 5200);
    level = "strong";
    matchedFields.employeeId = true;
    cues.push("Employee ID prefix");
  }

  if (exactNameMatch) {
    score = Math.max(score, 5600);
    level = "exact";
    matchedFields.name = true;
    cues.push("Exact name match");
  } else if (fullNamePrefix && query.length >= MIN_SEARCH_SUGGEST_CHARS) {
    score = Math.max(score, 4400 + query.length * 12);
    if (level !== "exact") level = "strong";
    matchedFields.name = true;
    cues.push("Name prefix match");
  }

  if (exactNameHits > 0) {
    score = Math.max(score, 3600 + exactNameHits * 200 + (exactNameHits === query.tokens.length ? 260 : 0));
    if (level !== "exact") level = "strong";
    matchedFields.name = true;
    cues.push("Exact token match");
  } else if (prefixNameHits > 0) {
    score = Math.max(score, 3100 + prefixNameHits * 150);
    if (level === "fuzzy") level = "partial";
    matchedFields.name = true;
    cues.push("Prefix token match");
  }

  if (!query.isShort) {
    if (entry.normalizedLocation === query.normalized) {
      score = Math.max(score, 2400);
      matchedFields.station = true;
    } else if (exactLocationHits > 0) {
      score = Math.max(score, 1950 + exactLocationHits * 120);
      matchedFields.station = true;
    } else if (prefixLocationHits > 0) {
      score = Math.max(score, 1550 + prefixLocationHits * 90);
      matchedFields.station = true;
    }

    if (entry.normalizedDesignation === query.normalized) {
      score = Math.max(score, 2300);
      matchedFields.designation = true;
    } else if (exactDesignationHits > 0) {
      score = Math.max(score, 1850 + exactDesignationHits * 110);
      matchedFields.designation = true;
    } else if (prefixDesignationHits > 0) {
      score = Math.max(score, 1500 + prefixDesignationHits * 90);
      matchedFields.designation = true;
    }
  }

  if (entry.batchText && entry.batchText === query.compact) {
    score = Math.max(score, 1650);
  }

  if (entry.normalizedCadre && entry.normalizedCadre === query.normalized) {
    score = Math.max(score, 1500);
  }

  if (query.tokens.length > 1 && matchedFields.name && (matchedFields.station || matchedFields.designation)) {
    score += matchedFields.station ? 700 : 560;
    if (level === "fuzzy") level = "strong";
    cues.push(matchedFields.station ? "Name + station match" : "Name + designation match");
  }

  if (!query.isShort && score < 1000 && queryInName) {
    score = Math.max(score, 940);
    level = "fuzzy";
    matchedFields.name = true;
    cues.push("Fuzzy name match");
  } else if (!query.isShort && score < 820 && allTokensInBlob && matchedFields.name) {
    score = Math.max(score, 780);
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

  if (query.isVeryShort && score < 2800) return null;
  if (query.isShort && score < 900) return null;
  if (query.tokens.length > 1 && !allTokensInBlob && score < 1450) return null;
  if (primaryFieldHits === 0 && score < 1600) return null;

  return {
    level,
    score,
    primaryLabel: uniqueCues(cues)[0] ?? "Search match",
    cues: uniqueCues(cues),
    matchedFields
  };
}

function buildBrowseDiagnostics<T extends SearchableOfficerRecord>(
  query: string,
  filtered: OfficerSearchIndexRecord<T>[],
  filterMs: number,
  sortMs: number
): OfficerSearchDiagnostics {
  return {
    query,
    queryLength: query.length,
    filteredCount: filtered.length,
    candidateCount: filtered.length,
    resultCount: filtered.length,
    filterMs,
    candidateMs: 0,
    scoreMs: 0,
    sortMs,
    totalMs: filterMs + sortMs,
    mode: "browse"
  };
}

export function searchOfficersDetailed<T extends SearchableOfficerRecord>(
  searchIndex: OfficerSearchIndexRecord<T>[],
  filters: OfficerFilters
): OfficerSearchResponse<T> {
  const totalStart = nowMs();

  const filterStart = nowMs();
  const filtered = filterSearchIndex(searchIndex, filters);
  const filterMs = nowMs() - filterStart;

  const query = createQueryContext(filters.q);
  if (!query) {
    const sortStart = nowMs();
    const results = filtered
      .map((entry) => ({ officer: entry.officer, match: null }))
      .sort((left, right) => compareSearchResults(left, right, filters.sortBy, filters.sortOrder, false));
    const sortMs = nowMs() - sortStart;

    return {
      results,
      diagnostics: buildBrowseDiagnostics(filters.q, filtered, filterMs, sortMs)
    };
  }

  const candidateStart = nowMs();
  const candidates = filtered.filter((entry) => isCandidateMatch(entry, query));
  const candidateMs = nowMs() - candidateStart;

  const scoreStart = nowMs();
  const scored = candidates
    .map((entry) => ({
      officer: entry.officer,
      match: buildSearchMatch(entry, query)
    }))
    .filter((entry): entry is OfficerSearchResult<T> => entry.match != null);
  const scoreMs = nowMs() - scoreStart;

  const sortStart = nowMs();
  const results = [...scored].sort((left, right) =>
    compareSearchResults(left, right, filters.sortBy, filters.sortOrder, true)
  );
  const sortMs = nowMs() - sortStart;

  return {
    results,
    diagnostics: {
      query: filters.q,
      queryLength: query.length,
      filteredCount: filtered.length,
      candidateCount: candidates.length,
      resultCount: results.length,
      filterMs,
      candidateMs,
      scoreMs,
      sortMs,
      totalMs: nowMs() - totalStart,
      mode: query.isShort ? "short-query" : "ranked"
    }
  };
}

export function searchOfficers<T extends SearchableOfficerRecord>(
  searchIndex: OfficerSearchIndexRecord<T>[],
  filters: OfficerFilters
): OfficerSearchResult<T>[] {
  return searchOfficersDetailed(searchIndex, filters).results;
}

export function suggestOfficers<T extends SearchableOfficerRecord>(
  searchIndex: OfficerSearchIndexRecord<T>[],
  query: string,
  limit = 6
): OfficerSearchResult<T>[] {
  const queryContext = createQueryContext(query);
  if (!queryContext || queryContext.length < MIN_SEARCH_SUGGEST_CHARS) return [];

  const candidates = searchIndex
    .filter((entry) => isCandidateMatch(entry, queryContext))
    .map((entry) => ({
      officer: entry.officer,
      match: buildSearchMatch(entry, queryContext)
    }))
    .filter((entry): entry is OfficerSearchResult<T> => entry.match != null)
    .sort((left, right) =>
      compareSearchResults(left, right, DEFAULT_FILTERS.sortBy, DEFAULT_FILTERS.sortOrder, true)
    );

  return candidates.slice(0, limit);
}

export function getStrongDirectOfficerMatch<T extends SearchableOfficerRecord>(
  suggestions: OfficerSearchResult<T>[],
  query: string
): OfficerSearchResult<T> | null {
  const queryContext = createQueryContext(query);
  if (!queryContext || suggestions.length === 0) return null;

  const top = suggestions[0];
  if (!top.match) return null;

  const normalizedName = normalizeSearchText(top.officer.name ?? top.officer.normalized_name ?? "");
  const isStrongNameMatch =
    normalizedName === queryContext.normalized || normalizedName.startsWith(queryContext.normalized);

  if (top.match.matchedFields.employeeId && top.match.level !== "fuzzy") {
    return top;
  }

  if (top.match.matchedFields.name && isStrongNameMatch && top.match.score >= 4300) {
    return top;
  }

  return null;
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
