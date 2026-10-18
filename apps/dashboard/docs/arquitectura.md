# Arquitectura de `apps/dashboard`

## Estado y alcance

- La autenticación del personal es actual conforme a `dashboard-002-real-staff-login`.
- Las secciones de ventas, historial, reportes, noticias, eventos, recintos y usuarios siguen siendo demostrativas hasta que sus specs las conecten con la API.
- No hay React Router, persistencia local, escritura a base de datos ni integración de pagos.

## Actores

| Perfil | Destino | Acceso visible |
|---|---|---|
| `admin` | `administration` | Secciones permitidas por sus permisos; requiere 2FA |
| `zoo-admin` | `administration` | Secciones permitidas por sus permisos; requiere 2FA |
| `executive` | `executive` | Panel y reporte de solo lectura |
| `cashier` | `ticket` | Venta e historial demostrativos |
| `veterinarian` | `pwa` | Redirección a `pwa_url`; la PWA tendrá su propio login |

Los permisos efectivos se aplican en la API. La navegación del dashboard solo presenta las secciones asociadas con `home` y `permissions` de `GET /api/v1/auth/me`; no sustituye la autorización del servidor.

## Módulos y flujo

| Módulo | Responsabilidad |
|---|---|
| `LoginView` | Correo institucional, contraseña, feedback y control accesible para mostrar/ocultar |
| `TwoFactorChallengeView` | Enviar código TOTP o código de recuperación |
| `TwoFactorSetupView` | Mostrar QR, confirmar TOTP y presentar códigos de recuperación una sola vez |
| `PwaRedirectView` | Informar y redirigir a veterinaria cuando `pwa_url` está configurada |
| `useAuthSession` | ViewModel de sesión: comprobación inicial, login, reto, enrolamiento, expiración y logout |
| `navigation` | Traducir `home` y permisos a las secciones demostrativas que se pueden presentar |
| `useDashboardDemo` | Mantener en memoria el estado de las secciones que siguen siendo demo |
| `@arca/api-client` | Encapsular solicitudes JSON, cookie Sanctum y CSRF; es reutilizable por la PWA |

`App.tsx` compone las vistas según el estado de autenticación. `DemoBanner` aparece solo en secciones demostrativas, no en login, 2FA ni redirección PWA.

## API consumida

`@arca/api-client` usa la respuesta de `me` bajo `data` y normaliza el perfil. Todos los endpoints se originan en `api-003`.

| Método y ruta | Uso |
|---|---|
| `GET /sanctum/csrf-cookie` | Preparar cookie CSRF antes de operaciones de escritura |
| `POST /api/v1/auth/login` | Login institucional |
| `POST /api/v1/auth/two-factor-challenge` | Reto TOTP o de recuperación |
| `GET /api/v1/auth/me` | Identidad, roles, permisos, destino y estado 2FA |
| `POST /api/v1/auth/logout` | Cierre de sesión |
| `POST /api/v1/auth/user/two-factor-authentication` | Iniciar enrolamiento |
| `GET /api/v1/auth/user/two-factor-qr-code` | Obtener el QR SVG |
| `POST /api/v1/auth/user/confirmed-two-factor-authentication` | Confirmar el TOTP |
| `GET /api/v1/auth/user/two-factor-recovery-codes` | Obtener códigos para mostrarlos una vez |

## Patrón y estructura

La SPA sigue MVVM:

- **View:** componentes React en `src/views/` y la shell `src/App.tsx`.
- **ViewModel de autenticación:** reducer y orquestación en `src/viewmodels/auth-session.ts`; hook delgado en `useAuthSession.ts`.
- **ViewModel de navegación:** `src/viewmodels/navigation.ts`.
- **Servicio:** `src/services/arca-api.ts` crea una instancia compartida del módulo `auth`.
- **Módulos demostrativos:** reducer/hook y fixtures en `dashboard-demo.ts`, `useDashboardDemo.ts` y `data/demo-data.ts`.

Las vistas, componentes y `App.tsx` no llaman a `fetch` ni a `axios`. El uso de `fetch` queda encapsulado en `packages/api-client`.

## Desarrollo local

Vite usa el puerto `5174` con `strictPort`; la PWA usa `5173`. El proxy de `/api` y `/sanctum` apunta a `process.env.ARCA_API_PROXY_TARGET ?? 'http://localhost:8000'` y conserva el origen `localhost:5174` para Sanctum.

## Seguridad y datos

- La cookie de sesión HttpOnly y CSRF pertenecen a la API; las credenciales no se guardan en almacenamiento del navegador.
- Los códigos de recuperación permanecen en memoria mientras se presentan y se descartan al confirmar que fueron guardados.
- El QR se representa mediante un `<img>` con URI SVG codificada; no se usa `innerHTML` ni `dangerouslySetInnerHTML`.
- Si `pwa_url` está vacío, la vista veterinaria explica que la aplicación no está configurada y no intenta una redirección ni muestra un enlace roto.
- Los fixtures de las secciones demo no son datos operativos ni fuente de autorización.

## Diagrama

```mermaid
flowchart LR
  Staff[Personal] --> Views[Login, 2FA y vistas React]
  Views --> App[App.tsx]
  App --> VM[useAuthSession]
  VM --> Client[@arca/api-client]
  Client --> API[API Laravel api-003]
  API --> Me[Perfil, roles, permisos y home]
  Me --> Navigation[navigation ViewModel]
  Navigation --> Demo[Secciones demostrativas permitidas]
  Views --> UI[@arca/ui y @arca/tokens]
```
