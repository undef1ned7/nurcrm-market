import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "@shared/api";
import { useSelector } from "react-redux";
import { handleThunkError } from "@shared/lib/handleThunkError";

const initialState = {
  list: [] as any[],
  cashFlows: [] as any[],
  loading: false,
  error: null as any,
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
  reducers: {} as any,
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

export const useCash = () => useSelector((state: any) => state.cash);
export default cashSlice.reducer;
