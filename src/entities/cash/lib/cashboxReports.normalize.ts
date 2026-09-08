import type {
  ApiCashboxReportAnalyticsGroup,
  ApiCashboxReportAnalyticsResponse,
  ApiCashboxReportDay,
  ApiCashboxReportFlow,
  ApiCashboxReportResponse,
  ApiCashboxReportSummary,
  CashboxReportAnalyticsGroup,
  CashboxReportAnalyticsViewModel,
  CashboxReportDayGroup,
  CashboxReportFlow,
  CashboxReportViewModel,
} from "./cashboxReports.types";

const RU_MONTHS = [
  "Янв",
  "Фев",
  "Мар",
  "Апр",
  "Май",
  "Июн",
  "Июл",
  "Авг",
  "Сен",
  "Окт",
  "Ноя",
  "Дек",
];

export const toReportNumber = (value: unknown): number => {
  if (value == null || value === "") return 0;
  const normalized = Number(String(value).replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(normalized) ? normalized : 0;
};

export const ymLabel = (ym: string): string => {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return ym;
  return `${RU_MONTHS[(m || 1) - 1]} ${y}`;
};

const normalizeFlowType = (
  rawType: unknown,
  amount: number,
): CashboxReportFlow["type"] => {
  const type = String(rawType ?? "").toLowerCase();
  if (type === "income" || type === "expense") return type;
  return amount < 0 ? "expense" : "income";
};

export const normalizeReportFlow = (
  flow: ApiCashboxReportFlow,
  index = 0,
): CashboxReportFlow => {
  const rawAmount = toReportNumber(flow.amount);
  const type = normalizeFlowType(flow.type, rawAmount);
  const name =
    flow.name ||
    flow.title ||
    flow.description ||
    flow.note ||
    (type === "income" ? "Приход" : "Расход");

  return {
    id: String(flow.id ?? flow.uuid ?? index),
    type,
    amount: Math.abs(rawAmount),
    name,
    title: name,
    created_at:
      flow.created_at ||
      flow.created ||
      flow.date ||
      flow.timestamp ||
      null,
    status: flow.status != null ? String(flow.status) : undefined,
  };
};

const readSummary = (
  summary: ApiCashboxReportSummary | undefined,
  fallback?: {
    total_income?: unknown;
    total_expense?: unknown;
    net?: unknown;
    operations_count?: unknown;
  },
) => {
  const totalIncome = toReportNumber(
    summary?.total_income ?? fallback?.total_income,
  );
  const totalExpense = toReportNumber(
    summary?.total_expense ?? fallback?.total_expense,
  );
  const net = toReportNumber(
    summary?.net ?? fallback?.net ?? totalIncome - totalExpense,
  );
  const operationsCount = Number(
    summary?.operations_count ?? fallback?.operations_count ?? 0,
  );

  return {
    totalIncome,
    totalExpense,
    net,
    operationsCount: Number.isFinite(operationsCount) ? operationsCount : 0,
  };
};

const normalizeDayGroup = (day: ApiCashboxReportDay): CashboxReportDayGroup => {
  const summary = readSummary(day.summary, {
    total_income: day.income,
    total_expense: day.expense,
    net: day.net,
    operations_count: day.operations_count,
  });
  const flows = (day.flows || []).map(normalizeReportFlow);

  return {
    income: summary.totalIncome,
    expense: summary.totalExpense,
    flows,
  };
};

export const normalizeCashboxReportResponse = (
  data: ApiCashboxReportResponse,
  opts: { period: "day" | "month"; month?: string; date?: string },
  source: CashboxReportViewModel["source"] = "backend",
): CashboxReportViewModel => {
  const summary = readSummary(data.summary, {
    total_income: data.total_income,
    total_expense: data.total_expense,
    net: data.net,
    operations_count: data.operations_count,
  });

  if (opts.period === "day") {
    const flows = (data.flows || []).map(normalizeReportFlow);
    return {
      type: "daily",
      date: data.date || opts.date,
      totalIncome: summary.totalIncome,
      totalExpense: summary.totalExpense,
      net: summary.net,
      operationsCount: summary.operationsCount || flows.length,
      flows,
      truncated: Boolean(data.truncated),
      source,
    };
  }

  const dailyGroups: Record<string, CashboxReportDayGroup> = {};

  if (Array.isArray(data.days)) {
    for (const day of data.days) {
      if (!day?.date) continue;
      dailyGroups[day.date] = normalizeDayGroup(day);
    }
  } else if (data.daily_groups && typeof data.daily_groups === "object") {
    for (const [date, group] of Object.entries(data.daily_groups)) {
      dailyGroups[date] = normalizeDayGroup({
        ...(group || {}),
        date,
      });
    }
  }

  return {
    type: "monthly",
    month: data.month || opts.month,
    totalIncome: summary.totalIncome,
    totalExpense: summary.totalExpense,
    net: summary.net,
    operationsCount: summary.operationsCount,
    dailyGroups,
    truncated: Boolean(data.truncated),
    source,
  };
};

const normalizeAnalyticsGroup = (
  group: ApiCashboxReportAnalyticsGroup,
): CashboxReportAnalyticsGroup | null => {
  const ym = String(group.period || group.ym || "").trim();
  if (!ym) return null;

  const income = toReportNumber(group.income ?? group.total_income);
  const expense = toReportNumber(group.expense ?? group.total_expense);
  const net = toReportNumber(group.net ?? income - expense);
  const ops = Number(group.operations_count ?? group.ops ?? 0);

  return {
    ym,
    label: group.label || ymLabel(ym),
    income,
    expense,
    net,
    ops: Number.isFinite(ops) ? ops : 0,
  };
};

export const normalizeCashboxAnalyticsResponse = (
  data: ApiCashboxReportAnalyticsResponse,
  source: CashboxReportAnalyticsViewModel["source"] = "backend",
): CashboxReportAnalyticsViewModel => {
  const summary = readSummary(data.summary);
  const groups = (data.groups || [])
    .map(normalizeAnalyticsGroup)
    .filter(Boolean) as CashboxReportAnalyticsGroup[];

  groups.sort((a, b) => (a.ym < b.ym ? -1 : 1));

  return {
    summary: {
      income: summary.totalIncome,
      expense: summary.totalExpense,
      net: summary.net,
      ops: summary.operationsCount,
    },
    groups,
    truncated: Boolean(data.truncated),
    source,
  };
};

export const buildAnalyticsGroupsFromFlows = (
  flows: CashboxReportFlow[],
): CashboxReportAnalyticsGroup[] => {
  const map = new Map<string, CashboxReportAnalyticsGroup>();

  for (const flow of flows) {
    if (!flow.created_at) continue;
    const dt = new Date(flow.created_at);
    if (Number.isNaN(dt.getTime())) continue;
    const ym = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
    const current =
      map.get(ym) ||
      ({
        ym,
        label: ymLabel(ym),
        income: 0,
        expense: 0,
        net: 0,
        ops: 0,
      } satisfies CashboxReportAnalyticsGroup);

    if (flow.type === "income") current.income += flow.amount;
    else current.expense += flow.amount;
    current.ops += 1;
    current.net = current.income - current.expense;
    map.set(ym, current);
  }

  return Array.from(map.values()).sort((a, b) => (a.ym < b.ym ? -1 : 1));
};
