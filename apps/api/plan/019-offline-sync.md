# Plan técnico · 019 · offline-sync

- Spec: `apps/api/specs/019-offline-sync.md`
- Estado de spec: Implementada
- Solicitada: 2026-11-18
- Aprobada: 2026-11-18
- Responsable técnico: Por definir (API + coordinación con PWA/BD)
- Precondiciones: DBR-020 y DBR-021 aprobadas y aplicadas en `arca_pruebas`. ADR 0003 aceptado. Spec PWA `009` aprobada.

## Diseño de solución

Implementar contratos API staff autenticados para sincronización offline-first de la PWA veterinaria (`pwa-009`): bootstrap de catálogos, delta incremental con tombstones y recepción idempotente de operaciones (altas de animales sin foto y evaluaciones clínicas) con confirmación individual por `operation_uuid`.

La API mantiene autoridad de validación y persistencia (MySQL). La idempotencia se respalda en `sync_operations` (DBR-020, unicidad por `operation_uuid`). El delta expone `updated_at`/`deleted_at` en `animals` y `enclosures` (DBR-021) y soft deletes existentes en `species`/`clinical_evaluations` según corresponda, sin eliminar historial clínico.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| API / modelos | `apps/api/src/app/Models/SyncOperation.php` (nuevo), `apps/api/src/app/Models/Animal.php`, `apps/api/src/app/Models/Enclosure.php` | Modelo de operaciones de sync; alinear `Animal`/`Enclosure` con SoftDeletes y `updated_at` (sin `created_at`) para delta/tombstones. |
| API / sync | `apps/api/src/app/Http/Controllers/Api/StaffSyncController.php` (nuevo) | Endpoints `sync.bootstrap`, `sync.changes`, `sync.operations` (controlador delgado en lo posible; refactor a Actions/Form Requests en iteraciones siguientes). |
| API / rutas | `apps/api/src/routes/api.php` | Rutas staff autenticadas (`auth:sanctum`, `staff.user`): `GET /api/v1/staff/sync/bootstrap`, `GET /api/v1/staff/sync/changes`, `POST /api/v1/staff/sync/operations`. |
| API / evaluación/animal | `apps/api/src/app/Http/Controllers/Api/ClinicalEvaluationController.php`, `apps/api/src/app/Http/Controllers/Api/AnimalController.php` | Reutilización de lógica de validación/creación para operaciones sync; garantizar compatibilidad con flujos existentes. |
| API / pruebas | `apps/api/src/tests/Feature/*` (pendiente) | Pruebas CA-01..CA-08 de spec 019 con `DatabaseTransactions` sobre `arca_pruebas`. |
| PWA / cliente sync | `apps/pwa/src/services/apiClient.ts`, `apps/pwa/src/offline/bootstrap.ts`, `apps/pwa/src/offline/sync-manager.ts` | Consumo de bootstrap/delta y envío batch idempotente con confirmación individual; fallback a endpoints legacy donde aplique. |

## Contrato y datos

- **Bootstrap (`GET staff.sync.bootstrap`):** perfil mínimo, catálogos `animals`, `enclosures`, `species` con `updated_at`/`deleted_at` cuando aplique, y `cursor/server_time`.
- **Delta (`GET staff.sync.changes?cursor|since=`):** cambios paginados/limitados con upserts y bajas (`deleted_at`), cursor nuevo y bandera `has_more`.
- **Operaciones (`POST staff.sync.operations`):** recibe `operations[]` con `operation_uuid` (UUID), `entity_type` (`animal`, `clinical_evaluation`), `client_entity_id`, `depends_on_client_entity_id` opcional y `payload`; responde `results[]` por operación (`completed|duplicate|rejected`, `server_id`, `error_code`, `message` en español).
- **Idempotencia:** búsqueda/registro en `sync_operations` por `operation_uuid` (único); reenvío retorna resultado previo sin duplicar entidad.
- **Dependencias:** evaluación puede resolver animal padre por `depends_on_client_entity_id` o `payload.animal_local_id` consultando operación completada del mismo usuario.
- **Permisos:** `auth:sanctum`, `staff.user`.

## Seguridad, offline y operación

- Solo staff autenticado; validación autoritativa en servidor.
- Errores no temporales reportados por operación (422/validación, etc.) sin duplicados; temporales reintentables por cliente.
- Sin borrado físico de datos clínicos; tombstones para catálogo sin eliminar historial clínico.
- MySQL 8.0.x portable (`arca_pruebas` para pruebas).

## Mapeo de criterios a pruebas

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | Bootstrap devuelve perfil/catálogos y cursor para staff autorizado | `apps/api/src/tests/Feature/StaffSyncBootstrapTest.php` (pendiente) |
| CA-02 | Delta devuelve cambios desde cursor/since con paginación/orden | `apps/api/src/tests/Feature/StaffSyncChangesTest.php` (pendiente) |
| CA-03 | Delta expone bajas (`deleted_at`) en entidades soportadas | `apps/api/src/tests/Feature/StaffSyncChangesTest.php` (pendiente) |
| CA-04 | Alta de animal con UUID es idempotente y confirma individualmente | `apps/api/src/tests/Feature/StaffSyncOperationsTest.php` (pendiente) |
| CA-05 | Evaluación clínica con UUID es idempotente y valida negocio | `apps/api/src/tests/Feature/StaffSyncOperationsTest.php` (pendiente) |
| CA-06 | Error no temporal retorna confirmación clara sin duplicado | `apps/api/src/tests/Feature/StaffSyncOperationsTest.php` (pendiente) |
| CA-07 | Dependencia diagnóstico→animal local resuelve `server_id` del padre | `apps/api/src/tests/Feature/StaffSyncOperationsTest.php` (pendiente) |
| CA-08 | Al menos una prueba automatizada por CA aplicable | Cobertura de suite anterior |

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | Laravel/PHP 8.4+/MySQL 8.0.x, sin dependencias nuevas; portable Aiven/local. |
| II. La spec manda | Sí | Spec 019 aprobada; DBR-020/021 atendidas; plan/tasks con mismo slug. |
| III. Lógica separada de la interfaz | Parcial | Validación/autoridad en API; controlador de sync concentra lógica y debería refactorizarse a Form Requests/Actions/Resources en iteración siguiente. |
| IV. Un test por criterio | Pendiente | Mapeo definido; pruebas Feature por crear/ejecutar en `arca_pruebas`. |
| V. Una sola fuente de verdad para los datos | Sí | MySQL/API autoridad; idempotencia en BD; sin borrado físico clínico. |
| VI. Código en inglés, personas en español | Sí | Rutas/identificadores en inglés; mensajes al usuario en español. |

## Riesgos y decisiones

- Refactor a Actions/Form Requests/Resources recomendado para alineación plena con convenciones API.
- Deltas con cursor por timestamp pueden requerir ajuste fino (paginación estable, múltiples tablas); implementación actual es MVP.
- Pruebas automatizadas y ejecución `/verify` pendientes.
