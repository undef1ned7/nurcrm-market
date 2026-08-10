import api from "@shared/api";

// ==================== ТИПОВЫЕ СПИСКИ ДОКУМЕНТОВ ====================

/**
 * Получить список документов продажи (SALE)
 * GET /api/warehouse/documents/sale/
 */
export const listSaleDocuments = async (params: any = {}) => {
  try {
    const response = await api.get("warehouse/documents/sale/", { params });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("List Sale Documents Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Создать документ продажи (SALE)
 * POST /api/warehouse/documents/sale/
 */
export const createSaleDocument = async (payload: any) => {
  try {
    const response = await api.post("warehouse/documents/sale/", payload);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Create Sale Document Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Получить список документов покупки (PURCHASE)
 * GET /api/warehouse/documents/purchase/
 */
export const listPurchaseDocuments = async (params: any = {}) => {
  try {
    const response = await api.get("warehouse/documents/purchase/", { params });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("List Purchase Documents Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Создать документ покупки (PURCHASE)
 * POST /api/warehouse/documents/purchase/
 */
export const createPurchaseDocument = async (payload: any) => {
  try {
    const response = await api.post("warehouse/documents/purchase/", payload);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Create Purchase Document Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Получить список документов возврата продажи (SALE_RETURN)
 * GET /api/warehouse/documents/sale-return/
 */
export const listSaleReturnDocuments = async (params: any = {}) => {
  try {
    const response = await api.get("warehouse/documents/sale-return/", {
      params,
    });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("List Sale-Return Documents Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Создать документ возврата продажи (SALE_RETURN)
 * POST /api/warehouse/documents/sale-return/
 */
export const createSaleReturnDocument = async (payload: any) => {
  try {
    const response = await api.post(
      "warehouse/documents/sale-return/",
      payload
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Create Sale-Return Document Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Получить список документов возврата покупки (PURCHASE_RETURN)
 * GET /api/warehouse/documents/purchase-return/
 */
export const listPurchaseReturnDocuments = async (params: any = {}) => {
  try {
    const response = await api.get("warehouse/documents/purchase-return/", {
      params,
    });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error(
        "List Purchase-Return Documents Error:",
        error.response.data
      );
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Создать документ возврата покупки (PURCHASE_RETURN)
 * POST /api/warehouse/documents/purchase-return/
 */
export const createPurchaseReturnDocument = async (payload: any) => {
  try {
    const response = await api.post(
      "warehouse/documents/purchase-return/",
      payload
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error(
        "Create Purchase-Return Document Error:",
        error.response.data
      );
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Получить список документов инвентаризации (INVENTORY)
 * GET /api/warehouse/documents/inventory/
 */
export const listInventoryDocuments = async (params: any = {}) => {
  try {
    const response = await api.get("warehouse/documents/inventory/", {
      params,
    });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("List Inventory Documents Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Создать документ инвентаризации (INVENTORY)
 * POST /api/warehouse/documents/inventory/
 */
export const createInventoryDocument = async (payload: any) => {
  try {
    const response = await api.post("warehouse/documents/inventory/", payload);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Create Inventory Document Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Получить список документов прихода (RECEIPT)
 * GET /api/warehouse/documents/receipt/
 */
export const listReceiptDocuments = async (params: any = {}) => {
  try {
    const response = await api.get("warehouse/documents/receipt/", { params });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("List Receipt Documents Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Создать документ прихода (RECEIPT)
 * POST /api/warehouse/documents/receipt/
 */
export const createReceiptDocument = async (payload: any) => {
  try {
    const response = await api.post("warehouse/documents/receipt/", payload);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Create Receipt Document Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Получить список документов списания (WRITE_OFF)
 * GET /api/warehouse/documents/write-off/
 */
export const listWriteOffDocuments = async (params: any = {}) => {
  try {
    const response = await api.get("warehouse/documents/write-off/", {
      params,
    });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("List Write-Off Documents Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Создать документ списания (WRITE_OFF)
 * POST /api/warehouse/documents/write-off/
 */
export const createWriteOffDocument = async (payload: any) => {
  try {
    const response = await api.post("warehouse/documents/write-off/", payload);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Create Write-Off Document Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Получить список документов перемещения (TRANSFER)
 * GET /api/warehouse/documents/transfer/
 */
export const listTransferDocuments = async (params: any = {}) => {
  try {
    const response = await api.get("warehouse/documents/transfer/", { params });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("List Transfer Documents Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Создать документ перемещения (TRANSFER)
 * POST /api/warehouse/documents/transfer/
 */
export const createTransferDocument = async (payload: any) => {
  try {
    const response = await api.post("warehouse/documents/transfer/", payload);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Create Transfer Document Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Список коммерческих предложений (COMMERCIAL_OFFER)
 * GET /api/warehouse/documents/commercial-offer/
 */
export const listCommercialOfferDocuments = async (params: any = {}) => {
  try {
    const response = await api.get("warehouse/documents/commercial-offer/", {
      params,
    });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error(
        "List Commercial Offer Documents Error:",
        error.response.data
      );
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Создать коммерческое предложение (COMMERCIAL_OFFER)
 * POST /api/warehouse/documents/commercial-offer/
 * В теле требуется doc_type: COMMERCIAL_OFFER; проведение (POST …/post/) не поддерживается.
 */
export const createCommercialOfferDocument = async (payload: any) => {
  try {
    const response = await api.post(
      "warehouse/documents/commercial-offer/",
      payload
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error(
        "Create Commercial Offer Document Error:",
        error.response.data
      );
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

/**
 * Перемещение товаров между складами (transfer endpoint)
 * POST /api/warehouse/transfer/
 * @param {Object} payload - { warehouse_from, warehouse_to, comment, items[] }
 */
export const transferWarehouse = async (payload: any) => {
  try {
    const response = await api.post("warehouse/transfer/", payload);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Warehouse Transfer Error:", error.response.data);
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
};

