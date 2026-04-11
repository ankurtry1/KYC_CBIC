import type { StationIntelligence } from "@/lib/intelligence/types";

export function stationImportanceColor(label: StationIntelligence["importance_label"]): string {
  if (label.includes("Major")) return "text-rose-700 bg-rose-50 border-rose-200";
  if (label.includes("High")) return "text-amber-700 bg-amber-50 border-amber-200";
  if (label.includes("Active")) return "text-sky-700 bg-sky-50 border-sky-200";
  return "text-slate-700 bg-slate-50 border-slate-200";
}
