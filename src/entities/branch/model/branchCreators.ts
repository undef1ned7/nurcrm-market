// src/store/creators/branchCreators.js
import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "@shared/api";

// Универсально достаём список из пагинации/без неё
const listFrom = (res: any) => res?.data?.results || res?.data || [];

/* =================================================================== */
/*                               BRANCHES                              */
/* =================================================================== */

export const fetchBranchesAsync = createAsyncThunk(
  "branches/fetchAll",
  async (params: any = {}, { rejectWithValue }) => {
    try {
      const response = await api.get("/users/branches/", { params });
      return listFrom(response);
    } catch (error: any) {
      return rejectWithValue(error?.response?.data || error?.message);
    }
  }
);

export const createBranchAsync = createAsyncThunk(
  "branches/create",
  async (data: any, { rejectWithValue }) => {
    try {
      const response = await api.post("/users/branches/", data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data || error?.message);
    }
  }
);

export const updateBranchAsync = createAsyncThunk(
  "branches/update",
  async ({ branchId, updatedData }: any, { rejectWithValue }) => {
    try {
      const response = await api.patch(
        `/users/branches/${branchId}/`,
        updatedData
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data || error?.message);
    }
  }
);

export const deleteBranchAsync = createAsyncThunk(
  "branches/delete",
  async (branchId: any, { rejectWithValue }) => {
    try {
      await api.delete(`/users/branches/${branchId}/`);
      return branchId;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data || error?.message);
    }
  }
);

export const toggleBranchActiveAsync = createAsyncThunk(
  "branches/toggleActive",
  async ({ branchId, isActive }: any, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/users/branches/${branchId}/`, {
        is_active: isActive,
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data || error?.message);
    }
  }
);
