/**
 * Единое чтение «текущего филиала» из профиля пользователя.
 *
 * Бэк описывает привязку так: `primary_branch` (основной филиал) и
 * `allowed_branch_ids` (все доступные). Старые поля `active_branch`, `branch`,
 * `branch_id`, `branch_ids` оставлены как запасные имена — фронт исторически
 * читал их в разных местах по-разному.
 *
 * Изоляцию данных обеспечивает бэк (фильтр по филиалу для не-owner/admin);
 * здесь только определяем, к какому филиалу привязан аккаунт.
 */

type BranchLike = { id?: unknown } | string | number | null | undefined;
type ProfileLike = Record<string, any> | null | undefined;

const toId = (value: BranchLike): string | undefined => {
  if (value == null || value === "") return undefined;
  if (typeof value === "object") return toId((value as any).id);
  const id = String(value).trim();
  return id || undefined;
};

/** Все филиалы, к которым у пользователя есть доступ. */
export function getProfileBranchIds(profile: ProfileLike): string[] {
  const raw = [profile?.allowed_branch_ids, profile?.branch_ids].find((v) =>
    Array.isArray(v),
  ) as BranchLike[] | undefined;
  const ids = (raw ?? []).map(toId).filter((id): id is string => Boolean(id));
  return Array.from(new Set(ids));
}

/**
 * Основной филиал пользователя. Если основной не задан, но доступен ровно один
 * филиал — он и есть рабочий (так же выбирает бэк, `_fixed_branch_from_user`).
 */
export function getProfileBranchId(
  profile: ProfileLike,
  company?: { active_branch?: unknown } | null,
): string | undefined {
  const explicit =
    toId(profile?.primary_branch_id) ??
    toId(profile?.primary_branch) ??
    toId(profile?.active_branch) ??
    toId(profile?.branch) ??
    toId(profile?.branch_id) ??
    toId(company?.active_branch as BranchLike);
  if (explicit) return explicit;
  const ids = getProfileBranchIds(profile);
  return ids.length === 1 ? ids[0] : undefined;
}

export function isOwnerLikeProfile(profile: ProfileLike): boolean {
  const role = String(profile?.role ?? "")
    .trim()
    .toLowerCase();
  return role === "owner" || role === "admin";
}

/**
 * Аккаунт закреплён за филиалом: есть доступные филиалы и это не владелец.
 * Администратор филиала тоже сюда входит — бэк считает admin «owner-like» и
 * сам не фильтрует его данные, поэтому филиал ему нужно передавать явно.
 */
export function isBranchBoundProfile(profile: ProfileLike): boolean {
  const role = String(profile?.role ?? "")
    .trim()
    .toLowerCase();
  if (role === "owner") return false;
  return (
    getProfileBranchIds(profile).length > 0 ||
    Boolean(getProfileBranchId(profile))
  );
}

/**
 * Филиал, который подставляется в запросы списков (`?branch=`). Хранится в
 * памяти модуля: axios-интерсептор живёт вне React и не видит redux.
 */
let scopedBranchId: string | undefined;

export function syncBranchScopeFromProfile(profile: ProfileLike): void {
  scopedBranchId = isBranchBoundProfile(profile)
    ? getProfileBranchId(profile)
    : undefined;
}

export function clearBranchScope(): void {
  scopedBranchId = undefined;
}

/**
 * Временный филиал для встроенных страниц карточки филиала (владелец смотрит
 * филиал целиком). Приоритетнее филиала аккаунта. Держатели различаются по
 * ключу: при переключении вкладок новая страница захватывает филиал в render,
 * а очистка старой выполняется позже и не должна его затирать.
 */
const scopeHolders = new Map<string, { id: string; token: number }>();
let scopeToken = 0;

/** Захватить филиал. Повторный вызов с тем же ключом обновляет токен. */
export function holdBranchScope(key: string, id: string): number {
  const token = ++scopeToken;
  scopeHolders.delete(key);
  scopeHolders.set(key, { id, token });
  return token;
}

/**
 * Освободить филиал. Отложено: если за это время ключ захвачен заново
 * (StrictMode, перемонтирование), запись остаётся.
 */
export function releaseBranchScope(key: string, token: number): void {
  setTimeout(() => {
    if (scopeHolders.get(key)?.token === token) scopeHolders.delete(key);
  }, 0);
}

export function clearBranchScopeHolders(): void {
  scopeHolders.clear();
}

export function getBranchScope(): string | undefined {
  let last: string | undefined;
  for (const holder of scopeHolders.values()) last = holder.id;
  return last ?? scopedBranchId;
}

const BRANCH_SCOPE_SKIP = [
  "/users/profile",
  "/users/branches",
  "/users/login",
  "/users/token",
  "/auth",
];

/** Добавляет `branch` в GET-запрос, если филиал закреплён и не задан вручную. */
export function applyBranchScope<
  T extends { method?: string; url?: string; params?: any },
>(config: T): T {
  const branch = getBranchScope();
  if (!branch) return config;
  if (String(config.method ?? "get").toLowerCase() !== "get") return config;
  const url = String(config.url ?? "");
  if (BRANCH_SCOPE_SKIP.some((part) => url.includes(part))) return config;
  if (/[?&]branch=/.test(url)) return config;
  if (config.params && typeof config.params === "object") {
    if (typeof URLSearchParams !== "undefined" && config.params instanceof URLSearchParams) {
      return config;
    }
    if ("branch" in config.params) return config;
  }
  config.params = { ...(config.params ?? {}), branch };
  return config;
}
