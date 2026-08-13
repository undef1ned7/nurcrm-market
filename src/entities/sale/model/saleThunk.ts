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

// ===== POS продажи (товары) =====
export const startSale = createAsyncThunk<any, void | any>(
  "sale/start",
  async (args: any = {}, { rejectWithValue }) => {
    try {
      const payload = buildPosStartPayload(args);
      const { data } = await api.post("/main/pos/sales/start/", payload);
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

export const updateSale = createAsyncThunk<any, void | any>(
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

export const getSale = createAsyncThunk<any, void | any>(
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

export const manualFilling = createAsyncThunk<any, void | any>(
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

export const updateManualFilling = createAsyncThunk<any, void | any>(
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

export const deleteProductInCart = createAsyncThunk<any, void | any>(
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

export const deleteSale = createAsyncThunk<any, void | any>(
  "sale/deleteSale",
  async (id: any, { rejectWithValue }) => {
    try {
      await api.delete(`/main/pos/sales/${id}/`);
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  },
);

export const updateProductInCart = createAsyncThunk<any, void | any>(
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

export const sendBarCode = createAsyncThunk<any, void | any>(
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

export const doSearch = createAsyncThunk<any, void | any>(
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

export const historySellProduct = createAsyncThunk<any, void | any>(
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
export const fetchDocuments = createAsyncThunk<any, void | any>(
  "documents/fetchDocuments",
  async (params: any = {}, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/main/pos/sales/`, {
        params: {
          page: params.page || 1,
          search: params.search || "",
        },
      });
      return data; // Возвращаем полный объект с пагинацией
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  },
);

export const updateSellProduct = createAsyncThunk<any, void | any>(
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

export const historySellObjects = createAsyncThunk<any, void | any>(
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

export const historySellProductDetail = createAsyncThunk<any, void | any>(
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

export const returnSale = createAsyncThunk<any, void | any>(
  "products/returnSale",
  async ({ saleId, items, is_defect }: any, { rejectWithValue, getState }) => {
    try {
      const role = String((getState() as any)?.user?.profile?.role || "")
        .trim()
        .toLowerCase();
      const endpoint =
        role === "agent"
          ? `/main/agents/me/sales/${saleId}/return/`
          : `/main/pos/sales/${saleId}/return/`;
      const payload: any = {};
      if (Array.isArray(items) && items.length > 0) {
        payload.items = items;
      }
      if (is_defect === true) {
        payload.is_defect = true;
      }
      const { data } = await api.post(endpoint, payload);
      return data;
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  },
);

export const historySellObjectDetail = createAsyncThunk<any, void | any>(
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

export const productCheckout = createAsyncThunk<any, void | any>(
  "products/productCheckout",
  async (
    {
      id,
      bool,
      clientId,
      payment_method,
      cash_received,
      payments,
      consultant_id,
      consultant_commission_enabled,
      consultant_commission_percent,
      schedule_version,
      debt_schedule,
    },
    { rejectWithValue },
  ) => {
    try {
      const hasPayments = Array.isArray(payments) && payments.length > 0;
      const hasConsultant = Boolean(consultant_id);
      const payload = {
        print_receipt: bool,
        ...(clientId && { client_id: clientId }),
        ...(hasPayments ? { payments } : payment_method ? { payment_method } : {}),
        ...(cash_received != null && cash_received !== "" ? { cash_received } : {}),
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
      );
      return data;
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  },
);

export const getProductCheckout = createAsyncThunk<any, void | any>(
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

export const getProductInvoice = createAsyncThunk<any, void | any>(
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
export const getInvoiceJson = createAsyncThunk<any, void | any>(
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
export const getReceiptJson = createAsyncThunk<any, void | any>(
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
export const getObjects = createAsyncThunk<any, void | any>(
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

export const createObject = createAsyncThunk<any, void | any>(
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

export const startSellObjects = createAsyncThunk<any, void | any>(
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

export const objectCartAddItem = createAsyncThunk<any, void | any>(
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

export const addCustomItem = createAsyncThunk<any, void | any>(
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

export const createDeal = createAsyncThunk<any, void | any>(
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
