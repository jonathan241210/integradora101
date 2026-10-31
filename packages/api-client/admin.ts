import type { DownloadedFile, ExtendedHttpClient } from "./http";
import type {
  DashboardSummaryDto,
  EnclosureDto,
  EventDto,
  EventInput,
  NewsDto,
  NewsInput,
  PageMeta,
  Paginated,
  ReportExportFormat,
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

  const content = <Dto, Input>(resource: string) => {
    const path = `${base}/${resource}`;

    return {
      async list(): Promise<Dto[]> {
        return unwrapList(await http.get<Enveloped<Dto[]>>(path));
      },
      async create(input: Input): Promise<Dto> {
        return unwrap(await http.post<Enveloped<Dto>>(path, input));
      },
      async update(id: number, input: Input): Promise<Dto> {
        return unwrap(
          await http.patch<Enveloped<Dto>>(`${path}/${id}`, input),
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
