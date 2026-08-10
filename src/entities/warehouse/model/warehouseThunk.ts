import { createAsyncThunk } from "@reduxjs/toolkit";
import warehouseAPI from "@entities/warehouse/api/warehouse";
import {
  mergeCounterpartyLists,
  mergeCounterpartyPeriodAnalytics,
} from "@entities/counterparty/lib/utils";

/**
 * Thunks для работы с документами склада
 */

// Загрузка списка документов
export const fetchWarehouseDocuments = createAsyncThunk<any, void | any>(
  "warehouse/fetchDocuments",
  async (params: any = {}, { rejectWithValue }) => {
    try {
      const { doc_type, ...rest } = params;
      const data =
        doc_type === "COMMERCIAL_OFFER"
          ? await warehouseAPI.listCommercialOfferDocuments(rest)
          : await warehouseAPI.listDocuments(params);
      return data;
    } catch (error: any) {
      return rejectWithValue(error);
    }
  }
);

// Получение документа по ID
export const getWarehouseDocumentById = createAsyncThunk<any, void | any>(
  "warehouse/getDocumentById",
  async (id: any, { rejectWithValue }) => {
    try {
      const data = await warehouseAPI.getDocumentById(id);
      return data;
    } catch (error: any) {
      return rejectWithValue(error);
    }
  }
);

// Создание документа
export const createWarehouseDocument = createAsyncThunk<any, void | any>(
  "warehouse/createDocument",
  async (documentData: any, { rejectWithValue }) => {
    try {
      const data = await warehouseAPI.createDocument(documentData);
      return data;
    } catch (error: any) {
      return rejectWithValue(error);
    }
  }
);

// Обновление документа
export const updateWarehouseDocument = createAsyncThunk<any, void | any>(
  "warehouse/updateDocument",
  async ({ id, documentData }: any, { rejectWithValue }) => {
    try {
      const data = await warehouseAPI.updateDocument(id, documentData);
      return data;
    } catch (error: any) {
      return rejectWithValue(error);
    }
  }
);

// Частичное обновление документа
export const patchWarehouseDocument = createAsyncThunk<any, void | any>(
  "warehouse/patchDocument",
  async ({ id, documentData }: any, { rejectWithValue }) => {
    try {
      const data = await warehouseAPI.patchDocument(id, documentData);
      return data;
    } catch (error: any) {
      return rejectWithValue(error);
    }
  }
);

// Удаление документа
export const deleteWarehouseDocument = createAsyncThunk<any, void | any>(
  "warehouse/deleteDocument",
  async (id: any, { rejectWithValue }) => {
    try {
      await warehouseAPI.deleteDocument(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error);
    }
  }
);

// Проведение документа
export const postWarehouseDocument = createAsyncThunk<any, void | any>(
  "warehouse/postDocument",
  async ({ id, allowNegative }: any, { rejectWithValue }) => {
    try {
      const data = await warehouseAPI.postDocument(id, {
        allow_negative: allowNegative,
      });
      return data;
    } catch (error: any) {
      return rejectWithValue(error);
    }
  }
);

// Отмена проведения документа
export const unpostWarehouseDocument = createAsyncThunk<any, void | any>(
  "warehouse/unpostDocument",
  async (id: any, { rejectWithValue }) => {
    try {
      const data = await warehouseAPI.unpostDocument(id);
      return data;
    } catch (error: any) {
      return rejectWithValue(error);
    }
  }
);

// Подтвердить кассовый запрос (документ CASH_PENDING → POSTED)
export const cashApproveWarehouseDocument = createAsyncThunk<any, void | any>(
  "warehouse/cashApproveDocument",
  async ({ id, note }: any, { rejectWithValue }) => {
    try {
      const data = await warehouseAPI.cashDocumentApprove(
        id,
        note != null && note !== "" ? { note } : {} as any
      );
      return data;
    } catch (error: any) {
      return rejectWithValue(error);
    }
  }
);

// Отклонить кассовый запрос (склад откатывается, документ → REJECTED)
export const cashRejectWarehouseDocument = createAsyncThunk<any, void | any>(
  "warehouse/cashRejectDocument",
  async ({ id, note }: any, { rejectWithValue }) => {
    try {
      const data = await warehouseAPI.cashDocumentReject(
        id,
        note != null && note !== "" ? { note } : {} as any
      );
      return data;
    } catch (error: any) {
      return rejectWithValue(error);
    }
  }
);

// Загрузка товаров склада
export const fetchWarehouseProducts = createAsyncThunk<any, void | any>(
  "warehouse/fetchProducts",
  async (params: any = {}, { rejectWithValue }) => {
    try {
      const data = await warehouseAPI.listProducts(params);
      return data;
    } catch (error: any) {
      return rejectWithValue(error);
    }
  }
);

// Загрузка контрагентов
export const fetchWarehouseCounterparties = createAsyncThunk<any, void | any>(
  "warehouse/fetchCounterparties",
  async (params: any = {}, { rejectWithValue }) => {
    try {
      const { _periodRange, _counterpartyTypes, ...listParams } = params;
      const types = Array.isArray(_counterpartyTypes)
        ? _counterpartyTypes.filter(Boolean)
        : [] as any[];

      const fetchByTypes = async (queryParams: any, apiTypes: any) => {
        if (!apiTypes.length) {
          return warehouseAPI.listCounterparties(queryParams);
        }
        const { page: _page, ...rest } = queryParams;
        const payloads = await Promise.all(
          apiTypes.map((type) =>
            warehouseAPI.listCounterparties({
              ...rest,
              type,
              page_size: 500,
            })
          )
        );
        return mergeCounterpartyLists(...payloads);
      };

      const data = await fetchByTypes(listParams, types);

      const from = _periodRange?.from;
      const to = _periodRange?.to;
      if (!from || !to) return data;

      const periodData = await fetchByTypes(
        { period_start: from, period_end: to },
        types
      );
      return mergeCounterpartyPeriodAnalytics(data, periodData);
    } catch (error: any) {
      return rejectWithValue(error);
    }
  }
);

// Загрузка складов
export const fetchWarehouses = createAsyncThunk<any, void | any>(
  "warehouse/fetchWarehouses",
  async (params: any = {}, { rejectWithValue }) => {
    try {
      const data = await warehouseAPI.listWarehouses(params);
      return data;
    } catch (error: any) {
      return rejectWithValue(error);
    }
  }
);

// ==================== КОНТРАГЕНТЫ (CRUD) ====================

// Получение контрагента по ID
export const getWarehouseCounterpartyById = createAsyncThunk<any, void | any>(
  "warehouse/getCounterpartyById",
  async (id: any, { rejectWithValue }) => {
    try {
      const data = await warehouseAPI.getCounterpartyById(id);
      return data;
    } catch (error: any) {
      return rejectWithValue(error);
    }
  }
);

// Создание контрагента
export const createWarehouseCounterparty = createAsyncThunk<any, void | any>(
  "warehouse/createCounterparty",
  async (counterpartyData: any, { rejectWithValue }) => {
    try {
      const data = await warehouseAPI.createCounterparty(counterpartyData);
      return data;
    } catch (error: any) {
      return rejectWithValue(error);
    }
  }
);

// Обновление контрагента
export const updateWarehouseCounterparty = createAsyncThunk<any, void | any>(
  "warehouse/updateCounterparty",
  async ({ id, counterpartyData }: any, { rejectWithValue }) => {
    try {
      const data = await warehouseAPI.updateCounterparty(id, counterpartyData);
      return data;
    } catch (error: any) {
      return rejectWithValue(error);
    }
  }
);

// Удаление контрагента
export const deleteWarehouseCounterparty = createAsyncThunk<any, void | any>(
  "warehouse/deleteCounterparty",
  async (id: any, { rejectWithValue }) => {
    try {
      await warehouseAPI.deleteCounterparty(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error);
    }
  }
);

// Массовое удаление контрагентов
export const bulkDeleteWarehouseCounterparties = createAsyncThunk<any, void | any>(
  "warehouse/bulkDeleteCounterparties",
  async (ids: any, { rejectWithValue }) => {
    try {
      // Удаляем по одному (если API не поддерживает массовое удаление)
      const results = await Promise.allSettled(
        ids.map((id) => warehouseAPI.deleteCounterparty(id))
      );
      const failed = results
        .map((result, index) => (result.status === "rejected" ? ids[index] : null))
        .filter(Boolean);
      if (failed.length > 0) {
        return rejectWithValue({ failed });
      }
      return ids;
    } catch (error: any) {
      return rejectWithValue(error);
    }
  }
);

// ==================== ПРОДАЖА ПО ЗАЯВКЕ АГЕНТА ====================

/**
 * Создать документ продажи по одобренной заявке агента
 * POST /api/warehouse/agent-carts/{id}/create-sale/
 * Возвращает созданный документ (Document).
 */
export const createSaleFromAgentCartAsync = createAsyncThunk<any, void | any>(
  "warehouse/createSaleFromAgentCart",
  async ({ cartId, payload }: any, { rejectWithValue }) => {
    try {
      const document = await warehouseAPI.createSaleFromCart(cartId, payload);
      return document;
    } catch (error: any) {
      return rejectWithValue(error);
    }
  }
);


