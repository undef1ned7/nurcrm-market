import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  getNotifications,
  markAllNotificationsRead,
  getNotificationDetail,
  markNotificationRead,
  deleteNotification,
} from "@entities/notification/api/notification";
import { consultingNotificationLeadId } from "@shared/lib/consultingLeadSources";

const isUnread = (n: any) => !(n?.is_read ?? n?.read ?? false);
const idOf = (n: any) => n?.id ?? n?.uuid ?? n?.pk;

export const fetchNotificationsAsync = createAsyncThunk(
  'notification/fetchAll',
  async (params: any, thunkAPI) => {
    try {
      const data = await getNotifications(params);
      // Признак догрузки страницы (lazy load) — не затирать список, а добавить.
      // countOnly — только пересинхронизировать unread_count (после реконнекта WS).
      return {
        data,
        append: Boolean(params?.append),
        countOnly: Boolean(params?.countOnly),
        offset: params?.offset || 0,
      };
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err);
    }
  }
);

// Отметить ОДНО уведомление прочитанным (с оптимистичным обновлением в слайсе).
export const markNotificationReadAsync = createAsyncThunk(
  'notification/markOneRead',
  async (id: any, thunkAPI) => {
    try {
      await markNotificationRead(id);
      return id;
    } catch (err: any) {
      return thunkAPI.rejectWithValue({ id, err });
    }
  }
);

/**
 * Открыли чат лида → все непрочитанные уведомления по этому lead_id
 * помечаем прочитанными (колокольчик + POST /notifications/{id}/read/).
 */
export const markLeadNotificationsReadAsync = createAsyncThunk(
  'notification/markLeadRead',
  async (leadId: any, thunkAPI) => {
    const id = leadId != null ? String(leadId) : '';
    if (!id) return { leadId: id, ids: [] as any[] };

    let list = (thunkAPI.getState() as any).notification?.list || [];
    if (!list.length) {
      try {
        await thunkAPI
          .dispatch(fetchNotificationsAsync({ limit: 50, offset: 0 }))
          .unwrap();
      } catch {
        /* список опционален — всё равно пробуем локальный стейт */
      }
      list = (thunkAPI.getState() as any).notification?.list || [];
    }

    const targets = list.filter(
      (n: any) =>
        isUnread(n) && String(consultingNotificationLeadId(n) || '') === id,
    );
    const ids = targets.map(idOf).filter((x: any) => x != null && x !== '');

    // Оптимистично до API (тип = notificationSlice.markLeadNotificationsReadLocal).
    thunkAPI.dispatch({
      type: 'notification/markLeadNotificationsReadLocal',
      payload: id,
    });

    await Promise.allSettled(
      ids.map(async (notifId: any) => {
        try {
          await markNotificationRead(notifId);
        } catch {
          /* синтетический id от WS — локально уже прочитано */
        }
      }),
    );
    return { leadId: id, ids };
  },
);

export const markAllNotificationsReadAsync = createAsyncThunk(
  'notification/markAllRead',
  async (_: any, thunkAPI) => {
    try {
      return await markAllNotificationsRead();
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err);
    }
  }
);

export const deleteNotificationAsync = createAsyncThunk(
  "notification/deleteOne",
  async (id: any, thunkAPI) => {
    try {
      await deleteNotification(id);
      return id;
    } catch (err: any) {
      return thunkAPI.rejectWithValue({ id, err });
    }
  },
);

export const fetchNotificationDetailAsync = createAsyncThunk(
  'notification/fetchOne',
  async (id: any, thunkAPI) => {
    try {
      return await getNotificationDetail(id);
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err);
    }
  }
);
