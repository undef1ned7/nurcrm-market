/** JSON → ESC/POS formatters */

import { ESC } from "./bytes";
import { getEncoder, getEscposRuntimeConfig } from "./encoding";

const money = (n: any) => Number(n || 0).toFixed(2);
function lr(left: any, right: any, width: any = 32) {
  const L = String(left ?? "");
  const R = String(right ?? "");
  const spaces = Math.max(1, width - L.length - R.length);
  return L + " ".repeat(spaces) + R;
}

/** lr с учётом ESC ! (двойная ширина — в 2 раза меньше символов в строке). */
function lrSized(left: any, right: any, width: any, escSize: any = 0) {
  const isDoubleWidth = (escSize & 0x20) !== 0;
  const lineWidth = isDoubleWidth
    ? Math.max(12, Math.floor(width / 2))
    : width;
  return lr(left, right, lineWidth);
}

/** Перенос названия товара по словам для ширины чека. */
function wrapReceiptName(text: any, maxWidth: any) {
  const t = String(text || "").trim();
  if (!t) return [""];
  if (maxWidth < 1) return [t.slice(0, 1)];
  const words = t.split(/\s+/).filter(Boolean);
  const lines: any[] = [];
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

/** Левая часть строки позиции маркета: «Цена x Кол-о» или «Цена x Кол-о - Скидка». */
function buildMarketItemLineLeft(price: any, qty: any, lineDiscountAmt: any) {
  const base = `${money(price)} x ${qty}`;
  const amt = Math.max(0, toNum(lineDiscountAmt));
  if (amt <= 0) return base;
  return `${base} - ${formatMarketLineDiscountCell(lineDiscountAmt)}`;
}

const toNum = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Колонка «скидка» в строке маркета: «0» или сумма в сомах. */
function formatMarketLineDiscountCell(lineDiscountAmt: any) {
  const amt = Math.max(0, toNum(lineDiscountAmt));
  if (amt <= 0) return "0";
  return money(amt).replace(/\.00$/, "");
}

/** Акценты ESC/POS для чека маркета (без слишком крупного шрифта). */
function pushReceiptBoldOn(chunks: any) {
  chunks.push(ESC(0x1b, 0x45, 0x01));
}

function pushReceiptBoldOff(chunks: any) {
  chunks.push(ESC(0x1b, 0x45, 0x00));
}

function pushReceiptSlightLargeOn(chunks: any) {
  chunks.push(ESC(0x1b, 0x21, 0x08));
}


/** Пропорционально крупнее (ширина + высота), без «вытянутого» вида. */
function pushReceiptProportionalLargeOn(chunks: any) {
  chunks.push(ESC(0x1b, 0x21, 0x30));
}

function pushReceiptSizeOff(chunks: any) {
  chunks.push(ESC(0x1b, 0x21, 0x00));
}

function pushMarketItemHeaderRow(chunks: any, enc: any, width: any) {
  pushReceiptBoldOn(chunks);
  pushReceiptSlightLargeOn(chunks);
  chunks.push(enc(lr("Цена x Кол-о - Скидка", "Итого", width) + "\n"));
  pushReceiptSizeOff(chunks);
  pushReceiptBoldOff(chunks);
}

function pushMarketItemLineRow(chunks: any, enc: any, width: any, price: any, qty: any, lineDiscountAmt: any, lineTotal: any) {
  const left = buildMarketItemLineLeft(price, qty, lineDiscountAmt);
  pushReceiptBoldOn(chunks);
  pushReceiptSlightLargeOn(chunks);
  chunks.push(enc(lr(left, money(lineTotal), width) + "\n"));
  pushReceiptSizeOff(chunks);
  pushReceiptBoldOff(chunks);
}

/** Строка чека маркета: скидка как в eKassa (сумма + %), те же поля что при fiscal merge. */
function mapMarketReceiptItem(it: any) {
  const qty = toNum(it?.qty ?? it?.quantity) || 1;
  const unitPrice = toNum(it?.unit_price ?? it?.price);
  let lineDiscountAmt = toNum(
    it?.line_discount ?? it?.discount_total ?? it?.line_discount_total,
  );
  const lineTotalNum =
    it?.line_total != null && it?.line_total !== ""
      ? toNum(it.line_total)
      : null;
  const grossLine = Math.max(0, qty * unitPrice);
  if (
    lineDiscountAmt <= 0 &&
    lineTotalNum != null &&
    grossLine > lineTotalNum + 1e-9
  ) {
    lineDiscountAmt = grossLine - lineTotalNum;
  }
  const lineDiscountPct =
    it?.line_discount_pct != null && it?.line_discount_pct !== ""
      ? toNum(it.line_discount_pct)
      : lineDiscountAmt > 0 && grossLine > 0
        ? (lineDiscountAmt / grossLine) * 100
        : 0;
  const total =
    lineTotalNum != null && Number.isFinite(lineTotalNum)
      ? lineTotalNum
      : Math.max(0, grossLine - lineDiscountAmt);
  return {
    name: String(it?.name ?? it?.product_name ?? "Товар"),
    qty,
    price: unitPrice,
    total,
    line_discount_pct: lineDiscountPct,
    line_discount_amount: lineDiscountAmt,
  };
}

function resolveMarketOrderDiscount(payload: any, ekassaFields: any) {
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

const fromTyiyn = (v: any) => toNum(v) / 100;
const f = (fields: any, key: any) => (fields && Object.prototype.hasOwnProperty.call(fields, key) ? fields[key] : undefined);
function buildEscPosQr(text: any) {
  const value = String(text || "").trim();
  if (!value) return [];
  const utf8 = new TextEncoder().encode(value);
  const len = utf8.length + 3;
  const pL = len & 0xff;
  const pH = (len >> 8) & 0xff;
  return [
    ESC(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x30), // ECC: M
    ESC(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, 0x06), // module size
    new Uint8Array([0x1d, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30, ...utf8]), // store
    ESC(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30), // print
  ];
}
function buildReceiptFromJSON(payload: any, opts: any = {}) {
  const emphasizeMarketReceipt = opts.receiptStyle === "market";
  const cfg = getEscposRuntimeConfig({ marketDefault: emphasizeMarketReceipt });
  const width = Math.max(
    emphasizeMarketReceipt ? 32 : 42,
    opts.width || cfg.charsPerLine
  );
  const divider = "-".repeat(width);
  const codepage = opts.codepage || cfg.codepage;
  const enc = opts.encoder || getEncoder(codepage);
  const hasText = (v: any) => {
    const s = String(v ?? "").trim();
    return s !== "" && s !== "—";
  };

  const ekassaFields =
    payload?.ekassa_fiscal?.fields ||
    payload?.ekassa?.fields ||
    payload?.ekassa?.ekassa_payload?.data?.fields ||
    null;
  const company = String(payload.company ?? "").trim();
  const inn = String(payload.inn ?? "").trim();
  const address = String(payload.address ?? "").trim();
  const cashier = String(payload.cashier_name ?? "").trim();

  const docNo = String(
    ekassaFields ? (f(ekassaFields, "1042") ?? payload.doc_no ?? "") : (payload.doc_no ?? ""),
  ).trim();
  const dt = String(
    ekassaFields ? (f(ekassaFields, "1012") ?? payload.created_at ?? "") : (payload.created_at ?? ""),
  ).trim();
  const shift = String(ekassaFields ? (f(ekassaFields, "1038") ?? "") : "").trim();

  const payloadItemsForMerge =
    (Array.isArray(payload.items) && payload.items) ||
    (Array.isArray(payload.receipt?.items) && payload.receipt.items) ||
    (Array.isArray(payload.cart?.items) && payload.cart.items) ||
    null;

  const items = ekassaFields && Array.isArray(f(ekassaFields, "1059"))
    ? f(ekassaFields, "1059").map((it: any, idx: any) => {
      const qty = toNum(it?.["1023"]) || 1;
      // В ответах eKassa для Маркета часто:
      // 1043 = сумма позиции, 1076 = цена за единицу.
      const raw1043 = fromTyiyn(it?.["1043"]);
      const raw1076 = fromTyiyn(it?.["1076"]);
      const price = raw1076 > 0 ? raw1076 : (qty > 0 ? raw1043 / qty : raw1043);
      const total = raw1043 > 0 ? raw1043 : price * qty;
      const base = {
        name: String(it?.["1030"] || "Товар"),
        qty,
        price,
        total,
      };
      let src = payloadItemsForMerge?.[idx];
      if (!src && payloadItemsForMerge?.length) {
        const nm = base.name.trim();
        src =
          payloadItemsForMerge.find(
            (x: any) =>
              String(x?.name ?? "").trim() === nm &&
              (toNum(x?.qty) || 1) === base.qty,
          ) || null;
      }
      if (!src) return base;
      const mapped = mapMarketReceiptItem({ ...src, qty, price, unit_price: price });
      return {
        ...base,
        line_discount_pct: mapped.line_discount_pct,
        line_discount_amount: mapped.line_discount_amount,
        total: mapped.total,
      };
    })
    : (payloadItemsForMerge || (Array.isArray(payload.items) ? payload.items : [])).map(
        mapMarketReceiptItem,
      );

  // Подытог — это ВАЛОВАЯ сумма до скидок. payload.discount — общая скидка
  // (включая построчные), поэтому подытог считаем как «итог по строке + скидка
  // по строке» (= цена×кол-во). Иначе построчная скидка вычиталась бы дважды:
  // один раз в line_total, второй — в общей скидке. (см. баг: 200 - 150 = 50
  // вместо 250 - 150 = 100).
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
  const kkm = String(
    ekassaFields
      ? (f(ekassaFields, "1037") ?? payload?.ekassa_fiscal?.kkm_reg_number ?? "")
      : (payload?.ekassa_fiscal?.kkm_reg_number ?? ""),
  ).trim();
  const fn = String(
    ekassaFields
      ? (f(ekassaFields, "1041") ?? payload?.ekassa_fiscal?.fm_number ?? "")
      : (payload?.ekassa_fiscal?.fm_number ?? ""),
  ).trim();
  const fd = String(
    ekassaFields
      ? (f(ekassaFields, "1040") ?? payload?.ekassa_fiscal?.fd_number ?? "")
      : (payload?.ekassa_fiscal?.fd_number ?? ""),
  ).trim();
  const fpd = String(
    ekassaFields
      ? (f(ekassaFields, "1077") ?? payload?.ekassa_fiscal?.fpd ?? "")
      : (payload?.ekassa_fiscal?.fpd ?? ""),
  ).trim();
  const qrLink = String(payload?.ekassa_fiscal?.link || payload?.ekassa?.link || "").trim();

  const chunks: any[] = [];
  chunks.push(ESC(0x1b, 0x40)); // init
  // ESC R: по Epson n=7 — это Spain I, не Россия; там часто «ломаются» | \ [ ] и т.п.
  // Кириллица идёт через ESC t + CP866/1251 (байты 0x80+). Для стабильного ASCII — USA (0).
  chunks.push(ESC(0x1b, 0x52, 0x00));
  chunks.push(ESC(0x1b, 0x74, codepage)); // кодовая страница

  chunks.push(ESC(0x1b, 0x61, 0x01)); // center
  if (emphasizeMarketReceipt) {
    chunks.push(ESC(0x1b, 0x45, 0x01)); // bold on
    chunks.push(enc("СПАСИБО ЗА ПОКУПКУ!\n"));
    chunks.push(ESC(0x1b, 0x45, 0x00)); // bold off
    chunks.push(enc("\n"));
  }
  chunks.push(enc("Контрольно-кассовый чек - Продажа\n"));
  if (hasText(company)) {
    pushReceiptBoldOn(chunks);
    pushReceiptSlightLargeOn(chunks);
    chunks.push(enc(`Магазин: ${company}\n`));
    pushReceiptSizeOff(chunks);
    pushReceiptBoldOff(chunks);
  }
  if (hasText(inn)) chunks.push(enc(`ИНН ${inn}\n`));
  if (hasText(address)) chunks.push(enc(address + "\n"));
  chunks.push(ESC(0x1b, 0x61, 0x00)); // left
  chunks.push(enc(divider + "\n"));
  if (hasText(docNo) && hasText(dt)) {
    chunks.push(enc(lr(`Чек № ${docNo}`, dt, width) + "\n"));
  } else if (hasText(docNo)) {
    chunks.push(enc(`Чек № ${docNo}\n`));
  } else if (hasText(dt)) {
    chunks.push(enc(`${dt}\n`));
  }
  if (hasText(cashier)) chunks.push(enc(lr("Кассир", cashier, width) + "\n"));
  if (hasText(shift)) chunks.push(enc(lr("Смена", shift, width) + "\n"));
  chunks.push(enc(divider + "\n"));
  if (ekassaFields) {
    chunks.push(enc("СНО: Общий налоговый режим\n"));
    chunks.push(enc(divider + "\n"));
  }
  if (emphasizeMarketReceipt) {
    pushMarketItemHeaderRow(chunks, enc, width);
    chunks.push(enc("\n"));
    for (const [index, it] of items.entries()) {
      const name = String(it.name ?? "Товар");
      const qty = Number(it.qty || 1);
      const price = Number(it.price || 0);
      const lineTotal = Number(it.total ?? qty * price);
      const lineDiscountAmt = Math.max(0, toNum(it?.line_discount_amount));
      const prefix = `${index + 1}) `;
      const nameLines = wrapReceiptName(name, Math.max(8, width - prefix.length));

      pushReceiptBoldOn(chunks);
      chunks.push(enc(prefix + nameLines[0] + "\n"));
      for (let i = 1; i < nameLines.length; i += 1) {
        chunks.push(enc(`   ${nameLines[i]}\n`));
      }
      pushReceiptBoldOff(chunks);
      chunks.push(enc("\n"));

      pushMarketItemLineRow(
        chunks,
        enc,
        width,
        price,
        qty,
        lineDiscountAmt,
        lineTotal,
      );
      if (index < items.length - 1) {
        chunks.push(enc(divider + "\n"));
      }
    }
  } else {
    for (const [index, it] of items.entries()) {
      const name = String(it.name ?? "Товар");
      const qty = Number(it.qty || 1);
      const price = Number(it.price || 0);
      const lineTotal = Number(it.total ?? qty * price);
      chunks.push(enc(`${index + 1}. ${name}\n`));
      const lineDiscountAmt = Math.max(0, toNum(it?.line_discount_amount));
      chunks.push(enc(lr(`${money(price)} x ${qty} ед.`, money(lineTotal), width) + "\n"));
      if (lineDiscountAmt > 0) {
        chunks.push(
          enc(
            lr("Скидка (товар)", `-${money(lineDiscountAmt)}`, width) + "\n",
          ),
        );
      }
      if (ekassaFields) {
        chunks.push(enc("НДС 0%, НсП 0%\n"));
      }
    }
  }

  chunks.push(enc(divider + "\n"));
  if (emphasizeMarketReceipt) {
    chunks.push(ESC(0x1b, 0x45, 0x01)); // bold on
  }
  chunks.push(enc(lr("Подытог", money(subtotal), width) + "\n"));
  if (discount > 0) {
    chunks.push(enc(lr("Скидка", `-${money(discount)}`, width) + "\n"));
  }
  if (!ekassaFields) {
    if (vat > 0) chunks.push(enc(lr("НДС", money(vat), width) + "\n"));
    if (nsp > 0) chunks.push(enc(lr("НсП", money(nsp), width) + "\n"));
  }
  if (emphasizeMarketReceipt) {
    chunks.push(ESC(0x1b, 0x45, 0x00)); // bold off
  }
  chunks.push(enc(divider + "\n"));
  if (emphasizeMarketReceipt) {
    chunks.push(ESC(0x1b, 0x45, 0x01)); // bold on
  }
  if (ekassaFields) {
    chunks.push(enc(lr("Всего", money(total), width) + "\n"));
    chunks.push(enc(lr("Наличные", money(paidCash), width) + "\n"));
    chunks.push(enc(lr("Безналичные", money(paidCard), width) + "\n"));
    if (cashReceived > paidCash) {
      chunks.push(enc(lr("Получено", money(cashReceived), width) + "\n"));
    }
    if (change > 0) {
      chunks.push(ESC(0x1b, 0x45, 0x01));
      chunks.push(enc(lr("Сдача", money(change), width) + "\n"));
      chunks.push(ESC(0x1b, 0x45, 0x00));
    }
    chunks.push(enc(lr("Вид расчета", "Полный расчет", width) + "\n"));
    chunks.push(enc(lr("НДС 0%", "0.00", width) + "\n"));
    chunks.push(enc(lr("НсП 0%", "0.00", width) + "\n"));
  } else {
    if (paidCash > 0) chunks.push(enc(lr("Наличные", money(paidCash), width) + "\n"));
    if (paidCard > 0) chunks.push(enc(lr("Безналичные", money(paidCard), width) + "\n"));
    if (cashReceived > paidCash) {
      chunks.push(enc(lr("Получено", money(cashReceived), width) + "\n"));
    }
    if (change > 0) {
      chunks.push(ESC(0x1b, 0x45, 0x01));
      chunks.push(enc(lr("Сдача", money(change), width) + "\n"));
      chunks.push(ESC(0x1b, 0x45, 0x00));
    }
  }
  if (emphasizeMarketReceipt) {
    chunks.push(ESC(0x1b, 0x45, 0x00)); // bold off
  }

  pushReceiptBoldOn(chunks);
  pushReceiptProportionalLargeOn(chunks);
  chunks.push(enc(lrSized("Итог", `${money(total)} СОМ`, width, 0x30) + "\n"));
  pushReceiptSizeOff(chunks);
  pushReceiptBoldOff(chunks);
  chunks.push(enc(divider + "\n"));
  if (hasText(kkm)) {
    if (ekassaFields) {
      chunks.push(enc(lr("ККМ версия", "1.0", width) + "\n"));
      chunks.push(enc(divider + "\n"));

    }
    chunks.push(enc(lr("РН ККМ", kkm, width) + "\n"));
    chunks.push(enc(divider + "\n"));

  }
  if (hasText(fn)) {
    chunks.push(enc(lr("ФМ", fn, width) + "\n"));
    chunks.push(enc(divider + "\n"));

  }
  if (hasText(fd)) {
    chunks.push(enc(lr("ФД", fd, width) + "\n"));
    chunks.push(enc(divider + "\n"));

  }
  if (hasText(fpd)) {
    chunks.push(enc(lr("ФПД", fpd, width) + "\n"));
  }
  chunks.push(enc(divider + "\n"));
  if (qrLink) {
    chunks.push(ESC(0x1b, 0x61, 0x01)); // center
    chunks.push(enc("Проверка чека\n"));
    for (const part of buildEscPosQr(qrLink)) {
      chunks.push(part);
    }
    chunks.push(enc("\n"));
    chunks.push(ESC(0x1b, 0x61, 0x00)); // left
  }
  // Даем принтеру достаточно протянуть бумагу перед отрезом.
  chunks.push(ESC(0x1b, 0x64, 0x06)); // feed 6 lines
  chunks.push(ESC(0x1d, 0x56, 0x00)); // full cut
  return chunks;
}


export { buildReceiptFromJSON };
