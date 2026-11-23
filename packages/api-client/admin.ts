import type { DownloadedFile, ExtendedHttpClient } from "./http";
import type {
  CancellationCashierOption,
  CancellationReportDto,
  CancellationReviewDto,
  CancellationReviewInput,
  CancellationReportQuery,
  ConsoleNoticeDto,
  PendingReviewCountsDto,
  DashboardSummaryDto,
  EnclosureDto,
  EnclosureQrRegenerateResponse,
  EnclosureQrResponse,
  EventDto,
  EventInput,
  GlobalSearchResponse,
  ListPageMeta,
  TotalPage,
  MemoryRejectInput,
  MemoryReviewDetailDto,
  MemoryReviewListQuery,
  MemoryReviewSummaryDto,
  NewsDto,
  NewsInput,
  PageMeta,
  Paginated,
  PublishedSpeciesListQuery,
  PublishedSpeciesRowDto,
  ReportExportFormat,
  SpeciesPublicationDetailDto,
  SpeciesPublicationUpdateInput,
  SpeciesRequestAcceptInput,
  SpeciesRequestDetailDto,
  SpeciesRequestListQuery,
  SpeciesRequestRejectInput,
  SpeciesRequestSummaryDto,
  SpeciesRequestUpdateInput,
  StaffAccountDto,
  StaffCreateInput,
  StaffListQuery,
  StaffOptionsDto,
  StaffUpdateInput,
  TicketReportDto,
  TicketReportQuery,
  TicketRowDto,
} from "./admin-types";

const base = "/api/v1/admin";

type Enveloped<T> = T | { data: T };

function unwrap<T>(response: Enveloped<T>): T {
  if (
    typeof response === "object" &&
    response !== null &&
    !Array.isArray(response) &&
    "data" in response
  ) {
    return (response as { data: T }).data;
  }

  return response as T;
}

function unwrapList<T>(response: Enveloped<T[]>): T[] {
  const list = unwrap(response);

  return Array.isArray(list) ? list : [];
}

function queryString(values: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === "") continue;
    params.set(key, String(value));
  }

  const text = params.toString();

  return text ? `?${text}` : "";
}

function emptyMeta(count: number): PageMeta {
  return { current_page: 1, last_page: 1, per_page: count, total: count };
}

function normalizePage<T>(response: Partial<Paginated<T>> | T[]): Paginated<T> {
  if (Array.isArray(response)) {
    return { data: response, meta: emptyMeta(response.length) };
  }

  const data = Array.isArray(response.data) ? response.data : [];

  return { data, meta: response.meta ?? emptyMeta(data.length) };
}

type RawTicketReport = Omit<TicketReportDto, "tickets" | "meta"> & {
  tickets: TicketRowDto[] | { data: TicketRowDto[]; meta?: PageMeta };
  meta?: PageMeta;
};

function normalizeTicketReport(raw: RawTicketReport): TicketReportDto {
  const rows = Array.isArray(raw.tickets) ? raw.tickets : raw.tickets.data;
  const nestedMeta = Array.isArray(raw.tickets) ? undefined : raw.tickets.meta;

  return {
    period: raw.period,
    totals: raw.totals,
    daily: raw.daily,
    tickets: rows,
    meta: raw.meta ?? nestedMeta ?? emptyMeta(rows.length),
  };
}

/**
 * Filtros del reporte de cancelaciones (`api-022`). Nunca envía `timezone`: la API usa su
 * zona de negocio y la informa en `period.timezone` (`api-025` RN-04, `dashboard-019`).
 */
function cancellationParams(query: CancellationReportQuery) {
  return {
    period: query.period,
    date: query.date,
    from: query.from,
    to: query.to,
    cashier_id: query.cashier_id,
    reason_code: query.reason_code,
  };
}

function reportParams(query: TicketReportQuery) {
  return {
    period: query.period,
    date: query.date,
    from: query.from,
    to: query.to,
  };
}

type ContentImageInput = {
  image?: File | null;
  remove_image?: boolean;
};

function hasImageFile(input: ContentImageInput): input is { image: File } {
  return typeof Blob !== "undefined" && input.image instanceof Blob;
}

/**
 * Cuerpo `multipart/form-data` de noticias y eventos con imagen (`api-008`).
 * `null` se envía como cadena vacía (Laravel la normaliza a `null`) y los
 * booleanos como `1`/`0`. Con archivo, `remove_image` se omite: gana el archivo.
 */
function contentFormData(
  input: ContentImageInput & Record<string, unknown>,
  method?: "PATCH",
): FormData {
  const form = new FormData();

  for (const [key, value] of Object.entries(input)) {
    if (key === "image" || key === "remove_image" || value === undefined) continue;
    form.append(key, typeof value === "boolean" ? (value ? "1" : "0") : value === null ? "" : String(value));
  }

  form.append("image", input.image as File);
  if (method) form.append("_method", method);

  return form;
}

/** JSON sin el campo `image` (nulo o ausente); conserva `remove_image`. */
function contentJson<Input extends ContentImageInput>(input: Input) {
  const { image: _image, ...rest } = input;

  return rest;
}

/**
 * Normaliza una lista con total. Si la API aún no envía `current_page`/`last_page`
 * (o falta `meta`), cae a una sola página y `has_more` solo si la API lo indica.
 */
export function normalizeTotalPage<T>(
  response: Partial<TotalPage<T>> | T[] | undefined,
): TotalPage<T> {
  const data = Array.isArray(response)
    ? response
    : Array.isArray(response?.data)
      ? response.data
      : [];
  const meta: Partial<ListPageMeta> = Array.isArray(response) ? {} : (response?.meta ?? {});
  const current = typeof meta.current_page === "number" ? meta.current_page : 1;
  const last = typeof meta.last_page === "number" ? Math.max(1, meta.last_page) : 1;

  return {
    data,
    meta: {
      current_page: current,
      last_page: last,
      per_page: typeof meta.per_page === "number" ? meta.per_page : data.length,
      total: typeof meta.total === "number" ? meta.total : data.length,
      has_more: typeof meta.has_more === "boolean" ? meta.has_more : current < last,
    },
  };
}

/**
 * Cuerpo de edición de ficha (api-014 CA-15, CA-21, CA-37). `published_fields`
 * viaja como cadena JSON, en JSON y en multipart (plan, pregunta 4).
 */
function speciesSheetBody(input: SpeciesRequestUpdateInput) {
  const { image: _image, published_fields: fields, ...rest } = input;

  return fields === undefined
    ? rest
    : { ...rest, published_fields: JSON.stringify(fields) };
}

function speciesSheetUpdate<Dto>(
  http: ExtendedHttpClient,
  path: string,
  input: SpeciesRequestUpdateInput,
): Promise<Dto> {
  const body = speciesSheetBody(input);

  // PHP no entrega multipart en PATCH: con archivo, POST + `_method=PATCH`.
  if (hasImageFile(input)) {
    return http
      .post<Enveloped<Dto>>(path, contentFormData({ ...body, image: input.image }, "PATCH"))
      .then(unwrap);
  }

  return http.patch<Enveloped<Dto>>(path, body).then(unwrap);
}

export function createAdminApi(http: ExtendedHttpClient) {
  const content = <Dto, Input extends ContentImageInput>(resource: string) => {
    const path = `${base}/${resource}`;

    return {
      async list(): Promise<Dto[]> {
        return unwrapList(await http.get<Enveloped<Dto[]>>(path));
      },
      async create(input: Input): Promise<Dto> {
        const body = hasImageFile(input)
          ? contentFormData(input as Input & Record<string, unknown>)
          : contentJson(input);

        return unwrap(await http.post<Enveloped<Dto>>(path, body));
      },
      async update(id: number, input: Input): Promise<Dto> {
        // PHP no entrega multipart en PATCH: con archivo, POST + `_method=PATCH`.
        if (hasImageFile(input)) {
          return unwrap(
            await http.post<Enveloped<Dto>>(
              `${path}/${id}`,
              contentFormData(input as Input & Record<string, unknown>, "PATCH"),
            ),
          );
        }

        return unwrap(
          await http.patch<Enveloped<Dto>>(`${path}/${id}`, contentJson(input)),
        );
      },
      async setStatus(id: number, isActive: boolean): Promise<void> {
        await http.patch<unknown>(`${path}/${id}/status`, {
          is_active: isActive,
        });
      },
      async remove(id: number): Promise<void> {
        await http.delete<unknown>(`${path}/${id}`);
      },
    };
  };

  return {
    users: {
      async list(query: StaffListQuery = {}): Promise<Paginated<StaffAccountDto>> {
        return normalizePage(
          await http.get<Paginated<StaffAccountDto>>(
            `${base}/users${queryString({ ...query })}`,
          ),
        );
      },
      async options(): Promise<StaffOptionsDto> {
        return unwrap(
          await http.get<Enveloped<StaffOptionsDto>>(`${base}/users/options`),
        );
      },
      async create(input: StaffCreateInput): Promise<StaffAccountDto> {
        return unwrap(
          await http.post<Enveloped<StaffAccountDto>>(`${base}/users`, input),
        );
      },
      async get(id: number): Promise<StaffAccountDto> {
        return unwrap(
          await http.get<Enveloped<StaffAccountDto>>(`${base}/users/${id}`),
        );
      },
      async update(
        id: number,
        input: StaffUpdateInput & { password?: string },
      ): Promise<StaffAccountDto> {
        return unwrap(
          await http.patch<Enveloped<StaffAccountDto>>(
            `${base}/users/${id}`,
            input,
          ),
        );
      },
      async setStatus(id: number, isActive: boolean): Promise<void> {
        await http.patch<unknown>(`${base}/users/${id}/status`, {
          is_active: isActive,
        });
      },
      async remove(id: number): Promise<void> {
        await http.delete<unknown>(`${base}/users/${id}`);
      },
      /**
       * `currentPassword` es la contraseña de quien opera (confirmación,
       * api-021 RN-16) y `password` la nueva de la otra cuenta (dashboard-015 CA-17).
       */
      async resetPassword(
        id: number,
        password: string,
        currentPassword?: string,
      ): Promise<void> {
        await http.put<unknown>(`${base}/users/${id}/password`, {
          password,
          ...(currentPassword !== undefined
            ? { current_password: currentPassword }
            : {}),
        });
      },
      async resetTwoFactor(id: number, password?: string): Promise<void> {
        await http.delete<unknown>(
          `${base}/users/${id}/two-factor`,
          password !== undefined ? { password } : undefined,
        );
      },
    },
    /** `GET /pending-counts` (api-024): el cuerpo se devuelve tal cual, sin `data`. */
    async pendingCounts(): Promise<PendingReviewCountsDto> {
      return http.get<PendingReviewCountsDto>(`${base}/pending-counts`);
    },
    consoleNotices: {
      /** Solo avisos no leídos del actor (api-023 CA-25). */
      async list(): Promise<ConsoleNoticeDto[]> {
        return unwrapList(
          await http.get<Enveloped<ConsoleNoticeDto[]>>(`${base}/console-notices`),
        );
      },
      /** 204 sin cuerpo (api-023 CA-26). */
      async read(id: number): Promise<void> {
        await http.post<unknown>(`${base}/console-notices/${id}/read`);
      },
    },
    passwordConfirmation: {
      async confirm(password: string): Promise<{ confirmed_until?: string }> {
        return unwrap(
          await http.post<Enveloped<{ confirmed_until?: string }>>(
            `${base}/password-confirmation`,
            { password },
          ),
        );
      },
    },
    news: content<NewsDto, NewsInput>("news"),
    events: content<EventDto, EventInput>("events"),
    enclosures: {
      async list(): Promise<EnclosureDto[]> {
        return unwrapList(
          await http.get<Enveloped<EnclosureDto[]>>(`${base}/enclosures`),
        );
      },
      async create(input: { name: string }): Promise<EnclosureDto> {
        return unwrap(
          await http.post<Enveloped<EnclosureDto>>(`${base}/enclosures`, input),
        );
      },
      async rename(id: number, input: { name: string }): Promise<EnclosureDto> {
        return unwrap(
          await http.patch<Enveloped<EnclosureDto>>(
            `${base}/enclosures/${id}`,
            input,
          ),
        );
      },
      /** api-019: activa o desactiva un recinto (booleano JSON estricto). */
      async setStatus(id: number, isActive: boolean): Promise<EnclosureDto> {
        return unwrap(
          await http.patch<Enveloped<EnclosureDto>>(
            `${base}/enclosures/${id}/status`,
            { is_active: isActive },
          ),
        );
      },
      /** api-019: borrado lógico; los animales conservan su recinto. */
      async remove(id: number): Promise<void> {
        await http.delete<unknown>(`${base}/enclosures/${id}`);
      },
      /** api-020: código QR activo del recinto (solo lectura). */
      async qr(id: number): Promise<EnclosureQrResponse> {
        return http.get<EnclosureQrResponse>(`${base}/enclosures/${id}/qr`);
      },
      /** api-020: genera el QR si no hay uno activo; si lo hay, devuelve el mismo. */
      async generateQr(id: number): Promise<EnclosureQrResponse> {
        return http.post<EnclosureQrResponse>(`${base}/enclosures/${id}/qr`, {});
      },
      /** api-020: desactiva los códigos activos y crea uno nuevo. */
      async regenerateQr(id: number): Promise<EnclosureQrRegenerateResponse> {
        return http.post<EnclosureQrRegenerateResponse>(
          `${base}/enclosures/${id}/qr/regenerate`,
          {},
        );
      },
    },
    /** api-019: búsqueda global de solo lectura; el servidor decide los grupos visibles. */
    async search(q: string): Promise<GlobalSearchResponse> {
      return http.get<GlobalSearchResponse>(`${base}/search${queryString({ q })}`);
    },
    /** Revisión de momentos de visitantes (api-010, consumida por dashboard-008). */
    memoryReview: {
      async list(
        query: MemoryReviewListQuery = {},
      ): Promise<TotalPage<MemoryReviewSummaryDto>> {
        return normalizeTotalPage(
          await http.get<TotalPage<MemoryReviewSummaryDto>>(
            `${base}/memories${queryString({ ...query })}`,
          ),
        );
      },
      /** Abrir una petición enviada la pasa a «En proceso» en la API. */
      async get(id: number): Promise<MemoryReviewDetailDto> {
        return unwrap(
          await http.get<Enveloped<MemoryReviewDetailDto>>(`${base}/memories/${id}`),
        );
      },
      /** Ruta relativa del mismo origen; devuelve el binario como blob (api-013 D-06). */
      image(id: number): Promise<DownloadedFile> {
        return http.download(`${base}/memories/${id}/image`);
      },
      /** Sin cuerpo; el cuerpo de la respuesta no se usa (api-010 CA-11). */
      async accept(id: number): Promise<void> {
        await http.post<unknown>(`${base}/memories/${id}/accept`);
      },
      async reject(id: number, input: MemoryRejectInput): Promise<void> {
        await http.post<unknown>(`${base}/memories/${id}/reject`, {
          rejection_reason: input.rejection_reason,
          rejected_fields: input.rejected_fields,
        });
      },
    },
    speciesPublicationRequests: {
      async list(
        query: SpeciesRequestListQuery = {},
      ): Promise<TotalPage<SpeciesRequestSummaryDto>> {
        return normalizeTotalPage(
          await http.get<TotalPage<SpeciesRequestSummaryDto>>(
            `${base}/species-publication-requests${queryString({ ...query })}`,
          ),
        );
      },
      async get(id: number): Promise<SpeciesRequestDetailDto> {
        return unwrap(
          await http.get<Enveloped<SpeciesRequestDetailDto>>(
            `${base}/species-publication-requests/${id}`,
          ),
        );
      },
      update(
        id: number,
        input: SpeciesRequestUpdateInput,
      ): Promise<SpeciesRequestDetailDto> {
        return speciesSheetUpdate(
          http,
          `${base}/species-publication-requests/${id}`,
          input,
        );
      },
      /** La API responde con la ficha de la especie, no con la solicitud. */
      async accept(
        id: number,
        input: SpeciesRequestAcceptInput,
      ): Promise<SpeciesPublicationDetailDto> {
        return unwrap(
          await http.post<Enveloped<SpeciesPublicationDetailDto>>(
            `${base}/species-publication-requests/${id}/accept`,
            { publish: input.publish },
          ),
        );
      },
      /** La API responde con el detalle de la solicitud ya rechazada. */
      async reject(
        id: number,
        input: SpeciesRequestRejectInput,
      ): Promise<SpeciesRequestDetailDto> {
        return unwrap(
          await http.post<Enveloped<SpeciesRequestDetailDto>>(
            `${base}/species-publication-requests/${id}/reject`,
            { rejection_reason: input.rejection_reason },
          ),
        );
      },
      image(id: number): Promise<DownloadedFile> {
        return http.download(`${base}/species-publication-requests/${id}/image`);
      },
    },
    publishedSpecies: {
      async list(
        query: PublishedSpeciesListQuery = {},
      ): Promise<TotalPage<PublishedSpeciesRowDto>> {
        return normalizeTotalPage(
          await http.get<TotalPage<PublishedSpeciesRowDto>>(
            `${base}/published-species${queryString({ ...query })}`,
          ),
        );
      },
      async get(id: number): Promise<SpeciesPublicationDetailDto> {
        return unwrap(
          await http.get<Enveloped<SpeciesPublicationDetailDto>>(
            `${base}/species/${id}/publication`,
          ),
        );
      },
      update(
        id: number,
        input: SpeciesPublicationUpdateInput,
      ): Promise<SpeciesPublicationDetailDto> {
        return speciesSheetUpdate(http, `${base}/species/${id}/publication`, input);
      },
      async unpublish(id: number): Promise<SpeciesPublicationDetailDto> {
        return unwrap(
          await http.post<Enveloped<SpeciesPublicationDetailDto>>(
            `${base}/species/${id}/unpublish`,
          ),
        );
      },
      async republish(id: number): Promise<SpeciesPublicationDetailDto> {
        return unwrap(
          await http.post<Enveloped<SpeciesPublicationDetailDto>>(
            `${base}/species/${id}/republish`,
          ),
        );
      },
      async removePublication(id: number): Promise<SpeciesPublicationDetailDto> {
        return unwrap(
          await http.delete<Enveloped<SpeciesPublicationDetailDto>>(
            `${base}/species/${id}/publication`,
          ),
        );
      },
      image(id: number): Promise<DownloadedFile> {
        return http.download(`${base}/species/${id}/image`);
      },
    },
    dashboard: {
      async summary(): Promise<DashboardSummaryDto> {
        return unwrap(
          await http.get<Enveloped<DashboardSummaryDto>>(
            `${base}/dashboard`,
          ),
        );
      },
    },
    reports: {
      async tickets(query: TicketReportQuery): Promise<TicketReportDto> {
        const body = await http.get<
          RawTicketReport | { data: RawTicketReport; meta?: PageMeta }
        >(
          `${base}/reports/tickets${queryString({
            ...reportParams(query),
            page: query.page,
          })}`,
        );
        // La API envía `meta` en la raíz, junto a `data`.
        const raw = unwrap<RawTicketReport>(body);
        const rootMeta = "data" in body ? body.meta : undefined;

        return normalizeTicketReport({ ...raw, meta: rootMeta ?? raw.meta });
      },
      async cancellations(
        query: CancellationReportQuery,
      ): Promise<CancellationReportDto> {
        const body = await http.get<
          Enveloped<CancellationReportDto> & { meta?: PageMeta }
        >(
          `${base}/reports/cancellations${queryString({
            ...cancellationParams(query),
            page: query.page,
          })}`,
        );
        const report = unwrap<CancellationReportDto>(body);
        // La API envía `meta` en la raíz, junto a `data` (igual que el reporte de boletos).
        const rootMeta = "data" in body ? body.meta : undefined;

        return rootMeta ? { ...report, meta: rootMeta } : report;
      },
      exportCancellations(
        query: CancellationReportQuery,
        format: ReportExportFormat,
      ): Promise<DownloadedFile> {
        return http.download(
          `${base}/reports/cancellations/export${queryString({
            ...cancellationParams(query),
            format,
          })}`,
        );
      },
      /** Revisión de un cajero y día (`api-027`); responde 201 con la revisión. */
      async createCancellationReview(
        input: CancellationReviewInput,
      ): Promise<CancellationReviewDto> {
        return unwrap(
          await http.post<Enveloped<CancellationReviewDto>>(
            `${base}/reports/cancellations/reviews`,
            input,
          ),
        );
      },
      /** Historial de revisiones, de la más reciente a la más antigua (`api-027`). */
      async listCancellationReviews(
        cashierId: number,
        businessDate: string,
      ): Promise<CancellationReviewDto[]> {
        return unwrapList(
          await http.get<Enveloped<CancellationReviewDto[]>>(
            `${base}/reports/cancellations/reviews${queryString({
              cashier_id: cashierId,
              business_date: businessDate,
            })}`,
          ),
        );
      },
      /** Cajeros para el filtro, incluidos los eliminados lógicamente (`api-022` RN-16). */
      async cancellationCashiers(): Promise<CancellationCashierOption[]> {
        const list = unwrapList(
          await http.get<
            Enveloped<
              (Partial<CancellationCashierOption> & {
                full_name?: string;
                cashier_name?: string;
              })[]
            >
          >(`${base}/reports/cancellations/cashiers`),
        );

        return list.map((item) => ({
          id: Number(item.id),
          name: item.name ?? item.full_name ?? item.cashier_name ?? String(item.id),
        }));
      },
      exportTickets(
        query: TicketReportQuery,
        format: ReportExportFormat,
      ): Promise<DownloadedFile> {
        return http.download(
          `${base}/reports/tickets/export${queryString({
            ...reportParams(query),
            format,
          })}`,
        );
      },
    },
  };
}

export type AdminApi = ReturnType<typeof createAdminApi>;
