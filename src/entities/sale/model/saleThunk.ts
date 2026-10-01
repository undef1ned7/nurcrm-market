import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "@shared/api";
import {
  buildPosStartPayload,
  getMainCartSaleId,
} from "@shared/lib/tools/posSaleCarts";
import {
  ruStatusToKind,
  toDecimalString,
} from "@shared/lib/tools/clientDeals";
import { handleThunkError } from "@shared/lib/handleThunkError";
import { serializeApiError } from "@shared/lib/tools/barcodeAmbiguity";
import {
  buildCashRoutingPayload,
  buildPosRoutingFromUser,
  type CashboxRole,
} from "@shared/lib/tools/cashboxResolution";
import { buildSaleReturnPayload } from "@shared/lib/tools/saleReturn";

// Типизируем только аргументы (не возвращаемое значение) ключевых thunk'ов —
// денежные/уже фигурировавшие в найденных багах (пропущенный shiftId в
// возврате, пропущенный sale_id в createDeal). Возврат оставлен `any`:
// у него сотни потребителей .payload по всему проекту, перетипизировать —
// отдельный, более рискованный шаг. См. docs/sale-flow-bugs.md, пункт 10,
// и docs/sale-flow-fixes/10-sale-flow-typing.md.
export type StartSaleArgs = {
  shift?: string | number | null;
  discount_total?: number;
  order_discount_total?: number;
  order_discount_percent?: number;
  is_new?: boolean;
  isNew?: boolean;
  sale_id?: string | number;
  saleId?: string | number;
  is_wholesale?: boolean;
  /** Идемпотентность создания корзины — см. docs/sale-flow-bugs.md, пункт 1. */
  idempotencyKey?: string;
  [key: string]: unknown;
};

export type ProductCheckoutArgs = {
  id: string | number;
  bool: boolean;
  clientId?: string | null;
  payment_method?: string | null;
  cash_received?: string | number | null;
  /**
   * Способ оплаты предоплаты при `payment_method: "debt"`: "cash" | банк | "transfer".
   * `cash_received` при долге — это сумма предоплаты, а не наличные; см.
   * docs/backend/kassa/debt-prepayment-method-backend.md.
   */
  prepayment_method?: string | null;
  payments?: { method: string; amount: string }[] | null;
  branch_id?: string | number | null;
  shift_id?: string | number | null;
  cashbox_role?: CashboxRole | null;
  consultant_id?: string | null;
  consultant_commission_enabled?: boolean;
  consultant_commission_percent?: string | number | null;
  schedule_version?: "v1" | "v2";
  debt_schedule?: unknown;
  /** Защита от двойной оплаты — см. docs/sale-flow-bugs.md, пункт 1. */
  idempotencyKey?: string;
};

export type ReturnSaleArgs = {
  saleId: string;
  items?: { sale_item_id: string | number; quantity: number }[];
  is_defect?: boolean;
  /** Открытая смена, оформляющая возврат — см. docs/sale-flow-bugs.md, пункт 5. */
  shiftId?: string | number | null;
  idempotencyKey?: string;
};

export type CreateDealArgs = {
  clientId: string;
  title: string;
  statusRu: string;
  amount: number | string;
  // number | string | "" — форма кассы может передать пустую строку вместо
  // undefined, код ниже это явно проверяет (`!== ""`), сохраняем как есть.
  debtDays?: number | string;
  debtMonths?: number | string;
  prepayment?: number | string;
  first_due_date?: string;
  intervalDays?: number | string;
  intervalMonths?: number | string;
  installments?: unknown[];
  scheduleVersion?: "v1" | "v2" | string;
  /** См. docs/sale-flow-bugs.md, пункт 9 — сейчас намеренно не шлём, бэк 400-ит. */
  saleId?: string | number;
  /** Защита от задвоения сделки при ретраях из очереди — см. docs/sale-flow-bugs.md, пункт 7. */
  idempotencyKey?: string;
};

export type ManualFillingArgs = {
  id: string | number;
  productId: string | number;
  // Опционально: часть вызывающего кода (легаси /crm/sell) не передаёт
  // quantity вовсе — бэк по умолчанию добавляет 1 шт.
  quantity?: number | string;
  discount_total?: number | string;
  salePackageId?: string | number | null;
};

export type UpdateProductInCartArgs = {
  id: string | number;
  productId: string | number;
  data: Record<string, unknown>;
};

export type DeleteProductInCartArgs = {
  id: string | number;
  productId: string | number;
};

export type SendBarCodeArgs = {
  barcode: string;
  id?: string | number;
  sale_id?: string | number | null;
  saleId?: string | number | null;
};

export type UpdateSaleArgs = { id: string | number; data: Record<string, unknown> };
export type GetSaleArgs = { id: string | number };
export type UpdateManualFillingArgs = {
  id: string | number;
  productId: string | number;
  discount_total?: number | string;
  quantity?: number | string;
  // Сам thunk это поле не шлёт на бэк (PATCH берёт только discount_total и
  // quantity), но его читает reducer в saleSlice.ts через meta.arg — нужно
  // в типе аргумента, а не в теле запроса.
  salePackageId?: string | number | null;
};
export type DeleteSaleArgs = string | number;

/** Параметры пагинации/поиска для GET /main/pos/sales/ и /main/object-sales/. */
export type SaleListParams = {
  page?: number;
  limit?: number;
  page_size?: number;
  search?: string;
  [key: string]: unknown;
};
export type UpdateSellProductArgs = { id: string | number; updatedData: Record<string, unknown> };
export type ByIdArg = string | number;
export type CreateObjectArgs = Record<string, unknown>;
export type StartSellObjectsArgs = {
  client?: string | number;
  status?: string;
  sold_at?: string;
  note?: string;
};
export type ObjectCartAddItemArgs = {
  id: string | number;
  product?: Record<string, unknown>;
  data?: Record<string, unknown>;
};
export type AddCustomItemArgs = {
  id: string | number;
  name: string;
  price: number | string;
  quantity?: number | string;
};

// ===== POS продажи (товары) =====
export const startSale = createAsyncThunk<any, StartSaleArgs | void>(
  "sale/start",
  async (args: any = {}, { rejectWithValue }) => {
    try {
      const { idempotencyKey, ...rest } = args ?? {};
      const payload = buildPosStartPayload(rest);
      // Защита от гонки при создании корзины с двух устройств на одну смену
      // (см. docs/sale-flow-bugs.md, пункт 1) — передаём только там, где
      // вызывающий код явно попросил (реальное создание новой корзины), не
      // на каждый фоновый refreshCartsFromStart().
      if (idempotencyKey) payload.idempotency_key = idempotencyKey;
      const { data } = await api.post(
        "/main/pos/sales/start/",
        payload,
        idempotencyKey
          ? { headers: { "Idempotency-Key": idempotencyKey } }
          : undefined,
      );
      return data;
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  },
  {
    // Защита от многократных параллельных вызовов startSale (частая причина пачки запросов при монтировании страницы)
    condition: (args: any, { getState }: any) => {
      const state: any = getState?.();
      // если уже идет startSale — пропускаем повторный dispatch
      if (state?.sale?.startSaleLoading) return false;
      return true;
    },
  },
);

export const updateSale = createAsyncThunk<any, UpdateSaleArgs>(
  "sale/update",
  async ({ id, data }: any, { rejectWithValue }) => {
    try {
      const { data: response } = await api.patch(
        `/main/pos/sales/${id}/`,
        data,
      );
      return response;
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  },
);

export const getSale = createAsyncThunk<any, GetSaleArgs>(
  "sale/getting",
  async ({ id }: any, { rejectWithValue }) => {
    try {
      const { data: response } = await api.get(`/main/pos/sales/${id}/`);
      return response;
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  },
);

export const manualFilling = createAsyncThunk<any, ManualFillingArgs>(
  "sale/manualFilling",
  async (
    { id, productId, quantity, discount_total, salePackageId },
    { rejectWithValue },
  ) => {
    try {
      const { data: response } = await api.post(
        `/main/pos/sales/${id}/add-item/`,
        {
          product_id: productId,
          quantity,
          discount_total,
          ...(salePackageId ? { sale_package_id: salePackageId } : {}),
        },
      );
      return response;
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  },
);

export const updateManualFilling = createAsyncThunk<any, UpdateManualFillingArgs>(
  "sale/updateManualFilling",
  async ({ id, productId, discount_total, quantity }: any, { rejectWithValue }) => {
    try {
      const { data: response } = await api.patch(
        `/main/pos/carts/${id}/items/${productId}/`,
        { discount_total, quantity },
      );
      return response;
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  },
);

export const deleteProductInCart = createAsyncThunk<any, DeleteProductInCartArgs>(
  "sale/deleteProductInCart",
  async ({ id, productId }: any, { rejectWithValue }) => {
    try {
      const { data } = await api.delete(
        `/main/pos/carts/${id}/items/${productId}/`,
      );
      return data;
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  },
);

export const deleteSale = createAsyncThunk<any, DeleteSaleArgs>(
  "sale/deleteSale",
  async (id: any, { rejectWithValue }) => {
    try {
      await api.delete(`/main/pos/sales/${id}/`);
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  },
);

export const updateProductInCart = createAsyncThunk<any, UpdateProductInCartArgs>(
  "sale/updateProductInCart",
  async ({ id, productId, data }: any, { rejectWithValue }) => {
    try {
      const { data: response } = await api.patch(
        `/main/pos/carts/${id}/items/${productId}/`,
        data,
      );
      return response;
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  },
);

export const sendBarCode = createAsyncThunk<any, SendBarCodeArgs>(
  "products/sendBarcode",
  async ({ barcode, id, sale_id, saleId }: any, { rejectWithValue, getState }: any) => {
    try {
      const state: any = getState?.()?.sale;
      const carts = state?.posCarts || [];
      const mainId = getMainCartSaleId(carts);
      const explicitSaleId = sale_id ?? saleId ?? null;
      const targetId =
        explicitSaleId ??
        state?.activeSaleId ??
        mainId ??
        id ??
        state?.start?.id;

      if (!targetId) {
        return rejectWithValue({ message: "Не выбрана корзина для сканирования" });
      }

      const body: any = { barcode };
      if (explicitSaleId) {
        body.sale_id = explicitSaleId;
      }

      const { data } = await api.post(
        `/main/pos/sales/${targetId}/scan/`,
        body,
      );
      return data;
    } catch (error: any) {
      return rejectWithValue(serializeApiError(error));
    }
  },
);

export const doSearch = createAsyncThunk<any, SaleListParams | void>(
  "products/doSearch",
  async (search: any, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/main/products/list/`, {
        params: search,
      });
      return data.results;
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  },
);

export const historySellProduct = createAsyncThunk<any, SaleListParams | void>(
  "products/historySellProduct",
  async (params: any = {}, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/main/pos/sales/`, {
        params: {
          ...params,
          page: params.page || 1,
          limit: params.limit ?? params.page_size ?? 100,
          search: params.search || "",
        },
      });
      return data; // Возвращаем полный объект с пагинацией
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  },
);

// Thunk для загрузки документов (чеков) с пагинацией
export const fetchDocuments = createAsyncThunk<any, SaleListParams | void>(
  "documents/fetchDocuments",
  async (params: any = {}, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/main/pos/sales/`, {
        params: {
          page: params.page || 1,
          page_size: params.page_size ?? 100,
          search: params.search || "",
        },
      });
      return data; // Возвращаем полный объект с пагинацией
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  },
);

export const updateSellProduct = createAsyncThunk<any, UpdateSellProductArgs>(
  "products/updateSellProduct",
  async ({ updatedData, id }: any, { rejectWithValue }) => {
    try {
      const { data: response } = await api.patch(
        `/main/pos/sales/${id}/`,
        updatedData,
      );
      return response;
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  },
);

export const historySellObjects = createAsyncThunk<any, SaleListParams | void>(
  "products/historySellObjects",
  async (params: any = {}, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/main/object-sales/`, {
        params: {
          ...params,
          page: params.page || 1,
          limit: params.limit ?? params.page_size ?? 100,
          search: params.search || "",
        },
      });
      return data; // Возвращаем полный объект с пагинацией
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  },
);

export const historySellProductDetail = createAsyncThunk<any, ByIdArg>(
  "products/historySellProductDetail",
  async (id: any, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/main/pos/sales/${id}/`);
      return data;
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  },
);

export const returnSale = createAsyncThunk<any, ReturnSaleArgs>(
  "products/returnSale",
  async (
    { saleId, items, is_defect, shiftId, idempotencyKey }: any,
    { rejectWithValue, getState },
  ) => {
    try {
      const state = getState() as any;
      const role = String(state?.user?.profile?.role || "")
        .trim()
        .toLowerCase();
      const isAgent = role === "agent";
      const endpoint = isAgent
        ? `/main/agents/me/sales/${saleId}/return/`
        : `/main/pos/sales/${saleId}/return/`;
      // Маршрутизация кассы для компенсирующего движения на бэке
      // (обратный expense к исходному pos_sale income). Для агентов не шлём —
      // у их endpoint своя маршрутизация. Старый бэк лишние поля игнорирует.
      // @see docs/backend/kassa/sale-return-cashflow-backend.md
      const routing = isAgent
        ? null
        : buildPosRoutingFromUser(
            state?.user?.profile,
            state?.user?.company,
            shiftId,
          );
      const payload = buildSaleReturnPayload({
        items,
        is_defect,
        isAgent,
        idempotencyKey,
        routing,
      });
      const { data } = await api.post(endpoint, payload);
      return data;
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  },
);

export const historySellObjectDetail = createAsyncThunk<any, ByIdArg>(
  "products/historySellObjectDetail",
  async (id: any, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/main/object-sales/${id}/`);
      return data;
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  },
);

export const productCheckout = createAsyncThunk<any, ProductCheckoutArgs>(
  "products/productCheckout",
  async (
    {
      id,
      bool,
      clientId,
      payment_method,
      cash_received,
      prepayment_method,
      payments,
      branch_id,
      shift_id,
      cashbox_role,
      consultant_id,
      consultant_commission_enabled,
      consultant_commission_percent,
      schedule_version,
      debt_schedule,
      idempotencyKey,
    },
    { rejectWithValue },
  ) => {
    try {
      const hasPayments = Array.isArray(payments) && payments.length > 0;
      const hasConsultant = Boolean(consultant_id);
      const payload = {
        print_receipt: bool,
        // Защита от двойной оплаты (веб+мобилка на одном аккаунте/смене
        // делят одну активную корзину — см. docs/sale-flow-bugs.md, пункт 1).
        // Бэк пока может не поддерживать дедупликацию по этому полю —
        // неизвестное extra-поле по конвенции проекта не должно давать 400.
        ...(idempotencyKey ? { idempotency_key: idempotencyKey } : {}),
        ...(clientId && { client_id: clientId }),
        ...(hasPayments ? { payments } : payment_method ? { payment_method } : {}),
        ...(cash_received != null && cash_received !== "" ? { cash_received } : {}),
        ...(prepayment_method ? { prepayment_method } : {}),
        ...buildCashRoutingPayload({ branch_id, cashbox_role, shift_id }),
        ...(hasConsultant
          ? {
              consultant_id,
              consultant_commission_enabled: Boolean(
                consultant_commission_enabled,
              ),
              consultant_commission_percent:
                consultant_commission_percent != null &&
                consultant_commission_percent !== ""
                  ? String(consultant_commission_percent)
                  : "0.00",
            }
          : {}),
        ...(schedule_version ? { schedule_version } : {}),
        ...(debt_schedule ? { debt_schedule } : {}),
      };
      const { data } = await api.post(
        `main/pos/sales/${id}/checkout/`,
        payload,
        idempotencyKey
          ? { headers: { "Idempotency-Key": idempotencyKey } }
          : undefined,
      );
      return data;
    } catch (error: any) {
      // 409 — бэк уже обрабатывает запрос с тем же Idempotency-Key (гонка
      // двух устройств на одну корзину). handleThunkError схлопывает ошибку
      // в строку и теряет статус — здесь перехватываем раньше, чтобы
      // usePaymentPage мог показать «подождите», а не обычную ошибку оплаты.
      if (error?.response?.status === 409) {
        return rejectWithValue({
          status: 409,
          message:
            error?.response?.data?.detail ||
            "Этот платёж уже обрабатывается — подождите и проверьте результат.",
        });
      }
      return handleThunkError(error, rejectWithValue);
    }
  },
);

export const getProductCheckout = createAsyncThunk<any, ByIdArg>(
  "products/getProductCheckout",
  async (id: any, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/main/pos/sales/${id}/receipt/`, {
        responseType: "blob",
      });
      return data;
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  },
);

export const getProductInvoice = createAsyncThunk<any, ByIdArg>(
  "products/getProductInvoice",
  async (id: any, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/main/sales/${id}/invoice/`, {
        responseType: "blob",
      });
      return data;
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  },
);

// Получение JSON данных накладной
export const getInvoiceJson = createAsyncThunk<any, ByIdArg>(
  "products/getInvoiceJson",
  async (id: any, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/main/sales/json/${id}/invoice/`);
      return data;
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  },
);

// Получение JSON данных чека
export const getReceiptJson = createAsyncThunk<any, ByIdArg>(
  "products/getReceiptJson",
  async (id: any, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/main/sales/json/${id}/receipt/`);
      return data;
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  },
);

// ===== Object sales (строительные объекты) =====
export const getObjects = createAsyncThunk<any, void>(
  "objects/get",
  async (_: any, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/main/object-items/`);
      return data.results;
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  },
);

export const createObject = createAsyncThunk<any, CreateObjectArgs>(
  "object/create",
  async (payload: any, { rejectWithValue }) => {
    try {
      const { data: response } = await api.post("/main/object-items/", payload);
      return response;
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  },
);

export const startSellObjects = createAsyncThunk<any, StartSellObjectsArgs>(
  "object/start",
  async (payload: any, { rejectWithValue }) => {
    try {
      // payload: { client, status, sold_at, note }
      const { data } = await api.post("/main/object-sales/", payload);
      return data;
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  },
);

export const objectCartAddItem = createAsyncThunk<any, ObjectCartAddItemArgs>(
  "object/addItem",
  async ({ id, product, data }: any, { rejectWithValue }) => {
    try {
      const body = product ?? data; // поддержка обоих вариантов
      const { data: response } = await api.post(
        `/main/object-sales/${id}/items/`,
        body,
      );
      return response;
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  },
);

export const addCustomItem = createAsyncThunk<any, AddCustomItemArgs>(
  "sale/addCustomItem",
  async ({ id, name, price, quantity }: any, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/main/pos/carts/${id}/custom-item/`, {
        name,
        price: toDecimalString(price),
        quantity: Number(quantity) || 1,
      });
      return data;
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  },
);

export const createDeal = createAsyncThunk<any, CreateDealArgs>(
  "deals/create",
  async (
    {
      clientId,
      title,
      statusRu,
      amount,
      debtDays,
      debtMonths,
      prepayment,
      first_due_date,
      intervalDays,
      intervalMonths,
      installments,
      scheduleVersion,
      saleId,
      idempotencyKey,
    },
    { rejectWithValue },
  ) => {
    try {
      const kind = ruStatusToKind(statusRu);

      // Базовый payload
      const payload: any = {
        title: String(title || "").trim(),
        kind, // enum: sale | debt | prepayment (или у тебя всё сведено к "debt")
        amount: toDecimalString(amount), // общая сумма сделки
        note: "",
        client: clientId,
        // Защита от задвоения сделки при ретраях из очереди
        // (docs/sale-flow-bugs.md, пункт 7) — неизвестное extra-поле по
        // конвенции проекта не должно давать 400.
        ...(idempotencyKey ? { idempotency_key: idempotencyKey } : {}),
      };

      if (kind === "debt") {
        const hasDays =
          debtDays !== undefined && debtDays !== null && debtDays !== "";
        const hasMonths =
          debtMonths !== undefined &&
          debtMonths !== null &&
          debtMonths !== "";

        if (hasDays) {
          const debtDaysNum = Number(debtDays);
          payload.debt_days = Number.isFinite(debtDaysNum)
            ? Math.max(1, Math.round(debtDaysNum))
            : 1;
        } else if (hasMonths) {
          const monthsNum = Number(debtMonths);
          payload.debt_months = Number.isFinite(monthsNum)
            ? Math.max(1, Math.round(monthsNum))
            : 1;
        }

        if (
          prepayment !== undefined &&
          prepayment !== null &&
          prepayment !== ""
        ) {
          const prepaymentNum = Number(prepayment);
          if (!Number.isNaN(prepaymentNum) && prepaymentNum >= 0) {
            payload.prepayment = toDecimalString(prepaymentNum);
          }
        }

        if (first_due_date) {
          payload.first_due_date = first_due_date;
        }

        if (intervalDays != null && intervalDays !== "") {
          const intervalNum = Number(intervalDays);
          if (Number.isFinite(intervalNum) && intervalNum >= 1) {
            payload.interval_days = Math.max(1, Math.round(intervalNum));
          }
        }

        if (intervalMonths != null && intervalMonths !== "") {
          const intervalNum = Number(intervalMonths);
          if (Number.isFinite(intervalNum) && intervalNum >= 1) {
            payload.interval_months = Math.max(1, Math.round(intervalNum));
          }
        }

        if (saleId != null && saleId !== "") {
          payload.sale_id = saleId;
        }

        if (Array.isArray(installments) && installments.length > 0) {
          payload.installments = installments;
        }

        if (scheduleVersion) {
          payload.schedule_version = scheduleVersion;
        }

        payload.auto_schedule = true;
      } else if (kind === "prepayment") {
        const prepaymentNum = Number(prepayment ?? amount);
        payload.prepayment = toDecimalString(
          Number.isFinite(prepaymentNum) ? prepaymentNum : 0,
        );
      }

      const { data } = await api.post(
        `/main/clients/${clientId}/deals/`,
        payload,
      );
      return data;
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  },
);
