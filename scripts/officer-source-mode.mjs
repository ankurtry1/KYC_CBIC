export const OFFICER_DATA_SOURCE_MODES = [
  "excel-first",
  "text-first",
  "excel-only",
  "text-only"
];

export const DEFAULT_OFFICER_DATA_SOURCE_MODE = "excel-first";

export function resolveOfficerDataSourceMode(rawMode) {
  const normalized = String(rawMode ?? DEFAULT_OFFICER_DATA_SOURCE_MODE)
    .trim()
    .toLowerCase();

  if (OFFICER_DATA_SOURCE_MODES.includes(normalized)) {
    return normalized;
  }

  return DEFAULT_OFFICER_DATA_SOURCE_MODE;
}

export function shouldUseExcel(mode) {
  return mode === "excel-first" || mode === "text-first" || mode === "excel-only";
}

export function shouldUseText(mode) {
  return mode === "excel-first" || mode === "text-first" || mode === "text-only";
}

