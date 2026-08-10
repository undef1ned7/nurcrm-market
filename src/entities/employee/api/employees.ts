import api from "@shared/api";
export const fetchEmployeesApi = async (params: Record<string, unknown> = {}) => {
  try {
    const response = await api.get("/users/employees/", { params });
    // console.log(response: any);

    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Fetch Employees Error Data:", error.response.data);
      console.error("Fetch Employees Error Status:", error.response.status);
      return Promise.reject(error.response.data);
    }
  }
};

export const fetchEmployeeByIdApi = async (employeeId: any) => {
  try {
    const response = await api.get(`/users/users/${employeeId}/`);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error(
        `Fetch Employee (ID: ${employeeId}) Error Data:`,
        error.response.data
      );
      console.error(
        `Fetch Employee (ID: ${employeeId}) Error Status:`,
        error.response.status
      );
      return Promise.reject(error.response.data);
    }
  }
};

export const createEmployeeApi = async (employeeData: any) => {
  try {
    const response = await api.post("/users/employees/create/", employeeData);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Create Employee Error Data:", error.response.data);
      console.error("Create Employee Error Status:", error.response.status);
      return Promise.reject(error.response.data);
    }
  }
};

export const updateEmployeeApi = async (employeeId: any, employeeData: any) => {
  try {
    const response = await api.put(
      `/users/employees/${employeeId}/`,
      employeeData
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error(
        `Update Employee (ID: ${employeeId}) Error Data:`,
        error.response.data
      );
      console.error(
        `Update Employee (ID: ${employeeId}) Error Status:`,
        error.response.status
      );
      return Promise.reject(error.response.data);
    }
  }
};

export const deleteEmployeeApi = async (employeeId: any) => {
  try {
    await api.delete(`/users/employees/${employeeId}/`);
  } catch (error: any) {
    if (error.response) {
      console.error(
        `Delete Employee (ID: ${employeeId}) Error Data:`,
        error.response.data
      );
      console.error(
        `Delete Employee (ID: ${employeeId}) Error Status:`,
        error.response.status
      );
      return Promise.reject(error.response.data);
    }
  }
};
