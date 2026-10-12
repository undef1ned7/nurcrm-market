import api from "@shared/api";

// ==================== ТОВАРЫ: простой CRUD для документов (3.4) ====================

/**
 * 3.4 Список товаров для выбора в документах
 * GET /api/warehouse/crud/products/
 * @param {Object} params - search (name/article/barcode), page
 */
export const listProducts = async (params: any = {}) => {
  try {
    const response = await api.get("warehouse/crud/products/", { params });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("List Products Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Получить товар по ID
 * @param {string} id - UUID товара
 */
export const getProductById = async (id: any) => {
  try {
    const response = await api.get(`warehouse/crud/products/${id}/`);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Get Product Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Создать товар
 * @param {Object} productData - Данные товара
 */
export const createProduct = async (productData: any) => {
  try {
    const response = await api.post("warehouse/crud/products/", productData);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Create Product Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Обновить товар
 * @param {string} id - UUID товара
 * @param {Object} productData - Данные товара
 */
export const updateProduct = async (id: any, productData: any) => {
  try {
    const response = await api.put(
      `warehouse/crud/products/${id}/`,
      productData
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Update Product Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Удалить товар
 * @param {string} id - UUID товара
 */
export const deleteProduct = async (id: any) => {
  try {
    const response = await api.delete(`warehouse/crud/products/${id}/`);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Delete Product Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

