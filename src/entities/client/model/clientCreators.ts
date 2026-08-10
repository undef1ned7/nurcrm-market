import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "@shared/api";
import { normalizeDealCreateInput } from "@shared/lib/tools/clientDeals";
export const fetchClientsAsync = createAsyncThunk<any, void | any>(
  "client/fetchAll",
  async (clientParams: any, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/main/clients/", {
        params: clientParams,
      });
      return data; // { count, next, previous, results }
    } catch (err: any) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const createClientAsync = createAsyncThunk<any, void | any>(
  "client/create",
  async (payload: any, { rejectWithValue }) => {
    try {
      const response = await api.post("/main/clients/", payload);
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const updateClientAsync = createAsyncThunk<any, void | any>(
  "client/update",
  async ({ clientId, updatedData }: any, { rejectWithValue }) => {
    try {
      const { data } = await api.patch(
        `/main/clients/${clientId}/`,
        updatedData
      );
      return data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const deleteClientAsync = createAsyncThunk<any, void | any>(
  "client/delete",
  async (clientId: any, { rejectWithValue }) => {
    try {
      await api.delete(`/main/clients/${clientId}/`);
      return clientId;
    } catch (err: any) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const getItemClient = createAsyncThunk<any, void | any>(
  "client/getItem",
  async (clientId: any, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/main/clients/${clientId}/`);
      return data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const createDeals = createAsyncThunk<any, void | any>(
  "client/createDeals",
  async ({ clientId, ...data }: any, { rejectWithValue }) => {
    try {
      const payload = normalizeDealCreateInput({ clientId, ...data });
      const { data: response } = await api.post(
        `/main/clients/${clientId}/deals/`,
        payload,
      );
      return response;
    } catch (err: any) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const getClientDeals = createAsyncThunk<any, void | any>(
  "client/getClientDeals",
  async ({ clientId, params = {} }: any, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/main/clients/${clientId}/deals/`, {
        params,
      });
      // Поддерживаем как пагинацию, так и простой массив
      return Array.isArray(data) ? data : data.results || [];
    } catch (err: any) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const getClientDealDetail = createAsyncThunk<any, void | any>(
  "client/dealDetail",
  async ({ clientId, dealId }: any, { rejectWithValue }) => {
    try {
      const { data } = await api.get(
        `/main/clients/${clientId}/deals/${dealId}/`
      );
      return data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const updateDealDetail = createAsyncThunk<any, void | any>(
  "client/updateDeal",
  async ({ id, data, clientId }: any, { rejectWithValue }) => {
    try {
      const { data: response } = await api.patch(
        `/main/clients/${clientId}/deals/${id}/`,
        data
      );
      return response;
    } catch (err: any) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const payDebtDeal = createAsyncThunk<any, void | any>(
  "client/payDebtDeal",
  async ({ id, data, clientId }: any, { rejectWithValue }) => {
    try {
      // Генерируем idempotency_key если его нет
      if (!data.idempotency_key) {
        data.idempotency_key = crypto.randomUUID();
      }
      
      // Используем nested endpoint если есть clientId, иначе flat
      const url = clientId
        ? `/main/clients/${clientId}/deals/${id}/pay/`
        : `/main/clientdeals/${id}/pay/`;
      
      const { data: response } = await api.post(url, data);
      return response;
    } catch (err: any) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

// Возврат платежа (refund)
export const refundDeal = createAsyncThunk<any, void | any>(
  "client/refundDeal",
  async ({ id, data, clientId }: any, { rejectWithValue }) => {
    try {
      // Генерируем idempotency_key если его нет
      if (!data.idempotency_key) {
        data.idempotency_key = crypto.randomUUID();
      }
      
      // Используем nested endpoint если есть clientId, иначе flat
      const url = clientId
        ? `/main/clients/${clientId}/deals/${id}/refund/`
        : `/main/clientdeals/${id}/refund/`;
      
      const { data: response } = await api.post(url, data);
      return response;
    } catch (err: any) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

// Legacy unpay (использует refund)
export const onPayDebtDeal = createAsyncThunk<any, void | any>(
  "client/onPayDebtDeal",
  async ({ id, clientId }: any, { rejectWithValue }) => {
    try {
      // Используем refund с пустым amount для возврата всего
      const data = {
        idempotency_key: crypto.randomUUID(),
      };
      
      const url = clientId
        ? `/main/clients/${clientId}/deals/${id}/refund/`
        : `/main/clientdeals/${id}/refund/`;
      
      const { data: response } = await api.post(url, data);
      return response;
    } catch (err: any) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const cancellationOfPayment = createAsyncThunk<any, void | any>(
  "client/cancellationOfPayment",
  async (id: any, { rejectWithValue }) => {
    try {
      const { data: response } = await api.post(`/main/debts/${id}/`);
      return response;
    } catch (err: any) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const getClientSubscriptionSchedule = createAsyncThunk<any, void | any>(
  "client/subscriptionSchedule",
  async (clientId: any, { rejectWithValue }) => {
    try {
      const { data } = await api.get(
        `/main/clients/${clientId}/subscription-schedule/`,
      );
      return Array.isArray(data) ? data : data.items || data.results || [];
    } catch (err: any) {
      if (err?.response?.status === 404 || err?.response?.status === 501) {
        try {
          const { data } = await api.get(`/main/clients/${clientId}/deals/`);
          const deals = Array.isArray(data) ? data : data.results || [];
          return deals
            .filter(
              (d) =>
                d.kind === "subscription" ||
                d.subscription_amount ||
                String(d.title || "")
                  .toLowerCase()
                  .includes("абон"),
            )
            .map((d, i) => ({
              period_label:
                d.first_due_date?.slice(0, 7) ||
                d.created_at?.slice(0, 7) ||
                `Период ${i + 1}`,
              amount: Number(d.subscription_amount || d.amount || 0),
              status:
                Number(d.remaining_debt || 0) > 0 ? "planned" : "paid",
              paid: !(Number(d.remaining_debt || 0) > 0),
              active: i === 0,
            }));
        } catch {
          return [];
        }
      }
      return rejectWithValue(err.response?.data || err.message);
    }
  },
);

export const deleteDebt = createAsyncThunk<any, void | any>(
  "client/deleteDebt",
  async (arg: any, { rejectWithValue }) => {
    try {
      const id = typeof arg === "object" ? arg.id : arg;
      const clientId = typeof arg === "object" ? arg.clientId : null;
      const url = clientId
        ? `/main/clients/${clientId}/deals/${id}/`
        : `/main/clientdeals/${id}/`;
      const { data: response } = await api.delete(url);
      return response;
    } catch (err: any) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);
