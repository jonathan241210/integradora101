# Plan técnico · 025 · single-business-timezone

- Spec: `apps/api/specs/025-single-business-timezone.md` (Estado: Aprobada, el responsable funcional; decisiones finales 1 a 4 incluidas)
- Estado de spec: Implementada
- Solicitada: 2026-11-20
- Aprobada: 2026-11-20
- Estado del plan: **Aprobado**. Preguntas P-01 a P-06 y D-03 cerradas en «Decisiones».
- Responsable técnico: por identificar en la aprobación técnica
- Spec dashboard relacionada: `apps/dashboard/specs/019-single-business-timezone.md` (consumidora; se implementa después de esta API)
- DBR relacionada: ninguna. Es cambio de configuración (`.env` y opciones de conexión), no de esquema (spec, «Datos, privacidad y auditoría»).
- ADR relacionados: ninguno nuevo. Relacionados por lectura: ADR 0013 (portabilidad Aiven/local, Constitución I) y ADR 0010 (fuente única de datos, Constitución V).
- Orden: después de `api-021` y antes de `api-022`. Sin dependencias de paquetes nuevos.

## Diseño de solución

La zona de negocio pasa a ser una sola configuración, `arca.timezone`, leída de `ARCA_TIMEZONE` con valor por defecto y de producción `America/Mexico_City`. Un único punto de lectura (RN-09), la clase `App\Support\BusinessTimezone`, la devuelve a todas las Actions. Ninguna Action, Request ni Controller acepta ya la zona del cliente (RN-04). Los instantes siguen en UTC (`app.timezone` sin cambio, RN-03) y la conexión `mysql` fija su zona de sesión en UTC (RN-06).

Flujo resultante: el cliente llama el endpoint con o sin `timezone` → la Request no lee ese parámetro → la Action pide `BusinessTimezone::name()` → calcula día, rango o vigencia en esa zona → la respuesta informa `arca.timezone` como texto IANA.

Componentes:

- **`config/arca.php`:** añade `'timezone' => env('ARCA_TIMEZONE', 'America/Mexico_City')`. Retira `report_timezone` y `public_timezone` (RN-01). Se conserva `two_factor_roles` de `api-021` (ver «Dependencias»).
- **`App\Support\BusinessTimezone`** (nuevo): `name(): string` (lee `arca.timezone`), `now(): CarbonImmutable` (en la zona de negocio), `today(): string` (`Y-m-d` en la zona de negocio) y `assertValid(): void`. `assertValid()` rechaza un valor vacío o que no sea identificador IANA (`DateTimeZone::listIdentifiers(DateTimeZone::ALL_WITH_BC)`), con `RuntimeException` en español: `ARCA_TIMEZONE no es una zona horaria válida: "<valor>". Usa un identificador IANA, por ejemplo America/Mexico_City.` (decisión 2 de la spec: sin respaldo silencioso).
- **`App\Providers\AppServiceProvider::boot()`:** llama `BusinessTimezone::assertValid()`. Un valor inválido impide que la aplicación arranque con un error claro. Es la única validación de arranque.
- **`App\Actions\Admin\Reports\ResolveRequestedTimezoneAction`:** **se elimina** (decisión de plan). Sus consumidores pasan a `BusinessTimezone::name()`: `BuildDashboardSummaryAction`, `ResolveReportPeriodAction`, `ListTicketHistoryAction`. Si el equipo prefiere conservar la clase por trazabilidad, debe devolver siempre la zona de negocio y no aceptar argumento. Un `grep` del PR confirma que no quedan referencias.
- **`App\Support\PublicCalendar::today()`:** delega en `BusinessTimezone::today()` (RN-02). Sigue siendo la única fuente de «hoy» para noticias y eventos.
- **`IsTicketCancellableAction::isSameDay()`:** lee `BusinessTimezone::name()` en lugar de `arca.report_timezone` (RN-02, `api-009` RN-16). La firma no cambia; `CancelTicketAction` no requiere cambios de lógica.
- **`PresentTicketRow::from()`:** el valor por defecto del parámetro `$timezone` pasa a `BusinessTimezone::name()`. El reporte pasa siempre la zona del periodo, así que el valor por defecto solo cubre llamadas sin periodo.
- **`App\Actions\Admin\Search\Groups\SearchTicketHistoryGroup`:** la fecha de compra (`Fecha de compra`, `subtitle`) usa `BusinessTimezone::name()` en lugar de `config('app.timezone')` (divergencia de `api-019` que esta spec corrige).
- **`App\Http\Controllers\Admin\DashboardController`:** deja de pasar `$request->input('timezone')`. Solo llama a la Action.
- **`App\Http\Controllers\Admin\TicketController::index()`:** deja de pasar `timezone`. Añade la zona de negocio a la respuesta con `->additional(['timezone' => BusinessTimezone::name()])` (CA-06, CA-12, decisión 1).
- **`App\Http\Requests\Admin\TicketReportRequest`:** `validated()` ya no añade `timezone`. El parámetro no tiene regla de validación y no produce `422` (CA-10).
- **`App\Actions\Admin\Reports\ResolveReportPeriodAction`, `BuildDashboardSummaryAction`, `ListTicketHistoryAction`:** pierden el parámetro de zona del cliente y leen `BusinessTimezone`. `ExportTicketReportAction` no cambia su lógica; su bitácora `report-exported` sigue registrando `timezone` con la zona de negocio.
- **Resources y writers (CSV, XLSX, PDF):** sin cambio de código. `ReportPeriod::timezone()` ya devuelve la zona resuelta, así que informan la zona de negocio automáticamente.
- **`config/database.php`, conexión `mysql`:** añade `'timezone' => env('DB_TIMEZONE', '+00:00')`. Laravel aplica esa opción como zona de sesión al conectar. Es configuración de conexión y no crea ni cambia tablas (RN-06).
- **Conexión `mysql2` (`settings_colores`):** retirada por P-01: no existe en el código. En el código de la API no existe tal conexión.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| API / config | `config/arca.php`, `config/database.php`, `.env.example` | Llave única, `ARCA_TIMEZONE`, `DB_TIMEZONE` (CA-01, CA-11) |
| API / soporte | `app/Support/BusinessTimezone.php` (nuevo), `app/Support/PublicCalendar.php`, `app/Providers/AppServiceProvider.php` | Único punto de lectura y validación de arranque (RN-09, decisión 2) |
| API / Actions | `Reports/ResolveRequestedTimezoneAction.php` (eliminar), `Reports/ResolveReportPeriodAction.php`, `Reports/BuildDashboardSummaryAction.php`, `Reports/PresentTicketRow.php`, `Tickets/ListTicketHistoryAction.php`, `Tickets/IsTicketCancellableAction.php`, `Search/Groups/SearchTicketHistoryGroup.php` | Día de negocio en todo cálculo (RN-02, RN-04) |
| API / HTTP | `Controllers/Admin/DashboardController.php`, `Controllers/Admin/TicketController.php`, `Requests/Admin/TicketReportRequest.php` | Sin lectura de `timezone` del cliente; zona informada en historial (RN-04, RN-05) |
| API / docs | `apps/api/docs/administracion.md`, `apps/api/docs/tickets.md`, `apps/api/docs/contenido-publico.md`, `apps/api/docs/arquitectura.md` (revisar), `apps/api/docs/momentos-contrato-para-mobile.md` (solo si B-02 se aprueba) | Referencia vigente |
| API / pruebas | `tests/Feature/Timezone/` (nuevos), y reescritura de `tests/Feature/Admin/ReportTimezoneTest.php`, `TicketReportExportTest.php`, `tests/Feature/Tickets/TicketHistoryTest.php`, `CancelTicketSameDayTest.php`, `TicketCancellableZoneTest.php`, `TicketDatesTest.php`, `tests/Feature/Catalog/PublicNewsTest.php`, `PublicEventsLimitTest.php` | Un test por CA-xx (CA-13) |
| Documentación de despliegue | `infra/README.md` | Requisitos `ARCA_TIMEZONE`, `DB_TIMEZONE`, recarga de configuración y verificación de `arca_zoo` (AGENTS raíz) |
| Specs (notas de revisión, solo en la implementación) | `apps/api/specs/006-public-catalog-read.md`, `007-administration-management.md`, `009-ticket-sales.md`, `011-public-news-read.md`, `017-visitor-push-notifications.md`, `019-enclosure-status-and-global-search.md` | Trazabilidad de sustituciones (tasks T-29) |
| Cliente | Sin cambio en esta app; ver `apps/dashboard/plan/019-single-business-timezone.md` | Consumidor |
| Otras apps | `apps/web`, `apps/mobile`, `apps/pwa`: sin tareas de código en este plan | Impacto listado (ver «Riesgos») |

## Contrato y datos

- **Rutas nombradas (sin cambio de nombre ni de permisos):** `admin.dashboard` (`GET /api/v1/admin/dashboard`), reporte y exportación de `api-007`, historial y cancelación de `api-009`, noticias y eventos públicos de `api-011`. Ninguna ruta nueva en esta spec.
- **Autorización:** sin cambios (`dashboard.view`, `reports.view`, `tickets.view`, `tickets.cancel`, lectura pública). No se crean permisos ni roles.
- **Contrato de respuestas:**
  - Panel: `data.timezone` = `arca.timezone` (ya existía; ahora siempre la de negocio).
  - Reporte y exportación: `period.timezone` = `arca.timezone`.
  - Historial: se **añade** `timezone` al nivel superior de la respuesta, junto a `data` y `meta` (cambio aditivo, decisión 1). El dashboard lo usa en `dashboard-019`.
  - Cancelación y noticias/eventos: sin campo nuevo.
- **Entradas:** el parámetro `timezone` se ignora en todos los endpoints de la spec (CA-10). Ninguno responde `422` por zona. Un cuerpo con `timezone` en la cancelación también se ignora.
- **Validación/Requests:** ninguna regla nueva. Se elimina la lectura de `timezone` en `TicketReportRequest::validated()`.
- **DBR y migraciones:** ninguna. No hay `CREATE`, `ALTER`, funciones, procedimientos, vistas ni triggers.
- **Errores:**
  - Zona de negocio inválida o vacía en `.env`: la aplicación no arranca con el `RuntimeException` de `assertValid()` (decisión 2). No es una respuesta HTTP.
  - `timezone` del cliente (válida, inválida, abreviatura o desfase): sin efecto y sin `422` (CA-10).
  - Cancelación fuera del día de negocio: mismo mensaje y código que hoy (`api-009` RN-16).
  - Error de base de datos: `500` sin cambios.
- **Compatibilidad:** clientes que siguen enviando `timezone` no se rompen (la API lo ignora). Cambian las cifras de quien consulte desde otra zona: efecto esperado; avisar antes del despliegue (riesgos).
- **Auditoría:** sin cambios. `report-exported` registra `timezone` con la zona de negocio. Un cambio de `ARCA_TIMEZONE` o `DB_TIMEZONE` es de despliegue y no se registra como acción de usuario.

## Seguridad, operación y portabilidad

- **Mínimo privilegio:** sin cambio. La zona no es un dato sensible; se informa en respuestas que ya son accesibles con sus permisos.
- **Secretos:** ninguno. `ARCA_TIMEZONE` y `DB_TIMEZONE` no son secretos. Se documentan en `.env.example` con valores de muestra y sin credenciales.
- **Portabilidad (Constitución I):** la zona y la zona de sesión salen solo de `.env`. No hay funciones de nube ni extensiones propias de Aiven. `DB_TIMEZONE` acepta el formato de desfase `+00:00` que MySQL 8.0.x admite. El cambio es igual en Aiven y en MySQL local.
- **Consistencia de la sesión MySQL:** fijar la sesión en UTC afecta solo a columnas `TIMESTAMP` (la conversión depende de la zona de sesión). Las `DATETIME` no cambian. `tickets.cancelled_at` es `DATETIME` (`2026_11_02_000006_ticket_sales_schema.php`). El tipo de `tickets.purchased_at` no se confirma en el repositorio (renombrada desde `fecha_compra` en `2026_10_14_000001`). Se consulta en solo lectura en `arca_pruebas` (ver «Pendientes de la sesión principal»).
- **Caché de configuración:** cambiar `ARCA_TIMEZONE` o `DB_TIMEZONE` requiere `php artisan config:clear` o `config:cache` en cada ambiente. Va al checklist de `infra/README.md`.
- **Rate limit y offline:** sin cambio. La PWA y la app móvil no calculan días de negocio.
- **Observabilidad:** sin cambio. Solo queda como dato de la bitácora de exportación.

## Mapeo de criterios a pruebas

Convención: docblock `/** CA-NN single-business-timezone */` y método `test_caNN_...`. Todas las pruebas Feature usan `DatabaseTransactions` sobre `arca_pruebas`; ningún test usa `RefreshDatabase` ni migraciones.

| Criterio | Prueba automatizada | App/ubicación | Tareas |
|---|---|---|---|
| CA-01 | `test_ca01_default_value_and_single_key` (carga `config/arca.php` sin `ARCA_TIMEZONE` con `putenv`; comprueba `timezone`, ausencia de `report_timezone` y `public_timezone`, y que ningún archivo de `app/` lee esas llaves) | API `tests/Feature/Timezone/BusinessTimezoneConfigTest.php` | T-02, T-03 |
| CA-02 | `test_ca02_changing_the_timezone_changes_the_cutoff` (boleto de las 05:30 UTC del 7 cuenta el 6 con MX y el 7 con UTC; cubre panel y reporte) y `test_ca02_global_search_shows_business_date` (`api-019` fecha de compra) | API `tests/Feature/Timezone/BusinessDayTest.php` | T-15 |
| CA-03 | `test_ca03_instants_in_utc_and_app_timezone_utc` (`config('app.timezone') === 'UTC'`; `purchased_at` y `cancelled_at` guardados en UTC) | API `tests/Feature/Timezone/BusinessTimezoneConfigTest.php` | T-16 |
| CA-04 | `test_ca04_dashboard_counts_in_the_business_timezone` (`timezone=Europe/Madrid` o ausente; `data.timezone` = MX) | API `tests/Feature/Admin/ReportTimezoneTest.php` | T-17 |
| CA-05 | `test_ca05_report_and_export_in_business_timezone` (CSV, XLSX y PDF con `timezone=America/Tijuana`; día `2026-11-06`) y `test_ca05_csv_purchased_at_time_in_business_timezone` (`2026-11-06 23:30:00`) | API `tests/Feature/Admin/TicketReportExportTest.php` y `ReportTimezoneTest.php` | T-18 |
| CA-06 | `test_ca06_history_filters_by_business_day` (`from`/`to` del 6 incluye el boleto; del 7 no) | API `tests/Feature/Tickets/TicketHistoryTest.php` | T-19 |
| CA-07 | `test_ca07_same_day_cancellation_in_business_timezone` (venta 05:30 UTC, intento 06:10 UTC: no cancelable aunque `timezone=UTC`) y `test_ca07_cancellable_with_business_timezone` | API `tests/Feature/Tickets/CancelTicketSameDayTest.php` y `TicketCancellableZoneTest.php` | T-20 |
| CA-08 | **Diferido a `api-022`** (reporte de cancelaciones, no existe aún). Ver brecha B-05. | API `tests/Feature/...` de `api-022` | T-23 (diferida) |
| CA-09 | `test_ca09_public_validity_uses_arca_timezone` (noticia con `end_date` 6 visible con MX y no visible con UTC; eventos con el mismo criterio) | API `tests/Feature/Catalog/PublicNewsTest.php` y `PublicEventsLimitTest.php` | T-21 |
| CA-10 | `test_ca10_the_client_timezone_parameter_is_ignored` (datos: `Asia/Tokyo`, `Mars/Olympus`, `EST`, `+05:00`; panel, reporte, exportación, historial, cancelación, noticias y eventos; respuesta idéntica sin `422`). Incluye `TicketDatesTest::test_ca10_invalid_timezone_is_not_an_error` | API `tests/Feature/Timezone/ClientTimezoneIgnoredTest.php` y `tests/Feature/Tickets/TicketDatesTest.php` | T-22 |
| CA-11 | `test_ca11_sesion_mysql_en_utc` (`select @@session.time_zone` devuelve `+00:00`) | API `tests/Feature/Timezone/BusinessTimezoneConfigTest.php` | T-16 |
| CA-12 | `test_ca12_panel_reporte_e_historial_informan_arca_timezone` (`data.timezone`, `period.timezone` y `timezone` del historial) | API `tests/Feature/Admin/ReportTimezoneTest.php` y `tests/Feature/Tickets/TicketHistoryTest.php` | T-17, T-19 |
| CA-13 | Verificación de cobertura por búsqueda de `test_ca01_` a `test_ca16_` en `tests/` (sin test propio); CA-08 se verifica con `api-022` T-28 | Revisión en PR | T-32 |
| CA-14 (P-06) | `test_ca14_boot_fails_with_invalid_arca_timezone` en `tests/Unit/Timezone/BusinessTimezoneTest.php` | API / tests | T-04 |
| CA-15 (P-02) | `test_ca15_weekly_limit_uses_arca_timezone` en `tests/Feature/Memories/VisitorMemoryLimitsTest.php` | API / tests | T-24 |
| CA-16 (P-03) | `test_ca16_effective_at_without_offset_is_read_in_arca_timezone` en `tests/Feature/Timezone/ScheduledPriceTimezoneTest.php` | API / tests | T-35 |

Pruebas sin CA (cubren decisiones de la spec): `BusinessTimezoneTest` (unitaria, `tests/Unit/Timezone/BusinessTimezoneTest.php`): valida que `assertValid()` rechaza vacío, `Mars/Olympus` y abreviaturas, y acepta `America/Mexico_City` y `UTC` (decisión 2). Ver pregunta P-06.

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | Sin dependencias nuevas ni ADR nuevo. Zona y zona de sesión solo por `.env` (`ARCA_TIMEZONE`, `DB_TIMEZONE`). Sin SDK de nube. Funciona igual en Aiven (ADR 0013) y MySQL local. |
| II. La spec manda | Sí | Spec 025 Aprobada con decisiones finales. Plan y tasks con el mismo `025-single-business-timezone`. Plan pendiente de aprobación técnica: no se implementa todavía. |
| III. Lógica separada de la interfaz | Sí | Toda la regla de día y zona está en `BusinessTimezone`, Actions y `PublicCalendar`. Controladores solo delegan. El dashboard no calcula días (`dashboard-019` RN-02). |
| IV. Un test por criterio | Sí (CA-08 diferido a `api-022`, P-05) | Mapeo de CA-01 a CA-07 y CA-09 a CA-16. CA-08 se prueba en `api-022` (T-28). CI en verde: pendiente de evidencia de la sesión principal. |
| V. Una sola fuente de verdad para los datos | Sí | Sin cambios de esquema ni DBR. Modelos y SoftDeletes sin cambio. Los instantes siguen en UTC. Riesgo de datos existentes (RN-08) documentado y con verificación previa. |
| VI. Código en inglés, personas en español | Sí | `ARCA_TIMEZONE`, `DB_TIMEZONE`, `BusinessTimezone` en inglés. Mensaje de error de arranque y textos de docs en español. |

## Riesgos y decisiones

- **ADR requerido/aprobado:** ninguno nuevo. No hay dependencia nueva.
- **Riesgo de datos (RN-08):** si un ambiente guardó `TIMESTAMP` con otra zona de sesión, al leerlas con `+00:00` las horas cambian. Verificar antes de desplegar (decisión 4; responsable de operaciones).
- **Cambio de cifras:** quien consultaba desde otra zona verá cortes distintos. Avisar antes del despliegue.
- **Pruebas que cambian de contrato:** los tests que hoy esperan la zona del dispositivo se reescriben (T-17 a T-22). Su cambio es intencional y se registra en el PR.
- **Impacto en otras apps (no implementado aquí):** `apps/web` (fechas del portal, `web-009`), `apps/mobile` (horas de corte de eventos, `mobile-003`) y `apps/pwa` (no revisada) deben confirmar si muestran horas o días. Si lo hacen, requieren su propia revisión y spec.
- **Alternativas descartadas:**
  - Mantener `ResolveRequestedTimezoneAction` con argumento ignorado: confunde la regla y deja un punto de entrada del cliente.
  - Respaldo silencioso a `America/Mexico_City` si `ARCA_TIMEZONE` es inválida: descartado por la decisión 2.
  - Convertir filas existentes: fuera de alcance (RN-08).
- **Brechas (la sección de dependencias y los riesgos se completan con esto):**
  - **B-01 `mysql2`:** la decisión 3 pide fijar UTC también en `mysql2` (`settings_colores`). El código de la API no define esa conexión: `config/database.php` solo tiene `sqlite`, `mysql`, `mariadb`, `pgsql` y `sqlsrv`, y no hay ninguna referencia a `mysql2` en `*.php`. `docs/02-arquitectura.md`, `infra/README.md` y `docs/database/diccionario-datos.md` la describen como existente. Ver P-01. La tarea T-13 queda condicionada.
  - **B-02 `WeeklyMemoryLimitException` (`api-010` CA-23):** el mensaje formatea la fecha con `config('app.timezone')` (UTC). No está en el alcance de la spec (RN-03 solo menciona listado y exportación). `momentos-contrato-para-mobile.md` (línea 152) dice que usa `APP_TIMEZONE`, variable que el código no lee. Ver P-02.
  - **B-03 Precios programados:** el dashboard convierte la hora local de «entrada en vigor» a instante con el desfase del navegador (`localDateTimeToIso`, `ticket-prices.ts`), y `SaveTicketPricesRequest` exige desfase explícito. Esto incumple `dashboard-019` CA-06 y no está cubierto por esta spec. Ver P-03.
  - **B-04 Recibo y precios sin zona de API:** las respuestas de venta y de precio no informan `timezone`. Ver P-04.
  - **B-05 CA-08 y CA-10 del reporte de cancelaciones:** dependen de `api-022`, que se implementa después. Ver P-05.
  - **B-06 Decisión 2 sin CA:** la decisión de arranque fallido no tiene CA en la spec, y su sección «Flujos y errores» aún dice «comportamiento pendiente (pregunta 2)». Ver P-06.
- **Divergencia spec/código detectada en la revisión (no corregida aquí):** `api-019` (`SearchTicketHistoryGroup`) usa UTC para la fecha de compra. La spec ya lo fija como corrección (RN-03 y «Riesgos»).

## Decisiones (aprobación técnica del responsable funcional)

- **P-01 (`mysql2`, B-01):** resuelta. La conexión `mysql2` no existe en `config/database.php` y no se crea en esta spec. Decisión 3 de la spec retirada; T-13 cerrada sin cambios. Divergencia reportada: `docs/02-arquitectura.md`, `infra/README.md` y `docs/database/diccionario-datos.md` describen la conexión como existente; su corrección queda fuera de este cambio.
- **P-02 (memoria semanal, B-02):** `WeeklyMemoryLimitException` usa `arca.timezone`. Spec: RN-11, CA-15. Tarea: T-24, incluida la corrección de `apps/api/docs/momentos-contrato-para-mobile.md` (línea 152, `APP_TIMEZONE`), que es la referencia que hay que corregir.
- **P-03 (precios programados, B-03):** la API interpreta la hora de «entrada en vigor» (`effective_at`) en `arca.timezone` cuando llega sin desfase. Es un cambio de contrato de `api-009` CA-18 y CA-19, anotado en su nota de revisión, y en la de `apps/dashboard/specs/005-ticket-sales.md`. El dashboard deja de usar `getTimezoneOffset` (`dashboard-019` T-10). Spec: RN-12, CA-16. Tarea nueva: T-35. Pregunta P-03b (desfase explícito) abierta en la spec.
- **P-04 (zona en recibo y precios, B-04):** el recibo de venta y las respuestas de precios vigentes incluyen `timezone`. Spec: CA-12 enmendado, RN-13. Tarea nueva: T-36. Desbloquea `dashboard-019` T-09.
- **P-05 (CA-08 y CA-10 del reporte de cancelaciones, B-05):** el test de CA-08 se entrega con `api-022` (T-28 de `tasks/022-ticket-cancellation-report.md`). CA-13 se cierra para CA-08 entonces.
- **P-06 (arranque con zona inválida, B-06):** la API no arranca si `ARCA_TIMEZONE` está vacío o no es un identificador IANA; el error es claro y en español. Spec: CA-14 nuevo. Tarea: T-04.
- **D-03 (dashboard, `formatDateTime`):** aceptado como respaldo fijo en `dashboard-019`, con la divergencia registrada. Este plan no lo modifica.
- El plan se aprueba con sus propuestas de diseño (`BusinessTimezone`, eliminación de `ResolveRequestedTimezoneAction`, `DB_TIMEZONE` en la conexión `mysql`, CA-01 a CA-13 con sus pruebas).

## Preguntas originales (cerradas por las decisiones de arriba)

- **P-01 (mysql2, B-01):** la conexión `mysql2` para `settings_colores` no existe en `apps/api/src/config/database.php`. ¿Se define fuera de este repositorio (y en ese caso el cambio lo hace quien la mantiene) o debe crearse en la API en esta spec? Propuesta: no crearla aquí; anotar la brecha y cerrarla cuando exista la conexión. Bloquea solo T-13.
- **P-02 (memoria semanal, B-02):** ¿el mensaje de `WeeklyMemoryLimitException` pasa a `arca.timezone`? Propuesta: sí, con la misma regla de RN-02. Implica ajustar `VisitorMemoryLimitsTest` y `momentos-contrato-para-mobile.md`. Bloquea T-24.
- **P-03 (precios, B-03):** ¿quién interpreta la hora de «entrada en vigor»? A) la API acepta fecha y hora sin desfase y la interpreta en `arca.timezone` (cambia el contrato de `api-009`; requiere enmienda de `api-025` RN-10 o una spec de precios); B) el cliente mantiene el desfase del navegador (incumple `dashboard-019` CA-06). Propuesta: A. Bloquea T-10 del dashboard.
- **P-04 (recibo y precios, B-04):** ¿se añade `timezone` a las respuestas de venta y de precio vigente para que el dashboard presente con la zona de la API, o se aceptan sin zona de negocio? Propuesta: añadir `timezone` a esas respuestas. Bloquea T-09 del dashboard.
- **P-05 (CA-08 y CA-10 de reporte de cancelaciones, B-05):** ¿se acepta que el test de CA-08 y la parte de CA-10 para el reporte de cancelaciones se entreguen con `api-022`, y que CA-13 se cierre entonces para esos casos?
- **P-06 (decisión 2, B-06):** ¿se añade CA-14 a la spec para el arranque con `ARCA_TIMEZONE` inválida, y se actualiza «Flujos y errores»? Propuesta: sí.

## Pendientes de la sesión principal (evidencia, no DBR)

- Consulta en solo lectura en `arca_pruebas` (sesión principal, `php artisan db:table tickets`): `tickets.purchased_at` es **`TIMESTAMP`** con default `CURRENT_TIMESTAMP`; `tickets.cancelled_at` es **`DATETIME`**. Sesión MySQL actual: `@@session.time_zone = SYSTEM`, `@@system_time_zone = UTC`. Fijar `DB_TIMEZONE=+00:00` no cambia lo que ya está guardado en `arca_pruebas`. T-14 resuelta.
- Salida de `php artisan test` filtrado y de Pint tras la implementación (no se afirma que pasen).

## Impacto y dependencias de orden

- **Antes:** `api-021` (2FA y confirmación). Comparten `CancelTicketAction`, `TicketCancelController` y `config/arca.php` (`two_factor_roles`). Esta spec solo cambia la línea de zona de `IsTicketCancellableAction`; no toca la confirmación.
- **Después:** `api-022` (reporte de cancelaciones) usa `BusinessTimezone` desde el inicio (`api-022` CA-08). Comparte `routes/api.php` (rutas del reporte) y los exportadores (`TicketReport*Writer`): 025 cambia solo la zona que reciben.
- **Cliente:** `dashboard-019` depende de esta API (campo `timezone` del historial, sin `timezone` en el cliente). Implementar esta API antes del dashboard.
- **Specs con nota de revisión (en la implementación):** `api-006`, `api-007` (RN-14, CA-28), `api-009` (RN-16, CA-31; CA-29 sigue en UTC), `api-011` (RN-14), `api-017`, `api-019` (fecha de compra). Las notas de dashboard (`dashboard-003`, `dashboard-005`) están en `apps/dashboard/tasks/019-single-business-timezone.md`.

## Orden y aprobación

1. Aprobación técnica hecha por el responsable funcional (preguntas P-01 a P-06 resueltas).
2. Respuestas registradas en la spec y en este plan.
3. Consulta de solo lectura de `tickets.purchased_at` (sesión principal).
4. Implementación según `apps/api/tasks/025-single-business-timezone.md` (T-02 en adelante).
5. Verificación con evidencia de la sesión principal; operaciones valida `arca_zoo` antes de desplegar (decisión 4).

- Revisión técnica: el responsable funcional (aprobación técnica del plan).
- Aprobador funcional: el responsable funcional.
- Evidencias: pendientes de la sesión principal. Esta sesión no tiene shell y no afirma que pruebas, lint ni CI pasen.

## Decisión de coordinación (sesión principal)
- P-03b: `effective_at` **con** desfase explícito se sigue aceptando y se respeta el instante indicado (compatibilidad con clientes actuales); **sin** desfase se interpreta en `arca.timezone`. El dashboard (dashboard-019) envía la hora sin desfase.

## Consulta de solo lectura de `arca_pruebas` antes de implementar

- `@@session.time_zone = SYSTEM`, `@@global.time_zone = SYSTEM`, `@@system_time_zone = UTC`; `now` = `utc_timestamp`, es decir, la sesión efectiva ya es UTC.
- `tickets` (34 filas): `purchased_at` mínimo `2026-11-08 17:43:31`, máximo `2026-11-19 23:54:35`; `cancelled_at` es `DATETIME` y está nulo en las últimas filas. Los valores son coherentes con UTC (la hora actual en UTC es posterior al máximo).
- `ticket_prices`: `effective_at` de `2026-11-07 22:35:31` a `2026-11-18 21:19:45`, coherente con UTC.
- Conclusión: fijar `DB_TIMEZONE=+00:00` no desplaza datos existentes en `arca_pruebas`. No hace falta DBR. `arca_zoo` no se consultó (decisión 4).

## Divergencias de implementación

- **Ubicación de `timezone` en recibo y precios (dashboard-019):** el plan decía solo «incluyen `timezone`». Por contrato con el dashboard ya implementado, va dentro de `data`: `POST /tickets` en `data.timezone`, `GET /ticket-prices/current` en `data.timezone` junto a `adult` y `child` y `POST /ticket-prices` en `data.timezone` (y dentro de `data.current`). El historial lo lleva en la raíz.
- **Helper de día de negocio:** además de `name()`, `now()`, `today()` y `assertValid()`, `BusinessTimezone` expone `startOfDayUtc(Y-m-d)`, `endOfDayUtc(Y-m-d)` (límite exclusivo) y `dateOf(instante)`, para `api-022` y los exportadores de `api-007`. `ListTicketHistoryAction` ya los usa.
- **`effective_at` (P-03b):** sin desfase se interpreta en `arca.timezone`; con desfase o `Z` se respeta. El Request acepta ambos formatos. El caso de prueba de `TicketPriceValidationTest` que esperaba 422 sin desfase se cambió: ahora un valor sin desfase en el pasado y un formato inválido dan 422.
- **Pruebas de CA-10 en noticias y eventos:** viven en `ClientTimezoneIgnoredTest` y se comprueba que la respuesta es idéntica con y sin el parámetro.
- **CA-08:** diferido a `api-022` (sin cambio).
