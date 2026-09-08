/** JSON → текстовый ESC/POS */

import { ESC } from "./bytes";
import { getEncoder, getEscposRuntimeConfig } from "./encoding";
import { toReceiptNum } from "./receiptDiscount";
import {
  buildMarketItemLineLeft,
  formatMarketLineDiscountCell,
  hasReceiptText,
  lr,
  money,
  prepareReceiptContent,
  wrapReceiptName,
} from "./receiptContent";
import { buildEscPosQr } from "./receiptQr";
import { mapMarketReceiptItem } from "./receiptItems";

const toNum = toReceiptNum;

function lrSized(left: unknown, right: unknown, width: number, escSize = 0) {
  const isDoubleWidth = (escSize & 0x20) !== 0;
  const lineWidth = isDoubleWidth
    ? Math.max(12, Math.floor(width / 2))
    : width;
  return lr(left, right, lineWidth);
}

function pushReceiptBoldOn(chunks: Uint8Array[]) {
  chunks.push(ESC(0x1b, 0x45, 0x01));
}

function pushReceiptBoldOff(chunks: Uint8Array[]) {
  chunks.push(ESC(0x1b, 0x45, 0x00));
}

function pushReceiptSlightLargeOn(chunks: Uint8Array[]) {
  chunks.push(ESC(0x1b, 0x21, 0x08));
}

function pushReceiptProportionalLargeOn(chunks: Uint8Array[]) {
  chunks.push(ESC(0x1b, 0x21, 0x30));
}

function pushReceiptSizeOff(chunks: Uint8Array[]) {
  chunks.push(ESC(0x1b, 0x21, 0x00));
}

function pushMarketItemHeaderRow(chunks: Uint8Array[], enc: (s: string) => Uint8Array, width: number) {
  pushReceiptBoldOn(chunks);
  pushReceiptSlightLargeOn(chunks);
  chunks.push(enc(lr("Цена x Кол-о - Скидка", "Итого", width) + "\n"));
  pushReceiptSizeOff(chunks);
  pushReceiptBoldOff(chunks);
}

function pushMarketItemLineRow(
  chunks: Uint8Array[],
  enc: (s: string) => Uint8Array,
  width: number,
  price: number,
  qty: number,
  lineDiscountAmt: unknown,
  lineTotal: number,
) {
  const left = buildMarketItemLineLeft(price, qty, lineDiscountAmt);
  pushReceiptBoldOn(chunks);
  pushReceiptSlightLargeOn(chunks);
  chunks.push(enc(lr(left, money(lineTotal), width) + "\n"));
  pushReceiptSizeOff(chunks);
  pushReceiptBoldOff(chunks);
}

function buildReceiptFromJSON(payload: Record<string, unknown>, opts: Record<string, unknown> = {}) {
  const c = prepareReceiptContent(payload, {
    receiptStyle: opts.receiptStyle as string | undefined,
    width: opts.width as number | undefined,
  });
  const cfg = getEscposRuntimeConfig({ marketDefault: c.emphasizeMarketReceipt });
  const codepage = (opts.codepage as number | undefined) || cfg.codepage;
  const enc = (opts.encoder as ((s: string) => Uint8Array) | undefined) || getEncoder(codepage);
  const { width, divider } = c;
  const emphasizeMarketReceipt = c.emphasizeMarketReceipt;
  const ekassaFields = c.ekassaFields;

  const chunks: Uint8Array[] = [];
  chunks.push(ESC(0x1b, 0x40));
  chunks.push(ESC(0x1b, 0x52, 0x00));
  chunks.push(ESC(0x1b, 0x74, codepage));

  chunks.push(ESC(0x1b, 0x61, 0x01));
  if (emphasizeMarketReceipt) {
    chunks.push(ESC(0x1b, 0x45, 0x01));
    chunks.push(enc("СПАСИБО ЗА ПОКУПКУ!\n"));
    chunks.push(ESC(0x1b, 0x45, 0x00));
    chunks.push(enc("\n"));
  }
  chunks.push(enc("Контрольно-кассовый чек - Продажа\n"));
  if (hasReceiptText(c.company)) {
    pushReceiptBoldOn(chunks);
    pushReceiptSlightLargeOn(chunks);
    chunks.push(enc(`Магазин: ${c.company}\n`));
    pushReceiptSizeOff(chunks);
    pushReceiptBoldOff(chunks);
  }
  if (hasReceiptText(c.inn)) chunks.push(enc(`ИНН ${c.inn}\n`));
  if (hasReceiptText(c.address)) chunks.push(enc(c.address + "\n"));
  chunks.push(ESC(0x1b, 0x61, 0x00));
  chunks.push(enc(divider + "\n"));

  if (hasReceiptText(c.docNo) && hasReceiptText(c.dt)) {
    chunks.push(enc(lr(`Чек № ${c.docNo}`, c.dt, width) + "\n"));
  } else if (hasReceiptText(c.docNo)) {
    chunks.push(enc(`Чек № ${c.docNo}\n`));
  } else if (hasReceiptText(c.dt)) {
    chunks.push(enc(`${c.dt}\n`));
  }
  if (hasReceiptText(c.cashier)) chunks.push(enc(lr("Кассир", c.cashier, width) + "\n"));
  if (hasReceiptText(c.consultant)) {
    chunks.push(enc(lr("Консультант", c.consultant, width) + "\n"));
  }
  if (hasReceiptText(c.shift)) chunks.push(enc(lr("Смена", c.shift, width) + "\n"));
  chunks.push(enc(divider + "\n"));

  if (ekassaFields) {
    chunks.push(enc("СНО: Общий налоговый режим\n"));
    chunks.push(enc(divider + "\n"));
  }

  if (emphasizeMarketReceipt) {
    pushMarketItemHeaderRow(chunks, enc, width);
    chunks.push(enc("\n"));
    for (const [index, it] of c.items.entries()) {
      const name = String(it.name ?? "Товар");
      const qty = Number(it.qty || 1);
      const price = Number(it.price || 0);
      const lineTotal = Number(it.total ?? qty * price);
      const lineDiscountAmt = Math.max(0, toNum(it.line_discount_amount));
      const prefix = `${index + 1}) `;
      const nameLines = wrapReceiptName(name, Math.max(8, width - prefix.length));

      pushReceiptBoldOn(chunks);
      chunks.push(enc(prefix + nameLines[0] + "\n"));
      for (let i = 1; i < nameLines.length; i += 1) {
        chunks.push(enc(`   ${nameLines[i]}\n`));
      }
      pushReceiptBoldOff(chunks);
      chunks.push(enc("\n"));

      pushMarketItemLineRow(chunks, enc, width, price, qty, lineDiscountAmt, lineTotal);
      if (index < c.items.length - 1) chunks.push(enc(divider + "\n"));
    }
  } else {
    for (const [index, it] of c.items.entries()) {
      const name = String(it.name ?? "Товар");
      const qty = Number(it.qty || 1);
      const price = Number(it.price || 0);
      const lineTotal = Number(it.total ?? qty * price);
      chunks.push(enc(`${index + 1}. ${name}\n`));
      const lineDiscountAmt = Math.max(0, toNum(it.line_discount_amount));
      chunks.push(enc(lr(`${money(price)} x ${qty} ед.`, money(lineTotal), width) + "\n"));
      if (lineDiscountAmt > 0) {
        chunks.push(
          enc(lr("Скидка (товар)", `-${money(lineDiscountAmt)}`, width) + "\n"),
        );
      }
      if (ekassaFields) chunks.push(enc("НДС 0%, НсП 0%\n"));
    }
  }

  chunks.push(enc(divider + "\n"));
  if (emphasizeMarketReceipt) pushReceiptBoldOn(chunks);
  chunks.push(enc(lr("Подытог", money(c.subtotal), width) + "\n"));
  if (c.discount > 0) {
    chunks.push(enc(lr("Скидка", `-${money(c.discount)}`, width) + "\n"));
  }
  if (!ekassaFields) {
    if (c.vat > 0) chunks.push(enc(lr("НДС", money(c.vat), width) + "\n"));
    if (c.nsp > 0) chunks.push(enc(lr("НсП", money(c.nsp), width) + "\n"));
  }
  if (emphasizeMarketReceipt) pushReceiptBoldOff(chunks);
  chunks.push(enc(divider + "\n"));
  if (emphasizeMarketReceipt) pushReceiptBoldOn(chunks);

  if (ekassaFields) {
    chunks.push(enc(lr("Всего", money(c.total), width) + "\n"));
    chunks.push(enc(lr("Наличные", money(c.paidCash), width) + "\n"));
    chunks.push(enc(lr("Безналичные", money(c.paidCard), width) + "\n"));
    if (c.cashReceived > c.paidCash) {
      chunks.push(enc(lr("Получено", money(c.cashReceived), width) + "\n"));
    }
    if (c.change > 0) {
      pushReceiptBoldOn(chunks);
      chunks.push(enc(lr("Сдача", money(c.change), width) + "\n"));
      pushReceiptBoldOff(chunks);
    }
    chunks.push(enc(lr("Вид расчета", "Полный расчет", width) + "\n"));
    chunks.push(enc(lr("НДС 0%", "0.00", width) + "\n"));
    chunks.push(enc(lr("НсП 0%", "0.00", width) + "\n"));
  } else {
    if (c.paidCash > 0) chunks.push(enc(lr("Наличные", money(c.paidCash), width) + "\n"));
    if (c.paidCard > 0) chunks.push(enc(lr("Безналичные", money(c.paidCard), width) + "\n"));
    if (c.cashReceived > c.paidCash) {
      chunks.push(enc(lr("Получено", money(c.cashReceived), width) + "\n"));
    }
    if (c.change > 0) {
      pushReceiptBoldOn(chunks);
      chunks.push(enc(lr("Сдача", money(c.change), width) + "\n"));
      pushReceiptBoldOff(chunks);
    }
  }
  if (emphasizeMarketReceipt) pushReceiptBoldOff(chunks);

  pushReceiptBoldOn(chunks);
  pushReceiptProportionalLargeOn(chunks);
  chunks.push(enc(lrSized("Итог", `${money(c.total)} СОМ`, width, 0x30) + "\n"));
  pushReceiptSizeOff(chunks);
  pushReceiptBoldOff(chunks);
  chunks.push(enc(divider + "\n"));

  if (hasReceiptText(c.kkm)) {
    if (ekassaFields) {
      chunks.push(enc(lr("ККМ версия", "1.0", width) + "\n"));
      chunks.push(enc(divider + "\n"));
    }
    chunks.push(enc(lr("РН ККМ", c.kkm, width) + "\n"));
    chunks.push(enc(divider + "\n"));
  }
  if (hasReceiptText(c.fn)) {
    chunks.push(enc(lr("ФМ", c.fn, width) + "\n"));
    chunks.push(enc(divider + "\n"));
  }
  if (hasReceiptText(c.fd)) {
    chunks.push(enc(lr("ФД", c.fd, width) + "\n"));
    chunks.push(enc(divider + "\n"));
  }
  if (hasReceiptText(c.fpd)) chunks.push(enc(lr("ФПД", c.fpd, width) + "\n"));
  chunks.push(enc(divider + "\n"));

  if (c.qrLink) {
    chunks.push(ESC(0x1b, 0x61, 0x01));
    chunks.push(enc("Проверка чека\n"));
    for (const part of buildEscPosQr(c.qrLink)) chunks.push(part);
    chunks.push(enc("\n"));
    chunks.push(ESC(0x1b, 0x61, 0x00));
  }

  chunks.push(ESC(0x1b, 0x64, 0x06));
  chunks.push(ESC(0x1d, 0x56, 0x00));
  return chunks;
}

export { buildReceiptFromJSON, mapMarketReceiptItem };
