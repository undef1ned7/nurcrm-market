/**
 * Строка продажи с размером/цветом: «Платье летнее миди — 44, Красный».
 * Сервер ставит в строку `variant_size` и `variant_color`, когда в чек ушёл
 * `variant_id`. Показываем во всех режимах — где размер есть, там он и виден.
 */

const clean = (value: unknown): string => String(value ?? "").trim();

/** «44, Красный» — или пустая строка, если у строки нет размера и цвета. */
export const saleItemVariantLabel = (item: any): string =>
  [clean(item?.variant_size), clean(item?.variant_color)].filter(Boolean).join(", ");

/** Базовое название строки продажи (сервер присылает его в разных полях). */
export const saleItemBaseName = (item: any, fallback = "—"): string =>
  clean(
    item?.product_name ??
      item?.name_snapshot ??
      item?.name ??
      item?.display_name ??
      item?.object_name,
  ) || fallback;

/**
 * Полное название строки. Если сервер уже дописал размер в название — не дублируем.
 */
export const formatSaleItemName = (item: any, fallback = "—"): string => {
  const name = saleItemBaseName(item, fallback);
  const variant = saleItemVariantLabel(item);
  if (!variant) return name;
  if (name.endsWith(` — ${variant}`)) return name;
  return `${name} — ${variant}`;
};
