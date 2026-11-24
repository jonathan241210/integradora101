# DBR-020 · offline-sync-idempotency-keys

- Estado: Aplicada en arca_pruebas (migración verificada con `migrate:status`). Staging y producción: pendiente de despliegue (ver `infra/README.md`).
- Solicitada: 2026-11-18
- Aprobada: 2026-11-18
- Apps afectadas: `api`, `pwa`
- Spec relacionada: `apps/pwa/specs/009-offline-first-sync.md`, `apps/api/specs/019-offline-sync.md`
- Responsable de BD: Responsable de BD (rol)
- Responsable backend: Backend
- Decisión de diseño: tabla central `sync_operations` para registrar cada operación por `operation_uuid` (unicidad global), permitir confirmación individual idempotente en reintentos y soportar múltiples tipos de entidad (`animal`, `clinical_evaluation`, extensible). No se eliminan ni modifican campos de foto existentes (p. ej. `animals.photo_path`).

## Problema y objetivo

La sincronización offline-first (`pwa-009`) requiere que las operaciones enviadas por la PWA (altas offline de animales **sin adjuntar fotografía en el MVP de sync** y evaluaciones clínicas, extensible a futuras operaciones) sean **idempotentes** mediante UUID de operación/registro cliente. Los reintentos o reenvíos no deben generar duplicados y la API debe poder devolver confirmación individual por operación.

> **Aclaración:** “sin foto” se refiere al alcance funcional del MVP de sincronización (no se sube ni se difiere el archivo de foto en la cola offline). **No implica eliminar, renombrar ni dejar de usar** campos de fotografía existentes (p. ej. `animals.photo_path`); esta DBR no modifica el almacenamiento de fotos.

## Datos/tablas/entidades afectadas

- Evaluaciones clínicas (`clinical_evaluations` y tablas relacionadas según contrato de guardado).
- Animales (`animals`) para altas offline de animales sin adjuntar fotografía en el MVP de sync (alcance confirmado en `pwa-009`). No se eliminan ni modifican columnas de foto existentes.
- Posible tabla/registro de operaciones de sincronización (p. ej. `sync_operations` o equivalente) o columnas de idempotencia por entidad, según diseño aprobado.

## Campos y tipo de cambio

- **Tabla nueva `sync_operations`** (propuesta):
  - `id` BIGINT UNSIGNED PK AI
  - `operation_uuid` CHAR(36) NOT NULL, **UNIQUE** (`uk_sync_operations_operation_uuid`) — clave de idempotencia enviada por el cliente
  - `user_id` INT NOT NULL — usuario staff autenticado que envía la operación (FK a `users.id`, RESTRICT/según política)
  - `entity_type` VARCHAR(50) NOT NULL — tipo lógico (p. ej. `animal`, `clinical_evaluation`)
  - `client_entity_id` CHAR(36) NULL — UUID local de la entidad/registro en cliente (si aplica)
  - `server_entity_type` VARCHAR(50) NULL — tipo de entidad creada/afectada en servidor
  - `server_entity_id` BIGINT UNSIGNED NULL — id definitivo en servidor (cuando aplique)
  - `status` VARCHAR(20) NOT NULL — resultado registrado para reintentos idempotentes (`completed`, `duplicate`, `rejected`, etc., definido por contrato API)
  - `error_code` VARCHAR(50) NULL — código de error no temporal (si aplica)
  - `error_message` VARCHAR(500) NULL — mensaje claro en español para confirmación individual (si aplica)
  - `processed_at` TIMESTAMP NULL — momento de procesamiento/registro
  - `created_at`, `updated_at` TIMESTAMP NULL
- **Restricción de unicidad:** `operation_uuid` única en BD para evitar duplicados bajo concurrencia/reintentos.
- **Índices:** `user_id`, (`user_id`,`created_at`), y el unique de `operation_uuid` para confirmación por operación.
- **Compatibilidad:** registros existentes no tienen UUID cliente; tabla nueva sin backfill.
- **Extensión opcional futura:** columna `client_operation_uuid` nullable + índice único parcial/lógico por entidad solo si el contrato lo requiere (no incluida en esta migración inicial para mantener alcance mínimo).

> Esta DBR describe el requerimiento; **no incluye SQL ejecutable ni migraciones**. La migración Laravel la crea, prueba y aplica el responsable de BD tras aprobación.

## Reglas de negocio y validación

- Un mismo UUID de operación reenviado debe resolverse como operación ya procesada (duplicado idempotente) sin crear un segundo registro.
- La unicidad debe ser enforceable en BD (no solo en aplicación) para evitar condiciones de carrera.
- La confirmación devuelta por API debe identificar el resultado por operación/UUID (éxito, duplicado, error de validación/permiso/conflicto).
- Debe preservar reglas existentes de validación, SoftDeletes y auditoría de datos clínicos/financieros; no se permite borrado físico.

## Riesgo e impacto

- **Alto impacto funcional:** sin idempotencia en BD, los reintentos de sync pueden duplicar animales/evaluaciones clínicas.
- **Riesgo de diseño:** ubicación de la clave (por tabla vs tabla central) afecta extensibilidad y consultas; requiere decisión técnica en plan/API.
- **Compatibilidad:** registros existentes no tendrán UUID cliente; el cambio debe ser compatible (nullable o estrategia definida).

## Verificación requerida

- Pruebas en MySQL 8.0 (`arca_pruebas`) que demuestren rechazo/gestión segura de duplicados por UUID bajo reintento.
- Evidencia de restricciones/índices (`SHOW CREATE TABLE`/equivalente) y pruebas de concurrencia/reintento a nivel aplicación/API.
- Casos cubriendo evaluaciones clínicas y altas offline de animales sin adjuntar fotografía (MVP de sync), sin cambios en columnas/campos de foto existentes.

## Aprobación

| Rol | Resultado | Evidencia |
|---|---|---|
| Solicitante | Aprobada (alcance: idempotencia sync, sin cambios en campos de foto) | Registro de esta DBR |
| Responsable de BD | Aprobada (diseño propuesto: `sync_operations`) | Registro de esta DBR |
| Backend | Aprobada (lista para implementación/consumo backend) | Registro de esta DBR |

## Aplicación por ambiente

| Ambiente | Estado | Evidencia |
|---|---|---|
| `arca_pruebas` | Aplicada en arca_pruebas | `php artisan migrate`: `2026_11_18_000020_offline_sync_idempotency_keys ... 2s DONE` (responsable de BD). Evidencia detallada (`SHOW CREATE TABLE sync_operations`) pendiente de adjuntar. |
| staging | Pendiente de despliegue (ver checklist de `infra/README.md`) |  |
| producción | Pendiente de despliegue (ver checklist de `infra/README.md`) |  |