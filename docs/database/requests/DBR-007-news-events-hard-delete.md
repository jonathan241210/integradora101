# DBR-007 · news-events-hard-delete

- Estado: Descartada (2026-11-01)
- Feature/spec origen: `apps/api/specs/008-event-news-images.md`
- Solicitante: Jonathan
- Responsable de BD: Víctor Adrián
- Responsable backend: Jonathan
- Fecha: 2026-11-01
- Depende de: DBR-001 (`english-schema-normalization`), aplicada; DBR-005 (`news-events-soft-deletes`), aplicada en `arca_pruebas` (columna `deleted_at` en `news` y `events`).
- Alcance sobre DBR-005: esta DBR no modifica DBR-005 ni su estado. Solicita que el borrado de noticias y eventos deje de ser lógico. Si se aprueba, el uso de `deleted_at` para noticias y eventos queda sin efecto.

> **Nota de descarte (2026-11-01).** Esta solicitud queda **Descartada**. Motivo: el equipo mantiene el borrado lógico de noticias y eventos con SoftDeletes (`deleted_at`, DBR-005), por la Constitución V. No se evalúan, aprueban ni aplican los puntos (a) a (e) ni la eliminación física. Se conserva el contenido original como historial. Consecuencias: `api-008` solo añade el borrado del archivo de imagen; no hay migración nueva ni cambio de `deleted_at`.

## Problema y justificación

Decisión del usuario (2026-11-01): al eliminar una noticia o un evento el borrado es **físico**. Se elimina la fila de `news` o `events` y su imagen del disco, y no queda registro del contenido en la base de datos. Hoy el borrado es lógico: DBR-005 añadió `deleted_at` y `api-007` lo exige en CA-15 y RN-09.

Esta DBR no pide ejecutar SQL ni borrar datos. Pide al responsable de BD:

- confirmar que borrar filas no rompe referencias;
- decidir qué hacer con `deleted_at`, ya aplicada;
- definir retención, respaldo, recuperación y el tratamiento del registro de actividad;
- valorar el impacto en la Constitución V, que puede exigir un ADR;
- fijar el orden de despliegue.

El borrado físico por sí mismo no requiere cambio de esquema: `forceDelete()` borra la fila con el esquema actual. El único cambio de esquema posible es retirar `deleted_at` (opción B2 de la evaluación b).

Esta DBR no aprueba la regla nueva. La eliminación física de noticias y eventos no se implementa hasta que DBR-007 esté en `Lista para backend` y se haya resuelto el punto (d).

## Estado actual

- `news` (`docs/database/esquema-ingles.md`, sección 14) y `events` (sección 15) tienen `image_path` VARCHAR(255) NULL. Desde DBR-005, también `deleted_at` TIMESTAMP NULL (migración `2026_10_30_000005_news_events_soft_deletes_and_tickets_index`, aplicada en `arca_pruebas`).
- Claves foráneas salientes: `news.author_id` y `events.author_id` → `users(id)`. Borrar una noticia o un evento no afecta a `users`.
- Claves entrantes hacia `news` o `events`: ninguna aparece en `esquema-ingles.md` ni en las migraciones de `apps/api/src/database/migrations/`. `tickets` (sección 16) no tiene columna de evento. Falta confirmarlo en el esquema real (evaluación a).
- `activity_log` (Spatie, migración `2026_10_14_000002_staff_authentication_schema`): `subject_type` y `subject_id` son columnas de texto sin clave foránea. No hay referencia física a `news` ni a `events`.
- `App\Models\News` y `App\Models\Event` usan `SoftDeletes`. `DELETE` marca `deleted_at` (`apps/api/docs/administracion.md`).

## Contrato solicitado

- Ninguna columna nueva ni índice nuevo.
- La aplicación borra la fila con `forceDelete()` dentro de una transacción. El archivo de imagen se borra después del commit (`api-008`). No hay marca de baja.
- No hay restauración desde la aplicación. Cualquier recuperación sería desde respaldo, a cargo de BD.
- Si BD decide B2, `deleted_at` se retira de `news` y `events` mediante migración, después de que el código no use `SoftDeletes`.

## Evaluación solicitada al responsable de BD

**(a) Referencias entrantes y comportamiento al borrar.**

- Confirmar en `arca_pruebas`, con una consulta de metadatos de solo lectura, que no hay claves foráneas que apunten a `news` ni a `events`, y que `tickets` no referencia eventos. Si el esquema real difiere de `esquema-ingles.md`, informarlo antes de avanzar.
- Si aparece una referencia, proponer la acción `ON DELETE` y su justificación:
  - `RESTRICT`: impide el borrado hasta resolver la referencia;
  - `SET NULL`: exige columna anulable;
  - `CASCADE`: borra filas dependientes; requiere decisión explícita porque puede borrar datos que no son de contenido.
- Con las referencias conocidas (solo salientes), no debería haber acción `ON DELETE` que aplicar. Debe confirmarse en el esquema real, no asumirse.

**(b) Columna `deleted_at` ya aplicada por DBR-005.**

- **B1 · Conservar sin uso.** Sin migración. El código deja de usar `SoftDeletes` en los modelos `News` y `Event`, y `deleted_at` queda sin uso. Riesgo: las filas con `deleted_at` no nulo volverían a las listas al retirar el trait. Ver (b.1).
- **B2 · Retirar.** Migración que elimine `deleted_at` de `news` y `events`. Solo después de desplegar el código sin `SoftDeletes`. El orden inverso falla: el código con el trait consultaría una columna inexistente.
- Propuesta del solicitante: B1 en la primera fase, porque no cambia el esquema y tiene menor riesgo. B2 solo si BD lo considera necesario, en esta DBR o en una posterior. La decisión final es de BD.
- **(b.1) Filas ya marcadas.** Antes de decidir, BD debe contar en cada ambiente las filas con `deleted_at` no nulo, y cuántas tienen `image_path` (ver SQL de referencia). Si hay filas, la opción debe elegirse entre:
  - (i) seguir ocultas, con un filtro `deleted_at IS NULL` explícito en las consultas de administración y de catálogo, sin `SoftDeletes`;
  - (ii) eliminarlas físicamente como parte de la adopción. Es una acción destructiva sobre datos: requiere aprobación explícita de BD y del solicitante, y evidencia previa;
  - (iii) restaurarlas (`deleted_at = NULL`), con lo que vuelven a las listas.
  Las filas marcadas por DBR-005 pueden conservar `image_path` y su archivo en disco, porque el borrado de archivos de `api-008` no está implementado. Su tratamiento se decide con el equipo (pregunta 3).

**(c) Retención, respaldo, recuperación y Activitylog.**

- Confirmar la política de respaldo previa a cualquier aplicación en staging o producción (ADR 0010, punto 5) y la ventana de recuperación disponible en Aiven. El solicitante no supone ninguna política.
- Tras el borrado físico, recuperar una noticia o un evento solo sería posible desde un respaldo, a cargo de BD. No hay endpoint de restauración (`api-008`, fuera de alcance).
- Activitylog: el evento `deleted` (y `image-changed`) permanece en `activity_log` aunque la fila de `news` o `events` ya no exista. Confirmar que ninguna clave foránea, trigger ni proceso de BD borra esas filas al borrar el registro. Las propiedades no incluyen binario ni ruta absoluta (`api-008` CA-12).
- Clasificación: contenido institucional público, no dato personal, clínico ni financiero, como en DBR-005.

**(d) Constitución V, ADR y dependencias.**

- La Constitución V, en su verificable, exige que los modelos de negocio extiendan `BaseModel` y usen SoftDeletes, y que lo clínico y lo financiero nunca se borre físicamente. `AGENTS.md` raíz y `apps/api/AGENTS.md` limitan SoftDeletes y la prohibición de borrado físico a datos clínicos y financieros. El texto es contradictorio. Cambiar la Constitución requiere acuerdo del equipo y un ADR.
- Propuesta: antes de aprobar esta DBR, el equipo decide una de dos vías:
  1. Aceptar un ADR (siguiente número libre en `docs/adr/`) que aclare o excepcione SoftDeletes para contenido institucional.
  2. Confirmar por escrito la interpretación de `AGENTS.md`.
  Sin una de las dos, la DBR no pasa a `Aprobada`.
- Observación previa a esta DBR: en `apps/api/src/app/Models/` no existe `BaseModel`; `News` y `Event` extienden `Model`.
- Dependencias nuevas: ninguna.

**(e) Orden de despliegue.** Propuesta, sujeta a (b):

1. Aprobar DBR-007 (BD y backend) y resolver (d).
2. Confirmar que DBR-005 está aplicada en el ambiente.
3. Resolver (b.1) con BD.
4. Desplegar el código de borrado físico con `forceDelete()`. Funciona con o sin el trait `SoftDeletes`.
5. Solo con B2: desplegar el código sin `SoftDeletes` en `News` y `Event`; después, la migración que retira `deleted_at`.

Se aplica por ambiente (desarrollo/pruebas, staging, producción), con respaldo y evidencia. Principio: cambios expansivos antes que destructivos.

## Elementos afectados

| Tipo | Nombre | Cambio |
|---|---|---|
| columna | `news.deleted_at` | Decisión (b): conservar sin uso (B1, sin cambio) o retirar (B2) |
| columna | `events.deleted_at` | Decisión (b): conservar sin uso (B1, sin cambio) o retirar (B2) |
| tabla | `news`, `events` | Sin cambio de estructura. El borrado de filas lo hace la aplicación (DML), no una migración |
| tabla | `activity_log` | Sin cambio. Debe conservar sus filas `deleted` (evaluación c) |

## SQL de referencia (MySQL 8.0)

> **Referencia para revisión; no ejecutar directamente.** El cambio real se implementará como migración Laravel creada por el responsable de BD.

```sql
-- (a) Lectura de metadatos: claves foráneas que apuntan a news o events
SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND REFERENCED_TABLE_NAME IN ('news', 'events');

-- (b.1) Lectura: filas ya marcadas por DBR-005 y cuántas tienen archivo asociado
SELECT COUNT(*) AS news_marcadas, SUM(image_path IS NOT NULL) AS news_con_imagen
FROM news WHERE deleted_at IS NOT NULL;
SELECT COUNT(*) AS events_marcados, SUM(image_path IS NOT NULL) AS events_con_imagen
FROM events WHERE deleted_at IS NOT NULL;

-- (b) Solo opción B2, después de desplegar el código sin SoftDeletes
ALTER TABLE news   DROP COLUMN deleted_at;
ALTER TABLE events DROP COLUMN deleted_at;
```

## Datos existentes y migración de datos

- Filas con `deleted_at` NULL: no cambian en B1 ni en B2 y siguen visibles.
- Filas con `deleted_at` no nulo: su tratamiento se decide en (b.1). Esta DBR no lo fija.
- Filas borradas físicamente: no hay migración de datos. Desde la aplicación no se pueden recuperar.
- Imágenes: no están en la base de datos. Las gestiona la aplicación en el disco `public` (`api-008`).

## Privacidad, auditoría y retención

- `news` y `events` son contenido institucional público. No son datos personales, clínicos ni financieros.
- El borrado físico elimina el contenido de la base de datos. La retención efectiva depende del respaldo (evaluación c).
- Activitylog conserva la acción (`deleted`, `image-changed`) sin binario ni ruta absoluta.
- Pregunta para el equipo (no para BD): si el evento `deleted` guarda un resumen del título o nombre, o solo el `id` y el actor. Ver preguntas abiertas.

## Impacto, rendimiento y reversión

- Tablas pequeñas. Borrar una fila es inmediato y no afecta a otras tablas si se confirma (a).
- B2: `DROP COLUMN` sobre tablas pequeñas. BD verifica el algoritmo y el bloqueo en la revisión 8.0.x aplicable.
- Reversión:
  - El borrado físico no se revierte con una migración. Solo es recuperable desde respaldo.
  - B1: no hay migración que revertir.
  - B2: el `down()` puede volver a añadir `deleted_at` NULL. No devuelve filas ni valores borrados.
- Respaldo previo obligatorio en cada ambiente antes de aplicar (ADR 0010).

## Compatibilidad MySQL 8.0

- Sin extensiones propietarias. `information_schema.KEY_COLUMN_USAGE` y `ALTER TABLE ... DROP COLUMN` son sintaxis estándar de MySQL 8.0.x.
- Portable entre Aiven (ADR 0013) y MySQL local.

## Objeto almacenado (si aplica)

No aplica. El borrado físico sigue en Actions (`DeleteNewsAction`, `DeleteEventAction`, según `api-008`).

## Orden de despliegue

Ver evaluación (e). Expansivo antes que destructivo: el código sin `SoftDeletes` va antes que cualquier migración que retire `deleted_at`.

## Pruebas y evidencia

- Pruebas de esquema/objeto ejecutadas por BD en base MySQL 8.0 aislada:
- Resultado y evidencia (sin secretos ni datos sensibles):
- Pruebas integradas del backend (propuestas, no ejecutadas): CA-07 de `api-008` con `assertDatabaseMissing` de la fila y comprobación del archivo; `DatabaseTransactions` sobre `arca_pruebas`; sin `RefreshDatabase` ni migraciones desde los tests.

## Preguntas abiertas

1. ¿El borrado físico exige ADR (excepción a la Constitución V) o el equipo confirma la interpretación de `AGENTS.md`?
2. ¿`deleted_at` se conserva sin uso (B1) o se retira (B2)?
3. Si hay filas ya marcadas por DBR-005 con o sin imagen: ¿se ocultan (i), se purgan (ii, destructivo) o se restauran (iii)? ¿Qué pasa con sus archivos en disco?
4. ¿El evento `deleted` de Activitylog guarda un resumen del título o nombre, o solo `id` y actor?
5. ¿Qué política de respaldo y ventana de recuperación aplica en Aiven antes de aplicar en staging y producción?
6. Si falla el borrado del archivo después del commit, ¿basta registrarlo en el log o se requiere un comando de limpieza de huérfanos?
7. Usuarios (`api-007`) mantienen la baja lógica. ¿Confirmar que la regla de borrado físico aplica solo a noticias y eventos?

## Aprobaciones

| Rol | Nombre | Fecha | Resultado |
|---|---|---|---|
| Responsable de BD | Víctor Adrián | | |
| Responsable backend | Jonathan | | |

Condición previa: resolver la pregunta 1 (ADR o confirmación escrita del equipo) antes de registrar aprobaciones.

## Aplicación por ambiente

| Ambiente | Estado | Fecha | Evidencia |
|---|---|---|---|
| desarrollo/pruebas | pendiente | | |
| staging | pendiente | | |
| producción | pendiente | | |
