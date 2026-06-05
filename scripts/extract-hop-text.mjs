import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const HOP_SOURCE_DIR = path.join(ROOT, "source_data", "hop");
const EMPLOYEE_PATTERN = /Employee Information\s*-\s*(\d+)/g;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(`${filePath}.tmp`, filePath);
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
    throw new Error("No HOP snapshots found. Run npm run hop:fetch first.");
  }

  return dates[0];
}

function ensurePdftotextAvailable() {
  const result = spawnSync("pdftotext", ["-v"], {
    encoding: "utf8"
  });

  if (result.error) {
    throw new Error(`pdftotext is not available: ${result.error.message}`);
  }
}

function extractText(pdfPath, textPath) {
  const result = spawnSync("pdftotext", ["-layout", "-enc", "UTF-8", pdfPath, textPath], {
    encoding: "utf8"
  });

  if (result.status !== 0) {
    throw new Error(
      `pdftotext failed for ${path.basename(pdfPath)}: ${result.stderr || result.stdout || `exit ${result.status}`}`
    );
  }
}

function countEmployeeMarkers(text) {
  return [...text.matchAll(EMPLOYEE_PATTERN)].length;
}

function main() {
  ensurePdftotextAvailable();

  const snapshotDate = resolveLatestSnapshotDate();
  const snapshotDir = path.join(HOP_SOURCE_DIR, snapshotDate);
  const manifestPath = path.join(snapshotDir, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Missing HOP manifest: ${manifestPath}`);
  }

  const manifest = readJson(manifestPath);
  const rawDir = path.join(ROOT, manifest.rawDir);
  const textDir = path.join(snapshotDir, "text");
  fs.mkdirSync(textDir, { recursive: true });

  const files = [];
  for (const file of manifest.files ?? []) {
    const pdfPath = path.join(rawDir, file.filename);
    const textPath = path.join(textDir, file.filename.replace(/\.pdf$/i, ".txt"));
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`Missing PDF listed in manifest: ${pdfPath}`);
    }

    extractText(pdfPath, textPath);
    const text = fs.readFileSync(textPath, "utf8");
    const employeeMarkers = countEmployeeMarkers(text);
    if (employeeMarkers === 0) {
      throw new Error(`No employee markers found after extraction: ${textPath}`);
    }

    files.push({
      order: file.order,
      canonicalName: file.canonicalName,
      filename: path.basename(textPath),
      sourcePdf: file.filename,
      bytes: Buffer.byteLength(text),
      employeeMarkers
    });
    console.log(`[hop:extract] ${path.basename(textPath)} markers=${employeeMarkers}`);
  }

  const textManifest = {
    generatedAt: new Date().toISOString(),
    snapshotDate,
    sourceManifest: path.relative(ROOT, manifestPath),
    textDir: path.relative(ROOT, textDir),
    extraction: {
      command: "pdftotext -layout -enc UTF-8 <pdf> <txt>"
    },
    files,
    totalEmployeeMarkers: files.reduce((sum, file) => sum + file.employeeMarkers, 0)
  };

  writeJson(path.join(snapshotDir, "text-manifest.json"), textManifest);
  writeJson(path.join(HOP_SOURCE_DIR, "latest.json"), {
    snapshotDate,
    snapshotDateDisplay: manifest.snapshotDateDisplay ?? null,
    manifest: path.relative(ROOT, manifestPath),
    rawDir: manifest.rawDir,
    textDir: path.relative(ROOT, textDir),
    textManifest: path.relative(ROOT, path.join(snapshotDir, "text-manifest.json"))
  });

  console.log(
    `[hop:extract] Extracted ${files.length} text files with ${textManifest.totalEmployeeMarkers} employee markers`
  );
}

main();
