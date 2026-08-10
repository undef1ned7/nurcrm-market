#!/usr/bin/env node
/**
 * Batch migrate src/**/*.js|jsx under LOC threshold to .ts|.tsx
 * Skips files already .ts/.tsx and files matching skip patterns.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "src");

const MAX_LOC = Number(process.env.MAX_LOC || "499");
const MIN_LOC = Number(process.env.MIN_LOC || "0");
const DRY_RUN = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");

const SKIP_PATTERNS = [
  /\.test\./,
  /\.spec\./,
  /node_modules/,
];

const JSX_RE = /<[A-Za-z/]/;

function countLines(filePath) {
  return fs.readFileSync(filePath, "utf8").split("\n").length;
}

function hasJsx(content) {
  return JSX_RE.test(content);
}

function shouldSkip(filePath) {
  return SKIP_PATTERNS.some((re) => re.test(filePath));
}

function collectFiles(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      collectFiles(full, acc);
      continue;
    }
    if (!/\.(js|jsx)$/.test(name)) continue;
    if (shouldSkip(full)) continue;
    const loc = countLines(full);
    if (loc >= MIN_LOC && loc <= MAX_LOC) acc.push({ full, loc, ext: path.extname(name) });
  }
  return acc;
}

const files = collectFiles(root).sort((a, b) => a.loc - b.loc);
let renamed = 0;
let skipped = 0;

for (const { full, ext } of files) {
  const content = fs.readFileSync(full, "utf8");
  const newExt = ext === ".jsx" || hasJsx(content) ? ".tsx" : ".ts";
  const target = full.slice(0, -ext.length) + newExt;

  if (fs.existsSync(target) && !FORCE) {
    skipped++;
    continue;
  }

  let next = content;
  if (!next.startsWith("// @ts-nocheck") && !next.startsWith("/* eslint-disable")) {
    next = `// @ts-nocheck\n${next}`;
  }

  if (DRY_RUN) {
    console.log(`would rename: ${path.relative(root, full)} -> ${path.basename(target)} (${countLines(full)} LOC)`);
    renamed++;
    continue;
  }

  fs.writeFileSync(target, next, "utf8");
  fs.unlinkSync(full);
  renamed++;
}

console.log(`Done. Renamed: ${renamed}, skipped (target exists): ${skipped}`);
