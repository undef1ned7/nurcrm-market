/**
 * Управление кассами из UI `/crm/kassa`: удаление (с наследованием отчёта) и
 * роль «Для долгов».
 *
 * Касса, от которой зависят авто-операции (закупки, приход/возврат поставщику,
 * брак, долг поставщику → `expense_variable`; POS → `pos_main` / `pos_branch`;
 * долги → `debt`), удаляется «мягко»: BE переводит её в `is_active=false`,
 * движения не трогает — история отчётов кассы и аналитики «Финансы»
 * сохраняется. Пустая касса без движений и смен удаляется физически.
 * При указании `merge_into` — движения переносятся в кассу-наследника.
 *
 * @see docs/backend/kassa/cashbox-delete-backend.md
 * @see docs/backend/kassa/cashbox-debt-role-backend.md
 */

/**
 * Фичефлаг. Пока BE-эндпоинта `DELETE /construction/cashboxes/{id}/` нет —
 * по умолчанию выкл, кнопка «Удалить» в списке касс не показывается.
 */
export function isCashboxDeleteEnabled(): boolean {
  return import.meta.env.VITE_CASHBOX_DELETE === "true";
}

/**
 * Фичефлаг. Пока BE не принимает явный `role` в `POST`/`PATCH`
 * `/construction/cashboxes/` — по умолчанию выкл: нет чекбокса «Для долгов»
 * при создании и нет действия «Назначить кассой для долгов» в списке.
 */
export function isCashboxDebtRoleEnabled(): boolean {
  return import.meta.env.VITE_CASHBOX_DEBT_ROLE === "true";
}

const norm = (v: unknown) =>
  String(v ?? "")
    .trim()
    .toLowerCase();

const roleOf = (cashbox: unknown): string => {
  if (!cashbox || typeof cashbox !== "object") return "";
  const c = cashbox as Record<string, unknown>;
  return norm(c.role ?? c.inferred_role ?? c.cashbox_role);
};

const idOf = (cashbox: unknown): string | null => {
  if (!cashbox || typeof cashbox !== "object") return null;
  const id = (cashbox as Record<string, unknown>).id;
  return id == null ? null : String(id);
};

const isActive = (cashbox: unknown): boolean =>
  (cashbox as Record<string, unknown> | null)?.is_active !== false;

/** Известные роли касс (см. auto-cashflows-backend.md §«Модель данных»). */
export const CASHBOX_ROLE = {
  POS_MAIN: "pos_main",
  POS_BRANCH: "pos_branch",
  EXPENSE_VARIABLE: "expense_variable",
  EXPENSE_FIXED: "expense_fixed",
  DEBT: "debt",
} as const;

/** Русские подписи ролей — для бейджа в списке касс. */
const ROLE_LABELS: Record<string, string> = {
  pos_main: "Основная касса",
  pos_branch: "Касса филиала",
  expense_variable: "Переменные расходы",
  expense_fixed: "Постоянные расходы",
  debt: "Для долгов",
};

/** Человекочитаемая подпись роли кассы (`null` — роль неизвестна/не задана). */
export function cashboxRoleLabel(cashbox: unknown): string | null {
  const role = roleOf(cashbox);
  return ROLE_LABELS[role] ?? null;
}

/** Роли касс «прочих расходов» (см. cashboxResolution.ts / BE `resolve_cashbox`). */
const EXPENSE_ROLES = new Set(["expense_variable", "expense_fixed"]);

/**
 * Касса прочих расходов: `is_consumption=true` (legacy-флаг из модалки создания),
 * либо роль `expense_variable` / `expense_fixed`, либо название намекает на расходы.
 * POS-кассы (`pos_main` / `pos_branch`) сюда НЕ попадают — их удалять нельзя.
 */
export function isConsumptionCashbox(cashbox: unknown): boolean {
  if (!cashbox || typeof cashbox !== "object") return false;
  const c = cashbox as Record<string, unknown>;

  const role = roleOf(c);
  if (role === "pos_main" || role === "pos_branch") return false;
  if (EXPENSE_ROLES.has(role)) return true;

  if (c.is_consumption === true) return true;

  const name = norm(c.department_name ?? c.name);
  return (
    name.includes("расход") ||
    name.includes("прочих") ||
    name.includes("прочие")
  );
}

/**
 * Касса с ролью `pos_main`. Роль на BE присваивается по ключевым словам в
 * названии при создании/миграции (`филиал`→pos_branch, `основн`→pos_main,
 * `переменн`→expense_variable, `постоянн`→expense_fixed) — **всё, что не
 * подошло, по умолчанию получает `pos_main`**, независимо от `is_consumption`.
 * На проде уже встречались компании с 4 активными `pos_main` одновременно
 * («Основная касса компании», «Расход», «Касса 2», «карыз»).
 * @see docs/backend/kassa/pos-main-duplicate-role-bug.md
 */
export function isPosMainCashbox(cashbox: unknown): boolean {
  return roleOf(cashbox) === "pos_main";
}

/** `true`, если среди активных касс уже есть хотя бы одна `pos_main`. */
export function hasActivePosMainCashbox(cashboxes: unknown): boolean {
  if (!Array.isArray(cashboxes)) return false;
  return cashboxes.some((c: any) => isActive(c) && isPosMainCashbox(c));
}

/** Касса с ролью `debt` — «Для долгов» (см. cashbox-debt-role-backend.md). */
export function isDebtCashbox(cashbox: unknown): boolean {
  if (!cashbox || typeof cashbox !== "object") return false;
  const c = cashbox as Record<string, unknown>;
  if (roleOf(c) === "debt") return true;
  if (c.is_debt === true) return true;
  const name = norm(c.department_name ?? c.name);
  return name.includes("долг") || name.includes("карыз");
}

/** `true`, если среди активных касс уже есть хотя бы одна `debt`. */
export function hasActiveDebtCashbox(cashboxes: unknown): boolean {
  if (!Array.isArray(cashboxes)) return false;
  return cashboxes.some((c: any) => isActive(c) && isDebtCashbox(c));
}

export type CreateCashboxKind = "plain" | "expense" | "debt";

/**
 * Тело `POST /construction/cashboxes/`.
 * `kind: "debt"` шлёт явный `role: "debt"` — новая возможность, которую BE
 * ещё должен принять (см. cashbox-debt-role-backend.md). Пока флаг выключен,
 * UI кассы для долгов не показывает.
 */
export function buildCreateCashboxPayload(
  name: string,
  kind: CreateCashboxKind,
): Record<string, unknown> {
  if (kind === "debt") {
    return { name, is_consumption: false, role: CASHBOX_ROLE.DEBT };
  }
  return { name, is_consumption: kind === "expense" };
}

/**
 * Кассы — кандидаты «наследника» отчёта при удалении `sources`: активные,
 * не входящие в `sources`, из того же списка (та же компания подразумевается
 * ответом `GET /construction/cashboxes/`).
 */
export function selectMergeCandidates(
  sources: unknown[],
  allCashboxes: unknown[],
): unknown[] {
  if (!Array.isArray(allCashboxes)) return [];
  const sourceIds = new Set(
    (Array.isArray(sources) ? sources : [])
      .map(idOf)
      .filter((id): id is string => id != null),
  );
  return allCashboxes.filter((c) => {
    const id = idOf(c);
    return id != null && isActive(c) && !sourceIds.has(id);
  });
}

/**
 * Предупреждение, если роль наследника отличается от роли всех источников
 * (например, переносят историю POS-кассы в кассу расходов) — не блокирует,
 * только предупреждает; окончательная проверка — на BE.
 */
export function mergeRoleMismatchWarning(
  sources: unknown[],
  target: unknown,
  translate: (key: string, fallback: string) => string,
): string | null {
  if (!target) return null;
  const targetRole = roleOf(target);
  const list = Array.isArray(sources) ? sources : [];
  const mismatched = list.some((s) => roleOf(s) && roleOf(s) !== targetRole);
  if (!mismatched) return null;
  return translate(
    "crm.kassa.delete.merge.roleMismatchWarning",
    "Роли исходной кассы и наследника различаются — движения перенесутся, но убедитесь, что это осознанный выбор.",
  );
}

export type CashboxDeleteErrorCode =
  | "cashbox_has_open_shift"
  | "cashbox_role_required"
  | "cashbox_has_pending"
  | "cashbox_not_found"
  | "merge_target_invalid"
  | "not_available"
  | "unknown";

/** Достаёт стабильный код ошибки удаления из тела ответа BE. */
export function cashboxDeleteErrorCode(error: unknown): CashboxDeleteErrorCode {
  const err = error as {
    response?: { status?: number; data?: { code?: string; detail?: string } };
    status?: number;
    data?: { code?: string };
  };
  const status = err?.response?.status ?? err?.status;
  const code = err?.response?.data?.code ?? err?.data?.code;

  if (status === 404) return "cashbox_not_found";
  if (status === 405 || status === 501) return "not_available";

  switch (code) {
    case "cashbox_has_open_shift":
    case "cashbox_role_required":
    case "cashbox_has_pending":
    case "merge_target_invalid":
      return code;
    default:
      return "unknown";
  }
}

/**
 * Понятный текст для модалки. `translate` — функция i18n `t`; ключи под
 * `crm.kassa.delete.errors.*` (см. locales). Если ключа нет — вернёт fallback.
 */
export function cashboxDeleteErrorMessage(
  error: unknown,
  translate: (key: string, fallback: string) => string,
): string {
  const code = cashboxDeleteErrorCode(error);
  const map: Record<CashboxDeleteErrorCode, [string, string]> = {
    cashbox_has_open_shift: [
      "crm.kassa.delete.errors.openShift",
      "По кассе есть открытая смена. Закройте смену перед удалением.",
    ],
    cashbox_role_required: [
      "crm.kassa.delete.errors.roleRequired",
      "Это последняя касса для расходов — на неё идут закупки и расчёты с поставщиками. Создайте другую кассу расходов, затем удалите эту.",
    ],
    cashbox_has_pending: [
      "crm.kassa.delete.errors.hasPending",
      "По кассе есть неодобренные операции или заявки. Разберите их перед удалением.",
    ],
    cashbox_not_found: [
      "crm.kassa.delete.errors.notFound",
      "Касса не найдена — возможно, уже удалена.",
    ],
    merge_target_invalid: [
      "crm.kassa.delete.errors.mergeTargetInvalid",
      "Не удалось перенести отчёт в выбранную кассу. Попробуйте выбрать другую или отключите наследование.",
    ],
    not_available: [
      "crm.kassa.delete.errors.notAvailable",
      "Удаление кассы пока недоступно на сервере.",
    ],
    unknown: [
      "crm.kassa.delete.errors.unknown",
      "Не удалось удалить кассу. Попробуйте ещё раз.",
    ],
  };
  if (code === "unknown") {
    // Код не входит в известный список (либо бэк добавил новый, либо это
    // произвольная 400-ошибка) — лучше показать реальный текст из ответа
    // сервера, чем скрывать его за общей формулировкой "попробуйте ещё раз".
    const err = error as {
      response?: { data?: { detail?: unknown } };
      detail?: unknown;
    };
    const rawDetail = err?.response?.data?.detail ?? err?.detail;
    if (typeof rawDetail === "string" && rawDetail.trim()) {
      return rawDetail.trim();
    }
  }

  const [key, fallback] = map[code];
  return translate(key, fallback);
}
