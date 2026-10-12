import { createSlice } from "@reduxjs/toolkit";
import { useSelector } from "react-redux";
import {
  fetchShiftsAsync,
  fetchShiftByIdAsync,
  openShiftAsync,
  closeShiftAsync,
} from "./shiftThunk";

const initialState = {
  shifts: [] as any[],
  shiftsCount: 0,
  shiftsNext: null as any,
  shiftsPrevious: null as any,
  currentShift: null as any,
  loading: false,
  error: null as any,
};

const shiftSlice = createSlice({
  name: "shifts",
  initialState,
  reducers: {
    clearCurrentShift: (state) => {
      state.currentShift = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    /**
     * Патч открытой смены по WS-событию `market.shift.updated` (возврат чека /
     * одобрение edit-cancel заявки на другом устройстве). Обновляем только
     * пришедшие числовые поля — остальное не трогаем.
     * @see docs/backend/kassa/OPEN-QUESTIONS-2026-09-BE-RESPONSE.md — Блок 1.4
     */
    shiftRealtimeUpdateReceived: (
      state,
      action: {
        payload: {
          shiftId?: string | null;
          drawerExpectedCash?: string | null;
          cashSalesTotal?: string | null;
        };
      },
    ) => {
      const { shiftId, drawerExpectedCash, cashSalesTotal } =
        action.payload || {};
      if (!shiftId) return;

      const patch: Record<string, unknown> = {};
      if (drawerExpectedCash != null) {
        patch.drawer_expected_cash = drawerExpectedCash;
        patch.expected_cash = drawerExpectedCash;
      }
      if (cashSalesTotal != null) patch.cash_sales_total = cashSalesTotal;
      if (Object.keys(patch).length === 0) return;

      if (state.currentShift?.id === shiftId) {
        state.currentShift = { ...state.currentShift, ...patch };
      }
      const index = state.shifts.findIndex((s) => s.id === shiftId);
      if (index !== -1) {
        state.shifts[index] = { ...state.shifts[index], ...patch };
      }
    },
  },
  extraReducers: (builder) => {
    // Fetch all shifts
    builder
      .addCase(fetchShiftsAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchShiftsAsync.fulfilled, (state, action) => {
        state.loading = false;
        // Только массив: объект/строка в results раньше попадали в shifts и роняли
        // список (shifts.map is not a function → «Что-то пошло не так»).
        const payload = action.payload;
        const list = Array.isArray(payload?.results)
          ? payload.results
          : Array.isArray(payload)
            ? payload
            : [];
        state.shifts = list.filter((s: any) => s && typeof s === "object");
        const count = Number(payload?.count);
        state.shiftsCount = Number.isFinite(count) && count >= 0 ? count : list.length;
        state.shiftsNext = action.payload?.next || null;
        state.shiftsPrevious = action.payload?.previous || null;
      })
      .addCase(fetchShiftsAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Fetch shift by ID
    builder
      .addCase(fetchShiftByIdAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchShiftByIdAsync.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.currentShift = action.payload;
          // Обновляем смену в списке, если она там есть
          const index = state.shifts.findIndex(
            (s) => s.id === action.payload.id
          );
          if (index !== -1) {
            state.shifts[index] = action.payload;
          }
        }
      })
      .addCase(fetchShiftByIdAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Open shift
    builder
      .addCase(openShiftAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(openShiftAsync.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.currentShift = action.payload;
          // Добавляем новую смену в начало списка
          state.shifts.unshift(action.payload);
        }
      })
      .addCase(openShiftAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Close shift
    builder
      .addCase(closeShiftAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(closeShiftAsync.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          const closedShift = action.payload;
          state.currentShift = closedShift;
          // Обновляем смену в списке
          const index = state.shifts.findIndex((s) => s.id === closedShift.id);
          if (index !== -1) {
            state.shifts[index] = closedShift;
          }
        }
      })
      .addCase(closeShiftAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearCurrentShift, clearError, shiftRealtimeUpdateReceived } =
  shiftSlice.actions;

// Selectors
export const useShifts = () => {
  return useSelector((state: any) => state.shifts);
};

export default shiftSlice.reducer;
