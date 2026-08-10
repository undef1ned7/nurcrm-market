import api from "@shared/api";

// ==================== СКЛАДЫ ====================

/**
 * 2.1 Склады (полный CRUD) — список с фильтрами
 * GET /api/warehouse/
 * @param {Object} params - name (icontains), status (active|inactive), created_after, created_before, branch, page
 */
export const listWarehousesFull = async (params: any = {}) => {
  try {
    const response = await api.get("warehouse/", { params });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("List Warehouses Full Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * 2.1 Детали склада (полный CRUD)
 * GET /api/warehouse/{warehouse_uuid}/
 */
export const getWarehouseByUuid = async (uuid: any) => {
  try {
    const response = await api.get(`warehouse/${uuid}/`);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Get Warehouse By Uuid Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * 2.1 Создать склад
 * POST /api/warehouse/
 */
export const createWarehouseFull = async (payload: any) => {
  try {
    const response = await api.post("warehouse/", payload);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Create Warehouse Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * 2.1 Обновить склад
 * PATCH/PUT /api/warehouse/{warehouse_uuid}/
 */
export const updateWarehouseFull = async (uuid: any, payload: any) => {
  try {
    const response = await api.patch(`warehouse/${uuid}/`, payload);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Update Warehouse Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * 2.1 Удалить склад
 * DELETE /api/warehouse/{warehouse_uuid}/
 */
export const deleteWarehouseFull = async (uuid: any) => {
  try {
    const response = await api.delete(`warehouse/${uuid}/`);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Delete Warehouse Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * 3.5 Простой список складов (для селектов)
 * GET /api/warehouse/crud/warehouses/
 * @param {Object} params - branch, page
 */
export const listWarehouses = async (params: any = {}) => {
  try {
    const response = await api.get("warehouse/crud/warehouses/", { params });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("List Warehouses Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Получить склад по ID (crud, для селектов)
 * GET /api/warehouse/crud/warehouses/{id}/
 */
export const getWarehouseById = async (id: any) => {
  try {
    const response = await api.get(`warehouse/crud/warehouses/${id}/`);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Get Warehouse Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

