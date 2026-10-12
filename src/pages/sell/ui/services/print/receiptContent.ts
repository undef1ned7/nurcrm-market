/** Общий разбор JSON чека для текстового и graphic ESC/POS */

import { getEscposRuntimeConfig } from "./encoding";
import { toReceiptNum } from "./receiptDiscount";
import {
  mapMarketReceiptItem,
  mergeEkassaItemsWithPayload,
  warnIfEkassaDiscountMismatch,
  type MappedReceiptItem,
  type MergeStrategy,
} from "./receiptItems";

export const money = (n: unknown) => Number(n || 0).toFixed(2);

export function lr(left: unknown, right: unknown, width = 32) {
  const L = String(left ?? "");
  const R = String(right ?? "");
  const spaces = Math.max(1, width - L.length - R.length);
  return L + " ".repeat(spaces) + R;
}

export function wrapReceiptName(text: unknown, maxWidth: number) {
  const t = String(text || "").trim();
  if (!t) return [""];
  if (maxWidth < 1) return [t.slice(0, 1)];
  const words = t.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    if (word.length > maxWidth) {
      if (cur) {
        lines.push(cur);
        cur = "";
      }
      for (let i = 0; i < word.length; i += maxWidth) {
        lines.push(word.slice(i, i + maxWidth));
      }
      continue;
    }
    const next = cur ? `${cur} ${word}` : word;
    if (next.length <= maxWidth) cur = next;
    else {
      if (cur) lines.push(cur);
      cur = word;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

const toNum = toReceiptNum;
const fromTyiyn = (v: unknown) => toNum(v) / 100;
const f = (fields: Record<string, unknown> | null, key: string) =>
  fields && Object.prototype.hasOwnProperty.call(fields, key)
    ? fields[key]
    : undefined;

export function hasReceiptText(v: unknown) {
  const s = String(v ?? "").trim();
  return s !== "" && s !== "—";
}

export function resolveMarketOrderDiscount(
  payload: Record<string, unknown>,
  ekassaFields: Record<string, unknown> | null,
) {
  if (ekassaFields) return 0;
  return Math.max(
    0,
    toNum(
      payload?.discount ??
        payload?.order_discount_total ??
        payload?.order_discount,
    ),
  );
}

export function formatMarketLineDiscountCell(lineDiscountAmt: unknown) {
  const amt = Math.max(0, toNum(lineDiscountAmt));
  if (amt <= 0) return "0";
  return money(amt).replace(/\.00$/, "");
}

export function buildMarketItemLineLeft(
  price: number,
  qty: number,
  lineDiscountAmt: unknown,
) {
  const base = `${money(price)} x ${qty}`;
  const amt = Math.max(0, toNum(lineDiscountAmt));
  if (amt <= 0) return base;
  return `${base} - ${formatMarketLineDiscountCell(lineDiscountAmt)}`;
}

export type ReceiptContent = {
  emphasizeMarketReceipt: boolean;
  width: number;
  divider: string;
  company: string;
  inn: string;
  address: string;
  cashier: string;
  consultant: string;
  docNo: string;
  dt: string;
  shift: string;
  items: MappedReceiptItem[];
  subtotal: number;
  discount: number;
  vat: number;
  nsp: number;
  total: number;
  paidCard: number;
  paidCash: number;
  cashReceived: number;
  change: number;
  kkm: string;
  fn: string;
  fd: string;
  fpd: string;
  qrLink: string;
  ekassaFields: Record<string, unknown> | null;
};

export function prepareReceiptContent(
  payload: Record<string, unknown>,
  opts: { receiptStyle?: string; width?: number } = {},
): ReceiptContent {
  const emphasizeMarketReceipt = opts.receiptStyle === "market";
  const cfg = getEscposRuntimeConfig({ marketDefault: emphasizeMarketReceipt });
  const width = Math.max(
    emphasizeMarketReceipt ? 32 : 42,
    opts.width || cfg.charsPerLine,
  );
  const divider = "-".repeat(width);

  const ekassaNested = payload?.ekassa as
    | { ekassa_payload?: { data?: { fields?: Record<string, unknown> } } }
    | undefined;
  const ekassaFields =
    (payload?.ekassa_fiscal as { fields?: Record<string, unknown> } | undefined)
      ?.fields ||
    (payload?.ekassa as { fields?: Record<string, unknown> } | undefined)
      ?.fields ||
    ekassaNested?.ekassa_payload?.data?.fields ||
    null;

  const company = String(payload.company ?? "").trim();
  const inn = String(payload.inn ?? "").trim();
  const address = String(payload.address ?? "").trim();
  const cashier = String(payload.cashier_name ?? "").trim();
  const consultant = String(
    payload.consultant_name ||
      payload.consultant_display ||
      (payload.consultant && typeof payload.consultant === "object"
        ? (payload.consultant as { name?: string; full_name?: string }).name ||
          (payload.consultant as { name?: string; full_name?: string })
            .full_name ||
          ""
        : "") ||
      "",
  ).trim();

  const docNo = String(
    ekassaFields
      ? (f(ekassaFields, "1042") ?? payload.doc_no ?? "")
      : (payload.doc_no ?? ""),
  ).trim();
  const dt = String(
    ekassaFields
      ? (f(ekassaFields, "1012") ?? payload.created_at ?? "")
      : (payload.created_at ?? ""),
  ).trim();
  const shift = String(ekassaFields ? (f(ekassaFields, "1038") ?? "") : "").trim();

  const payloadItemsForMerge =
    (Array.isArray(payload.items) && payload.items) ||
    (Array.isArray((payload.receipt as { items?: unknown[] } | undefined)?.items) &&
      (payload.receipt as { items: unknown[] }).items) ||
    (Array.isArray((payload.cart as { items?: unknown[] } | undefined)?.items) &&
      (payload.cart as { items: unknown[] }).items) ||
    null;

  let ekassaMergeStrategies: MergeStrategy[] = [];
  const items =
    ekassaFields && Array.isArray(f(ekassaFields, "1059"))
      ? (() => {
          const merged = mergeEkassaItemsWithPayload(
            f(ekassaFields, "1059") as unknown[],
            payloadItemsForMerge,
          );
          ekassaMergeStrategies = merged.strategies;
          return merged.items;
        })()
      : (payloadItemsForMerge || (Array.isArray(payload.items) ? payload.items : [])).map(
          mapMarketReceiptItem,
        );

  const subtotal = ekassaFields
    ? fromTyiyn(f(ekassaFields, "1020"))
    : items.reduce(
        (s, it) => s + toNum(it.total) + toNum(it.line_discount_amount),
        0,
      );
  const discount = resolveMarketOrderDiscount(payload, ekassaFields);
  const vat = ekassaFields ? fromTyiyn(f(ekassaFields, "1033")) : toNum(payload.tax);
  const nsp = ekassaFields ? fromTyiyn(f(ekassaFields, "1215")) : 0;
  const total = ekassaFields
    ? fromTyiyn(f(ekassaFields, "1031"))
    : Math.max(0, subtotal - discount + vat);
  const paidCard = ekassaFields
    ? fromTyiyn(f(ekassaFields, "1081"))
    : Math.max(0, toNum(payload.paid_card));
  const paidCash = ekassaFields
    ? Math.max(0, total - paidCard)
    : Math.max(0, toNum(payload.paid_cash));
  const cashReceived = Math.max(0, toNum(payload.cash_received));
  const change = Math.max(0, toNum(payload.change));

  if (ekassaFields) {
    const lineDiscountSum = items.reduce(
      (s, it) => s + toNum(it.line_discount_amount),
      0,
    );
    const payloadOrderDiscount = toNum(
      payload?.discount ??
        payload?.order_discount_total ??
        payload?.order_discount,
    );
    const ekassaImpliedDiscount = Math.max(0, subtotal - total - vat - nsp);
    warnIfEkassaDiscountMismatch({
      lineDiscountSum,
      orderDiscount:
        payloadOrderDiscount > 0 ? payloadOrderDiscount : ekassaImpliedDiscount,
      strategies: ekassaMergeStrategies,
    });
  }

  const ekassaFiscal = payload.ekassa_fiscal as
    | {
        kkm_reg_number?: string;
        fm_number?: string;
        fd_number?: string;
        fpd?: string;
        link?: string;
      }
    | undefined;
  const ekassa = payload.ekassa as { link?: string } | undefined;

  const kkm = String(
    ekassaFields
      ? (f(ekassaFields, "1037") ?? ekassaFiscal?.kkm_reg_number ?? "")
      : (ekassaFiscal?.kkm_reg_number ?? ""),
  ).trim();
  const fn = String(
    ekassaFields
      ? (f(ekassaFields, "1041") ?? ekassaFiscal?.fm_number ?? "")
      : (ekassaFiscal?.fm_number ?? ""),
  ).trim();
  const fd = String(
    ekassaFields
      ? (f(ekassaFields, "1040") ?? ekassaFiscal?.fd_number ?? "")
      : (ekassaFiscal?.fd_number ?? ""),
  ).trim();
  const fpd = String(
    ekassaFields
      ? (f(ekassaFields, "1077") ?? ekassaFiscal?.fpd ?? "")
      : (ekassaFiscal?.fpd ?? ""),
  ).trim();
  const qrLink = String(ekassaFiscal?.link || ekassa?.link || "").trim();

  return {
    emphasizeMarketReceipt,
    width,
    divider,
    company,
    inn,
    address,
    cashier,
    consultant,
    docNo,
    dt,
    shift,
    items,
    subtotal,
    discount,
    vat,
    nsp,
    total,
    paidCard,
    paidCash,
    cashReceived,
    change,
    kkm,
    fn,
    fd,
    fpd,
    qrLink,
    ekassaFields,
  };
}
