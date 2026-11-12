# DBR-013 · species-requests

- Estado: Borrador (sin aprobar; sin migración; sin SQL)
- Feature/spec origen: `apps/api/specs/014-species-requests.md` (solicitudes de especie: envío, revisión, edición previa, aceptación y rechazo). Consumidores: `apps/pwa/specs/005-species-request-submission.md` (envío), `apps/dashboard/specs/010-public-content-management.md` (revisión, edición previa a la aceptación; absorbe `dashboard-009`), `apps/api/specs/015-public-species-read.md` (lectura pública de especies aceptadas; usa `species_id`), y `apps/web/specs/011-dynamic-tulanpedia.md` (consumidor de `api-015`).
- Solicitante: por confirmar (solicitud de la sesión principal, 2026-11-11).
- Responsable de BD: por confirmar (DBR-012 registra a Víctor Adrián).
- Responsable backend: por confirmar (DBR-012 registra a Jonathan).
- Fecha de la última revisión: 2026-11-11 (decisiones del usuario: `species_id` decidido; origen e imagen pendientes de BD; selección de campos de la ficha pública; predeterminados de la ficha con origen marcado; foto anterior borrada sin conservarla; `category` capturada en la solicitud, pregunta 10 resuelta)

## Problema y justificación

Hoy el veterinario registra animales individuales, y la existencia de una especie en `species` se decide al crear el animal. No hay un lugar donde el veterinario proponga una especie nueva con su foto, ni donde el zoológico la revise antes de publicarla en TulanPedia (`apps/web/specs/011-dynamic-tulanpedia.md`).

Hace falta una tabla que guarde cada solicitud con su estado, su foto (ruta), su motivo de rechazo y su revisión, y que permita aceptar la solicitud para crear o vincular una especie publicada. Además, la aceptación debe poder guardar la ruta de la foto pública de la especie si se decide que `species` la tenga (ver «Elementos afectados»).

## Estado actual

- No existe la tabla `species_requests`.
- La tabla `species` existe (renombrada al inglés por DBR-001). Sus columnas relevantes para esta DBR, según las migraciones y las specs que la consultan: `id`, `common_name`, `scientific_name` (nullable por DBR-011), `distribution`, `conservation_status`, `gestation_period`, `size_cm`, `model_3d_path`, `habitat` (`apps/api/specs/006-public-catalog-read.md` lo lista en la respuesta). No hay columna de foto en `species`: `photo_path` vive en `animals`.
- La columna `category` de `species` existe: la agrega `2026_10_15_000004_visitor_progress_schema` (DBR-004), como `VARCHAR(30)` NULL con lista cerrada (`mammal`, `bird`, `reptile`, `amphibian`, `fish`, `invertebrate`). La usan `api-006` (`GET /api/v1/species`, CA-01), la app móvil (misiones `category_species_count`, `api-005`) y el código de la API. Esta DBR no la modifica. Desde la decisión del usuario del 2026-11-11, la solicitud de especie sí la captura (columna nueva `species_requests.category`; pregunta 10 resuelta), y la aceptación la copia a `species.category`. Así la especie aceptada puede contar en las misiones `category_species_count` y en el filtro por tipo de `web-011`. No verificado contra la base `arca_pruebas`: el código y los tests la dan por existente.
- `origin`, `diet`, `longevity` y `characteristics` existen en `animals` (datos por individuo; DBR-001), no en `species`.
- El permiso `species.review` no existe. Se crea con el seeder, no con migración (ver «Elementos afectados»).

## Contrato solicitado

### Tabla `species_requests`

Una fila por solicitud. Las reglas de valores, transiciones y duplicados las aplica la API (`api-014` RN-02, RN-03); la base de datos guarda y protege la integridad.

| Columna | Tipo propuesto | Nulabilidad | Default | Descripción y notas |
|---|---|---|---|---|
| `id` | BIGINT UNSIGNED AUTO_INCREMENT | NOT NULL | — | Clave primaria, como las tablas creadas por migraciones recientes (DBR-012). |
| `common_name` | VARCHAR(150) | NOT NULL | — | Nombre común propuesto (requerido, máximo 150; `api-014` CA-01). Se edita antes de aceptar (`api-014` CA-15; `dashboard-010` CA-07). |
| `scientific_name` | VARCHAR(150) | NOT NULL | — | Nombre científico propuesto (requerido, máximo 150; `api-014` CA-01). Se edita antes de aceptar. |
| `origin` | VARCHAR(150) | NULL | — | Origen propuesto. Opcional según `pwa-005` CA-01 y CA-05. Su destino en `species` lo decide BD (sección «Decisiones para el responsable de BD», 2a). **Longitud 150 (resuelta el 2026-11-11, pregunta 2).** |
| `habitat` | VARCHAR(150) | NULL | — | Hábitat propuesto. Opcional según `pwa-005` CA-05. Texto libre, normalizado (sin espacios sobrantes). **Longitud 150 (resuelta el 2026-11-11, pregunta 2).** Alimenta el filtro de hábitat de `web-011` (CA-04). |
| `category` | VARCHAR(30) | NULL o NOT NULL (decisión del responsable de BD) | — | Tipo de animal, lista cerrada de DBR-004 (`mammal`, `bird`, `reptile`, `amphibian`, `fish`, `invertebrate`). Decidido por el usuario el 2026-11-11 (pregunta 10): la solicitud lo captura (`api-014` CA-01, CA-15 y CA-25). **Obligatoriedad por confirmar** (propuesta: obligatorio); si se confirma, la columna va NOT NULL. Se valida en la aplicación (sin CHECK salvo que BD lo añada). Se copia a `species.category` al aceptar (`api-014` CA-08). |
| `status` | VARCHAR(20) | NOT NULL | `'submitted'` | Valores: `submitted`, `accepted`, `rejected` (`api-014` RN-02). Validación en la aplicación; VARCHAR en vez de ENUM para portabilidad entre Aiven y local (igual que DBR-012). |
| `image_path` | VARCHAR(255) | NULL | — | Ruta relativa en el disco `media` de la foto pendiente (`species-requests/<uuid>.(jpg\|jpeg\|png)`, nombre generado por la API). Se requiere al enviar (la validación es de la aplicación). Pasa a NULL al rechazar, cuando la API borra el archivo (`api-014` CA-10), y también al aceptar, después de copiar la foto a `media/species/` y borrar la original (`api-014` CA-08; pregunta 9 resuelta, opción B). Cambia también al reemplazar la foto en la edición mientras está `submitted` (`api-014` CA-23). **Carpeta:** `media/species-requests/`, pública por `/media` durante pruebas (enmienda del ADR 0026, 2026-11-11). La API no devuelve su URL. Recomendación antes de producción (`api-014`). |
| `rejection_reason` | VARCHAR(500) | NULL | — | Motivo del rechazo (`api-014` CA-10, 1 a 500 caracteres). Solo con `status = 'rejected'`. |
| `species_id` | INT | NULL | — | Especie publicada al aceptar. FK a `species.id` (mismo tipo INT que `species.id`), `ON DELETE RESTRICT`. **Decidido: sí (decisión del usuario 2026-11-11, pregunta 3).** Queda NULL mientras la solicitud está `submitted` o `rejected`, y se llena en la misma transacción de la aceptación (`api-014` CA-08 y CA-24). Es la relación solicitud↔especie que usa `api-015` RN-03. |
| `published_fields` | JSON | NOT NULL | — (sin default en BD; la aplicación lo escribe siempre) | **Propuesta de esta DBR** (BD puede proponer otra forma). Lista de claves de la ficha pública elegidas por el veterinario y ajustables por `zoo-admin` mientras está `submitted` (`api-014` RN-13, CA-21 y CA-22). La aplicación valida la lista cerrada. `common_name` y la foto no van aquí porque siempre se publican. Predeterminados (`api-014` RN-13, 2026-11-11): `scientific_name`, `origin` y `habitat` marcados; el resto, desmarcado. Desmarcar un campo solo evita que se muestre en el portal; el dato sigue guardado en la solicitud. MySQL 8.0 admite JSON nativo y no admite un default literal en JSON, por eso no tiene default. |
| `created_by` | INT | NOT NULL | — | Veterinario que envió la solicitud (`api-014` CA-05: `veterinarian_name`). FK a `users.id`, RESTRICT. Confirmar que el veterinario es un usuario de `users` (personal, DBR-002). |
| `reviewed_by` | INT | NULL | — | Personal de la última decisión (aceptar o rechazar). FK a `users.id`, RESTRICT. NULL mientras no haya decisión. |
| `reviewed_at` | TIMESTAMP | NULL | — | Momento de la última decisión. |
| `created_at` | TIMESTAMP | NULL | — | Fecha de envío (`api-014` CA-05, orden de la lista). |
| `updated_at` | TIMESTAMP | NULL | — | Última modificación, incluida la edición previa a la aceptación (`api-014` CA-15). |
| `deleted_at` | TIMESTAMP | NULL | — | Borrado lógico (SoftDeletes, Constitución V). |

### Cambios en `species` (pendientes de decisión, no incluidos en el contrato cerrado)

Estos dos elementos dependen de las opciones 2a y 2b de la sección «Decisiones para el responsable de BD», que decide BD. Si no se aprueban, no se aplican.

| Columna | Tipo propuesto | Nulabilidad | Motivo |
|---|---|---|---|
| `image_path` | VARCHAR(255) | NULL | Ruta relativa de la foto pública de la especie en `media/species/` (`api-014` CA-08). Sin esta columna la foto pública solo existe como archivo, sin ruta en la base. **Opción 2b (decisión pendiente de BD).** Afecta a `api-015` RN-07. |
| `origin` | VARCHAR(150) | NULL | Solo si el origen de la solicitud no se mapea a `distribution`. **Opción 2a (decisión pendiente de BD).** Afecta a `api-015` RN-06. Si se mapea a `distribution`, no se crea la columna. |

## Elementos afectados

| Tipo | Nombre | Cambio |
|---|---|---|
| tabla | `species_requests` | Crear con las columnas de la tabla anterior. |
| columna | `species_requests.published_fields` (JSON) | Crear, NOT NULL (propuesta de esta DBR; ver pregunta 7). |
| columna | `species_requests.category` (VARCHAR(30)) | Crear. Nulabilidad según la obligatoriedad (por confirmar); decide el responsable de BD. Decidido por el usuario (2026-11-11, pregunta 10). |
| sin cambio de esquema | `species.category` | Ya existe (DBR-004, `VARCHAR(30)` NULL). No se migra; la aceptación la escribe (`api-014` CA-08). |
| índice | `species_requests(status, created_at)` | Crear. Sirve a la lista de revisión de `api-014` CA-05 (filtro por estado y orden). |
| índice | `species_requests(common_name, status)` | Crear. Sirve a la comprobación de nombre duplicado de `api-014` CA-01, CA-16 y RN-03. |
| índice | `species_requests(species_id, status)` | Propuesta. Sirve a la lectura pública de `api-015` RN-03 (solicitudes aceptadas por especie). Alternativa para BD: un índice `UNIQUE` sobre `species_id`, que cubre la consulta y evita dos solicitudes con la misma especie (MySQL admite varios NULL). BD elige una de las dos. |
| clave foránea | `species_requests.species_id` → `species.id` | Crear con `ON DELETE RESTRICT`, columna NULL (decidido el 2026-11-11). |
| clave foránea | `species_requests.created_by` → `users.id` | Crear, RESTRICT. |
| clave foránea | `species_requests.reviewed_by` → `users.id` | Crear, RESTRICT. |
| columna (pendiente) | `species.image_path` | Solo si se aprueba (ver «Cambios en `species`»). |
| columna (pendiente) | `species.origin` | Solo si se aprueba (ver «Cambios en `species`»). |
| dato (no esquema) | `permissions`: `species.review` y su asignación solo a `zoo-admin` en `role_has_permissions` | No es migración. Lo crea y lo asigna `RolesAndPermissionsSeeder` (`api-014` CA-20 y RN-10). Hay que excluirlo explícitamente de `admin`, porque el seeder da a `admin` todos los permisos de su arreglo salvo `tickets.create` y `tickets.cancel`. **Pendiente de implementar en el seeder (tarea futura T-SEED de `api-014`).** |
| dato (no esquema) | Permiso `memories.review` | No cambia el esquema en esta DBR (lo cubre DBR-012). Se asigna en el mismo seeder, con la misma exclusión de `admin` (`api-010` RN-07 y CA-16). |
| sin cambio de esquema | Edición previa (`PATCH` de `api-014`) | Usa las columnas de la tabla anterior, incluidas `published_fields` e `image_path` (al reemplazar la foto). No añade tablas de historial (ver pregunta 1). |

Nombres de índices y claves: se proponen nombres explícitos y cortos, como en DBR-012: `idx_species_requests_status_created`, `idx_species_requests_common_name_status`, `idx_species_requests_species_status`, `fk_species_requests_species_id`, `fk_species_requests_created_by` y `fk_species_requests_reviewed_by`. Si BD aprueba el índice único: `uq_species_requests_species_id`.

## SQL de referencia (MySQL 8.0)

No se incluye SQL, ni de referencia, por decisión del solicitante, igual que en DBR-012. El contrato se expresa en las tablas de esta DBR. El responsable de BD redacta la migración Laravel tras aprobar la DBR, la prueba en MySQL 8.0 aislado y documenta la evidencia.

## Datos existentes y migración de datos

- `species_requests` es tabla nueva, sin datos previos ni backfill.
- Si se aprueban `species.image_path` o `species.origin`, son columnas nuevas NULL en `species`; las especies existentes quedan con NULL. No se rellenan datos existentes.
- No hay cambios a tablas de otras features.

## Privacidad, auditoría y retención

- **Clasificación:** personal en parte. `created_by` y `reviewed_by` identifican personal (veterinario y Dirección). La foto es de un animal o especie, no de personas. No es clínico ni financiero. Los datos clínicos de los animales siguen en sus propias tablas y no se tocan aquí.
- **SoftDeletes:** la columna `deleted_at` cumple la Constitución V. La aplicación no borra filas físicamente. El rechazo borra el archivo de la foto, no la fila (`api-014` CA-10).
- **Foto pendiente (2026-11-11):** `image_path` pasa a NULL tras el rechazo y tras la aceptación, y el archivo se borra en ambos casos (`api-014` RN-04 y CA-08). Durante pruebas, la foto pendiente está en la carpeta pública `media/species-requests/` (enmienda del ADR 0026): la API no devuelve su URL (`api-014` CA-06), pero quien conozca la URL puede verla. **Recomendación antes de producción:** pasar a almacenamiento privado o a otro almacenamiento (`api-014`, «Recomendación antes de producción»). Es riesgo conocido, no un requisito de la base de datos. **Reemplazo de foto (`api-014` CA-23):** el archivo anterior se borra tras confirmar la transacción y no se conserva ni se archiva (decisión del usuario 2026-11-11, `api-014` pregunta 8); la fila no se borra (SoftDeletes aplica a filas, no a archivos).
- **Retención:** la purga automática de solicitudes rechazadas no se incluye (`api-014` pregunta 1, sin decidir). Por defecto, las filas se conservan.
- **Edición previa a la aceptación:** cada cambio debe quedar auditado con valores anteriores y nuevos (`api-014` CA-18 y RN-12). Ver pregunta 1 para decidir entre Activitylog y una tabla de historial.
- **Auditoría:** la API registra en Activitylog el envío, cada edición, la aceptación y el rechazo (`api-014` CA-08, CA-10 y CA-18). `reviewed_by` y `reviewed_at` guardan la última decisión.
- **Creador:** `created_by` apunta a `users`. El veterinario es personal, no visitante.

## Impacto, rendimiento y reversión

- Tabla nueva, vacía al inicio. No bloquea tablas existentes.
- Impacto en `mobile` (avisar al equipo; esta DBR no cambia código ni specs de mobile): al aceptar una especie con `category`, esta pasa a contar en las misiones `category_species_count` (`api-005`) y `GET /api/v1/species` (`api-006`) la expone. El equipo de mobile debe verificarlo.
- Los índices cubren las consultas de `api-014` y `api-015`. El volumen esperado es bajo.
- Reversión en `down()`: eliminar la tabla solo en un ambiente sin solicitudes registradas. Si ya hay datos, BD decide la reversión y no borra filas sin respaldo.
- Si se añaden columnas a `species`, la reversión debe quitarlas solo cuando no haya datos en ellas.
- Respaldo previo recomendado antes de aplicar en cualquier ambiente.

## Compatibilidad MySQL 8.0

- Tipos estándar (BIGINT UNSIGNED, INT, VARCHAR, TIMESTAMP) y claves foráneas. Sin extensiones propietarias.
- Charset utf8mb4 y collation `utf8mb4_unicode_ci`, igual que el resto de tablas creadas por migraciones (`config/database.php`). La collation sin distinción de mayúsculas es la que usa la comparación de `habitat` y `name` en `api-015` RN-05.
- `published_fields` usa JSON nativo de MySQL 8.0 (portable entre Aiven y local). Sin default literal en JSON: la aplicación siempre escribe la lista.
- Revisión mínima de MySQL 8.0.x: pendiente del inventario inicial (igual que DBR-012).

## Objeto almacenado (si aplica)

No aplica. No hay funciones, procedimientos, vistas ni triggers. Las reglas de estado, de nombres duplicados y de transiciones viven en Actions de la API (`api-014` RN-05).

## Orden de despliegue

1. Aprobación separada de BD y de backend (`docs/database/requests/README.md`, regla 4), con las preguntas de esta DBR respondidas.
2. Migración Laravel creada, probada en MySQL 8.0 aislado y aplicada en `arca_pruebas`, con evidencia.
3. Aplicación registrada en la tabla de «Aplicación por ambiente».
4. Estado «Lista para backend». Backend implementa `api-014` (incluidos la edición `PATCH` de CA-14 a CA-19 y el seeder de `species.review` con exclusión de `admin`, CA-20) y `api-015`.
5. Staging y producción, después, con su propio registro. Los agentes no usan `arca_zoo`.
6. Requisito previo: DBR-001 (nombres en inglés), DBR-003 (`visitors`) y DBR-012 (`users` y `visitor_memories` ya en el ambiente) aplicadas.

## Pruebas y evidencia

- Comprobaciones sugeridas para BD (no ejecutadas):
  - FK a `species`, `users` (dos veces), con RESTRICT;
  - `species_id` NULL mientras la solicitud está `submitted` o `rejected`, y con el id de la especie tras aceptar (`api-014` CA-24);
  - `published_fields` NOT NULL y JSON válido; la aplicación rechaza claves fuera de la lista (`api-014` CA-21);
  - si BD aprueba el índice único: dos solicitudes no pueden apuntar a la misma especie;
  - `category` solo acepta los seis valores de DBR-004 (validación de la aplicación, `api-014` CA-25); si la obligatoriedad se confirma, la columna es NOT NULL y debe probarse un envío sin valor;
  - `status` solo acepta `submitted`, `accepted` y `rejected` (validación de la aplicación; si BD añade CHECK, debe probarse);
  - `rejection_reason` en NULL salvo en `rejected`;
  - `image_path` en NULL tras el rechazo;
  - `deleted_at` no se borra físicamente en la aplicación;
  - índices de duplicados y de aceptadas usados en las consultas de `api-014` CA-01 y `api-015` RN-03 (EXPLAIN).
- Pruebas de backend sugeridas: `api-014` CA-13 (PHPUnit contra `arca_pruebas`, con `DatabaseTransactions`, sin `RefreshDatabase`).
- Resultado y evidencia: no hay (estado Borrador).

## Decisiones para el responsable de BD

Esta sección no decide nada: deja a BD dos decisiones de esquema, con sus consecuencias y una recomendación. BD decide al redactar la migración o devuelve la DBR con su decisión. Las specs (`api-014`, `api-015`, `pwa-005`, `dashboard-010` y `web-011`) funcionan con cualquiera de las opciones; cambia solo lo que se indica aquí.

### 2a. `origin`: mapear a `species.distribution` (A) o crear `species.origin` (B)

| Aspecto | (A) mapear a `species.distribution` | (B) nueva columna `species.origin` VARCHAR(150) NULL |
|---|---|---|
| Migración | Ninguna en `species`. Solo `species_requests.origin`. | Migración extra en `species`: nullable, sin datos previos. |
| Semántica | `distribution` es la «distribución geográfica natural» de la especie (`docs/database/esquema-ingles.md`). Encaja con «de dónde es la especie». Riesgo: si el formulario se entiende como procedencia del ejemplar (donación, decomiso, rescate), el dato se guarda en un campo de otro significado. | Crea un segundo `origin` en la base. `animals.origin` ya significa procedencia del ejemplar: mismo nombre, dos significados. |
| `api-015` RN-06 | Lee `distribution`. La respuesta sigue llamándose `origin`. | Lee `species.origin`. Sin cambio de contrato. |
| `web-011` | Sin cambio. | Sin cambio. |
| `api-006` (app móvil) | `api-006` ya devuelve `distribution`. Las especies aceptadas que tengan animales mostrarán el dato también en `GET /api/v1/species`. Hay que avisar a `mobile`. | Sin cambio: `api-006` no devuelve `origin`. |
| PATCH de `api-014` (CA-15) | Edita `species_requests.origin`; al aceptar se copia a `distribution`. | Igual, pero se copia a `origin`. |
| Datos existentes | Las especies anteriores con `distribution` no cambian; ninguna sale en `api-015` sin solicitud aceptada. | Columna nueva en NULL para todas. |
| Reversión y portabilidad | Sin DDL: nada que revertir. Portable. | Reversible en `down()` si no hay datos. Portable (VARCHAR). |

**Recomendación: (A).** Evita una migración en `species` y un segundo significado de `origin` junto a `animals.origin`. Condiciones: la etiqueta de `pwa-005` debe decir que es el área natural de la especie, no la procedencia del ejemplar; y hay que avisar que `api-006` expondrá `distribution`.

### 2b. Imagen de la especie: columna `species.image_path` (A) o ruta derivada por convención (B)

| Aspecto | (A) columna `species.image_path` VARCHAR(255) NULL | (B) ruta derivada por convención a partir del id de la especie |
|---|---|---|
| Migración | Una columna nullable en `species`. | Ninguna. Pero la convención no se sostiene tal cual (ver «Viabilidad»). |
| Viabilidad | Directa. | `api-014` CA-02 y CA-08 nombran el archivo con un uuid y una extensión variable (jpg, jpeg, png). Desde el `id` no se conocen ni el uuid ni la extensión. Para derivarla hay que re-codificar a un formato fijo (nueva dependencia de imagen: ADR y Constitución I) o buscar tres extensiones en disco (frágil). |
| Consistencia | Se escribe una vez al aceptar, en la misma transacción que `species_id` y el estado. Si la copia falla, no se escribe la ruta. En v1 no cambia después, porque la edición solo ocurre en `submitted`. | No hay ruta guardada: si la copia falla, la especie queda sin foto y nada lo marca. |
| Reemplazo y borrado | Fuera de v1. Si se permitiera después, se actualiza la columna y se borra el archivo anterior tras confirmar, como `api-014` CA-23. | Sin fila que apunte al archivo, un reemplazo o un borrado no deja rastro verificable en la base. |
| Consultas y rendimiento | `api-015` lee la ruta en la misma consulta de `species`. | Cada fila calcula la ruta y comprueba el archivo (`api-015` CA-08). El catálogo es pequeño, pero hay más lógica en la Action. |
| Rutas rotas | Riesgo si el archivo falta. Se mitiga con la copia antes de confirmar y con `image_url = null` si no existe (`api-015` CA-08). | Riesgo mayor: una convención que no está en la base no se detecta. |
| Migrar a almacenamiento privado o de objetos (ADR 0026, recomendación de producción) | Cambia el disco o el prefijo; la base sigue guardando rutas relativas, como exige ADR 0026 (regla 2). | Depende de que la convención sobreviva a la migración. |
| `api-015` CA-08 | `image_url` = URL del disco + `species.image_path`. | `image_url` = URL del disco + ruta calculada. |

**Recomendación: (A).** La convención (B) no se sostiene sin re-codificar la imagen o buscar extensiones, y (A) sigue ADR 0026 y el precedente de DBR-012, que guarda rutas relativas. Variante válida (A2): guardar la ruta publicada en `species_requests.published_image_path`, como en DBR-012, sin columna en `species`. Se prefiere (A) porque la especie es la entidad pública que lee `api-015`.

Con cualquiera de las dos opciones, `api-015` RN-06 y RN-07 leen el dato a través de un único punto de lectura. Es el único punto que cambia con la decisión.

## Preguntas abiertas para BD y producto

1. **Historial de edición.** La edición previa a la aceptación (`dashboard-010` CA-07; `api-014` CA-18) necesita auditoría de valores anteriores y nuevos. ¿Basta con Activitylog, o se crea una tabla `species_request_revisions` append-only como `visitor_memory_reviews` en DBR-012? **Abierta.**
2. **Longitudes de `origin` y `habitat`.** **Resuelta, decisión del usuario 2026-11-11:** 150 caracteres para ambos, como el nombre.
3. **Vínculo con `species`.** **Resuelta, decisión del usuario 2026-11-11:** sí, `species_id` nullable, `ON DELETE RESTRICT`, NULL en `submitted` y `rejected`, y se llena al aceptar (`api-014` CA-08 y CA-24). Propuesta para BD: índice `UNIQUE` sobre `species_id` (ver «Elementos afectados»). Desbloquea `api-015` RN-03.
4. **Campo `origin` en `species`.** **Pendiente: responsable de BD** (sección «Decisiones para el responsable de BD», 2a). Afecta a `api-015` RN-06 y `dashboard-010` pregunta 4.
5. **Foto pública en `species`.** **Pendiente: responsable de BD** (sección «Decisiones para el responsable de BD», 2b). Afecta a `api-015` RN-07 y `dashboard-010` pregunta 5.
6. **Carpeta de la foto pendiente.** **Resuelta, decisión del usuario 2026-11-11:** `media/species-requests/` es pública durante pruebas, con la enmienda del ADR 0026. La columna `image_path` no cambia. Recomendación antes de producción: almacenamiento privado u otro almacenamiento (`api-014`, ADR 0026).
7. **Selección de la ficha pública.** **Propuesta, abierta:** columna `published_fields` JSON en `species_requests` (no en `species`), porque la Dirección la ajusta mientras la solicitud está pendiente. ¿BD la aprueba así, o prefiere otra forma (por ejemplo, una tabla hija con una fila por campo)? Afecta a `api-014` RN-13 y `api-015` CA-13.
8. **Fuente de los campos extra.** **Abierta.** `conservation_status`, `size_cm` y `gestation_period` existen en `species`, pero la solicitud no los guarda. `diet`, `longevity` y `characteristics` solo existen en `animals` (datos por individuo), no en `species`. ¿Se añaden a `species_requests` (y se copian a `species` al aceptar) para que `pwa-005` los pida, o se excluyen de la v1? Hasta decidir, esas seis claves no se implementan (`api-014` RN-13). **Pregunta concreta (2026-11-11):** ¿el formulario de la PWA debe pedir también estos campos de especie para poder publicarlos? Es la decisión abierta principal de la ficha pública (la captura de `category` es la pregunta 10); el resto ya está decidido (predeterminados de `published_fields`). Análisis de las opciones A, B y C, con su recomendación, en `docs/adr/0028-dynamic-tulanpedia-catalog.md`, sección «Decisión pendiente del responsable de BD: campos extra de la ficha pública». La decisión es del responsable de BD. La columna `species.category` ya existe (DBR-004) y no forma parte de esta pregunta: su captura se decidió en la pregunta 10 (2026-11-11).
9. **Foto original tras aceptar.** **Resuelta, decisión del usuario 2026-11-11:** opción B (mover), válida en el entorno de pruebas. Al aceptar, la API copia la foto a `media/species/`, confirma la transacción y borra la original de `media/species-requests/`; `image_path` queda NULL (`api-014` CA-08). Antes de producción se revisa junto con el almacenamiento privado (`api-014`, «Recomendación antes de producción»).
10. **Captura de `category` en la solicitud.** **Resuelta, decisión del usuario (2026-11-11).** `species.category` existe (DBR-004: `VARCHAR(30)` NULL, lista cerrada `mammal`, `bird`, `reptile`, `amphibian`, `fish`, `invertebrate`). Decisión: la solicitud de especie captura `category` (`species_requests.category`, selector en la PWA con la lista cerrada). TulanPedia filtra por tipo de animal (`web-011` CA-22) y las especies aceptadas cuentan en las misiones de mobile (`category_species_count`). **Por confirmar:** que el campo sea obligatorio (si no, la especie aceptada puede quedar con `category` NULL) y que `category` se publique siempre (no es desmarcable). Los campos extra de la ficha siguen abiertos en `docs/adr/0028-dynamic-tulanpedia-catalog.md` y en `api-014` pregunta 3.

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
