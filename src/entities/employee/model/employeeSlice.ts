import { createSlice } from "@reduxjs/toolkit";
import {
  fetchEmployeesAsync,
  fetchEmployeeByIdAsync,
  createEmployeeAsync,
  updateEmployeeAsync,
  deleteEmployeeAsync,
  getDepartments,
} from "./employeeCreators";

const initialState = {
  list: [] as any[],
  currentEmployee: null as any,
  count: 0,
  next: null as any,
  previous: null as any,
  loading: false,
  error: null as any,
  creating: false,
  createError: null as any,
  updating: false,
  updateError: null as any,
  deleting: false,
  deleteError: null as any,
  department: null as any,
};

const employeeSlice = createSlice({
  name: "employee",
  initialState,
  reducers: {
    clearEmployees: (state) => {
      state.list = [];
      state.count = 0;
      state.next = null;
      state.previous = null;
      state.loading = false;
      state.error = null;
    },
    clearCurrentEmployee: (state) => {
      state.currentEmployee = null;
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEmployeesAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEmployeesAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.results;
        state.count = action.payload.count;
        state.next = action.payload.next;
        state.previous = action.payload.previous;
      })
      .addCase(fetchEmployeesAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchEmployeeByIdAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEmployeeByIdAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.currentEmployee = action.payload;
      })
      .addCase(fetchEmployeeByIdAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getDepartments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDepartments.fulfilled, (state, action) => {
        state.loading = false;
        state.department = action.payload;
      })
      .addCase(getDepartments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createEmployeeAsync.pending, (state) => {
        state.creating = true;
        state.createError = null;
      })
      .addCase(createEmployeeAsync.fulfilled, (state) => {
        state.creating = false;
        // state.list.unshift(action.payload);
        // state.count += 1;
      })
      .addCase(createEmployeeAsync.rejected, (state, action) => {
        state.creating = false;
        state.createError = action.payload;
      })
      .addCase(updateEmployeeAsync.pending, (state) => {
        state.updating = true;
        state.updateError = null;
      })
      .addCase(updateEmployeeAsync.fulfilled, (state, action) => {
        state.updating = false;
        const index = state.list.findIndex(
          (employee) => employee.id === action.payload.id
        );
        if (index !== -1) {
          state.list[index] = action.payload;
        }
        if (
          state.currentEmployee &&
          state.currentEmployee.id === action.payload.id
        ) {
          state.currentEmployee = action.payload;
        }
      })
      .addCase(updateEmployeeAsync.rejected, (state, action) => {
        state.updating = false;
        state.updateError = action.payload;
      })
      .addCase(deleteEmployeeAsync.pending, (state) => {
        state.deleting = true;
        state.deleteError = null;
      })
      .addCase(deleteEmployeeAsync.fulfilled, (state, action) => {
        state.deleting = false;
        state.list = state.list.filter(
          (employee) => employee.id !== action.payload
        );
        state.count -= 1;
      })
      .addCase(deleteEmployeeAsync.rejected, (state, action) => {
        state.deleting = false;
        state.deleteError = action.payload;
      });
  },
});

export const { clearEmployees, clearCurrentEmployee } = employeeSlice.actions;
export default employeeSlice.reducer;
