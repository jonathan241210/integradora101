# Tareas · 027 · cancellation-review-signals

- Solicitada: 2026-11-21
- Aprobada: 2026-11-21
- Spec: `apps/api/specs/027-cancellation-review-signals.md`
- Plan: `apps/api/plan/027-cancellation-review-signals.md`
- DBR: `docs/database/requests/DBR-026-cancellation-reviews.md`

Estado: T-02 a T-23 implementadas por backend y probadas con `php artisan test --filter=…` contra `arca_pruebas`. T-24 (medición de coste con datos reales), T-25 (docs hechas; falta enlazar en el PR) y T-26 (`/verify` completo) quedan abiertas para la sesión principal.

## Base de datos (responsable de BD)

- [ ] **T-01** (parcial: aplicada en `arca_pruebas`; falta `down()` en MySQL aislado — fuera de alcance de esta entrega) (CA-17, CA-18, CA-20, CA-21): DBR-026 aprobada, migración Laravel idempotente con `down()` seguro, prueba en MySQL 8.0 aislado, `db:table cancellation_reviews` y `migrate:status` como evidencia; estado `Lista para backend`. Ninguna tarea de backend empieza antes.

## Configuración y dominio

- [x] **T-02** (CA-16): bloque `cancellation_review` en `config/arca.php` con los valores de RN-04 y referencias a `cancellation_alerts` para S1 y S5. Test: `test_ca16_thresholds_follow_config_value`.
- [x] **T-03** (CA-11, CA-14): enums `CancellationSignal`, `CancellationReviewLevel` y `CancellationReviewStatus` con etiquetas en español. Test unitario: `Unit/CancellationReviewLevelTest.php`, `Unit/CancellationReviewStatusTest.php`.
- [x] **T-04** (CA-04): Action de señales S1 `over_limit_percent` con los casos de frontera (10,00 % exacto no dispara; 9 boletos no dispara). Test: `test_ca04_over_limit_percent_needs_more_than_10_and_10_sold`.
- [x] **T-05** (CA-05): señal S2 `late_cancellations` con ventana `[L − 30 min, L]` inclusiva y los dos casos de frontera. Test: `test_ca05_late_cancellations_window_is_inclusive_30_min_before_last_sale`.
- [x] **T-06** (CA-06): señal S3 `repeated_other`. Test: `test_ca06_two_other_reason_cancellations_fire_signal`.
- [x] **T-07** (CA-07): señal S4 `same_amount` comparando en centavos. Test: `test_ca07_two_cancellations_with_same_amount_fire_signal`.
- [x] **T-08** (CA-08): señal S5 `long_cancellations` (más de 1800 s). Test: `test_ca08_two_cancellations_over_30_minutes_fire_signal`.
- [x] **T-09** (CA-09): comparación C1 `own_baseline` con ventana de 28 días, mínimo de 3 días activos y suelos de 5 % y 2 cancelados. Tests: `test_ca09_own_baseline_fires_only_with_history_and_floors`.
- [x] **T-10** (CA-10): comparación C2 `peer_comparison` con ventana de 7 días, mediana de compañeros y mínimo de 2 compañeros. Test: `test_ca10_peer_median_fires_only_with_two_peers_and_floors`.
- [x] **T-11** (CA-11, CA-12): combinación de señales en `BuildCancellationTrafficLightAction` y aislamiento de filtros (cálculo sobre todo el conjunto). Tests: `test_ca11_zero_signals_normal`, `test_ca11_one_signal_review`, `test_ca11_two_signals_attention`, `test_ca12_filters_do_not_change_traffic_light`.
- [x] **T-12** (CA-13, CA-14, CA-15): `PresentCancellationReasonsAction` con `reasons[]`, `reason_sentence`, `action` y el grupo «Sin cajero registrado» (`level: null`). Tests: `test_ca13_reason_sentence_lists_signals_and_counts`, `test_ca14_action_texts_per_level_and_no_physical_ticket_request`, `test_ca15_lists_every_active_cashier_day_including_normal`.

## Reporte, leyenda y paginación

- [x] **T-13** (CA-01, CA-26, CA-27): bloque `reconciliation.cashier_days[]`, `legend[]` y `disclaimer` en `BuildCancellationReportAction` y `CancellationReportResource`; `cashier_days` sin paginar. Tests: `test_ca01_admin_gets_cashier_day_traffic_light_and_legend`, `test_ca26_legend_lists_each_signal_with_limit_and_disclaimer`, `test_ca27_cashier_days_identical_across_pages`.
- [x] **T-14** (CA-33): regresión de datos demo como datos normales en reportes (ningún filtro los excluye). Test: `test_ca33_demo_cashiers_appear_in_reports_as_normal_data` (se completa con T-22).
- [x] **T-15** (CA-03): lectura sin escrituras; snapshot de `tickets` y `cancellation_reviews`, y conteo de Activitylog antes y después. Test: `test_ca03_read_routes_write_nothing`.

## Revisión (registro e historial)

- [x] **T-16** (CA-17, CA-18, CA-19, CA-22): `CancellationReview` (SoftDeletes, sin ruta de borrado), `StoreCancellationReviewRequest` en español, `RecordCancellationReviewAction`, controlador delgado y ruta `reports.cancellations.reviews.store` con `throttle:20,1`. Tests: `test_ca17_admin_records_review_row`, `test_ca18_invalid_review_returns_422_and_no_row`, `test_ca19_same_status_repeated_creates_new_history_entry`, `test_ca22_review_post_throttled_20_per_minute`.
- [x] **T-17** (CA-20, CA-21, CA-28): `ListCancellationReviewsAction` y ruta `reports.cancellations.reviews.index`; revisión vigente en el semáforo; auditoría `cashier-day-reviewed` dentro de la transacción. Tests: `test_ca20_history_newest_first_and_no_row_changed`, `test_ca28_traffic_light_shows_current_review_or_null`, `test_ca21_review_is_audited_and_rolled_back_if_audit_fails`.
- [x] **T-18** (CA-02): permisos de todas las rutas nuevas (403 sin permiso, 401 sin sesión, 403 sin 2FA). Test: `test_ca02_roles_without_permission_get_403_on_all_review_routes`.

## Pendientes (`api-024`)

- [x] **T-19** (CA-23, CA-24): `CountPendingCancellationDaysAction` y clave `cancellation_days` en `GetPendingReviewCountsAction`; ajuste de la forma de `pending-counts` según su permiso. Tests: `test_ca23_cancellation_days_counts_attention_without_review`, `test_ca24_pending_counts_keys_follow_each_permission`. Regresión de `api-024` en `PendingReviewCountsTest.php`.

## Exportación

- [x] **T-20** (CA-25): CSV, Excel y PDF con las columnas de semáforo y la leyenda, mismas filas que la pantalla; tope de PDF intacto. Test: `test_ca25_three_formats_include_traffic_light_and_legend`.

## Demostración (`arca_pruebas` únicamente)

- [x] **T-21** (CA-29): comando `arca:demo:cancellation-reviews` con guardas (`DB_DATABASE` distinto de `arca_pruebas` o `APP_ENV = production` aborta sin escribir). Test: `test_ca29_demo_command_refuses_other_database_or_production`.
- [x] **T-22** (CA-30, CA-31, CA-32): cajeros `demo-cancel-*@arca.local`, boletos y cancelaciones con días Normal, Revisar y Atención; idempotencia por correo y por `qr_code` con prefijo `DEMO-CANCEL-`; `--days=N` agrega días sin tocar filas. Tests: `test_ca30_demo_command_is_idempotent`, `test_ca31_demo_data_covers_all_three_levels`, `test_ca32_demo_extends_days_without_changing_existing_rows`. Las cancelaciones de demostración se registran en Activitylog con `demo = true`.
- [x] **T-23**: el comando no tiene opción de borrado físico. Si hiciera falta retirar datos demo, se haría con borrado lógico en una tarea aparte aprobada. Verificación: revisión de código y test de que no hay sentencias `DELETE` en el comando.

## Calidad y entrega

- [ ] **T-24** — Fuera de alcance de esta entrega (medición con shell): medir el coste del semáforo con datos reales de `arca_pruebas` (tiempo de respuesta del reporte y de `pending-counts`) y registrar el resultado en la spec. Sin evidencia no se marca.
- [ ] **T-25** — Fuera de alcance de esta entrega (documentación pendiente): actualizar `apps/api/docs/administracion.md` y `apps/api/docs/tickets.md` con el contrato, la leyenda, los permisos y la demostración; enlazar spec, plan y tasks en el PR.
- [ ] **T-26** — Fuera de alcance de esta entrega (verificación con shell): ejecutar `/verify` para `api` (Pint, PHPUnit contra `arca_pruebas`, `migrate:status`) y registrar resultados; verificar que cada CA de la tabla de `plan/027` tiene su test (búsqueda de `test_caNN_`). Sin evidencia no se marca.

Cada CA-01 a CA-33 tiene al menos una tarea de implementación y al menos un test. Las tareas de BD (T-01) van separadas de las de backend, que inician solo con `Lista para backend`.


## Evidencia de BD

- T-01: migración `2026_11_21_000026_cancellation_reviews.php` aplicada en `arca_pruebas` (lote 16), idempotente; detalle en DBR-026 «Evidencia de aplicación». `down()` en MySQL aislado queda pendiente (rollback prohibido en `arca_pruebas`).

## Revisión (c): folios y frase clara

- [x] **T-27** (CA-34): `folios[]` por señal en `BuildCancellationTrafficLightAction` y `PresentCancellationReasonsAction`.
- [x] **T-28** (CA-35, CA-36): `reason_sentence` y etiquetas claras (`CancellationSignal::label()`, leyenda); ajustar tests de CA-13 y CA-11.
- [x] **T-29** (CA-37): exportación con «Folios» y filtrada por cajero.

## Revisión de calidad y seguridad

- [x] **T-30** (CA-11): `data.levels[]` con `condition` calculada de `attention_min_signals` (`PresentCancellationReasonsAction::levels()`). Test: `CancellationLevelTest::test_ca11_levels_describe_each_level_from_the_configured_threshold`.
- [x] **T-31** (CA-29 a CA-32): la lógica de `arca:demo:cancellation-reviews` pasa a `SeedCancellationReviewDemoAction`; `test_ca31_*` ya no depende de datos reales (reloj +5 años y ventana de 28+7 días vaciada).
