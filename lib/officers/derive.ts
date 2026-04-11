import type { Officer } from "@/lib/officers/types";
import { normalizeLocation } from "@/lib/officers/normalize";

export const RANK_LADDER = [
  "Assistant Commissioner",
  "Deputy Commissioner",
  "Joint Commissioner",
  "Additional Commissioner",
  "Commissioner",
  "Principal Commissioner",
  "Chief Commissioner",
  "Principal Chief Commissioner"
] as const;

export function officerDisplayName(officer: Officer): string {
  return officer.name?.trim() || `Officer ${officer.employee_id}`;
}

export function timelineRichness(officer: Officer): number {
  return officer.timeline_richness_score ?? officer.posting_history.length;
}

export function serviceLengthLabel(officer: Officer): string {
  if (officer.years_in_service == null) return "Unknown";
  return `${officer.years_in_service.toFixed(1)} years`;
}

export function rankProgressState(officer: Officer): {
  rank: string;
  achieved: boolean;
  isCurrent: boolean;
}[] {
  const achieved = new Set(officer.inferred_rank_progression ?? []);
  const current = officer.current_designation ?? "";

  return RANK_LADDER.map((rank) => ({
    rank,
    achieved: achieved.has(rank),
    isCurrent: rank === current
  }));
}

export function getStationSummary(officer: Officer): {
  station: string;
  postings: number;
  tenureDays: number;
}[] {
  if (officer.station_history && officer.station_history.length > 0) {
    return officer.station_history.map((entry) => ({
      station: normalizeLocation(entry.station) ?? entry.station,
      postings: entry.postings_count,
      tenureDays: entry.known_tenure_days
    }));
  }

  const map = new Map<string, { postings: number; tenureDays: number }>();

  for (const posting of officer.posting_history) {
    const station = normalizeLocation(posting.location);
    if (!station) continue;

    const current = map.get(station) ?? { postings: 0, tenureDays: 0 };
    current.postings += 1;

    if (posting.start_date && posting.end_date) {
      const start = new Date(posting.start_date);
      const end = new Date(posting.end_date);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        current.tenureDays += Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86400000));
      }
    }

    map.set(station, current);
  }

  return [...map.entries()]
    .map(([station, value]) => ({ station, postings: value.postings, tenureDays: value.tenureDays }))
    .sort((left, right) => {
      if (right.postings !== left.postings) return right.postings - left.postings;
      return right.tenureDays - left.tenureDays;
    });
}

export function currentPostingSummary(officer: Officer): string {
  const posting = officer.current_posting;
  if (!posting) return "Current posting not available";

  const parts = [posting.designation, posting.organization_unit_name, posting.location].filter(Boolean);
  if (parts.length === 0) return "Current posting partially inferred";
  return parts.join(" • ");
}

export function hasStrongProfile(officer: Officer): boolean {
  return (officer.data_quality?.timeline_quality ?? "minimal") === "full";
}
