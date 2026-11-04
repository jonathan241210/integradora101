# Tareas · 009 · ticket-sales

- Spec: `apps/api/specs/009-ticket-sales.md` (Aprobada, Jonathan, 2026-11-02)
- Plan: `apps/api/plan/009-ticket-sales.md` (Aprobado, Jonathan, 2026-11-02)
- Estado del checklist: En progreso (backend implementado el 2026-11-02; revisión 2026-11-02 implementada en código y pruebas, T-59 a T-73 marcadas con evidencia de PHPUnit; T-58 (BD) marcada con evidencia en arca_pruebas el 2026-11-02; queda T-74 (verificación final); pendientes T-01 (subir y bajar en MySQL 8.0 aislado, staging y producción), T-03 en CI con PHP 8.4, T-55 a T-57 y el PR). Una casilla se marca solo con evidencia (salida de test, enlace a PR o commit), nunca por haber escrito el código.
- Consumidor: `apps/dashboard/tasks/005-ticket-sales.md` (requiere las tareas indicadas en «Contrato para el dashboard»).
- Revisión 2026-11-02 (aprobada por Jonathan; spec sigue Aprobada): tareas nuevas T-58 a T-74. Ver la sección «Revisión 2026-11-02» al final de la lista.

## Alcance de esta lista

- **CA vigentes (32):** CA-01 a CA-22, CA-27 a CA-31, CA-34 y CA-42 a CA-45 (revisión de 2026-11-02). Cada uno tiene al menos una tarea de prueba.
- **CA diferidos, excluidos (13):** CA-23, CA-24, CA-25, CA-26, CA-32, CA-33 y CA-35 a CA-41 (decisión 2026-11-02). No tienen tarea ni prueba.
- **RN vigentes:** RN-01 a RN-09, RN-12 a RN-18 y RN-29 a RN-31 (revisión de 2026-11-02).
- **RN diferidas, excluidas:** RN-10, RN-11 y RN-19 a RN-28 (avisos y correo; ADR 0020 Propuesto, sin trabajo).
- **Rutas excluidas:** `GET /api/v1/admin/notifications`, `POST .../notifications/{notification}/read` y `POST .../notifications/{notification}/acknowledge`.
- **Sin `staff_notifications`:** la tabla existe por DBR-006 pero no tiene modelo, Action ni tarea en esta iteración (decisión 5).

Convenciones:
- Rutas de código relativas a `apps/api/src`, salvo que se indique otra cosa.
- Tests en `tests/Feature/Tickets/` con `DatabaseTransactions` sobre `arca_pruebas`. Prohibido `RefreshDatabase`, `migrate:fresh` y cualquier migración desde los tests. Nunca `arca_zoo`.
- Nombre de cada método de prueba: `test_caNN_ticket_sales_<descripción>()`.
- Trait `CreatesAdministrators` para cuentas por rol y 2FA.
- Etiquetas de delegación: `[BD]` responsable de BD (Víctor Adrián); `[backend]` Jonathan; `[docs]` documentador, o backend con petición expresa; `[verificación]` sesión principal o revisor.
- Ninguna tarea crea SQL ni migraciones. Ninguna tarea modifica `api-007` como spec ni como plan.

## Base de datos (responsable de BD)

- [ ] **T-01** (CA-08, RN-13) `[BD]`: evidencia de DBR-006 por ambiente. Migración creada y probada (subir y bajar) en MySQL 8.0 aislado. Verificación de columnas e índices: `tickets.qr_code` único, `tickets(cashier_id, purchased_at)`, `ticket_prices(ticket_type, effective_at)`, `staff_notifications` creada sin uso. Resultado de la no regresión en `arca_pruebas`. Actualizar la tabla «Aplicación por ambiente» y la sección «Pruebas y evidencia» de `docs/database/requests/DBR-006-ticket-sales.md`.
  - Estado de partida: DBR-006 en `Lista para backend` (cabecera). La evidencia está pendiente. Bloquea el despliegue, no el desarrollo.
  - Ver duda 3 sobre la contradicción entre la cabecera y la sección de evidencia.
  - Evidencia parcial (2026-11-02, Jonathan; consultas de solo lectura sobre `arca_pruebas`): migración `2026_11_02_000006_ticket_sales_schema` en batch 7 (Ran); columnas, índices y claves de `tickets`, `ticket_prices` y `staff_notifications` verificados. Detalle y observaciones en `docs/database/requests/DBR-006-ticket-sales.md`, «Pruebas y evidencia».
  - Pendiente: subir y bajar la migración en MySQL 8.0 aislado (no ejecutado); aplicación en staging y producción (sin evidencia). Sin marcar.
- [x] **T-58** (revisión 2026-11-02, punto 4; RN-13) `[BD]`: confirmar el tipo real de `tickets.total_amount` en cada ambiente (según Jonathan, 2026-11-02: `DECIMAL(8,2)`, tope 999,999.99). Corregir en `docs/database/esquema-ingles.md` la fila de `total_amount` de `tickets`, que hoy documenta `DECIMAL(10,2)`. La corrección la hace el responsable de BD; ni backend ni documentación la tocan. Si el negocio necesita totales mayores, se abre una DBR nueva; no se cambia la migración aprobada. Evidencia: consulta de metadatos de la columna en `arca_pruebas`, sin datos de visitantes.
  - No bloquea el desarrollo: el tope de 999,999.99 ya lo aplica `RegisterTicketSaleAction`.
  - Evidencia (2026-11-02): «Verificado por Jonathan el 2026-11-02 (consultas de solo lectura ejecutadas con asistencia de Claude Code)». En `arca_pruebas`, `tickets.total_amount` es `DECIMAL(8,2)` NULL. `docs/database/esquema-ingles.md` corregido: `total_amount` a DECIMAL(8,2), `qr_code` a NULL (la DBR lo pedía NOT NULL), y columnas nuevas de `tickets` y tablas `ticket_prices` y `staff_notifications` documentadas.
  - Alcance de la verificación: solo `arca_pruebas`. Staging y producción no verificados; el texto de la tarea pide confirmarlo «en cada ambiente».
  - Nota de gobierno: la tarea asigna la corrección al responsable de BD. La edición de documentación la hizo la sesión principal con petición expresa; BD debe revisarla.

## Dependencias, permisos y modelos

- [x] **T-02** (CA-09; ADR 0019) `[backend]`: `composer require bacon/bacon-qr-code:^3.1` desde `apps/api/src`. Verificar que `composer.json` y `composer.lock` cambian solo por esa dependencia y que la versión instalada es v3.1.1 (la fijada en el ADR).
  - Archivos: `apps/api/src/composer.json`, `apps/api/src/composer.lock`.
  - Ruta confirmada (duda 4 resuelta): `apps/api/src/composer.json`, que el plan ya usa desde el 2026-11-02.
- [ ] **T-03** (CA-09; ADR 0019) `[backend]`: ejecutar `composer audit` y registrar la salida en el PR. Comprobar que `ext-iconv` está habilitada en PHP 8.4 de desarrollo y de CI. Si falta, documentar el requisito en `apps/api/docs/tickets.md` (T-53). No añadir variables ni secretos.
  - Depende de T-02.
  - Evidencia parcial (2026-11-02, Jonathan):
    - Salida de `composer audit`: un único aviso, severidad medium, CVE-2026-45070 en `symfony/mime`. Es ajeno a `bacon/bacon-qr-code` v3.1.1.
    - `ext-iconv` habilitada en el PHP 8.5.12 local (también `ext-xmlwriter`).
    - Pendiente: confirmar `ext-iconv` en el PHP 8.4 de CI y registrar la salida de `composer audit` en el PR. Por eso sigue sin marcar.
- [x] **T-04** (CA-27; RN-13) `[backend]`: `app/Models/Ticket.php`. Quitar el bloqueo de `saving`/`deleting` y la condición de solo lectura. Añadir `SoftDeletes`, `fillable` con las columnas de DBR-006, casts (`purchased_at` y `cancelled_at` en UTC; precios unitarios con dos decimales) y `$timestamps = false` (la tabla no tiene marcas de tiempo). No extiende `BaseModel` (decisión 1). El modelo no expone `qr_svg` como atributo.
  - Prueba: `TicketSnapshotTest` (T-48).
- [x] **T-05** (CA-18; RN-13, RN-05) `[backend]`: `app/Models/TicketPrice.php` (nuevo). `SoftDeletes`, `fillable`, casts (`effective_at` en UTC; `amount` con dos decimales), relaciones `createdBy` y `updatedBy`, marcas de tiempo `created_at` y `updated_at` que DBR-006 (resolución 8) incluye en `ticket_prices`. No extiende `BaseModel`: sigue el patrón de `Ticket` (decisión 1 del plan, ampliada a `TicketPrice` el 2026-11-02; ADR 0021, excepción a).
  - Desbloqueada: la duda 1 está resuelta.
  - Es prerrequisito de T-09, T-11 y T-13.
- [x] **T-06** (CA-06, CA-13, CA-22; RN-12) `[verificación]`: leer `database/seeders/RolesAndPermissionsSeeder.php` y confirmar la matriz: `ticket-prices.manage` solo en `admin`; `tickets.create` y `tickets.cancel` solo en `cashier`; `tickets.view` en `admin`, `zoo-admin` y `cashier`. El seeder ya lo cumple (revisado el 2026-11-02). Si una prueba lo contradice, corregir solo el seeder y registrarlo. No se crea migración.
  - Prueba: `CreateTicketSaleAccessTest` (T-34), `CancelTicketAccessTest` (T-40) y `TicketPriceAccessTest` (T-47).

## Auditoría y zona horaria

- [x] **T-07** (CA-28; RN-13) `[backend]`: `app/Actions/Admin/LogAdminActivityAction.php`. Añadir `qr_svg` a `FORBIDDEN_KEYS`, junto a `qr_code`. Los eventos `ticket-sold`, `ticket-cancelled` y `ticket-price-changed` los escriben las Actions de venta, cancelación y precios (T-11, T-18, T-21), no esta tarea.
  - Prueba: `TicketAuditTest` (T-49).
- [x] **T-08** (CA-29; RN-16) `[backend]`: reutilizar `App\Actions\Admin\Reports\ResolveRequestedTimezoneAction` de `api-007` (T-40 de su lista) para historial y cancelación, sin cambiar esa Action. Confirmar que un `timezone` inválido usa `America/Mexico_City` sin 422.
  - Re-evaluada tras la revisión (2026-11-02): la parte de cancelación ya no usa `ResolveRequestedTimezoneAction`; solo la usa el historial para `from`/`to` y presentación. `TicketDatesTest` en verde. Casilla se mantiene.
  - Prueba: `TicketDatesTest` (T-50).

## Precios (solo `admin` con 2FA)

- [x] **T-09** (CA-04, CA-05; RN-03) `[backend]`: `app/Actions/Admin/Tickets/ResolveCurrentTicketPriceAction.php`. Resuelve el precio vigente por tipo y momento UTC: fila no eliminada con `effective_at` menor o igual al momento, orden `effective_at` desc y `id` desc. Devuelve nulo si no hay precio. Sirve a `current`, a la venta y a los tests.
  - Depende de T-05.
- [x] **T-10** (CA-17; RN-03) `[backend]`: `ListCurrentTicketPricesAction` y `app/Http/Resources/Admin/Tickets/TicketPriceCurrentResource.php`. Por tipo `adult` y `child`: `amount`, `effective_at` (ISO 8601 UTC) y `next` (monto y `effective_at` del próximo programado, si existe). Sin precio vigente: `amount` nulo y `message` en español.
  - Depende de T-09.
- [x] **T-11** (CA-18, CA-19; RN-05, RN-06) `[backend]`: `app/Actions/Admin/Tickets/ScheduleTicketPriceChangeAction.php`. En `DB::transaction` crea dos filas (adulto y niño) con el mismo `effective_at`: el instante de la operación en `immediate`, o el indicado en `scheduled`. `created_by` es el admin actual. No modifica filas previas. Registra `ticket-price-changed` con `LogAdminActivityAction` (T-07). No crea avisos ni encola correos (diferido).
  - Depende de T-05, T-07.
- [x] **T-12** (CA-20, CA-21; decisión 3 de la spec) `[backend]`: `app/Http/Requests/Admin/Tickets/SaveTicketPricesRequest.php`. `adult_amount` y `child_amount` numéricos, mayores que cero, con máximo dos decimales (422 por campo). `mode` en `immediate` o `scheduled`. `effective_at` obligatorio solo en `scheduled`, en ISO 8601 con desfase u `Z`; sin zona, 422. En `scheduled`, debe ser posterior al momento de la operación (422 en español). Mensajes en `lang/es`.
- [x] **T-13** (CA-17, CA-18, CA-22; RN-14) `[backend]`: `app/Http/Controllers/Admin/TicketPriceController.php` (métodos `current` y `store`, delgados), `TicketPriceResource` y rutas nombradas dentro del grupo `admin.` de `routes/api.php`:
  - `GET ticket-prices/current` → `admin.ticket-prices.current`, `permission:tickets.create|ticket-prices.manage`. Declarada antes de cualquier ruta `ticket-prices/{...}`.
  - `POST ticket-prices` → `admin.ticket-prices.store`, `permission:ticket-prices.manage` y 2FA del grupo.
  - Depende de T-10, T-11, T-12.
- [x] **T-64** (CA-45; RN-31) `[backend]`: en `SaveTicketPricesRequest`, con `mode` `scheduled`, `effective_at` no puede ser posterior a ahora más un año; si lo es, 422 en español (texto propuesto en la revisión, pregunta R3). Sin cambio para `immediate`.
  - Depende de T-12.
  - Prueba: T-69.

## Venta (`cashier`)

- [x] **T-14** (CA-02; RN-02) `[backend]`: `app/Actions/Admin/Tickets/CalculateTicketTotalAction.php`. Calcula en céntimos enteros y devuelve el total como cadena con dos decimales (por ejemplo, `"66.00"`). No usa floats.
- [x] **T-15** (CA-08; RN-07) `[backend]`: `app/Actions/Admin/Tickets/IssueTicketQrTokenAction.php`. Genera 32 bytes con `random_bytes` y los codifica en base64url (43 caracteres, cabe en `VARCHAR(255)`). La unicidad la garantiza el índice único de DBR-006; un duplicado lanza excepción.
- [x] **T-16** (CA-09; RN-07; ADR 0019) `[backend]`: `app/Actions/Admin/Tickets/RenderTicketQrSvgAction.php`. Genera el SVG con `bacon/bacon-qr-code` a partir de `qr_code`, en memoria. No persiste el SVG.
  - Depende de T-02 y T-03.
- [x] **T-17** (CA-03) `[backend]`: `app/Http/Requests/Admin/Tickets/RegisterTicketSaleRequest.php`. `adult_quantity` y `child_quantity` enteros mayores o iguales a cero, con al menos uno mayor que cero. Ausentes, negativos, no enteros o ambos en cero → 422 por campo en español, sin crear nada.
- [x] **T-18** (CA-01, CA-04, CA-07, CA-27, CA-28; RN-01, RN-02, RN-04) `[backend]`: `app/Actions/Admin/Tickets/RegisterTicketSaleAction.php`. En una sola `DB::transaction`:
  1. Resuelve el precio vigente de ambos tipos con T-09 (sin precio → 422 «No hay un precio vigente configurado para este tipo de boleto.»).
  2. Calcula el total (T-14) y emite el token (T-15).
  3. Crea el boleto con `status` `completed`, `payment_method` `cash`, `cashier_id` del usuario, `purchased_at` en UTC y copia de los precios unitarios.
  4. Genera el SVG (T-16) en memoria y registra `ticket-sold` con `LogAdminActivityAction`, dentro de la transacción (excepción deliberada del plan, para que no quede auditoría parcial).
  - Cualquier fallo revierte todo.
  - Depende de T-04, T-09, T-14, T-15, T-16, T-07.
- [x] **T-19** (CA-01, CA-06) `[backend]`: `app/Http/Controllers/Admin/TicketSaleController.php` (método `store`, delgado), `app/Http/Resources/Admin/Tickets/TicketSaleResource.php` (folio = `tickets.id`, `purchased_at`, cantidades, precios unitarios, `total_amount` como cadena, `cashier_name`, `qr_svg`; nunca `qr_code`) y ruta `admin.tickets.store` (`POST tickets`, `permission:tickets.create`).
  - Depende de T-17 y T-18.
- [x] **T-61** (CA-42; RN-29) `[backend]`: tope de 100 por tipo en `RegisterTicketSaleRequest`. `adult_quantity` ≤ 100 y `child_quantity` ≤ 100; si no, 422 en español por campo con «No puedes vender más de 100 boletos de cada tipo en una misma venta.» (texto propuesto, pregunta R3). Mensaje en `lang/es/validation.php`. Sin boleto ni auditoría.
  - Depende de T-17.
  - Prueba: T-66.
- [x] **T-62** (CA-03 aclarado; RN-29) `[backend]`: cantidades estrictas en `RegisterTicketSaleRequest`. Booleanos, cantidades con fracción (p. ej. `1.5`) y cadenas no numéricas → 422 por campo en español, sin crear nada. Las cadenas numéricas enteras (p. ej. `"2"`) y el número `2.0` se resuelven según la pregunta R1 de la spec; hasta entonces, se implementa la propuesta de R1.
  - Depende de T-17 y T-61.
  - Prueba: T-70.
- [x] **T-63** (CA-43; RN-30) `[backend]`: límite de 60 solicitudes por minuto por usuario autenticado en `POST tickets`. Limitador con nombre `ticket-sales` registrado en `AppServiceProvider` (patrón de `visitor-*`), aplicado a `admin.tickets.store` después de `permission:tickets.create`. Respuesta 429 con el mensaje de `auth.throttle` (`lang/es/auth.php`).
  - Depende de T-19.
  - Prueba: T-67.

## Cancelación (`cashier`, solo boletos propios del mismo día)

- [x] **T-20** (CA-14, CA-31; RN-16) `[backend]`: `app/Actions/Admin/Tickets/IsTicketCancellableAction.php`. Regla única: el usuario es el cajero que vendió el boleto, tiene `tickets.cancel`, el `status` es `completed` y la fecha de venta es el mismo día que hoy en la zona resuelta. La usan el historial (`cancellable`) y la cancelación.
  - Re-evaluada tras la revisión (2026-11-02): `IsTicketCancellableAction` usa `config('arca.report_timezone')` y ya no recibe zona. `CancelTicketSameDayTest`, `TicketCancellableZoneTest` y `TicketHistoryTest` en verde. Casilla se mantiene.
  - Depende de T-04 y T-08.
- [x] **T-21** (CA-10, CA-12, CA-31; RN-08, RN-16) `[backend]`: `app/Actions/Admin/Tickets/CancelTicketAction.php`. En `DB::transaction` con `lockForUpdate()` sobre el boleto, revalida `status` dentro del bloqueo (ya cancelado → 422 «Este boleto ya está cancelado.») y el mismo día (T-20; si no → 422 «Solo se pueden cancelar boletos el mismo día en que se vendieron.»). Después cambia a `cancelled` y registra `cancelled_at` en UTC, `cancelled_by`, `cancellation_reason` y `updated_by`. No ejecuta `deleted_at`. Registra `ticket-cancelled` (T-07).
  - Re-evaluada tras la revisión (2026-11-02): `CancelTicketAction` usa la zona fija y devuelve 404 «Boleto no encontrado.» si el boleto desaparece entre authorize y bloqueo. `CancelTicketTest` y `CancelTicketOrderTest` en verde. Casilla se mantiene.
  - Depende de T-04, T-07, T-20.
- [x] **T-22** (CA-11, CA-13; RN-16) `[backend]`: `app/Http/Requests/Admin/Tickets/CancelTicketRequest.php`. `authorize()` resuelve primero el boleto con una consulta acotada a `cashier_id` = usuario actual; si no existe o no es suyo, 404 «Boleto no encontrado.» (antes de validar el cuerpo). Después valida `reason` (obligatorio, no vacío, máximo 255; 422 en español) y `timezone` (opcional, sin regla). Mismo patrón que `api-007` (`ManagedStaffAccountRequest`).
  - Re-evaluada tras la revisión (2026-11-02): `CancelTicketRequest` ya no lee ni valida `timezone`. `CancelTicketValidationTest` y `CancelTicketAccessTest` en verde. Casilla se mantiene.
  - Depende de T-04.
- [x] **T-23** (CA-10, CA-13) `[backend]`: `app/Http/Controllers/Admin/TicketCancelController.php` (invocable, delgado) y ruta `admin.tickets.cancel` (`POST tickets/{ticket}/cancel`, `permission:tickets.cancel`). Responde 200 con el boleto actualizado, usando `TicketHistoryResource` (T-26).
  - Re-evaluada tras la revisión (2026-11-02): `TicketCancelController` ya no pasa `timezone`. Pruebas de cancelación en verde. Casilla se mantiene.
  - Depende de T-21, T-22, T-26.
- [x] **T-59** (CA-31, CA-29; RN-16 revisada) `[backend]`: zona fija de cancelación. `CancelTicketRequest` deja de leer y validar `timezone`. `CancelTicketAction` e `IsTicketCancellableAction` comparan el día de la venta y el de la cancelación con `config('arca.report_timezone')`, no con la zona de la petición. La API ignora cualquier `timezone` del cuerpo. `ResolveRequestedTimezoneAction` de `api-007` no cambia.
  - Depende de T-21 y T-22.
  - Prueba: T-71.
- [x] **T-60** (CA-44; RN-30) `[backend]`: límite de 20 solicitudes por minuto por usuario autenticado en `POST tickets/{ticket}/cancel`. Limitador con nombre `ticket-cancel` registrado en `AppServiceProvider`, aplicado a `admin.tickets.cancel` después de `permission:tickets.cancel`. Respuesta 429 con el mensaje de `auth.throttle`. Un 403 no consume cuota.
  - Depende de T-23.
  - Prueba: T-68.

## Historial

- [x] **T-24** (CA-14, CA-29) `[backend]`: `app/Http/Requests/Admin/Tickets/ListTicketsRequest.php`. `folio` entero; `status` en lista cerrada (`completed`, `cancelled`); `from` y `to` como fechas, con `to` mayor o igual que `from`; `timezone` opcional; `page`; `per_page` máximo 100 (25 por defecto).
- [x] **T-25** (CA-14, CA-15; RN-17) `[backend]`: `app/Actions/Admin/Tickets/ListTicketHistoryAction.php`. Alcance: `cashier` → solo sus boletos (no ampliable por filtros); `admin` y `zoo-admin` → todos, en lectura. Filtros por folio, estado y rango de `purchased_at` en la zona resuelta. Orden `purchased_at` desc, paginado. Calcula `cancellable` con T-20 en una sola consulta (sin N+1).
  - Re-evaluada tras la revisión (2026-11-02): `cancellable` del historial usa la zona fija (T-65); `timezone` solo para `from`/`to`. `TicketHistoryTest` y `TicketCancellableZoneTest` en verde. Casilla se mantiene.
  - Depende de T-20, T-24, T-08.
- [x] **T-26** (CA-14, CA-16, CA-29) `[backend]`: `app/Http/Resources/Admin/Tickets/TicketHistoryResource.php`. Folio, `purchased_at`, cantidades, total, `status`, `cancelled_at`, `cancellation_reason`, `cashier_name` y `cancellable`. Nunca `qr_code` ni `qr_svg`. Fechas en ISO 8601 UTC (`toIso8601ZuluString()`).
  - Depende de T-25.
- [x] **T-27** (CA-14, CA-15, CA-16) `[backend]`: `app/Http/Controllers/Admin/TicketController.php` (método `index`, delgado) y ruta `admin.tickets.index` (`GET tickets`, `permission:tickets.view`).
  - Depende de T-24, T-25, T-26.
- [x] **T-65** (CA-14, CA-29; RN-16 revisada) `[backend]`: `ListTicketHistoryAction` calcula `cancellable` con `config('arca.report_timezone')` a través de `IsTicketCancellableAction` (T-59). El `timezone` de la query sigue interpretando `from` y `to` y la presentación; el contrato de la query no cambia.
  - Depende de T-59 y T-25.
  - Prueba: T-72.

## Impacto en `api-007` (reportes y panel)

- [x] **T-28** (CA-34; RN-18) `[backend]`: añadir el filtro `status` = `completed` en la consulta de cada Action que lee `tickets`: `SummarizeTicketSalesAction`, `BuildDashboardSummaryAction`, `BuildTicketReportAction` (totales, desglose y listado) y `ExportTicketReportAction`. Revisar `TicketReportCsvWriter`, `TicketReportXlsxWriter` y `TicketReportPdfWriter`: solo cambian si consultan `tickets` directamente. El filtro vive en la Action, no en el cliente. No cambian las reglas de zona horaria ni de periodos (api-007 CA-21, RN-14).
  - Depende de T-04.
- [x] **T-29** (CA-34; api-007 CA-19, CA-20, CA-22, CA-23) `[backend]`: regresión de `api-007`. Revisar los tests existentes que asumen `Ticket` de solo lectura o que cuentan cancelados (si existen) y ajustarlos solo en lo que falle por el cambio. Los boletos de prueba quedan `completed` por defecto. No editar la spec ni el plan de `api-007`.
  - Depende de T-28.

## Pruebas (un test por CA vigente)

- [x] **T-30** (CA-01) `[backend]`: `CreateTicketSaleTest`. Cajero con `tickets.create` y precios vigentes: 201; `completed`, `cash`, `cashier_id`, precios copiados, folio, `cashier_name` y `purchased_at` en UTC.
- [x] **T-31** (CA-02) `[backend]`: `TicketTotalTest` (unitario y de feature). Dos adultos y un niño con precios de 25.00 y 16.00 dan `"66.00"`, sin floats.
- [x] **T-32** (CA-03) `[backend]`: `CreateTicketSaleValidationTest`. Negativos, no enteros, ausentes y ceros: 422 por campo en español, sin boleto ni auditoría.
- [x] **T-33** (CA-04, CA-05) `[backend]`: `TicketPriceResolutionTest`. Sin precio vigente para un tipo: 422 con el mensaje exacto, sin boleto. Con precio programado: la venta antes de la fecha usa el anterior y la venta después usa el nuevo (`Carbon::setTestNow`).
- [x] **T-34** (CA-06) `[backend]`: `CreateTicketSaleAccessTest`. `admin`, `zoo-admin`, `executive` y `veterinarian` reciben 403; sin sesión, 401. Incluye la verificación de T-06.
- [x] **T-35** (CA-07) `[backend]`: `CreateTicketSaleAtomicityTest`. Fallo forzado al emitir el SVG o el token (servicio sustituido por un binding falso): sin boleto y sin registro de auditoría.
- [x] **T-36** (CA-08) `[backend]`: `TicketQrTokenTest`. Dos ventas generan tokens distintos. Insertar un `qr_code` duplicado falla por el índice único.
- [x] **T-37** (CA-09) `[backend]`: `TicketQrSvgTest`. La respuesta contiene un SVG (`<svg`); dos tokens distintos producen SVG distintos; el SVG no se persiste en la base de datos.
- [x] **T-38** (CA-10, CA-12) `[backend]`: `CancelTicketTest`. Cancelación del mismo día con motivo: 200; `cancelled_at`, `cancelled_by` y `cancellation_reason` correctos; la fila permanece. Segunda cancelación: 422 «Este boleto ya está cancelado.», sin cambios.
- [x] **T-39** (CA-11) `[backend]`: `CancelTicketValidationTest`. Motivo ausente o vacío: 422 en español; el boleto no cambia.
- [x] **T-40** (CA-13) `[backend]`: `CancelTicketAccessTest`. `admin`, `zoo-admin`, `executive` y `veterinarian` reciben 403. Un cajero que intenta cancelar un boleto ajeno recibe 404 «Boleto no encontrado.».
- [x] **T-41** (CA-31; RN-16) `[backend]`: `CancelTicketSameDayTest`. Boleto de un día anterior en la zona de la petición: 422 «Solo se pueden cancelar boletos el mismo día en que se vendieron.», sin cambios. Boleto del mismo día: se aplica CA-10.
  - Re-evaluada tras la revisión (2026-11-02): las pruebas se reescribieron: ya no envían `timezone` como regla; se añadió `test_ca31_ticket_sales_timezone_del_cuerpo_se_ignora`. En verde. Casilla se mantiene.
- [x] **T-42** (CA-14, CA-16) `[backend]`: `TicketHistoryTest`. Lista paginada, orden `purchased_at` desc, incluye cancelados con su motivo, filtros por folio, estado y rango, `cancellable` correcto y ningún elemento con `qr_code` ni `qr_svg`.
  - Re-evaluada tras la revisión (2026-11-02): `cancellable` verificado con zona fija; `TicketHistoryTest` sin cambios y en verde. Casilla se mantiene.
- [x] **T-43** (CA-15) `[backend]`: `TicketHistoryScopeTest`. El cajero solo ve lo suyo, aunque filtre por otro `cashier_id`. `admin` y `zoo-admin` ven todos los boletos en lectura. `executive` y `veterinarian` reciben 403.
- [x] **T-44** (CA-17) `[backend]`: `TicketPriceCurrentTest`. Devuelve vigente y próximo por tipo; sin precio, `amount` nulo y mensaje. `cashier` y `admin` reciben 200; `zoo-admin` recibe 403.
- [x] **T-45** (CA-18, CA-19) `[backend]`: `TicketPriceChangeTest`. Cambio inmediato: 201, `effective_at` igual al instante UTC, `created_by` del admin y `current` actualizado. Cambio programado con `Carbon::setTestNow`: antes de la hora sigue el precio anterior; a partir de ella, el nuevo.
- [x] **T-46** (CA-20, CA-21) `[backend]`: `TicketPriceValidationTest`. `scheduled` con fecha pasada: 422 sin filas. Monto cero, negativo o con tres decimales: 422 por campo sin filas. `effective_at` sin desfase: 422 (decisión 3).
- [x] **T-47** (CA-22) `[backend]`: `TicketPriceAccessTest`. `zoo-admin` y `cashier` reciben 403 al cambiar precios. `admin` sin 2FA recibe 403 `two_factor_setup_required` y no se crean filas. Incluye la ampliación de `AdminAccessTest` (api-007 T-32) con las rutas `admin.tickets.*` y `admin.ticket-prices.*` si esa prueba enumera rutas.
- [x] **T-48** (CA-27) `[backend]`: `TicketSnapshotTest`. Tras cambiar el precio, el total y los precios unitarios de un boleto ya vendido no cambian.
- [x] **T-49** (CA-28) `[backend]`: `TicketAuditTest`. Activitylog registra actor, evento y recurso en venta, cancelación y cambio de precio. Ninguna propiedad contiene `password`, `qr_code` ni `qr_svg`.
- [x] **T-50** (CA-29) `[backend]`: `TicketDatesTest`. `purchased_at`, `cancelled_at` y `effective_at` salen en UTC ISO 8601 (sufijo `Z`). Un `timezone` inválido usa `America/Mexico_City` sin 422.
- [x] **T-51** (CA-34) `[backend]`: `Feature/Admin/ReportExcludesCancelledTicketsTest`. Un boleto cancelado no suma en panel, reporte ni exportación, y no aparece en el listado del reporte.
- [x] **T-52** (CA-30) `[backend]`: `TicketSalesCoverageTest`. Busca en `tests/` el nombre de cada CA vigente (CA-01 a CA-22, CA-27 a CA-31 y CA-34) y verifica que `DB_DATABASE` es `arca_pruebas`. No exige pruebas de CA diferidos. Sigue el patrón de `Admin/AdminCoverageTest`.
- [x] **T-66** (CA-42; revisión 2026-11-02) `[backend]`: `TicketSaleLimitsTest::test_ca42_ticket_sales_maximo_100_por_tipo`. 100 adultos y 100 niños (en ventas separadas) → 201; 101 adultos → 422 con el mensaje; 101 niños → 422; sin boleto ni auditoría nuevos.
  - Depende de T-61.
- [x] **T-67** (CA-43; revisión 2026-11-02) `[backend]`: `TicketSaleLimitsTest::test_ca43_ticket_sales_limite_de_60_por_minuto`. Hasta 60 ventas en el minuto pasan; la 61.ª responde 429 y no crea boleto. Limpia el limitador en `setUp`.
  - Depende de T-63.
- [x] **T-68** (CA-44; revisión 2026-11-02) `[backend]`: `TicketCancelLimitsTest::test_ca44_ticket_cancel_limite_de_20_por_minuto`. La 21.ª cancelación del minuto responde 429 y no cambia ningún boleto.
  - Depende de T-60.
- [x] **T-69** (CA-45; revisión 2026-11-02) `[backend]`: `TicketPriceHorizonTest::test_ca45_ticket_prices_effective_at_maximo_un_anio`. Programado a más de un año → 422 sin filas; dentro del año → 201. Usa `Carbon::setTestNow`.
  - Depende de T-64.
- [x] **T-70** (CA-03 aclarado; revisión 2026-11-02) `[backend]`: `CreateTicketSaleValidationTest::test_ca03_ticket_sales_booleanos_fracciones_y_cadenas_no_numericas`. `true`, `false`, `1.5` y `"dos"` → 422 por campo; sin boleto ni auditoría. El caso `"2"` se prueba como admitido o rechazado según R1.
  - Depende de T-62.
- [x] **T-71** (CA-31; revisión 2026-11-02) `[backend]`: `CancelTicketSameDayTest::test_ca31_ticket_sales_timezone_del_cuerpo_se_ignora`. Venta a las 23:30 del día D en America/Mexico_City y cancelación a las 23:50 del mismo día D, con `timezone` `Europe/Madrid` (que sería D+1) → 200. Boleto de día D-1 con cualquier `timezone` → 422 de CA-31.
  - Depende de T-59.
- [x] **T-72** (CA-14; revisión 2026-11-02) `[backend]`: `TicketCancellableZoneTest::test_ca14_ticket_sales_cancellable_usa_zona_del_zoologico`. Un boleto del mismo día en America/Mexico_City aparece con `cancellable` `true` aunque la query pida una `timezone` en la que ya sería del día siguiente.
  - Depende de T-65.
- [x] **T-73** (CA-30; revisión 2026-11-02) `[backend]`: actualizar `TicketSalesCoverageTest` (T-52) para buscar `CA-42` a `CA-45` además de los CA vigentes previos: 32 CA en total. No exige CA diferidos. Si falta el nombre de un CA vigente en `tests/`, la prueba falla.
  - Depende de T-66 a T-72.

## Documentación

- [x] **T-53** (RN-07, RN-14, RN-16, CA-29) `[docs]`: crear `apps/api/docs/tickets.md` y `apps/api/docs/arquitectura.md`. Contenido: referencia de endpoints y permisos; reglas de cancelación (orden de RN-16); alcance del historial; formato de fechas UTC; campo `cancellable`; formato de `effective_at` (ISO 8601 con desfase); requisito `ext-iconv` y `bacon/bacon-qr-code`; dependencia de DBR-006. Sin secretos ni valores de `.env`. Crear también `apps/api/docs/arquitectura.md` a partir de `docs/templates/arquitectura-app.md` (decisión de 2026-11-02, duda 5): capacidades marcadas como actual, propuesta o futura, y las excepciones enlazadas a ADR 0021.
  - Depende de T-03.
- [x] **T-54** (RN-18, CA-34) `[docs]`: actualizar `apps/api/docs/administracion.md`: los reportes y el panel excluyen boletos cancelados, con el cambio de totales que se verá al desplegar.
  - Depende de T-28.

## Verificación y entrega

- [ ] **T-55** (todos los CA vigentes) `[verificación]`: desde `apps/api/src` ejecutar `php artisan test --filter=Ticket`, `php artisan test --filter=Admin` y la suite completa en `arca_pruebas`; `./vendor/bin/pint --test`; `composer audit` de nuevo si la dependencia cambió. Registrar los resultados en el PR. No declarar nada en verde sin esa evidencia.
  - Evidencia parcial (2026-11-02): suite completa 179 pasaron y 1 falló (`CreateStaffCommandTest` ca14, comando interactivo sin TTY, ajeno a api-009); el otro fallo de la primera pasada (`TicketReportExportTest` ca23) se debió a temporales que dejaba un test nuevo, corregido y re-ejecutado en verde. `pint --test` sobre los archivos de api-009 pasa; el repositorio completo tiene incumplimientos previos de Pint. Sin marcar hasta una pasada completa en verde.
  - Observaciones ajenas a api-009 (2026-11-02, Jonathan): fallo de `CreateStaffCommandTest` ca14 (comando interactivo sin TTY). `./vendor/bin/pint --test` falla en `app/Models/User.php`, `EventImagesTest` y `NewsImagesTest`. Se registran aquí; no bloquean la tarea de api-009, pero impiden marcarla sin una pasada completa en verde.
- [ ] **T-56** (Constitución, todos) `[verificación]`: correr `/verify` para `api` y `/constitution-check` del PR. Comprobar que las excepciones de Constitución V (`Ticket` y `TicketPrice` sin `BaseModel`; `staff_notifications` sin SoftDeletes) y la excepción de Policy por registro constan en el PR y en ADR 0021 (duda 2 resuelta). Enlazar spec, plan y tasks, y citar `api-009` en los commits.
- [ ] **T-57** (control) `[verificación]`: marcar casillas solo con evidencia de T-55 y T-56. Pasar la spec a `Implementada` solo cuando todos los CA vigentes estén verificados. Los CA diferidos no se cuentan.
- [ ] **T-74** (todos los CA vigentes, 32; revisión 2026-11-02) `[verificación]`: repetir T-55 y T-56 con los cambios de la revisión (`php artisan test --filter=Ticket`, `--filter=Admin`, suite completa en `arca_pruebas`, `./vendor/bin/pint --test` y `composer audit` si cambia alguna dependencia). Registrar la salida en el PR. Ninguna casilla de la revisión se marca sin esa evidencia.
  - Depende de T-58 (evidencia de BD) y de T-59 a T-73.
  - Observaciones de la suite (2026-11-02, Jonathan): fallo ajeno a api-009 `CreateStaffCommandTest` ca14 (comando interactivo sin TTY). `./vendor/bin/pint --test` falla en `app/Models/User.php`, `EventImagesTest` y `NewsImagesTest`, ajenos a api-009. Sin marcar.

## Contrato para el dashboard

El dashboard (`apps/dashboard/tasks/005-ticket-sales.md`) puede desarrollar con cliente simulado (RN-08 de su spec). Para la validación de extremo a extremo necesita estas tareas cerradas:

| Flujo del dashboard | Tareas de API necesarias |
|---|---|
| Precio vigente y próximo | T-13, T-10 |
| Venta (`POST tickets`) | T-19, T-61 a T-63 (tope, cantidades estrictas y límite de frecuencia; revisión 2026-11-02) |
| Historial (`GET tickets`) | T-27, T-65 (revisión 2026-11-02) |
| Cancelación (`POST tickets/{ticket}/cancel`) | T-23, T-59 y T-60 (zona fija y límite de frecuencia; revisión 2026-11-02) |
| Cambio de precio (`POST ticket-prices`) | T-13, T-64 (límite de un año; revisión 2026-11-02) |
| Cifras de panel y reporte consistentes | T-28, T-29 |

## Orden recomendado de ejecución

1. En paralelo: T-01 (BD), T-02 y T-03 (dependencia), T-06 (verificación del seeder), T-07 (auditoría), T-08 (zona).
2. Modelos y precios: T-04, T-05, T-09, T-10, T-11, T-12, T-13.
3. Venta: T-14, T-15, T-16, T-17, T-18, T-19.
4. Cancelación: T-20, T-21, T-22, T-23.
5. Historial: T-24, T-25, T-26, T-27.
6. Impacto en api-007: T-28, T-29.
7. Pruebas de cada CA (T-30 a T-52), junto a su tarea.
8. Documentación (T-53, T-54) y verificación (T-55 a T-57).

Dependencias clave: la API antes que el dashboard para la validación real. El dashboard puede avanzar con cliente simulado, pero no cierra su E2E sin T-13, T-19, T-23 y T-27. T-28 y T-29 deben estar verdes antes de desplegar, junto con el dashboard-003 (cifras consistentes). DBR-006 en cada ambiente antes que el código (T-01).

## Checklist de marcado

- [ ] Cada casilla se marca con evidencia (salida de test, enlace a PR o commit).
- [ ] Cada tarea de test nombra su CA en el nombre del método.
- [ ] Ningún CA diferido tiene tarea ni prueba (ver «Alcance»).
- [ ] T-01 marcada solo cuando BD aporta la evidencia por ambiente.
- [ ] T-05 se marca solo con evidencia. La duda 1 está resuelta (`TicketPrice` sigue el patrón de `Ticket`).
- [ ] Ninguna casilla de `api-007` se toca desde esta lista.

## Revisión 2026-11-02 (aprobada por Jonathan)

Cambios de la revisión de la spec (la spec sigue Aprobada). Fuente: `apps/api/specs/009-ticket-sales.md`, sección «Revisión 2026-11-02», y el plan, decisiones 6 a 11.

- **Tareas nuevas:** T-58 (BD), T-59 a T-65 (código), T-66 a T-73 (pruebas) y T-74 (verificación). Se añaden al final de su sección. T-59 a T-73 marcadas el 2026-11-02 con evidencia: suite completa 193 pasaron y 2 fallaron (`CreateStaffCommandTest` ca14, ajeno, comando interactivo sin TTY; y `TicketSalesCoverageTest`, corregido y re-ejecutado en verde). Notas de implementación: `integer:strict` para cantidades (R1 por defecto), limitadores `ticket-sales`/`ticket-cancel` sin cuota para usuarios sin el permiso (el middleware `throttle` corre antes de `permission:`), 429 con `auth.throttle`. T-58 y T-74 siguen abiertas.
- **CA vigentes: 32** (CA-01 a CA-22, CA-27 a CA-31, CA-34 y CA-42 a CA-45). Los 13 CA diferidos siguen fuera.
- **RN vigentes:** RN-01 a RN-09, RN-12 a RN-18 y RN-29 a RN-31.
- **Casillas ya marcadas que dependen de la zona de cancelación anterior.** La revisión no desmarca ninguna casilla. La parte de zona que implementan queda superada hasta que T-59, T-60, T-65, T-71 y T-72 tengan evidencia. Afecta a T-08 (zona de cancelación), T-20 (`cancellable`), T-21 (día de cancelación), T-22 (`timezone` del cuerpo), T-23 (controlador), T-25 (`cancellable` del historial), T-41 (`CancelTicketSameDayTest` con la zona de la petición) y T-42 (`cancellable`). La sesión principal decide si esas casillas se reabren; este documento no las cambia.
- **Textos nuevos (propuesta del redactor, pendientes de confirmación, pregunta R3 de la spec):** mensaje de tope de 100 por tipo y mensaje de un año para `effective_at`. El 429 reutiliza `auth.throttle`.
- **Preguntas abiertas de la spec:** R1 (cadenas numéricas enteras y `2.0`) bloquea la decisión final de T-62 y T-70. R2 (CA propio para el tope de total de 999,999.99) no bloquea ninguna tarea. R3 (textos) afecta a T-61, T-64 y T-66.

## Dudas abiertas

1. **`TicketPrice` y `BaseModel`.** *Resuelta (2026-11-02, decisión 1 del plan):* `TicketPrice` sigue el patrón de `Ticket` (SoftDeletes y auditoría propia). No se crea `BaseModel`. Desbloquea T-05.
2. **Excepciones a Constitución V.** *Resuelta (2026-11-02):* las excepciones de `Ticket` y `TicketPrice` (sin `BaseModel`), de `staff_notifications` (sin SoftDeletes) y la de Policy por registro (CA-13) se formalizan en ADR 0021 (Aceptado; el equipo debe leerlo). La de Policy la regula `apps/api/AGENTS.md`, no la Constitución.
3. **DBR-006.** La cabecera dice «Lista para backend (Aplicada en arca_pruebas, 2026-11-02)», pero la sección «Pruebas y evidencia» y la tabla «Aplicación por ambiente» dicen «pendiente». ¿Se considera aplicada en `arca_pruebas` o no hasta que BD aporte evidencia? La cabecera también cita ADR 0019 como Propuesto.
4. **Ruta de `composer.json`.** *Resuelta (2026-11-02):* el plan usa `apps/api/src/composer.json`, porque el proyecto Laravel está en `apps/api/src/`.
5. **Arquitectura de la app.** *Resuelta (2026-11-02):* se añade a T-53 la creación de `apps/api/docs/arquitectura.md`, a partir de `docs/templates/arquitectura-app.md`.
6. **Formato de `effective_at`.** Decidido (decisión 3): ISO 8601 con desfase. Confirmar que el dashboard lo envía así (`apps/dashboard/tasks/005-ticket-sales.md`).
