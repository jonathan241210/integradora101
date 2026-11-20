# Plan técnico · 022 · ticket-cancellation-report

- Spec: `apps/api/specs/022-ticket-cancellation-report.md` (Aprobada, Jonathan, 2026-11-20)
- Spec de consumidor: `apps/dashboard/specs/016-ticket-cancellation-report.md` (Aprobada, 2026-11-20); plan de la SPA en `apps/dashboard/plan/016-ticket-cancellation-report.md`
- Estado de spec: Aprobada
- Estado del plan: **Borrador — pendiente de aprobación técnica (equipo/Jonathan)**. No autoriza programar: las tareas de `tasks/022-ticket-cancellation-report.md` se ejecutan solo cuando este plan esté aprobado.
- Responsable técnico: `<por identificar>` (la spec indica «backend por confirmar»)
- Responsable de BD: Víctor Adrián (según DBR-006; pendiente de confirmar para DBR-024)
- DBR relacionada: `docs/database/requests/DBR-024-ticket-cancellation-reason-code.md`, estado **Borrador**. Ninguna migración ni código que use `cancellation_reason_code` se escribe hasta que la DBR esté en `Lista para backend`.
- Orden de implementación: `api-021` (confirmación de contraseña en cancelar y 2FA de `cashier`) → `api-025` (zona única `arca.timezone`) → **`api-022`** (este plan). Despliegue: DBR-024 → API → dashboard (`dashboard-016`).
- ADR relacionados: ADR 0017 (exportación CSV, Excel y PDF; reutilizada, sin dependencia nueva), ADR 0021 (`Ticket` sin `BaseModel`, con SoftDeletes; se mantiene), ADR 0013 (portabilidad MySQL). No se requiere ADR nuevo.

## Diseño de solución

El flujo sigue la cadena de la API: ruta nombrada bajo `/api/v1/admin` con middleware de permiso → Form Request → Action → Resource. La API es la única autoridad de catálogo, validación, totales, conciliación, alertas y auditoría. El dashboard solo presenta (`dashboard-016`).

Componentes principales:

1. **Catálogo cerrado de motivos (RN-02).** Un enum PHP respaldado por cadena, `App\Enums\TicketCancellationReason`, con los cinco casos (`capture_error`, `duplicate_charge`, `wrong_ticket_type`, `visitor_withdrew`, `other`), la etiqueta en español (`label()`) y la política de comentario (`commentRequired()`: solo `other`). Un enum se prefiere a `config/arca.php` porque el catálogo es cerrado y cambia solo con revisión de spec (RN-02). El código se persiste como texto; no hay `ENUM` en MySQL (DBR-024, «Decisiones de diseño»).
2. **Cancelación (api-009 con cambio de contrato).** `CancelTicketRequest` pasa a validar `reason_code` (obligatorio, del enum) y `reason` (comentario opcional, obligatorio si el código es `other`, 15 a 255 caracteres tras recortar). `CancelTicketAction` escribe `cancellation_reason_code` (código) y `cancellation_reason` (solo el comentario, o nulo). La etiqueta **no** se guarda: la deriva la API al presentar (RN-03). La regla de mismo día y de dueño (`IsTicketCancellableAction`, api-009 RN-16) no cambia; su zona la fija api-025.
3. **Catálogo para el cliente.** `ListCancellationReasonsAction` devuelve los cinco códigos en orden, con etiqueta y `comment_policy`. Es la única fuente de etiquetas para el diálogo de cancelar.
4. **Reporte de cancelaciones.** `BuildCancellationReportAction` es la única Action que calcula filas, totales, desgloses, conciliación y alertas. Reutiliza los helpers de centavos de `SummarizeTicketSalesAction` (`toCents`, `money`) para que el neto diario sea idéntico al ingreso diario de `api-007` (CA-17). Las filas se presentan con `PresentCancelledTicketRow` (minutos enteros hacia abajo, CA-07; etiqueta «Sin clasificar (anterior)» si el código es nulo, CA-08; nombres con `withTrashed`, CA-09).
5. **Exportación.** `ExportCancellationReportAction` valida formato y tope de PDF, calcula el reporte con la misma Action (RN-13 de api-007), registra `report-cancellations-exported` antes de entregar y responde el archivo completo (Excel y PDF se generan antes de responder, como en api-007). Los tres formatos salen de un **documento de reporte común** (`ReportDocument`: título, bloque de metadatos, secciones con cabeceras y filas) que consumen los writers de api-007 (ADR 0017). Ver «Reutilización de exportadores».
6. **Alertas (RN-08).** Umbrales en `config('arca.cancellation_alerts')` (no fijos en código): `cancel_after_minutes` = 30, `cashier_cancel_percent` = 10, `cashier_min_sold_tickets` = 20. Las alertas son solo visuales (`alert`, `alert_reasons`); nunca bloquean.
7. **Zona.** Todo día, periodo y conciliación usa `config('arca.timezone')` vía el punto único de lectura de api-025 (RN-09). Se ignora cualquier `timezone` del cliente (api-025 RN-04). La respuesta informa `period.timezone`.

### Contrato JSON propuesto

Todas las respuestas usan los nombres de la API en inglés y las etiquetas en español; los importes son cadenas con dos decimales (como api-007).

- `GET /api/v1/admin/tickets/cancellation-reasons` (nombre `tickets.cancellation-reasons`) → `200 { "data": [ { "code": "capture_error", "label": "Error de captura", "comment_policy": "optional" }, … ] }` con los cinco códigos en ese orden; `other` tiene `comment_policy: "required"`.
- `POST /api/v1/admin/tickets/{ticket}/cancel` (nombre `tickets.cancel`, sin cambio de ruta) → cuerpo `{ "reason_code": "…", "reason": "…" | null }`. Errores 422: `reason_code` faltante → «Selecciona un motivo de cancelación.»; fuera de catálogo → «El motivo elegido no es válido.»; `other` con comentario de menos de 15 caracteres → «Describe el motivo con al menos 15 caracteres.» en `reason`; más de 255 → mensaje de longitud máxima en `reason`. Respuesta 200 = `TicketHistoryResource` con `cancellation_reason_code`, `cancellation_reason_label` y `cancellation_reason` (comentario). Resto de errores según api-009 y api-021 (403 `password_confirmation_required`).
- `GET /api/v1/admin/reports/cancellations` (nombre `reports.cancellations.show`), con `period` (`week|month|custom`), `date` (`Y-m-d`), `from`, `to`, `cashier_id`, `reason_code`. Respuesta:
  - `period`: `type`, `from`, `to`, `label`, `previous_date`, `next_date`, `timezone` (`arca.timezone`).
  - `totals`: `cancelled_tickets` (suma de cantidades), `cancelled_amount`; `by_cashier[]` y `by_reason[]` con `cancelled_tickets`, `cancelled_amount` y, en `by_reason`, `reason_code` (nulo = «Sin clasificar (anterior)»), `reason_label`.
  - `reconciliation.days[]`: `date`, `gross`, `cancelled`, `net`, `balanced`. `reconciliation.cashiers[]`: `cashier_id`, `cashier_name`, `gross`, `cancelled`, `net`, `balanced`, `active_days[]`, `sold_tickets`, `cancel_percent`, `alert`, `alert_reasons[]`. Solo aparecen días y cajeros con actividad (CA-13 de dashboard-016).
  - `rows[]`: `folio`, `adult_quantity`, `child_quantity`, `total_amount`, `purchased_at`, `cancelled_at` (ISO 8601 UTC), `cashier_name`, `cancelled_by_name`, `reason_code`, `reason_label`, `comment`, `minutes_to_cancel`, `alert`, `alert_reasons[]`. Sin paginación en esta versión (pregunta 2).
- `GET /api/v1/admin/reports/cancellations/export` (nombre `reports.cancellations.export`), con los mismos filtros y `format` (`csv|xlsx|pdf`). Respuesta: archivo descargable (`Content-Disposition` con el nombre que genera la API, `Cache-Control: no-store`).

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| API / datos (BD, responsable de BD) | `database/migrations/` (migración que crea BD tras DBR-024) | Columna `cancellation_reason_code VARCHAR(30) NULL`. La escribe y prueba el responsable de BD; backend no la crea. |
| API / dominio | `app/Enums/TicketCancellationReason.php` (nuevo) | Catálogo cerrado de RN-02: valores, etiquetas, `commentRequired()`. |
| API / dominio | `app/Models/Ticket.php` | `cancellation_reason_code` en `$fillable` y cast al enum (nulo permitido). Relación `canceller()` (`cancelled_by`, `withTrashed`) y `cashier()` con `withTrashed()` (RN-12). Sigue con SoftDeletes y sin `BaseModel` (ADR 0021). |
| API / Actions | `app/Actions/Admin/Tickets/CancelTicketAction.php` | Firma `execute(User, Ticket, TicketCancellationReason, ?string $comment)`; escribe código y comentario; `ticket-cancelled` con `reason_code` y `reason`. |
| API / Actions | `app/Actions/Admin/Tickets/ListCancellationReasonsAction.php` (nuevo) | Devuelve el catálogo en orden (CA-10). |
| API / Actions | `app/Actions/Admin/Reports/BuildCancellationReportAction.php` (nuevo) | Filas, totales, desgloses, conciliación y alertas (CA-06, CA-14 a CA-18). |
| API / Actions | `app/Actions/Admin/Reports/PresentCancelledTicketRow.php` (nuevo) | Presenta una fila: minutos, etiqueta o «Sin clasificar (anterior)», nombres (CA-06 a CA-09). |
| API / Actions | `app/Actions/Admin/Reports/ExportCancellationReportAction.php` (nuevo) | Formato, tope de PDF, auditoría antes de entregar, nombre de archivo (CA-19 a CA-21). |
| API / exportadores | `app/Actions/Admin/Reports/ReportDocument.php` (nuevo); `TicketReportCsvWriter`, `TicketReportXlsxWriter`, `TicketReportPdfWriter` (adaptados) | Documento común de metadatos, totales y secciones (ver «Reutilización de exportadores»). |
| API / requests | `app/Http/Requests/Admin/Tickets/CancelTicketRequest.php` (reglas nuevas), `app/Http/Requests/Admin/Tickets/CancellationReportRequest.php` y `ExportCancellationReportRequest.php` (nuevos) | Validación en español. El reporte nuevo no lee `timezone`. |
| API / controladores | `TicketCancelController` (pasa `reason_code` y `reason`); `TicketCancellationReasonController` y `CancellationReportController`, `CancellationReportExportController` (nuevos) | Controladores delgados que delegan en Actions. |
| API / Resources | `app/Http/Resources/Admin/Tickets/TicketHistoryResource.php` (campos añadidos), `app/Http/Resources/Admin/Reports/CancellationReportResource.php` y `CancellationReasonResource.php` (nuevos) | Forma de respuesta. |
| API / rutas | `routes/api.php` | Dentro del grupo `/api/v1/admin` con su middleware de 2FA: `tickets.cancellation-reasons` (`permission:tickets.cancel`); `reports.cancellations.show` y `reports.cancellations.export` (`permission:reports.cancellations.view`). Sin límite nuevo de consulta (RN-14). |
| API / configuración | `config/arca.php` | Bloque `cancellation_alerts` (30 min; 10 %; 20 boletos). Coordinado con api-025, que retira `report_timezone`. |
| API / permisos | `database/seeders/RolesAndPermissionsSeeder.php` | Añade `reports.cancellations.view` al catálogo. `admin` lo recibe por la diferencia de su lista; `zoo-admin`, `executive`, `cashier` y `veterinarian` no (listas explícitas). |
| API / búsqueda | `app/Actions/Admin/Search/Groups/SearchTicketHistoryGroup.php` | Muestra «Motivo de cancelación» con la etiqueta, según pregunta 3. |
| API / tests | Ver «Mapeo de criterios a pruebas» y «Regresión» | Pruebas nuevas y actualización de pruebas existentes. |
| API / documentación | `apps/api/docs/tickets.md`, `apps/api/docs/administracion.md` | Contrato de cancelar (sin `reason` libre), catálogo y reporte. |
| Cliente(s) | Sin cambios en esta tarea de API. El cliente de `packages/api-client` y el dashboard se planean en `apps/dashboard/plan/016-ticket-cancellation-report.md`. | — |
| Paquetes/documentación | `docs/03-roles-y-permisos.md` (ya modificado en el árbol de trabajo; se verifica que contiene `reports.cancellations.view` solo para `admin`). `infra/README.md`: sin cambio propio (no hay variable de entorno nueva; la de zona la anota api-025). | Trazabilidad de permisos. |

## Contrato y datos

- **Endpoints nombrados, autenticación y permisos:** ver «Diseño de solución». Todos bajo `/api/v1/admin`, con sesión, 2FA confirmado para roles de `config('arca.two_factor_roles')` (api-021 CA-01) y el permiso indicado. La cancelación conserva `tickets.cancel` y el límite de frecuencia de api-009 (RN-30); se añade la confirmación de contraseña en modo Ventana de api-021 (CA-16), que va **antes** de la validación del cuerpo.
- **Orden de comprobaciones en cancelar:** sesión → 2FA → permiso `tickets.cancel` → límite de frecuencia → confirmación de Ventana (api-021) → dueño y 404 (`CancelTicketRequest::authorize`) → validación de `reason_code` y `reason` (422) → boleto ya cancelado (422) → mismo día (422) → escritura y auditoría. Así un 403 de contraseña no revela validación de motivo.
- **Validación (Form Requests):**
  - `CancelTicketRequest`: `reason_code` `required` + `Rule::enum(TicketCancellationReason::class)`; `reason` `nullable|string|max:255`; `prepareForValidation` recorta `reason`; si el código es `other`, `reason` es `required` y `min:15` (tras recortar). Para otros códigos, comentario opcional y nulo si vacío.
  - `CancellationReportRequest`: `period` `required|in:week,month,custom`; `date` `nullable|date_format:Y-m-d`; `from`/`to` `nullable|date_format:Y-m-d`; `cashier_id` `nullable|integer` con cajero existente (rol `cashier`, incluidos eliminados lógicamente, pregunta 8); `reason_code` `nullable` + enum. Cualquier `timezone` se descarta.
  - Para `week`/`month` sin `date`: 422 (literal de CA-04; pregunta 1).
- **Actions:** `ListCancellationReasonsAction`, `CancelTicketAction`, `BuildCancellationReportAction`, `ExportCancellationReportAction`. Los controladores no calculan.
- **Resources:** `CancellationReasonResource`, `TicketHistoryResource` (añade `cancellation_reason_code`, `cancellation_reason_label`), `CancellationReportResource`. Ningún Resource calcula reglas.
- **Policies:** no hay Policy por registro en el reporte (es global de `admin`). La cancelación mantiene su regla de dueño en `CancelTicketRequest::authorize`.
- **Tabla afectada (DBR-024):** `tickets`, una columna nueva `cancellation_reason_code VARCHAR(30) NULL` sin valor por defecto, sin FK, sin índice nuevo (DBR-024, «Índice»). Filas anteriores: NULL = «Sin clasificar (anterior)», sin backfill (Constitución V).
- **Consultas:** por `purchased_at` (índice `idx_tickets_purchased_at`, ya existente) y `status`. Agregación en PHP con `cursor()` como api-007 (volumen bajo; sin SQL específico de proveedor).
- **Campos que NO cambian:** `status`, `cancelled_at`, `cancelled_by`, `cancellation_reason` (sigue existiendo, ahora solo comentario), `deleted_at`, `updated_by`.
- **`updated_at`:** `tickets` no tiene esa columna (`$timestamps = false`). CA-22 se prueba con un snapshot de columnas (pregunta 6).
- **Auditoría (Activitylog desde las Actions):**
  - `ticket-cancelled`: actor, folio, `total_amount`, `reason_code`, `reason` (comentario). Sin contraseña (api-009 CA-28, api-021 RN-05).
  - `report-cancellations-exported`: actor, formato, periodo (`from`, `to`, `type`), zona, filtros (`cashier_id`, `reason_code`). Se escribe antes de entregar; si falla, la respuesta es error y no hay archivo (CA-21).
- **Errores y compatibilidad:**
  - 401 sin sesión; 403 sin permiso, sin 2FA, sin confirmación de Ventana (api-021) o `cashier` en el reporte; 404 boleto ajeno o inexistente (api-009 CA-13); 422 en español para periodo, filtro, motivo, comentario, formato y tope de PDF; 429 límite de cancelación (api-009 RN-30); 5xx fallo de generación sin archivo parcial.
  - **Compatibilidad:** cancelar sin `reason_code` responde 422 desde el despliegue. `dashboard-005`/`dashboard-016` deben desplegarse junto a la API. Un cliente antiguo que envía solo `reason` deja de funcionar: es el cambio de contrato aprobado.
  - Los campos añadidos a `TicketHistoryResource` son aditivos; `cancellation_reason` conserva su nombre.

### Reutilización de exportadores (api-007, ADR 0017)

- Recomendado: **documento común**. `ReportDocument` (título, pares de metadatos, secciones `{title, headers, rows}`) lo renderizan los tres writers. api-007 construye su documento con un mapeo que reproduce hoy su salida (mismas cabeceras, mismo orden, mismo BOM UTF-8 en CSV, mismo nombre de hoja/PDF). El cambio se valida con la regresión de `TicketReportExportTest` antes de que el reporte de cancelaciones lo use.
- Alternativa si la regresión de api-007 no es limpia: writers nuevos que comparten solo los helpers (sanitizado CSV `sanitize()`, creación de hoja OpenSpout, plantilla Dompdf), sin tocar los de api-007. Decisión del equipo; el plan recomienda la primera.
- Bloque de metadatos común (CA-19): «Generado por» (nombre y rol), «Generado (UTC)», «Generado (zona de negocio)», «Periodo», «Zona horaria», «Filtros» (cajero y motivo, o «Todos»), «Formato». El comentario sale en todas las filas (decisión 8 de la spec).
- Tope de PDF: `arca.report_pdf_max_tickets` (2000) cuenta las filas de boletos cancelados del documento (RN-10).
- Temporales de Excel y PDF: `ReportTempDirectory`, borrado tras el envío (sin cambio).

## Seguridad, offline y operación

- **Datos sensibles:** importes, folios, fechas y nombres de personal; el comentario de `other` puede contener datos del visitante. Solo `admin` con `reports.cancellations.view` y 2FA lo ve o exporta; `zoo-admin` y `executive` no (aunque tienen `reports.view`, CA-03).
- **Mínimo privilegio:** el permiso nuevo no se reutiliza `reports.view` (RN-01). La UI solo oculta; el servidor autoriza (api-007 RN-07).
- **Inmutabilidad:** el reporte solo lee; no existe ruta de edición, reactivación ni borrado (RN-05, Constitución V).
- **Secretos:** la contraseña de api-021 nunca llega a Activitylog ni a respuestas. La exportación no incluye hashes ni tokens.
- **Caché y archivos:** `Cache-Control: no-store`; temporales eliminados tras el envío.
- **Límites de frecuencia:** ninguno nuevo para consultas (RN-14). La decisión de limitar la exportación con `throttle:20,1` de api-007 está en pregunta 7.
- **Observabilidad:** los eventos de auditoría son la traza; no se añade logging de contenido de filas.
- **Portabilidad (ADR 0013):** `VARCHAR` nulo sin default, consultas Eloquent y agregación en PHP. Sin funciones, vistas, triggers ni procedimientos. Sin cambios de `.env` propios; la zona de sesión en UTC llega con api-025.
- **Offline:** no aplica. Sin conexión no hay cancelación ni reporte (spec, «Flujos y errores», punto 5).
- **Migración y datos existentes:** sin backfill. Los 3 boletos cancelados de `arca_pruebas` (DBR-024, «Estado actual») quedan «Sin clasificar (anterior)».

### Verificación previa obligatoria (antes de aprobar el plan y de la migración)

- Consulta de solo lectura en `arca_pruebas` aportada por la sesión principal, con fecha:
  1. `tickets.cancellation_reason`: **resuelto 2026-11-20**, `varchar(255)` admite NULL (`php artisan db:table tickets`, solo lectura). No bloquea.
  2. Confirmar que `cancellation_reason_code` no existe (repetir justo antes de aprobar, DBR-024 «Verificaciones», punto 1).
  3. Número de filas canceladas (ya consultado: 3 de 34, 2026-11-20).
- Estos resultados se registran en la DBR y en la spec (si cambian), no en este plan.

## Mapeo de criterios a pruebas

Convención: `test_caNN_…` en el nombre del método o en el docblock. Rutas bajo `apps/api/src/tests/`. Todas las pruebas de feature usan `DatabaseTransactions` sobre `arca_pruebas` (nunca `RefreshDatabase`, nunca `arca_zoo`).

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | `test_ca01_admin_with_permission_and_two_factor_gets_report_shape` en `Feature/Admin/CancellationReportAccessTest.php` | API / tests |
| CA-02 | `test_ca02_roles_without_permission_get_403_and_no_data`, `test_ca02_anonymous_gets_401`, `test_ca02_admin_without_two_factor_gets_403` en `Feature/Admin/CancellationReportAccessTest.php` (también para la exportación) | API / tests |
| CA-03 | `test_ca03_zoo_admin_with_reports_view_is_forbidden` en `Feature/Admin/CancellationReportAccessTest.php` | API / tests |
| CA-04 | `test_ca04_week_or_month_without_date_returns_422`, `test_ca04_custom_range_rules_return_422` en `Feature/Admin/CancellationReportPeriodTest.php` | API / tests |
| CA-05 | `test_ca05_cashier_and_reason_filters_recalculate_everything`, `test_ca05_invalid_reason_code_or_cashier_returns_422` en `Feature/Admin/CancellationReportPeriodTest.php` | API / tests |
| CA-06 | `test_ca06_row_contains_all_listed_fields_for_cancelled_tickets_only` en `Feature/Admin/CancellationReportRowsTest.php` | API / tests |
| CA-07 | `test_ca07_minutes_are_floored_0m59s_is_0_and_2m05s_is_2` en `Unit/CancellationMinutesTest.php` | API / tests |
| CA-08 | `test_ca08_row_without_code_shows_unclassified_label_and_keeps_amounts` en `Feature/Admin/CancellationReportRowsTest.php` | API / tests |
| CA-09 | `test_ca09_soft_deleted_cashier_name_stays_visible` en `Feature/Admin/CancellationReportRowsTest.php` | API / tests |
| CA-10 | `test_ca10_returns_five_codes_in_order_with_labels`, `test_ca10_without_tickets_cancel_is_403` en `Feature/Tickets/CancellationReasonsTest.php` | API / tests |
| CA-11 | `test_ca11_missing_or_unknown_reason_code_is_422_and_no_change` en `Feature/Tickets/CancelTicketReasonTest.php` | API / tests |
| CA-12 | `test_ca12_other_comment_length_14_or_256_is_422_and_15_or_255_is_accepted` en `Feature/Tickets/CancelTicketReasonTest.php` | API / tests |
| CA-13 | `test_ca13_saves_code_and_comment_separately_without_label` en `Feature/Tickets/CancelTicketReasonTest.php` | API / tests |
| CA-14 | `test_ca14_totals_and_breakdowns_add_up_to_general_total` en `Feature/Admin/CancellationReportTotalsTest.php` | API / tests |
| CA-15 | `test_ca15_each_day_row_satisfies_gross_equals_net_plus_cancelled` en `Feature/Admin/CancellationReportTotalsTest.php` | API / tests |
| CA-16 | `test_ca16_cashier_reconciliation_and_active_days` en `Feature/Admin/CancellationReportTotalsTest.php` | API / tests |
| CA-17 | `test_ca17_daily_net_equals_daily_revenue_of_tickets_report_with_cancellations` en `Feature/Admin/CancellationReportParityTest.php` | API / tests |
| CA-18 | `test_ca18_alert_for_cancel_after_30_minutes`, `test_ca18_alert_for_cashier_above_10_percent_with_20_sold`, `test_ca18_alerts_do_not_block_or_change_data` en `Feature/Admin/CancellationReportAlertsTest.php` | API / tests |
| CA-19 | `test_ca19_three_formats_share_rows_totals_and_metadata_block` en `Feature/Admin/CancellationReportExportTest.php` | API / tests |
| CA-20 | `test_ca20_unknown_format_is_422`, `test_ca20_pdf_over_max_rows_is_422_with_limit` (con tope de configuración bajo para la prueba) en `Feature/Admin/CancellationReportExportTest.php` | API / tests |
| CA-21 | `test_ca21_export_is_audited_with_actor_format_period_filters`, `test_ca21_audit_failure_returns_error_without_file` en `Feature/Admin/CancellationReportExportTest.php` | API / tests |
| CA-22 | `test_ca22_query_and_export_do_not_change_cancelled_ticket_snapshot` en `Feature/Admin/CancellationReportImmutabilityTest.php` | API / tests |
| CA-23 | `test_ca23_cancel_audit_records_actor_folio_amount_code_and_comment_without_secrets` en `Feature/Tickets/CancelTicketReasonTest.php`; un boleto ya cancelado no se cancela de nuevo (regresión `CancelTicketTest`) | API / tests |
| CA-24 | `test_ca24_non_other_code_accepts_optional_comment_up_to_255_and_rejects_256` en `Feature/Tickets/CancelTicketReasonTest.php` | API / tests |
| CA-25 | `test_ca25_alert_thresholds_follow_config_value` en `Feature/Admin/CancellationReportAlertsTest.php` | API / tests |

Pruebas unitarias del catálogo (RN-02): `Unit/TicketCancellationReasonTest.php` (cinco casos, etiquetas, solo `other` exige comentario).

### Regresión (actualizar sin relajar CA)

- `Feature/Tickets/CancelTicketTest.php`: la cancelación envía `reason_code`; las aserciones de `cancellation_reason` pasan a código y comentario.
- `Feature/Tickets/CancelTicketValidationTest.php`: los casos sin motivo pasan a `reason_code`; sigue sin cambiar el boleto en 422.
- `Feature/Tickets/TicketHistoryTest.php`: aserción de claves exactas del historial; se añaden las claves nuevas (aditivo).
- `Feature/Admin/TicketReportExportTest.php` y `Feature/Admin/ReportAccessTest.php`: deben seguir en verde tras el refactor de exportadores (regresión de api-007).
- `Feature/Admin/GlobalSearchFieldsTest.php` y `GlobalSearchRecordsTest.php`: su motivo de cancelación se fija a la etiqueta (pregunta 3).
- Pruebas de api-021 y api-025 que cancelan (`CancelTicketSameDayTest`, `TicketCancellableZoneTest`): envían `reason_code` (T de esta spec).

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | Sin dependencia nueva: Excel y PDF por ADR 0017 ya aceptado. Conexión solo por `.env`. Columna `VARCHAR` nula sin funciones ni triggers (DBR-024, «Compatibilidad MySQL 8.0»). |
| II. La spec manda | Sí, con condición | Spec 022 Aprobada (2026-11-20) con sus decisiones. Plan y tasks enlazados con el mismo NNN-slug. **Condición:** el plan se aprueba antes de programar. Divergencias registradas en «Riesgos y decisiones», sin editar la spec. |
| III. Lógica separada de la interfaz | Sí | Totales, conciliación, alertas, minutos y catálogo en Actions. Controladores delgados. El dashboard solo presenta (`apps/dashboard/plan/016-…`). Test estático de la SPA (CA-23 de dashboard-016). |
| IV. Un test por criterio | Sí | Mapeo completo de CA-01 a CA-25 (tabla anterior). Verificación por búsqueda de `test_caNN_` antes de cerrar. |
| V. Una sola fuente de verdad para los datos | Sí, con condición | Cambio de esquema solo por migración tras DBR-024 aprobada; la crea y prueba BD. Backend no escribe la migración. `Ticket` mantiene SoftDeletes y auditoría (ADR 0021). Sin borrado físico. Sin backfill. **Condición:** DBR-024 en `Lista para backend`. |
| VI. Código en inglés, personas en español | Sí | Enum, Actions, rutas, permisos y códigos en inglés; etiquetas, mensajes y metadatos de exportación en español. |

Brechas abiertas: ninguna que requiera ADR. Condiciones: aprobación del plan, DBR-024 en `Lista para backend`. La nulabilidad de `cancellation_reason` quedó verificada (admite NULL, 2026-11-20).

## Riesgos y decisiones

- **ADR requerido/aprobado:** ninguno nuevo. ADR 0017 y 0021 aplican sin cambio.
- **Dependencia bloqueante:** DBR-024 es Borrador; sin `Lista para backend` no hay código que escriba `cancellation_reason_code`.
- **Nulabilidad de `cancellation_reason`:** resuelto. Verificado en solo lectura el 2026-11-20 (`php artisan db:table tickets`): `cancellation_reason varchar(255)` **admite NULL**. No hace falta reabrir la DBR.
- **Cambio de contrato de cancelar:** `reason` libre deja de bastar. Riesgo de romper la taquilla antes del despliegue del dashboard: desplegar junto (DBR-024 → API → dashboard).
- **Divergencias detectadas (no corregidas aquí; se reportan para decisión):**
  1. **`docs/database/requests/DBR-024-…md`, «Propósito»:** dice que `cancellation_reason` «guarda la etiqueta del motivo cuando el código no es `other`». Contradice RN-03 de la spec 022 y la decisión del solicitante (`cancellation_reason` guarda solo el comentario). La DBR debe corregirse antes de aprobarse.
  2. **`apps/api/specs/009-ticket-sales.md`, «Nota de revisión (2026-11-20, Borrador de api-022)»:** dice «Cambio pendiente de aprobación de Jonathan», mientras la spec 022 figura Aprobada el mismo día. Confirmar que el cambio de contrato de api-009 queda aprobado.
  3. **CA-22 (`updated_at`):** `tickets` no tiene `updated_at`. Pregunta 6.
  4. **CA-04 frente a api-007 CA-20:** api-007 usa la fecha de hoy si falta `date`; CA-04 de api-022 dice 422. Pregunta 1.
  5. **Historial y búsqueda global:** `TicketHistoryResource` (api-009 CA-14), `TicketHistoryView` del dashboard y `SearchTicketHistoryGroup` (api-019) muestran `cancellation_reason` como motivo. Con el cambio, mostrarían solo el comentario. Pregunta 3.
  6. **Zona de la fila de `dashboard-016` CA-07 y `api-025` CA-12:** consistentes; sin divergencia.
- **Preguntas abiertas (máximo 8; hasta contestarlas, las partes afectadas quedan en pendiente):**
  1. CA-04: ¿`period=week|month` sin `date` responde 422 (literal de CA-04) o usa la fecha de hoy como `api-007` CA-20? Propuesta del plan: 422, según el texto aprobado; confirmar.
  2. Filas del reporte: ¿la API las pagina (`report_page_size` = 50, como api-007) o devuelve todas las del periodo? Propuesta: todas (el reporte de cancelaciones es pequeño y la conciliación ya necesita el conjunto completo).
  3. Motivo visible en historial y búsqueda: ¿se muestra la etiqueta además del comentario? Propuesta: sí; `cancellation_reason_label` en `TicketHistoryResource` y en el grupo de búsqueda; `cancellation_reason` sigue siendo el comentario.
  4. Umbrales: «más de 30 minutos» = segundos > 1800 (propuesta); «boletos vendidos» para el 10 % = suma de cantidades, como CA-14 y RN-15 de api-007 (propuesta); porcentaje = cantidad cancelada / cantidad bruta del cajero.
  5. Periodo del listado: ¿por `purchased_at` (día de venta, propuesta)? Equivale al día de cancelación por api-009 RN-16.
  6. CA-22: ¿se acepta comparar un snapshot de columnas (estado, importes, fechas, código, comentario, `updated_by`, `deleted_at`) en lugar de `updated_at`?
  7. Exportación: ¿se mantiene `throttle:20,1` de api-007 o no se añade límite (RN-14)? Propuesta: mantener el mismo límite que api-007.
  8. `cashier_id`: ¿el filtro admite cajeros eliminados lógicamente (RN-12)? Propuesta: sí.
- **Alternativas y mitigaciones:** refactor de exportadores (documento común) frente a writers nuevos (ver «Reutilización de exportadores»); mitigado por regresión de api-007.

## Orden y aprobación

1. Aprobación de este plan (equipo / Jonathan) y respuestas a las preguntas 1 a 8.
2. Verificación de nulabilidad de `cancellation_reason` y repetición de la consulta de `cancellation_reason_code` (solo lectura, `arca_pruebas`).
3. DBR-024: revisión de BD (Víctor Adrián, por confirmar) y backend; corrección de su «Propósito» (divergencia 1); estado `Aprobada` con fecha; migración y pruebas por BD; `Lista para backend`.
4. Prerrequisitos de implementación: api-021 y api-025 implementadas (ver «Orden»).
5. Backend de api-022 (tareas T-05 en adelante) con DBR-024 en `Lista para backend`.
6. `packages/api-client` y dashboard (`apps/dashboard/plan/016-…`), tras los endpoints de la API y tras `dashboard-015` y `dashboard-019`.
7. `/verify` de api y dashboard; enlace de spec, plan y tasks en el PR; commit citando `api-022`.

Dependencias con otros cambios: `routes/api.php` (021 middleware; 022 rutas; 023 usuarios y consola; 024 pending-counts); `CancelTicketAction`/`TicketCancelController`/`CancelTicketRequest` (021 confirmación; 025 zona; 022 código de motivo); `RolesAndPermissionsSeeder` y `config/arca.php` (021 `two_factor_roles`; 025 `arca.timezone`; 022 `reports.cancellations.view` y `cancellation_alerts`; 023 roles nuevos).

- Revisión técnica: pendiente (equipo).
- Aprobador funcional: Jonathan (spec aprobada 2026-11-20).
- Fecha de aprobación del plan: pendiente.
- Evidencias: pendientes (DBR-024, verificación de nulabilidad, salida de pruebas).
