import JsBarcode from "jsbarcode";
import { getBarcodePrintEncoding } from "@shared/lib/tools/productBarcode";
import {
  labelsCountForVariant,
  variantEffectivePrice,
  variantLabel,
  type ProductVariant,
} from "@entities/product";

const escapeHtml = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** SVG штрихкода строкой; пустая строка — если код не кодируется. */
const barcodeSvg = (raw: string): string => {
  const value = String(raw || "").trim();
  if (!value) return "";
  let code = value;
  let format = "CODE128";
  try {
    const enc = getBarcodePrintEncoding(value);
    code = enc.code;
    format = enc.format === "EAN8" || enc.format === "EAN13" ? enc.format : "CODE128";
  } catch {
    format = "CODE128";
  }
  try {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    JsBarcode(svg, code, {
      format,
      width: 1.4,
      height: 36,
      displayValue: true,
      fontSize: 11,
      margin: 0,
    });
    return svg.outerHTML;
  } catch {
    return `<div class="code">${escapeHtml(value)}</div>`;
  }
};

export type VariantLabelsInput = {
  productName: string;
  productPrice: unknown;
  variants: ProductVariant[];
};

/** HTML листа этикеток: на каждый вариант столько этикеток, сколько штук на остатке. */
export const buildVariantLabelsHtml = ({
  productName,
  productPrice,
  variants,
}: VariantLabelsInput): { html: string; count: number } => {
  const labels: string[] = [];
  for (const v of variants) {
    const n = labelsCountForVariant(v);
    if (n <= 0) continue;
    const price = variantEffectivePrice(v, productPrice);
    const one = `<div class="label">
  <div class="name">${escapeHtml(productName)}</div>
  <div class="variant">${escapeHtml(variantLabel(v.size, v.color))}</div>
  <div class="price">${escapeHtml(Math.round(price * 100) / 100)} сом</div>
  ${barcodeSvg(v.barcode)}
</div>`;
    for (let i = 0; i < n; i += 1) labels.push(one);
  }
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(productName)}</title>
<style>
  @page { margin: 6mm; }
  body { font-family: Arial, sans-serif; margin: 0; }
  .sheet { display: flex; flex-wrap: wrap; gap: 4mm; }
  .label { width: 58mm; height: 38mm; box-sizing: border-box; border: 1px dashed #bbb; padding: 2mm;
    display: flex; flex-direction: column; align-items: center; justify-content: space-between;
    page-break-inside: avoid; overflow: hidden; }
  .name { font-size: 11px; font-weight: bold; text-align: center; max-height: 2.6em; overflow: hidden; }
  .variant { font-size: 13px; font-weight: bold; }
  .price { font-size: 14px; }
  svg { max-width: 100%; height: auto; }
  .code { font-family: monospace; font-size: 12px; }
</style></head><body><div class="sheet">${labels.join("")}</div></body></html>`;
  return { html, count: labels.length };
};

/** Печать через скрытый iframe — без всплывающих окон. */
export const printHtmlDocument = (html: string): void => {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  if (!doc) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  const win = iframe.contentWindow;
  setTimeout(() => {
    try {
      win?.focus();
      win?.print();
    } finally {
      setTimeout(() => iframe.remove(), 1000);
    }
  }, 50);
};
