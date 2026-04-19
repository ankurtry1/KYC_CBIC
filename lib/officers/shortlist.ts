import type { Officer, OfficerIndexRecord } from "@/lib/officers/types";
import { currentPostingSummary, officerDisplayName } from "@/lib/officers/derive";
import { sanitizeDisplayLocation } from "@/lib/officers/normalize";

export const SHORTLIST_STORAGE_KEY = "cbic-officer-shortlist-v1";
export const COMPARE_STORAGE_KEY = "cbic-officer-compare-v1";
export const MAX_COMPARE_OFFICERS = 4;

export type ShortlistEntry = {
  id: string;
  employeeId: string;
  name: string;
  cadre: string | null;
  batch: number | null;
  currentDesignation: string | null;
  currentLocation: string | null;
  verificationFlag: Officer["verification_flag"];
  dataQualityLabel: Officer["data_quality_label"];
  timelineQuality: OfficerIndexRecord["timeline_quality"] | null;
  timelineEntryCount: number;
  uniqueStationCount: number | null;
  mobilityProfile: string | null;
  careerArchetype: string | null;
  currentPostingSummary: string | null;
};

export function createShortlistEntryFromIndex(officer: OfficerIndexRecord): ShortlistEntry {
  return {
    id: officer.id,
    employeeId: officer.employee_id,
    name: officerDisplayName(officer),
    cadre: officer.cadre,
    batch: officer.batch,
    currentDesignation: officer.current_designation,
    currentLocation: sanitizeDisplayLocation(officer.current_location),
    verificationFlag: officer.verification_flag,
    dataQualityLabel: officer.data_quality_label,
    timelineQuality: officer.timeline_quality,
    timelineEntryCount: officer.timeline_entry_count,
    uniqueStationCount: officer.unique_station_count,
    mobilityProfile: officer.mobility_profile,
    careerArchetype: officer.career_archetype,
    currentPostingSummary: officer.current_posting_summary
  };
}

export function createShortlistEntryFromOfficer(officer: Officer): ShortlistEntry {
  return {
    id: officer.id,
    employeeId: officer.employee_id,
    name: officerDisplayName(officer),
    cadre: officer.cadre,
    batch: officer.batch,
    currentDesignation: officer.current_designation,
    currentLocation: sanitizeDisplayLocation(
      officer.current_posting?.station_display ?? officer.current_posting?.location
    ),
    verificationFlag: officer.verification_flag,
    dataQualityLabel: officer.data_quality_label ?? "Needs Review",
    timelineQuality: officer.data_quality?.timeline_quality ?? null,
    timelineEntryCount: officer.timeline_entry_count,
    uniqueStationCount: officer.unique_station_count,
    mobilityProfile: officer.mobility_profile,
    careerArchetype: officer.career_archetype,
    currentPostingSummary: currentPostingSummary(officer)
  };
}

export function buildShortlistSummary(entries: ShortlistEntry[]): string {
  if (entries.length === 0) {
    return "Shortlist is empty.";
  }

  return entries
    .map((entry, index) => {
      const parts = [
        `${index + 1}. ${entry.name} (${entry.employeeId})`,
        entry.currentDesignation,
        entry.currentLocation,
        entry.batch != null ? `Batch ${entry.batch}` : null,
        entry.cadre ? `Cadre ${entry.cadre}` : null,
        entry.currentPostingSummary
      ].filter(Boolean);

      return parts.join(" • ");
    })
    .join("\n");
}
