import api from "@shared/api";

// ==================== АГЕНТЫ: ОСТАТКИ ====================

/**
 * 6.3 Остатки у агента (текущий пользователь)
 * GET /api/warehouse/agents/me/products/
 */
export const listMyAgentProducts = async (params : Record<string, unknown> = {}) => {
  try {
    const response = await api.get("warehouse/agents/me/products/", { params });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("List My Agent Products Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

