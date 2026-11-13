# 012 · public-memories-read

- App dueña: `api`
- Apps/paquetes afectados: `api` (dueña: ruta pública, Action, Resource, visibilidad por estado y vigencia, y CORS por ambiente); `web` (consumidor: galería «Momentos para recordar», spec `web-010`); `packages/api-client` (sin cambios en esta spec; el portal no usa el paquete, ver ADR 0027)
- Estado: Aprobada (2026-11-12, Jonathan, responsable de backend). Aprobar no autoriza implementar: la implementación empieza cuando existan plan y tasks aprobados. DBR-012 está Lista para backend (aplicada en `arca_pruebas` el 2026-11-11). ADR 0026 y ADR 0027 están Aceptados (2026-11-12).
- Solicitante / responsable funcional: Aksel (decisión del 2026-11-10 de incluir la lectura pública). Respuestas del responsable: Jonathan (2026-11-10).
- Responsable de BD: no aplica como DBR propia. Usa la tabla de `api-010`, cuya DBR es `docs/database/requests/DBR-012-visitor-memories.md` (Aprobada el 2026-11-11; aplicada en `arca_pruebas` el 2026-11-11; Lista para backend). Esta spec no crea esquema.
- Responsable backend: Jonathan.
- Aprobación funcional: Jonathan (responsable de backend), 2026-11-12.
- Aprobado por: Jonathan (responsable de backend), 2026-11-12.
- Número: `012` es el siguiente libre en `apps/api/specs/` (el máximo existente es `011-public-news-read.md`). Los archivos `010-*` duplicados son `010-configurable-system-settings.md`, `010-public-enclosures-read.md` y `010-visitor-memory-requests.md`; esta spec no los toca.

## Problema y contexto

La galería «Momentos para recordar» del portal (`apps/web/src/index.html`, `#galeria`) muestra tres fotos fijas. Cuando el zoológico acepte peticiones de visitantes (`api-010`), el portal necesita leerlas desde la API sin sesión. Esta spec define ese endpoint de solo lectura.

Es el equivalente a `api-011` para noticias. Sigue sus mismas reglas de paginación, de CORS y de respuesta sin datos internos, con dos diferencias: solo expone peticiones aceptadas y vigentes (su plazo de publicación no ha vencido), y no tiene detalle público en esta versión.

Afectados: visitantes anónimos del portal (lectura), equipo del portal (consumidor, `web-010`) y `zoo-admin`, que al aceptar decide qué se publica y durante cuánto tiempo.

## Decisiones tomadas (2026-11-10)

- **Ruta (P12):** `GET /api/v1/memories`. Es la decisión final. `web-010` y `api-010` usan ese nombre. Nombre de ruta: `memories.index`.
- **Vigencia (P5):** una petición aceptada se lista solo mientras `published_until` sea posterior a ahora. Al vencer, deja de mostrarse y no se borra (`api-010` CA-31). Esta regla sustituye la visibilidad anterior, que solo miraba el estado (RN-03).
- **Excepción de la carpeta `media/` (`api-013`, decisión del 2026-11-10):** el CA-07 de esta spec se cumple sobre las respuestas de la API. El archivo pendiente está en `media/memories/` y es alcanzable por `/media` si se conoce su URL (CA-07).

## Objetivos

- Exponer `GET /api/v1/memories`, público y de solo lectura, con solo las peticiones aceptadas y vigentes.
- Paginar por `limit` y `page` con la misma forma de respuesta que `api-011`.
- Devolver solo la imagen pública y la opinión, sin datos de visitantes ni de revisores.
- Cubrir cada CA-xx con al menos un test PHPUnit contra `arca_pruebas`.

## Fuera de alcance

- Escrituras, altas, ediciones o borrados (las hace `api-010`).
- Detalle público `GET /api/v1/memories/{id}`. El portal solo necesita el listado. Si hace falta, se añade en una spec posterior.
- Peticiones en `submitted`, `in_review` o `rejected`, nunca visibles aquí.
- Peticiones aceptadas cuya publicación venció: no se listan (CA-12).
- Filtros, búsqueda, categorías u ordenamientos distintos del de RN-03.
- Autenticación, cookies o tokens.
- Límite de tasa específico.
- Caché de servidor, CDN o cabeceras de caché.
- Retirar una foto publicada antes de su vencimiento (pregunta 1 de `api-010`; si se resuelve con un campo de baja, esta spec se revisa).
- Cambios en `config/cors.php` (la lista se toma de `.env`, como en `api-011` RN-12).

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Visitante anónimo | Ver los momentos aceptados y vigentes | Ninguno; lectura pública |
| Portal institucional (`web-010`) | Leer el listado de la galería | Ninguno; origen permitido por CORS |
| `zoo-admin` y otros roles | Sin cambios; revisan con `api-010` | Fuera de esta spec |

Esta feature no crea permisos ni roles.

## Historias de usuario

- Como visitante, quiero ver los momentos que el zoológico ha aceptado y que siguen publicados, para conocer lo que comparten otros visitantes.
- Como integrante del equipo del portal, quiero leer el listado paginado, para mostrar una galería de tamaño fijo sin cargar todo de una vez.

## Criterios de aceptación

- **CA-01 (solo aceptadas y vigentes):** Dado un conjunto de peticiones que incluye `submitted`, `in_review`, `rejected`, `accepted` con `deleted_at`, `accepted` con `published_until` vencido y `accepted` vigentes, cuando se llama `GET /api/v1/memories` sin sesión, entonces responde `200` con `{"data": [...]}` que contiene solo las peticiones `accepted`, sin `deleted_at` y con `published_until` posterior a la hora actual.
- **CA-02 (orden y colección vacía):** Dado que hay peticiones visibles, cuando se llama `GET /api/v1/memories`, entonces se ordenan por `published_at` descendente y, a igual fecha, por `id` descendente. Dado que no hay peticiones visibles, entonces responde `200` con `{"data": []}`.
- **CA-03 (paginación):** Dado un listado con más peticiones visibles que el límite, cuando se llama `GET /api/v1/memories?limit=N&page=P`, entonces responde `200` con como máximo `N` elementos de la página `P` y con `meta` `{"page": P, "limit": N, "has_more": true|false}`. Sin `limit`, el tamaño de página es 10. Sin `page`, la página es 1. Una página posterior a la última responde `200` con `{"data": []}` y `has_more: false`.
- **CA-04 (parámetros inválidos):** Dado un `limit` o un `page` que no sea entero, que sea menor que 1 o que supere 50 en `limit`, cuando se llama, entonces responde `422` con el mensaje en español en `message` y en `errors.limit` o `errors.page`, y no cambia ningún dato.
- **CA-05 (sin datos internos):** Dada cualquier respuesta de `GET /api/v1/memories`, cuando se revisa, entonces cada elemento contiene solo `id`, `opinion`, `image_url` y `published_at`. No incluye `visitor_id`, nombre, correo, apodo, avatar, `status`, `reviewed_by`, `reviewed_at`, `rejection_reason`, `rejected_fields`, `image_path`, `published_image_path`, `published_until`, `deleted_at` ni datos de personal o de auditoría.
- **CA-06 (`image_url`):** Dada una petición aceptada y vigente, cuando se consulta, entonces `image_url` es la URL pública de la imagen publicada, construida con la URL del disco público (`MEDIA_PUBLIC_URL` o `APP_URL` más `/media`; `api-013` CA-17). Si el archivo publicado no existe, `image_url` es `null` y la respuesta no falla.
- **CA-07 (sin imagen privada):** Dada una petición que no está aceptada (`submitted`, `in_review` o `rejected`), cuando se consulta la API, entonces no aparece en el listado, ninguna respuesta incluye su `image_url` ni su ruta, y la imagen no se entrega por URL pública desde la API. Esta regla se comprueba junto con `api-010` CA-17.
  - **Excepción de la carpeta `media/` (registrada el 2026-11-10):** el archivo pendiente o rechazado está en `media/memories/`, que el servidor publica por `/media`. Si alguien conoce su URL, puede verlo (`api-013` RN-16; ADR 0026, riesgo b). El CA se cumple sobre las respuestas de la API.
- **CA-08 (anónimo y solo lectura):** Dada la ruta, cuando se llama sin cookies, sin `Authorization` y sin sesión, entonces responde `200`, y ninguna petición crea, modifica ni borra filas ni genera registros de Activitylog.
- **CA-09 (CORS por ambiente):** Dado un `CORS_ALLOWED_ORIGINS` que incluye `http://localhost:8080`, cuando una petición `GET` a `/api/v1/memories` llega con `Origin: http://localhost:8080`, entonces la respuesta incluye `Access-Control-Allow-Origin` con ese origen. Un origen que no está en la lista (por ejemplo `http://127.0.0.1:8080`) no recibe esa cabecera (mismo criterio que `api-011` CA-10).
- **CA-10 (arquitectura y rutas):** Dado el código de la API, cuando se revisa, entonces el controlador es delgado y delega en un Form Request (validación de `limit` y `page`), en `ListPublishedMemoriesAction` y en `PublicMemoryResource`. La ruta se declara con nombre en inglés: `memories.index`.
- **CA-11 (cobertura de pruebas):** Dada la suite PHPUnit, cuando se ejecuta contra `arca_pruebas`, entonces existe al menos un test que nombra cada CA-01 a CA-12, usa `DatabaseTransactions` y no usa `RefreshDatabase` ni migraciones desde los tests. Los tests de vigencia fijan el reloj con `Carbon::setTestNow`.
- **CA-12 (vigencia):** Dada una petición aceptada cuyo `published_until` es anterior o igual a la hora actual, cuando se llama `GET /api/v1/memories`, entonces no aparece en `data`, no cuenta para `meta.has_more` y no tiene `image_url`. Cuando el plazo llega a su fin, deja de listarse sin que nadie la modifique. No se escribe nada en la base de datos (`api-010` CA-31).

## Reglas de negocio

- **RN-01 (solo lectura):** La ruta es `GET`. No crea, modifica ni borra datos.
- **RN-02 (sin esquema nuevo):** Usa la tabla de `api-010` (`visitor_memories`, DBR-012). No requiere migración propia. Requiere que DBR-012 esté aplicada en el ambiente antes de desplegar esta spec.
- **RN-03 (visibilidad y orden):** Una petición es visible si y solo si `status` es `accepted`, no tiene `deleted_at` y `published_until` es posterior a la hora actual (`api-010` RN-21). Se ordena por `published_at` descendente y `id` descendente.
- **RN-04 (paginación):** `limit` por defecto es 10 y su máximo es 50; `page` por defecto es 1. `has_more` se calcula pidiendo un elemento más de los solicitados, sin contar el total (mismo criterio que `api-011` RN-05).
- **RN-05 (campos públicos):** Solo `id`, `opinion`, `image_url` y `published_at`. La opinión se devuelve como texto plano. El consumidor la trata como texto (`web-010`).
- **RN-06 (sin datos personales):** Ninguna respuesta incluye datos personales de visitantes ni de personal (Constitución V; `api-011` RN-13).
- **RN-07 (errores en español):** Los mensajes de validación de `limit` y `page` van en español (mismo texto que `api-011` RN-08).
- **RN-08 (arquitectura):** Controlador HTTP delgado → Form Request → `ListPublishedMemoriesAction` → `PublicMemoryResource`. La regla de visibilidad vive en la consulta del modelo y en la Action, no en el controlador.
- **RN-09 (CORS):** El origen del portal se añade a `CORS_ALLOWED_ORIGINS` en el `.env` de cada ambiente, como en `api-011` RN-12. En desarrollo, `http://localhost:8080`.
- **RN-10 (sin autenticación):** Sin sesión, sin cookies y sin tokens (igual que `api-011`).
- **RN-11 (vigencia sin escritura):** La vigencia se calcula al consultar, comparando `published_until` con la hora actual. La lectura no cambia `status` ni escribe fechas. Vencer no genera Activitylog.

## Datos, privacidad y auditoría

- Los datos son la imagen y la opinión que el zoológico ha aceptado y que siguen vigentes. La opinión la escribió el visitante, pero la revisó el zoológico antes de publicarla (`api-010` RN-09 y riesgos).
- No hay datos personales en la respuesta (CA-05).
- La lectura no escribe en Activitylog (CA-08).
- Las imágenes publicadas son públicas por diseño, como en `api-008`. El plazo de publicación limita cuánto tiempo se muestran en el portal; el archivo sigue la regla de `api-010` pregunta 3.
- Requiere DBR: no por esta spec; sí la DBR-012 de `api-010`.

## Flujos y errores

### Flujo principal

1. El portal llama `GET /api/v1/memories?limit=6` y recibe las peticiones aceptadas y vigentes más recientes (`web-010`).
2. Si quiere paginar, pide `page=2` y usa `meta.has_more`.

### Errores esperados

- `limit` o `page` no válidos → `422` con `errors` en español (CA-04).
- Página más allá del final → `200` con `data: []`.
- Colección vacía, o todas las aceptadas vencidas → `200` con `data: []`, no `404`.
- Error de base de datos → `500`; el portal muestra su estado de error.
- Origen no permitido → la respuesta llega sin `Access-Control-Allow-Origin`; el navegador bloquea la lectura.

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:**
  - `api-010` (datos, estados, publicación al aceptar, vigencia y reglas de imagen; Aprobada 2026-11-12).
  - DBR-012 (`docs/database/requests/DBR-012-visitor-memories.md`; Aprobada y aplicada en `arca_pruebas` el 2026-11-11; Lista para backend). Incluye `published_until` y el índice por vigencia.
  - `api-011` (formato de paginación, CORS por ambiente y listados); `api-008` (disco público y `storage:link`).
  - `api-013` (Aprobada 2026-11-12) y ADR 0026 (Aceptado 2026-11-12): `image_url` sale del disco público configurado. Ver «Nota de almacenamiento».
  - `web-010` (consumidor) y ADR 0027 (Aceptado 2026-11-12, excepción de arquitectura del portal para la galería).
  - No hay dependencia nueva ni ADR nuevo de la API.
- **Infraestructura (`infra/README.md`):** `CORS_ALLOWED_ORIGINS` con el origen del portal en cada ambiente, `storage:link` (enlace `public/media`) y el disco público para las imágenes publicadas. **Pendiente:** `infra/README.md` no se edita desde esta documentación.
- **Riesgos:**
  - Opinión con datos personales publicada si el revisor no la lee (riesgo de `api-010`).
  - Imagen publicada que falta en disco: `image_url` queda en `null` (CA-06) y el portal muestra su marcador de imagen no disponible.
  - Retirar una foto publicada antes de su vencimiento no es posible (pregunta 1 de `api-010`).
  - Vencidas que siguen accesibles por URL en la carpeta `media/` (`api-013` RN-16; pregunta 3 de `api-010`).
  - Carga de lectura sin caché en el servidor (igual que `api-011`).
- **Preguntas pendientes:**
  1. Resuelta por el responsable (2026-11-10): la ruta es `GET /api/v1/memories`, decisión final. Se mantiene en esta lista como referencia.
  2. ¿Se confirma el máximo de 50 para `limit` y el de 10 por defecto? Propuesta: sí, igual que `api-011`. **Resuelta, decisión del usuario 2026-11-12:** máximo 50 para `limit` y 10 por defecto, igual que `api-011`.

Estado de las preguntas (2026-11-12): sin preguntas abiertas.

## Nota de almacenamiento (2026-11-10)

Decisión del responsable, aprobada con esta spec por Jonathan el 2026-11-12. Sí cambia el texto de CA-07 para registrar la excepción de la carpeta `media/`.

- **CA-06 (`image_url`):** la URL sale de `MEDIA_PUBLIC_URL` o de `APP_URL` más `/media` (`api-013` CA-17), sin cambiar el formato de la respuesta. Si el archivo no está en el disco, `image_url` sigue siendo `null` sin error.
- **Ruta publicada:** la imagen aceptada se lee desde `published_image_path` en el disco público (DBR-012, `api-013` CA-11). Al aceptar, `published_image_path` toma el valor de `image_path` (el archivo ya está en `media/memories/`), así que `image_url` de un momento aceptado tiene valor. Si la imagen no existe en la carpeta, `image_url` es `null` o la imagen no carga hasta el `pull` (flujo 8 de `api-013`).
- **CA-07 (imagen no aceptada):** la lectura pública no lista ni devuelve nunca peticiones no aceptadas (CA-01 y CA-05 se mantienen). Pero la imagen no es inaccesible por URL pública: la carpeta `media/memories/` se publica por `/media` y el archivo es alcanzable si se conoce su URL (`api-013` RN-16). Excepción registrada en CA-07.
- **CA-05 (sin datos internos):** `image_url` no revela rutas absolutas del servidor, credenciales ni URLs con firma; es la URL pública del disco (`api-013` CA-23).
- **Infraestructura:** `storage:link` crea el enlace `public/media`, y los momentos aceptados se publican desde la carpeta versionada `media/memories/` (`api-013` D-02). `CORS_ALLOWED_ORIGINS` no cambia: el portal consume el JSON, y `<img>` no necesita CORS (`api-013` RN-12).

## Revisión

- Aprobadores y fecha: Jonathan (responsable de backend), 2026-11-12.
- Aprobado por: Jonathan (responsable de backend), 2026-11-12.
- Estado: Aprobada (2026-11-12). Aprobar no autoriza implementar: la implementación empieza cuando existan plan y tasks aprobados. Depende de `api-010` (Aprobada) y de DBR-012 (Lista para backend). Sin preguntas abiertas.
- Historial: 2026-11-12: pregunta 2 resuelta por el usuario (máximo 50 para `limit` y 10 por defecto, igual que `api-011`). 2026-11-12, aprobación (Jonathan, responsable de backend): spec Aprobada, responsable de backend registrado como Jonathan. Sin cambio de CA, RN ni alcance.
- Evidencia/enlaces: `apps/api/specs/011-public-news-read.md` (patrón de lectura pública), `apps/api/specs/010-visitor-memory-requests.md` (datos, vigencia y publicación), `apps/web/specs/010-dynamic-memories.md` (consumidor), `apps/api/specs/008-event-news-images.md` (disco público e imágenes), `apps/api/specs/013-object-storage-images.md` (almacenamiento), `docs/adr/0027-dynamic-public-memories-gallery.md`, `docs/database/requests/DBR-012-visitor-memories.md`.
