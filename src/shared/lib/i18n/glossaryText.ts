import {
  KY_GLOSSARY_BY_TERM,
  KY_GLOSSARY_ENTRIES,
  type GlossaryEntry,
} from "@shared/config/i18nGlossary";

export type GlossaryTextPart =
  | { type: "text"; value: string }
  | { type: "term"; value: string; hint: string };

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Split text into plain segments and glossary terms (longest match wins). */
export function splitGlossaryText(
  text: string,
  entries: GlossaryEntry[] = KY_GLOSSARY_ENTRIES,
): GlossaryTextPart[] {
  if (!text) return [];

  const terms = [...entries]
    .map((entry) => entry.term)
    .sort((a, b) => b.length - a.length);

  if (terms.length === 0) {
    return [{ type: "text", value: text }];
  }

  const pattern = terms.map(escapeRegExp).join("|");
  const re = new RegExp(`(${pattern})`, "gi");
  const parts: GlossaryTextPart[] = [];

  let lastIndex = 0;
  for (const match of text.matchAll(re)) {
    const index = match.index ?? 0;
    const matched = match[0];

    if (index > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, index) });
    }

    const entry = KY_GLOSSARY_BY_TERM.get(matched.toLowerCase());
    parts.push({
      type: "term",
      value: matched,
      hint: entry?.hint ?? matched,
    });

    lastIndex = index + matched.length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: "text", value: text }];
}
