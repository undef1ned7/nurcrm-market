import api from "@shared/api";

// ==================== АГЕНТЫ: ПОЗИЦИИ ЗАЯВКИ (ITEMS) ====================

/**
 * 6.2 Позиции заявки
 * GET /api/warehouse/agent-cart-items/?cart={uuid}
 */
export const listAgentCartItems = async (params: any = {}) => {
  try {
    const response = await api.get("warehouse/agent-cart-items/", { params });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("List Agent Cart Items Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * POST /api/warehouse/agent-cart-items/
 */
export const createAgentCartItem = async (payload: any) => {
  try {
    const response = await api.post("warehouse/agent-cart-items/", payload);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Create Agent Cart Item Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * GET /api/warehouse/agent-cart-items/{id}/
 */
export const getAgentCartItemById = async (id: any) => {
  try {
    const response = await api.get(`warehouse/agent-cart-items/${id}/`);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Get Agent Cart Item Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * PUT /api/warehouse/agent-cart-items/{id}/
 */
export const updateAgentCartItem = async (id: any, payload: any) => {
  try {
    const response = await api.put(`warehouse/agent-cart-items/${id}/`, payload);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Update Agent Cart Item Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * PATCH /api/warehouse/agent-cart-items/{id}/
 */
export const patchAgentCartItem = async (id: any, payload: any) => {
  try {
    const response = await api.patch(
      `warehouse/agent-cart-items/${id}/`,
      payload
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Patch Agent Cart Item Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * DELETE /api/warehouse/agent-cart-items/{id}/
 */
export const deleteAgentCartItem = async (id: any) => {
  try {
    const response = await api.delete(`warehouse/agent-cart-items/${id}/`);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Delete Agent Cart Item Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

