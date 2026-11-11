# 010 · dynamic-memories

- App dueña: `web`
- Apps/paquetes afectados: `web` (dueña de la galería «Momentos para recordar» de `index.html`, su estado de carga, error y vacío, y su estilo); `api` (proveedor: `api-012` para `GET /api/v1/memories`; reglas de publicación y vigencia en `api-010`); `docs/adr/0027-dynamic-public-memories-gallery.md` (excepción de arquitectura de esta galería, Propuesto). ADR 0024 no se modifica: solo cubre `web-009`.
- Estado: Borrador
- Solicitante / responsable funcional: Aksel (decisión del 2026-11-10). Respuestas del responsable: Jonathan (2026-11-10).
- Aprobación funcional: pendiente.
- Aprobado por: (pendiente, nombre del compañero)
- Dependencias: `api-012` (Borrador) y `api-010` (Borrador) en el ambiente; `web-009` (Aprobada, con implementación en curso) por el módulo `js/api.js` y la meta `arca-api-base`. ADR 0027 (Propuesto) cubre esta galería; debe aprobarse antes de aprobar esta spec.

## Problema y contexto

La sección «Momentos para recordar» (`#galeria` en `apps/web/src/index.html`, línea 944 y siguientes) muestra tres botones con fotos fijas (`.foto.f1`, `.f2`, `.f3`) sin contenido real. Cuando el zoológico acepte peticiones de visitantes (`api-010`), la galería debe mostrar esas fotos y sus opiniones desde la API, y no las fotos de muestra.

Esta spec sustituye esas fotos fijas por un listado dinámico que lee `GET /api/v1/memories` (`api-012`). Sigue el mismo modelo que la portada de noticias y eventos de `web-009`: HTML y JavaScript estático, un único módulo de red y texto seguro. Ese modelo se registra para esta galería en ADR 0027, porque ADR 0024 se limita a `web-009`.

Afectados: visitantes del portal (lectura), equipo del portal (mantenimiento) y el zoológico, que ve reflejada en el portal cada foto que acepta en el dashboard (`dashboard-008`) durante su plazo de publicación.

## Decisiones tomadas (2026-11-10)

- **Ruta (P12):** la galería lee `GET /api/v1/memories`, decisión final de `api-012`.
- **Excepción de arquitectura (P10):** la galería se registra en `docs/adr/0027-dynamic-public-memories-gallery.md` (Propuesto), como ADR nuevo. No se enmienda el ADR 0024.
- La galería muestra solo las peticiones que la API devuelve como aceptadas y vigentes (`api-012`). El portal no decide qué es visible, ni filtra por fecha de vencimiento.
- La galería muestra la imagen y la opinión. No muestra nombre, correo ni apodo del visitante.
- Estados de carga, vacío y error, con botón «Reintentar» en el error (igual que `web-009`).

## Objetivos

- Sustituir las tres fotos fijas de `#galeria` por las peticiones aceptadas y vigentes que devuelve la API.
- Mostrar cada foto completa y centrada, con su opinión como texto.
- Mostrar estados de carga, vacío y error en español, sin fotos de muestra.
- Mantener el portal sin dependencias nuevas ni build (ADR 0024 y ADR 0027).

## Fuera de alcance

- Página propia de «Momentos» con URL, paginación («Cargar más») o filtros. Solo la galería de la portada.
- Carrusel, visor a pantalla completa, zoom o galería con miniaturas.
- Formulario para enviar una foto desde el portal. Las peticiones se hacen desde la app (`mobile-010`).
- Mostrar el nombre, el correo o el apodo del visitante, o el nombre del revisor.
- Mostrar la fecha de vencimiento o el plazo de publicación: la galería no los muestra en esta versión.
- Caché persistente en el navegador (`localStorage`, `IndexedDB`).
- Cambios en `apps/web/src/styles.css` (los estilos nuevos van en un archivo propio).
- Cambios en otras secciones de la portada.
- Cualquier escritura en la API.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Visitante del portal | Ver los momentos aceptados y vigentes | Ninguno; contenido público |
| Visitante con lector de pantalla | Recibir los estados de carga, vacío y error | Ninguno |
| Equipo del portal | Mantener el módulo y la configuración de la API | Acceso al repositorio |
| Zoológico (publicación) | Aceptar peticiones en el dashboard | `memories.review` (`dashboard-008`); no cambia en esta spec |

## Historias de usuario

- Como visitante del portal, quiero ver las fotos que otros visitantes compartieron y que el zoológico aceptó, para conocer la experiencia del zoológico.
- Como visitante, quiero leer la opinión que acompaña cada foto, para entender el momento.
- Como visitante con lector de pantalla, quiero que el portal me avise si la galería se está cargando, si no hay nada o si hubo un error.

## Criterios de aceptación

- **CA-01 (galería con contenido):** Dada la portada con la API disponible, cuando termina la carga de `#galeria`, entonces muestra como máximo seis momentos en el orden que devuelve `GET {base}/memories?limit=6`. Cada momento tiene su imagen y su opinión. No queda ninguna foto fija de muestra (`f1`, `f2`, `f3`).
- **CA-02 (carga):** Dada una petición en curso, cuando la galería está cargando, entonces muestra el texto «Cargando momentos…» en un elemento con `role="status"`, y el contenedor tiene `aria-busy="true"` hasta que termina.
- **CA-03 (vacío):** Dada una respuesta `200` con `data: []`, cuando se renderiza, entonces muestra «Aún no hay momentos publicados.» sin tarjetas ni fotos. Este estado también aparece cuando todas las aceptadas ya vencieron, porque la API no las devuelve (`api-012` CA-12).
- **CA-04 (error y reintento):** Dada una petición fallida (red, respuesta distinta de `2xx`, JSON no válido o `data` ausente), cuando se renderiza, entonces muestra «No pudimos cargar los momentos. Inténtalo más tarde.» en un elemento con `role="status"` y un botón «Reintentar». «Reintentar» vuelve a pedir la galería con los mismos parámetros, muestra el estado de carga, mueve el foco al estado de carga y después al contenido o, si vuelve a fallar, al botón. No muestra datos anteriores ni detalles técnicos.
- **CA-05 (sin muestra):** Dado un fallo de la API, cuando se muestra el error, entonces no aparece ninguna foto de muestra ni botón de «Ver foto» de la versión anterior.
- **CA-06 (escapado seguro):** Dada una opinión que contiene HTML (por ejemplo `<img src=x onerror=alert(1)>`), cuando se renderiza, entonces se muestra como texto literal. Ningún módulo de la galería usa `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write` ni `eval` con datos de la API. Se comprueba con una prueba estática.
- **CA-07 (imagen: datos y respaldo):** Dada una imagen con `image_url`, cuando se renderiza, entonces usa `loading="lazy"`, `decoding="async"` y un `alt` que describe la foto como «Foto compartida por un visitante del zoológico». Si `image_url` es `null`, usa un esquema distinto de `http:` o `https:` (por ejemplo `javascript:` o `data:`), o la imagen falla al cargar, entonces muestra un marcador decorativo (`aria-hidden="true"`) con la misma caja, sin hueco vacío.
- **CA-08 (imagen completa y centrada):** Dada una foto de la galería, cuando se muestra, entonces se ve completa (`object-fit: contain`), centrada dentro de una caja de proporción fija, sin ampliarse por encima de su tamaño natural y sin efecto de zoom al pasar el cursor. El fondo de la caja usa el token `--surface-subtle`. El marcador de CA-07 usa la misma caja y regla.
- **CA-09 (módulo de red):** Dado el código de la galería, cuando se revisa, entonces la lectura de la API ocurre solo en `js/api.js`, que añade la función de lectura de momentos con `credentials: 'omit'`, `Accept: application/json`, tiempo máximo de 10 segundos y base URL de `<meta name="arca-api-base">`. El módulo de la galería no llama a `fetch`.
- **CA-10 (accesibilidad y adaptación):** Dada la portada, cuando se usa a 360, 390, 768, 1024 y 1366 px, entonces no hay desbordamiento horizontal, las fotos no superan el ancho de su contenedor, el botón «Reintentar» tiene foco visible, el encabezado de la sección se mantiene como `h2` y cada momento no lleva encabezado propio (no tiene título en esta versión). El texto de estado se anuncia con `role="status"`.
- **CA-11 (no regresión):** Dada `index.html` después del cambio, cuando se carga, entonces conserva los identificadores y las secciones existentes, el enlace «Descubre los animales» de la cabecera de la galería, y las referencias a `script.js`, `animations.js` y `accessibility.js`. Las pruebas estructurales de `relocation.test.mjs` siguen en verde o sus fallos previos quedan registrados sin atribuirlos a este cambio.
- **CA-12 (configuración):** Dada la página `index.html`, cuando se revisa, entonces usa la misma `<meta name="arca-api-base">` que las demás páginas de `web-009` (CA-16). La galería no define otra base de API.
- **CA-13 (cobertura de pruebas):** Dada la suite `node --test` del portal, cuando se ejecuta, entonces existe al menos un test que nombra cada CA-01 a CA-14 sin dependencias nuevas.
- **CA-14 (condiciones de ADR 0027):** Dada la galería, cuando se revisa, entonces no hay `package.json`, build, paquetes ni scripts de terceros añadidos por esta spec; no se usan cookies, `localStorage`, `sessionStorage` ni credenciales; y las URLs de imagen se validan según RN-04. Cumple las condiciones de `docs/adr/0027-dynamic-public-memories-gallery.md`. Se comprueba con una prueba estática.

## Reglas de negocio

- **RN-01 (solo presentación):** El portal no decide qué es visible ni en qué orden. Eso lo decide `api-012` (solo aceptadas y vigentes, `api-010` RN-03 y RN-21).
- **RN-02 (sin contenido de muestra):** Ningún estado muestra fotos inventadas. Si falla la API, se muestra el estado de error (CA-05).
- **RN-03 (solo lectura y público):** El portal solo hace `GET`, sin cookies, sin credenciales y sin datos del visitante. No guarda la galería en el navegador.
- **RN-04 (texto seguro):** Los datos de la API se tratan siempre como texto. Las URLs de imagen se aceptan solo si son `http:`, `https:` o rutas relativas del mismo origen (igual que `web-009` RN-07).
- **RN-05 (sin dependencias):** No se añaden paquetes, build, fuentes remotas ni scripts de terceros (`web-009` RN-05; ADR 0027).
- **RN-06 (un solo módulo de red):** La lectura de la API ocurre solo en `js/api.js` (`web-009` RN-06). Esta spec añade una función a ese módulo; no crea otro.
- **RN-07 (sin datos personales):** La galería no muestra ni pide nombre, correo, apodo, avatar ni identificador del visitante (`api-012` CA-05).
- **RN-08 (textos en español):** Todos los textos visibles, de estado y de error están en español (`apps/web/AGENTS.md`).
- **RN-09 (imagen completa):** Ninguna foto se recorta ni se estira (`web-009` RN-10).
- **RN-10 (vigencia en la API):** La galería no comprueba `published_until`. Una petición vencida no llega en la respuesta (`api-012` CA-12), y la galería la trata como si no existiera.

## Datos, privacidad y auditoría

- Los datos son fotos y opiniones aceptadas por el zoológico y vigentes. Pueden mostrar personas, incluidos menores; la aceptación previa es la barrera (`api-010`).
- El portal no guarda nada en el navegador y no envía datos del visitante.
- No hay auditoría: el portal no escribe en la API.
- No requiere DBR ni cambios de esquema.

## Flujos y errores

### Flujo principal

1. El visitante abre `index.html`. La galería muestra el estado de carga.
2. `js/api.js` pide `GET {base}/memories?limit=6`.
3. `js/memories.js` (nuevo) renderiza las fotos con texto seguro, imagen completa o marcador y la opinión.
4. Si la respuesta es vacía, muestra el estado de vacío. Si falla, muestra el error con «Reintentar».

### Errores esperados

- Red caída, `5xx`, `404` de la ruta, JSON inválido o tiempo de espera excedido → estado de error (CA-04).
- `200` con `data: []` → estado de vacío (CA-03).
- Imagen que no carga → marcador (CA-07).
- Origen no permitido por CORS → el navegador bloquea la lectura; la galería muestra el error (CA-04).

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:**
  - `api-012` (lectura pública) y `api-010` (datos, publicación, vigencia); en el ambiente de pruebas, con `CORS_ALLOWED_ORIGINS` que incluya `http://localhost:8080` (`api-011` RN-12).
  - `web-009` (módulo `js/api.js`, meta `arca-api-base` y `news-events.css` de tokens). Esta spec se implementa después de `web-009`.
  - **ADR 0024 (Aceptado el 2026-11-07):** su excepción cubre solo los módulos de `web-009` (portada, `noticias.html`, `eventos.html`). No se modifica.
  - **ADR 0027 (Propuesto, 2026-11-10):** excepción de arquitectura para la galería dinámica. Debe aprobarse antes de aprobar esta spec. Sin aprobación, la galería no se implementa con HTML y JavaScript estático, porque el portal debe seguir `apps/web/AGENTS.md`.
  - `api-013` (Borrador) y ADR 0026 (Propuesto): `image_url` sale de `MEDIA_PUBLIC_URL` o de `APP_URL` más `/media`, y puede ser `http` o `https` (`api-013` RN-04). Ver «Nota de almacenamiento».
  - No hay dependencias nuevas.
- **Riesgos:**
  - Opinión con datos personales que se publicaría al aceptar (`api-010` riesgos). La revisión manual es la barrera.
  - Una galería vacía al principio: el zoológico debe aceptar peticiones antes de que se vea contenido. El texto de vacío lo cubre (CA-03).
  - Si la API no responde, la portada muestra el error y no fotos de muestra.
  - Imágenes grandes: el navegador las carga con `lazy`; el coste se revisa en la verificación manual.
  - Retirada tardía: una foto retirada del dashboard antes de su vencimiento puede seguir visible hasta que se recargue la galería o la caché del navegador caduque (`api-010` pregunta 1).
  - Alcance que crece: si la galería necesita paginación, filtros o una página propia, se reevalúa el ADR 0027 (su sección «Reevaluación»).
- **Preguntas pendientes:**
  1. ¿Cuántos momentos muestra la galería? Propuesta: 6, en una sola tanda y sin «Cargar más».
  2. Resuelta por el responsable (2026-11-10): la excepción de arquitectura se registra en ADR 0027, no como enmienda del 0024.
  3. ¿El texto del marcador de vacío y del error es el propuesto? Propuesta: «Aún no hay momentos publicados.» y «No pudimos cargar los momentos. Inténtalo más tarde.».

## Nota de almacenamiento (2026-11-10)

Decisión del responsable pendiente de aprobación formal del equipo. Esta spec no cambia su estado (Borrador).

- **CA-07 (imagen):** `image_url` de un momento aceptado sale de la carpeta versionada de la API (`/media/memories/...`), y puede ser `http` o `https` según `APP_URL` o `MEDIA_PUBLIC_URL` (`api-013` RN-04). Por la decisión del responsable (`api-013` D-02), los momentos pendientes y rechazados no tienen `image_url` en ninguna respuesta, así que la galería nunca los recibe. Si la API devuelve `null` porque no hay imagen, o porque el archivo no ha llegado todavía con `pull`, el marcador de CA-07 se mantiene.
- **Sin cambios de código por esta spec por la parte de almacenamiento.** La galería no necesita CORS para `<img>` (`api-013` RN-12). No se añade ninguna llamada nueva al almacenamiento.
- **Dependencia de ADR:** la galería depende de ADR 0027 (Propuesto), no de una enmienda al ADR 0024.
- **Otras specs con la frase «APP_URL, storage:link y disco persistente»:** `apps/web/specs/009-dynamic-news-events.md` (línea 204) describe el checklist actual, válido para el valor por defecto. Se revisará cuando se apruebe `api-013`, porque la carpeta `media/` añade `PUBLIC_MEDIA_DISK=media` y el enlace `public/media`.

## Revisión

- Aprobadores y fecha: pendiente.
- Aprobado por: (pendiente, nombre del compañero)
- Evidencia/enlaces: `apps/web/src/index.html` (sección `#galeria`, líneas 944 y siguientes), `apps/web/specs/009-dynamic-news-events.md` (módulo de red, estados y escapado), `apps/api/specs/012-public-memories-read.md`, `apps/api/specs/010-visitor-memory-requests.md`, `apps/dashboard/specs/008-memory-moderation.md`, `docs/adr/0024-web-static-portal-exception.md`, `docs/adr/0027-dynamic-public-memories-gallery.md`.
