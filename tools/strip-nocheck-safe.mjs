#!/usr/bin/env node
/**
 * Conservative strip: only remove @ts-nocheck + annotate params={} and catch (e).
 * Restore original file if tsc still reports errors in that file.
 *
 * node tools/strip-nocheck-safe.mjs --layer entities|features|widgets|pages|shared|app [--limit N]
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
  // props destructure on same line: = ({ ... }) =>  →  = ({ ... }: any) =>
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
  .filter((f) => hasNocheck(fs.readFileSync(f, "utf8")))
  .sort(
    (a, b) =>
      fs.readFileSync(a, "utf8").split("\n").length -
      fs.readFileSync(b, "utf8").split("\n").length,
  );
if (Number.isFinite(limit)) files = files.slice(0, limit);

console.log("candidates", files.length);
const backups = new Map();
for (const f of files) {
  const t = fs.readFileSync(f, "utf8");
  backups.set(f, t);
  fs.writeFileSync(f, transform(t));
}

const out = runTsc();
if (!out.includes("error TS")) {
  console.log("all kept, tsc clean");
  process.exit(0);
}

const errFiles = new Set();
const re = /^(.+\.tsx?)\(\d+,\d+\):\s+error\s+TS/gm;
let m;
while ((m = re.exec(out))) {
  const file = path.resolve(m[1].startsWith("/") ? m[1] : path.join(root, m[1]));
  errFiles.add(file);
}

let kept = 0,
  restored = 0;
for (const f of files) {
  if (errFiles.has(path.resolve(f))) {
    fs.writeFileSync(f, backups.get(f));
    restored++;
  } else kept++;
}
console.log(`kept=${kept} restored=${restored}`);
const out2 = runTsc();
if (out2.includes("error TS")) {
  console.log(
    out2
      .split("\n")
      .filter((l) => l.includes("error TS"))
      .slice(0, 25)
      .join("\n"),
  );
  process.exit(1);
}
console.log("tsc clean");
