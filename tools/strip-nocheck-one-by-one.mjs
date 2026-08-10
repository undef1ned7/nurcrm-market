#!/usr/bin/env node
/**
 * Strip @ts-nocheck one file at a time; keep only if tsc stays clean for that file.
 * node tools/strip-nocheck-one-by-one.mjs --layer shared|app|entities|features|widgets|pages [--limit N] [--max-loc N]
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = path.join(root, "src");
const args = process.argv.slice(2);
const layer = args[args.indexOf("--layer") + 1];
const limit = args.includes("--limit")
  ? Number(args[args.indexOf("--limit") + 1])
  : Infinity;
const maxLoc = args.includes("--max-loc")
  ? Number(args[args.indexOf("--max-loc") + 1])
  : Infinity;

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(ent.name)) out.push(p);
  }
  return out;
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

function hasNocheck(t) {
  return /^\s*\/\/\s*@ts-nocheck\b/m.test(t);
}

function transform(t) {
  let out = t.replace(/^\s*\/\/\s*@ts-nocheck\s*\r?\n/, "");
  out = out.replace(
    /\((\s*params\s*)=\s*\{\s*\}(\s*)\)/g,
    "($1: Record<string, unknown> = {}$2)",
  );
  out = out.replace(/catch\s*\(\s*(\w+)\s*\)/g, "catch ($1: any)");
  out = out.replace(
    /=\s*\(\s*\{([^{}]*)\}\s*\)\s*=>/g,
    (full, inner) => {
      if (inner.includes("}:")) return full;
      return `= ({${inner}}: any) =>`;
    },
  );
  out = out.replace(
    /function\s+(\w+)\s*\(\s*\{([^{}]*)\}\s*\)/g,
    (full, name, inner) => {
      if (inner.includes("}:")) return full;
      return `function ${name}({${inner}}: any)`;
    },
  );
  return out;
}

const dir = path.join(srcRoot, layer);
let files = walk(dir)
  .filter((f) => {
    const t = fs.readFileSync(f, "utf8");
    if (!hasNocheck(t)) return false;
    const loc = t.split("\n").length;
    return loc <= maxLoc;
  })
  .sort(
    (a, b) =>
      fs.readFileSync(a, "utf8").split("\n").length -
      fs.readFileSync(b, "utf8").split("\n").length,
  );
if (Number.isFinite(limit)) files = files.slice(0, limit);

console.log(`trying ${files.length} files in ${layer}`);
let kept = 0,
  failed = 0;
for (const f of files) {
  const backup = fs.readFileSync(f, "utf8");
  fs.writeFileSync(f, transform(backup));
  const out = runTsc();
  const rel = path.relative(root, f);
  if (!out.includes("error TS")) {
    kept++;
    console.log("KEEP", rel);
  } else {
    // only restore if this file is in the error list OR any error (safer restore)
    const abs = path.resolve(f);
    const mentions = out.split("\n").some((l) => {
      if (!l.includes("error TS")) return false;
      return path.resolve(l.split("(")[0]) === abs || l.includes(rel);
    });
    fs.writeFileSync(f, backup);
    failed++;
    if (mentions) console.log("FAIL", rel);
    else console.log("FAIL(cascade?)", rel);
  }
}
console.log(`done kept=${kept} failed=${failed}`);
const final = runTsc();
if (final.includes("error TS")) {
  console.error("tsc not clean after run!");
  process.exit(1);
}
console.log("tsc clean");
