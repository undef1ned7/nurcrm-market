import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "@shared/api";

// Делает ошибки сериализуемыми
const plainAxiosError = (error: any) => ({
  message: error?.message,
  code: error?.code,
  status: error?.response?.status,
  data: error?.response?.data,
  url: error?.config?.url,
  method: error?.config?.method,
});

// ===== Смены (Cash Shifts) =====

/**
 * Получить список смен
 * GET /construction/shifts/
 */
export const fetchShiftsAsync = createAsyncThunk<any, void | any>(
  "shifts/fetchAll",
  async (params: any = {}, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/construction/shifts/", { params });
      return data;
    } catch (error: any) {
      return rejectWithValue(plainAxiosError(error));
    }
  }
);

/**
 * Получить детали смены
 * GET /construction/shifts/<id>/
 */
export const fetchShiftByIdAsync = createAsyncThunk<any, void | any>(
  "shifts/fetchById",
  async (shiftId: any, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/construction/shifts/${shiftId}/`);
      return data;
    } catch (error: any) {
      return rejectWithValue(plainAxiosError(error));
    }
  }
);

/**
 * Открыть смену
 * POST /construction/shifts/open/
 * Body: { cashbox, cashier, opening_cash }
 */
export const openShiftAsync = createAsyncThunk<any, void | any>(
  "shifts/open",
  async (shiftData: any, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/construction/shifts/open/", {
        cashbox: shiftData.cashbox,
        cashier: shiftData.cashier,
        opening_cash: String(shiftData.opening_cash || "0"),
      });
      return data;
    } catch (error: any) {
      return rejectWithValue(plainAxiosError(error));
    }
  }
);

/**
 * Закрыть смену
 * POST /construction/shifts/<id>/close/
 * Body: { closing_cash }
 */
export const closeShiftAsync = createAsyncThunk<any, void | any>(
  "shifts/close",
  async ({ shiftId, closingCash }: any, { rejectWithValue }) => {
    try {
      const { data } = await api.post(
        `/construction/shifts/${shiftId}/close/`,
        {
          closing_cash: String(closingCash || "0"),
        }
      );
      return data;
    } catch (error: any) {
      return rejectWithValue(plainAxiosError(error));
    }
  }
);

/**
 * Получить продажи смены
 * GET /construction/cash/shifts/<id>/sales/
 * Query params:
 *   - status: paid, unpaid и т.д.
 *   - payment_method: cash, transfer и т.д.
 *   - date_from: YYYY-MM-DD
 *   - date_to: YYYY-MM-DD
 *   - ordering: -total (убывание по сумме), total (возрастание)
 *   - q: поиск по номеру чека
 */
export const fetchShiftSalesAsync = createAsyncThunk<any, void | any>(
  "shifts/fetchSales",
  async ({ shiftId, params = {} }: any, { rejectWithValue }) => {
    try {
      const { data } = await api.get(
        `/construction/cash/shifts/${shiftId}/sales/`,
        { params }
      );
      return data;
    } catch (error: any) {
      return rejectWithValue(plainAxiosError(error));
    }
  }
);

const shiftSalesPage = (data: any) => {
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data)) return data;
  return [];
};

const fetchShiftSalesPages = async (
  url: string,
  params: any,
  maxPages: number,
) => {
  const all: any[] = [];
  let page = 1;
  while (page <= maxPages) {
    const { data } = await api.get(url, {
      params: { ...params, page },
    });
    const chunk = shiftSalesPage(data);
    all.push(...chunk);
    if (!data?.next || chunk.length === 0) break;
    page += 1;
  }
  return all;
};

/** Все продажи смены (для разбивки по способам оплаты, пока бэк не отдаёт payment_breakdown). */
export const fetchAllShiftSales = async (
  shiftId: any,
  { pageSize = 100, maxPages = 50 }: any = {},
) => {
  try {
    return await fetchShiftSalesPages(
      `/construction/cash/shifts/${shiftId}/sales/`,
      { page_size: pageSize },
      maxPages,
    );
  } catch {
    return fetchShiftSalesPages(
      "/main/pos/sales/",
      { shift: shiftId, page_size: pageSize },
      maxPages,
    );
  }
};
