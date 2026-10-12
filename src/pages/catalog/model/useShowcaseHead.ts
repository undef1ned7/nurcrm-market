import { useEffect } from "react";
import {
  fontStylesheetHref,
  mediaUrl,
  tx,
  type ShowcaseDesign,
} from "./showcaseDesign";

/**
 * Временно ставит/меняет тег в <head> и возвращает функцию отката —
 * витрина живёт в том же SPA, что и CRM, поэтому всё возвращаем при уходе.
 */
const upsertHeadEl = (
  selector: string,
  create: () => HTMLElement,
  attr: string,
  value: string,
): (() => void) => {
  let el = document.head.querySelector<HTMLElement>(selector);
  const created = !el;
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  const prev = el.getAttribute(attr);
  el.setAttribute(attr, value);
  return () => {
    if (!el) return;
    if (created) el.remove();
    else if (prev === null) el.removeAttribute(attr);
    else el.setAttribute(attr, prev);
  };
};

const meta = (key: "name" | "property", name: string, content: string) =>
  upsertHeadEl(
    `meta[${key}="${name}"]`,
    () => {
      const m = document.createElement("meta");
      m.setAttribute(key, name);
      return m;
    },
    "content",
    content,
  );

/** Шрифт темы с Google Fonts (с кириллицей и кыргызскими буквами). */
export function useThemeFont(design: ShowcaseDesign | null) {
  const family = design?.theme.font.family || "";
  useEffect(() => {
    const href = fontStylesheetHref(family);
    if (!href) return;
    if (document.head.querySelector(`link[data-sf-font="${CSS.escape(family)}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.sfFont = family;
    document.head.appendChild(link);
    // Шрифт не удаляем при смене темы: он в кэше и может понадобиться снова.
  }, [family]);
}

/** <title>, description, og:image, favicon, robots из блока `seo`. */
export function useShowcaseSeo(design: ShowcaseDesign | null, companyName: string) {
  const lang = design?.lang || "ru";
  const title = (design && tx(design.seo.title, lang)) || companyName;
  const description = design ? tx(design.seo.description, lang) : "";
  const ogImage = design ? mediaUrl(design.media, design.seo.og_image, 1080) : "";
  const favicon = design ? mediaUrl(design.media, design.seo.favicon, 320) : "";
  const noindex = !!design && (!design.seo.indexing || design.preview);

  useEffect(() => {
    if (!title) return;
    const prev = document.title;
    document.title = title;
    const undoOg = meta("property", "og:title", title);
    return () => {
      document.title = prev;
      undoOg();
    };
  }, [title]);

  useEffect(() => {
    if (!description) return;
    const undo = [meta("name", "description", description), meta("property", "og:description", description)];
    return () => undo.forEach((fn) => fn());
  }, [description]);

  useEffect(() => {
    if (!ogImage) return;
    return meta("property", "og:image", ogImage);
  }, [ogImage]);

  useEffect(() => {
    if (!noindex) return;
    return meta("name", "robots", "noindex, nofollow");
  }, [noindex]);

  useEffect(() => {
    if (!favicon) return;
    // Прячем иконки NurCRM, ставим иконку магазина; при уходе — возвращаем.
    const existing = Array.from(document.head.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]'));
    const saved = existing.map((l) => [l, l.rel] as const);
    existing.forEach((l) => (l.rel = "x-icon-disabled"));
    const link = document.createElement("link");
    link.rel = "icon";
    link.href = favicon;
    document.head.appendChild(link);
    return () => {
      link.remove();
      saved.forEach(([l, rel]) => (l.rel = rel));
    };
  }, [favicon]);
}
