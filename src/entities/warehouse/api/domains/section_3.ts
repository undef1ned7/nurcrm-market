import api from "@shared/api";

// ==================== ПАРТНЁРСТВО СКЛАДОВ МЕЖДУ КОМПАНИЯМИ ====================

/**
 * GET /api/warehouse/stock-partnership-requests/
 */
export const listStockPartnershipRequests = async () => {
  try {
    const response = await api.get("warehouse/stock-partnership-requests/");
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error(
        "List Stock Partnership Requests Error:",
        error.response.data,
      );
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * POST /api/warehouse/stock-partnership-requests/
 * @param {Object} payload - { to_company, note? }
 */
export const createStockPartnershipRequest = async (payload: any) => {
  try {
    const response = await api.post(
      "warehouse/stock-partnership-requests/",
      payload,
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error(
        "Create Stock Partnership Request Error:",
        error.response.data,
      );
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * POST /api/warehouse/stock-partnership-requests/{id}/accept/
 */
export const acceptStockPartnershipRequest = async (id: any) => {
  try {
    const response = await api.post(
      `warehouse/stock-partnership-requests/${id}/accept/`,
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error(
        "Accept Stock Partnership Request Error:",
        error.response.data,
      );
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * POST /api/warehouse/stock-partnership-requests/{id}/reject/
 */
export const rejectStockPartnershipRequest = async (id: any) => {
  try {
    const response = await api.post(
      `warehouse/stock-partnership-requests/${id}/reject/`,
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error(
        "Reject Stock Partnership Request Error:",
        error.response.data,
      );
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * POST /api/warehouse/stock-partnership-requests/{id}/cancel/
 */
export const cancelStockPartnershipRequest = async (id: any) => {
  try {
    const response = await api.post(
      `warehouse/stock-partnership-requests/${id}/cancel/`,
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error(
        "Cancel Stock Partnership Request Error:",
        error.response.data,
      );
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * GET /api/warehouse/stock-partnerships/active/
 */
export const listActiveStockPartners = async () => {
  try {
    const response = await api.get("warehouse/stock-partnerships/active/");
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("List Active Stock Partners Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * GET /api/warehouse/stock-partnerships/companies/{company_id}/catalog/
 */
export const getStockPartnerCatalog = async (companyId: any) => {
  try {
    const response = await api.get(
      `warehouse/stock-partnerships/companies/${companyId}/catalog/`,
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Get Stock Partner Catalog Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * POST /api/warehouse/stock-partnerships/transfer/
 * @param {Object} payload - { warehouse_from, warehouse_to, comment?, items[] }
 */
export const transferStockPartnership = async (payload: any) => {
  try {
    const response = await api.post(
      "warehouse/stock-partnerships/transfer/",
      payload,
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Stock Partnership Transfer Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * POST /api/warehouse/stock-partnerships/cash-incassations/
 * @param {Object} payload - { cash_register_from, cash_register_to, amount, comment? }
 */
export const createCashIncassation = async (payload: any) => {
  try {
    const response = await api.post(
      "warehouse/stock-partnerships/cash-incassations/",
      payload,
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Cash Incassation Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * GET /api/warehouse/stock-partnerships/cash-incassations/
 */
export const listCashIncassations = async () => {
  try {
    const response = await api.get(
      "warehouse/stock-partnerships/cash-incassations/",
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("List Cash Incassations Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

