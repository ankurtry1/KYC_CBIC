import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";

const DEFAULT_XLSX_RELATIVE_PATH = "source_data/officers_metadata.xlsx";
const ADMINISTRATIVE_NOISE_REPLACE_PATTERN =
  /\b(?:recd\.?|joining(?:\s+report)?|report|vide|as\s+per|w\.?\s*e\.?\s*f\.?|order\s+no|no\.?|lr|l\.r|rel\.?)\b/gi;
const ADMINISTRATIVE_NOISE_CHECK_PATTERN =
  /\b(?:recd\.?|joining(?:\s+report)?|report|vide|as\s+per|w\.?\s*e\.?\s*f\.?|order\s+no|no\.?|lr|l\.r|rel\.?)\b/i;
const FORCED_UPPER_WORDS = new Set([
  "GST",
  "CX",
  "DGGI",
  "DRI",
  "NACIN",
  "NACEN",
  "CCO",
  "CBIC",
  "DGHRD",
  "DGPM",
  "DLA",
  "DG"
]);

function normalizeSpaces(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeName(value) {
  return normalizeSpaces(
    String(value ?? "")
      .replace(/\([^)]*\)/g, " ")
      .replace(/\b(Mr|Mrs|Ms|Dr|Shri|Smt)\.?\b/gi, " ")
      .replace(/[^A-Za-z ]/g, " ")
  )
    .toUpperCase();
}

function normalizeHeader(value) {
  return normalizeSpaces(String(value ?? ""))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function toIsoDate(value) {
  if (value == null || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const raw = normalizeSpaces(value);
  if (!raw) return null;

  const dmy = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    let year = Number(dmy[3]);
    if (year < 100) year += 2000;
    const date = new Date(Date.UTC(year, month - 1, day));
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()))
      .toISOString()
      .slice(0, 10);
  }

  return null;
}

function maybeNumber(value) {
  if (value == null || value === "") return null;
  const parsed = Number(String(value).trim());
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function canonicalDesignation(value) {
  const source = normalizeSpaces(value).toLowerCase();
  if (!source) return null;

  if (/(principal\s+chief\s+commissioner|\bpcc\b)/i.test(source)) return "Principal Chief Commissioner";
  if (/(chief\s+commissioner|\bcc\b)/i.test(source)) return "Chief Commissioner";
  if (/(principal\s+commissioner|\bpr\.?\s*commissioner\b|\bpc\b)/i.test(source)) return "Principal Commissioner";
  if (/(additional\s+commissioner|\baddl\.?\b|\badc\b)/i.test(source)) return "Additional Commissioner";
  if (/(joint\s+commissioner|\bjt\.?\b|\bjc\b)/i.test(source)) return "Joint Commissioner";
  if (/(deputy\s+commissioner|\bdy\.?\b|\bdc\b)/i.test(source)) return "Deputy Commissioner";
  if (/(assistant\s+commissioner|\basst\.?\b|\bac\b)/i.test(source)) return "Assistant Commissioner";
  if (/\bcommissioner\b/i.test(source)) return "Commissioner";
  return null;
}

function stripAdministrativeText(value) {
  return normalizeSpaces(
    String(value ?? "")
      .replace(ADMINISTRATIVE_NOISE_REPLACE_PATTERN, " ")
      .replace(/\b\d{1,4}\/\d{2,4}\b/g, " ")
      .replace(/\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/g, " ")
      .replace(/[()[\]{}]/g, " ")
      .replace(/[|_]/g, " ")
  );
}

function dedupeWords(value) {
  const words = normalizeSpaces(value).split(" ").filter(Boolean);
  const deduped = [];
  for (const word of words) {
    if (deduped.length === 0 || deduped[deduped.length - 1].toLowerCase() !== word.toLowerCase()) {
      deduped.push(word);
    }
  }
  return deduped.join(" ");
}

function displayCase(value, { preserveAcronyms = true } = {}) {
  return normalizeSpaces(value)
    .split(" ")
    .filter(Boolean)
    .map((part) => {
      const normalizedPart = part.replace(/\.+$/g, "");
      const upper = normalizedPart.toUpperCase();
      if (
        preserveAcronyms &&
        (FORCED_UPPER_WORDS.has(upper) || /^[A-Z0-9&/-]{2,4}$/.test(upper))
      ) {
        return upper;
      }

      return `${normalizedPart[0]?.toUpperCase() ?? ""}${normalizedPart.slice(1).toLowerCase()}`;
    })
    .join(" ");
}

function sanitizeOrganizationDisplay(primary, fallback, stationDisplay) {
  const base = normalizeSpaces(primary) || normalizeSpaces(fallback);
  if (!base && !stationDisplay) return null;

  const cleanedPrimary = normalizeSpaces(stripAdministrativeText(base))
    .replace(/\s*,\s*>\s*/g, " ")
    .replace(/\s*>\s*/g, " ")
    .replace(/\b(GST\s*&\s*CX)\s+ZONE\s+\1\b/gi, "$1 Zone")
    .replace(/\b([A-Z]*GST\s*&\s*CX)\s+GST\s*&\s*CX\b/gi, "$1")
    .replace(/\b([A-Z]*GST\s*&\s*CX)\s+GST\s*&\s*CX\s+ZONE\b/gi, "$1 Zone");

  const deduped = normalizeSpaces(dedupeWords(cleanedPrimary));

  if (deduped && !ADMINISTRATIVE_NOISE_CHECK_PATTERN.test(deduped)) {
    return displayCase(deduped, { preserveAcronyms: true });
  }

  if (stationDisplay && /\bGST\s*&\s*CX\b/i.test(base)) {
    return displayCase(`${stationDisplay} GST & CX`, { preserveAcronyms: true });
  }

  return null;
}

function sanitizeStationDisplay(value) {
  const cleaned = normalizeSpaces(
    dedupeWords(
      stripAdministrativeText(value)
        .replace(/\s*,\s*>\s*/g, " ")
        .replace(/\s*>\s*/g, " ")
    )
  );
  if (!cleaned) return null;
  if (/\b(order|report|vide|wef|as\s+per)\b/i.test(cleaned)) return null;
  if (/,\s*>/.test(cleaned)) return null;
  if ((cleaned.match(/\d/g) ?? []).length >= Math.ceil(cleaned.length * 0.35)) return null;
  return displayCase(cleaned, { preserveAcronyms: false });
}

function sanitizeRemarksDisplay(value) {
  const cleaned = normalizeSpaces(String(value ?? ""));
  if (!cleaned) return null;
  if (/\b(order|report|vide|as\s+per|wef|joining|recd|rel\.?)\b/i.test(cleaned)) return null;
  if (cleaned.length < 4) return null;
  if (!/[a-z]/i.test(cleaned)) return null;
  return cleaned;
}

function deriveDesignationDisplay(rankHeldRaw, designationRaw, presentDesignationRaw) {
  return (
    canonicalDesignation(rankHeldRaw) ??
    canonicalDesignation(stripAdministrativeText(rankHeldRaw)) ??
    canonicalDesignation(designationRaw) ??
    canonicalDesignation(stripAdministrativeText(designationRaw)) ??
    canonicalDesignation(presentDesignationRaw) ??
    null
  );
}

function buildIdentityKeys({ name, dobIso, batch, cadre }) {
  const normalizedName = normalizeName(name);
  const upperCadre = normalizeSpaces(cadre).toUpperCase() || null;
  const keys = [];

  if (normalizedName && dobIso && batch != null && upperCadre) {
    keys.push(`name-dob-batch-cadre:${normalizedName}|${dobIso}|${batch}|${upperCadre}`);
  }
  if (normalizedName && dobIso && batch != null) {
    keys.push(`name-dob-batch:${normalizedName}|${dobIso}|${batch}`);
  }
  if (normalizedName && dobIso) {
    keys.push(`name-dob:${normalizedName}|${dobIso}`);
  }
  if (normalizedName && batch != null && upperCadre) {
    keys.push(`name-batch-cadre:${normalizedName}|${batch}|${upperCadre}`);
  }
  if (normalizedName) {
    keys.push(`name:${normalizedName}`);
  }

  return [...new Set(keys)];
}

function pick(row, headerKeyMap, aliases) {
  for (const alias of aliases) {
    const normalized = normalizeHeader(alias);
    const actualKey = headerKeyMap.get(normalized);
    if (actualKey && row[actualKey] != null && row[actualKey] !== "") {
      return row[actualKey];
    }
  }
  return null;
}

export function importOfficersMetadataXlsx({
  cwd = process.cwd(),
  relativePath = DEFAULT_XLSX_RELATIVE_PATH
} = {}) {
  const sourcePath = path.join(cwd, relativePath);
  if (!fs.existsSync(sourcePath)) {
    return {
      sourcePath,
      found: false,
      rowsLoaded: 0,
      officersLoaded: 0,
      postingEpisodesLoaded: 0,
      officers: []
    };
  }

  const workbook = XLSX.readFile(sourcePath, { cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: null, raw: false });

  const groupedByPrimary = new Map();
  const identityToPrimary = new Map();

  for (const row of rows) {
    const headerKeys = new Map(
      Object.keys(row).map((key) => [normalizeHeader(key), key])
    );

    const officerName = pick(row, headerKeys, ["Name of Officer", "Officer Name"]);
    const dobRaw = pick(row, headerKeys, ["Date of Birth", "DOB"]);
    const batchRaw = pick(row, headerKeys, ["Batch"]);
    const dateOfEntryRaw = pick(row, headerKeys, ["Date of Entry into Gr.A Service"]);
    const cadreRaw = pick(row, headerKeys, ["Cadre"]);
    const presentDesignationRaw = pick(row, headerKeys, ["Present Designation"]);

    const rankHeldRaw = pick(row, headerKeys, ["Rank Held"]);
    const designationRaw = pick(row, headerKeys, ["Designation"]);
    const chiefCommissionerateRaw = pick(row, headerKeys, ["Chief Commissionerate", "Chief Commissionrate"]);
    const organizationRaw = pick(row, headerKeys, [
      "Directorate Commissionerate / Organisation Name",
      "Directorate/Commissionerate/Organisation Name",
      "Organisation Name"
    ]);
    const stationRaw = pick(row, headerKeys, ["Station"]);
    const fromDateRaw = pick(row, headerKeys, ["From Date", "FromDate"]);
    const toDateRaw = pick(row, headerKeys, ["To Date", "ToDate"]);
    const remarksRaw = pick(row, headerKeys, ["Remarks"]);
    const orderNoRaw = pick(row, headerKeys, ["Promotion/Transfer Order No.", "Order No"]);
    const orderDateRaw = pick(row, headerKeys, ["Promotion/Transfer Order Date", "Order Date"]);
    const additionalChargeRaw = pick(row, headerKeys, ["Additional Charge"]);

    const fromDate = toIsoDate(fromDateRaw);
    if (!fromDate) continue;

    const batch = maybeNumber(batchRaw);
    const dob = toIsoDate(dobRaw);
    let toDate = toIsoDate(toDateRaw);
    if (fromDate && toDate && toDate < fromDate) {
      toDate = null;
    }

    const designationDisplay = deriveDesignationDisplay(rankHeldRaw, designationRaw, presentDesignationRaw);
    const stationDisplay = sanitizeStationDisplay(stationRaw);
    const organizationDisplay = sanitizeOrganizationDisplay(
      organizationRaw,
      chiefCommissionerateRaw,
      stationDisplay
    );
    const remarksDisplay = sanitizeRemarksDisplay(remarksRaw);
    const orderNo = normalizeSpaces(orderNoRaw) || null;
    const orderDate = toIsoDate(orderDateRaw);
    const cadre = normalizeSpaces(cadreRaw).toUpperCase() || null;

    const confidence =
      designationDisplay && organizationDisplay && stationDisplay && toDate
        ? 0.92
        : designationDisplay && organizationDisplay && stationDisplay
          ? 0.84
          : designationDisplay && (organizationDisplay || stationDisplay)
            ? 0.72
            : 0.58;

    const episode = {
      posting_id: null,
      rank_held_raw: normalizeSpaces(rankHeldRaw) || null,
      designation_raw: normalizeSpaces(designationRaw) || null,
      designation_display: designationDisplay,
      designation: designationDisplay,
      rank_held: designationDisplay,
      chief_commissionerate_raw: normalizeSpaces(chiefCommissionerateRaw) || null,
      organization_raw: normalizeSpaces(organizationRaw) || null,
      organization_display: organizationDisplay,
      organization_unit_id: organizationDisplay
        ? `org-${organizationDisplay.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`
        : null,
      organization_unit_name: organizationDisplay,
      station_raw: normalizeSpaces(stationRaw) || null,
      station_display: stationDisplay,
      location: stationDisplay,
      from_date: fromDate,
      to_date: toDate,
      start_date: fromDate,
      end_date: toDate,
      remarks_raw: normalizeSpaces(remarksRaw) || null,
      remarks_display: remarksDisplay,
      order_no: orderNo,
      order_date: orderDate,
      additional_charge_raw: normalizeSpaces(additionalChargeRaw) || null,
      source_doc: "officers_metadata.xlsx",
      source_type: "excel",
      confidence
    };

    const identity = {
      name: normalizeSpaces(officerName) || null,
      normalized_name: normalizeName(officerName) || null,
      dob,
      batch,
      cadre,
      date_of_entry_gr_a: toIsoDate(dateOfEntryRaw),
      present_designation: normalizeSpaces(presentDesignationRaw) || null
    };

    const identityKeys = buildIdentityKeys({
      name: identity.name,
      dobIso: identity.dob,
      batch: identity.batch,
      cadre: identity.cadre
    });

    if (identityKeys.length === 0) continue;

    const resolvedPrimary =
      identityKeys.find((identityKey) => identityToPrimary.has(identityKey)) ?? identityKeys[0];
    const primaryKey = identityToPrimary.get(resolvedPrimary) ?? resolvedPrimary;

    const existing = groupedByPrimary.get(primaryKey) ?? {
      ...identity,
      identity_keys: identityKeys,
      posting_history: []
    };

    existing.name = existing.name ?? identity.name;
    existing.normalized_name = existing.normalized_name ?? identity.normalized_name;
    existing.dob = existing.dob ?? identity.dob;
    existing.batch = existing.batch ?? identity.batch;
    existing.cadre = existing.cadre ?? identity.cadre;
    existing.date_of_entry_gr_a = existing.date_of_entry_gr_a ?? identity.date_of_entry_gr_a;
    existing.present_designation = existing.present_designation ?? identity.present_designation;
    existing.identity_keys = [...new Set([...(existing.identity_keys ?? []), ...identityKeys])];
    existing.posting_history.push(episode);
    groupedByPrimary.set(primaryKey, existing);

    for (const key of identityKeys) {
      identityToPrimary.set(key, primaryKey);
    }
  }

  const officers = [...groupedByPrimary.values()].map((officer) => {
    const sortedHistory = officer.posting_history
      .slice()
      .sort((left, right) => {
        const a = left.start_date ? new Date(left.start_date).getTime() : 0;
        const b = right.start_date ? new Date(right.start_date).getTime() : 0;
        return a - b;
      })
      .map((posting, index) => ({
        ...posting,
        posting_id: posting.posting_id ?? `excel-post-${officer.normalized_name ?? "unknown"}-${index + 1}`
      }));

    return {
      ...officer,
      posting_history: sortedHistory
    };
  });

  return {
    sourcePath,
    sheetName,
    found: true,
    rowsLoaded: rows.length,
    officersLoaded: officers.length,
    postingEpisodesLoaded: officers.reduce((sum, officer) => sum + officer.posting_history.length, 0),
    officers
  };
}
