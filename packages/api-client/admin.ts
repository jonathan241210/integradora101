import type { DownloadedFile, ExtendedHttpClient } from "./http";
import type {
  DashboardSummaryDto,
  EnclosureDto,
  EventDto,
  EventInput,
  HasMorePage,
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

function reportParams(query: TicketReportQuery, timezone: string | undefined) {
  return {
    period: query.period,
    date: query.date,
    from: query.from,
    to: query.to,
    timezone: query.timezone || timezone,
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

function normalizeHasMore<T>(
  response: Partial<HasMorePage<T>> | T[],
): HasMorePage<T> {
  if (Array.isArray(response)) return { data: response, meta: { has_more: false } };

  return {
    data: Array.isArray(response.data) ? response.data : [],
    meta: { has_more: response.meta?.has_more === true },
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

export type CreateAdminApiOptions = {
  /** Zona horaria del dispositivo; por defecto la del navegador. */
  deviceTimeZone?: () => string | undefined;
};

function browserTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

export function createAdminApi(
  http: ExtendedHttpClient,
  options: CreateAdminApiOptions = {},
) {
  const zone = () => (options.deviceTimeZone ?? browserTimeZone)() || undefined;

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
        input: StaffUpdateInput,
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
      async resetPassword(id: number, password: string): Promise<void> {
        await http.put<unknown>(`${base}/users/${id}/password`, { password });
      },
      async resetTwoFactor(id: number): Promise<void> {
        await http.delete<unknown>(`${base}/users/${id}/two-factor`);
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
    },
    /** Revisión de momentos de visitantes (api-010, consumida por dashboard-008). */
    memoryReview: {
      async list(
        query: MemoryReviewListQuery = {},
      ): Promise<HasMorePage<MemoryReviewSummaryDto>> {
        return normalizeHasMore(
          await http.get<HasMorePage<MemoryReviewSummaryDto>>(
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
      ): Promise<HasMorePage<SpeciesRequestSummaryDto>> {
        return normalizeHasMore(
          await http.get<HasMorePage<SpeciesRequestSummaryDto>>(
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
      ): Promise<HasMorePage<PublishedSpeciesRowDto>> {
        return normalizeHasMore(
          await http.get<HasMorePage<PublishedSpeciesRowDto>>(
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
            `${base}/dashboard${queryString({ timezone: zone() })}`,
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
            ...reportParams(query, zone()),
            page: query.page,
          })}`,
        );
        // La API envía `meta` en la raíz, junto a `data`.
        const raw = unwrap<RawTicketReport>(body);
        const rootMeta = "data" in body ? body.meta : undefined;

        return normalizeTicketReport({ ...raw, meta: rootMeta ?? raw.meta });
      },
      exportTickets(
        query: TicketReportQuery,
        format: ReportExportFormat,
      ): Promise<DownloadedFile> {
        return http.download(
          `${base}/reports/tickets/export${queryString({
            ...reportParams(query, zone()),
            format,
          })}`,
        );
      },
    },
  };
}

export type AdminApi = ReturnType<typeof createAdminApi>;
