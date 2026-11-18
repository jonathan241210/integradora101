# Diccionario de datos (inicio)

> **Ubicación:** `docs/database/diccionario-datos.md`  
> **Estado:** Borrador inicial (2026-11-17). Consolidado a partir de DBR, migraciones Laravel y documentación de esquema del repositorio.  
> **Alcance:** Tablas y columnas conocidas en `apps/api` (MySQL 8.0.x, `utf8mb4` / `utf8mb4_unicode_ci` por convención de conexión). No sustituye la evidencia de `arca_pruebas`/producción ni el inventario en vivo.

## Fuentes analizadas

- Gobierno y solicitudes: [README.md](README.md), [requests/README.md](requests/README.md), [requests/DBR-001..019](requests/)
- Esquema de referencia (base normalizada, parcial): [esquema-ingles.md](esquema-ingles.md), [esquema-espanol.md](esquema-espanol.md), [esquema-inicial-base.sql](esquema-inicial-base.sql)
- Migraciones: `apps/api/src/database/migrations/` (hasta `2026_11_17_000019_zoo_places_and_path_nodes_schema.php`)
- Alineación veterinaria: [alineacion-formularios-pwa-veterinaria.md](alineacion-formularios-pwa-veterinaria.md)

## Convenciones y notas

- **PK/FK:** salvo nota, `id` autoincremental (`INT` en tablas base heredadas, `BIGINT UNSIGNED` en tablas de migraciones recientes como `visitor_memories`, `species_publication_requests`, etc.). Confirmar tipo físico en BD cuando haya duda.
- **Timestamps:** `created_at`/`updated_at` (nullable en muchas migraciones Laravel). `deleted_at` indica SoftDeletes cuando aplica (Constitución V: modelos de negocio; datos clínicos/financieros nunca borrado físico).
- **Auditoría:** algunas tablas usan `created_by`/`updated_by`/`reviewed_by`; otras usan Activitylog en aplicación. Ver columna “Auditoría/autoría”.
- **Portabilidad:** esquema compatible MySQL 8.0.x (Aiven/local). No se documentan secretos ni hosts.
- **Pendiente de verificación:** tipos exactos/índices/constraints finales en `arca_pruebas` para tablas creadas o alteradas por DBR cuya evidencia detallada no esté adjunta (p. ej. `SHOW CREATE TABLE`). Se marca como `pendiente de evidencia`.

## Mapa de tablas (resumen)

| Dominio | Tablas |
|---|---|
| Organización y personal | `users`, `departments` |
| Visitantes y app móvil | `visitors`, `visitor_collections`, `visitor_memories`, `visitor_memory_reviews`, `visitor_refresh_tokens`, `visitor_verification_codes`, `personal_access_tokens` (Sanctum), `visitor_notification_preferences`, `visitor_push_tokens`, `push_dispatches`, `visitor_favorite_species` |
| Recintos, especies y fauna | `enclosures`, `enclosure_qr_codes`, `species`, `species_publication_requests`, `animals`, `animal_departures`, `zoo_places`, `path_nodes` |
| Clínico veterinario | `clinical_evaluations`, `clinical_evaluation_findings`, `animal_restraints`, `lab_samples` |
| Contenido público | `news`, `events` |
| Taquilla y operación | `tickets`, `ticket_prices`, `staff_notifications` |
| Infra/soporte (Laravel) | `cache`, `cache_locks`, `jobs`, `job_batches`, `failed_jobs`, `sessions` (según DBR-002/migraciones base) |
| Externo solo lectura | `settings_colores` (conexión `mysql2`, no migrada por la app) |

---

## 1. Tablas base (normalizadas) y cambios posteriores

Referencia base: [esquema-ingles.md](esquema-ingles.md) (tablas 1–20). A continuación se anotan deltas conocidos por DBR/migraciones.

### 1.1 `users` (personal)
- Base: DBR-001. Autenticación/roles/permisos por DBR-002 (Spatie) y Fortify; columnas de auth/sesión según migración de staff auth (ver `2026_10_14_000002_staff_authentication_schema.php`).
- **Nota:** el diccionario detallado de columnas de autenticación, Spatie (`roles`, `permissions`, `model_has_roles`, etc.) y soporte de sesión/cache requiere consolidarse desde DBR-002/migraciones; **pendiente de volcar aquí** con `SHOW CREATE TABLE`.

### 1.2 `departments`
- Base: DBR-001/DBR-002 (`code`, `name` visible, rol sugerido en flujo de alta; ver DBR-002).

### 1.3 `visitors`
- Base: DBR-001; cuenta/auth por DBR-003 (columnas de verificación/estado/tokens según migración 000003). Borrado físico de cuenta definido en app (api-004); datos de progreso/favoritos/notificaciones con cascada/restricción según DBR-017/018.

### 1.4 `enclosures` (recintos)
- Base: `id`, `name`.
- **DBR-008 / migración 000008:** `gps_lat` DECIMAL(10,8) NULL, `gps_lon` DECIMAL(11,8) NULL, `map_x` DECIMAL(5,4) NULL, `map_y` DECIMAL(5,4) NULL (coordenadas GPS y posición SVG normalizada).

### 1.5 `species` (especies)
- Base: `id`, `common_name`, `scientific_name`, `distribution`, `conservation_status`, `habitat`, `gestation_period`, `size_cm`, `model_3d_path`, `category` (DBR-004, VARCHAR(30) NULL).
- **DBR-013 / 000013:** `is_published` TINYINT(1) NOT NULL DEFAULT 0, `published_at` TIMESTAMP NULL, `unpublished_at` TIMESTAMP NULL, `image_path` VARCHAR(255) NULL (foto pública), `published_fields` JSON NULL, `deleted_at` TIMESTAMP NULL (SoftDeletes). Índices: `idx_species_is_published`, `idx_species_is_published_unpublished_at`.
- **DBR-014 / 000014:** agrega `feeding` TEXT NULL, `longevity` VARCHAR(50) NULL, `reproduction` VARCHAR(100) NULL en `species` (movidos/consolidados desde `animals` según alineación veterinaria; backfill aplicado en migración).

### 1.6 `animals` (ejemplares)
- Base: ver esquema-ingles tabla 8 (`tag_number`, `responsible_id`, `name`, `sex`, `age`, `origin`, `longevity`, `reproduction`, `diet`, `characteristics`, `photo_path`, fechas, `enclosure_id`, `species_id`, `can_receive_visits`, `stay_status`).
- **DBR-011:** nulabilidad restaurada en columnas afectadas (`tag_number`, etc.) según hallazgos de instancia.
- **DBR-014 / 000014:** agrega `birth_date` DATE NULL, `estimated_age` VARCHAR(50) NULL (backfill desde `age`); `tag_number` pasa a NULL conservando unicidad; elimina de `animals` `longevity`, `reproduction`, `diet`, `age`.
- **DBR-015 / 000015:** elimina `animals.estimated_age` (edad pasa a registrarse por evaluación en `clinical_evaluations.patient_age`); `birth_date` se conserva.

### 1.7 `clinical_evaluations`
- Base: ver esquema-ingles tabla 10 (signos, diagnósticos, `is_fit_for_wild_release`, etc.).
- **DBR-015 / 000015:** agrega `patient_age` VARCHAR(50) NULL (después de `weight_kg`), `deleted_at` TIMESTAMP NULL (SoftDeletes). SoftDeletes también en tablas hijas.
- **DBR-016 / 000016:** agrega `follow_up_status` VARCHAR(50) NULL, `next_review_date` DATE NULL, `is_follow_up` TINYINT(1) NOT NULL DEFAULT 0.

### 1.8 Tablas clínicas hijas
- `clinical_evaluation_findings` (tabla 11), `animal_restraints` (tabla 12), `lab_samples` (tabla 13): **DBR-015** agrega `deleted_at` (SoftDeletes) en cada una.

### 1.9 `news`
- Base: tabla 14. **DBR-005:** `deleted_at` (soft deletes) según migración 000005. **DBR-010 / 000010:** renombra `imagen_noticia` → `image_path` (restauración de contrato). **DBR-011:** `author_id` nullable (restauración de nulabilidad). `category`/`is_active`/fechas según esquema vigente.

### 1.10 `events`
- Base: tabla 15. **DBR-005:** `deleted_at`. **DBR-011:** `author_id` nullable.

### 1.11 `tickets`
- Base: tabla 16 (folio, cantidades, monto, QR, cajero, timestamps). **DBR-006 / 000006:** estado de venta/cancelación, método de pago, precios unitarios aplicados, campos de cancelación/actualización y `deleted_at` según migración y [esquema-ingles.md](esquema-ingles.md) (tablas 16–18). Índices `tickets_qr_code_unique`, `idx_tickets_cashier_purchased`, `idx_tickets_purchased_at`. *Algunas nulabilidades reales pueden diferir de lo planeado; ver notas DBR-006/esquema.*

### 1.12 Tablas de soporte de taquilla/notificaciones
- **`ticket_prices`** (DBR-006): precios unitarios por tipo y vigencia (`ticket_type`, `amount`, `effective_at`, `created_by`, `updated_by`, soft deletes/timestamps). Ver esquema-ingles tabla 17 y migración 000006.
- **`staff_notifications`** (DBR-006): avisos por usuario (`user_id`, `type`, `payload` JSON, `ticket_price_id`, lectura/acuse, sin SoftDeletes). Ver esquema-ingles tabla 18 y migración 000006.

### 1.13 `visitor_collections`, `enclosure_qr_codes`
- Base: tablas 4 y 6 de esquema-ingles. **DBR-004** puede agregar tablas de progreso/gamificación (`visitor_scans`, logros, misiones, libro mayor de puntos, etc.); **pendiente de documentar en detalle** desde `2026_10_15_000004_visitor_progress_schema.php` y DBR-004.

---

## 2. Contenido generado por visitantes (DBR-012)

### 2.1 `visitor_memories`
| Columna | Tipo | Nulo | Default | Descripción / regla | Claves/índices |
|---|---|---:|---|---|---|
| `id` | BIGINT UNSIGNED | No | AI | Identificador | PK |
| `visitor_id` | INT | Sí | NULL | Visitante autor; `SET NULL` al borrar cuenta | FK `visitors.id`, `idx_visitor_memories_visitor_created`, `idx_visitor_memories_visitor_status` |
| `status` | VARCHAR(20) | No | `submitted` | `submitted`, `in_review`, `accepted`, `rejected` (API) | índices de estado/publicación y creación |
| `opinion` | VARCHAR(300) | Sí | NULL | Opinión opcional en texto plano | — |
| `image_path` | VARCHAR(255) | Sí | NULL | Ruta original en `media/memories/` | — |
| `image_sha256` | CHAR(64) | Sí | NULL | Hash para evitar reenvío de misma foto | — |
| `published_image_path` | VARCHAR(255) | Sí | NULL | Ruta expuesta públicamente si aceptada/vigente | — |
| `consent_at` | TIMESTAMP | No | — | Aceptación de términos | — |
| `terms_version` | VARCHAR(20) | No | — | Versión de términos | — |
| `rejection_reason` | VARCHAR(500) | Sí | NULL | Motivo de rechazo | — |
| `rejected_image` | TINYINT(1) | No | 0 | Rechazo marcado en imagen | — |
| `rejected_content` | TINYINT(1) | No | 0 | Rechazo marcado en contenido | — |
| `resubmitted_count` | INT | No | 0 | Reenvíos | — |
| `reviewed_by` | INT | Sí | NULL | Usuario revisor | FK `users.id` RESTRICT |
| `reviewed_at` | TIMESTAMP | Sí | NULL | Fecha de decisión | — |
| `published_at` | TIMESTAMP | Sí | NULL | Publicación | — |
| `published_until` | TIMESTAMP | Sí | NULL | Fin de vigencia pública | — |
| `deleted_at` | TIMESTAMP | Sí | NULL | Soft delete | — |
| `created_at`,`updated_at` | TIMESTAMP | Sí | NULL | Timestamps | — |

**Índices:** `idx_visitor_memories_status_publication (status,published_until,published_at,id)`, `idx_visitor_memories_status_created (status,created_at)`, `idx_visitor_memories_visitor_created (visitor_id,created_at)`, `idx_visitor_memories_visitor_status (visitor_id,status)`.

### 2.2 `visitor_memory_reviews`
Historial de decisiones de revisión (DBR-012). Columnas: `id` (BIGINT PK), `visitor_memory_id` (FK RESTRICT), `decision` VARCHAR(20), `rejection_reason` VARCHAR(500) NULL, `rejected_image`/`rejected_content` TINYINT(1), `reviewed_by` (FK `users` RESTRICT), `reviewed_at` TIMESTAMP, `deleted_at`, timestamps. Índice `idx_visitor_memory_reviews_memory_reviewed (visitor_memory_id, reviewed_at)`.

---

## 3. Publicación de especies (DBR-013)

### 3.1 `species_publication_requests`
| Columna | Tipo | Nulo | Default | Descripción / regla |
|---|---|---:|---|---|
| `id` | BIGINT UNSIGNED | No | AI | PK |
| `species_id` | INT | No | — | Especie existente a publicar (FK `species.id` RESTRICT) |
| `request_type` | VARCHAR(10) | No | — | `publish` / `update` |
| `scientific_name` | VARCHAR(150) | Sí | NULL | Corrección propuesta |
| `habitat` | VARCHAR(150) | Sí | NULL | Corrección propuesta |
| `origin` | VARCHAR(150) | Sí | NULL | Corrección propuesta (mapeada a `species.distribution` al aceptar, decisión 2a) |
| `category` | VARCHAR(30) | Sí | NULL | Tipo propuesto (catálogo DBR-004); NULL = sin corrección |
| `image_path` | VARCHAR(255) | Sí | NULL | Foto pendiente en `media/species-requests/` |
| `published_fields` | JSON | No | — | Selección de ficha pública (lista cerrada en app) |
| `status` | VARCHAR(20) | No | `submitted` | `submitted`, `accepted`, `rejected` |
| `rejection_reason` | VARCHAR(500) | Sí | NULL | Motivo de rechazo |
| `created_by` | INT | No | — | FK `users.id` RESTRICT |
| `updated_by` | INT | Sí | NULL | FK `users.id` RESTRICT |
| `reviewed_by` | INT | Sí | NULL | FK `users.id` RESTRICT |
| `reviewed_at` | TIMESTAMP | Sí | NULL | Última decisión |
| `deleted_at` | TIMESTAMP | Sí | NULL | Soft delete |
| `created_at`,`updated_at` | TIMESTAMP | Sí | NULL | Timestamps |
| `submitted_species_id` | INT (generada, stored) | Sí | — | `IF(status='submitted', species_id, NULL)` para unicidad de una solicitud `submitted` por especie |

**Índices/FK:** `idx_species_publication_requests_status_created`, `idx_species_publication_requests_species_status`, único `uq_species_publication_requests_submitted_species`; FKs RESTRICT a `species` y `users`.

### 3.2 Cambios en `species` (resumen)
Ver sección 1.5: `is_published`, `published_at`, `unpublished_at`, `image_path`, `published_fields`, `deleted_at` + índices de publicación.

---

## 4. Notificaciones y favoritos de visitantes (DBR-017, DBR-018)

### 4.1 `visitor_notification_preferences` (DBR-017)
| Columna | Tipo | Nulo | Default | Descripción |
|---|---|---:|---|---|
| `visitor_id` | INT | No | — | PK y FK `visitors.id` ON DELETE CASCADE |
| `news_and_events` | TINYINT(1) | No | 0 | Preferencia |
| `memory_status` | TINYINT(1) | No | 1 | Preferencia |
| `created_at`,`updated_at` | TIMESTAMP | Sí | NULL | Timestamps |

### 4.2 `visitor_push_tokens` (DBR-017)
`id` BIGINT PK, `visitor_id` INT FK `visitors` CASCADE (indexado), `token` VARCHAR(255) UNIQUE (`uk_visitor_push_tokens_token`), `platform` VARCHAR(16), timestamps. Sin SoftDeletes.

### 4.3 `push_dispatches` (DBR-017)
`id` BIGINT PK, `subject_type` VARCHAR(20), `subject_id` BIGINT UNSIGNED, `transition_key` VARCHAR(64), `status` VARCHAR(20) DEFAULT `pending`, timestamps. UNIQUE (`subject_type`,`subject_id`,`transition_key`). Tabla anti-duplicado sin datos personales.

### 4.4 `visitor_favorite_species` (DBR-018)
`id` BIGINT PK, `visitor_id` INT FK `visitors` CASCADE, `species_id` INT FK `species` RESTRICT, timestamps. UNIQUE (`visitor_id`,`species_id`). Sin SoftDeletes.

---

## 5. Mapa y navegación (DBR-008, DBR-019)

### 5.1 `enclosures` (coordenadas)
Ver 1.4.

### 5.2 `zoo_places` (DBR-019)
| Columna | Tipo | Nulo | Default | Descripción |
|---|---|---:|---|---|
| `id` | INT UNSIGNED | No | AI | PK (estable) |
| `name` | VARCHAR(255) | No | — | Nombre visible |
| `name_original` | VARCHAR(255) | Sí | NULL | Trazabilidad del levantamiento |
| `place_type` | VARCHAR(50) | No | — | Catálogo cerrado (propuesto: `access, amenity, common_area, food, landmark, restroom, ticketing, viewpoint`) |
| `gps_lat` | DECIMAL(10,8) | Sí | NULL | Latitud GPS |
| `gps_lon` | DECIMAL(11,8) | Sí | NULL | Longitud GPS |
| `map_x` | DECIMAL(5,4) | Sí | NULL | Coordenada SVG normalizada 0–1 |
| `map_y` | DECIMAL(5,4) | Sí | NULL | Coordenada SVG normalizada 0–1 |
| `is_visible` | TINYINT(1) | No | 1 | Visibilidad |
| `created_at`,`updated_at` | TIMESTAMP | Sí | NULL | Timestamps |
| `deleted_at` | TIMESTAMP | Sí | NULL | Soft delete |

**Índices:** `idx_zoo_places_type`, `idx_zoo_places_visible`. **Sin unicidad por nombre** (puntos distintos pueden repetir nombre).

### 5.3 `path_nodes` (DBR-019)
| Columna | Tipo | Nulo | Default | Descripción |
|---|---|---:|---|---|
| `id` | INT UNSIGNED | No | AI | PK |
| `name` | VARCHAR(255) | Sí | NULL | Etiqueta opcional |
| `node_type` | VARCHAR(50) | No | — | Catálogo cerrado (propuesto: `intersection, path, path_node, turn`) |
| `gps_lat`,`gps_lon` | DECIMAL(10,8)/(11,8) | Sí | NULL | GPS |
| `map_x`,`map_y` | DECIMAL(5,4) | Sí | NULL | SVG normalizado |
| `created_at`,`updated_at`,`deleted_at` | TIMESTAMP | Sí | NULL | Timestamps y soft delete |

**Índice:** `idx_path_nodes_type`. **Fase 2:** `path_edges` no creada.

---

## 6. Pendientes para completar el diccionario

1. **Volcar tablas de auth/soporte creadas por DBR-002/003/004:** `personal_access_tokens`, `visitor_refresh_tokens`, `visitor_verification_codes`, tablas Spatie (`roles`, `permissions`, `model_has_roles`, `model_has_permissions`, `role_has_permissions`), `sessions`, `cache`, `activity_log` (si aplica), y tablas de progreso/gamificación de DBR-004, con columnas/tipos/índices reales.
2. **Adjuntar evidencia de esquema en `arca_pruebas`** (`SHOW CREATE TABLE`, `information_schema`) para DBR-010/011/013–019 donde falte detalle de collation/índices/engine.
3. **Actualizar [esquema-ingles.md](esquema-ingles.md)** o marcarlo explícitamente como histórico/parcial, y mantener este diccionario como fuente consolidada viva.
4. **Documentar catálogos/enums de aplicación** (estados, tipos) y su relación con columnas VARCHAR/ENUM/CHECK en BD.
5. **Especificar relaciones (cardinalidad) y reglas de negocio** por tabla (quién escribe, quién lee, endpoints consumidores) cuando exista spec aprobada.
6. **`settings_colores` (mysql2, solo lectura):** documentar columnas conocidas y contrato de lectura sin proponer cambios de esquema.

## Historial

- 2026-11-17: creación inicial del diccionario consolidando DBR-001 a DBR-019, migraciones hasta 000019 y esquema-ingles/esquema-espanol. Incluye tablas nuevas/alteradas por DBR-005, 006, 008, 010–019 y deltas conocidos en tablas base; pendientes de auth/progreso detallado y evidencia en vivo.
