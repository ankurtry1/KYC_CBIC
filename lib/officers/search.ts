import type { OfficerFilters, OfficerIndexRecord } from "@/lib/officers/types";
import { normalizeSearchText } from "@/lib/officers/normalize";

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
  const query = normalizeSearchText(filters.q);

  return officers.filter((officer) => {
    if (query) {
      const haystack = normalizeSearchText(officer.search_blob);
      if (!haystack.includes(query)) {
        const terms = query.split(" ");
        const allTermsMatch = terms.every((term) => haystack.includes(term));
        if (!allTermsMatch) return false;
      }
    }

    if (filters.cadre !== "all" && officer.cadre !== filters.cadre) return false;
    if (filters.batch !== "all" && String(officer.batch ?? "") !== filters.batch) return false;
    if (filters.designation !== "all" && officer.current_designation !== filters.designation) return false;
    if (filters.timelineQuality !== "all" && officer.timeline_quality !== filters.timelineQuality) return false;
    if (filters.verification !== "all" && officer.verification_flag !== filters.verification) return false;

    if (filters.location !== "all") {
      const location = (officer.current_location ?? "").toLowerCase();
      if (!location.includes(filters.location.toLowerCase())) return false;
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
    if (officer.current_designation) designations.add(officer.current_designation);
    if (officer.current_location) locations.add(officer.current_location);
  }

  return {
    cadres: [...cadres].sort((a, b) => a.localeCompare(b)),
    batches: [...batches].sort((a, b) => Number(a) - Number(b)),
    designations: [...designations].sort((a, b) => a.localeCompare(b)),
    locations: [...locations].sort((a, b) => a.localeCompare(b))
  };
}
