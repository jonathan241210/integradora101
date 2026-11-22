# DBR-025 · Dato curioso de la especie (`fun_fact`)

- Estado: Lista para backend. Aprobada por Jonathan como responsable de BD por delegación (2026-11-21), con `VARCHAR(500)` NULL y collation heredada de cada tabla.
- Feature/spec origen: `apps/api/specs/026-species-fun-fact.md` (Aprobada 2026-11-21). Plan: `apps/api/plan/026-species-fun-fact.md`. Revisiones de consumidores: `apps/pwa/specs/005-species-request-submission.md` (nota), `apps/dashboard/specs/010-public-content-management.md` (nota), `apps/web/specs/011-dynamic-tulanpedia.md` (nota). Relacionada con DBR-013 (columnas de publicación de `species` y de `species_publication_requests`).
- Solicitante: Jonathan (decisión funcional del 2026-11-21: un campo de texto plano opcional «Dato curioso», de hasta 500 caracteres).
- Responsable de BD: Jonathan, por delegación del responsable de BD (2026-11-21), igual que en DBR-024.
- Responsable backend: Jonathan.
- Fecha de redacción: 2026-11-21

## Problema y justificación

La ficha pública de especies (TulanPedia) necesita un dato curioso corto por especie. El veterinario lo propone desde la PWA al pedir la publicación; la Dirección lo revisa y lo edita en el dashboard, y al aceptar se copia a `species`. Hoy ninguna de las dos tablas tiene columna para ese texto.

Sin esta DBR no hay dónde guardar la propuesta (`species_publication_requests`) ni el valor publicado (`species`). Se guarda en las dos tablas porque el flujo es el mismo que `origin` → `distribution` (DBR-013 2a=A): la solicitud propone y la aceptación copia.

## Estado actual

Consultado sobre la base viva `arca_pruebas` el 2026-11-21, en solo lectura, por la sesión principal (no se ejecutó ningún `ALTER`, `INSERT`, `UPDATE`, `DELETE` ni migración):

- `species`: 19 columnas. Texto: `feeding` (text), `distribution` (varchar 255), `habitat` (varchar 255), y otras. `published_fields` (json). **No existe** ninguna columna de dato curioso. Collation de la tabla: `utf8mb4_0900_ai_ci`.
- `species_publication_requests`: 19 columnas. Incluye `scientific_name`, `habitat` y `origin` (varchar 150), `category`, `image_path`, `published_fields` (json), `status` y `rejection_reason` (varchar 500). **No existe** ninguna columna de dato curioso. Collation de la tabla: `utf8mb4_unicode_ci`.
- Conteo de filas (2026-11-21, solo lectura): `species` = 9 (ninguna eliminada); `species_publication_requests` = 7. `migrations` = 24 filas, último lote 14.
- Comandos usados por la sesión principal: `php artisan db:table species`, `php artisan db:table species_publication_requests` y conteos con `DB::table(...)->count()` vía `php artisan tinker` (solo lectura).
- Comparación con migraciones y documentación: las columnas de publicación de DBR-013 están en `2026_11_12_000013_species_publication_requests_schema.php`. Ninguna migración ni DBR previa añade `fun_fact`.

## Contrato solicitado

Dos columnas nuevas, ambas nullable y sin valor por defecto:

| Tabla | Columna | Tipo MySQL 8.0 | Nulo | Default | Uso |
|---|---|---|---|---|---|
| `species_publication_requests` | `fun_fact` | `VARCHAR(500)` | NULL | NULL | Texto propuesto por el veterinario. NULL si el campo no está marcado en `published_fields` (`api-026` RN-02). |
| `species` | `fun_fact` | `VARCHAR(500)` | NULL | NULL | Texto publicado. Se copia al aceptar (`api-026` RN-03). NULL si no hay dato. |

### Recomendación del tipo: `VARCHAR(500)`, no `TEXT`

- **Límite en la base.** El negocio fija 500 caracteres (`api-026` CA-03). `VARCHAR(500)` hace que la base rechace un valor más largo en modo estricto, en lugar de depender solo de la API. `TEXT` no tiene ese límite práctico.
- **Coherencia.** `species_publication_requests.rejection_reason` ya es `varchar(500)` y tiene el mismo límite de 500 caracteres. Los dos motivos de texto corto siguen el mismo patrón.
- **Almacenamiento.** `VARCHAR` se guarda en la fila; `TEXT` se guarda fuera de la fila con puntero. Para una frase de 500 caracteres no hay ventaja de `TEXT`.
- **Valor por defecto.** `TEXT` no admite default. Aquí no se necesita (NULL).
- **Índices.** No se indexa el campo (`api-026` no filtra por él). Un `TEXT` sin índice no aporta, pero tampoco perjudica.
- **Tamaño máximo.** `VARCHAR(500)` en utf8mb4 ocupa hasta 2000 bytes más 2 de longitud. Se verifica que la fila de `species` no supere el límite de 65 535 bytes (ver «Verificaciones para BD»).

### Collation: no declarar, heredar la de cada tabla

- No se declara `COLLATE` en la columna: hereda la de su tabla (`utf8mb4_0900_ai_ci` en `species`, `utf8mb4_unicode_ci` en `species_publication_requests`).
- Motivo: el campo no se compara, ordena, filtra ni se usa en claves. Ninguna consulta de `api-026` depende de la collation, así que la diferencia entre las dos tablas no cambia el comportamiento.
- Lo que sí se conserva: el charset es `utf8mb4` en las dos tablas (acentos y emojis se guardan bien).
- La divergencia de collation entre las dos tablas es **preexistente** y no se corrige en esta DBR (ver «Verificaciones para BD», punto 3).

### Decisiones de diseño

- **Nombre `fun_fact`.** Clave en inglés, igual que la clave de `published_fields` (`api-026` CA-01). El nombre en español («Dato curioso») existe solo en la interfaz.
- **Sin clave foránea, sin índice, sin enum en MySQL.** Es texto libre validado por la API.
- **Nulo sin backfill.** Las filas existentes quedan en NULL. Ninguna especie publicada hoy tiene `fun_fact` en `published_fields`, así que el portal no cambia.

## Elementos afectados

| Tipo | Nombre | Cambio |
|---|---|---|
| tabla (existente) | `species_publication_requests` | añadir `fun_fact` `VARCHAR(500)` NULL |
| tabla (existente) | `species` | añadir `fun_fact` `VARCHAR(500)` NULL |
| índice | — | sin cambio |
| FK | — | sin cambio |
| Objeto almacenado | — | ninguno |

## SQL de referencia (MySQL 8.0)

> **Referencia para revisión; no ejecutar directamente.** El cambio real se implementará como migración Laravel creada por el responsable de BD, con comprobación previa de existencia de cada columna.

```sql
-- propuesta ilustrativa, no ejecutar
ALTER TABLE species_publication_requests
    ADD COLUMN fun_fact VARCHAR(500) NULL DEFAULT NULL;

ALTER TABLE species
    ADD COLUMN fun_fact VARCHAR(500) NULL DEFAULT NULL;
```

## Datos existentes y migración de datos

- Todas las filas existentes de `species` y de `species_publication_requests` quedan con `fun_fact = NULL`. No hay backfill: ningún dato se infiere ni se copia.
- Efecto en el portal: ninguna especie publicada tiene `fun_fact` en `published_fields`, así que `GET /api/v1/published-species` no cambia (`api-026` RN-10).
- Filas en `arca_pruebas` (2026-11-21): `species` 9, `species_publication_requests` 7. Todas quedan en NULL; no se reescribe ningún dato.

## Privacidad, auditoría y retención

- **Clasificación:** contenido público de la especie. No es clínico, financiero ni personal. La API no valida su contenido; la revisión humana de la Dirección sí (`api-026` RN-08).
- **Auditoría:** los cambios se registran en Activitylog desde las Actions (`api-026` CA-06, RN-09). Sin `created_by` ni `updated_by` nuevos.
- **SoftDeletes:** ninguno nuevo. `species` y `species_publication_requests` ya tienen `deleted_at` (DBR-013).
- **Retención:** la columna sigue las reglas de las tablas que la contienen. Sin purga.

## Impacto, rendimiento y reversión

- **Tablas:** `species` y `species_publication_requests` son pequeñas (catálogo de especies y solicitudes de publicación). El `ALTER` es rápido. **Pendiente de BD** confirmar el método de cambio en `arca_pruebas` y en producción según su tamaño real.
- **Bloqueos:** esperables cortos durante el `ALTER`. Se ejecuta fuera de horario de uso del portal.
- **Índices:** ninguno nuevo. Ninguna consulta de `api-026` filtra por `fun_fact`.
- **Despliegue:** cambio expansivo (columna nullable). La API actual no lee la columna y sigue funcionando. Orden: DBR-025 aplicada → API (`api-026`) → consumidores. Antes de la migración, `fun_fact` en `published_fields` responde `422` (clave desconocida).
- **Reversión (`down()`):** retira las dos columnas. Se pierden los textos guardados. Requiere respaldo previo en cada ambiente.

## Compatibilidad MySQL 8.0 y portabilidad (Aiven y local)

- `VARCHAR` nullable sin default es estándar en MySQL 8.0 y se comporta igual en Aiven (ADR 0013) y en MySQL local.
- Sin funciones, procedimientos, vistas, triggers ni extensiones propietarias.
- Sin dependencia de collation: el campo no se compara ni se ordena.
- La migración debe ser idempotente: comprobar con `Schema::hasColumn` antes de crear cada columna, como DBR-021 y DBR-024.
- La conexión sigue solo por `.env` (`DB_SSL_CA` si aplica en Aiven); nada de esta DBR incluye credenciales.

## Objeto almacenado (si aplica)

No aplica.

## Verificaciones para BD

1. **Columnas inexistentes (2026-11-21):** `fun_fact` no existe en ninguna de las dos tablas según la consulta de solo lectura de la sesión principal. Repetir justo antes de migrar (`Schema::hasColumn` = false en ambas).
2. **Margen de fila:** confirmar que `species` no supera 65 535 bytes de tamaño de fila con la columna nueva (`VARCHAR(500)` utf8mb4 ocupa hasta 2002 bytes). Pendiente de BD.
3. **Collation distinta entre tablas (preexistente):** `species` usa `utf8mb4_0900_ai_ci` y `species_publication_requests` usa `utf8mb4_unicode_ci`. No afecta a esta columna. No se corrige en esta DBR. Si BD quiere unificarla, se abre DBR aparte.
4. **Número de filas:** 9 y 7 (ver «Datos existentes»); `ALTER` trivial.
5. **EXPLAIN:** no aplica (sin índice ni consulta nueva).
6. **Ejecución de `down()`:** pendiente en un MySQL 8.0 aislado (rollback prohibido en `arca_pruebas`).
7. **Deriva de nombres (no es de BD):** la columna `species.feeding` (DBR-014) se usa como `diet` en `PublishedSpeciesField`, en `api-014`/`api-015` y en la web. Se reporta para decisión; no se corrige en esta DBR.

## Plan de ejecución

### Fase 0: cierre documental
- [x] Revisión de BD y backend: Jonathan (responsable de BD por delegación y responsable backend), 2026-11-21.
- [x] Consulta de solo lectura (2026-11-21): `db:table species` y `db:table species_publication_requests` sin `fun_fact`; 9 y 7 filas.
- [x] Aprobada el 2026-11-21 (tabla «Aprobaciones»).

### Fase 1: migración de esquema (responsable de BD)
- [x] Migración `2026_11_21_000025_species_fun_fact.php`, idempotente, con `down()`. Creada y aplicada por la sesión del asistente por instrucción expresa de Jonathan como responsable de BD delegado (excepción registrada: AGENTS.md reserva esta tarea al responsable de BD; Jonathan la asumió y la delegó).
- [ ] Probada en MySQL 8.0 aislado (`down()` pendiente; rollback prohibido en `arca_pruebas`). Aplicada en `arca_pruebas` con up + re-ejecución idempotente (ver evidencia).
- [x] «Lista para backend» el 2026-11-21.

### Fase 2: backend (tras «Lista para backend»)
- [x] Integrado en la API (`apps/api/tasks/026-species-fun-fact.md`, T-05 a T-16 y T-18).

## Pruebas y evidencia

- Pruebas de esquema en MySQL 8.0 aislado: **pendiente** (`down()`).
- Evidencia de `arca_pruebas` (2026-11-21): `php artisan migrate --force` → `2026_11_21_000025_species_fun_fact` DONE, lote 15; segunda ejecución sin pendientes; `information_schema`: `species.fun_fact varchar(500) NULL utf8mb4_0900_ai_ci`, `species_publication_requests.fun_fact varchar(500) NULL utf8mb4_unicode_ci`; filas previas 9 y 7, en NULL.
- Pruebas integradas del backend: clases de api-026 en verde; suite completa en T-17.

## Aprobaciones

| Rol | Nombre | Fecha | Resultado |
|---|---|---|---|
| Responsable de BD | Jonathan (por delegación del responsable de BD) | 2026-11-21 | Aprobada |
| Responsable backend | Jonathan | 2026-11-21 | Aprobada |
| Solicitante / responsable funcional | Jonathan | 2026-11-21 | Decisión funcional tomada (campo y reglas); la aprobación de la DBR la dan BD y backend |

## Aplicación por ambiente

| Ambiente | Estado | Fecha | Evidencia |
|---|---|---|---|
| desarrollo/pruebas (`arca_pruebas`) | Aplicada | 2026-11-21 | Lote 15; ver «Pruebas y evidencia» |
| staging | Pendiente | | |
| producción | Pendiente | | |

## Preguntas para BD (resueltas por Jonathan, 2026-11-21: VARCHAR(500); collation heredada; responsable de BD Jonathan por delegación)

1. ¿Se confirma `VARCHAR(500)` nullable frente a `TEXT`? Recomendación: `VARCHAR(500)`.
2. ¿Se acepta heredar la collation de cada tabla sin declararla? Recomendación: sí.
3. ¿Quién es el responsable de BD para esta DBR? (Víctor Adrián o delegado por Jonathan, como en DBR-024.)
