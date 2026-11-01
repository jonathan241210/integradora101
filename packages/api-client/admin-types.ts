/**
 * DTO del contrato de `api-007` (administración). Los nombres van en
 * `snake_case`, tal como los entrega la API. Los importes llegan como cadena
 * con dos decimales y el cliente nunca los suma ni los promedia.
 */

export type PageMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from?: number | null;
  to?: number | null;
};

export type Paginated<T> = {
  data: T[];
  meta: PageMeta;
};

export type StaffRoleOption = {
  name: string;
  label: string;
};

export type StaffAccountDto = {
  id: number;
  first_name: string;
  last_name: string;
  second_last_name: string | null;
  full_name: string;
  email: string;
  department: { id: number; code: string; name: string } | null;
  role: StaffRoleOption | null;
  is_active: boolean;
  last_login_at: string | null;
  two_factor_confirmed: boolean;
};

export type StaffDepartmentOption = {
  id: number;
  code: string;
  name: string;
  suggested_role: string | null;
};

export type StaffOptionsDto = {
  departments: StaffDepartmentOption[];
  roles: StaffRoleOption[];
};

export type StaffListQuery = {
  search?: string;
  role?: string;
  department_id?: string;
  status?: "active" | "inactive" | "";
  page?: number;
  per_page?: number;
};

export type StaffCreateInput = {
  first_name: string;
  last_name: string;
  second_last_name?: string | null;
  email: string;
  department_id: number;
  role: string;
  password: string;
};

export type StaffUpdateInput = {
  first_name: string;
  last_name: string;
  second_last_name?: string | null;
  department_id: number;
  role: string;
};

export type NewsDto = {
  id: number;
  title: string;
  description: string | null;
  content: string;
  category: string;
  published_date: string;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
};

export type NewsInput = {
  title: string;
  description?: string | null;
  content: string;
  category: string;
  published_date: string;
  start_date?: string | null;
  end_date?: string | null;
  is_active?: boolean;
};

export type EventDto = {
  id: number;
  name: string;
  description: string | null;
  location: string | null;
  start_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  is_active: boolean;
};

export type EventInput = {
  name: string;
  description?: string | null;
  location?: string | null;
  start_date: string;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  is_active?: boolean;
};

export type EnclosureDto = {
  id: number;
  name: string;
  animals_count: number;
};

export type SalesTotalsDto = {
  tickets: number;
  adults: number;
  children: number;
  revenue: string;
};

export type DashboardSummaryDto = {
  /** Zona con la que la API calculó el panel (no se muestra). */
  timezone?: string;
  today: SalesTotalsDto;
  last_7_days: SalesTotalsDto;
  series: { date: string; revenue: string }[];
};

export type ReportPeriodType = "week" | "month" | "custom";

export type TicketReportQuery = {
  period: ReportPeriodType;
  date?: string;
  from?: string;
  to?: string;
  page?: number;
  /** Zona IANA; si falta, el paquete usa la del dispositivo. */
  timezone?: string;
};

export type DailySalesDto = SalesTotalsDto & { date: string };

export type TicketRowDto = {
  folio: string;
  purchased_at: string;
  adults: number;
  children: number;
  total: string;
};

export type TicketReportDto = {
  period: {
    type: ReportPeriodType;
    from: string;
    to: string;
    label: string;
    previous_date: string | null;
    next_date: string | null;
    timezone?: string;
  };
  totals: SalesTotalsDto;
  daily: DailySalesDto[];
  tickets: TicketRowDto[];
  meta: PageMeta;
};

export type ReportExportFormat = "csv" | "xlsx" | "pdf";
