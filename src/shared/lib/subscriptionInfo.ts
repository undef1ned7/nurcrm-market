/**
 * Витрина «Подписка и аккаунт» — нормализует данные компании для карточки в Настройках.
 *
 * Терпима к текущему ответу `GET /users/company/` (только `end_date` + `subscription_plan.name`)
 * и к расширенному контракту из docs/backend/subscription-account-panel-backend.md
 * (`created_at`, вложенный `subscription`, `limits`).
 *
 * `daysLeft`/`status` берём с сервера, если пришли; иначе считаем на клиенте
 * по календарным дням в таймзоне компании (Бишкек, UTC+6), `end_date` включительно.
 */

import { isStartPlan } from "./subscriptionPlan";

const COMPANY_TZ = "Asia/Bishkek";
const EXPIRING_SOON_DAYS = 7;

export type SubscriptionStatus =
  | "active"
  | "expiring_soon"
  | "expired"
  | "trial"
  | "grace"
  | "unknown";

export interface SubscriptionLimit {
  key: string;
  used: number | null;
  max: number | null;
}

export interface SubscriptionLastPayment {
  amount: string | null;
  currency: string | null;
  paidAt: Date | null;
  method: string | null;
  periodStart: Date | null;
  periodEnd: Date | null;
}

export interface SubscriptionView {
  /** «Аккаунт открыт в …» */
  accountCreatedAt: Date | null;
  /** Человекочитаемое имя тарифа: «Старт» / «Стандарт» / "" */
  planName: string;
  /** Стабильный код тарифа, если бэк отдал: "start" | "standard" | "" */
  planCode: string;
  isStart: boolean;
  /** Оплачено по (включительно) */
  endDate: Date | null;
  /** Начало текущего оплаченного периода */
  startedAt: Date | null;
  /** Осталось дней (сервер → fallback расчёт). null — если срок не задан */
  daysLeft: number | null;
  status: SubscriptionStatus;
  isTrial: boolean;
  autoRenew: boolean | null;
  nextPaymentAt: Date | null;
  price: string | null;
  currency: string | null;
  period: "month" | "year" | null;
  lastPayment: SubscriptionLastPayment | null;
  limits: SubscriptionLimit[];
  /** Пришёл ли расширенный объект `subscription` с бэка */
  hasBackendDetail: boolean;
}

const toDate = (value: unknown): Date | null => {
  if (!value) return null;
  const d = new Date(value as string);
  return Number.isNaN(d.getTime()) ? null : d;
};

const ymdInTz = (date: Date): [number, number, number] => {
  const str = new Intl.DateTimeFormat("en-CA", {
    timeZone: COMPANY_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  const [y, m, d] = str.split("-").map(Number);
  return [y, m, d];
};

/** Разница в календарных днях (b - a) в таймзоне компании. */
const calendarDaysBetween = (a: Date, b: Date): number => {
  const [ay, am, ad] = ymdInTz(a);
  const [by, bm, bd] = ymdInTz(b);
  return Math.round(
    (Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000,
  );
};

/** Осталось дней до `endDate` включительно (сегодня в TZ компании). */
export const computeDaysLeft = (endDate: Date | null): number | null => {
  if (!endDate) return null;
  return calendarDaysBetween(new Date(), endDate);
};

const KNOWN_STATUSES: SubscriptionStatus[] = [
  "active",
  "expiring_soon",
  "expired",
  "trial",
  "grace",
  "unknown",
];

const deriveStatus = (
  serverStatus: unknown,
  daysLeft: number | null,
  isTrial: boolean,
): SubscriptionStatus => {
  const raw = String(serverStatus || "").trim().toLowerCase();
  if ((KNOWN_STATUSES as string[]).includes(raw)) {
    return raw as SubscriptionStatus;
  }
  if (isTrial) return "trial";
  if (daysLeft == null) return "unknown";
  if (daysLeft < 0) return "expired";
  if (daysLeft <= EXPIRING_SOON_DAYS) return "expiring_soon";
  return "active";
};

const normalizePeriod = (value: unknown): "month" | "year" | null => {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "month" || raw === "monthly" || raw === "месяц") return "month";
  if (raw === "year" || raw === "yearly" || raw === "год") return "year";
  return null;
};

const buildLimits = (limitsObj: any): SubscriptionLimit[] => {
  if (!limitsObj || typeof limitsObj !== "object") return [];
  return Object.entries(limitsObj)
    .map(([key, value]: [string, any]) => {
      const used = Number.isFinite(Number(value?.used)) ? Number(value.used) : null;
      const max =
        value?.max === null || value?.max === undefined
          ? null
          : Number.isFinite(Number(value.max))
            ? Number(value.max)
            : null;
      return { key, used, max };
    })
    .filter((l) => l.used != null || l.max != null);
};

const buildLastPayment = (raw: any): SubscriptionLastPayment | null => {
  if (!raw || typeof raw !== "object") return null;
  return {
    amount: raw.amount != null ? String(raw.amount) : null,
    currency: raw.currency ? String(raw.currency) : null,
    paidAt: toDate(raw.paid_at ?? raw.paidAt),
    method: raw.method ? String(raw.method) : null,
    periodStart: toDate(raw.period_start ?? raw.periodStart),
    periodEnd: toDate(raw.period_end ?? raw.periodEnd),
  };
};

/**
 * @param company — объект из state.user.company
 */
export const buildSubscriptionView = (company: any): SubscriptionView => {
  const sub = company?.subscription ?? null;
  const hasBackendDetail = Boolean(sub && typeof sub === "object");

  // План: вложенный subscription.plan → плоский subscription_plan
  const plan = sub?.plan ?? company?.subscription_plan ?? null;
  const planName = String(plan?.name ?? company?.tariff ?? "").trim();
  const planCode = String(plan?.code ?? "").trim().toLowerCase();

  const endDate =
    toDate(sub?.end_date) ??
    toDate(company?.end_date) ??
    toDate(company?.subscription_end_date);

  const startedAt = toDate(sub?.started_at ?? sub?.startedAt);
  const isTrial = Boolean(sub?.is_trial ?? sub?.isTrial);

  const serverDaysLeft = Number(sub?.days_left ?? sub?.daysLeft);
  const daysLeft = Number.isFinite(serverDaysLeft)
    ? serverDaysLeft
    : computeDaysLeft(endDate);

  const status = deriveStatus(sub?.status, daysLeft, isTrial);

  const isStart =
    planCode === "start" || (planCode === "" && isStartPlan(planName));

  return {
    accountCreatedAt: toDate(company?.created_at ?? company?.createdAt),
    planName,
    planCode,
    isStart,
    endDate,
    startedAt,
    daysLeft,
    status,
    isTrial,
    autoRenew:
      sub?.auto_renew === true || sub?.auto_renew === false
        ? sub.auto_renew
        : null,
    nextPaymentAt: toDate(sub?.next_payment_at ?? sub?.nextPaymentAt),
    price: plan?.price != null ? String(plan.price) : null,
    currency: plan?.currency ? String(plan.currency) : null,
    period: normalizePeriod(plan?.period),
    lastPayment: buildLastPayment(sub?.last_payment ?? sub?.lastPayment),
    limits: buildLimits(sub?.limits ?? company?.limits),
    hasBackendDetail,
  };
};
