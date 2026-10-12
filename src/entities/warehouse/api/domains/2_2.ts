import api from "@shared/api";

// ==================== БРЕНДЫ (2.2) ====================

/**
 * GET /api/warehouse/brands/
 * @param {Object} params - name (icontains), branch, page
 */
export const listBrands = async (params: any = {}) => {
  try {
    const response = await api.get("warehouse/brands/", { params });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("List Brands Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

export const getBrandById = async (uuid: any) => {
  try {
    const response = await api.get(`warehouse/brands/${uuid}/`);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Get Brand Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

export const createBrand = async (payload: any) => {
  try {
    const response = await api.post("warehouse/brands/", payload);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Create Brand Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

export const updateBrand = async (uuid: any, payload: any) => {
  try {
    const response = await api.patch(`warehouse/brands/${uuid}/`, payload);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Update Brand Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

export const deleteBrand = async (uuid: any) => {
  try {
    const response = await api.delete(`warehouse/brands/${uuid}/`);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Delete Brand Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

