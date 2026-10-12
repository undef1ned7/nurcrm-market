/**
 * Тариф «Старт» — ограниченный набор функций (см. useMenuItems, hideRules).
 */
export function isStartPlan(tariffName: any) {
  const t = String(tariffName || "")
    .trim()
    .toLowerCase();
  return t === "старт" || t === "start";
}

export function isMarketSectorName(sectorName: any) {
  const sector = String(sectorName || "")
    .trim()
    .toLowerCase();
  return (
    sector === "магазин" ||
    sector === "цветочный магазин" ||
    sector.includes("магазин")
  );
}

export const MARKET_START_EMPLOYEE_LIMIT = 3;

export const MARKET_START_EMPLOYEE_LIMIT_MESSAGE =
  "На тарифе Старт для Маркета можно иметь максимум 3 сотрудников, включая владельца.";

/** Лимит сотрудников на тарифе «Старт» в Магазине (включая владельца). */
export function canAddEmployeeOnMarketStart({
  tariffName,
  sectorName,
  employees = [],
}: any = {}) {
  if (!isStartPlan(tariffName) || !isMarketSectorName(sectorName)) {
    return true;
  }
  const list = Array.isArray(employees) ? employees : [];
  const hasOwnerInList = list.some((employee: any) => employee?.role === "owner");
  const totalEmployeesWithOwner = list.length + (hasOwnerInList ? 0 : 1);
  return totalEmployeesWithOwner < MARKET_START_EMPLOYEE_LIMIT;
}

/** Онлайн-витрина на «Старт» в Магазине — только после заявки (can_view_showcase). */
export function isMarketStartShowcaseRequestOnly(tariffName: any, sectorName: any) {
  return isStartPlan(tariffName) && isMarketSectorName(sectorName);
}

/**
 * Тариф «Старт» в Магазине — общий флаг для функций, урезанных на этом тарифе:
 * массовое сканирование склада, настройка формы товара, касса с ролью «Для долгов».
 */
export function isMarketStartRestricted(tariffName: any, sectorName: any) {
  return isStartPlan(tariffName) && isMarketSectorName(sectorName);
}

export function canAccessOnlineShowcase({
  tariffName,
  sectorName,
  isOwner = false,
  canViewShowcase = false,
}: any = {}) {
  if (isMarketStartShowcaseRequestOnly(tariffName, sectorName)) {
    return Boolean(canViewShowcase);
  }
  return Boolean(isOwner || canViewShowcase);
}
