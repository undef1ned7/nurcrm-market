import { createSlice } from "@reduxjs/toolkit";
import {
  fetchOrderAnalytics,
  fetchAgentAnalytics,
  fetchProductionAnalytics,
} from "./analyticsCreators";

const orderAnalyticsSlice = createSlice({
  name: "orderAnalytics",
  initialState: {
    data: null as any,
    loading: false,
    error: null as any,
    filters: {
      start_date: null as any,
      end_date: null as any,
      status: null as any,
    },
    agentAnalytics: {
      data: null as any,
      loading: false,
      error: null as any,
      period: "month",
      agentId: null as any,
    },
    productionAnalytics: {
      data: null as any,
      loading: false,
      error: null as any,
      filters: {
        period: "month",
        date: "",
        date_from: "",
        date_to: "",
        group_by: "day",
      },
    },
  },
  reducers: {
    setAnalyticsFilters: (state: any, action: any) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearAnalytics: (state: any) => {
      state.data = null;
      state.loading = false;
      state.error = null;
      state.filters = { start_date: null, end_date: null, status: null };
    },
    clearAgentAnalytics: (state: any) => {
      state.agentAnalytics.data = null;
      state.agentAnalytics.loading = false;
      state.agentAnalytics.error = null;
      state.agentAnalytics.period = "month";
      state.agentAnalytics.agentId = null;
    },
    setProductionAnalyticsFilters: (state: any, action: any) => {
      state.productionAnalytics.filters = {
        ...state.productionAnalytics.filters,
        ...action.payload,
      };
    },
    clearProductionAnalytics: (state: any) => {
      state.productionAnalytics.data = null;
      state.productionAnalytics.loading = false;
      state.productionAnalytics.error = null;
      state.productionAnalytics.filters = {
        period: "month",
        date: "",
        date_from: "",
        date_to: "",
        group_by: "day",
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrderAnalytics.pending, (state: any, action: any) => {
        state.loading = true;
        state.error = null;
        state.filters = action.meta.arg || {
          start_date: null,
          end_date: null,
          status: null,
        };
      })
      .addCase(fetchOrderAnalytics.fulfilled, (state: any, action: any) => {
        state.loading = false;
        state.data = action.payload;
        state.error = null;
      })
      .addCase(fetchOrderAnalytics.rejected, (state: any, action: any) => {
        state.loading = false;
        state.error = action.payload || {
          message: "Не удалось получить аналитику",
        };
        state.data = null;
      })
      .addCase(fetchAgentAnalytics.pending, (state: any, action: any) => {
        state.agentAnalytics.loading = true;
        state.agentAnalytics.error = null;
        const { agentId, period } = action.meta.arg || {};
        if (agentId !== undefined) state.agentAnalytics.agentId = agentId;
        if (period) state.agentAnalytics.period = period;
      })
      .addCase(fetchAgentAnalytics.fulfilled, (state: any, action: any) => {
        state.agentAnalytics.loading = false;
        state.agentAnalytics.data = action.payload;
        state.agentAnalytics.error = null;
      })
      .addCase(fetchAgentAnalytics.rejected, (state: any, action: any) => {
        state.agentAnalytics.loading = false;
        state.agentAnalytics.error = action.payload || {
          message: "Не удалось получить аналитику агента",
        };
        state.agentAnalytics.data = null;
      })
      .addCase(fetchProductionAnalytics.pending, (state: any, action: any) => {
        state.productionAnalytics.loading = true;
        state.productionAnalytics.error = null;
        // Обновляем фильтры из параметров запроса
        if (action.meta.arg) {
          const params = action.meta.arg;
          if (params.period)
            state.productionAnalytics.filters.period = params.period;
          if (params.date) state.productionAnalytics.filters.date = params.date;
          if (params.date_from)
            state.productionAnalytics.filters.date_from = params.date_from;
          if (params.date_to)
            state.productionAnalytics.filters.date_to = params.date_to;
          if (params.group_by)
            state.productionAnalytics.filters.group_by = params.group_by;
        }
      })
      .addCase(fetchProductionAnalytics.fulfilled, (state: any, action: any) => {
        state.productionAnalytics.loading = false;
        state.productionAnalytics.data = action.payload;
        state.productionAnalytics.error = null;
      })
      .addCase(fetchProductionAnalytics.rejected, (state: any, action: any) => {
        state.productionAnalytics.loading = false;
        state.productionAnalytics.error = action.payload || {
          message: "Не удалось получить аналитику производства",
        };
        state.productionAnalytics.data = null;
      });
  },
});

export const {
  setAnalyticsFilters,
  clearAnalytics,
  clearAgentAnalytics,
  setProductionAnalyticsFilters,
  clearProductionAnalytics,
} = orderAnalyticsSlice.actions;

export default orderAnalyticsSlice.reducer;
