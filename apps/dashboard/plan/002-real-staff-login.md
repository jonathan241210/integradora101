# Plan técnico · 002 · real-staff-login

- Spec: `apps/dashboard/specs/002-real-staff-login.md`
- Estado de spec: Aprobada (Jonathan, 2026-10-15)
- Responsable técnico: Jonathan
- Precondición: `api-003` implementada y cuentas demo sembradas en `arca_pruebas`

## Diseño de solución

El dashboard reemplaza el login ficticio por la autenticación real de `api-003`. Toda llamada HTTP vive en `@arca/api-client` (paquete local, TypeScript sin dependencias externas, `fetch` nativo solo dentro del paquete). El estado de sesión lo gestiona un ViewModel: un reducer puro más funciones de orquestación async que reciben el cliente de autenticación, envueltos por el hook `useAuthSession`. Las vistas solo presentan y emiten intenciones (MVVM).

Estados de sesión (RN-06): `checking → anonymous | two-factor-challenge | two-factor-setup | authenticated | redirecting-pwa`. Con `authenticated`, `home` y permisos de `me` se traducen a un perfil de presentación (`administration | executive | ticket`) y a las secciones visibles; las secciones demostrativas (venta, historial, reporte, noticias, eventos, recintos, usuarios) conservan datos ficticios (RN-02).

El módulo `auth` de `@arca/api-client` no contiene nada propio del dashboard, para que la PWA lo reutilice en su futura spec de login.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| `packages/api-client` | `package.json` (`main`/`types` → `index.ts`, como `@arca/tokens`), `index.ts`, `http.ts`, `auth.ts`, `types.ts`, `README.md` | Cliente HTTP con cookies/CSRF y módulo `auth` |
| Dashboard / config | `package.json` (`"@arca/api-client": "file:../../packages/api-client"`), `vite.config.ts` | Paquete local y proxy/puerto de desarrollo |
| Dashboard / servicios | `src/services/arca-api.ts` | Instancia única del cliente |
| Dashboard / ViewModels | `src/viewmodels/auth-session.ts`, `useAuthSession.ts`, `navigation.ts`, ajustes en `dashboard-demo.ts` y `useDashboardDemo.ts` | Estado de sesión, navegación por permisos, limpieza del demo |
| Dashboard / datos | `src/data/demo-data.ts` | Retirar credenciales ficticias |
| Dashboard / vistas | `src/views/LoginView.tsx` (reescrita), `TwoFactorChallengeView.tsx`, `TwoFactorSetupView.tsx`, `PwaRedirectView.tsx`, `src/App.tsx` | Interfaz del login real |
| Dashboard / pruebas | `src/tests/api-client-auth.test.tsx`, `real-staff-login.test.tsx`, `real-staff-login-coverage.test.tsx`, ajustes en `login.test.tsx` y `acceptance-coverage.test.tsx` | Un test por CA |
| Documentación | `apps/dashboard/docs/arquitectura.md`, `docs/manual-demo.md`, `packages/api-client/README.md`; spec/plan/tasks de `dashboard-001` | Referencia vigente |

## Contrato y datos

### `@arca/api-client`

- `createHttpClient({ baseUrl, fetchImpl = fetch, onUnauthorized? })`:
  - Todas las peticiones con `credentials: 'include'` y `Accept: application/json`; cuerpo JSON con `Content-Type: application/json`.
  - Antes de cada petición que no sea `GET`, si no existe la cookie `XSRF-TOKEN`, llama a `GET /sanctum/csrf-cookie`; envía `X-XSRF-TOKEN` con el valor decodificado de la cookie.
  - Normaliza errores a `ApiError { status, message, code?, errors?, retryAfterSeconds? }` (`retryAfterSeconds` desde `Retry-After` en 429).
  - Invoca `onUnauthorized` ante 401.
- `createAuthApi(http)`, endpoints de `api-003`:

| Función | Endpoint |
|---|---|
| `login({ email, password })` → `LoginResult { twoFactor: boolean }` | `POST /api/v1/auth/login` |
| `twoFactorChallenge({ code } \| { recovery_code })` | `POST /api/v1/auth/two-factor-challenge` |
| `me()` → `StaffProfile` | `GET /api/v1/auth/me` |
| `logout()` | `POST /api/v1/auth/logout` |
| `enableTwoFactor()` | `POST /api/v1/auth/user/two-factor-authentication` |
| `twoFactorQrCode()` → `{ svg }` | `GET /api/v1/auth/user/two-factor-qr-code` |
| `confirmTwoFactor({ code })` | `POST /api/v1/auth/user/confirmed-two-factor-authentication` |
| `recoveryCodes()` → `string[]` | `GET /api/v1/auth/user/two-factor-recovery-codes` |

- `types.ts`: `StaffHome = 'administration' | 'executive' | 'ticket' | 'pwa'`; `StaffProfile` con los campos de `StaffProfileResource` (`id`, nombres, `full_name`, `email`, `department`, `roles`, `permissions`, `home`, `pwa_url`, `two_factor_setup_required`); `LoginResult`; `ApiError`.
- Paquete local como `@arca/ui`/`@arca/tokens`: no requiere ADR ni dependencias externas.

### Configuración de desarrollo

- `vite.config.ts`: `server.port: 5174` con `strictPort: true` (la PWA usa 5173) y `server.proxy` de `/api` y `/sanctum` hacia `process.env.ARCA_API_PROXY_TARGET ?? 'http://localhost:8000'`. El cliente usa base URL relativa, así la cookie queda en el origen del dashboard.

### ViewModels

- `auth-session.ts`:
  - Estado: `status`, `profile`, `error` (mensaje en español), `sessionExpired`, `submitting`, `recoveryCodes`, `qrSvg`.
  - Reducer puro con acciones `session-checked`, `login-submitted`, `login-failed`, `two-factor-required`, `two-factor-setup-required`, `setup-loaded`, `setup-confirmed`, `recovery-codes-acknowledged`, `authenticated`, `unauthorized`, `signed-out`.
  - Funciones de orquestación `checkSession`, `submitLogin`, `submitTwoFactor`, `startTwoFactorSetup`, `confirmTwoFactorSetup`, `signOut`, que reciben `authApi` y `dispatch` (probables con un cliente falso).
  - Mensajes: 422 → mensaje de la API («Correo o contraseña incorrectos.»); 429 → mensaje de la API con segundos; 401 tras estar autenticado → «Tu sesión expiró» (CA-08); 401 inicial en `me` → `anonymous` sin mensaje.
  - `two_factor_setup_required: true` en `me` o 403 `two_factor_setup_required` → `two-factor-setup`.
- `useAuthSession.ts`: hook delgado (`useReducer` + efecto inicial `checkSession`); con `home: pwa` pasa a `redirecting-pwa` y llama a `window.location.assign(pwa_url)`.
- `navigation.ts`: `home` → perfil de presentación; en `administration` filtra secciones por permisos: Dashboard (`dashboard.view`), Noticias (`news.manage`), Eventos (`events.manage`), Reporte (`reports.view`), Recintos (`enclosures.manage`), Usuarios (`users.manage` o `operational-staff.manage`). Sirve igual para `admin` y `zoo-admin`. `executive` → Dashboard y Reporte en solo lectura; `ticket` → Venta e Historial.
- `dashboard-demo.ts`: se eliminan `select-profile`, `login-administration` y `login-ticket`; se añade `start-session(profile)`; `DemoProfile` incluye `executive` con secciones `dashboard` y `reports`; `sign-out` limpia la vista.
- `demo-data.ts`: se retiran `demoAdministrationCredentials` y las contraseñas de las cuentas de taquilla; `TicketUsersView` queda demostrativa (CA-10).

### Vistas

- `LoginView`: un formulario (correo, contraseña), botón mostrar/ocultar con `aria-pressed` y `aria-label` dinámico («Mostrar contraseña»/«Ocultar contraseña»), `Alert` con `role="alert"`, botón deshabilitado con «Ingresando…». Sin selector de perfil, sin credenciales visibles y sin `DemoBanner`.
- `TwoFactorChallengeView`: campo de código TOTP con opción «Usar un código de recuperación»; errores en `role="alert"`.
- `TwoFactorSetupView`: instrucciones («Instala una app autenticadora y escanea el código»), QR como `<img src="data:image/svg+xml;utf8,…" alt="Código QR para tu app autenticadora">` sin `innerHTML`, confirmación con código y códigos de recuperación mostrados una vez con «Ya guardé mis códigos».
- `PwaRedirectView`: «Tu cuenta usa la app veterinaria. Te estamos redirigiendo…» con enlace de respaldo a `pwa_url`.
- `App.tsx`: orquesta `useAuthSession` y la shell; muestra el nombre real del usuario en el encabezado; «Salir» llama a `signOut`. `DemoBanner` permanece solo en las secciones demostrativas.
- Estilo con tokens semánticos de `@arca/tokens`; sin hex en vistas (CA-13).

### Errores y compatibilidad

- La autorización real es de la API (RN-01): un 403 en una sección se muestra como error, nunca se asume acceso.
- Sin React Router (ADR 0002); la navegación sigue en estado.

## Seguridad, offline y operación

- No se guardan credenciales, perfil ni códigos en `localStorage`/`sessionStorage`; la sesión es la cookie HttpOnly de la API.
- Códigos de recuperación solo en memoria y descartados al confirmar.
- Producción: API, dashboard y PWA deben compartir dominio raíz (hosting por definir, ADR 0013).
- Sin dependencias nuevas de terceros.

## Mapeo de criterios a pruebas

Vitest en entorno `node`, sin jsdom ni testing-library: reducer y orquestación con cliente falso, `renderToStaticMarkup` para las vistas, `fetchImpl` falso para el cliente.

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | `CA-01 real-staff-login`: formulario único sin selector ni credenciales | `src/tests/real-staff-login.test.tsx` |
| CA-02 | `CA-02 real-staff-login`: botón mostrar/ocultar con `aria-pressed` y etiqueta dinámica | `src/tests/real-staff-login.test.tsx` |
| CA-03 | `CA-03 real-staff-login`: 422 y 429 en `role="alert"`; normalización en el cliente | `src/tests/real-staff-login.test.tsx`, `src/tests/api-client-auth.test.tsx` |
| CA-04 | `CA-04 real-staff-login`: reto TOTP y código de recuperación | `src/tests/real-staff-login.test.tsx` |
| CA-05 | `CA-05 real-staff-login`: enrolamiento `admin`/`zoo-admin`, QR como imagen, códigos una vez | `src/tests/real-staff-login.test.tsx` |
| CA-06 | `CA-06 real-staff-login`: secciones por `home` y permisos (`admin`, `zoo-admin`, `executive`, `cashier`) | `src/tests/real-staff-login.test.tsx` |
| CA-07 | `CA-07 real-staff-login`: `pwa` → vista de redirección y `location.assign` | `src/tests/real-staff-login.test.tsx` |
| CA-08 | `CA-08 real-staff-login`: 401 → login con «Tu sesión expiró» | `src/tests/real-staff-login.test.tsx` |
| CA-09 | `CA-09 real-staff-login`: logout llama a la API y limpia la vista | `src/tests/real-staff-login.test.tsx` |
| CA-10 | `CA-10 real-staff-login`: sin credenciales en `demo-data.ts`; vista Usuarios demostrativa | `src/tests/real-staff-login.test.tsx` |
| CA-11 | `CA-11 real-staff-login`: `views/`, `components/` y `App.tsx` sin `fetch`/`axios`; CSRF/credenciales en el cliente | `src/tests/real-staff-login.test.tsx`, `src/tests/api-client-auth.test.tsx` |
| CA-12 | `CA-12 real-staff-login`: foco visible, estados de carga/error y clases adaptables | `src/tests/real-staff-login.test.tsx` |
| CA-13 | `CA-13 real-staff-login`: sin hex en las vistas nuevas | `src/tests/real-staff-login.test.tsx` |
| CA-14 | `CA-14 real-staff-login`: existe una prueba por CA-01..CA-14 | `src/tests/real-staff-login-coverage.test.tsx` |

Tests de `dashboard-001`: los criterios reemplazados (CA-01, CA-10, CA-13 y la parte de login de CA-12) se marcan como reemplazados por `dashboard-002` en su spec, plan y tasks; `login.test.tsx` se retira o reduce a lo vigente y `acceptance-coverage.test.tsx` excluye los reemplazados.

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | Sin dependencias de terceros; `@arca/api-client` es paquete local con `fetch` nativo |
| II. La spec manda | Sí | Spec `dashboard-002` aprobada; plan y tasks con el mismo identificador; `dashboard-001` actualizada en el mismo cambio |
| III. Lógica separada de la interfaz | Sí | Autorización y `home` vienen de la API; las vistas no llaman a la red (CA-11) |
| IV. Un test por criterio | Sí | CA-01..CA-14 mapeados; CA-14 verifica la cobertura |
| V. Una sola fuente de verdad para los datos | Sí | Sin almacenamiento local de sesión; la API es la autoridad |
| VI. Código en inglés, personas en español | Sí | Identificadores en inglés; textos de UI en español |

## Riesgos y decisiones

- **ADR:** ninguno nuevo (ADR 0002 para la SPA; paquete local sin dependencias).
- Cookie y proxy en desarrollo: si el proxy falla, la cookie no se comparte; se documenta `ARCA_API_PROXY_TARGET`.
- Sin jsdom, la interacción se prueba vía reducer y orquestación; la verificación de interacción real queda en la prueba manual.
- El copy de la pantalla de redirección a la PWA puede afinarse en revisión.

## Orden y aprobación

1. `@arca/api-client` y sus tests → proxy y puerto de Vite → reducer y orquestación → hook → navegación → limpieza del demo → vistas → `App.tsx` → ajuste de `dashboard-001` → tests CA-01..CA-14 → docs.
2. `npm run types`, `npm test`, `npm run build`, `/verify`.
3. Prueba manual con las cuentas demo contra la API local.

Aprobación técnica: pendiente — Jonathan.
