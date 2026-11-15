# Plan técnico · 010 · visitor-memory-requests

- Spec: `apps/api/specs/010-visitor-memory-requests.md` (Aprobada, 2026-11-12, Jonathan, responsable de backend). Aprobar la spec no autoriza implementar.
- Estado: **Aprobado** (Jonathan, responsable de backend, 2026-11-13). Implementación pendiente de iniciar; coordinación en `docs/trabajo-paralelo-momentos-especies.md`.
  - Aviso vigente: las precondiciones que sigan «Pendiente» en la tabla bloquean sus tareas. La excepción de la Constitución V (D-M1: SoftDeletes sobre `Model`, sin `BaseModel`) quedó aceptada el 2026-11-13 por Jonathan, en nombre del equipo. La excepción de imágenes de momentos versionadas en git (ADR 0026) quedó aceptada el mismo día solo para datos de prueba en `arca_pruebas`; revisar antes de producción. El mapeo CA→fase quedó aprobado el 2026-11-13.
- Tasks: `apps/api/tasks/010-visitor-memory-requests.md` (Aprobado, Jonathan, 2026-11-13).
- Responsable técnico: Jonathan (responsable de backend). Aprobación del 2026-11-13 en nombre del equipo.
- Base de datos: DBR-012 (`docs/database/requests/DBR-012-visitor-memories.md`), Lista para backend, aplicada en `arca_pruebas` el 2026-11-11. Este plan no crea DBR ni migraciones. Si el diseño necesita una columna o un índice nuevo, se abre DBR antes.
- Mapeo de criterios a fases: **aprobado** el 2026-11-13 tal como se propuso (sección «Fases y mapeo CA→fase»). La spec no lo fija.
- Consumidores: `dashboard-008` y `web-010` (Fase 1, a través de `api-012`); `mobile-010` (Fase 2, en Borrador).

## Precondiciones y bloqueos

Antes de la primera tarea de código de cada fase deben cumplirse las precondiciones de esa fase. T-01 las verifica en solo lectura.

| # | Precondición | Responsable | Estado el 2026-11-12 | Bloquea | Evidencia requerida |
|---|---|---|---|---|---|
| P1 | DBR-012 aplicada en `arca_pruebas` (migración `2026_11_11_000012_visitor_memories_schema`) | BD (Víctor Adrián) | Cumplida el 2026-11-11 (confirmada por BD) | Todo el código | `php artisan migrate:status` en solo lectura con la migración en «Ran» |
| P2 | `api-013` con plan y tasks aprobados, y disco de medios configurado (`media`, claves de `PUBLIC_MEDIA_DISK`/`PRIVATE_MEDIA_DISK`, `storage:link`, `.gitignore` de `media/`) | Backend (Jonathan) | **Parcial.** Plan y tasks de `api-013` aprobados el 2026-11-13 (Jonathan). **Pendiente:** el disco de medios aún no está en `config/filesystems.php` | T-10, T-12, T-14, T-19 (y el envío) | Plan y tasks de `api-013` aprobados; `config/filesystems.php` con la clave de medios; `storage:link` ejecutado en `arca_pruebas` |
| P3 | `memories.review` en `RolesAndPermissionsSeeder`, compartido con `api-014` T-07 | Backend | **Cumplida (2026-11-13).** Lo modifica `api-014` T-07 (añade `species.review` y `memories.review`). `api-010` no edita el seeder; solo añade su test | T-06 y T-07 | Un único cambio al seeder, en `api-014` T-07. Ver «Riesgos» R8 |
| P4 | Plan y tasks de esta spec aprobados | Equipo / responsable de backend | Cumplida el 2026-11-13 (Jonathan, responsable de backend) | Todo el código | Firma del plan y de tasks en el PR |
| P5 | Brecha de la Constitución V (`BaseModel` no existe) resuelta o registrada como excepción | Equipo | **Cumplida el 2026-11-13:** registrada como excepción D-M1 (SoftDeletes sobre `Model`), la misma que `api-014` P5. Aceptada por Jonathan, en nombre del equipo | Merge a `main` | Acuerdo registrado en este plan y en `api-014`. No se crea ADR nuevo: la aceptación de Jonathan en nombre del equipo basta (2026-11-13) |
| P6 | Correo verificado garantizado en las sesiones de visitante (`api-004` CA-04) | Backend | Por verificar en T-01 y T-20. No consta si el token de visitante se emite solo con correo verificado | T-20 (CA-05) | Prueba que muestre 403 `email_not_verified` sin archivo ni petición |
| P7 | `ext-gd` disponible en el entorno de pruebas (riesgo R8 de `api-014`) | Backend | Por confirmar en T-01. Si no hay GD, los fixtures de imagen son binarios pequeños versionados | Fixtures de T-09, T-10, T-12, T-18 a T-24 | Salida de `php -m` en el PR |
| P8 | `api-012` con plan y tasks aprobados (lectura pública `GET /api/v1/memories`) | Backend (Jonathan) | Cumplida el 2026-11-13 (Jonathan): plan y tasks de `api-012` aprobados. Sigue sin implementarse | Solo T-26 (pruebas de integración de CA-17, CA-18 y CA-31 sobre el portal). No bloquea la Fase 1 interna | Plan y tasks de `api-012` aprobados |
| P9 | Enmienda de `api-004` (`DELETE /api/v1/visitor/me` con `memories_policy` y términos en el registro) y de `mobile-004`, aprobada por Aksel tras avisar a sus responsables | Aksel / responsables de `api-004` y `mobile-004` | **No iniciada.** Dependencia separada, no aprobada | T-25 (CA-32) | Enmienda aprobada en su spec, con su plan |

Nota: la tarea de «Sesiones y correo verificado» (P6) y la de `memories.review` (P3) no son trabajo nuevo en `api-004`; se comprueban o se aplican en este mismo plan sin cambiar `api-004`.

## Diseño de solución

La API es la única autoridad de estados, transiciones, límites, vigencia, imágenes y auditoría (`apps/api/AGENTS.md`; RN-14 de la spec). Los controladores solo reciben la petición, llaman a un Form Request y a una Action, y devuelven un Resource. Las reglas viven en Actions y en la consulta de los modelos.

```
cliente (dashboard-008 o web-010 vía api-012, mobile-010 en Fase 2)
  → ruta nombrada + middleware
       visitante: auth:sanctum + visitor.token (+ correo verificado, P6)
       personal:  auth:sanctum + staff.user + administrator.two-factor + permission:memories.review
  → Form Request (forma, longitudes, listas cerradas, mensajes en español)
  → Controller delgado
  → Action (transacción, bloqueos, transiciones condicionales, imágenes, auditoría)
      → Models (VisitorMemory, VisitorMemoryReview; SoftDeletes sobre Model, D-M1)
      → Config (config/memories.php: plazo y versión de términos)
      → Disco de medios del ámbito privado (api-013; el nombre sale de config)
      → Servicio de metadatos de api-008 (StripImageMetadataAction, reutilizado)
  → API Resource (sin URL de imagen fuera de la lectura pública aceptada; sin datos del visitante ni del revisor)
```

### Fase 1 · revisión y publicación (consumida por dashboard-008, api-012 y web-010)

`zoo-admin` (con `memories.review` y 2FA) lista las peticiones con filtro por estado, abre una petición (pasa a `in_review`), ve la foto por la ruta autenticada, y acepta (publicación con plazo) o rechaza (motivo y campos marcados). Al rechazar por foto, el archivo se borra después del commit. El seeder da el permiso solo a `zoo-admin`. La lectura pública es de `api-012`; esta fase deja listos el modelo, el alcance de visibilidad y los datos que `api-012` necesita.

### Fase 2 · visitante (consumida por mobile-010)

El visitante con correo verificado envía una foto con opinión opcional y consentimiento (`multipart`), consulta sus peticiones, y corrige y reenvía una rechazada. Los límites (una petición abierta, una petición nueva cada 7 días) los decide la API con un bloqueo de la fila del visitante. El borrado de cuenta con `memories_policy` (CA-32) queda bloqueado por la dependencia P9.

### Estado de visibilidad (RN-03, RN-21, CA-31)

No hay columna de estado derivado. Una petición es pública si `status = accepted`, `deleted_at` es NULL y `published_until > now()`. La regla vive en un scope del modelo (`VisitorMemory`), y `api-012` la usa. La vigencia es un cálculo por fecha: vencer no escribe nada ni genera Activitylog (CA-31).

## Fases y mapeo CA→fase (aprobado el 2026-11-13)

La spec no fija el mapeo. Se aprobó el 2026-11-13 tal como se propuso a partir del contenido de cada CA. La Fase 2 coincide con la aprobación de la spec (CA-01 a CA-06 y CA-23 a CA-27). CA-32 queda en Fase 2, pero bloqueado por P9, porque es el único que depende de otra spec.

| CA | Fase | Tareas | Motivo |
|---|---|---|---|
| CA-01 | 2 | T-19, T-20 | Envío correcto |
| CA-02 | 2 | T-18, T-19 | Archivo inválido y fallo de guardado |
| CA-03 | 2 | T-18 | Opinión fuera de 1 a 300 caracteres |
| CA-04 | 2 | T-18 | Casilla de consentimiento |
| CA-05 | 2 | T-20 | Sesión y correo verificado (P6) |
| CA-06 | 2 | T-22 | Lista propia del visitante |
| CA-07 | 1 | T-08 | Lista de revisión (dashboard-008) |
| CA-08 | 1 | T-09, T-10 | Apertura, En proceso y foto en revisión |
| CA-09 | 1 | T-09 | Apertura repetida sin cambios |
| CA-10 | 1 | T-09 | Apertura simultánea (una sola transición) |
| CA-11 | 1 | T-12 | Aceptar: publicación para `api-012` |
| CA-12 | 1 | T-13 | Rechazar con motivo y campos |
| CA-13 | 1 | T-12, T-13 | Decisión final por revisión |
| CA-14 | 1 | T-07 | Acceso por rol (`admin` recibe 403) |
| CA-15 | 1 | T-07 | Visitante en rutas de personal |
| CA-16 | 1 | T-06 | Seeder de `memories.review` (compartido, P3) |
| CA-17 | 1 y 2 de integración | T-16 (admin), T-26 (público, P8) | Sin URL antes de aceptar en todas las respuestas |
| CA-18 | 1 (modelo) y T-26 (público, P8) | T-04, T-26 | Aceptada y vigente visible en el portal |
| CA-19 | 1 (revisión) y 2 (reenvío) | T-15, T-23 | Auditoría sin binario ni ruta |
| CA-20 | 1 | T-04 | Modelos con SoftDeletes y sin borrado físico |
| CA-21 | Transversal | T-17 (Fase 1), T-27 (cierre) | Capas, Actions, Resources y rutas nombradas |
| CA-22 | Transversal, cierre | T-27 | Cobertura de pruebas |
| CA-23 | 2 | T-21 | Límite semanal (429) |
| CA-24 | 2 | T-21 | Una petición abierta (422) |
| CA-25 | 2 | T-21 | Envíos simultáneos |
| CA-26 | 2 | T-23 | Reenvío de rechazada |
| CA-27 | 2 | T-24 | Reglas de corrección según motivo |
| CA-28 | 1 | T-13 | Motivos del rechazo (validación) |
| CA-29 | 1 | T-14 | Archivo al rechazar según motivo |
| CA-30 | 1 | T-11 | Plazo de publicación (`MEMORIES_PUBLICATION_DAYS`) |
| CA-31 | 1 (modelo y admin), 2 (visitante, T-22), T-26 (público) | T-04, T-16, T-22, T-26 | Vencimiento sin borrado |
| CA-32 | 2, **bloqueado** (P9) | T-25 | Borrado de cuenta con elección (depende de `api-004`) |

Resumen: Fase 1 = CA-07 a CA-20 y CA-28 a CA-31 (parte admin), más CA-21 y CA-22 transversales. Fase 2 = CA-01 a CA-06, CA-23 a CA-27 y CA-32 (bloqueado). Las tareas de Fase 1 van primero; las de Fase 2 empiezan cuando Fase 1 esté verificada, salvo T-18, que solo necesita los enums y la configuración.

## Cambios por área

| Área/app | Archivos o módulos previstos (rutas previstas, aún no existen) | Propósito |
|---|---|---|
| API / enums | `apps/api/src/app/Enums/MemoryStatus.php`, `MemoryReviewDecision.php`, `MemoryRejectedField.php` (nuevos) | Listas cerradas de RN-01, RN-20 y de decisiones (`accepted`, `rejected`) |
| API / modelos | `apps/api/src/app/Models/VisitorMemory.php`, `VisitorMemoryReview.php` (nuevos) | Tablas de DBR-012; `SoftDeletes` sobre `Model` (D-M1); `$fillable` explícito; casts; relaciones; scope de visibilidad |
| API / configuración | `apps/api/src/config/memories.php` (nuevo); `apps/api/src/.env.example` (modificar: `MEMORIES_PUBLICATION_DAYS=7`, `MEMORIES_TERMS_VERSION=`) | Plazo y versión de términos; las Actions leen `config()`, nunca `env()` (Constitución I) |
| API / almacenamiento | `apps/api/src/config/filesystems.php` (lo modifica `api-013`, no esta spec); `apps/api/src/app/Actions/Memories/Media/StoreMemoryImageAction.php` (F2), `DeleteMemoryImageAction.php` (F1) (nuevos) | Escritura y borrado en el disco privado de medios; nombres generados; borrado solo por expresión regular |
| API / Actions de revisión (F1) | `apps/api/src/app/Actions/Memories/Review/ListMemoriesForReviewAction.php`, `ShowMemoryForReviewAction.php`, `ShowMemoryImageForReviewAction.php`, `AcceptMemoryAction.php`, `RejectMemoryAction.php`, `ComputePublicationWindowAction.php` (nuevos) | Reglas de revisión, transiciones condicionales, plazo y archivo al rechazar |
| API / Actions del visitante (F2) | `apps/api/src/app/Actions/Memories/Visitor/SubmitVisitorMemoryAction.php`, `ResubmitVisitorMemoryAction.php`, `ListVisitorMemoriesAction.php` (nuevos); `ApplyVisitorMemoriesPolicyAction.php` (nuevo, bloqueado P9) | Envío, límites, reenvío, lista propia y elección de borrado de cuenta |
| API / reutilizadas | `apps/api/src/app/Actions/Admin/Content/StripImageMetadataAction.php` (`api-008`, sin cambios); `apps/api/src/app/Actions/Admin/LogAdminActivityAction.php` (log `admin`, sin cambios) | Retiro de metadatos (RN-05); auditoría de personal (CA-19) |
| API / Form Requests | `apps/api/src/app/Http/Requests/Admin/ListMemoriesForReviewRequest.php`, `RejectMemoryRequest.php` (nuevos); `apps/api/src/app/Http/Requests/Visitor/StoreVisitorMemoryRequest.php`, `ResubmitVisitorMemoryRequest.php` (nuevos) | Forma de la entrada y mensajes en español (patrón de `api-014`: mensajes en la Request) |
| API / Controllers | `apps/api/src/app/Http/Controllers/Admin/MemoryReviewController.php` (`index`, `show`, `accept`, `reject`); `…/Admin/MemoryReviewImageController.php` (invocable); `apps/api/src/app/Http/Controllers/Visitor/VisitorMemoryController.php` (`store`, `index`, `resubmit`) (nuevos) | HTTP delgado: entrada → Action → Resource |
| API / Resources | `apps/api/src/app/Http/Resources/Admin/MemoryReviewResource.php` (lista), `MemoryReviewDetailResource.php` (detalle y respuestas de decisión); `apps/api/src/app/Http/Resources/Visitor/VisitorMemoryResource.php` (nuevos) | Formas de respuesta. Sin `image_path`, `published_image_path`, `image_sha256`, `visitor_id` ni datos del revisor en las respuestas de visitante |
| API / rutas | `apps/api/src/routes/api.php` (modificar): subgrupo `permission:memories.review` dentro de `admin.`; rutas `visitor.memories.*` dentro del grupo `visitor.` | Rutas nombradas en inglés (CA-21) |
| API / seeder | `apps/api/src/database/seeders/RolesAndPermissionsSeeder.php` (lo modifica `api-014` T-07; `api-010` no lo edita): `memories.review` en `$permissions`, en `zoo-admin` y excluido de `admin` con `array_diff` | RN-07, CA-16. No se duplica el cambio |
| API / pruebas | `apps/api/src/tests/Feature/Memories/*.php` (nuevos); `apps/api/src/tests/Feature/Staff/SeedersTest.php` (ampliar, CA-16); `apps/api/src/tests/Fixtures/memories/` (fixtures binarios pequeños y sin metadatos reales) | Un test por CA (sección «Mapeo de criterios a pruebas») |
| Infraestructura | `infra/README.md` (modificar, mismo PR): `MEMORIES_PUBLICATION_DAYS`, `MEMORIES_TERMS_VERSION`, seeder, datos de prueba | Checklist de despliegue (`AGENTS.md`, «Todo despliegue…») |
| Documentación | `apps/api/docs/momentos-contrato-para-mobile.md` (solo referencia; no se duplica aquí, ver «Contrato para mobile») | Contrato para la app |
| Paquetes / clientes | Ninguno en este plan. `packages/api-client` (métodos y multipart) y los consumidores son de sus specs | — |
| Datos | Ninguno. DBR-012 ya existe y está aplicada | — |

## Contrato y datos

### Endpoints y rutas nombradas

Todas las rutas usan `->name()` en inglés. Los `{id}` son numéricos (`whereNumber`). Las respuestas de error 404 («Petición no encontrada.», «La imagen ya no está disponible.») se producen en la Action, porque el mensaje de un binding implícito no es el de la spec.

| Método y ruta | Nombre de ruta | Middleware y permiso | CA | Fase | Respuesta |
|---|---|---|---|---|---|
| `GET /api/v1/admin/memories` | `admin.memories.index` | `admin` + 2FA + `permission:memories.review` | CA-07 | 1 | 200 paginado (`data`, `meta` `{page, limit, has_more}`); cada fila trae `id`, `status`, `opinion`, `created_at` y `resubmitted_count` (M-1 de `dashboard-008`) |
| `GET /api/v1/admin/memories/{id}` | `admin.memories.show` | igual | CA-08, CA-09, CA-10, CA-17, CA-31 | 1 | 200 (abre y pasa a `in_review`; incluye `published_at`, M-3 de `dashboard-008`) |
| `GET /api/v1/admin/memories/{id}/image` | `admin.memories.image` | igual | CA-08 (api-013 CA-10) | 1 | 200 binario `image/*` o 404 |
| `POST /api/v1/admin/memories/{id}/accept` | `admin.memories.accept` | igual | CA-11, CA-13, CA-30 | 1 | 200 con `published_until` |
| `POST /api/v1/admin/memories/{id}/reject` | `admin.memories.reject` | igual | CA-12, CA-13, CA-28, CA-29 | 1 | 200 |
| `POST /api/v1/visitor/memories` | `visitor.memories.store` | `auth:sanctum`, `visitor.token`, correo verificado (P6) | CA-01 a CA-05, CA-23 a CA-25 | 2 | 201 (multipart) |
| `GET /api/v1/visitor/memories` | `visitor.memories.index` | igual | CA-06, CA-31 | 2 | 200 (`data`, `meta`) |
| `POST /api/v1/visitor/memories/{id}/resubmit` | `visitor.memories.resubmit` | igual | CA-26, CA-27 | 2 | 200 (multipart; ver Q3) |

Notas de contrato:
- El grupo `admin.` ya existe con `administrator.two-factor` (`routes/api.php`, línea 108). Esta spec añade un subgrupo con `permission:memories.review`, igual que `users.manage`, `news.manage` o `species.review` (`api-014`).
- El grupo `visitor.` ya existe con `auth:sanctum` y `visitor.token`. Las rutas nuevas se añaden ahí.
- La lectura de la foto en revisión tiene un efecto secundario (ver riesgo R4). Es lo que fija la spec (CA-08); no se cambia.
- `POST` multipart en el reenvío: el archivo es opcional (CA-27), así que la ruta es `POST`, sin `_method`.
- No hay límite de tasa en estas rutas: la spec no lo define (riesgo R15).
- Rutas fuera de este plan: `GET /api/v1/memories` (`api-012`), `DELETE /api/v1/visitor/me` (`api-004`, bloqueado P9).

### Validación (Form Requests)

Los nombres de los campos de entrada del envío (`image`, `opinion`, `consent`) son una propuesta (D-M9, Q5). Coinciden con las claves de error de la spec (`errors.image`, `errors.opinion`, `errors.consent`).

| Petición | Reglas | Mensajes (español) |
|---|---|---|
| Envío (`StoreVisitorMemoryRequest`) | `image`: requerido; `image`, `mimes:jpg,jpeg,png,webp`, `max:5120`. `opinion`: opcional, cadena; tras recortar espacios, vacía se guarda como NULL; máximo 300 caracteres. `consent`: requerido, `accepted` | Archivo: «La foto debe ser JPG, PNG o WebP de máximo 5 MB.» (propuesto); «No se pudo procesar la foto. Intenta con otro archivo.» (cuando el retiro de metadatos falla, CA-02); opinión: «La opinión puede tener hasta 300 caracteres.» (propuesto); consentimiento: «Confirma que tienes permiso para compartir esta foto y que aceptas los términos.» (literal de CA-04) |
| Reenvío (`ResubmitVisitorMemoryRequest`) | Igual que el envío, con `image` opcional (solo si la regla de CA-27 lo permite) y `consent` requerido | Los del envío, más los de CA-27 que se comprueban en la Action (`errors.image`, `errors.opinion`) |
| Lista de revisión (`ListMemoriesForReviewRequest`) | `status`: opcional, `submitted`, `in_review`, `accepted` o `rejected`. `page`: entero ≥ 1, por defecto 1. `limit`: entero 1 a 50, por defecto 10 (D-M11) | Propuesto: «El estado no es válido.», «La página debe ser un número entero mayor o igual que 1.», «El tamaño de página debe estar entre 1 y 50.» |
| Rechazo (`RejectMemoryRequest`) | `rejection_reason`: requerido, cadena, 1 a 500 caracteres. `rejected_fields`: requerido, array de 1 o 2 valores únicos, de `image` y `content` | «Motivo requerido (1-500 caracteres).» (mismo texto que `api-014`, propuesto); «Indica qué falló: la foto, la opinión o ambas.» (propuesto) |
| Aceptar | Sin cuerpo | — |

Notas de validación:
- El orden de comprobación del envío es el de CA-24: sesión, campos, petición abierta, límite semanal (CA-23).
- Las comprobaciones que dependen del estado (CA-27, CA-13) están en la Action, no en la Request.

### Actions, Resources y Policies

- No hay Policies. La autorización es de middleware (`permission:memories.review`, `visitor.token`) y, para el visitante, de consulta con `visitor_id` del token (si no coincide, 404, sin revelar la existencia).
- Resources: ninguna respuesta de visitante incluye `visitor_id`, `reviewed_by`, `image_path`, `published_image_path`, `image_sha256`, `rejected_image` ni `rejected_content`. `rejected_fields` se construye desde los dos booleanos (DBR-012).
- Admin: `image_url` no aparece en ninguna respuesta de revisión (CA-08). La imagen solo sale por la ruta de binario.
- Paginación: `page` y `limit` con `meta` `{page, limit, has_more}`, calculado pidiendo un elemento más (criterio de `api-011`/`api-012`). En la lista del visitante no hay paginación; devuelve como máximo 50 (RN-11).
- Forma de `data`: el envoltorio `data` es el de la API. La forma de la lista vacía es `{"data": []}`.

### Modelos y datos (DBR-012)

- `VisitorMemory`: tabla `visitor_memories`. `SoftDeletes` sobre `Model` (D-M1). `$fillable` explícito, sin `id`, `status` (solo lo fijan las Actions), `deleted_at` ni `resubmitted_count` (lo fija la Action). Casts: `consent_at`, `reviewed_at`, `published_at`, `published_until` (datetime); `rejected_image`, `rejected_content` (boolean). Relaciones: `visitor()` (`belongsTo`, `visitor_id`), `reviewer()` (`belongsTo` `User`, `reviewed_by`), `reviews()` (`hasMany` `VisitorMemoryReview`).
- Scopes: `publiclyVisible(CarbonInterface $now)`: `status = accepted`, `published_until > $now`. El scope lo usa `api-012`.
- `VisitorMemoryReview`: tabla `visitor_memory_reviews`. Historial append-only: no se actualiza ni se borra. `SoftDeletes` sobre `Model` (DBR-012 lo pide). Sin `updated_at` cambiado tras crearse.
- Sin `created_by` ni `updated_by` (decisión de DBR-012; D-M2).
- Sin migraciones. Sin SQL. Sin triggers ni vistas.

## Transacciones por operación

| Operación (CA) | Bloqueos | Dentro de la transacción | Después del commit |
|---|---|---|---|
| Envío (CA-01, CA-23 a CA-25) | fila de `visitors` (`lockForUpdate`) | Comprueba petición abierta (CA-24), límite semanal con `withTrashed()` (CA-23); escribe el archivo limpio en `memories/` (CA-01); crea la fila en `submitted` con `resubmitted_count = 0`, `consent_at` y `terms_version` | Nada. Si algo falla antes del commit, se borra el archivo nuevo (RN-16) |
| Visibilidad al abrir (CA-08, CA-09, CA-10) | ninguno; transición condicional | `UPDATE … WHERE id = ? AND status = 'submitted'`. Si afecta a 1 fila: registra `in-review`. Si afecta a 0: relee el estado y no registra nada | Nada |
| Aceptar (CA-11, CA-13, CA-30) | fila de la petición (`lockForUpdate`) | Comprueba `submitted` o `in_review` (si no, 422 de CA-13); comprueba que el archivo existe (422 de CA-11); calcula `published_at` y `published_until` con `ComputePublicationWindowAction` (500 si la configuración es inválida, CA-30); guarda `published_image_path = image_path`; crea fila de historial `accepted`; registra Activitylog | Nada (el archivo no se mueve) |
| Rechazar (CA-12, CA-13, CA-28, CA-29) | fila de la petición (`lockForUpdate`) | Comprueba `submitted` o `in_review`; `status = rejected`, `rejected_image`/`rejected_content`, `rejection_reason`, `reviewed_by`, `reviewed_at`; si incluye `image`, `image_path = NULL` y se conserva `image_sha256`; fila de historial `rejected`; Activitylog con campos marcados | Si incluye `image`: borra el archivo con `DeleteMemoryImageAction`. Si falla, se registra en el log sin ruta y la petición queda `rejected` (CA-29) |
| Reenvío (CA-26, CA-27) | fila de la petición (`lockForUpdate`) | Comprueba `rejected`; aplica CA-27 con el hash del archivo limpio (calculado antes de la transacción) y la opinión comparada con la guardada; si hay archivo nuevo, lo escribe en `memories/`; `status = submitted`; `resubmitted_count + 1`; `rejection_reason`, `rejected_image`, `rejected_content` a NULL o 0; actualiza `consent_at`, `terms_version`, `opinion` y, si hay archivo, `image_path` e `image_sha256`; Activitylog `resubmitted` | Si sustituyó un archivo: borra el anterior con `DeleteMemoryImageAction` (RN-19). Si el archivo nuevo falla antes del commit, no cambia nada (RN-16) |
| Lista de revisión, detalle, imagen, lista del visitante | ninguno | Solo lectura | — |

Notas:
- El hash y el retiro de metadatos se calculan fuera de la transacción (no hay I/O en la transacción salvo la escritura del archivo nuevo).
- Solo se bloquea una fila en cada operación; no hay orden de bloqueo entre dos filas. Si el reenvío y la lectura de visitante coinciden, la lectura ve el estado previo, lo que es aceptable.
- Antes de confirmar el envío, si la escritura del archivo ocurre dentro de la transacción y el commit falla, la Action borra el archivo en el `catch` y relanza la excepción.

## Almacenamiento y limpieza de imágenes

- Disco: el nombre del disco sale de la configuración del ámbito privado que defina `api-013` (D-02 y CA-02 de `api-013`: ninguna Action escribe `'media'`, `'local'` ni `'public'` en `Storage::disk(...)`). La clave exacta la confirma `api-013` en T-02 (ver P2).
- Nombre generado: `memories/<uuid>.<ext>` con `ext` según el MIME validado (`jpg` para `image/jpeg`, `png`, `webp`). Nunca el nombre original ni rutas del cliente.
- Retiro de metadatos: `StripImageMetadataAction::execute($bytes, $mimeType)` (`api-008`). Soporta JPEG, PNG y WebP. Se aplica antes de calcular el SHA-256 y antes de guardar (RN-05). Si devuelve error o el archivo no se lee, 422 `errors.image`.
- SHA-256: del archivo ya limpio; se guarda en `image_sha256` y se conserva aunque el archivo se borre (CA-27).
- Aceptar: no copia ni mueve; `published_image_path = image_path` (`api-013` CA-11). La comprobación de existencia del archivo se hace en la aceptación (CA-11). La lectura pública de `api-012` no comprueba existencia en cada consulta (flujo 8 de `api-013`).
- Imagen en revisión: `ShowMemoryImageForReviewAction` lee el archivo del disco privado y lo devuelve con `Content-Type` según la extensión guardada. Si no existe, 404 «La imagen ya no está disponible.». Propuesto: cabecera `Cache-Control: no-store` (no exigido por la spec).
- Borrado: `DeleteMemoryImageAction` solo borra rutas que cumplen `^memories/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$`. Cualquier otra ruta se ignora y se registra como aviso técnico sin la ruta. El borrado es siempre después del commit (CA-29, RN-19, `api-013` CA-18).
- Fallo tras commit: 200 o 201 según la operación, aviso en el log sin ruta absoluta ni binario. El archivo queda huérfano (riesgo R9).

## Seguridad, offline y operación

- **Mínimo privilegio.** Visitante: solo sus peticiones (`visitor_id` del token). `zoo-admin`: `memories.review` y 2FA. `admin`, `executive`, `cashier` y `veterinarian` no reciben el permiso (CA-14).
- **Sin URL.** Ninguna respuesta de la API incluye URL ni ruta de una imagen no aceptada (CA-17). La excepción de `media/` (archivo alcanzable por `/media` si se conoce la URL) está registrada en la spec (RN-10) y en el ADR 0026 (riesgo b). Es riesgo aceptado para pruebas (R2).
- **Datos sensibles.** Fotos de personas, incluidos menores (casilla y revisión humana; sin verificación de edad). La opinión es texto libre: la API no lo filtra. Se guarda y se muestra como texto plano, nunca HTML (RN-06).
- **Metadatos.** Retiro de GPS y demás metadatos antes de guardar (RN-05).
- **Validación de archivo.** `image` con `mimes` y `max`, más el retiro de metadatos. Sin SVG ni GIF (la regla `image` sola los admitiría; por eso `mimes` es obligatoria).
- **Auditoría.** Activitylog con actor, acción e identificador. Sin binario ni ruta absoluta (CA-19). Staff: log `admin` (`LogAdminActivityAction`). Visitante: log `visitor-memories` (propuesto, Q8). El envío no se registra porque la spec no lo pide.
- **Secretos.** Ninguno. `MEMORIES_PUBLICATION_DAYS` y `MEMORIES_TERMS_VERSION` van por `.env`, sin valores secretos. El `.env.example` solo tiene valores de muestra.
- **Límites de tasa.** Ninguno en esta spec (riesgo R15).
- **Offline.** No aplica en la API. La app no encola ni guarda la imagen (`mobile-010`, CA-10).
- **Observabilidad.** Avisos técnicos de borrado y de configuración inválida en el log de la aplicación, sin binario, sin ruta absoluta y sin URL firmada.
- **Portabilidad (ADR 0013, MySQL 8.0.x).** `VARCHAR` y `TIMESTAMP` estándar, `lockForUpdate`, transiciones con `UPDATE` condicional. Sin funciones propietarias, sin triggers, sin vistas. Configuración por `.env`; compatible con Aiven y con MySQL local.
- **Despliegue.** `infra/README.md` (T-28): `MEMORIES_PUBLICATION_DAYS`, `MEMORIES_TERMS_VERSION`, `db:seed --class=RolesAndPermissionsSeeder` (nunca sin `--class`), `storage:link`, límites de subida (5 MB), flujo de commit de `memories/` (`api-013`) y advertencia de datos de prueba.
- **Pruebas.** `arca_pruebas`, `DatabaseTransactions`, sin `RefreshDatabase`, sin migraciones en tests. Disco falso (`Storage::fake`) con el nombre que sale de la configuración.

## Contrato para mobile

- Referencia: `apps/api/docs/momentos-contrato-para-mobile.md` (Borrador, 2026-11-12). Este plan no la duplica. Sus secciones 3.1 a 3.7 describen el contrato que consume la app, y su sección 10 lista las preguntas abiertas.
- Lo que este plan fija y que la guía debe reflejar cuando la Fase 2 esté implementada: rutas y nombres (tabla de «Endpoints»), `data` y `meta` en la lista del visitante, `{"data": []}` en lista vacía, validación del envío (nombres de campos propuestos, D-M9), y código de error 429 con `next_submission_at` y `Retry-After` (CA-23).
- Lo que este plan NO decide: textos de 401 y 403 `email_not_verified`, formato de fechas y zona, `terms_version` enviada por la app o no (D2 de la guía), cómo sabe la app que hay peticiones antes de borrar la cuenta (D7 de la guía, bloqueado P9), y la tarjeta «En proceso» (D12). Quedan en la sección 10 de la guía.
- Forma de la respuesta 200 del reenvío: propuesta, la misma forma que el 201 (Q3 si el equipo prefiere otra).
- Cambios de contrato posteriores: se registran en la guía en el mismo PR (`AGENTS.md`, paso 4 del procedimiento).

## Mapeo de criterios a pruebas

Convención: PHPUnit en `apps/api/src/tests/Feature/Memories/`. Las clases de visitante extienden `VisitorFeatureTestCase` (con `RegistersVisitors`) y las de personal `FeatureTestCase` (con `CreatesAdministrators` o `CreatesStaffUsers`). Todas usan `DatabaseTransactions` sobre `arca_pruebas`. Prohibido `RefreshDatabase`, `migrate:fresh` o migraciones desde los tests. Medios con `Storage::fake()` con el nombre de disco de la configuración. Fechas con `Carbon::setTestNow`.

Nombres de método: PHPUnit no admite guiones, así que los métodos usan `ca01_`…`ca32_`, y cada docblock incluye `CA-01`…`CA-32`. El test de cobertura (T-27) busca ambas formas. Los nombres son propuestos (la spec no fija nombres de test); se confirman en el PR.

Los tests de `api-013` que cubren este plan usan el prefijo `api013_caNN_` (por ejemplo `api013_ca09_…`) para no chocar con los CA de esta spec.

| Criterio | Prueba automatizada (nombre propuesto) | Archivo previsto | Tarea |
|---|---|---|---|
| CA-01 | `ca01_visitor_submits_memory_and_gets_201_without_url` | `VisitorMemorySubmitTest.php` | T-20 |
| CA-02 | `ca02_invalid_file_returns_422_and_writes_nothing`; `api013_ca08_storage_failure_creates_nothing` | `VisitorMemoryValidationTest.php`; `VisitorMemoryStorageTest.php` | T-18; T-19 |
| CA-03 | `ca03_opinion_over_300_returns_422_in_errors_opinion` | `VisitorMemoryValidationTest.php` | T-18 |
| CA-04 | `ca04_missing_consent_returns_422_with_spanish_message` | `VisitorMemoryValidationTest.php` | T-18 |
| CA-05 | `ca05_no_session_401_and_unverified_email_403_write_nothing` | `VisitorMemorySubmitTest.php` | T-20 |
| CA-06 | `ca06_list_only_own_newest_first_max_50_with_meta`; `ca06_rejected_and_accepted_fields_and_no_reviewer_data` | `VisitorMemoryListTest.php` | T-22 |
| CA-07 | `ca07_review_list_paginates_and_filters_by_status`; `ca07_invalid_status_or_page_returns_422` | `MemoriesReviewListTest.php` | T-08 |
| CA-08 | `ca08_opening_submitted_moves_to_in_review_and_logs_once`; `ca08_detail_has_no_image_url_and_publication_days`; `ca08_image_route_serves_binary_only_with_permission`; `api013_ca10_review_image_is_binary_without_url_and_403_without_permission` | `MemoriesReviewOpenTest.php`; `MemoriesReviewImageTest.php` | T-09; T-10 |
| CA-09 | `ca09_reopening_in_review_accepted_or_rejected_changes_nothing` | `MemoriesReviewOpenTest.php` | T-09 |
| CA-10 | `ca10_second_open_after_transition_logs_no_second_in_review` (secuencial; ver R5) | `MemoriesReviewOpenTest.php` | T-09 |
| CA-11 | `ca11_accept_sets_window_history_and_published_image_path`; `ca11_accept_without_file_returns_422_and_changes_nothing`; `api013_ca11_accept_does_not_move_the_file` | `MemoriesAcceptTest.php` | T-12 |
| CA-12 | `ca12_reject_with_reason_and_fields_creates_history_and_no_publication` | `MemoriesRejectTest.php` | T-13 |
| CA-13 | `ca13_accepted_cannot_be_decided_again`; `ca13_rejected_waits_for_visitor_correction` | `MemoriesAcceptTest.php`; `MemoriesRejectTest.php` | T-12; T-13 |
| CA-14 | `ca14_admin_role_gets_403_on_memory_routes` (data provider: `admin`, `executive`, `cashier`, `veterinarian`); `ca14_zoo_admin_without_two_factor_is_blocked` | `MemoriesReviewAccessTest.php` | T-07 |
| CA-15 | `ca15_visitor_session_cannot_read_staff_memory_routes` | `MemoriesReviewAccessTest.php` | T-07 |
| CA-16 | `ca16_memories_review_only_zoo_admin` | `tests/Feature/Staff/SeedersTest.php` | T-06 |
| CA-17 | `ca17_non_accepted_memories_have_no_image_url_in_review_responses`; público: `ca17_public_list_never_exposes_non_accepted_memories` (con P8) | `MemoriesReviewVisibilityTest.php`; `MemoriesPublicReadIntegrationTest.php` | T-16; T-26 |
| CA-18 | `ca18_accepted_current_memory_is_in_public_scope` (modelo); `ca18_public_list_shows_image_and_opinion_only` (P8) | `MemoryModelTest.php`; `MemoriesPublicReadIntegrationTest.php` | T-04; T-26 |
| CA-19 | `ca19_review_audit_has_actor_action_and_id_without_binary_or_path` (in-review, accepted, rejected); `ca19_resubmitted_audit_has_no_binary_or_path` | `MemoriesAuditTest.php`; `VisitorMemoryResubmitTest.php` | T-15; T-23 |
| CA-20 | `ca20_models_use_soft_deletes_and_no_hard_delete_path` | `MemoryModelTest.php` | T-04 |
| CA-21 | `ca21_staff_memory_routes_are_named_in_english`; `ca21_visitor_memory_routes_are_named_and_controllers_are_thin` | `MemoriesRoutesTest.php` | T-17; T-27 |
| CA-22 | `MemoriesCoverageTest` (busca `ca01_`…`ca32_` y `CA-01`…`CA-32` en `tests/Feature/Memories/` y `SeedersTest.php`; verifica `DB_DATABASE=arca_pruebas`, `DatabaseTransactions` y ausencia de `RefreshDatabase`) | `MemoriesCoverageTest.php` | T-27 |
| CA-23 | `ca23_weekly_limit_returns_429_with_next_submission_at`; `ca23_exactly_seven_days_allows_submit`; `ca23_resubmit_does_not_open_or_count_the_window` | `VisitorMemoryLimitsTest.php` (dos primeros); `VisitorMemoryResubmitTest.php` (tercero) | T-21; T-23 |
| CA-24 | `ca24_open_request_returns_422_with_open_request_id` (para `submitted`, `in_review` y `rejected`) | `VisitorMemoryLimitsTest.php` | T-21 |
| CA-25 | `ca25_second_submit_after_first_is_blocked_by_open_request` (secuencial; ver R5) | `VisitorMemoryLimitsTest.php` | T-21 |
| CA-26 | `ca26_resubmit_rejected_returns_200_and_keeps_history`; `ca26_non_rejected_returns_422_status`; `ca26_other_account_returns_404` | `VisitorMemoryResubmitTest.php` | T-23 |
| CA-27 | `ca27_image_rejection_requires_different_photo_hash`; `ca27_content_rejection_requires_changed_opinion`; `ca27_content_only_keeps_or_replaces_image_and_deletes_previous_after_commit` | `VisitorMemoryResubmitRulesTest.php` | T-24 |
| CA-28 | `ca28_reject_validates_reason_and_fields_in_spanish` | `MemoriesRejectTest.php` | T-13 |
| CA-29 | `ca29_reject_image_deletes_file_after_commit_and_keeps_sha`; `ca29_reject_content_only_keeps_file`; `ca29_delete_failure_after_commit_keeps_rejected_and_logs`; `api013_ca18_deletion_only_for_managed_memory_paths` | `MemoriesRejectFileTest.php` | T-14 |
| CA-30 | `ca30_published_until_is_published_at_plus_configured_days`; `ca30_changing_config_does_not_change_accepted_memories`; `ca30_invalid_config_returns_500_and_changes_nothing` | `MemoriesPublicationWindowTest.php` | T-11 |
| CA-31 | `ca31_expired_memory_keeps_status_row_and_file_without_audit` (modelo); `ca31_zoo_admin_sees_publication_expired` (admin); `ca31_visitor_sees_is_published_false_after_expiry` (visitante); `ca31_public_list_excludes_expired` (P8) | `MemoryModelTest.php`; `MemoriesReviewVisibilityTest.php`; `VisitorMemoryListTest.php`; `MemoriesPublicReadIntegrationTest.php` | T-04; T-16; T-22; T-26 |
| CA-32 | `ca32_policy_required_when_memories_exist_returns_422`; `ca32_keep_unlinks_rows_and_keeps_files_and_audits`; `ca32_delete_soft_deletes_rows_and_removes_files_after_commit`. **Omitidos** (`markTestSkipped`) hasta la aprobación de P9 | `VisitorMemoryAccountDeletionTest.php` | T-25 |

Nota: las pruebas de concurrencia real (dos procesos en paralelo) no entran en este plan (R5). CA-10 y CA-25 se verifican de forma secuencial, con la misma lógica de transición condicional y de fila bloqueada.

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | Sin dependencias nuevas (`Storage`, validación de Laravel y `StripImageMetadataAction` ya existen). Disco y plazo configurables por `.env`. Sin servicios propietarios. Sin ADR de dependencia requerido |
| II. La spec manda | Sí, con condición de implementación | Spec Aprobada (2026-11-12) con plan y tasks del mismo `010-visitor-memory-requests`, aprobados el 2026-11-13 (P4). Plan de `api-013` aprobado el 2026-11-13; falta su disco en código (P2). Ningún código antes de P1 y P4; ningún código de imagen antes de P2 |
| III. Lógica separada de la interfaz | Sí (propuesto) | Reglas de estado, límites, vigencia, plazo, archivo y auditoría en Actions. Controladores y Form Requests sin reglas de negocio. Resources solo dan forma. Los clientes quedan fuera de este plan |
| IV. Un test por criterio | Sí (propuesto) | Tabla «Mapeo de criterios a pruebas»: CA-01 a CA-32 con al menos un test nombrado. CA-17 y CA-18 (lectura pública) dependen de P8. CA-32 tiene su test nombrado pero **omitido** hasta P9: la cobertura formal depende de esa aprobación. Concurrencia secuencial (R5). CI en verde: pendiente de evidencia |
| V. Una sola fuente de verdad para los datos | **Excepción aceptada (D-M1)** | (1) DBR-012 aplicada en `arca_pruebas` y migración existente: sin cambios de esquema en este plan. (2) La Constitución V pide que los modelos extiendan `BaseModel`; no existe `BaseModel` en `apps/api/src`. **Excepción (D-M1), aceptada por Jonathan en nombre del equipo el 2026-11-13:** `VisitorMemory` y `VisitorMemoryReview` usan `SoftDeletes` sobre `Model`, la misma decisión F que `api-014`. No se crea ADR nuevo (2026-11-13): la aceptación de Jonathan en nombre del equipo basta (P5). (3) Sin `created_by`/`updated_by`: DBR-012 lo decidió así; el actor queda en `reviewed_by` y `visitor_id` (D-M2). `apps/api/AGENTS.md` pide esas columnas cuando el modelo lo requiera; la excepción se registra en el PR. (4) Ninguna acción de esta spec borra filas físicamente. Los archivos sí se borran (no son datos clínicos ni financieros) y el borrado queda auditado (CA-19, CA-29, CA-32) |
| VI. Código en inglés, personas en español | Sí | Clases, rutas, columnas, permisos y configuración en inglés. Mensajes de validación, respuestas y textos de Activitylog en español. Los literales de la spec (CA-02, CA-04, CA-13, CA-24) se usan tal cual |

Ninguna excepción se implementa sin acuerdo. Las excepciones de la fila V quedan aceptadas el 2026-11-13 (D-M1, y la de imágenes de momentos solo para pruebas).

## Riesgos y decisiones

### Decisiones del plan (aprobadas el 2026-11-13)

Preguntas referenciadas por el plan sin lista propia, resueltas el 2026-11-13 con la propuesta citada, aceptada por Jonathan (la Q2 incluida):

- **Q2 (valor por defecto de `MEMORIES_TERMS_VERSION`): resuelta (2026-11-13, Jonathan).** Valor por defecto `v1`, configurable por `.env`; se cambia cuando el zoológico publique otra versión de términos. Reflejado en T-05, T-20 y T-28.
- **Q3 (forma del 200 del reenvío y opinión ausente):** resuelta (2026-11-13, Jonathan): se adopta la recomendación. Misma forma que el 201; si no se envía `opinion`, se conserva la guardada (D-M12).
- **Q4 (paginación de la revisión):** resuelta (2026-11-13, Jonathan): se adopta D-M11 (`page` y `limit`, 10 por defecto, máximo 50).
- **Q5 (nombres de campos del envío):** resuelta (2026-11-13, Jonathan): se adopta D-M9 (`image`, `opinion` y `consent`).
- **Q8 (log de auditoría del visitante):** resuelta (2026-11-13, Jonathan): se adopta D-M10 (log `visitor-memories`).

- **D-M1 Excepción de la Constitución V (`BaseModel`).** SoftDeletes sobre `Model`, sin crear `BaseModel`. La decisión del usuario fue no crearlo; hay que registrarla como excepción con el mismo alcance que `api-014` (decisión F). Aceptada por Jonathan, en nombre del equipo, el 2026-11-13 (P5).
- **D-M2 Sin `created_by`/`updated_by`.** DBR-012 lo decidió. El actor de la revisión queda en `reviewed_by` y en `visitor_memory_reviews`; el creador es `visitor_id`. Excepción registrada en el PR.
- **D-M3 Mapeo de fases.** Aprobado el 2026-11-13 tal como se propuso (sección «Fases y mapeo CA→fase»).
- **D-M4 Configuración en `config/memories.php`.** `publication_days` (`MEMORIES_PUBLICATION_DAYS`, por defecto 7) y `terms_version` (`MEMORIES_TERMS_VERSION`). Las Actions no leen `env()`. Valor por defecto de `terms_version`: `v1` (Q2, resuelta el 2026-11-13).
- **D-M5 Disco por configuración.** El nombre del disco privado sale de la clave que defina `api-013`. Ninguna Action escribe un nombre de disco literal (`api-013` CA-02).
- **D-M6 Orden del envío.** Bloqueo de la fila del visitante, comprobaciones (CA-24, CA-23), escritura del archivo dentro de la transacción, inserción, commit; si falla, se borra el archivo nuevo. Así un 422 por límite no deja archivo (CA-23, CA-24).
- **D-M7 Transición condicional en la apertura.** `UPDATE … WHERE status = 'submitted'`. Gana una sola transición; la segunda lee el estado actual (CA-10, RN-12).
- **D-M8 Hash y retiro de metadatos fuera de la transacción.** La transacción solo escribe un archivo.
- **D-M9 Nombres de campos del envío.** `image`, `opinion` y `consent`, iguales a las claves de error de la spec. Resuelta (Q5, 2026-11-13): se adopta la propuesta.
- **D-M10 Auditoría.** Staff: log `admin` con `LogAdminActivityAction`. Visitante: log `visitor-memories` (Q8 resuelta: se adopta). El envío no se registra (la spec no lo pide; no se añade alcance).
- **D-M11 Paginación de la revisión.** Parámetros `page` y `limit` (10 por defecto, máximo 50), como `api-011` y `api-012`. La spec no nombra el parámetro (Q4 resuelta: se adopta).
- **D-M12 Opinión ausente en el reenvío.** Propuesta: si no se envía `opinion`, se conserva la guardada. La spec no lo dice (Q3 resuelta: se adopta).

### Riesgos

- **R1 Plazo corto (7 días).** La galería del portal tendrá pocos momentos con frecuencia (riesgo ya registrado en la spec). Es el comportamiento esperado; `web-010` muestra vacío sin rellenar.
- **R2 Privacidad de menores y acceso por URL.** Las fotos pendientes y rechazadas están en `media/memories/`, publicada por `/media` (RN-10 de la spec; ADR 0026, riesgo b). La API no devuelve la URL, pero el archivo es alcanzable si se conoce. Riesgo aceptado para pruebas; hay que revisarlo antes de cualquier uso en producción.
- **R3 Imágenes en git.** Lo versionado queda en el historial aunque se borre (ADR 0026, riesgos a y c; `api-013` RN-17). Solo datos de prueba (`api-013` CA-22).
- **R4 Lectura con efecto secundario.** `GET /api/v1/admin/memories/{id}` pasa a `in_review` (CA-08). Un prefetch o una caché del dashboard puede marcar una petición como En proceso sin revisarla. Mitigación: el dashboard no precarga detalles (`dashboard-008`); CA-09 garantiza que la segunda lectura no cambia nada.
- **R5 Concurrencia no probada en paralelo.** CA-10 y CA-25 se prueban de forma secuencial, como en `api-014` (R5). Un test de concurrencia real requiere procesos en paralelo sobre `arca_pruebas`; queda como deuda.
- **R6 Dependencia de `api-013` sin plan ni tasks.** Bloquea T-10, T-12, T-14 y T-19. Hasta que exista el disco `media`, la Fase 1 solo puede avanzar en T-03 a T-09, T-11, T-13 y T-15 a T-18 con fixtures en un disco falso.
- **R7 Dependencia de `api-012` sin plan ni tasks.** Solo bloquea T-26. La Fase 1 interna no depende de ella.
- **R8 Seeder compartido con `api-014`.** `memories.review` y `species.review` van en el mismo cambio de `RolesAndPermissionsSeeder`. Si los dos planes se implementan en PR distintos, hay que acordar quién hace el cambio y el otro solo añade su test (T-06). No se duplica.
- **R9 Archivos huérfanos.** Si el borrado falla después del commit (CA-29, CA-27 al reemplazar, CA-32), queda un archivo sin registro. Reintento manual, como en `api-014` (R7).
- **R10 Reenvío sin opinión.** Ambigüedad de CA-26 (Q3). Hasta confirmarla, se aplica D-M12.
- **R11 Correo verificado.** No consta que el token de visitante se emita solo con correo verificado (P6). Si no es así, T-20 añade la comprobación y el test de 403 `email_not_verified`.
- **R12 Texto de la casilla.** RN-08 y RN-23 son de referencia hasta la aprobación del zoológico (Pregunta 6 de la spec). No se publican en producción sin ese texto.
- **R13 Divergencias de documentos (no se corrigen aquí).**
  1. `api-010` CA-11 cita «`api-013` CA-12» para `published_image_path`. La referencia correcta es `api-013` CA-11 (aceptar). Corregir en la spec en otro cambio.
  2. `DBR-012` describe `MEMORIES_PUBLICATION_DAYS` como «90 propuesto». La decisión vigente es 7 (2026-11-12). Corregir en la DBR (BD).
  3. La guía `apps/api/docs/momentos-contrato-para-mobile.md` tiene ya marcadas sus divergencias D1 a D12 (ver su sección 7).
- **R14 Acoplamiento con `api-008`.** Se reutiliza `StripImageMetadataAction` desde `Actions/Admin/Content/`. Si `api-008` lo mueve, este plan se ajusta; no se cambia `api-008` desde aquí.
- **R15 Sin límite de tasa por IP o dispositivo.** La spec no lo define (riesgo de abuso señalado en la spec). Los límites por cuenta (una abierta, una cada 7 días) son los únicos. No se añade límite de tasa.
- **R16 Datos existentes en `arca_pruebas`.** Las tablas de DBR-012 se crearon vacías. Los tests usan fixtures propios y `DatabaseTransactions`, y no asumen tablas vacías.

### ADR

- ADR requerido para la Fase 1 y la Fase 2: ninguno nuevo. Riesgos de ADR 0026 y ADR 0027 aceptados (2026-11-12).
- Excepción de la Constitución V (D-M1): aceptada por Jonathan, en nombre del equipo, el 2026-11-13. No se crea ADR nuevo: la aceptación de Jonathan en nombre del equipo basta, igual que en `api-014`.
- Ningún ADR autoriza almacenamiento externo; no se propone.

### Alternativas consideradas

- Escribir el archivo antes de la transacción: descartado. Un 422 por límite dejaría un archivo sin registro (CA-23, CA-24 lo prohíben).
- Columna de estado de publicación derivado: descartado. El estado se deriva de `status` y `published_until` (RN-03, CA-31).
- Copiar el archivo al aceptar a una carpeta pública: descartado. `api-013` CA-11 lo prohíbe; ya está en `memories/`.
- Crear `BaseModel` ahora: descartado por decisión del usuario. Se revisa cuando el equipo decida la base común de modelos.

## Orden y aprobación

### Secuencia de implementación

Ver la lista ordenada de tareas en `apps/api/tasks/010-visitor-memory-requests.md`. Resumen:

1. Precondiciones: T-01 (solo lectura) y T-02 (puerta de `api-013`).
2. Fase 1, base: enums, modelos y scopes, configuración, permiso compartido (T-03 a T-06).
3. Fase 1, acceso y revisión: rutas, lista, apertura, imagen, plazo, aceptar, rechazar, archivo, auditoría, sin URL (T-07 a T-16).
4. Fase 1, cierre: capas y rutas (T-17).
5. Fase 2, envío: validación, almacenamiento, envío, límites (T-18 a T-21).
6. Fase 2, visitante: lista, reenvío, reglas de corrección (T-22 a T-24).
7. Bloqueado: CA-32 (T-25), hasta P9.
8. Integración pública: T-26, cuando `api-012` tenga plan y tasks (P8).
9. Cierre transversal: cobertura (T-27), infraestructura y documentación (T-28), verificación y entrega (T-29).

Fase 1 y Fase 2 pueden aprobarse y entregarse por separado. Fase 2 no depende de Fase 1 para T-18 y T-19, pero T-20 necesita T-04 (modelo) y T-19 necesita P2.

### Aprobaciones

| Rol | Quién | Estado |
|---|---|---|
| Responsable funcional de la spec | Jonathan (aprobación de la spec, 2026-11-12) | Aprobada |
| Responsable técnico del plan | Jonathan (responsable de backend) | Aprobado: Jonathan, responsable de backend, en nombre del equipo, 2026-11-13 |
| Equipo (solución técnica y Constitution Check) | Equipo | Aprobado: Jonathan, responsable de backend, en nombre del equipo, 2026-11-13 (P4; P5 aceptada como D-M1) |
| Responsable de BD (DBR-012 aplicada en `arca_pruebas`) | Víctor Adrián | Cumplida (P1). No hay cambios de esquema en este plan |
| Dependencia `api-013` (disco `media`) | Jonathan (responsable de `api-013`) | Parcial: plan y tasks aprobados el 2026-11-13; disco sin configurar (P2) |
| Dependencia `api-014` (seeder compartido, P3, y excepción V, P5) | Responsable de `api-014` | Cumplida (2026-11-13): el seeder lo modifica `api-014` T-07; excepción V aceptada como D-M1 |
| Dependencia `api-012` (lectura pública) | Jonathan | Cumplida el 2026-11-13 (P8, plan y tasks aprobados); no bloquea Fase 1 |
| Enmienda `api-004` y `mobile-004` (CA-32) | Aksel, tras avisar a sus responsables | No iniciada (P9) |
| Mapeo de fases | Usuario (confirma) | Aprobado: Jonathan, responsable de backend, en nombre del equipo, 2026-11-13 |

Evidencias requeridas al cerrar el plan: salida de `php artisan migrate:status` (solo lectura), enlace a la aprobación de `api-013`, salida de `php -m` con `gd`, enlace al PR con spec, plan y tasks, y la decisión sobre D-M1 (tomada el 2026-11-13).
