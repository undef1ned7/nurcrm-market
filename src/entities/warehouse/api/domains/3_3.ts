import api from "@shared/api";

// ==================== УПАКОВКИ ТОВАРА (3.3) ====================

/**
 * GET /api/warehouse/products/{product_uuid}/packages/
 */
export const listProductPackages = async (productUuid: any) => {
  try {
    const response = await api.get(
      `warehouse/products/${productUuid}/packages/`
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("List Product Packages Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * POST /api/warehouse/products/{product_uuid}/packages/
 * quantity_in_package > 0
 */
export const createProductPackage = async (productUuid: any, payload: any) => {
  try {
    const response = await api.post(
      `warehouse/products/${productUuid}/packages/`,
      payload
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Create Product Package Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

export const getProductPackage = async (productUuid: any, packageUuid: any) => {
  try {
    const response = await api.get(
      `warehouse/products/${productUuid}/packages/${packageUuid}/`
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Get Product Package Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

export const updateProductPackage = async (
  productUuid,
  packageUuid,
  payload
) => {
  try {
    const response = await api.patch(
      `warehouse/products/${productUuid}/packages/${packageUuid}/`,
      payload
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Update Product Package Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

export const deleteProductPackage = async (productUuid: any, packageUuid: any) => {
  try {
    const response = await api.delete(
      `warehouse/products/${productUuid}/packages/${packageUuid}/`
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Delete Product Package Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

