#!/usr/bin/env node
/**
 * Strip // @ts-nocheck from src files and apply minimal : any annotations
 * so `tsc --noEmit` stays green under strict. Prefer real types later.
 *
 * Usage:
 *   node tools/strip-nocheck.mjs [--layer shared|app|entities|features|widgets|pages] [--limit N] [--dry]
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const srcRoot = path.join(root, "src");

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const layerIdx = args.indexOf("--layer");
const layer = layerIdx >= 0 ? args[layerIdx + 1] : null;
const limitIdx = args.indexOf("--limit");
const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : Infinity;

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(ent.name)) out.push(p);
  }
  return out;
}

function hasNocheck(text) {
  return /^\s*\/\/\s*@ts-nocheck\b/m.test(text);
}

function stripNocheck(text) {
  return text.replace(/^\s*\/\/\s*@ts-nocheck\s*\r?\n/, "");
}

function runTsc() {
  try {
    execSync("npx tsc --noEmit --pretty false", {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return "";
  } catch (e) {
    return `${e.stdout || ""}${e.stderr || ""}`;
  }
}

function parseImplicitAny(tscOut) {
  // path(line,col): error TS7006: Parameter 'x' implicitly has an 'any' type.
  // path(line,col): error TS7031: Binding element 'x' implicitly has an 'any' type.
  // path(line,col): error TS7053: Element implicitly has an 'any' type...
  // path(line,col): error TS2339: Property 'x' does not exist...
  const re =
    /^(.+\.tsx?)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s*(.+)$/gm;
  const byFile = new Map();
  let m;
  while ((m = re.exec(tscOut))) {
    const file = path.resolve(m[1].startsWith("/") ? m[1] : path.join(root, m[1]));
    const line = Number(m[2]);
    const code = m[4];
    const msg = m[5];
    if (!byFile.has(file)) byFile.set(file, []);
    byFile.get(file).push({ line, code, msg });
  }
  return byFile;
}

function annotateLine(line, code, msg) {
  // Parameter 'foo' implicitly has an 'any' type.
  const param = msg.match(/Parameter '([^']+)' implicitly/)?.[1];
  const binding = msg.match(/Binding element '([^']+)' implicitly/)?.[1];
  const name = param || binding;
  if (!name) return null;

  // Already annotated
  if (new RegExp(`\\b${name}\\s*:`).test(line)) return null;

  // (name) or (name = or (name, or { name } or [name]
  // function foo(name)
  let next = line;
  // destructuring { name } or { name,
  next = next.replace(
    new RegExp(`(\\{[^}]*?)\\b(${name})(\\s*[,}])`),
    (full, a, n, c) => {
      if (full.includes(`${n}:`)) return full;
      return `${a}${n}: any${c}`;
    },
  );
  if (next !== line) return next;

  next = next.replace(
    new RegExp(`(\\[)(\\s*)${name}(\\s*[,\\]])`),
    `$1$2${name}: any$3`,
  );
  if (next !== line) return next;

  // plain param
  next = next.replace(
    new RegExp(`([,(]\\s*)${name}(\\s*[=,)])`),
    `$1${name}: any$2`,
  );
  if (next !== line) return next;

  // catch (e)
  next = next.replace(
    new RegExp(`(catch\\s*\\(\\s*)${name}(\\s*\\))`),
    `$1${name}: any$2`,
  );
  return next !== line ? next : null;
}

function applyImplicitAnyFixes(file, errors) {
  const text = fs.readFileSync(file, "utf8");
  const lines = text.split("\n");
  const relevant = errors
    .filter((e) => e.code === "TS7006" || e.code === "TS7031")
    .sort((a, b) => b.line - a.line);
  let changed = false;
  for (const err of relevant) {
    const idx = err.line - 1;
    if (idx < 0 || idx >= lines.length) continue;
    const fixed = annotateLine(lines[idx], err.code, err.msg);
    if (fixed) {
      lines[idx] = fixed;
      changed = true;
    }
  }
  if (changed && !dry) fs.writeFileSync(file, lines.join("\n"));
  return changed;
}

function addFileLevelEscape(file) {
  // Last resort for stubborn files: explicit any imports / @ts-nocheck restore is forbidden.
  // Instead prepend eslint + use type assertion helper comment and `as any` on exports — skip.
  // Restore nocheck only if in allowlist later.
  void file;
}

const targetDir = layer ? path.join(srcRoot, layer) : srcRoot;
if (!fs.existsSync(targetDir)) {
  console.error("Missing layer", layer);
  process.exit(1);
}

let files = walk(targetDir)
  .filter((f) => hasNocheck(fs.readFileSync(f, "utf8")))
  .sort((a, b) => {
    const la = fs.readFileSync(a, "utf8").split("\n").length;
    const lb = fs.readFileSync(b, "utf8").split("\n").length;
    return la - lb;
  });

if (Number.isFinite(limit)) files = files.slice(0, limit);

console.log(`Candidates: ${files.length} (layer=${layer || "all"})`);

let stripped = 0;
for (const file of files) {
  const before = fs.readFileSync(file, "utf8");
  if (!hasNocheck(before)) continue;
  const after = stripNocheck(before);
  if (!dry) fs.writeFileSync(file, after);
  stripped++;
}
console.log(`Stripped nocheck: ${stripped}`);

if (dry) process.exit(0);

// Iteratively fix implicit any until tsc clean or stuck
for (let round = 1; round <= 8; round++) {
  const out = runTsc();
  if (!out.includes("error TS")) {
    console.log(`tsc clean after round ${round - 1}`);
    break;
  }
  const byFile = parseImplicitAny(out);
  let fixes = 0;
  for (const [file, errs] of byFile) {
    if (!file.startsWith(srcRoot)) continue;
    if (applyImplicitAnyFixes(file, errs)) fixes++;
  }
  console.log(`Round ${round}: files with implicit-any fixes: ${fixes}; total error lines: ${[...byFile.values()].flat().length}`);
  if (fixes === 0) {
    // dump remaining error codes summary
    const codes = {};
    for (const errs of byFile.values()) {
      for (const e of errs) codes[e.code] = (codes[e.code] || 0) + 1;
    }
    console.log("Stuck. Remaining codes:", codes);
    // write errors to file for manual follow-up
    fs.writeFileSync(path.join(root, "tools/.tsc-strip-errors.txt"), out.slice(0, 200000));
    break;
  }
}
