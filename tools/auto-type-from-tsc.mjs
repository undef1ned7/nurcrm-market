#!/usr/bin/env node
/**
 * For each @ts-nocheck file under --layer (≤ max-loc):
 * 1. Strip nocheck + light annotations
 * 2. If tsc errors in that file, prepend `declare const __nocheck: never` noop —
 *    actually: wrap file content after imports with any casts is hard.
 * Simpler: on failure, restore and try adding `// @ts-nocheck` stay.
 *
 * Better approach used here:
 * Strip + annotate; if errors mention the file, insert after first line:
 *   /* eslint-disable */ and convert ALL function params without types to `: any`
 *   and add `as any` on property access failures is too hard.
 *
 * Practical: for failed files under max-loc, rewrite to:
 *   remove nocheck
 *   add at top: type Any = any;
 *   replace `= {}` default destructuring params with `: any = {}`
 *   for every `function name(` without types in signature, append `: any` to bare params
 *
 * Then if STILL fails: leave nocheck.
 *
 * Usage: node tools/auto-type-from-tsc.mjs --layer shared --max-loc 250
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const layer = args[args.indexOf("--layer") + 1];
const maxLoc = args.includes("--max-loc")
  ? Number(args[args.indexOf("--max-loc") + 1])
  : 300;
const limit = args.includes("--limit")
  ? Number(args[args.indexOf("--limit") + 1])
  : 80;

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

function fileHasErrors(out, f) {
  const abs = path.resolve(f);
  const rel = path.relative(root, f);
  return out.split("\n").some((l) => {
    if (!l.includes("error TS")) return false;
    const left = l.split("(")[0];
    try {
      return path.resolve(left) === abs || l.includes(rel);
    } catch {
      return l.includes(rel);
    }
  });
}

function annotateParams(sigInner) {
  // split by comma respecting simple cases
  return sigInner
    .split(",")
    .map((p) => {
      const t = p.trim();
      if (!t) return p;
      if (t.startsWith("...")) {
        const name = t.slice(3).trim();
        if (name.includes(":")) return p;
        return ` ...${name}: any[]`;
      }
      if (t.includes(":")) return p;
      if (t.includes("=")) {
        const [name, def] = t.split("=");
        return ` ${name.trim()}: any =${def}`;
      }
      if (t.startsWith("{") || t.startsWith("[")) {
        // destructure — type whole as any
        if (t.includes("}:") || t.includes("]:")) return p;
        // `{ a, b }` or `{ a, b } = {}`
        const m = t.match(/^(\{[\s\S]*\})\s*(=\s*[\s\S]*)?$/);
        if (m) return ` ${m[1]}: any${m[2] ? " " + m[2].trim() : ""}`;
        return p;
      }
      return ` ${t}: any`;
    })
    .join(",");
}

function transform(t) {
  let out = t.replace(/^\s*\/\/\s*@ts-nocheck\s*\r?\n/, "");

  // annotate function declarations: function foo(a, b) 
  out = out.replace(
    /\bfunction\s+(\w+)\s*\(([^)]*)\)/g,
    (full, name, inner) => {
      if (!inner.trim()) return full;
      if (/:\s*\w/.test(inner) && !inner.includes("{")) {
        // already some types — still try annotate bare
      }
      return `function ${name}(${annotateParams(inner)})`;
    },
  );

  // arrow with parens: (a, b) =>  but not already typed
  // too risky for JSX — skip multi-line

  out = out.replace(/catch\s*\(\s*(\w+)\s*\)/g, "catch ($1: any)");
  out = out.replace(
    /\b(let|const)\s+(\w+)\s*=\s*null\b/g,
    "$1 $2: any = null",
  );
  out = out.replace(
    /useAppSelector\(\s*\(\s*(\w+)\s*\)\s*=>/g,
    "useAppSelector(($1: any) =>",
  );
  out = out.replace(
    /useSelector\(\s*\(\s*(\w+)\s*\)\s*=>/g,
    "useSelector(($1: any) =>",
  );

  // default export / const X = ({ ... }) =>
  out = out.replace(
    /=\s*\(\s*\{([^{}]*)\}\s*\)\s*=>/g,
    (full, inner) => {
      if (inner.includes("}:")) return full;
      return `= ({${inner}}: any) =>`;
    },
  );

  // ({ ... }: missing) on function Component({
  out = out.replace(
    /^(export\s+(?:default\s+)?function\s+\w+)\s*\(\s*\{([^{}]*)\}\s*\)/gm,
    (full, head, inner) => {
      if (inner.includes("}:")) return full;
      return `${head}({${inner}}: any)`;
    },
  );

  return out;
}

const dir = path.join(root, "src", layer);
let files = walk(dir)
  .filter((f) => {
    const t = fs.readFileSync(f, "utf8");
    return (
      /^\s*\/\/\s*@ts-nocheck\b/m.test(t) &&
      t.split("\n").length <= maxLoc
    );
  })
  .sort(
    (a, b) =>
      fs.readFileSync(a, "utf8").split("\n").length -
      fs.readFileSync(b, "utf8").split("\n").length,
  )
  .slice(0, limit);

console.log("candidates", files.length);
let kept = 0,
  fail = 0;
for (const f of files) {
  const bak = fs.readFileSync(f, "utf8");
  fs.writeFileSync(f, transform(bak));
  const out = runTsc();
  const rel = path.relative(root, f);
  if (!fileHasErrors(out, f) && !out.includes("error TS")) {
    kept++;
    console.log("KEEP", rel);
  } else if (!fileHasErrors(out, f) && out.includes("error TS")) {
    // cascade from elsewhere — restore to be safe
    fs.writeFileSync(f, bak);
    fail++;
    console.log("CASCADE", rel);
  } else {
    fs.writeFileSync(f, bak);
    fail++;
    const sample = out
      .split("\n")
      .filter((l) => l.includes("error TS") && l.includes(rel))
      .slice(0, 2);
    console.log("FAIL", rel, sample[0] || "");
  }
}
const final = runTsc();
console.log({ kept, fail, clean: !final.includes("error TS") });
if (final.includes("error TS")) process.exit(1);
