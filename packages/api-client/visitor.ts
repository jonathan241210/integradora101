import type { ApiError } from "./http";

export type VisitorProfileDto = {
  email: string;
  first_name: string;
  nickname: string;
  avatar_code: string;
};

export type VisitorTokenPayload = {
  token_type: string;
  expires_in: number;
  access_token: string;
  refresh_token: string;
  visitor: VisitorProfileDto;
};

export type VisitorMessage = {
  message: string;
};

export type VisitorNotificationPreferences = {
  news_and_events: boolean;
  memory_status: boolean;
};

export type VisitorFavoriteSpeciesList = {
  data: { id: number }[];
};

export type VisitorAlreadyRegistered = {
  message: string;
  code: "email_already_registered";
};

export type VisitorVerifyResult = VisitorTokenPayload | VisitorAlreadyRegistered;

export type VisitorProgressDto = {
  points: number;
  level: number;
  rank: string;
  next_threshold: number | null;
  discovered_species: number;
  total_species: number;
};

export type VisitorSpeciesDto = {
  id: number;
  common_name: string;
  category: string | null;
  discovered: boolean;
  discovered_at: string | null;
};

export type VisitorCatalogItemDto = {
  code: string;
  title: string;
  description: string;
  icon: string;
  points: number;
  rule_type: string;
  rule_target: number;
  rule_param?: string | null;
  progress: number;
  state: "pending" | "unlocked" | "completed";
  earned_at: string | null;
  objective?: string;
};

export type VisitorDiscoveryInput = {
  code: string;
  scanned_at: string;
  client_scan_id: string;
};

export type VisitorDiscoveryDto = {
  result: "discovered" | "already_discovered" | "empty_enclosure" | "invalid_code" | "inactive_code" | "expired_scan";
  new_species: { id: number; common_name: string }[];
  already_known_species: { id: number; common_name: string }[];
  points_awarded: number;
  unlocked_achievements: { code: string; title: string }[];
  completed_missions: { code: string; title: string }[];
  progress: VisitorProgressDto;
  message?: string;
  code?: string;
};

export type VisitorMemoryStatus = "submitted" | "in_review" | "accepted" | "rejected";

export type VisitorMemoryField = "image" | "content";

export type VisitorMemoryFile = {
  uri: string;
  name: string;
  mimeType: string;
};

export type VisitorMemoryDto = {
  id: number;
  status: VisitorMemoryStatus;
  opinion: string | null;
  created_at: string | null;
  reviewed_at: string | null;
  resubmitted_count: number;
  rejection_reason?: string | null;
  rejected_fields?: VisitorMemoryField[];
  published_until?: string | null;
  is_published?: boolean;
};

export type VisitorMemoryList = {
  data: VisitorMemoryDto[];
  meta: {
    can_submit: boolean;
    next_submission_at: string | null;
    open_request_id: number | null;
  };
};

export type VisitorMemorySubmit = {
  image?: VisitorMemoryFile | Blob | null;
  opinion?: string | null;
  consent: boolean;
};

export type VisitorRegisterInput = {
  email: string;
  password: string;
  password_confirmation: string;
  first_name: string;
  nickname: string;
  avatar_code: string;
  is_adult: boolean;
  privacy_notice_version: string;
};

export type CreateVisitorApiOptions = {
  baseUrl: string;
  fetchImpl?: typeof fetch;
  getAccessToken: () => Promise<string | null>;
  getRefreshToken: () => Promise<string | null>;
  onTokens: (tokens: { accessToken: string; refreshToken: string }) => Promise<void>;
  onSessionExpired: () => Promise<void>;
};

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
  retry?: boolean;
  raw?: boolean;
};

function isFormData(value: unknown): value is FormData {
  return typeof FormData !== "undefined" && value instanceof FormData;
}

function memoryFormData(input: VisitorMemorySubmit): FormData {
  const form = new FormData();
  if (input.image) {
    if ("mimeType" in input.image) {
      form.append("image", {
        uri: input.image.uri,
        name: input.image.name,
        type: input.image.mimeType,
      } as unknown as Blob);
    } else {
      form.append("image", input.image);
    }
  }
  const opinion = input.opinion?.trim();
  if (opinion) form.append("opinion", opinion);
  form.append("consent", input.consent ? "1" : "0");
  return form;
}

function requestUrl(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/+$/, "");
  let relative = path.replace(/^\/+/, "");
  if (base.endsWith("/api/v1") && (relative === "api/v1" || relative.startsWith("api/v1/"))) {
    relative = relative.slice("api/v1".length).replace(/^\/+/, "");
  }
  return relative ? `${base}/${relative}` : base;
}

function visitorError(
  status: number,
  body: unknown,
  retryAfterHeader: string | null,
): ApiError {
  const payload =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};
  const retryAfterSeconds = retryAfterHeader
    ? Number.parseInt(retryAfterHeader, 10)
    : undefined;
  const error = new Error(
    typeof payload.message === "string"
      ? payload.message
      : status === 0
        ? "Sin conexión"
        : "No fue posible completar la solicitud.",
  ) as ApiError;

  error.name = "ApiError";
  error.status = status;
  if (typeof payload.code === "string") error.code = payload.code;
  if ("data" in payload) error.data = payload.data;
  if (
    typeof payload.errors === "object" &&
    payload.errors !== null &&
    !Array.isArray(payload.errors)
  ) {
    error.errors = payload.errors as Record<string, string[]>;
  }
  if (retryAfterSeconds !== undefined && Number.isFinite(retryAfterSeconds)) {
    error.retryAfterSeconds = retryAfterSeconds;
  }
  if (typeof payload.next_submission_at === "string" && error.data === undefined) {
    error.data = { next_submission_at: payload.next_submission_at };
  }

  return error;
}

async function readBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (!text.trim()) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function unwrap<T>(body: unknown): T {
  if (typeof body === "object" && body !== null && "data" in body) {
    return (body as { data: T }).data;
  }
  return body as T;
}

export function createVisitorApi({
  baseUrl,
  fetchImpl = fetch,
  getAccessToken,
  getRefreshToken,
  onTokens,
  onSessionExpired,
}: CreateVisitorApiOptions) {
  let refreshFlight: Promise<VisitorTokenPayload> | null = null;

  const send = async (
    path: string,
    options: RequestOptions,
    accessToken: string | null,
  ): Promise<Response> => {
    const method = (options.method ?? "GET").toUpperCase();
    const headers = new Headers({ Accept: "application/json" });
    const formData = isFormData(options.body);
    if (options.body !== undefined && !formData) headers.set("Content-Type", "application/json");
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

    try {
      return await fetchImpl(requestUrl(baseUrl, path), {
        method,
        headers,
        body: formData ? options.body : options.body !== undefined ? JSON.stringify(options.body) : undefined,
      });
    } catch {
      throw visitorError(0, { message: "Sin conexión" }, null);
    }
  };

  const refresh = async (): Promise<VisitorTokenPayload> => {
    if (!refreshFlight) {
      refreshFlight = (async () => {
        const refreshToken = await getRefreshToken();
        if (!refreshToken) {
          throw visitorError(401, { message: "La sesión ya no es válida. Vuelve a entrar." }, null);
        }
        const response = await send(
          "/api/v1/visitor/auth/refresh",
          { method: "POST", body: { refresh_token: refreshToken }, auth: false },
          null,
        );
        const body = await readBody(response);
        if (!response.ok) {
          throw visitorError(response.status, body, response.headers.get("Retry-After"));
        }
        const payload = unwrap<VisitorTokenPayload>(body);
        await onTokens({
          accessToken: payload.access_token,
          refreshToken: payload.refresh_token,
        });
        return payload;
      })().finally(() => {
        refreshFlight = null;
      });
    }
    return refreshFlight;
  };

  const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
    const accessToken = options.auth === false ? null : await getAccessToken();
    const response = await send(path, options, accessToken);
    if (response.status === 401 && options.auth !== false && options.retry !== false) {
      await response.body?.cancel();
      try {
        await refresh();
      } catch (error) {
        await onSessionExpired();
        throw error;
      }
      return request<T>(path, { ...options, retry: false });
    }

    const body = await readBody(response);
    if (!response.ok) {
      if (response.status === 401 && options.auth !== false) {
        await onSessionExpired();
      }
      throw visitorError(response.status, body, response.headers.get("Retry-After"));
    }
    if (options.raw) return body as T;
    return unwrap<T>(body);
  };

  return {
    privacyNotice: () =>
      request<{ version: string; content: string }>("/api/v1/visitor/legal/privacy-notice", { auth: false }),
    register: (input: VisitorRegisterInput) =>
      request<VisitorMessage>("/api/v1/visitor/auth/register", { method: "POST", body: input, auth: false }),
    verifyEmail: (email: string, code: string) =>
      request<VisitorVerifyResult>("/api/v1/visitor/auth/email/verify", {
        method: "POST",
        body: { email, code },
        auth: false,
      }),
    resendVerification: (email: string) =>
      request<VisitorMessage>("/api/v1/visitor/auth/email/resend", {
        method: "POST",
        body: { email },
        auth: false,
      }),
    login: (email: string, password: string, deviceName: string) =>
      request<VisitorTokenPayload>("/api/v1/visitor/auth/login", {
        method: "POST",
        body: { email, password, device_name: deviceName },
        auth: false,
      }),
    refresh,
    logout: (refreshToken: string) =>
      request<void>("/api/v1/visitor/auth/logout", {
        method: "POST",
        body: { refresh_token: refreshToken },
      }),
    forgotPassword: (email: string) =>
      request<VisitorMessage>("/api/v1/visitor/auth/password/forgot", {
        method: "POST",
        body: { email },
        auth: false,
      }),
    resetPassword: (email: string, code: string, password: string) =>
      request<VisitorMessage>("/api/v1/visitor/auth/password/reset", {
        method: "POST",
        body: { email, code, password, password_confirmation: password },
        auth: false,
      }),
    me: () => request<VisitorProfileDto>("/api/v1/visitor/me"),
    updateProfile: (patch: Pick<VisitorProfileDto, "first_name" | "nickname" | "avatar_code">) =>
      request<VisitorProfileDto>("/api/v1/visitor/me", { method: "PATCH", body: patch }),
    changePassword: (currentPassword: string, password: string) =>
      request<VisitorMessage>("/api/v1/visitor/me/password", {
        method: "PUT",
        body: {
          current_password: currentPassword,
          password,
          password_confirmation: password,
        },
      }),
    deleteAccount: (password: string) =>
      request<void>("/api/v1/visitor/me", { method: "DELETE", body: { password } }),
    progress: () => request<VisitorProgressDto>("/api/v1/visitor/progress"),
    collection: () => request<VisitorSpeciesDto[]>("/api/v1/visitor/collection"),
    achievements: () => request<VisitorCatalogItemDto[]>("/api/v1/visitor/achievements"),
    missions: () => request<VisitorCatalogItemDto[]>("/api/v1/visitor/missions"),
    listVisitorMemories: () =>
      request<VisitorMemoryList>("/api/v1/visitor/memories", { raw: true }),
    submitVisitorMemory: (input: VisitorMemorySubmit) =>
      request<VisitorMemoryDto>("/api/v1/visitor/memories", {
        method: "POST",
        body: memoryFormData(input),
      }),
    resubmitVisitorMemory: (id: number, input: VisitorMemorySubmit) =>
      request<VisitorMemoryDto>(`/api/v1/visitor/memories/${id}/resubmit`, {
        method: "POST",
        body: memoryFormData(input),
      }),
    getNotificationPreferences: () =>
      request<VisitorNotificationPreferences>("/api/v1/visitor/notification-preferences"),
    updateNotificationPreferences: (patch: Partial<VisitorNotificationPreferences>) =>
      request<VisitorNotificationPreferences>("/api/v1/visitor/notification-preferences", {
        method: "PATCH",
        body: patch,
      }),
    registerPushToken: (token: string) =>
      request<{ platform: "android" }>("/api/v1/visitor/push-tokens", {
        method: "PUT",
        body: { token, platform: "android" },
      }),
    deletePushToken: (token: string) =>
      request<void>("/api/v1/visitor/push-tokens", {
        method: "DELETE",
        body: { token },
      }),
    listFavoriteSpecies: () =>
      request<VisitorFavoriteSpeciesList>("/api/v1/visitor/favorite-species", { raw: true }),
    updateFavoriteSpecies: (speciesId: number, favorite: boolean) =>
      request<VisitorFavoriteSpeciesList>(`/api/v1/visitor/favorite-species/${speciesId}`, {
        method: "PUT",
        body: { favorite },
        raw: true,
      }),
    discoveries: async (input: VisitorDiscoveryInput) => {
      try {
        return await request<VisitorDiscoveryDto>("/api/v1/visitor/discoveries", {
          method: "POST",
          body: input,
        });
      } catch (error) {
        const rejected = error as ApiError;
        if (
          rejected.status === 422 &&
          typeof rejected.data === "object" &&
          rejected.data !== null &&
          "result" in rejected.data
        ) {
          return rejected.data as VisitorDiscoveryDto;
        }
        throw error;
      }
    },
  };
}

export type VisitorApi = ReturnType<typeof createVisitorApi>;
