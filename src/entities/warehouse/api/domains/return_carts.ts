import api from "@shared/api";

// ==================== АГЕНТЫ: ВОЗВРАТЫ (RETURN CARTS) ====================

/**
 * GET /api/warehouse/agent-return-carts/
 */
export const listAgentReturnCarts = async (params: any = {}) => {
  try {
    const response = await api.get("warehouse/agent-return-carts/", { params });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("List Agent Return Carts Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * POST /api/warehouse/agent-return-carts/
 * Владелец: обязательно agent; можно передать items_input
 */
export const createAgentReturnCart = async (payload: any) => {
  try {
    const response = await api.post("warehouse/agent-return-carts/", payload);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Create Agent Return Cart Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * GET /api/warehouse/agent-return-carts/{id}/
 */
export const getAgentReturnCartById = async (id: any) => {
  try {
    const response = await api.get(`warehouse/agent-return-carts/${id}/`);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Get Agent Return Cart Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * DELETE /api/warehouse/agent-return-carts/{id}/
 */
export const deleteAgentReturnCart = async (id: any) => {
  try {
    const response = await api.delete(`warehouse/agent-return-carts/${id}/`);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Delete Agent Return Cart Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * PATCH /api/warehouse/agent-return-carts/{id}/
 */
export const patchAgentReturnCart = async (id: any, payload: any) => {
  try {
    const response = await api.patch(
      `warehouse/agent-return-carts/${id}/`,
      payload,
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Patch Agent Return Cart Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * POST /api/warehouse/agent-return-carts/{id}/submit/
 * Агент отправляет заявку на возврат владельцу
 */
export const submitAgentReturnCart = async (id: any) => {
  try {
    const response = await api.post(
      `warehouse/agent-return-carts/${id}/submit/`,
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Submit Agent Return Cart Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * POST /api/warehouse/agent-return-carts/{id}/approve/
 * Владелец одобряет заявку агента (submitted)
 */
export const approveAgentReturnCart = async (id: any) => {
  try {
    const response = await api.post(
      `warehouse/agent-return-carts/${id}/approve/`,
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Approve Agent Return Cart Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * POST /api/warehouse/agent-return-carts/{id}/reject/
 */
export const rejectAgentReturnCart = async (id: any) => {
  try {
    const response = await api.post(
      `warehouse/agent-return-carts/${id}/reject/`,
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Reject Agent Return Cart Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * POST /api/warehouse/agent-return-carts/{id}/receive/
 * Принять возврат на склад (владелец, draft)
 */
export const receiveAgentReturnCart = async (id: any) => {
  try {
    const response = await api.post(
      `warehouse/agent-return-carts/${id}/receive/`,
      {},
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Receive Agent Return Cart Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * GET /api/warehouse/agent-return-cart-items/?cart={uuid}
 */
export const listAgentReturnCartItems = async (params: any = {}) => {
  try {
    const response = await api.get("warehouse/agent-return-cart-items/", {
      params,
    });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("List Agent Return Cart Items Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * POST /api/warehouse/agent-return-cart-items/
 */
export const createAgentReturnCartItem = async (payload: any) => {
  try {
    const response = await api.post(
      "warehouse/agent-return-cart-items/",
      payload,
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Create Agent Return Cart Item Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * PATCH /api/warehouse/agent-return-cart-items/{id}/
 */
export const patchAgentReturnCartItem = async (id: any, payload: any) => {
  try {
    const response = await api.patch(
      `warehouse/agent-return-cart-items/${id}/`,
      payload,
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Patch Agent Return Cart Item Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * DELETE /api/warehouse/agent-return-cart-items/{id}/
 */
export const deleteAgentReturnCartItem = async (id: any) => {
  try {
    const response = await api.delete(
      `warehouse/agent-return-cart-items/${id}/`,
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Delete Agent Return Cart Item Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

