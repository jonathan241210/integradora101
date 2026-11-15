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
  /** URL pública de la imagen gestionada (`api-008`); `null` si no tiene. */
  image_url: string | null;
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
  /** Archivo nuevo (JPG, PNG o WebP, máx. 5 MB): la petición pasa a `multipart/form-data`. */
  image?: File | null;
  /** Quita la imagen guardada; si hay `image`, gana el archivo. */
  remove_image?: boolean;
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
  /** URL pública de la imagen gestionada (`api-008`); `null` si no tiene. */
  image_url: string | null;
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
  /** Archivo nuevo (JPG, PNG o WebP, máx. 5 MB): la petición pasa a `multipart/form-data`. */
  image?: File | null;
  /** Quita la imagen guardada; si hay `image`, gana el archivo. */
  remove_image?: boolean;
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

/** Página con `meta.has_more` (api-014: sin total ni última página). */
export type HasMorePage<T> = {
  data: T[];
  meta: { has_more: boolean };
};

export type MemoryReviewStatus = "submitted" | "in_review" | "accepted" | "rejected";

/** Valores de `rejected_fields` (api-010 RN-20): la foto y la opinión. */
export type MemoryRejectedField = "image" | "content";

export type MemoryReviewListQuery = { status?: MemoryReviewStatus; page?: number };

/** Fila de la lista de revisión (api-010 CA-07, M-1). Sin datos del visitante. */
export type MemoryReviewSummaryDto = {
  id: number;
  status: MemoryReviewStatus;
  opinion: string | null;
  created_at: string;
  resubmitted_count: number;
};

/** Detalle de revisión (api-010 CA-08, M-3). Sin URL de imagen ni datos del visitante. */
export type MemoryReviewDetailDto = {
  id: number;
  status: MemoryReviewStatus;
  opinion: string | null;
  created_at: string;
  resubmitted_count: number;
  rejection_reason: string | null;
  rejected_fields: MemoryRejectedField[];
  reviewed_at: string | null;
  published_at: string | null;
  published_until: string | null;
  is_published: boolean;
  publication_days: number;
};

export type MemoryRejectInput = {
  rejection_reason: string;
  rejected_fields: MemoryRejectedField[];
};

export type SpeciesCategory =
  | "mammal"
  | "bird"
  | "reptile"
  | "amphibian"
  | "fish"
  | "invertebrate";
export type SpeciesRequestStatus = "submitted" | "accepted" | "rejected";
export type SpeciesRequestType = "publish" | "update";
export type SpeciesPublicationStatus =
  | "not_published"
  | "pending"
  | "published"
  | "unpublished";
/** Claves de la ficha pública que la API acepta hoy (api-014 RN-13). */
export type SpeciesFichaField = "scientific_name" | "origin" | "habitat";

export type SpeciesRequestListQuery = {
  status?: SpeciesRequestStatus;
  page?: number;
};

export type SpeciesRequestSummaryDto = {
  id: number;
  species_id: number;
  common_name: string | null;
  scientific_name: string | null;
  category: SpeciesCategory | null;
  request_type: SpeciesRequestType;
  status: SpeciesRequestStatus;
  publication_status: SpeciesPublicationStatus;
  created_at: string;
  veterinarian_name: string | null;
};

export type SpeciesRequestDetailDto = {
  id: number;
  species_id: number;
  status: SpeciesRequestStatus;
  request_type: SpeciesRequestType;
  created_at: string;
  veterinarian_name: string | null;
  rejection_reason: string | null;
  published_fields: string[];
  current: {
    common_name: string;
    scientific_name: string | null;
    habitat: string | null;
    origin: string | null;
    category: SpeciesCategory | null;
    is_published: boolean;
    published_at: string | null;
    publication_status: SpeciesPublicationStatus;
    has_image: boolean;
  };
  proposed: {
    scientific_name: string | null;
    habitat: string | null;
    origin: string | null;
    category: SpeciesCategory | null;
    published_fields: string[];
    has_new_photo: boolean;
  };
};

/**
 * Campos cambiados al editar una solicitud pendiente o la ficha de una
 * especie despublicada (api-014 CA-15, CA-37). Vacío = sin corrección.
 */
export type SpeciesRequestUpdateInput = {
  scientific_name?: string;
  habitat?: string;
  origin?: string;
  category?: SpeciesCategory;
  published_fields?: SpeciesFichaField[];
  image?: File | null;
};

export type SpeciesRequestAcceptInput = { publish: boolean };
export type SpeciesRequestRejectInput = { rejection_reason: string };

export type PublishedSpeciesListQuery = {
  status?: "published" | "unpublished";
  category?: SpeciesCategory;
  page?: number;
};

export type PublishedSpeciesRowDto = {
  id: number;
  common_name: string;
  scientific_name: string | null;
  category: SpeciesCategory | null;
  status: "published" | "unpublished";
  published_at: string | null;
  unpublished_at: string | null;
  has_image: boolean;
  has_pending_request: boolean;
};

export type SpeciesPublicationDetailDto = {
  id: number;
  common_name: string;
  scientific_name: string | null;
  habitat: string | null;
  origin: string | null;
  category: SpeciesCategory | null;
  publication_status: SpeciesPublicationStatus;
  is_published: boolean;
  published_at: string | null;
  unpublished_at: string | null;
  /** La API puede enviar null en una especie sin ficha publicada. */
  published_fields: string[] | null;
  has_image: boolean;
  has_pending_request: boolean;
};

export type SpeciesPublicationUpdateInput = SpeciesRequestUpdateInput;
