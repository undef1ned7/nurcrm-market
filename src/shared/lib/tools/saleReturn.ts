/** Нормализует статус продажи к slug: paid | debt | canceled | new | … */
export const normalizeSaleStatus = (status: any) => {
  const s = String(status ?? "")
    .trim()
    .toLowerCase();
  if (!s) return "";
  if (["paid", "оплачен", "оплаченный", "оплачена", "оплачено"].includes(s)) {
    return "paid";
  }
  if (["debt", "долг", "в долг"].includes(s)) {
    return "debt";
  }
  if (
    [
      "partially_returned",
      "partial_return",
      "partially returned",
      "partly_returned",
      "частично возвращён",
      "частично возвращен",
      "частичный возврат",
      "частично возвращена",
    ].includes(s)
  ) {
    return "partially_returned";
  }
  if (
    ["canceled", "cancelled", "отменен", "отменён", "отменена", "возвращенный"].includes(
      s,
    )
  ) {
    return "canceled";
  }
  if (["new", "новый", "новая", "open"].includes(s)) {
    return "new";
  }
  return s;
};

export const isReturnableSaleStatus = (status: any) => {
  const normalized = normalizeSaleStatus(status);
  // partially_returned — часть позиций уже возвращена, остаток вернуть можно.
  return (
    normalized === "paid" ||
    normalized === "debt" ||
    normalized === "partially_returned"
  );
};

export type SaleReturnItem = {
  sale_item_id: string | number;
  quantity: number;
};

/**
 * Стабильная подпись операции возврата: одинаковый выбор позиций → одинаковая
 * строка. Нужна, чтобы повтор того же клика (ретрай после сетевой ошибки)
 * переиспользовал `idempotency_key`, а не создавал второе компенсирующее
 * движение в кассе. Иной набор позиций / полный возврат → иная подпись.
 *
 * @see docs/backend/kassa/sale-return-cashflow-backend.md
 */
export const buildSaleReturnSignature = (
  saleId: string | number,
  items?: SaleReturnItem[] | null,
): string => {
  if (!Array.isArray(items) || items.length === 0) return `${saleId}:full`;
  const normalized = items
    .map((it) => `${it.sale_item_id}:${it.quantity}`)
    .sort()
    .join("|");
  return `${saleId}:partial:${normalized}`;
};

const randomUuid = (): string => {
  const c: any = (globalThis as any)?.crypto;
  if (c?.randomUUID) return c.randomUUID();
  // Фолбэк для окружений без Web Crypto (старые вебвью, unit-тесты).
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export type BuildSaleReturnPayloadArgs = {
  items?: SaleReturnItem[] | null;
  is_defect?: boolean;
  /** Агентские продажи: свой endpoint и своя маршрутизация кассы на бэке. */
  isAgent?: boolean;
  /** Переиспользуемый ключ операции (см. buildSaleReturnSignature). */
  idempotencyKey?: string | null;
  /**
   * Поля маршрутизации POS-кассы (`branch_id`, `cashbox_role`, `shift_id`)
   * из buildPosRoutingFromUser. Для агентов не добавляются.
   */
  routing?: Record<string, string> | null;
};

/**
 * Тело запроса `POST /main/pos/sales/{id}/return/`.
 *
 * Бэк по этим полям создаёт компенсирующее движение по кассе (обратный
 * `expense` к исходному `pos_sale` income) в той же атомарной транзакции,
 * что и откат остатков/долга. `idempotency_key` защищает от дублей при
 * ретраях и двойных кликах.
 *
 * @see docs/backend/kassa/sale-return-cashflow-backend.md
 */
export const buildSaleReturnPayload = ({
  items,
  is_defect,
  isAgent,
  idempotencyKey,
  routing,
}: BuildSaleReturnPayloadArgs): Record<string, any> => {
  const payload: Record<string, any> = {
    idempotency_key: idempotencyKey || randomUuid(),
  };
  if (!isAgent && routing) {
    for (const [key, value] of Object.entries(routing)) {
      if (value != null && String(value).trim()) payload[key] = value;
    }
  }
  if (Array.isArray(items) && items.length > 0) {
    payload.items = items;
  }
  if (is_defect === true) {
    payload.is_defect = true;
  }
  return payload;
};

export const isProfileOwnerOrAdmin = (profile: any) => {
  const role = String(profile?.role ?? "")
    .trim()
    .toLowerCase();
  const roleDisplay = String(profile?.role_display ?? "")
    .trim()
    .toLowerCase();
  return (
    role === "owner" ||
    role === "admin" ||
    roleDisplay === "владелец" ||
    roleDisplay === "администратор"
  );
};

/** Право на возврат продаж сотрудником маркета (или владелец/админ). */
export const hasMarketReturnPermission = (profile: any) => {
  if (isProfileOwnerOrAdmin(profile)) return true;
  const flag = profile?.can_view_market_employee_return;
  return flag === true || flag === 1 || flag === "1" || flag === "true";
};

export const isMarketSectorName = (sectorName: any) => {
  const s = String(sectorName ?? "")
    .trim()
    .toLowerCase();
  return (
    s === "магазин" ||
    s === "цветочный магазин" ||
    s.includes("магазин")
  );
};
