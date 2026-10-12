#!/usr/bin/env node
/**
 * Strip @ts-nocheck with aggressive any annotations for migration.
 * Batch by layer: strip all candidates, restore only files with tsc errors.
 *
 * node tools/strip-nocheck-aggressive.mjs --layer shared [--max-loc 400] [--passes 3]
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = path.join(root, "src");
const args = process.argv.slice(2);
const layer = args[args.indexOf("--layer") + 1];
const maxLoc = args.includes("--max-loc")
  ? Number(args[args.indexOf("--max-loc") + 1])
  : 500;
const passes = args.includes("--passes")
  ? Number(args[args.indexOf("--passes") + 1])
  : 2;

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

  // default empty object params
  out = out.replace(
    /\((\s*params\s*)=\s*\{\s*\}(\s*)\)/g,
    "($1: any = {}$2)",
  );
  out = out.replace(
    /\((\s*options\s*)=\s*\{\s*\}(\s*)\)/g,
    "($1: any = {}$2)",
  );
  out = out.replace(
    /\((\s*args\s*)=\s*\{\s*\}(\s*)\)/g,
    "($1: any = {}$2)",
  );
  out = out.replace(
    /\((\s*config\s*)=\s*\{\s*\}(\s*)\)/g,
    "($1: any = {}$2)",
  );
  out = out.replace(
    /\((\s*props\s*)=\s*\{\s*\}(\s*)\)/g,
    "($1: any = {}$2)",
  );

  // catch
  out = out.replace(/catch\s*\(\s*(\w+)\s*\)/g, "catch ($1: any)");

  // props destructure arrow/fn without type
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

  // let/const x = null → : any
  out = out.replace(
    /\b(let|const)\s+(\w+)\s*=\s*null\b/g,
    "$1 $2: any = null",
  );
  out = out.replace(
    /\b(let|const)\s+(\w+)\s*=\s*undefined\b/g,
    "$1 $2: any = undefined",
  );

  // useAppSelector((state) => → (state: any)
  out = out.replace(
    /useAppSelector\(\s*\(\s*(\w+)\s*\)\s*=>/g,
    "useAppSelector(($1: any) =>",
  );
  out = out.replace(
    /useSelector\(\s*\(\s*(\w+)\s*\)\s*=>/g,
    "useSelector(($1: any) =>",
  );

  // (state) => for createSelector / createSlice extra
  out = out.replace(
    /createAsyncThunk\([^,]+,\s*async\s*\(([^)]*)\)\s*=>/g,
    (full) => full, // leave
  );

  return out;
}

function errFilesFrom(out) {
  const errFiles = new Set();
  const re = /^(.+\.tsx?)\(\d+,\d+\):\s+error\s+TS/gm;
  let m;
  while ((m = re.exec(out))) {
    const file = path.resolve(m[1].startsWith("/") ? m[1] : path.join(root, m[1]));
    errFiles.add(file);
  }
  return errFiles;
}

const dir = path.join(srcRoot, layer);
let totalKept = 0;

for (let pass = 1; pass <= passes; pass++) {
  let files = walk(dir)
    .filter((f) => {
      const t = fs.readFileSync(f, "utf8");
      return hasNocheck(t) && t.split("\n").length <= maxLoc;
    })
    .sort(
      (a, b) =>
        fs.readFileSync(a, "utf8").split("\n").length -
        fs.readFileSync(b, "utf8").split("\n").length,
    );

  if (!files.length) {
    console.log(`pass ${pass}: no candidates`);
    break;
  }
  console.log(`pass ${pass}: candidates ${files.length}`);
  const backups = new Map();
  for (const f of files) {
    const t = fs.readFileSync(f, "utf8");
    backups.set(f, t);
    fs.writeFileSync(f, transform(t));
  }

  const out = runTsc();
  if (!out.includes("error TS")) {
    totalKept += files.length;
    console.log(`pass ${pass}: all kept (${files.length})`);
    break;
  }

  const errFiles = errFilesFrom(out);
  let kept = 0,
    restored = 0;
  for (const f of files) {
    if (errFiles.has(path.resolve(f))) {
      fs.writeFileSync(f, backups.get(f));
      restored++;
    } else kept++;
  }
  totalKept += kept;
  console.log(`pass ${pass}: kept=${kept} restored=${restored}`);

  const out2 = runTsc();
  if (out2.includes("error TS")) {
    console.log(
      out2
        .split("\n")
        .filter((l) => l.includes("error TS"))
        .slice(0, 20)
        .join("\n"),
    );
    process.exit(1);
  }
}

console.log(`totalKept≈${totalKept}`);
console.log("tsc clean");
