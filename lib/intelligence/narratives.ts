import type { Officer } from "@/lib/officers/types";

export function officerNarrativeTitle(officer: Officer): string {
  if (officer.career_archetype.includes("Leader")) return "Leadership-oriented trajectory";
  if (officer.mobility_profile.includes("High")) return "High-mobility trajectory";
  if (officer.station_diversity_label.includes("Low")) return "Focused service footprint";
  return "Balanced progression narrative";
}
