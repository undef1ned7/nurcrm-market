#!/usr/bin/env node
/** List remaining // @ts-nocheck files under src/ (smallest first). */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const src = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src");
const out = [];
function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (/\.tsx?$/.test(ent.name)) {
      const text = fs.readFileSync(p, "utf8");
      const head = text.split("\n").slice(0, 5).join("\n");
      if (head.includes("@ts-nocheck")) {
        out.push([text.split("\n").length, path.relative(path.join(src, ".."), p)]);
      }
    }
  }
}
walk(src);
out.sort((a, b) => a[0] - b[0]);
console.log(`Remaining @ts-nocheck: ${out.length}`);
for (const [n, f] of out) console.log(String(n).padStart(5), f);
