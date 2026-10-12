import api from "@shared/api";

// ==================== АНАЛИТИКА СКЛАДА ====================

/**
 * 7.1 Аналитика владельца (общая)
 * GET /api/warehouse/owner/analytics/
 * @param {Object} params - period=day|week|month|custom, date, date_from, date_to
 */
export const getOwnerAnalytics = async (params: any = {}) => {
  try {
    const response = await api.get("warehouse/owner/analytics/", { params });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Get Owner Analytics Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * 7.2 Аналитика агента (по себе)
 * GET /api/warehouse/agents/me/analytics/
 */
export const getAgentMeAnalytics = async (params: any = {}) => {
  try {
    const response = await api.get("warehouse/agents/me/analytics/", {
      params,
    });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Get Agent Me Analytics Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * 7.3 Аналитика по конкретному агенту
 * GET /api/warehouse/owner/agents/{agent_id}/analytics/
 */
export const getOwnerAgentAnalytics = async (agentId: any, params: any = {}) => {
  try {
    const response = await api.get(
      `warehouse/owner/agents/${agentId}/analytics/`,
      { params }
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Get Owner Agent Analytics Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Сводная аналитика по всем компаниям-партнёрам (склад).
 * GET /api/warehouse/owner/partners/analytics/
 */
export const getOwnerPartnersAnalytics = async (params: any = {}) => {
  try {
    const response = await api.get("warehouse/owner/partners/analytics/", {
      params,
    });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Get Owner Partners Analytics Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Детальная аналитика одного партнёра (формат как owner/analytics/).
 * GET /api/warehouse/owner/partners/{partnerCompanyId}/analytics/
 */
export const getOwnerPartnerAnalytics = async (partnerCompanyId: any, params: any = {}) => {
  try {
    const response = await api.get(
      `warehouse/owner/partners/${partnerCompanyId}/analytics/`,
      { params },
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Get Owner Partner Analytics Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

export default {
  getOwnerAnalytics,
  getAgentMeAnalytics,
  getOwnerAgentAnalytics,
  getOwnerPartnersAnalytics,
  getOwnerPartnerAnalytics,
};
