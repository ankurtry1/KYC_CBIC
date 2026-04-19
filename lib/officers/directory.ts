import type { Route } from "next";
import type { ReadonlyURLSearchParams } from "next/navigation";
import type { OfficerFilters } from "@/lib/officers/types";
import { DEFAULT_FILTERS } from "@/lib/officers/search";
import { sanitizeDisplayLabel, sanitizeDisplayLocation } from "@/lib/officers/normalize";

type SearchParamsRecord = Record<string, string | string[] | undefined>;

export type OfficerDirectoryState = {
  filters: OfficerFilters;
  page: number;
};

const SORT_BY_VALUES = new Set<OfficerFilters["sortBy"]>([
  "name",
  "batch",
  "employee_id",
  "present_rank_date",
  "timeline_richness"
]);

const SORT_ORDER_VALUES = new Set<OfficerFilters["sortOrder"]>(["asc", "desc"]);
const VERIFICATION_VALUES = new Set<OfficerFilters["verification"]>([
  "all",
  "verified",
  "not_verified",
  "unknown"
]);
const TIMELINE_VALUES = new Set<OfficerFilters["timelineQuality"]>([
  "all",
  "full",
  "partial",
  "minimal"
]);

function getParam(input: URLSearchParams | ReadonlyURLSearchParams | SearchParamsRecord, key: string): string | null {
  if (typeof (input as URLSearchParams).get === "function") {
    return (input as URLSearchParams | ReadonlyURLSearchParams).get(key);
  }

  const value = (input as SearchParamsRecord)[key];
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function sanitizeFilterValue(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function sanitizeDesignationValue(value: string | null | undefined): string {
  const cleaned = sanitizeDisplayLabel(value);
  return cleaned ?? "all";
}

function sanitizeLocationValue(value: string | null | undefined): string {
  const cleaned = sanitizeDisplayLocation(value);
  return cleaned ?? "all";
}

function sanitizeBatchValue(value: string | null | undefined): string {
  const cleaned = sanitizeFilterValue(value);
  if (!cleaned) return "all";
  return /^\d{4}$/.test(cleaned) ? cleaned : "all";
}

function sanitizeCadreValue(value: string | null | undefined): string {
  const cleaned = sanitizeFilterValue(value).toUpperCase();
  return cleaned || "all";
}

function sanitizePageValue(value: string | null | undefined): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 1) return 1;
  return Math.floor(numeric);
}

export function parseOfficerDirectoryState(
  input?: URLSearchParams | ReadonlyURLSearchParams | SearchParamsRecord
): OfficerDirectoryState {
  if (!input) {
    return {
      filters: DEFAULT_FILTERS,
      page: 1
    };
  }

  const q = sanitizeFilterValue(getParam(input, "q"));
  const cadre = sanitizeCadreValue(getParam(input, "cadre"));
  const batch = sanitizeBatchValue(getParam(input, "batch"));
  const designation = sanitizeDesignationValue(getParam(input, "designation"));
  const location = sanitizeLocationValue(getParam(input, "location"));
  const verification = sanitizeFilterValue(getParam(input, "verification")) as OfficerFilters["verification"];
  const timelineQuality = sanitizeFilterValue(getParam(input, "timelineQuality")) as OfficerFilters["timelineQuality"];
  const sortBy = sanitizeFilterValue(getParam(input, "sortBy")) as OfficerFilters["sortBy"];
  const sortOrder = sanitizeFilterValue(getParam(input, "sortOrder")) as OfficerFilters["sortOrder"];

  return {
    filters: {
      q,
      cadre: cadre === "ALL" ? "all" : cadre,
      batch,
      designation,
      location,
      verification: VERIFICATION_VALUES.has(verification) ? verification : DEFAULT_FILTERS.verification,
      timelineQuality: TIMELINE_VALUES.has(timelineQuality) ? timelineQuality : DEFAULT_FILTERS.timelineQuality,
      sortBy: SORT_BY_VALUES.has(sortBy) ? sortBy : DEFAULT_FILTERS.sortBy,
      sortOrder: SORT_ORDER_VALUES.has(sortOrder) ? sortOrder : DEFAULT_FILTERS.sortOrder
    },
    page: sanitizePageValue(getParam(input, "page"))
  };
}

export function buildOfficerDirectorySearchParams(
  filters: OfficerFilters,
  page = 1
): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.cadre !== DEFAULT_FILTERS.cadre) params.set("cadre", filters.cadre);
  if (filters.batch !== DEFAULT_FILTERS.batch) params.set("batch", filters.batch);
  if (filters.designation !== DEFAULT_FILTERS.designation) params.set("designation", filters.designation);
  if (filters.location !== DEFAULT_FILTERS.location) params.set("location", filters.location);
  if (filters.verification !== DEFAULT_FILTERS.verification) params.set("verification", filters.verification);
  if (filters.timelineQuality !== DEFAULT_FILTERS.timelineQuality) {
    params.set("timelineQuality", filters.timelineQuality);
  }
  if (filters.sortBy !== DEFAULT_FILTERS.sortBy) params.set("sortBy", filters.sortBy);
  if (filters.sortOrder !== DEFAULT_FILTERS.sortOrder) params.set("sortOrder", filters.sortOrder);
  if (page > 1) params.set("page", String(page));

  return params;
}

export function buildOfficerDirectoryHref(filters: OfficerFilters, page = 1): Route {
  const params = buildOfficerDirectorySearchParams(filters, page);
  const search = params.toString();
  return (search ? `/officers?${search}` : "/officers") as Route;
}

export function directoryHasActiveAdvancedFilters(filters: OfficerFilters): boolean {
  return (
    filters.batch !== DEFAULT_FILTERS.batch ||
    filters.designation !== DEFAULT_FILTERS.designation ||
    filters.location !== DEFAULT_FILTERS.location ||
    filters.verification !== DEFAULT_FILTERS.verification ||
    filters.timelineQuality !== DEFAULT_FILTERS.timelineQuality ||
    filters.sortBy !== DEFAULT_FILTERS.sortBy ||
    filters.sortOrder !== DEFAULT_FILTERS.sortOrder
  );
}
