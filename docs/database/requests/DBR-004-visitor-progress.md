# DBR-004 · visitor-progress

- Estado: Lista para backend
- Feature/spec origen: `apps/api/specs/005-visitor-progress.md`
- Solicitante: Aksel
- Responsable de BD: Victor Adrian
- Responsable backend: Por definir
- Fecha: 2026-10-13
- Depende de: DBR-001 (`english-schema-normalization`) y DBR-003 (`visitor-accounts`), que deben aplicarse primero

## Problema y justificación

La feature `api-005` (progreso del visitante) convierte la colección en un descubrimiento **por especie**: el QR del recinto descubre las especies de sus animales en exhibición. La tabla `visitor_collections` actual está pensada por QR (un registro por `enclosure_qr_code_id`), así que hay que reestructurarla a especie, registrar cada escaneo para idempotencia y antiabuso (`visitor_scans`), crear los catálogos estáticos de logros y misiones con sus pivots, y un libro mayor de puntos (`visitor_point_entries`) que impida duplicados.

## Estado actual

Tras DBR-001 (pendiente de aplicación): `visitor_collections` tiene `id`, `unlocked_date`, `enclosure_qr_code_id`, `visitor_id` y único `(visitor_id, enclosure_qr_code_id)`; `species` no tiene categoría; `enclosure_qr_codes.enclosure_id` está en CASCADE. No existen `visitor_scans`, `achievements`, `visitor_achievements`, `missions`, `visitor_mission_completions` ni `visitor_point_entries`. Todas las tablas están vacías.

## Contrato solicitado

### `species` — columna nueva

| Columna | Tipo | Restricciones |
|---|---|---|
| `category` | varchar(30) | NULL; valores: `mammal`, `bird`, `reptile`, `amphibian`, `fish`, `invertebrate` |

### `visitor_collections` — reestructura (colección por especie)

| Columna | Cambio | Tipo / restricciones |
|---|---|---|
| `visitor_id` | conservar | FK `visitors.id`, ON DELETE CASCADE |
| `species_id` | agregar | FK `species.id`, ON DELETE RESTRICT |
| `enclosure_qr_code_id` | conservar | NULL, FK `enclosure_qr_codes.id`, ON DELETE SET NULL (origen del descubrimiento) |
| `discovered_at` | renombrar de `unlocked_date` | timestamp (fecha/hora del descubrimiento) |
| `created_at` | agregar | timestamp NULL |
| `id`, `unlocked_date` | retirar `id`; `unlocked_date` se renombra | — |

Unicidad: UNIQUE `(visitor_id, species_id)` **en lugar de** `(visitor_id, enclosure_qr_code_id)`.

### `visitor_scans` — tabla nueva (idempotencia, auditoría y antiabuso)

| Columna | Tipo | Restricciones |
|---|---|---|
| `id` | int / bigint PK | auto |
| `visitor_id` | FK `visitors.id` | ON DELETE CASCADE |
| `client_scan_id` | char(36) | UUID generado por la app |
| `submitted_code` | varchar(255) | código QR enviado |
| `enclosure_qr_code_id` | FK `enclosure_qr_codes.id` | NULL, ON DELETE SET NULL |
| `scanned_at` | timestamp | declarado por el cliente |
| `received_at` | timestamp | hora del servidor |
| `result` | varchar(30) | `discovered` \| `already_discovered` \| `invalid_code` \| `expired_scan` \| `inactive_code` |

Unicidad: UNIQUE `(visitor_id, client_scan_id)`.

### `achievements` — tabla nueva (catálogo estático)

| Columna | Tipo | Restricciones |
|---|---|---|
| `id` | int / bigint PK | auto |
| `code` | varchar(50) | UNIQUE |
| `title` | varchar(255) | |
| `description` | varchar(255) | |
| `icon` | varchar(100) | |
| `points` | int | |
| `rule_type` | varchar(40) | `species_count` \| `category_species_count` \| `enclosure_count` \| `missions_completed` |
| `rule_target` | int | |
| `rule_param` | varchar(50) | NULL (p. ej. categoría) |
| `sort_order` | int | |
| `is_active` | tinyint(1) | DEFAULT 1 |
| `created_at`, `updated_at` | timestamp | NULL |

### `visitor_achievements` — tabla nueva (pivot)

| Columna | Tipo | Restricciones |
|---|---|---|
| `visitor_id` | FK `visitors.id` | ON DELETE CASCADE |
| `achievement_id` | FK `achievements.id` | ON DELETE RESTRICT |
| `unlocked_at` | timestamp | |

Unicidad: UNIQUE `(visitor_id, achievement_id)`.

### `missions` — tabla nueva (catálogo estático)

Misma forma de regla que `achievements` (`code`, `title`, `description`, `icon`, `rule_type`, `rule_target`, `rule_param`, `sort_order`, `is_active`, timestamps), además de `objective` varchar(255) y `points` int.

### `visitor_mission_completions` — tabla nueva (pivot)

| Columna | Tipo | Restricciones |
|---|---|---|
| `visitor_id` | FK `visitors.id` | ON DELETE CASCADE |
| `mission_id` | FK `missions.id` | ON DELETE RESTRICT |
| `completed_at` | timestamp | |

Unicidad: UNIQUE `(visitor_id, mission_id)`.

### `visitor_point_entries` — tabla nueva (libro mayor)

| Columna | Tipo | Restricciones |
|---|---|---|
| `id` | int / bigint PK | auto |
| `visitor_id` | FK `visitors.id` | ON DELETE CASCADE |
| `source_type` | varchar(30) | `species_discovery` \| `achievement` \| `mission` |
| `source_id` | int | id del origen (especie, logro o misión) |
| `points` | int | |
| `created_at` | timestamp | |

Unicidad: UNIQUE `(visitor_id, source_type, source_id)` — impide puntos duplicados.

### Recomendación de clave

Se recomienda que la FK `enclosure_qr_codes.enclosure_id` pase de **CASCADE a RESTRICT**: borrar un recinto no debe eliminar los códigos QR que dieron origen a descubrimientos ya registrados.

### Datos de catálogo

Los catálogos de logros y misiones los cargan seeders del backend (`AchievementSeeder`, `MissionSeeder`), idempotentes por `code`; **no** se cargan por migración.

## Elementos afectados

| Tipo | Nombre | Cambio |
|---|---|---|
| columna | `species.category` | agregar |
| tabla | `visitor_collections` | reestructurar a colección por especie |
| tabla | `visitor_scans` | crear |
| tabla | `achievements`, `visitor_achievements` | crear |
| tabla | `missions`, `visitor_mission_completions` | crear |
| tabla | `visitor_point_entries` | crear |
| clave foránea | `enclosure_qr_codes.enclosure_id` | CASCADE → RESTRICT (recomendado) |

## SQL de referencia (MySQL 8.0)

> **Referencia para revisión; no ejecutar directamente.** El cambio real se implementará como migración Laravel creada por el responsable de BD.

```sql
-- propuesta ilustrativa
ALTER TABLE species ADD COLUMN category VARCHAR(30) NULL;

ALTER TABLE visitor_collections
  DROP COLUMN id,
  RENAME COLUMN unlocked_date TO discovered_at,
  ADD COLUMN species_id INT NOT NULL,
  ADD COLUMN created_at TIMESTAMP NULL,
  DROP INDEX uk_visitor_collections_visitor_id_enclosure_qr_code_id,
  ADD UNIQUE KEY uk_visitor_collections_visitor_id_species_id (visitor_id, species_id);

CREATE TABLE visitor_scans (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  visitor_id INT NOT NULL,
  client_scan_id CHAR(36) NOT NULL,
  submitted_code VARCHAR(255) NOT NULL,
  enclosure_qr_code_id INT NULL,
  scanned_at TIMESTAMP NOT NULL,
  received_at TIMESTAMP NOT NULL,
  result VARCHAR(30) NOT NULL,
  UNIQUE KEY uk_visitor_scans_visitor_client (visitor_id, client_scan_id),
  CONSTRAINT fk_visitor_scans_visitor_id FOREIGN KEY (visitor_id) REFERENCES visitors (id) ON DELETE CASCADE,
  CONSTRAINT fk_visitor_scans_enclosure_qr_code_id FOREIGN KEY (enclosure_qr_code_id) REFERENCES enclosure_qr_codes (id) ON DELETE SET NULL
);
```

## Datos existentes y migración de datos

Las tablas están vacías: no se requiere backfill. La reestructura de `visitor_collections` no pierde datos.

## Privacidad, auditoría y retención

- El progreso es dato personal ligado a la cuenta del visitante (adulto). Al borrar la cuenta (DBR-003), `visitor_collections`, `visitor_scans`, `visitor_achievements`, `visitor_mission_completions` y `visitor_point_entries` se eliminan en cascada.
- `visitor_scans` funciona también como auditoría antiabuso: guarda el código enviado, las horas declarada y recibida, y el resultado; nunca contraseñas ni tokens.
- Sin SoftDeletes en estas tablas: son datos del visitante suprimibles (LFPDPPP), no clínicos ni financieros.

## Impacto, rendimiento y reversión

- ALTERs sobre tablas vacías y creación de tablas nuevas: sin riesgo de bloqueo.
- **Reversión:** el `down()` elimina las tablas nuevas, restaura la estructura anterior de `visitor_collections` (incluido el índice único por QR), retira `species.category` y devuelve `enclosure_qr_codes.enclosure_id` a CASCADE.
- Respaldo previo según la política de gobierno.

## Compatibilidad MySQL 8.0

Sin sintaxis fuera de MySQL 8.0.x ni extensiones propietarias.

## Objeto almacenado (si aplica)

No aplica.

## Orden de despliegue

- Se aplica **después** de DBR-001 y DBR-003 (`visitor_id`, nombres en inglés).
- Se aplica en `arca_zoo` (desarrollo compartido) y se verifica en `arca_pruebas` (solo PHPUnit).
- El código consumidor (`EvaluateVisitorProgressAction`, seeders, endpoints `/api/v1/visitor`) se implementa solo cuando esta DBR esté en `Lista para backend`.

## Pruebas y evidencia

- Pruebas de esquema/objeto ejecutadas por BD en base MySQL 8.0/8.4 aislada (`arca_pruebas`): Ejecutadas exitosamente.
- Resultado y evidencia (sin secretos ni datos sensibles):
  - Migración `2026_10_15_000004_visitor_progress_schema.php` ejecutada sin errores (16s).
  - Columna `category` añadida a `species`.
  - FK `enclosure_qr_codes.enclosure_id` actualizada a `ON DELETE RESTRICT`.
  - `visitor_collections` reestructurada exitosamente como colección por especie con PK compuesta `(visitor_id, species_id)` y `discovered_at`.
  - Tablas nuevas creadas: `visitor_scans`, `achievements`, `visitor_achievements`, `missions`, `visitor_mission_completions`, `visitor_point_entries`.
- Pruebas integradas del backend: lista para consumo.

## Aprobaciones

| Rol | Nombre | Fecha | Resultado |
|---|---|---|---|
| Responsable de BD | Victor Adrian | 2026-10-15 | Aprobada |
| Solicitante / Backend | Aksel / Jonathan | 2026-10-15 | Aprobada |

## Aplicación por ambiente

| Ambiente | Estado | Fecha | Evidencia |
|---|---|---|---|
| desarrollo/pruebas (`arca_pruebas`) | aplicada | 2026-10-15 | Migración 2026_10_15_000004 ejecutada y verificada |
| staging | pendiente | | |
| producción | pendiente | | |
