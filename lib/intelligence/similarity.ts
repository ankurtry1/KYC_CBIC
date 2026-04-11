import type { Officer } from "@/lib/officers/types";
import type { RelatedOfficerCard } from "@/lib/intelligence/types";

export function resolveRelatedOfficers(officer: Officer, officersById: Map<string, Officer>): RelatedOfficerCard[] {
  return officer.related_officers
    .map((entry) => {
      const related = officersById.get(entry.id);
      if (!related) return null;
      return {
        officer: related,
        score: entry.score,
        reason: entry.reason
      };
    })
    .filter((item): item is RelatedOfficerCard => item != null);
}
