import api from "@shared/api";

// ==================== ФОТО ТОВАРА (3.2) ====================

/**
 * GET /api/warehouse/products/{product_uuid}/images/
 */
export const listProductImages = async (productUuid: any) => {
  try {
    const response = await api.get(
      `warehouse/products/${productUuid}/images/`
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("List Product Images Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * POST /api/warehouse/products/{product_uuid}/images/
 * Content-Type: multipart/form-data, поле image (обязательно), опционально alt, is_primary
 */
export const createProductImage = async (productUuid: any, formData: any) => {
  try {
    const response = await api.post(
      `warehouse/products/${productUuid}/images/`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Create Product Image Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * GET/PATCH/PUT/DELETE /api/warehouse/products/{product_uuid}/images/{image_uuid}/
 */
export const getProductImage = async (productUuid: any, imageUuid: any) => {
  try {
    const response = await api.get(
      `warehouse/products/${productUuid}/images/${imageUuid}/`
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Get Product Image Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

export const updateProductImage = async (productUuid: any, imageUuid: any, formData: any) => {
  try {
    const response = await api.patch(
      `warehouse/products/${productUuid}/images/${imageUuid}/`,
      formData,
      formData instanceof FormData
        ? { headers: { "Content-Type": "multipart/form-data" } }
        : {} as any
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Update Product Image Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

export const deleteProductImage = async (productUuid: any, imageUuid: any) => {
  try {
    const response = await api.delete(
      `warehouse/products/${productUuid}/images/${imageUuid}/`
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Delete Product Image Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

