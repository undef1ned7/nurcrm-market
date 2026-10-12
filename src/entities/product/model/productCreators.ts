// src/store/creators/productCreators.js
import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "@shared/api";

/* Если у тебя есть разделённые API-helpers (../../api/products),
   можешь оставить эти импорты. Если нет — можно удалить. */
import {
  fetchProductsApi,
  createProductApi,
  updateProductApi,
  deleteProductApi,
  bulkUpdateProductsApi, // PATCH /main/products/bulk-update/
  fetchBrands, // GET /main/brands/
  createBrand as createBrandApi,
  updateBrand as updateBrandApi,
  deleteBrand as deleteBrandApi,
  fetchCategories, // GET /main/categories/
  createCategory as createCategoryApi,
  updateCategory as updateCategoryApi,
  deleteCategory as deleteCategoryApi,
  fetchAgentProductsApi, // GET /main/agents/me/products/
  fetchProductHistoryApi, // GET /main/warehouse/history/
  getProductByBarcodeApi, // GET /main/products/barcode/{barcode}/
  addProductToWarehouseApi, // POST /main/products/add-to-warehouse/
} from "@entities/product/api/products";
import { handleThunkError } from "@shared/lib/handleThunkError";

/* =================================================================== */
/*                               PRODUCTS                              */
/* =================================================================== */

export const fetchProductsAsync = createAsyncThunk<any, void | any>(
  "products/fetchAll",
  async (params: any = {}, { rejectWithValue }) => {
    try {
      // если нет helpers — замени на api.get("/main/products/", { params })
      return await fetchProductsApi(params);
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);

export const createProductAsync = createAsyncThunk<any, void | any>(
  "products/create",
  async (data: any, { rejectWithValue }) => {
    try {
      // если нет helpers — замени на (await api.post("/main/products/", data)).data
      return await createProductApi(data);
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);

export const updateProductAsync = createAsyncThunk<any, void | any>(
  "products/update",
  async ({ productId, updatedData }: any, { rejectWithValue }) => {
    try {
      // если нет helpers — (await api.patch(`/main/products/${productId}/`, updatedData)).data
      return await updateProductApi(productId, updatedData);
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);

export const deleteProductAsync = createAsyncThunk<any, void | any>(
  "products/delete",
  async (productId: any, { rejectWithValue }) => {
    try {
      // если нет helpers — await api.delete(`/main/products/${productId}/`)
      await deleteProductApi(productId);
      return productId;
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);

/* bulk-delete */
export const bulkDeleteProductsAsync = createAsyncThunk<any, void | any>(
  "products/bulkDelete",
  async ({ ids, soft = true, require_all = false }: any, { rejectWithValue }) => {
    try {
      const { data } = await api.delete("/main/products/bulk-delete/", {
        data: { ids, soft, require_all },
      });
      return data;
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);

/* bulk-update: массовая смена бренда / категории / поставщика */
export const bulkUpdateProductsAsync = createAsyncThunk<any, void | any>(
  "products/bulkUpdate",
  async (
    { ids, brand_name, category_name, client, require_all = false }: any,
    { rejectWithValue }: any
  ) => {
    // В payload попадают только реально выбранные для изменения поля
    const changes: any = {};
    if (brand_name !== undefined) changes.brand_name = brand_name;
    if (category_name !== undefined) changes.category_name = category_name;
    if (client !== undefined) changes.client = client;

    try {
      return await bulkUpdateProductsApi({ ids, ...changes, require_all });
    } catch (error: any) {
      // Пока бэкенд не поднял /bulk-update/ — падаем на последовательный PATCH
      const status = error?.status ?? error?.response?.status;
      if (status === 404 || status === 405) {
        const results = await Promise.allSettled(
          ids.map((id) => updateProductApi(id, changes))
        );
        const failed = results.filter((r) => r.status === "rejected");
        if (failed.length === ids.length) {
          return handleThunkError(failed[0]?.reason ?? error, rejectWithValue);
        }
        return {
          updated: ids.length - failed.length,
          failed: failed.length,
          ids,
        };
      }
      return handleThunkError(error, rejectWithValue);
    }
  }
);

/* =================================================================== */
/*                                BRANDS                               */
/* =================================================================== */

export const fetchBrandsAsync = createAsyncThunk<any, void | any>(
  "brand/fetchAll",
  async (params: any = {}, { rejectWithValue }) => {
    try {
      // append — служебный флаг для slice (догрузка страницы), в API не уходит
      const query = { ...params };
      delete query.append;
      return await fetchBrands(query);
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);

export const createBrandAsync = createAsyncThunk<any, void | any>(
  "brand/create",
  async (data: any, { rejectWithValue }) => {
    try {
      return await createBrandApi(data);
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);

export const updateBrandAsync = createAsyncThunk<any, void | any>(
  "brand/update",
  async ({ brandId, updatedData }: any, { rejectWithValue }) => {
    try {
      return await updateBrandApi(brandId, updatedData);
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);

export const deleteBrandAsync = createAsyncThunk<any, void | any>(
  "brand/delete",
  async (brandId: any, { rejectWithValue }) => {
    try {
      await deleteBrandApi(brandId);
      return brandId;
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);

/* =================================================================== */
/*                              CATEGORIES                             */
/* =================================================================== */

export const fetchCategoriesAsync = createAsyncThunk<any, void | any>(
  "category/fetchAll",
  async (params: any = {}, { rejectWithValue }) => {
    try {
      // append — служебный флаг для slice (догрузка страницы), в API не уходит
      const query = { ...params };
      delete query.append;
      return await fetchCategories(query);
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);

export const createCategoryAsync = createAsyncThunk<any, void | any>(
  "category/create",
  async (data: any, { rejectWithValue }) => {
    try {
      return await createCategoryApi(data);
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);

export const updateCategoryAsync = createAsyncThunk<any, void | any>(
  "category/update",
  async ({ categoryId, updatedData }: any, { rejectWithValue }) => {
    try {
      return await updateCategoryApi(categoryId, updatedData);
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);

export const deleteCategoryAsync = createAsyncThunk<any, void | any>(
  "category/delete",
  async (categoryId: any, { rejectWithValue }) => {
    try {
      await deleteCategoryApi(categoryId);
      return categoryId;
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);

/* =================================================================== */
/*                              ITEMS MAKE                             */
/* =================================================================== */

import {
  buildItemMakeCreatePayload,
  buildItemMakePurchasePayload,
  buildItemMakeUpdatePayload,
  buildProcessPayload,
  parseItemsMakeResponse,
  toDecimal3,
} from "@shared/ui/legacy-production/itemMakeHelpers";

// список сырья (params: kind, search, unit, ordering)
export const getItemsMake = createAsyncThunk<any, void | any>(
  "itemsMake/fetchAll",
  async (params: any = {}, { rejectWithValue }) => {
    try {
      const query: any = {};
      if (params.kind) query.kind = params.kind;
      if (params.search) query.search = params.search;
      if (params.unit) query.unit = params.unit;
      if (params.ordering) query.ordering = params.ordering;
      if (params.for_recipe != null && params.for_recipe !== "")
        query.for_recipe = params.for_recipe;
      if (params.needs_processing != null && params.needs_processing !== "")
        query.needs_processing = params.needs_processing;
      const { data } = await api.get("/main/items-make/", {
        params: Object.keys(query).length ? query : undefined,
      });
      return parseItemsMakeResponse(data);
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);

// сырьё для рецепта: processed + raw без needs_processing (for_recipe=1)
export const getProcessedItemsMake = createAsyncThunk<any, void | any>(
  "itemsMake/fetchProcessed",
  async (_: any, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/main/items-make/", {
        params: { for_recipe: 1 },
      });
      return parseItemsMakeResponse(data);
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);

/** Очередь на обработку: kind=raw & needs_processing=true */
export const getProcessingQueueItemsMake = createAsyncThunk<any, void | any>(
  "itemsMake/fetchProcessingQueue",
  async (_: any, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/main/items-make/", {
        params: { kind: "raw", needs_processing: true },
      });
      return parseItemsMakeResponse(data);
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);

// обработка сырья: POST /items-make/{id}/process/
export const processItemMake = createAsyncThunk<any, void | any>(
  "itemsMake/process",
  async ({ id, ...form }: any, { rejectWithValue, dispatch }) => {
    try {
      const { data } = await api.post(
        `/main/items-make/${id}/process/`,
        buildProcessPayload(form)
      );
      try {
        await dispatch(getProcessedItemsMake(undefined)).unwrap();
      } catch (_: any) {}
      return data;
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);

export const updateItemsMake = createAsyncThunk<any, void | any>(
  "itemsMake/updateItem",
  async ({ id, updatedData }: any, { rejectWithValue }) => {
    try {
      const payload =
        updatedData && typeof updatedData === "object"
          ? buildItemMakeUpdatePayload(updatedData)
          : updatedData;
      const { data: response } = await api.patch(
        `/main/items-make/${id}/`,
        payload
      );
      return response;
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);

export const deleteItemsMake = createAsyncThunk<any, void | any>(
  "itemsMake/deleteItem",
  async (id: any, { rejectWithValue }) => {
    try {
      const { data: response } = await api.delete(`/main/items-make/${id}/`);
      return response;
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);

// докупка сырья: увеличивает остаток, пишет запись в историю закупок поставщика
export const purchaseItemMake = createAsyncThunk<any, void | any>(
  "itemsMake/purchase",
  async ({ id, ...form }: any, { rejectWithValue }) => {
    try {
      const { data } = await api.post(
        `/main/items-make/${id}/purchase/`,
        buildItemMakePurchasePayload(form)
      );
      return data;
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);

// создание сырья (всегда kind=raw)
export const createItemMake = createAsyncThunk<any, void | any>(
  "itemsMake/create",
  async (item: any, { rejectWithValue }) => {
    try {
      const { data } = await api.post(
        "/main/items-make/",
        buildItemMakeCreatePayload(item)
      );
      return data;
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);

// точечная установка quantity (для отладки/ручных кейсов)
export const setItemMakeQuantity = createAsyncThunk<any, void | any>(
  "itemsMake/setQuantity",
  async ({ id, quantity }: any, { rejectWithValue, dispatch }) => {
    try {
      if (!id) throw new Error("id is required");
      // API: не более 3 знаков после запятой
      const { data } = await api.patch(`/main/items-make/${id}/`, {
        quantity: toDecimal3(quantity),
      });
      // рефреш списка после удачного PATCH
      try {
        await dispatch(getItemsMake(undefined)).unwrap();
      } catch (_: any) {}
      return data;
    } catch (error: any) {
      console.error("setItemMakeQuantity error:", error);
      return handleThunkError(error, rejectWithValue);
    }
  }
);

// «умное» списание сырья по рецепту: recipe=[{id, qty_per_unit}], units=шт готового товара
export const consumeItemsMake = createAsyncThunk<any, void | any>(
  "itemsMake/consume",
  async ({ recipe, units }: any, { rejectWithValue, dispatch }) => {
    try {
      if (!Array.isArray(recipe) || !recipe.length || !units) return [];

      const results: any[] = [];
      const round3 = (v) => Math.round(Number(v) * 1000) / 1000;
      for (const r of recipe) {
        const id = String(r.id);
        const perUnit = round3(r.qty_per_unit || 0);
        if (!id || perUnit <= 0) continue;

        // 1) GET актуального остатка
        const currentRes = await api.get(`/main/items-make/${id}/`);
        const current = Number(currentRes?.data?.quantity ?? 0);

        // 2) Счёт нового остатка; API: не более 3 знаков после запятой
        const delta = perUnit * Number(units);
        const newQty = Math.max(0, Math.round((current - delta) * 1000) / 1000);

        // 3) PATCH на бэк
        const { data } = await api.patch(`/main/items-make/${id}/`, {
          quantity: newQty,
        });
        results.push(data);
      }

      // 4) Рефреш списка сырья
      try {
        await dispatch(getItemsMake(undefined)).unwrap();
      } catch (_: any) {}

      return results;
    } catch (error: any) {
      console.error("consumeItemsMake error:", error);
      return handleThunkError(error, rejectWithValue);
    }
  }
);

/* =================================================================== */
/*                          ПРОЧИЕ ПРИМЕРЫ (Касса)                    */
/* =================================================================== */

export const createKassa = createAsyncThunk<any, void | any>(
  "kassa/create",
  async (data: any, { rejectWithValue }) => {
    try {
      const { data: response } = await api.post(
        "/construction/cashboxes/",
        data
      );
      return response;
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);

export const createProductWithBarcode = createAsyncThunk<any, void | any>(
  "products/createByBarcode",
  async (barcode: any, { rejectWithValue }) => {
    try {
      const { data } = await api.post(
        "/main/products/create-by-barcode/",
        barcode
      );
      return data;
    } catch (e: any) {
      return handleThunkError(e, rejectWithValue);
    }
  }
);

/** Сканирование товара по штрих-коду в контексте склада (сфера склад). */
export const scanWarehouseProductAsync = createAsyncThunk<any, void | any>(
  "products/scanWarehouse",
  async ({ warehouse_uuid, ...payload }: any, { rejectWithValue }) => {
    try {
      const { data } = await api.post(
        `/warehouse/${warehouse_uuid}/products/scan/`,
        payload
      );
      return data;
    } catch (e: any) {
      return handleThunkError(e, rejectWithValue);
    }
  }
);

/* =================================================================== */
/*                              AGENTS                                */
/* =================================================================== */

export const fetchAgentProductsAsync = createAsyncThunk<any, void | any>(
  "agentProducts/fetchAll",
  async (params: any = {}, { rejectWithValue }) => {
    try {
      return await fetchAgentProductsApi(params);
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);

// История товаров для сотрудника
export const fetchProductHistoryAsync = createAsyncThunk<any, void | any>(
  "products/fetchHistory",
  async (params: any = {}, { rejectWithValue }) => {
    try {
      return await fetchProductHistoryApi(params);
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);

// Получение товара по штрих-коду
export const getProductByBarcodeAsync = createAsyncThunk<any, void | any>(
  "products/getByBarcode",
  async (barcode: any, { rejectWithValue }) => {
    try {
      return await getProductByBarcodeApi(barcode);
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);

// Добавление товара в склад с количеством
export const addProductToWarehouseAsync = createAsyncThunk<any, void | any>(
  "products/addToWarehouse",
  async (productData: any, { rejectWithValue }) => {
    try {
      return await addProductToWarehouseApi(productData);
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);
