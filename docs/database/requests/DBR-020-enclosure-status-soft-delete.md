# DBR-020 · Estado activo del recinto

- Estado: Aplicada en arca_pruebas (migración verificada con `migrate:status`). Staging y producción: pendiente de despliegue (ver `infra/README.md`).
- Solicitada: 2026-11-18
- Aprobada: 2026-11-18
- Feature/spec origen: `apps/api/specs/019-enclosure-status-and-global-search.md` (Aprobada). Consumidor de la interfaz: `apps/dashboard/specs/012-enclosure-actions-global-search.md`. Enmienda `api-007` CA-18 y `api-010` (fuera de alcance), según la spec 019.
- Responsable de BD: Responsable de BD (rol)
- Responsable backend: Backend
- Decisiones de producto: cerradas. Quedan dos verificaciones para BD al final. La aprobación de BD y backend consta en la tabla de aprobaciones.

## Problema y justificación

El panel administrativo necesita sacar de circulación un recinto sin perderlo. Hay dos necesidades distintas:

1. **Desactivar** un recinto (por ejemplo, por mantenimiento o clausura temporal): deja de mostrarse en el portal y en la app de visitantes, no puede recibir escaneos QR ni animales nuevos, y puede reactivarse.
2. **Eliminar** un recinto: borrado lógico. Desaparece del panel, del portal y de la app, pero la fila y su historial se conservan (Constitución V: SoftDeletes en los modelos de negocio). `BaseModel`, citado por la Constitución y `AGENTS.md`, no existe en el repositorio; ver ADR 0021.

La base ya tiene `enclosures.deleted_at` (borrado lógico), pero no tiene ninguna marca de activo/inactivo. Por eso esta DBR solo solicita `is_active`; el borrado lógico usa la columna existente. Eliminar no es reversible desde el panel (spec 019, RN-02), pero desactivar sí.

## Estado actual

Consultado sobre la base viva `arca_pruebas` (`php artisan db:table enclosures` e `information_schema`, solo lectura), con todas las migraciones del repositorio en estado *Ran*:

- `enclosures` tiene `id`, `name` VARCHAR(100), `gps_lat`, `gps_lon`, `map_x`, `map_y` (DBR-008), **`updated_at` TIMESTAMP NULL** y **`deleted_at` TIMESTAMP NULL**, con índices `idx_enclosures_updated_at` e `idx_enclosures_deleted_at`. **No tiene** `is_active`.
- `updated_at` y `deleted_at` **no aparecen en ninguna migración del repositorio**: existen en la base pero no están versionados. El modelo `Enclosure` tampoco los usa (`$timestamps = false`, sin `SoftDeletes`). Ver verificación 1.
- No hay índice `UNIQUE` sobre `enclosures.name` (solo `PRIMARY`, `idx_enclosures_updated_at`, `idx_enclosures_deleted_at`).
- FK que apuntan a `enclosures`:
  - `animals.fk_animales_recinto` → `ON DELETE RESTRICT`. `animals.enclosure_id` es `INT NOT NULL`.
  - `enclosure_qr_codes.fk_enclosure_qr_codes_enclosure_id` → `ON DELETE RESTRICT`.
  - `enclosure_qr_codes.fk_rqr_recinto` → `ON DELETE CASCADE`. **Hay dos FK sobre la misma columna** con reglas opuestas; ver verificación 2. Como la feature solo hace borrado lógico, ninguna se dispara.
- `enclosure_qr_codes.is_active` existe (TINYINT(1), default 1). Esta DBR no lo toca.

## Contrato solicitado

Una columna nueva en `enclosures`:

| Columna | Tipo MySQL 8.0 | Nulo | Default | Uso |
|---|---|---|---|---|
| `is_active` | `BOOLEAN` (alias de `TINYINT(1)`) | NOT NULL | `TRUE` (1) | `1` = recinto visible y asignable; `0` = desactivado (no se borra). |

- **`deleted_at` no se añade:** ya existe en la base con índice. El backend activa `SoftDeletes` en el modelo `Enclosure` sobre esa columna, una vez que BD la registre en una migración (verificación 1).
- **Auditoría de autoría (`created_by`, `updated_by`): no se añaden.** `BaseModel` no existe en el repositorio; la trazabilidad de cada acción queda en Activitylog desde las Actions (ADR 0021; spec 019, CA-08).
- **Índices: ninguno nuevo.** `enclosures` tiene pocas decenas de filas.
- No se cambia ninguna FK.

## Elementos afectados

| Tipo | Nombre | Cambio |
|---|---|---|
| tabla (existente) | `enclosures` | añadir `is_active` |
| columnas (existentes, no versionadas) | `enclosures.updated_at`, `enclosures.deleted_at` | registrar en migración idempotente (verificación 1) |
| FK | `enclosure_qr_codes.enclosure_id` (dos FK), `animals.enclosure_id` | sin cambio (verificación 2) |

## SQL de referencia (MySQL 8.0)

> **Referencia para revisión; no ejecutar directamente.** El cambio real se implementará como migración Laravel creada, probada y aplicada por el responsable de BD tras aprobar esta DBR. No se crea archivo en `apps/api/src/database/migrations/` desde este documento.

```sql
-- Ejemplo ilustrativo (NO ejecutar). Ajustar convenciones del responsable de BD.
ALTER TABLE enclosures
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
-- deleted_at y updated_at ya existen en arca_pruebas; la migración solo los crea
-- si faltan (Schema::hasColumn), para que el esquema quede reproducible en local.
```

## Datos existentes y migración de datos

- En MySQL 8.0, `ADD COLUMN ... NOT NULL DEFAULT TRUE` rellena las filas existentes con `1`. Todos los recintos actuales quedan **activos** (`is_active = 1`). `deleted_at` conserva sus valores actuales (BD confirma que todos son `NULL` antes de activar `SoftDeletes`, porque un valor no nulo ocultaría ese recinto).
- No hay backfill ni carga de datos adicional.

## Impacto, rendimiento y reversión

- **Animales:** `animals.enclosure_id` no cambia. Desactivar o eliminar un recinto no mueve ni borra animales.
- **Consultas existentes:** el borrado lógico solo filtra donde el modelo use SoftDeletes. Las consultas con `DB::table`, joins o SQL crudo sobre `enclosures` seguirán viendo recintos eliminados. El backend debe filtrar `deleted_at IS NULL` en esos casos (riesgo recogido en la spec 019).
- **Unicidad del nombre:** se valida en la aplicación (spec 019, RN-06). Si la BD tiene un `UNIQUE` sobre `enclosures.name`, ver verificación 1.
- **Despliegue:** cambio expansivo (columnas nuevas con default). Las versiones actuales de la API no leen las columnas nuevas y siguen funcionando.
- **Reversión (`down()`):** elimina solo `is_active`. Se pierden las marcas de desactivación. `deleted_at` y `updated_at` no se eliminan porque existían antes de esta DBR. Requiere respaldo previo en cada ambiente.
- **Volumen:** muy bajo (decenas de filas). Impacto de rendimiento despreciable.

## Compatibilidad MySQL 8.0

- `BOOLEAN` y `TIMESTAMP NULL` son tipos estándar de MySQL 8.0 y portables entre Aiven y MySQL local.
- Sin funciones, procedimientos, vistas ni triggers.

## Objeto almacenado (si aplica)

No aplica. Las reglas de visibilidad y de asignación viven en Actions de la API (spec 019).

## Privacidad, auditoría y retención

- **Clasificación:** datos geográficos y operativos públicos del zoológico. No son datos personales, clínicos ni financieros.
- **Auditoría:** las acciones de desactivar, activar y eliminar se registran en Activitylog (spec 019, CA-08), no en las columnas.
- **Retención:** el borrado lógico conserva la fila y su relación con los animales.

## Plan de ejecución

### Fase 0: cierre documental
- [x] BD y backend firman en el documento.
- [x] Estado pasa a «Aprobada».

### Fase 1: migración de esquema (responsable de BD)
- [x] Migración creada: `apps/api/src/database/migrations/2026_11_18_000020_enclosure_status_soft_delete.php`.
- [x] Verificaciones 1 y 2 registradas (ver «Verificaciones para BD»).
- [x] Aplicada en `arca_pruebas` con `php artisan migrate` (lote 12). `up()` es idempotente. **`down()` no se ejecutó**: el proyecto bloquea `migrate:rollback` en este ambiente («This command is prohibited from running in this environment») y no se forzó; queda revisado solo en código (retira únicamente `is_active`). No se probó en una MySQL aislada.
- [x] Evidencia registrada en «Pruebas y evidencia».
- [x] Estado pasa a «Lista para backend».

### Fase 2: backend
- [ ] Backend implementa modelo, Actions y endpoints de la spec 019 solo con la DBR en «Lista para backend».

## Pruebas y evidencia

Evidencia de `arca_pruebas`:

- **Antes:** `SELECT COUNT(*) FROM enclosures WHERE deleted_at IS NOT NULL` = 0; total 67 filas. `SHOW CREATE TABLE` sin `is_active`, con `updated_at` y `deleted_at` y sus índices.
- **Aplicación:** `php artisan migrate --force` → `2026_11_18_000020_enclosure_status_soft_delete ... DONE`; `migrate:status` → lote 12, *Ran*.
- **Después:** `SHOW CREATE TABLE enclosures` incluye `` `is_active` tinyint(1) NOT NULL DEFAULT '1' `` después de `map_y`; `updated_at`, `deleted_at`, `idx_enclosures_updated_at` e `idx_enclosures_deleted_at` sin cambio. Filas con `is_active = 1`: 67 de 67.
- **Pruebas:** `php artisan test --filter=Enclosure` → 7 pasan, 2 fallan por causas previas y ajenas a esta DBR: `EnclosuresAdminTest::ca17` (`animals.stay_status` sin default en el fixture) y `PublicEnclosuresTest::ca01` (falta la clave `age` en la respuesta pública).
- **`down()`:** no ejecutado (ver Fase 1).

## Aprobaciones

| Rol | Resultado | Evidencia |
|---|---|---|
| Responsable de BD | Aprobada | Registro de esta DBR |
| Backend | Aprobada | Registro de esta DBR |

## Aplicación por ambiente

| Ambiente | Estado | Evidencia |
|---|---|---|
| `arca_pruebas` | Aplicada en arca_pruebas | Migración `2026_11_18_000020_enclosure_status_soft_delete` (lote 12); ver «Pruebas y evidencia» |
| staging | Pendiente de despliegue (ver checklist de `infra/README.md`) | |
| producción | Pendiente de despliegue (ver checklist de `infra/README.md`) | |

## Verificaciones para BD

No son preguntas de producto. Son comprobaciones que el responsable de BD registra antes de aplicar la migración.

1. **`UNIQUE` sobre `enclosures.name`.** La unicidad del nombre se valida en la aplicación (spec 019, RN-06: solo entre recintos no eliminados). Si existe un `UNIQUE` en la base, BD lo evalúa y decide cómo tratarlo; no se resuelve en esta DBR.
2. **`ON DELETE` real de las FK.** Confirmar la acción de `animals.enclosure_id` y de `enclosure_qr_codes.enclosure_id` (la migración indica RESTRICT). Esta DBR no las cambia; el resultado se registra como evidencia.
