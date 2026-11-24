# DBR-021 · Borrado lógico de códigos QR de recinto

- Estado: Aplicada en arca_pruebas (migración verificada con `migrate:status`). Staging y producción: pendiente de despliegue (ver `infra/README.md`).
- Solicitada: 2026-11-18
- Aprobada: 2026-11-18
- Feature/spec origen: `apps/api/specs/020-enclosure-qr-management.md` (Aprobada). Consumidores: `apps/dashboard/specs/013-enclosure-qr-printing.md` y `apps/api/specs/019-enclosure-status-and-global-search.md` (enmienda a CA-05 y CA-18 propuesta en `api-020`).
- Responsable de BD: Responsable de BD (rol)
- Responsable backend: Backend
- Decisiones de producto: cerradas. Regenerar solo desactiva (`is_active = 0`); no elimina. Eliminar un recinto elimina lógicamente sus códigos en la misma transacción.

## Problema y justificación

`enclosure_qr_codes` es un modelo de negocio operativo (Constitución V). Hoy no tiene borrado lógico: la tabla no tiene `deleted_at`, y el modelo `EnclosureQrCode` extiende `Model` sin `SoftDeletes`. Sin esta columna no se puede:

1. Eliminar lógicamente los códigos de un recinto cuando el recinto se elimina (`api-019` CA-05), de forma que un QR de un recinto eliminado no se encuentre al escanear.
2. Conservar el historial de códigos sin borrar físicamente ninguna fila, como exige la Constitución V para datos de negocio.

`BaseModel`, citado por la Constitución y `AGENTS.md`, no existe en el repositorio. Esta DBR no lo añade; la excepción queda documentada en la spec 020 (RN-07) con el mismo criterio que ADR 0021 para `Enclosure`.

## Estado actual

Consultado sobre la base viva `arca_pruebas` (solo lectura, por la sesión principal):

- `enclosure_qr_codes` tiene `id`, `code` VARCHAR(100) `UNIQUE`, `is_active` TINYINT(1) con valor por defecto 1 y `enclosure_id` INT NOT NULL. **No tiene** `deleted_at`, `created_at`, `created_by` ni `updated_by`.
- Dos FK sobre `enclosure_id` hacia `enclosures`, con reglas distintas: `fk_enclosure_qr_codes_enclosure_id` → `ON DELETE RESTRICT` y `fk_rqr_recinto` → `ON DELETE CASCADE`. Registrado en DBR-020 (verificación 2); esta DBR no la cambia. Como la aplicación nunca borra físicamente filas de esta tabla, ninguna de las dos se dispara.
- Filas: 8. Todas siguen el formato `ARCA-` + 8 caracteres `[A-Z0-9]`.
- Recintos 1, 2 y 3 tienen entre 2 y 3 códigos activos cada uno (datos de prueba). Un recinto con varios activos sigue siendo válido en esta DBR; la regla de visibilidad está en la spec 020 (RN-01: se muestra el activo de `id` mayor).
- Eliminadas (`deleted_at` no nulo): no aplica, la columna no existe todavía.
- Modelo: `apps/api/src/app/Models/EnclosureQrCode.php`.

## Contrato solicitado

Una columna nueva en `enclosure_qr_codes` y un índice:

| Columna | Tipo MySQL 8.0 | Nulo | Default | Uso |
|---|---|---|---|---|
| `deleted_at` | `TIMESTAMP` | NULL | NULL | Borrado lógico. Se fija al eliminar el recinto (`api-020` RN-16). Un código con `deleted_at` no se acepta en el escaneo. |

- **Índice:** `idx_enclosure_qr_codes_deleted_at` sobre `deleted_at`, en línea con `idx_enclosures_deleted_at`.
- **Auditoría de autoría (`created_by`, `updated_by`): no se añaden.** La trazabilidad queda en Activitylog desde las Actions (ADR 0021; spec 020, CA-10).
- **`is_active`: no cambia.** Regenerar solo desactiva con `is_active = 0`.
- **No se cambia ninguna FK.**

## Elementos afectados

| Tipo | Nombre | Cambio |
|---|---|---|
| tabla (existente) | `enclosure_qr_codes` | añadir `deleted_at` |
| índice (nuevo) | `idx_enclosure_qr_codes_deleted_at` | índice sobre `deleted_at` |
| FK | `enclosure_qr_codes.enclosure_id` (dos FK) | sin cambio |

## SQL de referencia (MySQL 8.0)

> **Referencia para revisión; no ejecutar directamente.** El cambio real está implementado como migración Laravel creada, probada y aplicada por el responsable de BD. No se crea SQL ejecutable desde este documento.

```sql
-- Ejemplo ilustrativo (NO ejecutar). Ajustar convenciones del responsable de BD.
ALTER TABLE enclosure_qr_codes
  ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL,
  ADD INDEX idx_enclosure_qr_codes_deleted_at (deleted_at);
```

Migración aplicada en `arca_pruebas` (ver «Pruebas y evidencia»): `apps/api/src/database/migrations/2026_11_18_000021_enclosure_qr_codes_soft_deletes.php`. Es idempotente: comprueba si la columna y el índice ya existen antes de crearlos.

## Datos existentes y migración de datos

- Las 8 filas existentes quedan con `deleted_at = NULL`: siguen activas o inactivas según su `is_active` actual.
- No hay backfill ni carga adicional.

## Impacto, rendimiento y reversión

- **Escaneo (`api-005`, `RecordVisitorDiscoveryAction`):** la búsqueda de código usa el modelo con SoftDeletes, así que un código eliminado no se encuentra y responde `invalid_code`. Esto cambia la respuesta para códigos de recintos eliminados (`api-019` CA-18 y `api-020` CA-20).
- **Progreso del visitante:** `VisitorProgressQuery::enclosure_count` une `visitor_collections` con `enclosure_qr_codes` mediante un join crudo que no filtra `deleted_at`. Ese join se mantiene a propósito, para que el progreso ya obtenido se conserve. Queda explícito como RN-17 y CA-24 de la spec 020. No se debe añadir un filtro `deleted_at IS NULL` a esa consulta.
- **Animales:** `animals.enclosure_id` no cambia.
- **Despliegue:** cambio expansivo (columna nula por defecto). Las versiones actuales de la API no leen la columna y siguen funcionando.
- **Reversión (`down()`):** retira el índice y la columna `deleted_at`. Si hay códigos eliminados lógicamente, se pierde la marca de eliminación; los códigos siguen en la tabla. Requiere respaldo previo en cada ambiente.
- **Volumen:** muy bajo. Impacto de rendimiento despreciable.

## Compatibilidad MySQL 8.0

- `TIMESTAMP NULL` y los índices simples son tipos estándar de MySQL 8.0, portables entre Aiven y MySQL local.
- Sin funciones, procedimientos, vistas ni triggers.

## Objeto almacenado (si aplica)

No aplica.

## Privacidad, auditoría y retención

- **Clasificación:** dato operativo restringido del zoológico. No es dato personal, clínico ni financiero. Sin embargo, el código da acceso al progreso de visitantes al escanearse; por eso solo lo ven quienes tienen `enclosures.manage` (spec 020, RN-10).
- **Auditoría:** generar, regenerar y eliminar quedan en Activitylog desde las Actions (spec 020, CA-10).
- **Retención:** el borrado lógico conserva la fila. No hay plazo de purga en esta DBR.

## Plan de ejecución

### Fase 0: cierre documental
- [x] BD y backend firman en el documento.
- [x] Estado pasa a «Aprobada».

### Fase 1: migración de esquema (responsable de BD)
- [x] Migración creada: `apps/api/src/database/migrations/2026_11_18_000021_enclosure_qr_codes_soft_deletes.php` (idempotente).
- [x] Aplicada en `arca_pruebas` con `php artisan migrate --force` (lote nuevo). **`down()` no se ejecutó**: el proyecto bloquea `migrate:rollback` en este ambiente, y no se forzó. Queda revisado solo en código (retira el índice y la columna).
- [x] Evidencia registrada en «Pruebas y evidencia».
- [x] Estado pasa a «Lista para backend».

### Fase 2: backend
- [ ] Backend implementa `SoftDeletes` en `EnclosureQrCode`, la eliminación lógica de códigos en `DeleteEnclosureAction` (`api-020` RN-16) y los endpoints de `api-020`.

## Pruebas y evidencia

Evidencia de `arca_pruebas` (aportada por la sesión principal):

- **Antes:** `SHOW CREATE TABLE enclosure_qr_codes` sin `deleted_at`. Filas: 8. Eliminadas: 0 (no existe la columna).
- **Aplicación:** `php artisan migrate --force` → `2026_11_18_000021_enclosure_qr_codes_soft_deletes ... DONE` (lote nuevo).
- **Después:** `SHOW CREATE TABLE enclosure_qr_codes` incluye `deleted_at timestamp NULL DEFAULT NULL` y el índice `idx_enclosure_qr_codes_deleted_at`. Filas: 8. Eliminadas (`deleted_at IS NOT NULL`): 0.
- **`down()`:** no ejecutado (ver Fase 1).
- **Pruebas automatizadas de backend:** pendientes; se ejecutarán con la implementación de `api-020`.

## Aprobaciones

| Rol | Resultado | Evidencia |
|---|---|---|
| Responsable de BD | Aprobada | Registro de esta DBR |
| Backend | Aprobada | Registro de esta DBR |

## Aplicación por ambiente

| Ambiente | Estado | Evidencia |
|---|---|---|
| `arca_pruebas` | Aplicada en arca_pruebas | Migración `2026_11_18_000021_enclosure_qr_codes_soft_deletes` (lote nuevo); ver «Pruebas y evidencia» |
| staging | Pendiente de despliegue (ver checklist de `infra/README.md`) | |
| producción | Pendiente de despliegue (ver checklist de `infra/README.md`) | |

## Verificaciones para BD

1. **Índice y columna en `arca_pruebas`:** comprobados (ver «Pruebas y evidencia»).
2. **Ejecución de `down()`:** pendiente en un MySQL 8.0 aislado; no se ha probado en este ambiente.
