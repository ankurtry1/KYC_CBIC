import type { CareerPathIntelligence } from "@/lib/intelligence/types";

export function topProgressionLabel(paths: CareerPathIntelligence): string {
  const top = paths.common_progressions[0];
  if (!top) return "No dominant progression yet";
  return `${top.key} (${top.count})`;
}
