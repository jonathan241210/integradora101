import {
  createAdminApi,
  createAuthApi,
  createHttpClient,
  createTicketSalesApi,
} from "@arca/api-client";

let unauthorizedHandler: (() => void) | undefined;
let twoFactorSetupHandler: (() => void) | undefined;

const http = createHttpClient({
  baseUrl: "",
  onUnauthorized: () => unauthorizedHandler?.(),
  onTwoFactorSetupRequired: () => twoFactorSetupHandler?.(),
});

export const authApi = createAuthApi(http);
export const adminApi = createAdminApi(http);
export const ticketSalesApi = createTicketSalesApi(http);

export function setUnauthorizedHandler(handler?: () => void): () => void {
  unauthorizedHandler = handler;

  return () => {
    if (unauthorizedHandler === handler) unauthorizedHandler = undefined;
  };
}

/** 403 `two_factor_setup_required` en cualquier pantalla (dashboard-015 CA-09). */
export function setTwoFactorSetupHandler(handler?: () => void): () => void {
  twoFactorSetupHandler = handler;

  return () => {
    if (twoFactorSetupHandler === handler) twoFactorSetupHandler = undefined;
  };
}
