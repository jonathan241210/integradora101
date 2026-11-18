# DBR-018 · visitor-favorite-species

- Estado: Aprobada y Lista para backend (BD Victor Adrian y backend Aksel, 2026-11-14). Migración probada en MySQL 8.0 aislado.
- Feature/spec origen: `apps/api/specs/018-visitor-favorite-species.md` (Aprobada). Consumidor: `apps/mobile/specs/014-visitor-favorite-species.md` (Aprobada).
- Solicitante: Aksel
- Responsable de BD: Victor Adrian
- Responsable backend: Aksel
- Fecha: 2026-11-14

Aprobación de BD (Victor Adrian) y de backend (Aksel), 2026-11-14. La migración ya estaba probada en MySQL 8.0 aislado. Con las dos firmas queda Aprobada y Lista para backend. La evidencia sigue siendo ese MySQL aislado: esta firma no aplica la migración en `arca_pruebas` ni en `arca_zoo`.

## Problema y justificación

Los animales favoritos del visitante se guardan hoy solo en el teléfono. La ficha usa el id de la especie publicada, no el del ejemplar. Hace falta una tabla que una la cuenta con esas especies para que la lista siga al cambiar de teléfono y no se comparta con otra cuenta en el mismo aparato. `visitor_collections` es el desbloqueo por QR y no sirve para esto.

## Estado actual

No existe `visitor_favorite_species`. `visitors.id` es INT (DBR-003). `species.id` es INT. La especie visible para el público es la que tiene `is_published = 1` y `deleted_at` nulo (`api-015`). Esa regla la aplica la API; esta tabla no la duplica con un trigger.

## Contrato solicitado

- Una fila por pareja `visitor_id` + `species_id`.
- `created_at` para ordenar de la más reciente a la más antigua.
- Al borrar el visitante, sus filas desaparecen (`ON DELETE CASCADE`).
- Borrar una especie de forma física no debe arrastrar filas en silencio: la clave hacia `species` queda `ON DELETE RESTRICT`. El GET de la API omite las especies que ya no son visibles sin borrar la fila (`api-018` RN-06).
- Sin SoftDeletes, sin `created_by` y sin `updated_by`. Es una preferencia de la cuenta, no un dato clínico ni financiero. BD y backend aceptan o rechazan esta excepción al aprobar la solicitud.

## Elementos afectados

| Tipo | Nombre | Cambio |
|---|---|---|
| tabla | `visitor_favorite_species` | Nueva |
| columna | `id` | BIGINT UNSIGNED, clave primaria |
| columna | `visitor_id` | INT, NOT NULL, foránea a `visitors(id)` `ON DELETE CASCADE` |
| columna | `species_id` | INT, NOT NULL, foránea a `species(id)` `ON DELETE RESTRICT` |
| columna | `created_at` | TIMESTAMP, NULL |
| columna | `updated_at` | TIMESTAMP, NULL |
| índice | `uk_visitor_favorite_species_pair` | Único sobre (`visitor_id`, `species_id`) |

El índice único empieza por `visitor_id`, así el listado de una cuenta no necesita otro índice.

## SQL de referencia (MySQL 8.0)

> **Referencia para revisión; no ejecutar directamente.** El cambio real se implementará como migración Laravel creada por el responsable de BD, después de que esta DBR esté aprobada.

```sql
CREATE TABLE visitor_favorite_species (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  visitor_id INT NOT NULL,
  species_id INT NOT NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_visitor_favorite_species_pair (visitor_id, species_id),
  CONSTRAINT fk_visitor_favorite_species_visitor_id
    FOREIGN KEY (visitor_id) REFERENCES visitors (id) ON DELETE CASCADE,
  CONSTRAINT fk_visitor_favorite_species_species_id
    FOREIGN KEY (species_id) REFERENCES species (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## Datos existentes y migración de datos

La tabla es nueva. No hay filas que migrar. Los id que hoy están en el teléfono los sube la app una sola vez (`mobile-014` CA-03), no esta migración.

## Privacidad, auditoría y retención

- La fila dice qué especie marcó una cuenta. No guarda nombre, correo ni nota.
- No se expone en una ruta pública.
- SoftDeletes: no, en la propuesta. Activitylog: no.
- Quitar el favorito borra la fila desde la API. Borrar la cuenta las borra en cascada.

## Impacto, rendimiento y reversión

- El catálogo de especies del zoológico es pequeño. La tabla crece por cuenta, no por visita anónima.
- `down()` de la migración futura elimina `visitor_favorite_species`. Antes de aplicar en un ambiente con datos, respaldo previo. Hoy no se aplica en ningún ambiente.

## Compatibilidad MySQL 8.0

Tipos y sintaxis estándar (INT, BIGINT UNSIGNED, TIMESTAMP, índice único, claves foráneas). Sin extensiones propietarias. Portable entre Aiven y MySQL local (ADR 0013). Depende de que existan `visitors` y `species`.

## Objeto almacenado (si aplica)

No aplica. No se crean funciones, procedimientos, vistas ni triggers. La regla de visibilidad sigue en la Action de `api-015` / `api-018`.

## Orden de despliegue

1. Aprobación de `api-018` y de esta DBR (BD y backend, por separado).
2. El responsable de BD escribe la migración, la prueba en una base MySQL 8.0 aislada y documenta la evidencia.
3. Con `Lista para backend`, el backend implementa el modelo y las rutas. Antes de esa migración el código consumidor no se activa.
4. `arca_zoo` no se usa para probar este cambio.

## Pruebas y evidencia

- Pruebas de esquema/objeto ejecutadas por BD en base MySQL 8.0 aislada: completadas (2026-11-14, Victor Adrian), sin errores.
- Resultado y evidencia (sin secretos ni datos sensibles): migraci�n Laravel de DBR-018 creada y ejecutada en entorno MySQL 8.0 aislado sin errores (2026-11-14). Detalle de comandos/salida no adjuntado en este documento.
- Pruebas integradas del backend: pendiente. Empiezan cuando esta DBR esté en `Lista para backend`.

## Aprobaciones

| Rol | Nombre | Fecha | Resultado |
|---|---|---|---|
| Responsable de BD | Victor Adrian | 2026-11-14 | Aprobado |
| Responsable backend | Aksel | 2026-11-14 | Aprobado |

## Aplicación por ambiente

| Ambiente | Estado | Fecha | Evidencia |
|---|---|---|---|
| desarrollo/pruebas | aplicada/probada | 2026-11-14 | Migraci�n ejecutada en base MySQL 8.0 aislada sin errores (Victor Adrian) |
| staging | pendiente | | |
| producción | pendiente | | |
