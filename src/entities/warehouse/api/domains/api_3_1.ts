import api from "@shared/api";

// ==================== ТОВАРЫ: основной API (3.1) ====================

/**
 * 3.1 Список товаров по складу
 * GET /api/warehouse/{warehouse_uuid}/products/
 * @param {string} warehouseUuid - UUID склада
 * @param {Object} params - name, article, price_min, price_max, purchase_price_min, purchase_price_max, markup_min, markup_max, brand, category, warehouse, status, stock, page
 */
export const listWarehouseProducts = async (warehouseUuid: any, params: any = {}) => {
  try {
    const response = await api.get(`warehouse/${warehouseUuid}/products/`, {
      params,
    });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("List Warehouse Products Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Список товаров по всем складам компании (поиск для multi-warehouse продажи)
 * GET /api/warehouse/products/
 * @param {Object} params - search, page, page_size
 */
export const listCompanyProducts = async (params: any = {}) => {
  try {
    const response = await api.get("warehouse/products/", { params });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("List Company Products Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * 3.1 Создать товар на складе
 * POST /api/warehouse/{warehouse_uuid}/products/
 */
export const createProductInWarehouse = async (warehouseUuid: any, payload: any) => {
  try {
    const response = await api.post(
      `warehouse/${warehouseUuid}/products/`,
      payload
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Create Product In Warehouse Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * 3.1 Детали товара (глобально по uuid)
 * GET /api/warehouse/products/{product_uuid}/
 */
export const getProductByUuid = async (uuid: any) => {
  try {
    const response = await api.get(`warehouse/products/${uuid}/`);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Get Product By Uuid Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * 3.1 Обновить товар
 * PATCH/PUT /api/warehouse/products/{product_uuid}/
 */
export const updateProductByUuid = async (uuid: any, payload: any) => {
  try {
    const response = await api.patch(`warehouse/products/${uuid}/`, payload);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Update Product By Uuid Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * 3.1 Удалить товар
 * DELETE /api/warehouse/products/{product_uuid}/
 */
export const deleteProductByUuid = async (uuid: any) => {
  try {
    const response = await api.delete(`warehouse/products/${uuid}/`);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Delete Product By Uuid Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * 3.1.1 Скан штрихкода (поиск или создание товара)
 * POST /api/warehouse/{warehouse_uuid}/products/scan/
 * @param {string} warehouseUuid - UUID склада
 * @param {Object} payload - { barcode, name?, category? } — name и category обязательны при создании нового
 * @returns {{ created: boolean, scan_qty?: string|null, product: Object }}
 */
export const scanProduct = async (warehouseUuid: any, payload: any) => {
  try {
    const response = await api.post(
      `warehouse/${warehouseUuid}/products/scan/`,
      payload
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Scan Product Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

