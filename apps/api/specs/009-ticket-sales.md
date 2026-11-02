# 009 · ticket-sales

- App dueña: `api`
- Apps/paquetes afectados: `api`, `dashboard` (consumidor, `dashboard-005`), `packages/api-client`; `api-007` (impacto en totales y reportes, ver «Impacto en api-007»; se aplica en el mismo cambio, sin editar 007 en este borrador); documentos `docs/03-roles-y-permisos.md` (matriz: permisos nuevos) y `docs/database/requests/DBR-006-ticket-sales.md`
- Estado: Borrador
- Solicitante / responsable funcional: Jonathan
- Responsable de BD (propuesto, pendiente de confirmar): Víctor Adrián (DBR-006)
- Aprobación funcional: pendiente; esta spec no está aprobada
- Última edición de borrador: 2026-11-01 (decisiones de Jonathan incorporadas, incluida la segunda ronda sobre quién vende; ver «Decisiones incorporadas»)

Convención: lo marcado como «Supuesto por defecto — confirmar» es una propuesta razonable de borrador que no fue decidida por el responsable funcional. Se confirma o se cambia antes de aprobar.

## Decisiones incorporadas (2026-11-01)

- **Quién vende (segunda ronda):** solo `cashier` vende (`tickets.create`) y cancela (`tickets.cancel`). `admin` y `zoo-admin` son administradores: ven reportes y exportan (`api-007`) y consultan el historial en lectura (`tickets.view`, CA-15), pero no ven la sección Venta ni pueden registrar ventas (CA-06, RN-12, `dashboard-005` CA-01). Esto cierra la antigua pregunta 1.
- **Cancelación:** solo el rol `cashier`, con `tickets.cancel`, y solo sobre boletos que él mismo vendió y únicamente el mismo día de la venta (RN-16; CA-10, CA-13, CA-31). Cada cajero ve solo sus boletos en el historial (CA-15).
- **Impacto en `api-007`:** los boletos cancelados se excluyen de los totales y reportes de `api-007` (RN-18; sección «Impacto en api-007»).
- **Avisos de precio:** admin y zoo-admin reciben el aviso al programar o cambiar el precio; el cajero lo recibe cuando el precio entra en vigor (RN-19; CA-23, CA-32). El dashboard consulta avisos al entrar y cada 60 s (`dashboard-005` CA-26). El cajero debe acusar, pero el aviso no bloquea la venta (CA-33).
- **Impresión del boleto:** formato, ancho, fuente, márgenes, campos y pie son preferencia de presentación del dashboard, guardada en el navegador (`dashboard-005` CA-27 a CA-29 y RN-12). La API no recibe ni guarda esa configuración.

## Problema y contexto

La taquilla del dashboard (`dashboard-001`, CA-04 y CA-11) es demostrativa: no registra ventas, no cancela boletos y no muestra historial real. La API solo tiene el reporte de boletos de solo lectura (`api-007`, CA-19 a CA-23), que consulta `tickets` y no puede tener datos mientras no exista la venta.

Esta feature agrega, en la API, la venta de boletos en efectivo, la emisión de un token QR por boleto (la API entrega el QR en SVG), la cancelación con motivo, el historial del cajero, la administración de precios con vigencia inmediata o programada (solo `admin`, con 2FA) y los avisos sobre cambios de precio.

Los cálculos de precio y total viven solo en Actions (Constitución III). La base de datos cambia solo por la DBR-006.

## Objetivos

- Registrar ventas de boletos de adulto y niño en efectivo (solo `cashier`), con total calculado en el servidor y boleto con QR listo para imprimir.
- Cancelar un boleto con motivo obligatorio, solo el cajero que lo vendió y el mismo día, sin borrado físico y con auditoría.
- Entregar al cajero su historial de boletos con filtros, incluidos los cancelados.
- Permitir que `admin` cambie el precio de adulto y de niño de forma inmediata o programada, con 2FA confirmado.
- Avisar a `admin` y `zoo-admin` (panel) de cada cambio de precio al programarlo o cambiarlo, y a `cashier` (aviso emergente con acuse) cuando el precio entra en vigor.
- Registrar en Activitylog cada venta, cancelación, cambio de precio y acuse.

## Fuera de alcance

- Arqueo y cierres de caja (`cash-closings.*`): spec posterior.
- Pagos con tarjeta, transferencia u otros medios electrónicos. Requieren spec, ADR y proveedor aprobados (`AGENTS.md`, regla de Payments).
- Validación del QR en el torniquete (hardware futuro). El token se emite y se guarda; no se valida aquí.
- Envío del boleto por correo, SMS o push. Los avisos son solo dentro del dashboard.
- Registro de monto recibido y cambio de efectivo (supuesto por defecto, pregunta 5).
- Reimpresión de boletos desde el historial (no solicitada en esta fase).
- Devolución física de efectivo al cliente: la cancelación solo cambia el estado en el sistema.
- Cancelación de boletos por `admin` o `zoo-admin` (decisión de 2026-11-01).
- Venta de boletos por `admin` o `zoo-admin` (decisión de 2026-11-01: solo `cashier` vende).
- Vista previa de total antes de registrar la venta: el total lo devuelve la API al registrar (`dashboard-005`, pregunta 1).
- Configuración de impresión del boleto (formato, ancho, fuente, márgenes, campos, pie): es preferencia del dashboard (`dashboard-005` RN-12); la API no la recibe ni la guarda.
- Listado completo, edición o cancelación de cambios de precio programados (supuesto por defecto, pregunta 3).
- Cambios a `apps/web`, `apps/pwa` y `apps/mobile`.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| `cashier` (taquilla; único rol que vende) | Vender boletos en efectivo, cancelar sus boletos del mismo día con motivo, consultar su historial, leer el precio vigente, recibir y acusar avisos de cambio de precio | `tickets.create`, `tickets.view`, `tickets.cancel` (solo este rol cancela); lectura de precio vigente con `tickets.create` (supuesto por defecto, pregunta 2) |
| `admin` (Presidencia) | Cambiar precios de adulto y niño (inmediato o programado); recibir avisos en el panel; consultar el historial en lectura | Sesión válida + 2FA confirmado; `ticket-prices.manage` (nuevo); `tickets.view` (alcance: todos los boletos, RN-17). No vende (sin `tickets.create`), no cancela y no ve la sección Venta. |
| `zoo-admin` (Dirección) | Recibir avisos de cambio de precio en el panel; consultar el historial de todos los boletos (solo lectura); sin cambiar precios | Sesión válida + 2FA confirmado; `tickets.view` (alcance: todos los boletos, RN-17). No vende ni cancela. |
| `executive`, `veterinarian` | Sin acceso a estas rutas | — |

Nota de matriz: por decisión de 2026-11-01, solo `cashier` vende. `docs/03-roles-y-permisos.md` asignaba a `admin` `tickets.create`; esa asignación se retira como parte de esta feature. El texto de la matriz ya se preparó en el borrador (ver RN-12) y entra en vigor al aprobar esta spec. `admin` y `zoo-admin` conservan `tickets.view`. `tickets.cancel` solo se asigna a `cashier`.

## Historias de usuario

- Como `cashier`, quiero registrar la venta de boletos de adulto y niño en efectivo y obtener un boleto con QR para entregarlo al visitante.
- Como `cashier`, quiero cancelar un boleto que vendí hoy indicando el motivo, para corregir errores del mismo día sin perder el registro.
- Como `cashier`, quiero consultar mis boletos del día y anteriores, filtrándolos por folio, estado y fecha.
- Como `admin`, quiero cambiar el precio de adulto y de niño de inmediato o en una fecha futura, para que la taquilla cobre el precio correcto sin depender de un cambio manual.
- Como `zoo-admin` y `admin`, quiero ver en el panel los cambios de precio, para estar informados.
- Como `cashier`, quiero que el sistema me avise cuando un cambio de precio entra en vigor y registrar mi acuse, sin que ese aviso me impida vender.

## Criterios de aceptación

### Venta

- **CA-01:** Dado un `cashier` con `tickets.create` y precios vigentes de adulto y niño, cuando llama `POST /api/v1/admin/tickets` con `adult_quantity` y `child_quantity` enteros y al menos uno mayor que cero, entonces la API crea el boleto con `status` `completed`, `payment_method` `cash`, `cashier_id` del usuario actual, `purchased_at` en UTC y los precios unitarios vigentes copiados en el boleto, y responde 201 con el folio, la fecha, las cantidades, el total, el nombre del cajero y el QR en SVG (CA-09). El folio es el identificador `tickets.id` (supuesto por defecto, pregunta 6).
- **CA-02:** Dada una venta válida, cuando la API responde, entonces `total_amount` es igual a `adult_quantity` × precio de adulto más `child_quantity` × precio de niño, calculado solo en la Action, con dos decimales en MXN. Un test verifica un caso con cantidades mixtas.
- **CA-03:** Dada una solicitud con cantidades negativas, no enteras, ausentes o ambas en cero, cuando se envía, entonces responde 422 con mensajes en español por campo y no crea boleto ni registro de auditoría.
- **CA-04:** Dado que no existe precio vigente para `adult` o para `child` (ninguna fila no eliminada con `effective_at` menor o igual al momento de la venta), cuando se intenta vender, entonces responde 422 con «No hay un precio vigente configurado para este tipo de boleto.» y no crea boleto.
- **CA-05:** Dado un cambio de precio programado para una fecha futura, cuando se registra una venta antes de esa fecha, entonces el total usa el precio anterior; cuando se registra una venta después de esa fecha, entonces usa el precio nuevo.
- **CA-06:** Dado un usuario sin `tickets.create` (`admin`, `zoo-admin`, `executive` o `veterinarian`; solo `cashier` vende, decisión de 2026-11-01), cuando llama `POST /api/v1/admin/tickets`, entonces responde 403 y no crea boleto. Sin sesión responde 401.
- **CA-07:** Dado un error durante la creación del boleto (p. ej. al generar el token QR), cuando ocurre, entonces no queda boleto ni registro de auditoría parcial: la operación es transaccional.
- **CA-08:** Dadas dos ventas, cuando se registran, entonces cada boleto tiene un `qr_code` distinto, generado en el servidor con aleatoriedad criptográfica, y la base de datos impide duplicados (DBR-006).
- **CA-09:** Dado un boleto creado, cuando la respuesta incluye `qr_svg`, entonces es un documento SVG válido generado por la API a partir del `qr_code` del boleto, y la API no almacena el SVG. Un test verifica la estructura del SVG y que dos tokens distintos producen SVG distintos. La generación requiere la decisión de pregunta 4 antes de implementarse.

### Cancelación

- **CA-10:** Dado un boleto `completed` vendido por el `cashier` que llama, y ese `cashier` con `tickets.cancel`, cuando llama `POST /api/v1/admin/tickets/{ticket}/cancel` con un motivo no vacío y el boleto es del mismo día de la venta (CA-31), entonces el boleto pasa a `cancelled`, registra `cancelled_at`, `cancelled_by` y `cancellation_reason`, responde 200 y el registro permanece en la base de datos.
- **CA-11:** Dada una cancelación sin motivo o con motivo vacío, cuando se envía, entonces responde 422 en español y no cambia el boleto.
- **CA-12:** Dado un boleto ya `cancelled`, cuando se intenta cancelarlo de nuevo, entonces responde 422 con «Este boleto ya está cancelado.» y no cambia ningún dato.
- **CA-13:** Dado un usuario sin `tickets.cancel` (`admin`, `zoo-admin`, `executive`, `veterinarian`), cuando intenta cancelar, entonces responde 403. Dado un `cashier` que intenta cancelar un boleto que no vendió, cuando lo intenta, entonces responde 404 con «Boleto no encontrado.» (criterio de alcance, igual que `api-007` CA-02; supuesto por defecto, pregunta 7).
- **CA-31:** Dado un boleto `completed` vendido por el `cashier` que llama en un día distinto al día actual en la zona indicada (RN-16), cuando intenta cancelarlo, entonces responde 422 con «Solo se pueden cancelar boletos el mismo día en que se vendieron.» y no cambia ningún dato. Dado un boleto del mismo día en esa zona, cuando se cancela, entonces se aplica CA-10.

### Historial

- **CA-14:** Dado un usuario con `tickets.view`, cuando llama `GET /api/v1/admin/tickets`, entonces recibe una lista paginada ordenada por `purchased_at` descendente, con folio, fecha, cantidades, total y estado. Incluye los boletos cancelados, con `cancelled_at` y el motivo. Acepta filtros por folio, estado y rango de `purchased_at`, y el parámetro opcional `timezone` (RN-16). Cada elemento incluye `cancellable` (booleano calculado por la API: `true` solo si el usuario que consulta puede cancelar ese boleto ahora, RN-16; supuesto por defecto, pregunta 8). El alcance por rol está en CA-15 y RN-17.
- **CA-15:** Dado un `cashier`, cuando consulta el historial, entonces la lista incluye solo los boletos que él vendió; nunca incluye boletos de otro cajero, y ningún filtro de la API lo amplía. Dado un `admin` o `zoo-admin` con `tickets.view`, cuando consulta el historial, entonces ve todos los boletos en lectura (decisión de 2026-11-01; no vende ni cancela).
- **CA-16:** Dada cualquier lista del historial, cuando se responde, entonces no incluye `qr_code` ni `qr_svg`.

### Precios

- **CA-17:** Dado un usuario con `tickets.create` o `ticket-prices.manage`, cuando llama `GET /api/v1/admin/ticket-prices/current`, entonces recibe, por cada tipo (`adult`, `child`), el monto vigente y su `effective_at`, y, si existe, el próximo cambio programado de ese tipo (monto y `effective_at`) (supuesto por defecto, pregunta 2). Sin precio vigente para un tipo, ese tipo responde sin monto y con indicación explícita.
- **CA-18:** Dado un `admin` con `ticket-prices.manage` y 2FA confirmado, cuando llama `POST /api/v1/admin/ticket-prices` con montos de adulto y de niño y modo `immediate`, entonces se crean las filas con `effective_at` igual al momento de la operación (UTC), `created_by` del admin, responde 201 y el precio vigente cambia desde esa respuesta.
- **CA-19:** Dado un `admin` con 2FA confirmado, cuando llama `POST /api/v1/admin/ticket-prices` con modo `scheduled` y una fecha y hora futuras, entonces se crean las filas con esa `effective_at`; antes de esa hora el precio vigente sigue siendo el anterior y a partir de ella es el nuevo, sin intervención manual.
- **CA-20:** Dado un modo `scheduled` con fecha y hora anteriores al momento de la operación, cuando se envía, entonces responde 422 en español y no crea filas (supuesto por defecto, pregunta 3).
- **CA-21:** Dado un monto cero, negativo o con más de dos decimales, cuando se envía, entonces responde 422 por campo y no crea filas.
- **CA-22:** Dado un `zoo-admin` o un `cashier` que intenta cambiar precios, cuando llama `POST /api/v1/admin/ticket-prices`, entonces responde 403 y no crea filas. Dado un `admin` sin 2FA confirmado, cuando llama la misma ruta, entonces responde 403 `two_factor_setup_required` (`api-007` CA-25) y no crea filas.

### Avisos y acuse

- **CA-23:** Dado un cambio de precio registrado (inmediato o programado), cuando se guarda, entonces en la misma transacción se crea un aviso de tipo `price-change` por cada usuario activo con rol `admin` o `zoo-admin` (panel), con payload que indica tipo de boleto, monto nuevo, `effective_at` e identificador de la fila de precio (`ticket_price_id`). Los cajeros no reciben aviso en ese momento: lo reciben cuando el precio entra en vigor (CA-32).
- **CA-24:** Dado un usuario autenticado, cuando llama `GET /api/v1/admin/notifications`, entonces recibe solo sus avisos, paginados, con indicación de leído y de acusado. Con `pending=1`, un `cashier` recibe solo sus avisos `price-change` sin acuse, incluidos los de cambios que ya entraron en vigor.
- **CA-25:** Dado un aviso del usuario actual, cuando llama `POST /api/v1/admin/notifications/{notification}/read`, entonces se registra `read_at` (una sola vez; llamadas repetidas no cambian el valor). Un aviso de otro usuario responde 404.
- **CA-26:** Dado un aviso de tipo `price-change` dirigido a un `cashier`, cuando llama `POST /api/v1/admin/notifications/{notification}/acknowledge`, entonces se registra `acknowledged_at`; llamadas repetidas no cambian el valor. Un aviso de otro usuario responde 404. Un usuario que no es `cashier` no puede acusar y responde 403. El acuse no borra el aviso ni bloquea ventas (CA-33).
- **CA-32:** Dado un cambio programado cuyo `effective_at` ya llegó, cuando la API atiende cualquier consulta de avisos (`GET /api/v1/admin/notifications`) posterior a esa hora, entonces crea exactamente un aviso `price-change` para cada cajero activo por cada fila de precio, y las consultas repetidas no crean avisos duplicados. Un cambio inmediato genera el aviso del cajero en la misma transacción que el cambio. Con el polling de 60 s del dashboard (`dashboard-005` CA-26), un cajero con sesión abierta lo recibe en un plazo de hasta 60 s tras la entrada en vigor (RN-19).
- **CA-33:** Dado un `cashier` con avisos `price-change` sin acuse, cuando registra una venta, entonces la venta se registra normalmente (201) y la respuesta no exige acuse ni lo menciona.

### Transversales

- **CA-27:** Dado un boleto vendido, cuando después cambia el precio, entonces el total y los precios unitarios del boleto no cambian.
- **CA-28:** Dadas las operaciones de venta, cancelación, cambio de precio y acuse, cuando se ejecutan, entonces Activitylog registra actor, acción y recurso afectado, con total, motivo o monto según corresponda, sin contraseñas, secretos ni el SVG del QR.
- **CA-29:** Dados `purchased_at`, `cancelled_at` y `effective_at`, cuando la API los devuelve, entonces están en UTC en formato ISO 8601. La presentación en la zona horaria del dispositivo es responsabilidad del dashboard (`dashboard-005`, CA-13). El parámetro `timezone` solo sirve para calcular el día de la cancelación y el campo `cancellable` (RN-16).
- **CA-30:** Dada la suite de PHPUnit, cuando se ejecuta `php artisan test`, entonces corre contra `arca_pruebas` (nunca `arca_zoo`) con `DatabaseTransactions`, y existe al menos un test que nombra cada CA de esta spec (CA-01 a CA-34).

### Impacto en api-007

- **CA-34:** Dado un boleto `cancelled`, cuando se calculan el panel o el reporte de boletos de `api-007` tras aplicar el cambio de la sección «Impacto en api-007», entonces el boleto no suma en boletos, adultos, niños, ingresos, serie ni desglose, y no aparece en el listado del reporte ni en su exportación (supuesto por defecto, pregunta 9).

## Reglas de negocio

- **RN-01:** Solo se admite pago en efectivo (`payment_method` = `cash`). No se integra ningún proveedor de pagos en esta spec.
- **RN-02:** Precio unitario, total y validación de cantidades se calculan solo en Actions de la API. El cliente envía cantidades; nunca envía ni calcula montos a cobrar.
- **RN-03:** El precio vigente de un tipo es la fila no eliminada de ese tipo con `effective_at` menor o igual al momento de la consulta y de mayor `effective_at`. No hay job ni scheduler: la vigencia se resuelve al consultar.
- **RN-04:** Cada boleto guarda copia de los precios unitarios aplicados en su venta. Un cambio posterior de precio no modifica boletos ya vendidos.
- **RN-05:** Solo un `admin` con `ticket-prices.manage` y 2FA confirmado puede cambiar precios. `zoo-admin` no los cambia; `ticket-prices.manage` se asigna solo a `admin` (`docs/03-roles-y-permisos.md`, matriz a actualizar).
- **RN-06:** Cada cambio de precio fija el monto de adulto y de niño en la misma operación. El cambio inmediato usa el momento de la operación; el programado usa la fecha y hora indicadas. Ambos quedan registrados como filas nuevas: los cambios previos no se modifican. Los cambios programados pueden acumularse por tipo; el vigente es el de mayor `effective_at` no posterior al momento de consulta (RN-03). No se cancelan ni editan cambios programados en esta fase (supuesto por defecto, pregunta 3).
- **RN-07:** El token QR es único por boleto, no predecible y generado en el servidor. Se guarda en `tickets.qr_code`. El SVG se genera por la API al emitir el boleto; no se almacena. El token identifica el boleto para el torniquete (fuera de alcance). Generar el SVG requiere una decisión de dependencia (pregunta 4).
- **RN-08:** Un boleto pasa de `completed` a `cancelled` una sola vez y el cambio no se revierte. Solo puede cancelarlo el `cashier` que lo vendió, con `tickets.cancel`, el mismo día de la venta (RN-16) y con motivo no vacío. La cancelación nunca borra físicamente el boleto ni el registro del motivo.
- **RN-09:** El historial es de solo lectura. No expone tokens ni SVG.
- **RN-10:** Los avisos se muestran solo dentro del dashboard. No se envían por correo, SMS ni push.
- **RN-11:** El acuse lo registra la API. Un aviso acusado no vuelve a aparecer como pendiente. El acuse no borra el aviso y no bloquea ventas (CA-33).
- **RN-12:** La autorización se aplica en el servidor con Policies y permisos Spatie `<resource>.<action>`. Ocultar opciones en la interfaz no protege los endpoints. Nuevos permisos: `ticket-prices.manage` (solo `admin`) y `tickets.cancel` (solo `cashier`, decisión de 2026-11-01); se agregan a `RolesAndPermissionsSeeder` solo al aprobar esta spec. `tickets.create` se asigna solo a `cashier`: hoy `RolesAndPermissionsSeeder` concede a `admin` todos los permisos (incluido `tickets.create`); el cambio de código para retirarlo se hace al aprobar esta spec, no antes.
- **RN-13:** Tickets y precios son datos financieros: borrado lógico (SoftDeletes), `created_by`/`updated_by` y Activitylog (Constitución V).
- **RN-14:** Rutas nombradas bajo `/api/v1/admin`, controladores delgados (Form Requests → Actions → API Resources), identificadores y permisos en inglés, mensajes en español, sin Inertia ni Wayfinder.
- **RN-15:** El arqueo y los cierres de caja no se calculan en esta spec, aunque las ventas que registra son su insumo futuro.
- **RN-16:** Mismo día y alcance de la cancelación. El día de la venta y el día de la cancelación se comparan en la zona horaria que envía el cliente en `timezone` (zona del dispositivo, con la misma regla que `api-007` RN-14: si falta o no es válida, `America/Mexico_City`). `purchased_at` (UTC) se convierte a esa zona para la comparación. El boleto no guarda la zona de la venta; se usa la zona de la petición de cancelación (supuesto por defecto, pregunta 8). El orden de validación de `POST .../cancel` es: 403 sin `tickets.cancel`; 404 si el boleto no es del cajero; 422 por motivo vacío (CA-11); 422 si ya está cancelado (CA-12); 422 si no es del mismo día (CA-31).
- **RN-17:** Alcance del historial: el `cashier` ve solo sus boletos; `admin` y `zoo-admin` con `tickets.view` ven todos los boletos en lectura (decisión de 2026-11-01); `executive` y `veterinarian` no tienen acceso.
- **RN-18:** Los boletos `cancelled` no cuentan en los totales, ingresos, desgloses ni listados de los reportes y del panel de `api-007` (decisión de 2026-11-01). Este cambio se aplica en el mismo cambio que esta spec y se detalla en «Impacto en api-007»; esta spec no edita `api-007`.
- **RN-19:** Momento de los avisos de precio (decisión de 2026-11-01): `admin` y `zoo-admin` reciben el aviso al programar o cambiar el precio (CA-23). El `cashier` lo recibe cuando el precio entra en vigor (CA-32). Para un cambio inmediato, la entrada en vigor es el momento de la operación. Sin job (RN-03), el aviso del cajero se crea en la primera consulta de avisos posterior a `effective_at`; la deduplicación usa la fila de precio por destinatario (DBR-006, supuesto por defecto, pregunta 10).

## Datos, privacidad y auditoría

- Datos financieros: `tickets` (venta, cancelación, precios por línea) y `ticket_prices` (vigencia de precios). Ningún dato se borra físicamente. Ver DBR-006 para columnas, índices y borrado lógico.
- `staff_notifications` no contiene datos personales de visitantes. Se propone una fila por destinatario y por fila de precio (`ticket_price_id`, supuesto por defecto, pregunta 10).
- Auditoría: Activitylog (CA-28) para venta, cancelación, cambio de precio y acuse. El actor de una cancelación es el cajero que la solicita.
- No se almacenan el SVG del QR ni secretos. El token `qr_code` no se devuelve en listados (CA-16). `cancellable` se calcula en cada consulta y no se guarda.
- La configuración de impresión del boleto no pasa por la API ni por la base de datos (`dashboard-005` RN-12).
- Requiere DBR: sí. Ver `docs/database/requests/DBR-006-ticket-sales.md`. La DBR acompaña a esta spec; no la sustituye.

## Flujos y errores

1. **Venta:** el cajero envía cantidades → la API valida (CA-03), resuelve precio vigente (CA-04), calcula total, crea boleto, emite QR y responde con el boleto (CA-01, CA-07). Los avisos pendientes no bloquean la venta (CA-33).
2. **Cancelación:** el cajero envía motivo y `timezone` → la API valida permiso (CA-13), alcance (CA-13), motivo (CA-11), estado (CA-12) y día (CA-31) en el orden de RN-16 → cambia estado una vez (CA-10) y audita (CA-28).
3. **Cambio de precio:** el admin envía montos y modo → la API valida 2FA y permiso (CA-22), valida montos y fecha (CA-20, CA-21), guarda filas y avisos de `admin` y `zoo-admin` en una transacción (CA-23).
4. **Entrada en vigor y acuse:** el dashboard del cajero consulta avisos al entrar y cada 60 s → la API crea los avisos de cambios vencidos (CA-32) y devuelve los pendientes (CA-24) → el cajero acusa (CA-26). Mientras no acuse, la venta sigue disponible (CA-33).
5. **Errores:** 401 sin sesión; 403 sin permiso, sin 2FA (`two_factor_setup_required`) o acción de otro rol; 404 boleto o aviso inexistente o fuera de alcance; 422 validación o regla de negocio, con mensaje en español.
6. **Sin conexión:** esta spec no define venta offline. Si la API no responde, no hay venta registrada y el cliente no la presenta como hecha.

## Impacto en api-007

Cambio a aplicar en el mismo cambio que esta spec (decisión de 2026-11-01, RN-18). Esta spec no edita los CA de `api-007`. La reapertura de 007 (estado y nota de historial) ya está registrada en su spec; el cambio de sus CA se redacta con esta feature y requiere la aprobación de Jonathan.

| Criterio o regla de `api-007` | Cambio |
|---|---|
| CA-19 (panel: totales del día, de 7 días e ingresos; serie diaria) | Excluir boletos `cancelled` de todos los cálculos. |
| CA-20 (reporte semanal, mensual o personalizado: totales, desglose por día y listado) | Excluir boletos `cancelled` de totales, desglose y listado. |
| CA-22 y CA-23 (exportación CSV, Excel y PDF) | Mismos boletos y totales que el reporte en pantalla (`api-007` RN-13 se mantiene). |
| RN-08 (cálculos en Actions) | La Action de cálculo filtra `status` = `completed`; el filtro vive en la Action, no en el cliente. |
| CA-21, RN-14 (zona horaria y rangos) | Sin cambio. |

Notas:
- `api-007` se reabrió el 2026-11-01 por decisión de Jonathan (estado En progreso; nota de historial en su spec, sin cambios de CA en ese paso). Sus CA se ajustan con esta feature (pregunta 9).
- Los tests de `api-007` deben cubrir CA-34 de esta spec (boleto cancelado excluido).
- `dashboard-003` no cambia su código, pero sus cifras cambian al desplegar; el despliegue debe hacerse junto para no mostrar totales inconsistentes.

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:**
  - `api-003` (sesión, `staff.user`, 2FA por rol), `api-007` (CA-25 de 2FA en `/admin`; reporte de boletos, con el impacto de la sección anterior).
  - DBR-006 (`ticket_prices`, columnas de `tickets`, `staff_notifications`); depende de DBR-001 y DBR-002; DBR-005 ya aplicada en pruebas.
  - Generación del QR en SVG: requiere la librería PHP que decida el ADR 0019 (`docs/adr/0019-qr-svg-generation-api.md`, estado **Propuesto**), aprobado antes de implementar CA-09 (Constitución I) (pregunta 4).
  - Actualización de `docs/03-roles-y-permisos.md` con `ticket-prices.manage` (solo `admin`), `tickets.cancel` (solo `cashier`) y `tickets.create` solo para `cashier`. El texto de la matriz ya se preparó en el borrador (2026-11-01); entra en vigor al aprobar esta spec.
- **Riesgos:**
  - Cambios de esquema: el orden de despliegue de DBR-006 es obligatorio; sin la migración no hay código de venta.
  - Reporte de `api-007`: la exclusión de cancelados cambia las cifras visibles al desplegar (sección «Impacto en api-007»).
  - Avisos de cajero sin job: se crean al consultar, no al cumplirse la hora. Si ningún cajero consulta, el aviso se crea más tarde, pero no se pierde. La cadencia de 60 s del dashboard acota el retraso.
  - La consulta de avisos escribe filas (materialización de CA-32): requiere idempotencia y control de concurrencia; el plan lo define.
  - La zona del día de cancelación depende del dispositivo que cancela (RN-16).
  - Precios programados sin job: la vigencia depende de la hora del servidor y de la zona UTC.
- **Preguntas resueltas (2026-11-01):** la antigua pregunta 1 (venta y alcance del historial de `admin`) queda cerrada por decisión de Jonathan: solo `cashier` vende; `admin` y `zoo-admin` consultan el historial en lectura (RN-17). La numeración de las demás preguntas se mantiene.
- **Preguntas abiertas (con supuesto por defecto; confirmar antes de aprobar):**
  2. **Permisos de lectura:** Supuesto por defecto — confirmar: el precio vigente (CA-17) se lee con `tickets.create` o `ticket-prices.manage`; los avisos (CA-24) los lee cualquier cuenta que los reciba. El próximo cambio programado se incluye en `current` (CA-17).
  3. **Cambios programados:** Supuesto por defecto — confirmar: se permiten varios cambios futuros por tipo (RN-06); no se cancelan ni editan programados en esta fase; una fecha pasada en modo `scheduled` responde 422 (CA-20).
  4. **QR en SVG:** Supuesto por defecto — confirmar: la generación usa una librería PHP aprobada por ADR (Constitución I) antes de implementar CA-09; no se escribe un codificador QR propio. Sin ADR aprobado, CA-09 no se implementa. Propuesta de decisión: `docs/adr/0019-qr-svg-generation-api.md` (estado Propuesto; compara `endroid/qr-code` y `bacon/bacon-qr-code`, versiones por verificar).
  5. **Efectivo:** Supuesto por defecto — confirmar: no se registran monto recibido ni cambio; la venta solo registra el total.
  6. **Folio y nombre del cajero:** Supuesto por defecto — confirmar: el folio es `tickets.id` y la respuesta de venta incluye `cashier_name` (necesario para el campo «cajero» de la impresión, `dashboard-005` CA-27).
  7. **Boleto de otro cajero:** Supuesto por defecto — confirmar: un `cashier` que intenta cancelar un boleto ajeno recibe 404 (CA-13), igual que en `api-007` CA-02.
  8. **Zona y campo `cancellable`:** Supuesto por defecto — confirmar: la zona de la venta es la de la petición de cancelación (RN-16), y la lista incluye `cancellable` calculado por la API (CA-14), sin que el cliente aplique la regla.
  9. **Impacto en `api-007`:** Supuesto por defecto — confirmar: el listado del reporte también excluye los boletos cancelados (CA-34), no solo los totales; y `api-007` se reabrió el 2026-11-01 por decisión de Jonathan (estado En progreso; nota de historial en su spec).
  10. **Avisos del cajero:** Supuesto por defecto — confirmar: el aviso se deduplica por `ticket_price_id` y destinatario (DBR-006); los destinatarios de cada materialización son los cajeros activos en ese momento.
