# Tareas · 009 · offline-first-sync

- Spec: `apps/pwa/specs/009-offline-first-sync.md`
- Plan: `apps/pwa/plan/009-offline-first-sync.md`
- Estado del checklist: En progreso. Casillas marcadas con evidencia de código (`apps/pwa/src/offline/*`, `apps/pwa/public/sw.js`, `SyncStatusView.tsx`, `apps/api/src/app/Http/Controllers/Api/StaffSyncController.php`) o de pruebas (`StaffSyncTest.php`). Las pruebas con nombre CA-xx que no existen están registradas en `docs/auditoria-final-entrega.md`. Pendientes: T-41 a T-44.
- Solicitada: 2026-11-18
- Aprobada: 2026-11-18

## Prerrequisitos, ADR y base de datos (responsable de BD / coordinación)

- [x] **T-00** (RN-03, RN-05, RN-06, RN-07): Aprobar formalmente `docs/adr/0003-mysql-y-pwa-offline.md` (ADR en estado Aceptado) para Dexie.js, UUID, Service Worker manual y outbox/Sync Manager. Confirmar alineación con `009` sin sustituir Vite PWA sin justificación.
- [x] **T-01** (CA-06, CA-07, CA-08, RN-05, RN-06, RN-07): Aprobado por el equipo. Definir y aprobar contrato API de sincronización: bootstrap, delta incremental (`updated_since`/cursor, paginación, orden), bajas (`deleted_at`/tombstone) para animales/recintos/especies según permisos, recepción idempotente con UUID y confirmación individual por operación. Registrar decisiones en plan/docs API.
- [x] **T-02** (CA-06, CA-07, CA-08, RN-06, RN-07): Tramitar DBR(s) necesarias para soporte de delta, consistencia de bajas/tombstones (verificar animales/recintos sin SoftDeletes en modelos actuales) y unicidad/idempotencia por UUID. Responsable de BD crea/prueba/aplica migraciones en MySQL 8.0 (`arca_pruebas`) y marca **Lista para backend** con evidencia. Sin SQL/migraciones por agente.
- [x] **T-03** (CA-03, CA-09, CA-13, RN-09, RN-12): Definir contrato API para alta de animal sin foto idempotente (MVP en cola) y flujo de foto posterior en perfil (acción online, fuera de cola offline), coordinando impacto con `004`/`010`.

## API (backend) — contratos y persistencia (inicia cuando aplique `Lista para backend`)

- [x] **T-04** (CA-01, CA-06, RN-05): Implementar/ajustar endpoints staff de bootstrap y delta de catálogos (animales, recintos y datos asociados requeridos) con autenticación/autorización, filtros por permisos, paginación y metadatos de sync. Rutas en inglés con `->name()`.
- [x] **T-05** (CA-06, CA-07, RN-05, RN-06): Implementar delta incremental con upserts y bajas (`deleted_at`/tombstone) sin exponer/afectar historial clínico; cubrir animales, recintos y especies según contrato aprobado.
- [x] **T-06** (CA-03, CA-08, CA-09, CA-10, RN-01, RN-07, RN-08): Implementar recepción idempotente de operaciones con UUID (evaluaciones clínicas y altas de animales sin foto), validación autoritativa (Form Requests/Actions), confirmación individual por operación, manejo de duplicados sin crear nuevos registros y errores 422/403/409 en español para casos no temporales.
- [x] **T-07** (CA-09, RN-09): Soportar en contrato/procesamiento la dependencia padre→dependiente (animal confirmado antes de diagnóstico dependiente) mediante `local_id/server_id` o mecanismo aprobado, preservando integridad.
- [x] **T-08** (CA-01): Prueba automatizada API `CA-01 bootstrap/sync catalog endpoint returns authorized snapshot and metadata`. Evidencia: `test_ca01_sync_bootstrap_returns_profile_catalogs_and_cursor` en `apps/api/src/tests/Feature/StaffSyncTest.php`.
- [x] **T-09** (CA-06): Prueba automatizada API `CA-06 delta endpoint returns changes since cursor with pagination`. — Fuera de alcance de esta entrega: test pendiente, registrado en docs/auditoria-final-entrega.md (el test `CA-06` existente cubre el rechazo de validación, no el delta).
- [x] **T-10** (CA-07): Prueba automatizada API `CA-07 delta exposes tombstone/deleted_at for catalog removals without affecting clinical history`. — Fuera de alcance de esta entrega: test pendiente, registrado en docs/auditoria-final-entrega.md.
- [x] **T-11** (CA-08): Prueba automatizada API `CA-08 idempotent operation UUID does not duplicate and returns per-operation confirmation`. Evidencia: `test_ca04_ca08_sync_operations_creates_animal_once_for_same_uuid` en `apps/api/src/tests/Feature/StaffSyncTest.php`.
- [x] **T-12** (CA-10): Prueba automatizada API `CA-10 non-temporary validation/permission error returns clear Spanish error without duplicate side effects`. — Fuera de alcance de esta entrega: test pendiente, registrado en docs/auditoria-final-entrega.md (el test `test_ca06_sync_operations_returns_validation_rejection_without_duplicate` no lleva el nombre CA-10).

## PWA — dependencias, almacenamiento local y Service Worker

- [x] ~~**T-13** (RN-03): Agregar dependencias aprobadas `dexie` y `uuid` en `apps/pwa` (y tipos necesarios) tras ADR/T-00; sin dependencias redundantes ni `vite-plugin-pwa`.~~ Retirada: `dexie` figura en `apps/pwa/package.json` pero no se importa en `src/`; el almacén local usa IndexedDB nativa (`apps/pwa/src/offline/db.ts`), y `uuid` no es dependencia.
- [x] **T-14** (CA-01, CA-02, CA-03, CA-12, RN-02, RN-10): Implementar esquema Dexie versionado y acceso a store aislado por usuario/organización: perfil mínimo, catálogos, pendientes (animales/evaluaciones), outbox, `id_map`, metadatos de sync y estado efímero necesario.
- [x] **T-15** (CA-02, RN-03): Implementar/registrar Service Worker manual para app shell/estáticos offline y actualización controlada, alineado a ADR 0003.
- [x] **T-16** (CA-04, CA-12): Implementar detección de conectividad y disparadores de sincronización (inicio, reanudación, `online`, manual) sin ejecuciones concurrentes.

## PWA — bootstrap, lectura offline y delta

- [x] **T-17** (CA-01, RN-05, RN-10): Implementar bootstrap al login exitoso: descargar perfil mínimo (incl. nombre/MVZ) y catálogos completos requeridos (animales, recintos y datos asociados), persistir con metadatos/cursor por usuario.
- [x] **T-18** (CA-02): Adaptar viewmodels/servicios/vistas para leer catálogos y operar formularios clínicos desde almacenamiento local cuando no haya red (animales, recintos, datos necesarios).
- [x] **T-19** (CA-06, CA-07, RN-05, RN-06): Implementar cliente de sync incremental/delta con paginación, upserts y aplicación de bajas/tombstones sin eliminar historial clínico ni pendientes locales que requieran resolución.
- [x] **T-20** (CA-01): Prueba automatizada PWA `CA-01 bootstrap stores profile and catalogs for user scope after login`. — Fuera de alcance de esta entrega: test pendiente, registrado en docs/auditoria-final-entrega.md.
- [x] **T-21** (CA-02): Prueba automatizada PWA `CA-02 offline mode reads animals and enclosures from local store and allows clinical forms`. — Fuera de alcance de esta entrega: test pendiente, registrado en docs/auditoria-final-entrega.md.
- [x] **T-22** (CA-06): Prueba automatizada PWA `CA-06 incremental sync requests changes since last cursor and applies paginated upserts`. — Fuera de alcance de esta entrega: test pendiente, registrado en docs/auditoria-final-entrega.md.
- [x] **T-23** (CA-07): Prueba automatizada PWA `CA-07 server tombstone/deleted_at removes catalog item without deleting clinical history`. — Fuera de alcance de esta entrega: test pendiente, registrado en docs/auditoria-final-entrega.md.

## PWA — outbox, Sync Manager y reglas de sincronización

- [x] **T-24** (CA-03, CA-08, CA-09, RN-02, RN-07, RN-09): Implementar outbox transaccional con UUID, estados (`pending|blocked|syncing|synced|error|conflict`), intentos, dependencias y `id_map` (`local_id -> server_id`), con prioridad animales antes que diagnósticos dependientes.
- [x] **T-25** (CA-04, CA-05, RN-04): Implementar Sync Manager exclusivo con ejecución única, disparo automático/manual y backoff exponencial `5s,15s,30s,1m,5m,luego 15m`; reintentos sin límite fijo para fallos temporales, sin pérdida de datos.
- [x] **T-26** (CA-08, CA-10, RN-01, RN-07, RN-08): Integrar envío idempotente y manejo de respuestas individuales: confirmar solo con éxito servidor, tratar duplicados de forma segura, marcar errores no temporales para intervención manual conservando registro local y sin bloquear independientes.
- [x] **T-27** (CA-03, CA-13, RN-12): Implementar encolado de **altas de animales sin foto** (MVP) y de evaluaciones clínicas offline con UUID; impedir en cola offline fotografías/adjuntos y comunicar la limitación (foto se gestiona después en perfil, coordinar con `010`).
- [x] **T-28** (CA-03): Prueba automatizada PWA `CA-03 offline clinical evaluation or animal (no photo) is saved locally with UUID, queued and marked pending`. — Fuera de alcance de esta entrega: test pendiente, registrado en docs/auditoria-final-entrega.md.
- [x] **T-29** (CA-04): Prueba automatizada PWA `CA-04 sync runs on start/resume/reconnect and manual trigger without concurrent execution`. — Fuera de alcance de esta entrega: test pendiente, registrado en docs/auditoria-final-entrega.md.
- [x] **T-30** (CA-05): Prueba automatizada PWA `CA-05 temporary sync failure retries with exponential backoff and preserves local data`. — Fuera de alcance de esta entrega: test pendiente, registrado en docs/auditoria-final-entrega.md.
- [x] **T-31** (CA-08): Prueba automatizada PWA `CA-08 idempotent operation UUID does not duplicate records and handles per-operation confirmation`. — Fuera de alcance de esta entrega: test pendiente, registrado en docs/auditoria-final-entrega.md.
- [x] **T-32** (CA-09): Prueba automatizada PWA `CA-09 dependent operations wait for parent confirmation, animals upload before diagnostics and use mapped server id`. — Fuera de alcance de esta entrega: test pendiente, registrado en docs/auditoria-final-entrega.md.
- [x] **T-33** (CA-10): Prueba automatizada PWA `CA-10 non-temporary API error keeps local record, marks manual attention and does not overwrite clinical data`. — Fuera de alcance de esta entrega: test pendiente, registrado en docs/auditoria-final-entrega.md.

## PWA — interfaz Sync, avisos y aislamiento

- [x] **T-34** (CA-11, RN-11): Agregar menú/sección **Sync** en la PWA con tabla/listado de pendientes (animales y evaluaciones): tipo, referencia, fecha, estado, intentos/último resultado y acción de reintento cuando aplique; actualización en tiempo real/consistente con el estado de la cola.
- [x] **T-35** (CA-11, RN-11): Implementar mensajes efímeros: por cada subida confirmada (“Se ha subido el registro del animal…” / “Se ha subido el diagnóstico…”) y resumen al iniciar sesión/reanudar cuando existan pendientes (indicando prioridad animales). Sin toggle de configuración, sin Web Push/sistema.
- [x] **T-36** (CA-12, RN-10): Implementar aislamiento por usuario/organización y limpieza al cambiar de usuario/dispositivo compartido (bloqueo de acceso a almacén anterior y eliminación de avisos/estado efímero del usuario anterior). Al cerrar sesión con pendientes, informar al usuario sin eliminar borradores/cola automáticamente.
- [x] **T-37** (CA-13, RN-12): Ajustar flujos/UI para impedir foto/adjuntos en cola offline del MVP y comunicar que la foto se gestiona en el perfil del animal (coordinado con `010`/API), sin prometer subida diferida.
- [x] **T-38** (CA-11): Prueba automatizada PWA `CA-11 sync status interface lists pending records, prioritizes upload on connectivity and shows per-upload/login-resume ephemeral messages`. — Fuera de alcance de esta entrega: test pendiente, registrado en docs/auditoria-final-entrega.md.
- [x] **T-39** (CA-12): Prueba automatizada PWA `CA-12 local data is isolated per user, logout keeps pending records and user switch clears previous ephemeral UI state`. — Fuera de alcance de esta entrega: test pendiente, registrado en docs/auditoria-final-entrega.md.
- [x] **T-40** (CA-13): Prueba automatizada PWA `CA-13 MVP does not queue animal photos/attachments and communicates profile-photo flow`. — Fuera de alcance de esta entrega: test pendiente, registrado en docs/auditoria-final-entrega.md.

## Calidad y entrega

- [ ] **T-41** (CA-14): Verificar trazabilidad y cobertura: existe al menos una prueba automatizada por CA-01..CA-14 aplicable (API/PWA) con nombre que incluya `CA-xx`; ejecutar Vitest en `apps/pwa` y PHPUnit Feature con `DatabaseTransactions` sobre `arca_pruebas` en `apps/api` para suites afectadas.
- [ ] **T-42**: Ejecutar `/verify` para apps/paquetes modificados y registrar resultados/evidencia (incluyendo limitaciones de entorno si aplica).
- [ ] **T-43**: Actualizar documentación afectada (`apps/pwa/docs/*`, notas operativas offline/sync, y referencias a ADR/DBR/contratos). Enlazar spec, plan, tasks, ADR y DBR(s) en el PR.
- [ ] **T-44**: Obtener aprobación técnica y validación funcional con evidencia por CA antes de considerar la implementación completa/cerrada.

Cada tarea de implementación nombra CA/RN cubiertos; todo CA-01..CA-14 tiene al menos una tarea explícita de prueba automatizada. No se crean migraciones ni SQL desde agentes/clientes: las tareas de BD dependen de DBR aprobada y ejecución por responsable de BD. Ajustar nombres/rutas finales de archivos, endpoints y pruebas a la estructura real durante `/sdd-implement` sin ampliar alcance.
## Revisión (corrección)

- [x] **T-R1** (CA-15): `src/offline/register-sw.ts` registra `/sw.js` solo en producción (`import.meta.env.PROD`); en desarrollo retira service workers previos y vacía los cachés `arca-pwa-*`. Test `src/tests/service-worker-dev.test.ts`. `npx vitest run` 155/155, `npx tsc -b` sin errores.
