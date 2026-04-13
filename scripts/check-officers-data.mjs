import fs from "node:fs";
import path from "node:path";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const filePath = path.join(process.cwd(), "data", "officers.json");
assert(fs.existsSync(filePath), `Missing data file: ${filePath}`);

const payload = fs.readFileSync(filePath, "utf8");
const officers = JSON.parse(payload);
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

  for (const entry of officer.station_history ?? []) {
    assert(
      !noisyDisplayPattern.test(entry.station),
      `Noisy station_history station for ${officer.id}: ${entry.station}`
    );
  }

  for (const relatedId of officer.related_officer_ids) {
    assert(typeof relatedId === "string", `Invalid related officer ID type for ${officer.id}`);
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

console.log(
  `Data sanity checks passed for ${officers.length} officers; batches=${batches.length}, cadres=${cadres.length}, stations=${stations.length}.`
);
