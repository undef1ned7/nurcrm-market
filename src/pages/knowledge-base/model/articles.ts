/**
 * Реестр статей базы знаний. Тексты лежат в `public/locales/{ru,ky}/translation.json`
 * (`crm.tools.kb.articles.<slug>`), здесь — только порядок и разделы.
 * Если перевода статьи нет, i18next покажет русский текст (fallbackLng = ru).
 */
export type KbSectionId = "owner" | "reports" | "settings" | "faq";

export type KbBlock =
  | { type: "p"; text: string }
  | { type: "h"; text: string }
  | { type: "steps"; items: string[] }
  | { type: "list"; items: string[] }
  | { type: "important"; text: string }
  | { type: "formula"; text: string }
  | { type: "table"; head: string[]; rows: string[][] };

export type KbArticleContent = {
  title: string;
  keywords?: string;
  blocks: KbBlock[];
};

export const KB_SECTIONS: Array<{ id: KbSectionId; articles: string[] }> = [
  {
    id: "owner",
    articles: [
      "access",
      "summary",
      "summary-blocks",
      "summary-refresh",
      "calc-overview",
      "calc-price",
      "calc-batch",
      "calc-check",
      "calc-breakeven",
      "calc-discount",
    ],
  },
  {
    id: "reports",
    articles: ["abc-what", "abc-slices", "abc-howto", "abc-source"],
  },
  {
    id: "settings",
    articles: [
      "kb-howto",
      "log-overview",
      "log-entries",
      "log-buttons",
      "log-storage",
    ],
  },
  { id: "faq", articles: ["faq"] },
];

export const KB_ALL_ARTICLES: Array<{ slug: string; section: KbSectionId }> =
  KB_SECTIONS.flatMap((s) => s.articles.map((slug) => ({ slug, section: s.id })));

export const DEFAULT_KB_ARTICLE = "summary";

const norm = (s: string) => s.toLowerCase().replace(/ё/g, "е");

/** Поиск идёт по названиям и ключевым словам; все слова запроса должны встретиться. */
export function matchesKbQuery(
  content: Pick<KbArticleContent, "title" | "keywords">,
  query: string,
): boolean {
  const tokens = norm(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const haystack = norm(`${content.title} ${content.keywords ?? ""}`);
  return tokens.every((tok) => haystack.includes(tok));
}
