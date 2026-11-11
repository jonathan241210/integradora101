# DBR-012 · visitor-memories

- Estado: Borrador (sin aprobar; no existe migración ni SQL ejecutable)
- Feature/spec origen: `apps/api/specs/010-visitor-memory-requests.md` (peticiones de visitantes, corrección y reenvío, vigencia y borrado de cuenta). Consumidor de lectura: `apps/api/specs/012-public-memories-read.md`. Clientes: `apps/mobile/specs/010-visitor-memory-requests.md`, `apps/dashboard/specs/008-memory-moderation.md`, `apps/web/specs/010-dynamic-memories.md`. Almacenamiento: `apps/api/specs/013-object-storage-images.md`. Borrado de cuenta (divergencia pendiente): `apps/api/specs/004-visitor-authentication.md`.
- Solicitante: Aksel (borrador original del 2026-11-05). Respuestas del responsable: Jonathan (2026-11-10).
- Responsable de BD: por definir
- Responsable backend: por definir
- Fecha de la última revisión: 2026-11-10

## Problema y justificación

Los visitantes con cuenta verificada podrán enviar desde la app móvil una imagen y una opinión corta. El zoológico (`zoo-admin`) las revisa en el dashboard, y las aceptadas se publican en la galería del portal durante un plazo. Si una petición se rechaza, el visitante puede corregirla y reenviarla. Hace falta una tabla que guarde cada petición con su estado, su consentimiento, sus motivos de rechazo, sus reenvíos, su revisión y su vigencia de publicación, y una tabla de historial de revisiones. Hoy no existe nada de eso.

## Estado actual

No existe. No hay tabla `visitor_memories` ni `visitor_memory_reviews`, ni columnas de revisión, ni publicación de imágenes de visitantes. El permiso `memories.review` tampoco existe; se añade como dato del seeder, no como esquema (ver «Elementos afectados»).

## Contrato solicitado

Dos tablas nuevas:
- `visitor_memories`: una fila por petición (una imagen y una opinión), con su estado actual.
- `visitor_memory_reviews`: historial append-only de las decisiones de revisión (aceptar o rechazar), con sus motivos y campos.

Las reglas de valores, transiciones, límites y vigencia las aplica la API (`api-010`, `api-012`); la base de datos guarda y protege la integridad.

### Tabla `visitor_memories`

| Columna | Tipo propuesto | Nulabilidad | Default | Descripción y notas |
|---|---|---|---|---|
| `id` | INT AUTO_INCREMENT | NOT NULL | — | Clave primaria. Igual que `visitors.id` y `users.id` (INT). |
| `visitor_id` | INT | NULL | — | Visitante que envió la petición. FK a `visitors.id` con `ON DELETE SET NULL`. Pasa a NULL al borrar la cuenta, con la elección `keep` o `delete` (`api-010` RN-22, CA-32). Mientras la cuenta existe, no es NULL en la práctica. |
| `status` | VARCHAR(20) | NOT NULL | `'submitted'` | Valores: `submitted`, `in_review`, `accepted`, `rejected` (`api-010` RN-01). Validación en la aplicación; un CHECK es opcional, a criterio de BD. VARCHAR en vez de ENUM para facilitar cambios de valor y la portabilidad entre Aiven y local. |
| `opinion` | VARCHAR(300) | NOT NULL | — | Texto plano de hasta 300 caracteres (en utf8mb4, VARCHAR cuenta caracteres). Obligatoriedad pendiente (`api-010` pregunta 7). |
| `image_path` | VARCHAR(255) | NULL | — | Ruta relativa al disco de medios, `memories/<uuid>.(jpg\|jpeg\|png\|webp)` (nombre generado por la API). El disco es `media` (carpeta `apps/api/src/media/`, `api-013` D-01 y D-02). Pasa a NULL si el rechazo incluye `image` (`api-010` CA-29). |
| `image_sha256` | CHAR(64) | NULL | — | Hash SHA-256 del archivo ya sin metadatos. Se conserva aunque el archivo se borre, para que un reenvío por `image` exija una foto distinta (`api-010` CA-27). |
| `published_image_path` | VARCHAR(255) | NULL | — | Ruta relativa en el disco público. Se llena solo al aceptar, con el mismo valor que `image_path` (sin copia; `api-013` CA-11). Una rechazada nunca tiene valor aquí. |
| `consent_at` | TIMESTAMP | NOT NULL | — | Momento del último consentimiento. Se actualiza en cada envío y reenvío (`api-010` RN-08). |
| `terms_version` | VARCHAR(20) | NOT NULL | — | Versión de los términos aceptados con ese consentimiento (`MEMORIES_TERMS_VERSION`, `api-010` RN-23). Permite demostrar qué se aceptó. |
| `rejection_reason` | VARCHAR(500) | NULL | — | Motivo de la última decisión de rechazo (`api-010` RN-04). Solo tiene valor si `status` es `rejected`. Pasa a NULL al reenviar. |
| `rejected_fields` | JSON | NULL | — | Lista de `image` y/o `content` del último rechazo (`api-010` RN-20). Solo tiene valor si `status` es `rejected`. Pasa a NULL al reenviar. Si BD prefiere evitar JSON, puede usar dos columnas booleanas (`rejected_image`, `rejected_content`) sin cambiar el contrato de la API. |
| `resubmitted_count` | INT | NOT NULL | 0 | Número de reenvíos de la misma petición (`api-010` RN-19). |
| `reviewed_by` | INT | NULL | — | Personal de la última decisión. FK a `users.id`. NULL mientras no haya decisión. |
| `reviewed_at` | TIMESTAMP | NULL | — | Momento de la última decisión (aceptar o rechazar). |
| `published_at` | TIMESTAMP | NULL | — | Momento de la aceptación. Se llena al aceptar. Base del orden público (`api-012` RN-03). |
| `published_until` | TIMESTAMP | NULL | — | Fin del plazo de publicación: `published_at` más `MEMORIES_PUBLICATION_DAYS` días (`api-010` RN-21). Se llena al aceptar y no cambia después. Es visible mientras sea posterior a ahora (`api-012` RN-03). |
| `created_at` | TIMESTAMP | NULL | — | Fecha de envío de la petición. Base de la ventana semanal de envíos (`api-010` RN-17). No cambia en los reenvíos. |
| `updated_at` | TIMESTAMP | NULL | — | Última modificación. |
| `deleted_at` | TIMESTAMP | NULL | — | Borrado lógico (SoftDeletes, Constitución V). Se usa en el borrado de cuenta con `delete` (`api-010` CA-32). |

### Tabla `visitor_memory_reviews`

Historial de decisiones de revisión. Cada aceptación o rechazo crea una fila. No se actualiza ni se borra físicamente.

| Columna | Tipo propuesto | Nulabilidad | Default | Descripción y notas |
|---|---|---|---|---|
| `id` | INT AUTO_INCREMENT | NOT NULL | — | Clave primaria. |
| `visitor_memory_id` | INT | NOT NULL | — | Petición revisada. FK a `visitor_memories.id`. Sin borrado físico, la FK es RESTRICT. |
| `decision` | VARCHAR(20) | NOT NULL | — | Valores: `accepted`, `rejected` (`api-010` CA-11, CA-12). |
| `rejection_reason` | VARCHAR(500) | NULL | — | Motivo; solo con `decision = 'rejected'`. |
| `rejected_fields` | JSON | NULL | — | Campos marcados; solo con `decision = 'rejected'`. Mismo formato que en `visitor_memories`. |
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

Índices y claves: los nombres definitivos y el índice automático de `visitor_id` los fija BD en la migración.

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
  - Al vencer la publicación, la fila y el archivo se conservan (`api-010` pregunta 3).
  - La retención definitiva de datos personales queda pendiente de la decisión del equipo.
- **Auditoría:** `reviewed_by` y `reviewed_at` guardan la última decisión. `visitor_memory_reviews` guarda cada decisión con su motivo y sus campos. Activitylog registra cada revisión, cada reenvío y la elección de borrado de cuenta (`api-010` CA-19, CA-32).
- **Creador:** el creador es `visitor_id`, que apunta a `visitors` y no a `users`. Los reenvíos no cambian el creador. `created_by` y `updated_by` quedan pendientes: backend decide si necesita esas columnas (`BaseModel` las exige si el modelo lo requiere, `apps/api/AGENTS.md`).
- **Imágenes:** la base guarda solo rutas relativas y el hash. Los archivos viven en el disco de medios (`apps/api/src/media/`, versionado en git y solo con datos de prueba; `api-013` CA-22).

## Impacto, rendimiento y reversión

- Tablas nuevas, vacías al inicio. No bloquean tablas existentes.
- Los cinco índices cubren las consultas de las specs. El volumen esperado es bajo; se revisa en operación.
- Reversión en `down()`: eliminar las tablas solo en un ambiente sin peticiones registradas. Si ya hay datos, BD decide la reversión y no borra filas sin respaldo.
- Respaldo previo recomendado antes de aplicar en cualquier ambiente.

## Compatibilidad MySQL 8.0

- Tipos estándar (INT, VARCHAR, CHAR, TIMESTAMP) y claves foráneas, incluida `ON DELETE SET NULL` en InnoDB. Sin extensiones propietarias.
- `JSON` es un tipo nativo de MySQL 8.0. Si BD prefiere evitarlo, se usan dos columnas booleanas (ver `rejected_fields`).
- Charset utf8mb4 y collation a confirmar con el inventario de la instancia (`docs/database/README.md`).
- Revisión mínima de MySQL 8.0.x: pendiente del inventario inicial.

## Objeto almacenado (si aplica)

No aplica. No hay funciones, procedimientos, vistas ni triggers. Las reglas de estado, de límites y de vigencia viven en Actions de la API.

## Orden de despliegue

1. Aprobación de esta DBR por el responsable de BD y el responsable de backend.
2. El responsable de BD crea la migración Laravel, la prueba en MySQL 8.0 aislado y registra la evidencia.
3. Aplicación en `arca_pruebas` y registro de la fecha en la tabla de ambientes.
4. Estado «Lista para backend». Solo entonces backend implementa `api-010` (incluido el seeder de `memories.review`) y `api-012`.
5. Staging y producción, después, con su propio registro. Los agentes no usan `arca_zoo`.
6. Requisito previo: DBR-001 (nombres en inglés) y DBR-003 (`visitors`) aplicadas en el ambiente.

## Pruebas y evidencia

- Pruebas de esquema ejecutadas por BD en MySQL 8.0 aislado: pendiente.
- Comprobaciones sugeridas para BD:
  - FK a `visitors` (con `ON DELETE SET NULL`), `users` y `visitor_memories`; un borrado de `visitors` deja `visitor_id` en NULL sin error;
  - valores de `status` y de `decision`;
  - `opinion` de 300 caracteres aceptada y 301 rechazada por la aplicación;
  - `published_at`, `published_until` y `published_image_path` en NULL en las filas no aceptadas;
  - `rejection_reason` y `rejected_fields` en NULL salvo en `rejected`;
  - `resubmitted_count` con valor 0 por defecto.
- Resultado y evidencia (sin secretos ni datos sensibles): pendiente.
- Pruebas integradas del backend: `api-010` CA-22 y `api-012` CA-11 (PHPUnit contra `arca_pruebas`, con `DatabaseTransactions`, sin `RefreshDatabase`).

## Aprobaciones

| Rol | Nombre | Fecha | Resultado |
|---|---|---|---|
| Responsable de BD | por definir | | |
| Responsable backend | por definir | | |

Aprobado por: (pendiente, nombre del compañero). Esta línea no sustituye las aprobaciones separadas de BD y backend (`docs/database/requests/README.md`, regla 4).

## Aplicación por ambiente

| Ambiente | Estado | Fecha | Evidencia |
|---|---|---|---|
| desarrollo/pruebas (`arca_pruebas`) | pendiente | | |
| staging | pendiente | | |
| producción | pendiente | | |
