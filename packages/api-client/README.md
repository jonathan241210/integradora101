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

## Sesión de visitante

`createVisitorApi` es un módulo aparte. No usa `createAuthApi` ni las cookies y el CSRF de `createHttpClient`.

Recibe la base URL, `fetch` opcional y callbacks para leer el access token, leer el refresh y guardar el par nuevo. En la app esa base es `EXPO_PUBLIC_API_URL` y ya incluye `/api/v1`, igual que el catálogo. El cliente no vuelve a pegar ese prefijo. En el servidor las rutas siguen bajo `/api/v1/visitor`: aviso, registro, verificación, reenvío, login, refresh, logout, olvido, restablecimiento, perfil, contraseña y borrado. El login envía `device_name`. El access token viaja en `Authorization: Bearer`.

Si una petición autenticada responde 401, hay un solo `POST /api/v1/visitor/auth/refresh` en vuelo. El cuerpo es `{ "refresh_token": "…" }` y no usa el access token vencido. Si el refresh funciona, se guarda el par y la petición original se reintenta una vez. Si el refresh falla o responde 401, no hay otro intento y se avisa para cerrar la sesión.

Los errores son `ApiError`: estado, `message`, `code`, `errors` y `retryAfterSeconds`.
