# Arquitectura de `apps/dashboard`

## Estado y alcance

- La autenticación del personal es actual conforme a `dashboard-002-real-staff-login`.
- Las secciones de administración (Panel principal, Noticias, Eventos, Reporte de boletos, Recintos y Usuarios) están conectadas a la API (`api-007`) conforme a `dashboard-003-administration-sections`.
- Venta e Historial de taquilla siguen siendo demostrativos (datos de `data/demo-data.ts` y `DemoBanner`) hasta su propia spec. El buscador y las notificaciones de la barra superior también son de demostración.
- No hay React Router, persistencia local ni integración de pagos. La exportación del reporte la genera la API; CSV, Excel y PDF están habilitados en la API (ADR 0017 aceptado); el error «Formato de exportación no disponible.» queda para un formato fuera de la lista habilitada y el PDF responde 422 si el periodo supera el tope de boletos.

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
| `navigation` | Traducir `home` y permisos a las secciones que se pueden presentar (Usuarios con `users.manage` u `operational-staff.manage`) |
| `useDashboardDemo` | Mantener en memoria la navegación entre secciones y el estado de Venta/Historial demostrativos |
| `UsersSection`, `NewsSection`, `EventsSection`, `EnclosuresSection`, `DashboardSection`, `TicketReportSection` | Contenedores delgados: llaman a su hook ViewModel solo cuando la sección se abre y pasan el resultado a la View |
| `UsersView`, `NewsView`, `EventsView`, `EnclosuresView`, `DashboardView`, `TicketReportView` | Presentación por props, sin lógica ni llamadas a la API |
| `useStaffAccounts`, `useNewsManagement`, `useEventsManagement`, `useEnclosuresManagement`, `useDashboardSummary`, `useTicketReport` | ViewModels (uno por sección) sobre `adminApi` de `@arca/api-client` |
| `DataTable`, `PaginationBar`, `ConfirmDialog`, `FieldErrors`, `ListStatusMessage`, `NoticeBar`, `SalesTotals` | Componentes locales con las clases y tokens del `styles.css` vigente |
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

## Secciones de administración

Estructura de cada sección conectada:

```
View (props)  ←  Section (contenedor)  ←  hook ViewModel  →  reducer/funciones puras  →  @arca/api-client  →  API
```

- `src/views/*View.tsx`: reciben `state` y `actions`; no importan `services/` ni `@arca/api-client` (los tipos de DTO se reexportan desde `viewmodels/admin-types.ts`).
- `src/sections/*Section.tsx`: llaman al hook de su sección; así las listas se piden solo al abrir cada sección.
- `src/viewmodels/<tema>.ts`: estado, reducer y funciones asíncronas que reciben el cliente (`AdminApi`) como parámetro, por lo que se prueban con un cliente simulado. `managed-list.ts` concentra el estado común (carga, vacío, error, diálogo, aviso, errores 422 por campo) y `api-errors.ts` traduce `ApiError`. El 401 lo atiende el manejador global de sesión ("Tu sesión expiró"); los ViewModels no lo duplican.
- Los roles asignables, el alcance de cuentas, las validaciones, los totales y los periodos (`previous_date`/`next_date`) los entrega la API; el cliente no los calcula. Los importes llegan como cadena y solo se formatean.
- Las contraseñas capturadas (alta y restablecimiento) viven en el estado local del formulario, se envían y se descartan; no pasan por ningún reducer.
- Las confirmaciones (desactivar/activar, eliminar, restablecer contraseña o 2FA, eliminar noticia o evento) usan `ConfirmDialog` sobre el `Dialog` de `@arca/ui` (`<dialog>` modal con foco atrapado y cierre con Escape).

Endpoints consumidos (todos bajo `/api/v1/admin`, de `api-007`): `users` (lista, opciones, alta, edición, estado, baja, contraseña y 2FA), `news`, `events`, `enclosures`, `dashboard` y `reports/tickets` (con `/export`). Ver `packages/api-client/README.md`.

## Patrón y estructura

La SPA sigue MVVM:

- **View:** componentes React en `src/views/` y la shell `src/App.tsx`.
- **ViewModel de autenticación:** reducer y orquestación en `src/viewmodels/auth-session.ts`; hook delgado en `useAuthSession.ts`.
- **ViewModel de navegación:** `src/viewmodels/navigation.ts`.
- **Servicios:** `src/services/arca-api.ts` crea las instancias compartidas `authApi` y `adminApi`; `src/services/save-file.ts` entrega al navegador los archivos exportados.
- **Módulos demostrativos:** reducer/hook y fixtures en `dashboard-demo.ts`, `useDashboardDemo.ts` y `data/demo-data.ts` (solo Venta e Historial).

Las vistas, componentes, secciones y `App.tsx` no llaman a `fetch` ni a `axios`. El uso de `fetch` queda encapsulado en `packages/api-client`.

## Desarrollo local

Vite usa el puerto `5174` con `strictPort`; la PWA usa `5173`. El proxy de `/api` y `/sanctum` apunta a `process.env.ARCA_API_PROXY_TARGET ?? 'http://localhost:8000'` y conserva el origen `localhost:5174` para Sanctum.

## Seguridad y datos

- La cookie de sesión HttpOnly y CSRF pertenecen a la API; las credenciales no se guardan en almacenamiento del navegador.
- Los códigos de recuperación permanecen en memoria mientras se presentan y se descartan al confirmar que fueron guardados.
- El QR se representa mediante un `<img>` con URI SVG codificada; no se usa `innerHTML` ni `dangerouslySetInnerHTML`.
- Si `pwa_url` está vacío, la vista veterinaria explica que la aplicación no está configurada y no intenta una redirección ni muestra un enlace roto.
- Los fixtures de las secciones demo no son datos operativos ni fuente de autorización.
- Los datos personales del personal (nombre, correo, área, rol) solo viven en el estado de React de la sección abierta; no se persisten en el navegador.
- `download` valida que la respuesta sea 2xx antes de crear el `Blob` y sanea el nombre de archivo.

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
  Navigation --> Sections[Secciones de administración]
  Sections --> AdminVM[Hooks ViewModel por sección]
  AdminVM --> Client
  Navigation --> Demo[Venta e Historial demostrativos]
  Views --> UI[@arca/ui y @arca/tokens]
```
