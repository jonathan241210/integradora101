# DBR-012 · visitor-memories

- Estado: Lista para backend (Aplicada en `arca_pruebas`, 2026-11-11)
- Feature/spec origen: `apps/api/specs/010-visitor-memory-requests.md` (peticiones de visitantes, corrección y reenvío, vigencia y borrado de cuenta). Consumidor de lectura: `apps/api/specs/012-public-memories-read.md`. Clientes: `apps/mobile/specs/010-visitor-memory-requests.md`, `apps/dashboard/specs/008-memory-moderation.md`, `apps/web/specs/010-dynamic-memories.md`. Almacenamiento: `apps/api/specs/013-object-storage-images.md`. Borrado de cuenta (divergencia pendiente): `apps/api/specs/004-visitor-authentication.md`.
- Solicitante: Aksel (borrador original del 2026-11-05). Respuestas del responsable: Jonathan (2026-11-10).
- Responsable de BD: Víctor Adrián
- Responsable backend: Jonathan
- Fecha de la última revisión: 2026-11-11

## Problema y justificación

Los visitantes con cuenta verificada podrán enviar desde la app móvil una imagen y, opcionalmente, una opinión corta. El zoológico (`zoo-admin`) las revisa en el dashboard, y las aceptadas se publican en la galería del portal durante un plazo. Si una petición se rechaza, el visitante puede corregirla y reenviarla. Hace falta una tabla que guarde cada petición con su estado, su consentimiento, sus motivos de rechazo, sus reenvíos, su revisión y su vigencia de publicación, y una tabla de historial de revisiones. Hoy no existe nada de eso.

## Estado actual

No existe. No hay tabla `visitor_memories` ni `visitor_memory_reviews`, ni columnas de revisión, ni publicación de imágenes de visitantes. El permiso `memories.review` tampoco existe; se añade como dato del seeder, no como esquema (ver «Elementos afectados»).

## Contrato solicitado

Dos tablas nuevas:
- `visitor_memories`: una fila por petición (una imagen y, opcionalmente, una opinión), con su estado actual.
- `visitor_memory_reviews`: historial append-only de las decisiones de revisión (aceptar o rechazar), con sus motivos y campos.

Las reglas de valores, transiciones, límites y vigencia las aplica la API (`api-010`, `api-012`); la base de datos guarda y protege la integridad.

### Tabla `visitor_memories`

| Columna | Tipo propuesto | Nulabilidad | Default | Descripción y notas |
|---|---|---|---|---|
| `id` | BIGINT UNSIGNED AUTO_INCREMENT | NOT NULL | — | Clave primaria, como las demás tablas creadas por migraciones. Las FK a `visitors`/`users` usan `INT` firmado para empatar con las tablas legado. |
| `visitor_id` | INT | NULL | — | Visitante que envió la petición. FK a `visitors.id` con `ON DELETE SET NULL`. Pasa a NULL al borrar la cuenta, con la elección `keep` o `delete` (`api-010` RN-22, CA-32). Mientras la cuenta existe, no es NULL en la práctica. |
| `status` | VARCHAR(20) | NOT NULL | `'submitted'` | Valores: `submitted`, `in_review`, `accepted`, `rejected` (`api-010` RN-01). Validación en la aplicación; un CHECK es opcional, a criterio de BD. VARCHAR en vez de ENUM para facilitar cambios de valor y la portabilidad entre Aiven y local. |
| `opinion` | VARCHAR(300) | NULL | — | Texto plano de hasta 300 caracteres (en utf8mb4, VARCHAR cuenta caracteres). **Opcional (decisión 2026-11-11):** el visitante puede subir solo el recuerdo, sin opinión; si la envía, 1 a 300 caracteres. |
| `image_path` | VARCHAR(255) | NULL | — | Ruta relativa al disco de medios, `memories/<uuid>.(jpg\|jpeg\|png\|webp)` (nombre generado por la API). El disco es `media` (carpeta local `apps/api/src/media/`, `api-013` D-01 y D-02), sin S3 ni servicio externo por ahora. Pasa a NULL si el rechazo incluye `image` (`api-010` CA-29). |
| `image_sha256` | CHAR(64) | NULL | — | Hash SHA-256 del archivo ya sin metadatos. Se conserva aunque el archivo se borre, para que un reenvío por `image` exija una foto distinta (`api-010` CA-27). |
| `published_image_path` | VARCHAR(255) | NULL | — | Ruta relativa en el disco público. Se llena solo al aceptar, con el mismo valor que `image_path` (sin copia; `api-013` CA-11). Una rechazada nunca tiene valor aquí. |
| `consent_at` | TIMESTAMP | NOT NULL | — | Momento del último consentimiento. Se actualiza en cada envío y reenvío (`api-010` RN-08). |
| `terms_version` | VARCHAR(20) | NOT NULL | — | Versión de los términos aceptados con ese consentimiento (`MEMORIES_TERMS_VERSION`, `api-010` RN-23). Permite demostrar qué se aceptó. |
| `rejection_reason` | VARCHAR(500) | NULL | — | Motivo de la última decisión de rechazo (`api-010` RN-04). Solo tiene valor si `status` es `rejected`. Pasa a NULL al reenviar. |
| `rejected_image` | TINYINT(1) | NOT NULL | 0 | Marca del último rechazo: 1 si falló la foto (`api-010` RN-20). Solo puede ser 1 si `status = 'rejected'`; se limpia a 0 al reenviar. |
| `rejected_content` | TINYINT(1) | NOT NULL | 0 | Marca del último rechazo: 1 si falló la opinión (`api-010` RN-20). Solo puede ser 1 si `status = 'rejected'`; se limpia a 0 al reenviar. |
| `resubmitted_count` | INT | NOT NULL | 0 | Número de reenvíos de la misma petición (`api-010` RN-19). |
| `reviewed_by` | INT | NULL | — | Personal de la última decisión. FK a `users.id`. NULL mientras no haya decisión. |
| `reviewed_at` | TIMESTAMP | NULL | — | Momento de la última decisión (aceptar o rechazar). |
| `published_at` | TIMESTAMP | NULL | — | Momento de la aceptación. Se llena al aceptar. Base del orden público (`api-012` RN-03). |
| `published_until` | TIMESTAMP | NULL | — | Fin del plazo de publicación: `published_at` más `MEMORIES_PUBLICATION_DAYS` días (`api-010` RN-21). Se llena al aceptar y no cambia después. Es visible mientras sea posterior a ahora (`api-012` RN-03). |
| `created_at` | TIMESTAMP | NULL | — | Fecha de envío de la petición. Base de la ventana semanal de envíos (`api-010` RN-17). No cambia en los reenvíos. |
| `updated_at` | TIMESTAMP | NULL | — | Última modificación. |
| `deleted_at` | TIMESTAMP | NULL | — | Borrado lógico (SoftDeletes, Constitución V). Se usa en el borrado de cuenta con `delete` (`api-010` CA-32). |

La API sigue exponiendo `rejected_fields` como lista (`["image"]`, `["content"]` o ambos); el Resource la construye a partir de `rejected_image` y `rejected_content` (decisión BD 2026-11-11, sin cambiar el contrato de la API).

### Tabla `visitor_memory_reviews`

Historial de decisiones de revisión. Cada aceptación o rechazo crea una fila. No se actualiza ni se borra físicamente.

| Columna | Tipo propuesto | Nulabilidad | Default | Descripción y notas |
|---|---|---|---|---|
| `id` | BIGINT UNSIGNED AUTO_INCREMENT | NOT NULL | — | Clave primaria, como las demás tablas creadas por migraciones. |
| `visitor_memory_id` | BIGINT UNSIGNED | NOT NULL | — | Petición revisada. FK a `visitor_memories.id`. Sin borrado físico, la FK es RESTRICT. |
| `decision` | VARCHAR(20) | NOT NULL | — | Valores: `accepted`, `rejected` (`api-010` CA-11, CA-12). |
| `rejection_reason` | VARCHAR(500) | NULL | — | Motivo; solo con `decision = 'rejected'`. |
| `rejected_image` | TINYINT(1) | NOT NULL | 0 | 1 si la decisión rechazó la foto (`api-010` RN-20). |
| `rejected_content` | TINYINT(1) | NOT NULL | 0 | 1 si la decisión rechazó la opinión (`api-010` RN-20). |
| `reviewed_by` | INT | NOT NULL | — | Personal que decidió. FK a `users.id`. |
| `reviewed_at` | TIMESTAMP | NOT NULL | — | Momento de la decisión. |
| `created_at` | TIMESTAMP | NULL | — | Igual que `reviewed_at` en la práctica; se mantiene por convención de `BaseModel`. |
| `updated_at` | TIMESTAMP | NULL | — | Convención de `BaseModel`. No cambia tras crearse. |
| `deleted_at` | TIMESTAMP | NULL | — | SoftDeletes (Constitución V). |

## Elementos afectados

| Tipo | Nombre | Cambio |
|---|---|---|
| tabla | `visitor_memories` | Crear con las columnas de la tabla anterior. |
| tabla | `visitor_memory_reviews` | Crear con las columnas de la tabla anterior. |
| índice | `visitor_memories(status, published_until, published_at, id)` | Crear. Sirve al listado público de `api-012` (visibilidad por estado y vigencia, y orden). |
| índice | `visitor_memories(status, created_at)` | Crear. Sirve a la lista de revisión de `api-010` (filtro por estado y orden). |
| índice | `visitor_memories(visitor_id, created_at)` | Crear. Sirve al límite semanal de envíos (`api-010` CA-23). |
| índice | `visitor_memories(visitor_id, status)` | Crear. Sirve a la comprobación de petición abierta (`api-010` CA-24). |
| índice | `visitor_memory_reviews(visitor_memory_id, reviewed_at)` | Crear. Sirve a la consulta del historial de una petición. |
| clave foránea | `visitor_memories.visitor_id` → `visitors.id` | Crear con `ON DELETE SET NULL`. Permite que `api-004` borre la cuenta físicamente sin romper la FK (`api-010` CA-32). |
| clave foránea | `visitor_memories.reviewed_by` → `users.id` | Crear. |
| clave foránea | `visitor_memory_reviews.visitor_memory_id` → `visitor_memories.id` | Crear, RESTRICT (no hay borrado físico). |
| clave foránea | `visitor_memory_reviews.reviewed_by` → `users.id` | Crear. |
| dato (no esquema) | `permissions`: `memories.review`, y su asignación solo a `zoo-admin` en `role_has_permissions` | No es migración. Lo crea y lo asigna `RolesAndPermissionsSeeder` (`api-010` CA-16 y RN-07). Hay que excluirlo explícitamente de `admin`, porque el seeder da a `admin` todos los permisos salvo `tickets.create` y `tickets.cancel`. BD lo confirma en la revisión. |
| configuración (no esquema) | `MEMORIES_PUBLICATION_DAYS` (90 propuesto), `MEMORIES_TERMS_VERSION` | No es migración ni tabla. Se configuran por `.env` (`api-010` RN-21 y RN-23). |

Índices y claves: la migración usa nombres explícitos y cortos: índices `idx_visitor_memories_status_publication`, `idx_visitor_memories_status_created`, `idx_visitor_memories_visitor_created`, `idx_visitor_memories_visitor_status` y `idx_visitor_memory_reviews_memory_reviewed`; claves foráneas `fk_visitor_memories_visitor_id`, `fk_visitor_memories_reviewed_by`, `fk_visitor_memory_reviews_visitor_memory_id` y `fk_visitor_memory_reviews_reviewed_by`. La FK de `reviewed_by` a `users.id` queda en RESTRICT (los usuarios se borran lógicamente).

## SQL de referencia (MySQL 8.0)

No se incluye SQL, ni de referencia, por decisión del solicitante. El contrato se expresa en las tablas de esta DBR. El responsable de BD redacta la migración Laravel tras aprobar la DBR, la prueba en MySQL 8.0 aislado y documenta la evidencia.

## Datos existentes y migración de datos

Tablas nuevas. No hay datos previos, no hay backfill y no hay cambios a tablas existentes. El permiso `memories.review` se crea con el seeder, no con migración de datos.

## Privacidad, auditoría y retención

- **Clasificación:** personal. Contiene imágenes de personas (incluidos menores), opinión escrita por el visitante, consentimiento, versión de términos y motivos de rechazo. No es clínico ni financiero.
- **SoftDeletes:** la columna `deleted_at` cumple la Constitución V en ambas tablas. La aplicación no borra filas físicamente (`api-010` CA-20). Los archivos sí se borran del almacenamiento en los casos de `api-010` CA-27, CA-29 y CA-32.
- **Borrado de cuenta (P4):** al borrar la cuenta, el visitante elige:
  - `keep`: `visitor_id` pasa a NULL. Se conservan la imagen, la opinión, el estado, el consentimiento y el historial. Las aceptadas siguen publicadas hasta su vencimiento.
  - `delete`: `visitor_id` pasa a NULL y `deleted_at` se llena. Los archivos se borran del almacenamiento.

  En ambos casos `api-004` borra la cuenta sin romper la FK, porque `visitor_id` tiene `ON DELETE SET NULL`. El cambio en `api-004` está pendiente (divergencia).
- **Retención:**
  - El archivo rechazado por `image` se borra al rechazar; `image_path` queda en NULL y `image_sha256` se conserva.
  - El archivo rechazado solo por `content` se conserva para la corrección.
  - El archivo que sustituye a otro en un reenvío reemplaza al anterior, que se borra.
  - Al vencer la publicación, la fila y el archivo se conservan (`api-010` Pregunta 3, resuelta el 2026-11-11).
  - La retención definitiva de datos personales queda pendiente de la decisión del equipo.
- **Auditoría:** `reviewed_by` y `reviewed_at` guardan la última decisión. `visitor_memory_reviews` guarda cada decisión con su motivo y sus campos. Activitylog registra cada revisión, cada reenvío y la elección de borrado de cuenta (`api-010` CA-19, CA-32).
- **Creador:** el creador es `visitor_id`, que apunta a `visitors` y no a `users`. Los reenvíos no cambian el creador. No se agregan `created_by`/`updated_by`: el actor de la revisión queda en `reviewed_by` y en `visitor_memory_reviews` (decisión BD 2026-11-11).
- **Imágenes:** la base guarda solo rutas relativas y el hash. Los archivos viven en el disco de medios (`apps/api/src/media/`, versionado en git y solo con datos de prueba; `api-013` CA-22). **Almacenamiento actual (2026-11-11):** carpeta local del proyecto, sin S3 ni servicio en la nube. La opción S3/cloud queda para cuando el cliente la solicite; Jonathan la documentará entonces (`docs/propuestas/almacenamiento-objetos-s3.md`, ADR 0026 Propuesto).

## Impacto, rendimiento y reversión

- Tablas nuevas, vacías al inicio. No bloquean tablas existentes.
- Los cinco índices cubren las consultas de las specs. El volumen esperado es bajo; se revisa en operación.
- Reversión en `down()`: eliminar las tablas solo en un ambiente sin peticiones registradas. Si ya hay datos, BD decide la reversión y no borra filas sin respaldo.
- Respaldo previo recomendado antes de aplicar en cualquier ambiente.

## Compatibilidad MySQL 8.0

- Tipos estándar (BIGINT UNSIGNED, INT, VARCHAR, CHAR, TINYINT, TIMESTAMP) y claves foráneas, incluida `ON DELETE SET NULL` en InnoDB. Sin extensiones propietarias.
- `rejected_image`/`rejected_content` usan `TINYINT(1)`; la API sigue exponiendo la lista `rejected_fields`.
- Charset utf8mb4 y collation `utf8mb4_unicode_ci`, la misma de las tablas creadas por migraciones (default de `config/database.php`); la migración no fija otra.
- Revisión mínima de MySQL 8.0.x: pendiente del inventario inicial.

## Objeto almacenado (si aplica)

No aplica. No hay funciones, procedimientos, vistas ni triggers. Las reglas de estado, de límites y de vigencia viven en Actions de la API.

## Orden de despliegue

1. Aprobada el 2026-11-11 por Víctor Adrián (responsable de BD) y Jonathan (responsable backend; firma registrada por Víctor Adrián en su representación).
2. Migración creada y aplicada en `arca_pruebas` el 2026-11-11 sin errores: `apps/api/src/database/migrations/2026_11_11_000012_visitor_memories_schema.php`.
3. Aplicación registrada en `arca_pruebas` (tabla de abajo). Evidencia: confirmación del responsable de BD de que la migración se ejecutó sin errores.
4. Estado «Lista para backend» alcanzado. Backend implementa `api-010` (incluido el seeder de `memories.review`) cuando Aksel firme la spec, y `api-012`.
5. Staging y producción, después, con su propio registro. Los agentes no usan `arca_zoo`.
6. Requisito previo: DBR-001 (nombres en inglés) y DBR-003 (`visitors`) aplicadas en el ambiente.

## Pruebas y evidencia

- Migración creada y aplicada en `arca_pruebas` el 2026-11-11 sin errores: `apps/api/src/database/migrations/2026_11_11_000012_visitor_memories_schema.php`.
- Pruebas de esquema ejecutadas por BD en MySQL 8.0 aislado: no registradas en este cambio; la aplicación en `arca_pruebas` fue confirmada por el responsable de BD.
- Comprobaciones sugeridas para BD:
  - FK a `visitors` (con `ON DELETE SET NULL`), `users` y `visitor_memories`; un borrado de `visitors` deja `visitor_id` en NULL sin error;
  - valores de `status` y de `decision`;
  - `opinion` NULL aceptada (opcional); 300 caracteres aceptada y 301 rechazada por la aplicación;
  - `published_at`, `published_until` y `published_image_path` en NULL en las filas no aceptadas;
  - `rejection_reason` en NULL y `rejected_image`/`rejected_content` en 0 salvo en `rejected`; al reenviar vuelven a 0;
  - `resubmitted_count` con valor 0 por defecto.
- Resultado y evidencia (sin secretos ni datos sensibles): migración aplicada en `arca_pruebas` el 2026-11-11, confirmada por el responsable de BD. El `down()` no se ejecutó porque eliminaría las tablas; solo procede en un ambiente sin datos.
- Pruebas integradas del backend: `api-010` CA-22 y `api-012` CA-11 (PHPUnit contra `arca_pruebas`, con `DatabaseTransactions`, sin `RefreshDatabase`).

## Aprobaciones

| Rol | Nombre | Fecha | Resultado |
|---|---|---|---|
| Responsable de BD | Víctor Adrián | 2026-11-11 | Aprobada |
| Responsable backend | Jonathan | 2026-11-11 | Aprobada (firmada por Víctor Adrián en su representación, indicación del 2026-11-11) |

Aprobado por: Víctor Adrián (BD) y Jonathan (backend, firmado por Víctor Adrián en su representación). Esta línea no sustituye las aprobaciones separadas de BD y backend (`docs/database/requests/README.md`, regla 4).

> **Recordatorio de firmas:** toda retroalimentación de un ADR, spec o DBR se firma en el propio documento en el momento de darla; no se acepta aprobar de palabra ni dejar la firma para después, porque se olvida. Quien solicita la retroalimentación pide la firma en ese mismo acto.

## Aplicación por ambiente

| Ambiente | Estado | Fecha | Evidencia |
|---|---|---|---|
| desarrollo/pruebas (`arca_pruebas`) | Aplicada | 2026-11-11 | Migración `2026_11_11_000012_visitor_memories_schema` ejecutada sin errores; confirmado por el responsable de BD |
| staging | pendiente | | |
| producción | pendiente | | |
