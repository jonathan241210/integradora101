# DBR-007 · news-events-hard-delete

- Estado: Descartada
- Solicitada: 2026-11-01
- Aprobada: 2026-11-01
- Feature/spec origen: `apps/api/specs/008-event-news-images.md`
- Responsable de BD: Responsable de BD (rol)
- Responsable backend: Backend
- Depende de: DBR-001 (`english-schema-normalization`), aplicada; DBR-005 (`news-events-soft-deletes`), aplicada en `arca_pruebas` (columna `deleted_at` en `news` y `events`).
- Alcance sobre DBR-005: esta DBR no modifica DBR-005 ni su estado. Solicitaba que el borrado de noticias y eventos dejara de ser lógico. Como se descartó, el uso de `deleted_at` para noticias y eventos se mantiene.

> **Nota de descarte.** Esta solicitud queda **Descartada**. Motivo: el equipo mantiene el borrado lógico de noticias y eventos con SoftDeletes (`deleted_at`, DBR-005), por la Constitución V. No se evalúan, aprueban ni aplican los puntos (a) a (e) ni la eliminación física. Se conserva el contenido original como historial. Consecuencias: `api-008` solo añade el borrado del archivo de imagen; no hay migración nueva ni cambio de `deleted_at`.

## Problema y justificación

Solicitud original: al eliminar una noticia o un evento, el borrado sería **físico**. Se eliminaría la fila de `news` o `events` y su imagen del disco, sin registro del contenido en la base de datos. Hoy el borrado es lógico: DBR-005 añadió `deleted_at` y `api-007` lo exige en CA-15 y RN-09.

Esta DBR no pedía ejecutar SQL ni borrar datos. Pedía al responsable de BD:

- confirmar que borrar filas no rompe referencias;
- decidir qué hacer con `deleted_at`, ya aplicada;
- definir retención, respaldo, recuperación y el tratamiento del registro de actividad;
- valorar el impacto en la Constitución V, que puede exigir un ADR;
- fijar el orden de despliegue.

El borrado físico por sí mismo no requiere cambio de esquema: `forceDelete()` borra la fila con el esquema actual. El único cambio de esquema posible es retirar `deleted_at` (opción B2 de la evaluación b).

Esta DBR no aprueba la regla nueva. La eliminación física de noticias y eventos no se implementa.

## Estado actual

- `news` (`docs/database/esquema-ingles.md`, sección 14) y `events` (sección 15) tienen `image_path` VARCHAR(255) NULL. Desde DBR-005, también `deleted_at` TIMESTAMP NULL (migración `2026_10_30_000005_news_events_soft_deletes_and_tickets_index`, aplicada en `arca_pruebas`).
- Claves foráneas salientes: `news.author_id` y `events.author_id` → `users(id)`. Borrar una noticia o un evento no afecta a `users`.
- Claves entrantes hacia `news` o `events`: ninguna aparece en `esquema-ingles.md` ni en las migraciones de `apps/api/src/database/migrations/`. `tickets` (sección 16) no tiene columna de evento. Confirmación en el esquema real: pendiente de consulta a la base (evaluación a).
- `activity_log` (Spatie, migración `2026_10_14_000002_staff_authentication_schema`): `subject_type` y `subject_id` son columnas de texto sin clave foránea. No hay referencia física a `news` ni a `events`.
- `App\Models\News` y `App\Models\Event` usan `SoftDeletes`. `DELETE` marca `deleted_at` (`apps/api/docs/administracion.md`).

## Contrato solicitado (no aprobado)

- Ninguna columna nueva ni índice nuevo.
- La aplicación borraría la fila con `forceDelete()` dentro de una transacción. El archivo de imagen se borraría después del commit (`api-008`). No habría marca de baja.
- No habría restauración desde la aplicación. Cualquier recuperación sería desde respaldo, a cargo de BD.
- Si BD decidiera B2, `deleted_at` se retiraría de `news` y `events` mediante migración, después de que el código no use `SoftDeletes`.

## Evaluación solicitada al responsable de BD (no realizada, DBR descartada)

**(a) Referencias entrantes y comportamiento al borrar.** Con las referencias conocidas (solo salientes), no debería haber acción `ON DELETE` que aplicar. Debe confirmarse en el esquema real, no asumirse. Descartada: no se evalúa.

**(b) Columna `deleted_at` ya aplicada por DBR-005.** Opciones consideradas: B1 (conservar sin uso) y B2 (retirar). Descartada: no se evalúa.

**(c) Retención, respaldo, recuperación y Activitylog.** Descartada: no se evalúa. La política de respaldo sigue la de ADR 0010 y la de Aiven vigente.

**(d) Constitución V, ADR y dependencias.** La Constitución V exige que los modelos de negocio extiendan `BaseModel` y usen SoftDeletes, y que lo clínico y lo financiero nunca se borre físicamente. `AGENTS.md` raíz y `apps/api/AGENTS.md` limitan SoftDeletes y la prohibición de borrado físico a datos clínicos y financieros. En `apps/api/src/app/Models/` no existe `BaseModel`; `News` y `Event` extienden `Model`. Dependencias nuevas: ninguna.

**(e) Orden de despliegue.** Descartado: no aplica.

Se aplica por ambiente (desarrollo/pruebas, staging, producción) solo cuando haya una DBR aprobada. Esta DBR no se aplica.

## Elementos afectados

| Tipo | Nombre | Cambio |
|---|---|---|
| columna | `news.deleted_at` | Sin cambio (la DBR se descartó) |
| columna | `events.deleted_at` | Sin cambio (la DBR se descartó) |
| tabla | `news`, `events` | Sin cambio de estructura |
| tabla | `activity_log` | Sin cambio |

## SQL de referencia (MySQL 8.0)

> **Referencia para revisión; no ejecutar directamente.** Esta DBR está descartada y no genera migración.

```sql
-- (a) Lectura de metadatos: claves foráneas que apuntan a news o events
SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND REFERENCED_TABLE_NAME IN ('news', 'events');
```

## Datos existentes y migración de datos

- Filas con `deleted_at` NULL: no cambian y siguen visibles.
- Filas con `deleted_at` no nulo: siguen ocultas por el borrado lógico de DBR-005.
- No hay borrados físicos ni migración de datos.
- Imágenes: no están en la base de datos. Las gestiona la aplicación en el disco `public` (`api-008`).

## Privacidad, auditoría y retención

- `news` y `events` son contenido institucional público. No son datos personales, clínicos ni financieros.
- El borrado lógico conserva el contenido en la base de datos; la retención depende de la política de respaldo vigente.
- Activitylog conserva la acción (`deleted`, `image-changed`) sin binario ni ruta absoluta.

## Impacto, rendimiento y reversión

- Sin cambios: no hay migración que revertir.

## Compatibilidad MySQL 8.0

- Sin extensiones propietarias. No aplica a esta DBR descartada.

## Objeto almacenado (si aplica)

No aplica.

## Orden de despliegue

No aplica: DBR descartada.

## Pruebas y evidencia

- No hay pruebas de esquema para esta DBR, porque se descartó.

## Decisión

- **Se descartó la eliminación física de noticias y eventos** porque el equipo mantiene el borrado lógico con SoftDeletes (`deleted_at`, DBR-005), por la Constitución V. Por tanto, no se requiere ADR de excepción para esta solicitud.
- **Se optó por mantener `deleted_at` en uso** (borrado lógico de DBR-005) y no retirarlo, porque no hay cambio de esquema.
- **Se optó por mantener ocultas las filas ya marcadas**, sin purga ni restauración, porque el borrado lógico sigue vigente. Sus archivos se gestionan como en DBR-005.
- **Se optó por mantener el registro de actividad vigente** (`deleted`, `image-changed`) sin cambios, porque la solicitud se descartó.
- **Se optó por mantener la política de respaldo vigente** (ADR 0010 y Aiven). Esta DBR no la cambia.
- **No aplica registro de fallo de borrado de archivo**, porque esta DBR no implementa borrado físico de archivos.
- **Usuarios** (`api-007`) mantienen la baja lógica; la regla de borrado físico nunca se aplicó a ellos.

## Aprobaciones

| Rol | Resultado | Evidencia |
|---|---|---|
| Responsable de BD | No aplica (DBR descartada) | |
| Backend | No aplica (DBR descartada) | |

## Aplicación por ambiente

| Ambiente | Estado | Evidencia |
|---|---|---|
| Todos | No aplica (DBR descartada) | |
