import api from "@shared/api";

// ==================== ДОКУМЕНТЫ АГЕНТА (4.2.1) ====================

/**
 * Документы агента (по своим товарам). Для агента нельзя TRANSFER и INVENTORY.
 * GET /api/warehouse/agent/documents/
 * @param {Object} params - doc_type, status, search, page
 */
export const listAgentDocuments = async (params: any = {}) => {
  try {
    const response = await api.get("warehouse/agent/documents/", { params });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("List Agent Documents Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

export const getAgentDocumentById = async (id: any) => {
  try {
    const response = await api.get(`warehouse/agent/documents/${id}/`);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Get Agent Document Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

export const createAgentDocument = async (payload: any) => {
  try {
    const response = await api.post("warehouse/agent/documents/", payload);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Create Agent Document Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

export const updateAgentDocument = async (id: any, payload: any) => {
  try {
    const response = await api.patch(
      `warehouse/agent/documents/${id}/`,
      payload
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Update Agent Document Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

export const deleteAgentDocument = async (id: any) => {
  try {
    const response = await api.delete(`warehouse/agent/documents/${id}/`);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Delete Agent Document Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

