# Tareas · 021 · cancellation-review-signals

- Solicitada: 2026-11-21
- Aprobada: 2026-11-21
- Spec: `apps/dashboard/specs/021-cancellation-review-signals.md`
- Plan: `apps/dashboard/plan/021-cancellation-review-signals.md`
- Dependencias de API: `apps/api/tasks/027-cancellation-review-signals.md` (T-13, T-16, T-17, T-19)

Estado: T-01 a T-12 implementadas con Vitest en verde (`npx vitest run`, 876 pruebas) y `tsc --noEmit` limpio. T-09 queda con la revisión visual de 360 a 1366 px pendiente y T-13 abierta (sin lint, sin `/verify` completo ni contrato real de `api-027`). No hay tareas de base de datos en esta app.

## Cliente compartido

- [x] **T-01** (CA-13, CA-16): tipos y métodos en `packages/api-client` para el reporte con `cashier_days` y `legend`, el `POST` y el `GET` de revisiones, y `cancellation_days` en `PendingReviewCountsDto`. Sin lógica. Test: `test_ca13_views_do_not_call_fetch_and_hooks_use_api_client` (mock de `@arca/api-client`).
- [x] **T-02** (CA-07, CA-08): hook `useCancellationReview` (alta, historial y refresco del reporte tras alta) como ViewModel. Tests: `test_ca07_success_closes_dialog_and_refreshes_from_api`, `test_ca08_review_errors_show_api_messages_without_retry`.

## Semáforo y leyenda

- [x] **T-03** (CA-01, CA-02, CA-04): `CancellationTrafficLightTable` con nivel en texto, `reason_sentence`, `action` y revisión vigente o «Sin revisar». Tests: `test_ca01_traffic_light_table_shows_level_as_text`, `test_ca02_reason_and_action_are_shown_as_received`, `test_ca04_current_review_or_sin_revisar`.
- [x] **T-04** (CA-03): `CancellationLegend` con `legend[]` y `disclaimer` visible. Test: `test_ca03_legend_renders_api_items_and_disclaimer`.

## Registro de revisión

- [x] **T-05** (CA-05, CA-06): `CancellationReviewDialog` con las dos opciones, la nota, el contador y la validación local de longitud (RN-04). Tests: `test_ca05_review_button_only_with_reports_cancellations_view`, `test_ca06_review_dialog_options_and_local_length_check`.
- [x] **T-06** (CA-09): `CancellationReviewHistory` desplegable con historial de la API. Test: `test_ca09_history_is_loaded_from_api_newest_first`.

## Aviso y puntito

- [x] **T-07** (CA-10, CA-12): clave `cancellation_days` en `viewmodels/pending-review.ts` con permiso `reports.cancellations.view`, textos singular y plural, y cola FIFO de `dashboard-018`. Tests: `test_ca10_admin_sees_cancellation_notice_once_per_start`, `test_ca12_no_permission_no_cancellation_notice`.
- [x] **T-08** (CA-11): puntito en «Reportes» y en la pestaña «Cancelaciones», con nombre accesible. Test: `test_ca11_dot_on_reports_and_tab_with_accessible_name`.

## Calidad, accesibilidad y entrega

- [x] **T-09** (CA-14; revisión visual de 360 a 1366 px pendiente): foco, Escape y devolución de foco en el diálogo; `caption` en las tablas; revisión de desbordamiento de 360 a 1366 px. Test: `test_ca14_dialog_focus_and_escape_and_no_horizontal_overflow`, más revisión visual registrada.
- [x] **T-10** (CA-15): componentes nuevos sin hex de marca. Test: `test_ca15_new_components_use_semantic_tokens`.
- [x] **T-11** (CA-16): test que comprueba que cada CA-01 a CA-17 tiene un test nombrado. Test: `test_ca16_every_ca_has_a_named_test`.
- [x] **T-12** (CA-17): sin texto de procedimiento propio en las views nuevas. Test: `test_ca17_no_physical_ticket_text_in_new_views`.
- [ ] **T-13**: ejecutar `/verify` para `dashboard` (Vitest, lint, tipos) y `packages/api-client`; actualizar la referencia local de la pestaña si existe; enlazar spec, plan y tasks en el PR. Sin evidencia no se marca.

Cada CA-01 a CA-17 tiene al menos una tarea de implementación y un test. Las tareas dependen de `api-027` para los contratos reales; mientras no estén, los tests usan mocks de `@arca/api-client` con la forma aprobada.

## Revisión: semáforo en tabla

- [x] **T-14** (CA-18, CA-22): columnas en orden, celda de señales, botón con `aria-label`, grupo sin cajero con «No aplica» y estilos en rem. Tests: `test_ca18_traffic_light_table_columns_in_order`, `test_ca22_no_cashier_group_says_no_aplica_and_styles_use_rem`.
- [x] **T-15** (CA-19, CA-21): `arrangeTrafficLightRows` (orden por nivel y fecha descendente, filtro). Tests: `test_ca19_order_by_level_then_date_descending_without_cashier_last`, `test_ca21_only_days_to_review_filter_hides_normal`.
- [x] **T-16** (CA-20): fila de detalle «Ver detalle» con `action` e historial. Test: `test_ca20_detail_row_shows_action_and_history_only_when_expanded`.
- [x] **T-17** (CA-16): cobertura de nombres ampliada a CA-01 a CA-22 y tests existentes ajustados al detalle expandible (sin relajar sus comprobaciones). Evidencia: `npx vitest run` 881 pruebas en verde y `tsc --noEmit` limpio. Revisión visual pendiente.

## Revisión: legibilidad y leyenda

- [x] **T-18** (CA-23 a CA-26): leyenda plegable en tabla con niveles y nota. Tests: `test_ca23_…`, `test_ca24_…`, `test_ca25_…`, `test_ca26_…`.
- [x] **T-19** (CA-27, CA-28): tabla legible y detalle con títulos e historial en tabla. Tests: `test_ca27_…`, `test_ca28_…`; `test_ca16_every_ca_has_a_named_test` cubre CA-01 a CA-28. Evidencia: `npx vitest run` 889 pruebas en verde y `tsc --noEmit` limpio. Revisión visual pendiente.

## Revisión (c)

- [x] **T-20** (CA-29, CA-30): `ticketFocus` y acciones `viewTickets`/`clearTicketFocus` en el ViewModel; banner con «Quitar filtro». Tests: `test_ca29_…`, `test_ca30_…`.
- [x] **T-21** (CA-31): desplazamiento, foco al encabezado de la tabla y resaltado con icono, texto y borde. Test: `test_ca31_…`.
- [x] **T-22** (CA-32, CA-33): señales con conteo y chips de folio en el detalle; chip lleva a su fila o aplica el filtro. Tests: `test_ca32_…`, `test_ca33_…`.
- [x] **T-23** (CA-34): rem y tokens; cobertura CA-01 a CA-34. Evidencia: `npx vitest run` 899 en verde y `tsc --noEmit` limpio. Revisión visual pendiente.
