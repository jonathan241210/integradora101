/**
 * DTO del contrato de `api-007` (administración). Los nombres van en
 * `snake_case`, tal como los entrega la API. Los importes llegan como cadena
 * con dos decimales y el cliente nunca los suma ni los promedia.
 */
import type { CancellationReasonCode } from "./ticket-sales-types";

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
  /** `true` en cuentas `admin`: solo lectura, se gestionan por consola (api-023 CA-13). */
  managed_by_console: boolean;
};

export type StaffDepartmentOption = {
  id: number;
  code: string;
  name: string;
  suggested_role: string | null;
};

/** Permiso etiquetado en español por la API (api-023 CA-10). */
export type StaffPermissionOption = {
  name: string;
  label: string;
};

/** Rol asignable de `users/options`; nunca incluye `admin` (api-023 CA-10). */
export type StaffAssignableRole = StaffRoleOption & {
  two_factor_required: boolean;
  permissions: StaffPermissionOption[];
};

export type StaffOptionsDto = {
  departments: StaffDepartmentOption[];
  roles: StaffAssignableRole[];
};

/** Aviso de un cambio de cuentas admin hecho por consola (api-023 CA-25). */
export type ConsoleNoticeDto = {
  id: number;
  action: string;
  account_email: string;
  origin: string;
  reason: string;
  created_at: string;
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
  is_active: boolean;
  animals_count: number;
  /** api-020 CA-14: verdadero si tiene al menos un código QR activo; nunca incluye el código. */
  has_active_qr: boolean;
};

/** api-020: código QR de un recinto; `svg` es un documento SVG generado en el servidor. */
export type EnclosureQr = {
  code: string;
  svg: string;
};

/** api-020: respuesta de consultar y generar el QR (`qr` es null si no hay código activo). */
export type EnclosureQrResponse = {
  enclosure: { id: number; name: string; is_active: boolean };
  qr: EnclosureQr | null;
};

/** api-020: regenerar siempre devuelve `qr` y cuántos códigos activos se desactivaron. */
export type EnclosureQrRegenerateResponse = EnclosureQrResponse & {
  qr: EnclosureQr;
  deactivated: number;
};

/**
 * api-019: elemento de la búsqueda global; `kind` solo lo lleva el grupo `tulanpedia`.
 * El 429 de `admin.search` llega como `ApiError` con `status === 429` y `retryAfterSeconds` (D-24 del plan).
 */
export type GlobalSearchItem = {
  id: number;
  title: string;
  subtitle: string;
  kind?: "published-species" | "species-request";
  /** Solo cuando la coincidencia está en un campo distinto del título (api-019, CA-42). */
  match?: GlobalSearchMatch;
};

/** `field` es la etiqueta en español del campo; `snippet` mide como máximo 120 caracteres. */
export type GlobalSearchMatch = { field: string; snippet: string };

export type GlobalSearchGroup = {
  section: string;
  label: string;
  /**
   * Relevancia del mejor elemento del grupo (api-019 CA-54); mayor = más relevante, comparable entre grupos.
   * Entero de 9 dígitos `A B C DD EEE F`: A título literal, B frase en el título, C frase en otro campo,
   * DD palabras que coinciden, EEE suma de niveles, F peor nivel.
   */
  best_score?: number;
  items: GlobalSearchItem[];
};

export type GlobalSearchResponse = {
  groups: GlobalSearchGroup[];
};

export type SalesTotalsDto = {
  tickets: number;
  adults: number;
  children: number;
  revenue: string;
};

export type DashboardSummaryDto = {
  /** Zona de negocio con la que la API calculó el panel (`api-025`; no se muestra). */
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

/**
 * Reporte de cancelaciones (`api-022`). Importes en cadenas con dos decimales; fechas
 * `purchased_at`/`cancelled_at` en ISO 8601 UTC. Todo total, conciliación, minuto, porcentaje
 * y señal lo calcula la API. Revisión 2026-11-21 (c): se retiran los campos de alerta antiguos
 * (el semáforo es la única alerta; ya no hay alerta por boleto ni por cajero) y se añaden `late_cancellation`, `signal_codes`,
 * `days_to_review` y `reasons[].folios`.
 */
export type CancellationReportQuery = {
  period: ReportPeriodType;
  date?: string;
  from?: string;
  to?: string;
  cashier_id?: number;
  reason_code?: CancellationReasonCode;
  /** Página de filas (api-022 CA-27, 50 por página); la exportación la ignora. */
  page?: number;
};

export type CancellationRowDto = {
  folio: number | string;
  adult_quantity: number;
  child_quantity: number;
  total_amount: string;
  /** `null` si la API no tiene la fecha (dato histórico incompleto). */
  purchased_at: string | null;
  cancelled_at: string | null;
  cashier_name: string | null;
  cancelled_by_name: string | null;
  reason_code: CancellationReasonCode | null;
  reason_label: string;
  comment: string | null;
  /** `null` si falta alguna de las dos fechas. */
  minutes_to_cancel: number | null;
  /** Cancelada más de 30 min después de la venta (la API decide el límite). */
  late_cancellation: boolean;
  /** Códigos de las señales del semáforo de su cajero y día en las que participa; vacío si ninguna. */
  signal_codes: string[];
};

export type CancellationReconciliationDayDto = {
  date: string;
  gross: string;
  cancelled: string;
  net: string;
  balanced: boolean;
};

/** Días del cajero en el periodo por nivel del semáforo (la API los cuenta). */
export type CancellationDaysToReviewDto = { attention: number; review: number };

export type CancellationReconciliationCashierDto = {
  /** `null` con el nombre «Sin cajero registrado» (`api-022`). */
  cashier_id: number | null;
  cashier_name: string;
  gross: string;
  cancelled: string;
  net: string;
  balanced: boolean;
  active_days: string[];
  sold_tickets: number;
  cancel_percent: number | string;
  days_to_review: CancellationDaysToReviewDto;
};

/** Nivel del semáforo de un cajero y día; lo decide `api-027` (el cliente no lo calcula). */
export type CancellationTrafficLight = "normal" | "review" | "attention";

export type CancellationReviewStatus = "reviewed_ok" | "clarification_required";

export type CancellationSignalReasonDto = {
  code: string;
  label: string;
  count: number;
  detail: string;
  /** Folios (`tickets.id` como texto, no `qr_code`) de los boletos que activan la señal. */
  folios: string[];
};

/** Revisión vigente o entrada del historial (`api-027`). */
export type CancellationReviewDto = {
  id: number;
  status: CancellationReviewStatus;
  status_label: string;
  note: string;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
};

/** Semáforo por cajero y día (`reconciliation.cashier_days[]`). */
export type CancellationTrafficLightDto = {
  cashier_id: number | null;
  cashier_name: string;
  date: string;
  traffic_light: CancellationTrafficLight | null;
  traffic_light_label: string | null;
  signals_count: number;
  /** Cifras del día (`api-027`, aditivas); el cliente solo las muestra. */
  sold_tickets?: number;
  cancelled_tickets?: number;
  cancel_percent?: number | string;
  reasons: CancellationSignalReasonDto[];
  reason_sentence: string | null;
  action: string;
  review: CancellationReviewDto | null;
};

export type CancellationLegendDto = {
  code: string;
  label: string;
  explanation: string;
  limit: string;
};

/**
 * Nivel del semáforo con su condición, calculado por la API desde `attention_min_signals`
 * (`GET reports/cancellations` → `data.levels[]`). El cliente lo pinta tal como llega.
 */
export type CancellationLevelDto = {
  code: CancellationTrafficLight;
  label: string;
  condition: string;
};

export type CancellationReviewInput = {
  cashier_id: number;
  business_date: string;
  status: CancellationReviewStatus;
  note: string;
};

export type CancellationReportDto = {
  period: {
    type: ReportPeriodType;
    from: string;
    to: string;
    label: string;
    previous_date: string | null;
    next_date: string | null;
    timezone?: string;
  };
  totals: {
    cancelled_tickets: number;
    cancelled_amount: string;
    by_cashier: {
      cashier_id: number | null;
      cashier_name: string;
      cancelled_tickets: number;
      cancelled_amount: string;
    }[];
    by_reason: {
      reason_code: CancellationReasonCode | null;
      reason_label: string;
      cancelled_tickets: number;
      cancelled_amount: string;
    }[];
  };
  reconciliation: {
    days: CancellationReconciliationDayDto[];
    cashiers: CancellationReconciliationCashierDto[];
    /** Semáforo por cajero y día (`api-027`); ausente con una API anterior. */
    cashier_days?: CancellationTrafficLightDto[];
  };
  /** Leyenda y aviso del semáforo (`api-027`). */
  legend?: CancellationLegendDto[];
  /** Niveles con su condición, calculados en la API; ausente o vacío: no se muestra la tabla. */
  levels?: CancellationLevelDto[];
  disclaimer?: string;
  rows: CancellationRowDto[];
  /** `meta` de las filas (api-022 rev. 2026-11-21), hermano de `data` en la respuesta. */
  meta?: PageMeta;
};

/** Cajero del filtro (`GET reports/cancellations/cashiers`, solo `id` y nombre). */
export type CancellationCashierOption = { id: number; name: string };

/**
 * Página solo con `meta.has_more` (respaldo; api-014 original, sin total).
 * Las listas actuales entregan total: ver `TotalPage`.
 */
export type HasMorePage<T> = {
  data: T[];
  meta: { has_more: boolean };
};

/**
 * `meta` de las listas con total (api-012 rev., api-014 rev. 2026-11-21):
 * `has_more` es opcional (la API lo conserva; si falta se deduce de las páginas).
 */
export type ListPageMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  has_more?: boolean;
};

/** Página con total: momentos, solicitudes y publicadas del panel, y «Mis solicitudes». */
export type TotalPage<T> = {
  data: T[];
  meta: ListPageMeta;
};

export type MemoryReviewStatus = "submitted" | "in_review" | "accepted" | "rejected";

/** Valores de `rejected_fields` (api-010 RN-20): la foto y la opinión. */
export type MemoryRejectedField = "image" | "content";

export type MemoryReviewListQuery = {
  status?: MemoryReviewStatus;
  page?: number;
  /** Filas por página (1..50; la API usa 10 por defecto). */
  limit?: number;
};

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
export type SpeciesFichaField =
  | "scientific_name"
  | "origin"
  | "habitat"
  | "fun_fact";

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
    /** api-026 CA-15: dato curioso vigente de la especie. */
    fun_fact?: string | null;
  };
  proposed: {
    scientific_name: string | null;
    habitat: string | null;
    origin: string | null;
    category: SpeciesCategory | null;
    published_fields: string[];
    has_new_photo: boolean;
    /** api-026 CA-15: dato curioso que se publicaría. */
    fun_fact?: string | null;
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
  /** api-026 CA-05: dato curioso (20 a 500 caracteres si se muestra). */
  fun_fact?: string;
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
  /** api-026 CA-15: dato curioso de la especie. */
  fun_fact?: string | null;
  has_image: boolean;
  has_pending_request: boolean;
};

export type SpeciesPublicationUpdateInput = SpeciesRequestUpdateInput;

/**
 * Conteos de pendientes de revisión (api-024). Cada clave solo llega si el
 * usuario tiene el permiso correspondiente; van en la raíz, sin `data`.
 */
export type PendingReviewCountsDto = {
  species_requests?: number;
  memories?: number;
  /** Días de cancelaciones en Atención sin revisar (`api-027`); solo con `reports.cancellations.view`. */
  cancellation_days?: number;
};
