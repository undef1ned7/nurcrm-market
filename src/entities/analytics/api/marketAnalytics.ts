import api from "@shared/api";

export const MARKET_ANALYTICS_TIMEOUT_MS = 160000;

export type MarketAnalyticsParams = {
  tab: string;
  period_start: string;
  period_end: string;
  by?: string;
  metric?: string;
  [key: string]: unknown;
};

/** `GET /main/analytics/market/` — те же цифры, что в «Аналитике». */
export const fetchMarketAnalytics = async (
  params: MarketAnalyticsParams,
  signal?: AbortSignal,
) => {
  const response = await api.get("/main/analytics/market/", {
    params,
    timeout: MARKET_ANALYTICS_TIMEOUT_MS,
    signal,
  });
  return response.data;
};
