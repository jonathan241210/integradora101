# Plan técnico · 009 · offline-first-sync

- Spec: `apps/pwa/specs/009-offline-first-sync.md`
- Estado de spec: Aprobada
- Responsable técnico: Por definir (PWA + API; coordinación con responsable de BD para DBR)

## Diseño de solución

Se implementa un modo offline-first para la PWA veterinaria con **almacenamiento local en IndexedDB (Dexie.js)**, **cola/outbox con UUID e idempotencia**, **Service Worker** para disponibilidad del app shell y **Sync Manager** exclusivo (sin concurrencia) con sincronización automática (inicio/reanudación/reconexión), manual y backoff definido. La API y MySQL siguen siendo la única fuente de verdad: los registros offline son borradores/operaciones pendientes hasta confirmación individual del servidor.

**MVP (alcance, según spec):** bootstrap al login con descarga completa de **animales y recintos** (y datos asociados requeridos para operar los flujos clínicos offline), consulta offline de esos catálogos, registro offline de **múltiples evaluaciones clínicas** y, si se confirma en alcance, altas de animales offline **sin fotografía/adjuntos**, con interfaz de sincronización (tabla/listado) y avisos efímeros de resumen. Sin fotos/adjuntos offline ni Web Push/notificaciones del sistema.

**Estrategia de datos:**
- **Bootstrap (online, al login):** perfil mínimo operativo (nombre/MVZ, identificadores necesarios) + catálogos completos + metadatos (`lastSyncAt`, cursores/versión de esquema local), aislados por usuario/organización.
- **Delta (reconexiones):** solicitud incremental desde la última sincronización con paginación; aplica upserts y bajas (`deleted_at`/tombstone) sin eliminar historial clínico.
- **Outbox:** operaciones persistidas con UUID, estado (`pending|blocked|syncing|synced|error|conflict`), intentos, dependencias y mapeo `local_id -> server_id`; soporta dependencia padre→dependiente (animal→diagnóstico), priorizando subida de animales antes que diagnósticos dependientes.
- **Visibilidad:** interfaz de sincronización con tabla/listado de pendientes y estados, más mensajes efímeros de resumen al iniciar sesión/reanudar (prioridad de animales). Sin Web Push/notificaciones del sistema.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| PWA / almacenamiento local | `apps/pwa/src/offline/db.ts` (nuevo), `apps/pwa/src/offline/schema.ts` (nuevo) | Base Dexie.js, versionado de esquema local, tablas por usuario/organización (catálogos, perfil, evaluaciones pendientes, outbox, id_map, metadatos de sync, preferencias de avisos). |
| PWA / bootstrap y catálogos | `apps/pwa/src/offline/bootstrap.ts`, `apps/pwa/src/offline/catalog-sync.ts`, `apps/pwa/src/viewmodels/useApiData.ts`, `apps/pwa/src/viewmodels/useStaffSession.ts` | Descarga completa inicial al login; lectura desde store local en modo offline; delta incremental en reconexión; aplicación de upserts/bajas. |
| PWA / cola y sincronización | `apps/pwa/src/offline/outbox.ts`, `apps/pwa/src/offline/sync-manager.ts`, `apps/pwa/src/offline/id-map.ts` | Encolado transaccional con UUID, ejecución exclusiva, backoff (5s,15s,30s,1m,5m,luego 15m), reintentos sin límite fijo para temporales, mapeo `local->server`, resolución de dependencias padre→dependiente. |
| PWA / evaluaciones offline | `apps/pwa/src/services/apiClient.ts`, `apps/pwa/src/viewmodels/useApiData.ts`, `apps/pwa/src/views/DiagnosisIntenseView.tsx`, `apps/pwa/src/views/DiagnosisQuickView.tsx`, `apps/pwa/src/views/ReviewFormView.tsx` (si aplica) | Guardar evaluación local pendiente con UUID cuando no hay red o falla elegible, encolar operación, mostrar aviso no confirmado y distinguir estado local vs confirmado. |
| PWA / interfaz de sincronización y avisos | `apps/pwa/src/views/SyncStatusView.tsx` (o sección/menú `Sync`), `apps/pwa/src/offline/notifications.ts`, componentes de tabla/listado/toast | Tabla/listado de pendientes (animales y evaluaciones), estados, errores y reintentos; mensajes efímeros por subida confirmada y resumen al iniciar/reanudar; disparo manual de sync. Sin Web Push ni configuración de avisos. |
| PWA / conectividad y SW | `apps/pwa/src/main.tsx`, `apps/pwa/public/sw.js` (o módulo SW equivalente), `apps/pwa/src/offline/register-sw.ts`, `apps/pwa/vite.config.ts`/build según diseño | Registro de Service Worker para app shell offline (alineado a ADR 0003, sin sustituir Vite PWA), detección online/offline, disparos de sync en inicio/reanudación/reconexión y acción manual. |
| PWA / sesión y aislamiento | `apps/pwa/src/viewmodels/useStaffSession.ts`, utilidades de limpieza de almacén por cuenta | Aislamiento por usuario/organización, limpieza de avisos/preferencias del usuario anterior al cambiar cuenta, conservación de pendientes al cerrar sesión con aviso informativo. |
| PWA / dependencias y manifiestos | `apps/pwa/package.json`, lockfile correspondiente | Agregar `dexie` y librería/utilidad `uuid` (y tipos si aplica) solo tras aprobación de ADR/spec correspondiente; sin dependencias redundantes. |
| Paquetes compartidos (opcional) | `packages/api-client/*` | Tipos/funciones para endpoints de bootstrap, delta y sync idempotente si se decide centralizar contrato; alternativamente, extender `apps/pwa/src/services/apiClient.ts`. |
| API / contratos de sync | `apps/api/src/routes/api.php`, `apps/api/src/app/Http/Controllers/Api/*` (nuevos o existentes), `Form Requests`, `Actions`, `Resources` | Endpoints staff autenticados para bootstrap/delta de catálogos y recepción idempotente de evaluaciones (y diseño extensible a animales), con confirmación individual por operación/UUID y errores en español. |
| API / dominio y persistencia | `apps/api/src/app/Models/*`, Actions de evaluación/catálogo | Soporte de idempotencia (UUID de operación/cliente) con unicidad, validación autoritativa, no duplicación en reintentos; preservación de historial clínico ante bajas de catálogo. |
| API / datos y DBR | `docs/database/requests/DBR-NNN-*.md` (nuevas, por definir) | Solicitar soporte de esquema necesario (p. ej. unicidad/idempotency key, campos/índices para delta `updated_at`/cursor, exposición consistente de `deleted_at`/tombstones) si no existe. Migraciones las crea/aplica solo responsable de BD tras DBR aprobada. |
| API / pruebas | `apps/api/src/tests/Feature/*` | Casos de delta, idempotencia/reintentos, validación no temporal, permisos y confirmación individual. `DatabaseTransactions` sobre `arca_pruebas`. |
| PWA / pruebas | `apps/pwa/src/tests/*` | Casos de bootstrap, lectura offline, outbox/backoff/no concurrencia, mapeo UUID, avisos/configuración, aislamiento/limpieza y aplicación de delta/bajas. |
| Documentación | `apps/pwa/docs/*`, `apps/pwa/specs/009`, `docs/adr/*` | Actualizar operación offline, limitaciones MVP, y registrar ADR de Dexie/UUID/Sync Manager/SW según decisión. |

## Contrato y datos

### Endpoints y contratos previstos (API autoridad, rutas en inglés con nombre)

- **Existentes a reutilizar/adaptar:**
  - `GET staff.animals.index` (`/api/v1/staff/animals`), `GET staff.animals.show` (`/api/v1/staff/animals/{animal}`): base de catálogo/bootstrap; evaluar extensión para incluir metadatos de sync (`updated_at`, `deleted_at`/tombstone, paginación, `updated_since`/cursor) o exponer endpoint dedicado de sync.
  - `GET enclosures.index` (`/api/v1/enclosures`), `GET species.index` (`/api/v1/species`): catálogos de apoyo; definir si forman parte del bootstrap MVP y su contrato incremental.
  - `POST staff.clinical-evaluations.store` (`/api/v1/staff/clinical-evaluations`): creación de evaluaciones; extender para aceptar **UUID de operación/idempotencia** y devolver confirmación individual con `server_id` y estado.
- **Nuevos/propuestos (a concretar en contrato aprobado):**
  - `GET staff.sync.bootstrap` (nombre tentativo): snapshot inicial para cuenta/usuario (animales, recintos y datos asociados requeridos), con marca temporal/cursor.
  - `GET staff.sync.changes` (nombre tentativo): delta desde `cursor`/`updated_since` con paginación estable, incluyendo altas/modificaciones/bajas (`deleted_at` o tombstone equivalente), filtrado por permisos del usuario.
  - `POST staff.sync.operations` o ampliación de store por entidad (nombre tentativo): recepción idempotente de operación(es) con UUID, respuesta individual por operación (`accepted|duplicate|validation_error|conflict|forbidden`, `server_id`, errores en español).
- **Autenticación/autorización:** `auth:sanctum`, `staff.user` y permisos existentes (p. ej. acceso a animales/evaluaciones clínicas según políticas vigentes). Ningún dato/catálogo se expone fuera del alcance autorizado.

### Validación, Actions, Resources y Policies

- Controladores JSON delgados: Form Requests → Actions → API Resources (regla API).
- Validación autoritativa en servidor para cada operación sincronizada; errores no temporales (422/403/409) retornan detalle en español y no deben crear duplicados.
- Policies/permisos Spatie existentes deben cubrir lectura de catálogos y creación de evaluaciones; sync no debe ampliar privilegios.

### DBR, modelos, auditoría y SoftDeletes

- **Estado:** pueden requerirse DBR nuevas para: (1) idempotencia (tabla/campo de clave UUID única por operación o entidad cliente, según diseño aprobado), (2) soporte eficiente de delta (índices/columnas de cambio), (3) consistencia de bajas/tombstones en catálogos expuestos al sync. **Ningún agente crea/aplica migraciones**; las crea, prueba y aplica el responsable de BD tras DBR aprobada.
- Modelos de negocio clínico (`ClinicalEvaluation` y relacionados) mantienen SoftDeletes/auditoría según Constitución V y reglas vigentes; no se permite borrado físico de datos clínicos.
- El plan asume que la implementación backend de cambios dependientes de esquema se ejecuta solo cuando la DBR esté `Lista para backend`.

### Errores y compatibilidad

- Códigos esperados: éxito/creación confirmada, duplicado idempotente (misma respuesta efectiva sin nuevo registro), error de validación (422), no autorizado/prohibido (401/403), conflicto/no encontrado según caso (404/409), errores temporales (timeout/5xx/red).
- Cliente: temporales → reintento con backoff; no temporales → marcar `error/conflict`, conservar local, avisar en español, no bloquear independientes.
- Compatibilidad: registros históricos sin campos nuevos de sync deben seguir legibles; bajas de catálogo no deben borrar historial clínico.

## Seguridad, offline y operación

- **Datos sensibles:** datos clínicos en local; minimizar exposición (aislamiento por cuenta, no credenciales, no logs sensibles, limpieza de avisos/preferencias del usuario anterior al cambiar usuario/dispositivo compartido). Definir en implementación medidas proporcionales de protección y retención.
- **Mínimo privilegio:** sync y bootstrap solo para staff autenticado y con permisos; filtros por permisos en delta/bootstrap.
- **Sesión:** login y bootstrap requieren conexión; ante expiración de sesión en campo se conserva la captura local (según RN-02) pero la sincronización queda bloqueada hasta reautenticación (detalle a confirmar, ver riesgos/preguntas).
- **Service Worker:** cache de app shell/estáticos necesarios para arranque offline; evitar cachear respuestas sensibles dinámicas de API salvo estrategia explícita y segura; actualización controlada de versión.
- **Sync Manager:** ejecución única (lock/mutex), backoff `5s,15s,30s,1m,5m,15m...`, sin límite fijo mientras haya pendientes temporales, reanudable tras cierre de app.
- **Portabilidad:** MySQL 8.0.x compatible Aiven/local (ADR 0013); configuración por `.env`; `arca_pruebas` para pruebas, nunca `arca_zoo`.
- **Observabilidad:** metadatos locales de intentos/errores y, en API, logs/auditoría acordes a políticas existentes sin exponer datos clínicos sensibles.

## Mapeo de criterios a pruebas

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | `CA-01 bootstrap stores profile and catalogs for user scope after login` (mock API + Dexie/store aislado) | `apps/pwa/src/tests/offline-bootstrap.test.tsx` (o equivalente) |
| CA-02 | `CA-02 offline mode reads animals and enclosures from local store and allows clinical forms` | `apps/pwa/src/tests/offline-catalog-read.test.tsx` |
| CA-03 | `CA-03 offline clinical evaluation is saved locally with UUID, queued and marked pending` | `apps/pwa/src/tests/offline-evaluation-queue.test.tsx` |
| CA-04 | `CA-04 sync runs on start/resume/reconnect and manual trigger without concurrent execution` | `apps/pwa/src/tests/sync-manager.test.tsx` |
| CA-05 | `CA-05 temporary sync failure retries with exponential backoff and preserves local data` | `apps/pwa/src/tests/sync-backoff.test.tsx` |
| CA-06 | `CA-06 incremental sync requests changes since last cursor and applies paginated upserts` | `apps/pwa/src/tests/catalog-delta-sync.test.tsx` + `apps/api/src/tests/Feature/StaffSyncDeltaTest.php` (si endpoint API en alcance) |
| CA-07 | `CA-07 server tombstone/deleted_at removes catalog item without deleting clinical history` | `apps/pwa/src/tests/catalog-delta-sync.test.tsx` + `apps/api/src/tests/Feature/StaffSyncDeltaTest.php` |
| CA-08 | `CA-08 idempotent operation UUID does not duplicate records and returns per-operation confirmation` | `apps/pwa/src/tests/sync-idempotency.test.tsx` + `apps/api/src/tests/Feature/ClinicalEvaluationIdempotencyTest.php` |
| CA-09 | `CA-09 dependent operations wait for parent server confirmation and use mapped server id` (diseño/cola) | `apps/pwa/src/tests/outbox-dependencies.test.tsx` |
| CA-10 | `CA-10 non-temporary API error keeps local record, marks manual attention and does not overwrite clinical data` | `apps/pwa/src/tests/sync-errors.test.tsx` + `apps/api/src/tests/Feature/ClinicalEvaluationSyncValidationTest.php` |
| CA-11 | `CA-11 sync status interface lists pending records, shows states, triggers prioritized upload on connectivity and shows login/resume summary` (Chrome/Android prioritario) | `apps/pwa/src/tests/sync-status-interface.test.tsx` |
| CA-12 | `CA-12 local data is isolated per user, logout keeps pending records and user switch clears previous ephemeral UI state` | `apps/pwa/src/tests/offline-session-isolation.test.tsx` |
| CA-13 | `CA-13 MVP does not allow offline animal creation with photos or deferred attachments` | `apps/pwa/src/tests/offline-scope-mvp.test.tsx` |
| CA-14 | `CA-14 test suites include at least one test per applicable CA` (verificación de cobertura/nomenclatura en CI local) | `apps/pwa/src/tests/acceptance-coverage.test.tsx` (extensión) + ejecución PHPUnit/Vitest de archivos anteriores |

> Nota: los nombres/rutas exactos de archivos de prueba pueden ajustarse en `tasks/009-offline-first-sync.md` según convenciones finales, manteniendo el prefijo `CA-xx` en cada test.

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Condicionado | PWA usa React 19/TS/Vite; API Laravel/PHP 8.4+/MySQL 8.0.x. **Nuevas dependencias propuestas:** `dexie` y `uuid` (requieren ADR aprobado antes de instalar). SW manual alineado a ADR 0003 sin sustituir Vite PWA. Configuración solo por `.env`; sin lock-in cloud. |
| II. La spec manda | Sí | Spec `009-offline-first-sync.md` en `Estado: Aprobada` (2026-11-18); plan, tasks y código deben mantener mismo `NNN-slug` y trazabilidad. |
| III. Lógica separada de la interfaz | Sí | Reglas de negocio, validación, idempotencia y persistencia definitiva en API (Form Requests/Actions/Resources/Policies). PWA: Dexie/outbox/sync como infraestructura cliente y ViewModels/servicios; componentes presentan estado y consumen servicios/cliente, sin convertirse en autoridad de negocio. |
| IV. Un test por criterio | Sí (planificado) | Tabla CA-01..CA-14 mapea cada criterio a ≥1 prueba automatizada con prefijo `CA-xx` en PWA/API según aplique. |
| V. Una sola fuente de verdad para los datos | Sí | MySQL/API autoridad; datos locales son borradores/cola sujetos a confirmación. Sin borrado físico clínico. Cambios de esquema solo por migraciones del responsable de BD tras DBR aprobada. Bajas de catálogo no eliminan historial clínico. |
| VI. Código en inglés, personas en español | Sí | Identificadores, rutas, tablas/campos técnicos y commits en inglés; UI, mensajes/avisos, specs/plan/docs en español. |

Ninguna excepción se implementa sin revisión y acuerdo requeridos. Si algo no cumple (p. ej. dependencia sin ADR, contrato/API sin soporte de idempotencia/delta definido), detenerse y resolver antes del código.

## Riesgos y decisiones

- **ADR requerido/aprobado:**
  - `docs/adr/0003-mysql-y-pwa-offline.md` actualizado (2026-11-18) para alinearlo a `pwa-009` (Dexie.js, UUID, SW manual, outbox/Sync Manager, bootstrap+delta); requiere aprobación formal según acuerdo del equipo.
  - Aprobación técnica del contrato de sync API (bootstrap, delta, tombstones, idempotencia, confirmación individual).
- **DBR requerida (probable):** soporte de idempotencia (unicidad por UUID de operación), campos/índices para delta y consistencia de `deleted_at`/tombstones en catálogos sincronizados. Definir y aprobar DBR antes de migraciones/cambios dependientes. **Hallazgo inicial:** `ClinicalEvaluation` y `Species` usan SoftDeletes; `Animal` y `Enclosure` no muestran SoftDeletes/`deleted_at` en modelos actuales, por lo que la exposición de bajas en delta para esos catálogos debe verificarse contra esquema real y, si falta, tramitarse por DBR.
- **Alternativas y mitigaciones:**
  - *Delta complejo:* MVP mantiene bootstrap completo inicial y permite fallback a refresh completo ante inconsistencia de cursor/versión.
  - *Sesión expirada en campo (pregunta abierta):* conservar cola local y requerir reautenticación para sincronizar; definir UX exacta en implementación/ajuste de spec si es necesario.
  - *Avisos efímeros sin tabla:* riesgo de perder visibilidad de errores de validación/reintentos puntuales; mitigar con mensajes persistentes mientras haya error activo en contexto relevante y/o mecanismo mínimo en UI existente (pendiente de decisión, ver spec).
  - *Dispositivos compartidos:* aislamiento estricto por cuenta, limpieza de avisos/preferencias al cambiar usuario y no exponer almacenes ajenos.
  - *Duplicados:* idempotencia obligatoria por UUID en API + reintentos seguros en cliente.
- **Riesgos operativos:** soporte variable de SW/background behavior (prioridad Chrome/Android), crecimiento de cola local, y necesidad de coordinar entrega API+PWA+DBR.

## Orden y aprobación

1. **Cierre documental y decisiones previas (bloqueante):** aprobar formalmente ADR 0003 actualizado y confirmar cambios de alcance en spec/plan (altas de animales offline sin foto, comportamiento exacto de la interfaz y mensajes efímeros). Definir contrato API de bootstrap/delta/idempotencia y DBR necesarias; obtener aprobación de DBR donde aplique.
2. **Preparación de esquema/API (responsable de BD + API):** responsable de BD crea/prueba/aplica migraciones aprobadas en `arca_pruebas`; API implementa contratos de lectura/sync idempotente cuando DBR esté `Lista para backend`.
3. **PWA base offline:** dependencias aprobadas, Dexie schema, SW/app shell, bootstrap y lectura offline de catálogos (CA-01, CA-02).
4. **Outbox y Sync Manager:** cola con UUID, backoff, no concurrencia, disparadores automático/manual y manejo de temporales/no temporales (CA-03, CA-04, CA-05, CA-08, CA-10 parcial).
5. **Delta y bajas:** sync incremental, paginación y aplicación de tombstones sin afectar historial clínico (CA-06, CA-07).
6. **Dependencias y UX de sincronización/aislamiento:** soporte de dependencia padre→dependiente, interfaz de tabla/listado de pendientes, mensajes efímeros al iniciar/reanudar, prioridad animales→diagnósticos, limpieza en cambio de usuario, límites MVP sin adjuntos offline (CA-09, CA-10, CA-11, CA-12, CA-13).
7. **Pruebas y verificación:** implementar pruebas CA-01..CA-14, ejecutar Vitest en PWA y PHPUnit (`DatabaseTransactions`, `arca_pruebas`) en API; ejecutar `/verify` según apps modificadas.
8. **Aprobación y cierre:** revisión técnica (PWA/API/BD) y validación funcional por el solicitante con evidencia por CA; actualizar documentación operativa y enlazar spec/plan/tasks/ADR/DBR en el PR.

**Aprobadores previstos (a confirmar):** responsable funcional (solicitante) para alcance/UX; responsable técnico PWA y API; responsable de BD para DBR/migraciones. Detenerse antes de implementar código dependiente de decisiones/ADR/DBR no aprobadas.