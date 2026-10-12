// src/store/creators/userCreators.js
import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  registerUser,
  loginUser,
  getIndustries,
  getSubscriptionPlans,
  migrateUserPermissions,
} from "@entities/user/api/auth";
import api from "@shared/api";
import { setSector } from "@entities/sector";
import { mapSectorNameToSlug } from "@shared/lib/sectorMapping";
import { handleThunkError } from "@shared/lib/handleThunkError";

export const registerUserAsync = createAsyncThunk<any, void | any>(
  "user/register",
  async (props: any, { rejectWithValue }) => {
    try {
      const response = await registerUser(props.formData);
      if (response.status) {
        props.navigate("/login");
      }
      return response;
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);

export const loginUserAsync = createAsyncThunk<any, void | any>(
  "user/login",
  async (formData: any, { rejectWithValue, dispatch }) => {
    try {
      const response = await loginUser(formData);
      // Не кладём токены в userData — только не-секретный профиль при необходимости
      const { access, refresh, ...safeUserData } = response || {};
      try {
        localStorage.setItem("userData", JSON.stringify(safeUserData));
      } catch {
        /* ignore */
      }
      if (access) {
        localStorage.setItem("accessToken", access);
      }
      if (refresh) {
        localStorage.setItem("refreshToken", refresh);
      }

      if (access) {
        // Миграция permissions — не блокируем логин при её падении
        try {
          await migrateUserPermissions();
        } catch (migrationError: any) {
          console.error("Migration failed:", migrationError);
        }

        // Синхронизируем sector slug в Redux + localStorage для persistence
        try {
          const { data: company } = await api.get("/users/company/", {
            headers: {
              Authorization: `Bearer ${response.access}`,
            },
          });
          const slug = mapSectorNameToSlug(company?.sector?.name);
          if (slug) {
            dispatch(setSector(slug));
          }
        } catch (companyError: any) {
          console.error("Failed to sync sector on login:", companyError);
        }
      }

      return response;
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);

export const getIndustriesAsync = createAsyncThunk<any, void | any>(
  "user/getIndustries",
  async (_: any, { rejectWithValue }) => {
    try {
      const response = await getIndustries();
      return response;
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);

export const getSubscriptionPlansAsync = createAsyncThunk<any, void | any>(
  "user/getSubscriptionPlans",
  async (_: any, { rejectWithValue }) => {
    try {
      const response = await getSubscriptionPlans();
      return response;
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);

export const getCompany = createAsyncThunk<any, void | any>(
  "user/fetchCompany",
  async (_: any, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/users/company/", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });
      return data;
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);

export const submitApplicationAsync = createAsyncThunk<any, void | any>(
  "user/submitApplication",
  async (applicationData: any, { rejectWithValue }) => {
    try {
      const response = await api.post("/main/applications/", applicationData);
      return response.data;
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);

export const getApplicationList = createAsyncThunk<any, void | any>(
  "user/getApplicationList",
  async (_: any, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/main/applications/");
      return data;
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);

export const updateApplication = createAsyncThunk<any, void | any>(
  "user/updateApplication",
  async ({ id, updatedData }: any, { rejectWithValue }) => {
    try {
      const { data } = await api.patch(
        `/main/applications/${id}/`,
        updatedData
      );
      return data;
    } catch (err: any) {
      return handleThunkError(err, rejectWithValue);
    }
  }
);

export const updateUserData = createAsyncThunk<any, void | any>(
  "user/updateUserData",
  async (userData: any, { rejectWithValue }) => {
    try {
      const { data } = await api.patch(
        `/users/settings/change-password/`,
        userData
      );
      return data;
    } catch (err: any) {
      return handleThunkError(err, rejectWithValue);
    }
  }
);

export const updateUserCompanyName = createAsyncThunk<any, void | any>(
  "user/updateCompanyName",
  async (userData: any, { rejectWithValue }) => {
    try {
      const { data } = await api.patch(`/users/settings/company/`, userData);
      return data;
    } catch (err: any) {
      return handleThunkError(err, rejectWithValue);
    }
  }
);

/**
 * Вид магазина: PATCH /users/company/ {"market_sphere"}. Кассиру сервер
 * отвечает 403 — переключатель у него только для просмотра.
 */
export const updateMarketSphere = createAsyncThunk<any, string>(
  "user/updateMarketSphere",
  async (marketSphere, { rejectWithValue }) => {
    try {
      const { data } = await api.patch("/users/company/", {
        market_sphere: marketSphere,
      });
      return data;
    } catch (err: any) {
      return handleThunkError(err, rejectWithValue);
    }
  }
);

export const getScalesToken = createAsyncThunk<any, void | any>(
  "user/getScalesToken",
  async (_: any, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/users/scales/token/");
      return data;
    } catch (err: any) {
      return handleThunkError(err, rejectWithValue);
    }
  }
);

export const sendProductsToScales = createAsyncThunk<any, void | any>(
  "user/sendProductsToScales",
  async (payload: any, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/users/scales/send-products/", payload);
      return data;
    } catch (err: any) {
      return handleThunkError(err, rejectWithValue);
    }
  }
);
