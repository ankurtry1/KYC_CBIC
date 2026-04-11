import type { Officer } from "@/lib/officers/types";

export function archetypeTone(archetype: string): "broad" | "mobile" | "senior" | "focused" | "mixed" {
  if (archetype.includes("Broad")) return "broad";
  if (archetype.includes("Mobility")) return "mobile";
  if (archetype.includes("Senior")) return "senior";
  if (archetype.includes("Narrow") || archetype.includes("Continuity")) return "focused";
  return "mixed";
}

export function officerArchetypeEvidence(officer: Officer): string[] {
  return [
    `${officer.timeline_entry_count} posting records`,
    `${officer.unique_station_count} unique stations`,
    `${officer.rank_depth_score} rank levels`,
    officer.mobility_profile
  ];
}
