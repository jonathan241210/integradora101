# Plan técnico · 027 · cancellation-review-signals

- Spec: `apps/api/specs/027-cancellation-review-signals.md`
- Spec de consumidor: `apps/dashboard/specs/021-cancellation-review-signals.md`; plan en `apps/dashboard/plan/021-cancellation-review-signals.md`
- Estado de spec: Implementada
- Solicitada: 2026-11-21
- Aprobada: 2026-11-21
- Estado del plan: **Aprobado — aprobación técnica: el responsable funcional**. Las tareas de `tasks/027-cancellation-review-signals.md` se ejecutan en orden, condicionadas a DBR-026 en «Lista para backend» (T-01 de BD).
- Responsable técnico: el responsable funcional (backend, según la spec).
- Responsable de BD: Responsable de BD (DBR-026).
- DBR relacionada: `docs/database/requests/DBR-026-cancellation-reviews.md` (tabla `cancellation_reviews`). Ninguna migración ni código que use la tabla se escribe antes de que la DBR esté en `Lista para backend`.
- ADR relacionados: ninguno nuevo. ADR 0013 (portabilidad), ADR 0017 (exportación sin dependencia nueva), ADR 0021 (`Ticket` sin `BaseModel`, con SoftDeletes).

## Diseño de solución

El semáforo es una capa de cálculo sobre `api-022`. Una sola Action calcula, por cajero y día, las señales, el nivel, el porqué y la acción. El reporte de `api-022` y el conteo de `api-024` usan esa misma Action, de modo que nunca dan cifras distintas.

Componentes:

1. **Configuración.** Bloque `cancellation_review` en `config/arca.php` con los valores de la spec (RN-04). Los dos umbrales ya existentes (`cancellation_alerts`) se reutilizan para S1 y S5 mediante referencia, no se duplican.
2. **Enums.**
   - `App\Enums\CancellationSignal` (`over_limit_percent`, `late_cancellations`, `repeated_other`, `same_amount`, `long_cancellations`, `own_baseline`, `peer_comparison`), con `label()` en español.
   - `App\Enums\CancellationReviewLevel` (`normal`, `review`, `attention`), con `label()`.
   - `App\Enums\CancellationReviewStatus` (`reviewed_ok`, `clarification_required`), con `label()`.
3. **Action de semáforo** `App\Actions\Admin\Reports\BuildCancellationTrafficLightAction`. Entrada: periodo resuelto y el conjunto de cajeros con actividad. Calcula primero las agregaciones de todo el conjunto (sin filtros de cajero ni de motivo, RN-06) y después presenta solo lo pedido. Devuelve `cashier_days[]`, `legend[]` y `disclaimer`. Lee las revisiones vigentes con la acción de lectura de revisiones.
4. **Action de presentación de porqué y acción** `App\Actions\Admin\Reports\PresentCancellationReasonsAction`. Convierte señales en `reasons[]`, `reason_sentence` y `action` (RN-05, CA-13, CA-14). Es la única fuente de estos textos.
5. **Action de revisión** `App\Actions\Admin\Reports\RecordCancellationReviewAction`. Valida reglas de negocio que el Form Request no puede (día con actividad; repetir el mismo estado sí se permite y crea otra entrada), inserta la fila dentro de una transacción junto con el registro de Activitylog. Si el registro falla, revierte (CA-21).
6. **Action de lectura de historial** `App\Actions\Admin\Reports\ListCancellationReviewsAction`.
7. **Action de pendientes** `App\Actions\Admin\Reports\CountPendingCancellationDaysAction`. La llama `GetPendingReviewCountsAction` (`api-024`) solo si el usuario tiene `reports.cancellations.view`.
8. **Modelo** `App\Models\CancellationReview`, con SoftDeletes y relaciones `cashier()` y `reviewer()` con `withTrashed()` (RN-09). Sin borrado en ninguna Action (RN-07). Si el modelo exige `created_by`/`updated_by` por `BaseModel`, se decide con BD en DBR-026; por defecto usa `reviewed_by`.
9. **Controlador delgado** `App\Http\Controllers\Admin\CancellationReviewController` (`store`, `index`).
10. **Form Request** `App\Http\Requests\Admin\Reports\StoreCancellationReviewRequest`: `cashier_id` requerido y existente con rol `cashier` (incluidos eliminados lógicamente), `business_date` requerido `date_format:Y-m-d`, `status` requerido y enum, `note` requerido con `prepareForValidation` que recorta espacios, `min:15`, `max:255`. Mensajes en español.
11. **Demostración** `App\Console\Commands\DemoCancellationReviewsCommand` (`arca:demo:cancellation-reviews`), con `--days=N` (CA-32). Ver «Datos de demostración».

### Contrato JSON

Todas las respuestas usan nombres en inglés y etiquetas en español. Los importes son cadenas con dos decimales.

- `GET /api/v1/admin/reports/cancellations` (nombre `reports.cancellations.show`, sin cambio de ruta): bloques de `api-022` y, en `reconciliation`, un bloque nuevo `cashier_days[]` (decisión del plan: un bloque propio, no mezclado con `days` ni `cashiers`, porque su unidad es cajero × día):
  ```json
  "reconciliation": {
    "days": [...], "cashiers": [...],
    "cashier_days": [
      {
        "cashier_id": 7, "cashier_name": "Laura Cruz", "date": "2026-11-18",
        "traffic_light": "attention", "traffic_light_label": "Atención",
        "signals_count": 3,
        "reasons": [
          { "code": "over_limit_percent", "label": "Más del 10 % cancelado", "count": 4, "detail": "16 % de 25 boletos" },
          { "code": "repeated_other", "label": "Motivo «Otro» repetido", "count": 2, "detail": "2 cancelaciones con motivo Otro" },
          { "code": "own_baseline", "label": "Distinto a su propio histórico", "count": 4, "detail": "16 % frente a 3 % habitual en 4 semanas" }
        ],
        "reason_sentence": "3 señales: 16 % cancelado frente a 3 % habitual de las últimas 4 semanas, 2 cancelaciones con motivo «Otro» y 4 boletos cancelados.",
        "action": "Compara el neto con el dinero entregado y pide al cajero que explique las cancelaciones marcadas.",
        "review": null
      }
    ]
  }
  ```
  - Nivel Normal: `reasons: []`, `reason_sentence: null`, `action` como en RN-05.
  - Grupo sin cajero: `cashier_id: null`, `traffic_light: null`, `action: "No aplica: el día no tiene cajero registrado."`.
  - `review`: `null` o `{ "id", "status", "status_label", "note", "reviewed_by_name", "reviewed_at" }` (CA-28).
- `legend`: `[ { "code", "label", "explanation", "limit" } ]` y `disclaimer: "Una alerta no prueba nada: solo indica qué revisar."` (CA-26). Los límites se generan desde la configuración en la Action.
- `GET /api/v1/admin/reports/cancellations/reviews` (nombre `reports.cancellations.reviews.index`): parámetros `cashier_id` y `business_date` obligatorios; `data[]` ordenado por `id` descendente con los campos de `review`.
- `POST /api/v1/admin/reports/cancellations/reviews` (nombre `reports.cancellations.reviews.store`): cuerpo `{ "cashier_id", "business_date", "status", "note" }`. Respuesta `201 { "data": { review } }`. Errores 422 en español (CA-18, CA-19), 403, 401, 429 (CA-22).
- `GET /api/v1/admin/pending-counts` (`api-024`): nueva clave `cancellation_days` (entero ≥ 0), solo con `reports.cancellations.view` (CA-23, CA-24). Sin envoltorio `data`, como fija `api-024`.
- `GET /api/v1/admin/reports/cancellations/export`: sin cambio de firma; incluye el bloque de semáforo y la leyenda (CA-25).

Enumeraciones de `status` y nivel en la respuesta: valores en inglés; etiquetas en español.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| API / datos (BD, responsable de BD) | `database/migrations/` (migración tras DBR-026) | Tabla `cancellation_reviews` con índices de DBR-026. La escribe y prueba BD. |
| API / configuración | `config/arca.php` (bloque `cancellation_review`) | Umbrales de RN-04 con valores por defecto. Sin variables de entorno obligatorias. |
| API / dominio | `app/Enums/CancellationSignal.php`, `CancellationReviewLevel.php`, `CancellationReviewStatus.php` (nuevos) | Códigos y etiquetas en español. |
| API / modelos | `app/Models/CancellationReview.php` (nuevo) | Fila de revisión con SoftDeletes, relaciones con `withTrashed()`. |
| API / Actions | `BuildCancellationTrafficLightAction`, `PresentCancellationReasonsAction`, `RecordCancellationReviewAction`, `ListCancellationReviewsAction`, `CountPendingCancellationDaysAction` (nuevas) | Semáforo, porqué, revisión, historial y pendientes (RN-01). |
| API / Actions | `BuildCancellationReportAction` (adaptada), `ExportCancellationReportAction` y `ReportDocument` (adaptados) | Añaden el bloque `cashier_days`, `legend` y las columnas de semáforo (CA-01, CA-25). El conteo de filas y el tope de PDF no cambian. |
| API / Actions | `GetPendingReviewCountsAction` (`api-024`, adaptada) | Añade la clave `cancellation_days` con su permiso (CA-23, CA-24). |
| API / requests | `StoreCancellationReviewRequest` (nueva) | Validación en español (CA-18). |
| API / controladores | `CancellationReviewController` (nuevo) | Delegación pura. |
| API / resources | `CancellationReviewResource` (nuevo); `CancellationReportResource` (campos nuevos) | Forma de respuesta. |
| API / rutas | `routes/api.php` | Dentro del grupo `admin` con 2FA: `reports.cancellations.reviews.index` y `reports.cancellations.reviews.store` (`permission:reports.cancellations.view`), y el throttle `throttle:20,1` en el `store` (CA-22). |
| API / comando | `app/Console/Commands/DemoCancellationReviewsCommand.php` (nuevo) | Datos de demostración (CA-29 a CA-33). |
| API / permisos | Sin cambio en `RolesAndPermissionsSeeder`. `reports.cancellations.view` ya existe (`api-022`). | — |
| API / tests | Ver «Mapeo de criterios a pruebas» | Un test por CA. |
| API / documentación | `apps/api/docs/administracion.md`, `apps/api/docs/tickets.md` | Contrato nuevo y permisos. |
| Cliente(s) | `packages/api-client` y `apps/dashboard` en `plan/021` | — |
| Paquetes/documentación | `docs/03-roles-y-permisos.md`: sin cambio de permisos (solo se confirma que `reports.cancellations.view` cubre la revisión, decisión 8) | — |

## Contrato y datos

- **Endpoints y permisos:** ver «Contrato JSON». Todos bajo `/api/v1/admin` con `auth:sanctum`, `staff.user`, `administrator.two-factor` y `permission:reports.cancellations.view`.
- **Orden de comprobaciones en el `POST`:** sesión → 2FA → permiso → límite de frecuencia → validación (422) → reglas de negocio (día con actividad) → transacción (inserción y auditoría) → 201.
- **Validación:** `StoreCancellationReviewRequest` (reglas de la spec, RN-08). Día con actividad y fecha no futura se validan en la Action, porque dependen de datos.
- **Actions:** toda regla de semáforo, de porqué, de acción, de pendientes y de revisión vive en Actions (RN-01). Los controladores y resources no calculan.
- **Policies:** no hay Policy por registro; el permiso de ruta es la autorización.
- **Tabla afectada (DBR-026):** `cancellation_reviews`. Sin FK nueva sobre `tickets`.
- **Consultas:**
  - Agregación en PHP con `cursor()` sobre `tickets` (`status` en `completed` y `cancelled`, `purchased_at` en el rango del periodo y de las ventanas de C1 y C2), como `api-022`.
  - Revisión vigente: última fila por `(cashier_id, business_date)` con `MAX(id)` o `orderByDesc('id')->first()` por par; con `cashier_id` nunca nulo (RN-10).
  - Pendientes: pares cajero-día de los 7 días cerrados; usa la misma Action.
- **Errores y compatibilidad:** endpoints y campos nuevos, aditivos. `api-022` no cambia su contrato. `pending-counts` añade una clave; las demás se mantienen.

## Seguridad, offline y operación

- **Datos sensibles:** nombres de personal y notas de revisión. Solo `admin` con 2FA (CA-02).
- **Mínimo privilegio:** el permiso de ruta; ocultar la sección no basta (`api-022` RN-01).
- **Inmutabilidad:** ninguna ruta actualiza ni borra revisiones (RN-07, CA-20). Pruebas de snapshot.
- **Auditoría:** `cashier-day-reviewed` en la misma transacción que la inserción (CA-21).
- **Frecuencia:** `throttle:20,1` solo en el `POST` (CA-22); el `GET` del reporte mantiene su límite de `api-022`. Los conteos mantienen `api-024` (60/min).
- **Coste de cálculo:** agregación en PHP; el semáforo carga hasta 28 días anteriores para C1. Se mide con datos reales en la tarea de pruebas de carga (T-24). Si el coste crece, se abre spec de caché; no hay caché persistente en esta versión (RN-15).
- **Offline:** no aplica.
- **Observabilidad:** eventos de Activitylog; sin logging del contenido de notas ni de filas.
- **Portabilidad (ADR 0013):** Eloquent y agregación en PHP; sin funciones, vistas ni triggers. Sin variables de entorno nuevas obligatorias.
- **Secretos:** `DEMO_STAFF_PASSWORD` solo en `.env` (`config/arca.php` ya lo lee).

## Datos de demostración

Decisión del responsable funcional: los datos de demostración se quedan en `arca_pruebas`, no se excluyen de los reportes y se ven como datos normales. Se implementa así:

- **Cajeros:** tres cuentas con rol `cashier` y correo `demo-cancel-1@arca.local`, `demo-cancel-2@arca.local`, `demo-cancel-3@arca.local`, con nombres claros. Contraseña solo desde `DEMO_STAFF_PASSWORD` en `.env`.
- **Días:** para cada cajero, días de negocio recientes con actividad que cubran Normal, Revisar y Atención (cada uno al menos un cajero-día, CA-31). Los valores concretos se fijan en el seeder y se comprueban con la misma Action del reporte.
- **Idempotencia (CA-30):** cada boleto de demostración tiene `qr_code` con prefijo `DEMO-CANCEL-{AAAAMMDD}-{nn}`, que es único en la tabla. El comando inserta solo los `qr_code` que no existen, y crea cajeros solo si su correo no existe.
- **Regeneración de fechas (CA-32):** `--days=N` agrega días nuevos hasta hoy en zona de negocio, con los mismos patrones de Normal, Revisar y Atención. Las filas existentes no se tocan (snapshot en tests).
- **Excepción acotada:** las cancelaciones se escriben directamente, no con `CancelTicketAction`, porque `api-009` RN-16 impide cancelar días pasados. Cada cancelación cae en el día de negocio de su venta (RN-02) y se registra en Activitylog con `ticket-cancelled` y `demo = true`.
- **Guardas (CA-29):** el comando aborta sin escribir si `DB_DATABASE` no es `arca_pruebas` o `APP_ENV = production`. No tiene opción de borrado físico. Si hiciera falta retirarlos, se haría con borrado lógico (`deleted_at`) en una tarea aparte aprobada.
- **Sin exclusión en reportes:** ningún filtro del reporte, de la exportación ni de los conteos excluye cajeros demo (CA-33).

## Mapeo de criterios a pruebas

Convención: `test_caNN_…` en el nombre del método o en el docblock. Rutas bajo `apps/api/src/tests/`. Pruebas de feature con `DatabaseTransactions` sobre `arca_pruebas` (nunca `RefreshDatabase`, nunca `arca_zoo`, nunca migraciones desde tests).

| Criterio | Prueba automatizada | Ubicación |
|---|---|---|
| CA-01 | `test_ca01_admin_gets_cashier_day_traffic_light_and_legend` | `Feature/Admin/CancellationTrafficLightTest.php` |
| CA-02 | `test_ca02_roles_without_permission_get_403_on_all_review_routes` | `Feature/Admin/CancellationReviewAccessTest.php` |
| CA-03 | `test_ca03_read_routes_write_nothing` | `Feature/Admin/CancellationReviewAccessTest.php` |
| CA-04 | `test_ca04_over_limit_percent_needs_more_than_10_and_10_sold` | `Feature/Admin/CancellationSignalsTest.php` |
| CA-05 | `test_ca05_late_cancellations_window_is_inclusive_30_min_before_last_sale` | `Feature/Admin/CancellationSignalsTest.php` |
| CA-06 | `test_ca06_two_other_reason_cancellations_fire_signal` | `Feature/Admin/CancellationSignalsTest.php` |
| CA-07 | `test_ca07_two_cancellations_with_same_amount_fire_signal` | `Feature/Admin/CancellationSignalsTest.php` |
| CA-08 | `test_ca08_two_cancellations_over_30_minutes_fire_signal` | `Feature/Admin/CancellationSignalsTest.php` |
| CA-09 | `test_ca09_own_baseline_fires_only_with_history_and_floors` | `Feature/Admin/CancellationComparisonTest.php` |
| CA-10 | `test_ca10_peer_median_fires_only_with_two_peers_and_floors` | `Feature/Admin/CancellationComparisonTest.php` |
| CA-11 | `test_ca11_zero_signals_normal`, `test_ca11_one_signal_review`, `test_ca11_two_signals_attention` | `Feature/Admin/CancellationLevelTest.php` |
| CA-12 | `test_ca12_filters_do_not_change_traffic_light` | `Feature/Admin/CancellationLevelTest.php` |
| CA-13 | `test_ca13_reason_sentence_lists_signals_and_counts` | `Feature/Admin/CancellationReasonTextTest.php` |
| CA-14 | `test_ca14_action_texts_per_level_and_no_physical_ticket_request` | `Feature/Admin/CancellationReasonTextTest.php` |
| CA-15 | `test_ca15_lists_every_active_cashier_day_including_normal` | `Feature/Admin/CancellationTrafficLightTest.php` |
| CA-16 | `test_ca16_thresholds_follow_config_value` | `Feature/Admin/CancellationSignalsTest.php` |
| CA-17 | `test_ca17_admin_records_review_row` | `Feature/Admin/CancellationReviewStoreTest.php` |
| CA-18 | `test_ca18_invalid_review_returns_422_and_no_row` | `Feature/Admin/CancellationReviewStoreTest.php` |
| CA-19 | `test_ca19_same_status_repeated_creates_new_history_entry` | `Feature/Admin/CancellationReviewStoreTest.php` |
| CA-20 | `test_ca20_history_newest_first_and_no_row_changed` | `Feature/Admin/CancellationReviewHistoryTest.php` |
| CA-21 | `test_ca21_review_is_audited_and_rolled_back_if_audit_fails` | `Feature/Admin/CancellationReviewStoreTest.php` |
| CA-22 | `test_ca22_review_post_throttled_20_per_minute` | `Feature/Admin/CancellationReviewStoreTest.php` |
| CA-23 | `test_ca23_cancellation_days_counts_attention_without_review` | `Feature/Admin/PendingReviewCountsCancellationTest.php` |
| CA-24 | `test_ca24_pending_counts_keys_follow_each_permission` | `Feature/Admin/PendingReviewCountsCancellationTest.php` |
| CA-25 | `test_ca25_three_formats_include_traffic_light_and_legend` | `Feature/Admin/CancellationReportExportTest.php` |
| CA-26 | `test_ca26_legend_lists_each_signal_with_limit_and_disclaimer` | `Feature/Admin/CancellationTrafficLightTest.php` |
| CA-27 | `test_ca27_cashier_days_identical_across_pages` | `Feature/Admin/CancellationReportPaginationTest.php` |
| CA-28 | `test_ca28_traffic_light_shows_current_review_or_null` | `Feature/Admin/CancellationReviewHistoryTest.php` |
| CA-29 | `test_ca29_demo_command_refuses_other_database_or_production` | `Feature/Console/DemoCancellationReviewsCommandTest.php` |
| CA-30 | `test_ca30_demo_command_is_idempotent` | `Feature/Console/DemoCancellationReviewsCommandTest.php` |
| CA-31 | `test_ca31_demo_data_covers_all_three_levels` | `Feature/Console/DemoCancellationReviewsCommandTest.php` |
| CA-32 | `test_ca32_demo_extends_days_without_changing_existing_rows` | `Feature/Console/DemoCancellationReviewsCommandTest.php` |
| CA-33 | `test_ca33_demo_cashiers_appear_in_reports_as_normal_data` | `Feature/Admin/CancellationTrafficLightTest.php` |

Unitarios: `Unit/CancellationReviewLevelTest.php` (combinación de k), `Unit/CancellationReviewStatusTest.php` (etiquetas).

Regresión (sin relajar CA): `Feature/Admin/CancellationReportTest.php` y `ExportCancellationReportTest.php` de `api-022` deben seguir en verde; `Feature/Admin/PendingReviewCountsTest.php` de `api-024` se adapta solo en las aserciones de forma que cambian por la nueva clave.

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | Sin dependencia nueva. Tabla con tipos estándar (DBR-026, «Compatibilidad»). |
| II. La spec manda | Sí | Spec 027 Aprobada; plan y tasks con el mismo NNN-slug. |
| III. Lógica separada de la interfaz | Sí | Semáforo, porqué, acción y pendientes en Actions. Dashboard solo presenta (`dashboard/plan/021`). |
| IV. Un test por criterio | Sí | Mapeo CA-01 a CA-33 (tabla). Evidencia de CI pendiente. |
| V. Una sola fuente de verdad para los datos | Sí, con condición | Cambio de esquema solo por migración tras DBR-026. Revisiones append-only, SoftDeletes sin ruta de borrado. **Condición:** DBR-026 en `Lista para backend`. La demostración no borra nada (RN-17). |
| VI. Código en inglés, personas en español | Sí | Enums, rutas y permisos en inglés; textos y mensajes en español. |

## Riesgos y decisiones

- **ADR requerido/aprobado:** ninguno.
- **Dependencia bloqueante:** DBR-026 (BD). Sin `Lista para backend`, no hay código que escriba revisiones.
- **Coherencia del semáforo:** la misma Action para reporte, exportación y conteo.
- **Decisiones:** cerradas (ver «Decisiones»). No quedan preguntas abiertas en este plan.
- **Alternativas descartadas:** semáforo guardado en tabla (contradice RN-15 y añade estado que puede quedar desfasado); borrado físico de demostración (Constitución V).

## Decisiones

- Reglas del semáforo S1 a S5, C1 y C2 tal como están en la spec, con los valores de la configuración: N = 4 semanas, 7 días para C2, mínimo de 10 boletos. Niveles: 0 Normal, 1 Revisar, 2 o más Atención.
- `cashier_id` NOT NULL en DBR-026. «Sin cajero registrado» no lleva semáforo ni revisión.
- Aviso (`cancellation_days`): Atención sin revisar y «Requiere aclaración», últimos 7 días de negocio cerrados.
- Repetir el mismo estado guarda una entrada nueva del historial (CA-19; test renombrado).
- Sin permiso de escritura aparte; límite de revisiones de 20 por minuto; nota de 15 a 255 caracteres.
- Ventana de C2 de 7 días que termina en el día evaluado; S2 literal (30 min antes de la última venta).
- Evidencia de base: `users.id` es `int` y `activity_log` existe.
- DBR-026 queda en Aprobada; la migración y la evidencia las aporta la sesión principal.

## Orden y aprobación

1. DBR-026 aprobada → migración y pruebas de BD → `Lista para backend` (T-01).
2. Configuración, enums y Action de señales con sus tests (T-02 a T-12).
3. Revisiones: Action, Form Request, rutas, tests (T-13 a T-17).
4. Pendientes en `api-024` (T-18, T-19).
5. Exportación y leyenda (T-20, T-21).
6. Demostración (T-22, T-23).
7. Medición de coste (T-24), documentación (T-25), `/verify` y PR (T-26).
8. Cliente y dashboard en `plan/021`, tras los contratos de la API.

- Revisión técnica: el responsable funcional (aprobación técnica del plan).
- Aprobador funcional: el responsable funcional.
- Evidencias: pendientes de la sesión principal (migración de DBR-026, salida de `php artisan test --filter Cancellation` contra `arca_pruebas`, `migrate:status`). Esta sesión no tiene shell y no afirma que pasen.

## Divergencias de implementación

- **Cajero válido en revisión:** el Form Request reutiliza `ListCancellationCashiersAction::exists()` (rol `cashier` o con boletos, incluso eliminado lógicamente), la misma regla del filtro de `api-022`, en vez de exigir solo el rol. Es un superconjunto; la actividad del día se sigue exigiendo.
- **`legend` y `disclaimer`** van al nivel de `data` del reporte, junto a `rows` (el plan no fijaba el sitio). `cashier_days[]` añade `sold_tickets`, `cancelled_tickets` y `cancel_percent` (aditivos).
- **Orden de la oración del porqué:** C1, C2, S3, S4, S2, S5 y S1 al final (necesario para el texto literal de CA-13); `reasons[]` va en el orden S1 a S5, C1, C2.
- **Conteo de las señales:** S1 y C1/C2 cuentan cantidades canceladas; S2 a S5 cuentan boletos cancelados (S4 suma los de los importes repetidos).
- **`step-up:none`** en `POST /reports/cancellations/reviews`: `StepUpClassificationTest` exige declarar modo en toda escritura admin y la revisión es de bajo riesgo (la nota queda auditada).
- **CA-03 y exportación:** la exportación sigue registrando `report-cancellations-exported` (api-022 CA-21); CA-03 afirma que la lectura no escribe boletos, revisiones ni `cashier-day-reviewed`, y que esa es la única entrada nueva de Activitylog.
- **`PendingReviewCountsAccessTest::test_ca07_403_without_either_permission_and_no_data`** deja de probar `admin`: ahora `admin` tiene `reports.cancellations.view`, que la ruta admite, y recibe `cancellation_days`.
- **Modelo:** `CancellationReview` extiende `Model` con SoftDeletes (no existe `BaseModel` en el repositorio; mismo criterio que `VisitorMemoryReview`).
- **`config/arca.php`** reutiliza `cancellation_alerts` mediante una variable local para S1 y S5; añade `pending_days` = 7 (periodo del aviso).

## Nota: revisión (c), folios y frase clara (aprobada por el responsable funcional)

- `BuildCancellationTrafficLightAction::execute($from, $to, ?$cashierId)` añade los folios por señal (`tickets.id` como texto, orden numérico) y recorta por cajero solo al presentar. `PresentCancellationReasonsAction` genera «Se activaron N señales: …» y `folios[]`; las etiquetas viven en `CancellationSignal::label()`. En S1, C1 y C2 `count` es de boletos (cantidad) y los `folios` son pedidos: pueden diferir si un pedido trae varios boletos. Divergencia: el contrato citaba `qr_code`, pero el folio visible de todo el sistema es `tickets.id` (`qr_code` es oculto); se usa `tickets.id` para coincidir con `rows[].folio`.
