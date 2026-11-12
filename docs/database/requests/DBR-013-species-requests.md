# DBR-013 · species-requests

- Estado: Aprobada por BD (2026-11-12; migración creada, pendiente de aplicar en `arca_pruebas`; pendiente aprobación de backend)
- Feature/spec origen: `apps/api/specs/014-species-requests.md` (solicitudes de **publicación** de una especie existente: envío, selector, revisión, edición previa, publicar o rechazar). Consumidores: `apps/pwa/specs/005-species-request-submission.md` (selector y envío), `apps/dashboard/specs/010-public-content-management.md` (revisión, edición, publicar o rechazar; absorbe `dashboard-009`), `apps/api/specs/015-public-species-read.md` (lectura pública de especies publicadas) y `apps/web/specs/011-dynamic-tulanpedia.md` (consumidor de `api-015`).
- Solicitante: por confirmar (solicitud de la sesión principal, 2026-11-11).
- Responsable de BD: Víctor Adrián
- Responsable backend: Jonathan (pendiente de firma)
- Fecha de la última revisión: 2026-11-12 (decisiones 2a/2c/7/13/14/15/16/17 y migración redactada)

## Historial del cambio de modelo (2026-11-11)

- **Versión anterior (incorrecta):** la solicitud proponía una especie **nueva** que se creaba en `species` al aceptar. La tabla guardaba `common_name` propio y `species_id` era nullable hasta la aceptación.
- **Motivo del cambio:** la especie ya existe antes de cualquier solicitud. `AnimalController::store` la crea al registrar un animal (ver «Estado actual»). Crear otra especie al aceptar duplicaría filas.
- **Modelo actual:** la solicitud propone la **publicación** de una especie existente. `species_id` es obligatorio desde el envío (FK RESTRICT). La tabla `species_publication_requests` guarda solo lo que la publicación necesita: foto pendiente, tipo de animal, correcciones propuestas, selección de la ficha pública, estado y revisión. **No duplica `common_name`**: se lee de `species`. `species` gana una marca de publicación, la foto pública y la selección de campos publicada.
- Qué cambia en esta DBR: contrato de la tabla, columnas nuevas en `species`, índices, preguntas (1 a 17), y la sección de decisiones para BD (2a, 2b y 2c nueva).
- **2026-11-11 (segunda ronda, decisiones del usuario):** `request_type` (`publish` o `update`) en la tabla; `image_path` obligatoria solo en `publish`; `species.published_at` aprobada como columna (pregunta 11 resuelta); `species.unpublished_at` nueva (la necesita la derivación del estado `unpublished`, pregunta 15); historial de edición en Activitylog (pregunta 1 resuelta); SoftDeletes en la tabla de solicitudes usado por «Eliminar la publicación» (`api-014` CA-38).
- **2026-11-12 (tercera ronda, decisiones del usuario):** sin cambio de columnas. Una especie despublicada puede recibir una solicitud `update` (`request_type = update`), y la aceptación con «Aceptar sin publicar» deja `is_published = 0` con `unpublished_at` sin cambios (`api-014` CA-08, CA-32). Los permisos y la edición de la especie despublicada no tocan esta DBR.
- **2026-11-12 (redacción de migración, decisiones de BD):** se aprueba por BD con 2a=A (`origin` se mapea a `species.distribution`, sin columna `species.origin`), 2b columna `species.image_path`, 2c=A (tabla delgada `species_publication_requests`), 7 (`published_fields` JSON: solicitud NOT NULL, `species` NULL), 13 (se añade `species.deleted_at`), 14 (columna generada `submitted_species_id` + índice único para una sola solicitud `submitted` por especie), 15 (se guarda `species.unpublished_at`), 16 (`species_publication_requests.category` nullable, `NULL` = sin corrección) y 17 (índice `species(is_published, unpublished_at)`). Migración: `apps/api/src/database/migrations/2026_11_12_000013_species_publication_requests_schema.php` (pendiente de aplicar). Backend pendiente de firma.

## Problema y justificación

El veterinario registra animales individuales, y la existencia de una especie en `species` se decide al crear el animal, sin revisión. No hay un lugar donde el veterinario proponga que una especie existente aparezca en TulanPedia (`apps/web/specs/011-dynamic-tulanpedia.md`) con su foto, su tipo de animal y datos corregidos, ni donde el zoológico lo revise antes de publicarla.

Hace falta: (1) una forma de guardar cada solicitud con su estado, su foto pendiente, sus correcciones y su motivo de rechazo; (2) una marca en `species` que indique si la especie está publicada, con su foto pública y su selección de campos.

## Estado actual

- **Alta de animal (`apps/api/src/app/Http/Controllers/Api/AnimalController.php`, método `store`, `POST /api/v1/staff/animals`, `apps/pwa/specs/004-animal-registration.md`):** el campo `species` es texto libre (`max:100`). La transacción ejecuta `Species::firstOrCreate(['common_name' => $data['species']], ['scientific_name' => $data['species']])`. Efectos actuales: (a) la especie se crea al registrar un animal, sin revisión; (b) `scientific_name` recibe el mismo texto que el nombre común (relleno); (c) `category` queda NULL; (d) la búsqueda de `common_name` usa la collation de la base (`utf8mb4_unicode_ci`, sin distinguir mayúsculas; comportamiento a verificar en `arca_pruebas`).
- **Tabla `species` (`docs/database/esquema-ingles.md`, sección 7):** `id` INT, `common_name` VARCHAR(100) NOT NULL, `scientific_name` VARCHAR(150) (NOT NULL en el esquema; nullable por DBR-011), `distribution` VARCHAR(255), `conservation_status` VARCHAR(100), `habitat` VARCHAR(255), `gestation_period` VARCHAR(100), `size_cm` DECIMAL(8,2), `model_3d_path` VARCHAR(255). No hay columna de foto ni de publicación.
- **`species.category`:** existe (DBR-004), VARCHAR(30) NULL con lista cerrada (`mammal`, `bird`, `reptile`, `amphibian`, `fish`, `invertebrate`). La usan `api-006` (CA-01), las misiones de mobile (`category_species_count`, `api-005`) y el código. No verificado contra `arca_pruebas`.
- **Modelo `Species`** (`apps/api/src/app/Models/Species.php`): extiende `Model`, no `BaseModel`, y no usa `SoftDeletes`. La Constitución V y `apps/api/AGENTS.md` exigen SoftDeletes en los modelos de negocio. Queda como pregunta 13.
- `origin`, `diet`, `longevity` y `characteristics` existen en `animals` (datos por individuo; DBR-001), no en `species`.
- No existe la tabla `species_publication_requests`. El permiso `species.review` no existe todavía; se crea con el seeder, no con migración.
- **Seguimiento recomendado (fuera de esta DBR):** el alta de animal sigue creando especies por nombre libre con datos de relleno. Se recomienda una spec aparte (`pwa-004`) para que el registro elija una especie de la lista y deje de crear especies a ciegas. No cambia esta DBR.

## Contrato solicitado

### Tabla `species_publication_requests` (nombre propuesto)

Una fila por solicitud. Las reglas de elegibilidad, transiciones, correcciones y ficha las aplica la API (`api-014` RN-02, RN-03, RN-16); la base guarda y protege la integridad. `common_name` no está en esta tabla: se lee de `species`.

| Columna | Tipo propuesto | Nulabilidad | Default | Descripción y notas |
|---|---|---|---|---|
| `id` | BIGINT UNSIGNED AUTO_INCREMENT | NOT NULL | — | Clave primaria, como las tablas de migraciones recientes (DBR-012). |
| `species_id` | INT | NOT NULL | — | Especie a publicar. FK a `species.id` (mismo tipo que `species.id`; BD confirma), `ON DELETE RESTRICT`. **Obligatorio desde el envío** (decisión del usuario 2026-11-11). Una especie puede tener varias filas en el tiempo (las rechazadas), pero como máximo una `submitted` (`api-014` RN-03). |
| `request_type` | VARCHAR(10) | NOT NULL | — | Tipo de solicitud: `publish` (primera publicación, la especie está `not_published`) o `update` (la especie está `published` o `unpublished`, `api-014` CA-27). Lo decide la aplicación, no el veterinario. Validación en la aplicación; VARCHAR por portabilidad, como `status`. |
| `scientific_name` | VARCHAR(150) | NULL | — | Corrección propuesta. NULL = sin corrección: la especie conserva su valor (`api-014` RN-16). |
| `habitat` | VARCHAR(150) | NULL | — | Corrección propuesta de hábitat. Mismo criterio que `scientific_name`. |
| `origin` | VARCHAR(150) | NULL | — | Corrección propuesta de origen. Su destino en `species` lo decide 2a. |
| `category` | VARCHAR(30) | NULL | — | Tipo de animal propuesto (lista cerrada de DBR-004). Obligatorio al enviar (decidido 2026-11-11; `api-014` CA-25), pero NULL = sin corrección cuando el valor enviado es igual a `species.category` (`api-014` CA-30). Por eso la columna queda nullable. Consecuencia para la nulabilidad: pregunta 16. Se valida en la aplicación (sin CHECK salvo que BD lo añada). |
| `image_path` | VARCHAR(255) | NULL | — | Ruta relativa en el disco `media` de la foto pendiente (`species-requests/<uuid>.(jpg\|jpeg\|png)`). Obligatoria en `publish` (validación de aplicación); en `update` puede ser NULL (sin foto nueva, la foto publicada se mantiene; `api-014` CA-04, CA-32). Pasa a NULL al aceptar (tras copiar a `species/` y borrar la original) y al rechazar. Cambia al reemplazar la foto en la edición (`api-014` CA-23). |
| `published_fields` | JSON | NOT NULL | — (sin default en BD) | Claves de la ficha pública elegidas por el veterinario y ajustables por `zoo-admin` mientras está `submitted` (`api-014` RN-13, CA-21, CA-22). La aplicación valida la lista cerrada. Al aceptar se copia a `species.published_fields`. MySQL 8.0 no admite un default literal en JSON; la aplicación siempre escribe la lista. |
| `status` | VARCHAR(20) | NOT NULL | `'submitted'` | Valores: `submitted`, `accepted`, `rejected` (`api-014` RN-02). Validación en la aplicación; VARCHAR en vez de ENUM por portabilidad (igual que DBR-012). |
| `rejection_reason` | VARCHAR(500) | NULL | — | Motivo del rechazo (`api-014` CA-11). Solo con `status = 'rejected'`. |
| `created_by` | INT | NOT NULL | — | Veterinario que envió la solicitud (`api-014` CA-06, `veterinarian_name`). FK a `users.id`, RESTRICT. |
| `updated_by` | INT | NULL | — | Último personal que editó la solicitud (propuesta; `apps/api/AGENTS.md` pide `created_by`/`updated_by` cuando el modelo lo requiere). FK a `users.id`, RESTRICT. |
| `reviewed_by` | INT | NULL | — | Personal de la última decisión (publicar o rechazar). FK a `users.id`, RESTRICT. NULL mientras no hay decisión. |
| `reviewed_at` | TIMESTAMP | NULL | — | Momento de la última decisión. |
| `created_at` | TIMESTAMP | NULL | — | Fecha de envío (orden de la lista, `api-014` CA-05). |
| `updated_at` | TIMESTAMP | NULL | — | Última modificación, incluida la edición previa (`api-014` CA-15). |
| `deleted_at` | TIMESTAMP | NULL | — | Borrado lógico (SoftDeletes, Constitución V). |
| `submitted_species_id` | INT | NULL | — (generada) | Columna generada almacenada: `IF(status='submitted', species_id, NULL)`. Con índice único `uq_species_publication_requests_submitted_species` garantiza a lo sumo una solicitud `submitted` por especie (decisión 14). |

### Cambios en `species` (propuestos)

Son columnas nuevas. Las especies existentes quedan con `is_published = 0`, y ninguna aparece como publicada hasta que se publique (aceptación con publicación o republicación, `api-014` CA-08, CA-36).

| Columna | Tipo propuesto | Nulabilidad | Default | Motivo |
|---|---|---|---|---|
| `is_published` | TINYINT(1) | NOT NULL | `0` | Marca de publicación. Es el único criterio de visibilidad pública (`api-015` RN-03). Solo cambia al aceptar (`api-014` CA-31). |
| `published_at` | TIMESTAMP | NULL | — | Fecha de la versión publicada vigente. Aprobada además de `is_published` (decisión del usuario 2026-11-11, pregunta 11). Se fija al publicar, republicar o aceptar una actualización con publicación (`api-014` CA-08, CA-36); se pone NULL al eliminar la publicación (CA-38). |
| `unpublished_at` | TIMESTAMP | NULL | — | Momento de la última despublicación (`api-014` CA-35). Con `is_published = 0` y este campo no nulo, la especie está `unpublished` (RN-18). Se pone NULL al republicar y al eliminar la publicación. Se guarda (decisión 15). |
| `image_path` | VARCHAR(255) | NULL | — | Ruta relativa de la foto pública en `media/species/` (`api-014` CA-08). Decisión 2b. |
| `published_fields` | JSON | NULL | — | Selección de la ficha pública, copiada desde la solicitud aceptada (`api-014` RN-13, RN-14). NULL en especies no publicadas. |
| `deleted_at` | TIMESTAMP | NULL | — | Borrado lógico (SoftDeletes, Constitución V; decisión 13). |

Sin cambio en `species`: `category` (DBR-004), `habitat`, `scientific_name` y `distribution`. Si 2a se resuelve como (B), se añade también `species.origin` (ver «Decisiones para el responsable de BD»).

## Elementos afectados

| Tipo | Nombre | Cambio |
|---|---|---|
| tabla | `species_publication_requests` | Crear con las columnas de la tabla anterior. |
| columnas | `species.is_published`, `species.published_at`, `species.unpublished_at`, `species.image_path`, `species.published_fields`, `species.deleted_at` | Añadir (ver «Cambios en `species»; `deleted_at` por decisión 13). |
| columna | `species_publication_requests.request_type` | Añadir (ver la tabla de la solicitud). |
| columna generada | `species_publication_requests.submitted_species_id` | Añadir, NULL, generada almacenada: `IF(status='submitted', species_id, NULL)` (decisión 14). |
| sin cambio de esquema | `species.category` | Ya existe (DBR-004). La aceptación la escribe con el valor efectivo (`api-014` CA-08, CA-25). |
| índice | `species_publication_requests(status, created_at)` | Crear. Lista de revisión (`api-014` CA-05). |
| índice | `species_publication_requests(species_id, status)` | Crear. Elegibilidad del envío (`api-014` CA-27), selector (CA-26) y comprobaciones. |
| índice único | `species_publication_requests(submitted_species_id)` | Crear. Garantiza a lo sumo una solicitud `submitted` por especie (decisión 14). |
| índice | `species(is_published)` | Crear. Lectura pública (`api-015` RN-03). |
| índice | `species(is_published, unpublished_at)` | Crear (decisión 17). Lista de publicadas y despublicadas (`api-014` CA-40). |
| clave foránea | `species_publication_requests.species_id` → `species.id` | Crear, NOT NULL, `ON DELETE RESTRICT`. |
| clave foránea | `species_publication_requests.created_by`, `updated_by`, `reviewed_by` → `users.id` | Crear, RESTRICT. |
| dato (no esquema) | Permiso `species.review` y su asignación solo a `zoo-admin` | Lo crea y asigna `RolesAndPermissionsSeeder` (`api-014` CA-20, RN-10). Excluirlo explícitamente de `admin` (el seeder da a `admin` todos los permisos de su arreglo salvo los de boletos). Pendiente de implementar (tarea T-SEED de `api-014`). |
| dato (no esquema) | Permiso `memories.review` | Lo cubre DBR-012 y el seeder; no cambia esta DBR. |

Nombres propuestos (MySQL limita a 64 caracteres): `idx_species_publication_requests_status_created`, `idx_species_publication_requests_species_status`, `uq_species_publication_requests_submitted_species`, `idx_species_is_published`, `idx_species_is_published_unpublished_at`, `fk_species_publication_requests_species_id`, `fk_species_publication_requests_created_by`, `fk_species_publication_requests_updated_by` y `fk_species_publication_requests_reviewed_by`.

Concurrencia: MySQL 8.0 no tiene índice único parcial; se usa la columna generada almacenada `submitted_species_id` con índice único `uq_species_publication_requests_submitted_species` (decisión 14), además de la regla de aplicación con bloqueo (`api-014` RN-11).

## SQL de referencia (MySQL 8.0)

No se incluye SQL, ni de referencia, por decisión del solicitante, igual que en DBR-012. El contrato se expresa en las tablas de esta DBR. El responsable de BD redacta la migración Laravel tras aprobar la DBR, la prueba en MySQL 8.0 aislado y documenta la evidencia.

## Datos existentes y migración de datos

- `species_publication_requests` es tabla nueva, vacía al inicio, sin backfill.
- `species` existentes: `is_published = 0`, `published_at`, `image_path` y `published_fields` en NULL. No se inventa `category` ni `scientific_name` para especies existentes.
- Efecto: ninguna especie existente aparece en TulanPedia (`api-015`) hasta su aceptación. En el selector del veterinario aparecen todas con su estado; las que tienen `category` NULL se pueden proponer con tipo.
- No hay cambios a tablas de otras features. `species.common_name` no cambia.

## Privacidad, auditoría y retención

- **Clasificación:** personal en parte. `created_by`, `updated_by` y `reviewed_by` identifican personal (veterinario y Dirección). La foto es de un animal o especie, no de personas. No es clínico ni financiero. Los datos clínicos de los animales no se tocan.
- **SoftDeletes:** `deleted_at` en `species_publication_requests` y en `species` cumple la Constitución V (decisión 13). La aplicación no borra filas físicamente. El rechazo borra el archivo de la foto, no la fila (`api-014` CA-10). «Eliminar la publicación» (`api-014` CA-38) marca como eliminadas (`deleted_at`) las solicitudes de la especie y borra sus fotos; no borra físicamente filas de `species`. El modelo `Species` y las lecturas deben alinearse para excluir filas borradas.
- **Publicación modifica la fila compartida:** al aceptar, las correcciones (`scientific_name`, `habitat`, `distribution` u `origin`, `category`) cambian la fila de `species`, que también lee `api-006` para la app móvil, y los animales. La publicación de especies es solo del portal (decisión del usuario 2026-11-12); mobile no la recibe. Lo que cambia es el dato compartido (ver «Impacto»).
- **Foto pendiente (2026-11-11):** `image_path` pasa a NULL al rechazar y al aceptar, y el archivo se borra en ambos casos (`api-014` RN-04, CA-08, CA-10). En pruebas, la foto pendiente está en `media/species-requests/`, publicada por `/media` (enmienda del ADR 0026): la API no devuelve su URL, pero quien la conozca puede verla. **Recomendación antes de producción:** almacenamiento privado u otro almacenamiento (`api-014`, «Recomendación antes de producción»).
- **Reemplazo de foto (`api-014` CA-23):** el archivo anterior se borra tras confirmar y no se conserva (decisión del 2026-11-11). La fila no se borra.
- **Retención:** sin purga automática de rechazadas (`api-014` pregunta 1, resuelta: no se purga). Las filas se conservan.
- **Auditoría:** Activitylog registra envío, cada edición, publicación y rechazo (`api-014` CA-08, CA-10, CA-18). `reviewed_by` y `reviewed_at` guardan la última decisión.

## Impacto, rendimiento y reversión

- Tabla nueva, vacía al inicio. Columnas nuevas nullable o con default en `species`, una tabla pequeña. No bloquea tablas grandes.
- **Impacto en `mobile` (solo aviso informativo; mobile no recibe la publicación ni pantallas nuevas; esta DBR no cambia código ni specs de mobile):**
  1. Al publicar una especie con `category`, esta cuenta en las misiones `category_species_count` (`api-005`, `mobile-005`). Antes contaban solo las especies que ya tenían categoría; ahora también las que se publiquen.
  2. Las correcciones aceptadas cambian `scientific_name`, `habitat`, `distribution` (o `origin`) y `category` de la fila de `species`. `GET /api/v1/species` (`api-006`) ya lee esa fila y expone los datos corregidos a la app móvil para especies con animales.
  3. `api-006` ya expone `distribution`, `conservation_status`, `size_cm` y `gestation_period` de `species`. Sin cambio de contrato, pero los datos aceptados llegan a la app.
  4. **Resuelto (decisión del usuario 2026-11-12):** despublicar o eliminar la publicación no quita la especie de la app móvil. `api-006` no filtra por `is_published` y se mantiene así a propósito (`api-014` pregunta 23). No hay spec propia para ampliar `api-006`.
- Los índices cubren las consultas de `api-014` y `api-015`. Volumen esperado bajo.
- **Reversión en `down()`:** eliminar la tabla solo en un ambiente sin solicitudes registradas. Quitar las columnas de `species` solo si no hay datos en ellas. Si ya hay datos, BD decide la reversión y no borra filas sin respaldo.
- Respaldo previo recomendado antes de aplicar en cualquier ambiente.

## Compatibilidad MySQL 8.0

- Tipos estándar (BIGINT UNSIGNED, INT, VARCHAR, TINYINT(1), TIMESTAMP, JSON) y claves foráneas. Sin extensiones propietarias.
- Charset `utf8mb4` y collation `utf8mb4_unicode_ci`, igual que el resto de tablas (`config/database.php`). La comparación de `habitat` y `name` en `api-015` RN-05 depende de esa collation.
- `published_fields` usa JSON nativo de MySQL 8.0 (portable entre Aiven y local). Sin default literal en JSON.
- Revisión mínima de MySQL 8.0.x: pendiente del inventario inicial (igual que DBR-012).

## Objeto almacenado (si aplica)

No aplica. No hay funciones, procedimientos, vistas ni triggers. Las reglas de elegibilidad, transiciones, correcciones y publicación viven en Actions de la API (`api-014` RN-05, RN-14).

## Orden de despliegue

1. Aprobación de BD registrada (2026-11-12) con decisiones 2a/2b/2c/7/13/14/15/16/17. Aprobación de backend: pendiente (`docs/database/requests/README.md`, regla 4).
2. Migración creada: `apps/api/src/database/migrations/2026_11_12_000013_species_publication_requests_schema.php`. Pendiente de probar en MySQL 8.0 aislado y aplicar en `arca_pruebas`.
3. Aplicación en `arca_pruebas` y registro de la fecha/evidencia en la tabla de ambientes.
4. Estado «Lista para backend» cuando existan aprobaciones separadas de BD y backend y la migración esté aplicada con evidencia. Entonces backend implementa `api-014` (incluidos el selector, el envío, la edición `PATCH` y el seeder de `species.review` con exclusión de `admin`) y `api-015`.
5. Staging y producción, después, con su propio registro. Los agentes no usan `arca_zoo`.
6. Requisito previo: DBR-001 (nombres en inglés), DBR-003 (`visitors`), DBR-004 (`species.category`) y DBR-012 (`users` y `visitor_memories` ya en el ambiente) aplicadas.

## Pruebas y evidencia

- Comprobaciones sugeridas para BD (no ejecutadas):
  - FK de `species_id` a `species` con RESTRICT, NOT NULL; FK de `created_by`, `updated_by` y `reviewed_by` a `users`, con RESTRICT;
  - `published_fields` NOT NULL y JSON válido; la aplicación rechaza claves fuera de la lista (`api-014` CA-21);
  - `species.is_published` por defecto 0, y las especies existentes quedan en 0 tras la migración;
  - `category` solo acepta los seis valores de DBR-004 (validación de aplicación, `api-014` CA-25);
  - `request_type` solo acepta `publish` y `update`; `unpublished_at` es NULL cuando `is_published = 1`, y la aceptación sin publicar no cambia `unpublished_at` (`api-014` CA-08);
  - `status` solo acepta `submitted`, `accepted` y `rejected` (si BD añade CHECK, debe probarse);
  - `rejection_reason` en NULL salvo en `rejected`; `image_path` en NULL tras rechazo y tras aceptación;
  - `deleted_at` no se borra físicamente en la aplicación;
  - ninguna migración cambia `species.common_name`;
  - EXPLAIN de las consultas de `api-014` CA-05, CA-26 y CA-27, y de `api-015` RN-03.
- Migración creada: `apps/api/src/database/migrations/2026_11_12_000013_species_publication_requests_schema.php` (2026-11-12).
- Pruebas de backend sugeridas: `api-014` CA-01 a CA-31 (PHPUnit contra `arca_pruebas`, con `DatabaseTransactions`, sin `RefreshDatabase`).
- Resultado y evidencia: pendiente de ejecutar `up()`/`down()` en MySQL 8.0 aislado y de aplicar en `arca_pruebas`.

## Decisiones para el responsable de BD

Esta sección registra las decisiones tomadas por BD (2026-11-12) y las opciones consideradas al redactar la migración. Las specs (`api-014`, `api-015`, `pwa-005`, `dashboard-010` y `web-011`) deben alinearse con lo decidido donde aplique.

### 2a. `origin`: mapear a `species.distribution` (A) o crear `species.origin` (B)

**Decisión (BD, 2026-11-12): opción A.** `origin` se mapea a `species.distribution`; no se crea `species.origin`. La solicitud guarda la corrección propuesta en `species_publication_requests.origin` y, al aceptar, la aplicación la copia a `species.distribution`. Condiciones: la etiqueta de `pwa-005` debe referirse al área natural de la especie (no procedencia del ejemplar) y se debe dar aviso informativo a `mobile` (`api-006` expone `distribution`).

| Aspecto | (A) mapear a `species.distribution` | (B) nueva columna `species.origin` VARCHAR(150) NULL |
|---|---|---|
| Migración | Ninguna en `species`. Solo las correcciones de la solicitud. | Migración extra en `species`: nullable, sin datos previos. |
| Semántica | `distribution` es la «distribución geográfica natural» de la especie (`docs/database/esquema-ingles.md`). Riesgo: si el formulario se entiende como procedencia del ejemplar, el dato queda en un campo de otro significado. | Segundo `origin` en la base. `animals.origin` ya significa procedencia del ejemplar: mismo nombre, dos significados. |
| `api-015` RN-06 | Lee `distribution`. La respuesta sigue llamándose `origin`. | Lee `species.origin`. |
| `api-006` (app móvil) | Expone `distribution`: las especies publicadas con animales mostrarán el dato en `GET /api/v1/species`. Aviso informativo a `mobile`. | Sin cambio: `api-006` no devuelve `origin`. |
| Aceptación (`api-014` CA-08) | Copia la corrección a `distribution`. | Copia a `origin`. |
| Reversión | Sin DDL: nada que revertir. | Reversible en `down()` si no hay datos. |

### 2b. Imagen de la especie: columna `species.image_path`

**Decisión (BD, 2026-11-12):** se mantiene la columna `species.image_path` (VARCHAR(255) NULL) para la foto pública en `media/species/`. Se escribe en la misma transacción que el estado y la publicación (`api-014` CA-08); la base guarda la ruta relativa, como exige ADR 0026. Si se requiere otra forma, `api-015` RN-07 cambia en un único punto de lectura.

### 2c. Forma de la solicitud: tabla delgada (A) o solo columnas en `species` (B)

**Decisión (BD, 2026-11-12): opción A.** Se crea la tabla delgada `species_publication_requests` con el contrato de esta DBR, además de las columnas de publicación en `species`.

- **A. Tabla delgada `species_publication_requests`** (elegida): una fila por solicitud.
- **B. Sin tabla:** la solicitud vive en columnas de `species` (no elegida).

| Aspecto | A. Tabla delgada (elegida) | B. Solo columnas en `species` |
|---|---|---|
| Migración | Tabla nueva más columnas en `species`. | Solo columnas en `species`, más muchas columnas nuevas en la tabla compartida. |
| Varias solicitudes por especie | Historial de filas. Una rechazada no bloquea una nueva. | Una sola fila: la rechazada se pierde salvo en la auditoría. |
| Correcciones pendientes | Viven en la solicitud. La fila de `species` no cambia hasta aceptar. | Viven en columnas `pending_*` de la fila compartida que lee `api-006`. |
| Foto propuesta | Solo en la solicitud. | En la fila de `species`, aunque `api-015` no la expone (filtra por `is_published`). Riesgo de fuga si un `Resource` no excluye las columnas. |
| Una sola solicitud viva | Regla de aplicación y protección en BD (columna generada + índice único, pregunta 14). | Implícita en `publication_status`. |
| Consultas | Índices en la tabla propia. | Índices en `species`. |
| Historial | Filas por solicitud, más auditoría. | Solo auditoría (Activitylog). |
| Efecto en `api-014` | Sin cambio en el contrato. | El `PATCH` edita columnas de `species`; el listado filtra por `publication_status`. |

## Preguntas abiertas para BD y producto

1. **Historial de edición.** **Resuelta, decisión del usuario 2026-11-11:** Activitylog, sin tabla `species_publication_request_revisions` (`api-014` CA-18).
2. **Longitudes de `origin` y `habitat`.** **Resuelta, decisión del usuario 2026-11-11:** 150 caracteres para ambos.
3. **Vínculo con `species`.** **Cambiada el 2026-11-11 con el modelo de publicación:** `species_id` es **NOT NULL desde el envío**, con FK `ON DELETE RESTRICT`. Ya no es nullable ni se llena al aceptar (`api-014` CA-24). Resuelta.
4. **Campo `origin` en `species`.** **Resuelta (BD, 2026-11-12; decisión 2a):** se mapea a `species.distribution`; no se crea `species.origin`. Afecta a `api-015` RN-06 y `dashboard-010` CA-07.
5. **Foto pública en `species`.** **Resuelta (BD, 2026-11-12; decisión 2b):** columna `species.image_path`. Afecta a `api-015` RN-07.
6. **Carpeta de la foto pendiente.** **Resuelta, decisión del usuario 2026-11-11:** `media/species-requests/` es pública durante pruebas, con la enmienda del ADR 0026. Recomendación antes de producción (`api-014`).
7. **Selección de la ficha pública.** **Resuelta (BD, 2026-11-12):** `published_fields` JSON NOT NULL en `species_publication_requests` y JSON NULL en `species`, copiado al aceptar, sin default en BD. Afecta a `api-014` RN-13 y `api-015` CA-13.
8. **Fuente de los campos extra.** **Abierta.** `conservation_status`, `size_cm` y `gestation_period` existen en `species`; `diet`, `longevity` y `characteristics` solo existen en `animals`. ¿Se añaden a la solicitud como correcciones (y se copian a `species` al aceptar) para que `pwa-005` los pida, o se excluyen de la v1? Hasta decidir, esas seis claves no se implementan (`api-014` RN-13). Análisis en `docs/adr/0028-dynamic-tulanpedia-catalog.md`, sección «Decisión pendiente del responsable de BD: campos extra de la ficha pública» (recalculado con este modelo el 2026-11-11). La captura de `category` no forma parte de esta pregunta (pregunta 10).
9. **Foto original tras aceptar.** **Resuelta, decisión del usuario 2026-11-11:** opción B (mover): copiar a `media/species/`, confirmar la transacción y borrar la original. `image_path` de la solicitud queda NULL (`api-014` CA-08).
10. **Tipo de animal (`category`) en la solicitud.** **Resuelta, decisión del usuario (2026-11-11):** el veterinario elige el tipo con la lista cerrada de DBR-004; la columna `species_publication_requests.category` es una corrección (NULL = sin corrección) y la aceptación escribe el valor efectivo en `species.category`. **Por confirmar:** (a) que el tipo sea obligatorio en el envío (si no, una especie publicada puede quedar con `category` NULL y no contar en las misiones ni en el filtro de TulanPedia); (b) que `category` se publique siempre y no sea desmarcable (`api-014` RN-13).
11. **Fecha de publicación (`published_at`).** **Resuelta, decisión del usuario 2026-11-11:** sí, se añade además de `species.is_published` (ver la tabla de `species`). Ver `api-014` pregunta 13 y 21.
12. **Forma de la solicitud (2c).** **Resuelta (BD, 2026-11-12):** opción A, tabla delgada `species_publication_requests`. Ver la sección 2c.
13. **Constitución V en `species`.** **Resuelta (BD, 2026-11-12):** se añade `species.deleted_at` (SoftDeletes) en la migración de DBR-013. El modelo `Species` y las lecturas (`api-015` y otras) deben alinearse para excluir filas borradas.
14. **Unicidad de la solicitud viva por especie.** **Resuelta (BD, 2026-11-12):** además de la regla de aplicación con bloqueo (`api-014` RN-11), se añade la columna generada almacenada `submitted_species_id` (`IF(status='submitted', species_id, NULL)`) con índice único `uq_species_publication_requests_submitted_species` (MySQL 8.0).
15. **Guardar o solo auditar la despublicación.** **Resuelta (BD, 2026-11-12):** se guarda `species.unpublished_at`. El revisor que despublica (`unpublished_by`) queda en Activitylog (`api-014` RN-12); no se añade columna `unpublished_by` en esta migración.
16. **Nulabilidad de `species_publication_requests.category`.** **Resuelta (BD, 2026-11-12):** columna nullable (`NULL` = sin corrección), coherente con `api-014` CA-30.
17. **Índice de la lista de publicadas.** **Resuelta (BD, 2026-11-12):** se crea `species(is_published, unpublished_at)` (`idx_species_is_published_unpublished_at`) además de `species(is_published)`. Conviene verificar con EXPLAIN en `arca_pruebas`.

## Aprobaciones

| Rol | Nombre | Fecha | Resultado |
|---|---|---|---|
| Responsable de BD | Víctor Adrián | 2026-11-12 | Aprobada (decisiones 2a/2b/2c/7/13/14/15/16/17 registradas) |
| Responsable backend | Jonathan | | Pendiente |

Aprobado por: Víctor Adrián (BD, 2026-11-12). La aprobación de backend está pendiente; la DBR no queda plenamente aprobada ni pasa a `Lista para backend` hasta contar con la aprobación separada de backend (`docs/database/requests/README.md`, regla 4). La migración ya fue redactada según las decisiones de BD.

> **Recordatorio de firmas:** toda retroalimentación de un ADR, spec o DBR se firma en el propio documento en el momento de darla; no se acepta aprobar de palabra ni dejar la firma para después, porque se olvida. Quien solicita la retroalimentación pide la firma en ese mismo acto.

## Aplicación por ambiente

| Ambiente | Estado | Fecha | Evidencia |
|---|---|---|---|
| desarrollo/pruebas (`arca_pruebas`) | pendiente (migración creada) | | |
| staging | pendiente | | |
| producción | pendiente | | |
