# DBR-013 · species-requests

- Estado: Borrador (sin aprobar; sin migración; sin SQL)
- Feature/spec origen: `apps/api/specs/014-species-requests.md` (solicitudes de **publicación** de una especie existente: envío, selector, revisión, edición previa, publicar o rechazar). Consumidores: `apps/pwa/specs/005-species-request-submission.md` (selector y envío), `apps/dashboard/specs/010-public-content-management.md` (revisión, edición, publicar o rechazar; absorbe `dashboard-009`), `apps/api/specs/015-public-species-read.md` (lectura pública de especies publicadas) y `apps/web/specs/011-dynamic-tulanpedia.md` (consumidor de `api-015`).
- Solicitante: por confirmar (solicitud de la sesión principal, 2026-11-11).
- Responsable de BD: por confirmar (DBR-012 registra a Víctor Adrián).
- Responsable backend: por confirmar (DBR-012 registra a Jonathan).
- Fecha de la última revisión: 2026-11-12 (tercera ronda: sin cambio de columnas; ver el historial siguiente).

## Historial del cambio de modelo (2026-11-11)

- **Versión anterior (incorrecta):** la solicitud proponía una especie **nueva** que se creaba en `species` al aceptar. La tabla guardaba `common_name` propio y `species_id` era nullable hasta la aceptación.
- **Motivo del cambio:** la especie ya existe antes de cualquier solicitud. `AnimalController::store` la crea al registrar un animal (ver «Estado actual»). Crear otra especie al aceptar duplicaría filas.
- **Modelo actual:** la solicitud propone la **publicación** de una especie existente. `species_id` es obligatorio desde el envío (FK RESTRICT). La tabla `species_publication_requests` guarda solo lo que la publicación necesita: foto pendiente, tipo de animal, correcciones propuestas, selección de la ficha pública, estado y revisión. **No duplica `common_name`**: se lee de `species`. `species` gana una marca de publicación, la foto pública y la selección de campos publicada.
- Qué cambia en esta DBR: contrato de la tabla, columnas nuevas en `species`, índices, preguntas (1 a 17), y la sección de decisiones para BD (2a, 2b y 2c nueva).
- **2026-11-11 (segunda ronda, decisiones del usuario):** `request_type` (`publish` o `update`) en la tabla; `image_path` obligatoria solo en `publish`; `species.published_at` aprobada como columna (pregunta 11 resuelta); `species.unpublished_at` nueva (la necesita la derivación del estado `unpublished`, pregunta 15); historial de edición en Activitylog (pregunta 1 resuelta); SoftDeletes en la tabla de solicitudes usado por «Eliminar la publicación» (`api-014` CA-38).
- **2026-11-12 (tercera ronda, decisiones del usuario):** sin cambio de columnas. Una especie despublicada puede recibir una solicitud `update` (`request_type = update`), y la aceptación con «Aceptar sin publicar» deja `is_published = 0` con `unpublished_at` sin cambios (`api-014` CA-08, CA-32). Los permisos y la edición de la especie despublicada no tocan esta DBR.

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

### Cambios en `species` (propuestos)

Son columnas nuevas. Las especies existentes quedan con `is_published = 0`, y ninguna aparece como publicada hasta que se publique (aceptación con publicación o republicación, `api-014` CA-08, CA-36).

| Columna | Tipo propuesto | Nulabilidad | Default | Motivo |
|---|---|---|---|---|
| `is_published` | TINYINT(1) | NOT NULL | `0` | Marca de publicación. Es el único criterio de visibilidad pública (`api-015` RN-03). Solo cambia al aceptar (`api-014` CA-31). |
| `published_at` | TIMESTAMP | NULL | — | Fecha de la versión publicada vigente. Aprobada además de `is_published` (decisión del usuario 2026-11-11, pregunta 11). Se fija al publicar, republicar o aceptar una actualización con publicación (`api-014` CA-08, CA-36); se pone NULL al eliminar la publicación (CA-38). |
| `unpublished_at` | TIMESTAMP | NULL | — | Momento de la última despublicación (`api-014` CA-35). Con `is_published = 0` y este campo no nulo, la especie está `unpublished` (RN-18). Se pone NULL al republicar y al eliminar la publicación. Propuesta: guardarla (pregunta 15). |
| `image_path` | VARCHAR(255) | NULL | — | Ruta relativa de la foto pública en `media/species/` (`api-014` CA-08). Decisión 2b resuelta por diseño. |
| `published_fields` | JSON | NULL | — | Selección de la ficha pública, copiada desde la solicitud aceptada (`api-014` RN-13, RN-14). NULL en especies no publicadas. |

Sin cambio en `species`: `category` (DBR-004), `habitat`, `scientific_name` y `distribution`. Si 2a se resuelve como (B), se añade también `species.origin` (ver «Decisiones para el responsable de BD»).

## Elementos afectados

| Tipo | Nombre | Cambio |
|---|---|---|
| tabla | `species_publication_requests` | Crear con las columnas de la tabla anterior. |
| columnas | `species.is_published`, `species.published_at`, `species.unpublished_at`, `species.image_path`, `species.published_fields` | Añadir (ver «Cambios en `species`»). |
| columna | `species_publication_requests.request_type` | Añadir (ver la tabla de la solicitud). |
| sin cambio de esquema | `species.category` | Ya existe (DBR-004). La aceptación la escribe con el valor efectivo (`api-014` CA-08, CA-25). |
| índice | `species_publication_requests(status, created_at)` | Crear. Lista de revisión (`api-014` CA-05). |
| índice | `species_publication_requests(species_id, status)` | Crear. Elegibilidad del envío (`api-014` CA-27), selector (CA-26) y la comprobación de «ya pendiente». |
| índice | `species(is_published)` | Crear. Lectura pública (`api-015` RN-03). |
| índice | `species(is_published, unpublished_at)` | Propuesta de BD (pregunta 17). Lista de publicadas y despublicadas (`api-014` CA-40). |
| clave foránea | `species_publication_requests.species_id` → `species.id` | Crear, NOT NULL, `ON DELETE RESTRICT`. |
| clave foránea | `species_publication_requests.created_by`, `updated_by`, `reviewed_by` → `users.id` | Crear, RESTRICT. |
| dato (no esquema) | Permiso `species.review` y su asignación solo a `zoo-admin` | Lo crea y asigna `RolesAndPermissionsSeeder` (`api-014` CA-20, RN-10). Excluirlo explícitamente de `admin` (el seeder da a `admin` todos los permisos de su arreglo salvo los de boletos). Pendiente de implementar (tarea T-SEED de `api-014`). |
| dato (no esquema) | Permiso `memories.review` | Lo cubre DBR-012 y el seeder; no cambia esta DBR. |

Nombres propuestos (MySQL limita a 64 caracteres): `idx_species_publication_requests_status_created`, `idx_species_publication_requests_species_status`, `idx_species_is_published`, `fk_species_publication_requests_species_id`, `fk_species_publication_requests_created_by`, `fk_species_publication_requests_updated_by` y `fk_species_publication_requests_reviewed_by`.

Concurrencia: MySQL 8.0 no tiene índice único parcial. Que una especie tenga como máximo una solicitud `submitted` lo garantiza la Action con un bloqueo de la fila de `species` (`api-014` RN-11). BD puede proponer otra protección (pregunta 14).

## SQL de referencia (MySQL 8.0)

No se incluye SQL, ni de referencia, por decisión del solicitante, igual que en DBR-012. El contrato se expresa en las tablas de esta DBR. El responsable de BD redacta la migración Laravel tras aprobar la DBR, la prueba en MySQL 8.0 aislado y documenta la evidencia.

## Datos existentes y migración de datos

- `species_publication_requests` es tabla nueva, vacía al inicio, sin backfill.
- `species` existentes: `is_published = 0`, `published_at`, `image_path` y `published_fields` en NULL. No se inventa `category` ni `scientific_name` para especies existentes.
- Efecto: ninguna especie existente aparece en TulanPedia (`api-015`) hasta su aceptación. En el selector del veterinario aparecen todas con su estado; las que tienen `category` NULL se pueden proponer con tipo.
- No hay cambios a tablas de otras features. `species.common_name` no cambia.

## Privacidad, auditoría y retención

- **Clasificación:** personal en parte. `created_by`, `updated_by` y `reviewed_by` identifican personal (veterinario y Dirección). La foto es de un animal o especie, no de personas. No es clínico ni financiero. Los datos clínicos de los animales no se tocan.
- **SoftDeletes:** `deleted_at` en la tabla cumple la Constitución V. La aplicación no borra filas físicamente. El rechazo borra el archivo de la foto, no la fila (`api-014` CA-10). «Eliminar la publicación» (`api-014` CA-38) marca como eliminadas (`deleted_at`) las solicitudes de la especie y borra sus fotos; tampoco borra filas de `species`. **`species` no tiene SoftDeletes** (pregunta 13).
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

1. Aprobación separada de BD y de backend (`docs/database/requests/README.md`, regla 4), con las preguntas de esta DBR respondidas.
2. Migración Laravel creada, probada en MySQL 8.0 aislado y aplicada en `arca_pruebas`, con evidencia.
3. Aplicación registrada en la tabla de «Aplicación por ambiente».
4. Estado «Lista para backend». Backend implementa `api-014` (incluidos el selector, el envío, la edición `PATCH` y el seeder de `species.review` con exclusión de `admin`) y `api-015`.
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
- Pruebas de backend sugeridas: `api-014` CA-01 a CA-31 (PHPUnit contra `arca_pruebas`, con `DatabaseTransactions`, sin `RefreshDatabase`).
- Resultado y evidencia: no hay (estado Borrador).

## Decisiones para el responsable de BD

Esta sección no decide nada. Deja a BD tres decisiones de esquema, con sus consecuencias y una recomendación. BD decide al redactar la migración o devuelve la DBR con su decisión. Las specs (`api-014`, `api-015`, `pwa-005`, `dashboard-010` y `web-011`) funcionan con cualquiera de las opciones; cambia solo lo que se indica aquí.

### 2a. `origin`: mapear a `species.distribution` (A) o crear `species.origin` (B)

| Aspecto | (A) mapear a `species.distribution` | (B) nueva columna `species.origin` VARCHAR(150) NULL |
|---|---|---|
| Migración | Ninguna en `species`. Solo las correcciones de la solicitud. | Migración extra en `species`: nullable, sin datos previos. |
| Semántica | `distribution` es la «distribución geográfica natural» de la especie (`docs/database/esquema-ingles.md`). Riesgo: si el formulario se entiende como procedencia del ejemplar, el dato queda en un campo de otro significado. | Segundo `origin` en la base. `animals.origin` ya significa procedencia del ejemplar: mismo nombre, dos significados. |
| `api-015` RN-06 | Lee `distribution`. La respuesta sigue llamándose `origin`. | Lee `species.origin`. |
| `api-006` (app móvil) | Expone `distribution`: las especies publicadas con animales mostrarán el dato en `GET /api/v1/species`. Aviso informativo a `mobile`. | Sin cambio: `api-006` no devuelve `origin`. |
| Aceptación (`api-014` CA-08) | Copia la corrección a `distribution`. | Copia a `origin`. |
| Reversión | Sin DDL: nada que revertir. | Reversible en `down()` si no hay datos. |

**Recomendación: (A).** Evita una migración en `species` y un segundo significado de `origin` junto a `animals.origin`. Condiciones: la etiqueta de `pwa-005` debe decir que es el área natural de la especie, no la procedencia del ejemplar, y hay que dar aviso informativo a `mobile` de que `api-006` expondrá `distribution`.

### 2b. Imagen de la especie: **resuelta por diseño** a favor de la columna `species.image_path`

Decisión de diseño de esta versión del modelo (2026-11-11): la foto pública se guarda en la columna `species.image_path`. Razones: se escribe en la misma transacción que el estado y la publicación (`api-014` CA-08); la base guarda la ruta relativa, como exige ADR 0026; y una ruta derivada por convención no se sostiene sin re-codificar la imagen (los archivos tienen uuid y extensión variable). **BD puede objetar** y proponer otra forma; si lo hace, `api-015` RN-07 cambia en un único punto de lectura.

### 2c. Forma de la solicitud: tabla delgada (A) o solo columnas en `species` (B)

- **A. Tabla delgada `species_publication_requests`** (esta DBR): una fila por solicitud, con el contrato de arriba. **Recomendada.**
- **B. Sin tabla:** la solicitud vive en columnas de `species`: `publication_status` (`not_published`, `submitted`, `published`), columnas `pending_*` para foto, tipo, correcciones y ficha, `submitted_by`, `submitted_at`, `reviewed_by`, `reviewed_at` y `rejection_reason`.

| Aspecto | A. Tabla delgada (recomendada) | B. Solo columnas en `species` |
|---|---|---|
| Migración | Tabla nueva más columnas en `species`. | Solo columnas en `species`, más muchas columnas nuevas en la tabla compartida. |
| Varias solicitudes por especie | Historial de filas. Una rechazada no bloquea una nueva. | Una sola fila: la rechazada se pierde salvo en la auditoría. |
| Correcciones pendientes | Viven en la solicitud. La fila de `species` no cambia hasta aceptar. | Viven en columnas `pending_*` de la fila compartida que lee `api-006`. |
| Foto propuesta | Solo en la solicitud. | En la fila de `species`, aunque `api-015` no la expone (filtra por `is_published`). Riesgo de fuga si un `Resource` no excluye las columnas. |
| Una sola solicitud viva | Regla de aplicación con bloqueo (`api-014` RN-11). | Implícita en `publication_status`. |
| Consultas | Índices en la tabla propia. | Índices en `species`. |
| Historial | Filas por solicitud, más auditoría. | Solo auditoría (Activitylog). |
| Efecto en `api-014` | Sin cambio en el contrato. | El `PATCH` edita columnas de `species`; el listado filtra por `publication_status`. |

**Recomendación: A.** Mantiene la tabla compartida limpia, conserva el historial de rechazos y da un lugar donde esperar las correcciones del veterinario. La decisión es de BD: lo que se documente aquí define lo que se implementa.

## Preguntas abiertas para BD y producto

1. **Historial de edición.** **Resuelta, decisión del usuario 2026-11-11:** Activitylog, sin tabla `species_publication_request_revisions` (`api-014` CA-18).
2. **Longitudes de `origin` y `habitat`.** **Resuelta, decisión del usuario 2026-11-11:** 150 caracteres para ambos.
3. **Vínculo con `species`.** **Cambiada el 2026-11-11 con el modelo de publicación:** `species_id` es **NOT NULL desde el envío**, con FK `ON DELETE RESTRICT`. Ya no es nullable ni se llena al aceptar (`api-014` CA-24). Resuelta.
4. **Campo `origin` en `species`.** **Pendiente: responsable de BD** (sección «Decisiones para el responsable de BD», 2a). Afecta a `api-015` RN-06 y `dashboard-010` CA-07.
5. **Foto pública en `species`.** **Resuelta por diseño** (sección 2b): columna `species.image_path`. BD puede objetar. Afecta a `api-015` RN-07.
6. **Carpeta de la foto pendiente.** **Resuelta, decisión del usuario 2026-11-11:** `media/species-requests/` es pública durante pruebas, con la enmienda del ADR 0026. Recomendación antes de producción (`api-014`).
7. **Selección de la ficha pública.** **Propuesta, abierta:** columna `published_fields` JSON NOT NULL en `species_publication_requests`, copiada a `species.published_fields` al aceptar. ¿BD la aprueba así, o prefiere una tabla hija con una fila por campo? Afecta a `api-014` RN-13 y `api-015` CA-13.
8. **Fuente de los campos extra.** **Abierta.** `conservation_status`, `size_cm` y `gestation_period` existen en `species`; `diet`, `longevity` y `characteristics` solo existen en `animals`. ¿Se añaden a la solicitud como correcciones (y se copian a `species` al aceptar) para que `pwa-005` los pida, o se excluyen de la v1? Hasta decidir, esas seis claves no se implementan (`api-014` RN-13). Análisis en `docs/adr/0028-dynamic-tulanpedia-catalog.md`, sección «Decisión pendiente del responsable de BD: campos extra de la ficha pública» (recalculado con este modelo el 2026-11-11). La captura de `category` no forma parte de esta pregunta (pregunta 10).
9. **Foto original tras aceptar.** **Resuelta, decisión del usuario 2026-11-11:** opción B (mover): copiar a `media/species/`, confirmar la transacción y borrar la original. `image_path` de la solicitud queda NULL (`api-014` CA-08).
10. **Tipo de animal (`category`) en la solicitud.** **Resuelta, decisión del usuario (2026-11-11):** el veterinario elige el tipo con la lista cerrada de DBR-004; la columna `species_publication_requests.category` es una corrección (NULL = sin corrección) y la aceptación escribe el valor efectivo en `species.category`. **Por confirmar:** (a) que el tipo sea obligatorio en el envío (si no, una especie publicada puede quedar con `category` NULL y no contar en las misiones ni en el filtro de TulanPedia); (b) que `category` se publique siempre y no sea desmarcable (`api-014` RN-13).
11. **Fecha de publicación (`published_at`).** **Resuelta, decisión del usuario 2026-11-11:** sí, se añade además de `species.is_published` (ver la tabla de `species`). Ver `api-014` pregunta 13 y 21.
12. **Forma de la solicitud (2c).** **Abierta, decisión de BD.** Tabla delgada (A, recomendada) o columnas en `species` (B). Ver la sección 2c.
13. **Constitución V en `species`.** **Abierta.** `Species` extiende `Model` y no tiene `SoftDeletes`. La Constitución V exige que los modelos de negocio usen SoftDeletes y extiendan `BaseModel`. ¿BD y backend añaden `deleted_at` a `species` (con su DBR propia o en esta) y adaptan el modelo? Si se añade, `api-015` RN-03 debe excluir las filas borradas.
14. **Unicidad de la solicitud viva por especie.** **Abierta.** MySQL 8.0 no tiene índice único parcial. Propuesta: la Action bloquea la fila de `species` y comprueba que no haya otra `submitted` (`api-014` RN-11). ¿BD prefiere otra protección (por ejemplo, una columna generada con índice único)?
15. **Guardar o solo auditar la despublicación.** **Abierta (BD).** Propuesta: guardar `species.unpublished_at`, porque la derivación del estado `unpublished` (`api-014` RN-18) lo necesita. El revisor que despublica (`unpublished_by`) solo se audita en Activitylog (`api-014` RN-12); si BD prefiere guardarlo, se añade una columna `unpublished_by` INT NULL con FK a `users.id` RESTRICT.
16. **Nulabilidad de `species_publication_requests.category`.** **Abierta (BD).** La aplicación exige `category` en el envío (`api-014` CA-25), pero guarda NULL cuando el valor es igual al de la especie (`api-014` CA-30). Propuesta: mantener la columna nullable (NULL = sin corrección). Alternativa: NOT NULL con el valor enviado siempre; en ese caso CA-30 cambia para `category` en `api-014` y la aceptación copia siempre el valor.
17. **Índice de la lista de publicadas.** **Abierta (BD).** Propuesta: `species(is_published, unpublished_at)` para `api-014` CA-40, con EXPLAIN sobre `arca_pruebas`. Decide BD si lo crea o si basta el índice de `is_published`.

## Aprobaciones

| Rol | Nombre | Fecha | Resultado |
|---|---|---|---|
| Responsable de BD | por confirmar | | Pendiente |
| Responsable backend | por confirmar | | Pendiente |

Esta DBR no está aprobada. No sustituye las aprobaciones separadas de BD y backend (`docs/database/requests/README.md`, regla 4).

> **Recordatorio de firmas:** toda retroalimentación de un ADR, spec o DBR se firma en el propio documento en el momento de darla; no se acepta aprobar de palabra ni dejar la firma para después, porque se olvida. Quien solicita la retroalimentación pide la firma en ese mismo acto.

## Aplicación por ambiente

| Ambiente | Estado | Fecha | Evidencia |
|---|---|---|---|
| desarrollo/pruebas (`arca_pruebas`) | pendiente | | |
| staging | pendiente | | |
| producción | pendiente | | |
