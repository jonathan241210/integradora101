import { createHttpClient, createVeterinarianApi } from '@arca/api-client';

// Cliente propio de la feature pwa-005: conserva `errors` del 422 y avisa del 401.
const http = createHttpClient({ baseUrl: '' });

export const veterinarianApi = createVeterinarianApi(http);

export function onVeterinarianUnauthorized(handler?: () => void) {
  http.setOnUnauthorized(handler);
}
