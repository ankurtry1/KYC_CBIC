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

function rankDistance(baseDesignation: string | null, candidateDesignation: string | null): number | null {
  if (!baseDesignation || !candidateDesignation) return null;

  const baseIndex = RANK_LADDER.findIndex((rank) => rank === baseDesignation);
  const candidateIndex = RANK_LADDER.findIndex((rank) => rank === candidateDesignation);

  if (baseIndex === -1 || candidateIndex === -1) {
    return baseDesignation === candidateDesignation ? 0 : null;
  }

  return Math.abs(baseIndex - candidateIndex);
}

function compareContextCandidates(baseDesignation: string | null) {
  return (left: Officer, right: Officer): number => {
    const leftVerified = left.verification_flag === "verified" ? 1 : 0;
    const rightVerified = right.verification_flag === "verified" ? 1 : 0;
    if (rightVerified !== leftVerified) return rightVerified - leftVerified;

    const leftDistance = rankDistance(baseDesignation, currentDesignation(left));
    const rightDistance = rankDistance(baseDesignation, currentDesignation(right));
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

export function resolveOfficerOfficeContext(
  officer: Officer,
  officersById: Map<string, Officer>,
  maxItems = 4
): OfficerOfficeContext {
  const station = currentStation(officer);
  const organization = currentOrganization(officer);
  const designation = currentDesignation(officer);
  const compare = compareContextCandidates(designation);

  const peers = [...officersById.values()].filter((candidate) => candidate.id !== officer.id);

  const sameStation = peers
    .filter((candidate) => currentStation(candidate) === station && station != null)
    .sort(compare);

  const sameOrganization = peers
    .filter((candidate) => currentOrganization(candidate) === organization && organization != null)
    .sort(compare);

  const nearbyDesignationBand = peers
    .filter((candidate) => {
      const distance = rankDistance(designation, currentDesignation(candidate));
      if (distance == null) return false;
      if (distance > 1) return false;

      const candidateStation = currentStation(candidate);
      const candidateOrganization = currentOrganization(candidate);
      return candidateStation === station || candidateOrganization === organization || distance === 0;
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
