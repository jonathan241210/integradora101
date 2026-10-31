# Tareas · 003 · administration-sections

- Spec: `apps/dashboard/specs/003-administration-sections.md` (Aprobada, Jonathan, 2026-10-30)
- Plan: `apps/dashboard/plan/003-administration-sections.md` (Aprobado, Jonathan, 2026-10-30)
- Estado del checklist: Aprobado

Rutas relativas a `apps/dashboard` salvo que se indique `packages/…`. Cada prueba nombra su criterio con el bloque `describe("CA-NN administration-sections", …)`. Se desarrolla contra un `AdminApi` simulado (RN-08); no se instalan dependencias ni se toca `package.json`.

## Base de datos (responsable de BD)

No hay tareas de BD: esta feature no cambia el esquema. La DBR-005 acompaña a `api-007` y no bloquea ninguna tarea de este checklist.

## Implementación

### Cliente de API (`@arca/api-client`)

- [x] **T-01** (CA-12, CA-14, RN-07): En `packages/api-client/http.ts` agregar `patch` y `put` (mismo manejo de XSRF, 419 y 401 que `post`) y `download(path)` que devuelve `{ blob, filename }`; ante respuesta no 2xx lanza `ApiError` con el JSON de error; el nombre sale de `Content-Disposition` y se sanea. Solo agrega exports.
- [x] **T-02** (CA-14): Crear `packages/api-client/admin-types.ts` (DTO en `snake_case`: cuentas, opciones, noticias, eventos, recintos, panel, reporte y `Paginated<T>`; importes como cadena) y `packages/api-client/admin.ts` con `createAdminApi(http)` (`users`, `news`, `events`, `enclosures`, `dashboard`, `reports`). Exportar desde `index.ts` y documentar en `packages/api-client/README.md`.
- [x] **T-03** (CA-14): En `src/services/arca-api.ts` exportar `adminApi`; crear `src/services/save-file.ts` (Blob URL + `<a download>`), inyectable en el ViewModel.

### Base común

- [x] **T-04** (CA-07, CA-15): `src/viewmodels/api-errors.ts`: convierte `ApiError` en `{ message, fieldErrors, forbidden, notFound }`; el 401 lo sigue manejando el manejador global existente y no se duplica.
- [x] **T-05** (CA-16, CA-17, RN-09): Componentes locales `src/components/DataTable.tsx` (contenedor con desplazamiento propio y diseño apilado en móvil), `PaginationBar.tsx`, `ConfirmDialog.tsx` (sobre `Dialog` de `@arca/ui`) y `FieldErrors.tsx`; clases nuevas en `src/styles.css` solo con tokens semánticos y los patrones visuales vigentes.

### Shell y navegación

- [x] **T-06** (CA-01, RN-01): En `src/viewmodels/navigation.ts` renombrar el id `ticket-users` a `users` con etiqueta «Usuarios», manteniendo el permiso `users.manage` u `operational-staff.manage`; ajustar `DashboardSection` en `src/viewmodels/dashboard-demo.ts` y retirar de ese reducer y de `useDashboardDemo.ts` el estado y las acciones ficticias de recintos y usuarios.
- [x] **T-07** (CA-01, CA-02, RN-06): En `src/App.tsx`: enrutar las seis secciones a sus contenedores, actualizar `sectionTitles` y mostrar `DemoBanner` solo cuando la sección activa sea `tickets` o `ticket-history`.

### Usuarios

- [x] **T-08** (CA-03, CA-04, CA-05, CA-06, CA-07, RN-02, RN-03, RN-07): `src/viewmodels/staff-accounts.ts` (estado, reducer y funciones: cargar con filtros y página, cargar opciones, crear, editar, activar/desactivar, eliminar, restablecer contraseña, restablecer 2FA; la contraseña no se guarda en ningún estado) y `useStaffAccounts.ts`.
- [x] **T-09** (CA-03, CA-04, CA-05, CA-06, CA-07, CA-16): `src/views/UsersView.tsx` (reemplaza a `TicketUsersView.tsx`): tabla paginada, búsqueda y filtros por rol, área y estado; diálogos de alta y edición (rol sugerido por el área, solo roles asignables que entrega la API, correo de solo lectura al editar, errores 422 por campo); `ConfirmDialog` para desactivar/activar, eliminar, restablecer contraseña (con mostrar/ocultar accesible) y restablecer 2FA; estados de carga, vacío y error con `role="alert"`; aviso de éxito accesible. Contenedor `src/sections/UsersSection.tsx`.

### Recintos, panel y reporte

- [x] **T-10** (CA-09): `src/viewmodels/enclosures-management.ts` + `useEnclosuresManagement.ts`, `src/views/EnclosuresView.tsx` y `src/sections/EnclosuresSection.tsx`: lista con número de animales, crear y renombrar, sin eliminar, error por nombre repetido.
- [x] **T-11** (CA-10, RN-04): `src/viewmodels/dashboard-summary.ts` + `useDashboardSummary.ts`, `src/views/DashboardView.tsx` y `src/sections/DashboardSection.tsx`: totales de hoy y de 7 días y serie diaria tal como llegan de la API, con estado vacío; sin cálculos en el cliente.
- [x] **T-12** (CA-11, CA-12, CA-13, RN-04, RN-10): `src/viewmodels/ticket-report.ts` + `useTicketReport.ts`, `src/views/TicketReportView.tsx` y `src/sections/TicketReportSection.tsx`: selector Semanal/Mensual y rango personalizado secundario, navegación anterior/siguiente con `previous_date`/`next_date` de la API, totales, desglose y listado paginado; botones «Exportar CSV/Excel/PDF» que descargan el periodo visible mediante `save-file` y muestran el error de la API (p. ej. formato no disponible) sin perder el reporte. Sin acciones de edición para `executive`.

### Noticias y eventos

- [x] **T-13** (CA-08, RN-03): `src/viewmodels/news-management.ts` + `useNewsManagement.ts`, `src/viewmodels/events-management.ts` + `useEventsManagement.ts`, `src/views/NewsView.tsx`, `src/views/EventsView.tsx` y sus secciones: listas con estado, crear, editar, activar/desactivar y eliminar con confirmación, errores 422 por campo y sin campo de imagen.

### Limpieza

- [x] **T-14** (CA-02, RN-02): Retirar de `src/data/demo-data.ts` los datos de noticias, eventos, recintos, usuarios y reporte que ya no se usan; conservar los de venta e historial. Eliminar `TicketUsersView.tsx` y código sin referencias.
- [x] **T-15** (RN-02): Marcar en `specs/001-admin-dashboard-prototype.md` los criterios sustituidos por `dashboard-003` y ajustar o retirar sus pruebas en el mismo cambio (`enclosures`, `content-management`, `ticket-users`, `ticket-report`, `dashboard`, `acceptance-coverage`, `global-demo-banner`).

## Pruebas (un test por CA)

- [x] **T-16** (CA-01): `src/tests/administration-navigation.test.tsx`: `getNavigationForProfile` muestra «Usuarios» con `users.manage` o con `operational-staff.manage`, respeta cada permiso y ya no existe «Usuarios de taquilla».
- [x] **T-17** (CA-02): Actualizar `src/tests/global-demo-banner.test.tsx`: `App` no renderiza `DemoBanner` en las seis secciones conectadas y sí en Venta e Historial.
- [x] **T-18** (CA-03, CA-04, CA-05, CA-06, CA-07): Reemplazar `src/tests/ticket-users.test.tsx` por `src/tests/staff-accounts.test.tsx`: columnas, filtros, paginación y estados; rol sugerido y roles asignables; edición con correo de solo lectura; confirmación antes de llamar a la API y contraseña con mostrar/ocultar; 403/404/422 sin alterar la lista y recarga con aviso tras éxito.
- [x] **T-19** (CA-08): Reescribir `src/tests/content-management.test.tsx` para noticias y eventos reales: lista, crear/editar/estado/eliminar con confirmación, 422 por campo y ausencia de campo de imagen.
- [x] **T-20** (CA-09): Reescribir `src/tests/enclosures.test.tsx`: lista con conteo, crear, renombrar, sin eliminar y error por nombre repetido.
- [x] **T-21** (CA-10): Actualizar `src/tests/dashboard.test.tsx`: datos de la API tal cual, sin cálculos y con estado vacío.
- [x] **T-22** (CA-11, CA-12, CA-13): Reescribir `src/tests/ticket-report.test.tsx`: periodos, anterior/siguiente por `previous_date`/`next_date`, totales y listado; exportación con el periodo visible, error de formato no disponible y fallo de red conservando el reporte; `executive` sin acciones de edición.
- [x] **T-23** (CA-14, CA-15, CA-16, CA-17): `src/tests/administration-quality.test.tsx`: revisión estática de que `views/`, `components/` y `sections/` no importan `fetch`/`axios`/`services/`/`@arca/api-client` ni calculan totales o permisos; un 401 vuelve al login con «Tu sesión expiró»; marcado accesible (diálogos con `aria-labelledby`, `role="alert"`/`status`, tablas con contenedor desplazable, controles con etiqueta); sin hex de marca en `styles.css` ni en las Views nuevas.
- [x] **T-24** (CA-18): `src/tests/administration-coverage.test.tsx`: verifica que `CA-01` a `CA-19 administration-sections` aparecen nombrados en los tests (patrón de `acceptance-coverage.test.tsx`). Ampliada el 2026-10-30 a CA-19; su verificación de CA-19 depende de T-32. La casilla se mantiene como historial y debe revisarse al cerrar T-32.
- [x] **T-25** (CA-12, CA-14): Pruebas del cliente con `fetch` simulado para `patch`, `put` y `download` (XSRF, 419, 401 y error 422 con cuerpo JSON), en `src/tests/api-client-admin.test.tsx`.

## Calidad y entrega

- [x] **T-26** (CA-16): Revisión manual documentada en el PR: navegación con teclado, foco en diálogos y cierre con Escape, y ausencia de desborde horizontal a 360, 768 y 1366 px en Usuarios, Reporte y los formularios.
- [x] **T-27**: Desde `apps/dashboard` ejecutar `npm run types`, `npm test` y `npm run build`; correr `/verify` y registrar resultados.
- [x] **T-28** (CA-01 a CA-13) — **depende de `api-007` implementada**: recorrido de punta a punta contra la API real en `arca_pruebas` con `presidencia@arca.local`, `direccion_zoo@arca.local` y `ejecutivo@arca.local`; registrar evidencia sin secretos ni contraseñas.
- [x] **T-29**: Actualizar `apps/dashboard/docs/arquitectura.md` y `apps/dashboard/docs/manual-demo.md` (secciones conectadas vs. demostrativas, estructura View/Section/ViewModel, limitación de Excel/PDF).
- [x] **T-30**: Completar el Constitution Check del PR (`/constitution-check`), enlazar spec, plan y tasks, citar `dashboard-003` en los commits y pasar la spec a `Implementada` cuando CA-01 a CA-19 estén verificados.

## Cambio de 2026-10-30: zona horaria del dispositivo (RN-11, CA-19)

Decisión de Jonathan (responsable funcional), 2026-10-30: zona del dispositivo con respaldo en `America/Mexico_City`; Jonathan confirmó la decisión y aprobó proceder con la implementación. La redacción literal de CA-19 y RN-11 la proveyó el documentador y fue confirmada por Jonathan, 2026-10-30. La decisión de no mostrar la zona en la interfaz queda confirmada en la misma fecha; por eso no hay tarea de interfaz para ella. Depende de `api-007` RN-14 y CA-28 (T-40 y T-41) para que el efecto llegue a la API real.

- [x] **T-31** (CA-19, RN-11): en `packages/api-client/admin.ts`, `createAdminApi(http, options?)` con `options.deviceTimeZone` (por defecto `Intl.DateTimeFormat().resolvedOptions().timeZone`). `dashboard.summary()`, `reports.tickets(query)` y `reports.exportTickets(query, format)` añaden `timezone` a la consulta cuando hay zona; si el llamador ya pasa `timezone`, prevalece. `TicketReportQuery` admite `timezone?: string` en `admin-types.ts`. Actualizar `packages/api-client/README.md`. No se tocan `dashboard-summary.ts`, `ticket-report.ts`, las vistas ni `formatters.ts`.
- [x] **T-32** (CA-19): en `src/tests/api-client-admin.test.tsx`, bloque `describe("CA-19 administration-sections", …)` con `fetch` simulado: las tres llamadas (`summary`, `tickets` y `exportTickets`) incluyen `timezone` con la zona inyectada; sin zona no se envía el parámetro; un `timezone` explícito prevalece. Verificar con `npm test` y `npm run types` desde `apps/dashboard`. La comprobación contra la API real queda en T-28 y depende de que `api-007` T-40 esté verificada en `arca_pruebas`.

## Trazabilidad

- CA-01, CA-02 → T-06, T-07, T-14 (implementación) y T-16, T-17 (pruebas).
- CA-03..CA-07 → T-04, T-08, T-09 (implementación) y T-18 (prueba).
- CA-08 → T-13 (implementación) y T-19 (prueba).
- CA-09 → T-10 (implementación) y T-20 (prueba).
- CA-10 → T-11 (implementación) y T-21 (prueba).
- CA-11..CA-13 → T-01, T-02, T-03, T-12 (implementación) y T-22, T-25 (pruebas).
- CA-14..CA-17 → T-01 a T-05 (implementación) y T-23, T-25, T-26 (pruebas).
- CA-18 → T-24 (cubre CA-01 a CA-19).
- CA-19 → T-31 (implementación) y T-32 (prueba).
- RN-01..RN-11 aparecen en la tarea que las implementa (RN-11 en T-31). Ninguna tarea instala dependencias ni cambia esquema.

Orden por dependencias: T-01 a T-05 → T-06, T-07 → T-08, T-09 → T-10 a T-13 → T-14, T-15 → T-16 a T-25 (cada prueba junto a su tarea) → T-26 a T-30 → T-31 → T-32. T-28 espera a que `api-007` exista.
