import type { CompensationType, ReturnReason } from "./types";

export const RETURNS_LIST_PATH = "/main/suppliers/returns/";
export const RETURNS_DETAIL_PATH = (id: string) =>
  `/main/suppliers/returns/${encodeURIComponent(id)}/`;
export const RETURNS_CREATE_PATH = (supplierId: string) =>
  `/main/suppliers/${encodeURIComponent(supplierId)}/returns/`;

export const STORAGE_KEY_PREFIX = "nur-market.supplier-returns";

export const DEFAULT_PAGE_SIZE = 20;

export const REASON_LABELS: Record<ReturnReason, string> = {
  defect: "Брак",
  surplus: "Излишек",
  wrong_item: "Ошибка поставки",
  expired: "Просрочка",
  other: "Другое",
};

export const COMPENSATION_LABELS: Record<CompensationType, string> = {
  cash: "Вернуть деньги в кассу",
  debt_offset: "Уменьшить долг поставщику",
  none: "Только списать со склада",
};

export const REASON_OPTIONS: Array<{ value: ReturnReason; label: string }> =
  (Object.keys(REASON_LABELS) as ReturnReason[]).map((value) => ({
    value,
    label: REASON_LABELS[value],
  }));

export const COMPENSATION_OPTIONS: Array<{
  value: CompensationType;
  label: string;
  hint: string;
}> = [
  {
    value: "cash",
    label: COMPENSATION_LABELS.cash,
    hint: "Остаток уменьшится, в выбранную кассу придёт сумма возврата по закупочной цене.",
  },
  {
    value: "debt_offset",
    label: COMPENSATION_LABELS.debt_offset,
    hint: "Остаток уменьшится, долг перед поставщиком снизится на сумму возврата.",
  },
  {
    value: "none",
    label: COMPENSATION_LABELS.none,
    hint: "Товар уйдёт со склада без движения денег. Удобно, если поставщик заменит товар отдельно.",
  },
];
