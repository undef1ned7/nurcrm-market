import { describe, expect, it } from "vitest";
import { normalizeLanguage, toBcp47, toHtmlLang } from "./locale";

describe("locale", () => {
  it("treats unknown and english as russian fallback", () => {
    expect(normalizeLanguage("en")).toBe("ru");
    expect(normalizeLanguage(undefined)).toBe("ru");
    expect(normalizeLanguage("ru-RU")).toBe("ru");
  });

  it("normalizes kyrgyz tags", () => {
    expect(normalizeLanguage("ky")).toBe("ky");
    expect(normalizeLanguage("ky-KG")).toBe("ky");
    expect(toBcp47("ky")).toBe("ky-KG");
    expect(toHtmlLang("ky-KG")).toBe("ky");
  });
});
