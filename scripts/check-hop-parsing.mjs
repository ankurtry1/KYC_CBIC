import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const HOP_SOURCE_DIR = path.join(ROOT, "source_data", "hop");
const EMPLOYEE_PATTERN = /Employee Information\s*-\s*(\d+)/g;
const EXPECTED_TEXT_FILES = [
  "PCC.txt",
  "CC.txt",
  "PC.txt",
  "Commr.txt",
  "ADC-JC DR.txt",
  "ADC-JC PA.txt",
  "ADC-JC PE.txt",
  "AC-DC DR.txt",
  "AC-DC PA.txt",
  "AC-DC PC.txt",
  "AC-DC PE.txt"
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function resolveLatestSnapshotDate() {
  const latestPath = path.join(HOP_SOURCE_DIR, "latest.json");
  if (fs.existsSync(latestPath)) {
    const latest = readJson(latestPath);
    if (typeof latest.snapshotDate === "string") return latest.snapshotDate;
  }

  const dates = fs
    .readdirSync(HOP_SOURCE_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => b.localeCompare(a));

  if (dates.length === 0) {
    throw new Error("No HOP snapshots found");
  }

  return dates[0];
}

function collectSourceIds(textDir) {
  const ids = [];
  const fileStats = [];
  const byId = new Map();

  for (const fileName of EXPECTED_TEXT_FILES) {
    const filePath = path.join(textDir, fileName);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing expected HOP text file: ${filePath}`);
    }

    const text = fs.readFileSync(filePath, "utf8");
    const matches = [...text.matchAll(EMPLOYEE_PATTERN)].map((match) => match[1]);
    if (matches.length === 0) {
      throw new Error(`No employee markers found in ${fileName}`);
    }

    for (const id of matches) {
      ids.push(id);
      const files = byId.get(id) ?? [];
      files.push(fileName);
      byId.set(id, files);
    }

    fileStats.push({
      fileName,
      employeeMarkers: matches.length,
      uniqueEmployeeIds: new Set(matches).size
    });
  }

  return { ids, byId, fileStats };
}

function main() {
  const snapshotDate = resolveLatestSnapshotDate();
  const textDir = path.join(HOP_SOURCE_DIR, snapshotDate, "text");
  const { ids, byId, fileStats } = collectSourceIds(textDir);
  const duplicateSourceIds = [...byId.entries()]
    .filter(([, files]) => files.length > 1)
    .map(([id, files]) => ({ id, files }));

  const officers = readJson(path.join(ROOT, "data", "officers.json"));
  const sourceFreshness = readJson(path.join(ROOT, "data", "source-freshness.json"));
  const generatedById = new Map();
  const duplicateGeneratedIds = [];

  for (const officer of officers) {
    if (generatedById.has(officer.employee_id)) {
      duplicateGeneratedIds.push(officer.employee_id);
      continue;
    }
    generatedById.set(officer.employee_id, officer);
  }

  const missingInGenerated = [...new Set(ids)].filter((id) => !generatedById.has(id));
  const sourceOfficerStats = fileStats.map((fileStat) => {
    const filePath = path.join(textDir, fileStat.fileName);
    const text = fs.readFileSync(filePath, "utf8");
    const sourceIds = [...text.matchAll(EMPLOYEE_PATTERN)].map((match) => match[1]);
    const matchedOfficers = sourceIds
      .map((id) => generatedById.get(id))
      .filter(Boolean);

    return {
      ...fileStat,
      generatedMatches: matchedOfficers.length,
      generatedWithoutName: matchedOfficers.filter((officer) => !officer.name).length,
      generatedWithoutPostingHistory: matchedOfficers.filter(
        (officer) => (officer.posting_history?.length ?? 0) === 0
      ).length
    };
  });

  console.log(`[check:hop] Snapshot: ${snapshotDate}`);
  for (const stat of sourceOfficerStats) {
    console.log(
      `[check:hop] ${stat.fileName}: markers=${stat.employeeMarkers}, unique=${stat.uniqueEmployeeIds}, generated=${stat.generatedMatches}, no_name=${stat.generatedWithoutName}, no_history=${stat.generatedWithoutPostingHistory}`
    );
  }
  console.log(`[check:hop] Source employee markers: ${ids.length}`);
  console.log(`[check:hop] Unique source employee IDs: ${byId.size}`);
  console.log(`[check:hop] Generated officers: ${officers.length}`);
  console.log(
    `[check:hop] HOP freshness source: ${sourceFreshness.text_source?.snapshot_date ?? "unknown"}`
  );

  const failures = [];
  if (sourceFreshness.text_source?.snapshot_date !== snapshotDate) {
    failures.push("Generated source freshness does not point at latest HOP snapshot");
  }
  if (missingInGenerated.length > 0) {
    failures.push(
      `Generated data is missing ${missingInGenerated.length} source employee IDs: ${missingInGenerated.slice(0, 10).join(", ")}`
    );
  }
  if (duplicateSourceIds.length > 0) {
    failures.push(
      `Duplicate employee IDs in HOP text: ${duplicateSourceIds
        .slice(0, 10)
        .map((entry) => `${entry.id} (${entry.files.join(", ")})`)
        .join("; ")}`
    );
  }
  if (duplicateGeneratedIds.length > 0) {
    failures.push(
      `Duplicate generated employee IDs: ${[...new Set(duplicateGeneratedIds)].slice(0, 10).join(", ")}`
    );
  }

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`[check:hop] ${failure}`);
    }
    process.exit(1);
  }

  console.log("[check:hop] HOP parsing checks passed");
}

main();
