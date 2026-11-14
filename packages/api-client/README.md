# `@arca/api-client`

Cliente HTTP tipado y compartido para las aplicaciones ARCA-NB. La API mantiene la autoridad de autenticación, permisos y reglas de negocio.

## Inicio

El paquete usa `fetch` nativo y no tiene dependencias externas. Para el dashboard se enlaza como paquete local:

```json
"@arca/api-client": "file:../../packages/api-client"
```

## Sesión de personal

`createHttpClient({ baseUrl, fetchImpl, onUnauthorized })` envía las cookies de sesión y `Accept: application/json`. Antes de una petición distinta de GET, obtiene `/sanctum/csrf-cookie` si no existe la cookie `XSRF-TOKEN` y envía su valor decodificado en `X-XSRF-TOKEN`.

`createAuthApi(http)` expone `login`, `twoFactorChallenge`, `me`, `logout`, `enableTwoFactor`, `twoFactorQrCode`, `confirmTwoFactor` y `recoveryCodes`. `me` devuelve `StaffProfile` aunque la respuesta de Laravel venga envuelta en `data`.

Los errores HTTP se representan como `ApiError`, con estado, mensaje, código, errores de validación y `retryAfterSeconds` cuando el servidor responde `Retry-After`.

El paquete no guarda credenciales, perfiles ni códigos de recuperación. Cada cliente decide cómo presentar los estados; la sesión de personal permanece en la cookie HttpOnly administrada por la API.

## Administración (`api-007`)

`createHttpClient` devuelve un `ExtendedHttpClient`: el `HttpClient` de siempre (firma sin cambios, para no afectar a la PWA ni a mobile) más `patch`, `put` y `download(path)`. `patch` y `put` comparten con `post` el manejo de `XSRF-TOKEN`, el reintento tras 419 y el aviso de 401. `download` hace un `GET` con cookies y devuelve `{ blob, filename }`; si la respuesta no es 2xx lanza `ApiError` con el JSON de error, y el nombre sale de `Content-Disposition` saneado (sin separadores de ruta ni caracteres de control; respaldo `descarga`). No hay funciones de lógica de negocio.

`createAdminApi(http)` entrega el contrato tipado de `/api/v1/admin`: `users` (`list`, `options`, `create`, `get`, `update`, `setStatus`, `remove`, `resetPassword`, `resetTwoFactor`), `news` y `events` (`list`, `create`, `update`, `setStatus`, `remove`), `enclosures` (`list`, `create`, `rename`), `dashboard.summary()` y `reports` (`tickets`, `exportTickets`). Los DTO viven en `admin-types.ts`, en `snake_case` como los entrega la API; los importes son cadenas con dos decimales y no se suman en el cliente. `createAdminApi(http, { deviceTimeZone })` envía en `timezone` la zona del dispositivo (`Intl.DateTimeFormat().resolvedOptions().timeZone` por defecto, inyectable en pruebas) en `dashboard.summary()`, `reports.tickets()` y `reports.exportTickets()`; la exportación usa la misma zona que el reporte. Si el navegador no la informa el parámetro se omite, y un `timezone` explícito en la consulta prevalece. El cliente no calcula periodos ni totales con esa zona. Los listados se normalizan a `{ data, meta }` y el reporte a `{ period, totals, daily, tickets, meta }`, tolerando que la API envuelva la respuesta en `data`.

### Imágenes de noticias y eventos (`api-008`)

`NewsDto` y `EventDto` incluyen `image_url` (`string | null`). `NewsInput` y `EventInput` aceptan `image?: File | null` y `remove_image?: boolean`. `news` y `events` mantienen JSON cuando no hay archivo (el campo `image` nulo o ausente se omite y `remove_image` viaja en el JSON). Con archivo, `create` envía `multipart/form-data` por `POST` y `update` usa `POST /{id}` con `_method=PATCH` (PHP no entrega multipart en `PATCH`); `null` se envía como cadena vacía, los booleanos como `1`/`0` y, con archivo, `remove_image` se omite porque gana el archivo. `createHttpClient` acepta `FormData` como cuerpo: no fija `Content-Type` para que el navegador añada el `boundary`. `HttpClient` conserva su firma. La validación de tipo y tamaño la aplica la API.

## Publicación de especies (`api-014`, consumida por `dashboard-010`)

`createAdminApi(http)` añade dos espacios de nombres bajo `/api/v1/admin`. Los DTO viven en `admin-types.ts` (`snake_case`, sin URL de imagen: la foto se descarga con `image(id)` y el cliente la muestra como blob). No hay lógica de negocio: estados, transiciones y permisos los decide la API.

`speciesPublicationRequests`:
- `list({ status?, page? })`: `GET /species-publication-requests`; `status` es `submitted`, `accepted` o `rejected` y se omite en «Todas». Devuelve `{ data, meta: { has_more } }` (`SpeciesRequestSummaryDto`, con `species_id` y `publication_status`).
- `get(id)`: `GET /species-publication-requests/{id}` (`SpeciesRequestDetailDto`, con `current`, `proposed` y `species_id`).
- `update(id, input)`: `PATCH` con solo los campos cambiados (`scientific_name`, `habitat`, `origin`, `category`, `published_fields`, `image`). `published_fields` viaja como cadena JSON. Con `image`, `POST` con `_method=PATCH` y `multipart/form-data`.
- `accept(id, { publish })`: `POST .../accept`; responde con la ficha de la especie (`SpeciesPublicationDetailDto`), no con la solicitud.
- `reject(id, { rejection_reason })`: `POST .../reject`; responde con la solicitud.
- `image(id)`: `GET .../image`; devuelve `{ blob, filename }`.

`publishedSpecies`:
- `list({ status?, category?, page? })`: `GET /published-species`; `status` es `published` o `unpublished`; nunca devuelve especies sin publicar. Cada fila trae `has_image` y `has_pending_request`.
- `get(id)`: `GET /species/{id}/publication` (`SpeciesPublicationDetailDto`). `publication_status` es `pending` si hay solicitud pendiente, aunque la especie esté publicada; para saber si está publicada usar `is_published`.
- `update(id, input)`: `PATCH /species/{id}/publication`, mismo cuerpo que `speciesPublicationRequests.update`; solo vale para especies despublicadas sin solicitud pendiente.
- `unpublish(id)`, `republish(id)`: `POST /species/{id}/unpublish` y `/republish`, sin cuerpo.
- `removePublication(id)`: `DELETE /species/{id}/publication`.
- `image(id)`: `GET /species/{id}/image`; devuelve `{ blob, filename }`.

Los `422` de estado de estas rutas llegan como `ApiError` con `errors.species` (o `errors.status` en las solicitudes) y el mensaje en español de la API; los `422` por campo llegan bajo el nombre del campo. Los listados se normalizan a `{ data, meta }`.

## Revisión de momentos (`api-010`, consumida por `dashboard-008`)

`createAdminApi(http)` añade el espacio de nombres `memoryReview` bajo `/api/v1/admin`. Los DTO viven en `admin-types.ts` (`MemoryReviewSummaryDto`, `MemoryReviewDetailDto`, `MemoryRejectInput`; sin URL de imagen y sin datos del visitante). No hay lógica de negocio: estados, transiciones, plazos y permisos los decide la API. El contrato se implementó con respuestas simuladas; `api-010` fase 1 aún no está integrada.

- `list({ status?, page? })`: `GET /memories`; `status` es `submitted`, `in_review`, `accepted` o `rejected` y se omite en «Todas». No envía `limit` (la API usa 10). Devuelve `{ data, meta: { has_more } }` (`HasMorePage`, el mismo tipo de las listas de `dashboard-010`; `page` y `limit` de `meta` no se exponen).
- `get(id)`: `GET /memories/{id}`. Abrir una petición `submitted` la pasa a `in_review` en la API. Incluye `published_at`, `published_until`, `is_published` y `publication_days`.
- `image(id)`: `GET /memories/{id}/image`; ruta relativa del mismo origen (proxy de `/api`, sin CORS). Devuelve `{ blob, filename }`; el cliente la muestra con una URL `blob:` que revoca al cerrar.
- `accept(id)`: `POST /memories/{id}/accept`, sin cuerpo. No usa el cuerpo de la respuesta: el cliente vuelve a pedir el detalle.
- `reject(id, { rejection_reason, rejected_fields })`: `POST /memories/{id}/reject`; `rejected_fields` es un arreglo con `image`, `content` o ambos. No usa el cuerpo de la respuesta.

Los `422` por campo llegan en `ApiError.errors.rejection_reason`, `errors.rejected_fields` o `errors.image`; las decisiones tardías llegan con el mensaje de la API («Esta petición ya fue revisada.»).

## Venta de boletos (`api-009`)

`createTicketSalesApi(http, { deviceTimeZone })` entrega el contrato tipado de la venta, el historial y los precios de `/api/v1/admin`. Solo usa `http.get` y `http.post`; `http.ts`, `createAdminApi` y `createAuthApi` no cambian, así que la PWA y mobile no se ven afectados. Los DTO viven en `ticket-sales-types.ts`, en `snake_case`; los importes son cadenas y no se suman ni se multiplican en el cliente.

- `sales.create({ adult_quantity, child_quantity })`: `POST /tickets`. Devuelve el boleto con `total_amount` y `qr_svg`. No envía zona horaria.
- `history.list(query)`: `GET /tickets` con `folio`, `status`, `from`, `to`, `page`, `per_page` y `timezone`. Se normaliza a `{ data, meta }`.
- `history.cancel(folio, { reason })`: `POST /tickets/{folio}/cancel`; no envía `timezone` (la API compara el día en la zona del zoológico). Devuelve la fila del historial.
- `prices.current()`: `GET /ticket-prices/current` (`adult` y `child` con vigente y `next`).
- `prices.schedule(input)`: `POST /ticket-prices` con `mode` `immediate` o `scheduled`; `effective_at` en ISO 8601 con desfase.

`timezone` usa la zona del dispositivo (`Intl.DateTimeFormat().resolvedOptions().timeZone`, inyectable en pruebas) solo en el historial; un `timezone` explícito prevalece. El cliente no decide `cancellable`, precios ni permisos. Los 403 `two_factor_setup_required` llegan como `ApiError` con `code`.

## Sesión de visitante

`createVisitorApi` es un módulo aparte. No usa `createAuthApi` ni las cookies y el CSRF de `createHttpClient`.

Recibe la base URL, `fetch` opcional y callbacks para leer el access token, leer el refresh y guardar el par nuevo. En la app esa base es `EXPO_PUBLIC_API_URL` y ya incluye `/api/v1`, igual que el catálogo. El cliente no vuelve a pegar ese prefijo. En el servidor las rutas siguen bajo `/api/v1/visitor`: aviso, registro, verificación, reenvío, login, refresh, logout, olvido, restablecimiento, perfil, contraseña y borrado. El login envía `device_name`. El access token viaja en `Authorization: Bearer`.

Si una petición autenticada responde 401, hay un solo `POST /api/v1/visitor/auth/refresh` en vuelo. El cuerpo es `{ "refresh_token": "…" }` y no usa el access token vencido. Si el refresh funciona, se guarda el par y la petición original se reintenta una vez. Si el refresh falla o responde 401, no hay otro intento y se avisa para cerrar la sesión.

Los errores son `ApiError`: estado, `message`, `code`, `errors` y `retryAfterSeconds`.
