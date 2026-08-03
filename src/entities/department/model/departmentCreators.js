// src/creators/departmentCreators.js
import { createAsyncThunk } from "@reduxjs/toolkit";
import departmentAnalyticsApi from "@entities/department/api/departments";
import api from "@shared/api";

export const fetchDepartmentsAsync = createAsyncThunk(
  "departments/fetchAll",
  async (_, thunkAPI) => {
    try {
      return await departmentAnalyticsApi.getDepartmentAnalytics();
    } catch (err) {
      return thunkAPI.rejectWithValue(err);
    }
  }
);

export const fetchDepartmentByIdAsync = createAsyncThunk(
  "departments/fetchById",
  async (id, thunkAPI) => {
    try {
      return await departmentAnalyticsApi.getDepartmentAnalytics(id);
    } catch (err) {
      return thunkAPI.rejectWithValue(err);
    }
  }
);

export const updateEmployees = createAsyncThunk(
  "update/employee",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const { data: response } = await api.patch(
        `/users/employees/${id}/`,
        data
      );
      return response;
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);

export const getEmployees = createAsyncThunk(
  "get/employee",
  async (_, { rejectWithValue }) => {
    try {
      const { data: response } = await api.get(`/users/employees/`);
      return response.results;
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);

export const getDepartments = createAsyncThunk(
  "get/departments",
  async (_, { rejectWithValue }) => {
    try {
      const { data: response } = await api.get(`/construction/departments/`);
      return response.results;
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);
