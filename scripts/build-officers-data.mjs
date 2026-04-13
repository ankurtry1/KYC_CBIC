import fs from "node:fs";
import path from "node:path";
import { importOfficersMetadataXlsx } from "./import-officers-metadata-xlsx.mjs";
import {
  resolveOfficerDataSourceMode,
  shouldUseExcel
} from "./officer-source-mode.mjs";

const ROOT = process.cwd();
const TEXT_DIR = path.join(ROOT, "tmp", "pdfs", "text");
const DATA_DIR = path.join(ROOT, "data");

const DATE_PATTERN = /(\d{1,2}\/\d{1,2}\/\d{4})/g;
const DATE_PAIR_PATTERN = /(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}\/\d{1,2}\/\d{4})/;
const EMPLOYEE_PATTERN = /Employee Information\s*-\s*(\d+)/g;

const RANK_LADDER = [
  "Assistant Commissioner",
  "Deputy Commissioner",
  "Joint Commissioner",
  "Additional Commissioner",
  "Commissioner",
  "Principal Commissioner",
  "Chief Commissioner",
  "Principal Chief Commissioner"
];

const CADRE_EXPLANATIONS = {
  DR: "Direct recruit officer journeys with broad foundational exposure.",
  PA: "Promotee from Appraiser with mixed field and administrative pathways.",
  PC: "Promotee from Customs/Preventive with customs-heavy institutional context.",
  PE: "Promotee from Central Excise with strong operational continuity patterns."
};

const NOISY_LABEL_PATTERNS = [
  /\bw\.?\s*e\.?\s*f\.?\b/i,
  /\bjoining\s+report\b/i,
  /\bjoining\s+time\b/i,
  /\bjoining\b/i,
  /\breport\b/i,
  /\brecd\.?\b/i,
  /\brel\.?\b/i,
  /\bpromotion\b/i,
  /\bprom(?:\.|oted?)?\s+as\b/i,
  /\b(as\s+per|vide)\b/i,
  /\border\s+no\b/i,
  /\bnotifi(?:cation)?\.?\s*no\b/i,
  /\bf\.?\s*no\.?\b/i,
  /\breport\s+\d{1,4}\/\d{2,4}\b/i,
  /\bentry\s+as\s+per\b/i,
  /\bnot\s+verified\b/i,
  /^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/i
];

const JUNK_SEGMENT_EXACT = new Set([
  "WEF",
  "W.E.F",
  "W.E.F.",
  "PROMOTION",
  "JOINING REPORT",
  "JOINING TIME",
  "ORDER NO",
  "ORDER NO.",
  "NOTIFICATION",
  "NOTIF",
  "NOTIFI",
  "F.NO",
  "REPORT",
  "AS PER",
  "VIDE"
]);

const ORGANIZATION_SHORT_NAMES = [
  "DGGI",
  "DRI",
  "NACIN",
  "NACEN",
  "CCO",
  "CBIC",
  "BOARD",
  "DGPM",
  "DOP",
  "DLA",
  "DGHRD"
];

const TITLE_JUNK_PATTERN =
  /\b(recd\.?|joining|report|vide|as\s+per|wef|order\s+no|no\.\s*\d+\/\d+|lr\b|rel\.?)\b/i;

function listTextFiles() {
  if (!fs.existsSync(TEXT_DIR)) return [];
  return fs
    .readdirSync(TEXT_DIR)
    .filter((name) => name.endsWith(".txt"))
    .sort((a, b) => a.localeCompare(b));
}

function normalizeSpaces(value) {
  return value.replace(/\s+/g, " ").trim();
}

function titleCase(value) {
  return value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function parseDmy(value) {
  if (!value) return null;
  const [day, month, year] = value.split("/").map((n) => Number(n));
  if (!day || !month || !year) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function toIsoDate(value) {
  const parsed = parseDmy(value);
  if (!parsed) return null;
  return parsed.toISOString().slice(0, 10);
}

function normalizeName(value) {
  if (!value) return null;
  return normalizeSpaces(
    value
      .replace(/\([^)]*\)/g, "")
      .replace(/\b(Mr|Mrs|Ms|Dr|Shri|Smt)\.?\b/gi, "")
      .replace(/[^A-Za-z ]/g, " ")
      .toUpperCase()
  );
}

function normalizeCadre(value) {
  if (!value) return null;
  return value.trim().toUpperCase();
}

function isNoisyLabel(value) {
  if (!value) return true;
  const cleaned = normalizeSpaces(value);
  if (!cleaned) return true;
  if (cleaned.length < 3) return true;
  if (!/[a-z]/i.test(cleaned)) return true;
  if (NOISY_LABEL_PATTERNS.some((pattern) => pattern.test(cleaned))) return true;
  if (JUNK_SEGMENT_EXACT.has(cleaned.toUpperCase())) return true;

  const digitCount = (cleaned.match(/\d/g) ?? []).length;
  if (digitCount >= Math.ceil(cleaned.length * 0.45)) return true;
  return false;
}

function cleanSegment(value) {
  if (!value) return null;
  const cleaned = normalizeSpaces(
    value
      .replace(/[()[\]{}]/g, " ")
      .replace(/[|_]/g, " ")
      .replace(/\b(?:dt|lr|l\.r)\.?\b/gi, " ")
  );

  if (!cleaned) return null;
  if (isNoisyLabel(cleaned)) return null;
  return cleaned;
}

function displayCase(value) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => (/^[A-Z0-9]{2,5}$/.test(part) ? part : `${part[0].toUpperCase()}${part.slice(1).toLowerCase()}`))
    .join(" ");
}

function sanitizeOrganizationUnit(value) {
  if (!value) return null;
  const segments = value
    .split(">")
    .map((segment) => cleanSegment(segment))
    .filter(Boolean);

  if (segments.length === 0) return null;
  return segments.slice(0, 2).map(displayCase).join(" > ");
}

function sanitizeDesignation(value) {
  if (!value) return null;
  const canonical = canonicalDesignation(value);
  if (!canonical) return null;
  if (isNoisyLabel(canonical)) return null;
  return canonical;
}

function normalizeStation(value) {
  if (!value) return null;
  const cleaned = cleanSegment(value.replace(/[()]/g, " "));
  if (!cleaned) return null;
  if (isNoisyLabel(cleaned)) return null;
  return displayCase(titleCase(cleaned));
}

function canonicalDesignation(value) {
  if (!value) return null;
  const normalized = normalizeSpaces(value);
  const source = normalized.toLowerCase();

  if (/(principal\s+chief\s+commissioner|\bpcc\b)/i.test(source)) return "Principal Chief Commissioner";
  if (/(chief\s+commissioner|\bcc\b)/i.test(source)) return "Chief Commissioner";
  if (/(principal\s+commissioner|\bpr\.?\s*commissioner\b|\bpc\b)/i.test(source)) return "Principal Commissioner";
  if (/(additional\s+commissioner|\baddl\.?\b|\badc\b)/i.test(source)) return "Additional Commissioner";
  if (/(joint\s+commissioner|\bjt\.?\b|\bjc\b)/i.test(source)) return "Joint Commissioner";
  if (/(deputy\s+commissioner|\bdy\.?\b|\bdc\b)/i.test(source)) return "Deputy Commissioner";
  if (/(assistant\s+commissioner|\basst\.?\b|\bac\b)/i.test(source)) return "Assistant Commissioner";
  if (/\bcommissioner\b/i.test(source)) return "Commissioner";

  const cleaned = normalizeSpaces(
    normalized
      .replace(/\b(?:prom\.?|promotion|wef|vide|as\s+per|order\s+no|joining|report|recd\.?|lr|rel\.?)\b/gi, " ")
      .replace(/\b\d{1,4}\/\d{2,4}\b/g, " ")
      .replace(/\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/g, " ")
  );

  if (!cleaned) return null;
  if (/^(chief|directorate|commissionrate|commissionerate)$/i.test(cleaned)) return null;
  return cleaned;
}

function safeExtract(block, regex) {
  const match = block.match(regex);
  if (!match) return null;
  return normalizeSpaces(match[1]);
}

function isPostingNoise(line) {
  const compact = normalizeSpaces(line).toLowerCase();
  if (!compact) return true;

  const noiseFragments = [
    "go to home page",
    "go to main search",
    "logout",
    "posting details",
    "rank held",
    "designation",
    "fromdate",
    "todate",
    "employee information",
    "total no of records",
    "sl.no",
    "name of organisation",
    "no.of years",
    "total :"
  ];

  return noiseFragments.some((fragment) => compact.includes(fragment));
}

function parsePrefixCells(prefix) {
  const cells = prefix
    .split(/\s{2,}/)
    .map((value) => normalizeSpaces(value))
    .filter(Boolean);

  if (cells.length === 0) {
    return {
      rankHeld: null,
      designation: null,
      chiefZone: null,
      orgUnit: null,
      station: null
    };
  }

  let rankHeld = null;
  let designation = null;
  let chiefZone = null;
  let orgUnit = null;
  let station = null;

  if (cells.length >= 5) {
    rankHeld = cells[0] ?? null;
    designation = cells[1] ?? null;
    chiefZone = cells[cells.length - 3] ?? null;
    orgUnit = cells[cells.length - 2] ?? null;
    station = cells[cells.length - 1] ?? null;
  } else if (cells.length === 4) {
    rankHeld = cells[0] ?? null;
    designation = cells[1] ?? null;
    orgUnit = cells[2] ?? null;
    station = cells[3] ?? null;
  } else if (cells.length === 3) {
    rankHeld = cells[0] ?? null;
    designation = cells[0] ?? null;
    orgUnit = cells[1] ?? null;
    station = cells[2] ?? null;
  } else if (cells.length === 2) {
    designation = cells[0] ?? null;
    station = cells[1] ?? null;
  } else {
    designation = cells[0] ?? null;
  }

  const rawPrefix = normalizeSpaces(prefix);

  if (!station) {
    const match = rawPrefix.match(/([A-Za-z][A-Za-z .,&()\/-]{2,})$/);
    if (match) station = normalizeSpaces(match[1]);
  }

  if (!designation) {
    designation = rawPrefix || null;
  }

  if (station && station.length > 48) {
    station = station.slice(0, 48);
  }

  return { rankHeld, designation, chiefZone, orgUnit, station };
}

function extractDateTokens(input) {
  return [...input.matchAll(DATE_PATTERN)].map((match) => ({
    value: match[1],
    index: match.index ?? -1
  }));
}

function stripAdministrativeFragments(input) {
  if (!input) return "";
  return normalizeSpaces(
    input
      .replace(/\b(?:vide|as\s+per|wef|order\s+no|no\.?|lr|l\.r|rel\.?|report|joining|recd\.?)\b/gi, " ")
      .replace(/\b\d{1,4}\/\d{2,4}\b/g, " ")
      .replace(/\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/g, " ")
      .replace(/[,:;]+/g, " ")
  );
}

function dedupeConsecutiveWords(input) {
  const words = input.split(/\s+/).filter(Boolean);
  const deduped = [];
  for (const word of words) {
    if (deduped.length === 0 || deduped[deduped.length - 1].toLowerCase() !== word.toLowerCase()) {
      deduped.push(word);
    }
  }
  return deduped.join(" ");
}

function sanitizeOrganizationDisplay(input) {
  if (!input) return null;

  const normalized = normalizeSpaces(
    input
      .replace(/\s*,\s*>\s*/g, " > ")
      .replace(/\s*>\s*/g, " > ")
      .replace(/\b(GST\s*&\s*CX)\s+ZONE\s+\1\b/gi, "$1 Zone")
      .replace(/\b(GST\s*&\s*CX)\s+\1\b/gi, "$1")
      .replace(/\b([A-Z]*GST\s*&\s*CX)\s+GST\s*&\s*CX\s+ZONE\b/gi, "$1 Zone")
      .replace(/\b([A-Z]*GST\s*&\s*CX)\s+GST\s*&\s*CX\b/gi, "$1")
  );

  const segments = normalized
    .split(">")
    .map((segment) => dedupeConsecutiveWords(stripAdministrativeFragments(segment)))
    .map((segment) =>
      normalizeSpaces(
        segment.replace(/\b(?:assistant|deputy|joint|additional|principal|chief)\s+commissioner\b/gi, " ")
      )
    )
    .map((segment) => normalizeSpaces(segment.replace(/\bcommissioner\b/gi, " ")))
    .map((segment) => cleanSegment(segment))
    .filter(Boolean)
    .map((segment) => displayCase(segment));

  const uniqueSegments = [];
  for (const segment of segments) {
    if (!uniqueSegments.some((existing) => existing.toLowerCase() === segment.toLowerCase())) {
      uniqueSegments.push(segment);
    }
  }

  if (uniqueSegments.length === 0) return null;

  const joined = uniqueSegments.slice(0, 2).join(" > ");
  if (isNoisyLabel(joined)) return null;
  return joined;
}

function isLikelyDesignationFragment(value) {
  const compact = normalizeSpaces(value).toLowerCase();
  if (!compact) return true;
  if (canonicalDesignation(compact) && RANK_LADDER.includes(canonicalDesignation(compact))) return true;
  return /\b(ac|dc|jc|adc|asst|dy\.?|prom\.?|promotion|wef|lr|o\/o|dt|vide)\b/i.test(compact);
}

function isLikelyOrganizationFragment(value) {
  const compact = normalizeSpaces(value);
  if (!compact) return false;
  const upper = compact.toUpperCase();

  if (ORGANIZATION_SHORT_NAMES.some((token) => upper.includes(token))) return true;
  return /\b(gst|cx|customs|zone|directorate|commissionerate|nacin|nacen|dggi|dri|cco|board)\b/i.test(compact);
}

function deriveStationRaw(cells) {
  for (let i = cells.length - 1; i >= 0; i -= 1) {
    const candidate = normalizeSpaces(cells[i]);
    if (!candidate) continue;
    if (isLikelyDesignationFragment(candidate)) continue;
    if (ORGANIZATION_SHORT_NAMES.includes(candidate.toUpperCase())) continue;
    if (isNoisyLabel(candidate)) continue;
    return candidate;
  }
  return null;
}

function deriveOrganizationFromContext(context, stationDisplay) {
  const compact = normalizeSpaces(context);
  const upper = compact.toUpperCase();
  const genericPrefixes = new Set(["ZONE", "GST", "CX", "GST & CX", "GST & CX ZONE", "COMMISSIONER"]);

  for (const shortName of ORGANIZATION_SHORT_NAMES) {
    if (upper.includes(shortName)) {
      return shortName === "BOARD" ? "Board" : shortName;
    }
  }

  const gstZoneMatch =
    compact.match(/\b([A-Z]{3,}(?:\s+[A-Z]{3,}){0,2})\s+GST\s*&\s*CX\s+ZONE\b/) ??
    compact.match(/\b([A-Z][A-Z .,&/-]{2,}?)\s+GST\s*&\s*CX\s+ZONE\b/i);
  if (gstZoneMatch) {
    const prefix = normalizeSpaces(gstZoneMatch[1]).toUpperCase();
    if (!genericPrefixes.has(prefix)) {
      return sanitizeOrganizationDisplay(`${gstZoneMatch[1]} GST & CX Zone`);
    }
  }

  const gstMatch =
    compact.match(/\b([A-Z]{3,}(?:\s+[A-Z]{3,}){0,2})\s+GST\s*&\s*CX\b/) ??
    compact.match(/\b([A-Z][A-Z .,&/-]{2,}?)\s+GST\s*&\s*CX\b/i);
  if (gstMatch) {
    const prefix = normalizeSpaces(gstMatch[1]).toUpperCase();
    if (!genericPrefixes.has(prefix)) {
      return sanitizeOrganizationDisplay(`${gstMatch[1]} GST & CX`);
    }
  }

  if (/\bGST\s*&\s*CX\s+ZONE\b/i.test(compact) && stationDisplay) {
    return sanitizeOrganizationDisplay(`${stationDisplay} GST & CX Zone`);
  }

  if (/\bGST\s*&\s*CX\b/i.test(compact) && stationDisplay) {
    return sanitizeOrganizationDisplay(`${stationDisplay} GST & CX`);
  }

  return null;
}

function detectRankFromContext(value) {
  if (!value) return null;
  const source = normalizeSpaces(value).toLowerCase();

  if (/(principal\s+chief\s+commissioner|\bpcc\b)/i.test(source)) return "Principal Chief Commissioner";
  if (/(chief\b[\s\S]{0,80}\bcommissioner|\bcc\b)/i.test(source)) return "Chief Commissioner";
  if (/(principal\b[\s\S]{0,80}\bcommissioner|\bpc\b)/i.test(source)) return "Principal Commissioner";
  if (/(additional\b[\s\S]{0,80}\bcommissioner|\baddl\.?\b|\badc\b)/i.test(source)) return "Additional Commissioner";
  if (/(joint\b[\s\S]{0,80}\bcommissioner|\bjt\.?\b|\bjc\b)/i.test(source)) return "Joint Commissioner";
  if (/(deputy\b[\s\S]{0,80}\bcommissioner|\bdy\.?\b|\bdc\b)/i.test(source)) return "Deputy Commissioner";
  if (/(assistant\b[\s\S]{0,80}\bcommissioner|\basst\.?\b|\bac\b)/i.test(source)) return "Assistant Commissioner";
  if (/\bcommissioner\b/i.test(source)) return "Commissioner";

  return null;
}

function derivePostingRole({ rankHint, designationHint, context }) {
  const rankFromHint = detectRankFromContext(rankHint) ?? sanitizeDesignation(rankHint);
  if (rankFromHint && RANK_LADDER.includes(rankFromHint)) {
    return {
      rankHeldRaw: rankHint ?? null,
      designationRaw: designationHint ?? rankHint ?? null,
      designationDisplay: rankFromHint
    };
  }

  const designationFromHint = sanitizeDesignation(designationHint);
  if (designationFromHint && RANK_LADDER.includes(designationFromHint)) {
    return {
      rankHeldRaw: rankHint ?? null,
      designationRaw: designationHint ?? null,
      designationDisplay: designationFromHint
    };
  }

  const designationFromContext = detectRankFromContext(context) ?? sanitizeDesignation(context);
  if (designationFromContext && RANK_LADDER.includes(designationFromContext)) {
    return {
      rankHeldRaw: rankHint ?? null,
      designationRaw: designationHint ?? null,
      designationDisplay: designationFromContext
    };
  }

  return {
    rankHeldRaw: rankHint ?? null,
    designationRaw: designationHint ?? null,
    designationDisplay: null
  };
}

function sanitizeRemarks(input) {
  if (!input) return null;
  const cleaned = normalizeSpaces(
    input
      .replace(/\b(?:joining|report|recd\.?|rel\.?|as\s+per|vide|wef|lr|dl)\b/gi, " ")
      .replace(/[,:;.-]+$/g, "")
  );
  if (!cleaned) return null;
  if (TITLE_JUNK_PATTERN.test(cleaned)) return null;
  if (isNoisyLabel(cleaned)) return null;
  return cleaned;
}

function extractMetadataFromSuffix(suffix, overflowDates, context) {
  const orderNoMatch = suffix.match(/\b\d{1,4}\/\d{2,4}\b/);
  const orderDateRaw = overflowDates.find((token) => Boolean(toIsoDate(token.value)))?.value ?? null;

  const remarksRaw = normalizeSpaces(
    suffix
      .replace(orderNoMatch?.[0] ?? "", " ")
      .replace(orderDateRaw ?? "", " ")
  ) || null;

  const additionalChargeMatch = `${context} ${suffix}`.match(
    /\b(addl\.?\s*charge[^.]*|additional\s+charge[^.]*|to\s+work\s+in[^.]*|with\s+addl\s+charge[^.]*)/i
  );

  return {
    remarks_raw: remarksRaw,
    remarks_display: sanitizeRemarks(remarksRaw),
    order_no: orderNoMatch?.[0] ?? null,
    order_date: toIsoDate(orderDateRaw),
    additional_charge_raw: additionalChargeMatch ? normalizeSpaces(additionalChargeMatch[1]) : null
  };
}

function parsePostingRows(block, employeeId, sourceDoc) {
  const detailsStart = block.indexOf("POSTING DETAILS");
  if (detailsStart === -1) return [];

  let section = block.slice(detailsStart);
  const exemptionAt = section.indexOf("EXEMPTION");
  if (exemptionAt !== -1) section = section.slice(0, exemptionAt);

  const lines = section
    .replace(/\f/g, "\n")
    .split(/\r?\n/)
    .map((line) => line.replace(/\t/g, "    "));

  const rows = [];

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    if (!rawLine?.trim()) continue;
    if (isPostingNoise(rawLine)) continue;
    if (!/\d{1,2}\/\d{1,2}\/\d{4}/.test(rawLine)) continue;

    const line = rawLine;
    const dateTokens = extractDateTokens(line);
    if (dateTokens.length === 0) continue;

    const pairMatch = line.match(DATE_PAIR_PATTERN);
    const fromToken = pairMatch?.[1] ?? dateTokens[0]?.value ?? null;
    const toToken = pairMatch?.[2] ?? null;
    const fromIso = toIsoDate(fromToken);
    const toIso = toIsoDate(toToken);
    if (!fromIso) continue;

    const fromIndex = line.indexOf(fromToken);
    const toIndex = toToken ? line.indexOf(toToken, fromIndex + fromToken.length) : -1;
    const prefix = line.slice(0, Math.max(0, fromIndex));
    const suffix = normalizeSpaces(
      line.slice(toIndex !== -1 ? toIndex + toToken.length : fromIndex + fromToken.length)
    );

    const prefixCells = prefix
      .split(/\s{2,}/)
      .map((cell) => normalizeSpaces(cell))
      .filter(Boolean);

    const stationRaw = deriveStationRaw(prefixCells);
    const stationDisplay = normalizeStation(stationRaw);
    const contextWindow = normalizeSpaces(
      lines
        .slice(Math.max(0, index - 2), Math.min(lines.length, index + 3))
        .join(" ")
    );

    const candidateDesignation = prefixCells.find((cell) => !isLikelyOrganizationFragment(cell)) ?? null;
    const chiefCommissionerateRaw =
      prefixCells.find((cell) => /\bzone\b/i.test(cell) && /\b(gst|cx|customs|commissionerate)\b/i.test(cell)) ??
      null;
    const role = derivePostingRole({
      rankHint: contextWindow,
      designationHint: candidateDesignation,
      context: contextWindow
    });

    const organizationCells = prefixCells.filter((cell) => {
      if (!cell) return false;
      if (stationRaw && normalizeSpaces(cell).toLowerCase() === stationRaw.toLowerCase()) return false;
      if (isLikelyDesignationFragment(cell)) return false;
      return !isNoisyLabel(cell);
    });

    const organizationFromCells = organizationCells.length > 0 ? organizationCells.join(" > ") : null;
    const organizationDisplay =
      sanitizeOrganizationDisplay(organizationFromCells) ??
      deriveOrganizationFromContext(contextWindow, stationDisplay) ??
      null;

    const overflowDates = pairMatch ? dateTokens.slice(2) : dateTokens.slice(1);
    const metadata = extractMetadataFromSuffix(suffix, overflowDates, contextWindow);

    const designationDisplay = role.designationDisplay ?? sanitizeDesignation(candidateDesignation) ?? null;
    const rankDisplay = detectRankFromContext(role.rankHeldRaw) ?? designationDisplay;

    if (!designationDisplay && !rankDisplay && !organizationDisplay && !stationDisplay) continue;

    const confidence =
      fromIso && toIso && designationDisplay && organizationDisplay && stationDisplay
        ? 0.9
        : fromIso && designationDisplay && (organizationDisplay || stationDisplay)
          ? 0.78
          : fromIso && (designationDisplay || organizationDisplay || stationDisplay)
            ? 0.64
            : 0.46;

    rows.push({
      posting_id: `post-${employeeId}-${rows.length + 1}`,
      rank_held_raw: role.rankHeldRaw,
      designation_raw: candidateDesignation,
      designation_display: designationDisplay,
      designation: designationDisplay,
      rank_held: rankDisplay,
      chief_commissionerate_raw: chiefCommissionerateRaw,
      organization_raw: organizationFromCells,
      organization_display: organizationDisplay,
      organization_unit_id: organizationDisplay ? `org-${slugify(organizationDisplay)}` : null,
      organization_unit_name: organizationDisplay,
      station_raw: stationRaw,
      station_display: stationDisplay,
      location: stationDisplay,
      from_date: fromIso,
      to_date: toIso,
      start_date: fromIso,
      end_date: toIso,
      remarks_raw: metadata.remarks_raw,
      remarks_display: metadata.remarks_display,
      order_no: metadata.order_no,
      order_date: metadata.order_date,
      additional_charge_raw: metadata.additional_charge_raw,
      source_doc: sourceDoc,
      source_type: "text",
      confidence
    });
  }

  const unique = [];
  const seen = new Set();

  for (const row of rows) {
    const key = [
      row.start_date ?? "",
      row.end_date ?? "",
      row.designation ?? "",
      row.location ?? "",
      row.organization_unit_name ?? ""
    ].join("|");

    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(row);
  }

  unique.sort((a, b) => {
    const left = a.start_date ? new Date(a.start_date).getTime() : 0;
    const right = b.start_date ? new Date(b.start_date).getTime() : 0;
    return left - right;
  });

  return unique;
}

function inferRankProgression(postingHistory, currentDesignation) {
  const ranks = new Set();

  for (const posting of postingHistory) {
    const label = posting.rank_held ?? posting.designation;
    const canonical = canonicalDesignation(label ?? "");
    if (RANK_LADDER.includes(canonical)) ranks.add(canonical);
  }

  const current = canonicalDesignation(currentDesignation ?? "");
  if (RANK_LADDER.includes(current)) ranks.add(current);

  return RANK_LADDER.filter((rank) => ranks.has(rank));
}

function inferSpecialization(postingHistory) {
  const text = postingHistory
    .map((posting) => `${posting.designation ?? ""} ${posting.organization_unit_name ?? ""}`)
    .join(" ")
    .toLowerCase();

  const tags = [];

  if (text.includes("audit")) tags.push("Audit");
  if (text.includes("vigilance")) tags.push("Vigilance");
  if (text.includes("dri") || text.includes("intelligence")) tags.push("Intelligence");
  if (text.includes("legal") || text.includes("prosecution")) tags.push("Legal");
  if (text.includes("gst")) tags.push("GST");
  if (text.includes("custom") || text.includes("cus.")) tags.push("Customs");
  if (text.includes("preventive") || text.includes("prev.")) tags.push("Preventive");
  if (text.includes("deputation")) tags.push("Deputation");

  return tags.slice(0, 4);
}

function deriveTimelineQuality(postingCount) {
  if (postingCount >= 8) return "full";
  if (postingCount >= 1) return "partial";
  return "minimal";
}

function deriveStationHistory(postingHistory) {
  const byStation = new Map();

  for (const posting of postingHistory) {
    if (!posting.location) continue;

    const key = normalizeSpaces(posting.location.toUpperCase());
    const start = posting.start_date ? new Date(posting.start_date) : null;
    const end = posting.end_date ? new Date(posting.end_date) : null;
    const knownDays = start && end ? Math.max(0, Math.floor((end - start) / 86400000)) : 0;

    const existing = byStation.get(key) ?? {
      station: normalizeStation(posting.location) ?? posting.location,
      postings_count: 0,
      known_tenure_days: 0
    };

    existing.postings_count += 1;
    existing.known_tenure_days += knownDays;

    byStation.set(key, existing);
  }

  return [...byStation.values()].sort((a, b) => {
    if (b.postings_count !== a.postings_count) return b.postings_count - a.postings_count;
    return b.known_tenure_days - a.known_tenure_days;
  });
}

function deriveQualityLabel(dataQuality) {
  let score = 100;

  if ((dataQuality.missing_fields?.length ?? 0) > 0) score -= 25;
  if (dataQuality.timeline_quality === "minimal") score -= 35;
  if (dataQuality.timeline_quality === "partial") score -= 15;
  if ((dataQuality.warnings?.length ?? 0) > 0) score -= 20;

  if (score >= 80) return "Strong";
  if (score >= 60) return "Moderate";
  if (score >= 40) return "Partial";
  return "Needs Review";
}

function yearsBetween(fromDate, toDate) {
  if (!fromDate || !toDate) return null;
  const left = new Date(fromDate).getTime();
  const right = new Date(toDate).getTime();
  if (Number.isNaN(left) || Number.isNaN(right) || right < left) return null;
  return Number(((right - left) / (1000 * 60 * 60 * 24 * 365.25)).toFixed(1));
}

function deriveKnownServiceSpanYears(postingHistory) {
  if (postingHistory.length === 0) return null;

  const starts = postingHistory
    .map((posting) => posting.start_date)
    .filter(Boolean)
    .map((date) => new Date(date).getTime())
    .filter((value) => !Number.isNaN(value));

  const ends = postingHistory
    .map((posting) => posting.end_date ?? posting.start_date)
    .filter(Boolean)
    .map((date) => new Date(date).getTime())
    .filter((value) => !Number.isNaN(value));

  if (starts.length === 0 || ends.length === 0) return null;

  const minStart = Math.min(...starts);
  const maxEnd = Math.max(...ends);
  if (maxEnd < minStart) return null;

  return Number(((maxEnd - minStart) / (1000 * 60 * 60 * 24 * 365.25)).toFixed(1));
}

function deriveMobilityProfile(postingCount, uniqueStations) {
  if (postingCount >= 12 || uniqueStations >= 7) return "High mobility";
  if (postingCount >= 6 || uniqueStations >= 4) return "Moderate mobility";
  return "Low known mobility";
}

function deriveStationDiversityLabel(uniqueStations) {
  if (uniqueStations >= 8) return "High station diversity";
  if (uniqueStations >= 4) return "Moderate station diversity";
  if (uniqueStations >= 1) return "Low station diversity";
  return "Station data limited";
}

function deriveExposureBreadthLabel(postingCount, uniqueStations, rankDepth) {
  if (postingCount >= 10 && uniqueStations >= 6 && rankDepth >= 4) return "Broad exposure";
  if (postingCount >= 6 && uniqueStations >= 3 && rankDepth >= 3) return "Balanced exposure";
  if (postingCount >= 3) return "Focused exposure";
  return "Emerging exposure";
}

function deriveArchetype({ postingCount, uniqueStations, rankDepth, yearsToCurrentRank, currentDesignation, knownServiceSpanYears }) {
  const isSenior = ["Commissioner", "Principal Commissioner", "Chief Commissioner", "Principal Chief Commissioner"].includes(currentDesignation ?? "");

  if (isSenior && postingCount >= 15 && uniqueStations >= 7) {
    return {
      archetype: "Broad Multi-Station Leader",
      reason: "High posting depth across many stations with senior-rank progression."
    };
  }

  if (postingCount >= 12 && uniqueStations >= 8) {
    return {
      archetype: "High-Mobility Officer",
      reason: "Known data shows frequent movement and broad station exposure."
    };
  }

  if (isSenior && knownServiceSpanYears != null && knownServiceSpanYears >= 15) {
    return {
      archetype: "Deep Senior Leadership Track",
      reason: "Sustained service span with strong senior leadership continuity."
    };
  }

  if (postingCount >= 8 && uniqueStations <= 3) {
    return {
      archetype: "Narrow but Deep Service Track",
      reason: "Dense posting history concentrated across a smaller station footprint."
    };
  }

  if (rankDepth >= 4 && postingCount >= 7) {
    return {
      archetype: "Field-Heavy Trajectory",
      reason: "Progression reflects broad on-ground journey with sustained field movement."
    };
  }

  if (yearsToCurrentRank != null && yearsToCurrentRank <= 6 && rankDepth >= 2) {
    return {
      archetype: "Emerging Leader Path",
      reason: "Early-to-mid career progression shows accelerated movement through ranks."
    };
  }

  if (postingCount >= 5 && uniqueStations >= 3) {
    return {
      archetype: "Mixed Exposure Profile",
      reason: "Balanced combination of station movement and role progression."
    };
  }

  return {
    archetype: "Administrative Continuity Profile",
    reason: "Known records suggest stable continuity with focused movement patterns."
  };
}

function deriveNarrativeSummary({ name, mobilityProfile, stationDiversityLabel, archetype, currentDesignation, postingCount }) {
  const subject = name ? `This officer` : `This profile`;

  if (archetype === "Broad Multi-Station Leader") {
    return `${subject} shows a broad, high-depth journey with multi-station leadership progression into senior roles.`;
  }

  if (archetype === "High-Mobility Officer") {
    return `${subject} reflects a high-mobility path with repeated movement across multiple institutional contexts.`;
  }

  if (["Chief Commissioner", "Principal Chief Commissioner", "Principal Commissioner"].includes(currentDesignation ?? "")) {
    return `${subject} appears to have a deep senior leadership track built through sustained posting continuity.`;
  }

  return `${subject} suggests ${mobilityProfile.toLowerCase()} and ${stationDiversityLabel.toLowerCase()} across ${postingCount} known posting records.`;
}

function deriveProfileInsightSummary({ postingCount, uniqueStations, knownServiceSpanYears, yearsToCurrentRank, mobilityProfile, timelineQuality, exposureBreadthLabel, archetype, relatedCount }) {
  return {
    posting_records: postingCount,
    unique_stations_served: uniqueStations,
    known_service_span_years: knownServiceSpanYears,
    years_to_current_rank: yearsToCurrentRank,
    mobility_profile: mobilityProfile,
    timeline_richness_label: timelineQuality === "full" ? "Timeline-rich" : timelineQuality === "partial" ? "Timeline-present" : "Timeline-limited",
    probable_exposure_breadth: exposureBreadthLabel,
    likely_career_archetype: archetype,
    similar_officers_count: relatedCount
  };
}

function parseOfficerBlock(block, sourceDoc, employeeId) {
  const name = safeExtract(block, /Officer Name\s+(.+?)\s+(?:Verified Data|Not Verified)/s);
  const dob = safeExtract(block, /Date Of Birth\s+(\d{1,2}\/\d{1,2}\/\d{4})/);
  const dateOfEntry = safeExtract(
    block,
    /Date Of Entry Into Gr\.A Service\s+(\d{1,2}\/\d{1,2}\/\d{4})/
  );
  const presentRankDate = safeExtract(
    block,
    /Date Of Appointment in Present Rank\s+(\d{1,2}\/\d{1,2}\/\d{4})/
  );
  const batchText = safeExtract(block, /Batch\s+([0-9]{4})/);
  const cadre = normalizeCadre(safeExtract(block, /Cadre\s+([A-Z]{2,3})/));
  const currentDesignation = sanitizeDesignation(
    safeExtract(block, /Present Designation\s+(.+?)\s+Cadre/s)
  );

  const postingHistory = parsePostingRows(block, employeeId, sourceDoc);
  const timelineQuality = deriveTimelineQuality(postingHistory.length);
  const verificationFlag = block.includes("Not Verified") ? "not_verified" : "verified";
  const inferredRankProgression = inferRankProgression(postingHistory, currentDesignation);
  const inferredSpecialization = inferSpecialization(postingHistory);
  const stationHistory = deriveStationHistory(postingHistory);

  const latestPosting =
    postingHistory.length > 0
      ? [...postingHistory].sort((a, b) => {
          const left = a.start_date ? new Date(a.start_date).getTime() : 0;
          const right = b.start_date ? new Date(b.start_date).getTime() : 0;
          return right - left;
        })[0]
      : null;

  const currentPosting = latestPosting
    ? (() => {
        const currentLocation =
          normalizeStation(latestPosting.station_display ?? latestPosting.location) ??
          normalizeStation(latestPosting.location);
        const currentUnitName =
          sanitizeOrganizationDisplay(latestPosting.organization_display ?? latestPosting.organization_unit_name) ??
          sanitizeOrganizationUnit(latestPosting.organization_unit_name);
        const currentDesignationDisplay =
          sanitizeDesignation(latestPosting.designation_display ?? latestPosting.designation) ??
          sanitizeDesignation(latestPosting.rank_held) ??
          currentDesignation;

        return {
        post_id: latestPosting.posting_id,
        designation: currentDesignationDisplay,
        designation_raw: latestPosting.designation_raw ?? null,
        designation_display: currentDesignationDisplay,
        organization_unit_id: latestPosting.organization_unit_id,
        organization_raw: latestPosting.organization_raw ?? null,
        organization_display: currentUnitName,
        organization_unit_name: currentUnitName,
        station_raw: latestPosting.station_raw ?? null,
        station_display: currentLocation,
        location: currentLocation,
        start_date: latestPosting.start_date,
        end_date: latestPosting.end_date,
        confidence: currentLocation || currentUnitName ? (latestPosting.end_date ? 0.75 : 0.9) : 0.55
      };
      })()
    : {
        post_id: null,
        designation: currentDesignation,
        designation_raw: null,
        designation_display: currentDesignation,
        organization_unit_id: null,
        organization_raw: null,
        organization_display: null,
        organization_unit_name: null,
        station_raw: null,
        station_display: null,
        location: null,
        start_date: null,
        end_date: null,
        confidence: 0.45
      };

  const missingFields = [];
  if (!name) missingFields.push("name");
  if (!currentDesignation) missingFields.push("current_designation");
  if (!presentRankDate) missingFields.push("present_rank_date");
  if (!cadre) missingFields.push("cadre");

  const warnings = [];

  const entryDateIso = toIsoDate(dateOfEntry);
  const presentRankIso = toIsoDate(presentRankDate);

  if (entryDateIso && presentRankIso && presentRankIso < entryDateIso) {
    warnings.push("Present-rank date precedes entry date");
  }

  if (postingHistory.length === 0) {
    warnings.push("Posting timeline not captured");
  }

  if (verificationFlag === "not_verified") {
    warnings.push("Record includes unverified fields");
  }

  const dataQuality = {
    missing_fields: missingFields,
    timeline_quality: timelineQuality,
    dedupe_confidence: 0.99,
    warnings
  };

  const yearsInService = entryDateIso
    ? Number(
        ((Date.now() - new Date(entryDateIso).getTime()) / (1000 * 60 * 60 * 24 * 365.25)).toFixed(1)
      )
    : null;

  const yearsToCurrentRank = yearsBetween(entryDateIso, presentRankIso);
  const knownServiceSpanYears = deriveKnownServiceSpanYears(postingHistory);
  const postingCount = postingHistory.length;
  const uniqueStationCount = stationHistory.length;
  const rankDepth = inferredRankProgression.length;
  const designationPath = [...new Set(postingHistory.map((posting) => posting.designation).filter(Boolean))];
  const dominantStations = stationHistory.slice(0, 5).map((station) => station.station);

  const mobilityProfile = deriveMobilityProfile(postingCount, uniqueStationCount);
  const stationDiversityLabel = deriveStationDiversityLabel(uniqueStationCount);
  const exposureBreadthLabel = deriveExposureBreadthLabel(postingCount, uniqueStationCount, rankDepth);
  const { archetype, reason } = deriveArchetype({
    postingCount,
    uniqueStations: uniqueStationCount,
    rankDepth,
    yearsToCurrentRank,
    currentDesignation,
    knownServiceSpanYears
  });

  const qualityLabel = deriveQualityLabel(dataQuality);

  return {
    id: `officer-${employeeId}`,
    employee_id: employeeId,
    name,
    normalized_name: normalizeName(name),
    batch: batchText ? Number(batchText) : null,
    cadre,
    current_designation: currentDesignation,
    present_rank_date: presentRankIso,
    dob: toIsoDate(dob),
    date_of_entry_gr_a: entryDateIso,
    current_posting: currentPosting,
    posting_history: postingHistory,
    station_history: stationHistory,
    inferred_rank_progression: inferredRankProgression,
    inferred_specialization: inferredSpecialization,
    verification_flag: verificationFlag,
    data_quality: dataQuality,
    data_quality_label: qualityLabel,
    timeline_richness_score: postingCount,
    timeline_entry_count: postingCount,
    unique_station_count: uniqueStationCount,
    known_service_span_years: knownServiceSpanYears,
    mobility_profile: mobilityProfile,
    station_diversity_label: stationDiversityLabel,
    exposure_breadth_label: exposureBreadthLabel,
    career_archetype: archetype,
    career_archetype_reason: reason,
    dominant_stations: dominantStations,
    designation_path: designationPath,
    rank_depth_score: rankDepth,
    years_in_service: yearsInService,
    years_to_current_rank: yearsToCurrentRank,
    related_officer_ids: [],
    related_officers: [],
    insight_summary: null,
    narrative_summary: null
  };
}

function buildOfficerIdentityKeys({ name, normalizedName, dob, batch, cadre }) {
  const safeName = normalizeName(name) ?? normalizeName(normalizedName) ?? null;
  const safeDob = dob ?? null;
  const safeBatch = batch != null ? Number(batch) : null;
  const safeCadre = normalizeCadre(cadre);
  const keys = [];

  if (safeName && safeDob && safeBatch != null && safeCadre) {
    keys.push(`name-dob-batch-cadre:${safeName}|${safeDob}|${safeBatch}|${safeCadre}`);
  }
  if (safeName && safeDob && safeBatch != null) {
    keys.push(`name-dob-batch:${safeName}|${safeDob}|${safeBatch}`);
  }
  if (safeName && safeDob) {
    keys.push(`name-dob:${safeName}|${safeDob}`);
  }
  if (safeName && safeBatch != null && safeCadre) {
    keys.push(`name-batch-cadre:${safeName}|${safeBatch}|${safeCadre}`);
  }
  if (safeName) {
    keys.push(`name:${safeName}`);
  }

  return [...new Set(keys)];
}

function dedupeAndSortPostingHistory(postingHistory, employeeId) {
  const deduped = [];
  const seen = new Set();

  for (const posting of postingHistory ?? []) {
    const startDate = posting.start_date ?? posting.from_date ?? null;
    const endDateCandidate = posting.end_date ?? posting.to_date ?? null;
    const endDate =
      startDate && endDateCandidate && endDateCandidate < startDate ? null : endDateCandidate;

    const designationDisplay =
      sanitizeDesignation(
        posting.designation_display ?? posting.designation ?? posting.rank_held
      ) ?? null;
    const organizationDisplay =
      sanitizeOrganizationDisplay(
        posting.organization_display ?? posting.organization_unit_name
      ) ??
      sanitizeOrganizationUnit(posting.organization_unit_name) ??
      null;
    const stationDisplay =
      normalizeStation(posting.station_display ?? posting.location) ??
      normalizeStation(posting.location) ??
      null;

    const key = [
      startDate ?? "",
      endDate ?? "",
      designationDisplay ?? "",
      organizationDisplay ?? "",
      stationDisplay ?? ""
    ].join("|");

    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push({
      ...posting,
      designation_display: designationDisplay,
      designation: designationDisplay,
      rank_held: designationDisplay,
      organization_display: organizationDisplay,
      organization_unit_name: organizationDisplay,
      organization_unit_id:
        organizationDisplay ? `org-${slugify(organizationDisplay)}` : posting.organization_unit_id ?? null,
      station_display: stationDisplay,
      location: stationDisplay,
      from_date: startDate,
      to_date: endDate,
      start_date: startDate,
      end_date: endDate
    });
  }

  const sorted = deduped.sort((a, b) => {
    const leftStart = a.start_date ? new Date(a.start_date).getTime() : 0;
    const rightStart = b.start_date ? new Date(b.start_date).getTime() : 0;
    if (leftStart !== rightStart) return leftStart - rightStart;

    const leftEnd = a.end_date ? new Date(a.end_date).getTime() : Number.MAX_SAFE_INTEGER;
    const rightEnd = b.end_date ? new Date(b.end_date).getTime() : Number.MAX_SAFE_INTEGER;
    return leftEnd - rightEnd;
  });

  return sorted.map((posting, index) => ({
    ...posting,
    posting_id: posting.posting_id ?? `post-${employeeId}-${index + 1}`
  }));
}

function latestPosting(postingHistory) {
  if (postingHistory.length === 0) return null;
  return postingHistory
    .slice()
    .sort((a, b) => {
      const left = a.start_date ? new Date(a.start_date).getTime() : 0;
      const right = b.start_date ? new Date(b.start_date).getTime() : 0;
      return right - left;
    })[0];
}

function computeCurrentPostingFromHistory(posting, fallbackDesignation) {
  if (!posting) {
    return {
      post_id: null,
      designation: fallbackDesignation ?? null,
      designation_raw: null,
      designation_display: fallbackDesignation ?? null,
      organization_unit_id: null,
      organization_raw: null,
      organization_display: null,
      organization_unit_name: null,
      station_raw: null,
      station_display: null,
      location: null,
      start_date: null,
      end_date: null,
      confidence: 0.45
    };
  }

  const currentDesignationDisplay =
    sanitizeDesignation(posting.designation_display ?? posting.designation) ??
    sanitizeDesignation(posting.rank_held) ??
    fallbackDesignation ??
    null;
  const currentLocation =
    normalizeStation(posting.station_display ?? posting.location) ?? normalizeStation(posting.location);
  const currentOrg =
    sanitizeOrganizationDisplay(posting.organization_display ?? posting.organization_unit_name) ??
    sanitizeOrganizationUnit(posting.organization_unit_name);

  const normalizedStart = posting.start_date ?? posting.from_date ?? null;
  const normalizedEndCandidate = posting.end_date ?? posting.to_date ?? null;
  const normalizedEnd =
    normalizedStart && normalizedEndCandidate && normalizedEndCandidate < normalizedStart
      ? null
      : normalizedEndCandidate;

  return {
    post_id: posting.posting_id ?? null,
    designation: currentDesignationDisplay,
    designation_raw: posting.designation_raw ?? null,
    designation_display: currentDesignationDisplay,
    organization_unit_id: currentOrg ? `org-${slugify(currentOrg)}` : null,
    organization_raw: posting.organization_raw ?? null,
    organization_display: currentOrg,
    organization_unit_name: currentOrg,
    station_raw: posting.station_raw ?? null,
    station_display: currentLocation,
    location: currentLocation,
    start_date: normalizedStart,
    end_date: normalizedEnd,
    confidence:
      currentLocation || currentOrg
        ? posting.end_date
          ? 0.75
          : 0.9
        : posting.confidence ?? 0.55
  };
}

function recomputeOfficerDerivedFields({
  officer,
  selectedPostingHistory,
  preferredCurrentDesignation,
  sourceType
}) {
  const postingHistory = dedupeAndSortPostingHistory(selectedPostingHistory, officer.employee_id);
  const timelineQuality = deriveTimelineQuality(postingHistory.length);
  const currentDesignation =
    sanitizeDesignation(preferredCurrentDesignation) ??
    sanitizeDesignation(officer.current_designation) ??
    null;

  officer.current_designation = currentDesignation;
  officer.posting_history = postingHistory.map((posting) => {
    const designationDisplay =
      sanitizeDesignation(posting.designation_display ?? posting.designation ?? posting.rank_held) ?? null;
    const organizationDisplay =
      sanitizeOrganizationDisplay(posting.organization_display ?? posting.organization_unit_name) ??
      sanitizeOrganizationUnit(posting.organization_unit_name) ??
      null;
    const stationDisplay =
      normalizeStation(posting.station_display ?? posting.location) ?? normalizeStation(posting.location) ?? null;

    return {
      ...posting,
      designation_display: designationDisplay,
      designation: designationDisplay,
      rank_held: designationDisplay,
      organization_display: organizationDisplay,
      organization_unit_name: organizationDisplay,
      organization_unit_id: organizationDisplay ? `org-${slugify(organizationDisplay)}` : null,
      station_display: stationDisplay,
      location: stationDisplay,
      source_type: posting.source_type ?? sourceType
    };
  });
  officer.station_history = deriveStationHistory(officer.posting_history);
  officer.inferred_rank_progression = inferRankProgression(officer.posting_history, currentDesignation);
  officer.inferred_specialization = inferSpecialization(officer.posting_history);
  officer.current_posting = computeCurrentPostingFromHistory(
    latestPosting(officer.posting_history),
    currentDesignation
  );

  officer.timeline_richness_score = officer.posting_history.length;
  officer.timeline_entry_count = officer.posting_history.length;
  officer.unique_station_count = officer.station_history.length;
  officer.known_service_span_years = deriveKnownServiceSpanYears(officer.posting_history);
  officer.designation_path = [
    ...new Set(officer.posting_history.map((posting) => posting.designation_display ?? posting.designation).filter(Boolean))
  ];
  officer.dominant_stations = officer.station_history.slice(0, 5).map((station) => station.station);
  officer.rank_depth_score = officer.inferred_rank_progression.length;
  officer.mobility_profile = deriveMobilityProfile(officer.timeline_entry_count, officer.unique_station_count);
  officer.station_diversity_label = deriveStationDiversityLabel(officer.unique_station_count);
  officer.exposure_breadth_label = deriveExposureBreadthLabel(
    officer.timeline_entry_count,
    officer.unique_station_count,
    officer.rank_depth_score
  );

  const { archetype, reason } = deriveArchetype({
    postingCount: officer.timeline_entry_count,
    uniqueStations: officer.unique_station_count,
    rankDepth: officer.rank_depth_score,
    yearsToCurrentRank: officer.years_to_current_rank,
    currentDesignation: officer.current_designation,
    knownServiceSpanYears: officer.known_service_span_years
  });
  officer.career_archetype = archetype;
  officer.career_archetype_reason = reason;

  const existingWarnings = officer.data_quality?.warnings ?? [];
  const warnings = existingWarnings.filter((warning) => warning !== "Posting timeline not captured");
  if (officer.posting_history.length === 0) {
    warnings.push("Posting timeline not captured");
  }

  officer.data_quality = {
    ...officer.data_quality,
    timeline_quality: timelineQuality,
    warnings
  };
  officer.data_quality_label = deriveQualityLabel(officer.data_quality);
}

function buildExcelOfficerLookup(excelOfficers) {
  const byStrongIdentity = new Map();
  const byNameIdentity = new Map();

  for (const excelOfficer of excelOfficers) {
    const keys =
      excelOfficer.identity_keys ??
      buildOfficerIdentityKeys({
        name: excelOfficer.name ?? excelOfficer.officer_name,
        normalizedName: excelOfficer.normalized_name,
        dob: excelOfficer.dob,
        batch: excelOfficer.batch,
        cadre: excelOfficer.cadre
      });

    for (const key of keys) {
      if (key.startsWith("name:")) {
        const bucket = byNameIdentity.get(key) ?? [];
        if (!bucket.includes(excelOfficer)) {
          bucket.push(excelOfficer);
          byNameIdentity.set(key, bucket);
        }
        continue;
      }

      const current = byStrongIdentity.get(key);
      if (
        !current ||
        (excelOfficer.posting_history?.length ?? 0) > (current.posting_history?.length ?? 0)
      ) {
        byStrongIdentity.set(key, excelOfficer);
      }
    }
  }

  return { byStrongIdentity, byNameIdentity };
}

function resolveExcelOfficerForTextOfficer(officer, excelLookup) {
  const keys = buildOfficerIdentityKeys({
    name: officer.name,
    normalizedName: officer.normalized_name,
    dob: officer.dob,
    batch: officer.batch,
    cadre: officer.cadre
  });

  for (const key of keys) {
    if (key.startsWith("name:")) continue;
    const match = excelLookup.byStrongIdentity.get(key);
    if (match) return match;
  }

  const nameKey = keys.find((key) => key.startsWith("name:"));
  if (!nameKey) return null;

  const candidates = excelLookup.byNameIdentity.get(nameKey) ?? [];
  if (candidates.length === 1) return candidates[0];
  if (candidates.length === 0) return null;

  const officerBatch = officer.batch != null ? Number(officer.batch) : null;
  const officerCadre = normalizeCadre(officer.cadre);
  const officerDob = officer.dob ?? null;
  const narrowed = candidates.filter((candidate) => {
    const batchMatch = officerBatch != null && candidate.batch != null ? Number(candidate.batch) === officerBatch : false;
    const cadreMatch = officerCadre && candidate.cadre ? normalizeCadre(candidate.cadre) === officerCadre : false;
    const dobMatch = officerDob && candidate.dob ? candidate.dob === officerDob : false;
    return batchMatch || cadreMatch || dobMatch;
  });

  if (narrowed.length === 1) return narrowed[0];
  return null;
}

function mergeSourceHistories({
  officers,
  excelImportResult,
  mode
}) {
  const diagnostics = {
    mode,
    excelFileFound: Boolean(excelImportResult?.found),
    excelRowsLoaded: excelImportResult?.rowsLoaded ?? 0,
    excelEpisodesLoaded: excelImportResult?.postingEpisodesLoaded ?? 0,
    excelOfficerGroupsLoaded: excelImportResult?.officersLoaded ?? 0,
    officersMatchedToExcel: 0,
    officersUsingExcelPrimary: 0,
    officersUsingTextPrimary: 0,
    officersWithEmptyPostingHistoryAfterMerge: 0,
    modeExplanation: ""
  };

  if (mode === "text-only") {
    diagnostics.modeExplanation = "Text parser only (Excel disabled)";
    for (const officer of officers) {
      recomputeOfficerDerivedFields({
        officer,
        selectedPostingHistory: officer.posting_history ?? [],
        preferredCurrentDesignation: officer.current_designation,
        sourceType: "text"
      });
      diagnostics.officersUsingTextPrimary += 1;
      if ((officer.posting_history?.length ?? 0) === 0) {
        diagnostics.officersWithEmptyPostingHistoryAfterMerge += 1;
      }
    }
    return diagnostics;
  }

  const excelLookup = buildExcelOfficerLookup(excelImportResult?.officers ?? []);
  diagnostics.modeExplanation =
    mode === "excel-first"
      ? "Excel primary, text fallback"
      : mode === "text-first"
        ? "Text primary, Excel fallback/enrichment"
        : "Excel only (text posting history ignored)";

  for (const officer of officers) {
    const excelOfficer = resolveExcelOfficerForTextOfficer(officer, excelLookup);
    const textHistory = officer.posting_history ?? [];
    const excelHistory = excelOfficer?.posting_history ?? [];

    if (excelOfficer) diagnostics.officersMatchedToExcel += 1;

    if (excelOfficer) {
      officer.name = officer.name ?? excelOfficer.name ?? null;
      officer.normalized_name =
        officer.normalized_name ?? normalizeName(excelOfficer.name ?? excelOfficer.normalized_name);
      officer.dob = officer.dob ?? excelOfficer.dob ?? null;
      officer.batch = officer.batch ?? (excelOfficer.batch != null ? Number(excelOfficer.batch) : null);
      officer.cadre = officer.cadre ?? normalizeCadre(excelOfficer.cadre);
      officer.date_of_entry_gr_a =
        officer.date_of_entry_gr_a ?? excelOfficer.date_of_entry_gr_a ?? null;
      officer.present_rank_date = officer.present_rank_date ?? null;
    }

    let selectedHistory = textHistory;
    let selectedSource = "text";

    if (mode === "excel-only") {
      selectedHistory = excelHistory;
      selectedSource = "excel";
    } else if (mode === "excel-first") {
      if (excelHistory.length > 0) {
        selectedHistory = excelHistory;
        selectedSource = "excel";
      }
    } else if (mode === "text-first") {
      if (textHistory.length === 0 && excelHistory.length > 0) {
        selectedHistory = excelHistory;
        selectedSource = "excel";
      }
    }

    if (selectedSource === "excel") diagnostics.officersUsingExcelPrimary += 1;
    else diagnostics.officersUsingTextPrimary += 1;

    recomputeOfficerDerivedFields({
      officer,
      selectedPostingHistory: selectedHistory,
      preferredCurrentDesignation: excelOfficer?.present_designation ?? officer.current_designation,
      sourceType: selectedSource
    });

    if ((officer.posting_history?.length ?? 0) === 0) {
      diagnostics.officersWithEmptyPostingHistoryAfterMerge += 1;
    }
  }

  return diagnostics;
}

function buildOfficers() {
  const officers = [];
  const files = listTextFiles();

  for (const fileName of files) {
    const fullPath = path.join(TEXT_DIR, fileName);
    const text = fs.readFileSync(fullPath, "utf8");
    const matches = [...text.matchAll(EMPLOYEE_PATTERN)];

    for (let i = 0; i < matches.length; i += 1) {
      const current = matches[i];
      const next = matches[i + 1];

      if (!current.index && current.index !== 0) continue;

      const start = current.index;
      const end = next?.index ?? text.length;
      const block = text.slice(start, end);
      const employeeId = current[1];

      const officer = parseOfficerBlock(block, fileName.replace(".txt", ".pdf"), employeeId);
      officers.push(officer);
    }
  }

  officers.sort((a, b) => {
    const leftName = a.name ?? "";
    const rightName = b.name ?? "";
    const byName = leftName.localeCompare(rightName);
    if (byName !== 0) return byName;
    return a.employee_id.localeCompare(b.employee_id);
  });

  return officers;
}

function intersectionSize(setA, setB) {
  let count = 0;
  for (const item of setA) {
    if (setB.has(item)) count += 1;
  }
  return count;
}

function computeRelatedOfficers(officers) {
  const byId = new Map(officers.map((officer) => [officer.id, officer]));
  const byBatch = new Map();
  const byCadre = new Map();
  const byStation = new Map();

  function addToMap(map, key, value) {
    if (!key) return;
    const existing = map.get(key) ?? new Set();
    existing.add(value);
    map.set(key, existing);
  }

  for (const officer of officers) {
    addToMap(byBatch, String(officer.batch ?? ""), officer.id);
    addToMap(byCadre, officer.cadre, officer.id);

    for (const station of officer.station_history) {
      addToMap(byStation, station.station.toUpperCase(), officer.id);
    }
  }

  for (const officer of officers) {
    const candidates = new Set();

    for (const related of byBatch.get(String(officer.batch ?? "")) ?? []) candidates.add(related);
    for (const related of byCadre.get(officer.cadre) ?? []) candidates.add(related);
    for (const station of officer.station_history) {
      for (const related of byStation.get(station.station.toUpperCase()) ?? []) {
        candidates.add(related);
      }
    }

    candidates.delete(officer.id);

    const myStations = new Set(officer.station_history.map((station) => station.station.toUpperCase()));
    const myRanks = new Set(officer.inferred_rank_progression);

    const scored = [];

    for (const candidateId of candidates) {
      const candidate = byId.get(candidateId);
      if (!candidate) continue;

      const reasons = [];
      let score = 0;

      if (officer.batch != null && officer.batch === candidate.batch) {
        score += 30;
        reasons.push("Same batch");
      }

      if (officer.cadre && officer.cadre === candidate.cadre) {
        score += 20;
        reasons.push("Shared cadre");
      }

      const candidateStations = new Set(
        candidate.station_history.map((station) => station.station.toUpperCase())
      );
      const overlapStations = intersectionSize(myStations, candidateStations);
      if (overlapStations > 0) {
        score += Math.min(24, overlapStations * 6);
        reasons.push("Overlapping stations");
      }

      const candidateRanks = new Set(candidate.inferred_rank_progression);
      const overlapRanks = intersectionSize(myRanks, candidateRanks);
      if (overlapRanks > 0) {
        score += Math.min(16, overlapRanks * 4);
        reasons.push("Similar progression path");
      }

      if (officer.current_designation && officer.current_designation === candidate.current_designation) {
        score += 8;
      }

      if (officer.mobility_profile === candidate.mobility_profile) {
        score += 8;
      }

      if (officer.career_archetype === candidate.career_archetype) {
        score += 6;
      }

      if (score >= 30) {
        scored.push({
          id: candidate.id,
          score,
          reason: reasons.slice(0, 2).join(", ") || "Similar career pattern"
        });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, 8);

    officer.related_officer_ids = top.map((item) => item.id);
    officer.related_officers = top;
  }

  for (const officer of officers) {
    officer.insight_summary = deriveProfileInsightSummary({
      postingCount: officer.timeline_entry_count,
      uniqueStations: officer.unique_station_count,
      knownServiceSpanYears: officer.known_service_span_years,
      yearsToCurrentRank: officer.years_to_current_rank,
      mobilityProfile: officer.mobility_profile,
      timelineQuality: officer.data_quality?.timeline_quality ?? "minimal",
      exposureBreadthLabel: officer.exposure_breadth_label,
      archetype: officer.career_archetype,
      relatedCount: officer.related_officer_ids.length
    });

    officer.narrative_summary = deriveNarrativeSummary({
      name: officer.name,
      mobilityProfile: officer.mobility_profile,
      stationDiversityLabel: officer.station_diversity_label,
      archetype: officer.career_archetype,
      currentDesignation: officer.current_designation,
      postingCount: officer.timeline_entry_count
    });
  }
}

function createIndex(officers) {
  return officers.map((officer) => {
    const currentLocation = normalizeStation(
      officer.current_posting?.station_display ?? officer.current_posting?.location
    );
    const currentOrganizationUnit =
      sanitizeOrganizationDisplay(
        officer.current_posting?.organization_display ?? officer.current_posting?.organization_unit_name
      ) ?? sanitizeOrganizationUnit(officer.current_posting?.organization_unit_name);
    const currentDesignation =
      sanitizeDesignation(officer.current_posting?.designation_display ?? officer.current_posting?.designation) ??
      officer.current_designation;
    const currentPostingSummary = [currentDesignation, currentOrganizationUnit, currentLocation]
      .filter(Boolean)
      .join(" • ");

    const searchBlob = [
      officer.name,
      officer.normalized_name,
      officer.employee_id,
      officer.batch,
      officer.cadre,
      officer.current_designation,
      currentLocation,
      currentOrganizationUnit,
      officer.station_history?.map((item) => item.station).join(" "),
      officer.career_archetype,
      officer.mobility_profile,
      officer.inferred_specialization?.join(" ")
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return {
      id: officer.id,
      employee_id: officer.employee_id,
      name: officer.name,
      normalized_name: officer.normalized_name,
      batch: officer.batch,
      cadre: officer.cadre,
      current_designation: officer.current_designation,
      present_rank_date: officer.present_rank_date,
      current_location: currentLocation ?? null,
      current_posting_summary: currentPostingSummary || "Posting details partially inferred",
      timeline_quality: officer.data_quality?.timeline_quality ?? "minimal",
      timeline_richness_score: officer.timeline_richness_score,
      timeline_entry_count: officer.timeline_entry_count,
      unique_station_count: officer.unique_station_count,
      mobility_profile: officer.mobility_profile,
      career_archetype: officer.career_archetype,
      verification_flag: officer.verification_flag,
      data_quality_label: officer.data_quality_label,
      search_blob: searchBlob
    };
  });
}

function topEntriesFromCounter(counterMap, limit = 6) {
  return [...counterMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, value]) => ({ key, count: value }));
}

function buildBatchesDataset(officers) {
  const byBatch = new Map();

  for (const officer of officers) {
    if (officer.batch == null) continue;
    const key = officer.batch;
    const existing = byBatch.get(key) ?? [];
    existing.push(officer);
    byBatch.set(key, existing);
  }

  const years = [...byBatch.keys()].sort((a, b) => a - b);

  return years.map((year) => {
    const batchOfficers = byBatch.get(year) ?? [];

    const cadreMix = new Map();
    const rankDistribution = new Map();
    const stationCounter = new Map();
    const designationCounter = new Map();
    const archetypeCounter = new Map();

    let timelineTotal = 0;
    let stationDiversityTotal = 0;

    for (const officer of batchOfficers) {
      cadreMix.set(officer.cadre ?? "UNKNOWN", (cadreMix.get(officer.cadre ?? "UNKNOWN") ?? 0) + 1);
      rankDistribution.set(
        officer.current_designation ?? "Unknown",
        (rankDistribution.get(officer.current_designation ?? "Unknown") ?? 0) + 1
      );
      designationCounter.set(
        officer.current_designation ?? "Unknown",
        (designationCounter.get(officer.current_designation ?? "Unknown") ?? 0) + 1
      );
      archetypeCounter.set(
        officer.career_archetype ?? "Mixed Exposure Profile",
        (archetypeCounter.get(officer.career_archetype ?? "Mixed Exposure Profile") ?? 0) + 1
      );

      timelineTotal += officer.timeline_entry_count;
      stationDiversityTotal += officer.unique_station_count;

      for (const station of officer.station_history.slice(0, 8)) {
        stationCounter.set(station.station, (stationCounter.get(station.station) ?? 0) + station.postings_count);
      }
    }

    const officerCount = batchOfficers.length;
    const avgTimeline = officerCount > 0 ? Number((timelineTotal / officerCount).toFixed(1)) : 0;
    const avgStations = officerCount > 0 ? Number((stationDiversityTotal / officerCount).toFixed(1)) : 0;

    const relatedYears = [year - 1, year + 1].filter((neighbor) => byBatch.has(neighbor));

    let quickInsight = "Balanced cohort with mixed career trajectories.";
    if (avgTimeline >= 8 && avgStations >= 5) {
      quickInsight = "Highly experienced batch with broad multi-station career footprints.";
    } else if (avgTimeline < 4) {
      quickInsight = "Emerging cohort with shorter documented journey depth so far.";
    }

    return {
      year,
      officer_count: officerCount,
      cadre_mix: topEntriesFromCounter(cadreMix, 8),
      current_rank_distribution: topEntriesFromCounter(rankDistribution, 10),
      average_timeline_entries: avgTimeline,
      average_station_diversity: avgStations,
      top_stations: topEntriesFromCounter(stationCounter, 8),
      common_designations: topEntriesFromCounter(designationCounter, 8),
      archetype_distribution: topEntriesFromCounter(archetypeCounter, 8),
      sample_officer_ids: batchOfficers
        .slice()
        .sort((a, b) => b.timeline_entry_count - a.timeline_entry_count)
        .slice(0, 8)
        .map((officer) => officer.id),
      related_batch_years: relatedYears,
      quick_insight: quickInsight,
      narrative: `Batch ${year} includes ${officerCount} officers with an average of ${avgTimeline} posting records and ${avgStations} unique stations in known history.`
    };
  });
}

function buildCadresDataset(officers) {
  const byCadre = new Map();
  for (const officer of officers) {
    const key = officer.cadre ?? "UNKNOWN";
    const existing = byCadre.get(key) ?? [];
    existing.push(officer);
    byCadre.set(key, existing);
  }

  return [...byCadre.keys()]
    .sort((a, b) => a.localeCompare(b))
    .map((cadre) => {
      const cadreOfficers = byCadre.get(cadre) ?? [];
      const rankCounter = new Map();
      const stationCounter = new Map();
      const batchCounter = new Map();
      const archetypeCounter = new Map();
      const progressionCounter = new Map();

      let timelineTotal = 0;

      for (const officer of cadreOfficers) {
        timelineTotal += officer.timeline_entry_count;
        rankCounter.set(
          officer.current_designation ?? "Unknown",
          (rankCounter.get(officer.current_designation ?? "Unknown") ?? 0) + 1
        );
        archetypeCounter.set(
          officer.career_archetype,
          (archetypeCounter.get(officer.career_archetype) ?? 0) + 1
        );
        if (officer.batch != null) {
          batchCounter.set(String(officer.batch), (batchCounter.get(String(officer.batch)) ?? 0) + 1);
        }
        for (const station of officer.station_history.slice(0, 8)) {
          stationCounter.set(station.station, (stationCounter.get(station.station) ?? 0) + station.postings_count);
        }

        const progression = officer.inferred_rank_progression.join(" -> ") || "Single-rank snapshot";
        progressionCounter.set(progression, (progressionCounter.get(progression) ?? 0) + 1);
      }

      const avgTimeline = cadreOfficers.length > 0 ? Number((timelineTotal / cadreOfficers.length).toFixed(1)) : 0;

      return {
        cadre,
        slug: slugify(cadre),
        description: CADRE_EXPLANATIONS[cadre] ?? "Mixed cadre context based on available officer records.",
        officer_count: cadreOfficers.length,
        average_timeline_entries: avgTimeline,
        typical_current_rank_spread: topEntriesFromCounter(rankCounter, 8),
        common_rank_progressions: topEntriesFromCounter(progressionCounter, 6),
        batch_spread: topEntriesFromCounter(batchCounter, 10),
        common_stations: topEntriesFromCounter(stationCounter, 8),
        archetype_distribution: topEntriesFromCounter(archetypeCounter, 8),
        sample_officer_ids: cadreOfficers
          .slice()
          .sort((a, b) => b.timeline_entry_count - a.timeline_entry_count)
          .slice(0, 10)
          .map((officer) => officer.id),
        distinctiveness: avgTimeline >= 8
          ? "Cadre journeys are generally timeline-rich with broad progression evidence."
          : "Cadre journeys show mixed depth, with both emerging and mature trajectories."
      };
    });
}

function buildStationsDataset(officers) {
  const stationMap = new Map();
  const stationCoOccurrence = new Map();
  const corridors = new Map();

  function touchStation(stationName) {
    const key = stationName.toUpperCase();
    if (!stationMap.has(key)) {
      stationMap.set(key, {
        name: stationName,
        slug: slugify(stationName),
        officer_ids: new Set(),
        posting_frequency: 0,
        total_known_tenure_days: 0,
        designation_counter: new Map(),
        batch_counter: new Map(),
        related_counter: new Map()
      });
    }
    return stationMap.get(key);
  }

  for (const officer of officers) {
    const officerStations = [];

    for (const station of officer.station_history) {
      const entry = touchStation(station.station);
      entry.officer_ids.add(officer.id);
      entry.posting_frequency += station.postings_count;
      entry.total_known_tenure_days += station.known_tenure_days;
      if (officer.batch != null) {
        entry.batch_counter.set(String(officer.batch), (entry.batch_counter.get(String(officer.batch)) ?? 0) + 1);
      }
      officerStations.push(station.station.toUpperCase());
    }

    const seenLocal = [...new Set(officerStations)];
    for (let i = 0; i < seenLocal.length; i += 1) {
      for (let j = i + 1; j < seenLocal.length; j += 1) {
        const pairKey = [seenLocal[i], seenLocal[j]].sort().join("|");
        stationCoOccurrence.set(pairKey, (stationCoOccurrence.get(pairKey) ?? 0) + 1);
      }
    }

    const chronological = officer.posting_history
      .filter((posting) => posting.location)
      .sort((a, b) => new Date(a.start_date ?? 0).getTime() - new Date(b.start_date ?? 0).getTime());

    for (const posting of chronological) {
      const stationName = posting.location;
      if (!stationName) continue;
      const stationEntry = touchStation(stationName);
      const designation = posting.designation ?? officer.current_designation ?? "Unknown";
      stationEntry.designation_counter.set(designation, (stationEntry.designation_counter.get(designation) ?? 0) + 1);
    }

    for (let i = 1; i < chronological.length; i += 1) {
      const from = chronological[i - 1].location;
      const to = chronological[i].location;
      if (!from || !to || from.toUpperCase() === to.toUpperCase()) continue;
      const key = `${from.toUpperCase()}=>${to.toUpperCase()}`;
      corridors.set(key, (corridors.get(key) ?? 0) + 1);
    }
  }

  for (const [pairKey, count] of stationCoOccurrence.entries()) {
    const [left, right] = pairKey.split("|");
    const leftEntry = stationMap.get(left);
    const rightEntry = stationMap.get(right);
    if (!leftEntry || !rightEntry) continue;

    leftEntry.related_counter.set(right, (leftEntry.related_counter.get(right) ?? 0) + count);
    rightEntry.related_counter.set(left, (rightEntry.related_counter.get(left) ?? 0) + count);
  }

  const stations = [...stationMap.values()].map((station) => {
    const officerCount = station.officer_ids.size;
    const importanceScore = officerCount * 2 + station.posting_frequency;

    let importanceLabel = "Emerging station";
    if (importanceScore >= 1200) importanceLabel = "Major institutional node";
    else if (importanceScore >= 500) importanceLabel = "High-traffic station";
    else if (importanceScore >= 200) importanceLabel = "Active station";

    const relatedStations = topEntriesFromCounter(station.related_counter, 6).map((item) => ({
      station: stationMap.get(item.key)?.name ?? item.key,
      count: item.count,
      slug: stationMap.get(item.key)?.slug ?? slugify(item.key)
    }));

    const corridorsForStation = [];
    for (const [corridorKey, count] of corridors.entries()) {
      const [from, to] = corridorKey.split("=>");
      if (from === station.name.toUpperCase() || to === station.name.toUpperCase()) {
        corridorsForStation.push({
          from: stationMap.get(from)?.name ?? from,
          to: stationMap.get(to)?.name ?? to,
          count
        });
      }
    }

    corridorsForStation.sort((a, b) => b.count - a.count);

    return {
      name: station.name,
      slug: station.slug,
      officer_count: officerCount,
      posting_frequency: station.posting_frequency,
      total_known_tenure_days: station.total_known_tenure_days,
      importance_score: importanceScore,
      importance_label: importanceLabel,
      common_designations: topEntriesFromCounter(station.designation_counter, 8),
      frequent_batches: topEntriesFromCounter(station.batch_counter, 8),
      notable_officer_ids: officers
        .filter((officer) => officer.station_history.some((item) => item.station.toUpperCase() === station.name.toUpperCase()))
        .sort((a, b) => b.timeline_entry_count - a.timeline_entry_count)
        .slice(0, 10)
        .map((officer) => officer.id),
      related_stations: relatedStations,
      movement_corridors: corridorsForStation.slice(0, 8),
      average_timeline_entries_for_linked_officers: Number(
        (
          officers
            .filter((officer) => officer.station_history.some((item) => item.station.toUpperCase() === station.name.toUpperCase()))
            .reduce((sum, officer) => sum + officer.timeline_entry_count, 0) /
          Math.max(1, officerCount)
        ).toFixed(1)
      ),
      narrative: `${station.name} appears in ${officerCount} officer journeys with ${station.posting_frequency} known posting records.`
    };
  });

  return stations.sort((a, b) => b.importance_score - a.importance_score);
}

function buildCareerPathsDataset(officers) {
  const progressionCounter = new Map();
  const rankTimings = new Map();
  const yearsToRank = [];

  for (const officer of officers) {
    const progression = officer.inferred_rank_progression.join(" -> ") || "Single-rank snapshot";
    progressionCounter.set(progression, (progressionCounter.get(progression) ?? 0) + 1);

    if (officer.years_to_current_rank != null && officer.current_designation) {
      const current = canonicalDesignation(officer.current_designation);
      if (current) {
        const entry = rankTimings.get(current) ?? { total: 0, count: 0 };
        entry.total += officer.years_to_current_rank;
        entry.count += 1;
        rankTimings.set(current, entry);
      }
      yearsToRank.push(officer.years_to_current_rank);
    }
  }

  yearsToRank.sort((a, b) => a - b);
  const p33 = yearsToRank.length > 0 ? yearsToRank[Math.floor(yearsToRank.length * 0.33)] : null;
  const p66 = yearsToRank.length > 0 ? yearsToRank[Math.floor(yearsToRank.length * 0.66)] : null;

  const fast = officers.filter((officer) =>
    officer.years_to_current_rank != null && p33 != null && officer.years_to_current_rank <= p33
  );
  const steady = officers.filter((officer) =>
    officer.years_to_current_rank != null && p33 != null && p66 != null && officer.years_to_current_rank > p33 && officer.years_to_current_rank <= p66
  );
  const deliberate = officers.filter((officer) =>
    officer.years_to_current_rank != null && p66 != null && officer.years_to_current_rank > p66
  );

  return {
    typical_progression_ladder: RANK_LADDER,
    common_progressions: topEntriesFromCounter(progressionCounter, 12),
    rank_step_timings: RANK_LADDER.map((rank) => {
      const info = rankTimings.get(rank);
      return {
        rank,
        average_years_to_reach: info ? Number((info.total / info.count).toFixed(1)) : null,
        sample_size: info?.count ?? 0
      };
    }),
    trajectory_bands: {
      fast: {
        threshold_years: p33,
        sample_size: fast.length,
        sample_officer_ids: fast.slice(0, 8).map((officer) => officer.id)
      },
      steady: {
        threshold_years: p66,
        sample_size: steady.length,
        sample_officer_ids: steady.slice(0, 8).map((officer) => officer.id)
      },
      deliberate: {
        sample_size: deliberate.length,
        sample_officer_ids: deliberate.slice(0, 8).map((officer) => officer.id)
      }
    },
    representative_journeys: officers
      .slice()
      .sort((a, b) => b.timeline_entry_count - a.timeline_entry_count)
      .slice(0, 15)
      .map((officer) => ({
        officer_id: officer.id,
        name: officer.name,
        batch: officer.batch,
        cadre: officer.cadre,
        timeline_entries: officer.timeline_entry_count,
        archetype: officer.career_archetype
      })),
    caveat:
      "Career-path insights are derived from known posting records and may under-represent missing or unverified entries."
  };
}

function buildDiscoveryDataset() {
  return {
    journeys: [
      {
        id: "discover-officers",
        title: "Explore by Officer",
        description: "Start with an officer profile and branch into related journeys, batches, and stations.",
        href: "/officers",
        learn_outcome: "Understand individual trajectory depth, mobility, and progression context."
      },
      {
        id: "discover-batches",
        title: "Explore by Batch",
        description: "See cohort-level patterns in progression, stations, archetypes, and designation spread.",
        href: "/batches",
        learn_outcome: "Understand how cohorts differ and evolve across time."
      },
      {
        id: "discover-cadres",
        title: "Explore by Cadre",
        description: "Compare journey signatures across cadres to see structural path differences.",
        href: "/cadres",
        learn_outcome: "Understand what makes each cadre trajectory distinct."
      },
      {
        id: "discover-stations",
        title: "Explore by Station",
        description: "Trace station centrality, linked officers, and movement corridors.",
        href: "/stations",
        learn_outcome: "Understand institutional geography through career footprints."
      },
      {
        id: "discover-paths",
        title: "Understand Career Paths",
        description: "Review common progression ladders and fast vs steady trajectory bands.",
        href: "/career-paths",
        learn_outcome: "Recognize common progression archetypes and outlier tracks."
      },
      {
        id: "discover-learning",
        title: "Learn Through Real Journeys",
        description: "Follow curated pathways designed for trainees and institutional learning.",
        href: "/learn",
        learn_outcome: "Build system understanding without needing a predefined search query."
      }
    ]
  };
}

function buildMetrics(officers) {
  const designationSet = new Set(officers.map((officer) => officer.current_designation).filter(Boolean));
  const cadreSet = new Set(officers.map((officer) => officer.cadre).filter(Boolean));

  const byQuality = officers.reduce(
    (accumulator, officer) => {
      const key = officer.data_quality?.timeline_quality ?? "minimal";
      accumulator[key] = (accumulator[key] ?? 0) + 1;
      return accumulator;
    },
    /** @type {Record<string, number>} */ ({})
  );

  const verification = officers.reduce(
    (accumulator, officer) => {
      const key = officer.verification_flag ?? "unknown";
      accumulator[key] = (accumulator[key] ?? 0) + 1;
      return accumulator;
    },
    /** @type {Record<string, number>} */ ({})
  );

  const byCadre = officers.reduce(
    (accumulator, officer) => {
      const key = officer.cadre ?? "UNKNOWN";
      accumulator[key] = (accumulator[key] ?? 0) + 1;
      return accumulator;
    },
    /** @type {Record<string, number>} */ ({})
  );

  const avgTimelineEntries =
    officers.length > 0
      ? Number((officers.reduce((sum, officer) => sum + officer.timeline_entry_count, 0) / officers.length).toFixed(1))
      : 0;

  return {
    total_officers: officers.length,
    timeline_rich_officers: byQuality.full ?? 0,
    partial_timeline_officers: byQuality.partial ?? 0,
    minimal_timeline_officers: byQuality.minimal ?? 0,
    cadres_covered: cadreSet.size,
    designation_spread: designationSet.size,
    average_timeline_entries: avgTimelineEntries,
    verification_breakdown: verification,
    cadre_breakdown: byCadre
  };
}

function writeJson(relativePath, data) {
  const target = path.join(ROOT, relativePath);
  fs.writeFileSync(target, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function main() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const sourceMode = resolveOfficerDataSourceMode(process.env.OFFICER_DATA_SOURCE_MODE);
  const useExcel = shouldUseExcel(sourceMode);
  let excelImportResult = {
    found: false,
    sourcePath: path.join(ROOT, "source_data", "officers_metadata.xlsx"),
    rowsLoaded: 0,
    officersLoaded: 0,
    postingEpisodesLoaded: 0,
    officers: []
  };

  if (useExcel) {
    try {
      excelImportResult = importOfficersMetadataXlsx({
        cwd: ROOT,
        relativePath: "source_data/officers_metadata.xlsx"
      });

      if (!excelImportResult.found) {
        const message = `Excel source file not found at ${excelImportResult.sourcePath}`;
        if (sourceMode === "excel-only") {
          throw new Error(message);
        }
        console.warn(`[build:data] ${message}. Falling back according to source mode.`);
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      if (sourceMode === "excel-only") {
        throw new Error(`Excel-only mode failed to load Excel source: ${reason}`);
      }
      console.warn(`[build:data] Excel import failed (${reason}). Falling back according to source mode.`);
      excelImportResult = {
        found: false,
        sourcePath: path.join(ROOT, "source_data", "officers_metadata.xlsx"),
        rowsLoaded: 0,
        officersLoaded: 0,
        postingEpisodesLoaded: 0,
        officers: []
      };
    }
  }

  if (!fs.existsSync(TEXT_DIR)) {
    throw new Error(`Missing text source directory: ${TEXT_DIR}`);
  }

  const officers = buildOfficers();

  const mergeDiagnostics = mergeSourceHistories({
    officers,
    excelImportResult,
    mode: sourceMode
  });

  computeRelatedOfficers(officers);

  const index = createIndex(officers);
  const metrics = buildMetrics(officers);
  const batches = buildBatchesDataset(officers);
  const cadres = buildCadresDataset(officers);
  const stations = buildStationsDataset(officers);
  const careerPaths = buildCareerPathsDataset(officers);
  const discovery = buildDiscoveryDataset();

  writeJson("data/officers.json", officers);
  writeJson("data/officers-index.json", index);
  writeJson("data/officers-metrics.json", metrics);
  writeJson("data/batches.json", batches);
  writeJson("data/cadres.json", cadres);
  writeJson("data/stations.json", stations);
  writeJson("data/career-paths.json", careerPaths);
  writeJson("data/discovery.json", discovery);

  const excelSourceStatus = useExcel
    ? `${excelImportResult.found ? "found" : "not found"} (${excelImportResult.sourcePath})`
    : `skipped (mode ${sourceMode})`;

  console.log(`[build:data] Source mode: ${sourceMode}`);
  console.log(`[build:data] Excel source: ${excelSourceStatus}`);
  console.log(
    `[build:data] Excel rows loaded: ${excelImportResult.rowsLoaded}, officer groups: ${excelImportResult.officersLoaded}, posting episodes: ${excelImportResult.postingEpisodesLoaded}`
  );
  console.log(
    `[build:data] Merge: matched=${mergeDiagnostics.officersMatchedToExcel}, excel_primary=${mergeDiagnostics.officersUsingExcelPrimary}, text_primary=${mergeDiagnostics.officersUsingTextPrimary}, empty_history=${mergeDiagnostics.officersWithEmptyPostingHistoryAfterMerge}`
  );
  console.log(`[build:data] Mode behavior: ${mergeDiagnostics.modeExplanation}`);
  console.log(`Built ${officers.length} officers`);
  console.log(`Timeline-rich officers: ${metrics.timeline_rich_officers}`);
  console.log(`Generated datasets: officers, batches, cadres, stations, career-paths, discovery`);
}

main();
