import type { ApiErrorPayload } from "./types";

export type ApiError = Error & ApiErrorPayload & { status: number };

export type HttpClient = {
  request<T>(path: string, options?: RequestOptions): Promise<T>;
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  delete<T>(path: string, body?: unknown): Promise<T>;
  setOnUnauthorized(handler?: () => void): void;
};

/**
 * Cliente devuelto por `createHttpClient`: el contrato `HttpClient` original
 * (sin cambios, para no afectar a `apps/pwa` ni `apps/mobile`) más los
 * métodos que usa la administración.
 */
export type ExtendedHttpClient = HttpClient & {
  patch<T>(path: string, body?: unknown): Promise<T>;
  put<T>(path: string, body?: unknown): Promise<T>;
  download(path: string): Promise<DownloadedFile>;
};

export type DownloadedFile = {
  blob: Blob;
  filename: string;
};

export type RequestOptions = {
  method?: string;
  headers?: HeadersInit;
  body?: unknown;
};

export type CreateHttpClientOptions = {
  baseUrl: string;
  fetchImpl?: typeof fetch;
  onUnauthorized?: () => void;
};

function cookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;

  const prefix = `${name}=`;
  const cookie = document.cookie
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(prefix));

  if (!cookie) return null;

  try {
    return decodeURIComponent(cookie.slice(prefix.length));
  } catch {
    return cookie.slice(prefix.length);
  }
}

function requestUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

async function responseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;

  const text = await response.text();
  if (!text.trim()) return undefined;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function apiError(response: Response, body: unknown): ApiError {
  const payload =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};
  const retryAfterHeader = response.headers.get("Retry-After");
  const retryAfterSeconds = retryAfterHeader
    ? Number.parseInt(retryAfterHeader, 10)
    : undefined;

  const error = new Error(
    typeof payload.message === "string"
      ? payload.message
      : "No fue posible completar la solicitud.",
  ) as ApiError;

  error.name = "ApiError";
  error.status = response.status;
  if (typeof payload.code === "string") error.code = payload.code;
  if (
    typeof payload.errors === "object" &&
    payload.errors !== null &&
    !Array.isArray(payload.errors)
  ) {
    error.errors = payload.errors as Record<string, string[]>;
  }
  if (
    retryAfterSeconds !== undefined &&
    Number.isFinite(retryAfterSeconds)
  ) {
    error.retryAfterSeconds = retryAfterSeconds;
  }

  return error;
}

const fallbackFilename = "descarga";

/**
 * Obtiene el nombre de archivo de `Content-Disposition` y lo sanea:
 * sin separadores de ruta, sin caracteres de control y con longitud acotada.
 */
export function filenameFromDisposition(header: string | null): string {
  if (!header) return fallbackFilename;

  const encoded = /filename\*\s*=\s*(?:UTF-8|utf-8)''([^;]+)/.exec(header);
  const plain = /filename\s*=\s*(?:"([^"]*)"|([^;]+))/.exec(header);
  let candidate = "";

  if (encoded?.[1]) {
    try {
      candidate = decodeURIComponent(encoded[1].trim());
    } catch {
      candidate = encoded[1].trim();
    }
  } else if (plain) {
    candidate = (plain[1] ?? plain[2] ?? "").trim();
  }

  const safe = candidate
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .split(/[\\/]/)
    .pop()!
    .replace(/^\.+/, "")
    .trim()
    .slice(0, 150);

  return safe || fallbackFilename;
}

export function createHttpClient({
  baseUrl,
  fetchImpl = fetch,
  onUnauthorized,
}: CreateHttpClientOptions): ExtendedHttpClient {
  let unauthorizedHandler = onUnauthorized;

  const refreshCsrfToken = async (): Promise<string> => {
    const response = await fetchImpl(
      requestUrl(baseUrl, "/sanctum/csrf-cookie"),
      {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      },
    );

    if (!response.ok) {
      throw apiError(response, await responseBody(response));
    }

    const token = cookieValue("XSRF-TOKEN");

    if (!token) {
      throw Object.assign(
        new Error("No fue posible iniciar la sesión segura."),
        { name: "ApiError", status: 0 },
      ) as ApiError;
    }

    return token;
  };

  const request = async <T>(
    path: string,
    options: RequestOptions = {},
  ): Promise<T> => {
    const method = (options.method ?? "GET").toUpperCase();
    const headers = new Headers(options.headers);
    headers.set("Accept", "application/json");

    const hasBody = options.body !== undefined;
    if (hasBody) headers.set("Content-Type", "application/json");

    const unsafeMethod = !["GET", "HEAD", "OPTIONS"].includes(method);
    if (unsafeMethod) {
      const xsrfToken = cookieValue("XSRF-TOKEN") ?? await refreshCsrfToken();
      headers.set("X-XSRF-TOKEN", xsrfToken);
    }

    const url = requestUrl(baseUrl, path);
    const body = hasBody ? JSON.stringify(options.body) : undefined;
    const sendRequest = () => fetchImpl(url, {
      method,
      credentials: "include",
      headers: new Headers(headers),
      body,
    });
    let response = await sendRequest();

    if (unsafeMethod && response.status === 419) {
      await response.body?.cancel();
      headers.set("X-XSRF-TOKEN", await refreshCsrfToken());
      response = await sendRequest();
    }

    const responseData = await responseBody(response);

    if (!response.ok) {
      if (response.status === 401) unauthorizedHandler?.();
      throw apiError(response, responseData);
    }

    return responseData as T;
  };

  const download = async (path: string): Promise<DownloadedFile> => {
    const response = await fetchImpl(requestUrl(baseUrl, path), {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json, */*;q=0.8" },
    });

    if (!response.ok) {
      const errorBody = await responseBody(response);
      if (response.status === 401) unauthorizedHandler?.();
      throw apiError(response, errorBody);
    }

    const blob = await response.blob();

    return {
      blob,
      filename: filenameFromDisposition(
        response.headers.get("Content-Disposition"),
      ),
    };
  };

  return {
    request,
    get: <T>(path: string) => request<T>(path),
    post: <T>(path: string, body?: unknown) =>
      request<T>(path, { method: "POST", body }),
    patch: <T>(path: string, body?: unknown) =>
      request<T>(path, { method: "PATCH", body }),
    put: <T>(path: string, body?: unknown) =>
      request<T>(path, { method: "PUT", body }),
    download,
    delete: <T>(path: string, body?: unknown) =>
      request<T>(path, { method: "DELETE", body }),
    setOnUnauthorized(handler) {
      unauthorizedHandler = handler;
    },
  };
}
