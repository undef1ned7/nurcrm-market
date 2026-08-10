import api from "@shared/api";

// ==================== АГЕНТЫ: КОМПАНИИ И ЗАЯВКИ В КОМПАНИЮ ====================

/**
 * Поиск компаний, в которые можно подать заявку как агент
 * GET /api/warehouse/agents/companies/search/
 * @param {Object} params - search (подстрока названия), page?
 */
export const searchAgentCompanies = async (params: any = {}) => {
  try {
    const response = await api.get("warehouse/agents/companies/search/", {
      params,
    });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Search Agent Companies Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Список заявок агента в компании / заявок агентов во владение компании
 * GET /api/warehouse/agents/company-requests/
 * @param {Object} params - status?
 */
export const listCompanyAgentRequests = async (params: any = {}) => {
  try {
    const response = await api.get("warehouse/agents/company-requests/", {
      params,
    });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("List Company Agent Requests Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Отправить заявку в компанию (стать агентом)
 * POST /api/warehouse/agents/company-requests/
 * @param {Object} payload - { company, note? }
 */
export const createCompanyAgentRequest = async (payload: any) => {
  try {
    const response = await api.post(
      "warehouse/agents/company-requests/",
      payload
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Create Company Agent Request Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Принять заявку агента в компанию
 * POST /api/warehouse/agents/company-requests/{id}/accept/
 */
export const acceptCompanyAgentRequest = async (id: any) => {
  try {
    const response = await api.post(
      `warehouse/agents/company-requests/${id}/accept/`
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Accept Company Agent Request Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Отклонить заявку агента в компанию
 * POST /api/warehouse/agents/company-requests/{id}/reject/
 */
export const rejectCompanyAgentRequest = async (id: any) => {
  try {
    const response = await api.post(
      `warehouse/agents/company-requests/${id}/reject/`
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Reject Company Agent Request Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Отстранить активного агента от компании
 * POST /api/warehouse/agents/company-requests/{id}/remove/
 */
export const removeCompanyAgent = async (id: any) => {
  try {
    const response = await api.post(
      `warehouse/agents/company-requests/${id}/remove/`
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Remove Company Agent Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Включить/изменить/выключить общий доступ к складам для агента
 * PATCH /api/warehouse/agents/company-requests/{id}/common-access/
 * @param {string} id - UUID записи CompanyWarehouseAgent
 * @param {Object} payload - { common_access_enabled?: bool, common_warehouses?: uuid[],
 *   common_warehouse?: uuid|null (legacy, один склад),
 *   can_sell_wholesale?: bool, can_sell_without_approval?: bool }
 */
export const patchCompanyAgentCommonAccess = async (id: any, payload: any) => {
  try {
    const response = await api.patch(
      `warehouse/agents/company-requests/${id}/common-access/`,
      payload
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error(
        "Patch Company Agent Common Access Error:",
        error.response.data
      );
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Владелец/админ напрямую назначает агента склада без заявки.
 * POST /api/warehouse/agents/company-memberships/
 * body: { user, common_access_enabled?, common_warehouses? (uuid[]),
 *   common_warehouse? (legacy, один склад),
 *   can_sell_wholesale?, can_sell_without_approval? }
 */
export const createCompanyMembership = async (payload: any) => {
  try {
    const response = await api.post(
      "warehouse/agents/company-memberships/",
      payload,
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Create Company Membership Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Остатки у всех агентов (для owner/admin)
 * GET /api/warehouse/owner/agents/products/
 */
export const listOwnerAgentsProducts = async (params: any = {}) => {
  try {
    const response = await api.get("warehouse/owner/agents/products/", {
      params,
    });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("List Owner Agents Products Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Остатки одного агента (для владельца)
 * GET /api/warehouse/owner/agents/{agent_id}/products/
 */
export const listOwnerAgentProductsByAgent = async (agentId: any, params: any = {}) => {
  try {
    const response = await api.get(
      `warehouse/owner/agents/${agentId}/products/`,
      { params },
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error(
        "List Owner Agent Products By Agent Error:",
        error.response.data,
      );
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

