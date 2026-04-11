import type { BatchIntelligence } from "@/lib/intelligence/types";

export function batchQuickBadge(batch: BatchIntelligence): string {
  if (batch.average_timeline_entries >= 8) return "Deep trajectories";
  if (batch.average_timeline_entries >= 5) return "Balanced trajectories";
  return "Emerging trajectories";
}
