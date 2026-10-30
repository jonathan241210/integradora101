# DBR-005 · news-events-soft-deletes

- Estado: Aprobada
- Feature/spec origen: `apps/api/specs/007-administration-management.md`
- Solicitante: Jonathan
- Responsable de BD: Víctor Adrián
- Responsable backend: Jonathan
- Fecha: 2026-10-30
- Depende de: DBR-001 (`english-schema-normalization`), ya aplicada

## Problema y justificación

La feature `api-007` permite al administrador eliminar noticias y eventos desde el dashboard. La spec exige **borrado lógico** (CA-15, RN-09): lo eliminado no debe borrarse físicamente, debe dejar de aparecer en las listas de administración y, en el caso de los eventos, en el catálogo público (`GET /api/v1/events`, `api-006`). Las tablas `news` y `events` no tienen una columna que marque la baja.

Además, el reporte de boletos (`api-007` CA-19 a CA-23) consulta `tickets` por rango de fecha de compra. Se solicita al responsable de BD **evaluar** si hace falta un índice por `purchased_at`.

## Estado actual

- `news` y `events` existen con las columnas de `docs/database/esquema-ingles.md` (secciones 14 y 15); no tienen `created_at`, `updated_at` ni `deleted_at`. `events.author_id` y `news.author_id` referencian a `users(id)`.
- `tickets` existe (sección 16) con `purchased_at` DATETIME NOT NULL. Se desconoce si existe un índice sobre esa columna; el responsable de BD lo confirma al revisar.

## Contrato solicitado

### `news` y `events` — columna nueva

| Columna | Tipo | Restricciones |
|---|---|---|
| `deleted_at` | timestamp | NULL, sin default |

Sin otros cambios: no se agregan `created_at`/`updated_at` ni `created_by`/`updated_by`; la trazabilidad la da Activitylog.

### `tickets` — índice (a criterio del responsable de BD)

| Elemento | Detalle |
|---|---|
| Índice `idx_tickets_purchased_at` | sobre `purchased_at`, solo si no existe uno equivalente |

### Consumo esperado

- El modelo `News` (nuevo) y `Event` usan `SoftDeletes` de Eloquent con `deleted_at`.
- Las consultas del reporte filtran `purchased_at >= :desde AND purchased_at < :hasta` y recorren el resultado ordenado por `purchased_at`.

## Elementos afectados

| Tipo | Nombre | Cambio |
|---|---|---|
| columna | `news.deleted_at` | agregar |
| columna | `events.deleted_at` | agregar |
| índice | `tickets.idx_tickets_purchased_at` | agregar si no existe equivalente |

## SQL de referencia (MySQL 8.0)

> **Referencia para revisión; no ejecutar directamente.** El cambio real se implementará como migración Laravel creada por el responsable de BD.

```sql
-- propuesta ilustrativa
ALTER TABLE news   ADD COLUMN deleted_at TIMESTAMP NULL;
ALTER TABLE events ADD COLUMN deleted_at TIMESTAMP NULL;

-- solo si no existe un índice por purchased_at
CREATE INDEX idx_tickets_purchased_at ON tickets (purchased_at);
```

## Datos existentes y migración de datos

Los registros actuales conservan `deleted_at = NULL` (no eliminados). No requiere backfill. `ADD COLUMN ... NULL` no reescribe valores.

## Privacidad, auditoría y retención

- `news` y `events` son contenido institucional público, no datos clínicos ni financieros. Se usa SoftDeletes por decisión funcional (spec `api-007`): lo eliminado se conserva y puede restaurarse por BD.
- Las acciones (alta, edición, cambio de estado, eliminación) se registran en Activitylog desde la API.
- `tickets` es un dato financiero de solo lectura para esta feature; el índice no cambia su retención ni su auditoría.

## Impacto, rendimiento y reversión

- Tablas pequeñas (`news`, `events`): `ADD COLUMN` instantáneo en MySQL 8.0 (`ALGORITHM=INSTANT` cuando aplica).
- `tickets` puede crecer con la venta real; crear el índice antes de que haya volumen evita un bloqueo largo. Medir el tamaño actual al revisar.
- Reversión (`down()`): quitar el índice y las dos columnas; respaldo previo de `news` y `events`. Si ya hay filas con `deleted_at` no nulo, restaurarlas o exportarlas antes de revertir.

## Compatibilidad MySQL 8.0

`ADD COLUMN ... TIMESTAMP NULL` y `CREATE INDEX` son sintaxis estándar de MySQL 8.0.x; sin extensiones propietarias, portables entre Aiven y MySQL local.

## Objeto almacenado (si aplica)

No aplica.

## Orden de despliegue

1. Aplicar la migración en `arca_pruebas` y registrar la evidencia.
2. Con la DBR en `Lista para backend`, backend agrega `SoftDeletes` a `Event` y crea `News` con el trait, y habilita las rutas `DELETE` de noticias y eventos.
3. **Antes** de que el trait `SoftDeletes` llegue a una rama que se despliegue, la columna debe existir en ese ambiente: sin ella fallan `GET /api/v1/events` y el resto del catálogo. Cambio expansivo (columna nullable) antes que cualquier código consumidor.

## Pruebas y evidencia

- Pruebas de esquema/objeto ejecutadas por BD en base MySQL 8.0 aislada: pendiente.
- Resultado y evidencia (sin secretos ni datos sensibles): pendiente.
- Pruebas integradas del backend: `NewsAdminTest`, `EventsAdminTest` (CA-15) y `PublicCatalogTest` en `apps/api/src/tests/Feature/`.

## Aprobaciones

| Rol | Nombre | Fecha | Resultado |
|---|---|---|---|
| Responsable de BD | Víctor Adrián | | Pendiente |
| Responsable backend | Jonathan | | Pendiente |

## Aplicación por ambiente

| Ambiente | Estado | Fecha | Evidencia |
|---|---|---|---|
| desarrollo/pruebas | pendiente | | |
| staging | pendiente | | |
| producción | pendiente | | |


