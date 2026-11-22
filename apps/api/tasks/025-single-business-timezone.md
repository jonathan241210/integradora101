# Tareas · 025 · single-business-timezone

- Spec: `apps/api/specs/025-single-business-timezone.md` (Aprobada, 2026-11-20)
- Plan: `apps/api/plan/025-single-business-timezone.md` (Aprobado — aprobación técnica: Jonathan, 2026-11-20)
- Dashboard (consumidor): `apps/dashboard/tasks/019-single-business-timezone.md`

Plan aprobado 2026-11-20. Ninguna tarea está marcada. Una tarea solo se marca con evidencia aportada por la sesión principal. Esta sesión no tiene shell y no afirma que tests, lint ni CI pasen.

Sin DBR: no hay tareas del responsable de BD. Ninguna tarea crea migraciones ni SQL.

## Precondiciones (antes de T-02)

- [ ] **T-01** (todos los CA): Jonathan responde P-01 a P-06 del plan y las decisiones se registran en la spec (sección «Decisiones finales») y en el plan. Resultado: preguntas cerradas o marcadas como brecha aceptada. Bloqueantes para código: ninguno de P-01, P-02, P-05 ni P-06 detiene T-02 a T-11; P-03 y P-04 bloquean solo el dashboard. *Estado 2026-11-20: resuelta por Jonathan (P-01 retirada; P-02, P-03, P-04, P-05 y P-06 aceptadas). Queda abierta solo P-03b (desfase explícito en `effective_at`, spec pregunta 5), que bloquea `dashboard-019` T-10 hasta confirmarse.*
- [x] **T-14** (CA-03, CA-11; gate de despliegue; resuelta 2026-11-20: `purchased_at` TIMESTAMP, `cancelled_at` DATETIME, ver plan): la sesión principal consulta en solo lectura `arca_pruebas` (`information_schema.COLUMNS` de `tickets.purchased_at` y `tickets.cancelled_at`) y registra el tipo y la fecha en la sección «Estado actual» de la spec. Resultado: tipo de columna confirmado. No se ejecuta SQL de escritura.

## Implementación: configuración y zona única (RN-01, RN-06, RN-09)

- [x] **T-02** (CA-01; RN-01): `apps/api/src/config/arca.php`: añadir `'timezone' => env('ARCA_TIMEZONE', 'America/Mexico_City')`; retirar `report_timezone` y `public_timezone`. Conservar `two_factor_roles` (`api-021`). Resultado: solo existe `arca.timezone`.
- [x] **T-03** (CA-01): test `test_ca01_default_value_and_single_key` en `apps/api/src/tests/Feature/Timezone/BusinessTimezoneConfigTest.php`. Carga el archivo de configuración con `ARCA_TIMEZONE` ausente (`putenv`, restaurado después), comprueba el valor por defecto, la ausencia de las llaves antiguas y que ningún archivo de `app/` contiene `arca.report_timezone` ni `arca.public_timezone`. Resultado: test en verde (salida de la sesión principal).
- [x] **T-04** (RN-09; decisión 2 de la spec; sin CA): crear `apps/api/src/app/Support/BusinessTimezone.php` con `name()`, `now()`, `today()` y `assertValid()` (vacío, no IANA o alias no aceptado → `RuntimeException` en español). Llamar `assertValid()` desde `apps/api/src/app/Providers/AppServiceProvider.php::boot()`. Test unitario `apps/api/src/tests/Unit/Timezone/BusinessTimezoneTest.php` con `Mars/Olympus`, `EST`, `+05:00`, cadena vacía (rechazados) y `America/Mexico_City`, `UTC` (aceptados). Test `test_ca14_boot_fails_with_invalid_arca_timezone` (CA-14; P-06, decisión 2 de la spec). Resultado: arranque falla con mensaje claro; test en verde.
- [x] **T-05** (RN-02, RN-04; CA-02, CA-04, CA-06): eliminar `apps/api/src/app/Actions/Admin/Reports/ResolveRequestedTimezoneAction.php` y sustituir su uso en `ResolveReportPeriodAction.php`, `BuildDashboardSummaryAction.php` por `BusinessTimezone::name()` (sin parámetro de cliente). Ajustar `PresentTicketRow.php` para que su valor por defecto sea `BusinessTimezone::name()`. Resultado: `grep` en `app/` no encuentra `ResolveRequestedTimezoneAction` ni `report_timezone`.
- [x] **T-06** (RN-02, RN-04; CA-06, CA-07): `apps/api/src/app/Actions/Admin/Tickets/ListTicketHistoryAction.php` (sin `requestedTimezone`; usa `BusinessTimezone::name()` para `from`/`to`) y `IsTicketCancellableAction.php` (`isSameDay()` con `BusinessTimezone::name()`). Resultado: la misma regla de día para historial, `cancellable` y cancelación.
- [x] **T-07** (RN-02; CA-09): `apps/api/src/app/Support/PublicCalendar.php::today()` delega en `BusinessTimezone::today()`. Resultado: noticias y eventos usan `arca.timezone`.
- [x] **T-08** (divergencia de `api-019`; CA-02): `apps/api/src/app/Actions/Admin/Search/Groups/SearchTicketHistoryGroup.php`: la fecha de compra (`candidate()`) usa `BusinessTimezone::name()` en lugar de `config('app.timezone')`. Resultado: la búsqueda global muestra la fecha en la zona de negocio.
- [x] **T-09** (CA-04, CA-06, CA-10, CA-12; RN-04, RN-05): `apps/api/src/app/Http/Controllers/Admin/DashboardController.php` y `TicketController.php` dejan de leer `timezone` y solo llaman a la Action. `TicketController::index()` añade `->additional(['timezone' => BusinessTimezone::name()])` a la colección del historial. `apps/api/src/app/Http/Requests/Admin/TicketReportRequest.php` deja de añadir `timezone` a `validated()`. Resultado: ninguna respuesta depende del parámetro del cliente.
- [x] **T-10** (RN-03; CA-03): revisión de que `ExportTicketReportAction`, `TicketReport*Writer`, `SummarizeTicketSalesAction` y los Resources solo cambian el origen de la zona (vía `ReportPeriod`), no el contrato. Sin cambio de código esperado; si hace falta, se documenta en el PR. Resultado: diff limitado a la zona.
- [x] **T-11** (CA-11; RN-06): `apps/api/src/config/database.php`, conexión `mysql`: añadir `'timezone' => env('DB_TIMEZONE', '+00:00')`. No tocar otras conexiones salvo lo que decida P-01. Resultado: `DB_TIMEZONE` solo por `.env`.
- [x] **T-12** (Constitución I; AGENTS raíz): `apps/api/src/.env.example`: añadir `ARCA_TIMEZONE=America/Mexico_City` y `DB_TIMEZONE=+00:00` con comentario en español. Sin credenciales ni valores sensibles. Resultado: nombres documentados.
- [x] **T-13** (P-01, retirada; sin CA): la conexión `mysql2` no existe en el código de la API, así que no se configura. Tarea cerrada sin cambios; la brecha se anota en el PR. No se escribe en `settings_colores` (solo lectura, AGENTS). Resultado: decisión registrada.

## Implementación: pruebas (un test por CA-xx)

Todas las pruebas usan `DatabaseTransactions` sobre `arca_pruebas`. Docblock `/** CA-NN single-business-timezone */`. Ningún test usa `RefreshDatabase` ni migraciones. No fijar `ARCA_TIMEZONE` en `phpunit.xml` (CA-01 debe probar el valor por defecto) ni `DB_TIMEZONE` (CA-11 prueba `+00:00`).

- [x] **T-15** (CA-02; RN-02): `apps/api/src/tests/Feature/Timezone/BusinessDayTest.php`: `test_ca02_changing_the_timezone_changes_the_cutoff` (boleto `completed` con `purchased_at` 2026-11-07 05:30:00 UTC cuenta el 2026-11-06 con MX y el 2026-11-07 con UTC; panel y reporte) y `test_ca02_global_search_shows_business_date` (fecha de compra del grupo de historial, T-08).
- [x] **T-16** (CA-03, CA-11; RN-03, RN-06): `apps/api/src/tests/Feature/Timezone/BusinessTimezoneConfigTest.php`: `test_ca03_instants_in_utc_and_app_timezone_utc` (`config('app.timezone') === 'UTC'`; `purchased_at` y `cancelled_at` guardados en UTC) y `test_ca11_sesion_mysql_en_utc` (`select @@session.time_zone` = `+00:00`).
- [x] **T-17** (CA-04, CA-12; RN-05): reescribir `apps/api/src/tests/Feature/Admin/ReportTimezoneTest.php` con `test_ca04_dashboard_counts_in_the_business_timezone` (`timezone=Europe/Madrid` o ausente → `data.timezone` = `America/Mexico_City`) y `test_ca12_dashboard_and_report_expose_arca_timezone` (`data.timezone`, `data.period.timezone`). Sustituir los nombres `test_ca28_*` por los de esta spec. Eliminar los casos que esperan la zona del dispositivo.
- [x] **T-18** (CA-05; RN-03): `apps/api/src/tests/Feature/Admin/TicketReportExportTest.php`: `test_ca05_report_and_export_in_business_timezone` (CSV, XLSX y PDF con `timezone=America/Tijuana`; el boleto aparece en 2026-11-06 en los tres; `period.timezone` = MX). En `ReportTimezoneTest.php`, `test_ca05_csv_purchased_at_time_in_business_timezone` (CSV con `2026-11-06 23:30:00`). Actualizar la línea de `Asia/Tokyo` del XLSX.
- [x] **T-19** (CA-06, CA-12; RN-05): `apps/api/src/tests/Feature/Tickets/TicketHistoryTest.php`: `test_ca06_history_filters_by_business_day` (`from=to=2026-11-06` incluye el boleto; `2026-11-07` no; con `timezone` de cliente distinto) y `test_ca12_history_exposes_timezone` (`timezone` = `America/Mexico_City` en el nivel superior). Reemplazar el caso `timezone=UTC` de la línea 31 por el criterio de negocio.
- [x] **T-20** (CA-07; RN-16 de `api-009`): `apps/api/src/tests/Feature/Tickets/CancelTicketSameDayTest.php`: `test_ca07_same_day_cancellation_in_business_timezone` (venta 05:30 UTC, intento 06:10 UTC: no cancelable; con `timezone=UTC` el mismo resultado). `apps/api/src/tests/Feature/Tickets/TicketCancellableZoneTest.php`: `test_ca07_cancellable_with_business_timezone` (sin el parámetro del cliente).
- [x] **T-21** (CA-09; RN-02): `apps/api/src/tests/Feature/Catalog/PublicNewsTest.php`: `test_ca09_public_validity_uses_arca_timezone` (noticia con `end_date` 2026-11-06 visible con `ARCA_TIMEZONE=America/Mexico_City` y no visible con `UTC` a las 05:30 UTC del 7; cambiar la zona con `config(['arca.timezone' => ...])`). `apps/api/src/tests/Feature/Catalog/PublicEventsLimitTest.php`: `test_ca09_current_events_use_arca_timezone` (mismo criterio). Mantener la aserción `config('app.timezone') === 'UTC'`.
- [x] **T-22** (CA-10; RN-04): `apps/api/src/tests/Feature/Timezone/ClientTimezoneIgnoredTest.php`: `test_ca10_the_client_timezone_parameter_is_ignored` (datos: `Asia/Tokyo`, `Mars/Olympus`, `EST`, `+05:00`; panel, reporte, exportación, historial, cancelación, noticias y eventos; respuesta idéntica a la misma petición sin el parámetro, sin `422`, con `arca.timezone` informada). `apps/api/src/tests/Feature/Tickets/TicketDatesTest.php`: `test_ca10_invalid_timezone_is_not_an_error` (reemplaza el nombre `test_ca29_*` de la línea 7 en lo que toca a la zona; el CA-29 de `api-009` sigue en UTC).
- [x] **T-23** (CA-08): cerrada con `api-022` T-28. Test `apps/api/src/tests/Feature/Admin/CancellationReportParityTest.php::test_ca08_api025_cancellation_counts_on_the_business_day` (docblock `CA-08 single-business-timezone`). Implementado 2026-11-20; resultado de la corrida en el reporte de implementación de api-022.
- [x] **T-24** (CA-15; P-02, aprobado 2026-11-20): `WeeklyMemoryLimitException` formatea con `BusinessTimezone::name()`; `apps/api/src/tests/Feature/Memories/VisitorMemoryLimitsTest.php` deja de fijar `config(['app.timezone' => 'America/Mexico_City'])` y espera `arca.timezone`, con el test `test_ca15_weekly_limit_uses_arca_timezone`; `apps/api/docs/momentos-contrato-para-mobile.md` (línea 152, `APP_TIMEZONE`) se corrige para que refiera `ARCA_TIMEZONE`.
- [x] **T-35** (CA-16; RN-12; P-03, aprobado 2026-11-20): la Action que programa precios interpreta `effective_at` sin desfase en `BusinessTimezone::name()`; `SaveTicketPricesRequest` acepta la hora sin desfase (la aceptación del desfase explícito queda según la pregunta P-03b de la spec). Test `apps/api/src/tests/Feature/Timezone/ScheduledPriceTimezoneTest.php::test_ca16_effective_at_without_offset_is_read_in_arca_timezone` con `ARCA_TIMEZONE` en MX (06:00 UTC) y en UTC (00:00 UTC). Nota de revisión en `apps/api/specs/009-ticket-sales.md` y `apps/dashboard/specs/005-ticket-sales.md` (ya redactada en la enmienda técnica).
- [x] **T-36** (CA-12; RN-13; P-04, aprobado 2026-11-20): el recibo de venta (`POST /api/v1/admin/tickets`) y las respuestas de precios vigentes incluyen `timezone` con `arca.timezone`, sin cambiar el resto de la forma de respuesta. Test `apps/api/src/tests/Feature/Timezone/ReceiptAndPricesTimezoneTest.php::test_ca12_receipt_and_prices_expose_timezone`.

## Documentación y despliegue

- [x] **T-25** (AGENTS raíz; checklist de despliegue): `infra/README.md`: añadir en el checklist de la API (sección de despliegue) los puntos: `ARCA_TIMEZONE` (por defecto y de producción `America/Mexico_City`, valor a confirmar por operaciones), `DB_TIMEZONE` (`+00:00`), y ejecutar `php artisan config:clear` o `config:cache` tras cambiar `.env`. Evidencia: sección nueva en el PR. Un cambio de requisito de ambiente se anota en el mismo PR (AGENTS raíz).
- [ ] **T-26** (verificación de operaciones; decisión 4; sin agente): el responsable de operaciones verifica en `arca_zoo` la zona de sesión (`@@session.time_zone`, `@@system_time_zone`) y que `tickets.purchased_at` y `cancelled_at` guardados están en UTC, antes de desplegar. Los agentes no consultan `arca_zoo`. Resultado: evidencia registrada en la spec, «Estado actual».
- [x] **T-27** (documentación local): actualizar `apps/api/docs/administracion.md` (líneas 13, 192-201, 213, 226, 238, 246, 263, 268, 283-295 y 311-315: zona de negocio, sin `timezone` del cliente, respuestas con `timezone`), `apps/api/docs/tickets.md` (líneas 13, 106-108, 120, 124, 137, 165), `apps/api/docs/contenido-publico.md` (línea 26) y revisar `apps/api/docs/arquitectura.md` (línea 65). Resultado: ninguna referencia a la zona del dispositivo ni a `report_timezone`/`public_timezone` en `apps/api/docs`.
- [x] **T-28** (documentación): `infra/README.md` ya cubierto por T-25. Este punto se cierra cuando la revisión del PR confirma que el checklist de la API lo contiene.
- [ ] **T-29** (notas de revisión en specs afectadas; sin cambiar requisitos): añadir nota de revisión que apunte a `api-025` en: `apps/api/specs/006-public-catalog-read.md` (RN-12 ya cambiada por `api-011`), `007-administration-management.md` (RN-14 y CA-28 sustituidas), `009-ticket-sales.md` (RN-16 y CA-31 sustituidas; CA-29 sigue en UTC), `011-public-news-read.md` (RN-14 con la llave única), `017-visitor-push-notifications.md` (revisar si usa zona u horas; si no las usa, nota «sin cambio»), `019-enclosure-status-and-global-search.md` (fecha de compra del grupo de historial). Los cambios de dashboard (`dashboard-003`, `dashboard-005`) están en el tasks de dashboard.

## Calidad y entrega

- [ ] **T-30** (CA-01 a CA-16, sin CA-08): verificaciones de la API en `arca_pruebas` (nunca `arca_zoo`): Pint sobre los archivos tocados y `php artisan test` filtrado a `Timezone`, `ReportTimezoneTest`, `TicketReportExportTest`, `TicketHistoryTest`, `CancelTicketSameDayTest`, `TicketCancellableZoneTest`, `TicketDatesTest`, `PublicNewsTest`, `PublicEventsLimitTest`, `VisitorMemoryLimitsTest` y la regresión de `api-007`, `api-009`, `api-011` y `api-019`. Resultado: salida real aportada por la sesión principal. Sin evidencia no se marca.
- [ ] **T-31** (RN-09, RN-04): búsqueda de remanentes: `report_timezone`, `public_timezone`, `ResolveRequestedTimezoneAction`, `resolvedOptions`, `config('app.timezone')` en `app/` y `Requests/`. Resultado: solo queda `config('app.timezone')` en `WeeklyMemoryLimitException` si P-02 se rechaza, y en el texto explicativo de `config/app.php`.
- [ ] **T-32** (CA-13): cobertura por búsqueda de `test_ca01_` a `test_ca16_` en `apps/api/src/tests/`, con el resultado por CA. CA-08 queda abierto hasta `api-022` T-28. Resultado: tabla CA → test en el PR.
- [ ] **T-33** (decisión 4 de la spec; sin agente): la sesión principal registra la evidencia de T-26 cuando operaciones la aporte. Sin ella no se despliega.
- [ ] **T-34** (entrega): PR que enlaza `apps/api/specs/025-single-business-timezone.md`, `apps/api/plan/025-single-business-timezone.md`, `apps/api/tasks/025-single-business-timezone.md` y `apps/dashboard/tasks/019-single-business-timezone.md` (consumidor). El commit cita `api-025`. Los commits los hace Jonathan con el comando que indique. Estado de la spec: «En progreso» al iniciar, «Implementada» solo con enlace a PR y resultados de CA-01 a CA-16 (CA-08 diferido con referencia a `api-022` T-28).

Nota: T-35 y T-36 son tareas nuevas de la enmienda técnica de 2026-11-20; T-24 pasa de condicional a obligatoria.

## Impacto sin tareas de código

- `apps/web` (fechas de noticias y eventos del portal, `web-009`), `apps/mobile` (horas de corte de eventos, `mobile-003`) y `apps/pwa` (no revisada): listados como impacto. Confirmar si muestran horas o días; si lo hacen, requieren su propia spec o revisión. No se modifica código de esas apps en este cambio.

## Trazabilidad CA → tarea

| CA | Tareas de test | Estado de cobertura en tareas |
|---|---|---|
| CA-01 | T-03 | Cubierto |
| CA-02 | T-15 | Cubierto |
| CA-03 | T-16 | Cubierto |
| CA-04 | T-17 | Cubierto |
| CA-05 | T-18 | Cubierto |
| CA-06 | T-19 | Cubierto |
| CA-07 | T-20 | Cubierto |
| CA-08 | T-23 | Cubierto por `api-022` T-28 (P-05) |
| CA-09 | T-21 | Cubierto |
| CA-10 | T-22 | Cubierto (reporte de cancelaciones incluido en `api-022`, P-05) |
| CA-11 | T-16 | Cubierto |
| CA-12 | T-17, T-19, T-36 | Cubierto |
| CA-13 | T-32 | Verificación de cobertura |
| CA-14 | T-04 | Cubierto (P-06) |
| CA-15 | T-24 | Cubierto (P-02) |
| CA-16 | T-35 | Cubierto (P-03) |

## Revisión de calidad 2026-11-21

- [x] **T-37** (CA-13): test de cobertura `Timezone/TimezoneCoverageTest` (CA-01 a CA-16 citan `single-business-timezone`). Los métodos `test_*` de esta spec se renombran a inglés (Constitución VI); los docblocks `CA-NN single-business-timezone` no cambian.
