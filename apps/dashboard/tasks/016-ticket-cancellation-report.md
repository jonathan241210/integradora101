# Tareas · 016 · ticket-cancellation-report

- Solicitada: 2026-11-20
- Aprobada: 2026-11-20
- Spec: `apps/dashboard/specs/016-ticket-cancellation-report.md` (Aprobada)
- Plan: `apps/dashboard/plan/016-ticket-cancellation-report.md` (Aprobado; pregunta P-016-1 resuelta)
- API (dueña de la lógica): `apps/api/specs/022-ticket-cancellation-report.md`, `apps/api/plan/022-ticket-cancellation-report.md`, `apps/api/tasks/022-ticket-cancellation-report.md`
- Enmienda: `apps/dashboard/specs/005-ticket-sales.md`

Plan aprobado. Ninguna tarea está marcada. Una casilla se marca solo con evidencia aportada por la sesión principal (salida de Vitest, de lint o de tipos, o enlace a PR). Prerrequisitos antes de T-01: `dashboard-015` y `dashboard-019` implementadas (evidencia de sus PR). Para cancelar y consultar, la API `api-022` debe estar desplegada o las pruebas usan cliente simulado. El despliegue va junto con la API (DBR-024 → API → dashboard).

## Cliente (`packages/api-client`)

- [x] **T-01** (CA-05, CA-06, CA-16, CA-18, CA-21; RN-02, RN-10): en `ticket-sales-types.ts` tipos `CancellationReasonCode` (cinco códigos), `CancellationReasonDto` y `TicketCancelInput` con `reason_code` y `reason?`. En `ticket-sales.ts`: `history.cancel` envía `{ reason_code, reason }` sin `timezone`; nuevo `tickets.cancellationReasons()` (`GET …/tickets/cancellation-reasons`). En `admin-types.ts`: `CancellationReportQuery`, `CancellationReportDto`, `CancellationRowDto`, `CancellationAlertDto`. En `admin.ts`: `reports.cancellations(query)` y `reports.exportCancellations(query, format)`, ambos **sin** zona del dispositivo. Evidencia: tests en `src/tests/api-client-admin.test.tsx` que nombran CA-05 (sin `timezone`), CA-16 (mismos filtros en la exportación) y CA-21 (`reason_code` y `reason` en el cuerpo).

## ViewModels (hooks y funciones puras)

- [x] **T-02** (CA-02, CA-03, CA-05, CA-23): `src/viewmodels/cancellation-report.ts` (estado, reductor de consulta, mapeo de 401/403/422/429/5xx a mensajes, sin cálculos) y `src/viewmodels/useCancellationReport.ts` (hook que llama `adminApi.reports.cancellations` y `exportCancellations` a través de `services/arca-api.ts`). `src/viewmodels/cancellation-reasons.ts` y `src/viewmodels/useCancellationReasons.ts` (catálogo). Tests `src/tests/cancellation-report-access.test.tsx`: `test_ca02` (403 muestra el mensaje, sin filas ni totales, sin reintento) y `test_ca03` (401 lleva al login con «Tu sesión expiró»).

## Página Cancelaciones (View y navegación)

- [x] **T-03** (CA-01): entrada «Cancelaciones» en `src/viewmodels/navigation.ts` con permiso `reports.cancellations.view`; identificador de sección en `src/viewmodels/dashboard-shell.ts`; render y título en `src/App.tsx` (`CancellationReportSection`); sin permiso, la ruta muestra la vista «Sin permiso». Test `src/tests/cancellation-report-navigation.test.tsx`: `test_ca01_entry_only_with_cancellations_permission`.
- [x] **T-04** (CA-04, CA-05, CA-06): `src/views/CancellationReportView.tsx` y `src/sections/CancellationReportSection.tsx`: periodos «Semana», «Mes» y «Rango personalizado»; fecha de referencia o rango; filtros «Cajero» (lista de la API; fuente pendiente de P-016-1, ver el plan) y «Motivo» (catálogo de la API); valores por defecto «Semana» con la fecha de hoy; «Aplicar» vuelve a consultar; 422 de periodo junto al campo. Tests `src/tests/cancellation-report-filters.test.tsx`: `test_ca04`, `test_ca05`, `test_ca06`.
- [x] **T-05** (CA-07, CA-08, CA-09, CA-10): tabla de filas con folio, adultos, niños, importe, fecha y hora de venta y de cancelación en `dd/mm/aaaa HH:mm` (formateador de `dashboard-019`, zona que devuelve la API), cajero que vendió, quien canceló, motivo (etiqueta de la API o «Sin clasificar (anterior)»), comentario y minutos; totales tal como los devuelve la API (sin sumas en el cliente). Paginación o desplazamiento propio con encabezados fijos. Tests `src/tests/cancellation-report-rows.test.tsx`: `test_ca07`, `test_ca08`, `test_ca09`, `test_ca10`.
- [x] **T-06** (CA-11, CA-12, CA-13): tabla de conciliación por día y por cajero con bruto, cancelado y neto; indicador «Cuadra» o «No cuadra» según `balanced` de la API; aviso visible «No cuadra. Revisa con Informática.» para `balanced: false`. Tests `src/tests/cancellation-report-reconciliation.test.tsx`: `test_ca11`, `test_ca12`, `test_ca13`.
- [x] **T-07** (CA-14, CA-15): `src/components/CancellationAlertBadge.tsx` con `Badge` de `@arca/ui`: texto «Revisar», motivo de la API en texto accesible; porcentaje y boletos de la API para el cajero. No cambia orden ni oculta filas. Tests `src/tests/cancellation-report-alerts.test.tsx`: `test_ca14`, `test_ca15`.
- [x] **T-08** (CA-16, CA-17): botón «Exportar» con CSV, Excel y PDF; llama a `exportCancellations` con los mismos filtros; descarga con el nombre de la API (`services/save-file.ts`); botón deshabilitado mientras genera; 422 (formato o PDF con más de 2000 filas) junto al selector sin descarga; red o 5xx con error y sin reintento automático. Tests `src/tests/cancellation-report-export.test.tsx`: `test_ca16`, `test_ca17`.
- [x] **T-09** (CA-22, CA-24): diseño responsivo de 360 a 1366 px con foco visible; tablas con desplazamiento propio o diseño apilado; sin desbordamiento horizontal; tokens semánticos y sin hex de marca en componentes nuevos; modo claro. Tests `src/tests/cancellation-report-responsive.test.tsx` (`test_ca22`, patrón de `responsive.test.tsx`) y `src/tests/cancellation-report-design.test.tsx` (`test_ca24`, patrón de `design-system.test.tsx`).

## Diálogo de cancelar y historial

- [x] **T-10** (CA-18): `src/components/CancelTicketDialog.tsx` añade un `SelectField` obligatorio «Motivo» con las opciones de `useCancellationReasons()` (no etiquetas fijas en código). `src/viewmodels/ticket-history.ts` guarda `reasonCode` y las opciones. Tests `src/tests/cancel-ticket-reason.test.tsx`: `test_ca18`.
- [x] **T-11** (CA-19, CA-20): sin motivo elegido, «Cancelar boleto» no llama a la API y muestra «Elige un motivo de cancelación.» junto al selector (sustituye el texto de `dashboard-005`, según la nota de la enmienda). Con «Otro», el campo de comentario es obligatorio y se rotula «Describe el motivo»; con los demás motivos es opcional. La SPA no fija el mínimo de caracteres: envía el texto y muestra el 422 de la API junto al campo. Tests `src/tests/cancel-ticket-reason.test.tsx`: `test_ca19`, `test_ca20`.
- [x] **T-12** (CA-21): tras confirmar (y la contraseña de `dashboard-015` cuando la API la pida), 200 refresca la lista del historial y muestra el aviso accesible de cancelación; 422 de motivo, 403 y 429 se muestran en el diálogo con el mensaje de la API, sin reintento automático. Tests `src/tests/cancel-ticket-reason.test.tsx`: `test_ca21`.
- [x] **T-13** (CA-26 de esta spec; pregunta 3 de `api-022` cerrada): la columna «Motivo» de `src/views/TicketHistoryView.tsx` muestra la etiqueta que devuelve la API (`cancellation_reason_label`) y el comentario, no el texto libre. Desbloqueada por la decisión. Evidencia: test de `ticket-history.test.tsx` actualizado con `test_ca26_…`.

## Calidad, cobertura y entrega

- [x] **T-14** (CA-23): test estático `src/tests/cancellation-report-mvvm.test.tsx`: en `views/` y `components/` de la página y del diálogo no hay `fetch`, `axios`, cálculos de totales, conciliación, minutos, porcentajes ni alertas, ni decisiones de permiso; cada llamada pasa por un hook de `viewmodels/`.
- [x] **T-15** (regresión, sin relajar CA): `src/tests/ticket-history.test.tsx` y `src/tests/ticket-sales-fixtures.ts` (cancelar envía `reason_code`; respuesta con `cancellation_reason_label`), `src/tests/ticket-sales-api-client.test.tsx`, `src/tests/administration-navigation.test.tsx` (nueva entrada de menú para admin), `src/tests/responsive.test.tsx`, `src/tests/design-system.test.tsx`, `src/tests/acceptance-coverage.test.tsx`. Evidencia: suite en verde. Incluye `ticket-history.test.tsx` con CA-26.
- [x] **T-16** (CA-25): `src/tests/cancellation-report-coverage.test.tsx`: comprueba que existe al menos una prueba que nombra cada CA-01 a CA-26 de esta spec, por búsqueda de los identificadores en `src/tests/`.
- [x] **T-17**: actualizar la documentación local del dashboard si existe `apps/dashboard/docs/` con la página o el historial; si no existe, anotarlo en el PR. La enmienda de `dashboard-005` ya apunta a esta spec: no se edita `docs/` sin autorización expresa.
- [ ] **T-18**: verificaciones del dashboard: lint, comprobación de tipos y `vitest run` sobre los archivos de esta spec y la regresión. Registrar la salida real aportada por la sesión principal. Sin evidencia, no se marca.
- [ ] **T-19**: PR enlaza `apps/dashboard/specs/016-ticket-cancellation-report.md`, `apps/dashboard/plan/016-ticket-cancellation-report.md`, `apps/dashboard/tasks/016-ticket-cancellation-report.md` y `apps/api/specs/022-ticket-cancellation-report.md` (con su PR). El commit cita `dashboard-016`. Los commits los hace el equipo con el comando acordado. Estado de la spec: «En progreso» al iniciar y «Implementada» solo con enlace a PR y resultados de CA-01 a CA-25.

Cada tarea de código nombra sus CA-xx; cada CA-xx tiene al menos una tarea de prueba (T-01 a T-12, T-14 y T-16; CA-26 en T-13). Las tareas de la API y de BD están en `apps/api/tasks/022-ticket-cancellation-report.md`; esta lista no las ejecuta.

- [x] **T-20** (CA-27, CA-28): paginación de filas en Cancelaciones y `page`/`meta` en `@arca/api-client`; pruebas en `tests/shared-components-and-total-pagination.test.tsx` (tarea T-29 de `dashboard-020`).

- [x] **T-21** (CA-29, CA-30, CA-31): conciliación sin columna `balanced`, aviso de error por fila y por tabla, línea de ayuda. Tests `cancellation-report-reconciliation.test.tsx`: `test_ca29`, `test_ca30`, `test_ca31`; CA-11 y CA-12 ajustados por diseño; `cancellation-report-coverage.test.tsx` cubre CA-01 a CA-31.

## Revisión (c)

- [x] **T-22** (CA-35): tipos de `@arca/api-client` sin `alert`/`alert_reasons`, con `late_cancellation`, `signal_codes`, `days_to_review` y `folios`; se elimina `CancellationAlertBadge`; test CA-14/CA-15 ajustados. Test: `test_ca35_old_alerts_are_removed_everywhere`.
- [x] **T-23** (CA-32, CA-33): columnas «Tardía», «Señales» y «Días por revisar». Tests: `test_ca32_…`, `test_ca33_…`.
- [x] **T-24** (CA-34): aviso «Se exportará con los filtros aplicados». Test: `test_ca34_export_note_lists_applied_filters`. Cobertura CA-01 a CA-35 y evidencia: `npx vitest run` 899 en verde y `tsc --noEmit` limpio. Revisión visual pendiente.
