# Plan técnico · 009 · ticket-sales

- Spec: `apps/api/specs/009-ticket-sales.md`
- Estado de spec: Aprobada (revisión aprobada por Jonathan el 2026-11-05 y revisión de boletos individuales aprobada por Jonathan el 2026-11-06; estado previo: Aprobada, Jonathan, 2026-11-02)
- Responsable técnico: Jonathan (backend, Actions, controladores, tests); Víctor Adrián (BD, DBR-006 aprobada y aplicada en `arca_pruebas`)
- Consumidores: `dashboard-005` (vía `@arca/api-client`)
- Estado del plan: Aprobado — Jonathan, 2026-11-02; revisión de 2026-11-05 aprobada (ver «Decisiones de la revisión 2026-11-05»); revisión de boletos individuales aprobada el 2026-11-06 (ver «Revisión boletos individuales»). Aprobación de 2026-11-02 (aprueba la solución y el Constitution Check con las excepciones de Constitución V registradas abajo y las decisiones 1, 3 y 5 de la sección «Decisiones de aprobación (2026-11-02)»)
- Alcance de este plan: CA y RN **vigentes** de la spec (CA-01 a CA-22, CA-27 a CA-31, CA-34 y, por la revisión de 2026-11-02, CA-42 a CA-45; RN-29 a RN-31; y, aprobadas el 2026-11-05, CA-46 a CA-49 y RN-32 a RN-34; y, aprobadas el 2026-11-06, CA-50 a CA-55 y RN-35 a RN-38). Excluidos por diferimiento (decisión 2026-11-02): CA-23 a CA-26, CA-32, CA-33, CA-35 a CA-41; RN-10, RN-11, RN-19 a RN-28; rutas de `notifications`. No se crea modelo ni Action para `staff_notifications` en esta iteración.
- ADR: 0019 **Aceptado** (2026-11-02), librería `bacon/bacon-qr-code` ^3.1 (v3.1.1) para CA-09. ADR 0021 **Aceptado** (2026-11-02), con las excepciones de Constitución V y la Policy por registro de este plan (`docs/adr/0021-ticket-sales-constitution-exceptions.md`). ADR 0020 (correo) diferido, sin trabajo en este plan.

## Decisiones de la revisión 2026-11-05 (aprobada por Jonathan el 2026-11-05)

Revisión de la spec 009 (sección «Revisión 2026-11-05», aprobada de Jonathan). Añade la cotización previa a la venta. Las decisiones 1 a 11 no cambian. Las tareas nuevas son T-75 a T-85 en `tasks/009-ticket-sales.md`.

12. **Endpoint de cotización.** `POST /api/v1/admin/tickets/quote` (`admin.tickets.quote`) dentro del grupo `admin.` de `routes/api.php`, con `permission:tickets.create` y, después, el límite `ticket-quotes` (RN-33; 120 por minuto, pregunta R4). Controlador invocable y delgado: `TicketQuoteController`.
13. **Action compartida.** `App\Actions\Admin\Tickets\QuoteTicketSaleAction` reúne lo que hoy hace `RegisterTicketSaleAction` en sus líneas 31 a 46: resolver el precio vigente de ambos tipos (`ResolveCurrentTicketPriceAction`), calcular el total (`CalculateTicketTotalAction`), aplicar el tope de importe máximo y lanzar el 422 con los mismos mensajes. `RegisterTicketSaleAction` la usa y conserva el resto (token, boleto, SVG, Activitylog y transacción). La respuesta de la venta no cambia.
14. **Validación compartida.** La cotización usa `RegisterTicketSaleRequest` sin cambios: las mismas reglas que la venta (CA-03, CA-42, RN-29).
15. **Respuesta.** `TicketQuoteResource` con `adult_unit_price`, `child_unit_price`, `adult_subtotal`, `child_subtotal` y `total_amount` (cadenas con dos decimales) y código 200. Nombres y código confirmados por Jonathan (pregunta R5).
16. **Sin efectos.** La cotización no escribe en ninguna tabla, no emite token QR, no genera SVG y no registra Activitylog. No hay transacción de escritura. Sin DBR: no cambia el esquema.
17. **Precio que cambia entre cotización y venta (RN-32).** Se acepta y se documenta: la venta resuelve el precio al registrarse.
18. **Permisos en `arca_pruebas`.** BD ejecuta `RolesAndPermissionsSeeder` (T-75), con el seeder ya sin `operational-staff.manage` (`api-007`, T-42). Hasta entonces, los CA de acceso con `admin` (CA-06, CA-47) no son válidos en `arca_pruebas`.
19. **Producción.** No hay procedimiento documentado para resembrar permisos en `arca_zoo` (pregunta R6; T-84, bloqueada). Ningún agente aplica permisos en producción.

## Decisiones de aprobación (2026-11-02)

Aprobado por Jonathan (responsable funcional y técnico de backend) el 2026-11-02. Las cuestiones que estaban pendientes en el borrador quedan cerradas así:

1. **`Ticket` y `TicketPrice` no usan `BaseModel`.** `BaseModel` no existe en el repositorio y `tickets` no tiene `created_by` (DBR-006). `Ticket` usa SoftDeletes y auditoría propias (`cashier_id` como creador, `updated_by`, `cancelled_by`, Activitylog). `TicketPrice` sigue el mismo patrón: SoftDeletes y auditoría propia con `created_by` y `updated_by`, que DBR-006 da a `ticket_prices`. No se crea `app/Models/BaseModel.php` en esta feature. Excepción registrada en el Constitution Check (principio V) y en ADR 0021 (excepción a). Desbloquea T-05 de las tasks.
2. **Márgenes de impresión (dashboard, `dashboard-005`).** Por defecto: térmica 2 mm y carta 15 mm. La spec 005 se ajustó el 2026-11-02 para que el rango de carta admita hasta 20 mm (térmica sigue de 0 a 10 mm). No afecta a la API.
3. **`effective_at` de precios programados.** El cliente envía ISO 8601 con desfase horario (o `Z`); la API valida que sea futuro (CA-20), lo convierte y guarda en UTC. Sin desfase, la API responde 422. Ver «Formato de `effective_at`» en «Riesgos y decisiones».
5. **`staff_notifications` sin SoftDeletes.** Excepción documentada y diferida: la tabla no se usa en esta iteración (avisos diferidos), no se crea modelo ni Action, y la excepción se revisa al reactivar avisos. Registrada en el Constitution Check (principio V).

## Decisiones de la revisión (2026-11-02, aprobada por Jonathan)

Revisión de la spec 009 (estado Aprobada, sin cambio). Sustituyen o amplían las decisiones anteriores donde se indica. Cambian código que hoy está marcado como hecho; esas tareas se reabren por la sección «Revisión 2026-11-02» de `tasks/009-ticket-sales.md`.

6. **Zona fija de cancelación (RN-16, CA-31, CA-14).** `CancelTicketRequest` deja de validar y leer `timezone`. `CancelTicketAction` e `IsTicketCancellableAction` usan `config('arca.report_timezone')`. `ListTicketHistoryAction` calcula `cancellable` con esa misma zona; su `timezone` de query sigue para `from`/`to` y presentación. `ResolveRequestedTimezoneAction` de `api-007` no se modifica. Sustituye la decisión de «Zona horaria» anterior para la cancelación.
7. **Tope por tipo (CA-42, RN-29).** `RegisterTicketSaleRequest` valida `adult_quantity` y `child_quantity` con máximo 100. El mensaje sale de `lang/es/validation.php`. Sin tope en el cliente. *Superada el 2026-11-06 por el tope de 50 boletos en total (decisión 27).*
8. **Cantidades estrictas (CA-03 aclarado).** Booleanos, fracciones y cadenas no numéricas responden 422 en `RegisterTicketSaleRequest`. La admisión de cadenas numéricas enteras depende de la pregunta R1 de la spec; hasta su respuesta, se implementa la propuesta (admitir `"2"`).
9. **Límites de frecuencia (CA-43, CA-44, RN-30).** Limitadores con nombre registrados en `AppServiceProvider`, con el mismo patrón que `visitor-*`: `ticket-sales` (60 por minuto) y `ticket-cancel` (20 por minuto), con clave por usuario autenticado. Se aplican en la ruta después de `permission:`. Responden 429 con el mensaje `auth.throttle` de `lang/es/auth.php`. No se usa IP como clave.
10. **Límite de `effective_at` (CA-45, RN-31).** `SaveTicketPricesRequest` añade una regla en modo `scheduled`: `effective_at` ≤ momento de la operación + 1 año; si no, 422.
11. **Sin cambio de esquema ni de dependencias.** Ninguna de las decisiones 6 a 10 toca la BD ni añade paquetes. El tope de 999,999.99 ya está en `RegisterTicketSaleAction` (`MAX_TOTAL_CENTS`). La nota sobre `DECIMAL(8,2)` queda en la spec (revisión, punto 4) y en `apps/api/docs/tickets.md`; la corrección de `docs/database/esquema-ingles.md` la hace BD (tarea T-58).

## Diseño de solución

Flujo en cada endpoint: **Form Request → Action → API Resource**, con controladores de una sola acción que solo inyectan la Request y la Action y devuelven el Resource. Toda regla (precio vigente, total, token, QR, reglas de cancelación, alcance del historial, validación de fechas de precio) vive en Actions bajo `App\Actions\Admin\Tickets\` (Constitución III). La auditoría la escribe `LogAdminActivityAction`, invocada desde la Action dentro de la transacción (ver «Transacciones»).

Límites:
- La API es la única autoridad de precios, totales, estados y alcance. El cliente envía cantidades, motivo, montos, modo y fecha; nunca un importe a cobrar.
- Las rutas viven en el grupo existente `Route::prefix('admin')->name('admin.')->middleware(['auth:sanctum', 'staff.user', 'administrator.two-factor'])` de `routes/api.php`. `administrator.two-factor` solo exige 2FA a los roles de `config('arca.two_factor_roles')` (`admin`, `zoo-admin`); `cashier` no se ve afectado.
- Cada ruta añade su `permission:` middleware (`tickets.create`, `tickets.view`, `tickets.cancel`, `ticket-prices.manage`), igual que los bloques de `api-007`.

### Decisiones de diseño

- **Orden de validación de cancelación (RN-16).** Los 404 de alcance deben ir antes que el 422 de motivo vacío. Por eso `CancelTicketRequest::authorize()` resuelve primero el boleto del cajero (consulta acotada por `cashier_id`, 404 «Boleto no encontrado.» si no existe o no es suyo) y después se valida el cuerpo. Es el mismo patrón que `api-007` divergencia 5 (`ManagedStaffAccountRequest`).
- **Sin Policy por registro en boletos.** AGENTS pide Policies para alcance. Aquí el alcance debe responder 404 (CA-13), no 403; una `TicketPolicy::cancel` devolvería 403 y contradiría CA-13. El alcance se implementa como consulta acotada en la Action/Request. Se registra como excepción justificada en el Constitution Check.
- **Venta: cálculo en céntimos.** `CalculateTicketTotalAction` opera con enteros (céntimos MXN) y devuelve `"66.00"` como cadena. Sin floats (mismo criterio que `api-007`).
- **Precio vigente.** `ResolveCurrentTicketPriceAction` (por tipo y momento UTC): fila no eliminada, `effective_at <= ahora`, orden `effective_at` desc y `id` desc (desempate de filas con el mismo instante). La misma Action sirve a `current` (CA-17) y a la venta (CA-04, CA-05).
- **Snapshot de precios (CA-27).** La venta copia `adult_unit_price` y `child_unit_price` en el boleto; ningún cambio posterior los toca.
- **Token QR.** `IssueTicketQrTokenAction` genera 32 bytes con `random_bytes` codificados en base64url (43 caracteres, cabe en `VARCHAR(255)`). La unicidad la garantiza el índice único de DBR-006; un duplicado (probabilidad despreciable) lanza excepción y revierte la transacción.
- **SVG (CA-09).** `RenderTicketQrSvgAction` usa `bacon/bacon-qr-code` (ADR 0019): genera el SVG desde `qr_code` en memoria, sin persistirlo. Se invoca dentro de la transacción de venta para que un fallo revierta (CA-07).
- **Cancelable (CA-14).** `IsTicketCancellableAction` es la única regla: `cashier` dueño, `tickets.cancel`, `status` = `completed` y mismo día en la zona del zoológico (`config('arca.report_timezone')`, decisión 6 de la revisión de 2026-11-02). La usan `ListTicketHistoryAction` (campo `cancellable`) y `CancelTicketAction` (validación), así no divergen.
- **Zona horaria.** Se reutiliza `App\Actions\Admin\Reports\ResolveRequestedTimezoneAction` de `api-007` (RN-14: `UTC` o nombres con «/» válidos; si no, `America/Mexico_City`; sin 422). Cubre el parámetro `timezone` del historial (`from`/`to` y presentación). Para la cancelación y `cancellable` ya no se usa: la zona es `config('arca.report_timezone')` (decisión 6 de la revisión de 2026-11-02).
- **Formato de fechas.** `purchased_at`, `cancelled_at` y `effective_at` salen en ISO 8601 UTC (`toIso8601ZuluString()`), CA-29. Es distinto del formato `Y-m-d H:i:s` de los reportes de `api-007`; el contrato del historial lo documenta.
- **Precisión de instantes.** Las columnas son DATETIME sin fracción de segundo. Una venta en el mismo segundo que un cambio inmediato puede leer el precio anterior. Se acepta y se documenta como riesgo (ver Riesgos).
- **Auditoría sin secretos.** `LogAdminActivityAction::FORBIDDEN_KEYS` añade `qr_svg` (además de `qr_code`, ya listado) para que el SVG nunca entre en las propiedades (CA-28).

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| Dependencias (backend, primer paso) | `apps/api/src/composer.json`, `apps/api/src/composer.lock` (el proyecto Laravel está en `apps/api/src/`): `composer require bacon/bacon-qr-code:^3.1`; `composer audit`; verificar que `ext-iconv` está disponible en PHP 8.4 de desarrollo y de CI (si la librería lo requiere, se documenta en `apps/api/docs/` y en el `.env` de cada ambiente, sin cambiar código) | Instalar la librería fijada por ADR 0019 (CA-09) |
| API / datos | `app/Models/Ticket.php` (quitar el bloqueo `saving`/`deleting`; añadir `SoftDeletes`, `fillable`, casts); `app/Models/TicketPrice.php` (nuevo; `SoftDeletes`, timestamps por DBR-006 resolución 8). No se crea `app/Models/BaseModel.php` (decisión 1); `TicketPrice` sigue el mismo patrón que `Ticket` (decisión 1) | Modelos según DBR-006 aplicada |
| API / Actions | `app/Actions/Admin/Tickets/`: `RegisterTicketSaleAction`, `CalculateTicketTotalAction`, `ResolveCurrentTicketPriceAction`, `IssueTicketQrTokenAction`, `RenderTicketQrSvgAction`, `IsTicketCancellableAction`, `CancelTicketAction`, `ListTicketHistoryAction`, `ListCurrentTicketPricesAction`, `ScheduleTicketPriceChangeAction` | Lógica de venta, cancelación, historial y precios |
| API / revisión 2026-11-02 | `app/Http/Requests/Admin/Tickets/CancelTicketRequest.php` (sin `timezone`), `RegisterTicketSaleRequest.php` (tope 100 y cantidades estrictas), `SaveTicketPricesRequest.php` (límite de un año); `app/Actions/Admin/Tickets/CancelTicketAction.php`, `IsTicketCancellableAction.php` y `ListTicketHistoryAction.php` (zona `config('arca.report_timezone')`); `app/Providers/AppServiceProvider.php` (limitadores `ticket-sales` y `ticket-cancel`); `routes/api.php` (`throttle` tras `permission:`); `lang/es/validation.php` (mensajes nuevos) | Decisiones 6 a 10 de la revisión; CA-03 aclarado, CA-14, CA-31, CA-42 a CA-45; RN-16, RN-29 a RN-31 |
| API / cotización (revisión 2026-11-05) | `app/Actions/Admin/Tickets/QuoteTicketSaleAction.php` (nuevo, extraído de `RegisterTicketSaleAction.php` líneas 31-46); `RegisterTicketSaleAction.php` (usa la Action); `app/Http/Controllers/Admin/TicketQuoteController.php` (nuevo, invocable); `app/Http/Resources/Admin/Tickets/TicketQuoteResource.php` (nuevo); `routes/api.php` (ruta `admin.tickets.quote`); `app/Providers/AppServiceProvider.php` (limitador `ticket-quotes`, valor pendiente); `tests/Feature/Tickets/` (CA-46 a CA-49) | Cotización previa a la venta (CA-46 a CA-49; RN-32 a RN-34) |
| API / auditoría | `app/Actions/Admin/LogAdminActivityAction.php` (añadir `qr_svg` a `FORBIDDEN_KEYS`) | CA-28 |
| API / HTTP | `app/Http/Controllers/Admin/`: `TicketSaleController` (store), `TicketController` (index), `TicketCancelController` (invocable), `TicketPriceController` (current, store) | Controladores delgados |
| API / validación | `app/Http/Requests/Admin/Tickets/`: `RegisterTicketSaleRequest`, `CancelTicketRequest` (resuelve el boleto en `authorize()`), `ListTicketsRequest`, `SaveTicketPricesRequest` | Validación en español (CA-03, CA-11, CA-20, CA-21) |
| API / respuestas | `app/Http/Resources/Admin/Tickets/`: `TicketSaleResource` (folio, fecha UTC, cantidades, total, `cashier_name`, `qr_svg`; nunca `qr_code` crudo), `TicketHistoryResource` (sin `qr_code` ni `qr_svg`; con `cancellable`), `TicketPriceCurrentResource`, `TicketPriceResource` | Contrato JSON sin datos sensibles |
| API / rutas | `routes/api.php`: bloque de tickets dentro del grupo `admin.` con los permisos de la tabla de endpoints | Rutas nombradas |
| API / reportes (`api-007`, cambio dentro de esta feature) | `app/Actions/Admin/Reports/SummarizeTicketSalesAction.php`, `BuildTicketReportAction.php`, `BuildDashboardSummaryAction.php`, `ExportTicketReportAction.php` (y el escritor CSV/XLSX/PDF si lee `tickets` directamente): añadir `where('status', 'completed')` en la consulta de cada Action de cálculo y de listado | CA-34 y RN-18 (ver «Cambio en api-007») |
| API / seeder | `database/seeders/RolesAndPermissionsSeeder.php` **ya aplicado**: `ticket-prices.manage` y `tickets.cancel` en el catálogo; `admin` sin `tickets.create`/`tickets.cancel`; `cashier` con `tickets.view`, `tickets.create`, `tickets.cancel`; `zoo-admin` y `executive` sin cambio. Verificar con test (CA-06, CA-13, CA-22) | Matriz de permisos (RN-12) |
| API / pruebas | `tests/Feature/Tickets/*` (ver «Mapeo de criterios a pruebas») y `tests/Feature/Admin/ReportExcludesCancelledTicketsTest.php` | Un test por CA |
| API / documentación | `apps/api/docs/tickets.md` (nuevo; referencia de endpoints, reglas de cancelación y formato de fechas) y `apps/api/docs/arquitectura.md` (nuevo; según `docs/templates/arquitectura-app.md`, decisión de 2026-11-02 registrada en T-53) | Documentación local de la app |
| Paquetes | `packages/api-client` (`ticket-sales.ts`, `ticket-sales-types.ts`): lo define el plan del dashboard | Contrato tipado |
| Documentación de la matriz | `docs/03-roles-y-permisos.md` | Verificada el 2026-11-02: la matriz ya asigna `tickets.create` y `tickets.cancel` solo a `cashier` y `ticket-prices.manage` solo a `admin`; se corrigió la nota de vigencia (petición expresa de Jonathan) |

## Contrato y datos

### Endpoints (todos bajo `/api/v1/admin`, JSON, mensajes en español)

Middleware común: `auth:sanctum`, `staff.user`, `administrator.two-factor`.

| Método y ruta | Nombre | Permiso | CA |
|---|---|---|---|
| `POST /tickets` | `admin.tickets.store` | `permission:tickets.create` + límite `ticket-sales` (60/min, RN-30) | 01 a 09 (CA-09 incluido: `qr_svg`), 42, 43; CA-03 aclarado |
| `POST /tickets/quote` | `admin.tickets.quote` | `permission:tickets.create` + límite `ticket-quotes` (120 por minuto, RN-33) | 46 a 49 (revisión 2026-11-05) |
| `GET /tickets` | `admin.tickets.index` | `permission:tickets.view` | 14, 15, 16, 29 |
| `POST /tickets/{ticket}/cancel` | `admin.tickets.cancel` | `permission:tickets.cancel` + límite `ticket-cancel` (20/min, RN-30) | 10, 11, 12, 13, 29, 31, 44 |
| `GET /ticket-prices/current` | `admin.ticket-prices.current` | `permission:tickets.create\|ticket-prices.manage` | 17 |
| `POST /ticket-prices` | `admin.ticket-prices.store` | `permission:ticket-prices.manage` (+ 2FA del grupo) | 18 a 22, 45 |

Ruta `ticket-prices/current` declarada antes que cualquier `ticket-prices/{...}` futuro.

**Venta (`POST /tickets`).** Body: `adult_quantity`, `child_quantity` (enteros ≥ 0 y ≤ 100 cada uno; al menos uno > 0; 422 en español por campo, CA-03 y CA-42; booleanos, fracciones y cadenas no numéricas → 422, revisión de 2026-11-02; 429 por límite de 60/min, CA-43). Respuesta 201: `folio` (`tickets.id`), `purchased_at` (UTC ISO 8601), `adult_quantity`, `child_quantity`, `adult_unit_price`, `child_unit_price`, `total_amount` (cadena), `cashier_name`, `qr_svg`. Errores: 401; 403 sin `tickets.create` (admin, zoo-admin, executive, veterinarian; CA-06); 422 sin precio vigente (CA-04) o validación (CA-03).

**Cotización (`POST /tickets/quote`, revisión 2026-11-05).** Body: `adult_quantity` y `child_quantity` con las mismas reglas que la venta (CA-03, CA-42). Respuesta 200 (pregunta R5): `adult_unit_price`, `child_unit_price`, `adult_subtotal`, `child_subtotal` y `total_amount`. Sin boleto, sin QR y sin Activitylog (CA-49). Errores: 401; 403 sin `tickets.create` (CA-47); 422 por cantidades, tope, falta de precio vigente o importe máximo, con los mismos mensajes que la venta (CA-48); 429 por `ticket-quotes` cuando se fije su valor (RN-33).

**Cancelación (`POST /tickets/{ticket}/cancel`).** Body: `reason` (obligatorio, no vacío, ≤ 255). Revisión de 2026-11-02: el campo `timezone` sale del contrato; si llega, se ignora. Orden de RN-16: 403 por permiso (middleware); 429 por límite de 20/min (CA-44, middleware tras `permission:`); 404 en `authorize()` si no es boleto del cajero; 422 por motivo vacío; 422 si `cancelled` (CA-12); 422 si no es mismo día en la zona del zoológico (CA-31); luego 200 con el boleto actualizado.

**Historial (`GET /tickets`).** Query: `folio`, `status` (`completed`|`cancelled`), `from`, `to` (rango de `purchased_at` en fecha, interpretado en la zona resuelta), `timezone` (solo para `from`/`to` y presentación; revisión de 2026-11-02), `page`, `per_page` (≤ 100, 25 por defecto). Orden `purchased_at` desc. Alcance: `cashier` → `cashier_id` = usuario (no ampliable por filtros); `admin`/`zoo-admin` → todos (RN-17). Cada elemento: folio, `purchased_at`, cantidades, total, `status`, `cancelled_at`, `cancellation_reason`, `cashier_name`, `cancellable` (calculado con la zona del zoológico, `config('arca.report_timezone')`).

**Precios actuales (`GET /ticket-prices/current`).** Por tipo `adult` y `child`: `amount`, `effective_at` del vigente y `next` (monto y `effective_at` del próximo programado, si existe). Sin vigente: `amount` nulo y `message` en español.

**Cambio de precio (`POST /ticket-prices`).** Body: `adult_amount`, `child_amount` (numéricos, > 0, máximo dos decimales; 422 por campo, CA-21), `mode` (`immediate`|`scheduled`), `effective_at` (obligatorio solo en `scheduled`; ISO 8601 con desfase o `Z`; debe ser ≥ ahora, si no 422, CA-20; y ≤ ahora + 1 año, si no 422, CA-45, revisión de 2026-11-02). Respuesta 201: las dos filas creadas y el precio vigente actualizado. Si `mode=immediate`, `effective_at` = instante de la operación (UTC).

### Validación, Actions, Resources y Policies

- Form Requests por operación; base `AdminFormRequest` existente (422 `{message, errors}`).
- `CancelTicketRequest::authorize()` resuelve el boleto del cajero antes de validar el cuerpo (decisión de orden).
- `ListTicketsRequest` valida `to ≥ from` y `status` en lista cerrada.
- Controladores sin reglas.
- Policies: ninguna para boletos (justificación en «Decisiones de diseño»). Los permisos de rol son middleware `permission:`.

### Datos y DBR relacionada

- **DBR-006** (`docs/database/requests/DBR-006-ticket-sales.md`): Aprobada por BD (Víctor Adrián) y backend (Jonathan) el 2026-11-02; aplicada en `arca_pruebas` según el commit `5d0b62d`. Este plan no crea ni modifica migraciones ni SQL.
- Columnas usadas: `tickets.status`, `payment_method`, `adult_unit_price`, `child_unit_price`, `cancelled_at`, `cancelled_by`, `cancellation_reason`, `updated_by`, `deleted_at`, `qr_code` (único). `ticket_prices` completa. `staff_notifications` no se usa.
- Backfill (DBR resolución 1) y precios iniciales de adulto $25.00 y niño $16.00 (resolución 3) los hace la migración; no hay seeders de precios.
- `tickets` no tiene `created_by` ni `created_at`/`updated_at` en DBR-006. El creador es `cashier_id`; `Ticket` mantiene `$timestamps = false`.
- Evidencia pendiente: la tabla «Aplicación por ambiente» de DBR-006 sigue en «pendiente» y su sección de pruebas está vacía. Esta evidencia la aporta BD antes del despliegue.
- Tipo de `tickets.total_amount` (revisión de 2026-11-02, punto 4): según Jonathan, en la BD real es `DECIMAL(8,2)` (tope 999,999.99; la Action responde 422 por encima). `docs/database/esquema-ingles.md` documenta `DECIMAL(10,2)` y **no se edita** en esta revisión; BD lo corrige (T-58). No verificado por el redactor.

### Errores y compatibilidad

- 401 sin sesión; 403 sin permiso, sin 2FA (`two_factor_setup_required`, mensaje «Debes configurar tu segundo factor de autenticación.») o acción de otro rol; 404 boleto ajeno o inexistente («Boleto no encontrado.»); 422 validación o regla de negocio en español.
- Contrato nuevo, sin cambios en rutas existentes. Cambio de comportamiento en `api-007` (boletos cancelados fuera de cifras y listados; esperado por la spec).
- Despliegue: DBR-006 en cada ambiente antes que el código; `api-007` y `dashboard-003` se despliegan con el cambio de exclusión.

## Cambio en api-007 (dentro de este plan)

Aplicación de la sección «Impacto en api-007» de la spec. `apps/api/specs/007-administration-management.md` y su plan no se editan en este documento; el cambio de comportamiento queda registrado aquí.

- `SummarizeTicketSalesAction`, `BuildDashboardSummaryAction`, `BuildTicketReportAction` y `ExportTicketReportAction` (y sus escritores) filtran `status = 'completed'` en la Action que consulta `tickets`. Un único punto por consulta, no en el cliente (RN-18).
- Los tests de `api-007` existentes siguen pasando: los boletos previos tienen `status` `completed` por el valor por defecto de DBR-006.
- `Ticket` deja de ser de solo lectura (el plan de `api-007` lo declaraba así; esta feature lo supera).
- Se añade `ReportExcludesCancelledTicketsTest::test_ca34_ticket_sales_cancelled_excluded_from_reports` (panel, reporte y exportación).

## Seguridad, offline y operación

- **Mínimo privilegio:** permiso por ruta + consulta acotada por `cashier_id` para el historial y la cancelación; `admin`/`zoo-admin` solo lectura del historial.
- **Datos financieros:** `tickets` y `ticket_prices` con `SoftDeletes`; cancelar no ejecuta `deleted_at`. Cambios de precio y ventas en Activitylog (`activity('admin')`, eventos `ticket-sold`, `ticket-cancelled`, `ticket-price-changed`).
- **Transacciones:**
  - Venta: `DB::transaction` que resuelve precios, calcula total, emite token, crea el boleto, genera el SVG en memoria y escribe el log. Cualquier fallo revierte todo (CA-07). Escribir el log dentro de la transacción es una excepción deliberada al patrón de `api-007` (que registra tras el commit), porque CA-07 exige que no quede auditoría parcial.
  - Cancelación: `DB::transaction` con `lockForUpdate()` sobre el boleto y revalidación de `status` dentro del bloqueo (dos peticiones simultáneas: solo una pasa; la otra recibe 422 de CA-12).
  - Cambio de precio: `DB::transaction` que crea las dos filas y el log.
- **Secretos:** `qr_svg` y `qr_code` nunca en logs (`FORBIDDEN_KEYS`); contraseñas no implicadas.
- **Rate limits (revisión de 2026-11-02, RN-30):** `ticket-sales` (60 por minuto por usuario autenticado) en `POST /tickets` y `ticket-cancel` (20 por minuto) en `POST /tickets/{ticket}/cancel`, registrados en `AppServiceProvider` y aplicados en la ruta tras `permission:`. Respuesta 429 con `auth.throttle`. Mitiga en parte el doble envío (ver Riesgos), pero no sustituye una clave de idempotencia.
- **Portabilidad:** SQL estándar, sin funciones ni `CONVERT_TZ`; zona en PHP con `CarbonImmutable`; configuración solo por `.env`.
- **Entorno de pruebas:** `arca_pruebas`, `DatabaseTransactions`; prohibido `RefreshDatabase` y cualquier migración desde tests; `arca_zoo` nunca.
- **Offline:** no aplica (API en línea; CA de la spec).

## Mapeo de criterios a pruebas

Convención: `test_caNN_ticket_sales_<descripción>()`, PHPUnit, `apps/api/src/tests/Feature/Tickets/` salvo indicación. Trait `CreatesAdministrators` de `api-007` para cuentas con rol y 2FA. Un test por CA vigente.

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | Cajero vende en efectivo: 201, `completed`, `cash`, `cashier_id`, precios copiados, folio, `cashier_name` | `CreateTicketSaleTest` |
| CA-02 | Cantidades mixtas: 2 adultos y 1 niño = 66.00 (céntimos, sin float) | `TicketTotalTest` (unit + feature) |
| CA-03 | Negativos, no enteros, ausentes y ceros → 422 por campo; sin boleto ni log. Revisión: booleanos, fracciones y cadenas no numéricas → 422 | `CreateTicketSaleValidationTest` (método nuevo para booleanos y cadenas) |
| CA-04 | Sin precio vigente para un tipo → 422 con mensaje exacto; sin boleto | `TicketPriceResolutionTest` |
| CA-05 | Programado: venta antes usa anterior; después usa nuevo | `TicketPriceResolutionTest` |
| CA-06 | `admin`, `zoo-admin`, `executive`, `veterinarian` → 403; sin sesión → 401 | `CreateTicketSaleAccessTest` |
| CA-07 | Fallo forzado al emitir token (binding falso del servicio): sin boleto ni log | `CreateTicketSaleAtomicityTest` |
| CA-08 | Dos ventas con tokens distintos; inserción con `qr_code` duplicado falla por índice único | `TicketQrTokenTest` |
| CA-09 | Respuesta contiene `qr_svg` válido (estructura `<svg`), dos tokens producen SVG distintos, el SVG no se persiste | `TicketQrSvgTest` |
| CA-10 | Cancelación del mismo día con motivo → 200; `cancelled_at`, `cancelled_by`, motivo; fila permanece | `CancelTicketTest` |
| CA-11 | Motivo vacío o ausente → 422 en español; boleto sin cambios | `CancelTicketValidationTest` |
| CA-12 | Segunda cancelación → 422 «Este boleto ya está cancelado.»; sin cambios | `CancelTicketTest` |
| CA-13 | `admin`/`zoo-admin`/`executive`/`veterinarian` → 403; cajero sobre boleto ajeno → 404 «Boleto no encontrado.» | `CancelTicketAccessTest` |
| CA-14 | Lista paginada, orden desc, incluye cancelados con motivo, filtros folio/estado/rango, `cancellable` correcto. Revisión: `cancellable` con la zona del zoológico aunque la query traiga otra `timezone` | `TicketHistoryTest`; zona fija en `TicketCancellableZoneTest` |
| CA-15 | Cajero solo ve lo suyo aunque filtre por otro `cashier_id`; `admin` y `zoo-admin` ven todo en lectura | `TicketHistoryScopeTest` |
| CA-16 | Ningún elemento del historial contiene `qr_code` ni `qr_svg` | `TicketHistoryTest` |
| CA-17 | `current` devuelve vigente y próximo por tipo; sin precio → `amount` nulo y mensaje; `cashier` y `admin` permitidos; `zoo-admin` 403 | `TicketPriceCurrentTest` |
| CA-18 | Cambio inmediato: 201, `effective_at` ≈ ahora UTC, `created_by`, `current` cambia | `TicketPriceChangeTest` |
| CA-19 | Programado futuro: antes de la hora sigue el anterior; a partir de ella, el nuevo (viajando en el tiempo con `Carbon::setTestNow`) | `TicketPriceChangeTest` |
| CA-20 | `scheduled` con fecha pasada → 422; sin filas | `TicketPriceValidationTest` |
| CA-21 | Cero, negativo y tres decimales → 422 por campo; sin filas | `TicketPriceValidationTest` |
| CA-22 | `zoo-admin` y `cashier` → 403; `admin` sin 2FA → 403 `two_factor_setup_required`; sin filas | `TicketPriceAccessTest` |
| CA-27 | Tras cambiar precio, total y precios unitarios del boleto no cambian | `TicketSnapshotTest` |
| CA-28 | Activitylog con actor, evento y recurso en venta, cancelación y cambio de precio; sin `password`, `qr_code` ni `qr_svg` en propiedades | `TicketAuditTest` |
| CA-29 | `purchased_at`, `cancelled_at`, `effective_at` en UTC ISO 8601 (sufijo `Z`); `timezone` inválido usa `America/Mexico_City` sin 422 | `TicketDatesTest` |
| CA-30 | Cobertura: busca `CA-01`…`CA-22`, `CA-27`…`CA-31`, `CA-34` y, por la revisión de 2026-11-02, `CA-42`…`CA-45` (32 CA) en los tests y verifica `DB_DATABASE=arca_pruebas` | `TicketSalesCoverageTest` (patrón de `Admin/AdminCoverageTest`) |
| CA-31 | Boleto de día anterior en la zona → 422 «Solo se pueden cancelar boletos el mismo día en que se vendieron.»; mismo día → CA-10. Revisión: `timezone` del cuerpo ignorado (caso de un día distinto en otra zona → 200) | `CancelTicketSameDayTest` (método nuevo para `timezone` ignorado) |
| CA-34 (`api-007`) | Boleto cancelado no suma en panel, reporte, listado ni exportación | `Feature/Admin/ReportExcludesCancelledTicketsTest` |
| CA-42 | (Revisión 2026-11-06) 50 boletos en total pasan; 51 → 422 con el mensaje; sin boleto ni log | `TicketSaleLimitsTest` (T-99) |
| CA-43 | 60 ventas por minuto pasan; la 61 → 429; sin boleto extra | `TicketSaleLimitsTest` |
| CA-44 | 20 cancelaciones por minuto pasan; la 21 → 429; ningún boleto cambia por el 429 | `TicketCancelLimitsTest` |
| CA-45 | `scheduled` con `effective_at` a más de un año → 422 sin filas; dentro del año → 201 | `TicketPriceHorizonTest` |
| CA-46 (revisión 2026-11-05) | Cotización con las mismas cantidades que la venta real: importes idénticos (2 adultos y 1 niño = 66.00) | `TicketQuoteTest` |
| CA-47 (revisión 2026-11-05) | `admin`, `zoo-admin`, `executive` y `veterinarian` → 403; sin sesión → 401. Con `admin` requiere T-75 en `arca_pruebas` | `TicketQuoteAccessTest` |
| CA-48 (revisión 2026-11-05) | Cantidades inválidas, más de 50 boletos en total, sin precio vigente e importe máximo → 422 con los mensajes de la venta | `TicketQuoteValidationTest` |
| CA-49 (revisión 2026-11-05) | Cotización válida e inválida: conteos de boletos, tokens, Activitylog y precios iguales antes y después | `TicketQuoteNoSideEffectsTest` |

Los CA diferidos no tienen test en este plan.

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí, con dependencia aprobada | Laravel 12, MySQL 8.0.x, `.env`. Única dependencia nueva: `bacon/bacon-qr-code` ^3.1, fijada por ADR 0019 (Aceptado, 2026-11-02). Pendiente de backend: verificar `composer audit` y `ext-iconv` en PHP 8.4. Sin correo ni SDK de proveedor (ADR 0020 diferido). |
| II. La spec manda | Sí | Spec 009 Aprobada (2026-11-02); revisión de 2026-11-05 aprobada. Este plan (Aprobado 2026-11-02; revisión de 2026-11-05 aprobada), `apps/api/tasks/009-ticket-sales.md` y el PR enlazan `009-ticket-sales`. Tareas sin marcar hasta tener evidencia. |
| III. Lógica separada de la interfaz | Sí | Precios, total, token, SVG, cancelabilidad y alcance en `App\Actions\Admin\Tickets`. Controladores delgados. El dashboard no calcula (`dashboard-005` CA-21). |
| IV. Un test por criterio | Sí (plan) | Tabla de mapeo con un test por CA vigente, incluido CA-09 con `bacon/bacon-qr-code`. `TicketSalesCoverageTest` lo verifica. No se da por cumplido hasta que la suite esté en verde (evidencia pendiente de ejecución). |
| V. Una sola fuente de verdad para los datos | Sí, con excepciones aprobadas por Jonathan (2026-11-02) | Esquema solo por DBR-006 (aprobada; aplicada en `arca_pruebas` según el commit `5d0b62d`). Excepciones formalizadas en ADR 0021 (Aceptado, 2026-11-02): (a) `Ticket` y `TicketPrice` no extienden `BaseModel` (no existe en el repositorio y `tickets` no tiene `created_by` en DBR-006); usan SoftDeletes y auditoría propias (decisión 1). (b) `staff_notifications` no usa `SoftDeletes` (DBR-006 resolución 6); la tabla queda sin uso en esta iteración y la excepción se revisa al reactivar avisos (decisión 5). El equipo debe leer ADR 0021 para enterarse de estas excepciones; el acuerdo de Jonathan consta en ese ADR. |
| VI. Código en inglés, personas en español | Sí | Rutas, permisos, clases y columnas en inglés; mensajes, validación y `lang/es` en español. |

Excepción adicional registrada (no de la Constitución, sino de `apps/api/AGENTS.md`): Policy por registro sustituida por consulta acotada, justificada por CA-13 (404). Formalizada en ADR 0021 (excepción c).

## Riesgos y decisiones

- **ADR:** 0019 Aceptado (2026-11-02). 0021 Aceptado (2026-11-02): excepciones a) y b) de Constitución V y excepción c) de la Policy por registro. 0020 diferido.
- **Decidido (BaseModel, decisión 1, 2026-11-02).** `Ticket` y `TicketPrice` no extienden `BaseModel`: no existe en el repositorio (brecha ya registrada en `api-007`) y `tickets` no tiene `created_by`. Usan SoftDeletes y auditoría propias. Queda registrado como excepción en el Constitution Check y en ADR 0021.
- **Decidido (BaseModel para `TicketPrice`, decisión 1, 2026-11-02).** `TicketPrice` sigue el mismo patrón que `Ticket`: no extiende `BaseModel`, usa SoftDeletes y auditoría propia (`created_by` y `updated_by`, que DBR-006 da a `ticket_prices`). No se crea `BaseModel` en esta feature; su creación queda diferida (ADR 0021, diferido 3).
- **Decidido (staff_notifications sin SoftDeletes, decisión 5, 2026-11-02).** Excepción documentada a Constitución V. La tabla queda creada por DBR-006 y sin uso en esta iteración (avisos diferidos): no hay modelo ni Action. Se revisa al reactivar avisos.
- **Decidido (formato de `effective_at`, decisión 3, 2026-11-02).** El cliente envía ISO 8601 con desfase (o `Z`); el dashboard convierte la hora local de su dispositivo, sin regla de negocio. La API valida que sea futuro (CA-20), guarda en UTC y responde 422 si falta la zona. Aplica también a `dashboard-005`.
- **Precisión de segundos.** DATETIME sin fracción: un cambio inmediato y una venta en el mismo segundo pueden leer el precio anterior. Aceptado; el desempate por `id` ordena filas del mismo `effective_at`.
- **Doble envío de venta.** Sin clave de idempotencia, una doble petición de red puede crear dos boletos. Mitigación: dashboard bloquea controles (CA-07 de `dashboard-005`) y no reintenta automáticamente. Riesgo residual; no se añade idempotencia sin decisión.
- **Evidencia de DBR-006.** La tabla de aplicación por ambiente y la sección de pruebas siguen pendientes; BD debe aportarlas antes de desplegar código.
- **Orden de despliegue.** DBR-006 en cada ambiente antes que el código; `api-007` con la exclusión de cancelados y `dashboard-003` juntos (cifras consistentes).
- **Reversión.** DBR-006 solo es reversible mientras no existan ventas con columnas nuevas.
- **Zona del día de cancelación.** Resuelta por la revisión de 2026-11-02: zona fija del zoológico (RN-16; decisión 6).
- **Cuota compartida de taquilla.** Si varias personas usan la misma cuenta de `cashier` en un equipo, comparten el límite de 60 ventas y 20 cancelaciones por minuto (RN-30). Valores propuestos en la revisión; cambiarlos exige nueva revisión de la spec.
- **Revisión 2026-11-05 (aprobada):** (a) cotización y venta comparten `QuoteTicketSaleAction`: un cambio de regla afecta a ambas (intencionado, RN-34); (b) precio que cambia entre cotización y venta: RN-32; (c) permisos de `arca_pruebas` desactualizados hasta T-75; (d) sin procedimiento de resiembra en producción (pregunta R6; T-84).
- **Alternativas descartadas:** (1) `TicketPolicy` con 403 (contradice CA-13); (2) cálculo de total en el cliente (viola Constitución III); (3) SVG persistido (viola RN-07 y DBR-006); (4) codificador QR propio (`api-009` pregunta 4).

## Revisión boletos individuales (2026-11-05, aprobada por Jonathan el 2026-11-06)

Decisión de Jonathan del 2026-11-05 sobre la spec 009 («Revisión boletos individuales»), aprobada el 2026-11-06. No cambia las decisiones 12 a 19 ni la cotización (aprobada). Tareas T-86 a T-101 en `tasks/009-ticket-sales.md`; ninguna casilla marcada.

20. **Un boleto por unidad (CA-50, RN-35).** `RegisterTicketSaleAction` llama a `QuoteTicketSaleAction` para los importes, emite un token QR por fila (`IssueTicketQrTokenAction`), genera el SVG por fila en memoria (`RenderTicketQrSvgAction`) y crea una fila de `tickets` por unidad: primero los adultos y después los niños, de modo que los folios sean ascendentes. Fila de adulto: `adult_quantity=1`, `child_quantity=0`, `total_amount` = precio de adulto; fila de niño, a la inversa. Todas las filas comparten `purchased_at` y `cashier_id`, y guardan `adult_unit_price` y `child_unit_price` vigentes.
21. **Transacción única (CA-52).** Filas, SVG y eventos `ticket-sold` van en una sola `DB::transaction`. Un fallo en cualquier fila revierte la venta completa (CA-07).
22. **Respuesta.** `TicketSaleResource` representa un boleto; nuevo `TicketSaleBatchResource` envuelve `data.tickets` y las cantidades y el total de la compra. Contrato aprobado en la spec (R-B1, 2026-11-06): sin precios por tipo en la respuesta.
23. **Sin esquema y sin DBR.** `tickets` ya guarda folio, `qr_code` único, `status`, `cancelled_*` y cantidades por fila. No hay columna de agrupación (RN-35). Las filas anteriores no se separan ni se migran (RN-36).
24. **Contabilidad.** La suma de cantidades para «boletos» la define `api-007` CA-29 y RN-15; esta revisión solo la referencia.
25. **Auditoría por fila.** `LogAdminActivityAction` escribe un `ticket-sold` por boleto con folio, tipo y precio (CA-53). `qr_code` y `qr_svg` siguen en `FORBIDDEN_KEYS`.
26. **Tamaño (CA-54, RN-37).** Hasta 50 filas, 50 SVG y una respuesta en una transacción (tope de 50 boletos en total). La prueba mide tamaño y duración como evidencia, sin umbral fijo (R-B2 resuelta el 2026-11-06): si los valores resultan inaceptables, se avisa a Jonathan.
27. **Tope de 50 boletos en total (CA-42, RN-29; aprobado 2026-11-06).** `RegisterTicketSaleRequest` valida `adult_quantity + child_quantity` ≤ 50 y sustituye a `RegisterTicketSaleRequest::MAX_PER_TYPE`. El valor vive en `config/arca.php`, clave `ticket_sale_max_tickets` (50). La cotización (CA-48) usa la misma validación. Cambiar el valor requiere desplegar; la edición por Presidencia sin despliegue está fuera de esta revisión y documentada en la spec 010 (Borrador, no aprobada, no planificada).
28. **Sin cambio de la forma de la respuesta de la cotización** (CA-46) ni del código 200; el total de la compra sigue siendo el de `POST /tickets/quote`.

Cambios por área de esta revisión:

| Área | Archivos | Propósito |
|---|---|---|
| API / Actions | `app/Actions/Admin/Tickets/RegisterTicketSaleAction.php` (bucle por unidad) | CA-50, CA-52 |
| API / Resources | `app/Http/Resources/Admin/Tickets/TicketSaleResource.php` (un boleto); `TicketSaleBatchResource.php` (nuevo) | CA-50 |
| API / auditoría | `LogAdminActivityAction.php` sin cambio de código; evento por fila | CA-53 |
| API / pruebas | `tests/Feature/Tickets/` (CA-50 a CA-55) | Un test por CA |
| Documentación | `apps/api/docs/tickets.md`, `docs/07-glosario.md` | Contrato y definiciones |

Mapeo de criterios a pruebas (revisión de boletos individuales, aprobada el 2026-11-06):

| Criterio | Prueba automatizada | Ubicación |
|---|---|---|
| CA-50 | Un boleto por unidad; folios ascendentes; QR distinto; `data.tickets`; total igual a la cotización; ejemplo 4 boletos y 73.00 | `TicketSaleSplitTest` (nuevo); `CreateTicketSaleTest` (ajustado) |
| CA-51 | Cancelar un boleto de niño: 3 boletos vigentes, ingresos 57.00 | `CancelTicketPerRowTest` (nuevo) |
| CA-52 | Fallo forzado en la fila 3 de 4: ninguna fila ni evento `ticket-sold` | `CreateTicketSaleAtomicityTest` (ampliado) |
| CA-53 | Un `ticket-sold` por boleto, sin `qr_code` ni SVG en propiedades | `TicketAuditTest` (ampliado) |
| CA-54 | Venta más grande (50 boletos): 201, 50 filas, 50 SVG; tamaño y duración registrados como evidencia | `TicketSaleBatchSizeTest` (nuevo) |
| CA-55 | Fila anterior con `adult_quantity` 2: se lista y cancela como una fila | `TicketLegacyRowsTest` (nuevo) |

Constitution Check de la revisión: sin cambio de esquema (principio V sin cambio); el bucle y el cálculo viven en la Action (principio III).

Riesgos: ver RN-37 y RN-38 de la spec y el riesgo del doble envío (ahora de hasta 50 filas).

## Orden y aprobación

**Secuencia de implementación (tasks la desglosarán):**

0. Aprobación técnica y decisiones cerradas el 2026-11-02 (ver «Decisiones de aprobación»). Evidencia de DBR-006 por BD, antes de desplegar.
1. Dependencia: `composer require bacon/bacon-qr-code:^3.1`, `composer audit`, verificación de `ext-iconv` (backend).
2. Modelos: `Ticket` (quitar solo lectura, SoftDeletes, casts), `TicketPrice`; decisión de `BaseModel` aplicada.
3. Precios: `ResolveCurrentTicketPriceAction`, `ListCurrentTicketPricesAction`, `ScheduleTicketPriceChangeAction`, rutas `ticket-prices`, pruebas CA-17 a CA-22.
4. Venta: `CalculateTicketTotalAction`, `IssueTicketQrTokenAction`, `RegisterTicketSaleAction`, sin SVG; pruebas CA-01 a CA-08, CA-27.
5. QR SVG: `RenderTicketQrSvgAction` con `bacon/bacon-qr-code`; prueba CA-09.
6. Cancelación: `IsTicketCancellableAction`, `CancelTicketAction`, `CancelTicketRequest`; pruebas CA-10 a CA-13, CA-31.
7. Historial: `ListTicketHistoryAction`, `TicketHistoryResource`; pruebas CA-14 a CA-16, CA-29.
8. Auditoría (`qr_svg` en `FORBIDDEN_KEYS`) y pruebas CA-28.
9. Cambio en `api-007`: filtro `status = completed` y CA-34; `api-007` tests en verde.
10. Cobertura `TicketSalesCoverageTest` (CA-30), `apps/api/docs/tickets.md`.
11. Revisión de 2026-11-02 (decisiones 6 a 10): zona fija y contrato de cancelación; tope por tipo y cantidades estrictas; límites de frecuencia; límite de `effective_at`; pruebas CA-42 a CA-45 y actualización de CA-03, CA-14, CA-31 y CA-30. Tareas T-58 a T-74 en `tasks/009-ticket-sales.md`. Son cambios de código que deben pasar por `/sdd-implement` tras la aprobación de la spec revisada.
12. Revisión de 2026-11-05 (cotización CA-46 a CA-49, RN-32 a RN-34; permisos de `arca_pruebas`): T-75 a T-85 en `tasks/009-ticket-sales.md`. Aprobada. T-75 depende de `api-007` T-42 (seeder sin `operational-staff.manage`).

**Reparto:**
- Backend (Jonathan): pasos 1 a 10 (Actions, Requests, Resources, controladores, rutas, pruebas, cambio en `api-007`).
- BD (Víctor Adrián): evidencia de DBR-006 por ambiente; migraciones si el contrato diverge (no se modifica una migración aprobada).
- Frontend (Jonathan, `dashboard-005`): consume el contrato tras el paso 7; el cliente `@arca/api-client` se desarrolla con cliente simulado en paralelo (`dashboard-005` RN-08).
- Documentador: `docs/03-roles-y-permisos.md` verificada y corregida el 2026-11-02; notas de vigencia en dashboard 001 y 002 aplicadas el 2026-11-02 por petición expresa de Jonathan (la de 003 también).

**Aprobaciones requeridas:**

| Rol | Aprueba | Estado |
|---|---|---|
| Responsable funcional | Spec 009 | Jonathan, 2026-11-02 (Aprobada) |
| Responsable técnico | Solución técnica y Constitution Check de este plan (incluidas excepciones de V) | Jonathan, 2026-11-02 (Aprobado; excepciones formalizadas en ADR 0021, Aceptado el 2026-11-02) |
| Responsable de BD | DBR-006 | Aprobada 2026-11-02; evidencia por ambiente pendiente |
| Equipo | ADR 0019 (SVG) | Aceptado 2026-11-02 |
| Responsable funcional | Revisión 2026-11-05 de la spec 009 (cotización previa a la venta) | Aprobada por Jonathan, 2026-11-05 |
| Responsable funcional y técnico | Revisión «Boletos individuales» (spec y plan, 2026-11-05) | Aprobada por Jonathan el 2026-11-06 |
| Responsable técnico | Revisión 2026-11-05 del plan (`QuoteTicketSaleAction`, endpoint y límite `ticket-quotes`) | Aprobada por Jonathan, 2026-11-05 |
| Responsable de BD | Ejecución de `RolesAndPermissionsSeeder` en `arca_pruebas` (T-75) y procedimiento de producción (T-84) | Pendiente |
