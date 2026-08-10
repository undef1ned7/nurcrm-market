import api from "@shared/api";

// ==================== АГЕНТЫ: ЗАЯВКИ (CARTS) ====================

/**
 * 6.1 Заявки агента на товар
 * GET /api/warehouse/agent-carts/
 */
export const listAgentCarts = async (params: any = {}) => {
  try {
    const response = await api.get("warehouse/agent-carts/", { params });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("List Agent Carts Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * POST /api/warehouse/agent-carts/
 */
export const createAgentCart = async (payload: any) => {
  try {
    const response = await api.post("warehouse/agent-carts/", payload);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Create Agent Cart Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * GET /api/warehouse/agent-carts/{id}/
 */
export const getAgentCartById = async (id: any) => {
  try {
    const response = await api.get(`warehouse/agent-carts/${id}/`);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Get Agent Cart Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * PUT /api/warehouse/agent-carts/{id}/
 */
export const updateAgentCart = async (id: any, payload: any) => {
  try {
    const response = await api.put(`warehouse/agent-carts/${id}/`, payload);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Update Agent Cart Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * PATCH /api/warehouse/agent-carts/{id}/
 */
export const patchAgentCart = async (id: any, payload: any) => {
  try {
    const response = await api.patch(`warehouse/agent-carts/${id}/`, payload);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Patch Agent Cart Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * DELETE /api/warehouse/agent-carts/{id}/
 */
export const deleteAgentCart = async (id: any) => {
  try {
    const response = await api.delete(`warehouse/agent-carts/${id}/`);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Delete Agent Cart Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * POST /api/warehouse/agent-carts/{id}/submit/
 */
export const submitAgentCart = async (id: any) => {
  try {
    const response = await api.post(`warehouse/agent-carts/${id}/submit/`);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Submit Agent Cart Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * POST /api/warehouse/agent-carts/{id}/approve/
 */
export const approveAgentCart = async (id: any) => {
  try {
    const response = await api.post(`warehouse/agent-carts/${id}/approve/`);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Approve Agent Cart Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * POST /api/warehouse/agent-carts/{id}/dispatch/
 * Выдача товара агенту владельцем (только draft).
 */
export const dispatchAgentCart = async (id: any) => {
  try {
    const response = await api.post(`warehouse/agent-carts/${id}/dispatch/`);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Dispatch Agent Cart Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * POST /api/warehouse/agent-carts/{id}/reject/
 */
export const rejectAgentCart = async (id: any) => {
  try {
    const response = await api.post(`warehouse/agent-carts/${id}/reject/`);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Reject Agent Cart Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Создать документ продажи по одобренной заявке агента
 * POST /api/warehouse/agent-carts/{id}/create-sale/
 * @param {string} cartId - UUID заявки
 * @param {Object} payload - counterparty, post?, payment_kind?, prepayment_amount?, discount_percent?, discount_amount?, comment?
 * @returns {Promise<Object>} - созданный документ (Document)
 */
export const createSaleFromCart = async (cartId: any, payload: any = {}) => {
  try {
    const response = await api.post(
      `warehouse/agent-carts/${cartId}/create-sale/`,
      payload
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Create Sale From Cart Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

