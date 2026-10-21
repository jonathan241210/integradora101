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
};

function requestUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
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
    if (options.body !== undefined) headers.set("Content-Type", "application/json");
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

    try {
      return await fetchImpl(requestUrl(baseUrl, path), {
        method,
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
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
    return unwrap<T>(body);
  };

  return {
    privacyNotice: () =>
      request<{ version: string; content: string }>("/api/v1/visitor/legal/privacy-notice", { auth: false }),
    register: (input: VisitorRegisterInput) =>
      request<VisitorMessage>("/api/v1/visitor/auth/register", { method: "POST", body: input, auth: false }),
    verifyEmail: (email: string, code: string) =>
      request<VisitorTokenPayload>("/api/v1/visitor/auth/email/verify", {
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
  };
}

export type VisitorApi = ReturnType<typeof createVisitorApi>;
