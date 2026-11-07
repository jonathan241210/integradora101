# Venta de boletos de la API

Referencia de `/api/v1/admin/tickets*` y `/api/v1/admin/ticket-prices*`, contrato de `api-009`. Spec: `apps/api/specs/009-ticket-sales.md`. Plan: `apps/api/plan/009-ticket-sales.md`. Consumidor: `dashboard-005`, vía `@arca/api-client`.

Describe el código implementado y el contrato tras la revisión de 2026-11-02. No certifica que las pruebas pasen: la verificación se registra en `apps/api/tasks/009-ticket-sales.md`. No contiene secretos.

Quedan **diferidos** (decisión 2026-11-02) y no existen en la API: avisos de cambio de precio, rutas `/notifications`, acuse y correo. `staff_notifications` existe en la base de datos (DBR-006) pero no tiene modelo ni uso.

## Cambios de la revisión de 2026-11-02

Aprobados por Jonathan sobre la spec 009 (que sigue Aprobada):

- **Cancelación sin `timezone`.** La zona del día de cancelación es siempre la del zoológico, `config('arca.report_timezone')` (America/Mexico_City). La API ignora cualquier `timezone` del cuerpo de `POST .../cancel`, y ese campo sale del contrato. `cancellable` del historial usa la misma zona.
- **Tope de 50 boletos en total.** `adult_quantity` + `child_quantity` admiten como máximo 50 (revisión de 2026-11-06, que sustituye el tope de 100 por tipo). Valor en `config/arca.php`, clave `ticket_sale_max_tickets`; cambiarlo requiere desplegar. Más de 50 responde 422. La opción de editarlo sin desplegar está en la spec 010 (`apps/api/specs/010-configurable-system-settings.md`, Borrador, sin aprobar).
- **Cantidades estrictas.** Booleanos, cantidades con fracción y cadenas no numéricas responden 422.
- **Límites de frecuencia (429).** Por usuario autenticado: 60 ventas por minuto en `POST /tickets` y 20 cancelaciones por minuto en `POST /tickets/{ticket}/cancel`.
- **Límite de `effective_at`.** Un cambio programado no puede tener `effective_at` más de un año adelante (422).

## Acceso común

Todas las rutas están en el grupo `admin` y aplican, en orden: `auth:sanctum` (401), `staff.user` (401 si la cuenta está inactiva), `administrator.two-factor` (solo `admin` y `zoo-admin`; 403 `two_factor_setup_required` sin 2FA confirmado) y `permission:<permiso>` (403 «No tienes permiso para realizar esta acción.»). `cashier` no pasa por 2FA.

Las rutas de venta (`POST /tickets`) y de cancelación (`POST /tickets/{ticket}/cancel`) añaden un límite de frecuencia por usuario después de `permission:`. Un 403 no consume cuota. Al superarlo responden **429** con el mensaje «Demasiados intentos. Intenta de nuevo en :seconds segundos.» (texto de `lang/es/auth.php`).

Errores de validación: `422 { "message": "<primer error>", "errors": { "campo": ["…"] } }`. Recursos individuales en `data`.

## Endpoints

| Método y ruta | Nombre | Permiso | Límite | Quién |
|---|---|---|---|---|
| `POST /api/v1/admin/tickets` | `admin.tickets.store` | `tickets.create` | 60 por minuto por usuario | `cashier` (único que vende) |
| `POST /api/v1/admin/tickets/quote` | `admin.tickets.quote` | `tickets.create` | 120 por minuto por usuario | `cashier` |
| `GET /api/v1/admin/tickets` | `admin.tickets.index` | `tickets.view` | — | `cashier` (solo suyos), `admin` y `zoo-admin` (todos, lectura) |
| `POST /api/v1/admin/tickets/{ticket}/cancel` | `admin.tickets.cancel` | `tickets.cancel` | 20 por minuto por usuario | `cashier` (solo su boleto, mismo día) |
| `GET /api/v1/admin/ticket-prices/current` | `admin.ticket-prices.current` | `tickets.create` o `ticket-prices.manage` | — | `cashier`, `admin` |
| `POST /api/v1/admin/ticket-prices` | `admin.ticket-prices.store` | `ticket-prices.manage` | — | `admin` con 2FA |

### Venta: `POST /tickets`

Cuerpo: `adult_quantity`, `child_quantity`.

- Enteros JSON reales, cada uno entre 0 y 50, con suma no mayor que 50 (revisión de 2026-11-06); al menos uno > 0. Se valida antes de calcular el total, así que un valor enorme responde 422 y nunca 500.
- Más de 50 boletos en total → 422 «No puedes vender más de 50 boletos en una misma venta.» (texto propuesto por el redactor; pendiente de confirmar el texto, no el tope).
- Booleanos, cantidades con fracción (p. ej. `1.5`), el número `2.0` y cualquier cadena, incluidas las numéricas (`"2"`), → 422 por campo (implementado según la propuesta por defecto de R1: `integer:strict`; pendiente de confirmación en la spec).
- Un total por encima de 999,999.99 → 422 «El total de la venta excede el importe máximo permitido.» (tope de `DECIMAL(8,2)`).
- El cliente nunca envía montos; el total y los precios los fija la API.

201 `data` (forma aprobada por Jonathan el 2026-11-06; pregunta R-B1 de `api-009`):

Una venta crea **un boleto por unidad vendida**: 1 adulto y 3 niños son 4 boletos, cada uno con su folio y su QR, cancelables por separado. Los boletos salen primero los adultos y después los niños, con folios ascendentes.

```json
{
  "adult_quantity": 1, "child_quantity": 3,
  "total_amount": "73.00",
  "purchased_at": "2026-11-02T18:30:15Z",
  "cashier_name": "Nombre Apellido",
  "tickets": [
    { "folio": 101, "ticket_type": "adult", "unit_price": "25.00", "adult_quantity": 1, "child_quantity": 0, "total_amount": "25.00", "purchased_at": "2026-11-02T18:30:15Z", "cashier_name": "Nombre Apellido", "qr_svg": "<?xml ...?><svg ...>...</svg>" },
    { "folio": 102, "ticket_type": "child", "unit_price": "16.00", "adult_quantity": 0, "child_quantity": 1, "total_amount": "16.00", "purchased_at": "2026-11-02T18:30:15Z", "cashier_name": "Nombre Apellido", "qr_svg": "<?xml ...?><svg ...>...</svg>" }
  ]
}
```

- `total_amount` de la compra coincide con `POST /tickets/quote` para las mismas cantidades (CA-46). Cada boleto lleva su precio unitario; no hay campo de agrupación de la compra.
- `folio` es `tickets.id` de cada boleto. `qr_svg` se genera en cada venta con `bacon/bacon-qr-code` a partir del `qr_code` de cada boleto y no se guarda. El token `qr_code` no se devuelve.
- La venta más grande admitida son 50 boletos con QR en una transacción y una respuesta (RN-37). El tamaño y la duración se miden en la prueba CA-54, sin umbral fijo.
- 422 sin precio vigente: «No hay un precio vigente configurado para este tipo de boleto.».
- 422 si el total supera 999,999.99 (tope de la Action `RegisterTicketSaleAction`). Ver «Tipo de dato de `total_amount`».
- 429 si se superan 60 ventas por minuto por usuario (CA-43).
- La operación es transaccional: todos los boletos de la venta, sus SVG y sus eventos `ticket-sold` se confirman juntos o no queda nada (CA-52).
- Cancelación por boleto (CA-51): cancelar un boleto no cambia los demás de la compra. Solo lo cancela el cajero que lo vendió y el mismo día (limitación aceptada, RN-38).
- Filas anteriores a la revisión (varias cantidades en una sola fila) no se separan ni se migran: se listan y se cancelan completas (RN-36).
- No hay ruta de validación de QR en la entrada. Cualquier validación futura debe revisar `status` (solo `completed` es válido).

### Cotización: `POST /tickets/quote`

Calcula los importes antes de registrar la venta, con la misma `QuoteTicketSaleAction` que usa `POST /tickets` (CA-46, RN-34). El cuerpo y su validación son los de la venta:

```json
{ "adult_quantity": 2, "child_quantity": 1 }
```

Respuesta 200, con importes como cadena de dos decimales:

```json
{
  "data": {
    "adult_unit_price": "25.00",
    "child_unit_price": "16.00",
    "adult_subtotal": "50.00",
    "child_subtotal": "16.00",
    "total_amount": "66.00"
  }
}
```

- No crea boleto, no emite token QR, no escribe auditoría y no cambia precios (CA-49).
- 401 sin sesión y 403 sin `tickets.create`, incluidos `admin` y `zoo-admin` (CA-47).
- 422 con los mismos mensajes que la venta: cantidades, tope de 50 boletos en total (revisión de 2026-11-06), sin precio vigente e importe máximo (CA-48).
- 429 si se superan 120 cotizaciones por minuto por usuario; no consume el límite de ventas (RN-33).
- La cotización es informativa: si el precio cambia antes de confirmar, la venta cobra el vigente al registrarse y el boleto muestra ese importe real (RN-32).

### Historial: `GET /tickets`

Query opcional: `folio`, `status` (`completed`|`cancelled`), `from`, `to` (`AAAA-MM-DD`, rango de `purchased_at`), `timezone`, `page`, `per_page` (<= 100, 25 por defecto).

- `timezone` (revisión de 2026-11-02): solo interpreta `from` y `to` y la presentación. No afecta a la cancelación ni a `cancellable`. Si falta o no es válida, se usa `America/Mexico_City` sin 422.

Respuesta paginada de Laravel (`data`, `links`, `meta`), orden `purchased_at` descendente. Cada elemento:

```json
{ "folio": 123, "purchased_at": "…Z", "adult_quantity": 2, "child_quantity": 1,
  "total_amount": "66.00", "status": "completed", "cancelled_at": null,
  "cancellation_reason": null, "cashier_name": "…", "cancellable": true }
```

- Alcance: `cashier` solo ve sus boletos (ningún filtro lo amplía; `cashier_id` en la query se ignora). `admin` y `zoo-admin` ven todos. `executive` y `veterinarian` reciben 403.
- Nunca incluye `qr_code` ni `qr_svg`.
- `cancellable` lo calcula la API (`IsTicketCancellableAction`): el usuario es el cajero del boleto, tiene `tickets.cancel`, el boleto está `completed` y se vendió el mismo día de hoy en la zona del zoológico (`config('arca.report_timezone')`). El cliente no replica esta regla.

### Cancelación: `POST /tickets/{ticket}/cancel`

Cuerpo: `reason` (obligatorio, texto, <= 255). **No se envía `timezone`**: si llega, la API lo ignora.

Orden de validación (RN-16):

1. 403 sin `tickets.cancel` (`admin`, `zoo-admin`, `executive`, `veterinarian`).
2. 429 si se superan 20 cancelaciones por minuto por usuario (CA-44). Se evalúa después de `permission:`.
3. 404 «Boleto no encontrado.» si el boleto no existe o no lo vendió el cajero (se resuelve antes de validar el cuerpo; ADR 0021, excepción c).
4. 422 motivo vacío o ausente: «Indica el motivo de la cancelación.».
5. 422 «Este boleto ya está cancelado.».
6. 422 «Solo se pueden cancelar boletos el mismo día en que se vendieron.».

200 `data`: el boleto con el mismo formato del historial (`status` `cancelled`, `cancelled_at`, `cancellation_reason`, `cancellable` `false`). El boleto permanece en la base de datos; se usa `lockForUpdate()` para que dos cancelaciones simultáneas no pasen ambas.

El día de la venta y el de la cancelación se comparan siempre en `config('arca.report_timezone')` (America/Mexico_City). Un boleto de un día anterior no se cancela, sin importar la zona del dispositivo que cancela.

### Precio vigente: `GET /ticket-prices/current`

200 `data`:

```json
{ "adult": { "amount": "25.00", "effective_at": "2026-01-01T00:00:00Z", "message": null,
             "next": { "amount": "28.00", "effective_at": "2026-11-10T12:00:00Z" } },
  "child": { "amount": null, "effective_at": null,
             "message": "No hay un precio vigente configurado para este tipo de boleto.", "next": null } }
```

`next` es el cambio programado más próximo del tipo, o `null`. El precio vigente de un tipo es la fila no eliminada con `effective_at` <= ahora y mayor `effective_at` (desempate por `id`); no hay job ni scheduler.

### Cambio de precio: `POST /ticket-prices`

Cuerpo: `adult_amount`, `child_amount` (numéricos > 0, máximo dos decimales), `mode` (`immediate`|`scheduled`), `effective_at` (obligatorio en `scheduled`).

- `effective_at` es ISO 8601 **con desfase horario o `Z`** (por ejemplo `2026-12-01T09:00:00-06:00`). Sin zona responde 422. La API lo convierte y guarda en UTC.
- En `scheduled`, `effective_at` no puede ser anterior al momento de la operación (422, CA-20) ni posterior a **un año** desde ese momento (422, CA-45; revisión de 2026-11-02). El mensaje es «La fecha de entrada en vigor no puede ser mayor a un año a partir de hoy.» (exactamente un año se admite). Una fecha inexistente (p. ej. `2026-02-31`) responde 422; no se desborda al mes siguiente.
- En `immediate`, `effective_at` es el instante de la operación (UTC, sin fracción de segundo). El límite de un año no aplica.
- Crea dos filas (adulto y niño), nunca modifica las anteriores, y audita `ticket-price-changed` por fila. No crea avisos ni correos.

201 `data`: `{ "prices": [{ "id", "ticket_type", "amount", "effective_at" }, …], "current": <igual que GET current> }`.

## Fechas

`purchased_at`, `cancelled_at` y `effective_at` se devuelven en UTC, ISO 8601 con sufijo `Z`. Las columnas son `DATETIME`/`TIMESTAMP` sin fracción de segundo: una venta en el mismo segundo que un cambio inmediato ya usa el precio nuevo, y una anterior al segundo usa el viejo. La presentación en la zona del dispositivo es del dashboard.

## Tipo de dato de `total_amount` (nota de la revisión de 2026-11-02)

Según la información de Jonathan del 2026-11-02, en la base de datos real la columna `tickets.total_amount` es **`DECIMAL(8,2)`**, con tope de **$999,999.99**. Un total que lo supere responde 422. Este redactor no verificó la columna: no hay acceso a la base de datos en esta sesión.

`docs/database/esquema-ingles.md` documenta `total_amount` como `DECIMAL(10,2)`. **Esa documentación está desactualizada y no se corrige en esta revisión.** El responsable de BD debe corregirla (tarea T-58 de `apps/api/tasks/009-ticket-sales.md`). Si el negocio necesita totales mayores, se abre una DBR nueva; la migración aprobada no cambia.

## Auditoría

Activitylog (`log_name` `admin`) registra `ticket-sold`, `ticket-cancelled` y `ticket-price-changed` con actor y recurso. Las propiedades llevan total, motivo o monto; `LogAdminActivityAction` descarta `password`, `qr_code`, `qr_svg` y otros secretos.

## Requisitos y dependencias

- Dependencia: `bacon/bacon-qr-code` ^3.1 (instalada v3.1.1; ADR 0019). Requiere `ext-iconv` (habilitada en el PHP de desarrollo usado en esta verificación; confirmar en CI y en cada ambiente) y `ext-xmlwriter` para el backend SVG.
- Base de datos: DBR-006 debe estar aplicada antes que el código en cada ambiente (`tickets` ampliada, `ticket_prices`). `arca_pruebas` ya la tiene; el resto de ambientes sigue pendiente de evidencia de BD.
- Modelos `Ticket` y `TicketPrice`: SoftDeletes y auditoría propia, sin `BaseModel` (ADR 0021, excepción a). El alcance por registro responde 404 sin Policy (ADR 0021, excepción c).
- Límites de frecuencia: limitadores con nombre (`ticket-sales`, `ticket-cancel`) registrados en `AppServiceProvider`, con clave por usuario autenticado. El almacén de contadores lo define la configuración de cache de cada ambiente (`.env`).

## Pruebas

`apps/api/src/tests/Feature/Tickets/`. Cada test lleva `test_caNN_ticket_sales_…`. `TicketSalesCoverageTest` (CA-30) verifica que cada CA vigente (CA-01 a CA-22, CA-27 a CA-31, CA-34 y CA-42 a CA-45; 32 CA) tenga su test y que la suite use `arca_pruebas`. CA-34 vive en `tests/Feature/Admin/ReportExcludesCancelledTicketsTest.php`.
