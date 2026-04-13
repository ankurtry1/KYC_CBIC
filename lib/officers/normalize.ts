import type { Officer, OfficerPosting } from "@/lib/officers/types";

const NOISY_LABEL_PATTERNS = [
  /\bw\.?\s*e\.?\s*f\.?\b/i,
  /\bjoining\s+report\b/i,
  /\bjoining\s+time\b/i,
  /\bjoining\b/i,
  /\breport\b/i,
  /\bpromotion\b/i,
  /\bprom\s+as\b/i,
  /\brecd\.?\b/i,
  /\brel\.?\b/i,
  /\b(as\s+per|vide)\b/i,
  /\border\s+no\b/i,
  /\bnotifi(?:cation)?\.?\s*no\b/i,
  /\bf\.?\s*no\.?\b/i,
  /\breport\s+\d{1,4}\/\d{2,4}\b/i,
  /\bentry\s+as\s+per\b/i,
  /^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/i
];

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

export function isNoisyDisplayLabel(input: string | null | undefined): boolean {
  if (!input) return true;
  const cleaned = input.replace(/\s+/g, " ").trim();
  if (!cleaned) return true;
  if (cleaned.length < 3) return true;
  if (!/[a-z]/i.test(cleaned)) return true;
  if (NOISY_LABEL_PATTERNS.some((pattern) => pattern.test(cleaned))) return true;
  if ((cleaned.match(/\d/g) ?? []).length >= Math.ceil(cleaned.length * 0.4)) return true;
  return false;
}

export function sanitizeDisplayLabel(input: string | null | undefined): string | null {
  if (!input) return null;
  const cleaned = normalizeLocation(
    input
      .replace(/[()[\]{}]/g, " ")
      .replace(/\s*,\s*>\s*/g, " ")
      .replace(/[_|]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
  if (!cleaned || isNoisyDisplayLabel(cleaned)) return null;
  return cleaned;
}

export function sanitizeDisplayLocation(input: string | null | undefined): string | null {
  return sanitizeDisplayLabel(input);
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
          designation_display: sanitizeDisplayLabel(
            officer.current_posting.designation_display ?? officer.current_posting.designation
          ),
          organization_display: sanitizeDisplayLabel(
            officer.current_posting.organization_display ?? officer.current_posting.organization_unit_name
          ),
          station_display: sanitizeDisplayLocation(
            officer.current_posting.station_display ?? officer.current_posting.location
          ),
          location: sanitizeDisplayLocation(officer.current_posting.location)
        }
      : officer.current_posting,
    posting_history: sortPostingsChronologically(officer.posting_history).map((posting) => ({
      ...posting,
      designation_display: sanitizeDisplayLabel(posting.designation_display ?? posting.designation),
      organization_display: sanitizeDisplayLabel(
        posting.organization_display ?? posting.organization_unit_name
      ),
      station_display: sanitizeDisplayLocation(posting.station_display ?? posting.location),
      location: sanitizeDisplayLocation(posting.location)
    }))
  };
}
