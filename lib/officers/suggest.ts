import type { OfficerSuggestionRecord } from "@/lib/officers/types";

export const OFFICER_SUGGESTIONS_ASSET = "/data/officer-suggestions.json";

export async function loadOfficerSuggestions(signal?: AbortSignal): Promise<OfficerSuggestionRecord[]> {
  const response = await fetch(OFFICER_SUGGESTIONS_ASSET, {
    signal,
    cache: "force-cache"
  });

  if (!response.ok) {
    throw new Error(`Failed to load officer suggestions (${response.status})`);
  }

  return (await response.json()) as OfficerSuggestionRecord[];
}
