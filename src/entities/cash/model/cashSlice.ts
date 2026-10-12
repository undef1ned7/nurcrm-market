import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "@shared/api";
import { useSelector } from "react-redux";
import { handleThunkError } from "@shared/lib/handleThunkError";
import {
  MARKET_CASHIER_SETTINGS_URL,
  normalizeMarketCashierSettings,
} from "@shared/api/marketCashierSettings";

/**
 * Один раз за сессию вкладки — чтобы несколько экранов кассы, каждый из
 * которых сам дёргает fetchCashflowRequestsSetting на маунте, не запускали
 * авто-одобрение параллельно. После первого прогона очередь обычно пуста,
 * так что повторный вызов на следующей загрузке страницы — дешёвый no-op.
 */
let cashflowAutoApproveAttempted = false;

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
  // Заявки на подтверждение (пункт «Запросы») — company-level настройка,
  // default = выключено. @see docs/backend/kassa/cashflow-requests-toggle-backend.md
  cashflowRequestsEnabled: false,
  // Счётчик pending-заявок для бейджа в сайдбаре (пункт «Запросы»). null — ещё не загружен.
  pendingCount: null as number | null,
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

export type DeleteCashBoxArg =
  | string
  | number
  | { id: string | number; mergeInto?: string | number | null };

/**
 * Удаление кассы. BE: «мягко» (is_active=false) если по кассе были
 * движения/смены, иначе физически. С `mergeInto` — движения переносятся в
 * кассу-наследника перед архивацией (`?merge_into=<id>`), без него — прежнее
 * поведение (чистый архив). Коды 409: cashbox_has_open_shift /
 * cashbox_role_required / cashbox_has_pending; `merge_target_invalid` — если
 * наследник не подошёл.
 * @see docs/backend/kassa/cashbox-delete-backend.md
 */
export const deleteCashBox = createAsyncThunk<any, DeleteCashBoxArg>(
  "cash/deleteBox",
  async (arg, { rejectWithValue }) => {
    const cashboxId = typeof arg === "object" ? arg.id : arg;
    const mergeInto = typeof arg === "object" ? arg.mergeInto : null;
    try {
      const { data } = await api.delete(
        `/construction/cashboxes/${cashboxId}/`,
        mergeInto ? { params: { merge_into: mergeInto } } : undefined,
      );
      return {
        id: cashboxId,
        mergeInto: mergeInto || null,
        ...(data && typeof data === "object" ? data : {}),
      };
    } catch (e: any) {
      // Важно: НЕ прогонять через handleThunkError — он сплющивает ошибку в
      // строку (validateResErrors) и теряет `response.data.code`, из-за чего
      // cashboxDeleteErrorMessage() в модалке не может распознать
      // cashbox_has_pending / cashbox_has_open_shift и т.д. и показывает
      // невнятный дефолт вместо конкретной причины из ответа бэка.
      return rejectWithValue({
        response: {
          status: e?.response?.status ?? null,
          data: e?.response?.data ?? null,
        },
      });
    }
  },
);

export type BulkDeleteCashBoxesArg = {
  ids: Array<string | number>;
  mergeInto?: string | number | null;
};

export type BulkDeleteCashBoxesResult = {
  succeeded: string[];
  failed: Array<{ id: string; error: unknown }>;
};

/**
 * Массовое удаление касс с общим наследником отчёта. Сначала пробует
 * атомарный `POST /construction/cashboxes/bulk-delete/`; если BE его ещё не
 * реализовал (404/405/501) — идёт по одной `DELETE .../{id}/?merge_into=`,
 * собирая результат по каждой кассе отдельно (частичный успех возможен).
 * @see docs/backend/kassa/cashbox-delete-backend.md §«Массовое удаление»
 */
export const bulkDeleteCashBoxes = createAsyncThunk<
  BulkDeleteCashBoxesResult,
  BulkDeleteCashBoxesArg
>("cash/bulkDeleteBoxes", async ({ ids, mergeInto }, { dispatch }) => {
  const isNotImplemented = (error: any) => {
    const status = error?.response?.status ?? error?.status;
    return status === 404 || status === 405 || status === 501;
  };

  try {
    const { data } = await api.post("/construction/cashboxes/bulk-delete/", {
      ids,
      merge_into: mergeInto || null,
    });
    const succeeded: string[] = Array.isArray(data?.succeeded)
      ? data.succeeded.map(String)
      : ids.map(String);
    return {
      succeeded,
      failed: Array.isArray(data?.failed) ? data.failed : [],
    };
  } catch (error: any) {
    if (!isNotImplemented(error)) {
      return { succeeded: [], failed: ids.map((id) => ({ id: String(id), error })) };
    }
  }

  // Fallback: bulk-эндпоинта ещё нет — последовательные единичные DELETE.
  const succeeded: string[] = [];
  const failed: Array<{ id: string; error: unknown }> = [];
  for (const id of ids) {
    try {
      await dispatch(deleteCashBox({ id, mergeInto })).unwrap();
      succeeded.push(String(id));
    } catch (error) {
      failed.push({ id: String(id), error });
    }
  }
  return { succeeded, failed };
});

/**
 * Назначение/смена роли кассы (сейчас — только «Для долгов»). BE-возможность
 * пока не подтверждена — см. cashbox-debt-role-backend.md.
 */
export const updateCashboxRole = createAsyncThunk<
  any,
  { id: string | number; role: string }
>("cash/updateRole", async ({ id, role }, { rejectWithValue }) => {
  try {
    const { data } = await api.patch(`/construction/cashboxes/${id}/`, {
      role,
    });
    return { id, role, ...(data && typeof data === "object" ? data : {}) };
  } catch (e: any) {
    return handleThunkError(e, rejectWithValue);
  }
});

/**
 * Настройка «Запросы на кассе» (approval workflow для ручных
 * приходов/расходов не-владельца, компенсации возврата чека и правки/отмены
 * одобренного движения). Читает тот же singleton, что и настройки кассы
 * маркета. Ошибка/нет поля на бэке → выключено (безопасный дефолт).
 * @see docs/backend/kassa/cashflow-requests-toggle-backend.md
 */
export const fetchCashflowRequestsSetting = createAsyncThunk<boolean, void>(
  "cash/fetchCashflowRequestsSetting",
  async (_arg, { dispatch }) => {
    let enabled = false;
    try {
      const { data } = await api.get(MARKET_CASHIER_SETTINGS_URL);
      enabled = normalizeMarketCashierSettings(data).cashflowRequestsEnabled;
    } catch (_e) {
      enabled = false;
    }
    // Выключено → у компании не должно оставаться зависших заявок из тех
    // времён, когда approval был обязателен. Одобряем весь бэклог тем же
    // механизмом, что и ручная кнопка «Одобрить» на экране «Запросы».
    if (!enabled && !cashflowAutoApproveAttempted) {
      cashflowAutoApproveAttempted = true;
      dispatch(autoApprovePendingCashflows());
    }
    return enabled;
  },
);

/**
 * Лёгкий счётчик pending-заявок (для бейджа пункта «Запросы» в сайдбаре) —
 * запрашивает только `count`, без списка (`page_size=1`), в отличие от
 * `autoApprovePendingCashflows`, который вытягивает весь бэклог постранично.
 */
export const fetchPendingCashflowsCount = createAsyncThunk<number, void>(
  "cash/fetchPendingCashflowsCount",
  async (_arg, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/construction/cashflows/", {
        params: { status: "pending", page_size: 1 },
      });
      if (typeof data?.count === "number") return data.count;
      const flows = Array.isArray(data) ? data : data?.results || [];
      return flows.length;
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

/**
 * Одобряет весь бэклог pending-записей компании (ручные приходы/расходы,
 * компенсации возврата чека, заявки на правку/отмену) — вызывается автоматом,
 * когда «Запросы» выключены (см. fetchCashflowRequestsSetting), тем же
 * bulk-эндпоинтом, что и ручное массовое одобрение на экране «Запросы».
 * @see docs/backend/kassa/cashflow-requests-toggle-backend.md
 */
export const autoApprovePendingCashflows = createAsyncThunk<number, void>(
  "cash/autoApprovePendingCashflows",
  async (_arg, { dispatch }) => {
    const ids: Array<string | number> = [];
    const pageSize = 100;
    let page = 1;
    try {
      while (true) {
        const { data } = await api.get("/construction/cashflows/", {
          params: { status: "pending", page, page_size: pageSize },
        });
        const flows = Array.isArray(data) ? data : data?.results || [];
        for (const flow of flows) {
          if (flow?.id != null && flow?.status === "pending") ids.push(flow.id);
        }
        const hasNext = Boolean(data?.next) || flows.length === pageSize;
        if (!hasNext || flows.length === 0 || page > 50) break;
        page += 1;
      }
    } catch (_e) {
      return 0;
    }

    if (!ids.length) return 0;

    try {
      await dispatch(
        bulkUpdateCashFlowsStatus(ids.map((id) => ({ id, status: "approved" }))),
      ).unwrap();
      return ids.length;
    } catch (_e) {
      return 0;
    }
  },
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
    /** Синхронный апдейт после сохранения в Настройках — без ожидания рефетча. */
    cashflowRequestsSettingUpdated: (state, action: { payload: boolean }) => {
      state.cashflowRequestsEnabled = Boolean(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCashflowRequestsSetting.fulfilled, (state, { payload }) => {
        state.cashflowRequestsEnabled = Boolean(payload);
      })
      .addCase(fetchPendingCashflowsCount.fulfilled, (state, { payload }) => {
        state.pendingCount = payload;
      })
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
      .addCase(updateCashFlows.fulfilled, (state, action) => {
        state.loading = false;
        // Оптимистичный сдвиг бейджа «Запросы»: заявка ушла из pending.
        // Точное число подтягивает fetchPendingCashflowsCount по realtime-событию.
        const newStatus = (action.meta?.arg as any)?.updatedData?.status;
        if (
          (newStatus === "approved" || newStatus === "rejected") &&
          typeof state.pendingCount === "number" &&
          state.pendingCount > 0
        ) {
          state.pendingCount -= 1;
        }
      })
      .addCase(updateCashFlows.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })
      .addCase(bulkUpdateCashFlowsStatus.pending, (state) => {
        state.loading = true;
      })
      .addCase(bulkUpdateCashFlowsStatus.fulfilled, (state, action) => {
        state.loading = false;
        const items = (action.meta?.arg as any[]) || [];
        const resolvedCount = items.filter(
          (i) => i?.status === "approved" || i?.status === "rejected",
        ).length;
        if (resolvedCount > 0 && typeof state.pendingCount === "number") {
          state.pendingCount = Math.max(0, state.pendingCount - resolvedCount);
        }
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
      .addCase(deleteCashBox.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteCashBox.fulfilled, (state, { payload }) => {
        state.loading = false;
        const removedId = payload?.id;
        if (removedId != null) {
          state.list = state.list.filter(
            (c: any) => String(c?.id) !== String(removedId),
          );
        }
      })
      .addCase(deleteCashBox.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })
      .addCase(bulkDeleteCashBoxes.pending, (state) => {
        state.loading = true;
      })
      .addCase(bulkDeleteCashBoxes.fulfilled, (state, { payload }) => {
        state.loading = false;
        const removed = new Set(payload.succeeded.map(String));
        if (removed.size) {
          state.list = state.list.filter((c: any) => !removed.has(String(c?.id)));
        }
      })
      .addCase(bulkDeleteCashBoxes.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })
      .addCase(updateCashboxRole.fulfilled, (state, { payload }) => {
        const index = state.list.findIndex(
          (c: any) => String(c?.id) === String(payload?.id),
        );
        if (index !== -1) {
          state.list[index] = { ...state.list[index], role: payload.role };
        }
      })
      .addCase(updateCashboxRole.rejected, (state, { payload }) => {
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

export const { cashFlowRealtimeEventReceived, cashflowRequestsSettingUpdated } =
  cashSlice.actions;

export const useCash = () => useSelector((state: any) => state.cash);
export const useCashFlowRealtimeEvent = (): CashFlowRealtimeEvent =>
  useSelector((state: any) => state.cash.realtime);
/** true — ручные записи и правки движения требуют одобрения владельца. Default: false. */
export const useCashflowRequestsEnabled = (): boolean =>
  useSelector((state: any) => Boolean(state.cash.cashflowRequestsEnabled));
/** Число pending-заявок для бейджа пункта «Запросы» в сайдбаре. null, пока не загружено. */
export const usePendingCashflowsCount = (): number | null =>
  useSelector((state: any) => state.cash.pendingCount);
export default cashSlice.reducer;
