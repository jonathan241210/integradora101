# DBR-011 · nullable-columns-restore

- Estado: Aprobada (Lista para backend, 2026-11-10)
- Feature/spec origen: restauración de `arca_pruebas` en la nueva instancia de Aiven; relacionada con DBR-010. Consumidores: api-003 a api-011 (suite PHPUnit completa).
- Solicitante: Jonathan (responsable funcional y backend)
- Responsable de BD: Víctor Adrián
- Responsable backend: Jonathan
- Fecha: 2026-11-07

## Problema y justificación

Tras aplicar DBR-010, la suite de `apps/api` (245 tests, corrida del 2026-11-07 contra la nueva instancia) dio **69 fallos, todos con la misma causa**: cuatro columnas son `NOT NULL` sin valor por defecto en la copia, y el código y los tests insertan filas sin ellas. Con la base anterior esos tests pasaban, lo que indica que esas columnas aceptaban `NULL`. El equipo confirmó que por ahora no hay problema si esos campos quedan en `NULL`, porque parte de los datos relacionados se borró.

## Estado actual

| Tabla.columna | Tipo | Hoy | Fallos que causa | Tests afectados |
|---|---|---|---|---|
| `news.author_id` | INT (FK `fk_noticias_empleado` → `users.id`) | NOT NULL, sin default | `1364 Field 'author_id' doesn't have a default value` y `1048 Column 'author_id' cannot be null` | 37 (eventos y noticias: admin, imágenes, catálogo y lectura pública) |
| `events.author_id` | INT (FK `fk_eventos_empleado` → `users.id`) | NOT NULL, sin default | igual que la anterior | (incluidos arriba) |
| `visitors.last_name` | VARCHAR(100) | NOT NULL, sin default | `1364 Field 'last_name' doesn't have a default value` | 28 (autenticación y progreso del visitante) |
| `animals.tag_number` | VARCHAR(50), único | NOT NULL, sin default | `1364 Field 'tag_number' ...` | 3 (`PublicCatalogTest`) |
| `species.scientific_name` | VARCHAR(150) | NOT NULL, sin default | `1364 Field 'scientific_name' ...` | 1 (`EnclosuresAdminTest`) |

`docs/database/esquema-ingles.md` documenta estas columnas como NOT NULL, así que esta DBR también corrige la diferencia entre ese documento y el comportamiento que espera el código.

## Contrato solicitado

Las cinco columnas pasan a aceptar `NULL` (`DEFAULT NULL`), manteniendo tipo, longitud, claves foráneas y la unicidad de `animals.tag_number`. El código ya tolera `NULL` en estos campos; no se pide cambio de código.

## Elementos afectados

| Tipo | Nombre | Cambio |
|---|---|---|
| columna | `news.author_id` | `INT NULL` (conserva FK) |
| columna | `events.author_id` | `INT NULL` (conserva FK) |
| columna | `visitors.last_name` | `VARCHAR(100) NULL` |
| columna | `animals.tag_number` | `VARCHAR(50) NULL` (conserva UNIQUE; MySQL permite varios NULL) |
| columna | `species.scientific_name` | `VARCHAR(150) NULL` |

## SQL de referencia (MySQL 8.0)

> **Referencia para revisión; no ejecutar directamente.** El cambio real se implementará como migración Laravel creada por el responsable de BD.

```sql
ALTER TABLE news     MODIFY author_id INT NULL;
ALTER TABLE events   MODIFY author_id INT NULL;
ALTER TABLE visitors MODIFY last_name VARCHAR(100) NULL;
ALTER TABLE animals  MODIFY tag_number VARCHAR(50) NULL;
ALTER TABLE species  MODIFY scientific_name VARCHAR(150) NULL;
```

## Datos existentes y migración de datos

No hay backfill; las columnas solo se relajan. Las filas existentes no cambian.

## Privacidad, auditoría y retención

`animals` y `species` son catálogo zoológico; `visitors.last_name` es dato personal. `news` y `events` son contenido público. Sin cambios de SoftDeletes ni de auditoría.

## Impacto, rendimiento y reversión

Tablas vacías o muy pequeñas. Reversión en `down()`: volver a `NOT NULL`, solo si ninguna fila tiene `NULL` en esa columna. Respaldo previo recomendado.

## Compatibilidad MySQL 8.0

`MODIFY` y la relajación de `NOT NULL` son compatibles con 8.0 y 8.4. En Laravel se usa `->nullable()->change()`.

## Orden de despliegue

Aplicar después de DBR-010, en `arca_pruebas`. Luego volver a correr la suite de `apps/api` (esperado: 0 fallos por estas columnas) y la prueba funcional del portal web.

## Pruebas y evidencia

- Pruebas de esquema/objeto ejecutadas por BD en base MySQL 8.0 aislada: pendiente.
- Evidencia (sin secretos ni datos sensibles): la corrida del 2026-11-07 tuvo 245 tests, 41 errores y 28 fallos; el 100 % de ellos corresponde a las cinco columnas de la tabla anterior.
- Pruebas integradas del backend: toda la suite de `apps/api` tras aplicar el cambio.

## Aprobaciones

| Rol | Nombre | Fecha | Resultado |
|---|---|---|---|
| Responsable de BD | Víctor Adrián | 2026-11-10 | Aprobada |
| Responsable backend | Jonathan | 2026-11-10 | Aprobada (solicitante) |

## Aplicación por ambiente

| Ambiente | Estado | Fecha | Evidencia |
|---|---|---|---|
| desarrollo/pruebas | pendiente | | |
| staging | pendiente | | |
| producción | pendiente | | |
