# Tareas · 020 · unified-reports-and-feedback

- Solicitada: 2026-11-21
- Aprobada: 2026-11-21
- Spec: `apps/dashboard/specs/020-unified-reports-and-feedback.md`
- Plan: `apps/dashboard/plan/020-unified-reports-and-feedback.md`

Tareas marcadas con evidencia de la implementación: `npx vitest run` (93 archivos, 792 pruebas en verde) y `../pwa/node_modules/.bin/tsc --noEmit -p tsconfig.json` sin errores, ambos desde `apps/dashboard`. Quedan abiertas T-14 (verificación visual) y T-18 (cierre y PR).

Las decisiones D-1 a D-5 y D-7 del plan quedaron confirmadas por la sesión principal, sujetas a veto del responsable funcional.

## Base de datos (responsable de BD)

- No aplica. Esta feature no crea ni modifica esquema, datos ni DBR. No se requiere consulta de `arca_pruebas`. Si el alcance cambiara para tocar datos, se abre una DBR antes de continuar.

## Verificación previa

- [x] **T-01** (CA-02, CA-03, CA-10): verificar en `apps/api` (solo lectura) que `me.permissions` incluye `tickets.view-all` para `admin` y `zoo-admin` (`api-023` CA-08, `RolesAndPermissionsSeeder`) y que el historial devuelve todos los boletos con ese permiso (`api-009` CA-15). Si falta, detener: es bloqueante y se resuelve en la API.
  - Evidencia: `GET /auth/me` devuelve `getAllPermissions` (`StaffProfileResource:28`); con el seeder corrido en `arca_pruebas`, `admin` y `zoo-admin` tienen `tickets.view-all`.
- [x] **T-02** (CA-19, CA-20, CA-24): confirmar en código y, si es posible, en navegador, el duplicado de `ActionError` (M-01), y leer el texto exacto de M-08, M-09, M-11 y M-18 del inventario del plan. Actualizar la tabla del plan si cambia algo.
  - Resultado: M-09 y M-11 apuntaban a mensajes que ya eran estado de la vista o aviso (ver «Divergencias de implementación» del plan).
- [x] **T-03** (CA-32): contar y listar las pruebas existentes que cambian (plan, «Tests existentes que cambian») y confirmar el conteo de ocurrencias.

## Viewmodels puros (lógica de presentación)

- [x] **T-04** (CA-02, CA-03, CA-04, CA-07): crear `src/viewmodels/report-tabs.ts` con el orden Boletos, Cancelaciones, Historial, el permiso de cada pestaña, la pestaña por defecto y la validación de selección. Crear `tests/reports-navigation.test.tsx` con los casos de CA-02, CA-03, CA-04 y CA-07.
- [x] **T-05** (CA-05, CA-06): en `src/viewmodels/dashboard-shell.ts`, quitar `cancellations` de la unión, añadir `reportsTab` y la acción `select-reports-tab` que ignora pestañas no permitidas, y reiniciar la pestaña al navegar. Actualizar `src/viewmodels/useDashboardShell.ts`. Crear `tests/reports-tab-state.test.tsx` con CA-05 y CA-06.
- [x] **T-06** (CA-01, CA-03, CA-09, CA-10, CA-11): en `src/viewmodels/navigation.ts`, sustituir «Reporte de boletos» y «Cancelaciones» por la entrada «Reportes» con permiso compuesto; «Historial» de taquilla con `tickets.create` y `tickets.view` (D-1 para cuentas mixtas); actualizar `sectionsForPermissions`. Añadir a `tests/reports-navigation.test.tsx` los casos CA-01, CA-09, CA-10 y CA-11 (lectura de identificadores).
- [x] **T-07** (CA-13, CA-14, CA-15, CA-16, CA-17): crear `src/viewmodels/report-export.ts` y `src/viewmodels/report-period.ts` con las etiquetas, el orden, el estado de descarga y el valor por defecto «Semanal» (D-5 y D-7 pendientes). Crear `tests/reports-shared-controls.test.tsx` con CA-13 a CA-17 (sin lógica de negocio).

## Componentes compartidos y vistas

- [x] **T-08** (CA-13, CA-14, CA-15, CA-27): crear `src/components/ReportExportButtons.tsx`, `src/components/ReportPeriodControls.tsx` y `src/components/ReportTotals.tsx`. Adoptarlos en `src/views/TicketReportView.tsx` y `src/views/CancellationReportView.tsx`. En Cancelaciones, el 422 de periodo va junto al selector, el 422 de formato junto al grupo de exportación, y el fallo de red o 5xx a aviso (T-13 cubre el aviso).
- [x] **T-09** (CA-19, CA-21, CA-23): crear `src/viewmodels/feedback-policy.ts` con las cuatro categorías de RN-07 y su presentación. Crear `tests/feedback-policy.test.tsx` con CA-19, CA-21, CA-22 (caso de confirmación) y CA-23.
- [x] **T-10** (CA-20, CA-22): en `src/components/DashboardNotifications.tsx`, `ActionError` no pinta el texto fuera de diálogos cuando hay proveedor, y mantiene `inDialog` para diálogos. En `src/components/InlineConfirm.tsx`, usar `inDialog`. Ajustar `tests/dashboard-notifications.test.tsx`. Añadir a `tests/feedback-policy.test.tsx` los casos CA-20 y CA-22.
- [x] **T-11** (CA-01, CA-08, CA-11, CA-12): en `src/App.tsx`, quitar la sección `cancellations`, cambiar el título de `reports` a «Reportes», renderizar `src/sections/ReportsSection.tsx` (nuevo) con las pestañas de `src/components/ReportTabs.tsx` (nuevo) y `TicketHistoryView` con `canCancel` según `tickets.cancel`. Actualizar `src/viewmodels/search-actions.ts`, `src/viewmodels/focus-target.ts` y `src/viewmodels/global-search.ts` para que los resultados de boletos y la exportación lleven a una pestaña permitida (CA-12). Añadir a `tests/reports-navigation.test.tsx` los casos CA-11 y CA-12; añadir a `tests/reports-shared-controls.test.tsx` el caso CA-08.

## Migración de mensajes por sección

- [x] **T-12** (CA-19, CA-25, CA-26): migrar M-05 a M-09 y M-11 según el plan. En `src/views/UsersView.tsx`, `optionsError` pasa a estado de la vista con reintento (D-2); en `src/components/InlinePasswordReset.tsx`, el error general pasa a aviso y los errores de campo se mantienen. En `src/views/EventsView.tsx`, `missingPending` pasa a aviso. En `src/views/TicketPricesView.tsx`, el error general pasa a aviso y el mensaje 2FA se mantiene (D-4). En `src/views/TicketSaleView.tsx`, según el origen (D-3). Revisar M-29 (fallback de `NoticeBar`) y los tests que lo renderizan sin proveedor. Crear `tests/feedback-migration.test.tsx` con CA-25 y CA-26.
- [x] **T-13** (CA-27, CA-28, CA-19): migrar M-16 (aviso de exportación por red o 5xx), M-18 (`dismissError` de `src/components/ConsoleNoticesBanner.tsx`) y M-20 (error general de `src/components/SpeciesFichaForm.tsx`). Mantener M-21 (errores de campo). Añadir a `tests/feedback-migration.test.tsx` los casos CA-27 y CA-28.

## Accesibilidad, MVVM y tokens

- [x] **T-14** (CA-31): crear `src/components/ReportTabs.tsx` con `tablist`, `tab`, `tabpanel`, `aria-selected`, navegación con flechas, Inicio y Fin, y foco visible. Crear `tests/reports-a11y.test.tsx` con `renderToStaticMarkup`. Componente (`src/components/ReportTabs.tsx`) y prueba (`tests/reports-a11y.test.tsx`) implementados. — Fuera de alcance de esta entrega: verificación manual de 360, 768 y 1366 px y de teclado, sin navegador en el entorno de implementación.
- [x] **T-15** (CA-18, CA-29, CA-30): crear `tests/reports-mvvm-tokens.test.tsx` que compruebe por lectura de código que los componentes nuevos no usan `fetch`, `axios` ni hex de marca, que no hay cambios en `packages/api-client` y que las decisiones están en viewmodels.

## Cobertura y verificación

- [x] **T-16** (CA-24): crear `tests/feedback-inventory.test.tsx` que lea la tabla de «Inventario de mensajes» del plan y compruebe, en el código, que cada entrada está en la categoría indicada tras la migración.
- [x] **T-17** (CA-32): crear `tests/reports-coverage.test.tsx` que compruebe que cada CA-01 a CA-31 tiene al menos una prueba que lo nombra. Actualizar los tests existentes listados en el plan (`administration-navigation`, `cancellation-report-*`, `ticket-report`, `ticket-history`, `global-search-*`, `real-staff-login`, `fixed-roles-account-management`, `admin-fixtures`, `inline-content-forms`, `staff-accounts`, `console-notices`, `global-demo-banner`, `responsive`, `acceptance-coverage`).
- [ ] **T-18** (CA-01 a CA-32): ejecutar y registrar en la sesión principal: `vitest run` del dashboard (entorno `node`), typecheck y lint del dashboard. Actualizar `apps/dashboard/AGENTS.md` (lista de specs vigentes: 020) y añadir notas de revisión breves en `dashboard-003`, `dashboard-005`, `dashboard-014`, `dashboard-016` y `dashboard-017` que apunten a `dashboard-020` sin renumerar CA. Enlazar spec, plan y tasks en el PR, y citar `dashboard-020` en el commit (lo hace el equipo).

## Revisión (b)

- [x] **T-19** (CA-33, CA-35, CA-36, CA-37): crear `src/components/StaffActionDialog.tsx` y usarlo en `src/views/UsersView.tsx` (activar, desactivar, eliminar, restablecer contraseña y 2FA); eliminar `InlineConfirm` e `InlinePasswordReset` y actualizar sus pruebas.
- [x] **T-20** (CA-34, CA-35, CA-37): pasar Noticias y Eventos a `ConfirmDialog` (`NewsView`, `EventsView`, `ContentCardActions`, `confirmationFromCopy`).
- [x] **T-21** (CA-38, CA-39, CA-40, CA-41, CA-42): crear `src/viewmodels/staff-role-suggestion.ts`, `roleChosenManually` y `changeRole` en `staff-accounts.ts` / `useStaffAccounts.ts`, y el texto de ayuda y el aviso en `UsersView`.
- [x] **T-22** (CA-33 a CA-42): crear `src/tests/modal-confirmations-and-area-role.test.tsx` y actualizar `staff-accounts`, `inline-content-forms`, `feedback-inventory`, `feedback-migration`, `feedback-policy` y `administration-quality`.
- [x] **T-23** (CA-33 a CA-42): `npx vitest run` y `tsc --noEmit` del dashboard; notas en `dashboard-004` y `dashboard-017`.

## Revisión (c)

- [x] **T-24** (CA-43, CA-44, CA-45, CA-46): crear `viewmodels/pagination.ts` y `components/Pagination.tsx`; eliminar `PaginationBar` y `HasMorePaginationBar`.
- [x] **T-25** (CA-43, CA-47, CA-48): usar `Pagination` en Usuarios, Noticias, Eventos, Recintos, TulanPedia, Momentos, Historial y Boletos; foco `--ring` y brecha en `styles.css`; documentar el pendiente de Cancelaciones.
- [x] **T-26** (CA-43 a CA-48): crear `tests/pagination.test.tsx`; ejecutar `npx vitest run` y `tsc --noEmit`.

## Revisión (d)

- [x] **T-27** (CA-49, CA-50, CA-55): mover `Pagination`, el contador de bloqueo y `ConfirmDialog` a `packages/ui`; envoltorio delgado de `ConfirmDialog`; eliminar copias de dashboard y PWA; documentar en `packages/ui/README.md`.
- [x] **T-28** (CA-51, CA-52): TulanPedia y Momentos con total (`lastPage`, `total`).
- [x] **T-29** (CA-53): Cancelaciones con paginación de filas (`goToPage`, `Pagination`).
- [x] **T-30** (CA-54): tipos y métodos aditivos en `packages/api-client`.
- [x] **T-31** (CA-49 a CA-55): `tests/shared-components-and-total-pagination.test.tsx`; `npx vitest run` y `tsc --noEmit` del dashboard; `npx vitest run` y `tsc -b` de la PWA. **Queda abierta la revisión a ojo** (360 px y escritorio) de Cancelaciones, TulanPedia, Momentos y «Mis solicitudes».

## Revisión (e)

- [x] **T-32** (CA-56, CA-57, CA-58, CA-59, CA-65): crear `Skeleton`, `SkeletonRegion`, `SkeletonTable`, `SkeletonCards`, `SkeletonForm`, `useDelayedFlag` y `startDelayedFlag` en `packages/ui`; estilos con tokens y `rem`; documentar en el README.
- [x] **T-33** (CA-60, CA-61, CA-62, CA-63): crear `components/LoadingSkeletons.tsx`, el parámetro `skeleton` de `ListStatusMessage` y `ReportViewState`; usarlos en las 16 pantallas del inventario y retirar `report-loading*`.
- [x] **T-34** (CA-56 a CA-65): crear `tests/loading-skeletons.test.tsx` y ajustar `ticket-report.test.tsx`.
- [x] **T-35** (CA-56 a CA-65): `npx vitest run` y `tsc --noEmit` del dashboard; `npx vitest run` y `tsc -b` de la PWA. **Queda abierta la revisión a ojo** (360 px y escritorio) de cada esqueleto contra su pantalla.
