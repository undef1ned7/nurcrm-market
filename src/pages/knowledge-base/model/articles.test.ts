import { describe, expect, it } from "vitest";
import { KB_ALL_ARTICLES, KB_SECTIONS, matchesKbQuery } from "./articles";

describe("реестр статей", () => {
  it("slug статей уникальны", () => {
    const slugs = KB_ALL_ARTICLES.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
  it("в каждом разделе есть статьи", () => {
    KB_SECTIONS.forEach((s) => expect(s.articles.length).toBeGreaterThan(0));
  });
});

describe("matchesKbQuery", () => {
  const article = { title: "Возврат товара", keywords: "возврат чек отмена" };
  it("ищет по названию и ключевым словам без учёта регистра и ё", () => {
    expect(matchesKbQuery(article, "ВОЗВРАТ")).toBe(true);
    expect(matchesKbQuery(article, "отмена")).toBe(true);
  });
  it("все слова запроса должны найтись", () => {
    expect(matchesKbQuery(article, "возврат чек")).toBe(true);
    expect(matchesKbQuery(article, "возврат весы")).toBe(false);
  });
  it("пустой запрос подходит всем", () => {
    expect(matchesKbQuery(article, "  ")).toBe(true);
  });
});
