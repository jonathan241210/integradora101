# Tareas · 025 · single-business-timezone

- Spec: `apps/api/specs/025-single-business-timezone.md` (Aprobada, 2026-11-20)
- Plan: `apps/api/plan/025-single-business-timezone.md` (Borrador — pendiente de aprobación técnica)
- Dashboard (consumidor): `apps/dashboard/tasks/019-single-business-timezone.md`

**Pendiente: se ejecuta solo cuando el plan esté aprobado.** Ninguna tarea está marcada. Una tarea solo se marca con evidencia aportada por la sesión principal. Esta sesión no tiene shell y no afirma que tests, lint ni CI pasen.

Sin DBR: no hay tareas del responsable de BD. Ninguna tarea crea migraciones ni SQL.

## Precondiciones (antes de T-02)

- [ ] **T-01** (todos los CA): Jonathan responde P-01 a P-06 del plan y las decisiones se registran en la spec (sección «Decisiones finales») y en el plan. Resultado: preguntas cerradas o marcadas como brecha aceptada. Bloqueantes para código: ninguno de P-01, P-02, P-05 ni P-06 detiene T-02 a T-11; P-03 y P-04 bloquean solo el dashboard.
- [x] **T-14** (CA-03, CA-11; gate de despliegue; resuelta 2026-11-20: `purchased_at` TIMESTAMP, `cancelled_at` DATETIME, ver plan): la sesión principal consulta en solo lectura `arca_pruebas` (`information_schema.COLUMNS` de `tickets.purchased_at` y `tickets.cancelled_at`) y registra el tipo y la fecha en la sección «Estado actual» de la spec. Resultado: tipo de columna confirmado. No se ejecuta SQL de escritura.

## Implementación: configuración y zona única (RN-01, RN-06, RN-09)

- [ ] **T-02** (CA-01; RN-01): `apps/api/src/config/arca.php`: añadir `'timezone' => env('ARCA_TIMEZONE', 'America/Mexico_City')`; retirar `report_timezone` y `public_timezone`. Conservar `two_factor_roles` (`api-021`). Resultado: solo existe `arca.timezone`.
- [ ] **T-03** (CA-01): test `test_ca01_valor_por_defecto_y_llave_unica` en `apps/api/src/tests/Feature/Timezone/BusinessTimezoneConfigTest.php`. Carga el archivo de configuración con `ARCA_TIMEZONE` ausente (`putenv`, restaurado después), comprueba el valor por defecto, la ausencia de las llaves antiguas y que ningún archivo de `app/` contiene `arca.report_timezone` ni `arca.public_timezone`. Resultado: test en verde (salida de la sesión principal).
- [ ] **T-04** (RN-09; decisión 2 de la spec; sin CA): crear `apps/api/src/app/Support/BusinessTimezone.php` con `name()`, `now()`, `today()` y `assertValid()` (vacío, no IANA o alias no aceptado → `RuntimeException` en español). Llamar `assertValid()` desde `apps/api/src/app/Providers/AppServiceProvider.php::boot()`. Test unitario `apps/api/src/tests/Unit/Timezone/BusinessTimezoneTest.php` con `Mars/Olympus`, `EST`, `+05:00`, cadena vacía (rechazados) y `America/Mexico_City`, `UTC` (aceptados). Resultado: arranque falla con mensaje claro; test en verde.
- [ ] **T-05** (RN-02, RN-04; CA-02, CA-04, CA-06): eliminar `apps/api/src/app/Actions/Admin/Reports/ResolveRequestedTimezoneAction.php` y sustituir su uso en `ResolveReportPeriodAction.php`, `BuildDashboardSummaryAction.php` por `BusinessTimezone::name()` (sin parámetro de cliente). Ajustar `PresentTicketRow.php` para que su valor por defecto sea `BusinessTimezone::name()`. Resultado: `grep` en `app/` no encuentra `ResolveRequestedTimezoneAction` ni `report_timezone`.
- [ ] **T-06** (RN-02, RN-04; CA-06, CA-07): `apps/api/src/app/Actions/Admin/Tickets/ListTicketHistoryAction.php` (sin `requestedTimezone`; usa `BusinessTimezone::name()` para `from`/`to`) y `IsTicketCancellableAction.php` (`isSameDay()` con `BusinessTimezone::name()`). Resultado: la misma regla de día para historial, `cancellable` y cancelación.
- [ ] **T-07** (RN-02; CA-09): `apps/api/src/app/Support/PublicCalendar.php::today()` delega en `BusinessTimezone::today()`. Resultado: noticias y eventos usan `arca.timezone`.
- [ ] **T-08** (divergencia de `api-019`; CA-02): `apps/api/src/app/Actions/Admin/Search/Groups/SearchTicketHistoryGroup.php`: la fecha de compra (`candidate()`) usa `BusinessTimezone::name()` en lugar de `config('app.timezone')`. Resultado: la búsqueda global muestra la fecha en la zona de negocio.
- [ ] **T-09** (CA-04, CA-06, CA-10, CA-12; RN-04, RN-05): `apps/api/src/app/Http/Controllers/Admin/DashboardController.php` y `TicketController.php` dejan de leer `timezone` y solo llaman a la Action. `TicketController::index()` añade `->additional(['timezone' => BusinessTimezone::name()])` a la colección del historial. `apps/api/src/app/Http/Requests/Admin/TicketReportRequest.php` deja de añadir `timezone` a `validated()`. Resultado: ninguna respuesta depende del parámetro del cliente.
- [ ] **T-10** (RN-03; CA-03): revisión de que `ExportTicketReportAction`, `TicketReport*Writer`, `SummarizeTicketSalesAction` y los Resources solo cambian el origen de la zona (vía `ReportPeriod`), no el contrato. Sin cambio de código esperado; si hace falta, se documenta en el PR. Resultado: diff limitado a la zona.
- [ ] **T-11** (CA-11; RN-06): `apps/api/src/config/database.php`, conexión `mysql`: añadir `'timezone' => env('DB_TIMEZONE', '+00:00')`. No tocar otras conexiones salvo lo que decida P-01. Resultado: `DB_TIMEZONE` solo por `.env`.
- [ ] **T-12** (Constitución I; AGENTS raíz): `apps/api/src/.env.example`: añadir `ARCA_TIMEZONE=America/Mexico_City` y `DB_TIMEZONE=+00:00` con comentario en español. Sin credenciales ni valores sensibles. Resultado: nombres documentados.
- [ ] **T-13** (condicional; CA-11; B-01): solo si P-01 se resuelve «la conexión `mysql2` existe y se configura en la API»: fijar `timezone` UTC en esa conexión sin escribir en `settings_colores` (solo lectura, AGENTS). Si P-01 se resuelve «fuera de este repositorio», esta tarea se cierra sin cambios y se anota la brecha en el PR. Resultado: decisión registrada.

## Implementación: pruebas (un test por CA-xx)

Todas las pruebas usan `DatabaseTransactions` sobre `arca_pruebas`. Docblock `/** CA-NN single-business-timezone */`. Ningún test usa `RefreshDatabase` ni migraciones. No fijar `ARCA_TIMEZONE` en `phpunit.xml` (CA-01 debe probar el valor por defecto) ni `DB_TIMEZONE` (CA-11 prueba `+00:00`).

- [ ] **T-15** (CA-02; RN-02): `apps/api/src/tests/Feature/Timezone/BusinessDayTest.php`: `test_ca02_cambiar_la_zona_cambia_el_corte` (boleto `completed` con `purchased_at` 2026-11-07 05:30:00 UTC cuenta el 2026-11-06 con MX y el 2026-11-07 con UTC; panel y reporte) y `test_ca02_busqueda_global_muestra_fecha_de_negocio` (fecha de compra del grupo de historial, T-08).
- [ ] **T-16** (CA-03, CA-11; RN-03, RN-06): `apps/api/src/tests/Feature/Timezone/BusinessTimezoneConfigTest.php`: `test_ca03_instantes_en_utc_y_app_timezone_utc` (`config('app.timezone') === 'UTC'`; `purchased_at` y `cancelled_at` guardados en UTC) y `test_ca11_sesion_mysql_en_utc` (`select @@session.time_zone` = `+00:00`).
- [ ] **T-17** (CA-04, CA-12; RN-05): reescribir `apps/api/src/tests/Feature/Admin/ReportTimezoneTest.php` con `test_ca04_panel_cuenta_en_la_zona_de_negocio` (`timezone=Europe/Madrid` o ausente → `data.timezone` = `America/Mexico_City`) y `test_ca12_panel_y_reporte_informan_arca_timezone` (`data.timezone`, `data.period.timezone`). Sustituir los nombres `test_ca28_*` por los de esta spec. Eliminar los casos que esperan la zona del dispositivo.
- [ ] **T-18** (CA-05; RN-03): `apps/api/src/tests/Feature/Admin/TicketReportExportTest.php`: `test_ca05_reporte_y_exportacion_en_zona_de_negocio` (CSV, XLSX y PDF con `timezone=America/Tijuana`; el boleto aparece en 2026-11-06 en los tres; `period.timezone` = MX). En `ReportTimezoneTest.php`, `test_ca05_csv_hora_de_purchased_at_en_zona_de_negocio` (CSV con `2026-11-06 23:30:00`). Actualizar la línea de `Asia/Tokyo` del XLSX.
- [ ] **T-19** (CA-06, CA-12; RN-05): `apps/api/src/tests/Feature/Tickets/TicketHistoryTest.php`: `test_ca06_historial_filtra_por_dia_de_negocio` (`from=to=2026-11-06` incluye el boleto; `2026-11-07` no; con `timezone` de cliente distinto) y `test_ca12_historial_informa_timezone` (`timezone` = `America/Mexico_City` en el nivel superior). Reemplazar el caso `timezone=UTC` de la línea 31 por el criterio de negocio.
- [ ] **T-20** (CA-07; RN-16 de `api-009`): `apps/api/src/tests/Feature/Tickets/CancelTicketSameDayTest.php`: `test_ca07_cancelacion_mismo_dia_en_zona_de_negocio` (venta 05:30 UTC, intento 06:10 UTC: no cancelable; con `timezone=UTC` el mismo resultado). `apps/api/src/tests/Feature/Tickets/TicketCancellableZoneTest.php`: `test_ca07_cancellable_con_zona_de_negocio` (sin el parámetro del cliente).
- [ ] **T-21** (CA-09; RN-02): `apps/api/src/tests/Feature/Catalog/PublicNewsTest.php`: `test_ca09_vigencia_publica_con_arca_timezone` (noticia con `end_date` 2026-11-06 visible con `ARCA_TIMEZONE=America/Mexico_City` y no visible con `UTC` a las 05:30 UTC del 7; cambiar la zona con `config(['arca.timezone' => ...])`). `apps/api/src/tests/Feature/Catalog/PublicEventsLimitTest.php`: `test_ca09_eventos_vigentes_con_arca_timezone` (mismo criterio). Mantener la aserción `config('app.timezone') === 'UTC'`.
- [ ] **T-22** (CA-10; RN-04): `apps/api/src/tests/Feature/Timezone/ClientTimezoneIgnoredTest.php`: `test_ca10_el_parametro_timezone_del_cliente_se_ignora` (datos: `Asia/Tokyo`, `Mars/Olympus`, `EST`, `+05:00`; panel, reporte, exportación, historial, cancelación, noticias y eventos; respuesta idéntica a la misma petición sin el parámetro, sin `422`, con `arca.timezone` informada). `apps/api/src/tests/Feature/Tickets/TicketDatesTest.php`: `test_ca10_zona_invalida_no_es_error` (reemplaza el nombre `test_ca29_*` de la línea 7 en lo que toca a la zona; el CA-29 de `api-009` sigue en UTC).
- [ ] **T-23** (CA-08): **diferida a `api-022`**. Su test (`test_ca08_*`) se escribe con el reporte de cancelaciones. Este cambio no lo entrega. Cierre de CA-13 para CA-08 cuando `api-022` esté implementada (pregunta P-05). Resultado en el PR de 025: anotado como diferido, sin test vacío ni marcado.
- [ ] **T-24** (condicional; B-02, P-02): solo si P-02 se aprueba: `WeeklyMemoryLimitException` formatea con `BusinessTimezone::name()`; `apps/api/src/tests/Feature/Memories/VisitorMemoryLimitsTest.php` deja de fijar `config(['app.timezone' => 'America/Mexico_City'])` y espera `arca.timezone`; `apps/api/docs/momentos-contrato-para-mobile.md` (línea 152, `APP_TIMEZONE`) se corrige. Si P-02 se rechaza, se deja registrado como divergencia aceptada.

## Documentación y despliegue

- [ ] **T-25** (AGENTS raíz; checklist de despliegue): `infra/README.md`: añadir en el checklist de la API (sección de despliegue) los puntos: `ARCA_TIMEZONE` (por defecto y de producción `America/Mexico_City`, valor a confirmar por operaciones), `DB_TIMEZONE` (`+00:00`), y ejecutar `php artisan config:clear` o `config:cache` tras cambiar `.env`. Evidencia: sección nueva en el PR. Un cambio de requisito de ambiente se anota en el mismo PR (AGENTS raíz).
- [ ] **T-26** (verificación de operaciones; decisión 4; sin agente): el responsable de operaciones verifica en `arca_zoo` la zona de sesión (`@@session.time_zone`, `@@system_time_zone`) y que `tickets.purchased_at` y `cancelled_at` guardados están en UTC, antes de desplegar. Los agentes no consultan `arca_zoo`. Resultado: evidencia registrada en la spec, «Estado actual».
- [ ] **T-27** (documentación local): actualizar `apps/api/docs/administracion.md` (líneas 13, 192-201, 213, 226, 238, 246, 263, 268, 283-295 y 311-315: zona de negocio, sin `timezone` del cliente, respuestas con `timezone`), `apps/api/docs/tickets.md` (líneas 13, 106-108, 120, 124, 137, 165), `apps/api/docs/contenido-publico.md` (línea 26) y revisar `apps/api/docs/arquitectura.md` (línea 65). Resultado: ninguna referencia a la zona del dispositivo ni a `report_timezone`/`public_timezone` en `apps/api/docs`.
- [ ] **T-28** (documentación): `infra/README.md` ya cubierto por T-25. Este punto se cierra cuando la revisión del PR confirma que el checklist de la API lo contiene.
- [ ] **T-29** (notas de revisión en specs afectadas; sin cambiar requisitos): añadir nota de revisión que apunte a `api-025` en: `apps/api/specs/006-public-catalog-read.md` (RN-12 ya cambiada por `api-011`), `007-administration-management.md` (RN-14 y CA-28 sustituidas), `009-ticket-sales.md` (RN-16 y CA-31 sustituidas; CA-29 sigue en UTC), `011-public-news-read.md` (RN-14 con la llave única), `017-visitor-push-notifications.md` (revisar si usa zona u horas; si no las usa, nota «sin cambio»), `019-enclosure-status-and-global-search.md` (fecha de compra del grupo de historial). Los cambios de dashboard (`dashboard-003`, `dashboard-005`) están en el tasks de dashboard.

## Calidad y entrega

- [ ] **T-30** (CA-01 a CA-12): verificaciones de la API en `arca_pruebas` (nunca `arca_zoo`): Pint sobre los archivos tocados y `php artisan test` filtrado a `Timezone`, `ReportTimezoneTest`, `TicketReportExportTest`, `TicketHistoryTest`, `CancelTicketSameDayTest`, `TicketCancellableZoneTest`, `TicketDatesTest`, `PublicNewsTest`, `PublicEventsLimitTest`, `VisitorMemoryLimitsTest` y la regresión de `api-007`, `api-009`, `api-011` y `api-019`. Resultado: salida real aportada por la sesión principal. Sin evidencia no se marca.
- [ ] **T-31** (RN-09, RN-04): búsqueda de remanentes: `report_timezone`, `public_timezone`, `ResolveRequestedTimezoneAction`, `resolvedOptions`, `config('app.timezone')` en `app/` y `Requests/`. Resultado: solo queda `config('app.timezone')` en `WeeklyMemoryLimitException` si P-02 se rechaza, y en el texto explicativo de `config/app.php`.
- [ ] **T-32** (CA-13): cobertura por búsqueda de `test_ca01_` a `test_ca12_` en `apps/api/src/tests/`, con el resultado por CA. CA-08 queda abierto hasta `api-022`. Resultado: tabla CA → test en el PR.
- [ ] **T-33** (decisión 4 de la spec; sin agente): la sesión principal registra la evidencia de T-26 cuando operaciones la aporte. Sin ella no se despliega.
- [ ] **T-34** (entrega): PR que enlaza `apps/api/specs/025-single-business-timezone.md`, `apps/api/plan/025-single-business-timezone.md`, `apps/api/tasks/025-single-business-timezone.md` y `apps/dashboard/tasks/019-single-business-timezone.md` (consumidor). El commit cita `api-025`. Los commits los hace Jonathan con el comando que indique. Estado de la spec: «En progreso» al iniciar, «Implementada» solo con enlace a PR y resultados de CA-01 a CA-12 (CA-08 diferido con referencia a `api-022`).

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
| CA-08 | T-23 | **Diferido a `api-022`** (P-05) |
| CA-09 | T-21 | Cubierto |
| CA-10 | T-22 | Cubierto (reporte de cancelaciones incluido en `api-022`, P-05) |
| CA-11 | T-16 | Cubierto |
| CA-12 | T-17, T-19 | Cubierto |
| CA-13 | T-32 | Verificación de cobertura |
