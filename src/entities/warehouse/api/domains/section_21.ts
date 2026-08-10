import api from "@shared/api";

// ==================== ДЕНЕЖНЫЕ ДОКУМЕНТЫ (ПРИХОД/РАСХОД) ====================

/**
 * 5.1 Категории платежей
 * GET/POST /api/warehouse/money/categories/
 * @param {Object} params - search (по title), branch, page
 */
export const listMoneyCategories = async (params: any = {}) => {
  try {
    const response = await api.get("warehouse/money/categories/", { params });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("List Money Categories Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

export const getMoneyCategoryById = async (id: any) => {
  try {
    const response = await api.get(`warehouse/money/categories/${id}/`);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Get Money Category Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

export const createMoneyCategory = async (payload: any) => {
  try {
    const response = await api.post("warehouse/money/categories/", payload);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Create Money Category Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

export const updateMoneyCategory = async (id: any, payload: any) => {
  try {
    const response = await api.put(
      `warehouse/money/categories/${id}/`,
      payload
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Update Money Category Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

export const patchMoneyCategory = async (id: any, payload: any) => {
  try {
    const response = await api.patch(
      `warehouse/money/categories/${id}/`,
      payload
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Patch Money Category Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

export const deleteMoneyCategory = async (id: any) => {
  try {
    const response = await api.delete(`warehouse/money/categories/${id}/`);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Delete Money Category Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * 5.2 Денежные документы (приход MONEY_RECEIPT / расход MONEY_EXPENSE)
 * Статусы: DRAFT | POSTED
 */
/** @param {Object} params - cash_register, doc_type, agent, counterparty, payment_category, date_from, date_to, page, page_size */
export const listMoneyDocuments = async (params: any = {}) => {
  try {
    const response = await api.get("warehouse/money/documents/", { params });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("List Money Documents Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

export const getMoneyDocumentById = async (id: any) => {
  try {
    const response = await api.get(`warehouse/money/documents/${id}/`);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Get Money Document Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

export const createMoneyDocument = async (payload: any) => {
  try {
    const response = await api.post("warehouse/money/documents/", payload);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Create Money Document Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

export const updateMoneyDocument = async (id: any, payload: any) => {
  try {
    const response = await api.put(`warehouse/money/documents/${id}/`, payload);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Update Money Document Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

export const patchMoneyDocument = async (id: any, payload: any) => {
  try {
    const response = await api.patch(
      `warehouse/money/documents/${id}/`,
      payload
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Patch Money Document Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

export const deleteMoneyDocument = async (id: any) => {
  try {
    const response = await api.delete(`warehouse/money/documents/${id}/`);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Delete Money Document Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

export const postMoneyDocument = async (id: any) => {
  try {
    const response = await api.post(`warehouse/money/documents/${id}/post/`);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Post Money Document Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

export const unpostMoneyDocument = async (id: any) => {
  try {
    const response = await api.post(`warehouse/money/documents/${id}/unpost/`);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Unpost Money Document Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/** Отказать денежный документ (POSTED → REJECTED, откат кассы). См. docs/warehouse-money-documents-actions-backend.md */
export const rejectMoneyDocument = async (id: any) => {
  try {
    const response = await api.post(`warehouse/money/documents/${id}/reject/`);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Reject Money Document Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * 5.3 Денежные операции по контрагенту
 * GET /api/warehouse/money/counterparties/{counterparty_id}/operations/
 * Фильтры: doc_type, status, warehouse, payment_category. Поиск: search (по number, comment)
 */
export const getCounterpartyMoneyOperations = async (
  counterpartyId,
  params = {}
) => {
  try {
    const response = await api.get(
      `warehouse/money/counterparties/${counterpartyId}/operations/`,
      { params }
    );
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return { results: [] as any[] };
    }
    if (error.response) {
      console.error(
        "Get Counterparty Money Operations Error:",
        error.response.data
      );
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Сводные показатели по контрагентам за период (Сальдо/Оборот) для вкладки Клиент/Поставщик.
 * GET /api/warehouse/counterparties/balance-summary/
 * Params: type ("client" | "supplier"), date_from (YYYY-MM-DD), date_to (YYYY-MM-DD)
 * См. docs/warehouse-counterparties-balance-summary-backend.md
 */
export const getCounterpartiesBalanceSummary = async (params: any = {}) => {
  try {
    const response = await api.get(
      "warehouse/counterparties/balance-summary/",
      { params }
    );
    return response.data;
  } catch (error: any) {
    // Бэкенд может быть ещё не готов — отдаём null, фронт покажет нули
    if (error.response?.status === 404) return null;
    if (error.response) {
      console.error(
        "Get Counterparties Balance Summary Error:",
        error.response.data
      );
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Акт сверки с контрагентом (JSON)
 * GET /api/warehouse/counterparties/{counterparty_id}/reconciliation/json/
 * @param {string} counterpartyId - UUID контрагента
 * @param {Object} params - start (YYYY-MM-DD), end (YYYY-MM-DD), currency?, branch?
 */
export const getReconciliationJson = async (counterpartyId: any, params: any = {}) => {
  try {
    const response = await api.get(
      `warehouse/counterparties/${counterpartyId}/reconciliation/json/`,
      { params }
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Get Reconciliation JSON Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Акт сверки с контрагентом (PDF с сервера)
 * GET /api/warehouse/counterparties/{counterparty_id}/reconciliation/
 * @param {string} counterpartyId - UUID контрагента
 * @param {Object} params - start, end, currency?, branch?
 * @returns {Promise<Blob>}
 */
export const getReconciliationPdf = async (counterpartyId: any, params: any = {}) => {
  try {
    const response = await api.get(
      `warehouse/counterparties/${counterpartyId}/reconciliation/`,
      { params, responseType: "blob" }
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Get Reconciliation PDF Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

