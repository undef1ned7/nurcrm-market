import api from "@shared/api";
import {
  buildAnalyticsGroupsFromFlows,
  normalizeCashboxAnalyticsResponse,
  normalizeCashboxReportResponse,
  normalizeReportFlow,
  toReportNumber,
} from "./cashboxReports.normalize";
import type {
  ApiCashboxReportAnalyticsResponse,
  ApiCashboxReportFlow,
  ApiCashboxReportResponse,
  CashboxReportAnalyticsViewModel,
  CashboxReportFlow,
  CashboxReportStatusFilter,
  CashboxReportViewModel,
} from "./cashboxReports.types";

export const CASHBOX_REPORT_URL = (cashboxId: string | number) =>
  `/construction/cashboxes/${cashboxId}/report/`;

export const CASHBOX_REPORT_ANALYTICS_URL =
  "/construction/cashbox-reports/analytics/";

export const REPORT_FALLBACK_PAGE_SIZE = 200;
export const REPORT_FALLBACK_MAX_PAGES = 100;

const isNotImplementedError = (error: unknown) => {
  const status = (error as { response?: { status?: number } })?.response?.status;
  return status === 404 || status === 501;
};

const monthBounds = (month: string) => {
  const [year, monthNum] = month.split("-").map(Number);
  const lastDay = new Date(year, monthNum, 0).getDate();
  return {
    date_from: `${month}-01`,
    date_to: `${month}-${String(lastDay).padStart(2, "0")}`,
  };
};

const fetchAllCashflowsFallback = async (baseParams: Record<string, unknown>) => {
  const allFlows: unknown[] = [];
  let page = 1;
  let guard = 0;
  let truncated = false;

  while (guard < REPORT_FALLBACK_MAX_PAGES) {
    const { data } = await api.get("/construction/cashflows/", {
      params: { ...baseParams, page, page_size: REPORT_FALLBACK_PAGE_SIZE },
    });
    const flows = Array.isArray(data) ? data : data?.results || [];
    allFlows.push(...flows);
    guard += 1;

    const hasNext =
      Boolean(data?.next) ||
      (typeof data?.count === "number" &&
        page * REPORT_FALLBACK_PAGE_SIZE < data.count) ||
      (typeof data?.count !== "number" &&
        flows.length === REPORT_FALLBACK_PAGE_SIZE);

    if (!hasNext) break;
    page += 1;
    if (guard >= REPORT_FALLBACK_MAX_PAGES) truncated = true;
  }

  return {
    flows: allFlows.map((flow, index) =>
      normalizeReportFlow(flow as ApiCashboxReportFlow, index),
    ),
    truncated,
  };
};

const buildMonthlyReportFallback = (
  month: string,
  flows: CashboxReportFlow[],
  truncated: boolean,
): CashboxReportViewModel => {
  const dailyGroups: NonNullable<CashboxReportViewModel["dailyGroups"]> = {};

  for (const flow of flows) {
    if (!flow.created_at) continue;
    const date = new Date(flow.created_at).toISOString().split("T")[0];
    if (!dailyGroups[date]) {
      dailyGroups[date] = { income: 0, expense: 0, flows: [] };
    }
    if (flow.type === "income") dailyGroups[date].income += flow.amount;
    else dailyGroups[date].expense += flow.amount;
    dailyGroups[date].flows.push(flow);
  }

  const totalIncome = flows
    .filter((flow) => flow.type === "income")
    .reduce((sum, flow) => sum + flow.amount, 0);
  const totalExpense = flows
    .filter((flow) => flow.type === "expense")
    .reduce((sum, flow) => sum + flow.amount, 0);

  return {
    type: "monthly",
    month,
    totalIncome,
    totalExpense,
    net: totalIncome - totalExpense,
    operationsCount: flows.length,
    dailyGroups,
    truncated,
    source: "fallback",
  };
};

const buildDailyReportFallback = (
  date: string,
  flows: CashboxReportFlow[],
  truncated: boolean,
): CashboxReportViewModel => {
  const totalIncome = flows
    .filter((flow) => flow.type === "income")
    .reduce((sum, flow) => sum + flow.amount, 0);
  const totalExpense = flows
    .filter((flow) => flow.type === "expense")
    .reduce((sum, flow) => sum + flow.amount, 0);

  return {
    type: "daily",
    date,
    totalIncome,
    totalExpense,
    net: totalIncome - totalExpense,
    operationsCount: flows.length,
    flows,
    truncated,
    source: "fallback",
  };
};

export const fetchCashboxMonthlyReport = async (
  cashboxId: string | number,
  month: string,
  status: CashboxReportStatusFilter = "approved",
): Promise<CashboxReportViewModel> => {
  try {
    const { data } = await api.get<ApiCashboxReportResponse>(
      CASHBOX_REPORT_URL(cashboxId),
      {
        params: {
          period: "month",
          month,
          status,
        },
      },
    );

    return normalizeCashboxReportResponse(
      data,
      { period: "month", month },
      "backend",
    );
  } catch (error) {
    if (!isNotImplementedError(error)) throw error;

    const bounds = monthBounds(month);
    const { flows, truncated } = await fetchAllCashflowsFallback({
      cashbox: cashboxId,
      status,
      date_from: bounds.date_from,
      date_to: bounds.date_to,
    });

    return buildMonthlyReportFallback(month, flows, truncated);
  }
};

export const fetchCashboxDailyReport = async (
  cashboxId: string | number,
  date: string,
  status: CashboxReportStatusFilter = "approved",
): Promise<CashboxReportViewModel> => {
  try {
    const { data } = await api.get<ApiCashboxReportResponse>(
      CASHBOX_REPORT_URL(cashboxId),
      {
        params: {
          period: "day",
          date,
          status,
        },
      },
    );

    return normalizeCashboxReportResponse(
      data,
      { period: "day", date },
      "backend",
    );
  } catch (error) {
    if (!isNotImplementedError(error)) throw error;

    const { flows, truncated } = await fetchAllCashflowsFallback({
      cashbox: cashboxId,
      status,
      date_from: date,
      date_to: date,
    });

    return buildDailyReportFallback(date, flows, truncated);
  }
};

export type FetchCashboxAnalyticsParams = {
  cashboxId?: string | number | "ALL";
  dateFrom?: string;
  dateTo?: string;
  groupBy?: "month";
  status?: CashboxReportStatusFilter;
};

export const fetchCashboxReportsAnalytics = async (
  params: FetchCashboxAnalyticsParams,
): Promise<CashboxReportAnalyticsViewModel> => {
  const query: Record<string, string> = {
    group_by: params.groupBy || "month",
    status: params.status || "approved",
  };

  if (params.cashboxId && params.cashboxId !== "ALL") {
    query.cashbox = String(params.cashboxId);
  }
  if (params.dateFrom) query.date_from = params.dateFrom;
  if (params.dateTo) query.date_to = params.dateTo;

  try {
    const { data } = await api.get<ApiCashboxReportAnalyticsResponse>(
      CASHBOX_REPORT_ANALYTICS_URL,
      { params: query },
    );

    return normalizeCashboxAnalyticsResponse(data, "backend");
  } catch (error) {
    if (!isNotImplementedError(error)) throw error;

    const fallbackParams: Record<string, unknown> = {
      status: params.status || "approved",
    };
    if (params.cashboxId && params.cashboxId !== "ALL") {
      fallbackParams.cashbox = params.cashboxId;
    }
    if (params.dateFrom) fallbackParams.date_from = params.dateFrom;
    if (params.dateTo) fallbackParams.date_to = params.dateTo;

    const { flows, truncated } = await fetchAllCashflowsFallback(fallbackParams);
    const groups = buildAnalyticsGroupsFromFlows(flows);
    const summary = groups.reduce(
      (acc, group) => ({
        income: acc.income + group.income,
        expense: acc.expense + group.expense,
        net: acc.net + group.net,
        ops: acc.ops + group.ops,
      }),
      { income: 0, expense: 0, net: 0, ops: 0 },
    );

    return {
      summary,
      groups,
      truncated,
      source: "fallback",
    };
  }
};

/** Для UI: предупреждение только при fallback и обрезке данных. */
export const shouldWarnReportTruncated = (report: {
  truncated?: boolean;
  source?: string;
}) => Boolean(report.truncated);

export { toReportNumber };
