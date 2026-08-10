
export type RoleOption = {
  key: string;
  label: string;
};

export type RoleRow = {
  id: string | number;
  name: string;
  _sys?: boolean;
};

export type EmployeeForm = {
  email: string;
  first_name: string;
  last_name: string;
  roleChoice: string;
  track_number: string;
  phone_number: string;
  branch: string;
};

export type NormalizedEmployee = {
  id: number | string;
  email: string;
  first_name: string;
  last_name: string;
  role: string | null;
  custom_role: string | number | null;
  role_display: string;
  branches: unknown[];
  branch: unknown;
  track_number?: string;
  phone_number?: string;
  [key: string]: unknown;
};

export type ValidateEmployeeResult = {
  errs: Record<string, boolean>;
  alerts: string[];
};
