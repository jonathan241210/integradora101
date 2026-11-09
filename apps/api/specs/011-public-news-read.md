# 011 · public-news-read

- App dueña: `api`
- Apps/paquetes afectados: `api` (dueña: rutas, Actions, Resources, zona horaria de la vigencia pública y CORS por ambiente); `apps/web` (consumidor, spec `web-009`: portada, listado y detalle de noticia al expandir la tarjeta); `apps/mobile` (sin cambios; `GET /events` gana `limit` opcional, compatible); `packages/api-client` (sin cambios en esta spec).
- Estado: Aprobada (Jonathan, 2026-11-07)
- Solicitante / responsable funcional: Jonathan
- Aprobación funcional: aprobada por Jonathan, 2026-11-07
- Responsable de BD: no aplica. Esta feature no requiere DBR ni migración (RN-02).
- Dependencias: `api-008` (`image_url` y `ResolveContentImageUrlAction`, ya presentes en el código), DBR-005 (`deleted_at` en `news` y `events`, debe estar aplicada en el ambiente), `api-006` (catálogo público de eventos; su RN-07 y su «Fuera de alcance» excluyen paginación: esta spec añade solo `limit` opcional a `GET /events`, ver «Dependencias, riesgos y preguntas»; su RN-12 cambia solo la zona horaria de «hoy», ver RN-14).
- Decisiones del usuario (2026-11-07) incorporadas: (a) «hoy» para la visibilidad se calcula en `America/Mexico_City` sin cambiar la zona global (RN-14); (b) el origen de desarrollo del portal es `http://localhost:8080` y se añade a `CORS_ALLOWED_ORIGINS` (RN-12); (c) el listado de noticias no incluye `content` y el portal pide `GET /api/v1/news/{news}` al expandir la tarjeta (RN-07, «Flujos y errores»); (d) tamaño de página por defecto 10 y máximo 50 (RN-05); (e) `limit` o `page` no válidos responden `422` (CA-04); (f) `GET /api/v1/events` acepta `limit` opcional sin `page`; (g) la portada del portal pide 3 noticias y 3 eventos (`web-009`).

## Problema y contexto

La portada pública del portal institucional (`apps/web`) muestra tarjetas de muestra en «Noticias» y «Eventos». Para reemplazarlas con contenido real, la API necesita un listado público de noticias publicadas. Hoy no existe ningún endpoint de noticias para visitantes: `api-006` dejó `GET /news` fuera de alcance y la reservó para una spec futura, que es esta.

`GET /api/v1/events` devuelve siempre la lista completa de eventos vigentes. Para que la portada muestre solo unos cuantos, y para que la página «Ver todos» sea manejable, el listado de eventos necesita un límite opcional. Sin ese parámetro, la respuesta debe seguir igual que hoy, porque la app móvil (`mobile-003`) espera la lista completa.

Afectados: visitantes anónimos del portal (lectura de noticias y eventos), equipo de desarrollo del portal (consumidor), y personal que publica contenido en el dashboard (sin cambios en su flujo).

## Objetivos

- Exponer `GET /api/v1/news` y `GET /api/v1/news/{news}` públicos, de solo lectura, con visibilidad estricta de contenido publicado.
- Paginación simple por `limit` y `page` en el listado de noticias.
- Añadir `limit` opcional a `GET /api/v1/events`, sin cambiar la respuesta cuando no se envía.
- Fijar «hoy» de la visibilidad de noticias y eventos en `America/Mexico_City`, sin cambiar la zona global de la API (RN-14).
- Permitir que el portal (`apps/web`) lea la API desde su propio origen mediante `CORS_ALLOWED_ORIGINS` en cada ambiente.
- Cubrir cada CA-xx con al menos un test PHPUnit contra `arca_pruebas`.

## Fuera de alcance

- Escrituras, altas, ediciones o borrados de noticias (ya existen en el dashboard, `api-007`).
- Filtros o búsqueda por texto, categoría o fecha; ordenamientos distintos de `published_date` descendente.
- Caché de servidor, CDN o cabeceras de caché específicas.
- Servir imágenes (las URLs apuntan al disco público ya gestionado por `api-008`).
- Contenido en borrador, archivado o programado: solo se expone lo visible según RN-03.
- Autenticación, sesiones, cookies o tokens para estos endpoints.
- Límite de tasa (rate limit) específico; se evaluará en una spec de operación si el tráfico lo requiere.
- Página de detalle de noticia con URL propia en el portal: el contenido completo se muestra al expandir la tarjeta (`web-009`, CA-14). Esta spec solo entrega el endpoint.
- Cambios a `config/cors.php`: la lista de orígenes se toma de `.env` sin tocar código.
- Cambiar `timezone` en `config/app.php`: la zona global de la API sigue en `UTC`; solo la fecha «hoy» de la visibilidad pública usa `America/Mexico_City` (RN-14).
- Modificación directa de `api-006`: la nota de vigencia se registra solo tras aprobar esta spec (tarea T-14).

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Visitante anónimo | Leer las noticias publicadas y su detalle | Ninguno; lectura pública |
| Portal institucional (`web-009`) | Consumir el listado para la portada y la página de noticias, y el detalle al expandir una tarjeta | Ninguno; origen permitido por CORS |
| App móvil (`mobile-003`) | Leer la lista de eventos, ahora opcionalmente limitada | Ninguno |
| `admin`, `zoo-admin`, `executive` | Sin cambios: siguen usando las rutas de administración (`api-007`) | `news.manage` o `events.manage` según la ruta de admin |
| Responsable de BD | Confirmar que no hay cambio de esquema | No aplica: sin DBR |

Esta feature no crea permisos ni roles (RN-02).

## Historias de usuario

- Como visitante, quiero ver las noticias publicadas más recientes para enterarme de los avisos del zoológico.
- Como visitante, quiero leer el contenido completo de una noticia sin salir de la página, para entender el aviso.
- Como visitante, quiero ver solo los eventos vigentes sin que el listado me muestre actividades ya terminadas.
- Como integrante del equipo del portal, quiero paginar el listado de noticias para mostrar «Ver todas» sin cargar todo de una vez.

## Criterios de aceptación

- **CA-01 (visibilidad del listado):** Dado un conjunto de noticias que incluye activas, inactivas, borradas lógicamente, con `published_date` futura, con `end_date` anterior a hoy y visibles, cuando se llama `GET /api/v1/news` sin sesión, entonces responde `200` con `{"data": [...]}` que contiene solo las noticias visibles según RN-03 y RN-14.
- **CA-02 (orden y colección vacía):** Dado que hay noticias visibles, cuando se llama `GET /api/v1/news`, entonces se ordenan por `published_date` descendente y, a igual fecha, por `id` descendente. Dado que no hay noticias visibles, entonces responde `200` con `{"data": []}`.
- **CA-03 (paginación simple):** Dado un listado con más noticias visibles que el límite, cuando se llama `GET /api/v1/news?limit=N&page=P`, entonces responde `200` con como máximo `N` elementos de la página `P` y con `meta` `{"page": P, "limit": N, "has_more": true|false}`. Sin `limit`, el tamaño de página es 10. Sin `page`, la página es 1. Si `has_more` es `false`, no hay página siguiente. Una página posterior a la última responde `200` con `{"data": []}` y `has_more: false`.
- **CA-04 (parámetros inválidos):** Dado un `limit` o un `page` que no sea entero, que sea menor que 1 o que supere el máximo de RN-05 para `limit`, cuando se llama `GET /api/v1/news` o `GET /api/v1/events`, entonces responde `422` con mensaje en español en `message` y en `errors.limit` o `errors.page`, y no cambia ningún dato.
- **CA-05 (detalle y 404):** Dado un identificador numérico de una noticia visible, cuando se llama `GET /api/v1/news/{news}` sin sesión, entonces responde `200` con `{"data": {...}}` que incluye `content`. Si la noticia no existe, está inactiva, borrada lógicamente, con `published_date` futura o con `end_date` anterior a hoy, responde `404` con `{"message": "Noticia no encontrada."}`. Un identificador no numérico (`/news/abc`) responde `404` con el mismo mensaje sin consultar la base de datos.
- **CA-06 (sin datos internos):** Dada cualquier respuesta de `GET /api/v1/news` o `GET /api/v1/news/{news}`, cuando se revisa su contenido, entonces no incluye `author_id`, `is_active`, `image_path`, `deleted_at` ni datos de personal o auditoría.
- **CA-07 (`image_url`):** Dada una noticia con `image_path` gestionado por `api-008` (`news/<uuid>.(jpg|png|webp)`), cuando se consulta, entonces `image_url` contiene la URL pública del archivo. Si `image_path` es `null` o externo (no gestionado), entonces `image_url` es `null` (`api-008` CA-08).
- **CA-08 (límite en eventos):** Dado que existen eventos vigentes, cuando se llama `GET /api/v1/events?limit=N`, entonces responde `200` con como máximo `N` eventos, con la misma visibilidad y orden de `api-006` CA-03 (con la fecha de RN-14). Cuando se llama `GET /api/v1/events` sin `limit`, entonces la respuesta es idéntica a la de hoy (lista completa). Un `limit` inválido responde `422` según CA-04.
- **CA-09 (solo lectura y anónimo):** Dadas las cuatro rutas de esta spec, cuando se llaman sin cookies, sin `Authorization` y sin sesión, entonces responden `200` o `404` según corresponda; ninguna petición crea, modifica ni borra filas, y las lecturas no generan registros de Activitylog.
- **CA-10 (CORS por ambiente):** Dado un `CORS_ALLOWED_ORIGINS` que incluye el origen del portal (en desarrollo, `http://localhost:8080`), cuando una petición `GET` a `/api/v1/news` o a `/api/v1/news/{news}` llega con la cabecera `Origin` de ese origen, entonces la respuesta incluye `Access-Control-Allow-Origin` con ese origen. Dado un origen que no está en la lista (por ejemplo `http://127.0.0.1:8080`, que es otro origen), la respuesta no incluye esa cabecera con ese origen.
- **CA-11 (cobertura de pruebas):** Dada la suite de PHPUnit, cuando se ejecuta `php artisan test` contra `arca_pruebas`, entonces existe al menos un test que nombra cada CA-01 a CA-10 y CA-12 y que usa `DatabaseTransactions` (sin `RefreshDatabase` ni migraciones desde los tests).
- **CA-12 (zona horaria de la vigencia):** Dado que la hora del servidor es `2026-11-07 05:30 UTC` (`2026-11-06 23:30` en `America/Mexico_City`), cuando se consultan noticias y eventos sin sesión, entonces «hoy» es `2026-11-06`: se muestran una noticia y un evento con `end_date` `2026-11-06`; no se muestran una noticia con `end_date` `2026-11-05` ni una noticia con `published_date` `2026-11-07`; no se muestra un evento con `end_date` `2026-11-05`. Y `config('app.timezone')` sigue siendo `UTC`.

## Reglas de negocio

- **RN-01 (solo lectura):** Los cuatro endpoints son `GET`. No crean, modifican ni borran datos.
- **RN-02 (sin esquema nuevo):** No se crean migraciones ni DBR. Se usan las tablas existentes `news` y `events`, la columna `image_path` (`api-008`) y `deleted_at` (DBR-005).
- **RN-03 (visibilidad):** Una noticia es visible si y solo si `is_active = true`, no tiene `deleted_at`, `published_date` es menor o igual a hoy y `end_date` es nulo o mayor o igual a hoy. «Hoy» se calcula según RN-14. La misma regla aplica al listado y al detalle.
- **RN-04 (orden):** El listado de noticias se ordena por `published_date` descendente y `id` descendente. El listado de eventos conserva el orden de `api-006` (`start_date`, `start_time`).
- **RN-05 (paginación y límites):** En noticias, `limit` por defecto es 10 y su máximo es 50; `page` por defecto es 1. `has_more` se calcula pidiendo un elemento más de los solicitados, sin contar el total. En eventos, `limit` es opcional, sin valor por defecto, y su máximo es 50. Los valores fuera de rango responden `422` (CA-04). Valores confirmados por el usuario el 2026-11-07 (pregunta 3).
- **RN-06 (compatibilidad de eventos):** Sin `limit`, `GET /api/v1/events` no cambia de contrato. Con `limit`, la respuesta sigue siendo `{"data": [...]}` sin `meta`. Esta excepción a `api-006` RN-07 se registra como divergencia (ver «Dependencias, riesgos y preguntas»).
- **RN-07 (campos públicos de noticias):** El listado expone `id`, `title`, `description`, `category`, `published_date`, `start_date`, `end_date` e `image_url`. **El listado no incluye `content`** (decisión de 2026-11-07): mantiene las respuestas pequeñas, porque `content` puede tener hasta 20 000 caracteres. El detalle añade `content`. No se exponen `author_id`, `is_active`, `image_path` ni fechas de auditoría. Los campos sin dato van en `null`.
- **RN-08 (errores en español):** Los mensajes visibles para el cliente van en español: «Noticia no encontrada.», «Evento no encontrado.» y los mensajes de validación de `limit` y `page`.
- **RN-09 (identificadores):** Un identificador que no sea numérico responde `404` sin consultar la base de datos (mismo criterio que `api-006` CA-06).
- **RN-10 (arquitectura):** Controladores HTTP delgados → Form Requests (validación de `limit` y `page`) → Actions (`ListPublishedNewsAction`, `GetPublishedNewsAction`, `ListEventsAction`) → API Resources. La regla de visibilidad vive en la capa de consulta de `News` y en las Actions, no en el controlador. El cálculo de «hoy» vive en un único punto (RN-14).
- **RN-11 (rutas nombradas y en inglés):** Las rutas se declaran en inglés con `->name()`: `news.index`, `news.show`, `events.index` (ya existe), `events.show` (ya existe). No se usan Inertia ni Wayfinder.
- **RN-12 (CORS por ambiente):** El origen del portal se añade a `CORS_ALLOWED_ORIGINS` en `.env` de cada ambiente, sin valores fijos en código ni en `config/cors.php`. En desarrollo, el origen es `http://localhost:8080` (exacto: esquema, host y puerto). El portal debe servirse en `localhost`, no en `127.0.0.1`, porque son orígenes distintos. El `.env.example` se actualiza solo con valores de muestra no sensibles.
- **RN-13 (sin datos personales):** Las respuestas no contienen datos personales de visitantes ni de personal.
- **RN-14 (zona horaria de «hoy», decisión de 2026-11-07):** La fecha «hoy» de la visibilidad pública (RN-03, `api-006` RN-12) se calcula en `America/Mexico_City` a través de un único punto (`App\Support\PublicCalendar::today()`, nuevo), que lee `config('arca.public_timezone')`. `config/app.php` no cambia: `timezone` sigue en `UTC`. Las Actions de noticias y de eventos (`ListEventsAction`, `GetEventAction`) usan ese punto. Otros cálculos de fecha de la API (reportes, boletos, progreso) no cambian.

## Datos, privacidad y auditoría

- Los datos son contenido institucional publicado (noticias y eventos). No son personales, clínicos ni financieros.
- No se escribe nada: no hay Activitylog en las lecturas (CA-09).
- `News` ya usa `SoftDeletes` (`api-007`). Las filas borradas lógicamente quedan fuera por RN-03 y no se borran físicamente.
- Requiere DBR: no. Usa el esquema actual; la precondición de DBR-005 se verifica en el ambiente de despliegue, no con una migración.
- Las imágenes son públicas por diseño (`api-008`); los metadatos ya se quitan al guardar.

## Flujos y errores

### Flujo principal

1. El portal llama `GET /api/v1/news?limit=3` y recibe las tres noticias visibles más recientes (portada, `web-009`).
2. La página «Ver todas» llama `GET /api/v1/news?limit=10&page=2` y usa `meta.has_more` para mostrar o no «Cargar más».
3. Al pulsar «Ver todo el contenido» en una tarjeta de noticia, el portal llama `GET /api/v1/news/{id}` (una vez por noticia) y muestra `content` dentro de la misma tarjeta (`web-009` CA-14).
4. La app móvil sigue llamando `GET /api/v1/events` sin `limit`; el portal llama `GET /api/v1/events?limit=3` en la portada.

### Errores esperados

- Noticia inexistente, inactiva, borrada, programada o vencida → `404` «Noticia no encontrada.».
- Identificador no numérico → `404` sin consultar la base.
- `limit` o `page` no válidos → `422` con `errors` en español (CA-04).
- Página más allá del final → `200` con `data: []`.
- Colección vacía → `200` con `data: []` (no `404`).
- Error de base de datos → `500`; el cliente trata el fallo como error de carga.
- Origen no permitido → la respuesta llega sin `Access-Control-Allow-Origin`; el navegador bloquea la lectura en el portal.

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:** ninguna dependencia nueva. Se apoya en Laravel 12, Eloquent, `api-008` (`ResolveContentImageUrlAction`), DBR-005 y el middleware CORS existente (ADR 0001, ADR 0010, ADR 0013). No hay ADR nuevo.
- **Divergencias registradas con `api-006`** (se anotan en `api-006` con la nota de vigencia, T-14; no se cambia su contrato):
  - `api-006` RN-07 y su «Fuera de alcance» excluyen la paginación en eventos. Esta spec añade `limit` opcional solo a `GET /api/v1/events`, sin `page`.
  - `api-006` RN-12: la fecha de «hoy» pasa de `UTC` a `America/Mexico_City` (RN-14). Efecto: un evento con `end_date` igual a hoy (hora de Tulancingo) sigue visible hasta las 24:00 locales. Hoy, con `UTC`, se oculta desde las 18:00 locales.
- **Riesgos:**
  - **Zona horaria:** resuelto por RN-14. Queda como cambio de comportamiento en `api-006` (ver arriba) que debe conocer el equipo de la app móvil.
  - **Orígenes del portal:** si `CORS_ALLOWED_ORIGINS` no incluye el origen exacto (esquema, host y puerto), el portal no mostrará contenido aunque la API responda bien. `http://localhost:8080` y `http://127.0.0.1:8080` son orígenes distintos. El origen de producción sigue sin definirse (pregunta 2).
  - **Contenido sin límite de texto en el detalle:** `content` puede tener hasta 20 000 caracteres (`SaveNewsRequest`); el listado no lo incluye (RN-07).
  - **Paginación sin total:** `has_more` evita contar filas, pero no muestra «página X de Y». Suficiente para «Cargar más».
  - **Imágenes anteriores a `api-008`:** sin ruta gestionada, `image_url` es `null`; el portal y el dashboard muestran el marcador de sin imagen.
  - **Carga del detalle:** cada expansión del portal es una petición nueva al detalle; el portal la hace una vez por noticia y visita (`web-009` CA-14).
- **Preguntas (estado tras la aprobación del 2026-11-07):**
  1. **Resuelta (2026-11-07):** «hoy» usa `America/Mexico_City` solo para la visibilidad pública (RN-14); `config/app.php` no cambia.
  2. **Parcialmente resuelta:** en desarrollo, el origen del portal es `http://localhost:8080`. **Pendiente, no bloquea (decisión del usuario, 2026-11-07):** origen de producción (no hay dominio definido).
  3. **Resuelta (2026-11-07):** tamaño por defecto 10 y máximo 50 para la portada y la página de noticias (RN-05).
  4. **Resuelta (2026-11-07):** ante `limit` o `page` inválidos se responde `422` (CA-04); no se ajusta el valor.
  5. **Resuelta (2026-11-07):** `GET /api/v1/events` recibe `limit` opcional y no recibe `page`; la divergencia con `api-006` queda registrada en RN-06.
  6. **Resuelta (2026-11-07):** el listado de noticias no incluye `content`; el detalle se pide al expandir la tarjeta (RN-07).

## Revisión

- Aprobadores y fecha: Jonathan, 2026-11-07 (aprobación explícita del usuario sobre spec, plan y tasks). Estado Aprobada.
- Evidencia/enlaces: `apps/api/specs/006-public-catalog-read.md` (RN-07, RN-12, «Fuera de alcance», CA-03), `apps/api/specs/008-event-news-images.md` (CA-08, CA-11, `image_url`), `docs/database/requests/DBR-005-news-events-soft-deletes.md`, `apps/web/specs/009-dynamic-news-events.md` (consumidor; CA-14 detalle al expandir), `docs/adr/0024-web-static-portal-exception.md` (excepción de arquitectura del portal, Aceptado el 2026-11-07).
