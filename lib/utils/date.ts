export function formatDate(value: string | null | undefined): string {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

export function formatMonthYear(value: string | null | undefined): string {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";

  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    year: "numeric"
  }).format(date);
}

export function formatDateRange(start: string | null | undefined, end: string | null | undefined): string {
  const startLabel = formatMonthYear(start);
  const endLabel = end ? formatMonthYear(end) : "Present";

  if (startLabel === "Unknown" && endLabel === "Present") return "Date not available";
  return `${startLabel} - ${endLabel}`;
}

export function daysToYears(days: number): string {
  if (!days) return "0y";
  const years = days / 365.25;
  return `${years.toFixed(years >= 10 ? 0 : 1)}y`;
}
