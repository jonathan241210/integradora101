# Plan técnico · 020 · unified-reports-and-feedback

- Spec: `apps/dashboard/specs/020-unified-reports-and-feedback.md`
- Estado de spec: Implementada
- Solicitada: 2026-11-21
- Aprobada: 2026-11-21
- Estado del plan: Aprobado (aprobación técnica registrada)
- Responsable técnico: por identificar
- Nota de aprobación: las decisiones D-1 a D-5 y D-7 quedaron confirmadas por la sesión principal, sujetas a veto del responsable funcional. Si las cambia, se revisan las tareas que dependen de ellas.

## Diseño de solución

Cambio solo de cliente (`apps/dashboard`). No hay endpoints nuevos, ni cambios en `packages/api-client`, ni en `api`, ni en base de datos.

Tres piezas:

1. **Navegación de reportes.** La entrada «Reportes» (`id: "reports"`) reemplaza a «Reporte de boletos» y «Cancelaciones». Dentro, una tabla de pestañas (`ReportTabs`) muestra Boletos, Cancelaciones e Historial según permisos. El estado de pestaña vive en la shell (`dashboard-shell.ts`), en memoria, y se reinicia al cambiar de sección (CA-05). La selección se valida en el reducer contra la lista permitida, igual que `navigate` valida las secciones (CA-06).
2. **Componentes compartidos de reportes.** Exportación, periodo, totales y estados de vista se extraen a componentes de presentación que usan `Button`, `Card` y `Field` de `@arca/ui`. Ambas vistas (`TicketReportView`, `CancellationReportView`) y el historial de «Reportes» los consumen. Las vistas conservan sus hooks y sus llamadas a la API.
3. **Política de mensajes.** Un viewmodel puro (`feedback-policy.ts`) define las cuatro categorías de RN-07 y la presentación que corresponde a cada una. `ActionError` pasa a ser el único punto de salida para errores generales fuera de diálogos (publica el aviso y no pinta texto en línea), y mantiene el texto en línea solo dentro de diálogos o confirmaciones (`inDialog`). Los demás mensajes del inventario se reubican según su categoría.

Límites: la pestaña y el periodo son presentación. Totales, filas, exportaciones y permisos siguen en la API (RN-01, RN-02).

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| Dashboard / viewmodels puros (nuevos) | `src/viewmodels/report-tabs.ts` | Pestañas de «Reportes» según permisos, orden, default y validación de selección (CA-02 a CA-04, CA-07, CA-10, RN-03, RN-05) |
| Dashboard / viewmodels puros (nuevos) | `src/viewmodels/report-export.ts` | Formatos, etiquetas «Exportar CSV/Excel/PDF» y estado de descarga (CA-13, CA-14) |
| Dashboard / viewmodels puros (nuevos) | `src/viewmodels/report-period.ts` | Opciones y etiquetas de periodo, valor por defecto «Semanal» (CA-15) |
| Dashboard / viewmodels puros (nuevos) | `src/viewmodels/feedback-policy.ts` | Categorías de RN-07 y su presentación (CA-19 a CA-23) |
| Dashboard / viewmodels (modificado) | `src/viewmodels/dashboard-shell.ts` | Quitar `cancellations` de la unión; añadir `reportsTab`; acción `select-reports-tab`; reinicio al navegar (CA-05, CA-06) |
| Dashboard / viewmodels (modificado) | `src/viewmodels/useDashboardShell.ts` | Exponer la nueva acción |
| Dashboard / viewmodels (modificado) | `src/viewmodels/navigation.ts` | Entrada «Reportes» con permiso compuesto; «Historial» de taquilla con `tickets.create` y `tickets.view` (CA-01, CA-09, CA-10, CA-11); `sectionsForPermissions` con la etiqueta nueva |
| Dashboard / viewmodels (modificado) | `src/viewmodels/search-actions.ts`, `src/viewmodels/focus-target.ts`, `src/viewmodels/global-search.ts` | Acciones y resultados de boletos y exportación apuntan a la pestaña permitida (CA-12) |
| Dashboard / components (nuevos) | `src/components/ReportTabs.tsx` | Tabla de pestañas (`tablist`, `tab`, `tabpanel`, flechas, Inicio, Fin) (CA-31) |
| Dashboard / components (nuevos) | `src/components/ReportExportButtons.tsx` | Grupo de exportación compartido (CA-13, CA-14) |
| Dashboard / components (nuevos) | `src/components/ReportPeriodControls.tsx` | Selector de periodo, anterior/siguiente y rango compartido (CA-15) |
| Dashboard / components (nuevos) | `src/components/ReportTotals.tsx` | Totales compartidos, datos de la API (CA-16) |
| Dashboard / components (nuevos) | `src/sections/ReportsSection.tsx` | Contenedor: elige pestaña y monta TicketReportSection, CancellationReportSection o TicketHistorySection sin cancelar (CA-02, CA-08) |
| Dashboard / views (modificado) | `src/views/TicketReportView.tsx` | Usa `ReportPeriodControls`, `ReportExportButtons`, `ReportTotals` y el estado compartido (CA-13 a CA-17) |
| Dashboard / views (modificado) | `src/views/CancellationReportView.tsx` | Mismos componentes; 422 de periodo junto al selector; 422 de formato junto al grupo; error de red o 5xx a aviso (CA-14, CA-15, CA-27) |
| Dashboard / views (modificado) | `src/views/TicketHistoryView.tsx` | Prop `canCancel` (presentación por `tickets.cancel`); sin acción de cancelar cuando es falso (CA-08, RN-04) |
| Dashboard / views (modificado) | `src/views/UsersView.tsx`, `src/views/EventsView.tsx`, `src/views/TicketPricesView.tsx`, `src/views/TicketSaleView.tsx` | Reubicar mensajes del inventario (CA-25, CA-26) |
| Dashboard / components (modificado) | `src/components/DashboardNotifications.tsx` (`ActionError`) | Sin texto en línea fuera de diálogos cuando hay proveedor; prop `inDialog` para diálogos (CA-20, CA-22) |
| Dashboard / components (modificado) | `src/components/InlineConfirm.tsx` | Usar `ActionError inDialog` (CA-22) |
| Dashboard / components (modificado) | `src/components/InlinePasswordReset.tsx`, `src/components/SpeciesFichaForm.tsx`, `src/components/ConsoleNoticesBanner.tsx` | Error general a aviso; errores de campo intactos (CA-21, CA-25, CA-28) |
| Dashboard / components (modificado) | `src/components/NoticeBar.tsx` | Sin fallback en línea en la app; revisar tests que lo renderizan sin proveedor (CA-19) |
| Dashboard / App (modificado) | `src/App.tsx` | Títulos, entrada «Reportes», render de `ReportsSection`, retirar `cancellations` y el acceso directo al historial de admin (CA-01, CA-11) |
| Dashboard / tests (nuevos) | ver «Mapeo de criterios a pruebas» | Pruebas Vitest en entorno `node` |
| Dashboard / tests (modificados) | ver «Tests existentes que cambian» | Ajustar etiquetas y comportamiento |
| Paquetes/documentación | `apps/dashboard/AGENTS.md` (lista de specs vigentes), `apps/dashboard/docs/` si hay referencia de navegación | Documentar 020 y la regla de mensajes |

No se modifica `packages/ui` (los componentes nuevos son de la app; si se necesitara un componente de `@arca/ui`, se detiene y se consulta).

## Contrato y datos

- Endpoints: ninguno nuevo. Se usan los existentes: `GET` de reporte de boletos (`api-007`), `GET` de reporte de cancelaciones y su exportación (`api-022`), historial de boletos (`api-009`, alcance por `tickets.view-all`, RN-17), búsqueda global (`api-019`) y las acciones existentes de cada sección.
- Permisos usados en presentación: `reports.view`, `reports.cancellations.view`, `tickets.view-all`, `tickets.create`, `tickets.view`, `tickets.cancel`. La autorización real es de la API.
- Validación/Form Requests, Actions, Resources, Policies: no aplican (no hay cambios en `api`).
- DBR: no aplica. No se toca esquema ni datos. Consulta de esquema vivo de `arca_pruebas`: no aplica a esta feature (no lee ni escribe tablas). El plan lo registra por si cambia el alcance.
- Errores y compatibilidad: sin cambio de contratos. Cambian solo presentación y etiquetas, según la nota de revisión que la spec anota en `dashboard-016`.

### Verificación previa de contrato (T-01)

- Confirmar en `apps/api` (sin modificar) que `me.permissions` incluye `tickets.view-all` para `admin` y `zoo-admin` (`api-023` CA-08, `RolesAndPermissionsSeeder`). Si no lo incluye, es bloqueante para CA-02 y se resuelve en la API.
- Confirmar que el historial devuelve todos los boletos a quien tiene `tickets.view-all` (`api-009` CA-15).

## Seguridad, offline y operación

- Ningún dato nuevo. La interfaz no decide permisos: el mapa permiso → pestaña es presentación (RN-01).
- Sin almacenamiento local (RN-08). El estado de pestaña es memoria de la shell.
- Sin offline: la sección requiere API.
- Accesibilidad: `tablist` con `aria-selected`; foco visible; diálogos con foco atrapado (ya existentes).
- Portabilidad: no hay cambios de BD ni de `.env`.
- Observabilidad: sin cambios.

## Pestañas, permisos y decisiones de diseño

Mapa de la navegación (`navigation.ts`):

| Entrada | Permiso que la muestra |
|---|---|
| Reportes | `reports.view` **o** `reports.cancellations.view` **o** `tickets.view-all` |
| Pestaña Boletos (dentro de Reportes) | `reports.view` |
| Pestaña Cancelaciones | `reports.cancellations.view` |
| Pestaña Historial (dentro de Reportes) | `tickets.view-all` y **no** `tickets.create` (D-1) |
| Historial (taquilla, entrada propia) | `tickets.create` **y** `tickets.view` |

Decisiones de diseño:

- **D-1 (cuenta mixta, RN-05, CA-10).** Si una cuenta tiene `tickets.create` y `tickets.view-all`, se muestra el historial de taquilla y no la pestaña de Reportes. Motivo: la taquilla ya ofrece la cancelación según `cancellable`, y evitar dos historiales con distinto comportamiento. La API decide el alcance. *Propuesta del redactor; pendiente de confirmación.*
- **D-2 (errores de carga, RN-07 categoría 4, CA-23).** Carga, vacío y 403 de la página quedan como estado de la vista. `optionsError` de Usuarios pasa a estado de la vista con reintento. *Propuesta; pendiente.*
- **D-3 (errores dentro de diálogos, CA-22).** Un error de la acción dentro de un diálogo se queda en el diálogo. Motivo: el usuario lo está mirando. *Propuesta; pendiente.*
- **D-4 (mensaje de 2FA, CA-26).** El mensaje de configurar 2FA de `dashboard-005` CA-16 se mantiene en la sección de Precios como estado. *Propuesta; pendiente.*
- **D-5 (etiquetas de periodo, CA-15).** «Semanal», «Mensual» y «Rango personalizado», las del reporte de boletos actual. Cambia `dashboard-016` CA-04 («Semana», «Mes»). *Propuesta; pendiente.*
- **D-6 (reinicio de pestaña, CA-05).** La pestaña se reinicia al cambiar de sección, como ya hace `navigate` con el aviso y el menú móvil. No hay URL (ADR 0002 y patrón actual).
- **D-7 (formato de exportación, CA-14).** Los tres formatos son botones, no un selector. El 422 de formato o de tope se muestra junto al grupo. Cambia la interacción de `dashboard-016` CA-16 y CA-17, sin cambiar la API ni la etiqueta de «Exportar».

## Inventario de mensajes

Método: búsqueda en `src/components`, `src/sections`, `src/views` y `src/viewmodels` de `Alert`, `role="alert"`, `role="status"`, `inline-alert`, `action-error`, `NoticeBar`, `ActionError` y `ListStatusMessage`, y revisión de la condición que los muestra. Verificado en código. Los puntos marcados «confirmar en T-02» requieren leer el texto exacto en el momento de implementar.

Categorías: **AV** = aviso emergente; **CE** = junto al campo; **DI** = dentro del diálogo; **EV** = estado de la vista; **OK** = ya cumple o informativo; **NO** = fuera de alcance.

| # | Archivo y línea | Texto o condición | Categoría actual | Categoría prevista | Acción |
|---|---|---|---|---|---|
| M-01 | `components/DashboardNotifications.tsx` 46-58 (`ActionError`) | Cualquier error general de acción fuera de diálogo | Duplicado: aviso y texto en línea (`.action-error` visible) | AV | Quitar el texto en línea fuera de diálogos (CA-20). Confirmar duplicado visual en T-02 |
| M-02 | `components/InlineFormFooter.tsx` 20 (usa `ActionError`) | `formError`, error general del formulario fijo (Noticias, Eventos) | Duplicado (M-01) | AV | Se resuelve con M-01 |
| M-03 | `components/InlineConfirm.tsx` 52 (usa `ActionError` sin `inDialog`) | Error de una confirmación en línea (Usuarios, Noticias, Eventos) | Duplicado (M-01) | DI | Pasar `inDialog` (CA-22) |
| M-04 | `components/ConfirmDialog.tsx` 47 (`ActionError inDialog`) | Error dentro de diálogo | DI | DI | OK |
| M-05 | `views/UsersView.tsx` 166 (`ActionError`) | `actionError` de alta, edición o acciones de cuentas | Duplicado (M-01) | AV | Se resuelve con M-01; mantiene CA-25 |
| M-06 | `views/UsersView.tsx` 168-170 (`inline-alert`) | `state.optionsError`, fallo al cargar los roles | Línea, estilo anterior | EV | Estado de la vista con reintento (D-2, CA-25) |
| M-07 | `components/InlinePasswordReset.tsx` 120-123 (`inline-alert`) | `error` general de restablecer contraseña | Línea, estilo anterior | AV | Error general a aviso; `errors` por campo intactos (CA-25, CA-21) |
| M-08 | `views/EventsView.tsx` 70-73 (`inline-alert`) | `missingPending`: pendiente no encontrado | Línea, estilo anterior | AV | Aviso (CA-26) |
| M-09 | `views/TicketPricesView.tsx` 65-68 (`inline-alert`) | Error general de guardar precio (confirmar texto en T-02) | Línea, estilo anterior | AV | Aviso (CA-26). Confirmar que no es el mensaje 2FA |
| M-10 | `views/TicketPricesView.tsx` (mensaje 2FA, `dashboard-005` CA-16) | `two_factor_setup_required` | Estado de sección | EV | Se mantiene en la sección (D-4) |
| M-11 | `views/TicketSaleView.tsx` 195-197 (`inline-alert`) | Error general de venta o cotización (confirmar en T-02) | Línea, estilo anterior | AV si ocurre fuera del diálogo; DI si ocurre dentro | Según el punto de origen. CA-26; RN-07 |
| M-12 | `views/TicketSaleView.tsx` 64 (`ticket-sale-success-popup`, `role="status"`) | Resultado de venta registrada | Contenido de resultado | OK | Se mantiene: es el resultado con los boletos (`dashboard-005` CA-35), no un aviso |
| M-13 | `views/TicketSaleView.tsx` 221 (`sale-quote-status`) | Estado de cotización en diálogo | DI | DI | OK |
| M-14 | `views/CancellationReportView.tsx` 413 (`generalFieldMessage`) | 422 de periodo | Línea, bajo el formulario de filtros | CE | Junto al selector de periodo (CA-15, CA-27) |
| M-15 | `views/CancellationReportView.tsx` 447 (`state.error`, `forbidden`) | 403 de la página | Estado de la vista | EV | OK (`dashboard-016` CA-02) |
| M-16 | `views/CancellationReportView.tsx` 487 (`exportError`) | Fallo de exportación (red, 5xx) | Línea | AV | Aviso (CA-27, CA-14) |
| M-17 | `views/CancellationReportView.tsx` 487-491 (`exportFieldErrors`) | 422 de formato o de tope de PDF | Línea | CE | Junto al grupo de exportación (D-7, CA-14) |
| M-18 | `components/ConsoleNoticesBanner.tsx` 29 (`dismissError`, `role="alert"`) | Fallo al marcar aviso como leído | Línea | AV | Aviso (CA-28) |
| M-19 | `components/ConsoleNoticesBanner.tsx` 16 (`role="alert"`) | Fallo al consultar avisos de consola | Estado de la vista (banner) | EV | Se mantiene: `dashboard-017` CA-13 pide reintento en el propio aviso |
| M-20 | `components/SpeciesFichaForm.tsx` 183-185 (`inline-alert`) | `error` general de guardar ficha | Línea | AV | Aviso (CA-28). Campos (M-21) intactos |
| M-21 | `components/SpeciesFichaForm.tsx` 176 (`field-error`) | Error de un campo | CE | CE | OK |
| M-22 | `components/CancelTicketDialog.tsx` 50-52 | Error de catálogo de motivos en el diálogo | DI | DI | OK (CA-22) |
| M-23 | `components/FormActions.tsx` 17-20 (`DialogFormFooter`) | Error general dentro de diálogo | DI | DI | OK |
| M-24 | `components/EnclosureQrDialog.tsx` 82-111 | Estados y errores dentro del diálogo de QR | DI | DI | OK |
| M-25 | `components/StepUpConfirmationDialog.tsx` 112-123 | Error de confirmación de contraseña o 2FA | DI | DI | OK |
| M-26 | `views/MemoriesView.tsx` 61; `views/PublishedSpeciesView.tsx` 106; `views/MemoryReviewDetailView.tsx` 57; `views/PublishedSpeciesDetailView.tsx` 61; `views/SpeciesRequestDetailView.tsx` 105; `views/SpeciesRequestsView.tsx` 81 | 403 de la página o fallo al cargar detalle o lista | Estado de la vista (`role="alert"` propio) | EV | Se mantienen (categoría 4). Unificar al componente de estado si la tarea lo cubre; no obligatorio |
| M-27 | `views/SpeciesRequestDetailView.tsx` 159, 200, 263; `components/PendingRequestNotice.tsx` 16 | Notas informativas y estado de publicación | Informativo | OK | Se mantienen |
| M-28 | `views/NewsView.tsx`, `views/EnclosuresView.tsx`, `views/TicketHistoryView.tsx`, `views/TicketPricesView.tsx`, `views/EventsView.tsx`, `views/UsersView.tsx` (`NoticeBar`) | Éxitos y errores de acciones con `NoticeBar` | AV | AV | OK (ya publican aviso). Revisar el fallback en línea de M-29 |
| M-29 | `components/NoticeBar.tsx` 27-47 (`global-feedback`) | Fallback en línea cuando no hay proveedor | Estilo anterior, activo solo sin proveedor | AV en la app | Quitar el fallback en línea de la app o aislarlo para pruebas (CA-19). Revisar tests que lo renderizan sin proveedor |
| M-30 | `App.tsx` 409 (`NoticeBar` de la shell) | `shell.state.notice` | AV | AV | OK |
| M-31 | `App.tsx` 411 (`Alert` «Tu cuenta no tiene permisos…») | Cuenta sin secciones | Estado de la shell | EV | OK |
| M-32 | `components/GlobalSearch.tsx` 62-68; `components/ImageUploadBox.tsx` 110; `components/MemoryImage.tsx` 14-18; `components/SpeciesPhoto.tsx` 22-28 | Búsqueda, medios y campos | Estado de widget o campo | CE o EV | OK |
| M-33 | `views/LoginView.tsx`, `views/TwoFactorSetupView.tsx`, `views/TwoFactorChallengeView.tsx`, `views/PwaRedirectView.tsx`, `components/LockoutNotice.tsx` | Autenticación | Fuera de la sección de reportes y de administración | NO | No se tocan (fuera de alcance) |

Resultado esperado del inventario: M-01, M-02, M-03, M-05, M-07 a M-09, M-11, M-16, M-18, M-20 y M-29 cambian; M-06, M-10, M-14, M-15, M-17 se reubican; el resto no cambia.

## Mapeo de criterios a pruebas

Entorno: Vitest con `environment: node`, sin jsdom. Los componentes se prueban con `renderToStaticMarkup`; las decisiones, con viewmodels puros; la migración de mensajes, con lectura del código fuente (`readFileSync`) y comprobaciones de patrones. Cada prueba nombra su CA en el título.

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | `CA-01 muestra una sola entrada Reportes y ninguna entrada vieja` | `tests/reports-navigation.test.tsx` (`navigation.ts`) |
| CA-02 | `CA-02 muestra cada pestaña solo con su permiso` | `tests/reports-navigation.test.tsx` |
| CA-03 | `CA-03 fija las pestañas de admin, zoo-admin y executive` | `tests/reports-navigation.test.tsx` |
| CA-04 | `CA-04 abre por defecto la primera pestaña permitida en orden` | `tests/reports-navigation.test.tsx` (`report-tabs.ts`) |
| CA-05 | `CA-05 conserva la pestaña en la sección y la reinicia al volver` | `tests/reports-tab-state.test.tsx` (`dashboard-shell.ts`) |
| CA-06 | `CA-06 ignora la selección de una pestaña no permitida` | `tests/reports-tab-state.test.tsx` |
| CA-07 | `CA-07 oculta Cancelaciones y el historial completo a executive` | `tests/reports-navigation.test.tsx` |
| CA-08 | `CA-08 no muestra cancelar en el historial de Reportes` | `tests/reports-shared-controls.test.tsx` (`TicketHistoryView` con `canCancel=false`) |
| CA-09 | `CA-09 deja Venta e Historial juntos para cashier` | `tests/reports-navigation.test.tsx` |
| CA-10 | `CA-10 cuenta mixta muestra historial de taquilla y no el de Reportes` | `tests/reports-navigation.test.tsx` (D-1) |
| CA-11 | `CA-11 no queda ningún identificador de Reporte de boletos ni Cancelaciones como sección` | `tests/reports-navigation.test.tsx` (lectura de `App.tsx`, `dashboard-shell.ts`, `navigation.ts`) |
| CA-12 | `CA-12 la búsqueda y las acciones llevan solo a pestañas permitidas` | `tests/reports-navigation.test.tsx` (`search-actions.ts`, `focus-target.ts`) |
| CA-13 | `CA-13 usa el mismo grupo de exportación con tres formatos en orden` | `tests/reports-shared-controls.test.tsx` (`ReportExportButtons`, `report-export.ts`) |
| CA-14 | `CA-14 deshabilita la exportación en curso y ubica los errores` | `tests/reports-shared-controls.test.tsx` |
| CA-15 | `CA-15 usa el mismo selector de periodo con Semanal por defecto` | `tests/reports-shared-controls.test.tsx` (`report-period.ts`, `ReportPeriodControls`) |
| CA-16 | `CA-16 usa el mismo componente de totales y estilo de tabla` | `tests/reports-shared-controls.test.tsx` (`ReportTotals`) |
| CA-17 | `CA-17 muestra carga, vacío y error con reintento en ambas pestañas` | `tests/reports-shared-controls.test.tsx` |
| CA-18 | `CA-18 los componentes compartidos usan solo tokens y no calculan` | `tests/reports-mvvm-tokens.test.tsx` (lectura de código) |
| CA-19 | `CA-19 todo error general de acción fuera de diálogo se publica como aviso` | `tests/feedback-policy.test.tsx` (`feedback-policy.ts`) |
| CA-20 | `CA-20 ActionError no repite el texto en línea fuera de diálogos` | `tests/feedback-policy.test.tsx` (lectura de `DashboardNotifications.tsx`) |
| CA-21 | `CA-21 los errores de campo siguen junto a su campo` | `tests/feedback-policy.test.tsx` |
| CA-22 | `CA-22 los diálogos y confirmaciones mantienen su error` | `tests/feedback-policy.test.tsx` (`InlineConfirm` con `inDialog`) |
| CA-23 | `CA-23 los errores de carga y el 403 quedan como estado de la vista` | `tests/feedback-policy.test.tsx` |
| CA-24 | `CA-24 cada entrada del inventario está en su categoría` | `tests/feedback-inventory.test.tsx` (lee la tabla de este plan y el código) |
| CA-25 | `CA-25 migra los mensajes de Usuarios` | `tests/feedback-migration.test.tsx` |
| CA-26 | `CA-26 migra los errores generales de Eventos, Noticias, Precios y Venta` | `tests/feedback-migration.test.tsx` |
| CA-27 | `CA-27 ubica los errores de exportación y periodo de Cancelaciones` | `tests/feedback-migration.test.tsx` |
| CA-28 | `CA-28 migra el aviso de consola y los errores generales de ficha` | `tests/feedback-migration.test.tsx` |
| CA-29 | `CA-29 no cambia packages/api-client ni añade llamadas` | `tests/reports-mvvm-tokens.test.tsx` (lectura y lista de `fetch` nuevos) |
| CA-30 | `CA-30 las decisiones viven en viewmodels puros` | `tests/reports-mvvm-tokens.test.tsx` |
| CA-31 | `CA-31 las pestañas tienen roles, flechas y estados ARIA` | `tests/reports-a11y.test.tsx` (`renderToStaticMarkup` de `ReportTabs`) |
| CA-32 | `CA-32 cada CA-01 a CA-31 tiene una prueba` | `tests/reports-coverage.test.tsx` |

## Tests existentes que cambian

Lista obtenida por búsqueda de etiquetas y permisos (`Reporte de boletos`, `Cancelaciones`, `Historial`, `Semanal`, `Mensual`, `Rango personalizado`, `Exportar`, `reports.view`, `ticket-history`, `cancellations`). El conteo de ocurrencias es orientativo; T-03 lo confirma.

| Archivo | Motivo del cambio | CA afectados |
|---|---|---|
| `tests/administration-navigation.test.tsx` (10 ocurrencias) | Entradas y etiquetas de admin, zoo-admin y executive | CA-01 a CA-03, CA-07, CA-09 |
| `tests/cancellation-report-navigation.test.tsx` (3) | Entrada «Cancelaciones» pasa a pestaña | CA-02, CA-11 |
| `tests/cancellation-report-filters.test.tsx` (1) | Selector de periodo pasa a botones | CA-15 (`dashboard-016` CA-05 se mantiene en contenido) |
| `tests/cancellation-report-export.test.tsx` (1) | Selector de formato pasa a botones | CA-13, CA-14 |
| `tests/ticket-report.test.tsx` (9) | Etiquetas de periodo y exportación compartidas | CA-13 a CA-17 |
| `tests/ticket-history.test.tsx` (1) | Historial sin cancelar en Reportes | CA-08, CA-09 |
| `tests/cancel-ticket-reason.test.tsx` | Diálogo de cancelar (taquilla) sin cambio; revisar que no se rompa | CA-09, CA-22 |
| `tests/global-search-actions.test.tsx` (2), `tests/global-search-navigation.test.tsx` (1), `tests/global-search-tolerance.test.tsx` (3) | Secciones de acciones y resultados de boletos | CA-12 |
| `tests/memory-navigation.test.tsx` (3) | Revisar solo si menciona secciones de reportes | CA-11 |
| `tests/real-staff-login.test.tsx` (4), `tests/step-up-two-factor.test.tsx` (1) | Etiquetas de navegación tras login | CA-01, CA-03 |
| `tests/fixed-roles-account-management.test.tsx` (2), `tests/admin-fixtures.ts` (1) | Etiquetas de secciones por rol (`sectionsForPermissions`) | CA-01, CA-03 (dashboard-017 CA-02) |
| `tests/dashboard-notifications.test.tsx` | `ActionError` deja de pintar texto en línea fuera de diálogos | CA-19, CA-20 |
| `tests/inline-content-forms.test.tsx`, `tests/staff-accounts.test.tsx`, `tests/console-notices.test.tsx` | Mensajes migrados de Usuarios, formularios en línea y aviso de consola | CA-25, CA-28 |
| `tests/responsive.test.tsx`, `tests/acceptance-coverage.test.tsx` | Revisar que no dependan de la navegación antigua | CA-31, CA-32 |
| `tests/global-demo-banner.test.tsx` (2) | Revisar etiquetas de reportes | CA-01 |

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | Sin dependencias nuevas. Componentes con `@arca/ui` y React existente. Sin cambios de conexión |
| II. La spec manda | Sí | Spec Aprobada con este plan y `tasks/020-unified-reports-and-feedback.md`, mismo slug |
| III. Lógica separada de la interfaz | Sí | Decisiones de pestañas, permisos y mensajes en viewmodels puros. Componentes sin `fetch`/`axios`. Totales y periodos de la API. Cumplimiento verificado en CA-30 |
| IV. Un test por criterio | Sí (previsto) | Mapeo de CA-01 a CA-32 arriba. Sin evidencia aún |
| V. Una sola fuente de verdad para los datos | Sí | Sin cambios de datos ni de esquema. No aplica DBR |
| VI. Código en inglés, personas en español | Sí | Identificadores en inglés (`report-tabs`, `feedback-policy`). Textos de UI en español (etiquetas, avisos) |

Ninguna excepción propuesta.

## Riesgos y decisiones

- **ADR requerido/aprobado:** ninguno. ADR 0002 se respeta (sin React Router).
- **Riesgos:**
  - Duplicado visual de errores (M-01): el cambio afecta a varias secciones a la vez. Mitigación: T-02 confirma el duplicado en el código y las pruebas de `dashboard-notifications.test.tsx` cubren el cambio.
  - Sin verificación visual en navegador: no hay shell para ejecutar la app ni para capturar pantalla. Las comprobaciones de 360 a 1366 px (CA-31) y de foco son de revisión manual, indicadas en T-14.
  - Búsqueda global a «Historial» de admin (CA-12): hoy el resultado navega a `ticket-history`. Mitigación: T-11.
  - Cambio de etiquetas y de exportación frente a `dashboard-016` (D-5, D-7): se anota en su nota de revisión.
  - Dependencia de `tickets.view-all` en `me` (T-01): si falta, es bloqueante para la pestaña Historial.
  - `NoticeBar` sin proveedor (M-29): algunos tests lo renderizan sin proveedor. Mitigación: T-12.
- **Alternativas:**
  - Mantener tres entradas de menú y solo unificar componentes: descartado (decisión 1).
  - Guardar la pestaña en la URL: descartado porque la navegación no tiene URL (ADR 0002 y patrón actual).
  - Dejar errores de carga como aviso emergente: descartado en D-2 por ser estado de la vista. Si el responsable funcional lo prefiere, se cambia la categoría 4 de RN-07 y M-06, M-26.

## Orden y aprobación

Secuencia recomendada:

1. Verificación previa (T-01) y confirmación del inventario (T-02).
2. Viewmodels puros y pruebas de decisiones (T-04 a T-06).
3. Política de mensajes y `ActionError` (T-09, T-10), antes de tocar secciones, porque cambia la base de todos los mensajes.
4. Componentes compartidos y vistas de reportes (T-07, T-08).
5. Navegación, shell, búsqueda y App (T-05, T-06, T-11).
6. Migración por sección (T-12, T-13).
7. Pruebas de cobertura, verificación y documentación (T-14 a T-18).

Aprobador funcional: responsable funcional (spec y plan). Evidencia: ninguna todavía; las tareas se marcan solo con evidencia de la sesión principal.

## Divergencias de implementación

- **M-09 y M-11 (texto exacto leído en T-02).** La entrada de `TicketPricesView` que pintaba `inline-alert` es el mensaje 2FA (M-10, estado de la sección, D-4); el error general de guardar precio ya era `ActionError` y pasa a aviso con M-01. En `TicketSaleView` la línea 195 es el fallo al cargar precios, con «Reintentar precios»: es estado de la vista (D-2) y se mantiene; el error de venta ya es `ActionError` (aviso).
- **M-08.** El aviso «El evento ya no está en la lista.» pasa a aviso emergente con un `ActionError`; como un aviso no puede llevar botón, la confirmación huérfana se cierra sola (`closeAction` en un efecto). Se retira el botón «Cerrar confirmación».
- **M-07.** `InlinePasswordReset` se trata como aviso (CA-25), no como confirmación en línea (M-03); el error de campo de la contraseña sigue junto al campo.
- **M-29.** Se mantiene el respaldo en línea de `NoticeBar` y de `ActionError` solo cuando no hay proveedor de avisos (pruebas de componentes aisladas); la app siempre monta `DashboardNotifications`, así que no hay texto repetido en pantalla. `ActionError` ya no publica avisos en diálogos (`inDialog`).
- **Periodo de Cancelaciones (CA-15).** Se retira el campo «Fecha de referencia» y el selector desplegable: el periodo lo fijan los botones compartidos y la navegación «Periodo anterior/siguiente» usa `previous_date`/`next_date` de la API. Los filtros de cajero y motivo se mantienen en un formulario aparte («Aplicar») y se envían junto con el periodo vigente.
- **Reporte de boletos.** `ticket-report.ts` guarda `fieldErrors` y `exportFieldErrors` (cambio aditivo del estado del viewmodel) para mostrar el 422 de periodo junto al selector y el de formato junto al grupo de exportación (CA-14, CA-15).
- **Título de las vistas.** Dentro de «Reportes» las vistas no repiten su `h1` (`heading={false}`); el único `h1` es «Reportes».
- **Entrada «Reportes».** Se muestra cuando la cuenta tiene al menos una pestaña disponible; una cuenta mixta solo con `tickets.create` y `tickets.view-all` (sin `reports.*`) no ve «Reportes» (D-1).
- **Búsqueda global (CA-12).** `resolveTicketRoute` (en `report-tabs.ts`) redirige los resultados de `ticket-history` y la acción «Exportar reporte» a la pestaña permitida de «Reportes»; la etiqueta de sección de la acción pasa a «Reportes».
- **Mensaje sin cambio de contrato.** No se tocó `packages/api-client` ni `apps/api`. La prueba de CA-29 comprueba por lectura de código (no por `git status`, porque el árbol trae cambios previos sin commit en `packages/api-client`).
- **Lint.** El dashboard no define script de lint; se ejecutaron Vitest y `tsc`.

## Nota de revisión (b) (CA-33 a CA-42)

- **Confirmaciones en modal.** `components/StaffActionDialog.tsx` (nuevo) monta un único `ConfirmDialog` para las acciones de Usuarios y trae el campo de contraseña nueva con sus errores por campo (`createPasswordResetHandlers` se mudó aquí). Noticias y Eventos montan un `ConfirmDialog` al final de la vista; `ContentCardActions` ya no tiene confirmación. `viewmodels/confirmation.ts` añade `confirmationFromCopy` (el título es el nombre accesible anterior; Noticias conserva «Confirmar cambio de estado» para el estado). Se eliminan `InlineConfirm` e `InlinePasswordReset`; el CSS `.inline-confirm*` queda sin uso y se retira en una limpieza posterior.
- **Contraseña del administrador.** El diálogo de `dashboard-015` ya es único y modal (`StepUpProvider`); el diálogo de la acción conserva `pendingAction` mientras la petición está en curso, así que ambos coexisten (el de contraseña, encima). Mismo mecanismo que Precios.
- **Inventario.** M-03 pasa a `ConfirmDialog` (M-04, categoría diálogo) y M-07 al diálogo de `StaffActionDialog` (el error general va en el diálogo, D-3, no como aviso).
- **Área y rol.** `viewmodels/staff-role-suggestion.ts` (nuevo, puro): `departmentSelectionChanges`, `roleSuggestionNotice`, `AREA_ROLE_HELP` y `suggestRole` (reexportado desde `staff-accounts.ts`). `StaffState.roleChosenManually` y la acción `role-chosen` registran la elección manual; se reinicia en `edit-started`, `edit-cancelled` y `saved` con reinicio de formulario. `staffDepartmentChanges` conserva el rol al editar (solo aviso suave) y sugiere en el alta salvo elección manual. `ListStaffOptionsAction` ya entrega `suggested_role` por área (solo si es asignable); sin cambios en API.
- Pruebas: `tests/modal-confirmations-and-area-role.test.tsx` (CA-33 a CA-42) y ajustes en `staff-accounts`, `inline-content-forms`, `feedback-*` y `administration-quality`.

## Nota: TulanPedia adopta el patrón

`ReportTabs` y `TulanpediaTabs` comparten `section-tabs`/`section-tab`/`section-tab-panel`; `tabForKey` es genérico y el panel usa `--content-gap`. Detalle en `plan/010-public-content-management.md` (CA-66 a CA-73).

## Nota de revisión (c) (CA-43 a CA-48): paginación unificada

- `components/Pagination.tsx` (nuevo) sustituye a `PaginationBar` y `HasMorePaginationBar` (eliminados). Entrada: `page` y, o bien `lastPage` + `total`, o bien `hasMore`; más `busy` y `onPageChange`. La lógica (resumen, extremos deshabilitados, ventana de números con «…») vive en `viewmodels/pagination.ts` (`buildPagination`, `pageItems`).
- Inventario: Usuarios, Historial y Boletos (`meta` con total) y Recintos, Noticias y Eventos (cliente, con total) usan el modo con total; TulanPedia (Solicitudes y Publicadas) y Momentos (`has_more`) usan el modo `hasMore`. Tamaños de página y reinicio al filtrar no cambian (siguen en sus viewmodels).
- Pendiente de API: Cancelaciones (`GET reports/cancellations`) entrega `rows` completo sin páginas; no se toca la API ni se pagina en cliente.
- CSS: se reutiliza `.pagination-bar*`; se añaden `.pagination-bar__gap` y foco `--ring`. No quedaba CSS de paginadores viejos sin uso.
- Sin cambios en `packages/api-client`.

## Nota de revisión (d) (CA-49 a CA-55): componentes compartidos y paginación con total

- **`@arca/ui` (sin dependencias nuevas; el paquete no tiene runner, se prueba desde las apps).** `src/pagination.ts` (lógica pura, mismo `buildPagination`/`pageItems`), `src/countdown.ts` (puro) y `src/useCountdown.ts` (hook); `Pagination`, `LockoutNotice` y `ConfirmDialog` en `src/index.tsx`; estilos con tokens en `src/styles.css` (`.pagination-bar*`, `.arca-confirm-dialog*`, `.arca-visually-hidden`). Se eliminan las copias de `apps/dashboard` y `apps/pwa`.
- **`LockoutNotice`.** Acepta `alertClassName` para que cada app ubique el aviso (dashboard: `auth-alert dialog-alert`; PWA: `login-error`); la región oculta usa `arca-visually-hidden`.
- **`ConfirmDialog`.** Compartido: título, mensaje, Cancelar/Confirmar y «Procesando…», con `error` como nodo. Lo propio del dashboard (`ActionError` y el ancho `confirm-dialog`) queda en el envoltorio `components/ConfirmDialog.tsx`; `ConfirmationCopy` encaja estructuralmente con `ConfirmDialogCopy`.
- **CSS.** Las reglas base de `.pagination-bar*` y del mensaje de confirmación salieron de `apps/dashboard/src/styles.css`; los ajustes de contexto (`.dashboard-app--admin .pagination-bar`, rejillas) se quedan en el dashboard.
- **Paginación con total.** Los reductores de TulanPedia y Momentos guardan `lastPage` y `total` junto a `hasMore`; las vistas pasan `lastPage` y `total` a `Pagination`. Cancelaciones: `useCancellationReport.goToPage` cambia `query.page`; `buildCancellationQuery` no lleva `page`, así que filtros y periodo vuelven a la página 1; `Rows` muestra `Pagination` con `report.meta` y el total de registros.
- **`@arca/api-client`.** `normalizeTotalPage` (exportada de `admin.ts`) rellena `meta` si la API aún no envía total; `cancellations()` copia el `meta` raíz al DTO; la exportación sigue sin `page`.
- Pruebas: `tests/shared-components-and-total-pagination.test.tsx` (CA-49 a CA-55 y las notas de `dashboard-016`, `-010` y `-008`); `tests/pagination.test.tsx` y `tests/step-up-lockout-countdown.test.tsx` ahora importan de `@arca/ui`.

## Nota de revisión (e) (CA-56 a CA-65): esqueletos de carga

- **`@arca/ui`.** `src/skeleton.tsx` (`Skeleton`, `SkeletonRegion`, `SkeletonTable`, `SkeletonCards`, `SkeletonForm`), `src/delayedFlag.ts` (lógica pura `startDelayedFlag` y `SKELETON_DELAY_MS` = 150) y `src/useDelayedFlag.ts`. Estilos con tokens y `rem` en `src/styles.css`; el brillo vive en `prefers-reduced-motion: no-preference` y hay un bloque `reduce` sin animación. Sin dependencias nuevas.
- **Dashboard.** `components/LoadingSkeletons.tsx` compone los esqueletos por pantalla con las clases de la rejilla o la tabla reales (`table-scroll data-table-scroll`, `data-table`, `content-card-grid`, `event-card-grid`, `enclosure-grid`, `species-grid`). `Delayed` aplica el retraso y deja solo el aviso accesible antes de 150 ms. Los reportes guardan sus listas de encabezados como constantes que un test compara con las vistas.
- **Integración sin tocar ViewModels.** `ListStatusMessage` recibe `skeleton` opcional y lo muestra en `status === "loading"`; sin él conserva `LoadingIndicator` (búsqueda global y QR). `ReportViewState` recibe el esqueleto de su pestaña. Las vistas con tabla pasan `columns` de su propio `DataTable`. Usuarios solo muestra el esqueleto si no hay filas (comportamiento actual: con filas las conserva).
- **Retiro.** Se eliminan `report-loading*` de `styles.css` y de `ReportViewState`; Reportes pierde el contador de segundos.
- **Inventario (pantalla → esqueleto).** Usuarios, Historial, TulanPedia Solicitudes y Momentos: `TableSkeleton`. Reportes Boletos y Cancelaciones: `TicketReportSkeleton` y `CancellationReportSkeleton`. Noticias, Eventos, Recintos y Publicadas: `CardGridSkeleton`. Panel principal: `DashboardSummarySkeleton`. Detalles: `DetailSkeleton` (con `SkeletonForm` en especie y solicitud). Precios: `PricesSkeleton`. Venta: `PriceLineSkeleton`. Constitución: solo presentación (III), sin dependencias (I).
- Pruebas: `tests/loading-skeletons.test.tsx` (CA-56 a CA-65) y ajuste de `ticket-report.test.tsx`.
