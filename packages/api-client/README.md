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

El paquete no guarda credenciales, perfiles ni códigos de recuperación. Cada cliente decide cómo presentar los estados; la sesión permanece en la cookie HttpOnly administrada por la API.
