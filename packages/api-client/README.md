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

## Sesión de visitante

`createVisitorApi` es un módulo aparte. No usa `createAuthApi` ni las cookies y el CSRF de `createHttpClient`.

Recibe la base URL, `fetch` opcional y callbacks para leer el access token, leer el refresh y guardar el par nuevo. En la app esa base es `EXPO_PUBLIC_API_URL` y ya incluye `/api/v1`, igual que el catálogo. El cliente no vuelve a pegar ese prefijo. En el servidor las rutas siguen bajo `/api/v1/visitor`: aviso, registro, verificación, reenvío, login, refresh, logout, olvido, restablecimiento, perfil, contraseña y borrado. El login envía `device_name`. El access token viaja en `Authorization: Bearer`.

Si una petición autenticada responde 401, hay un solo `POST /api/v1/visitor/auth/refresh` en vuelo. El cuerpo es `{ "refresh_token": "…" }` y no usa el access token vencido. Si el refresh funciona, se guarda el par y la petición original se reintenta una vez. Si el refresh falla o responde 401, no hay otro intento y se avisa para cerrar la sesión.

Los errores son `ApiError`: estado, `message`, `code`, `errors` y `retryAfterSeconds`.
