import api from "@shared/api";

// ==================== ДОКУМЕНТЫ ====================

/**
 * Получить список документов
 * @param {Object} params - doc_type, status, warehouse_from, warehouse_to, counterparty, search (по number, comment), page, branch
 */
export const listDocuments = async (params: any = {}) => {
  try {
    const response = await api.get("warehouse/documents/", { params });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("List Documents Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Получить документ по ID
 * @param {string} id - UUID документа
 */
export const getDocumentById = async (id: any) => {
  try {
    const response = await api.get(`warehouse/documents/${id}/`);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Get Document Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Создать документ
 * @param {Object} documentData - Данные документа
 * @param {string} documentData.doc_type - Тип документа (SALE, PURCHASE, TRANSFER, etc.)
 * @param {string} documentData.warehouse_from - UUID склада-отправителя
 * @param {string} documentData.warehouse_to - UUID склада-получателя (для TRANSFER)
 * @param {string} documentData.counterparty - UUID контрагента
 * @param {string} documentData.comment - Комментарий
 * @param {Array} documentData.items - Массив товаров
 */
export const createDocument = async (documentData: any) => {
  try {
    const response = await api.post("warehouse/documents/", documentData);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Create Document Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Обновить документ
 * @param {string} id - UUID документа
 * @param {Object} documentData - Данные документа
 */
export const updateDocument = async (id: any, documentData: any) => {
  try {
    const response = await api.put(`warehouse/documents/${id}/`, documentData);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Update Document Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Частичное обновление документа
 * @param {string} id - UUID документа
 * @param {Object} documentData - Частичные данные документа
 */
export const patchDocument = async (id: any, documentData: any) => {
  try {
    const response = await api.patch(
      `warehouse/documents/${id}/`,
      documentData
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Patch Document Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Удалить документ
 * @param {string} id - UUID документа
 */
export const deleteDocument = async (id: any) => {
  try {
    const response = await api.delete(`warehouse/documents/${id}/`);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Delete Document Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Провести документ
 * @param {string} id - UUID документа
 * @param {Object} options - Опции проведения
 * @param {boolean|string} options.allow_negative - Обход проверки отрицательных остатков (true|"true"|"1"|"yes")
 */
export const postDocument = async (id: any, options: any = {}) => {
  try {
    const body: any = {};
    if (options.allow_negative !== undefined) {
      body.allow_negative = options.allow_negative;
    }
    const response = await api.post(
      `warehouse/documents/${id}/post/`,
      Object.keys(body).length > 0 ? body : undefined
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Post Document Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Отменить проведение документа
 * @param {string} id - UUID документа
 */
export const unpostDocument = async (id: any) => {
  try {
    const response = await api.post(`warehouse/documents/${id}/unpost/`);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Unpost Document Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Подтвердить кассовый запрос (документ в CASH_PENDING → POSTED, при payment_kind=cash создаётся MONEY_*)
 * POST /api/warehouse/documents/{id}/cash/approve/
 * @param {string} id - UUID документа
 * @param {Object} body - опционально { note: "комментарий" }
 */
export const cashDocumentApprove = async (id: any, body: any = {}) => {
  try {
    const response = await api.post(
      `warehouse/documents/${id}/cash/approve/`,
      Object.keys(body).length ? body : undefined
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Cash Approve Document Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Отклонить кассовый запрос (склад откатывается, документ → REJECTED)
 * POST /api/warehouse/documents/{id}/cash/reject/
 * @param {string} id - UUID документа
 * @param {Object} body - опционально { note: "причина отказа" }
 */
export const cashDocumentReject = async (id: any, body: any = {}) => {
  try {
    const response = await api.post(
      `warehouse/documents/${id}/cash/reject/`,
      Object.keys(body).length ? body : undefined
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Cash Reject Document Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Inbox запросов кассы (документы в CASH_PENDING, ожидающие решения)
 * GET /api/warehouse/cash/requests/
 * @param {Object} params - status, requires_money, money_doc_type, document__doc_type, document__payment_kind, search, page
 */
export const listCashRequests = async (params: any = {}) => {
  try {
    const response = await api.get("warehouse/cash/requests/", { params });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("List Cash Requests Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Подтвердить запрос кассы по ID запроса
 * POST /api/warehouse/cash/requests/{request_id}/approve/
 */
export const approveCashRequest = async (requestId: any, body: any = {}) => {
  try {
    const response = await api.post(
      `warehouse/cash/requests/${requestId}/approve/`,
      Object.keys(body).length ? body : undefined
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Approve Cash Request Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Отклонить запрос кассы по ID запроса
 * POST /api/warehouse/cash/requests/{request_id}/reject/
 */
export const rejectCashRequest = async (requestId: any, body: any = {}) => {
  try {
    const response = await api.post(
      `warehouse/cash/requests/${requestId}/reject/`,
      Object.keys(body).length ? body : undefined
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Reject Cash Request Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

