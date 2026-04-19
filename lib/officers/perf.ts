const PERF_PREFIX = "[officer-perf]";
const SEARCH_NAV_KEY = "cbic-officer-search-nav";
const PROFILE_NAV_KEY = "cbic-officer-profile-nav";

type PerfPayloadValue = boolean | number | string | null | undefined;
type PerfPayload = Record<string, PerfPayloadValue>;

type NavigationMark = {
  target: string;
  startedAt: number;
};

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

export function isOfficerPerfEnabled(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_OFFICER_PERF === "1";
}

export function nowMs(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }

  return Date.now();
}

function formatPerfValue(value: PerfPayloadValue): string {
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return String(value ?? "");
}

export function logOfficerPerf(label: string, payload: PerfPayload): void {
  if (!isOfficerPerfEnabled()) return;

  const details = Object.entries(payload)
    .filter(([, value]) => value != null)
    .map(([key, value]) => `${key}=${formatPerfValue(value)}`)
    .join(" ");

  const message = details ? `${PERF_PREFIX} ${label} ${details}` : `${PERF_PREFIX} ${label}`;
  console.info(message);
}

function markNavigationStart(storageKey: string, target: string): void {
  if (!hasWindow()) return;

  const mark: NavigationMark = {
    target,
    startedAt: Date.now()
  };

  window.sessionStorage.setItem(storageKey, JSON.stringify(mark));
}

function consumeNavigationMark(storageKey: string, target: string): number | null {
  if (!hasWindow()) return null;

  const rawValue = window.sessionStorage.getItem(storageKey);
  if (!rawValue) return null;

  window.sessionStorage.removeItem(storageKey);

  try {
    const parsed = JSON.parse(rawValue) as NavigationMark;
    if (parsed.target !== target) return null;
    return Date.now() - parsed.startedAt;
  } catch {
    return null;
  }
}

export function markSearchNavigationStart(query: string): void {
  const trimmed = query.trim();
  if (!trimmed) return;
  markNavigationStart(SEARCH_NAV_KEY, trimmed);
}

export function consumeSearchNavigationDuration(query: string): number | null {
  const trimmed = query.trim();
  if (!trimmed) return null;
  return consumeNavigationMark(SEARCH_NAV_KEY, trimmed);
}

export function markProfileNavigationStart(officerId: string): void {
  if (!officerId) return;
  markNavigationStart(PROFILE_NAV_KEY, officerId);
}

export function consumeProfileNavigationDuration(officerId: string): number | null {
  if (!officerId) return null;
  return consumeNavigationMark(PROFILE_NAV_KEY, officerId);
}
