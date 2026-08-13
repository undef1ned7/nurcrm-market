import api from "@shared/api";

export const fetchProductsApi = async (params: any = {}) => {
  try {
    // Убираем служебные параметры из запроса
    const {
      warehouse,
      _cacheKey,
      _skipLoadingIfCached,
      ...restParams
    } = params;
    let url = "main/products/list/";

    if (warehouse) {
      url = `warehouse/${warehouse}/products/`;
    }

    const response = await api.get(url, { params: restParams });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Fetch Products Error Data:", error.response.data);
      console.error("Fetch Products Error Status:", error.response.status);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

export const getBrandsPorduct = async (_params: any = {}) => {
  try {
    const response = await api.get("main/brands/");
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Fetch Products Error Data:", error.response.data);
      console.error("Fetch Products Error Status:", error.response.status);
      return Promise.reject(error.response.data);
    }
  }
};

export const getCategoriesPorduct = async (_params: any = {}) => {
  try {
    const response = await api.get("main/categories/");
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Fetch Products Error Data:", error.response.data);
      console.error("Fetch Products Error Status:", error.response.status);
      return Promise.reject(error.response.data);
    }
  }
};

export const createProductApi = async (productData: any) => {
  try {
    const response = await api.post(
      "main/products/create-manual/",
      productData
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Create Product Error Data:", error.response.data);
      console.error("Create Product Error Status:", error.response.status);
      return Promise.reject(error);
    }
    return Promise.reject(error);
  }
};

export const updateProductApi = async (productId: any, productData: any) => {
  try {
    const response = await api.patch(
      `main/products/${productId}/`,
      productData
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error(
        `Update Product (ID: ${productId}) Error Data:`,
        error.response.data
      );
      console.error(
        `Update Product (ID: ${productId}) Error Status:`,
        error.response.status
      );
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Массовое изменение бренда / категории / поставщика у выбранных товаров.
 * См. docs/backend/bulk_update_products.md
 * payload: { ids: [uuid], brand?, category?, client?, require_all? }
 */
export const bulkUpdateProductsApi = async (payload: any) => {
  try {
    const response = await api.patch("main/products/bulk-update/", payload);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Bulk Update Products Error Data:", error.response.data);
      console.error("Bulk Update Products Error Status:", error.response.status);
      return Promise.reject(error.response);
    }
    return Promise.reject(error);
  }
};

export const deleteProductApi = async (productId: any) => {
  try {
    await api.delete(`main/products/${productId}/`);
  } catch (error: any) {
    if (error.response) {
      console.error(
        `Delete Product (ID: ${productId}) Error Data:`,
        error.response.data
      );
      console.error(
        `Delete Product (ID: ${productId}) Error Status:`,
        error.response.status
      );
      return Promise.reject(error.response.data);
    }
  }
};

export const fetchBrands = async (params: any = {}) =>
  (await api.get("main/brands/", { params })).data;

export const createBrand = async (data: any) =>
  (await api.post("main/brands/", data)).data;

export const updateBrand = async (id: any, data: any) =>
  (await api.patch(`main/brands/${id}/`, data)).data;

export const deleteBrand = async (id: any) =>
  (await api.delete(`main/brands/${id}/`)).data;

// ---------- Categories ----------
export const fetchCategories = async (params: any = {}) =>
  (await api.get("main/categories/", { params })).data;

export const createCategory = async (data: any) =>
  (await api.post("main/categories/", data)).data;

export const updateCategory = async (id: any, data: any) =>
  (await api.patch(`main/categories/${id}/`, data)).data;

export const deleteCategory = async (id: any) =>
  (await api.delete(`main/categories/${id}/`)).data;

// ---------- Agents ----------
export const fetchAgentProductsApi = async (params: any = {}) => {
  try {
    const response = await api.get("main/agents/me/products/", { params });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Fetch Agent Products Error Data:", error.response.data);
      console.error(
        "Fetch Agent Products Error Status:",
        error.response.status
      );
      return Promise.reject(error.response.data);
    }
  }
};

// История товаров для сотрудника
export const fetchProductHistoryApi = async (_params: any = {}) => {
  try {
    // Загружаем все данные без параметров, так как сервер не поддерживает фильтрацию и пагинацию
    const response = await api.get("/main/products/list/");
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Fetch Product History Error Data:", error.response.data);
      console.error(
        "Fetch Product History Error Status:",
        error.response.status
      );
      return Promise.reject(error.response.data);
    }
  }
};

/** Склад маркета: поиск товара по штрихкоду без POS (см. docs/new_mark.md). */
export const lookupWarehouseProductByBarcodeApi = async (barcode: any, params: any = {}) => {
  const encoded = encodeURIComponent(String(barcode || "").trim());
  if (!encoded) {
    return Promise.reject(new Error("Пустой штрихкод"));
  }
  try {
    const response = await api.get(
      `main/products/warehouse-barcode/${encoded}/`,
      { params },
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      return Promise.reject(error.response);
    }
    return Promise.reject(error);
  }
};

// Получение товара по штрих-коду (глобальный каталог / касса)
export const getProductByBarcodeApi = async (barcode: any) => {
  try {
    const encoded = encodeURIComponent(String(barcode || "").trim());
    const response = await api.get(`main/products/global-barcode/${encoded}/`);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Get Product By Barcode Error Data:", error.response.data);
      console.error(
        "Get Product By Barcode Error Status:",
        error.response.status
      );
      return Promise.reject(error.response);
    }
    return Promise.reject(error);
  }
};

// Добавление товара в склад с количеством
export const addProductToWarehouseApi = async (productData: any) => {
  try {
    const response = await api.post(
      "main/products/add-to-warehouse/",
      productData
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error(
        "Add Product To Warehouse Error Data:",
        error.response.data
      );
      console.error(
        "Add Product To Warehouse Error Status:",
        error.response.status
      );
      return Promise.reject(error.response.data);
    }
  }
};
