export type StaffHome = "administration" | "executive" | "ticket" | "pwa" | null;

export type StaffDepartment = {
  id?: number | string;
  code: string;
  name: string;
};

export type StaffUserDepartment = {
  id: number | string;
  code: string;
  name: string;
};

export type StaffUser = {
  id: number | string;
  first_name: string;
  last_name: string;
  second_last_name: string | null;
  full_name: string;
  email: string;
  department: StaffUserDepartment | null;
  roles: string[];
  is_active: boolean;
};

export type StaffUserCatalog = {
  departments: Array<StaffUserDepartment & { suggested_role: string | null }>;
  roles: Array<{ name: string; label: string }>;
};

export type CreateStaffUserInput = {
  email: string;
  first_name: string;
  last_name: string;
  second_last_name?: string | null;
  department_id: number | string;
  role: string;
  password: string;
};

export type UpdateStaffUserInput = Partial<Omit<CreateStaffUserInput, "password">> & {
  password?: string;
};

export type StaffProfile = {
  id: number | string;
  first_name: string;
  last_name: string;
  second_last_name: string | null;
  full_name: string;
  email: string;
  department: StaffDepartment | null;
  roles: string[];
  permissions: string[];
  home: StaffHome;
  pwa_url: string | null;
  two_factor_setup_required: boolean;
};

export type LoginResult = {
  twoFactor: boolean;
};

export type ApiErrorPayload = {
  message: string;
  code?: string;
  errors?: Record<string, string[]>;
  retryAfterSeconds?: number;
};

export type TwoFactorChallenge = { code: string } | { recovery_code: string };

export type TwoFactorQrCode = {
  svg: string;
};
