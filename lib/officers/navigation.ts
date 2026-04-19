import type { Route } from "next";
import { sanitizeDisplayLocation } from "@/lib/officers/normalize";

const STATION_SLUG_ALIASES: Record<string, string> = {
  bengaluru: "bangalore"
};

function slugifySegment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function stationSlugFromLocation(value: string | null | undefined): string | null {
  const location = sanitizeDisplayLocation(value);
  if (!location) return null;

  const slug = slugifySegment(location);
  return STATION_SLUG_ALIASES[slug] ?? slug;
}

export function stationHrefFromLocation(value: string | null | undefined): Route | null {
  const slug = stationSlugFromLocation(value);
  return slug ? (`/stations/${slug}` as Route) : null;
}

export function sanitizeReturnTo(value: string | null | undefined): Route | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) return null;
  if (trimmed.startsWith("//")) return null;
  return trimmed as Route;
}

export function appendReturnTo(href: string, returnTo?: string | null): Route {
  const safeReturnTo = sanitizeReturnTo(returnTo);
  if (!safeReturnTo) return href as Route;

  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}from=${encodeURIComponent(safeReturnTo)}` as Route;
}

export function buildOfficerProfileHref(id: string, returnTo?: string | null): Route {
  return appendReturnTo(`/officers/${id}`, returnTo);
}

export function returnToLabel(returnTo: string | null): string {
  if (!returnTo) return "Back to directory";
  if (returnTo.startsWith("/officers?")) return "Back to results";
  if (returnTo.startsWith("/stations/")) return "Back to station context";
  if (returnTo.startsWith("/batches/")) return "Back to batch context";
  if (returnTo.startsWith("/cadres/")) return "Back to cadre context";
  if (returnTo.startsWith("/compare")) return "Back to compare";
  if (returnTo.startsWith("/learn")) return "Back to learning mode";
  if (returnTo.startsWith("/discover")) return "Back to discovery";
  return "Back";
}
