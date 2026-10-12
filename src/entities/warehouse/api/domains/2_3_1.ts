import api from "@shared/api";

// ==================== ГРУППЫ ТОВАРОВ СКЛАДА (2.3.1) ====================

/**
 * Список групп склада
 * GET /api/warehouse/{warehouse_uuid}/groups/
 */
export const listWarehouseGroups = async (warehouseUuid: any) => {
  try {
    const response = await api.get(`warehouse/${warehouseUuid}/groups/`);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("List Warehouse Groups Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Детали группы
 * GET /api/warehouse/{warehouse_uuid}/groups/{group_uuid}/
 */
export const getWarehouseGroup = async (warehouseUuid: any, groupUuid: any) => {
  try {
    const response = await api.get(
      `warehouse/${warehouseUuid}/groups/${groupUuid}/`
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Get Warehouse Group Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Создать группу
 * POST /api/warehouse/{warehouse_uuid}/groups/
 * @param {Object} payload - { name, parent?: uuid|null }
 */
export const createWarehouseGroup = async (warehouseUuid: any, payload: any) => {
  try {
    const response = await api.post(
      `warehouse/${warehouseUuid}/groups/`,
      payload
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Create Warehouse Group Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Обновить группу
 * PATCH/PUT /api/warehouse/{warehouse_uuid}/groups/{group_uuid}/
 */
export const updateWarehouseGroup = async (
  warehouseUuid,
  groupUuid,
  payload
) => {
  try {
    const response = await api.patch(
      `warehouse/${warehouseUuid}/groups/${groupUuid}/`,
      payload
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Update Warehouse Group Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Удалить группу
 * DELETE /api/warehouse/{warehouse_uuid}/groups/{group_uuid}/
 */
export const deleteWarehouseGroup = async (warehouseUuid: any, groupUuid: any) => {
  try {
    const response = await api.delete(
      `warehouse/${warehouseUuid}/groups/${groupUuid}/`
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Delete Warehouse Group Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

