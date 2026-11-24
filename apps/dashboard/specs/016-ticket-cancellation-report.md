# 016 · ticket-cancellation-report

- App dueña: `dashboard`
- Apps/paquetes afectados: `dashboard`, `packages/api-client` (llamadas al reporte de cancelaciones, exportación y catálogo de motivos); `packages/ui` (solo si falta un componente compartido); `api` (dependencia: `api-022`, dueña de la lógica, el permiso y el contrato; `api-009` y `api-021` como base de la cancelación; `api-025`, zona horaria)
- Estado: Implementada
- Solicitada: 2026-11-20
- Aprobada: 2026-11-20
- Aprobación funcional: Aprobada
- Enmienda relacionada: `apps/dashboard/specs/005-ticket-sales.md` (nota de revisión: el diálogo de cancelar pide un motivo de lista cerrada). Esta spec no cambia los CA de `dashboard-005`; el selector de motivo del diálogo de cancelar se define aquí (CA-18 a CA-21) y la nota de `dashboard-005` apunta a este documento.
- Última edición: preguntas abiertas cerradas por el responsable funcional; ver «Decisiones»

## Problema y contexto

La taquilla (`dashboard-005`) ya deja cancelar un boleto del mismo día con un motivo escrito a mano. El administrador (`admin`, Presidencia) no tiene ninguna pantalla que muestre las cancelaciones, quién las hizo, por qué, cuánto dinero representan ni si el neto de cada día cuadra con lo vendido. Hoy esa revisión se hace a mano y sin criterio común.

`api-022` define el catálogo cerrado de motivos, el reporte de boletos cancelados con conciliación y la exportación. Esta spec define cómo lo presenta el dashboard:

- Una página de **Cancelaciones** en la navegación de administración, visible solo con `reports.cancellations.view` (solo `admin`).
- Filtros de periodo, cajero y motivo, enviados a la API.
- Tablas de filas, totales por motivo y cajero, y conciliación por día y por cajero, con la comprobación que devuelve la API.
- Señales de alerta visuales, marcadas por la API y sin bloquear nada.
- Exportación en CSV, Excel y PDF.
- En el diálogo de cancelar de la taquilla (`dashboard-005`), un selector obligatorio con los motivos que devuelve la API y un campo de comentario.

## Objetivos

- Que `admin` vea y filtre las cancelaciones de un periodo sin salir del dashboard.
- Que la conciliación bruto = neto + cancelado se vea en cada día y en cada cajero, con el resultado que calcula la API.
- Que las alertas se vean claras y no impidan leer ni exportar nada.
- Que el cajero no pueda cancelar sin elegir un motivo de la lista de la API.
- Mantener MVVM: componentes como Views, hooks como ViewModels, datos por `@arca/api-client` (Constitución III).

## Fuera de alcance

- Cualquier cálculo de totales, conciliación, minutos, porcentajes o alertas en el cliente. Todo lo entrega `api-022`.
- Reclasificar cancelaciones anteriores. Se muestran como «Sin clasificar (anterior)».
- Deshacer, editar o reactivar una cancelación.
- Reimpresión del boleto con marca «CANCELADO».
- Reporte de cancelaciones para `zoo-admin`, `executive`, `cashier` o `veterinarian`. El cajero sigue con su historial (`dashboard-005`, CA-10).
- Envío o programación del reporte por correo.
- Cambios de estilo de marca o nuevas dependencias de UI (ver RN-7 de `dashboard-005`).
- Cambios en `apps/web`, `apps/pwa` y `apps/mobile`.
- Autenticación de dos pasos y confirmación de contraseña: las define `api-021` y `dashboard-015`; esta spec solo las consume en el diálogo de cancelar.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos (API) |
|---|---|---|
| `admin` | Ver, filtrar, conciliar y exportar el reporte de cancelaciones | Sesión + 2FA; `reports.cancellations.view` (`api-022`) |
| `cashier` | Elegir el motivo al cancelar sus boletos del mismo día | `tickets.cancel` (`api-009`) para cancelar y leer el catálogo (`api-022` CA-10) |
| `zoo-admin`, `executive`, `veterinarian` | Sin acceso a la página ni a la acción de motivo | — |

La página solo oculta opciones. La autorización real la aplica la API (RN-01).

## Historias de usuario

- Como `admin`, quiero ver las cancelaciones de la semana o del mes con su motivo, quién vendió y quién canceló, para revisar errores de la taquilla.
- Como `admin`, quiero ver cada día y cada cajero con bruto, cancelado y neto, y saber si cuadran, para revisar el dinero que debe entregar la taquilla.
- Como `admin`, quiero que las cancelaciones fuera de lo normal se marquen visualmente, sin que el sistema me impida nada.
- Como `admin`, quiero exportar el reporte en CSV, Excel o PDF.
- Como `cashier`, quiero elegir de una lista el motivo de la cancelación, para que el registro sea comparable.

## Criterios de aceptación

### Acceso y navegación

- **CA-01:** Dada una sesión con `reports.cancellations.view`, cuando se presenta la navegación de administración, entonces muestra «Cancelaciones». Sin ese permiso, la entrada no aparece y la ruta de la página responde con la vista de «Sin permiso» del dashboard.
- **CA-02:** Dado un usuario sin `reports.cancellations.view` que abre la página (o una llamada que devuelve 403), cuando la API responde 403, entonces la página muestra el mensaje de la API en español, no muestra filas ni totales y no reintenta.
- **CA-03:** Dado un 401 en la página, cuando se detecta, entonces el dashboard vuelve al login con «Tu sesión expiró» (`dashboard-002` CA-08).

### Filtros y periodo

- **CA-04:** Dada la página Cancelaciones, cuando carga, entonces ofrece los periodos «Semana», «Mes» y «Rango personalizado», con selector de fecha de referencia o de fecha inicial y final, y los filtros «Cajero» y «Motivo». El valor por defecto es «Semana» con la fecha de hoy.
- **CA-05:** Dados filtros o periodo cambiados, cuando se aplican, entonces la página vuelve a consultar la API con esos valores. No filtra ni recalcula en el cliente. Los errores 422 de periodo (`api-022` CA-04) se muestran junto al campo correspondiente o en el aviso de la página.
- **CA-06:** Dada la lista de cajeros para el filtro, cuando se carga, entonces viene de la API y no se fija en el cliente.

### Filas y totales

- **CA-07:** Dada una respuesta del reporte, cuando se muestra la tabla, entonces cada fila presenta folio, adultos, niños, importe, fecha y hora de venta, fecha y hora de cancelación, cajero que vendió, quien canceló, motivo (etiqueta) y comentario, y minutos entre venta y cancelación. Las fechas se muestran en `dd/mm/aaaa HH:mm` en la zona que devuelve la API (`arca.timezone`, `api-025` CA-12 y RN-05; la API ignora la zona del cliente, `api-025` RN-04). La presentación no cambia totales.
- **CA-08:** Dada una fila de una cancelación anterior a la feature, cuando se muestra, entonces el motivo aparece como «Sin clasificar (anterior)» y el comentario como texto guardado (`api-022` CA-08).
- **CA-09:** Dada la respuesta, cuando se muestran los totales, entonces aparecen el número de boletos cancelados, el importe cancelado y los desgloses por cajero y por motivo tal como los devuelve la API. La página no suma filas para obtener ningún total.
- **CA-10:** Dada una tabla con más filas que las visibles, cuando el usuario navega, entonces la paginación o el desplazamiento propio de la tabla conserva encabezados y no genera desbordamiento horizontal de la página (CA-22).

### Conciliación

- **CA-11:** Dado el reporte con conciliación, cuando se muestra por día y por cajero, entonces cada fila presenta vendido bruto, cancelado y neto, y el indicador «Cuadra» o «No cuadra» según el campo `balanced` que devuelve la API (`api-022` CA-14 y CA-16). El texto es el de la API; la página no compara importes.
- **CA-12:** Dada una fila de conciliación con `balanced: false`, cuando se muestra, entonces aparece con un aviso visible de «No cuadra. Revisa con Informática.» y no se oculta.
- **CA-13:** Dado un día o un cajero sin actividad en el periodo, cuando se muestra la conciliación, entonces no aparece como fila (la lista la decide la API).

### Señales de alerta

- **CA-14 (sustituido por CA-35, revisión (c)):** Dada una fila o un cajero marcado con `alert: true` por la API (`api-022` CA-18), cuando se muestra, entonces aparece una señal visual (icono o etiqueta con texto «Revisar»), con el motivo que devuelve la API en texto accesible. La señal no cambia el orden, no oculta la fila ni bloquea la exportación.
- **CA-15 (se mantiene; el porcentaje y el conteo ya no van con un distintivo «Revisar»):** Dada la señal de un cajero, cuando el usuario la consulta, entonces ve el porcentaje de cancelación y el número de boletos que devuelve la API. La página no calcula el porcentaje ni aplica umbrales.

### Exportación

- **CA-16:** Dada la página con datos, cuando el admin pulsa «Exportar» y elige CSV, Excel o PDF, entonces llama a la exportación de la API con los mismos filtros y el archivo se descarga con el nombre que devuelve la API. Mientras se genera, el botón está deshabilitado.
- **CA-17:** Dada una exportación rechazada (422 por PDF con más de 2000 filas, o por formato), cuando llega, entonces la página muestra el mensaje de la API junto al selector de formato y no descarga nada. Un fallo de red o 5xx muestra un error sin reintento automático.

### Diálogo de cancelar en la taquilla

- **CA-18:** Dado un `cashier` con `tickets.cancel` y un boleto cancelable (`dashboard-005` CA-12), cuando pulsa «Cancelar», entonces el diálogo muestra un selector obligatorio «Motivo» con las opciones que devuelve `GET` del catálogo de `api-022` (CA-10). El diálogo no fija las etiquetas en código.
- **CA-19:** Dado el diálogo de cancelar sin motivo elegido, cuando el cajero pulsa «Cancelar boleto», entonces no se llama a la API y se muestra «Elige un motivo de cancelación.» junto al selector.
- **CA-20:** Dado un motivo elegido, cuando se muestra el diálogo, entonces aparece un campo de comentario. Para «Otro», el campo es obligatorio y se rotula «Describe el motivo»; para los demás motivos es opcional. La página no fija el mínimo de caracteres: envía el texto y muestra el 422 de la API junto al campo (`api-022` CA-12 y CA-24).
- **CA-21:** Dada una cancelación confirmada con motivo (y contraseña cuando `api-021` la pida), cuando la API responde 200, entonces la lista del historial se refresca y se muestra el aviso accesible de cancelación. Un 422 de motivo, un 403 o un 429 se muestran en el diálogo con el mensaje de la API, sin reintento automático.
- **CA-22:** Dada la página Cancelaciones en cualquier ancho de 360 a 1366 px, cuando se usa, entonces tiene foco visible, las tablas tienen desplazamiento propio o diseño apilado, y la página no tiene desbordamiento horizontal.

### Transversales

- **CA-23:** Dado el código de la página y del diálogo, cuando se revisa, entonces ningún componente de `views/` o `components/` llama `fetch` o `axios`, calcula totales, conciliación, minutos, porcentajes o alertas, ni decide permisos. Toda llamada pasa por `@arca/api-client` desde hooks ViewModel (un hook para el reporte, otro para el catálogo de motivos).
- **CA-24:** Dada la página, cuando se revisa su estilo, entonces usa tokens semánticos y no fija hex de marca. El modo claro es el único que se valida (ver `dashboard-001`).
- **CA-25:** Dada la suite de Vitest con un cliente simulado de `@arca/api-client`, cuando se ejecuta, entonces existe al menos una prueba que nombra cada CA de esta spec (CA-01 a CA-26).
- **CA-26:** Dado el historial de boletos con una cancelación, cuando la taquilla o `admin` lo consulta, entonces la columna de motivo muestra la etiqueta que devuelve la API (`cancellation_reason_label`; «Sin clasificar (anterior)» si el código es nulo) junto con el comentario guardado. La página no deriva la etiqueta del código (RN-02).

## Reglas de negocio

- **RN-01:** El mapa permiso → sección y motivo es solo presentación. La autorización real la aplica `api-022` y `api-009`.
- **RN-02:** Totales, conciliación, alertas, minutos, catálogo de motivos y cajeros del filtro vienen de la API. El cliente no reimplementa ninguna regla de `api-022` ni de `api-009`.
- **RN-03:** Cancelar siempre pide confirmación explícita y motivo antes de llamar a la API (`dashboard-005` RN-03, RN-13).
- **RN-04:** La página es de solo lectura, salvo la exportación. No hay controles para editar, reactivar ni eliminar cancelaciones.
- **RN-05:** Mensajes y etiquetas en español; identificadores en inglés (Constitución VI).
- **RN-06:** Sin React Router: la página se navega por estado de la SPA (ADR 0002).
- **RN-07:** Sin nuevas dependencias en el cliente. Las señales y la tabla se hacen con componentes de `@arca/ui`.
- **RN-08:** El diseño no cambia por esta página (`dashboard-001` RN-09): se reutilizan patrones de las páginas de administración (`dashboard-003`).
- **RN-09:** La página no guarda datos en `localStorage`, cookies ni caché persistente. Solo vive en la memoria de la sesión.
- **RN-10:** Los periodos, la zona horaria del reporte y el tope de PDF son los de `api-022` y `api-007`, y la zona es la de negocio de `api-025`. El dashboard no envía zona horaria: la API la ignora si llega.

## Datos, privacidad y auditoría

- La página muestra folios, importes, fechas, nombres de cajeros y de quien canceló, motivos y comentarios. Los comentarios de «Otro» pueden contener datos del visitante; la página los muestra solo a `admin` (decisión, `api-022`).
- La exportación la audita la API (`api-022` CA-21). La página no escribe auditoría.
- No almacena reportes, filas ni archivos fuera de la memoria de la sesión.

## Flujos y errores

1. **Consultar (admin):** entra a Cancelaciones → elige periodo y filtros → la página llama a la API → muestra filas, totales, conciliación y señales (CA-04 a CA-15).
2. **Exportar (admin):** elige formato → la API responde el archivo o un error → la página descarga o muestra el mensaje (CA-16, CA-17).
3. **Cancelar (cajero):** pulsa «Cancelar» en un boleto cancelable → elige motivo (y comentario si es «Otro» o si quiere añadirlo) → confirma → la API responde → la lista se refresca (CA-18 a CA-21).
4. **Errores:** 401 → login con «Tu sesión expiró» (CA-03); 403 → mensaje de la API en la página o el diálogo (CA-02); 404 en cancelar → mensaje de la API en el diálogo; 422 → mensaje por campo; 429 → mensaje de la API, sin reintento automático; 5xx o red → error con texto que pide reintentar manualmente.
5. **Sin conexión:** la página no tiene modo offline. Sin respuesta de la API no muestra datos ni cancela.

## Dependencias, riesgos y preguntas

- **Dependencias:** `api-022` (catálogo, reporte, conciliación, alertas, exportación), `api-009` (cancelación; `reason_code` obligatorio, ver su nota de revisión), `api-021` y `dashboard-015` (confirmación de contraseña al cancelar), `api-007` y `dashboard-003` (periodos y zona), `api-025` (zona única de negocio), `dashboard-005` (diálogo de cancelar; enmienda de motivo), DBR-024 (columna del código, solo en la API).
- **Orden de despliegue:** DBR-024 → API (`api-022` y `api-009`) → dashboard. El diálogo de cancelar no puede enviar `reason_code` antes de que la API lo acepte.
- **Riesgos:**
  - Si la API se despliega antes que el dashboard, la taquilla no puede cancelar hasta que se actualice el diálogo (422 de motivo). Hay que desplegar junto.
  - Una conciliación «No cuadra» se verá en pantalla; la página la muestra tal como la devuelve la API y no la corrige.
  - Las señales de alerta usan los umbrales de `api-022` (30 minutos; 10 % con al menos 20 boletos). Si cambian en configuración, la página no cambia.
- **Decisiones** (las preguntas de la versión Borrador quedan cerradas):
  1. **Zona horaria del reporte.** Decisión: la define `api-025` (zona única de negocio); el dashboard no envía zona (RN-10, CA-07).
  2. **Umbrales de alerta.** Decisión: los de `api-022` (más de 30 minutos entre venta y cancelación; cajero con más del 10 % de cancelaciones y al menos 20 boletos vendidos). La página no los fija.
  3. **Reimpresión con «CANCELADO».** Decisión: fuera de alcance.

## Revisión

- Aprobadores: responsable funcional.
- Enmienda técnica: la columna de motivo del historial usa la etiqueta de la API (CA-26, con `api-022` CA-26 y RN-17). Sin cambio en los demás CA.
- Evidencia/enlaces: `apps/api/specs/022-ticket-cancellation-report.md`, `apps/api/specs/009-ticket-sales.md`, `apps/dashboard/specs/005-ticket-sales.md`, `docs/database/requests/DBR-024-ticket-cancellation-reason-code.md`.

## Nota de revisión

- La página Cancelaciones pasa a ser la pestaña «Cancelaciones» dentro de la entrada «Reportes» (`dashboard-020` CA-01, CA-02). Sigue solo con `reports.cancellations.view` (solo `admin`); `executive` no la ve (`dashboard-020` CA-07, RN-10). Esta nota reemplaza la entrada «Cancelaciones» de CA-01 en la navegación; el resto del CA-01 y CA-02 se mantiene.
- CA-04: los periodos se muestran con las etiquetas «Semanal», «Mensual» y «Rango personalizado» (`dashboard-020` CA-15, D-5 pendiente de confirmación).
- CA-05 y CA-17: los 422 de periodo se muestran junto al selector de periodo; el selector de formato de exportación pasa a botones «Exportar CSV», «Exportar Excel» y «Exportar PDF», y el 422 de formato se muestra junto a ese grupo. Un fallo de red o 5xx de exportación pasa a aviso emergente (`dashboard-020` CA-13, CA-14, CA-27; D-7 pendiente).
- Los CA no cambian de número ni de criterio observable salvo lo indicado.

## Nota de revisión (, dashboard-020 rev. (d))

- **CA-27:** Dadas más de 50 filas en el periodo, cuando se muestra el reporte, entonces las filas se paginan de 50 en 50 con el paginador compartido de `@arca/ui` (`meta` hermano de `data`: «Página N de M · T en total»); al cambiar filtros o periodo vuelve a la página 1; los totales y la conciliación no cambian entre páginas.
- **CA-28:** Dada la exportación, cuando se descarga, entonces no se pagina (no envía `page`); `@arca/api-client` agrega `page` a `CancellationReportQuery` y `meta` a `CancellationReportDto` de forma aditiva. Contrato: `api-022` CA-27 a CA-31.

## Nota de revisión (, dashboard-021 y api-027)

- Esta spec no contiene la recomendación de entregar el boleto físico cancelado; su texto no cambia. La corrección de procedimiento (el cajero entrega solo el dinero) queda en `api-022` (nota de revisión) y se aplica en los textos que devuelve la API.
- La pestaña «Cancelaciones» gana la sección de semáforo por cajero y día, la leyenda, el registro de revisión y el historial: ver `apps/dashboard/specs/021-cancellation-review-signals.md`. Los datos vienen de `api-027`; esta spec no cambia sus CA-01 a CA-28.
- El aviso de cancelaciones pendientes (`cancellation_days`) se añade en `dashboard-018`.

## Nota de revisión (, ajuste de conciliación)

Aprobado por el responsable funcional. La columna «cuadra» confundía: parecía comparar contra el dinero entregado cuando solo comprueba que bruto = neto + cancelado (`api-022` RN-06). Sin renumerar; esta nota reemplaza el indicador «Cuadra / No cuadra» de CA-11 y el texto «No cuadra. Revisa con Informática.» de CA-12.

- **CA-29:** Dada la conciliación por día y por cajero, cuando se muestra, entonces no hay columna «Conciliación»/«cuadra» (la API sigue enviando `balanced`).
- **CA-30:** Dada una fila con `balanced: false`, cuando se muestra, entonces aparece en esa fila y arriba de la tabla un `Alert` de error: «Error de datos en este día: el bruto no coincide con neto + cancelado. Repórtalo a sistemas.» (cajero: «…para este cajero…»).
- **CA-31:** Dada la conciliación sin filtro de motivo, entonces se muestra la ayuda «Neto a entregar = vendido bruto − cancelado. Compáralo con el dinero que entregó el cajero.».
- La exportación de archivos es de la API y no cambia.

## Revisión (c) (aprobada)

Contrato con `api-022`/`api-027` (revisión (c)): el semáforo es la única alerta; se retiran `alert` y `alert_reasons` de boletos y cajeros. Sin renumerar los CA anteriores.

- **CA-32 (columnas «Tardía» y «Señales»):** Dada la tabla de boletos cancelados, cuando se muestra, entonces añade «Tardía» (Sí/No según `late_cancellation`) y «Señales» (chips con la etiqueta corta de cada `signal_codes[]`, tomada de `legend[]` de la API; sin etiqueta, el código). Sin señales, «—». Test: `test_ca32_tickets_table_shows_tardia_and_signals_columns`.
- **CA-33 (días por revisar):** Dada la conciliación por cajero, cuando se muestra, entonces añade la columna «Días por revisar» con `days_to_review` de la API («2 en Atención · 3 en Revisar»; «Ninguno» si ambos son 0). Test: `test_ca33_reconciliation_by_cashier_shows_days_to_review`.
- **CA-34 (aviso de exportación):** Dados los botones de exportar, cuando hay reporte, entonces junto a ellos aparece «Se exportará con los filtros aplicados: periodo …; cajero: …; motivo: ….» con los filtros vigentes. Test: `test_ca34_export_note_lists_applied_filters`.
- **CA-35 (alertas retiradas):** El distintivo «Revisar» por boleto o cajero (`CancellationAlertBadge`) y el uso de `alert`/`alert_reasons` desaparecen; esto sustituye al CA-14. `@arca/api-client` quita `alert` y `alert_reasons` (permitido porque la API los retira a la vez) y añade `late_cancellation`, `signal_codes`, `days_to_review` y `reasons[].folios`. Test: `test_ca35_old_alerts_are_removed_everywhere`.

«Ver boletos», los folios por señal y el resaltado se definen en `dashboard-021` (CA-29 a CA-34). Cobertura: CA-01 a CA-35 en `cancellation-report-coverage.test.tsx`.
