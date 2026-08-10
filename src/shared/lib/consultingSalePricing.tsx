const num = (v: any) => {
  const n = typeof v === "string" ? Number(String(v).replace(",", ".")) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Цены по ролям (role_prices) — переопределения базовой цены услуги/тарифа для
 * конкретных кастомных ролей. Формат элемента: { custom_role: <id>, price: <num> }.
 * Если для роли переопределения нет — берётся базовая цена. См. docs/consulting/services-role-pricing.md.
 */
export function resolveRolePrice(entity: any, roleId: any) {
  const base = num(entity?.price);
  if (!roleId) return base;
  const list = Array.isArray(entity?.role_prices) ? entity.role_prices : [];
  const hit = list.find((r: any) => String(r.custom_role) === String(roleId));
  return hit ? num(hit.price) : base;
}

/** Базовая цена услуги с учётом роли (без тарифа). */
export function resolveServicePrice(service: any, roleId: any) {
  return resolveRolePrice(service, roleId);
}

/** Цена тарифа с учётом роли. */
export function resolveTariffPrice(tariff: any, roleId: any) {
  return resolveRolePrice(tariff, roleId);
}

/** Итог продажи (превью до ответа сервера) с учётом роли продавца. */
export function calcConsultingSaleTotal({
  service,
  tariffId,
  roleId,
  items = [],
  discount = 0,
  markup = 0,
}: any) {
  if (!service) return 0;

  const tariffs = Array.isArray(service.tariffs) ? service.tariffs : [];
  const tariff = tariffId
    ? tariffs.find((t: any) => String(t.id) === String(tariffId))
    : null;

  const base = tariff
    ? resolveTariffPrice(tariff, roleId)
    : resolveServicePrice(service, roleId);
  const itemsSum = items.reduce((s: any, it: any) => s + num(it.price), 0);

  return Math.max(0, base + itemsSum - num(discount) + num(markup));
}

/** Нормализация цен по ролям для API: только валидные записи с ролью и ценой ≥ 0. */
export function normalizeRolePricesForApi(rolePrices: any = []) {
  return (Array.isArray(rolePrices) ? rolePrices : [])
    .map((r) => ({
      custom_role: r.custom_role || r.role || null,
      price: num(r.price),
    }))
    .filter((r) => r.custom_role && r.price >= 0);
}

export function normalizeTariffsForApi(tariffs: any = []) {
  return tariffs
    .map((t) => {
      const row: any = {
        name: String(t.name || "").trim(),
        price: num(t.price),
      };
      const subAmount = num(t.subscription_amount);
      if (subAmount > 0) {
        row.subscription_amount = subAmount;
        row.subscription_period =
          t.subscription_period === "year" ? "year" : "month";
      }
      const rolePrices = normalizeRolePricesForApi(t.role_prices);
      if (rolePrices.length) row.role_prices = rolePrices;
      return row;
    })
    .filter((t) => t.name);
}

export function formatTariffSubscription(tariff: any) {
  const amount = num(tariff?.subscription_amount);
  if (!amount) return null;
  const period = tariff?.subscription_period === "year" ? "год" : "мес.";
  return `${amount.toLocaleString()} с / ${period}`;
}

export function calcLeadServiceTotal({
  service,
  tariffId,
  roleId = null,
  includeSubscription = false,
}: any) {
  if (!service) return 0;
  const tariffs = Array.isArray(service.tariffs) ? service.tariffs : [];
  const tariff = tariffId
    ? tariffs.find((t: any) => String(t.id) === String(tariffId))
    : null;
  const base = tariff
    ? resolveTariffPrice(tariff, roleId)
    : resolveServicePrice(service, roleId);
  let total = base;
  if (includeSubscription) {
    const sub = tariff ? num(tariff.subscription_amount) : 0;
    total += sub;
  }
  return Math.max(0, total);
}

export function normalizeSaleItemsForApi(items: any = []) {
  return items
    .map((it) => ({
      name: String(it.name || "").trim(),
      price: num(it.price),
    }))
    .filter((it) => it.name);
}
