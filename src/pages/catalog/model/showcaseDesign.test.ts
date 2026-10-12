import { describe, expect, it } from "vitest";
import {
  buildThemeCss,
  fontStylesheetHref,
  isNewProduct,
  mediaSrcSet,
  mediaUrl,
  normalizeDesign,
  safeColor,
  safeLink,
  socialUrl,
  toDarkPalette,
  tx,
  DEFAULT_COLORS,
} from "./showcaseDesign";

const media = {
  m1: {
    urls: {
      "320": "https://cdn/x-320.webp",
      "640": "https://cdn/x-640.webp",
      "1080": "https://cdn/x-1080.webp",
      original: "https://cdn/x.webp",
    },
    width: 2000,
    height: 1000,
    kind: "image",
  },
};

describe("tx", () => {
  it("берёт язык по умолчанию, иначе первый непустой", () => {
    expect(tx({ ru: "Привет", ky: "Салам" }, "ky")).toBe("Салам");
    expect(tx({ ru: "Привет", ky: "  " }, "ky")).toBe("Привет");
    expect(tx({ ru: "" }, "ru")).toBe("");
    expect(tx(null, "ru")).toBe("");
    expect(tx("строка", "ru")).toBe("строка");
  });
});

describe("media", () => {
  it("выбирает размер не меньше нужного", () => {
    expect(mediaUrl(media, "m1", 300)).toBe("https://cdn/x-320.webp");
    expect(mediaUrl(media, "m1", 1000)).toBe("https://cdn/x-1080.webp");
    expect(mediaUrl(media, "m1", 1920)).toBe("https://cdn/x.webp");
    expect(mediaUrl(media, "missing", 640)).toBe("");
    expect(mediaUrl(media, null, 640)).toBe("");
  });

  it("строит srcset только из имеющихся размеров", () => {
    expect(mediaSrcSet(media, "m1")).toBe(
      "https://cdn/x-320.webp 320w, https://cdn/x-640.webp 640w, https://cdn/x-1080.webp 1080w",
    );
  });
});

describe("safeColor / safeLink", () => {
  it("пропускает только цвета", () => {
    expect(safeColor("#F7D74F")).toBe("#F7D74F");
    expect(safeColor("rgba(0, 0, 0, 0.5)")).toBe("rgba(0, 0, 0, 0.5)");
    expect(safeColor("red;}body{display:none")).toBeNull();
    expect(safeColor("url(javascript:alert(1))")).toBeNull();
  });

  it("не пропускает javascript: в ссылках", () => {
    expect(safeLink("javascript:alert(1)")).toBeNull();
    expect(safeLink("https://ex.kg/a")).toBe("https://ex.kg/a");
    expect(safeLink({ url: "#products" })).toBe("#products");
    expect(safeLink("ex.kg")).toBe("https://ex.kg");
  });
});

describe("normalizeDesign", () => {
  it("null для мусора", () => {
    expect(normalizeDesign(null)).toBeNull();
    expect(normalizeDesign({ detail: "not found" })).toBeNull();
  });

  it("подставляет значения по умолчанию и ограничивает диапазоны", () => {
    const d = normalizeDesign({
      theme: {
        mode: "weird",
        colors: { accent: "#ff0000", text: "evil;}" },
        font: { family: "Comic Sans", base_size: 40, heading_weight: 950 },
        radius: 99,
      },
      products: { columns: { desktop: 9, tablet: 1, mobile: 2 }, sort_options: ["price_asc", "hack"] },
      sections: [
        { id: "a", type: "products", enabled: true },
        { id: "b", type: "hero", enabled: false },
        { id: "c", type: "unknown", enabled: true },
      ],
      languages: { default: "ky" },
    })!;
    expect(d.theme.mode).toBe("light");
    expect(d.theme.colors.accent).toBe("#ff0000");
    expect(d.theme.colors.text).toBe(DEFAULT_COLORS.text);
    expect(d.theme.font.family).toBe("Roboto Condensed");
    expect(d.theme.font.base_size).toBe(18);
    expect(d.theme.font.heading_weight).toBe(900);
    expect(d.theme.radius).toBe(28);
    expect(d.products.columns).toEqual({ desktop: 6, tablet: 2, mobile: 2 });
    expect(d.products.sort_options).toEqual(["price_asc"]);
    expect(d.sections.map((s) => s.type)).toEqual(["products"]);
    expect(d.lang).toBe("ky");
  });

  it("без sections — hero, categories, products", () => {
    const d = normalizeDesign({ theme: {} })!;
    expect(d.sections.map((s) => s.type)).toEqual(["hero", "categories", "products"]);
  });
});

describe("buildThemeCss", () => {
  it("кладёт цвета в переменные, auto даёт media-запрос", () => {
    const d = normalizeDesign({ theme: { mode: "auto", colors: { accent: "#123456" } } })!;
    const css = buildThemeCss(d, ".root");
    expect(css).toContain("--sf-accent:#123456");
    expect(css).toContain("@media (prefers-color-scheme: dark)");
    expect(css).not.toContain("undefined");
  });

  it("dark из светлой палитры делает тёмный фон, акцент сохраняет", () => {
    const dark = toDarkPalette({ ...DEFAULT_COLORS, accent: "#00AA00" });
    expect(dark.background).not.toBe(DEFAULT_COLORS.background);
    expect(dark.accent).toBe("#00AA00");
    const alreadyDark = { ...DEFAULT_COLORS, background: "#000000" };
    expect(toDarkPalette(alreadyDark)).toBe(alreadyDark);
  });
});

describe("прочее", () => {
  it("шрифт — только из списка, с кириллицей", () => {
    expect(fontStylesheetHref("PT Sans")).toContain("family=PT+Sans:wght@400;700");
    expect(fontStylesheetHref("Inter")).toContain("cyrillic-ext");
    expect(fontStylesheetHref("Evil\"Font")).toBeNull();
  });

  it("«новинка» по new_badge_days", () => {
    const now = Date.parse("2026-10-05T12:00:00+06:00");
    const item = { created_at: "2026-09-30T12:00:00+06:00", is_new: false };
    expect(isNewProduct(item, 14, now)).toBe(true);
    expect(isNewProduct(item, 3, now)).toBe(false);
    expect(isNewProduct({ is_new: true }, 14, now)).toBe(true);
    expect(isNewProduct(item, null, now)).toBe(false);
  });

  it("соцсети: ник → ссылка", () => {
    expect(socialUrl("instagram", "@shop")).toBe("https://instagram.com/shop");
    expect(socialUrl("telegram", "https://t.me/x")).toBe("https://t.me/x");
    expect(socialUrl("whatsapp", "+996 555 12 34 56")).toBe("https://wa.me/996555123456");
  });
});
