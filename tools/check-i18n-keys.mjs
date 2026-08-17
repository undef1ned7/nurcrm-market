#!/usr/bin/env node
/**
 * Ensures every locale/ns catalog contains the same keys as ru,
 * and that values are non-empty.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesRoot = path.resolve(__dirname, "../public/locales");
const sourceLng = "ru";

function flatten(value, prefix = "", out = {}) {
  if (value === null || value === undefined) {
    out[prefix] = value;
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      flatten(item, prefix ? `${prefix}.${index}` : String(index), out);
    });
    return out;
  }
  if (typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      flatten(nested, prefix ? `${prefix}.${key}` : key, out);
    }
    return out;
  }
  out[prefix] = value;
  return out;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const languages = fs
  .readdirSync(localesRoot)
  .filter((name) => fs.statSync(path.join(localesRoot, name)).isDirectory());

if (!languages.includes(sourceLng)) {
  console.error(`Missing source locale: ${sourceLng}`);
  process.exit(1);
}

const namespaces = fs
  .readdirSync(path.join(localesRoot, sourceLng))
  .filter((name) => name.endsWith(".json"))
  .map((name) => name.replace(/\.json$/, ""));

let failed = false;

for (const ns of namespaces) {
  const sourcePath = path.join(localesRoot, sourceLng, `${ns}.json`);
  const sourceKeys = flatten(readJson(sourcePath));

  for (const lng of languages) {
    const filePath = path.join(localesRoot, lng, `${ns}.json`);
    if (!fs.existsSync(filePath)) {
      console.error(`[${lng}/${ns}] missing file`);
      failed = true;
      continue;
    }

    const keys = flatten(readJson(filePath));

    for (const key of Object.keys(sourceKeys)) {
      if (!(key in keys)) {
        console.error(`[${lng}/${ns}] missing key: ${key}`);
        failed = true;
        continue;
      }
      const value = keys[key];
      if (typeof value === "string" && value.trim() === "") {
        console.error(`[${lng}/${ns}] empty value: ${key}`);
        failed = true;
      }
    }

    for (const key of Object.keys(keys)) {
      if (!(key in sourceKeys)) {
        console.error(`[${lng}/${ns}] extra key (not in ru): ${key}`);
        failed = true;
      }
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log(
  `i18n catalogs OK (${languages.join(", ")}; ns: ${namespaces.join(", ")})`,
);
