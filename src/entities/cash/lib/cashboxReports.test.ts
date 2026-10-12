import { describe, expect, it } from "vitest";
import {
  buildAnalyticsGroupsFromFlows,
  normalizeCashboxAnalyticsResponse,
  normalizeCashboxReportResponse,
  normalizeReportFlow,
  toReportNumber,
  ymLabel,
} from "./cashboxReports.normalize";

describe("toReportNumber", () => {
  it("parses decimal strings with comma", () => {
    expect(toReportNumber("1 234,50")).toBe(1234.5);
    expect(toReportNumber("100.25")).toBe(100.25);
    expect(toReportNumber(null)).toBe(0);
  });
});

describe("normalizeReportFlow", () => {
  it("normalizes income flow fields", () => {
    const flow = normalizeReportFlow({
      id: 10,
      type: "income",
      amount: "1500.00",
      name: "Продажа",
      created_at: "2026-08-15T10:00:00+06:00",
      status: "approved",
    });

    expect(flow).toMatchObject({
      id: "10",
      type: "income",
      amount: 1500,
      name: "Продажа",
      title: "Продажа",
    });
  });
});

describe("normalizeCashboxReportResponse", () => {
  it("maps monthly report with day groups", () => {
    const report = normalizeCashboxReportResponse(
      {
        period: "month",
        month: "2026-08",
        summary: {
          total_income: "3000",
          total_expense: "1000",
          net: "2000",
          operations_count: 3,
        },
        days: [
          {
            date: "2026-08-01",
            summary: {
              total_income: "3000",
              total_expense: "1000",
              net: "2000",
              operations_count: 3,
            },
            flows: [
              {
                id: "1",
                type: "income",
                amount: "3000",
                name: "Продажа",
                created_at: "2026-08-01T12:00:00+06:00",
              },
            ],
          },
        ],
      },
      { period: "month", month: "2026-08" },
    );

    expect(report.type).toBe("monthly");
    expect(report.totalIncome).toBe(3000);
    expect(report.dailyGroups?.["2026-08-01"]?.flows).toHaveLength(1);
  });

  it("maps daily report flows", () => {
    const report = normalizeCashboxReportResponse(
      {
        period: "day",
        date: "2026-08-31",
        summary: {
          total_income: "500",
          total_expense: "0",
          net: "500",
          operations_count: 1,
        },
        flows: [
          {
            id: "2",
            type: "income",
            amount: "500",
            title: "Приход",
            created_at: "2026-08-31T09:00:00+06:00",
          },
        ],
      },
      { period: "day", date: "2026-08-31" },
    );

    expect(report.type).toBe("daily");
    expect(report.flows).toHaveLength(1);
    expect(report.net).toBe(500);
  });
});

describe("normalizeCashboxAnalyticsResponse", () => {
  it("sorts groups by ym", () => {
    const analytics = normalizeCashboxAnalyticsResponse({
      summary: {
        total_income: "4000",
        total_expense: "1000",
        net: "3000",
        operations_count: 4,
      },
      groups: [
        {
          period: "2026-02",
          label: ymLabel("2026-02"),
          income: "1000",
          expense: "200",
          net: "800",
          operations_count: 1,
        },
        {
          period: "2026-01",
          label: ymLabel("2026-01"),
          income: "3000",
          expense: "800",
          net: "2200",
          operations_count: 3,
        },
      ],
    });

    expect(analytics.groups.map((group) => group.ym)).toEqual([
      "2026-01",
      "2026-02",
    ]);
    expect(analytics.summary.net).toBe(3000);
  });
});

describe("buildAnalyticsGroupsFromFlows", () => {
  it("aggregates flows by month", () => {
    const groups = buildAnalyticsGroupsFromFlows([
      {
        id: "1",
        type: "income",
        amount: 100,
        name: "A",
        title: "A",
        created_at: "2026-08-01T10:00:00+06:00",
      },
      {
        id: "2",
        type: "expense",
        amount: 40,
        name: "B",
        title: "B",
        created_at: "2026-08-15T10:00:00+06:00",
      },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      ym: "2026-08",
      income: 100,
      expense: 40,
      net: 60,
      ops: 2,
    });
  });
});
