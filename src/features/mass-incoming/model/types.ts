export type MassIncomingStatus = "IN_STOCK" | "IN_CATALOG" | "UNKNOWN";

/**
 * Откуда взят товар строки:
 * - `company` — карточка компании (`/main/products/`), можно приходовать;
 * - `global`  — только глобальная база NurCRM, перед приходом нужно создать
 *               карточку компании (`create-by-barcode`) с ценой;
 * - `none`    — штрихкод нигде не найден.
 */
export type MassIncomingSource = "company" | "global" | "none";

export type MassIncomingProduct = {
  id?: string;
  name?: string;
  barcode?: string;
  unit?: string;
  stock_qty?: number;
  price?: string;
};

export type MassIncomingCheck = {
  status: MassIncomingStatus;
  source: MassIncomingSource;
  barcode: string;
  product?: MassIncomingProduct | null;
  ambiguous?: boolean;
  matches?: unknown[];
};

export type MassIncomingRow = {
  key: string;
  barcode: string;
  status: MassIncomingStatus;
  source: MassIncomingSource;
  name: string;
  quantity: number;
  stockQty?: number;
  /** id карточки компании; для `global`/`none` пуст до создания карточки */
  productId?: string;
  unit?: string;
  /** Цена продажи, которую ввёл пользователь */
  price: string;
  /** Цена карточки на момент скана — чтобы не слать PATCH без изменений */
  initialPrice: string;
};
