# Plan técnico · 014 · species-requests

- Spec: `apps/api/specs/014-species-requests.md`
- Estado de spec: Aprobada (2026-11-12, Jonathan, responsable de backend). Aprobar no autoriza implementar.
- Estado del plan: **Borrador (2026-11-12)**. Pendiente de aprobación técnica del equipo y del Constitution Check (sección «Constitution Check»). No se programa hasta aprobarlo.
- Responsable técnico: `Jonathan (responsable de backend), por confirmar en el PR`.
- Tasks: `apps/api/tasks/014-species-requests.md`.
- Bloqueo de implementación: **DBR-013 en «Lista para backend»** (migración `2026_11_12_000013_species_publication_requests_schema` aplicada en `arca_pruebas` con evidencia). Desde el 2026-11-12 esa condición se cumple: la migración está aplicada en `arca_pruebas` (lote 5), verificada por consulta de solo lectura. Quedan pendientes de BD los EXPLAIN y el registro de la fecha y del responsable de la aplicación. Sigue bloqueando P2 (`api-013`).

## Precondiciones y bloqueos

Antes de la primera tarea de código (T-03 en adelante) deben cumplirse todas. La tarea T-01 las verifica en solo lectura.

| # | Precondición | Responsable | Estado el 2026-11-12 | Evidencia requerida |
|---|---|---|---|---|
| P1 | Migración DBR-013 aplicada en `arca_pruebas` y DBR-013 en «Lista para backend» | BD (Víctor Adrián) | Cumplida el 2026-11-12: migración aplicada en `arca_pruebas` (lote 5), verificada por consulta de solo lectura. Pendiente de BD: EXPLAIN y registro de fecha y responsable de la aplicación | `php artisan migrate:status` (solo lectura) con la migración en estado «Ran» y tabla `species_publication_requests` existente |
| P2 | Disco `media` definido (`config/filesystems.php`) y `.env` `PUBLIC_MEDIA_DISK=media` | Backend, según `api-013` | Pendiente. Hoy solo existe el disco `public`; `api-013` está Aprobada (2026-11-12; D-01/D-02), pero el disco aún no está configurado | `api-013` aprobada y configuración del disco revisada en el PR |
| P3 | ADR 0026: riesgos (a), (b), (c), (g) y (m) confirmados por el equipo | Equipo | Cumplida. Confirmados por Jonathan (responsable de backend) el 2026-11-12, válido para pruebas; revisar antes de producción | Registro de confirmación en el ADR o en el PR |
| P4 | Plan y tasks aprobados | Equipo / responsable de backend | Pendiente | Firma del plan y de tasks en el PR |
| P5 | Brecha de Constitución V (`BaseModel`) resuelta o registrada como excepción | Equipo | Pendiente. Ver «Constitution Check», fila V | Acuerdo del equipo, o ADR, registrado en el PR |

Nota de dependencia: la tarea «Species con SoftDeletes» no puede ser precondición porque es trabajo de backend (DBR-013, decisión 13; RN-22). Se implementa en T-03 y se verifica en sus tests.

## Diseño de solución

La API es la única autoridad de estados, elegibilidad, tipo de envío, correcciones, publicación, fotos y auditoría (RN-05). Los controladores solo validan la forma de la petición (Form Requests), llaman a una Action y devuelven un Resource (`apps/api/AGENTS.md`).

Capas:

```
cliente (PWA / dashboard, fuera de esta spec)
  → ruta nombrada + middleware (auth:sanctum, staff.user, administrator.two-factor, permission:species.review | rol veterinarian)
  → Form Request (forma, longitudes, listas cerradas, mensajes en español)
  → Controller delgado
  → Action (transacción, bloqueos, reglas de estado, fotos, auditoría)
      → Models (Species, SpeciesPublicationRequest; SoftDeletes)
      → Storage disk `media` (copia, borrado tras commit)
  → API Resource (sin URL de fotos en administración; `origin` desde species.distribution)
```

### Orden de bloqueos (anti-interbloqueo)

Toda Action que cambia una solicitud o una especie adquiere los bloqueos en este orden fijo:

1. Fila de `species` (`lockForUpdate`).
2. Fila de `species_publication_requests` de esa especie o de la solicitud (`lockForUpdate`).

Dentro del bloqueo se vuelve a comprobar el estado (CA-19, CA-41). Así dos operaciones concurrentes sobre la misma especie se serializan y nunca se bloquean en orden inverso.

### Estado de publicación derivado (RN-18)

No hay columna de estado. Un servicio de Action (`DeriveSpeciesPublicationStatusAction`) calcula el estado con la prioridad `pending` > `published` > `unpublished` > `not_published`, a partir de `species.is_published`, `species.unpublished_at` y de la existencia de una solicitud `submitted` no eliminada de esa especie. Se evalúa siempre dentro del bloqueo de la especie.

| `publication_status` | Condición | `next_request_type` |
|---|---|---|
| `pending` | Existe solicitud `submitted` (no eliminada) | `null` |
| `published` | `is_published = 1` | `update` |
| `unpublished` | `is_published = 0` y `unpublished_at` no nulo | `update` |
| `not_published` | Resto | `publish` |

Las especies con `deleted_at` no existen para esta spec (RN-22): el selector, el listado de publicadas y las Actions las excluyen con el scope de SoftDeletes.

### Fotos (RN-04, ADR 0026)

- Disco `media` (pendiente P2). Carpetas: `species-requests/` (pendientes) y `species/` (públicas).
- Nombre generado: `<uuid>.<ext>`, con `ext = jpg` para `image/jpeg` y `png` para `image/png`. Nunca se usa el nombre original ni rutas del cliente.
- Escritura de la foto pendiente antes de abrir la transacción (CA-02, CA-23). Si la transacción falla, la copia nueva se borra.
- Aceptar: la copia a `species/` se hace dentro de la transacción (mismo nombre); el borrado de la original y de la foto publicada anterior se hace **solo después del commit** (CA-08, CA-39). Si la transacción falla antes del commit, se borra la copia nueva.
- Borrado seguro: `DeleteManagedSpeciesImageAction` solo borra rutas que cumplen `^species(-requests)?/[0-9a-f-]{36}\.(jpg|png)$`. Cualquier otra ruta se ignora y se registra como aviso técnico.
- Si el borrado falla tras el commit, la respuesta sigue siendo `200` y se registra un aviso técnico sin ruta en Activitylog (CA-39). El reintento es manual en pruebas (G3).

### Transacciones por operación

| Operación (CA) | Bloqueos | Dentro de la transacción | Después del commit |
|---|---|---|---|
| Enviar (CA-01, CA-27, CA-28, CA-34) | especie | Comprueba `pending`, elegibilidad y tipo; crea fila `submitted`; guarda NULL en correcciones sin cambio (CA-30); escribe Activitylog | Nada (la foto pendiente ya está guardada; si falla, se borra) |
| Editar solicitud (CA-15 a CA-18, CA-22, CA-23, CA-25) | especie, solicitud | Comprueba `submitted`; aplica valores trimados; si cambia algún valor, escribe Activitylog con anterior y nuevo | Borra la foto anterior reemplazada (CA-23) |
| Rechazar (CA-10, CA-11) | especie, solicitud | Comprueba `submitted`; pasa a `rejected`; `reviewed_by`, `reviewed_at`, `image_path` NULL | Borra la foto pendiente |
| Aceptar (CA-08, CA-25, CA-32) | especie, solicitud | Aplica correcciones y `category` efectivo; `origin` → `species.distribution`; `published_fields`; con publicación, `is_published = 1`, `unpublished_at = NULL`, `published_at = now`; copia foto; solicitud `accepted`; Activitylog | Borra original pendiente y foto publicada anterior (si se reemplazó) |
| Aceptar sin publicar (CA-08) | especie, solicitud | Igual, sin tocar `is_published`, `unpublished_at` ni `published_at` | Igual |
| Editar ficha despublicada (CA-37) | especie | Comprueba `unpublished`; aplica cambios; foto nueva directa a `species/`; Activitylog | Borra la foto pública anterior |
| Despublicar (CA-35) | especie | Comprueba `published`; `is_published = 0`, `unpublished_at = now`; Activitylog | Nada |
| Republicar (CA-36) | especie, solicitud | Comprueba `unpublished`, sin `submitted`, `image_path` y `published_fields` no NULL; `is_published = 1`, `unpublished_at = NULL`, `published_at = now`; Activitylog | Nada |
| Eliminar publicación (CA-38) | especie, solicitudes | Comprueba `published` o `unpublished`; pasa `submitted` a `rejected` (motivo fijo, `reviewed_by`, `reviewed_at`); marca `deleted_at` en todas las solicitudes; `is_published = 0`, `published_at`, `unpublished_at`, `image_path`, `published_fields` NULL; Activitylog con identificadores | Borra foto pública y fotos pendientes de las solicitudes eliminadas |

Antes de confirmar la transacción de «Eliminar publicación», la lista de rutas de fotos se captura en memoria para poder borrarlas después del commit.

## Cambios por área

| Área/app | Archivos o módulos previstos (ruta prevista, no existe aún) | Propósito |
|---|---|---|
| API / modelos | `apps/api/src/app/Models/Species.php` (modificar), `apps/api/src/app/Models/SpeciesPublicationRequest.php` (nuevo) | SoftDeletes sobre `Model` (decisión F), casts, relaciones, `fillable` explícito en la solicitud |
| API / enums | `apps/api/src/app/Enums/SpeciesCategory.php`, `PublishedSpeciesField.php`, `PublicationStatus.php`, `SpeciesRequestType.php`, `SpeciesRequestStatus.php` (nuevos) | Listas cerradas: DBR-004 (seis valores), claves de RN-13, estados y tipos |
| API / Actions compartidas | `apps/api/src/app/Actions/SpeciesPublication/DeriveSpeciesPublicationStatusAction.php`, `…/Media/StoreSpeciesImageAction.php`, `…/Media/CopySpeciesImageAction.php`, `…/Media/DeleteManagedSpeciesImageAction.php`, `…/Audit/LogSpeciesPublicationAction.php` (nuevos) | Estado derivado, fotos, borrado seguro, auditoría (reutiliza el patrón de `Actions/Admin/LogAdminActivityAction.php`, log `admin`) |
| API / Actions veterinario | `apps/api/src/app/Actions/Veterinarian/SpeciesPublication/ListSelectableSpeciesAction.php`, `SubmitSpeciesPublicationRequestAction.php`, `ListOwnSpeciesPublicationRequestsAction.php` (nuevos) | Selector, envío y «Mis solicitudes» |
| API / Actions dirección | `apps/api/src/app/Actions/Admin/SpeciesPublication/` (nuevos): `ListSpeciesPublicationRequestsAction`, `ShowSpeciesPublicationRequestAction`, `UpdateSpeciesPublicationRequestAction`, `AcceptSpeciesPublicationRequestAction`, `RejectSpeciesPublicationRequestAction`, `ListPublishedSpeciesAction`, `ShowSpeciesPublicationAction`, `UpdateUnpublishedSpeciesAction`, `UnpublishSpeciesAction`, `RepublishSpeciesAction`, `DeleteSpeciesPublicationAction` | Una Action por operación de CA-05 a CA-41 |
| API / Form Requests | `apps/api/src/app/Http/Requests/Veterinarian/StoreSpeciesPublicationRequest.php`, `…/Admin/UpdateSpeciesPublicationRequest.php`, `…/Admin/AcceptSpeciesPublicationRequest.php`, `…/Admin/RejectSpeciesPublicationRequest.php`, `…/Admin/UpdateSpeciesPublicationDetailRequest.php`, `…/Admin/ListSpeciesPublicationRequestsRequest.php`, `…/Admin/ListPublishedSpeciesRequest.php` (nuevos) | Validación de forma con mensajes en español (patrón de `api-008`: mensajes en la propia Request) |
| API / Controllers | `apps/api/src/app/Http/Controllers/Veterinarian/SpeciesController.php`, `…/Veterinarian/SpeciesPublicationRequestController.php`, `…/Admin/SpeciesPublicationRequestController.php`, `…/Admin/SpeciesPublicationRequestImageController.php`, `…/Admin/PublishedSpeciesController.php`, `…/Admin/SpeciesPublicationController.php`, `…/Admin/SpeciesImageController.php` (nuevos) | HTTP delgado: entrada → Action → Resource |
| API / Resources | `apps/api/src/app/Http/Resources/Veterinarian/SelectableSpeciesResource.php`, `…/Veterinarian/OwnSpeciesPublicationRequestResource.php`, `…/Admin/SpeciesPublicationRequestResource.php` (lista), `…/Admin/SpeciesPublicationRequestDetailResource.php`, `…/Admin/PublishedSpeciesResource.php`, `…/Admin/SpeciesPublicationDetailResource.php` (nuevos) | Formas de respuesta de CA-05, CA-06, CA-26, CA-33, CA-37, CA-40 |
| API / rutas | `apps/api/src/routes/api.php` (modificar: grupo `veterinarian` y grupo `admin` con `permission:species.review`) | Rutas nombradas de esta spec (ver «Contrato y datos») |
| API / autorización | `apps/api/src/bootstrap/app.php` (modificar, si se aprueba la decisión D-R4: alias `role` de Spatie) | Regla de rol `veterinarian` (`pwa-005` RN-01) |
| API / seeder | `apps/api/src/database/seeders/RolesAndPermissionsSeeder.php` (modificar) | T-SEED: `species.review` y `memories.review`, asignados solo a `zoo-admin` y excluidos de `admin` |
| API / pruebas | `apps/api/src/tests/Feature/SpeciesPublication/*.php` (nuevos), `apps/api/src/tests/Feature/Staff/SeedersTest.php` (ampliar, CA-20) | Un test por CA (ver «Mapeo de criterios a pruebas») |
| API / documentación | `apps/api/docs/` (sección nueva de publicación de especies), `infra/README.md` (checklist) | Operación y referencia local |
| Paquetes | Ninguno en esta spec | `packages/api-client` (métodos y tipos) se implementa en las specs consumidoras (`pwa-005`, `dashboard-010`); ver pregunta Q7 |
| Datos | Ninguno. La migración DBR-013 ya existe; no se crea otra (decisión del usuario 2026-11-12) | — |

## Contrato y datos

### Endpoints y rutas nombradas

Los nombres marcados con `(propuesto)` no están fijados en la spec; siguen la convención de `routes/api.php` (`<grupo>.<recurso>.<acción>`) y se confirman en el PR (pregunta Q5).

| Método y ruta | Nombre de ruta | Middleware y permiso | CA | Respuesta |
|---|---|---|---|---|
| `GET /api/v1/veterinarian/species` | `veterinarian.species.index` (propuesto) | `auth:sanctum`, `staff.user`, rol `veterinarian` | CA-26 | 200 `data` sin paginar |
| `POST /api/v1/veterinarian/species-publication-requests` | `veterinarian.species-publication-requests.store` (propuesto) | igual | CA-01, CA-02, CA-03, CA-04 | 201 (multipart) |
| `GET /api/v1/veterinarian/species-publication-requests` | `veterinarian.species-publication-requests.index` | igual | CA-33 | 200 paginado de 10 |
| `GET /api/v1/admin/species-publication-requests` | `admin.species-publication-requests.index` (propuesto) | `admin` + 2FA + `permission:species.review` | CA-05 | 200 paginado de 10 |
| `GET /api/v1/admin/species-publication-requests/{id}` | `admin.species-publication-requests.show` (propuesto) | igual | CA-06 | 200 |
| `GET /api/v1/admin/species-publication-requests/{id}/image` | `admin.species-publication-requests.image` | igual | RN-08 | 200 binario o 404 |
| `PATCH /api/v1/admin/species-publication-requests/{id}` | `admin.species-publication-requests.update` (propuesto) | igual | CA-14 a CA-18, CA-22, CA-23, CA-25 | 200 (JSON) o `POST` + `_method=PATCH` (multipart) |
| `POST /api/v1/admin/species-publication-requests/{id}/accept` | `admin.species-publication-requests.accept` (propuesto) | igual | CA-08, CA-09 | 200 con detalle de publicación |
| `POST /api/v1/admin/species-publication-requests/{id}/reject` | `admin.species-publication-requests.reject` (propuesto) | igual | CA-09, CA-10, CA-11 | 200 |
| `GET /api/v1/admin/published-species` | `admin.published-species.index` | igual | CA-40 | 200 paginado de 10 |
| `GET /api/v1/admin/species/{id}/image` | `admin.species.image` | igual | CA-40, RN-08 | 200 binario o 404 |
| `GET /api/v1/admin/species/{id}/publication` | `admin.species.publication.show` | igual | CA-37 | 200 |
| `PATCH /api/v1/admin/species/{id}/publication` | `admin.species.publication.update` | igual | CA-37 | 200 (JSON) o `POST` + `_method=PATCH` (multipart) |
| `DELETE /api/v1/admin/species/{id}/publication` | `admin.species.publication.destroy` | igual | CA-38 | 200 |
| `POST /api/v1/admin/species/{id}/unpublish` | `admin.species.unpublish` | igual | CA-35 | 200 |
| `POST /api/v1/admin/species/{id}/republish` | `admin.species.republish` | igual | CA-36 | 200 |

Notas de contrato:

- El grupo `admin` ya existe con `->name('admin.')` y `administrator.two-factor` (`routes/api.php`). Esta spec añade un subgrupo con `permission:species.review`, como hace el grupo `users.manage` y `news.manage` del mismo archivo.
- Los identificadores `{id}` deben ser numéricos (`whereNumber`). La respuesta `404` con el mensaje «Solicitud no encontrada.» o «Especie no encontrada.» se produce en la Action (búsqueda explícita sin SoftDeletes), no por el binding implícito de Laravel, porque el mensaje del binding no es el de la spec.
- **Subida con archivo:** PHP no interpreta multipart en `PATCH`. Cuando la petición lleva archivo, el cliente envía `POST` con `_method=PATCH` (decisión G1). Laravel resuelve el `_method` de formularios en `POST` y enruta a la ruta `PATCH`; esta suposición se confirma con una prueba de integración (CA-23, CA-37). La ruta `PATCH` sin archivo sigue funcionando en JSON.

### Validación (Form Requests)

| Petición | Reglas | Mensajes (español) |
|---|---|---|
| Envío (`StoreSpeciesPublicationRequest`) | `species_id`: requerido, entero, existe en `species` sin `deleted_at`. `scientific_name`, `habitat`, `origin`: opcionales, cadena, máximo 150. `category`: requerido, en la lista DBR-004. `published_fields`: opcional, cadena JSON de array de claves de RN-13 sin duplicados (se deduplican). `image`: requerido solo si `request_type = publish`; `image`, `mimes:jpg,jpeg,png`, `max:5120`. Claves no permitidas (`common_name`, `species`, `category` en `published_fields`, `image` en `published_fields`) | «Elige una especie.», «La especie no existe.», «Nombre científico: máximo 150 caracteres.», «Hábitat: máximo 150 caracteres.», «Origen: máximo 150 caracteres.», «Tipo de animal requerido.», «Tipo de animal no válido.», «Elige una foto para la primera publicación.», «No se pudo procesar la foto. Intenta con otro archivo.», «Campo no permitido: common_name.» (o `species`), «Campo no permitido en la ficha pública: {clave}.», «La selección de campos públicos no es válida.» |
| Edición (`UpdateSpeciesPublicationRequest`) | Todos opcionales (`sometimes`); si llega, `filled` salvo `published_fields`. Mismas reglas de longitud y lista. `category` vacío responde «Tipo de animal requerido.». Sin ningún campo editable en el cuerpo: «Nada que guardar.». Campo no editable (`common_name`, `species_id`, `status`, `created_by`, …): «Campo no editable: {campo}.». Foto opcional, misma regla | Los de la fila anterior, más «Campo no editable: {campo}.» y «Nada que guardar.» |
| Acción `accept` (`AcceptSpeciesPublicationRequest`) | `publish`: opcional, booleano; por defecto `true` | «Indica si se publica o no.» |
| Rechazo (`RejectSpeciesPublicationRequest`) | `rejection_reason`: requerido, cadena, 1 a 500 caracteres | «Motivo requerido (1-500 caracteres).» |
| Edición de especie despublicada (`UpdateSpeciesPublicationDetailRequest`) | Como la edición, sin `common_name` (CA-37) | «Campo no editable: common_name.», «Tipo de animal requerido.», «Nada que guardar.» |
| Listado de solicitudes (`ListSpeciesPublicationRequestsRequest`) | `status`: opcional, `submitted`, `accepted`, `rejected` o vacío; `page` entero | — |
| Listado de publicadas (`ListPublishedSpeciesRequest`) | `status`: opcional, `published`, `unpublished` o vacío; `category`: opcional, DBR-004 o vacío | «Tipo de animal no válido.» |

Regla de tamaño de subida: 5 MB (5120 KB). El despliegue necesita `upload_max_filesize` y `post_max_size` mayores (ver `infra/README.md`, T-28).

### Actions, Resources y Policies

- No se usan Policies: la autorización es de middleware (`permission:species.review`, rol `veterinarian`), como en el resto de la API.
- Resources sin URL de fotos en administración (CA-06, CA-40). Solo el veterinario ve `rejection_reason` completo (máx. 500) y `last_rejection_reason` (CA-26, CA-33).
- `origin` se lee y escribe en `species.distribution` (DBR-013 2a=A). La API expone la clave `origin`.
- Respuestas paginadas: `simplePaginate(10)`, con `meta.has_more = $paginator->hasMorePages()`, ordenadas como indica CA-05, CA-33 y CA-40.

### Modelos

- **`Species`** (`apps/api/src/app/Models/Species.php`): añadir `SoftDeletes` (sobre `Model`, decisión F). Casts: `is_published` (boolean), `published_at` y `unpublished_at` (datetime), `published_fields` (array). `$timestamps = false` se mantiene (la tabla no tiene `created_at`/`updated_at`). `$guarded = []` hoy: **no se cambia a `$fillable` sin revisar antes `AnimalController::store`** (que usa `firstOrCreate`, `pwa-004`). Mientras tanto, las Actions asignan atributos explícitos y ningún dato de una Request se asigna en bloque.
- **`SpeciesPublicationRequest`** (nuevo): tabla `species_publication_requests`; `SoftDeletes` sobre `Model`; `$fillable` explícito sin `id`, `status` (lo fija solo la Action), `submitted_species_id` (columna generada: escribirla rompe la inserción) ni `deleted_at`. Casts: `published_fields` (array), `reviewed_at` (datetime). Relaciones: `species()` (belongsTo, `species_id`), `creator()`, `reviewer()` (belongsTo `User`). `created_by`, `updated_by` y `reviewed_by` según `apps/api/AGENTS.md`.
- Sin `BaseModel`: no existe en `apps/api/src` (ver Constitution Check, fila V).

### Datos (DBR-013, sin migración nueva)

- Tabla `species_publication_requests` y columnas de `species` (`is_published`, `published_at`, `unpublished_at`, `image_path`, `published_fields`, `deleted_at`), índices y columna generada `submitted_species_id` con índice único `uq_species_publication_requests_submitted_species`. Todo viene de `2026_11_12_000013_species_publication_requests_schema.php`.
- Esta spec no crea migraciones. Cualquier cambio de esquema pasa por DBR (`docs/database/`).

### Errores y compatibilidad

- Formato de error: el de la API (`message` + `errors.<campo>` para `422`).
- `401` sin sesión; `403` sin rol o permiso; `404` solicitud o especie no encontrada (incluye solicitudes eliminadas); `422` validación y reglas de estado; `500` solo ante fallos no previstos (nunca por la violación de unicidad, CA-34).
- Compatibilidad: `api-006` (`GET /api/v1/species`) y `api-005` no se modifican. Añadir `SoftDeletes` a `Species` hace que el scope global excluya filas con `deleted_at`. Ninguna operación de esta spec pone `deleted_at` en `species`, pero `Animal::species` y las consultas de `api-006` se prueban (ver «Riesgos»).

## Seguridad, offline y operación

- **Mínimo privilegio.** Veterinario: solo su rol, solo sus solicitudes (`created_by`). Dirección: `species.review` + 2FA. `admin`, `executive`, `cashier` no reciben el permiso (T-SEED, CA-20).
- **Sin URLs de foto en administración** (CA-06, CA-40); la foto se sirve por ruta autenticada (RN-08). En pruebas, `media/` se publica por `/media` (riesgo aceptado en ADR 0026, riesgo m).
- **Validación de archivo.** Tipo y tamaño en servidor, regla `image` más `mimes:jpg,jpeg,png` (la regla `image` sola admite GIF, WebP, BMP y SVG, que la spec excluye). Sin SVG, sin PDF. Un archivo que no se lee como imagen responde `422`.
- **Nombres.** Generados; sin rutas enviadas por el cliente. Borrado restringido por expresión regular (ver «Fotos»).
- **Datos sensibles.** Las solicitudes no contienen datos personales de visitantes. `veterinarian_name` solo sale en administración (CA-05, CA-06).
- **Auditoría.** Activitylog (log `admin`) en cada operación de RN-12, con actor, fechas y valores anteriores y nuevos en las ediciones. Nunca binario ni ruta absoluta (CA-12 de `api-008`, mismo criterio).
- **Limitación de tasa.** La spec no define límites de tasa para estas rutas; no se añaden.
- **Secretos.** Ninguno. La configuración del disco va por `.env`.
- **Offline.** No aplica: la API está en línea. Los borradores offline de la PWA quedan fuera de esta spec (`pwa-005`).
- **Observabilidad.** Avisos técnicos del borrado de archivos en el log de la aplicación, sin binario ni ruta en las respuestas.
- **Portabilidad (ADR 0013, MySQL 8.0.x).** Columna generada `IF(status = 'submitted', species_id, NULL)` almacenada y índice único: sin funciones propietarias ni triggers. La detección de la violación compara `errorInfo[1] = 1062` y el nombre del índice en el mensaje (MySQL 8.0). Configuración por `.env`; compatible con Aiven y MySQL local.
- **Despliegue.** Checklist de `infra/README.md` ampliado en T-28: seeder de permisos con `--class`, carpetas `media/species` y `media/species-requests`, límites de subida y `storage:link` del disco `media`.

## Mapeo de criterios a pruebas

Convención: PHPUnit, `apps/api/src/tests/Feature/SpeciesPublication/`, clase que extiende `FeatureTestCase` (`DatabaseTransactions`) y `InteractsWithArcaPruebas` (falla si `DB_DATABASE` no es `arca_pruebas`). Prohibido `RefreshDatabase` y cualquier migración desde tests. Fotos con `Storage::fake('media')`. Las imágenes válidas son fixtures binarios pequeños en `tests/Fixtures/`; `UploadedFile::fake()->image()` requiere `ext-gd`, que se confirma en T-01 (riesgo R8).

Los nombres son los de la spec. Cuando la spec no fija nombre (CA-19, CA-23, CA-39), el nombre es propuesto (pregunta Q6).

| Criterio | Prueba automatizada (nombre) | Archivo previsto | Tarea |
|---|---|---|---|
| CA-01 | `test_ca01_veterinarian_submits_publication_request` | `SubmitSpeciesRequestTest.php` | T-11 |
| CA-02 | `test_ca02_submit_stores_photo_and_keeps_species_unchanged` | `SubmitSpeciesRequestTest.php` | T-11 |
| CA-03 | `test_ca03_submit_returns_422_messages_in_spanish` | `SubmitSpeciesRequestValidationTest.php` | T-10 |
| CA-04 | `test_ca04_photo_rules_jpeg_png_5mb_required_only_for_publish` | `SubmitSpeciesRequestValidationTest.php` | T-10 |
| CA-05 | `test_ca05_admin_lists_requests_paginated_without_photo` | `AdminSpeciesRequestsReadTest.php` | T-14 |
| CA-06 | `test_ca06_detail_shows_current_and_proposed_without_photo_url` (incluye la descarga binaria de la foto pendiente, RN-08) | `AdminSpeciesRequestsReadTest.php` | T-14 |
| CA-07 | `test_ca07_admin_routes_return_403_without_permission` | `SpeciesPublicationAccessTest.php` | T-08 |
| CA-08 | `test_ca08_accept_publishes_existing_species_copies_confirms_and_deletes_original`; `test_ca08_accept_returns_200_when_original_delete_fails`; `test_ca08_accept_unpublished_without_publishing_keeps_unpublished`; `test_ca08_publish_param_rules`; `test_ca08_origin_is_written_to_distribution` | `AcceptSpeciesRequestTest.php`, `AcceptUnpublishedSpeciesTest.php` | T-18, T-19 |
| CA-09 | `test_ca09_late_decision_returns_422` | `RejectSpeciesRequestTest.php` | T-17 |
| CA-10 | `test_ca10_reject_deletes_photo_and_keeps_species_unchanged` | `RejectSpeciesRequestTest.php` | T-17 |
| CA-11 | `test_ca11_reject_requires_reason_1_to_500` | `RejectSpeciesRequestTest.php` | T-17 |
| CA-12 | `test_ca12_session_and_role_errors` | `SpeciesPublicationAccessTest.php` | T-08 |
| CA-13 | `SpeciesPublicationCoverageTest` (busca `CA-01` a `CA-41` en `tests/Feature/SpeciesPublication/` y en `tests/Feature/Staff/SeedersTest.php`; verifica `DB_DATABASE=arca_pruebas`) | `SpeciesPublicationCoverageTest.php` | T-27 |
| CA-14 | `test_ca14_patch_request_only_for_review_permission` | `UpdateSpeciesRequestTest.php` | T-15 |
| CA-15 | `test_ca15_patch_saves_trimmed_values_and_keeps_status` | `UpdateSpeciesRequestTest.php` | T-15 |
| CA-16 | `test_ca16_patch_validation_in_spanish` | `UpdateSpeciesRequestTest.php` | T-15 |
| CA-17 | `test_ca17_patch_only_when_submitted` | `UpdateSpeciesRequestTest.php` | T-15 |
| CA-18 | `test_ca18_edit_audit_only_when_values_change` | `UpdateSpeciesRequestAuditTest.php` | T-16 |
| CA-19 | `test_ca19_edit_and_decision_sequential_rules` (propuesto) | `SpeciesPublicationConcurrencyTest.php` | T-25 |
| CA-20 | `test_ca20_species_review_only_zoo_admin` | `tests/Feature/Staff/SeedersTest.php` | T-07 |
| CA-21 | `test_ca21_published_fields_validation` | `SubmitSpeciesRequestValidationTest.php` | T-10 |
| CA-22 | `test_ca22_patch_replaces_published_fields` | `UpdateSpeciesRequestAuditTest.php` | T-16 |
| CA-23 | `test_ca23_patch_replaces_photo_and_deletes_previous_after_commit`; `test_ca23_failed_transaction_removes_new_photo_keeps_previous` (propuestos) | `UpdateSpeciesRequestPhotoTest.php` | T-16 |
| CA-24 | `test_ca24_request_never_creates_or_deletes_species_rows` | `SpeciesPublicationInvariantsTest.php` | T-11 (submit), T-26 (todas) |
| CA-25 | `test_ca25_store_requires_category`; `test_ca25_store_rejects_category_outside_closed_list` (T-10); `test_ca25_update_replaces_category_and_audits_change`; `test_ca25_update_rejects_empty_or_unknown_category` (T-15); `test_ca25_accept_writes_effective_category_to_species` (T-18) | varios | T-10, T-15, T-18 |
| CA-26 | `test_ca26_veterinarian_lists_species_with_publication_status`; `test_ca26_last_rejection_reason_full_text` | `VeterinarianSelectorTest.php` | T-09 |
| CA-27 | `test_ca27_eligibility_by_publication_status` | `SubmitSpeciesRequestTest.php` | T-11 |
| CA-28 | `test_ca28_rejected_species_accepts_new_publish_request` | `SubmitSpeciesRequestTest.php` | T-11 |
| CA-29 | `test_ca29_submit_rejects_common_name_and_creates_no_species` | `SubmitSpeciesRequestValidationTest.php` | T-10 |
| CA-30 | `test_ca30_unchanged_or_empty_correction_is_stored_as_null` | `SubmitSpeciesRequestTest.php` | T-11 |
| CA-31 | `test_ca31_publication_columns_change_only_in_publication_actions` | `SpeciesPublicationInvariantsTest.php` | T-26 |
| CA-32 | `test_ca32_update_keeps_published_version_until_accept` (T-11); `test_ca32_update_accept_replaces_data_and_keeps_species_listed`, `test_ca32_update_without_photo_keeps_current_image` (T-18); `test_ca32_unpublished_update_stays_hidden_until_publish_accept` (T-19) | varios | T-11, T-18, T-19 |
| CA-33 | `test_ca33_veterinarian_lists_only_own_requests`; `test_ca33_rejection_reason_full_up_to_500_not_truncated`; `test_ca33_hides_requests_of_deleted_publication` | `VeterinarianRequestsListTest.php` | T-13 |
| CA-34 | `test_ca34_only_one_live_request_per_species`; `test_ca34_db_unique_violation_maps_to_422_and_removes_new_photo` | `SubmitSpeciesRequestConcurrencyTest.php` | T-12 |
| CA-35 | `test_ca35_unpublish_hides_species_without_deleting_data` | `SpeciesPublicationManagementTest.php` | T-21 |
| CA-36 | `test_ca36_republish_without_new_request_and_guards` | `SpeciesPublicationManagementTest.php` | T-21 |
| CA-37 | `test_ca37_edit_unpublished_species_without_publishing`; `test_ca37_new_photo_saved_in_species_folder_and_old_deleted_after_commit` | `SpeciesUnpublishedEditTest.php` | T-22 |
| CA-38 | `test_ca38_delete_publication_keeps_species_row_and_soft_deletes_requests`; `test_ca38_submitted_requests_are_rejected_then_soft_deleted_and_new_request_is_allowed` | `SpeciesDeletePublicationTest.php` | T-23 |
| CA-39 | `test_ca39_files_removed_only_after_commit` | `SpeciesImageFilesTest.php` | T-24 |
| CA-40 | `test_ca40_admin_lists_published_and_unpublished_species_and_serves_image` | `AdminPublishedSpeciesTest.php` | T-20 |
| CA-41 | `test_ca41_publication_actions_recheck_state_inside_lock` | `SpeciesPublicationConcurrencyTest.php` | T-25 |

Nota: las pruebas de la misma CA sobre `api-015` (lectura pública, CA-17 y CA-18 de esa spec) pertenecen a la spec `api-015`. En esta spec, CA-32 verifica la fila de `species` y la respuesta de la API de administración; no prueba `GET /api/v1/published-species`.

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | Sin dependencias nuevas (regla `image`, `mimes`, `max` y `Storage` de Laravel; Spatie y Activitylog ya instalados). Sin servicios propietarios; disco configurable por `.env` (api-013). Requiere `fileinfo` en PHP 8.4 (sin paquete). Sin ADR de dependencia |
| II. La spec manda | Parcial, condicionado | Spec Aprobada (2026-11-12) con este plan y `tasks/014-species-requests.md` del mismo NNN-slug. **Pendiente:** aprobación del plan y de tasks (P4). Ningún código antes de P1 y P2 |
| III. Lógica separada de la interfaz | Sí (propuesto) | Reglas, transacciones, fotos y auditoría en Actions. Controladores delgados. Form Requests solo validan forma. Los clientes (PWA, dashboard) quedan fuera de esta spec |
| IV. Un test por criterio | Sí (propuesto) | Tabla de «Mapeo de criterios a pruebas»: CA-01 a CA-41 con al menos un test nombrado; `SpeciesPublicationCoverageTest` (CA-13). **Brecha menor:** CA-19, CA-23 y CA-39 no traen nombre de test en la spec (nombres propuestos, Q6). CA-41 se verifica de forma secuencial; no hay prueba de concurrencia real (R5). CI en verde: pendiente de evidencia |
| V. Una sola fuente de verdad para los datos | **No, brecha abierta** | (1) Migración DBR-013 aplicada en `arca_pruebas` (lote 5, verificada el 2026-11-12; P1 cumplida). (2) Constitución V pide que los modelos de negocio extiendan `BaseModel`. `BaseModel` no existe; `Species` y `SpeciesPublicationRequest` usan `SoftDeletes` sobre `Model` por la decisión F (válida para pruebas; revisar antes de producción). **Excepción propuesta:** decisión F, registrada aquí; requiere acuerdo del equipo o ADR antes de mergear a `main` (regla de la Constitución: un PR que viole un principio no se mergea). Se resuelve con `api-010` pregunta 1 (P5). (3) No se borra ninguna fila física: las solicitudes eliminadas tienen `deleted_at`; `species` nunca se borra. Los archivos sí se borran (no son datos clínicos ni financieros) |
| VI. Código en inglés, personas en español | Sí | Clases, rutas, columnas y permisos en inglés. Mensajes de validación, respuestas y textos de Activitylog en español (CA-03, CA-16, CA-37). Las etiquetas de Activitylog se dejan en español como las de `api-008` |

Ninguna excepción se implementa sin acuerdo. La fila V bloquea el merge hasta resolverse.

## Riesgos y decisiones

### Decisiones propuestas por el plan (pendientes de confirmación)

- **D-R1 Bloqueo por orden fijo.** Especie antes que solicitud (sección «Orden de bloqueos»).
- **D-R2 Fotos antes de la transacción en el envío y en las ediciones; copia dentro de la transacción en la aceptación.** Así un fallo nunca deja una foto publicada sin registro en la base, y un fallo tras el commit solo deja un archivo huérfano.
- **D-R3 Borrado por expresión regular.** Solo rutas `species/` y `species-requests/` con nombre UUID.
- **D-R4 Rol `veterinarian`.** Propuesta: registrar el alias `role` de Spatie en `bootstrap/app.php` (hoy solo existen `permission` y `administrator.two-factor`). Alternativa: un middleware propio de comprobación de rol. Pregunta Q4.
- **D-R5 `$fillable` en `SpeciesPublicationRequest`** (explícito) y en `Species` solo después de revisar `AnimalController::store`.
- **D-R6 Nombres de rutas** marcados como propuestos (Q5).

### Riesgos

- **R1 Violación de unicidad mal traducida** (CA-34): sin la captura de 1062 la respuesta sería `500`. Mitigación: captura en `SubmitSpeciesPublicationRequestAction`, mapeo a `422`, prueba dedicada.
- **R2 Solicitud eliminada que sigue ocupando el índice** (CA-38, decisión A): mitigado en aplicación (las `submitted` pasan a `rejected` antes de eliminarse). Riesgo residual: una fila eliminada fuera de la Action. Sin cambio de migración.
- **R3 Columna generada y Eloquent:** escribir `submitted_species_id` falla. Mitigación: fuera de `$fillable`; prueba de inserción.
- **R4 Scope de SoftDeletes en `Species`:** afecta a `api-006` (`GET /api/v1/species`), `api-005` y `Animal::species` (un animal cuya especie esté borrada devolvería `null`). No hay borrados de `species` en esta spec, pero se prueba que `api-006` sigue igual (regresión en T-03) y se anota en `apps/api/docs/`.
- **R5 Concurrencia no probada en paralelo.** Las pruebas de CA-19 y CA-41 son secuenciales (la spec lo fija). Un test de concurrencia real requiere procesos paralelos sobre `arca_pruebas`; queda fuera de v1 y se anota como deuda.
- **R6 Multipart en `PATCH`** (G1): `POST` + `_method=PATCH` en peticiones con archivo. Riesgo: un cliente que envíe multipart a `PATCH` pierde el archivo sin error visible. Mitigación: prueba de integración y nota en el cliente (`packages/api-client`).
- **R7 Archivos huérfanos** (CA-08, G3): reintento manual. Sin mecanismo automático en esta spec.
- **R8 Fixtures de imagen y `ext-gd`:** `UploadedFile::fake()->image()` depende de GD. Mitigación: fixtures binarios pequeños o confirmación de `ext-gd` en T-01.
- **R9 Versionado en git** de `apps/api/src/media/species/` y `species-requests/`. `infra/README.md` indica versionar `media/` para noticias, eventos y momentos. Decisión pendiente (Q3). Las fotos pendientes no deberían quedar en el historial sin decisión.
- **R10 Riesgos de privacidad y publicación de `media/`** (ADR 0026, riesgo m; spec «Recomendación antes de producción»). Aceptados solo para pruebas con datos de prueba.
- **R11 Dependencia de `memories.review`** en T-SEED: el permiso pertenece a `api-010` (Aprobada 2026-11-12). La spec pide incluirlo en el mismo cambio del seeder. Si `api-010` no se implementa, el permiso queda creado sin uso. Pregunta Q8.
- **R12 Lock y transacciones en MySQL 8.0 con Aiven:** `lockForUpdate` estándar; sin `SKIP LOCKED`. Riesgo de espera en la misma especie: aceptable para la carga de un zoológico.
- **R13 Efecto en la app móvil:** publicar cambia la fila de `species` que lee `api-006`. Decisión registrada en la spec (RN-21, riesgos). Sin cambio de código de mobile.
- **R14 Datos de prueba existentes en `arca_pruebas` (verificado 2026-11-12):** `arca_pruebas` ya contiene 5 filas de prueba en `species_publication_requests` y 6 en `species` (0 publicadas). Se conservan a propósito (decisión del usuario 2026-11-12). Los tests no deben asumir tablas vacías: usan fixtures propios, no modifican las filas existentes y limpian solo lo que crean dentro de `DatabaseTransactions`. Ojo con el índice único `uq_species_publication_requests_submitted_species`: si una fila existente está `submitted` para una especie, un test que cree otra solicitud `submitted` para esa especie fallará (1062); en ese caso el fixture debe usar otra especie.

### ADR

- ADR requerido para v1: ninguno nuevo. Riesgos del ADR 0026 confirmados por Jonathan el 2026-11-12 (P3 cumplida, válido para pruebas). La excepción de la Constitución V (fila V) requiere acuerdo del equipo o ADR (P5).

### Alternativas consideradas

- Crear la especie al aceptar: descartado por la spec (CA-24, CA-29).
- Guardar la foto pendiente en la base de datos: no aplica (ADR 0026, sin binario en MySQL).
- Índice único parcial: MySQL 8.0 no lo tiene; se usa la columna generada (DBR-013, 14).
- Almacenamiento de objetos: fuera de alcance (ADR 0026, `docs/propuestas/almacenamiento-objetos-s3.md`).

## Orden y aprobación

### Secuencia de implementación

Ver la lista ordenada de tareas en `apps/api/tasks/014-species-requests.md`. Resumen:

1. Bloqueo: P2 (`api-013`) antes de cualquier código; P1 (BD) cumplida el 2026-11-12. T-01 verifica solo lectura.
2. Base: modelos, enums, almacenamiento de fotos y T-SEED (T-03 a T-07).
3. Rutas, autorización y lectura del veterinario (T-08 a T-13).
4. Revisión de la Dirección: listado, edición, rechazo, aceptación (T-14 a T-19).
5. Publicación gestionada: publicadas, despublicar, republicar, editar despublicada, eliminar (T-20 a T-23).
6. Cierre transversal: archivos, concurrencia, invariantes, cobertura (T-24 a T-27).
7. Documentación, verificación y entrega (T-28, T-29).

### Aprobaciones

| Rol | Quién | Estado |
|---|---|---|
| Responsable funcional de la spec | Jonathan (aprobación de la spec, 2026-11-12) | Aprobada |
| Responsable técnico del plan | Jonathan (responsable de backend), por confirmar | Pendiente |
| Equipo (solución técnica y Constitution Check) | Equipo | Pendiente (P4, P5) |
| Responsable de BD (migración DBR-013 en `arca_pruebas`) | Víctor Adrián | Cumplida (P1, 2026-11-12); EXPLAIN y registro de fecha y responsable pendientes |
| Confirmación de riesgos ADR 0026 (a), (b), (c), (g), (m) | Equipo | Cumplida (P3): confirmado por Jonathan, 2026-11-12, válido para pruebas |
| Dependencia `api-013` (disco `media`) | Responsable de la spec `api-013` | Pendiente (P2) |

Evidencias requeridas al cerrar el plan: salida de `php artisan migrate:status` (solo lectura), enlace a la aprobación de `api-013`, confirmación de ADR 0026 y enlace al PR con spec, plan y tasks.
