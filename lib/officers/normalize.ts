import type { Officer, OfficerPosting } from "@/lib/officers/types";

export function normalizeSearchText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeCadre(input: string | null | undefined): string {
  if (!input) return "UNKNOWN";
  return input.trim().toUpperCase();
}

export function normalizeLocation(input: string | null | undefined): string | null {
  if (!input) return null;
  const cleaned = input.replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  return cleaned
    .split(" ")
    .map((chunk) => chunk[0]?.toUpperCase() + chunk.slice(1).toLowerCase())
    .join(" ");
}

export function postingDateValue(posting: OfficerPosting): number {
  if (!posting.start_date) return 0;
  const date = new Date(posting.start_date);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

export function sortPostingsChronologically(postings: OfficerPosting[]): OfficerPosting[] {
  return [...postings].sort((left, right) => postingDateValue(left) - postingDateValue(right));
}

export function normalizeOfficer(officer: Officer): Officer {
  return {
    ...officer,
    cadre: normalizeCadre(officer.cadre),
    current_posting: officer.current_posting
      ? {
          ...officer.current_posting,
          location: normalizeLocation(officer.current_posting.location)
        }
      : officer.current_posting,
    posting_history: sortPostingsChronologically(officer.posting_history).map((posting) => ({
      ...posting,
      location: normalizeLocation(posting.location)
    }))
  };
}
