# 009 · ticket-sales

- App dueña: `api`
- Apps/paquetes afectados: `api`, `dashboard` (consumidor, `dashboard-005`), `packages/api-client`; `api-007` (impacto en totales y reportes, ver «Impacto en api-007»; se aplica en el mismo cambio que esta feature, y su CA-34 queda vigente); documentos `docs/03-roles-y-permisos.md` (matriz: permisos nuevos, ya aplicada y verificada el 2026-11-02), `docs/database/requests/DBR-006-ticket-sales.md` (nota de canal de correo) y `docs/adr/0020-price-change-email-notifications.md` (correo de avisos de precio, Propuesto — diferido).
- Estado: Aprobada
- Aprobación funcional: Jonathan, 2026-11-02 (aprueba el contenido de la spec y acepta los supuestos vigentes, que quedan convertidos en decisiones cerradas; ver «Decisiones cerradas»)
- Solicitante / responsable funcional: Jonathan
- Responsable de BD: Víctor Adrián (DBR-006, aprobada por BD y backend el 2026-11-02)
- Generación del QR en SVG: ADR 0019 (`docs/adr/0019-qr-svg-generation-api.md`) **Aceptado** el 2026-11-02, con la librería `bacon/bacon-qr-code` ^3.1 (v3.1.1) fijada en el ADR. CA-09 es vigente y se implementa.
- Excepciones a la Constitución V (`Ticket` y `TicketPrice` sin `BaseModel`; `staff_notifications` sin SoftDeletes) y criterio de 404 en el alcance de CA-13: ADR 0021 (`docs/adr/0021-ticket-sales-constitution-exceptions.md`) **Aceptado** el 2026-11-02.
- Última edición: 2026-11-02 (aprobación; supuestos vigentes cerrados como decisiones; ADR 0019 aceptado; avisos y correo siguen diferidos y sin cerrar; revisión de 2026-11-02 aprobada por Jonathan: zona fija de cancelación, tope de 100 por tipo, límites de frecuencia y límite de `effective_at`; ver «Revisión 2026-11-02»; estado sin cambios: Aprobada)

Convención: tras la aprobación del 2026-11-02, los puntos que eran «Supuesto por defecto» de los CA y RN vigentes son **decisiones cerradas** y se citan como «decisión 2026-11-02, pregunta N». Los elementos diferidos conservan su numeración y su texto, y siguen sin cerrar.

## Revisión 2026-11-02 (aprobada por Jonathan)

Revisión de seguridad y calidad del backend, decidida por Jonathan el 2026-11-02 sobre una spec ya Aprobada. **El estado sigue siendo Aprobada.** La revisión añade CA y RN al final sin renumerar los existentes, y corrige los textos de zona horaria de cancelación (RN-16, CA-31; también CA-14, CA-29 y la pregunta 8 cerrada). Cuatro decisiones:

1. **Cancelación con zona fija (RN-16, CA-31; cambia CA-14 y CA-29).** El cajero no puede cancelar un boleto de un día anterior. El día de la venta y el día de la cancelación se comparan **siempre** en la zona horaria del zoológico, `config('arca.report_timezone')` (America/Mexico_City). La API ignora cualquier `timezone` del cuerpo de `POST /api/v1/admin/tickets/{ticket}/cancel`; el campo se retira del contrato de esa ruta. El campo `cancellable` del historial se calcula con la misma zona. El parámetro `timezone` de `GET /api/v1/admin/tickets` sigue sirviendo para interpretar `from`/`to` y para presentación; no afecta a la cancelación. La pregunta 8 cerrada el 2026-11-02 queda **sustituida** por esta decisión.
2. **Tope por venta (CA-42, RN-29; CA-03 aclarado).** Cada venta admite como máximo 100 boletos por tipo (`adult_quantity` ≤ 100 y `child_quantity` ≤ 100). Más de 100 responde 422 en español. Las cantidades no enteras, incluidos los booleanos y las cadenas no numéricas, responden 422 (aclaración de CA-03). La validación es de la API; el cliente solo muestra el mensaje.
3. **Límites de frecuencia (CA-43, CA-44, RN-30).** Decisión de la revisión: `POST /api/v1/admin/tickets` admite 60 solicitudes por minuto por usuario autenticado; `POST /api/v1/admin/tickets/{ticket}/cancel` admite 20 por minuto por usuario autenticado. Exceder el límite responde 429. **Límite de `effective_at` (CA-45, RN-31).** Un cambio programado no puede tener `effective_at` posterior a un año desde el momento de la operación (422).
4. **Tipo de dato de `tickets.total_amount` (nota, sin CA nuevo).** Según la información de Jonathan del 2026-11-02, en la base de datos real la columna es `DECIMAL(8,2)`, con tope de $999,999.99; un total que lo supere responde 422 (la Action ya aplica ese tope). `docs/database/esquema-ingles.md` documenta `DECIMAL(10,2)`; **no se edita en esta revisión**. El responsable de BD debe corregir esa documentación (tarea T-58 de `tasks/009-ticket-sales.md`). Esta nota no está verificada por el redactor: no hay acceso a la base de datos en esta sesión.

**Textos nuevos (propuesta del redactor, pendientes de confirmación):** «No puedes vender más de 100 boletos de cada tipo en una misma venta.»; «La fecha de entrada en vigor no puede ser mayor a un año a partir de hoy.»; el 429 reutiliza «Demasiados intentos. Intenta de nuevo en :seconds segundos.» de `lang/es/auth.php`.

**Preguntas abiertas de la revisión (no bloquean lo vigente; el orquestador decide):**
- **R1.** ¿Se admiten cadenas numéricas enteras (p. ej. `"2"`) como cantidad, y el número `2.0`? Propuesta: sí en ambos casos; decimales con fracción, booleanos y cadenas no numéricas, 422.
- **R2.** ¿El tope de total monetario (999,999.99 → 422) necesita CA propio con test? Propuesta: sí, como CA nuevo al final en una revisión posterior; hoy solo consta en la nota 4.
- **R3.** ¿Se confirman los textos propuestos de la sección anterior?

## Alcance de esta iteración (decisión de 2026-11-02)

Los avisos de cambio de precio (notificaciones en el dashboard y correo electrónico) quedan **diferidos**: se conserva toda su documentación, pero no se implementan en esta iteración. Se mantienen la numeración y el texto de los CA y RN.

- **Vigente (se implementa y se prueba): 32 CA.** CA-01 a CA-22, CA-27 a CA-31, CA-34 y, por la revisión de 2026-11-02, CA-42 a CA-45. Incluye venta en efectivo con QR y boleto imprimible, historial, cancelación con motivo, precios con cambio inmediato o programado por `admin` con 2FA (sin efectos de notificación) e impacto en `api-007`.
- **Diferido (decisión 2026-11-02): 13 CA.** CA-23, CA-24, CA-25, CA-26, CA-32, CA-33 y CA-35 a CA-41.
- **RN diferidas:** RN-10, RN-11, RN-19 y RN-20 a RN-28.
- **Rutas diferidas:** `GET /api/v1/admin/notifications`, `POST /api/v1/admin/notifications/{notification}/read` y `POST /api/v1/admin/notifications/{notification}/acknowledge`. La spec no define un permiso propio para avisos; la matriz de `docs/03-roles-y-permisos.md` no cambia por este motivo.
- **Efecto en lo vigente:** un cambio de precio (CA-18, CA-19) no crea avisos ni encola correos. El `cashier` conoce el precio vigente porque la vista de Venta lo carga de la API (CA-17; `dashboard-005` CA-04). La venta no depende de ningún aviso.
- **Base de datos:** DBR-006 deja `staff_notifications` (incluida la columna `ticket_price_id`) creada pero sin uso en esta iteración. No cambia el estado de la DBR.
- **Regla de trazabilidad:** los CA diferidos no requieren test ni tarea hasta que una futura revisión de esta spec los reactive. Una revisión posterior es la única que puede reactivarlos.

## Decisiones cerradas (aprobación de 2026-11-02)

Estas decisiones eran supuestos por defecto de la versión borrador y quedan cerradas por la aprobación de Jonathan. Cambiarlas exige una nueva revisión de la spec.

- **Pregunta 2 (permisos de lectura):** el precio vigente (CA-17) se lee con `tickets.create` o `ticket-prices.manage`. `GET .../ticket-prices/current` incluye el próximo cambio programado de cada tipo.
- **Pregunta 3 (cambios programados):** se permiten varios cambios futuros por tipo (RN-06). No se cancelan ni editan programados en esta fase. Una fecha y hora anterior al momento de la operación en modo `scheduled` responde 422 (CA-20).
- **Pregunta 4 (QR en SVG):** la generación usa una librería PHP aprobada por ADR (Constitución I). Se fija `bacon/bacon-qr-code` ^3.1 según ADR 0019 (Aceptado, 2026-11-02). No se escribe un codificador QR propio.
- **Pregunta 5 (efectivo):** no se registran monto recibido ni cambio. La venta solo registra el total.
- **Pregunta 6 (folio y cajero):** el folio es `tickets.id`. La respuesta de venta incluye `cashier_name` (necesario para el campo «cajero» de la impresión, `dashboard-005` CA-27).
- **Pregunta 7 (boleto de otro cajero):** un `cashier` que intenta cancelar un boleto ajeno recibe 404 (CA-13), igual que en `api-007` CA-02.
- **Pregunta 8 (zona y `cancellable`):** *(sustituida por la revisión de 2026-11-02, punto 1: la zona para el día de la cancelación es la del zoológico, `config('arca.report_timezone')`, y la API ignora `timezone` al cancelar)* La lista del historial incluye `cancellable` calculado por la API (CA-14); el cliente no aplica esa regla.
- **Pregunta 9 (impacto en `api-007`):** el listado del reporte también excluye los boletos cancelados (CA-34), no solo los totales. `api-007` está reabierto desde el 2026-11-01 (estado En progreso; nota de historial en su spec).
- **Pregunta 1 (resuelta el 2026-11-01):** solo `cashier` vende; ver «Decisiones incorporadas».

Las preguntas 10 a 17 corresponden a avisos y correo (diferidos) y **no están cerradas**.

## Problema y contexto

La taquilla del dashboard (`dashboard-001`, CA-04 y CA-11) es demostrativa: no registra ventas, no cancela boletos y no muestra historial real. La API solo tiene el reporte de boletos de solo lectura (`api-007`, CA-19 a CA-23), que consulta `tickets` y no puede tener datos mientras no exista la venta.

Esta feature agrega, en la API, la venta de boletos en efectivo, la emisión de un token QR por boleto (la API entrega el QR en SVG), la cancelación con motivo, el historial del cajero, la administración de precios con vigencia inmediata o programada (solo `admin`, con 2FA) y los avisos sobre cambios de precio (estos últimos diferidos, ver «Alcance de esta iteración»).

Los cálculos de precio y total viven solo en Actions (Constitución III). La base de datos cambia solo por la DBR-006.

## Objetivos

- Registrar ventas de boletos de adulto y niño en efectivo (solo `cashier`), con total calculado en el servidor y boleto con QR listo para imprimir.
- Cancelar un boleto con motivo obligatorio, solo el cajero que lo vendió y el mismo día, sin borrado físico y con auditoría.
- Entregar al cajero su historial de boletos con filtros, incluidos los cancelados.
- Permitir que `admin` cambie el precio de adulto y de niño de forma inmediata o programada, con 2FA confirmado.
- *Diferido (decisión 2026-11-02):* avisar a `admin` y `zoo-admin` (panel y correo) de cada cambio de precio al programarlo o cambiarlo, y a `cashier` (aviso emergente con acuse en el dashboard, y correo) cuando el precio entra en vigor.
- Registrar en Activitylog cada venta, cancelación y cambio de precio (el acuse queda diferido con los avisos).

## Fuera de alcance

- Arqueo y cierres de caja (`cash-closings.*`): spec posterior.
- Pagos con tarjeta, transferencia u otros medios electrónicos. Requieren spec, ADR y proveedor aprobados (`AGENTS.md`, regla de Payments).
- Validación del QR en el torniquete (hardware futuro). El token se emite y se guarda; no se valida aquí.
- Envío del boleto por correo, SMS o push. Por correo no se envía el boleto ni datos de venta en ningún caso.
- *Diferido (decisión 2026-11-02):* el correo de avisos de cambio de precio (RN-20 a RN-28; CA-35 a CA-41). Sale de esta iteración.
- Preferencias de correo por usuario (opt-out): no se implementan en esta fase. Diferido junto con el correo (pregunta 13, sin cerrar).
- *Diferido (decisión 2026-11-02):* avisos de cambio de precio en el dashboard (centro de avisos, modal con acuse, consultas de avisos; CA-23 a CA-26, CA-32, CA-33 y RN-10, RN-11, RN-19).
- Registro de monto recibido y cambio de efectivo (decisión 2026-11-02, pregunta 5).
- Reimpresión de boletos desde el historial (no solicitada en esta fase).
- Devolución física de efectivo al cliente: la cancelación solo cambia el estado en el sistema.
- Cancelación de boletos por `admin` o `zoo-admin` (decisión de 2026-11-01).
- Venta de boletos por `admin` o `zoo-admin` (decisión de 2026-11-01: solo `cashier` vende).
- Vista previa de total antes de registrar la venta: el total lo devuelve la API al registrar (`dashboard-005`, pregunta 1).
- Configuración de impresión del boleto (formato, ancho, fuente, márgenes, campos, pie): es preferencia del dashboard (`dashboard-005` RN-12); la API no la recibe ni la guarda.
- Listado completo, edición o cancelación de cambios de precio programados (decisión 2026-11-02, pregunta 3).
- Cambios a `apps/web`, `apps/pwa` y `apps/mobile`.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| `cashier` (taquilla; único rol que vende) | Vender boletos en efectivo, cancelar sus boletos del mismo día con motivo, consultar su historial, leer el precio vigente, recibir y acusar avisos de cambio de precio en el dashboard, y recibir su correo cuando el precio entra en vigor *(avisos y correo: diferidos, decisión 2026-11-02)* | `tickets.create`, `tickets.view`, `tickets.cancel` (solo este rol cancela); lectura de precio vigente con `tickets.create` (pregunta 2) |
| `admin` (Presidencia) | Cambiar precios de adulto y niño (inmediato o programado); recibir avisos en el panel y por correo *(diferido)*; consultar el historial en lectura | Sesión válida + 2FA confirmado; `ticket-prices.manage` (nuevo); `tickets.view` (alcance: todos los boletos, RN-17). No vende (sin `tickets.create`), no cancela y no ve la sección Venta. |
| `zoo-admin` (Dirección) | Recibir avisos de cambio de precio en el panel y por correo *(diferido)*; consultar el historial de todos los boletos (solo lectura); sin cambiar precios | Sesión válida + 2FA confirmado; `tickets.view` (alcance: todos los boletos, RN-17). No vende ni cancela. |
| `executive`, `veterinarian` | Sin acceso a estas rutas | — |

Nota de matriz: por decisión de 2026-11-01, solo `cashier` vende. `docs/03-roles-y-permisos.md` asignaba a `admin` `tickets.create`; esa asignación se retira como parte de esta feature. La matriz de `docs/03-roles-y-permisos.md` ya refleja este cambio (ver RN-12). `admin` y `zoo-admin` conservan `tickets.view`. `tickets.cancel` solo se asigna a `cashier`.

## Historias de usuario

- Como `cashier`, quiero registrar la venta de boletos de adulto y niño en efectivo y obtener un boleto con QR para entregarlo al visitante.
- Como `cashier`, quiero cancelar un boleto que vendí hoy indicando el motivo, para corregir errores del mismo día sin perder el registro.
- Como `cashier`, quiero consultar mis boletos del día y anteriores, filtrándolos por folio, estado y fecha.
- Como `admin`, quiero cambiar el precio de adulto y de niño de inmediato o en una fecha futura, para que la taquilla cobre el precio correcto sin depender de un cambio manual.
- *(Diferida, decisión 2026-11-02.)* Como `zoo-admin` y `admin`, quiero ver en el panel y recibir por correo los cambios de precio, para estar informados.
- *(Diferida, decisión 2026-11-02.)* Como `cashier`, quiero que el sistema me avise cuando un cambio de precio entra en vigor y registrar mi acuse, sin que ese aviso me impida vender.

## Criterios de aceptación

### Venta

- **CA-01:** Dado un `cashier` con `tickets.create` y precios vigentes de adulto y niño, cuando llama `POST /api/v1/admin/tickets` con `adult_quantity` y `child_quantity` enteros y al menos uno mayor que cero, entonces la API crea el boleto con `status` `completed`, `payment_method` `cash`, `cashier_id` del usuario actual, `purchased_at` en UTC y los precios unitarios vigentes copiados en el boleto, y responde 201 con el folio, la fecha, las cantidades, el total, el nombre del cajero y el QR en SVG (CA-09). El folio es el identificador `tickets.id` (decisión 2026-11-02, pregunta 6).
- **CA-02:** Dada una venta válida, cuando la API responde, entonces `total_amount` es igual a `adult_quantity` × precio de adulto más `child_quantity` × precio de niño, calculado solo en la Action, con dos decimales en MXN. Un test verifica un caso con cantidades mixtas. Ejemplo de referencia con el precio inicial: 2 adultos y 1 niño = 2 × $25.00 + 1 × $16.00 = $66.00.
- **CA-03:** Dada una solicitud con cantidades negativas, no enteras, ausentes o ambas en cero, cuando se envía, entonces responde 422 con mensajes en español por campo y no crea boleto ni registro de auditoría. *(Aclaración de la revisión de 2026-11-02: se consideran no enteras las cantidades con fracción (p. ej. `1.5`), los booleanos (`true`, `false`) y las cadenas no numéricas (p. ej. `"dos"`); responden 422. Las cadenas numéricas enteras se admiten según la pregunta R1 de la revisión. El tope de 100 por tipo es CA-42.)*
- **CA-04:** Dado que no existe precio vigente para `adult` o para `child` (ninguna fila no eliminada con `effective_at` menor o igual al momento de la venta), cuando se intenta vender, entonces responde 422 con «No hay un precio vigente configurado para este tipo de boleto.» y no crea boleto.
- **CA-05:** Dado un cambio de precio programado para una fecha futura, cuando se registra una venta antes de esa fecha, entonces el total usa el precio anterior; cuando se registra una venta después de esa fecha, entonces usa el precio nuevo.
- **CA-06:** Dado un usuario sin `tickets.create` (`admin`, `zoo-admin`, `executive` o `veterinarian`; solo `cashier` vende, decisión de 2026-11-01), cuando llama `POST /api/v1/admin/tickets`, entonces responde 403 y no crea boleto. Sin sesión responde 401.
- **CA-07:** Dado un error durante la creación del boleto (p. ej. al generar el token QR), cuando ocurre, entonces no queda boleto ni registro de auditoría parcial: la operación es transaccional.
- **CA-08:** Dadas dos ventas, cuando se registran, entonces cada boleto tiene un `qr_code` distinto, generado en el servidor con aleatoriedad criptográfica, y la base de datos impide duplicados (DBR-006).
- **CA-09:** Dado un boleto creado, cuando la respuesta incluye `qr_svg`, entonces es un documento SVG válido generado por la API a partir del `qr_code` del boleto, y la API no almacena el SVG. Un test verifica la estructura del SVG y que dos tokens distintos producen SVG distintos. La librería es la fijada por ADR 0019 (Aceptado, 2026-11-02; decisión 2026-11-02, pregunta 4).

### Cancelación

- **CA-10:** Dado un boleto `completed` vendido por el `cashier` que llama, y ese `cashier` con `tickets.cancel`, cuando llama `POST /api/v1/admin/tickets/{ticket}/cancel` con un motivo no vacío y el boleto es del mismo día de la venta (CA-31), entonces el boleto pasa a `cancelled`, registra `cancelled_at`, `cancelled_by` y `cancellation_reason`, responde 200 y el registro permanece en la base de datos.
- **CA-11:** Dada una cancelación sin motivo o con motivo vacío, cuando se envía, entonces responde 422 en español y no cambia el boleto.
- **CA-12:** Dado un boleto ya `cancelled`, cuando se intenta cancelarlo de nuevo, entonces responde 422 con «Este boleto ya está cancelado.» y no cambia ningún dato.
- **CA-13:** Dado un usuario sin `tickets.cancel` (`admin`, `zoo-admin`, `executive`, `veterinarian`), cuando intenta cancelar, entonces responde 403. Dado un `cashier` que intenta cancelar un boleto que no vendió, cuando lo intenta, entonces responde 404 con «Boleto no encontrado.» (criterio de alcance, igual que `api-007` CA-02; decisión 2026-11-02, pregunta 7).
- **CA-31:** Dado un boleto `completed` vendido por el `cashier` que llama en un día distinto al día actual en la zona del zoológico (RN-16), cuando intenta cancelarlo, entonces responde 422 con «Solo se pueden cancelar boletos el mismo día en que se vendieron.» y no cambia ningún dato. Dado un boleto del mismo día en esa zona, cuando se cancela, entonces se aplica CA-10. *Revisión de 2026-11-02, punto 1:* la zona es `config('arca.report_timezone')` (America/Mexico_City). Dado un cuerpo de cancelación que incluye `timezone` con cualquier valor, cuando se evalúa el día, entonces la API lo ignora y no cambia el resultado.

### Historial

- **CA-14:** Dado un usuario con `tickets.view`, cuando llama `GET /api/v1/admin/tickets`, entonces recibe una lista paginada ordenada por `purchased_at` descendente, con folio, fecha, cantidades, total y estado. Incluye los boletos cancelados, con `cancelled_at` y el motivo. Acepta filtros por folio, estado y rango de `purchased_at`, y el parámetro opcional `timezone` (RN-16), que interpreta `from`/`to` y la presentación. Cada elemento incluye `cancellable` (booleano calculado por la API: `true` solo si el usuario que consulta puede cancelar ese boleto ahora, RN-16). *Revisión de 2026-11-02, punto 1:* `cancellable` usa siempre la zona del zoológico (`config('arca.report_timezone')`), no la de la petición; sustituye la pregunta 8 cerrada. El alcance por rol está en CA-15 y RN-17.
- **CA-15:** Dado un `cashier`, cuando consulta el historial, entonces la lista incluye solo los boletos que él vendió; nunca incluye boletos de otro cajero, y ningún filtro de la API lo amplía. Dado un `admin` o `zoo-admin` con `tickets.view`, cuando consulta el historial, entonces ve todos los boletos en lectura (decisión de 2026-11-01; no vende ni cancela).
- **CA-16:** Dada cualquier lista del historial, cuando se responde, entonces no incluye `qr_code` ni `qr_svg`.

### Precios

- **CA-17:** Dado un usuario con `tickets.create` o `ticket-prices.manage`, cuando llama `GET /api/v1/admin/ticket-prices/current`, entonces recibe, por cada tipo (`adult`, `child`), el monto vigente y su `effective_at`, y, si existe, el próximo cambio programado de ese tipo (monto y `effective_at`) (decisión 2026-11-02, pregunta 2). Sin precio vigente para un tipo, ese tipo responde sin monto y con indicación explícita.
- **CA-18:** Dado un `admin` con `ticket-prices.manage` y 2FA confirmado, cuando llama `POST /api/v1/admin/ticket-prices` con montos de adulto y de niño y modo `immediate`, entonces se crean las filas con `effective_at` igual al momento de la operación (UTC), `created_by` del admin, responde 201 y el precio vigente cambia desde esa respuesta. Sin efectos de notificación en esta iteración (decisión 2026-11-02): no crea avisos ni encola correos.
- **CA-19:** Dado un `admin` con 2FA confirmado, cuando llama `POST /api/v1/admin/ticket-prices` con modo `scheduled` y una fecha y hora futuras, entonces se crean las filas con esa `effective_at`; antes de esa hora el precio vigente sigue siendo el anterior y a partir de ella es el nuevo, sin intervención manual. Sin efectos de notificación en esta iteración (decisión 2026-11-02): no crea avisos ni encola correos.
- **CA-20:** Dado un modo `scheduled` con fecha y hora anteriores al momento de la operación, cuando se envía, entonces responde 422 en español y no crea filas (decisión 2026-11-02, pregunta 3).
- **CA-21:** Dado un monto cero, negativo o con más de dos decimales, cuando se envía, entonces responde 422 por campo y no crea filas.
- **CA-22:** Dado un `zoo-admin` o un `cashier` que intenta cambiar precios, cuando llama `POST /api/v1/admin/ticket-prices`, entonces responde 403 y no crea filas. Dado un `admin` sin 2FA confirmado, cuando llama la misma ruta, entonces responde 403 `two_factor_setup_required` (`api-007` CA-25) y no crea filas.

### Avisos y acuse (diferido, decisión 2026-11-02)

- **CA-23:** *Diferido (decisión 2026-11-02).* Dado un cambio de precio registrado (inmediato o programado), cuando se guarda, entonces en la misma transacción se crea un aviso de tipo `price-change` por cada usuario activo con rol `admin` o `zoo-admin` (panel), con payload que indica tipo de boleto, monto nuevo, `effective_at` e identificador de la fila de precio (`ticket_price_id`). Los cajeros no reciben aviso en ese momento: lo reciben cuando el precio entra en vigor (CA-32).
- **CA-24:** *Diferido (decisión 2026-11-02).* Dado un usuario autenticado, cuando llama `GET /api/v1/admin/notifications`, entonces recibe solo sus avisos, paginados, con indicación de leído y de acusado. Con `pending=1`, un `cashier` recibe solo sus avisos `price-change` sin acuse, incluidos los de cambios que ya entraron en vigor.
- **CA-25:** *Diferido (decisión 2026-11-02).* Dado un aviso del usuario actual, cuando llama `POST /api/v1/admin/notifications/{notification}/read`, entonces se registra `read_at` (una sola vez; llamadas repetidas no cambian el valor). Un aviso de otro usuario responde 404.
- **CA-26:** *Diferido (decisión 2026-11-02).* Dado un aviso de tipo `price-change` dirigido a un `cashier`, cuando llama `POST /api/v1/admin/notifications/{notification}/acknowledge`, entonces se registra `acknowledged_at`; llamadas repetidas no cambian el valor. Un aviso de otro usuario responde 404. Un usuario que no es `cashier` no puede acusar y responde 403. El acuse no borra el aviso ni bloquea ventas (CA-33).
- **CA-32:** *Diferido (decisión 2026-11-02).* Dado un cambio programado cuyo `effective_at` ya llegó, cuando la API atiende cualquier consulta de avisos (`GET /api/v1/admin/notifications`) posterior a esa hora, entonces crea exactamente un aviso `price-change` para cada cajero activo por cada fila de precio, y las consultas repetidas no crean avisos duplicados. Un cambio inmediato genera el aviso del cajero en la misma transacción que el cambio. Con el polling de 60 s del dashboard (`dashboard-005` CA-26), un cajero con sesión abierta lo recibe en un plazo de hasta 60 s tras la entrada en vigor (RN-19).
- **CA-33:** *Diferido (decisión 2026-11-02).* Dado un `cashier` con avisos `price-change` sin acuse, cuando registra una venta, entonces la venta se registra normalmente (201) y la respuesta no exige acuse ni lo menciona.

### Transversales

- **CA-27:** Dado un boleto vendido, cuando después cambia el precio, entonces el total y los precios unitarios del boleto no cambian.
- **CA-28:** Dadas las operaciones de venta, cancelación y cambio de precio (el acuse queda diferido con los avisos, decisión 2026-11-02), cuando se ejecutan, entonces Activitylog registra actor, acción y recurso afectado, con total, motivo o monto según corresponda, sin contraseñas, secretos ni el SVG del QR.
- **CA-29:** Dados `purchased_at`, `cancelled_at` y `effective_at`, cuando la API los devuelve, entonces están en UTC en formato ISO 8601. La presentación en la zona horaria del dispositivo es responsabilidad del dashboard (`dashboard-005`, CA-13). *Revisión de 2026-11-02, punto 1:* el parámetro `timezone` de `GET` solo interpreta `from`/`to` y la presentación (RN-16); el día de la cancelación y `cancellable` usan la zona del zoológico y no dependen de `timezone`.
- **CA-30:** Dada la suite de PHPUnit, cuando se ejecuta `php artisan test`, entonces corre contra `arca_pruebas` (nunca `arca_zoo`) con `DatabaseTransactions`, y existe al menos un test que nombra cada CA vigente de esta spec (CA-01 a CA-22, CA-27 a CA-31, CA-34 y, por la revisión de 2026-11-02, CA-42 a CA-45; 32 CA en total). CA-09 es vigente y tiene su test de SVG. Los CA diferidos no requieren test hasta su reactivación.

### Impacto en api-007

- **CA-34:** Dado un boleto `cancelled`, cuando se calculan el panel o el reporte de boletos de `api-007` tras aplicar el cambio de la sección «Impacto en api-007», entonces el boleto no suma en boletos, adultos, niños, ingresos, serie ni desglose, y no aparece en el listado del reporte ni en su exportación (decisión 2026-11-02, pregunta 9).

### Avisos por correo electrónico (diferido, decisión de 2026-11-02)

> Esta sección completa está diferida. Sus CA (CA-35 a CA-41) no se implementan ni se prueban en esta iteración.

- **CA-35:** *Diferido (decisión 2026-11-02).* Dado un cambio de precio válido (inmediato o programado), cuando `admin` llama `POST /api/v1/admin/ticket-prices`, entonces se encola un correo por cada destinatario de RN-20, y la respuesta 201 no espera al envío ni a un fallo del servidor de correo. Dada una venta (`POST /api/v1/admin/tickets`), cuando se registra, entonces no se encola ningún correo de precio y la venta no depende del correo (CA-33).
- **CA-36:** *Diferido (decisión 2026-11-02).* Dado un cambio de precio guardado, cuando se encolan los correos de RN-20, entonces recibe un correo cada `admin` y cada `zoo-admin` activos, a la dirección de `users.email`, y ningún `cashier` recibe correo en ese momento. Un usuario inactivo o eliminado (`deleted_at` no nulo) no recibe correo.
- **CA-37:** *Diferido (decisión 2026-11-02).* Dado un cambio que entra en vigor y un `cashier` activo, cuando se crea su aviso `price-change` (RN-19, CA-32), entonces se encola un correo a ese cajero en la misma operación. En un cambio inmediato, el aviso y el correo se generan al guardar el cambio. En un cambio programado sin consultas de avisos después de `effective_at`, el correo del cajero se encola en la primera consulta posterior (RN-21; pregunta 14, sin cerrar).
- **CA-38:** *Diferido (decisión 2026-11-02).* Dado cualquier correo de cambio de precio, cuando se redacta, entonces está en español, indica el tipo de boleto (Adulto o Niño), el monto anterior, el monto nuevo y la fecha y hora de entrada en vigor (RN-22), y no incluye contraseñas, tokens, `qr_code`, SVG, datos personales de visitantes ni enlaces con sesión. Si no hay precio anterior, indica «Sin precio anterior».
- **CA-39:** *Diferido (decisión 2026-11-02).* Dado un envío de correo que falla (error de conexión SMTP o rechazo del destinatario), cuando ocurre, entonces el cambio de precio, la venta, el aviso del dashboard y el acuse no cambian; el fallo queda registrado en `failed_jobs` sin el contenido del correo; y el envío se reintenta el número de veces de RN-24 y no más.
- **CA-40:** *Diferido (decisión 2026-11-02).* Dado un cambio de precio, cuando se encolan sus correos y después se repite una consulta de avisos o se reintenta un envío, entonces existe como máximo un correo por par destinatario y fila de precio (`ticket_price_id`), y el reintento de un envío no crea otro correo (RN-25).
- **CA-41:** *Diferido (decisión 2026-11-02).* Dada la configuración, cuando se ejecuta la aplicación o la suite de pruebas, entonces el correo usa solo variables de `.env` (`MAIL_MAILER`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME` y `QUEUE_CONNECTION`); en local usa `MAIL_MAILER=log`; los tests usan `Mail::fake()` o `Queue::fake()` y ningún test envía correo real; `.env.example` no contiene credenciales (RN-27).

### Revisión 2026-11-02 (aprobada por Jonathan; vigentes)

- **CA-42:** Dada una venta (`POST /api/v1/admin/tickets`) con `adult_quantity` o `child_quantity` mayor que 100, cuando se envía, entonces responde 422 en español en el campo afectado con «No puedes vender más de 100 boletos de cada tipo en una misma venta.» y no crea boleto ni registro de auditoría. Una cantidad de exactamente 100 se admite (RN-29).
- **CA-43:** Dado un `cashier` que envía más de 60 solicitudes de venta por minuto (`POST /api/v1/admin/tickets`, límite por usuario autenticado, RN-30), cuando supera el límite, entonces responde 429 con «Demasiados intentos. Intenta de nuevo en :seconds segundos.» y no crea boleto. Dentro del límite, la venta se rige por CA-01 a CA-09.
- **CA-44:** Dado un `cashier` que envía más de 20 solicitudes de cancelación por minuto (`POST /api/v1/admin/tickets/{ticket}/cancel`, límite por usuario autenticado, RN-30), cuando supera el límite, entonces responde 429 con el mismo mensaje y no cambia ningún boleto. Dentro del límite, la cancelación se rige por CA-10 a CA-13 y CA-31.
- **CA-45:** Dado un cambio programado (`POST /api/v1/admin/ticket-prices` con `mode` `scheduled`) cuyo `effective_at` es posterior a un año desde el momento de la operación, cuando se envía, entonces responde 422 en español con «La fecha de entrada en vigor no puede ser mayor a un año a partir de hoy.» y no crea filas. Un `effective_at` dentro de ese año se admite según CA-19 (RN-31).

## Reglas de negocio

- **RN-01:** Solo se admite pago en efectivo (`payment_method` = `cash`). No se integra ningún proveedor de pagos en esta spec.
- **RN-02:** Precio unitario, total y validación de cantidades se calculan solo en Actions de la API. El cliente envía cantidades; nunca envía ni calcula montos a cobrar.
- **RN-03:** El precio vigente de un tipo es la fila no eliminada de ese tipo con `effective_at` menor o igual al momento de la consulta y de mayor `effective_at`. No hay job ni scheduler: la vigencia se resuelve al consultar.
- **RN-04:** Cada boleto guarda copia de los precios unitarios aplicados en su venta. Un cambio posterior de precio no modifica boletos ya vendidos.
- **RN-05:** Solo un `admin` con `ticket-prices.manage` y 2FA confirmado puede cambiar precios. `zoo-admin` no los cambia; `ticket-prices.manage` se asigna solo a `admin` (`docs/03-roles-y-permisos.md`, matriz ya aplicada).
- **RN-06:** Cada cambio de precio fija el monto de adulto y de niño en la misma operación. El cambio inmediato usa el momento de la operación; el programado usa la fecha y hora indicadas. Ambos quedan registrados como filas nuevas: los cambios previos no se modifican. Los cambios programados pueden acumularse por tipo; el vigente es el de mayor `effective_at` no posterior al momento de consulta (RN-03). No se cancelan ni editan cambios programados en esta fase (decisión 2026-11-02, pregunta 3).
- **RN-07:** El token QR es único por boleto, no predecible y generado en el servidor. Se guarda en `tickets.qr_code`. El SVG se genera por la API al emitir el boleto con la librería que fija el ADR 0019 (`bacon/bacon-qr-code`); no se almacena. El token identifica el boleto para el torniquete (fuera de alcance).
- **RN-08:** Un boleto pasa de `completed` a `cancelled` una sola vez y el cambio no se revierte. Solo puede cancelarlo el `cashier` que lo vendió, con `tickets.cancel`, el mismo día de la venta (RN-16) y con motivo no vacío. La cancelación nunca borra físicamente el boleto ni el registro del motivo.
- **RN-09:** El historial es de solo lectura. No expone tokens ni SVG.
- **RN-10:** *Diferido (decisión 2026-11-02).* Los avisos de cambio de precio se entregan por dos canales: (a) dentro del dashboard, como avisos de `staff_notifications` (CA-23 a CA-26 y CA-32), y (b) por correo electrónico, según RN-20 a RN-28 (CA-35 a CA-41). El correo complementa el aviso y nunca lo sustituye; el acuse y la lectura siguen siendo solo del dashboard (RN-11).
- **RN-11:** *Diferido (decisión 2026-11-02).* El acuse lo registra la API. Un aviso acusado no vuelve a aparecer como pendiente. El acuse no borra el aviso y no bloquea ventas (CA-33).
- **RN-12:** La autorización se aplica en el servidor con Policies o permisos Spatie `<resource>.<action>` (`permission:` middleware). Ocultar opciones en la interfaz no protege los endpoints. Nuevos permisos: `ticket-prices.manage` (solo `admin`) y `tickets.cancel` (solo `cashier`, decisión de 2026-11-01). **Estado del seeder:** `RolesAndPermissionsSeeder` ya contiene estos permisos y retira `tickets.create` y `tickets.cancel` de `admin`; el cambio se hizo antes de la aprobación de la spec y queda registrado en el plan (divergencia de orden, no de contenido). `docs/03-roles-y-permisos.md` ya refleja esta matriz desde la aprobación (verificado el 2026-11-02).
- **RN-13:** Tickets y precios son datos financieros: borrado lógico (SoftDeletes), `created_by`/`updated_by` y Activitylog (Constitución V).
- **RN-14:** Rutas nombradas bajo `/api/v1/admin`, controladores delgados (Form Requests → Actions → API Resources), identificadores y permisos en inglés, mensajes en español, sin Inertia ni Wayfinder.
- **RN-15:** El arqueo y los cierres de caja no se calculan en esta spec, aunque las ventas que registra son su insumo futuro.
- **RN-16:** Mismo día y alcance de la cancelación. *Revisión de 2026-11-02 (aprobada por Jonathan), que sustituye la zona que enviaba el cliente y la pregunta 8 cerrada:* el día de la venta y el día de la cancelación se comparan **siempre** en la zona horaria del zoológico, `config('arca.report_timezone')` (America/Mexico_City). `purchased_at` (UTC) se convierte a esa zona para la comparación. La API ignora cualquier `timezone` del cuerpo de `POST .../cancel`, y ese campo se retira del contrato de la ruta. El campo `cancellable` del historial se calcula con la misma zona. El boleto no guarda zona. El parámetro `timezone` de `GET .../tickets` solo interpreta `from`/`to` y la presentación; no afecta a la cancelación. El orden de validación de `POST .../cancel` es: 403 sin `tickets.cancel`; 429 si supera el límite de RN-30; 404 si el boleto no es del cajero; 422 por motivo vacío (CA-11); 422 si ya está cancelado (CA-12); 422 si no es del mismo día (CA-31).
- **RN-17:** Alcance del historial: el `cashier` ve solo sus boletos; `admin` y `zoo-admin` con `tickets.view` ven todos los boletos en lectura (decisión de 2026-11-01); `executive` y `veterinarian` no tienen acceso.
- **RN-18:** Los boletos `cancelled` no cuentan en los totales, ingresos, desgloses ni listados de los reportes y del panel de `api-007` (decisión de 2026-11-01). Este cambio se aplica en el mismo cambio que esta spec y se detalla en «Impacto en api-007»; esta spec no edita `api-007`.
- **RN-19:** *Diferido (decisión 2026-11-02).* Momento de los avisos de precio (decisión de 2026-11-01): `admin` y `zoo-admin` reciben el aviso al programar o cambiar el precio (CA-23). El `cashier` lo recibe cuando el precio entra en vigor (CA-32). Para un cambio inmediato, la entrada en vigor es el momento de la operación. Sin job (RN-03), el aviso del cajero se crea en la primera consulta de avisos posterior a `effective_at`; la deduplicación usa la fila de precio por destinatario (DBR-006; pregunta 10, sin cerrar).
- **RN-20:** *Diferido (decisión 2026-11-02).* Destinatarios al programar o cambiar (CA-35, CA-36): cada cambio guardado, inmediato o programado, encola un correo para cada `admin` y cada `zoo-admin` activos. Los cajeros no reciben correo en ese momento.
- **RN-21:** *Diferido (decisión 2026-11-02).* Destinatarios cuando el precio entra en vigor (CA-37): cada `cashier` activo recibe un correo al crearse su aviso `price-change` (RN-19). En un cambio inmediato es la misma operación; en uno programado, la primera consulta de avisos posterior a `effective_at`, porque no hay job (RN-03). El retraso que implica está en la pregunta 14.
- **RN-22:** *Diferido (decisión 2026-11-02).* Contenido e idioma (CA-38): el correo está en español, asunto y cuerpo incluidos. Contiene el tipo de boleto, el monto anterior, el monto nuevo y `effective_at` en la zona horaria institucional (pregunta 16). El monto anterior es el precio vigente del mismo tipo justo antes de `effective_at`. No contiene datos personales distintos del destinatario, secretos, tokens, `qr_code`, SVG ni enlaces que den acceso a la API.
- **RN-23:** *Diferido (decisión 2026-11-02).* Envío asíncrono (CA-35): todo correo se encola con la cola de Laravel configurada por `QUEUE_CONNECTION`; en esta fase, `database`. La petición de cambio de precio, la venta y la consulta de avisos no esperan al servidor SMTP. El envío usa el mailer nativo de Laravel con SMTP configurado por `.env`, sin SDK de proveedor (Constitución I; ADR 0020, Propuesto).
- **RN-24:** *Diferido (decisión 2026-11-02).* Fallos y reintentos (CA-39): un fallo de envío no revierte el cambio de precio, la venta, el aviso del dashboard ni el acuse. Propuesta sin cerrar (pregunta 12): máximo 3 intentos con espera creciente. Agotados los intentos, el job queda en `failed_jobs` y no se reintenta de forma automática. El envío no genera entrada propia en Activitylog; la trazabilidad del cambio sigue en CA-28.
- **RN-25:** *Diferido (decisión 2026-11-02).* Sin duplicados (CA-40): la clave del correo es el par (destinatario, `ticket_price_id`). Los correos a `admin` y `zoo-admin` se encolan al crear la fila de precio. El del cajero se encola al crear la fila de `staff_notifications`, cuya unicidad por (`user_id`, `ticket_price_id`) impone DBR-006. Un reintento de un job no crea un correo nuevo.
- **RN-26:** *Diferido (decisión 2026-11-02).* Destinatarios no activos: no se encola correo para cuentas inactivas o eliminadas. `users.email` es NOT NULL en la migración de personal, así que un destinatario activo siempre tiene dirección; si el servidor rechaza una dirección, es un fallo de RN-24. Propuesta sin cerrar (pregunta 13): no hay opt-out por usuario en esta fase.
- **RN-27:** *Diferido (decisión 2026-11-02).* Configuración y pruebas (CA-41): el proveedor SMTP, las credenciales, el remitente y la cola se configuran solo en el `.env` de cada ambiente (`MAIL_*`, `QUEUE_CONNECTION`). El repositorio no contiene credenciales ni valores reales; `.env.example` solo lleva claves. En local, `MAIL_MAILER=log`. En pruebas, `MAIL_MAILER=array` con `Mail::fake()` o `Queue::fake()`, sin envío real. El proveedor SMTP y el remitente quedan por decidir (pregunta 11 y ADR 0020).
- **RN-28:** *Diferido (decisión 2026-11-02).* Sin cambio de esquema (DBR-006): no se crea tabla ni columna para el correo. Se usan `users.email`, `jobs` y `failed_jobs`. No se usa el canal `database` de Laravel Notifications, porque crearía una tabla `notifications` que DBR-006 no solicita; el aviso en base de datos sigue siendo `staff_notifications`. Confirmación pendiente del responsable de BD (nota en DBR-006).

- **RN-29:** *Revisión de 2026-11-02 (CA-42; CA-03 aclarado).* Tope por venta: cada venta admite como máximo 100 boletos por tipo (`adult_quantity` ≤ 100 y `child_quantity` ≤ 100). Más de 100 responde 422 en español. Las cantidades no enteras (fracciones, booleanos y cadenas no numéricas) responden 422 (CA-03). La validación es de la API; el cliente no fija el tope en su lógica y solo muestra el mensaje que recibe (`dashboard-005` RN-02).
- **RN-30:** *Revisión de 2026-11-02 (CA-43, CA-44).* Límites de frecuencia por usuario autenticado, decisión de la revisión: `POST /api/v1/admin/tickets` admite 60 solicitudes por minuto y `POST /api/v1/admin/tickets/{ticket}/cancel` admite 20 por minuto. Exceder el límite responde 429 con el mensaje de CA-43. El límite se evalúa después de la autenticación y de `permission:`, así que un 403 no consume cuota. No se aplica por IP. Los valores solo cambian por una nueva revisión de esta spec.
- **RN-31:** *Revisión de 2026-11-02 (CA-45).* Límite de fecha de cambios programados: en `mode` `scheduled`, `effective_at` no puede ser posterior a un año desde el momento de la operación (422). Complementa CA-20 (no anterior al momento de la operación). No aplica a `immediate`.

## Datos, privacidad y auditoría

- Datos financieros: `tickets` (venta, cancelación, precios por línea) y `ticket_prices` (vigencia de precios). Ningún dato se borra físicamente. Ver DBR-006 para columnas, índices y borrado lógico.
- *Sin uso en esta iteración (decisión 2026-11-02).* `staff_notifications` no contiene datos personales de visitantes. Se propone una fila por destinatario y por fila de precio (`ticket_price_id`; pregunta 10, sin cerrar). La tabla no usa SoftDeletes según DBR-006 (resolución 6); ver la excepción a Constitución V en el plan.
- Auditoría: Activitylog (CA-28) para venta, cancelación y cambio de precio; el acuse queda diferido con los avisos. El actor de una cancelación es el cajero que la solicita.
- No se almacenan el SVG del QR ni secretos. El token `qr_code` no se devuelve en listados (CA-16). `cancellable` se calcula en cada consulta y no se guarda.
- La configuración de impresión del boleto no pasa por la API ni por la base de datos (`dashboard-005` RN-12).
- Requiere DBR: sí. Ver `docs/database/requests/DBR-006-ticket-sales.md`. La DBR acompaña a esta spec; no la sustituye.
- *Diferido (decisión 2026-11-02).* Correo de avisos de precio: usa `users.email` del personal (dato personal del personal) y solo datos de precios (RN-22). Los jobs fallidos (`failed_jobs`) guardan el payload serializado, que incluye el correo del destinatario; su retención se define en la pregunta 12 (sin cerrar).

## Flujos y errores

1. **Venta:** el cajero envía cantidades → la API valida (CA-03), resuelve precio vigente (CA-04), calcula total, crea boleto, emite QR y responde con el boleto (CA-01, CA-07). Los avisos pendientes no bloquean la venta (CA-33, diferido: en esta iteración no hay avisos que consultar).
2. **Cancelación:** el cajero envía solo el motivo (revisión de 2026-11-02: sin `timezone`) → la API valida permiso (CA-13), límite de frecuencia (CA-44), alcance (CA-13), motivo (CA-11), estado (CA-12) y día en la zona del zoológico (CA-31) en el orden de RN-16 → cambia estado una vez (CA-10) y audita (CA-28).
3. **Cambio de precio:** el admin envía montos y modo → la API valida 2FA y permiso (CA-22), valida montos y fecha (CA-20, CA-21), guarda las filas de precio en una transacción. Los avisos y el correo quedan diferidos (CA-23, CA-35 y CA-36; decisión 2026-11-02): no se crean avisos ni se encolan correos.
4. **Entrada en vigor y acuse (diferido, decisión 2026-11-02):** el dashboard del cajero consulta avisos al entrar y cada 60 s → la API crea los avisos de cambios vencidos (CA-32), encola el correo de cada cajero por aviso creado (CA-37) y devuelve los pendientes (CA-24) → el cajero acusa (CA-26). Mientras no acuse, la venta sigue disponible (CA-33).
5. **Errores:** 401 sin sesión; 403 sin permiso, sin 2FA (`two_factor_setup_required`) o acción de otro rol; 404 boleto o aviso inexistente o fuera de alcance; 422 validación o regla de negocio, con mensaje en español.
6. **Sin conexión:** esta spec no define venta offline. Si la API no responde, no hay venta registrada y el cliente no la presenta como hecha.
7. **Correo (diferido, decisión 2026-11-02):** la cola envía cada correo fuera de la petición → si el SMTP falla, reintenta de forma acotada (RN-24) → el cambio, el aviso del dashboard y el acuse no cambian (CA-39).

## Impacto en api-007

Cambio a aplicar en el mismo cambio que esta spec (decisión de 2026-11-01, RN-18; aprobado con la spec el 2026-11-02). Esta spec no edita los CA ni el texto de `api-007`. La reapertura de 007 (estado y nota de historial) ya está registrada en su spec; su plan incorpora el cambio en la sección de exclusión de cancelados de `apps/api/plan/009-ticket-sales.md`.

| Criterio o regla de `api-007` | Cambio |
|---|---|
| CA-19 (panel: totales del día, de 7 días e ingresos; serie diaria) | Excluir boletos `cancelled` de todos los cálculos. |
| CA-20 (reporte semanal, mensual o personalizado: totales, desglose por día y listado) | Excluir boletos `cancelled` de totales, desglose y listado. |
| CA-22 y CA-23 (exportación CSV, Excel y PDF) | Mismos boletos y totales que el reporte en pantalla (`api-007` RN-13 se mantiene). |
| RN-08 (cálculos en Actions) | La Action de cálculo filtra `status` = `completed`; el filtro vive en la Action, no en el cliente. |
| CA-21, RN-14 (zona horaria y rangos) | Sin cambio. |

Notas:
- `api-007` se reabrió el 2026-11-01 por decisión de Jonathan (estado En progreso; nota de historial en su spec, sin cambios de CA en ese paso). Sus CA se ajustan con esta feature (decisión 2026-11-02, pregunta 9).
- Los tests de `api-007` deben cubrir CA-34 de esta spec (boleto cancelado excluido).
- `dashboard-003` no cambia su código, pero sus cifras cambian al desplegar; el despliegue debe hacerse junto para no mostrar totales inconsistentes.

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:**
  - `api-003` (sesión, `staff.user`, 2FA por rol), `api-007` (CA-25 de 2FA en `/admin`; reporte de boletos, con el impacto de la sección anterior).
  - DBR-006 (`ticket_prices`, columnas de `tickets`, `staff_notifications`, creada pero sin uso en esta iteración); depende de DBR-001 y DBR-002; DBR-005 ya aplicada en pruebas. DBR-006 está aprobada por BD y backend y aplicada en `arca_pruebas` (ver riesgos sobre su evidencia).
  - **Generación del QR en SVG (CA-09):** ADR 0019 (`docs/adr/0019-qr-svg-generation-api.md`, **Aceptado**, 2026-11-02) fija `bacon/bacon-qr-code` ^3.1 (v3.1.1). La instalación con `composer require`, `composer audit` y la verificación de `ext-iconv` es tarea de backend dentro de esta feature.
  - Correo de avisos de precio (RN-10, RN-20 a RN-28; diferido): ADR 0020 (`docs/adr/0020-price-change-email-notifications.md`, Propuesto). Sin ADR aprobado, CA-35 a CA-41 no se implementan. No añade paquete Composer: usa el mailer y la cola nativos de Laravel, configurados por `.env`. Usa las tablas `jobs` y `failed_jobs` de la migración base `0001_01_01_000002_create_jobs_table.php`; el responsable de BD debe confirmar que pertenecen a la línea base (ver nota en DBR-006). Impacto en `dashboard-005`: solo el texto informativo de CA-30 de esa spec (diferido).
  - Actualización de `docs/03-roles-y-permisos.md` con `ticket-prices.manage` (solo `admin`), `tickets.cancel` (solo `cashier`) y `tickets.create` solo para `cashier`. Aplicada: `docs/03-roles-y-permisos.md` ya refleja la matriz (verificado el 2026-11-02).
- **Riesgos:**
  - Cambios de esquema: el orden de despliegue de DBR-006 es obligatorio; sin la migración no hay código de venta.
  - Reporte de `api-007`: la exclusión de cancelados cambia las cifras visibles al desplegar (sección «Impacto en api-007»).
  - (Diferido) Avisos de cajero sin job: se crean al consultar, no al cumplirse la hora. Si ningún cajero consulta, el aviso se crea más tarde, pero no se pierde. La cadencia de 60 s del dashboard acota el retraso.
  - (Diferido) La consulta de avisos escribe filas (materialización de CA-32): requiere idempotencia y control de concurrencia; el plan lo define.
  - La zona del día de cancelación depende del dispositivo que cancela (RN-16). *(Resuelto por la revisión de 2026-11-02: zona fija del zoológico.)*
  - Límites de frecuencia (RN-30): 60 y 20 por minuto por usuario comparten cuota si varias personas usan una misma cuenta de taquilla. Valores propuestos en la revisión; ajustables solo con nueva revisión.
  - Precios programados sin job: la vigencia depende de la hora del servidor y de la zona UTC.
  - (Diferido) Correo sin worker: si la cola no se procesa en un ambiente, no sale ningún correo; el dashboard y los cambios de precio siguen funcionando.
  - (Diferido) Correo del cajero en cambios programados: se encola en la primera consulta posterior a `effective_at` (pregunta 14).
  - (Diferido) Entrega no garantizada: el SMTP acepta el mensaje, pero no confirma lectura; la entregabilidad depende del proveedor y del dominio remitente.
- **Preguntas resueltas (2026-11-01 y 2026-11-02):** la antigua pregunta 1 (venta y alcance del historial de `admin`) queda cerrada por decisión de Jonathan: solo `cashier` vende; `admin` y `zoo-admin` consultan el historial en lectura (RN-17). Las preguntas 2 a 9 quedan cerradas por la aprobación del 2026-11-02 (ver «Decisiones cerradas»).
- **Preguntas diferidas, sin cerrar (avisos y correo; no bloquean lo vigente):**
  10. *(Diferida.)* **Avisos del cajero:** propuesta — el aviso se deduplica por `ticket_price_id` y destinatario (DBR-006); los destinatarios de cada materialización son los cajeros activos en ese momento.
  11. *(Diferida.)* **Proveedor SMTP y remitente:** propuesta — el proveedor SMTP queda por decidir en ADR 0020, con aprobación separada; las credenciales solo van en el `.env` de cada ambiente. El remitente será la dirección y el nombre institucionales de `MAIL_FROM_ADDRESS` y `MAIL_FROM_NAME`, cuyo valor real aún no existe (`hello@example.com` de `.env.example` es solo marcador).
  12. *(Diferida.)* **Reintentos y retención de fallos:** propuesta — máximo 3 intentos con espera creciente y sin reintento automático después. `failed_jobs` conserva el payload del job, que incluye el correo del destinatario; el plazo de retención lo decide negocio con BD.
  13. *(Diferida.)* **Destinatario u opt-out:** propuesta — no hay opt-out por usuario; todo `admin`, `zoo-admin` y `cashier` activo con cuenta recibe el correo que le corresponde (RN-20, RN-21). Una dirección rechazada por el servidor es un fallo de RN-24.
  14. *(Diferida.)* **Correo del cajero en cambios programados:** propuesta — el correo se encola en la primera consulta de avisos posterior a `effective_at` (sin job, RN-03); si nadie abre el dashboard, llega más tarde. Si se exige la hora exacta, hace falta un programador (job o cron) que cambia RN-03 y requiere decisión de infraestructura y ADR.
  15. *(Diferida.)* **Correo verificado:** propuesta — se usa `users.email` tal como está en la cuenta. La propuesta de BD (DBR-006) afirma que `users` tiene correo verificado, pero las migraciones de `apps/api` no tienen `users.email_verified_at` y la verificación del personal no está en la spec 003. Si el negocio exige correo verificado, hace falta una spec de verificación y una DBR para la columna.
  16. *(Diferida.)* **Zona horaria y formato en el correo:** propuesta — `America/Mexico_City` y formato `dd/mm/aaaa HH:mm`, igual que en `dashboard-005` CA-13.
  17. *(Diferida.)* **Operación de la cola:** propuesta — un proceso de cola (`queue:work`) corre supervisado en cada ambiente; sin él no sale ningún correo. Quién lo opera y con qué herramienta: por identificar (`infra/` planeada).
