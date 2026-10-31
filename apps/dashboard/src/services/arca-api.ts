import { createAdminApi, createAuthApi, createHttpClient } from "@arca/api-client";

let unauthorizedHandler: (() => void) | undefined;

const http = createHttpClient({
  baseUrl: "",
  onUnauthorized: () => unauthorizedHandler?.(),
});

export const authApi = createAuthApi(http);
export const adminApi = createAdminApi(http);

export function setUnauthorizedHandler(handler?: () => void): () => void {
  unauthorizedHandler = handler;

  return () => {
    if (unauthorizedHandler === handler) unauthorizedHandler = undefined;
  };
}
