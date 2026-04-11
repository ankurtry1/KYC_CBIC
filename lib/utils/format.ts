export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
}

export function titleCase(value: string | null | undefined): string {
  if (!value) return "Unknown";

  return value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

export function confidenceLabel(value: number | null | undefined): string {
  if (value == null) return "Unknown";
  if (value >= 0.85) return "High";
  if (value >= 0.7) return "Good";
  if (value >= 0.55) return "Moderate";
  return "Low";
}
