import api from "@shared/api";

export const getNotifications = async (params: Record<string, unknown> = {}) => {
  try {
    const response = await api.get('/main/notifications/', { params });
    return response.data;
  } catch (error: any) {
    return Promise.reject(error.response?.data || error);
  }
};

export const markAllNotificationsRead = async () => {
  try {
    const response = await api.post('/main/notifications/mark-all-read/');
    return response.data;
  } catch (error: any) {
    return Promise.reject(error.response?.data || error);
  }
};

export const getNotificationDetail = async (id: string) => {
  try {
    const response = await api.get(`/main/notifications/${id}/`);
    return response.data;
  } catch (error: any) {
    return Promise.reject(error.response?.data || error);
  }
};

// Отметить ОДНО уведомление прочитанным.
export const markNotificationRead = async (id: string) => {
  try {
    const response = await api.post(`/main/notifications/${id}/read/`);
    return response.data;
  } catch (error: any) {
    return Promise.reject(error.response?.data || error);
  }
};

export const deleteNotification = async (id: string) => {
  try {
    const response = await api.delete(`/main/notifications/${id}/`);
    return response.data;
  } catch (error: any) {
    return Promise.reject(error.response || error);
  }
};
