import api from "./base";

export const submitAdditionalServicesRequest = async (requestData) => {
  try {
    const { data } = await api.post("/main/socialapplications/", requestData);
    return data;
  } catch (error) {
    console.error(
      "Ошибка при отправке заявки на дополнительные услуги:",
      error,
    );
    throw error;
  }
};

export const getAdditionalServicesList = async () => {
  try {
    const { data } = await api.get("/additional-services/list/");
    return data;
  } catch (error) {
    console.error("Ошибка при получении списка дополнительных услуг:", error);
    throw error;
  }
};

export const getAdditionalServicesRequestStatus = async (requestId) => {
  try {
    const { data } = await api.get(
      `/additional-services/request/${requestId}/status/`,
    );
    return data;
  } catch (error) {
    console.error("Ошибка при получении статуса заявки:", error);
    throw error;
  }
};
