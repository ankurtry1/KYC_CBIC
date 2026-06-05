import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const HOP_URL = "https://dghrdcbic.gov.in/hop";
const HOP_SOURCE_DIR = path.join(ROOT, "source_data", "hop");

const EXPECTED_HOP_FILES = new Map([
  [1, "PCC"],
  [2, "CC"],
  [3, "PC"],
  [4, "Commr"],
  [5, "ADC-JC DR"],
  [6, "ADC-JC PA"],
  [7, "ADC-JC PE"],
  [8, "AC-DC DR"],
  [9, "AC-DC PA"],
  [10, "AC-DC PC"],
  [11, "AC-DC PE"]
]);

function normalizeSpaces(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function decodeHtml(value) {
  return normalizeSpaces(
    String(value ?? "")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
  );
}

function stripTags(value) {
  return decodeHtml(String(value ?? "").replace(/<[^>]+>/g, " "));
}

function parseDmy(value) {
  const match = String(value ?? "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  return {
    display: `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`,
    iso: `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`,
    time: Date.UTC(Number(year), Number(month) - 1, Number(day))
  };
}

function parseHopRows(html) {
  const rows = [];
  const rowPattern =
    /<a\s+href="([^"]+\.pdf)"[^>]*>([\s\S]*?)<\/a>\s*<\/td>\s*<td class="text-nowrap">\s*([0-9/]+)\s*<\/td>/gi;

  for (const match of html.matchAll(rowPattern)) {
    const title = stripTags(match[2]);
    const date = parseDmy(match[3]);
    const order = Number(title.match(/^(\d{1,2})\./)?.[1] ?? NaN);
    const canonicalName = EXPECTED_HOP_FILES.get(order);

    if (!date || !canonicalName || !/HoPs?/i.test(title)) continue;

    rows.push({
      order,
      canonicalName,
      title,
      date,
      url: new URL(match[1], HOP_URL).href
    });
  }

  return rows;
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(`${filePath}.tmp`, filePath);
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Fetch failed for ${url}: HTTP ${response.status}`);
  }
  return response.text();
}

async function fetchPdf(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`PDF download failed for ${url}: HTTP ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 4 || buffer.subarray(0, 4).toString("utf8") !== "%PDF") {
    throw new Error(`Downloaded file is not a PDF: ${url}`);
  }

  return buffer;
}

async function main() {
  const html = await fetchText(HOP_URL);
  const rows = parseHopRows(html);
  if (rows.length === 0) {
    throw new Error("No HOP PDF rows found on DGHRD HOP page");
  }

  const latestDate = rows.reduce((latest, row) => {
    if (!latest || row.date.time > latest.time) return row.date;
    return latest;
  }, null);

  const latestRows = rows
    .filter((row) => row.date.iso === latestDate.iso)
    .sort((a, b) => a.order - b.order);

  const missing = [...EXPECTED_HOP_FILES.entries()]
    .filter(([order]) => !latestRows.some((row) => row.order === order))
    .map(([, canonicalName]) => canonicalName);

  if (missing.length > 0 || latestRows.length !== EXPECTED_HOP_FILES.size) {
    throw new Error(
      `Latest HOP snapshot ${latestDate.display} is incomplete. Found ${latestRows.length}/${EXPECTED_HOP_FILES.size}; missing: ${missing.join(", ") || "unknown"}`
    );
  }

  const snapshotDir = path.join(HOP_SOURCE_DIR, latestDate.iso);
  const rawDir = path.join(snapshotDir, "raw");
  fs.mkdirSync(rawDir, { recursive: true });

  const files = [];
  for (const row of latestRows) {
    const filename = `${row.canonicalName}.pdf`;
    const targetPath = path.join(rawDir, filename);
    const buffer = await fetchPdf(row.url);
    fs.writeFileSync(targetPath, buffer);

    files.push({
      order: row.order,
      canonicalName: row.canonicalName,
      filename,
      title: row.title,
      url: row.url,
      bytes: buffer.length,
      sha256: crypto.createHash("sha256").update(buffer).digest("hex")
    });
    console.log(`[hop:fetch] ${filename} ${buffer.length} bytes`);
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    sourcePage: HOP_URL,
    snapshotDate: latestDate.iso,
    snapshotDateDisplay: latestDate.display,
    rawDir: path.relative(ROOT, rawDir),
    files
  };

  writeJson(path.join(snapshotDir, "manifest.json"), manifest);
  writeJson(path.join(HOP_SOURCE_DIR, "latest.json"), {
    snapshotDate: latestDate.iso,
    snapshotDateDisplay: latestDate.display,
    manifest: path.relative(ROOT, path.join(snapshotDir, "manifest.json")),
    rawDir: path.relative(ROOT, rawDir),
    textDir: path.relative(ROOT, path.join(snapshotDir, "text"))
  });

  console.log(
    `[hop:fetch] Captured ${files.length} PDFs for DGHRD HOP snapshot ${latestDate.display}`
  );
}

main().catch((error) => {
  console.error(`[hop:fetch] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
