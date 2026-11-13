# 010 · visitor-memory-requests

- App dueña: `api`
- Apps/paquetes afectados: `api` (dueña de envío, corrección y reenvío, estados, archivo, revisión, publicación, vigencia, borrado de cuenta y auditoría); `mobile` (envío, corrección y «Mis momentos», spec `mobile-010`); `dashboard` (revisión para `zoo-admin`, spec `dashboard-008`); `web` (galería pública, spec `web-010`, a través de `api-012`); `packages/api-client` (métodos y tipos, sin lógica de negocio). Dependencia con divergencia pendiente: `api-004` (borrado de cuenta) y `mobile-004` (pantalla de borrado de cuenta); no se modifican desde esta spec.
- Estado: Aprobada (2026-11-12, Jonathan, responsable de backend). Aprobar no autoriza implementar: la implementación empieza cuando existan plan y tasks aprobados. Incluye la fase 2 (envío y listado del visitante), que implementará después quien lleve la app móvil (`mobile-010`, sigue en Borrador). DBR-012 está Lista para backend (aplicada en `arca_pruebas` el 2026-11-11). ADR 0026 y ADR 0027 están Aceptados (2026-11-12).
- Solicitante / responsable funcional: Aksel (borrador original del 2026-11-05). Respuestas del responsable: Jonathan (2026-11-10). Validación técnica/BD: Víctor Adrián (2026-11-11).
- Responsable de BD: Víctor Adrián. Requiere la DBR `docs/database/requests/DBR-012-visitor-memories.md` (Aprobada el 2026-11-11; aplicada en `arca_pruebas` el 2026-11-11; Lista para backend), que acompaña a esta spec y no la sustituye.
- Responsable backend: Jonathan.
- Aprobación funcional: Jonathan (responsable de backend), 2026-11-12. Aprobación de la spec completa, incluida la fase 2 (envío y listado del visitante); la firma funcional de Aksel, solicitante original, no consta en esta aprobación (ver «Revisión»).
- Aprobado por: Jonathan (responsable de backend), 2026-11-12. Validación técnica/BD previa: Víctor Adrián, 2026-11-11.

## Problema y contexto

En el portal público, la sección «Momentos para recordar» (`#galeria` en `apps/web/src/index.html`) muestra tres fotos fijas. No existe forma de que un visitante proponga una foto ni de que el zoológico la revise.

Esta spec define la petición y su ciclo de vida. Un visitante con cuenta y correo verificados envía desde la app móvil una imagen y, opcionalmente, una opinión corta. La Dirección (`zoo-admin`) la revisa en el dashboard. Si la acepta, la foto y la opinión se publican en la galería del portal durante un plazo. Si la rechaza, indica qué falló (la foto, la opinión o ambas) y el visitante puede corregir y reenviar la misma petición. Solo `zoo-admin` revisa: la Presidencia (`admin`) no tiene acceso (RN-07).

`api-008` cubre las imágenes de noticias y eventos que sube el personal. No es el mismo flujo: aquí la imagen llega de un visitante y pasa por revisión antes de publicarse. La validación de archivo y el retiro de metadatos sí se reutilizan (RN-05).

## Decisiones tomadas (2026-11-10)

Respuestas del responsable (Jonathan, 2026-11-10). Las que tenían «propuesta» dentro de la decisión quedaron confirmadas o ajustadas en «Decisiones tomadas (2026-11-11)».

- **Frecuencia (P2):** cada visitante puede enviar **un momento nuevo como máximo cada 7 días**. La ventana se cuenta desde la fecha de creación (`created_at`) de su última petición nueva (RN-17; CA-23). Se mantiene **una petición abierta a la vez** (RN-18; CA-24). La app comunica el tiempo restante con la fecha desde la que puede enviar otro: `meta.next_submission_at` de la lista del visitante y el error 429 (CA-06, CA-23). Reenviar una rechazada **no cuenta** para el límite (aprobado; Pregunta 2, 2026-11-11).
- **Decisión final por revisión (P3, P6):** cada decisión de `zoo-admin` es final para esa revisión. El motivo de rechazo admite hasta 500 caracteres (aprobado). Una rechazada **no es terminal**: el visitante puede corregir la foto y/o la opinión y reenviar la misma petición (RN-19; CA-26).
- **Motivos del rechazo (P6):** al rechazar, `zoo-admin` marca **una o más** opciones de lo que falló, con los valores `image` (la foto) y `content` (la opinión), además del motivo en texto (RN-20; CA-28). Si falla `image`, el reenvío exige una foto distinta a la rechazada; si falla `content`, la opinión debe cambiar (CA-27). El archivo rechazado se borra solo si falla `image` (CA-29; Pregunta 4, aprobada el 2026-11-11).
- **Publicación con plazo (P5):** al aceptar se calcula `published_until` = `published_at` + plazo de exhibición. Valor por defecto: **7 días** (decisión del usuario 2026-11-12, que sustituye los 90 días confirmados el 2026-11-11), configurable por `.env` (`MEMORIES_PUBLICATION_DAYS`) mientras no exista la gestión de ajustes del sistema (RN-21; CA-30; Pregunta 1 y «Decisiones tomadas (2026-11-12)»). Al vencer, la petición deja de mostrarse en el portal; **la fila no se borra** (CA-31). El visitante ve el aviso de cuánto tiempo estuvo o estará publicada (`mobile-010` CA-08). Retirar una foto antes del vencimiento es **fuera de alcance de esta versión** (aprobado en la Pregunta 1).
- **Borrado de cuenta (P4):** al eliminar su cuenta el visitante **elige** si se conservan o se eliminan sus momentos, con un aviso claro y los términos y condiciones (RN-22; CA-32). Lo que se desvincula o se borra está en «Datos, privacidad y auditoría» y en «Flujos y errores».
- **Términos y casilla de consentimiento (P7):** el texto de la casilla y los términos y condiciones los **redacta y aprueba el zoológico**. El texto de RN-23 es de referencia hasta esa aprobación. Se aceptan en el registro (`api-004`, divergencia pendiente) y en cada envío o reenvío con la casilla (RN-23).
- **Imágenes ya subidas (P11, `api-013` D-04):** confirmado por Jonathan: se vuelven a subir todas desde el dashboard antes de versionarlas en la carpeta `media/`.
- **Ruta pública (P12):** `GET /api/v1/memories`, decisión final. `api-012` usa ese nombre.
- **Galería del portal (P10):** la excepción de arquitectura del portal para la galería dinámica se registra en `docs/adr/0027-dynamic-public-memories-gallery.md` (Aceptado 2026-11-12), no como enmienda de `docs/adr/0024-web-static-portal-exception.md`.
- **Revisión en el dashboard (P13):** `zoo-admin` ve la imagen y la opinión antes de aceptar o rechazar. La imagen llega por ruta autenticada de la API, con proxy de mismo origen (`dashboard-008` CA-17). Es la decisión D-06 de `api-013` (antes pregunta 11).
- **Entrada en la app y selector de imágenes (P8, P9):** delegados al encargado de móvil tras la documentación. No se desarrollan aquí.

## Decisiones tomadas (2026-11-12)

Decisión del usuario (2026-11-12). Cambia el plazo de publicación de RN-21 y CA-30. El resto de la spec no cambia.

- **Plazo de exhibición (Pregunta 1, 2026-11-11):** las fotos de «Momentos para recordar» solo se muestran **1 semana** en el portal. El plazo pasa de 90 días a **7 días**: `published_until` = `published_at` + 7 días. Valor por defecto 7, configurable por `.env` (`MEMORIES_PUBLICATION_DAYS`), como antes. El sistema sigue fijando el plazo: ni el visitante ni el `zoo-admin` lo eligen por foto.
- **Sin retirada anticipada:** `zoo-admin` no retira una foto aceptada antes del vencimiento en esta versión. Al vencer, deja de aparecer en el portal; la fila y el archivo se conservan (CA-31).
- **Efecto en el resto de la spec:** el visitante ve el plazo en `published_until` (CA-06) y el dashboard lo muestra con `publication_days` (CA-08); no cambian sus reglas. Con un plazo tan corto, el portal puede tener pocos momentos con frecuencia (riesgos).
- **Historial:** los 90 días de «Decisiones tomadas (2026-11-10)», de «Decisiones tomadas (2026-11-11)» y de la Pregunta 1 se conservan como historial y quedan sustituidos por esta decisión.

## Decisiones tomadas (2026-11-11)

Respuestas del responsable y validación técnica/BD (Víctor Adrián, 2026-11-11). Las ocho preguntas de «Dependencias, riesgos y preguntas» quedan resueltas; se conservan como historial.

- **Pregunta 1 (plazo de publicación):** se confirman 90 días por defecto, configurables por `.env`, y que `zoo-admin` no retira una foto aceptada antes del vencimiento en esta versión. *(Plazo sustituido el 2026-11-12: 7 días; ver «Decisiones tomadas (2026-11-12)».)*
- **Pregunta 2 (frecuencia y reenvíos):** el reenvío de una rechazada no cuenta para el límite semanal; una rechazada cuenta como abierta y bloquea envíos nuevos hasta corregirse; no hay límite de reenvíos en v1.
- **Pregunta 3 (archivos de vencidas):** al vencer se conserva el archivo, sin borrado físico de la fila.
- **Pregunta 4 (archivo al rechazar):** se borra el archivo rechazado solo si el motivo incluye `image`; si es solo `content`, se conserva.
- **Pregunta 5 (borrado de cuenta):** se autoriza modificar `DELETE /api/v1/visitor/me` (`api-004`) y la pantalla de `mobile-004` para añadir `memories_policy`; se avisa a sus responsables antes de aprobar.
- **Pregunta 6 (texto de casilla y términos):** lo redacta y aprueba el zoológico; hasta entonces RN-08 y RN-23 son de referencia y no se publican en producción.
- **Pregunta 7 (opinión):** **opcional** (decisión 2026-11-11). El visitante puede subir solo el recuerdo; si la envía, es texto plano de 1 a 300 caracteres. La API devuelve `opinion` en NULL cuando no se envía. No se acepta una opinión de más de 300 caracteres.
- **Pregunta 8 (peticiones abiertas de cuentas eliminadas):** las peticiones en revisión de una cuenta eliminada con `keep` se revisan igual, sin autor.

Estas decisiones actualizan CA-01, CA-03, RN-06 y «Datos, privacidad y auditoría». La DBR-012 las refleja: `opinion` NULL y `rejected_image`/`rejected_content` booleanos.

## Objetivos

- Guardar una petición por visitante verificado, con imagen, opinión opcional y consentimiento, en estado `submitted`.
- Permitir que `zoo-admin` revise, acepte o rechace con motivo y campos marcados, y dejar constancia de cada revisión.
- Permitir que el visitante corrija y reenvíe una petición rechazada, sin perder el historial.
- Publicar en el portal, a través de `api-012`, solo las peticiones aceptadas y vigentes.
- Que la imagen de una petición no aceptada nunca tenga URL en las respuestas de la API.
- Que el visitante sepa cuánto tiempo estará publicada su foto y cuándo puede enviar otra.

## Fuera de alcance

- Cancelar una petición por parte del visitante, también cuando está en `submitted` o `rejected`.
- Editar la petición después del envío, salvo el reenvío de una rechazada (RN-19).
- Varias imágenes por petición, álbumes, recorte o miniaturas en el servidor.
- Cola offline: sin red no se guarda ni se encola nada.
- Retirar de la galería una foto ya publicada antes de su vencimiento (pregunta 1). Si se necesita, se trata en una spec posterior, que debe resolverse antes de publicar en producción.
- Límite de número de reenvíos por petición (ver pregunta 2).
- Avisar al visitante por correo o notificación push. La app consulta su lista. La «notificación» de aceptación es el estado y el texto de la app.
- Moderación automática de imágenes o de texto.
- Captura con cámara dentro de la app (lo decide `mobile-010`).
- Lectura pública de las aceptadas: `api-012`.
- Pantalla de revisión: `dashboard-008`.
- Borrado físico de cualquier fila.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Visitante con correo verificado | Enviar una petición; ver sus peticiones, su estado, su motivo y su plazo; corregir y reenviar una rechazada | Sesión Bearer de visitante (`api-004`) y correo verificado |
| `zoo-admin` (Dirección) | Revisar: abrir el detalle, ver la imagen, aceptar o rechazar con motivo y campos marcados | `memories.review` (solo este rol) y 2FA confirmado, porque las rutas viven bajo `/api/v1/admin` (`api-007` CA-25) |
| `admin` (Presidencia) | Sin acceso a la revisión; recibe 403 | Ninguno. Se excluye de forma explícita de `memories.review` (RN-07) |
| `executive`, `cashier`, `veterinarian` | Sin acceso a la revisión; reciben 403 | Ninguno |
| Visitante sin sesión o con correo sin verificar | No envía, no corrige ni consulta | — |
| Público anónimo | Ve solo las peticiones aceptadas y vigentes | `api-012` (sin permisos) |
| Responsable de BD | Crear, probar y aplicar la migración tras una DBR aprobada | Flujo DBR (`docs/database/`) |

## Historias de usuario

- Como visitante verificado, quiero enviar una foto mía del zoológico con una opinión corta opcional, para que el zoológico decida si entra en «Momentos para recordar».
- Como visitante, quiero ver si mi petición está enviada, en proceso, aceptada o rechazada y, si fue rechazada, qué hay que corregir y por qué.
- Como visitante cuya foto fue rechazada, quiero corregir solo lo que el zoológico señaló y reenviar la misma petición, para no empezar de cero.
- Como visitante, quiero saber cuánto tiempo estará publicada mi foto y desde cuándo puedo enviar otra.
- Como `zoo-admin`, quiero abrir cada petición, ver la foto y la opinión, y aceptarla o rechazarla con motivo, para que la galería muestre solo lo que autoricé.
- Como visitante del portal, quiero ver los momentos vigentes, sin que aparezcan datos personales.

## Criterios de aceptación

### Envío (visitante)

- **CA-01 (envío correcto):** Dado un visitante con sesión y correo verificado, sin petición abierta y fuera del límite semanal (CA-23, CA-24), cuando envía `POST /api/v1/visitor/memories` en multipart con un archivo JPG, PNG o WebP de hasta 5 MB, una opinión opcional de 1 a 300 caracteres y la casilla de consentimiento marcada, entonces responde 201, guarda el archivo en la carpeta `media/memories/` (`api-013`), guarda `consent_at` y `terms_version`, crea la petición en `submitted` con `resubmitted_count` en 0 y responde con `id`, `status` (`submitted`), `opinion`, `created_at` y `resubmitted_count`, sin ninguna URL de la imagen.
- **CA-02 (archivo inválido):** Dado un archivo que no es JPG, PNG o WebP, que pesa más de 5 MB o que no se puede procesar, cuando se envía, entonces responde 422 con el mensaje en español en `errors.image`, no escribe ningún archivo y no crea la petición. Aplica también a la imagen de un reenvío (CA-27).
- **CA-03 (opinión inválida):** Dada una opinión de más de 300 caracteres, cuando se envía, entonces responde 422 en `errors.opinion`, sin archivo ni petición. La opinión vacía es válida (Pregunta 7, 2026-11-11); si se envía, debe tener entre 1 y 300 caracteres.
- **CA-04 (consentimiento):** Dado un envío o un reenvío sin la casilla de consentimiento marcada, cuando se envía, entonces responde 422 en `errors.consent` con el mensaje «Confirma que tienes permiso para compartir esta foto y que aceptas los términos.», sin archivo ni petición. La casilla es obligatoria también en cada reenvío (RN-08, RN-23).
- **CA-05 (sesión):** Dado un envío sin sesión, responde 401. Dado un envío con correo sin verificar, responde 403 `email_not_verified` (`api-004` CA-04). En ambos casos no se guarda archivo ni petición.
- **CA-06 (lista propia):** Dado un visitante con peticiones propias y ajenas, cuando consulta `GET /api/v1/visitor/memories`, entonces ve solo las suyas, de la más reciente a la más antigua (máximo 50, RN-11), con `id`, `status`, `opinion`, `created_at`, `reviewed_at` y `resubmitted_count`. Si la petición está `rejected`, incluye `rejection_reason` y `rejected_fields`. Si está `accepted`, incluye `published_until` e `is_published` (`true` mientras `published_until` sea posterior a ahora). En `meta` incluye `can_submit`, `next_submission_at` (fecha desde la que puede enviar, o `null` si puede ahora) y `open_request_id` (id de la petición abierta, o `null`). No ve nombres, correos ni datos del revisor.

- **CA-23 (límite semanal):** Dado un visitante cuya última petición nueva (`created_at`, incluidas las rechazadas y las ya revisadas) se creó hace menos de 7 días, cuando envía una petición nueva, entonces responde 429 con el código `weekly_limit_reached`, `next_submission_at` (esa fecha más 7 días, en ISO 8601 UTC), el mensaje «Solo puedes enviar un momento por semana. Podrás enviar otro a partir del {fecha y hora}.» (en la zona de `APP_TIMEZONE`) y la cabecera `Retry-After` en segundos. No guarda archivo ni petición. Exactamente 7 días después, el envío es válido. Los reenvíos no abren ni cuentan la ventana (RN-17). Un test fija el reloj con `Carbon::setTestNow`.
- **CA-24 (una petición abierta):** Dado un visitante con una petición en `submitted`, `in_review` o `rejected`, cuando envía una petición nueva, entonces responde 422 en `errors.open_request` con el mensaje «Ya tienes una petición abierta. Espera la revisión o corrígela si fue rechazada.» y `open_request_id`; no guarda archivo ni petición. Orden de comprobación: sesión (CA-05), campos (CA-02 a CA-04), petición abierta (CA-24) y, por último, límite semanal (CA-23).
- **CA-25 (envíos simultáneos):** Dados dos envíos simultáneos de un visitante sin petición abierta y sin envío en los últimos 7 días, cuando ocurren, entonces solo uno crea petición (201); el otro responde 422 (CA-24) o 429 (CA-23), según el orden en que se resuelva el bloqueo de la fila del visitante (RN-12). No queda ningún archivo sin registro (RN-16).

### Corrección y reenvío (visitante)

- **CA-26 (reenvío de rechazada):** Dada una petición `rejected` del visitante, cuando llama `POST /api/v1/visitor/memories/{id}/resubmit` con opinión opcional, casilla de consentimiento y, si la regla de CA-27 lo exige, una imagen válida, entonces responde 200, la petición pasa a `submitted`, `resubmitted_count` aumenta en 1, `rejection_reason` y `rejected_fields` quedan en NULL (en la base, `rejected_image` y `rejected_content` vuelven a 0), `consent_at` y `terms_version` se actualizan, el historial (`visitor_memory_reviews`) conserva la decisión anterior, Activitylog registra `resubmitted` y el reenvío no cuenta para el límite semanal (RN-17). Si la petición está en `submitted`, `in_review` o `accepted`, responde 422 en `errors.status` con «Solo puedes corregir una petición rechazada.» y no cambia nada. Si la petición no existe o pertenece a otra cuenta, responde 404 «Petición no encontrada.».
- **CA-27 (reglas de corrección según el motivo):** Dada una petición rechazada, cuando se reenvía:
  - si `rejected_fields` incluye `image`, el reenvío exige un archivo nuevo y válido (CA-02). Si su SHA-256 coincide con `image_sha256`, responde 422 en `errors.image` con «Sube una foto distinta a la que fue rechazada.»;
  - si `rejected_fields` incluye `content`, la opinión (sin espacios al inicio ni al final) debe ser distinta de la guardada. Si no, responde 422 en `errors.opinion` con «Cambia la opinión antes de reenviarla.»;
  - la opinión es opcional (Pregunta 7); si el rechazo incluye `content`, debe enviarse y cumplir la regla anterior; la casilla de consentimiento es obligatoria (CA-04);
  - si solo incluye `content`, la imagen es opcional; si se envía, sustituye a la anterior y el archivo anterior se borra después del commit (RN-19).

  En todos los 422 de esta regla no cambia nada.

### Revisión (zoo-admin)

- **CA-07 (lista de revisión):** Dado un `zoo-admin` con `memories.review`, cuando llama `GET /api/v1/admin/memories`, entonces recibe la lista paginada (10 por defecto, máximo 50; `page` por defecto 1) con `meta` `{page, limit, has_more}`, ordenada por `created_at` descendente. Puede filtrar por `status` (`submitted`, `in_review`, `accepted`, `rejected`). Un `status` o `page` no válidos responden 422 en español.
- **CA-08 (apertura y En proceso):** Dada una petición en `submitted`, cuando `zoo-admin` llama `GET /api/v1/admin/memories/{id}`, entonces la petición pasa a `in_review`, Activitylog registra `in-review` con el actor y la respuesta (200) incluye `id`, `status`, `opinion`, `created_at`, `resubmitted_count`, `rejection_reason`, `rejected_fields`, `reviewed_at`, `published_until`, `is_published` y `publication_days` (plazo vigente de RN-21, para que el dashboard lo muestre antes de aceptar). La respuesta no incluye ninguna URL de la imagen. La imagen se pide a `GET /api/v1/admin/memories/{id}/image` (ruta `admin.memories.image`), que requiere `memories.review` y 2FA, y devuelve el binario con tipo `image/*` (`api-013` CA-10).
- **CA-09 (apertura repetida):** Dada una petición en `in_review`, `accepted` o `rejected`, cuando se abre el detalle, entonces el estado no cambia y no se registra un segundo `in-review`.
- **CA-10 (apertura simultánea):** Dadas dos aperturas simultáneas de una petición en `submitted`, cuando ocurren, entonces solo una la pasa a `in_review`, se registra un único `in-review` y ambas responden 200 con el mismo estado.
- **CA-11 (aceptar):** Dada una petición en `submitted` o `in_review` cuya imagen existe en el almacenamiento, cuando `zoo-admin` llama `POST /api/v1/admin/memories/{id}/accept`, entonces pasa a `accepted`; guarda `reviewed_by`, `reviewed_at`, `published_at` y `published_until` (RN-21); guarda `published_image_path` según `api-013` CA-12; crea una fila de historial con decisión `accepted`; deja la imagen y la opinión disponibles para `api-012` mientras esté vigente; registra `accepted` en Activitylog y responde 200 con `published_until`. Si el archivo no existe en el almacenamiento, responde 422 en `errors.image` con «La imagen no está disponible; no se puede aceptar.» y no cambia nada.
- **CA-12 (rechazar con motivo y campos):** Dada una petición en `submitted` o `in_review`, cuando `zoo-admin` llama `POST /api/v1/admin/memories/{id}/reject` con `rejection_reason` y `rejected_fields` válidos (CA-28), entonces pasa a `rejected`; guarda `reviewed_by`, `reviewed_at`, el motivo y los campos marcados; crea una fila de historial con decisión `rejected`; no publica nada; aplica la regla de archivo de CA-29; registra `rejected` en Activitylog y responde 200.
- **CA-13 (decisión final por revisión):** Dada una petición en `accepted`, cuando se intenta aceptarla o rechazarla, entonces responde 422 «Esta petición ya fue revisada.». Dada una petición en `rejected`, cuando se intenta aceptarla o rechazarla, entonces responde 422 «Esta petición está rechazada y espera la corrección del visitante.». En ambos casos no cambia nada (RN-02, RN-12).
- **CA-14 (acceso por rol):** Dado un usuario de personal sin `memories.review` (`admin`, `executive`, `cashier` o `veterinarian`), cuando llama cualquier ruta `admin/memories*`, entonces responde 403 y la petición no cambia. Una prueba confirma que `admin` recibe 403.
- **CA-15 (visitante en rutas de personal):** Dada una sesión de visitante, cuando llama cualquier ruta `admin/memories*`, entonces responde 401 o 403 sin revelar datos.
- **CA-16 (seeder):** Dado `RolesAndPermissionsSeeder` ejecutado, cuando se comprueba, entonces `memories.review` existe y lo tiene solo `zoo-admin`. `admin` lo tiene excluido de forma explícita, no por omisión, y `executive`, `cashier` y `veterinarian` no lo tienen.
- **CA-28 (motivos del rechazo):** Dado un `zoo-admin` que rechaza, cuando envía `rejection_reason` (de 1 a 500 caracteres) y `rejected_fields` (lista de uno o dos valores únicos, de `image` y `content`), entonces guarda ambos. Sin motivo, con más de 500 caracteres, sin campos, con un valor fuera de `image` y `content` o con valores repetidos, responde 422 en `errors.rejection_reason` o `errors.rejected_fields` y no cambia nada.
- **CA-29 (archivo al rechazar):** Dada una petición rechazada cuyo motivo incluye `image`, cuando se confirma el rechazo, entonces el archivo se borra del almacenamiento después del commit (`api-013` CA-12 y CA-18), `image_path` queda en NULL y `image_sha256` se conserva para la regla de CA-27. Dada una petición rechazada solo con `content`, cuando se confirma, entonces el archivo se conserva para la corrección y `image_path` no cambia. Si el borrado falla después del commit, la petición queda rechazada, el fallo se registra en el log y el archivo queda como huérfano (riesgos).

### Publicación, vigencia y privacidad

- **CA-17 (sin publicación antes de aceptar):** Dada una petición que no está en `accepted` (`submitted`, `in_review` o `rejected`), cuando se consulta la lista pública de `api-012`, cualquier respuesta de la API o la URL de su imagen, entonces no aparece en la lista, ninguna respuesta incluye `image_url` ni una ruta de la imagen, y la imagen no se entrega por URL pública desde la API.
  - **Excepción de la carpeta `media/` (registrada el 2026-11-10):** el archivo está en `media/memories/`, que el servidor publica por `/media`. Si alguien conoce la URL del archivo, puede verlo. La barrera es la API (`api-013` RN-16; ADR 0026, riesgo b). La comprobación se hace sobre las respuestas de la API.
- **CA-18 (aceptada publicada):** Dada una petición aceptada y vigente (`published_until` posterior a ahora), cuando se consulta `GET /api/v1/memories` (`api-012`), entonces aparece con su imagen y su opinión, y la respuesta no incluye datos del visitante ni del revisor.
- **CA-19 (auditoría sin binario):** Dada una revisión, un reenvío o una corrección de motivos (`in-review`, `accepted`, `rejected`, `resubmitted`), cuando se registra en Activitylog, entonces incluye actor, acción e identificador de la petición (y, en `rejected`, los campos marcados), y no incluye el binario de la imagen ni la ruta absoluta del archivo.
- **CA-20 (sin borrado físico):** Dados los modelos `VisitorMemory` y `VisitorMemoryReview`, cuando se revisan, entonces extienden `BaseModel` y usan SoftDeletes. Ninguna acción de esta spec borra filas físicamente, incluido el borrado de cuenta (CA-32). Los archivos sí se borran del almacenamiento en los casos de CA-27, CA-29 y CA-32, y el borrado queda registrado.
- **CA-30 (plazo de publicación):** Dada la configuración `MEMORIES_PUBLICATION_DAYS` (valor por defecto 7 días, decisión del 2026-11-12), cuando `zoo-admin` acepta una petición, entonces `published_until` es `published_at` más ese número de días, se guarda y la respuesta lo devuelve. Cambiar la configuración después no altera las peticiones ya aceptadas. Con un valor que no sea un entero mayor o igual que 1, la aceptación responde 500, registra un error de configuración y no cambia nada.
- **CA-31 (vencimiento):** Dada una petición `accepted` con `published_until` anterior o igual a ahora, cuando se consulta:
  - `api-012`: no aparece en la lista ni cuenta en `meta.has_more`, y no tiene `image_url`;
  - el visitante (CA-06): `is_published` es `false` y ve la fecha de vencimiento;
  - el `zoo-admin` (CA-08): ve `published_until` y que la publicación ya venció.

  El estado sigue siendo `accepted`, la fila no se borra y el vencimiento no escribe en Activitylog, porque es un cálculo por fecha. El archivo se conserva (pregunta 3).

### Cuenta del visitante

- **CA-32 (borrado de cuenta con elección):** Dado un visitante que borra su cuenta mediante `api-004` CA-14 (con el parámetro `memories_policy` que se propone en la divergencia de «Dependencias»), cuando tiene peticiones de cualquier estado, incluidas las eliminadas lógicamente:
  - sin `memories_policy`, o con un valor distinto de `keep` o `delete`, responde 422 en `errors.memories_policy` y no borra nada;
  - con `keep`: todas sus filas quedan con `visitor_id` en NULL; ninguna se borra; las aceptadas siguen publicadas hasta su vencimiento, sin nombre ni datos de la cuenta; los archivos no cambian; las peticiones abiertas siguen en la revisión (pregunta 8); Activitylog registra `visitor-memories-policy-applied` con la elección y el número de filas;
  - con `delete`: todas sus filas reciben `deleted_at` y `visitor_id` en NULL; dejan de aparecer en `api-012` y en la revisión; los archivos se borran después del commit (con commit del equipo, `api-013` CA-18); Activitylog registra la elección y el número de filas.

  Sin peticiones, el campo no se pide y el borrado sigue como en `api-004`. En ambos casos, la eliminación física de la fila de `visitors` no falla por la clave foránea, porque `visitor_id` tiene `ON DELETE SET NULL` (DBR-012).

### Arquitectura y pruebas

- **CA-21 (capas y rutas):** Dado el código de la API, cuando se revisa, entonces los controladores son delgados y delegan en Form Requests y Actions (`SubmitVisitorMemoryAction`, `ResubmitVisitorMemoryAction`, `ListVisitorMemoriesAction`, `ListMemoriesForReviewAction`, `ShowMemoryForReviewAction`, `ShowMemoryImageForReviewAction`, `AcceptMemoryAction`, `RejectMemoryAction` y `ApplyVisitorMemoriesPolicyAction`), las respuestas usan Resources, y las rutas tienen nombre en inglés: `visitor.memories.store`, `visitor.memories.index`, `visitor.memories.resubmit`, `admin.memories.index`, `admin.memories.show`, `admin.memories.image`, `admin.memories.accept` y `admin.memories.reject`.
- **CA-22 (cobertura de pruebas):** Dada la suite PHPUnit, cuando se ejecuta contra `arca_pruebas`, entonces existe al menos un test que nombra cada CA-01 a CA-32, usa `DatabaseTransactions` y un disco de almacenamiento falso (`Storage::fake` con el disco que sale de la configuración), y no usa `RefreshDatabase` ni migraciones desde los tests.

## Reglas de negocio

- **RN-01 (estados):** Los estados persistidos son `submitted` (Enviada), `in_review` (En proceso), `accepted` (Aceptada) y `rejected` (Rechazada). La API devuelve el código. La interfaz los muestra en español.
- **RN-02 (transiciones):**
  - `submitted` pasa a `in_review` solo al abrir el detalle (CA-08).
  - `submitted` o `in_review` pasan a `accepted` o a `rejected` (CA-11, CA-12).
  - `rejected` pasa a `submitted` solo por el reenvío del visitante (CA-26).
  - `accepted` es final en esta versión. Vencer la publicación no cambia el estado (CA-31).
  - Cada decisión de `zoo-admin` es final para esa revisión (P3). Una nueva revisión empieza solo con un reenvío.
- **RN-03 (aceptar publica durante un plazo):** Aceptar publica la foto y la opinión en «Momentos para recordar» del portal, a través de `api-012`, desde la aceptación hasta `published_until`. Ninguna pantalla debe decir que una petición está publicada si no está aceptada o si ya venció (CA-08 de `mobile-010`, CA-31).
- **RN-04 (rechazo con motivo):** El motivo es obligatorio, de 1 a 500 caracteres (aprobado). El visitante lo ve en la app junto con los campos marcados (CA-07 de `mobile-010`).
- **RN-05 (archivo):** Solo se aceptan JPG (`.jpg`, `.jpeg`), PNG y WebP. Una imagen por petición, de máximo 5 MB (5 120 KB). Se aplican las mismas reglas que `api-008` RN-01 y RN-02 (`image` y `mimes` de Laravel). Antes de guardar se quitan los metadatos, como en `api-008` RN-13 y CA-14: las fotos de visitantes pueden llevar la ubicación GPS. Se guarda el SHA-256 del archivo ya limpio en `image_sha256`.
- **RN-06 (opinión):** La opinión es **opcional** (Pregunta 7, decisión 2026-11-11). Si se envía, es texto plano de 1 a 300 caracteres y se guarda como `NULL` cuando no se envía. Se guarda y se muestra como texto, nunca como HTML.
- **RN-07 (permisos):** `memories.review` se crea en `RolesAndPermissionsSeeder` y se asigna solo a `zoo-admin`. El seeder da hoy a `admin` todos los permisos salvo `tickets.create` y `tickets.cancel`, así que hay que excluir `memories.review` de `admin` de forma explícita. `executive`, `cashier` y `veterinarian` no lo reciben. Las sesiones de visitante siguen su propio régimen (`api-004`).
- **RN-08 (consentimiento):** La casilla de consentimiento es obligatoria en cada envío y en cada reenvío. Su fecha se guarda en `consent_at`. Texto de referencia, pendiente de aprobación por el zoológico (P7): «Confirmo que tengo permiso de las personas que aparecen en la foto y, si hay menores, de sus madres, padres o tutores, y que acepto los términos y condiciones de «Momentos para recordar».»
- **RN-09 (datos públicos):** Lo publicado contiene solo la imagen y la opinión. No se publica ningún nombre, correo, apodo, avatar, identificador de visitante ni de revisor.
- **RN-10 (imagen pendiente; excepción de la carpeta `media/`):** Mientras una petición no está aceptada, su imagen no se expone por la API pública. Solo se entrega por una ruta autenticada con `memories.review` y 2FA (CA-08). Al aceptar, la imagen queda disponible para la lectura pública mientras esté vigente. **Excepción:** pendientes y rechazadas viven en `media/memories/`, publicado por `/media`, y la barrera es la API (CA-17; `api-013` RN-16). Esta excepción se registra en la nota de almacenamiento y en CA-17. La implementación actual usa la carpeta local `apps/api/src/media/` (sin S3); la opción futura de almacenamiento privado en la nube está en `docs/propuestas/almacenamiento-objetos-s3.md` y la documentará Jonathan cuando el cliente la solicite.
- **RN-11 (listas):** La revisión pagina por defecto de 10 en 10, con máximo 50 (igual que `api-011` RN-05). La lista del visitante no pagina en esta versión y devuelve como máximo las 50 peticiones más recientes (aprobado el 2026-11-11).
- **RN-12 (concurrencia):** Cada cambio de estado es condicional: se aplica solo si el estado previo es el esperado (por ejemplo, el reenvío solo si está `rejected`). Gana una sola transición y las demás reciben 422 con el estado actual (CA-10, CA-13). La creación de una petición bloquea la fila del visitante para que no haya dos envíos abiertos a la vez (CA-25).
- **RN-13 (mensajes):** Los mensajes al visitante y al personal van en español; los identificadores, rutas y permisos van en inglés.
- **RN-14 (arquitectura):** Controladores HTTP delgados → Form Requests → Actions → API Resources. Los modelos `VisitorMemory` y `VisitorMemoryReview` extienden `BaseModel` y usan SoftDeletes (Constitución V). La regla de estados, de límites y de vigencia vive en las Actions y en la consulta del modelo, no en el controlador.
- **RN-15 (esquema):** Ningún cambio de esquema se hace sin DBR aprobada. Mientras la DBR esté en Borrador, no hay migración ni se programa contra la tabla.
- **RN-16 (fallo de guardado):** Si el disco falla al guardar, no se crea ni se cambia la petición ni queda un archivo sin registro (mismo criterio que `api-008` RN-04). En un reenvío que falla, la petición sigue `rejected` y el archivo anterior no se borra.
- **RN-17 (frecuencia):** Un visitante crea como máximo una petición nueva cada 7 días. La ventana se cuenta desde el `created_at` de su última petición nueva, incluidas las rechazadas, las revisadas y las eliminadas lógicamente. Los reenvíos no abren ni cuentan la ventana (aprobado; Pregunta 2, 2026-11-11). El servidor decide. La app muestra la fecha que devuelve la API.
- **RN-18 (una petición abierta):** Una petición está abierta si su estado es `submitted`, `in_review` o `rejected`. Un visitante solo puede tener una abierta. Una rechazada se puede corregir o quedar abierta; no hay cancelación en esta versión (riesgo).
- **RN-19 (corrección y reenvío):** Una rechazada no es terminal y no se borra. El visitante corrige y reenvía la misma petición. Al reenviar, el estado vuelve a `submitted`, `resubmitted_count` aumenta en 1 y se conserva el historial de revisiones (`visitor_memory_reviews`). El reenvío sigue las reglas de CA-27 según los campos marcados. No hay límite de reenvíos en esta versión (pregunta 2).
- **RN-20 (motivos del rechazo):** `rejected_fields` admite los valores `image` (la foto) y `content` (la opinión), uno o los dos. El motivo en texto es obligatorio (RN-04). Los valores van en inglés y la interfaz los traduce al español.
- **RN-21 (plazo de publicación):** Al aceptar se calcula `published_until` = `published_at` + `MEMORIES_PUBLICATION_DAYS` días. Valor por defecto: **7 días** (decisión del usuario 2026-11-12, que sustituye los 90 días de la Pregunta 1, aprobada el 2026-11-11). Mientras no se apruebe la gestión de ajustes del sistema (`apps/api/specs/010-configurable-system-settings.md`, Borrador), el plazo se configura por `.env` (Constitución I). El plazo es fijo para cada petición desde su aceptación (CA-30). La vigencia es visible si `published_until` es posterior a ahora (CA-31). Retirar antes del vencimiento no está permitido en esta versión.
- **RN-22 (borrado de cuenta):** Al borrar su cuenta, el visitante elige `keep` (conservar sin su cuenta) o `delete` (eliminar), con el aviso de la sección «Datos, privacidad y auditoría» (CA-32). En ambos casos `visitor_id` queda en NULL y no se borra ninguna fila físicamente.
- **RN-23 (términos y casilla):** El texto de la casilla y los términos y condiciones los redacta y aprueba el zoológico (P7). Hasta entonces, RN-08 es de referencia. Los términos se aceptan en el registro del visitante (`api-004`, divergencia pendiente) y en cada envío o reenvío, con la casilla de consentimiento. Se guardan `consent_at` y `terms_version` (versión configurada en `MEMORIES_TERMS_VERSION`) para poder demostrar qué se aceptó.

## Datos, privacidad y auditoría

- **Datos:** `visitor_id` (NULL tras la elección de borrado de cuenta), `status`, `opinion` (NULL si no se envía), imagen (`image_path`, privada hasta aceptar), `image_sha256`, `published_image_path`, `consent_at`, `terms_version`, `rejection_reason`, `rejected_image` y `rejected_content` (la API expone `rejected_fields` como lista), `resubmitted_count`, `reviewed_by`, `reviewed_at`, `published_at`, `published_until`, marcas de tiempo y `deleted_at`. Historial en `visitor_memory_reviews`. El detalle está en `docs/database/requests/DBR-012-visitor-memories.md`.
- **Clasificación:** dato personal, no clínico ni financiero. Constitución V se cumple con SoftDeletes. Ninguna acción de esta spec borra filas físicamente.
- **Menores:** las fotos pueden mostrar a menores dentro del zoológico. El visitante declara el consentimiento (RN-08) y el revisor decide antes de aceptar. La API quita los metadatos al guardar (RN-05).
- **Opinión libre:** el visitante puede escribir datos personales en la opinión. Lo que se publica es lo que aprueba el revisor, que debe leerla antes de aceptar. La API no filtra texto libre.
- **Retención de archivos:**
  - se borra el archivo de un rechazo por `image` (CA-29) y el archivo anterior de un reenvío que sustituye la foto (RN-19);
  - al vencer la publicación, el archivo y la fila se conservan (pregunta 3);
  - al borrar la cuenta, según la elección `keep` o `delete` (CA-32).
- **Borrado de cuenta (P4), lo que se desvincula o se borra:**
  - **Conservar (`keep`):** se desvinculan las filas (`visitor_id` en NULL). Se conservan la imagen, la opinión, el estado, el consentimiento y la revisión. Las aceptadas siguen publicadas hasta su vencimiento, sin nombre ni cuenta. Las abiertas siguen en revisión (pregunta 8). Las rechazadas quedan rechazadas porque el visitante ya no puede corregirlas.
  - **Eliminar (`delete`):** se marcan las filas con `deleted_at` y se desvinculan. Se borran los archivos de `media/memories/`. El borrado se confirma con commit, pero el contenido queda en el historial de git (`api-013` RN-17). Activitylog conserva el registro sin binario.
  - **Aviso y términos (propuesta de texto, aprobado por el zoológico):** «Antes de eliminar tu cuenta, decide qué pasa con tus momentos. Si los conservas, sin tu cuenta, los aceptados seguirán en "Momentos para recordar" hasta su fecha de vencimiento, y los que estén en revisión seguirán con el zoológico, pero ya no podrás corregirlos. Si los eliminas, se quitan de la galería y del almacenamiento. Esta decisión no se puede deshacer. Lee los términos y condiciones de "Momentos para recordar" antes de elegir.» La elección no tiene opción por defecto: el visitante debe marcar una de las dos.
- **Auditoría:** Activitylog registra `in-review`, `accepted`, `rejected`, `resubmitted` y `visitor-memories-policy-applied` con actor (o la cuenta, según el caso) e identificador (CA-19). No guarda el binario ni la ruta absoluta. El historial de decisiones queda en `visitor_memory_reviews`.
- **Configuración (`.env`):** `MEMORIES_PUBLICATION_DAYS` (7 días por defecto, decisión del 2026-11-12), `MEMORIES_TERMS_VERSION`, y las de almacenamiento de `api-013` (`PUBLIC_MEDIA_DISK`, `PRIVATE_MEDIA_DISK`, `MEDIA_PUBLIC_URL`). Requiere `php artisan storage:link` (`api-013` CA-17).

## Flujos y errores

1. **Envío:** el visitante elige una imagen en la app, escribe la opinión (opcional), marca el consentimiento y envía. La API valida (CA-01 a CA-05), comprueba la petición abierta (CA-24) y el límite semanal (CA-23), guarda la imagen en privado y crea la petición en `submitted`.
2. **Revisión:** `zoo-admin` abre la lista con filtro por estado. Al abrir una petición en `submitted`, pasa a `in_review` (CA-08). Ve la foto y la opinión antes de decidir (`dashboard-008`). Después acepta (CA-11) o rechaza con motivo y campos marcados (CA-12, CA-28).
3. **Rechazada y corrección:** la app muestra el motivo y los campos marcados (CA-07 de `mobile-010`). El visitante corrige lo marcado y reenvía (CA-26, CA-27). El reenvío vuelve a `submitted` y entra de nuevo en la revisión.
4. **Publicación y vencimiento:** al aceptar, la petición aparece en la lectura pública de `api-012` hasta `published_until` (CA-18). Después deja de mostrarse (CA-31), sin borrarse.
5. **Borrado de cuenta:** el visitante elige `keep` o `delete` (CA-32) antes de que `api-004` borre la cuenta.
6. **Consulta del visitante:** la app lista sus peticiones con su estado, su motivo, su plazo y la fecha desde la que puede enviar otra (CA-06).

Errores previstos:
- 401 sin sesión de visitante o de personal.
- 403 con `email_not_verified`, o sin `memories.review`.
- 404 «Petición no encontrada.» si la petición no existe o pertenece a otra cuenta.
- 404 «La imagen ya no está disponible.» en la ruta de imagen si el archivo no existe.
- 422 en `errors.image`, `errors.opinion`, `errors.consent`, `errors.rejection_reason`, `errors.rejected_fields`, `errors.memories_policy`, `errors.open_request` o `errors.status`. Mensajes: «Esta petición ya fue revisada.», «Esta petición está rechazada y espera la corrección del visitante.», «Solo puedes corregir una petición rechazada.», «Ya tienes una petición abierta. Espera la revisión o corrígela si fue rechazada.».
- 429 `weekly_limit_reached` con `next_submission_at` y `Retry-After` (CA-23).
- 413 o 415 de la capa HTTP por límites del servidor. La app los muestra con el mismo mensaje de tamaño o formato (ver `infra/README.md`).
- 5xx: no se crea ninguna petición si el archivo no se guardó (RN-16).

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:**
  - `api-004`: sesión de visitante y correo verificado (CA-04, CA-05). **Divergencia pendiente:** para el borrado de cuenta de CA-32, `DELETE /api/v1/visitor/me` (CA-14 y RN-10 de `api-004`) necesita el parámetro `memories_policy` (`keep` o `delete`), obligatorio solo si el visitante tiene peticiones, y la aceptación de los términos en el registro. No se modifica desde esta spec; ver pregunta 5.
  - `api-007`: rutas bajo `/api/v1/admin`, 2FA (CA-25) y Activitylog (CA-26).
  - `api-008`: validación de imagen, retiro de metadatos y disco público.
  - `api-013` (Aprobada 2026-11-12) y ADR 0026 (Aceptado 2026-11-12): almacenamiento local en la carpeta `media/` para pruebas; S3/nube es opción futura y Jonathan la documentará cuando el cliente la solicite. Pendientes, aceptadas y rechazadas viven en `media/`; excepción de esa carpeta (RN-10, CA-17). Ver «Nota de almacenamiento».
  - `api-011`: CORS por ambiente y límites de paginación.
  - `api-012`: lectura pública de las aceptadas y vigentes (depende de esta spec).
  - `apps/api/specs/010-configurable-system-settings.md` (ajustes del sistema, Borrador, sin aprobar y sin DBR aplicada): cuando se apruebe, el plazo de RN-21 puede pasar de `.env` a ajustes.
  - DBR-012 (Aprobada el 2026-11-11; aplicada en `arca_pruebas` el 2026-11-11; Lista para backend; `docs/database/requests/DBR-012-visitor-memories.md`), que depende de DBR-001 y DBR-003.
  - `dashboard-008`, `mobile-010` y `web-010` son consumidores. `web-010` usa ADR 0027 (Aceptado 2026-11-12).
  - No hay dependencia nueva de PHP. Un almacenamiento externo requeriría ADR propio (opción futura en `docs/propuestas/almacenamiento-objetos-s3.md`).
- **Infraestructura (`infra/README.md`):** el mismo PR debe anotar `storage:link` (enlace `public/media`), los límites de subida, el seeder de permisos con `memories.review`, y las variables `MEMORIES_PUBLICATION_DAYS` y `MEMORIES_TERMS_VERSION`. **Pendiente:** `infra/README.md` no se edita desde esta documentación.
- **Divergencias detectadas (pendientes, no corregidas aquí):**
  1. `BaseModel` no existe en `apps/api/src/app` (lo confirma `apps/api/specs/010-configurable-system-settings.md`). Las specs lo exigen (RN-14, CA-20, Constitución V). Hay que crearlo o decidir otra base antes de implementar.
  2. `api-004` CA-14 y RN-10, y `mobile-004` CA-10 y RN-07: el borrado de cuenta debe pedir `memories_policy` (CA-32). Son de otras specs; pregunta 5.
  3. `api-004` CA-04 y la pantalla de registro: deben incluir la aceptación de términos (RN-23).
  4. `docs/database/requests/README.md` dice que las DBR se crean desde `../templates/change-request.md`, y esa plantilla no existe en `docs/templates/`.
  5. `docs/adr/README.md`: el índice lista dos entradas «0023» y la entrada de «Recorrido guiado 3D» apunta a un número que no coincide con su archivo (`0025-mobile-ar-3d-camera-threejs.md`). No se corrige aquí.
- **Riesgos:**
  - Fotos de menores sin verificación de edad: la casilla es una declaración del visitante; la barrera real es el revisor.
  - Opinión con datos personales que se publicaría al aceptar.
  - Confundir «aceptada» con «vigente»: la aceptación da un plazo (RN-21) y el visitante debe verlo.
  - Confundir «aceptada» con «retirada»: no hay retirada anticipada en esta versión (pregunta 1).
  - Plazo corto (7 días, decisión del 2026-11-12): la galería del portal tendrá pocos momentos con frecuencia. Es el comportamiento esperado; `web-010` muestra el vacío o un solo momento sin rellenarlos.
  - Visitante bloqueado: una rechazada que nunca se corrige impide enviar otra, porque no hay cancelación (RN-18). Riesgo aceptado con la pregunta 2.
  - Carga de revisión: los reenvíos no tienen límite ni cuentan para la frecuencia (pregunta 2).
  - Abuso o spam: el límite semanal y la petición abierta limitan los envíos por cuenta, pero no por dispositivo ni por IP (esta spec no define límite de tasa por IP).
  - Archivos huérfanos al rechazar por `image`, al reemplazar o al borrar la cuenta, si el borrado falla después del commit (CA-29, CA-32).
  - Vencidas que siguen accesibles por URL en la carpeta `media/` (`api-013` RN-16). Ver pregunta 3.
  - El disco local no se comparte entre servidores (heredado de `api-008`).
  - Cuenta eliminada con elección `keep`: las peticiones abiertas se revisan sin autor (pregunta 8).
- **Preguntas resueltas (2026-11-11; se conservan como historial):** todas quedaron resueltas en «Decisiones tomadas (2026-11-11)».
  1. **Plazo de publicación:** ¿se confirma **90 días** por defecto (RN-21), configurable por `.env`? ¿Se confirma que el zoo-admin **no** puede retirar una foto aceptada antes del vencimiento en esta versión? Resuelta: sí a ambas (Pregunta 1). Actualización 2026-11-12: el plazo por defecto pasa de 90 a 7 días (ver «Decisiones tomadas (2026-11-12)»); la retirada sigue sin permitirse. La retirada manual sigue como pregunta abierta para una spec posterior, que debe resolverse antes de producción.
  2. **Frecuencia y reenvíos:** ¿un reenvío de rechazada **no** cuenta para el límite semanal? ¿Una petición rechazada cuenta como **abierta** y bloquea nuevos envíos hasta que se corrija? ¿Hay límite de reenvíos por petición? Resuelta: reenvío no cuenta; rechazada cuenta como abierta; sin límite de reenvíos en v1 (Pregunta 2).
  3. **Archivos de vencidas:** ¿al vencer la publicación se conserva el archivo (sin mostrarlo) o se borra? Resuelta: se conserva en v1, sin borrado físico de la fila (Pregunta 3).
  4. **Borrado del archivo según el motivo:** ¿se aprueba borrar el archivo rechazado solo si el motivo incluye `image` (CA-29) y conservarlo si es solo `content`? Resuelta: sí (Pregunta 4).
  5. **Cambio en el borrado de cuenta:** ¿se autoriza modificar el contrato de `DELETE /api/v1/visitor/me` (`api-004` CA-14 y RN-10) y la pantalla de borrado de `mobile-004` para añadir `memories_policy` y la aceptación de términos en el registro? Resuelta: sí, avisando a los responsables de `api-004` y `mobile-004` antes de aprobar (Pregunta 5).
  6. **Texto de la casilla y de los términos:** ¿quién en el zoológico aprueba el texto de RN-08, RN-23 y el aviso de borrado de cuenta, y en qué plazo? Resuelta: lo redacta y aprueba el zoológico; hasta entonces el texto es de referencia y no se publica en producción (Pregunta 6).
  7. **Opinión (Pregunta 7):** ¿la opinión es obligatoria (1 a 300 caracteres)? Resuelta el 2026-11-11: **opcional**; si se envía, 1 a 300 caracteres (Pregunta 7; CA-01, CA-03, RN-06).
  8. **Peticiones abiertas de cuentas eliminadas:** ¿las peticiones en revisión de una cuenta eliminada con `keep` se revisan igual, sin autor? Resuelta: sí (Pregunta 8).

## Nota de almacenamiento (2026-11-11)

Almacenamiento actual: carpeta local del proyecto `apps/api/src/media/` (subcarpeta `memories/`), sin S3 ni servicio externo. La decisión de `api-013` D-01 a D-04 se mantiene para pruebas; `api-013` está Aprobada desde el 2026-11-12 (D-04 y D-06 pendientes de confirmación expresa) y no bloquea esta migración. S3/nube es opción futura: Jonathan la documentará cuando el cliente la solicite (`docs/propuestas/almacenamiento-objetos-s3.md`, ADR 0026 Aceptado 2026-11-12). Esta spec cambia el texto de RN-10 y CA-17 para registrar la excepción de la carpeta `media/`; los estados no cambian.

- **Disco (RN-10).** Pendientes, aceptadas y rechazadas viven en `media/memories/`, con `PUBLIC_MEDIA_DISK=media` y `PRIVATE_MEDIA_DISK=media`, publicado por `/media`. Al aceptar, `published_image_path` toma el valor de `image_path` y el archivo no se mueve. Al rechazar por `image`, se borra el archivo (`api-013` CA-12).
- **Excepción a RN-10 y CA-17:** la barrera es la API (ninguna respuesta incluye la URL de una imagen no aceptada, `api-013` RN-16), no el almacenamiento: el archivo es alcanzable si alguien conoce su URL (ADR 0026, riesgo b).
- **CA-08 (ruta autenticada):** la imagen en revisión se entrega por `admin.memories.image`, con `memories.review` y 2FA, como binario sin URL en el JSON (`api-013` CA-10). El dashboard la consume por proxy de mismo origen (`api-013` D-06).
- **Rechazo y reemplazo (CA-27, CA-29):** el archivo borrado se quita de `media/memories/` y el borrado se confirma con commit (`api-013` CA-18). El contenido queda en el historial de git (`api-013` RN-17; ADR 0026, riesgo c).
- **Infraestructura:** el checklist de `infra/README.md` debe incluir el flujo de commit de `memories/` y la advertencia de datos de prueba (`api-013` CA-20).

## Revisión

- Aprobadores y fecha: Jonathan (responsable de backend), 2026-11-12. Validación técnica/BD de Víctor Adrián, 2026-11-11.
- Estado: Aprobada (2026-11-12). Aprobar no autoriza implementar: la implementación empieza cuando existan plan y tasks aprobados.
- Alcance de la aprobación (2026-11-12): la spec completa, incluida la fase 2, que son el envío y la lista del visitante (CA-01 a CA-06, CA-23 a CA-27, según «Envío» y «Corrección y reenvío») y que consumirá la app móvil. Su implementación queda para después, a cargo de quien lleve `mobile-010`.
- Fuera de esta aprobación: la enmienda de `api-004` (CA-14 y RN-10) y de `mobile-004` (CA-10 y RN-07) para `memories_policy` y la aceptación de términos (CA-32; pregunta 5) sigue como dependencia separada. No queda aprobada aquí y exige avisar antes a sus responsables. `mobile-010` sigue en Borrador hasta su propia aprobación funcional, plan y tasks.
- Aprobado por: Jonathan (responsable de backend), 2026-11-12. La firma funcional de Aksel, solicitante original, no consta en esta aprobación. Validación técnica/BD previa: Víctor Adrián, 2026-11-11.
- Historial:
  - borrador del 2026-11-05 («Aceptar no publica», sin motivo ni opinión);
  - revisión del 2026-11-10 con las decisiones iniciales (opinión, consentimiento, En proceso automático, publicación al aceptar, motivo visible, `memories.review` solo para `zoo-admin`);
  - revisión del 2026-11-10 con las respuestas del responsable (frecuencia semanal, decisión final por revisión, rechazo con motivos, corrección y reenvío, plazo de publicación, borrado de cuenta con elección, términos y ruta pública);
  - validación técnica/BD del 2026-11-11: se aprueban las ocho respuestas (opinión opcional), se actualiza la DBR-012 (Aprobada, `opinion` NULL, `rejected_image`/`rejected_content`), se crea y aplica la migración en `arca_pruebas` sin errores, y la DBR-012 queda Lista para backend; queda pendiente la firma funcional de Aksel. La implementación de la API espera esa firma. El almacenamiento actual es la carpeta local del proyecto; S3/nube queda como opción futura que Jonathan documentará cuando el cliente la solicite. 2026-11-12: decisión del usuario que cambia el plazo de publicación de 90 a 7 días (RN-21, CA-30; sección «Decisiones tomadas (2026-11-12)»). Estado sin cambios en esa fecha (Borrador). 2026-11-12, aprobación (Jonathan, responsable de backend): spec Aprobada, incluida la fase 2 (envío y lista del visitante); la firma funcional de Aksel no consta; enmienda de `api-004`/`mobile-004` sin aprobar.
- Evidencia/enlaces: `apps/web/src/index.html` (sección `#galeria`, «Momentos para recordar»), `apps/mobile/specs/010-visitor-memory-requests.md`, `apps/dashboard/specs/008-memory-moderation.md`, `apps/web/specs/010-dynamic-memories.md`, `apps/api/specs/012-public-memories-read.md`, `apps/api/specs/013-object-storage-images.md`, `apps/api/specs/004-visitor-authentication.md`, `apps/api/specs/007-administration-management.md`, `apps/api/specs/008-event-news-images.md`, `apps/api/specs/010-configurable-system-settings.md`, `docs/adr/0026-object-storage-s3-images.md`, `docs/adr/0027-dynamic-public-memories-gallery.md`, `docs/database/requests/DBR-012-visitor-memories.md`.
