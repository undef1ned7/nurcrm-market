// src/creators/departmentCreators.js
import { createAsyncThunk } from "@reduxjs/toolkit";
import departmentAnalyticsApi from "@entities/department/api/departments";
import api from "@shared/api";

export const fetchDepartmentsAsync = createAsyncThunk(
  "departments/fetchAll",
  async (_: any, thunkAPI) => {
    try {
      return await departmentAnalyticsApi.getDepartmentAnalytics();
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err);
    }
  }
);

export const fetchDepartmentByIdAsync = createAsyncThunk(
  "departments/fetchById",
  async (id: any, thunkAPI) => {
    try {
      return await (departmentAnalyticsApi.getDepartmentAnalytics as any)(id);
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err);
    }
  }
);

export const updateEmployees = createAsyncThunk(
  "update/employee",
  async ({ id, data }: any, { rejectWithValue }) => {
    try {
      const { data: response } = await api.patch(
        `/users/employees/${id}/`,
        data
      );
      return response;
    } catch (e: any) {
      return rejectWithValue(e);
    }
  }
);

export const getEmployees = createAsyncThunk(
  "get/employee",
  async (_: any, { rejectWithValue }) => {
    try {
      const { data: response } = await api.get(`/users/employees/`);
      return response.results;
    } catch (e: any) {
      return rejectWithValue(e);
    }
  }
);

export const getDepartments = createAsyncThunk(
  "get/departments",
  async (_: any, { rejectWithValue }) => {
    try {
      const { data: response } = await api.get(`/construction/departments/`);
      return response.results;
    } catch (e: any) {
      return rejectWithValue(e);
    }
  }
);
