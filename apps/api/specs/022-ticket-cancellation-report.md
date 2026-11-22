# 022 · ticket-cancellation-report

- App dueña: `api`
- Apps/paquetes afectados: `api`, `dashboard` (consumidor: `dashboard-016`, página del reporte y selector de motivo en el diálogo de cancelar de `dashboard-005`), `packages/api-client`; documentos `docs/03-roles-y-permisos.md` (nuevo permiso `reports.cancellations.view`, solo `admin`; se actualiza con esta aprobación), `docs/database/requests/DBR-024-ticket-cancellation-reason-code.md` (columna del código de motivo).
- Estado: Aprobada
- Aprobación funcional: Jonathan, 2026-11-20
- Solicitante / responsable funcional: Jonathan
- Responsable de BD: Víctor Adrián (según DBR-006), a quien se solicita la DBR-024 (ver «Datos, privacidad y auditoría»). Responsable backend: por confirmar.
- Dependencias de esta spec: `api-009` (cancelación; esta spec **modifica su contrato de cancelación**, ver «Revisión de api-009» en `apps/api/specs/009-ticket-sales.md`), `api-021` (confirmación de contraseña antes de cancelar; esta spec solo la cita), `api-025` (zona horaria única de negocio, decisión de 2026-11-20), `api-007` (reporte de boletos: la conciliación debe coincidir con su neto), `dashboard-005` y `dashboard-016`.
- Última edición: 2026-11-21 (notas de la revisión de calidad y seguridad; antes, 2026-11-20: preguntas abiertas cerradas por Jonathan, ver «Decisiones 2026-11-20»).

## Problema y contexto

Hoy un cajero puede cancelar un boleto del mismo día (`api-009` CA-10, RN-16) escribiendo un motivo libre. Ese motivo no se puede agrupar ni comparar: no hay forma de saber cuántas cancelaciones son por error de captura, cuántas por cobro duplicado o cuántas por desistimiento del visitante, ni qué cajero cancela más. Presidencia no tiene una vista de las cancelaciones ni de cuánto dinero se devuelve en físico por cancelaciones.

Esta spec agrega, en la API:

- Un **catálogo cerrado de motivos** de cancelación, obligatorio al cancelar.
- Un **reporte de boletos cancelados** por periodo, solo para `admin`, con filas, totales, **conciliación** bruto = neto + cancelado por día y por cajero, y señales de alerta visuales.
- **Exportación** en CSV, Excel y PDF con metadatos de quién, cuándo y con qué filtros, y auditoría.

La cancelación sigue siendo la misma en todo lo demás: la hace solo el cajero que vendió, el mismo día, sin deshacerse ni editarse y sin borrado físico.

## Objetivos

- Obligar a elegir un motivo de una lista cerrada en cada cancelación, sin perder el comentario libre cuando el motivo es «Otro».
- Dar a `admin` un reporte de cancelaciones por periodo con filtros por cajero y motivo.
- Mostrar, por día y por cajero, el vendido bruto, el cancelado y el neto a entregar, con una comprobación de que cuadran.
- Señalar, sin bloquear, las cancelaciones que se salen de lo normal (tiempo entre venta y cancelación, porcentaje de cancelación por cajero).
- Exportar el reporte con los mismos datos que la pantalla, dejando rastro de quién lo generó y con qué filtros.

## Fuera de alcance

- Reclasificar cancelaciones anteriores a esta feature. Las filas sin código se muestran como «Sin clasificar (anterior)» y no se modifican ni se migran (Constitución V).
- Deshacer, editar o reactivar una cancelación. No hay ruta para ello.
- Devolución física de efectivo o cualquier movimiento de caja. La entrega física del dinero y del boleto cancelado es un procedimiento operativo fuera del sistema (ver RN-13).
- Reimpresión del boleto con marca «CANCELADO» (decisión 2026-11-20: fuera de alcance; si se pide más adelante, es una spec de `dashboard` aparte).
- Reporte de cancelaciones para `zoo-admin`, `executive`, `cashier` o `veterinarian`. El cajero sigue viendo solo su historial (`api-009` CA-15).
- Arqueo y cierre de caja (`cash-closings.*`), que pedirá la conciliación cuando se especifique.
- Cambios en `apps/web`, `apps/pwa` y `apps/mobile`.
- Notificaciones o avisos por cancelación (no se crean avisos).

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| `admin` (Presidencia) | Ver el reporte de cancelaciones, filtrarlo, conciliarlo y exportarlo | Sesión válida + 2FA confirmado; `reports.cancellations.view` (nuevo, solo este rol) |
| `cashier` | Elegir el motivo al cancelar sus boletos del mismo día; leer el catálogo de motivos | `tickets.cancel` (`api-009`); `tickets.cancel` para leer el catálogo |
| `zoo-admin`, `executive`, `veterinarian` | Sin acceso al reporte de cancelaciones (aunque `zoo-admin` y `executive` tienen `reports.view` para el reporte de boletos) | — |
| Responsable de BD | Crear, probar y aplicar la columna de DBR-024 | Flujo DBR de `docs/database/` |

Notas de matriz:
- `reports.cancellations.view` es un permiso nuevo. **No se reutiliza** `reports.view`, que tienen `zoo-admin` y `executive`.
- Como el resto de `/api/v1/admin/*`, el reporte exige sesión y 2FA confirmado para `admin` (`api-007` CA-25).

## Historias de usuario

- Como `cashier`, quiero elegir el motivo de la cancelación de un boleto de una lista fija, para que el registro sea comparable.
- Como `admin`, quiero ver los boletos cancelados de un periodo con su motivo, quién los vendió y quién los canceló, para revisar errores de la taquilla.
- Como `admin`, quiero ver por día y por cajero cuánto se vendió, cuánto se canceló y cuánto queda neto, para cuadrar el dinero que debe entregar la taquilla.
- Como `admin`, quiero que el sistema me marque, sin bloquear nada, a los cajeros cuyas cancelaciones se salen de lo normal.
- Como `admin`, quiero exportar el reporte y que el archivo diga quién lo generó, cuándo y con qué filtros.

## Criterios de aceptación

### Acceso

- **CA-01:** Dado un `admin` con `reports.cancellations.view` y 2FA confirmado, cuando llama `GET /api/v1/admin/reports/cancellations` con un periodo válido (CA-04), entonces responde 200 con el periodo, las filas, los totales, la conciliación y las señales de alerta de RN-08 y CA-18. *Nota de revisión 2026-11-21: las señales de alerta de CA-18 las sustituye el semáforo de `api-027` (CA-32 y `api-027` CA-11).*
- **CA-02:** Dado un usuario sin `reports.cancellations.view` (`zoo-admin`, `executive`, `cashier` o `veterinarian`), cuando llama `GET /api/v1/admin/reports/cancellations` o `GET /api/v1/admin/reports/cancellations/export`, entonces responde 403 con el mensaje de permiso y no devuelve ningún dato. Sin sesión responde 401. Un `admin` sin 2FA confirmado responde 403 `two_factor_setup_required`.
- **CA-03:** Dado un `zoo-admin` con `reports.view` (que sí ve el reporte de boletos de `api-007`), cuando consulta el reporte de cancelaciones, entonces responde 403. Un test verifica que `reports.view` no basta.

### Periodo y filtros

- **CA-04:** Dado el reporte de cancelaciones, cuando se pide con `period=week` o `period=month` sin fecha de referencia, entonces usa la fecha de hoy en la zona de `api-025`, igual que `api-007` CA-20. Cuando se pide con `period=custom` cuyo rango excede 366 días, cuya fecha final es anterior a la inicial o al que le falta un extremo, entonces responde 422 en español. Las reglas de periodo son las de `api-007` CA-20 y CA-21 (lunes a domingo; mes calendario) y la zona horaria es la de `api-025`. *Enmienda técnica 2026-11-20: se sustituye el 422 por el uso de la fecha de hoy cuando falta `date` en `week` o `month` (pregunta 1 del plan).*
- **CA-05:** Dado un filtro `cashier_id` o `reason_code` válido, cuando se aplica, entonces filas, totales, conciliación y alertas se calculan solo con los boletos que cumplen el filtro. Un `reason_code` fuera del catálogo (RN-02) responde 422 en español. Un `cashier_id` que no corresponde a un cajero responde 422. Los filtros por cajero y por motivo se suman al periodo (decisión 2026-11-20). *Nota de revisión 2026-11-21: las señales y el semáforo no se filtran por motivo (`api-027` RN-06): `reason_code` solo filtra filas y totales; `cashier_id` recorta además `cashier_days` sin cambiar el nivel (CA-34).*

### Contenido de las filas

- **CA-06:** Dada una cancelación del periodo, cuando se lista, entonces cada fila contiene: folio (`tickets.id`), cantidad de adultos y de niños, importe (`total_amount`), fecha y hora de venta, fecha y hora de cancelación, nombre del cajero que vendió, nombre de quien canceló, etiqueta del motivo, comentario (si lo hay, RN-03) y minutos entre venta y cancelación. Solo aparecen boletos `cancelled`.
- **CA-07:** Dada una fila, cuando se calcula el tiempo entre venta y cancelación, entonces son minutos enteros redondeados hacia abajo: 0 min 59 s → 0; 2 min 5 s → 2. Un test verifica ambos casos.
- **CA-08:** Dada una fila anterior a esta feature (`cancellation_reason_code` nulo, RN-03), cuando se lista o exporta, entonces el motivo aparece como «Sin clasificar (anterior)», el comentario muestra el texto que ya tenía `cancellation_reason` y la fila conserva sus cantidades e importe. Un test verifica una fila sin código.
- **CA-09:** Dado un cajero que vendió o canceló un boleto y después fue eliminado lógicamente (`users.deleted_at`), cuando aparece en el reporte, entonces su nombre sigue visible en la fila (RN-12).

### Motivos

- **CA-10:** Dado un `cashier` con `tickets.cancel` o un `admin` con `reports.cancellations.view` (filtro «Motivo» del reporte), cuando llama `GET /api/v1/admin/tickets/cancellation-reasons`, entonces recibe exactamente los cinco códigos de RN-02 en ese orden, con su etiqueta en español. Sin ninguno de los dos permisos responde 403.
- **CA-11:** Dada una cancelación (`POST /api/v1/admin/tickets/{ticket}/cancel`) sin `reason_code`, o con un código fuera del catálogo, cuando se envía, entonces responde 422 con «Selecciona un motivo de cancelación.» (o «El motivo elegido no es válido.») y no cambia el boleto. Las demás reglas de cancelación (`api-009` CA-10 a CA-13, CA-31) siguen vigentes.
- **CA-12:** Dada una cancelación con `reason_code` `other`, cuando el comentario tiene menos de 15 caracteres tras recortar los espacios, o más de 255, entonces responde 422 con «Describe el motivo con al menos 15 caracteres.» (o el mensaje de longitud máxima), asociado al campo `reason`, y no cambia el boleto (RN-04).
- **CA-13:** Dada una cancelación válida con cualquier código, cuando se guarda, entonces `cancellation_reason_code` guarda el código y `cancellation_reason` guarda el comentario (obligatorio en `other`, opcional y posiblemente nulo en los demás). La etiqueta del motivo la deriva la API del código; no se guarda (RN-03). El registro queda sin cambios de borrado.
- **CA-24 (decisión 2026-11-20):** Dada una cancelación con un código distinto de `other`, cuando se envía con comentario opcional, entonces la API acepta el comentario si tiene como máximo 255 caracteres (422 si lo supera) lo guarda en `cancellation_reason` y lo registra en `ticket-cancelled` (CA-23). Sin comentario, la cancelación es válida y `cancellation_reason` queda nulo. El comentario sale en el reporte y en CSV, Excel y PDF (CA-19, decisión 2026-11-20 pregunta 8). Un test verifica un motivo distinto de `other` con y sin comentario.

### Totales

- **CA-14:** Dado un periodo con cancelaciones, cuando se calculan los totales, entonces incluyen: número de boletos cancelados (suma de cantidades, `api-007` CA-29 y RN-15 de `api-007`), importe cancelado (suma de `total_amount`), y los mismos totales desglosados por cajero y por motivo. La suma de los desgloses por cajero y por motivo es igual al total general.

### Conciliación

- **CA-15:** Dado un día con boletos vendidos y cancelados, cuando se calcula la conciliación, entonces por día muestra: vendido bruto, cancelado y neto, con la igualdad **bruto = neto + cancelado** (RN-06). La API devuelve `balanced: true` en cada fila de día y de cajero que cumple la igualdad. Un test con ventas completadas y canceladas verifica la igualdad en cada fila.
- **CA-16:** Dado un cajero con ventas en el periodo, cuando se calcula su conciliación, entonces muestra la misma igualdad por cajero (bruto, cancelado y neto del cajero en el periodo) y la lista de días en que tuvo actividad.
- **CA-17:** Dado el neto de un día y el mismo periodo y zona horaria de `api-025` en `GET /api/v1/admin/reports/tickets` (`api-007` CA-20), cuando se comparan, entonces el neto diario de la conciliación es igual al ingreso diario de ese reporte. Un test verifica la coincidencia en un caso con cancelaciones.

### Señales de alerta

- **CA-18 (SUSTITUIDO por la revisión 2026-11-21 c; ver CA-32):** Dado un boleto cancelado con más de 30 minutos entre venta y cancelación, o un cajero cuyo porcentaje de cancelación en el periodo supera el 10 % con al menos 20 boletos vendidos en ese periodo (decisión 2026-11-20), cuando se responde, entonces la respuesta marca la alerta (`alert: true`) con su motivo, sin cambiar ningún dato ni responder error. Un test verifica una alerta de cada tipo y que no se bloquea la cancelación.
- **CA-25 (decisión 2026-11-20; vigente solo para `cancel_after_minutes` desde la revisión 2026-11-21 c):** Dados los umbrales de CA-18 en la configuración de la API, cuando se cambian en configuración, entonces las alertas se calculan con el valor nuevo sin cambiar código. Un test verifica que la alerta sigue el valor configurado.
- **CA-26 (enmienda técnica 2026-11-20):** Dado un boleto cancelado con motivo, cuando se consulta el historial de boletos (`api-009`) o la búsqueda global (`api-019`), entonces la fila muestra la etiqueta del motivo (`cancellation_reason_label`, o «Sin clasificar (anterior)» si el código es nulo) junto con el comentario guardado. Un test verifica las dos vistas.

### Exportación

- **CA-19:** Dado el reporte, cuando se exporta en CSV, Excel o PDF, entonces el archivo tiene las mismas filas, totales y conciliación que la pantalla (RN-13 de `api-007`) y, en todos los formatos, un bloque de metadatos con: quién lo generó (nombre y rol), cuándo (fecha y hora en UTC y en la zona de negocio de `api-025`), periodo, zona horaria, filtros aplicados y la columna de comentario (RN-03; decisión 2026-11-20: el comentario sale en los tres formatos). El diseño exacto del bloque en CSV es parte del plan.
- **CA-20:** Dado un formato fuera de la lista de `report_export_formats` (ADR 0017), cuando se pide, entonces responde 422 «Formato de exportación no disponible.». Dado un PDF con más de 2000 filas (`report_pdf_max_tickets`, RN-10), responde 422 en español que indica el tope.
- **CA-21:** Dada una exportación, cuando se genera, entonces Activitylog registra `report-cancellations-exported` con actor, formato, periodo y filtros. Si el registro falla, no se entrega el archivo (la respuesta es un error y no un archivo con 200). Un test verifica el registro y el caso de fallo.

### Inmutabilidad y auditoría

- **CA-22:** Dado un boleto cancelado, cuando se consulta el reporte o se exporta, entonces ninguna operación del reporte cambia su estado, su motivo, sus importes ni sus fechas, y no se borra ninguna fila. Un test verifica que un snapshot de columnas (`status`, importes, fechas, `cancellation_reason_code`, `cancellation_reason`, `cancelled_by`, `updated_by`, `deleted_at`) no cambia tras consultar y exportar. *Enmienda técnica 2026-11-20: se usa el snapshot porque `tickets` no tiene `updated_at` (`$timestamps = false`).*
- **CA-23:** Dada una cancelación válida, cuando se registra, entonces Activitylog (`ticket-cancelled`) registra actor, folio, importe, `reason_code` y comentario, sin contraseña ni secretos (`api-009` CA-28). Un boleto ya cancelado no puede cancelarse otra vez (`api-009` CA-12) y no hay ruta que deshaga la cancelación.

## Reglas de negocio

- **RN-01:** El reporte de cancelaciones y su exportación requieren `reports.cancellations.view`, asignado solo al rol `admin`. No se reutiliza `reports.view`. Ocultar la página no protege los endpoints (RN-07 de `api-007`).
- **RN-02:** Catálogo cerrado de motivos, en la API:

  | Código (`reason_code`) | Etiqueta | Comentario |
  |---|---|---|
  | `capture_error` | Error de captura | Opcional (máximo 255; CA-24) |
  | `duplicate_charge` | Cobro duplicado | Opcional (máximo 255; CA-24) |
  | `wrong_ticket_type` | Tipo de boleto equivocado | Opcional (máximo 255; CA-24) |
  | `visitor_withdrew` | El visitante desistió | Opcional (máximo 255; CA-24) |
  | `other` | Otro | Obligatorio (RN-04) |

  Los códigos son identificadores en inglés (Constitución VI); las etiquetas son de UI y van en español. Agregar, quitar o renombrar un motivo exige una revisión de esta spec.
- **RN-03:** `cancellation_reason_code` (DBR-024) guarda el código del catálogo. `cancellation_reason` (existente, `varchar(255)`) guarda solo el comentario: obligatorio en `other`, opcional en los demás (nulo si no hay). La etiqueta se deriva del código en la API. El comentario también se registra en Activitylog (`ticket-cancelled`). Corrección de coordinación 2026-11-20: alinea esta RN con DBR-024 y con la decisión de exportar el comentario. Las filas anteriores a esta feature tienen el código nulo y se presentan como «Sin clasificar (anterior)» (CA-08); no se les asigna código ni se migran.
- **RN-04:** Para `other`, el comentario se recorta de espacios y debe tener al menos 15 caracteres y como máximo 255 (decisión 2026-11-20).
- **RN-05:** Una cancelación es definitiva: no se edita, no se reactiva y no se elimina físicamente (Constitución V). El reporte solo lee.
- **RN-06:** Conciliación por **día de venta** (decisión 2026-11-20) en la zona de `api-025`. Por día y por cajero: *vendido bruto* = suma de `total_amount` de todos los boletos vendidos ese día (`completed` y `cancelled`); *cancelado* = suma de `total_amount` de los boletos `cancelled` vendidos ese día; *neto* = bruto − cancelado = suma de los `completed` de ese día. Como `api-009` RN-16 solo permite cancelar el mismo día de la venta, el día de venta coincide con el día de cancelación. La igualdad bruto = neto + cancelado debe cumplirse siempre; si no, la respuesta marca `balanced: false` y se trata como error de datos.
- **RN-07:** Cálculo de totales, desgloses, conciliación y alertas solo en Actions de la API (Constitución III). La interfaz no calcula nada.
- **RN-08 (alerta por cajero sustituida por el semáforo desde la revisión 2026-11-21 c; queda el umbral de 30 min):** Umbrales de alerta en la configuración de la API (`config/arca.php`, no fijos en código). Valores (decisión 2026-11-20): cancelación con más de 30 minutos entre venta y cancelación; cajero con más del 10 % de cancelaciones en el periodo y al menos 20 boletos vendidos en el periodo. Son solo visuales (CA-18); ninguna alerta bloquea una cancelación ni un reporte. *Enmienda técnica 2026-11-20 (definiciones): «más de 30 minutos» es más de 1800 segundos; el porcentaje de un cajero es cantidades canceladas / cantidades brutas (adultos + niños) del periodo; el mínimo de 20 «boletos vendidos» se cuenta en cantidades brutas del periodo.*
- **RN-09:** Zona horaria del periodo, de los días y de la conciliación: la define `api-025` (zona única de negocio `America/Mexico_City`, configurable por `ARCA_TIMEZONE`). La API ignora la zona que envíe el cliente (decisión 2026-11-20). Esto sustituye la regla de zona del dispositivo de `api-007` RN-14 para este reporte, y así el neto coincide con el reporte de boletos (CA-17).
- **RN-10:** El tope de PDF (`report_pdf_max_tickets`, 2000) cuenta las filas del documento, como en `api-007` RN-12 y RN-15.
- **RN-11:** Cada exportación se audita (CA-21). El PDF y los demás formatos imprimen los metadatos de CA-19.
- **RN-12:** Los nombres de cajeros y de quien canceló se muestran aunque la cuenta esté eliminada lógicamente, porque son el registro histórico de la operación.
- **RN-13 (SUSTITUIDA: el cajero entrega solo dinero):** Recomendación de proceso (fuera del sistema, no es código ni regla de la API): el boleto físico cancelado se entrega junto con el dinero al cierre de la taquilla. Así, el boleto físico y el registro del sistema cuadran al revisar la conciliación.
- **RN-14:** Los límites de frecuencia de `api-009` (RN-30) siguen vigentes; esta spec no añade límites nuevos a las consultas de reporte. El tope de la exportación es el de RN-10. *Enmienda técnica 2026-11-20: la exportación mantiene `throttle:20,1`, el mismo límite de `api-007` (20 peticiones por minuto y usuario). Las filas del reporte se devuelven completas, sin paginación; el tope de PDF es el de RN-10.*
- **RN-15 (enmienda técnica 2026-11-20):** El periodo y los filtros del reporte se aplican por `purchased_at` (día de venta, RN-06), en la zona de `api-025`. Como `api-009` RN-16 solo permite cancelar el mismo día, coincide con el día de cancelación.
- **RN-16 (enmienda técnica 2026-11-20):** El filtro `cashier_id` admite cajeros eliminados lógicamente (RN-12): aparecen en el filtro y sus boletos se incluyen en el reporte.
- **RN-17 (enmienda técnica 2026-11-20):** El historial de boletos (`api-009`) y la búsqueda global (`api-019`) muestran la etiqueta del motivo (`cancellation_reason_label`) y el comentario (`cancellation_reason`). La etiqueta se deriva del código en la API y no se guarda (RN-03).

## Datos, privacidad y auditoría

- **Clasificación:** dato financiero de solo lectura (importes, folios, fechas de venta y cancelación) y nombres de personal (cajeros y quien canceló). El comentario libre puede contener datos del visitante; se muestra y exporta solo a `admin` (decisión 2026-11-20).
- **Esquema:** esta feature necesita **una columna nueva** en `tickets`, `cancellation_reason_code` (varchar corto, nulable), y su DBR: **`docs/database/requests/DBR-024-ticket-cancellation-reason-code.md`** (Borrador, pendiente de aprobación de BD y backend). Sin DBR aprobada no hay migración ni código que la use. La DBR no sustituye esta spec.
- **Consulta del esquema vivo (`arca_pruebas`, solo lectura, 2026-11-20, por la sesión principal):** la columna `cancellation_reason_code` **no existe**. `cancellation_reason varchar(255)` existe y se conserva para el comentario. `tickets` ya tiene `status`, `cancelled_at`, `cancelled_by`, `deleted_at`, `cashier_id` y los índices `idx_tickets_cashier_purchased (cashier_id, purchased_at)` e `idx_tickets_purchased_at`. El número de filas canceladas en la base de prueba no fue consultado; queda pendiente.
- **Índice:** la consulta por periodo ya usa `idx_tickets_purchased_at`. Agrupar por motivo se hace sobre las cancelaciones de un periodo, que son un subconjunto pequeño. Propuesta de la DBR: no añadir índice por código ahora; se revisa con datos reales (DBR-024, «Índice»).
- **Retención:** `tickets` nunca se borra físicamente (Constitución V; `BaseModel`/SoftDeletes según ADR 0021). No hay purga.
- **Auditoría:** `ticket-cancelled` (CA-23) y `report-cancellations-exported` (CA-21), ambos en Activitylog desde las Actions.
- **Permisos:** `reports.cancellations.view` es un permiso nuevo; debe sembrarse con `RolesAndPermissionsSeeder` y aparecer en `docs/03-roles-y-permisos.md` (actualizado con esta aprobación; entra en vigor al implementarse).

## Flujos y errores

1. **Cancelar (cajero):** el cajero elige el boleto (`api-009`) → pulsa cancelar → la API devuelve el catálogo (CA-10) → el cajero elige el motivo (y comentario si es `other`, o si quiere uno en los demás motivos) → confirma su contraseña (`api-021`) → la API valida permiso, límite de frecuencia, dueño, mismo día y motivo (CA-11, CA-12) → cambia el estado una vez y audita (CA-13, CA-23, CA-24).
2. **Reporte (admin):** el admin elige periodo y filtros → la API valida (CA-04, CA-05) → responde filas, totales, conciliación y semáforo (CA-01, CA-06 a CA-17; la alerta de CA-18 la sustituye el semáforo de `api-027`, CA-32).
3. **Exportación (admin):** el admin elige formato → la API valida formato y tope (CA-20) → registra auditoría (CA-21) → entrega el archivo con metadatos (CA-19).
4. **Errores:** 401 sin sesión; 403 sin permiso, sin 2FA o si el cajero intenta el reporte; 404 boleto ajeno o inexistente (`api-009` CA-13); 422 periodo, filtro, motivo, comentario o formato, en español; 429 límite de frecuencia de `api-009`; 5xx fallo de generación sin archivo parcial (CA-21).
5. **Sin conexión:** esta feature no tiene modo offline. Sin respuesta de la API no hay cancelación registrada.

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:** `api-009` (cambio de contrato de cancelación: `reason_code` obligatorio; ver «Revisión de api-009»), `api-021` (confirmación de contraseña y ventana de 10 minutos antes de cancelar), `api-025` (zona horaria única de negocio), `api-007` (periodos, neto y tope de PDF), DBR-024 (columna), ADR 0017 (exportación CSV, Excel y PDF; sin dependencia nueva).
- **Riesgos:**
  - El cambio de contrato de cancelación rompe al cliente actual: `dashboard-005` debe enviar `reason_code` antes de desplegar la API. Orden: DBR-024 → API → dashboard.
  - Las cancelaciones anteriores quedan «Sin clasificar (anterior)» para siempre; el reporte mostrará esa categoría durante años.
  - La conciliación con el día de venta (RN-06) y el mismo día de cancelación que exige `api-009` RN-16 hacen que ambos criterios coincidan; si `api-009` cambiara esa regla, RN-06 se revisa.
  - Comentarios libres pueden contener datos del visitante; se limitan a `admin` (decisión 2026-11-20).
  - La CA-17 depende de que `api-007` aplique la zona de `api-025` (ver «Decisiones 2026-11-20»).
- **Decisiones 2026-11-20** (las preguntas de la versión Borrador quedan cerradas):
  1. **Zona horaria del reporte.** Decisión 2026-11-20: la define `api-025` (zona única de negocio `America/Mexico_City`, configurable por `ARCA_TIMEZONE`); la API ignora la zona del cliente (RN-09). Sustituye la pregunta.
  2. **Umbrales de alerta.** Decisión 2026-11-20: cancelación hecha más de 30 minutos después de la venta; cajero con más del 10 % de cancelaciones en el periodo y al menos 20 boletos vendidos en el periodo. Umbrales en la configuración de la API (RN-08, CA-18, CA-25).
  3. **Reimpresión con marca «CANCELADO».** Decisión 2026-11-20: fuera de alcance.
  4. **Comentario de «Otro».** Decisión 2026-11-20: «Otro» exige comentario de mínimo 15 caracteres (RN-04, CA-12). Los demás motivos admiten comentario opcional (CA-24).
  5. **Base de la conciliación.** Decisión 2026-11-20: día de la venta (RN-06). Coincide con el día de cancelación porque la cancelación es solo del mismo día (`api-009` RN-16).
  6. **Filtros.** Decisión 2026-11-20: sí, filtros por cajero y por motivo además del periodo (CA-05).
  7. **Cancelaciones anteriores.** Decisión 2026-11-20: se muestran como «Sin clasificar (anterior)» y no se reclasifican (CA-08).
  8. **Comentario en la exportación.** Decisión 2026-11-20: el comentario sale en CSV, Excel y PDF (CA-19).

### Paginación de filas (revisión 2026-11-21)

- **CA-27 (revisión 2026-11-21):** Dado el reporte de cancelaciones, cuando se pide con `page` (entero mínimo 1, opcional, por defecto 1), entonces `rows` trae solo esa página (tamaño `report_page_size`, el mismo de `api-007` y del historial) y la respuesta incluye `meta` con `current_page`, `last_page`, `per_page` y `total` (total de filas cancelables), igual que `api-007`. Un `page` inválido responde 422.
- **CA-28 (revisión 2026-11-21):** Dadas varias páginas del mismo periodo y filtros, cuando se comparan, entonces `totals`, `reconciliation.days` y `reconciliation.cashiers` son idénticos en todas, porque se calculan sobre todo el periodo y los filtros (CA-05, CA-14 a CA-18), no sobre la página.
- **CA-29 (revisión 2026-11-21):** Dada una página fuera de rango, cuando se pide, entonces responde 200 con `rows` vacío, `meta.current_page` igual a la página pedida, y los mismos totales y conciliación, igual que `api-007`.
- **CA-30 (revisión 2026-11-21):** Dadas varias páginas, cuando se recorren en orden, entonces las filas siguen un orden estable (fecha de venta y desempate por id) sin repetir ni omitir ninguna.
- **CA-31 (revisión 2026-11-21):** Dada la exportación (CSV, Excel y PDF), cuando se genera, entonces no se pagina: incluye todas las filas, ignora `page`, y conserva el tope de PDF (CA-20).

### Revisión 2026-11-21 (c) (aprobada por Jonathan): semáforo como única alerta

- **CA-32:** Dado el reporte, cuando se lista `rows`, entonces cada fila trae `late_cancellation` (más de `cancellation_alerts.cancel_after_minutes` = 30 min entre venta y cancelación) y `signal_codes` (códigos de las señales del semáforo de su cajero y día en las que participa; vacío si ninguna), y ni `rows` ni `reconciliation.cashiers` traen `alert` ni `alert_reasons`. **Sustituye a CA-18.** Test: `test_ca32_rows_have_late_cancellation_and_signal_codes` y `test_ca18_late_cancellation_after_30_minutes`.
- **CA-33:** Dado un cajero en la conciliación, cuando se calcula, entonces `days_to_review` trae `attention` y `review` con el número de sus días de ese nivel en el periodo, igual al recuento de `cashier_days`. Test: `test_ca33_days_to_review_matches_cashier_days`.
- **CA-34:** Dado el filtro `cashier_id`, cuando se pide el reporte, entonces `cashier_days` muestra solo a ese cajero con el mismo nivel que sin filtro; `reason_code` no filtra `cashier_days`. Test: `test_ca34_cashier_filter_reduces_cashier_days_without_changing_level`.
- **CA-35:** Dada la exportación, cuando se genera, entonces no hay columnas «Alerta»; los boletos llevan «Cancelación tardía (más de 30 min)» Sí/No y «Señales», la conciliación por cajero «Días por revisar» y el semáforo «Folios». Test: `test_ca35_export_has_new_columns_and_no_alert_column`.
- **CA-36:** Dada una exportación con `cashier_id`, cuando se genera, entonces el semáforo exportado trae solo a ese cajero. Test: `test_ca36_filtered_export_only_contains_filtered_cashier`.

## Revisión

- Aprobadores y fecha: Jonathan (responsable funcional), 2026-11-20.
- Enmienda técnica 2026-11-20: aprobación técnica del plan `apps/api/plan/022-ticket-cancellation-report.md`. Enmienda CA-04, CA-22, CA-25 (sin cambio), RN-08 y RN-14; añade CA-26 y RN-15 a RN-17. Ningún número existente cambia.
- Enmienda funcional 2026-11-20 (Jonathan, tras la implementación): CA-10 admite también `reports.cancellations.view`, porque el admin necesita el catálogo para el filtro «Motivo» del reporte. El catálogo es de solo lectura y sin datos personales; `zoo-admin`, `executive` y `veterinarian` siguen recibiendo 403. Ningún número cambia.
- Revisión 2026-11-21 (aprobada por Jonathan): paginación de filas. Añade CA-27 a CA-31 sin renumerar; `rows` pasa a paginarse con `page` y `meta`, y `totals` y conciliación siguen siendo del periodo completo. La exportación no se pagina.
- Corrección de procedimiento (2026-11-21, decisión 1 de Jonathan, nota de revisión): **RN-13 queda sustituida**. El cajero entrega **solo el dinero** al cierre de la taquilla; no entrega el boleto físico cancelado. Del mismo modo, en «Fuera de alcance», la frase sobre la entrega física del dinero y del boleto cancelado se lee como «entrega del dinero». No cambia ningún CA ni número. Los textos de «qué hacer» del semáforo (`api-027` RN-05) no piden boletos físicos.
- Ampliación (2026-11-21, `api-027`): el reporte gana `reconciliation.cashier_days[]`, `legend[]` y revisión por cajero y día; los totales, la conciliación y las filas de esta spec no cambian.
- Evidencia/enlaces: `apps/api/src/routes/api.php` (rutas `tickets.*` y `reports.*`), `apps/api/src/app/Actions/Admin/Tickets/CancelTicketAction.php`, `apps/api/src/app/Actions/Admin/Reports/ExportTicketReportAction.php`, `apps/api/src/app/Http/Requests/Admin/Tickets/CancelTicketRequest.php`, `docs/database/requests/DBR-024-ticket-cancellation-reason-code.md`, `apps/api/specs/009-ticket-sales.md` (nota de revisión 2026-11-20).
- Revisión 2026-11-21 (c) (aprobada por Jonathan): se retiran `alert` y `alert_reasons` (filas y conciliación por cajero); se añaden `late_cancellation`, `signal_codes`, `days_to_review` y CA-32 a CA-36 sin renumerar. CA-18 queda sustituido por CA-32; CA-25 aplica solo al umbral de 30 min; RN-08 se lee sin la alerta por cajero (`cashier_min_sold_tickets` retirado). `cashier_days` respeta `cashier_id`. Ver `api-027`.
