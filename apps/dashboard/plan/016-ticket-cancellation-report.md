# Plan técnico · 016 · ticket-cancellation-report

- Spec: `apps/dashboard/specs/016-ticket-cancellation-report.md` (Aprobada, Jonathan, 2026-11-20)
- Spec de la API (dueña de la lógica): `apps/api/specs/022-ticket-cancellation-report.md`; plan de la API: `apps/api/plan/022-ticket-cancellation-report.md`
- Enmienda relacionada: `apps/dashboard/specs/005-ticket-sales.md` (nota de 2026-11-20: selector de motivo en el diálogo de cancelar; CA-12 y RN-03 no cambian de número)
- Estado de spec: Aprobada
- Estado del plan: **Aprobado — aprobación técnica: Jonathan, 2026-11-20**. Una pregunta nueva queda abierta (fuente de la lista de cajeros; sección «Pregunta abierta»).
- Responsable técnico: `<por identificar>` (frontend)
- Orden de implementación en la SPA: `dashboard-015` (diálogo de contraseña y manejo de 403 `password_confirmation_required`) → `dashboard-019` (formateo de fechas con la zona que devuelve la API, sin zona del dispositivo) → **`dashboard-016`** (este plan) → `dashboard-017` → `dashboard-018`.
- Orden de despliegue: DBR-024 → API (`api-022` y `api-009` con `reason_code`) → dashboard. Desplegar la SPA del diálogo junto con la API; antes, la cancelación sin motivo de lista responde 422.
- ADR relacionados: ninguno nuevo. Sin React Router (ADR 0002 pendiente; navegación por estado de la SPA, RN-06). Sin dependencias nuevas (RN-07).

## Diseño de solución

La SPA sigue MVVM explícito (Constitución III; `apps/dashboard/AGENTS.md`):

- **Views** (`views/`, `components/`): solo presentan. Ningún `fetch`/`axios`, ningún total, conciliación, minuto, porcentaje ni alerta, ninguna decisión de permisos.
- **ViewModels** (`viewmodels/`): funciones puras (estado, reductores, mapeo de errores de la API, construcción de la consulta a partir de lo que elige el usuario) y hooks (`useCancellationReport`, `useCancellationReasons`) que llaman a `adminApi` de `@arca/api-client` a través de `services/arca-api.ts`.
- **Datos:** tipos y llamadas en `packages/api-client` (`@arca/api-client`). La SPA no reimplementa reglas de `api-022` ni de `api-009` (RN-02 de la spec).

La página es de solo lectura y se navega por estado de la SPA (`viewmodels/navigation.ts` y `App.tsx`, como `reports` y `ticket-history`). Solo oculta la entrada si falta `reports.cancellations.view`; la autorización es de la API (RN-01).

### Flujos

1. **Consultar (admin):** `CancellationReportSection` (contenedor) llama `useCancellationReport()`; el hook guarda la consulta elegida (periodo, fecha de referencia o rango, cajero, motivo) → `adminApi.reports.cancellations(query)` → el reductor guarda la respuesta tal cual. La vista muestra periodo, filas, totales, desgloses, conciliación y alertas de la API (CA-04 a CA-15). La lista de cajeros para el filtro viene de la API (CA-06); el origen concreto se fija según «Contrato y datos».
2. **Exportar (admin):** `exportCancellations(query, format)` → `adminApi.reports.exportCancellations(query, format)` → descarga con `services/save-file.ts` usando el nombre que devuelve la API; botón deshabilitado mientras genera (CA-16). Un 422 (formato o PDF con más de 2000 filas) se muestra junto al selector y no descarga nada (CA-17). Sin reintento automático.
3. **Cancelar (cajero):** `TicketHistoryView` → `CancelTicketDialog` → `useCancellationReasons()` carga el catálogo de `GET tickets/cancellation-reasons` (CA-18) → el cajero elige motivo (CA-19), escribe comentario si corresponde (CA-20) → si `api-021` pide contraseña, `dashboard-015` abre su diálogo y reintenta una vez → `api.history.cancel(folio, { reason_code, reason })` → 200 refresca la lista y muestra el aviso (CA-21). 422, 403 y 429 se muestran en el diálogo; no hay reintento automático.

### Cambios de la capa de cliente (`packages/api-client`)

- `ticket-sales-types.ts`: `TicketCancelInput` pasa a `{ reason_code: CancellationReasonCode; reason?: string | null }`; tipo `CancellationReasonCode` con los cinco códigos de `api-022` RN-02; `CancellationReasonDto` (`code`, `label`, `comment_policy`).
- `ticket-sales.ts`: `history.cancel(id, input)` envía `{ reason_code, reason }` (sin `timezone`, como hoy). Nuevo `tickets.cancellationReasons()` → `GET /tickets/cancellation-reasons`.
- `admin-types.ts`: tipos `CancellationReportQuery` (`period`, `date`, `from`, `to`, `cashier_id`, `reason_code`), `CancellationReportDto` (campos de la respuesta de `api-022`: `period`, `totals`, `reconciliation`, `rows`), `CancellationRowDto`, `CancellationAlertDto`.
- `admin.ts`: `reports.cancellations(query)` → `GET /reports/cancellations`; `reports.exportCancellations(query, format)` → `http.download` de `GET /reports/cancellations/export`. **Sin `timezone` en ninguna de las dos** (`reportParams` de la versión actual envía la zona del dispositivo: se usa una variante sin zona, de acuerdo con `api-025` RN-04 y `dashboard-019`).
- Sin lógica de negocio en el paquete (Constitución III).

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| Cliente (`packages/api-client`) | `ticket-sales-types.ts`, `ticket-sales.ts`, `admin-types.ts`, `admin.ts` | Contrato de cancelar con motivo, catálogo y reporte/exportación sin zona del dispositivo. |
| Dashboard / ViewModels | `src/viewmodels/cancellation-report.ts` (nuevo: estado, reductor, consulta, mapeo de errores 422/403/429 de la API), `src/viewmodels/useCancellationReport.ts` (nuevo: hook), `src/viewmodels/cancellation-reasons.ts` y `src/viewmodels/useCancellationReasons.ts` (nuevos: catálogo) | Lógica de presentación del cliente y acceso a datos vía hooks. |
| Dashboard / ViewModels (cancelar) | `src/viewmodels/ticket-history.ts` (estado del diálogo: `reasonCode`, `reason`, catálogo; validación de presencia «Elige un motivo de cancelación.»; llamada con `reason_code`) | Diálogo de cancelar (CA-18 a CA-21). |
| Dashboard / Views | `src/views/CancellationReportView.tsx` (nuevo), `src/sections/CancellationReportSection.tsx` (nuevo, contenedor que llama al hook) | Página Cancelaciones: filtros, filas, totales, conciliación, alertas y exportación (CA-04 a CA-17, CA-22). |
| Dashboard / componentes | `src/components/CancellationAlertBadge.tsx` (nuevo, usa `Badge` de `@arca/ui`), `src/components/CancelTicketDialog.tsx` (selector «Motivo» con `SelectField` y campo de comentario con `TextAreaField`) | Señales y diálogo (CA-14, CA-18 a CA-20). |
| Dashboard / navegación | `src/viewmodels/navigation.ts` (entrada «Cancelaciones», permiso `reports.cancellations.view`), `src/viewmodels/dashboard-shell.ts` (nuevo identificador de sección), `src/App.tsx` (título y render) | CA-01. |
| Dashboard / historial | `src/views/TicketHistoryView.tsx` (columna de motivo con etiqueta; sujeto a la pregunta 3 de la API) | Presentación del motivo de los cancelados. |
| Dashboard / servicios | `src/services/save-file.ts` (reutilizado), `src/services/arca-api.ts` (sin cambio de forma), `src/viewmodels/formatters.ts` (formato `dd/mm/aaaa HH:mm` de `dashboard-019`) | Descarga y fechas. |
| Dashboard / tests | Ver «Mapeo de criterios a pruebas» | Vitest con cliente simulado. |
| Dashboard / docs | `apps/dashboard/docs/` (si existe la referencia del reporte o del historial) | Documentación local de la página. |
| Paquetes UI | `packages/ui` solo si falta un componente; no se prevé cambio | — |

Nota de copia: el mensaje «Indica el motivo de la cancelación.» de `dashboard-005` pasa a «Elige un motivo de cancelación.» (CA-19 de esta spec). El cambio de texto se documenta en la enmienda de `dashboard-005`, sin cambiar sus CA.

## Contrato y datos

- Endpoints consumidos (todos por `@arca/api-client`, por rutas nombradas de la API): `GET /api/v1/admin/tickets/cancellation-reasons`, `POST /api/v1/admin/tickets/{ticket}/cancel`, `GET /api/v1/admin/reports/cancellations`, `GET /api/v1/admin/reports/cancellations/export`.
- Filtro de cajeros (CA-06): la lista de cajeros la entrega la API. Si `api-022` no añade un endpoint de cajeros, el filtro usa un campo de la respuesta del reporte (`reconciliation.cashiers`) y no se fija en el cliente. Pregunta abierta (2026-11-20): el plan de `api-022` no añadió endpoint de cajeros; ver «Pregunta abierta» antes de implementar T-04.
- No hay estado persistente: sin `localStorage`, cookies ni caché persistente (RN-09). El estado vive en memoria de la sesión.
- Errores 401 → login con «Tu sesión expiró» (`dashboard-002` CA-08, CA-03); 403 → mensaje de la API; 422 → mensaje por campo o aviso de la página; 429 → mensaje de la API sin reintento; 5xx o red → error con «Reintentar» manual.

## Seguridad, offline y operación

- **Permisos:** la entrada de menú y la ruta se ocultan sin `reports.cancellations.view`; el servidor responde 403 si se llama igual (CA-02). Ocultar no protege (RN-01).
- **Datos sensibles:** comentarios de «Otro» pueden contener datos del visitante; se muestran solo a `admin` (spec, «Datos, privacidad y auditoría»). No se copian a logs, ni a `localStorage`, ni a URL.
- **Contraseña:** el diálogo de contraseña (`dashboard-015`) la envía en la petición y no la guarda; esta SPA no la almacena.
- **Exportación:** el archivo se entrega como descarga; no se guarda fuera de la memoria de la sesión (RN-09).
- **Accesibilidad:** foco visible, etiquetas asociadas en `SelectField` y `TextAreaField`, `role="alert"` para errores, texto accesible en las señales de alerta (CA-14), tablas con desplazamiento propio o diseño apilado en 360 a 1366 px (CA-22).
- **Estilo:** tokens semánticos; sin hex de marca (CA-24); modo claro.
- **Offline:** no aplica (sin modo offline; sin respuesta no hay datos ni cancelación).
- **Portabilidad:** no aplica a la SPA (la base de datos está detrás de la API).

## Mapeo de criterios a pruebas

Vitest en `apps/dashboard/src/tests/`. Cada archivo nombra los CA en el `describe` o en el nombre de la prueba. Cliente simulado de `@arca/api-client`; no hay llamadas reales a la API en la suite.

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | `cancellation-report-navigation.test.tsx`: «Cancelaciones» aparece con `reports.cancellations.view`; sin el permiso no aparece y la ruta muestra «Sin permiso» | dashboard / `src/tests/` |
| CA-02 | `cancellation-report-access.test.tsx`: 403 de la API muestra el mensaje, sin filas ni totales, sin reintento | dashboard / `src/tests/` |
| CA-03 | `cancellation-report-access.test.tsx`: 401 vuelve al login con «Tu sesión expiró» | dashboard / `src/tests/` |
| CA-04 | `cancellation-report-filters.test.tsx`: valores por defecto «Semana» con la fecha de hoy; periodos y filtros presentes | dashboard / `src/tests/` |
| CA-05 | `cancellation-report-filters.test.tsx`: aplicar filtros vuelve a llamar a la API con esos valores; 422 de periodo junto al campo | dashboard / `src/tests/` |
| CA-06 | `cancellation-report-filters.test.tsx`: la lista de cajeros viene de la respuesta de la API (no fijada en el cliente) | dashboard / `src/tests/` |
| CA-07 | `cancellation-report-rows.test.tsx`: columnas de la fila; fechas en `dd/mm/aaaa HH:mm` con la zona que devuelve la API | dashboard / `src/tests/` |
| CA-08 | `cancellation-report-rows.test.tsx`: fila anterior muestra «Sin clasificar (anterior)» y el comentario guardado | dashboard / `src/tests/` |
| CA-09 | `cancellation-report-rows.test.tsx`: totales tal como los devuelve la API; sin sumas en el cliente (espía sobre el reductor) | dashboard / `src/tests/` |
| CA-10 | `cancellation-report-rows.test.tsx`: con más filas que las visibles, encabezados conservados; sin desbordamiento horizontal de la página | dashboard / `src/tests/` |
| CA-11 | `cancellation-report-reconciliation.test.tsx`: bruto, cancelado y neto por día y por cajero; «Cuadra» o «No cuadra» según `balanced` | dashboard / `src/tests/` |
| CA-12 | `cancellation-report-reconciliation.test.tsx`: `balanced: false` muestra «No cuadra. Revisa con Informática.» y no se oculta | dashboard / `src/tests/` |
| CA-13 | `cancellation-report-reconciliation.test.tsx`: un día o cajero que la API no envía no aparece como fila | dashboard / `src/tests/` |
| CA-14 | `cancellation-report-alerts.test.tsx`: `alert: true` muestra «Revisar» con el motivo en texto accesible; no cambia orden ni oculta fila | dashboard / `src/tests/` |
| CA-15 | `cancellation-report-alerts.test.tsx`: porcentaje y número de boletos de la API; sin cálculo en el cliente | dashboard / `src/tests/` |
| CA-16 | `cancellation-report-export.test.tsx`: exportar llama a la API con los mismos filtros; nombre de archivo de la API; botón deshabilitado mientras genera | dashboard / `src/tests/` |
| CA-17 | `cancellation-report-export.test.tsx`: 422 se muestra junto al selector y no descarga; red o 5xx muestra error sin reintento | dashboard / `src/tests/` |
| CA-18 | `cancel-ticket-reason.test.tsx`: el selector «Motivo» usa las opciones de la API; no hay etiquetas fijas en código | dashboard / `src/tests/` |
| CA-19 | `cancel-ticket-reason.test.tsx`: sin motivo no se llama a la API y aparece «Elige un motivo de cancelación.» | dashboard / `src/tests/` |
| CA-20 | `cancel-ticket-reason.test.tsx`: «Otro» exige «Describe el motivo»; otros motivos, comentario opcional; el 422 de la API se muestra junto al campo | dashboard / `src/tests/` |
| CA-21 | `cancel-ticket-reason.test.tsx`: 200 refresca el historial y avisa; 422, 403 y 429 se muestran en el diálogo sin reintento | dashboard / `src/tests/` |
| CA-22 | `cancellation-report-responsive.test.tsx`: foco visible, tablas con desplazamiento propio o diseño apilado, sin desbordamiento de 360 a 1366 px (en el patrón de `responsive.test.tsx`) | dashboard / `src/tests/` |
| CA-23 | `cancellation-report-mvvm.test.tsx`: búsqueda estática en `views/` y `components/` de la página y el diálogo: sin `fetch`/`axios`, sin cálculos, sin decisiones de permiso; toda llamada pasa por hooks | dashboard / `src/tests/` |
| CA-24 | `cancellation-report-design.test.tsx`: sin hex de marca en los componentes nuevos; uso de tokens semánticos (en el patrón de `design-system.test.tsx`) | dashboard / `src/tests/` |
| CA-25 | `cancellation-report-coverage.test.tsx`: comprueba que existe al menos una prueba que nombra cada CA-01 a CA-26 | dashboard / `src/tests/` |
| CA-26 (enmienda) | `cancel-ticket-reason.test.tsx` (columna de motivo de `ticket-history.test.tsx`): muestra `cancellation_reason_label` y el comentario; «Sin clasificar (anterior)» si el código es nulo | dashboard / `src/tests/` |

Regresión (sin relajar CA): `ticket-history.test.tsx` y `ticket-sales-fixtures.ts` (cancelar envía `reason_code`), `api-client-admin.test.tsx` (sin `timezone` en reporte ni exportación de cancelaciones), `ticket-sales-api-client.test.tsx`, `administration-navigation.test.tsx` (nueva entrada de menú), `responsive.test.tsx`, `design-system.test.tsx`, `acceptance-coverage.test.tsx`.

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | React 19, TypeScript y Vite ya en el stack. Sin dependencias nuevas (RN-07). |
| II. La spec manda | Sí, con condición | Spec 016 Aprobada (2026-11-20), plan y tasks con el mismo NNN-slug. **Condición:** plan aprobado antes de programar. |
| III. Lógica separada de la interfaz | Sí | Views sin `fetch`, sin cálculos ni decisiones de permiso. Hooks ViewModel llaman a `@arca/api-client`. Test estático (CA-23). Totales, conciliación, alertas y minutos vienen de `api-022`. |
| IV. Un test por criterio | Sí | Mapeo completo CA-01 a CA-25 (tabla anterior); CA-25 comprueba la cobertura. |
| V. Una sola fuente de verdad para los datos | Sí | La SPA no guarda datos (RN-09). La auditoría y la base son de la API (`api-022` CA-21, CA-23). |
| VI. Código en inglés, personas en español | Sí | Identificadores en inglés; etiquetas, mensajes y textos de la página en español («Cancelaciones», «Cuadra», «No cuadra. Revisa con Informática.», «Sin clasificar (anterior)»). |

Brechas: ninguna que requiera ADR. Condiciones: plan aprobado; API `api-022` desplegada junto con la SPA; decisiones de `api-022` (preguntas 2, 3, 5 y 7) confirmadas antes de implementar T-02 a T-08.

## Riesgos y decisiones

- **ADR requerido/aprobado:** ninguno.
- **Despliegue conjunto:** si la API se despliega sin esta SPA, la taquilla no puede cancelar (422 de motivo). Si la SPA se despliega antes, el diálogo no puede enviar `reason_code` hasta que la API lo acepte.
- **Dependencia de 015 y 019:** el diálogo de contraseña y el formato de fechas deben estar implementados. Si no, el cajero con ventana expirada ve el 403 sin diálogo.
- **Historial:** la columna «Motivo» cambia de texto libre a etiqueta; depende de la pregunta 3 de `api-022`.
- **Filtro de cajeros:** depende de cómo `api-022` entregue la lista (ver «Contrato y datos»).
- **Paginación de filas:** si `api-022` devuelve todas las filas (pregunta 2 de la API), la paginación es solo de presentación del cliente; el cliente no suma ni recalcula.
- **Alternativas:** no se añade React Router (ADR 0002 pendiente) ni gráfica nueva; la conciliación se muestra en tabla.

## Decisiones 2026-11-20 (aprobación técnica de Jonathan)

- **Historial y búsqueda (pregunta 3 de `api-022`):** la columna de motivo muestra `cancellation_reason_label` y el comentario. Spec: CA-26 (nuevo). Tarea: T-13, desbloqueada.
- **Periodo sin fecha (pregunta 1 de `api-022`):** la SPA ya envía la fecha de hoy por defecto (CA-04); sin cambio.
- **Umbrales, periodo por `purchased_at`, snapshot de CA-22, `throttle:20,1` de la exportación y filtro con cajeros eliminados** (preguntas 4 a 8 de `api-022`): sin cambio en la SPA; son reglas de la API (`api-022` RN-08, RN-14, RN-15, RN-16).
- **Filas sin paginar (pregunta 2 de `api-022`):** la SPA muestra todas las filas que recibe. La paginación es solo de presentación, sin sumar ni recalcular.
- Propuestas del plan aceptadas, salvo la fuente de la lista de cajeros (pregunta abierta).

## Pregunta abierta (2026-11-20; bloquea la parte del filtro «Cajero» de T-04)

- **P-016-1 (lista de cajeros para el filtro):** ¿de dónde sale la lista?
  - A) Un endpoint nuevo en `api-022` (`GET /api/v1/admin/reports/cancellations/cashiers`), que incluye cajeros eliminados lógicamente (`api-022` RN-16). Propuesta: A.
  - B) El campo `reconciliation.cashiers` del reporte. No requiere cambio de API, pero solo lista cajeros con actividad en el periodo y no permite elegir un cajero sin consultar antes.
  - La opción A exige enmendar el contrato de `api-022` y su plan. Hasta decidir, T-04 no implementa el filtro «Cajero».

## Orden y aprobación

1. `dashboard-015` y `dashboard-019` implementadas (prerrequisitos; evidencia de sus PR).
2. Plan aprobado el 2026-11-20. Las preguntas 2, 3, 5 y 7 de `api-022` quedan cerradas; el filtro «Cajero» espera P-016-1.
3. Contrato de la API disponible (`api-022` T-06, T-10, T-11, T-16 con sus respuestas) o cliente simulado para las pruebas.
4. `packages/api-client` (T-01), hooks (T-02), página (T-03 a T-09), diálogo (T-10 a T-12), historial y navegación (T-13, T-14), pruebas de calidad y regresión (T-15 a T-18), verificación (T-19).

- Revisión técnica: Jonathan, 2026-11-20 (aprobación técnica del plan; P-016-1 abierta).
- Aprobador funcional: Jonathan (spec aprobada 2026-11-20).
- Fecha de aprobación del plan: 2026-11-20 (Jonathan).
- Evidencias: pendientes (salida de Vitest, lint y tipos aportada por la sesión principal).

## Decisión de coordinación 2026-11-20 (sesión principal)
- Lista de cajeros del filtro: opción **A**, endpoint propio `GET /api/v1/admin/reports/cancellations/cashiers` (permiso `reports.cancellations.view`), que devuelve todas las cuentas con rol `cashier` o que hayan vendido boletos, incluidas las eliminadas lógicamente (RN-16), solo con `id` y nombre. Se añade a las tasks de API (con test) y dashboard-016 T-04 lo consume.

## Divergencias de implementación (2026-11-20)
- **Lista de cajeros:** implementada la opción A de la decisión de coordinación (`reports.cancellationCashiers()` → `GET /api/v1/admin/reports/cancellations/cashiers`). El cliente espera `{ data: [{ id, name }] }` y tolera `full_name` o `cashier_name` como nombre. Si la llamada falla, el filtro queda en «Todos los cajeros» y el reporte sigue.
- **Filtro «Motivo» del reporte:** el catálogo (`GET tickets/cancellation-reasons`) exige `tickets.cancel` según el plan de `api-022`, permiso que `admin` no tiene. La SPA usa el catálogo si responde y, si no, los motivos de `totals.by_reason` del reporte (datos de la API). Riesgo: sin catálogo el filtro solo ofrece motivos con cancelaciones en el periodo. Recomendación para `api-022`: permitir también `reports.cancellations.view` en el catálogo.
- **CA-01 «Sin permiso»:** el dashboard no tiene ruta ni vista «Sin permiso»; como en el resto de secciones, una sección fuera de la navegación no se activa (`dashboardShellReducer` la ignora y `App` cae a la primera disponible). La API responde 403.
- **CA-04 fecha de hoy:** el valor por defecto es «Semana» sin `date`; la API resuelve hoy en su zona de negocio (`api-022` CA-04 enmendado), así el cliente no usa la zona del dispositivo. El campo de fecha de referencia queda vacío hasta que el usuario la elige.
- **Paginación (CA-10):** sin paginación; la tabla tiene desplazamiento propio con encabezado fijo.
- **Catálogo en el diálogo:** `useCancellationReasons(enabled)` carga el catálogo al abrir el diálogo de cancelar (no al montar el historial) para no pedirlo a roles sin `tickets.cancel`.
- **Comentario obligatorio:** la SPA exige presencia cuando `comment_policy` del catálogo es `required` («Describe el motivo de la cancelación.») y deja que la API valide el mínimo de caracteres (422).
- **Contrato asumido:** `alert_reasons` son textos en español listos para mostrar; `totals.by_cashier[]` trae `cashier_id` y `cashier_name`; `cancel_percent` llega como número o cadena y se muestra tal cual con « %».
- **Contrato real de api-022 (ajustes 2026-11-20):** (1) `period` es obligatorio; el cliente siempre lo envía, también con «Semana» sin `date` (test CA-05). (2) `cashier_id` puede ser `null` («Sin cajero registrado») en `by_cashier` y `reconciliation.cashiers`: tipos `number | null` y keys `none:<nombre>`. (3) Con `reason_code` aplicado la conciliación no aplica: se ocultan «Neto», «Conciliación» (cuadre) y «% cancelación», y se muestra «Con filtro de motivo la conciliación no aplica; quita el filtro para ver bruto, cancelado y neto.» (test CA-11). (4) `cancel_percent` llega como número con 2 decimales; se mantiene « %». (5) El 422 de comentario llega en `reason`; `cancellation_reason_label` es `null` si no está cancelado (ya tipado como nulo). (6) El 422 de exportación trae `errors.format` también si falta el formato. (7) La API ya permite `reports.cancellations.view` en el catálogo; el respaldo con `by_reason` se conserva.
- **T-18:** el paquete no tiene script de lint; se corrieron `tsc --noEmit` y `vitest run`.

## Nota 2026-11-21 (dashboard-020 rev. (d)): paginación de filas

`useCancellationReport.goToPage` cambia `query.page`; `buildCancellationQuery` no lleva `page` (filtros y periodo vuelven a la página 1); `Rows` pinta `Pagination` de `@arca/ui` con `report.meta`. `reports.cancellations` copia el `meta` raíz al DTO; `exportCancellations` no envía `page`. Detalle en `plan/020`.

## Nota 2026-11-21: conciliación sin columna «cuadra» (CA-29 a CA-31)

`Reconciliation` (`views/CancellationReportView.tsx`) quita las columnas `balanced`; con `balanced: false` (y sin filtro de motivo) usa `rowDetail` de `DataTable` para un `Alert` por fila y un `Alert` resumen arriba de cada tabla. La línea de ayuda es un `<p role="note">`. No hay cálculo en el cliente: solo se lee el campo de la API. Se eliminó el estilo `.cancellation-unbalanced`. Tests en `cancellation-report-reconciliation.test.tsx`.

## Revisión 2026-11-21 (c): alertas retiradas, columnas nuevas y aviso de exportación (CA-32 a CA-35)

- `packages/api-client/admin-types.ts`: se quitan `CancellationAlertDto`, `alert` y `alert_reasons`; `CancellationRowDto` gana `late_cancellation` y `signal_codes`; `CancellationReconciliationCashierDto` gana `days_to_review` (`CancellationDaysToReviewDto`); `CancellationSignalReasonDto` gana `folios`. Retirar `alert` es un cambio no aditivo permitido porque la API lo retira a la vez.
- `CancellationAlertBadge` se elimina; `CancellationReportView` añade columnas «Tardía» y «Señales» (etiquetas de `legend[]`) y «Días por revisar»; `ReportExportButtons` acepta `note` y la vista lo llena con `describeExportFilters`.
- Lógica de presentación nueva en `viewmodels/cancellation-ticket-focus.ts`. Sin dependencias.
- Divergencia: `DataTable` gana `rowProps` (id y clase de fila).
