# 009 · offline-first-sync

- App dueña: `pwa`
- Apps/paquetes afectados: `pwa`, `api` (contratos de sincronización, delta, idempotencia y confirmaciones), `packages/api-client` (si requiere adaptación de cliente/sync), `docs/database` (DBR si hay cambios de esquema)
- Estado: Aprobada
- Solicitante / responsable funcional: Solicitante (usuario)
- Aprobación funcional: Solicitante (usuario), 2026-11-18 (reaprobada con ajustes de interfaz Sync, prioridad animales→diagnósticos, mensajes efímeros y alcance de altas sin foto)

## Problema y contexto

La PWA veterinaria se utiliza en trabajo de campo con conectividad limitada o intermitente. Actualmente el acceso, la consulta de catálogos y el guardado de registros dependen de conexión con la API, lo que impide operar de forma continua y expone a pérdida de captura cuando no hay red.

Se requiere habilitar un modo **offline-first** que permita consultar información operativa y registrar evaluaciones clínicas sin Internet, conservar los datos locales hasta su confirmación por el servidor y sincronizarlos de forma confiable al recuperar conectividad. La API y MySQL siguen siendo la fuente de verdad; los datos locales son borradores/snapshots sujetos a validación y confirmación del servidor (Constitución V y `apps/pwa/AGENTS.md`).

`docs/adr/0003-mysql-y-pwa-offline.md` está en estado Propuesto y plantea IndexedDB, borradores y sincronización con validación en API; esta spec concreta las decisiones del MVP y los impactos que requieren alineación de ADR, contratos API y posibles DBR.

## Objetivos

- Permitir que el personal veterinario consulte **animales y recintos** y registre **múltiples evaluaciones clínicas** sin conexión, sin pérdida de información.
- Garantizar una sincronización confiable e idempotente al iniciar/reanudar la app, al recuperar conectividad y bajo demanda manual, priorizando la subida de animales antes que diagnósticos dependientes e informando el estado/resultados en una interfaz de sincronización y avisos dentro de la app.
- Mantener la autoridad de la API/MySQL: todo registro sincronizado se valida y confirma en servidor; ningún dato local se considera definitivo sin confirmación.
- Reducir descargas innecesarias mediante bootstrap completo inicial y sincronización incremental (delta) en reconexiones posteriores.

## Fuera de alcance

- Notificaciones del sistema operativo, Web Push e historial persistente de notificaciones fuera de la app.
- Creación offline de animales con fotografías o subida diferida de archivos/adjuntos en el MVP (la gestión offline de archivos queda para una fase posterior).
- Edición/eliminación offline de registros históricos ya confirmados, salvo que una spec posterior lo defina explícitamente.
- Reemplazar Vite PWA o modificar `docs/adr/0003-mysql-y-pwa-offline.md` sin justificación técnica y aprobación correspondiente.
- Agenda automática de revisiones y resolución automática de conflictos clínicos.
- Cambios de esquema aplicados por agentes/clientes; cualquier cambio de BD se tramita por DBR y lo ejecuta el responsable de BD.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Personal veterinario autenticado (staff) | Iniciar sesión, consultar catálogos offline, registrar evaluaciones clínicas sin red y sincronizarlas | Sesión staff válida (Sanctum/cookie) y permisos API vigentes para consulta de animales/recintos (y catálogos necesarios) y registro de evaluaciones clínicas (`staff/clinical-evaluations` y endpoints relacionados) |

## Historias de usuario

- Como personal veterinario, quiero que al iniciar sesión se descarguen los datos operativos necesarios, para consultar animales y recintos aunque después pierda conexión.
- Como personal veterinario, quiero registrar múltiples evaluaciones clínicas sin Internet, para no perder capturas durante el trabajo de campo.
- Como personal veterinario, quiero que las evaluaciones pendientes se sincronicen automáticamente y pueda forzar una sincronización manual, para confirmar mis registros cuando haya conectividad.
- Como personal veterinario, quiero ver en una interfaz de la app los registros pendientes de subida (altas de animales y evaluaciones clínicas), para saber qué falta por sincronizar y su estado.
- Como personal veterinario, quiero que al detectar internet la app suba automáticamente los pendientes respetando la prioridad (primero animales y después diagnósticos que dependan de ellos), para mantener la integridad de los datos.
- Como personal veterinario, quiero recibir mensajes efímeros al iniciar sesión o reanudar la app con el resumen de información pendiente de subida, para estar informado del proceso.
- Como personal veterinario, quiero que los registros locales no se pierdan ni se dupliquen aunque haya reintentos, cierres de app o cambios de conexión, para confiar en el proceso.

## Criterios de aceptación

- **CA-01 (Bootstrap inicial con conexión):** Dado un inicio de sesión exitoso con conectividad, cuando la app completa el bootstrap, entonces almacena localmente (separado por usuario/organización) el perfil mínimo necesario para operar en campo (incluido nombre/MVZ para formularios) y una descarga completa inicial de los catálogos operativos requeridos por el MVP (animales y recintos, y datos asociados necesarios para los flujos clínicos offline definidos), junto con metadatos de sincronización (p. ej. última sincronización/cursor de referencia).
- **CA-02 (Consulta offline tras bootstrap):** Dado un dispositivo con bootstrap completo, cuando no hay conexión, entonces el usuario puede abrir la app (app shell disponible), consultar animales y recintos almacenados localmente y acceder a los formularios de evaluación clínica del alcance MVP sin depender de red para la lectura de esos catálogos.
- **CA-03 (Registro offline de evaluaciones y animales):** Dado que no hay conexión, cuando el usuario registra una o múltiples evaluaciones clínicas válidas y/o un alta de animal permitida en modo offline (sin fotografía/adjuntos en MVP), entonces cada registro se guarda localmente como borrador/pendiente con un UUID local, se encola para sincronización sin pérdida de datos y queda visible en la interfaz de sincronización con estado no confirmado (sin prometer guardado definitivo en servidor). En el MVP, las altas de animales sin foto forman parte de la cola de subida y se sincronizan antes que los diagnósticos dependientes.
- **CA-04 (Sincronización automática y manual sin concurrencia):** Dado que existen registros pendientes y hay conectividad, cuando la app inicia/reanuda o recupera conexión, entonces el Sync Manager intenta sincronizar automáticamente; además el usuario puede iniciar sincronización manual. En ningún caso se ejecutan sincronizaciones concurrentes para la misma cuenta/dispositivo.
- **CA-05 (Backoff y reintentos):** Dado un fallo temporal de red/servidor durante la sincronización, cuando ocurre el fallo, entonces el Sync Manager reintenta con backoff exponencial (5 s, 15 s, 30 s, 1 min, 5 min y luego cada 15 min), sin límite fijo mientras existan pendientes, sin borrar datos locales y sin bloquear la captura local.
- **CA-06 (Sincronización incremental/delta):** Dado un bootstrap previo exitoso, cuando la app se reconecta y sincroniza catálogos, entonces solicita cambios desde la última sincronización (altas, modificaciones y bajas) usando el mecanismo incremental soportado por la API, aplicando paginación cuando el volumen lo requiera, en lugar de realizar siempre una descarga completa.
- **CA-07 (Bajas del servidor):** Dado un registro eliminado/baja en servidor expuesto mediante `deleted_at` o tombstone equivalente, cuando el cliente aplica el delta, entonces refleja la baja en los catálogos/vistas operativas correspondientes sin eliminar información histórica de evaluaciones clínicas ni registros locales pendientes cuya resolución deba conservarse.
- **CA-08 (Idempotencia y no duplicación):** Dado que una operación de sincronización se reintenta o se envía más de una vez, cuando la API recibe la misma operación identificada por UUID, entonces el sistema no genera duplicados y devuelve confirmación individual por registro recibido; el cliente marca cada operación como sincronizada solo tras confirmación exitosa del servidor.
- **CA-09 (Prioridad/dependencias de sincronización):** Dado el diseño de cola con dependencias, cuando exista una entidad padre pendiente requerida por registros dependientes (p. ej. alta offline de animal en un alcance futuro y sus diagnósticos), entonces la sincronización respeta el orden padre→dependientes, reasigna el identificador confirmado del servidor antes de enviar dependientes y mantiene bloqueados los dependientes mientras el padre no esté confirmado. En el MVP, las evaluaciones clínicas offline se asocian a animales/recintos consultados del catálogo sincronizado.
- **CA-10 (Errores de validación/permisos y conflictos):** Dado que la API rechaza un registro por validación, permisos u otro error no temporal, cuando se recibe la respuesta, entonces la operación no se reintenta automáticamente como temporal, se marca para corrección/intervención manual, se conserva el registro local, se muestra en la interfaz de sincronización y/o mediante aviso el estado y mensaje claro en español, y no se sobrescriben automáticamente evaluaciones clínicas. Los conflictos/errores no impiden la sincronización de otros registros independientes.
- **CA-11 (Interfaz de sincronización y prioridad de subida):** Dada la existencia de registros locales en cola (altas de animales y evaluaciones clínicas), cuando el usuario accede al menú **Sync** de la PWA, entonces puede ver una tabla/listado con tipo de registro, referencia/identificador local, fecha, estado (pendiente, bloqueado por dependencia, subiendo, sincronizado, error/conflicto), intentos/último resultado y, cuando aplique, acción de reintento. Al detectar conectividad, la app inicia automáticamente la subida respetando prioridad **primero animales y después diagnósticos dependientes**. Al confirmarse cada subida, la app muestra mensajes efímeros dentro de la app (p. ej. “Se ha subido el registro del animal…” / “Se ha subido el diagnóstico…”). Al iniciar sesión o reanudar la app con pendientes, se muestran mensajes efímeros con un resumen de la información pendiente de subida (indicando prioridad de animales). No hay configuración para activar/desactivar estos avisos. Plataforma prioritaria: Chrome/Android.
- **CA-12 (Sesión, aislamiento y retención):** Dado el almacenamiento local, cuando se usa la app, entonces los datos y la cola se aíslan por usuario/organización. Al cerrar sesión no se eliminan automáticamente registros pendientes (si existen, se informa al usuario antes de acciones destructivas de sesión local); al cambiar de usuario o en contexto de dispositivo compartido se impide el acceso a datos del usuario anterior y se eliminan los avisos/notificaciones locales y cualquier estado de UI efímero asociado al usuario anterior. Los borradores/pendientes se conservan hasta sincronización o resolución explícita y no existe caducidad automática que provoque pérdida de información.
- **CA-13 (Registro sin foto y adjuntos):** Dado el flujo de alta/gestión de animales en este alcance, cuando se registra un animal sin conexión o se difiere la imagen, entonces la información esencial del animal (sin fotografía) puede guardarse/encolarse y sincronizarse primero según prioridad; la fotografía no se sube de forma diferida en la cola offline del MVP y se gestiona como una opción posterior en el perfil del animal (cuando haya conectividad y el flujo lo permita). La UI comunica claramente esta limitación cuando corresponda.
- **CA-14 (Pruebas):** Dada la suite automatizada, entonces existe al menos una prueba por cada CA aplicable a la implementación (PWA y, cuando corresponda, API), cubriendo casos de offline, cola/reintentos, idempotencia, delta/bajas, avisos/configuración y aislamiento/retención.

## Reglas de negocio

- **RN-01 (Autoridad del servidor):** La API y MySQL son la fuente de verdad. Un registro local solo pasa a confirmado cuando el servidor lo valida y responde éxito; la UI debe distinguir “pendiente/no confirmado” de “confirmado”.
- **RN-02 (Sin pérdida de datos):** Ningún fallo de red, error temporal, cierre de app, reintento o reconexión debe eliminar capturas locales pendientes; los datos se conservan hasta sincronización exitosa o resolución explícita.
- **RN-03 (Stack offline aprobado para diseño):** El almacenamiento local se implementa con IndexedDB mediante Dexie.js; los identificadores locales/idempotencia usan UUID. Se mantiene el Service Worker según la solución ya contemplada/aprobada en ADR 0003; no se sustituye Vite PWA ni se modifica ADR 0003 sin justificación técnica y aprobación.
- **RN-04 (Política de sincronización):** Sincronización automática al recuperar conexión y al iniciar/reanudar la app, más disparo manual. Backoff exponencial 5 s, 15 s, 30 s, 1 min, 5 min y luego cada 15 min; reintentos sin límite fijo mientras existan pendientes, evitando ejecuciones simultáneas del Sync Manager.
- **RN-05 (Catálogos y delta):** Bootstrap con descarga completa inicial al iniciar sesión. Reconexiones usan sincronización incremental desde la última sincronización (delta en MVP) con paginación cuando aplique. La API debe soportar consulta de cambios desde la última sync.
- **RN-06 (Bajas/tombstones):** La API expone bajas mediante `deleted_at` o tombstone equivalente. El cliente aplica bajas en catálogos/vistas operativas sin eliminar información histórica de evaluaciones clínicas.
- **RN-07 (Idempotencia):** El backend acepta UUID como identificador único de operación/registro cliente para evitar duplicados en reintentos y aplica restricciones de unicidad en BD; responde confirmación individual por registro recibido. Aplica a diagnósticos y a futuras altas offline de animales.
- **RN-08 (Conflictos y errores no temporales):** No sobrescribir automáticamente evaluaciones clínicas. Errores temporales se reintentan; errores de validación/permisos se marcan para corrección o intervención manual. El registro local se conserva hasta resolución.
- **RN-09 (Dependencias de cola):** Las operaciones dependientes se sincronizan solo después de confirmar su entidad padre (orden padre→dependientes) y con el identificador definitivo del servidor.
- **RN-10 (Aislamiento y retención):** Datos locales separados por usuario/organización. No borrar pendientes automáticamente al cerrar sesión (informar si hay no sincronizados). Al cambiar de usuario o en dispositivo compartido, impedir acceso a datos del usuario anterior y eliminar avisos/estado efímero local del usuario anterior. Sin caducidad automática que cause pérdida de información de registros pendientes.
- **RN-11 (Interfaz y avisos de sincronización):** Debe existir un menú **Sync** en la PWA con tabla/listado de registros pendientes y su estado (animales y diagnósticos/evaluaciones). Al detectar conectividad se inicia la subida automática con prioridad **animales antes que diagnósticos dependientes**. Al confirmarse cada subida se muestran mensajes efímeros en la app identificando el registro subido (animal o diagnóstico). Al iniciar sesión o reanudar con pendientes se muestran mensajes efímeros de resumen (indicando prioridad de animales). No existe configuración para desactivar estos avisos. Sin Web Push ni notificaciones del sistema. Plataforma prioritaria: Chrome/Android.
- **RN-12 (Foto de animal y adjuntos):** La información esencial del animal se sincroniza sin requerir fotografía en la cola offline. La fotografía no se gestiona como adjunto diferido en la sincronización offline del MVP; su captura/carga se resuelve como opción en el perfil del animal según el flujo aprobado (requiere conectividad cuando implique subida al servidor). Sin subida diferida de otros adjuntos/archivos en MVP.

## Datos, privacidad y auditoría

- **Datos locales (cliente, IndexedDB/Dexie o almacenamiento local equivalente):** perfil mínimo operativo (p. ej. nombre/MVZ e identificadores necesarios), catálogos sincronizados (animales, recintos y datos asociados requeridos), altas de animales (sin foto en cola offline) y evaluaciones clínicas en borrador/pendientes, cola de operaciones, mapa `local_id (UUID) -> server_id`, metadatos de sincronización (cursores/fechas, intentos, estados, errores). Las fotografías de perfil se gestionan fuera de la cola de sincronización offline del MVP.
- **Datos servidor (existentes/impactados):** evaluaciones clínicas y entidades de catálogo ya gestionadas por la API/MySQL; posible incorporación de identificadores de idempotencia/UUID de cliente y soporte de delta/bajas según contrato aprobado.
- **Privacidad y seguridad:** datos clínicos pueden residir temporalmente en dispositivos compartidos; la implementación debe minimizar exposición (aislamiento por cuenta, limpieza/control de acceso al cambiar usuario, eliminación de notificaciones/preferencias del usuario anterior en dispositivo compartido, no registrar datos sensibles en logs) y la spec/plan debe definir medidas adicionales de protección/retención antes de implementar. No se almacenan credenciales.
- **Auditoría y autoridad:** los registros confirmados quedan sujetos a las reglas de auditoría/SoftDeletes y validación del servidor vigentes; el historial clínico no se elimina por sincronización de bajas de catálogo.
- **Esquema/DB:** **puede requerir DBR** para soportar `deleted_at`/tombstones consistentes, campos/índices para delta (`updated_at`/cursor), restricciones de unicidad para UUID/idempotencia u otros cambios necesarios. Ningún esquema se modifica sin DBR aprobada y ejecución por responsable de BD (`docs/database/requests/DBR-NNN-slug.md`).

## Flujos y errores

1. **Inicio de sesión y bootstrap (online):** autenticar → descargar perfil y catálogos completos (animales/recintos y datos requeridos) → persistir localmente con metadatos de sync → habilitar modo offline. Si hay pendientes, mostrar mensajes efímeros de resumen (priorizando animales).
2. **Trabajo offline:** consultar catálogos locales → completar alta de animal (sin foto, si aplica) y/o evaluación clínica → guardar localmente con UUID y estado pendiente → encolar operación respetando dependencias (animal antes que diagnóstico dependiente).
3. **Sincronización automática:** al iniciar/reanudar o detectar conectividad → Sync Manager (exclusivo) toma pendientes elegibles → sube **primero animales** y luego diagnósticos dependientes → envía con UUID → recibe confirmación individual → actualiza estado/mapeo, muestra mensaje efímero por registro subido y actualiza la interfaz de sincronización.
4. **Interfaz de sincronización (menú Sync):** el usuario consulta tabla/listado de registros pendientes (tipo, referencia, fecha, estado, intentos/resultado, reintento cuando aplique) y puede disparar sincronización manual.
5. **Reconexión con delta:** solicitar cambios desde última sync (paginado si aplica) → aplicar upserts y bajas (`deleted_at`/tombstone) → actualizar cursor/fecha.
6. **Fallo temporal (red/timeout/5xx):** mantener datos, marcar intento fallido, programar reintento con backoff, permitir otros registros independientes.
7. **Error no temporal (422/403/409 u equivalente):** no reintento automático, marcar para intervención manual, conservar local, mostrar causa en español en interfaz/aviso, no sobrescribir evaluaciones clínicas.
8. **Conflicto/concurrencia:** no resolver automáticamente sobre datos clínicos; conservar versión local y requerir revisión/resolución definida.
9. **Sesión/cambio de usuario:** al cerrar sesión con pendientes informar al usuario; al cambiar de usuario o en dispositivo compartido bloquear acceso al almacén anterior y eliminar avisos/estado efímero del usuario anterior.
10. **MVP sin adjuntos offline:** intento de flujo que requiera foto/adjunto offline → impedir guardado offline de ese caso o informar limitación, sin prometer subida diferida.

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:**
  - `docs/adr/0003-mysql-y-pwa-offline.md` (Propuesto): base de borradores offline e IndexedDB/Service Worker; mantener alineación sin sustituciones no justificadas.
  - ADR nuevo o actualización requerida para aprobar explícitamente **Dexie.js** y **UUID** como dependencias/decisiones de implementación y el diseño de Sync Manager/outbox (dado que ADR 0003 menciona `idb`/`vite-plugin-pwa` como candidatos).
  - Contratos API a definir/extender: bootstrap de catálogos, delta incremental con cursor/fecha y paginación, exposición de bajas (`deleted_at`/tombstone), recepción idempotente de operaciones con UUID y confirmación individual.
  - Posibles DBR para soportar delta, bajas consistentes y unicidad de idempotencia.
  - Sin Web Push ni notificaciones del sistema en este alcance; plataforma prioritaria Chrome/Android.
- **Riesgos:**
  - Duplicados o inconsistencias si falta idempotencia/atomicidad en API o cliente.
  - Divergencia de catálogos si el delta no cubre correctamente bajas, paginación o filtros por permisos.
  - Exposición de datos clínicos en dispositivos compartidos si no se aplican aislamiento y controles de retención adecuados.
  - Crecimiento de almacenamiento local (colas/borradores) sin limpieza tras confirmación/resolución.
  - Complejidad de dependencia padre→dependiente (altas de animales offline y diagnósticos asociados) y necesidad de mapeo correcto `local_id -> server_id`.
  - Catálogos sin `deleted_at`/SoftDeletes (p. ej. animales/recintos, según estado actual del esquema) pueden requerir DBR/contrato para exponer bajas de forma inequívoca en delta.
- **Preguntas pendientes (para plan/ADR/contrato API):**
  - Estructura exacta del endpoint/protocolo de delta (cursor, `updated_since`, formato de tombstones, paginación y orden) y soporte de bajas para **animales, recintos y especies** según permisos.
  - Forma de confirmación individual de API (por operación/UUID) y semántica ante reenvíos parciales.
  - Definición precisa de “datos asociados requeridos” a incluir en bootstrap para diagnósticos intenso/rápido y perfiles consultados offline.
  - Comportamiento ante expiración de sesión en campo: ¿se permite seguir capturando offline y sincronizar tras reautenticación?
  - Estrategia de limpieza de registros ya sincronizados/errores resueltos en almacenamiento local (conservando trazabilidad necesaria sin provocar pérdida).
  - Contrato API de creación idempotente para **altas de animales offline (sin foto)** (confirmado en alcance MVP) y comportamiento de reintento/corrección de errores de validación desde la interfaz de sincronización (menú `Sync`).
  - Flujo exacto de carga/actualización de fotografía en el perfil del animal (acción online, fuera de cola offline del MVP) y su impacto en specs/contratos de animales (`004`/`010`).

## Revisión

- Aprobadores y fecha: Solicitante (usuario), 2026-11-18 (aprobación funcional y reaprobación de ajustes)
- Evidencia/enlaces: `apps/pwa/AGENTS.md`, `docs/adr/0003-mysql-y-pwa-offline.md`, `apps/pwa/specs/004-animal-registration.md`, `apps/pwa/specs/008-seguimiento-revisiones.md`, decisiones proporcionadas por el solicitante (2026-11-18)
