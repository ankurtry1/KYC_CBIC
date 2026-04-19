import type { Officer } from "@/lib/officers/types";
import { RANK_LADDER } from "@/lib/officers/derive";
import { sanitizeDisplayLabel, sanitizeDisplayLocation } from "@/lib/officers/normalize";

export type OfficeContextMatch = {
  officer: Officer;
  reason: string;
};

export type OfficerOfficeContext = {
  station: string | null;
  organization: string | null;
  designation: string | null;
  sameStation: OfficeContextMatch[];
  sameOrganization: OfficeContextMatch[];
  nearbyDesignationBand: OfficeContextMatch[];
  reportingLineAvailable: false;
};

type OfficerCurrentContext = {
  station: string | null;
  organization: string | null;
  designation: string | null;
};

type OfficeContextIndex = {
  currentContext: Map<string, OfficerCurrentContext>;
  byStation: Map<string, Officer[]>;
  byOrganization: Map<string, Officer[]>;
  byDesignation: Map<string, Officer[]>;
};

const OFFICE_CONTEXT_INDEX_CACHE = new WeakMap<Map<string, Officer>, OfficeContextIndex>();

function currentStation(officer: Officer): string | null {
  return sanitizeDisplayLocation(officer.current_posting?.station_display ?? officer.current_posting?.location);
}

function currentOrganization(officer: Officer): string | null {
  return sanitizeDisplayLabel(
    officer.current_posting?.organization_display ?? officer.current_posting?.organization_unit_name
  );
}

function currentDesignation(officer: Officer): string | null {
  return sanitizeDisplayLabel(officer.current_designation ?? officer.current_posting?.designation_display);
}

function officerCurrentContext(officer: Officer): OfficerCurrentContext {
  return {
    station: currentStation(officer),
    organization: currentOrganization(officer),
    designation: currentDesignation(officer)
  };
}

function rankDistance(baseDesignation: string | null, candidateDesignation: string | null): number | null {
  if (!baseDesignation || !candidateDesignation) return null;

  const baseIndex = RANK_LADDER.findIndex((rank) => rank === baseDesignation);
  const candidateIndex = RANK_LADDER.findIndex((rank) => rank === candidateDesignation);

  if (baseIndex === -1 || candidateIndex === -1) {
    return baseDesignation === candidateDesignation ? 0 : null;
  }

  return Math.abs(baseIndex - candidateIndex);
}

function compareContextCandidates(
  baseDesignation: string | null,
  currentContextByOfficerId: Map<string, OfficerCurrentContext>
) {
  return (left: Officer, right: Officer): number => {
    const leftVerified = left.verification_flag === "verified" ? 1 : 0;
    const rightVerified = right.verification_flag === "verified" ? 1 : 0;
    if (rightVerified !== leftVerified) return rightVerified - leftVerified;

    const leftDistance = rankDistance(baseDesignation, currentContextByOfficerId.get(left.id)?.designation ?? null);
    const rightDistance = rankDistance(baseDesignation, currentContextByOfficerId.get(right.id)?.designation ?? null);
    if (leftDistance != null && rightDistance != null && leftDistance !== rightDistance) {
      return leftDistance - rightDistance;
    }
    if (leftDistance != null && rightDistance == null) return -1;
    if (leftDistance == null && rightDistance != null) return 1;

    if (right.timeline_entry_count !== left.timeline_entry_count) {
      return right.timeline_entry_count - left.timeline_entry_count;
    }

    return (left.name ?? left.employee_id).localeCompare(right.name ?? right.employee_id);
  };
}

function limitMatches(items: Officer[], reason: string, maxItems: number): OfficeContextMatch[] {
  return items.slice(0, maxItems).map((officer) => ({ officer, reason }));
}

function pushGroupedOfficer(group: Map<string, Officer[]>, key: string | null, officer: Officer): void {
  if (!key) return;
  const existing = group.get(key) ?? [];
  existing.push(officer);
  group.set(key, existing);
}

function getOfficeContextIndex(officersById: Map<string, Officer>): OfficeContextIndex {
  const cached = OFFICE_CONTEXT_INDEX_CACHE.get(officersById);
  if (cached) return cached;

  const currentContext = new Map<string, OfficerCurrentContext>();
  const byStation = new Map<string, Officer[]>();
  const byOrganization = new Map<string, Officer[]>();
  const byDesignation = new Map<string, Officer[]>();

  for (const officer of officersById.values()) {
    const context = officerCurrentContext(officer);
    currentContext.set(officer.id, context);
    pushGroupedOfficer(byStation, context.station, officer);
    pushGroupedOfficer(byOrganization, context.organization, officer);
    pushGroupedOfficer(byDesignation, context.designation, officer);
  }

  const index = {
    currentContext,
    byStation,
    byOrganization,
    byDesignation
  };

  OFFICE_CONTEXT_INDEX_CACHE.set(officersById, index);
  return index;
}

function nearbyDesignationCandidates(
  designation: string | null,
  byDesignation: Map<string, Officer[]>
): Officer[] {
  if (!designation) return [];

  const baseIndex = RANK_LADDER.findIndex((rank) => rank === designation);
  if (baseIndex === -1) {
    return [...(byDesignation.get(designation) ?? [])];
  }

  const allowed: string[] = [];
  for (const offset of [-1, 0, 1]) {
    const rank = RANK_LADDER[baseIndex + offset];
    if (rank) {
      allowed.push(rank);
    }
  }

  return allowed.flatMap((rank) => byDesignation.get(rank) ?? []);
}

export function resolveOfficerOfficeContext(
  officer: Officer,
  officersById: Map<string, Officer>,
  maxItems = 4
): OfficerOfficeContext {
  const index = getOfficeContextIndex(officersById);
  const currentContext = index.currentContext.get(officer.id) ?? officerCurrentContext(officer);
  const { station, organization, designation } = currentContext;
  const compare = compareContextCandidates(designation, index.currentContext);

  const sameStation = (station ? index.byStation.get(station) ?? [] : [])
    .filter((candidate) => candidate.id !== officer.id)
    .sort(compare);

  const sameOrganization = (organization ? index.byOrganization.get(organization) ?? [] : [])
    .filter((candidate) => candidate.id !== officer.id)
    .sort(compare);

  const nearbyDesignationBand = nearbyDesignationCandidates(designation, index.byDesignation)
    .filter((candidate) => {
      if (candidate.id === officer.id) return false;

      const candidateContext = index.currentContext.get(candidate.id);
      const distance = rankDistance(designation, candidateContext?.designation ?? null);
      if (distance == null || distance > 1) return false;

      return (
        candidateContext?.station === station ||
        candidateContext?.organization === organization ||
        distance === 0
      );
    })
    .sort(compare);

  return {
    station,
    organization,
    designation,
    sameStation: limitMatches(sameStation, "Same current station", maxItems),
    sameOrganization: limitMatches(sameOrganization, "Same current organization unit", maxItems),
    nearbyDesignationBand: limitMatches(nearbyDesignationBand, "Nearby current designation band", maxItems),
    reportingLineAvailable: false
  };
}
