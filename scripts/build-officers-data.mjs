import fs from "node:fs";
import path from "node:path";

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

const FILES = fs
  .readdirSync(TEXT_DIR)
  .filter((name) => name.endsWith(".txt"))
  .sort((a, b) => a.localeCompare(b));

function normalizeSpaces(value) {
  return value.replace(/\s+/g, " ").trim();
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

function canonicalDesignation(value) {
  if (!value) return null;
  const source = normalizeSpaces(value).toLowerCase();

  if (source.includes("principal chief commissioner")) return "Principal Chief Commissioner";
  if (source.includes("chief commissioner")) return "Chief Commissioner";
  if (source.includes("principal commissioner")) return "Principal Commissioner";
  if (source.includes("additional commissioner") || source.includes("addl")) {
    return "Additional Commissioner";
  }
  if (source.includes("joint commissioner") || source.includes("jt.")) return "Joint Commissioner";
  if (source.includes("deputy commissioner") || source.includes("dy.")) return "Deputy Commissioner";
  if (source.includes("assistant commissioner") || source.includes("asst") || source.includes("ac ")) {
    return "Assistant Commissioner";
  }
  if (source.includes("commissioner")) return "Commissioner";

  return normalizeSpaces(value);
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
  let buffer = "";

  function flushRow(candidate) {
    const pairMatch = candidate.match(DATE_PAIR_PATTERN);
    let startDate = null;
    let endDate = null;
    let prefix = candidate;

    if (pairMatch) {
      startDate = pairMatch[1];
      endDate = pairMatch[2];
      prefix = candidate.slice(0, pairMatch.index).trimEnd();
    } else {
      const allDates = [...candidate.matchAll(DATE_PATTERN)].map((match) => match[1]);
      if (allDates.length === 0) return false;
      startDate = allDates[allDates.length - 1];
      endDate = null;
      const lastDateIndex = candidate.lastIndexOf(startDate);
      prefix = candidate.slice(0, lastDateIndex).trimEnd();
    }

    const startIso = toIsoDate(startDate);
    const endIso = toIsoDate(endDate);
    if (!startIso) return false;

    const { rankHeld, designation, chiefZone, orgUnit, station } = parsePrefixCells(prefix);
    const organizationUnitName = [chiefZone, orgUnit].filter(Boolean).join(" > ") || null;

    const confidence =
      startIso && endIso && station && designation
        ? 0.88
        : startIso && endIso
          ? 0.76
          : startIso
            ? 0.62
            : 0.45;

    rows.push({
      posting_id: `post-${employeeId}-${rows.length + 1}`,
      designation: designation ? canonicalDesignation(designation) : null,
      rank_held: rankHeld ? canonicalDesignation(rankHeld) : null,
      organization_unit_id: organizationUnitName
        ? `org-${organizationUnitName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`
        : null,
      organization_unit_name: organizationUnitName,
      location: station,
      start_date: startIso,
      end_date: endIso,
      source_doc: sourceDoc,
      confidence
    });

    return true;
  }

  for (const line of lines) {
    if (isPostingNoise(line)) continue;
    if (!line.trim()) continue;

    if (buffer) {
      buffer += ` ${line}`;
    } else {
      buffer = line;
    }

    const hasDatePair = DATE_PAIR_PATTERN.test(buffer);
    const hasTerminalDate = /(\d{1,2}\/\d{1,2}\/\d{4})\s*$/.test(buffer);

    if (hasDatePair || hasTerminalDate) {
      flushRow(buffer);
      buffer = "";
    }

    if (buffer.length > 1200) {
      flushRow(buffer);
      buffer = "";
    }
  }

  if (buffer) flushRow(buffer);

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
  if (postingCount >= 3) return "full";
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
      station: normalizeSpaces(posting.location),
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
  const currentDesignation = canonicalDesignation(
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
    ? {
        post_id: latestPosting.posting_id,
        designation: latestPosting.designation ?? currentDesignation,
        organization_unit_id: latestPosting.organization_unit_id,
        organization_unit_name: latestPosting.organization_unit_name,
        location: latestPosting.location,
        start_date: latestPosting.start_date,
        end_date: latestPosting.end_date,
        confidence: latestPosting.end_date ? 0.75 : 0.9
      }
    : {
        post_id: null,
        designation: currentDesignation,
        organization_unit_id: null,
        organization_unit_name: null,
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

  const yearsToCurrentRank =
    entryDateIso && presentRankIso
      ? Number(
          (
            (new Date(presentRankIso).getTime() - new Date(entryDateIso).getTime()) /
            (1000 * 60 * 60 * 24 * 365.25)
          ).toFixed(1)
        )
      : null;

  const qualityLabel = deriveQualityLabel(dataQuality);

  const officer = {
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
    timeline_richness_score: postingHistory.length,
    years_in_service: yearsInService,
    years_to_current_rank: yearsToCurrentRank
  };

  return officer;
}

function buildOfficers() {
  const officers = [];

  for (const fileName of FILES) {
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

function createIndex(officers) {
  return officers.map((officer) => {
    const searchBlob = [
      officer.name,
      officer.normalized_name,
      officer.employee_id,
      officer.batch,
      officer.cadre,
      officer.current_designation,
      officer.current_posting?.location,
      officer.current_posting?.organization_unit_name,
      officer.station_history?.map((item) => item.station).join(" ")
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
      current_location: officer.current_posting?.location ?? null,
      current_posting_summary: [
        officer.current_posting?.designation,
        officer.current_posting?.organization_unit_name,
        officer.current_posting?.location
      ]
        .filter(Boolean)
        .join(" • "),
      timeline_quality: officer.data_quality?.timeline_quality ?? "minimal",
      timeline_richness_score: officer.timeline_richness_score,
      verification_flag: officer.verification_flag,
      data_quality_label: officer.data_quality_label,
      search_blob: searchBlob
    };
  });
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

  return {
    total_officers: officers.length,
    timeline_rich_officers: byQuality.full ?? 0,
    partial_timeline_officers: byQuality.partial ?? 0,
    minimal_timeline_officers: byQuality.minimal ?? 0,
    cadres_covered: cadreSet.size,
    designation_spread: designationSet.size,
    verification_breakdown: verification,
    cadre_breakdown: byCadre
  };
}

function writeJson(relativePath, data) {
  const target = path.join(ROOT, relativePath);
  fs.writeFileSync(target, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function main() {
  if (!fs.existsSync(TEXT_DIR)) {
    throw new Error(`Missing text source directory: ${TEXT_DIR}`);
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const officers = buildOfficers();
  const index = createIndex(officers);
  const metrics = buildMetrics(officers);

  writeJson("data/officers.json", officers);
  writeJson("data/officers-index.json", index);
  writeJson("data/officers-metrics.json", metrics);

  console.log(`Built ${officers.length} officers`);
  console.log(`Timeline rich: ${metrics.timeline_rich_officers}`);
}

main();
