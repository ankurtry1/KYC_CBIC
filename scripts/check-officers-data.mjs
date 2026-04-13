import fs from "node:fs";
import path from "node:path";
import { resolveOfficerDataSourceMode } from "./officer-source-mode.mjs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const filePath = path.join(process.cwd(), "data", "officers.json");
assert(fs.existsSync(filePath), `Missing data file: ${filePath}`);

const payload = fs.readFileSync(filePath, "utf8");
const officers = JSON.parse(payload);
const sourceMode = resolveOfficerDataSourceMode(process.env.OFFICER_DATA_SOURCE_MODE);
const indexPath = path.join(process.cwd(), "data", "officers-index.json");
assert(fs.existsSync(indexPath), `Missing generated dataset: ${indexPath}`);
const officersIndex = JSON.parse(fs.readFileSync(indexPath, "utf8"));

const batchesPath = path.join(process.cwd(), "data", "batches.json");
const cadresPath = path.join(process.cwd(), "data", "cadres.json");
const stationsPath = path.join(process.cwd(), "data", "stations.json");
const careerPathsPath = path.join(process.cwd(), "data", "career-paths.json");
const discoveryPath = path.join(process.cwd(), "data", "discovery.json");
const metricsPath = path.join(process.cwd(), "data", "officers-metrics.json");

assert(Array.isArray(officers), "data/officers.json must be an array");
assert(officers.length > 4000, `Expected officers.length > 4000, got ${officers.length}`);

for (const requiredPath of [batchesPath, cadresPath, stationsPath, careerPathsPath, discoveryPath]) {
  assert(fs.existsSync(requiredPath), `Missing generated dataset: ${requiredPath}`);
}
assert(fs.existsSync(metricsPath), `Missing generated dataset: ${metricsPath}`);

const batches = JSON.parse(fs.readFileSync(batchesPath, "utf8"));
const cadres = JSON.parse(fs.readFileSync(cadresPath, "utf8"));
const stations = JSON.parse(fs.readFileSync(stationsPath, "utf8"));
const careerPaths = JSON.parse(fs.readFileSync(careerPathsPath, "utf8"));
const discovery = JSON.parse(fs.readFileSync(discoveryPath, "utf8"));
const metrics = JSON.parse(fs.readFileSync(metricsPath, "utf8"));

const noisyDisplayPattern =
  /\b(w\.?\s*e\.?\s*f\.?|joining\s+report|promotion|prom\s+as|as\s+per|vide|order\s+no|report\s+\d{1,4}\/\d{2,4})\b/i;
const postingTitleJunkPattern = /\b(recd\.?|joining|report|vide|as\s+per|wef|order\s+no)\b/i;
const duplicateGstPattern = /(gst\s*&\s*cx(?:\s+zone)?)\s+\1/i;
const allowedFallbackPostingSummary = "Posting details partially inferred";

assert(Array.isArray(batches) && batches.length > 0, "data/batches.json must be non-empty");
assert(Array.isArray(cadres) && cadres.length > 0, "data/cadres.json must be non-empty");
assert(Array.isArray(stations) && stations.length > 0, "data/stations.json must be non-empty");
assert(Array.isArray(careerPaths.common_progressions), "data/career-paths.json must contain common_progressions");
assert(Array.isArray(discovery.journeys) && discovery.journeys.length > 0, "data/discovery.json must contain journeys");
assert(metrics.total_officers > 0, "metrics.total_officers must be > 0");
assert(metrics.timeline_rich_officers > 0, "metrics.timeline_rich_officers must be > 0");
assert(metrics.cadres_covered > 0, "metrics.cadres_covered must be > 0");
assert(metrics.designation_spread > 0, "metrics.designation_spread must be > 0");

const ids = new Set();
let hasPostingHistory = false;
let excelPostingCount = 0;
let textPostingCount = 0;

for (const officer of officers) {
  assert(typeof officer.id === "string" && officer.id.length > 0, "Every officer must have a non-empty id");
  assert(
    typeof officer.employee_id === "string" && officer.employee_id.length > 0,
    `Officer ${officer.id} must have employee_id`
  );

  assert(!ids.has(officer.id), `Duplicate officer id detected: ${officer.id}`);
  ids.add(officer.id);

  if (Array.isArray(officer.posting_history) && officer.posting_history.length > 0) {
    hasPostingHistory = true;
  }

  const hasTimelineScore = typeof officer.timeline_richness_score === "number";
  const hasPostingArray = Array.isArray(officer.posting_history);

  if (hasTimelineScore && hasPostingArray) {
    assert(
      officer.timeline_richness_score === officer.posting_history.length,
      `timeline_richness_score mismatch for ${officer.id}: score=${officer.timeline_richness_score}, postings=${officer.posting_history.length}`
    );
  }

  assert(typeof officer.timeline_entry_count === "number", `Missing timeline_entry_count for ${officer.id}`);
  assert(typeof officer.unique_station_count === "number", `Missing unique_station_count for ${officer.id}`);
  assert(typeof officer.mobility_profile === "string", `Missing mobility_profile for ${officer.id}`);
  assert(typeof officer.career_archetype === "string", `Missing career_archetype for ${officer.id}`);
  assert(typeof officer.narrative_summary === "string", `Missing narrative_summary for ${officer.id}`);
  assert(Array.isArray(officer.related_officer_ids), `Missing related_officer_ids array for ${officer.id}`);
  assert(officer.insight_summary != null, `Missing insight_summary for ${officer.id}`);

  if (officer.current_posting?.location) {
    assert(
      !noisyDisplayPattern.test(officer.current_posting.location),
      `Noisy current_posting.location for ${officer.id}: ${officer.current_posting.location}`
    );
  }
  if (officer.current_posting?.start_date && officer.current_posting?.end_date) {
    assert(
      officer.current_posting.end_date >= officer.current_posting.start_date,
      `Current posting end_date precedes start_date for ${officer.id}`
    );
  }

  for (const entry of officer.station_history ?? []) {
    assert(
      !noisyDisplayPattern.test(entry.station),
      `Noisy station_history station for ${officer.id}: ${entry.station}`
    );
  }

  for (const relatedId of officer.related_officer_ids) {
    assert(typeof relatedId === "string", `Invalid related officer ID type for ${officer.id}`);
  }

  for (const posting of officer.posting_history ?? []) {
    if (posting.source_type === "excel") excelPostingCount += 1;
    if (posting.source_type === "text") textPostingCount += 1;

    const role = posting.designation_display ?? posting.designation ?? posting.rank_held ?? "";
    if (role) {
      assert(!postingTitleJunkPattern.test(role), `Junk posting role for ${officer.id}: ${role}`);
    }

    const orgDisplay = posting.organization_display ?? posting.organization_unit_name ?? "";
    if (orgDisplay) {
      assert(!duplicateGstPattern.test(orgDisplay.toLowerCase()), `Duplicated GST fragment in org for ${officer.id}: ${orgDisplay}`);
      assert(!/,\s*>/.test(orgDisplay), `Malformed org delimiter in ${officer.id}: ${orgDisplay}`);
    }

    const stationDisplay = posting.station_display ?? posting.location ?? "";
    if (stationDisplay) {
      assert(
        !/\b(order|report|vide|as\s+per|wef)\b/i.test(stationDisplay),
        `Station contains administrative residue for ${officer.id}: ${stationDisplay}`
      );
      assert(!/,\s*>/.test(stationDisplay), `Malformed station delimiter in ${officer.id}: ${stationDisplay}`);
    }

    if (posting.start_date && posting.end_date) {
      assert(
        posting.end_date >= posting.start_date,
        `Posting has end_date earlier than start_date for ${officer.id}: ${posting.start_date} -> ${posting.end_date}`
      );
    }
  }
}

assert(hasPostingHistory, "Expected at least one officer with non-empty posting_history");

for (const officer of officers) {
  for (const relatedId of officer.related_officer_ids) {
    assert(ids.has(relatedId), `related_officer_ids contains unknown ID for ${officer.id}: ${relatedId}`);
  }
}

for (const record of officersIndex) {
  if (record.current_location) {
    assert(
      !noisyDisplayPattern.test(record.current_location),
      `Noisy current_location in officers-index for ${record.id}: ${record.current_location}`
    );
  }
  if (record.current_posting_summary) {
    assert(
      !noisyDisplayPattern.test(record.current_posting_summary),
      `Noisy current_posting_summary in officers-index for ${record.id}: ${record.current_posting_summary}`
    );
    assert(
        record.current_posting_summary === allowedFallbackPostingSummary ||
        /^[a-z0-9\s•,./()&>'-]+$/i.test(record.current_posting_summary),
      `current_posting_summary should be human-readable for ${record.id}: ${record.current_posting_summary}`
    );
  }
}

const officer9368 = officers.find((officer) => officer.id === "officer-9368");
if (officer9368) {
  const timelineSorted = [...(officer9368.posting_history ?? [])].sort((left, right) => {
    const leftTs = left.start_date ? new Date(left.start_date).getTime() : 0;
    const rightTs = right.start_date ? new Date(right.start_date).getTime() : 0;
    return rightTs - leftTs;
  });

  const currentRole = officer9368.current_posting?.designation_display ?? officer9368.current_posting?.designation ?? "";
  const currentOrg = officer9368.current_posting?.organization_display ?? officer9368.current_posting?.organization_unit_name ?? "";
  const currentStation = officer9368.current_posting?.station_display ?? officer9368.current_posting?.location ?? "";
  assert(!postingTitleJunkPattern.test(currentRole), `officer-9368 current role is junk: ${currentRole}`);
  assert(!/,\s*>/.test(currentOrg), `officer-9368 current org malformed: ${currentOrg}`);
  assert(!/\b(order|report|vide|wef)\b/i.test(currentStation), `officer-9368 station malformed: ${currentStation}`);
  assert(
    /Deputy Commissioner/i.test(currentRole),
    `officer-9368 current role should be Deputy Commissioner-like, got: ${currentRole}`
  );
  assert(/NACIN/i.test(currentOrg), `officer-9368 current org should include NACIN, got: ${currentOrg}`);
  assert(/Palasamudram/i.test(currentStation), `officer-9368 station should include Palasamudram, got: ${currentStation}`);

  if (timelineSorted.length >= 2) {
    const latest = timelineSorted[0];
    const second = timelineSorted[1];
    const latestRole = latest.designation_display ?? latest.designation ?? latest.rank_held ?? "";
    const latestOrg = latest.organization_display ?? latest.organization_unit_name ?? "";
    const latestStation = latest.station_display ?? latest.location ?? "";
    const secondRole = second.designation_display ?? second.designation ?? second.rank_held ?? "";
    const secondOrg = second.organization_display ?? second.organization_unit_name ?? "";
    const secondStation = second.station_display ?? second.location ?? "";

    assert(/Deputy Commissioner/i.test(latestRole), `officer-9368 latest posting role mismatch: ${latestRole}`);
    assert(/NACIN/i.test(latestOrg), `officer-9368 latest posting org mismatch: ${latestOrg}`);
    assert(/Palasamudram/i.test(latestStation), `officer-9368 latest posting station mismatch: ${latestStation}`);
    assert(/Deputy Commissioner|Assistant Commissioner/i.test(secondRole), `officer-9368 second posting role mismatch: ${secondRole}`);
    assert(/DGGI|GST\s*&\s*CX/i.test(secondOrg), `officer-9368 second posting org mismatch: ${secondOrg}`);
    assert(/Bhuban(?:e)?sh?war/i.test(secondStation), `officer-9368 second posting station mismatch: ${secondStation}`);
  }
}

if (sourceMode === "text-only") {
  assert(excelPostingCount === 0, `text-only mode should not output excel postings, found ${excelPostingCount}`);
}

if (sourceMode === "excel-only") {
  assert(textPostingCount === 0, `excel-only mode should not output text postings, found ${textPostingCount}`);
  assert(excelPostingCount > 0, "excel-only mode should output at least one excel posting");
}

if (sourceMode === "excel-first") {
  assert(excelPostingCount > 0, "excel-first mode should include excel postings");
}

if (sourceMode === "text-first") {
  assert(textPostingCount > 0, "text-first mode should include text postings");
}

console.log(
  `Data sanity checks passed for ${officers.length} officers; batches=${batches.length}, cadres=${cadres.length}, stations=${stations.length}; mode=${sourceMode}, excel_postings=${excelPostingCount}, text_postings=${textPostingCount}.`
);
