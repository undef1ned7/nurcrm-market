import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  getOrderAnalytics,
  getAgentAnalytics,
  getProductionAnalytics,
} from "@entities/analytics/api/analytics";

export const fetchOrderAnalytics = createAsyncThunk(
  "orderAnalytics/fetchOrderAnalytics",
  async (filters: any, { rejectWithValue }) => {
    try {
      const data = await getOrderAnalytics(filters);
      return data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const fetchAgentAnalytics = createAsyncThunk(
  "orderAnalytics/fetchAgentAnalytics",
  async (payload: any = {}, { rejectWithValue }) => {
    const {
      agentId,
      period = "month",
      date,
      date_from,
      date_to,
    } = payload || {};
    try {
      const data = await getAgentAnalytics(agentId, {
        period,
        date,
        date_from,
        date_to,
      });
      return data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const fetchProductionAnalytics = createAsyncThunk(
  "orderAnalytics/fetchProductionAnalytics",
  async (params: any = {}, { rejectWithValue }) => {
    try {
      const data = await getProductionAnalytics(params);
      return data;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail ||
        error.message ||
        "Не удалось загрузить аналитику производства";
      return rejectWithValue({
        message: errorMessage,
        status: error.response?.status,
      });
    }
  }
);
