import { createSlice } from "@reduxjs/toolkit";
import {
  fetchClientsAsync,
  createClientAsync,
  updateClientAsync,
  deleteClientAsync,
  getItemClient,
  createDeals,
  getClientDeals,
  getClientDealDetail,
  updateDealDetail,
  payDebtDeal,
  deleteDebt,
  onPayDebtDeal,
} from "./clientCreators";
import { useSelector } from "react-redux";

const initialState = {
  list: [] as any[],
  count: null as any,
  next: null as any,
  previous: null as any,
  loading: false,
  error: null as any,
  creating: false,
  updating: false,
  deleting: false,
  client: null as any,
  clientDeals: [] as any[],
  dealDetail: null as any,
};

const clientSlice = createSlice({
  name: "client",
  initialState,
  reducers: {
    clearClients(state) {
      state.list = [];
      state.count = null;
      state.next = null;
      state.previous = null;
    },
  },
  extraReducers(builder) {
    // --- fetch list ---
    builder
      .addCase(fetchClientsAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchClientsAsync.fulfilled, (state, action) => {
        // Сервер может прислать null или массив без пагинации — не роняем редьюсер.
        const payload = action.payload ?? {};
        const list = Array.isArray(payload.results)
          ? payload.results
          : Array.isArray(payload)
            ? payload
            : [];
        state.list = list;
        state.count = Number(payload.count) || list.length;
        state.next = payload.next ?? null;
        state.previous = payload.previous ?? null;
        state.loading = false;
      })
      .addCase(fetchClientsAsync.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      })
      // --- create ---
      .addCase(createClientAsync.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(createClientAsync.fulfilled, (state, action) => {
        state.list.unshift(action.payload);
        state.creating = false;
      })
      .addCase(createClientAsync.rejected, (state, action) => {
        state.error = action.payload;
        state.creating = false;
      })
      // --- update ---
      .addCase(updateClientAsync.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(updateClientAsync.fulfilled, (state, action) => {
        const idx = state.list.findIndex((c) => c.id === action.payload.id);
        if (idx !== -1) state.list[idx] = action.payload;
        state.updating = false;
      })
      .addCase(updateClientAsync.rejected, (state, action) => {
        state.error = action.payload;
        state.updating = false;
      })
      // --- delete ---
      .addCase(deleteClientAsync.pending, (state) => {
        state.deleting = true;
        state.error = null;
      })
      .addCase(deleteClientAsync.fulfilled, (state, action) => {
        state.list = state.list.filter((c) => c.id !== action.payload);
        state.deleting = false;
      })
      .addCase(deleteClientAsync.rejected, (state, action) => {
        state.error = action.payload;
        state.deleting = false;
      })
      .addCase(deleteDebt.pending, (state) => {
        state.deleting = true;
        state.error = null;
      })
      .addCase(deleteDebt.fulfilled, (state) => {
        state.deleting = false;
      })
      .addCase(deleteDebt.rejected, (state, action) => {
        state.error = action.payload;
        state.deleting = false;
      })
      .addCase(getItemClient.pending, (state) => {
        state.loading = true;
        // state.deleting = false;
      })
      .addCase(getItemClient.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.client = payload;
      })
      .addCase(getItemClient.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })
      .addCase(createDeals.pending, (state) => {
        state.loading = true;
      })
      .addCase(createDeals.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(createDeals.rejected, (state, { payload }) => {
        state.error = payload;
        state.loading = false;
      })
      .addCase(getClientDeals.pending, (state) => {
        state.loading = true;
      })
      .addCase(getClientDeals.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.clientDeals = payload;
      })
      .addCase(getClientDeals.rejected, (state, { payload }) => {
        state.error = payload;
        state.loading = false;
      })
      .addCase(getClientDealDetail.pending, (state) => {
        state.loading = true;
      })
      .addCase(getClientDealDetail.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.dealDetail = payload;
      })
      .addCase(getClientDealDetail.rejected, (state, { payload }) => {
        state.error = payload;
        state.loading = false;
      })
      .addCase(updateDealDetail.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateDealDetail.fulfilled, (state, { payload }) => {
        state.loading = false;
        // Бэк на PATCH может вернуть частичный объект — не затираем
        // dealDetail, если ответ пуст/без id.
        if (payload && typeof payload === "object" && payload.id) {
          state.dealDetail = payload;
        }
      })
      .addCase(updateDealDetail.rejected, (state, { payload }) => {
        state.error = payload;
        state.loading = false;
      })
      .addCase(payDebtDeal.pending, (state) => {
        state.loading = true;
      })
      .addCase(payDebtDeal.fulfilled, (state, { payload }) => {
        state.loading = false;
        // Сохраняем актуальный остаток/статус долга после оплаты — раньше
        // строка была закомментирована, и dealDetail оставался устаревшим
        // до ручного рефетча. См. docs/sale-flow-bugs.md, пункт 9.
        if (payload && typeof payload === "object" && payload.id) {
          state.dealDetail = payload;
        }
      })
      .addCase(payDebtDeal.rejected, (state, { payload }) => {
        state.error = payload;
        state.loading = false;
      })
      .addCase(onPayDebtDeal.pending, (state) => {
        state.loading = true;
      })
      .addCase(onPayDebtDeal.fulfilled, (state, { payload }) => {
        state.loading = false;
        if (payload && typeof payload === "object" && payload.id) {
          state.dealDetail = payload;
        }
      })
      .addCase(onPayDebtDeal.rejected, (state, { payload }) => {
        state.error = payload;
        state.loading = false;
      });
  },
});
export const { clearClients } = clientSlice.actions;
export const useClient = () => useSelector((state: any) => state.client);
export default clientSlice.reducer;
