/** Контракт: docs/backend/kassa/cashbox-reports-backend.md */

export type CashboxReportPeriod = "day" | "month";

export type CashboxReportStatusFilter = "approved" | "pending" | "all";

export type CashboxReportFlow = {
  id: string;
  type: "income" | "expense";
  amount: number;
  name: string;
  title: string;
  created_at: string | null;
  status?: string;
};

export type CashboxReportDayGroup = {
  income: number;
  expense: number;
  flows: CashboxReportFlow[];
};

export type CashboxReportViewModel = {
  type: "monthly" | "daily";
  month?: string;
  date?: string;
  totalIncome: number;
  totalExpense: number;
  net: number;
  operationsCount: number;
  dailyGroups?: Record<string, CashboxReportDayGroup>;
  flows?: CashboxReportFlow[];
  truncated?: boolean;
  source: "backend" | "fallback";
};

export type CashboxReportAnalyticsGroup = {
  ym: string;
  label: string;
  income: number;
  expense: number;
  net: number;
  ops: number;
};

export type CashboxReportAnalyticsViewModel = {
  summary: {
    income: number;
    expense: number;
    net: number;
    ops: number;
  };
  groups: CashboxReportAnalyticsGroup[];
  truncated?: boolean;
  source: "backend" | "fallback";
};

export type ApiCashboxReportSummary = {
  total_income?: string | number;
  total_expense?: string | number;
  net?: string | number;
  operations_count?: number;
};

export type ApiCashboxReportFlow = {
  id?: string | number;
  uuid?: string;
  type?: string;
  amount?: string | number;
  name?: string;
  title?: string;
  description?: string;
  note?: string;
  created_at?: string;
  created?: string;
  date?: string;
  timestamp?: string;
  status?: string;
};

export type ApiCashboxReportDay = {
  date: string;
  summary?: ApiCashboxReportSummary;
  income?: string | number;
  expense?: string | number;
  net?: string | number;
  operations_count?: number;
  flows?: ApiCashboxReportFlow[];
};

export type ApiCashboxReportResponse = {
  cashbox_id?: string | number;
  period?: CashboxReportPeriod;
  month?: string;
  date?: string;
  date_from?: string;
  date_to?: string;
  status_filter?: CashboxReportStatusFilter | string;
  summary?: ApiCashboxReportSummary;
  total_income?: string | number;
  total_expense?: string | number;
  net?: string | number;
  operations_count?: number;
  days?: ApiCashboxReportDay[];
  daily_groups?: Record<string, ApiCashboxReportDay>;
  flows?: ApiCashboxReportFlow[];
  truncated?: boolean;
  complete?: boolean;
};

export type ApiCashboxReportAnalyticsGroup = {
  period?: string;
  ym?: string;
  label?: string;
  income?: string | number;
  total_income?: string | number;
  expense?: string | number;
  total_expense?: string | number;
  net?: string | number;
  operations_count?: number;
  ops?: number;
};

export type ApiCashboxReportAnalyticsResponse = {
  cashbox_id?: string | number | null;
  date_from?: string;
  date_to?: string;
  group_by?: string;
  summary?: ApiCashboxReportSummary & { operations_count?: number };
  groups?: ApiCashboxReportAnalyticsGroup[];
  truncated?: boolean;
  complete?: boolean;
};
