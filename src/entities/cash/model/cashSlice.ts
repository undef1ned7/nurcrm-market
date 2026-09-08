import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "@shared/api";
import { useSelector } from "react-redux";
import { handleThunkError } from "@shared/lib/handleThunkError";

/**
 * Последнее WS-событие по движению кассы (одобрение edit/cancel-заявки на
 * другом устройстве/вкладке). `version` растёт на каждое событие — экраны
 * кассы/«Запросы» слушают его и перезапрашивают свой список.
 * @see docs/backend/kassa/cashflow-edit-cancel-request-backend.md §11 (R8)
 */
export type CashFlowRealtimeEvent = {
  version: number;
  kind: "created" | "updated" | "deleted" | null;
  cashboxId: string | null;
  flowId: string | null;
  at: string | null;
};

const initialState = {
  list: [] as any[],
  cashFlows: [] as any[],
  loading: false,
  error: null as any,
  realtime: {
    version: 0,
    kind: null,
    cashboxId: null,
    flowId: null,
    at: null,
  } as CashFlowRealtimeEvent,
};

export const getCashBoxes = createAsyncThunk<any, void | any>(
  "cash/getBoxes",
  async (_: any, { rejectWithValue }) => {
    try {
      const { data: response } = await api.get("/construction/cashboxes/");
      return response?.results ?? (Array.isArray(response) ? response : [] as any[]);
    } catch (e: any) {
      return handleThunkError(e, rejectWithValue);
    }
  }
);

export const getCashFlows = createAsyncThunk<any, void | any>(
  "cash/getFlows",
  async (params: any = {}, { rejectWithValue }) => {
    try {
      const { data: response } = await api.get("/construction/cashflows/", {
        params,
      });
      return response.results || response || [];
    } catch (e: any) {
      return handleThunkError(e, rejectWithValue);
    }
  }
);

export const addCashFlows = createAsyncThunk<any, void | any>(
  "cash/addFlows",
  async (data: any, { rejectWithValue }) => {
    try {
      const { data: response } = await api.post(
        "/construction/cashflows/",
        data
      );
      return response;
    } catch (e: any) {
      return handleThunkError(e, rejectWithValue);
    }
  }
);

export const updateCashFlows = createAsyncThunk<any, void | any>(
  "cashFlows/update",
  async ({ productId, updatedData }: any, { rejectWithValue }) => {
    try {
      // если нет helpers — (await api.patch(`/main/products/${productId}/`, updatedData)).data
      return await api.patch(
        `/construction/cashflows/${productId}/`,
        updatedData
      );
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);

/**
 * Заявка на редактирование одобренного движения кассы.
 * Не меняет движение сразу — создаёт pending-заявку на той же кассе.
 * @see docs/backend/kassa/cashflow-edit-cancel-request-backend.md
 */
export const requestCashFlowEdit = createAsyncThunk<any, any>(
  "cashFlows/requestEdit",
  async ({ targetFlowId, payload }: any, { rejectWithValue }) => {
    try {
      const { data } = await api.post(
        `/construction/cashflows/${targetFlowId}/edit-request/`,
        payload,
      );
      return data;
    } catch (e: any) {
      return handleThunkError(e, rejectWithValue);
    }
  },
);

/**
 * Заявка на отмену (сторно) одобренного движения кассы.
 * @see docs/backend/kassa/cashflow-edit-cancel-request-backend.md
 */
export const requestCashFlowCancel = createAsyncThunk<any, any>(
  "cashFlows/requestCancel",
  async ({ targetFlowId, payload }: any, { rejectWithValue }) => {
    try {
      const { data } = await api.post(
        `/construction/cashflows/${targetFlowId}/cancel-request/`,
        payload,
      );
      return data;
    } catch (e: any) {
      return handleThunkError(e, rejectWithValue);
    }
  },
);

export const bulkUpdateCashFlowsStatus = createAsyncThunk<any, void | any>(
  "cashFlows/bulkUpdateStatus",
  async (items: any, { rejectWithValue }) => {
    try {
      const { data: response } = await api.patch(
        "/construction/cashflows/bulk/status/",
        { items }
      );
      return response;
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);

const cashSlice = createSlice({
  name: "cash",
  initialState,
  reducers: {
    /**
     * Диспатчится из useNotificationsSocket по `market.cashflow.updated` /
     * `market.cashflow.deleted` / `market.cashflow.created`. Экраны кассы и
     * «Запросы» сравнивают `realtime.version` и перезапрашивают свой список.
     */
    cashFlowRealtimeEventReceived: (
      state,
      action: { payload: { kind?: string | null; cashboxId?: string | null; flowId?: string | null } },
    ) => {
      const { kind, cashboxId, flowId } = action.payload || {};
      state.realtime = {
        version: state.realtime.version + 1,
        kind: (kind as any) ?? null,
        cashboxId: cashboxId ?? null,
        flowId: flowId ?? null,
        at: new Date().toISOString(),
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(addCashFlows.pending, (state) => {
        state.loading = true;
      })
      .addCase(addCashFlows.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(addCashFlows.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })
      .addCase(updateCashFlows.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateCashFlows.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(updateCashFlows.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })
      .addCase(bulkUpdateCashFlowsStatus.pending, (state) => {
        state.loading = true;
      })
      .addCase(bulkUpdateCashFlowsStatus.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(bulkUpdateCashFlowsStatus.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })
      .addCase(requestCashFlowEdit.pending, (state) => {
        state.loading = true;
      })
      .addCase(requestCashFlowEdit.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(requestCashFlowEdit.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })
      .addCase(requestCashFlowCancel.pending, (state) => {
        state.loading = true;
      })
      .addCase(requestCashFlowCancel.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(requestCashFlowCancel.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })
      .addCase(getCashBoxes.pending, (state) => {
        state.loading = true;
      })
      .addCase(getCashBoxes.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.list = payload;
      })
      .addCase(getCashBoxes.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })
      .addCase(getCashFlows.pending, (state) => {
        state.loading = true;
      })
      .addCase(getCashFlows.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.cashFlows = payload;
      })
      .addCase(getCashFlows.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      });
  },
});

export const { cashFlowRealtimeEventReceived } = cashSlice.actions;

export const useCash = () => useSelector((state: any) => state.cash);
export const useCashFlowRealtimeEvent = (): CashFlowRealtimeEvent =>
  useSelector((state: any) => state.cash.realtime);
export default cashSlice.reducer;
