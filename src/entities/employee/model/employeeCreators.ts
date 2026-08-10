import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  fetchEmployeesApi,
  fetchEmployeeByIdApi,
  createEmployeeApi,
  updateEmployeeApi,
  deleteEmployeeApi,
} from "@entities/employee/api/employees";
import api from "@shared/api";

export const fetchEmployeesAsync = createAsyncThunk<any, void | any>(
  "employees/fetchEmployees",
  async (params: any, { rejectWithValue }) => {
    try {
      const response = await fetchEmployeesApi(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error);
    }
  }
);

export const getDepartments = createAsyncThunk<any, void | any>(
  "employees/getDepartments",
  async (id) => {
    try {
      const response = await api.get(`/users/users/${id}/`);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        console.error(
          `Fetch Employee (ID: ${id}) Error Data:`,
          error.response.data
        );
        console.error(
          `Fetch Employee (ID: ${id}) Error Status:`,
          error.response.status
        );
        return Promise.reject(error.response.data);
      }
    }
  }
);

export const fetchEmployeeByIdAsync = createAsyncThunk<any, void | any>(
  "employees/fetchEmployeeById",
  async (employeeId: any, { rejectWithValue }) => {
    try {
      const employee = await fetchEmployeeByIdApi(employeeId);
      return employee;
    } catch (error: any) {
      return rejectWithValue(error);
    }
  }
);

export const createEmployeeAsync = createAsyncThunk<any, void | any>(
  "employees/createEmployee",
  async (employeeData: any, { rejectWithValue }) => {
    try {
      const newEmployee = await createEmployeeApi(employeeData);
      // console.log('New Employee Created:', newEmployee);

      return newEmployee;
    } catch (error: any) {
      return rejectWithValue(error);
    }
  }
);

export const updateEmployeeAsync = createAsyncThunk<any, void | any>(
  "employees/updateEmployee",
  async ({ employeeId, updatedData }: any, { rejectWithValue }) => {
    try {
      const updatedEmployee = await updateEmployeeApi(employeeId, updatedData);
      return updatedEmployee;
    } catch (error: any) {
      return rejectWithValue(error);
    }
  }
);

export const deleteEmployeeAsync = createAsyncThunk<any, void | any>(
  "employees/deleteEmployee",
  async (employeeId: any, { rejectWithValue }) => {
    try {
      await deleteEmployeeApi(employeeId);
      return employeeId;
    } catch (error: any) {
      return rejectWithValue(error);
    }
  }
);
