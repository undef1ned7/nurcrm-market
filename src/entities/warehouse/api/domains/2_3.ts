import api from "@shared/api";

// ==================== КАТЕГОРИИ (2.3) ====================

/**
 * GET /api/warehouse/category/
 * @param {Object} params - branch, page
 */
export const listCategories = async (params: any = {}) => {
  try {
    const response = await api.get("warehouse/category/", { params });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("List Categories Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

export const getCategoryById = async (uuid: any) => {
  try {
    const response = await api.get(`warehouse/category/${uuid}/`);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Get Category Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

export const createCategory = async (payload: any) => {
  try {
    const response = await api.post("warehouse/category/", payload);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Create Category Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

export const updateCategory = async (uuid: any, payload: any) => {
  try {
    const response = await api.patch(`warehouse/category/${uuid}/`, payload);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Update Category Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

export const deleteCategory = async (uuid: any) => {
  try {
    const response = await api.delete(`warehouse/category/${uuid}/`);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Delete Category Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

