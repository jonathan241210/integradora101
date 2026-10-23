import { createAuthApi, createHttpClient, createUsersApi } from "@arca/api-client";

let unauthorizedHandler: (() => void) | undefined;

const http = createHttpClient({
  baseUrl: "",
  onUnauthorized: () => unauthorizedHandler?.(),
});

export const authApi = createAuthApi(http);
export const usersApi = createUsersApi(http);

export function setUnauthorizedHandler(handler?: () => void): () => void {
  unauthorizedHandler = handler;

  return () => {
    if (unauthorizedHandler === handler) unauthorizedHandler = undefined;
  };
}
