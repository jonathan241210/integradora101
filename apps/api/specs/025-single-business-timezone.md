# 025 · single-business-timezone

- App dueña: `api`
- Apps/paquetes afectados: `api` (dueña: configuración `arca.timezone`, Actions de panel, reporte, exportación, historial, cancelación y visibilidad pública, y zona de la conexión MySQL); `apps/dashboard` (consumidor: presenta fechas en la zona que devuelve la API, `dashboard-019`); `packages/api-client` (deja de enviar `timezone`, `dashboard-019`); `apps/web`, `apps/mobile` y `apps/pwa` (impacto listado en «Dependencias, riesgos y preguntas», sin spec redactada aquí).
- Estado: Aprobada
- Solicitante / responsable funcional: Jonathan
- Responsable de BD: no aplica. Sin DBR: el cambio es de configuración (`.env` y opciones de la conexión), no de esquema (ver «Datos, privacidad y auditoría»).
- Aprobación funcional: Jonathan, 2026-11-20 (decisiones cerradas 1 a 8, registradas en esta spec; la sesión principal aporta la evidencia)
- Orden de implementación: después de `api-021` y antes de `api-022`.
- Sustituye, cuando se implemente: `api-007` RN-14 y CA-28 (zona del dispositivo con respaldo), `api-011` RN-14 (llave `arca.public_timezone`) y el texto de zona de `api-009` RN-16 y CA-31 (llave `arca.report_timezone`). Hasta su implementación, esas specs siguen vigentes.

## Problema y contexto

Hoy la API decide el «día» de cada cálculo con zonas que no son una sola:

- El panel, el reporte y su exportación usan la zona que envía el dispositivo que consulta (`api-007` RN-14), con respaldo en `America/Mexico_City`. Dos usuarios que consultan desde zonas distintas pueden ver cifras distintas del mismo día.
- La cancelación el mismo día (`api-009` RN-16) usa `config('arca.report_timezone')`.
- La visibilidad pública de noticias y eventos usa `config('arca.public_timezone')` (`api-011` RN-14).
- Las dos llaves valen lo mismo (`America/Mexico_City`) pero son dos fuentes de verdad para una misma regla de negocio.
- La búsqueda global del grupo de historial (`api-019`) muestra la fecha de compra con `config('app.timezone')`, que es `UTC`, no con la zona de negocio.
- La conexión MySQL no fija su zona de sesión en la aplicación. Esto deja `TIMESTAMP` con `CURRENT_TIMESTAMP` (por ejemplo `tickets.purchased_at`) dependiendo de la zona del servidor.

Resultado: una venta a las 23:30 de Tulancingo puede caer en otro día según quién la consulte o según el servidor de base de datos. Afectados: directivos (panel y reporte), personal de taquilla (historial y cancelación), visitantes (vigencia de noticias y eventos) y el equipo de operaciones (configuración por ambiente).

## Objetivos

- Tener una sola zona de negocio, configurable por ambiente con `ARCA_TIMEZONE`, con valor por defecto y de producción `America/Mexico_City`.
- Usar esa zona en todo cálculo de «hoy», día, semana, mes, rango, día de cancelación y visibilidad pública.
- Guardar y responder todos los instantes en UTC, sin cambio de `app.timezone`.
- Fijar la zona de sesión de la conexión MySQL en UTC.
- Dejar de aceptar la zona del cliente en la API, e informar en cada respuesta la zona usada.

## Fuera de alcance

- Cambiar `app.timezone` (sigue en `UTC`).
- Zonas por sucursal, por usuario o por dispositivo.
- Reescribir o convertir filas ya guardadas en la base de datos (ver RN-08 y el riesgo de datos).
- Lógica especial de horario de verano (ver RN-07).
- Cambios de esquema, migraciones o DBR.
- Cambios de contrato en `apps/web`, `apps/mobile` y `apps/pwa`; solo se listan como impacto.
- Cambios en la conexión `mysql2` de `settings_colores` (fuente externa de solo lectura). *Enmienda técnica 2026-11-20 (P-01): la conexión `mysql2` no existe en el código de la API (`config/database.php` solo define `sqlite`, `mysql`, `mariadb`, `pgsql` y `sqlsrv`). La decisión 3 queda retirada; ver «Decisiones finales».*
- Redacción de la spec del dashboard y del api-client: corresponde a `dashboard-019`.
- Reemplazar `api-022` o el reporte de cancelaciones: esta spec solo fija la zona que usará.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| `admin`, `zoo-admin`, `executive` | Ver panel, reporte y exportación con el día del zoológico | `dashboard.view`, `reports.view` (sin cambio) |
| `cashier` | Ver historial y cancelar con el día del zoológico | Sin cambio (`api-009`) |
| Visitante anónimo | Ver noticias y eventos vigentes según el día del zoológico | Ninguno (sin cambio, `api-011`) |
| Dashboard (`dashboard-019`) | Presentar fechas en la zona que devuelve la API | Ninguno nuevo |
| Operaciones (`.env` por ambiente) | Definir `ARCA_TIMEZONE` y `DB_TIMEZONE` | Acceso de despliegue (`infra/README.md`) |
| Responsable funcional | Validar la zona de negocio y el corte | Jonathan |

Esta feature no crea permisos ni roles.

## Historias de usuario

- Como directivo, quiero que el panel y el reporte cuenten cada boleto en el día en que se vendió en Tulancingo, para que todos veamos las mismas cifras.
- Como personal de taquilla, quiero que el historial y la cancelación del mismo día usen el día del zoológico, para que un boleto de las 23:30 se pueda cancelar en su día.
- Como visitante, quiero que una noticia o evento vigente siga visible hasta el final del día local, para no perder avisos del día.
- Como responsable de operaciones, quiero cambiar la zona de negocio con `ARCA_TIMEZONE` por ambiente, sin tocar código.

## Criterios de aceptación

Ejemplo de referencia usado en los CA: `2026-11-07 05:30:00 UTC` equivale a `2026-11-06 23:30:00` en `America/Mexico_City` (UTC-6, sin horario de verano desde 2022).

- **CA-01 (zona por defecto y llave única):** Dado un `.env` sin `ARCA_TIMEZONE`, cuando se lee `config('arca.timezone')`, entonces vale `America/Mexico_City`; y `config/arca.php` no define `report_timezone` ni `public_timezone`, y ningún código de `apps/api/src` lee esas llaves.
- **CA-02 (cambiar la zona cambia el corte):** Dado un boleto `completed` con `purchased_at` `2026-11-07 05:30:00` UTC, cuando `ARCA_TIMEZONE` vale `America/Mexico_City`, entonces cuenta en el día `2026-11-06`; y cuando `ARCA_TIMEZONE` vale `UTC`, entonces cuenta en el día `2026-11-07`.
- **CA-03 (instantes en UTC):** Dado un boleto que se vende o cancela, cuando se guarda, entonces `purchased_at`, `cancelled_at` y los demás instantes quedan en UTC; y `config('app.timezone')` vale `UTC`.
- **CA-04 (panel en la zona de negocio):** Dado el boleto de CA-02 con `ARCA_TIMEZONE` en `America/Mexico_City` y la hora de referencia `2026-11-07 05:45:00` UTC, cuando un `dashboard.view` llama el panel con `timezone=Europe/Madrid` (o sin ese parámetro), entonces el boleto cuenta en el día `2026-11-06` de los totales y de la serie diaria, y la respuesta indica `timezone: "America/Mexico_City"`.
- **CA-05 (reporte y exportación en la zona de negocio):** Dado el boleto de CA-02, cuando un `reports.view` pide el reporte semanal con referencia `2026-11-06` y lo exporta en CSV, XLSX y PDF con `timezone=America/Tijuana`, entonces el boleto aparece en el periodo y en el día `2026-11-06` de los tres formatos; en CSV la hora de `purchased_at` es `2026-11-06 23:30:00`; y `period.timezone` vale `America/Mexico_City`.
- **CA-06 (historial de taquilla):** Dado el boleto de CA-02, cuando se consulta el historial de taquilla con `from=2026-11-06` y `to=2026-11-06` y un `timezone` de cliente distinto, entonces el boleto aparece; con `from=2026-11-07` y `to=2026-11-07` no aparece. La respuesta incluye `timezone: "America/Mexico_City"` (ver CA-12).
- **CA-07 (cancelación el mismo día):** Dado un boleto vendido `2026-11-07 05:30:00` UTC (6 de noviembre 23:30 local), cuando el cajero intenta cancelarlo a las `2026-11-07 06:10:00` UTC (7 de noviembre 00:10 local), entonces la API lo considera de otro día y no es cancelable (`api-009` RN-16), aunque el cliente envíe `timezone=UTC`, donde ambas horas caen el 7 de noviembre.
- **CA-08 (reporte de cancelaciones):** Dada una cancelación con `cancelled_at` `2026-11-07 05:10:00` UTC (6 de noviembre 23:10 local), cuando se consulta el reporte de cancelaciones de `api-022` para el 6 de noviembre, entonces la cancelación cuenta en ese día; y el neto diario coincide con el del reporte de boletos (`api-022` CA-17). Este CA se cumple desde la primera versión de `api-022`.
- **CA-09 (vigencia pública con la misma llave):** Dado que la hora del servidor es `2026-11-07 05:30:00` UTC y una noticia con `end_date` `2026-11-06`, cuando se consulta sin sesión con `ARCA_TIMEZONE=America/Mexico_City`, entonces la noticia es visible; con `ARCA_TIMEZONE=UTC` (hoy `2026-11-07`), entonces no es visible. El cálculo de «hoy» sale de `arca.timezone` (`api-011` CA-12 se mantiene con esta llave).
- **CA-10 (el parámetro `timezone` del cliente se ignora):** Dado cualquier cliente que envía `timezone` con una zona válida (`Asia/Tokyo`), una zona no válida (`Mars/Olympus`), una abreviatura (`EST`) o un desfase (`+05:00`), cuando llama panel, reporte, exportación, historial, cancelación, reporte de cancelaciones o noticias y eventos, entonces la respuesta es idéntica a la que daría sin ese parámetro, no hay error `422` por zona y la respuesta informa `arca.timezone`.
- **CA-11 (conexión MySQL en UTC):** Dada la conexión `mysql` con la configuración del ambiente, cuando se consulta `@@session.time_zone`, entonces devuelve `+00:00`; y la zona se configura solo por `.env` (`DB_TIMEZONE`, por defecto `+00:00`) en `config/database.php`.
- **CA-12 (zona informada en las respuestas):** Dadas las respuestas de panel (`timezone`), reporte (`period.timezone`) y historial de taquilla, cuando se consultan, entonces informan `arca.timezone` como texto IANA. Esta respuesta es la fuente que usa el dashboard para presentar fechas (`dashboard-019`). *Enmienda técnica 2026-11-20 (P-04): la respuesta del recibo de venta (`POST /api/v1/admin/tickets`) y las respuestas de precios vigentes también informan `timezone` con `arca.timezone`.*
- **CA-13 (cobertura de pruebas):** Dada la suite de PHPUnit, cuando se ejecuta contra `arca_pruebas` con `DatabaseTransactions` (sin `RefreshDatabase` ni migraciones desde los tests), entonces existe al menos un test que nombra cada CA-01 a CA-16. Los tests que hoy envían `timezone` como zona de negocio se actualizan para cumplir CA-10. *Enmienda técnica 2026-11-20: CA-08 se verifica con `api-022` (P-05), así que su test vive en las tareas de `api-022`.*
- **CA-14 (arranque con zona inválida; decisión 2 de 2026-11-20 y P-06):** Dado `ARCA_TIMEZONE` vacío o que no es un identificador IANA (por ejemplo `Mars/Olympus`, `EST` o `+05:00`), cuando la aplicación arranca, entonces no arranca y muestra un error claro en español que indica la variable y el valor recibido, sin respaldo silencioso a `America/Mexico_City`.
- **CA-15 (memoria semanal; P-02):** Dado un visitante que supera el límite semanal de momentos (`api-010` CA-23), cuando recibe el mensaje de `WeeklyMemoryLimitException`, entonces la fecha del mensaje se calcula con `arca.timezone` y no con `config('app.timezone')`.
- **CA-16 (precios programados; P-03):** Dado `POST /api/v1/admin/ticket-prices` con `effective_at` como fecha y hora sin desfase (por ejemplo `2026-11-07T00:00:00`), cuando la API la procesa con `ARCA_TIMEZONE=America/Mexico_City`, entonces la vigencia empieza a las `2026-11-07 06:00:00` UTC; con `ARCA_TIMEZONE=UTC`, empieza a las `2026-11-07 00:00:00` UTC.

## Reglas de negocio

- **RN-01 (zona única):** La zona de negocio es `arca.timezone`, leída de `ARCA_TIMEZONE`, con valor por defecto y de producción `America/Mexico_City`. Sustituye a `arca.report_timezone` y `arca.public_timezone`, que se retiran.
- **RN-02 (día del zoológico):** Todo cálculo de «hoy», día, semana, mes, rango, día de cancelación y visibilidad pública usa `arca.timezone`. Son: `BuildDashboardSummaryAction`, `ResolveReportPeriodAction`, `ExportTicketReportAction`, `PresentTicketRow`, `ListTicketHistoryAction`, `IsTicketCancellableAction`, el reporte de cancelaciones de `api-022` y `App\Support\PublicCalendar::today()` (visibilidad de noticias y eventos).
- **RN-03 (instantes en UTC):** Los instantes se guardan y se responden en UTC en formato ISO 8601 (`api-009` CA-29). La zona solo se aplica para construir días y rangos, y para el texto `Y-m-d H:i:s` del listado y de la exportación (`api-007` RN-14).
- **RN-04 (el cliente no elige zona):** `ResolveRequestedTimezoneAction` deja de leer la zona del cliente. Ningún endpoint de esta spec la acepta como entrada de negocio ni responde `422` por ella. Si llega, se ignora sin efectos.
- **RN-05 (zona informada):** Las respuestas indican `arca.timezone` como dato informativo (`timezone` en panel e historial, `period.timezone` en reporte). Es el único valor que la API devuelve; no depende del dispositivo.
- **RN-06 (conexión en UTC):** La conexión `mysql` fija su zona de sesión en UTC mediante la configuración de `config/database.php` y la variable `DB_TIMEZONE` (por defecto `+00:00`). Es configuración de conexión: no crea ni cambia tablas. Debe anotarse en `infra/README.md` como requisito de ambiente en el PR de implementación.
- **RN-07 (sin horario de verano):** `America/Mexico_City` no tiene horario de verano desde 2022; la zona es UTC-6 todo el año. Es dato de contexto: la API usa las reglas IANA de la zona configurada y no añade lógica especial.
- **RN-08 (datos existentes):** Esta spec no reescribe ni convierte filas guardadas. Se asume que los instantes ya guardados están en UTC; esa suposición se verifica antes de desplegar (ver riesgos).
- **RN-09 (un único punto de lectura):** La zona se lee en un único punto de la API (Action o servicio de soporte), no con `config()` repetido en cada Action (`api-011` RN-10).
- **RN-10 (sin cambio de contratos de datos):** Solo cambian el origen de la zona y la aceptación del parámetro `timezone`. Los totales, las formas de respuesta y los permisos no cambian, salvo lo que ya cubre `api-022`.
- **RN-11 (memoria semanal; P-02, enmienda técnica 2026-11-20):** `WeeklyMemoryLimitException` (`api-010` CA-23) formatea la fecha del límite con `BusinessTimezone::name()`, es decir, con `arca.timezone`. Se corrige la referencia a `APP_TIMEZONE` de `apps/api/docs/momentos-contrato-para-mobile.md` (tarea).
- **RN-12 (precios programados; P-03, enmienda técnica 2026-11-20):** La hora de «entrada en vigor» (`effective_at`) de `POST /api/v1/admin/ticket-prices` se interpreta en `arca.timezone` cuando llega sin desfase. Es un cambio de contrato de `api-009` CA-18 y CA-19 (anotado en su nota de revisión). El dashboard deja de calcular el desfase del navegador (`dashboard-019` RN-06).
- **RN-13 (zona en recibo y precios; P-04, enmienda técnica 2026-11-20):** El recibo de venta y las respuestas de precios vigentes informan `timezone` con `arca.timezone`, igual que el historial (CA-12).

## Datos, privacidad y auditoría

- No se crean ni se modifican datos personales ni datos clínicos o financieros nuevos. El reporte y el historial siguen siendo de solo lectura.
- **Requiere DBR:** no. No hay cambio de tablas, columnas, índices, funciones ni procedimientos. El cambio de zona de sesión es configuración de conexión (`docs/database/README.md`: conectar y configurar sin alterar el esquema no requiere DBR).
- Activitylog: sin cambios. Un cambio de `ARCA_TIMEZONE` o `DB_TIMEZONE` es un cambio de despliegue; no se registra como acción de usuario.
- SoftDeletes: sin cambios.

**Estado actual (consulta en solo lectura, 2026-11-20, sesión principal sobre `arca_pruebas` en Aiven):**

- `@@global.time_zone = SYSTEM`
- `@@session.time_zone = SYSTEM`
- `@@system_time_zone = UTC`

Conclusión: en Aiven el sistema opera en UTC, pero la aplicación no fija la zona de sesión. Un MySQL local puede tener otra zona y desfasar las columnas `TIMESTAMP` con `CURRENT_TIMESTAMP` (por ejemplo `tickets.purchased_at`). Producción (`arca_zoo`) no se consulta desde agentes; su zona se verifica por el responsable de operaciones (pregunta 4).

## Flujos y errores

**Flujo principal:**

1. El cliente llama panel, reporte, exportación, historial, cancelación o noticias y eventos, con o sin `timezone`.
2. La API ignora `timezone` (RN-04) y lee `arca.timezone` en su único punto (RN-09).
3. La Action calcula día, rango o vigencia en esa zona y convierte los instantes solo para ese cálculo (RN-03).
4. La respuesta informa `timezone` con `arca.timezone` (RN-05, CA-12).
5. El dashboard presenta las fechas en esa zona (`dashboard-019`).

**Errores y casos alternos:**

- Un `timezone` del cliente, válido o no, nunca produce `422` ni cambia el resultado (CA-10).
- Una cancelación fuera del día del zoológico se rechaza como hoy (`api-009` RN-16); el mensaje no cambia.
- Cambiar `ARCA_TIMEZONE` requiere que la configuración se relea en el ambiente (en Laravel, limpiar o regenerar la caché de configuración). Sin ello, la API sigue con la zona anterior. Va al checklist de `infra/README.md`.
- Una zona de negocio no válida en `.env`: comportamiento pendiente (pregunta 2).
- Error de base de datos: sin cambios (`500`).

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:** ninguna dependencia nueva ni ADR nuevo. Cumple la Constitución I (zona por `.env`, portable entre Aiven y local). Relacionadas: `api-007` (RN-14 y CA-28 sustituidas), `api-009` (RN-16, CA-31; CA-29 sigue en UTC), `api-011` (RN-14 con la llave única), `api-021` (previa), `api-022` (posterior, usa esta zona), `dashboard-019` (consumidora), `api-006` (RN-12 ya cambiada por `api-011`).
- **Riesgos:**
  - **Pruebas que envían `timezone` como zona de negocio:** entre otras, `tests/Feature/Admin/ReportTimezoneTest.php`, `tests/Feature/Tickets/TicketCancellableZoneTest.php`, `tests/Feature/Tickets/CancelTicketSameDayTest.php`, `tests/Feature/Tickets/TicketHistoryTest.php`, `tests/Feature/Tickets/TicketDatesTest.php`, `tests/Feature/Admin/TicketReportExportTest.php`, `tests/Feature/Catalog/PublicNewsTest.php` y `tests/Feature/Catalog/PublicEventsLimitTest.php`. Deben ajustarse para CA-10 y CA-13; el plan decide cuáles cambian.
  - **Historial con fecha de compra en UTC:** `api-019` (búsqueda global, grupo de historial) muestra «Fecha de compra» con `config('app.timezone')`, que es UTC. Debe pasar a `arca.timezone`. Es una divergencia que esta spec obliga a corregir.
  - **Cambio de cifras:** un usuario que hoy consulta desde otra zona verá cortes distintos al desplegar. Conviene avisar antes del despliegue.
  - **Datos guardados:** si algún ambiente tiene datos guardados con otra zona de sesión, los días de esas filas cambian al leerlas (RN-08). Verificar antes de desplegar.
  - **Compatibilidad del cliente:** clientes que siguen enviando `timezone` no se rompen, porque la API lo ignora (CA-10). El api-client y el dashboard lo dejan de enviar en `dashboard-019`.
  - **Impacto en otras apps (sin spec aquí):** `apps/web` (fechas de noticias y eventos del portal, `web-009`), `apps/mobile` (horas de corte de eventos, `mobile-003`) y `apps/pwa` (no revisada) deben confirmar si muestran horas o días; si lo hacen, requieren su propia revisión.
  - **Configuración de ambiente:** `ARCA_TIMEZONE` y `DB_TIMEZONE` se anotan en `infra/README.md` en el PR de implementación (AGENTS.md raíz: requisitos de ambiente).
- **Preguntas pendientes:**
  1. ¿El historial de taquilla (`api-009`) debe incluir `timezone` en su respuesta? Propuesta: sí (CA-12), para que el dashboard presente fechas sin depender del navegador. Si no, `dashboard-019` necesita otra fuente de la zona.
  2. ¿Un `ARCA_TIMEZONE` vacío o no válido debe impedir el arranque de la API, o caer a `America/Mexico_City`? Esta decisión no está cubierta por las ocho decisiones cerradas; no bloquea los CA-01 a CA-13.
  3. ¿La conexión `mysql2` de `settings_colores` (solo lectura) también debe fijar UTC? Propuesta: sí, sin escribir nada en esa tabla.
  4. Verificación de datos: ¿el responsable de operaciones confirma la zona de sesión y que los `purchased_at` guardados en producción están en UTC antes de desplegar? Los agentes no consultan `arca_zoo`.
  5. **(P-03b, abierta.)** ¿Un `effective_at` con desfase explícito (por ejemplo `+05:00`) sigue aceptándose en `POST /api/v1/admin/ticket-prices`, además de la hora sin desfase de RN-12? Pendiente de confirmar antes de implementar T-02 del dashboard (`dashboard-019` T-10).

## Revisión

- Aprobadores y fecha: Jonathan, 2026-11-20 (decisiones cerradas 1 a 8: UTC en almacenamiento; llave única `arca.timezone` con `ARCA_TIMEZONE` y valor `America/Mexico_City`; uso en panel, reporte, exportación, historial, cancelación, reporte de cancelaciones y visibilidad pública; API ignora `timezone`; dashboard presenta en la zona de la API; conexión MySQL en UTC; sin horario de verano; orden tras `api-021` y antes de `api-022`).
- Evidencia/enlaces: `apps/api/src/config/arca.php` (llaves `report_timezone` y `public_timezone`, ambas `America/Mexico_City`); `app/Support/PublicCalendar.php`; `app/Actions/Admin/Reports/ResolveRequestedTimezoneAction.php`; `app/Actions/Admin/Reports/BuildDashboardSummaryAction.php`; `app/Actions/Admin/Reports/ResolveReportPeriodAction.php`; `app/Actions/Admin/Reports/ExportTicketReportAction.php`; `app/Actions/Admin/Reports/PresentTicketRow.php`; `app/Actions/Admin/Tickets/ListTicketHistoryAction.php`; `app/Actions/Admin/Tickets/IsTicketCancellableAction.php`; `config/app.php` (`timezone` = `UTC`); `docs/database/README.md`; consulta de zona de sesión de `arca_pruebas` del 2026-11-20 (resultado en «Estado actual»).
- Estado: Aprobada. Plan y tasks aprobados por Jonathan el 2026-11-20. Enmienda técnica 2026-11-20: CA-12 (P-04), CA-13 (rango a CA-16 y CA-08 diferido a `api-022`), CA-14 a CA-16 nuevos, RN-11 a RN-13 nuevos, decisión 3 retirada (P-01).

## Decisiones finales 2026-11-20 (Jonathan)
1. El historial de taquilla (`api-009`) incluye `timezone` en su respuesta (CA-12).
2. Si `ARCA_TIMEZONE` está vacío o no es una zona válida, la API no arranca y muestra un error claro en español; no hay respaldo silencioso.
3. *(Retirada el 2026-11-20, P-01.)* La conexión `mysql2` (`settings_colores`) no existe en el código de la API, así que esta spec no la configura. Cuando exista, su zona de sesión se fija en UTC en el cambio que la cree, sin escribir en `settings_colores`.
4. Antes de desplegar, el responsable de operaciones verifica la zona de sesión de `arca_zoo` y que los `purchased_at` guardados estén en UTC; los agentes no consultan `arca_zoo`.
