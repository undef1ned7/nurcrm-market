import api from "@shared/api";

// ==================== КАССА (CASH REGISTER) 5.0 ====================

/**
 * Список касс
 * GET /api/warehouse/cash-registers/
 */
export const listCashRegisters = async (params: any = {}) => {
  try {
    const response = await api.get("warehouse/cash-registers/", { params });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("List Cash Registers Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Детали кассы
 * GET /api/warehouse/cash-registers/{id}/
 */
export const getCashRegister = async (id: any) => {
  try {
    const response = await api.get(`warehouse/cash-registers/${id}/`);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Get Cash Register Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Создать кассу
 * POST /api/warehouse/cash-registers/
 * @param {Object} payload - { name, location? }
 */
export const createCashRegister = async (payload: any) => {
  try {
    const response = await api.post("warehouse/cash-registers/", payload);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Create Cash Register Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Обновить кассу
 * PATCH/PUT /api/warehouse/cash-registers/{id}/
 */
export const updateCashRegister = async (id: any, payload: any) => {
  try {
    const response = await api.patch(
      `warehouse/cash-registers/${id}/`,
      payload
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Update Cash Register Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Удалить кассу
 * DELETE /api/warehouse/cash-registers/{id}/
 */
export const deleteCashRegister = async (id: any) => {
  try {
    const response = await api.delete(`warehouse/cash-registers/${id}/`);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Delete Cash Register Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Касса с балансом, приходами и расходами
 * GET /api/warehouse/cash-registers/{id}/operations/
 * @returns {{ id, name, balance, receipts_total, expenses_total, receipts[], expenses[] }}
 */
export const getCashRegisterOperations = async (id: any) => {
  try {
    const response = await api.get(
      `warehouse/cash-registers/${id}/operations/`
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error(
        "Get Cash Register Operations Error:",
        error.response.data
      );
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

