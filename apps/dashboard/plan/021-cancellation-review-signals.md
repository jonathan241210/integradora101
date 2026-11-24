# Plan técnico · 021 · cancellation-review-signals

- Spec: `apps/dashboard/specs/021-cancellation-review-signals.md` (Aprobada)
- Spec de la API: `apps/api/specs/027-cancellation-review-signals.md`; plan de la API en `apps/api/plan/027-cancellation-review-signals.md`
- Estado de spec: Implementada
- Solicitada: 2026-11-21
- Aprobada: 2026-11-21
- Estado del plan: **Aprobado** (aprobación técnica registrada). Las tareas de `tasks/021-cancellation-review-signals.md` se ejecutan tras los contratos de la API (`api-027` T-13, T-16, T-17, T-19) y tras `dashboard-016` y `dashboard-018` en su estado actual.
- Responsable técnico: según la spec.
- DBR relacionada: DBR-026 (solo API; el dashboard no toca esquema).
- ADR relacionados: ninguno.

## Diseño de solución

La pestaña «Cancelaciones» de `dashboard-016` (dentro de «Reportes», `dashboard-020`) añade tres piezas: una sección de semáforo con su leyenda, un diálogo de revisión con historial y el aviso de pendientes en `dashboard-018`. Los datos vienen del reporte de `api-027` (`reconciliation.cashier_days`, `legend`, `disclaimer`), de la revisión vigente de cada fila (`review`), de `POST` y `GET` de revisiones, y de la clave `cancellation_days` de `pending-counts`.

Capas (Constitución III, MVVM):

- **Views** (`views/` y `components/`): solo presentan.
- **ViewModels** (`viewmodels/`): tipos, sanitizado mínimo de la respuesta y decisiones de presentación (por ejemplo, qué opción de diálogo está elegida). No calculan señales.
- **Hooks** (`hooks/`): llaman a `@arca/api-client` y guardan estado en memoria.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| `packages/api-client` | Tipos `CancellationTrafficLightDto`, `CancellationReasonDto`, `CancellationReviewDto`, `CancellationLegendDto`; métodos `createCancellationReview`, `listCancellationReviews`; `PendingReviewCountsDto` con `cancellation_days?` | Contrato tipado; sin lógica (CA-13). |
| `apps/dashboard/src/viewmodels/cancellation-report.ts` (existente, adaptado) | Tipos de `cashier_days`, `legend`; mapeo de `review` | Presentación y tipos. |
| `apps/dashboard/src/viewmodels/cancellation-review.ts` (nuevo) | Estado del diálogo (opción elegida, nota, validación de longitud local de CA-06), mensajes de error por código | RN-04. |
| `apps/dashboard/src/viewmodels/pending-review.ts` (existente, adaptado) | Clave `cancellation_days`, permiso `reports.cancellations.view`, texto singular y plural (CA-10), puntito en «Reportes» | Aviso y puntito (`dashboard-018`). |
| `apps/dashboard/src/hooks/useCancellationReview.ts` (nuevo) | Alta y historial con `@arca/api-client`; refresco del reporte tras alta (RN-05) | ViewModel de revisión (CA-13). |
| `apps/dashboard/src/hooks/useCancellationReport.ts` (existente, adaptado) | Refresco con los mismos filtros | RN-05. |
| `apps/dashboard/src/components/CancellationTrafficLightTable.tsx` (nuevo) | Tabla por cajero y día con nivel en texto, porqué, qué hacer y revisión | CA-01, CA-02, CA-04. |
| `apps/dashboard/src/components/CancellationLegend.tsx` (nuevo) | Leyenda y disclaimer | CA-03. |
| `apps/dashboard/src/components/CancellationReviewDialog.tsx` (nuevo) | Diálogo con dos opciones, nota y contador; usa `@arca/ui` | CA-05 a CA-08, CA-14. |
| `apps/dashboard/src/components/CancellationReviewHistory.tsx` (nuevo) | Historial desplegable | CA-09. |
| `apps/dashboard/src/views/CancellationReportView.tsx` (existente, adaptado) | Inserta la sección de semáforo, leyenda, botón de revisión e historial | CA-01 a CA-09. |
| `apps/dashboard/src/App.tsx` / navegación (existente, adaptado) | Puntito en «Reportes» y en la pestaña (`dashboard-018` CA-05 y CA-09 ampliados) | CA-11. |
| `apps/dashboard/src/**/*.test.tsx` | Pruebas Vitest con mock de `@arca/api-client` | CA-01 a CA-17. |
| `apps/dashboard/docs/` | Referencia local de la pestaña (si existe la página de cancelaciones) | Documentación duradera (Constitución, `apps/dashboard/AGENTS.md`). |

Sin dependencias nuevas (`dashboard-016` RN-07). Componentes de `@arca/ui`: `Dialog`, `Button`, `Badge`, `Alert`, `Card`, `DataTable`, `SelectField` o equivalentes ya existentes; si falta un componente, va a `packages/ui` en tarea aparte.

## Contrato y datos

Consumo de la API (ver `api-027` «Contrato JSON»):

- `GET /api/v1/admin/reports/cancellations`: lee `reconciliation.cashier_days[]` (`cashier_id`, `cashier_name`, `date`, `traffic_light`, `traffic_light_label`, `signals_count`, `reasons[]`, `reason_sentence`, `action`, `review`) y `legend[]` y `disclaimer`.
- `POST /api/v1/admin/reports/cancellations/reviews`: cuerpo `{ cashier_id, business_date, status, note }`. Respuesta 201 con la revisión.
- `GET /api/v1/admin/reports/cancellations/reviews?cashier_id=&business_date=`: historial, más reciente primero.
- `GET /api/v1/admin/pending-counts`: clave `cancellation_days` (entero). Sin envoltorio `data`.

Mapeo de errores en la UI (CA-08):

| Código | Dónde se muestra |
|---|---|
| 422 en `note` o `status` | Junto al campo, con el mensaje de la API |
| 422 «ya tiene esa decisión» | En el diálogo |
| 403 | Mensaje de la API; la acción se cierra |
| 429 | Mensaje de la API, sin reintento |
| 5xx o red | Error con texto que pide reintentar manualmente |

## Seguridad, offline y operación

- **Permisos:** la pestaña y los controles dependen de `reports.cancellations.view` del perfil; el servidor autoriza (RN-02).
- **Datos:** no se guardan en `localStorage` ni en caché (RN-03).
- **Accesibilidad:** el diálogo gestiona el foco (CA-14); el nivel se lee como texto; el puntito es decorativo y el nombre accesible lleva el estado (CA-11).
- **Offline:** no aplica.
- **Observabilidad:** sin métricas nuevas en el cliente.

## Mapeo de criterios a pruebas

Convención: `test_caNN_…` en el nombre del test de Vitest. Mocks de `@arca/api-client`. Pruebas en `apps/dashboard/src/**/*.test.tsx`.

| Criterio | Prueba automatizada | Ubicación |
|---|---|---|
| CA-01 | `test_ca01_traffic_light_table_shows_level_as_text` | `components/CancellationTrafficLightTable.test.tsx` |
| CA-02 | `test_ca02_reason_and_action_are_shown_as_received` | `components/CancellationTrafficLightTable.test.tsx` |
| CA-03 | `test_ca03_legend_renders_api_items_and_disclaimer` | `components/CancellationLegend.test.tsx` |
| CA-04 | `test_ca04_current_review_or_sin_revisar` | `components/CancellationTrafficLightTable.test.tsx` |
| CA-05 | `test_ca05_review_button_only_with_reports_cancellations_view` | `views/CancellationReportView.test.tsx` |
| CA-06 | `test_ca06_review_dialog_options_and_local_length_check` | `components/CancellationReviewDialog.test.tsx` |
| CA-07 | `test_ca07_success_closes_dialog_and_refreshes_from_api` | `views/CancellationReportView.test.tsx`, `hooks/useCancellationReview.test.ts` |
| CA-08 | `test_ca08_review_errors_show_api_messages_without_retry` | `hooks/useCancellationReview.test.ts` |
| CA-09 | `test_ca09_history_is_loaded_from_api_newest_first` | `components/CancellationReviewHistory.test.tsx` |
| CA-10 | `test_ca10_admin_sees_cancellation_notice_once_per_start` | `viewmodels/pending-review.test.ts` |
| CA-11 | `test_ca11_dot_on_reports_and_tab_with_accessible_name` | `viewmodels/pending-review.test.ts`, `App.test.tsx` |
| CA-12 | `test_ca12_no_permission_no_cancellation_notice` | `viewmodels/pending-review.test.ts` |
| CA-13 | `test_ca13_views_do_not_call_fetch_and_hooks_use_api_client` | `architecture/no-fetch-in-views.test.ts` |
| CA-14 | `test_ca14_dialog_focus_and_escape_and_no_horizontal_overflow` | `components/CancellationReviewDialog.test.tsx` y revisión visual manual (360 a 1366 px) |
| CA-15 | `test_ca15_new_components_use_semantic_tokens` | `architecture/no-hex-in-components.test.ts` |
| CA-16 | `test_ca16_every_ca_has_a_named_test` | `architecture/ca-coverage.test.ts` |
| CA-17 | `test_ca17_no_physical_ticket_text_in_new_views` | `architecture/no-physical-ticket-text.test.ts` |

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | Sin dependencias nuevas. Sin datos de nube. |
| II. La spec manda | Sí | Spec 021 Aprobada; plan y tasks con el mismo NNN-slug. |
| III. Lógica separada de la interfaz | Sí | Niveles, señales y textos vienen de la API (CA-02, RN-01). Pruebas estáticas (CA-13). |
| IV. Un test por criterio | Sí | Mapeo CA-01 a CA-17. Evidencia pendiente. |
| V. Una sola fuente de verdad | Sí | El dashboard no escribe datos ni guarda copias. |
| VI. Código en inglés, personas en español | Sí | Componentes y hooks en inglés; textos de UI en español. |

## Riesgos y decisiones

- **Orden de despliegue:** DBR-026 → API → dashboard. Sin la API, el registro falla con error de la pestaña.
- **Textos de la API en la UI:** la página muestra lo que llega; si la API cambia el porqué, la UI cambia sin tocar código.
- **Preguntas abiertas:** las de `api-027`; esta spec no añade preguntas.

## Decisiones

- Aviso y puntito cuentan Atención sin revisar y «Requiere aclaración» (`api-027` RN-11). Revisar no entra en el aviso.
- Sin cajero registrado: sin semáforo ni botón de revisión (`api-027` RN-10).
- Repetir el mismo estado: la página envía la petición y muestra la entrada nueva; no hay validación local de repetición (`api-027` CA-19).
- Sin permiso aparte de escritura: el registro usa `reports.cancellations.view` (`api-027` RN-12).

## Orden y aprobación

1. Contratos de `api-027` disponibles (T-13 reporte, T-16 alta, T-17 historial, T-19 conteo).
2. `packages/api-client` (tipos y métodos) y pruebas con mock (T-01, T-02).
3. Views y diálogo (T-03 a T-06).
4. Aviso y puntito (T-07, T-08).
5. Accesibilidad, tokens y pruebas de arquitectura (T-09, T-10, T-12).
6. Cobertura Vitest (T-11), `/verify` y documentación (T-13).

- Revisión técnica: aprobada (aprobación técnica del plan).
- Aprobador funcional: responsable funcional (spec aprobada).
- Evidencias: pendientes de la sesión principal (salida de Vitest, lint y tipos). Esta sesión no tiene shell y no afirma que pasen.

## Divergencias de implementación

- Estructura real del dashboard: no existe `hooks/`; los ViewModels viven en `viewmodels/` (`cancellation-review.ts` y `useCancellationReview.ts`). Los componentes están en `components/` y las pruebas en `src/tests/` (`cancellation-review-table|dialog|pending|architecture.test.tsx`) en vez de junto al archivo.
- Tabla: se usa el `DataTable` local del dashboard (`components/DataTable.tsx`) con `rowDetail` para el historial; no se añadió nada a `@arca/ui`.
- Se añadió `CancellationCurrentReview` (revisión vigente, reutilizada por la tabla y el historial) y el icono `alert` en `components/Icon.tsx` para el nivel Atención.
- Puntito: `reports` → `cancellation_days` en `viewmodels/pending-review.ts`; la pestaña usa `reportTabHasPending` y `ReportTabs` recibe `counts`. `App.tsx` pasa `counts` y `canReviewCancellations` a `ReportsSection`.
- El diálogo exige elegir una opción antes de guardar («Elige una de las dos opciones.»), no preselecciona ninguna; no cambia ningún CA.
- Éxito y 403 se publican como aviso emergente (regla de `dashboard-020`); 422 sin campo, 429, 5xx y red quedan dentro del diálogo, sin reintento.
- El conteo de pendientes no se refresca al guardar una revisión; sigue la regla de `dashboard-018` (al cambiar de sección, mínimo 15 s).
- Pendiente de contraste con la API real: valores de `traffic_light` (`normal`, `review`, `attention`) y `status` (`reviewed_ok`, `clarification_required`), tomados del plan de `api-027`.

## Nota: semáforo en tabla (CA-18 a CA-22)

- `CancellationTrafficLightTable` pasa a nueve columnas (Fecha, Cajero, Nivel, Vendidos, Cancelados, % cancelado, Señales, Revisión vigente, Acción) sobre el mismo `DataTable`; el encabezado fijo y el desplazamiento vienen de `.cancellation-card .data-table-scroll`.
- «Ver detalle» usa `rowDetail` de `DataTable`: muestra `row.action` y el historial (se pide al abrir y se cierra al plegar, vía `onToggleHistory`). El estado abierto/cerrado y el filtro son estado local de presentación.
- Orden y filtro: `arrangeTrafficLightRows` en `viewmodels/cancellation-traffic-light.ts` (archivo aparte para no mezclarlo con el historial, que no se reordena). No compara cifras.
- `packages/api-client/admin-types.ts`: `sold_tickets`, `cancelled_tickets` y `cancel_percent` opcionales en `CancellationTrafficLightDto` (los devuelve `api-027`); solo tipos.
- La celda de revisión muestra estado y fecha; la nota y el autor van en el detalle. Estilos en rem dentro del bloque `cancellation-review-signals`.

## Nota: legibilidad y leyenda (CA-23 a CA-28)

`CancellationLegend` pasa a `<details>` con dos tablas; niveles y preferencia (`localStorage` con try/catch) en `viewmodels/cancellation-legend.ts`. `DataTable` gana `className` opcional por columna (`traffic-col*`) para alineación y anchos en rem (solo desde 40.0625rem; apilado en móvil). El porqué usa `.cancellation-signals__reason` (0.9375rem, color de texto). El detalle usa `<h4>` por bloque y `CancellationReviewHistory` pasa de lista a tabla (`CancellationCurrentReview` queda sin uso en el historial). Tests en `cancellation-review-table.test.tsx`; ajustados CA-01, CA-04, CA-18 y CA-20 por diseño, sin relajarlos.

## Revisión (c): «Ver boletos» y folios por señal (CA-29 a CA-34)

- Estado en el ViewModel (`cancellation-report.ts`): `ticketFocus` (día, cajero y `previousQuery`) y acciones `ticket-focus-applied` / `ticket-focus-cleared`; `useCancellationReport` expone `viewTickets` y `clearTicketFocus`. «Ver boletos» pasa a `loading` de inmediato para que el desplazamiento espere al reporte nuevo. `query-changed` descarta el filtro salvo que solo cambie la página.
- Vista: `CancellationReportView` mantiene solo estado de presentación (solicitud de desplazamiento y folio marcado) y mueve el foco al encabezado `#cancellation-tickets-heading` o a la fila `#cancellation-ticket-<folio>`. `CancellationTrafficLightTable` añade «Ver boletos» y, en el detalle, señales con conteo y chips de folio (botones).
- Helpers puros en `viewmodels/cancellation-ticket-focus.ts`. Estilos en el bloque `cancellation-ticket-focus` de `styles.css` (rem y tokens).
- No se recompone la frase de la API ni se calcula qué boletos participan (`signal_codes` y `folios` vienen de la API).
- Pendiente: revisión visual (360 a 1366 px) y contraste con la API real de la revisión (c).
