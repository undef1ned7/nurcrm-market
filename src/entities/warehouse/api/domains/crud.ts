import api from "@shared/api";

// ==================== КОНТРАГЕНТЫ (CRUD) ====================

/**
 * 2.4 Контрагенты
 * GET /api/warehouse/crud/counterparties/
 * @param {Object} params - search, type (CLIENT|SUPPLIER|BOTH), page, branch
 */
export const listCounterparties = async (params: any = {}) => {
  try {
    const {
      _cacheKey,
      _skipLoadingIfCached,
      _periodRange,
      _counterpartyTypes,
      ...restParams
    } = params;
    const response = await api.get("warehouse/crud/counterparties/", {
      params: restParams,
    });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("List Counterparties Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Получить контрагента по ID
 * @param {string} id - UUID контрагента
 */
export const getCounterpartyById = async (id: any) => {
  try {
    const response = await api.get(`warehouse/crud/counterparties/${id}/`);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Get Counterparty Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Создать контрагента
 * @param {Object} counterpartyData - Данные контрагента
 */
export const createCounterparty = async (counterpartyData: any) => {
  try {
    const response = await api.post(
      "warehouse/crud/counterparties/",
      counterpartyData
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Create Counterparty Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Обновить контрагента
 * @param {string} id - UUID контрагента
 * @param {Object} counterpartyData - Данные контрагента
 */
export const updateCounterparty = async (id: any, counterpartyData: any) => {
  try {
    const response = await api.put(
      `warehouse/crud/counterparties/${id}/`,
      counterpartyData
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Update Counterparty Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Удалить контрагента
 * @param {string} id - UUID контрагента
 */
export const deleteCounterparty = async (id: any) => {
  try {
    const response = await api.delete(`warehouse/crud/counterparties/${id}/`);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Delete Counterparty Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Получить долги контрагента
 * @param {string} id - UUID контрагента
 * @returns {{ results: Array, total_debt: number }}
 */
export const getCounterpartyDebts = async (id: any) => {
  try {
    const response = await api.get(
      `warehouse/crud/counterparties/${id}/debts/`
    );
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return { results: [] as any[], total_debt: 0 };
    }
    if (error.response) {
      console.error("Get Counterparty Debts Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Получить историю оплат контрагента
 * @param {string} id - UUID контрагента
 * @returns {{ results: Array }}
 */
export const getCounterpartyPayments = async (id: any) => {
  try {
    const response = await api.get(
      `warehouse/crud/counterparties/${id}/payments/`
    );
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return { results: [] as any[] };
    }
    if (error.response) {
      console.error("Get Counterparty Payments Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

