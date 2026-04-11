import type { CadreIntelligence } from "@/lib/intelligence/types";

export function cadreInsightLabel(cadre: CadreIntelligence): string {
  if (cadre.average_timeline_entries >= 8) return "Broad documented journeys";
  if (cadre.average_timeline_entries >= 4) return "Mixed depth journeys";
  return "Early-stage documented journeys";
}
