export type StaffHome = "administration" | "executive" | "ticket" | "pwa" | null;

export type StaffDepartment = {
  code: string;
  name: string;
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
  data?: unknown;
};

export type TwoFactorChallenge = { code: string } | { recovery_code: string };

export type TwoFactorQrCode = {
  svg: string;
};
