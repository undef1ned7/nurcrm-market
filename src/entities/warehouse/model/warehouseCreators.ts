import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "@shared/api";

/* =================================================================== */
/*                              WAREHOUSES                              */
/* =================================================================== */

/**
 * Получение списка складов
 */
export const fetchWarehousesAsync = createAsyncThunk<any, void | any>(
  "warehouse/fetchAll",
  async (params: any = {}, { rejectWithValue }) => {
    try {
      const response = await api.get("/warehouse/", { params });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data || error?.message);
    }
  }
);

/**
 * Создание склада
 */
export const createWarehouseAsync = createAsyncThunk<any, void | any>(
  "warehouse/create",
  async (warehouseData: any, { rejectWithValue }) => {
    try {
      const response = await api.post("/warehouse/", warehouseData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data || error?.message);
    }
  }
);

/**
 * Обновление склада
 */
export const updateWarehouseAsync = createAsyncThunk<any, void | any>(
  "warehouse/update",
  async ({ warehouseId, updatedData }: any, { rejectWithValue }) => {
    try {
      const response = await api.patch(
        `/warehouse/${warehouseId}/`,
        updatedData
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data || error?.message);
    }
  }
);

/**
 * Удаление склада
 */
export const deleteWarehouseAsync = createAsyncThunk<any, void | any>(
  "warehouse/delete",
  async (warehouseId: any, { rejectWithValue }) => {
    try {
      await api.delete(`/warehouse/${warehouseId}/`);
      return warehouseId;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data || error?.message);
    }
  }
);

/* =================================================================== */
/*                         WAREHOUSE BRANDS                            */
/* =================================================================== */

export const fetchWarehouseBrandsAsync = createAsyncThunk<any, void | any>(
  "warehouseBrands/fetchAll",
  async (params: any = {}, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/warehouse/brands/", { params });
      return data;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data || error?.message);
    }
  }
);

export const createWarehouseBrandAsync = createAsyncThunk<any, void | any>(
  "warehouseBrands/create",
  async (data: any, { rejectWithValue }) => {
    try {
      const { data: response } = await api.post("/warehouse/brands/", data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data || error?.message);
    }
  }
);

export const updateWarehouseBrandAsync = createAsyncThunk<any, void | any>(
  "warehouseBrands/update",
  async ({ brandId, updatedData }: any, { rejectWithValue }) => {
    try {
      const { data } = await api.patch(
        `/warehouse/brands/${brandId}/`,
        updatedData
      );
      return data;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data || error?.message);
    }
  }
);

export const deleteWarehouseBrandAsync = createAsyncThunk<any, void | any>(
  "warehouseBrands/delete",
  async (brandId: any, { rejectWithValue }) => {
    try {
      await api.delete(`/warehouse/brands/${brandId}/`);
      return brandId;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data || error?.message);
    }
  }
);

export const bulkDeleteWarehouseBrandsAsync = createAsyncThunk<any, void | any>(
  "warehouseBrands/bulkDelete",
  async ({ ids, soft = true, require_all = false }: any, { rejectWithValue }) => {
    try {
      const { data } = await api.delete("/warehouse/brands/bulk-delete/", {
        data: { ids, soft, require_all },
      });
      return data;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data || error?.message);
    }
  }
);

/* =================================================================== */
/*                       WAREHOUSE CATEGORIES                           */
/* =================================================================== */

export const fetchWarehouseCategoriesAsync = createAsyncThunk<any, void | any>(
  "warehouseCategories/fetchAll",
  async (params: any = {}, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/warehouse/category/", { params });
      return data;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data || error?.message);
    }
  }
);

export const createWarehouseCategoryAsync = createAsyncThunk<any, void | any>(
  "warehouseCategories/create",
  async (data: any, { rejectWithValue }) => {
    try {
      const { data: response } = await api.post("/warehouse/category/", data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data || error?.message);
    }
  }
);

export const updateWarehouseCategoryAsync = createAsyncThunk<any, void | any>(
  "warehouseCategories/update",
  async ({ categoryId, updatedData }: any, { rejectWithValue }) => {
    try {
      const { data } = await api.patch(
        `/warehouse/category/${categoryId}/`,
        updatedData
      );
      return data;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data || error?.message);
    }
  }
);

export const deleteWarehouseCategoryAsync = createAsyncThunk<any, void | any>(
  "warehouseCategories/delete",
  async (categoryId: any, { rejectWithValue }) => {
    try {
      await api.delete(`/warehouse/category/${categoryId}/`);
      return categoryId;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data || error?.message);
    }
  }
);

export const bulkDeleteWarehouseCategoriesAsync = createAsyncThunk<any, void | any>(
  "warehouseCategories/bulkDelete",
  async ({ ids, soft = true, require_all = false }: any, { rejectWithValue }) => {
    try {
      const { data } = await api.delete("/warehouse/category/bulk-delete/", {
        data: { ids, soft, require_all },
      });
      return data;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data || error?.message);
    }
  }
);

/* =================================================================== */
/*                        WAREHOUSE PRODUCTS                           */
/* =================================================================== */

export const fetchWarehouseProductsAsync = createAsyncThunk<any, void | any>(
  "warehouseProducts/fetchAll",
  async ({ warehouseId, params = {} }: any, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/warehouse/${warehouseId}/products/`, {
        params,
      });
      return data;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data || error?.message);
    }
  }
);

/**
 * Остатки текущего агента склада
 * GET /api/warehouse/agents/me/products/
 * params: page, search, warehouse, product_group
 */
export const fetchAgentProductsAsync = createAsyncThunk<any, void | any>(
  "warehouseAgentProducts/fetchAll",
  async (params: any = {}, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/warehouse/agents/me/products/", {
        params,
      });
      return data;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data || error?.message);
    }
  }
);
