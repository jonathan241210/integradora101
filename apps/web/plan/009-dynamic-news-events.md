# Plan técnico · 009 · dynamic-news-events

- Spec: `apps/web/specs/009-dynamic-news-events.md`
- Estado de spec: Aprobada (Jonathan, 2026-11-07; cambios del 2026-11-08 aprobados por Jonathan, 2026-11-08). Las tasks T-xx se marcan solo con evidencia.
- Estado del plan: Aprobado (Jonathan, 2026-11-07), con las decisiones de puerto de desarrollo, contenido completo por tarjeta, imagen completa, reintento en las tres páginas y 3 noticias y 2 eventos en la portada (la versión del 2026-11-07 tenía 3 eventos). Los cambios del 2026-11-08 quedan **aprobados por Jonathan el 2026-11-08** (incluida la pregunta 9: peticiones de detalle a la vez).
- ADR de excepción: `docs/adr/0024-web-static-portal-exception.md` (Aceptado el 2026-11-07).
- Responsable técnico: por identificar (frontend del portal)
- Dependencias de API: `api-011` (`GET /api/v1/news`, `GET /api/v1/news/{news}`, `GET /api/v1/events?limit=`) y `api-006` (`GET /api/v1/events`).

## Diseño de solución

El portal sigue siendo un sitio estático (`apps/web/src/`), sin build, sin `package.json` y sin paquetes. Se conecta a la API pública con dos piezas de JavaScript clásico (`defer`, como `script.js` y `accessibility.js`):

- `js/api.js`: único módulo que llama a `fetch`. Construye la URL a partir de la base configurada en la meta de la página, pide JSON con `credentials: 'omit'`, aplica un tiempo máximo de 10 segundos y convierte cualquier fallo en un resultado de error uniforme. Valida el identificador de noticia antes de construir la ruta. No conoce el DOM.
- `js/news-events.js`: presenta los datos. Recibe resultados de `api.js`, pinta estados (carga, vacío, error), tarjetas, el bloque de contenido completo de cada noticia y formatea fechas. No conoce la red. Todo el texto se escribe con `textContent`; las imágenes se aceptan solo con URLs `http`, `https` o relativas.

Las páginas `index.html`, `noticias.html` y `eventos.html` comparten las mismas clases de tarjetas (`news-grid`, `news-card`, `event-grid`, `event-card`) y un archivo CSS nuevo (`news-events.css`) para estados, imagen completa, bloque de contenido y ajustes responsive. `styles.css` no cambia.

Se usa script clásico y no módulo ES para no depender de la detección de módulos de Node en el runner de pruebas. El patrón es el mismo que `accessibility.js` (`008`), que las pruebas cargan en un contexto `node:vm` con DOM simulado.

Flujo de la portada: cada sección se marca como «cargando» en el HTML inicial → `api.js` pide `news?limit=3` y `events?limit=2` en paralelo (el límite de eventos viene de `data-ne-limit="2"` en `#eventGrid`) → `news-events.js` reemplaza el estado por tarjetas, vacío o error. Cada tarjeta de noticia dispara su propio detalle al mostrarse (ver siguiente punto).

Flujo de `noticias.html`: pide la página 1 con `limit=10`; «Cargar más» pide la página siguiente solo si `meta.has_more` es `true`, y añade tarjetas sin borrar las anteriores. Cada tarjeta nueva pide su detalle al mostrarse.

Flujo del contenido completo por noticia (CA-14, cambio del 2026-11-08 aprobado): al mostrar una tarjeta de noticia, `news-events.js` llama una vez a `ArcaApi.getNewsItem(id)`, muestra «Cargando contenido…» dentro del bloque de la tarjeta y, al llegar, escribe `content` como texto en ese bloque. Si falla, muestra el mensaje de error y un botón «Reintentar» que vuelve a pedir solo ese detalle. El resultado se guarda solo en una variable de la tarjeta (memoria); no se vuelve a pedir mientras la página esté abierta. Las peticiones de detalle de una página se lanzan **todas a la vez**, una por tarjeta, sin cola ni serialización (pregunta 9, resuelta el 2026-11-08).

### Decisión: detalle por noticia al mostrarse la tarjeta (decisión 7 de 2026-11-08, aprobada el 2026-11-08)

Sustituye a la decisión de 2026-11-07 («detalle al expandir»), que queda sin efecto. Jonathan pide que el contenido completo se vea en la tarjeta sin acción del visitante, así que el detalle se pide al mostrar cada tarjeta de noticia, con estado de carga y error propios. Razones:

1. **Listado ligero:** `api-011` RN-07 excluye `content` del listado. Incluirlo multiplicaría el peso de cada respuesta (hasta 50 noticias por página, cada una con hasta 20 000 caracteres). Se mantiene el listado sin `content`.
2. **Sin cambio en la API:** `GET /api/v1/news/{news}` ya existe en `api-011` (CA-05). No se cambia el contrato del listado.
3. **Sin almacenamiento:** el contenido vive solo en memoria de la página (RN-03).
4. **Coste aceptado:** una petición extra por noticia mostrada y visita, a cambio de no requerir interacción. El coste y su mitigación se describen en «Riesgos y decisiones» (aprobados el 2026-11-08).

Alternativas descartadas: incluir `content` en el listado (requiere cambiar `api-011` RN-07); pedir el detalle solo al pulsar un botón (decisión del 2026-11-08); mantener el botón «Ver todo el contenido» y la expansión (decisión del 2026-11-08).

### Decisión: imagen completa y centrada (decisión 3 de 2026-11-07)

Las imágenes se muestran dentro de una caja de proporción fija (`ne-media`), con el archivo completo, centrado y sin recorte:

- La caja tiene `aspect-ratio` fijo y `background: var(--surface-subtle)` (token existente de `styles.css`, sin hex en `news-events.css`).
- La imagen usa `object-fit: contain`, `object-position: center`, y `max-width: 100%`, `max-height: 100%`, `width: auto`, `height: auto`, dentro de la caja con `display: grid; place-items: center`. Con `width: auto` y `height: auto` la imagen no se amplía por encima de su tamaño natural: no hay sensación de zoom y no hay recorte.
- Sin `transform` en hover ni animaciones sobre la imagen.
- El placeholder usa la misma caja y las mismas reglas (CA-07 y CA-15 e).

Esta regla se aplica en la portada y en las dos páginas. El dashboard aplica el mismo criterio en `dashboard-007`.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| Portal (HTML) | `apps/web/src/index.html` | Reemplazar tarjetas de muestra de `#noticias` y `#eventos` por contenedores con estado inicial de carga y enlaces «Ver todas»; `#eventGrid` con `data-ne-limit="2"` (cambio del 2026-11-08); añadir `<meta name="arca-api-base" content="…">` (valor por ambiente, ver CA-16); cargar `news-events.css`, `js/api.js` y `js/news-events.js` con `defer`. Eliminar la nota «Las noticias son contenido de muestra». |
| Portal (HTML) | `apps/web/src/noticias.html` (nuevo) | Listado paginado de noticias con «Cargar más» y, en cada tarjeta, el bloque de contenido completo (CA-14, cambio del 2026-11-08). Misma meta que `index.html`. |
| Portal (HTML) | `apps/web/src/eventos.html` (nuevo) | Listado completo de eventos vigentes con estados. Misma meta que `index.html`. |
| Portal (JS) | `apps/web/src/js/api.js` (nuevo) | `fetch` centralizado: base URL desde la meta (vacía → `/api/v1`), `Accept: application/json`, `credentials: 'omit'`, sin `Authorization` ni CSRF, `AbortController` de 10 s, validación de `data`, normalización de errores y `getNewsItem(id)` con validación de entero positivo. Expone `ArcaApi.getNews({ limit, page })`, `ArcaApi.getEvents({ limit })` y `ArcaApi.getNewsItem(id)`. Sin cambios por el 2026-11-08. |
| Portal (JS) | `apps/web/src/js/news-events.js` (nuevo) | Renderizadores de tarjetas de noticias y eventos; estados `loading`, `empty`, `error`; bloque de contenido por noticia con carga automática, error y «Reintentar» (CA-14, cambio del 2026-11-08); caja de imagen y placeholder; formateadores de fecha en español. Sin `fetch`, sin `innerHTML`. |
| Portal (CSS) | `apps/web/src/news-events.css` (nuevo) | Estados (`role="status"`), `aria-busy`, caja de imagen `ne-media` (CA-15), placeholder, bloque de contenido `ne-content` con `white-space: pre-line` para los saltos de línea de `content`, foco visible y ajustes para 360 px. Solo clases nuevas con prefijo `ne-`. |
| Pruebas | `apps/web/src/tests/news-events.test.mjs` (nuevo) | Tests `CA-01` a `CA-16` con `node:test`, `node:vm`, DOM y `fetch` simulados, y lectura de `news-events.css` para las reglas de imagen. Sin red real. |
| Pruebas existentes | `apps/web/src/tests/relocation.test.mjs` | Solo revisión. Si una comprobación depende de las tarjetas de muestra, se informa antes de cambiarla. |
| Documentación | `apps/web/docs/portal-noticias-eventos.md` (por crear) | Cómo configurar la base URL por página y ambiente, orígenes, cómo ejecutar local en `localhost:8080`, carga automática del contenido por noticia, y la excepción de arquitectura con enlace al ADR 0024. |
| Documentación | `apps/web/README.md` | Solo como tarea (T-22): cambiar el comando a `php -S localhost:8080 -t apps/web/src`. No se edita en esta spec. |
| Infraestructura | `infra/README.md` | Sección «Portal público (noticias y eventos)» (ver la spec). |
| ADR | `docs/adr/0024-web-static-portal-exception.md` | ADR de excepción (Aceptado el 2026-11-07 por el equipo). Esta spec solo lo referencia. |
| API | Ninguno | Consume `api-011` y `api-006`; no cambia el backend. |

## Contrato y datos

### Endpoints consumidos (solo `GET`)

| Uso | Ruta | Respuesta esperada | Uso en la UI |
|---|---|---|---|
| Portada, noticias | `GET {base}/news?limit=3` | `{"data":[…],"meta":{…}}` | `#noticias` (CA-01) |
| Listado de noticias | `GET {base}/news?page=N&limit=10` | Igual | `noticias.html` (CA-10) |
| Detalle de noticia | `GET {base}/news/{id}` | `{"data":{…,"content":"…"}}` | Bloque de contenido de cada tarjeta de noticia, al mostrarse (CA-14) |
| Portada, eventos | `GET {base}/events?limit=2` | `{"data":[…]}` | `#eventos` (CA-02, cambio del 2026-11-08: antes `limit=3`) |
| Listado de eventos | `GET {base}/events` | `{"data":[…]}` | `eventos.html` (CA-10) |

### Forma de los datos que consume la UI

Noticia del listado (`api-011` `PublicNewsResource`): `id`, `title`, `description`, `category`, `published_date`, `start_date`, `end_date`, `image_url`. Sin `content`.

Noticia del detalle (`api-011` `PublicNewsDetailResource`): lo anterior más `content`.

Evento (`api-006`, `EventResource`): `id`, `name`, `description`, `image_path`, `image_url`, `start_date`, `end_date`, `start_time`, `end_time`, `location`, `is_active`. La UI usa `image_url` y no `image_path`.

### Base URL (por página, CA-16)

- `api.js` lee `document.querySelector('meta[name="arca-api-base"]')?.content`. Si está vacía o ausente, usa `/api/v1` (ruta relativa, requiere proxy en el mismo origen).
- La base no incluye barra final. `api.js` normaliza la barra final y construye `…/news?…` con `URLSearchParams`.
- Cada una de las tres páginas tiene la misma meta. Cada ambiente define el valor (pregunta 2 de la spec). No hay valores fijos en el código del módulo.
- Desarrollo: el portal se sirve en `http://localhost:8080` (origen en `CORS_ALLOWED_ORIGINS`, `api-011` RN-12). El valor de la meta en desarrollo apunta a la API en su puerto (ejemplo: `http://localhost:8000/api/v1`); valor de desarrollo aprobado en el plan el 2026-11-07.

### Interfaz de `api.js` (resultado uniforme)

- Éxito: `{ ok: true, data, meta }`.
- Fallo: `{ ok: false, reason: 'network' | 'http' | 'timeout' | 'invalid' | 'bad-id' }`. `bad-id` solo lo devuelve `getNewsItem` cuando el identificador no es un entero positivo; no hace petición. La UI no muestra `reason`; solo elige el texto de error de CA-05 o de CA-14 d).

### Formato de fechas

- Entrada `YYYY-MM-DD` validada con expresión regular. Se separan año, mes y día y se usa una tabla de nombres de meses en español (sin depender de `Intl` ni de datos de región del navegador).
- Ejemplo: `2026-11-07` → `7 de noviembre de 2026`.
- Rango de evento: si `end_date` es nulo o igual a `start_date`, una sola fecha; si no, «del 22 al 29 de octubre de 2026» (mismo mes y año) o «del 30 de octubre de 2026 al 2 de noviembre de 2026» (meses distintos).
- Fecha inválida o ausente → cadena vacía; el elemento no se muestra.

### Imágenes

- Se acepta `image_url` si es una URL absoluta `https:` o `http:`, o una ruta que empieza por `/`. Cualquier otro esquema (`javascript:`, `data:`, `blob:`) se descarta.
- Se crea `<img>` con `loading="lazy"`, `decoding="async"` y `alt` igual al título/nombre, dentro de la caja `ne-media` (CA-15). Si falla la carga (`error` listener), se sustituye por el placeholder.
- Sin `image_url` → placeholder con icono Bootstrap (`bi bi-newspaper` o `bi bi-calendar-event`) con `aria-hidden="true"`, en la misma caja.
- Reglas CSS de `ne-media` (CA-15): `aspect-ratio` fijo; `background: var(--surface-subtle)`; `display: grid; place-items: center` en la caja; en la imagen, `object-fit: contain; object-position: center; width: auto; height: auto; max-width: 100%; max-height: 100%`. Ninguna regla de imagen de contenido usa `cover` ni `fill`.

### Bloque de contenido completo por noticia (CA-14, cambio del 2026-11-08, aprobado el 2026-11-08)

- Markup dentro de cada tarjeta de noticia: un `div.ne-content` con `<p class="ne-content-label">Contenido:</p>` (texto, no encabezado), un elemento con `role="status"` para «Cargando contenido…» y para el error, un `<p class="ne-content-text">` para el texto (con `white-space: pre-line`, CSS en T-07/T-19) y, solo en estado de error, un `button type="button"` «Reintentar». No hay `aria-expanded`, `aria-controls` ni botón de expansión. No necesita `id` propio.
- Estados del bloque: `loading` («Cargando contenido…», `role="status"`), `ready` (texto de `content`), `error` («No pudimos cargar el contenido de esta noticia. Inténtalo más tarde.», `role="status"`, con «Reintentar») y `empty` (bloque oculto: `content` vacío o solo con espacios).
- Transiciones: al mostrarse la tarjeta → `loading` y una llamada a `ArcaApi.getNewsItem(id)`. Éxito con `content` no vacío → `ready`. Éxito con `content` vacío → `empty`. Fallo (`ok: false`, incluido `404` y JSON no válido) → `error`. «Reintentar» → `loading` y una nueva llamada solo para ese detalle; el resultado sigue las mismas transiciones. Una petición en curso no se duplica.
- El botón «Reintentar» es nativo: Enter y Espacio funcionan sin código extra. El foco se mueve según la pregunta 8 de la spec (resuelta 2026-11-08): igual que CA-05, solo tras activar «Reintentar».
- Orden de las peticiones de detalle de una página: **a la vez** (pregunta 9 de la spec, resuelta por Jonathan el 2026-11-08). Cada tarjeta lanza su `getNewsItem(id)` al mostrarse, sin esperar a las demás ni a una cola. La ráfaga máxima es de 3 peticiones en la portada y de 10 por página de `noticias.html` (más 10 por cada «Cargar más»).

### Errores y compatibilidad

- Estados: `loading`, `empty`, `error`, `ready`. En la portada, `noticias.html` y `eventos.html`, el estado `error` incluye el botón «Reintentar» que vuelve a pedir la sección con los mismos parámetros, sin duplicar tarjetas, y gestiona el foco (estado de carga, luego contenedor o nuevo botón) (CA-05). Si falla «Cargar más», se conserva lo mostrado y ese botón sirve de reintento. Cada sección tiene un único elemento de estado con `role="status"` y `aria-live="polite"`.
- Si `noticias.html` falla al cargar la página siguiente, las tarjetas anteriores se mantienen y el estado de error aparece debajo.
- Si el detalle de una noticia falla, solo cambia el bloque de esa tarjeta; el resto de la página sigue igual (CA-14 d y h).
- Navegadores sin `fetch`, `AbortController` o `URLSearchParams`: `api.js` devuelve `{ ok: false, reason: 'network' }` y la UI muestra el error; no se rompe el resto del portal.
- Sin JavaScript: la portada muestra el estado inicial «Cargando…» indefinidamente. Se acepta como limitación documentada; el contenido de muestra no se conserva como respaldo (RN-02).

## Seguridad, offline y operación

- **Solo lectura pública:** `GET`, sin cookies (`credentials: 'omit'`), sin cabeceras de autenticación. No hay sesión ni token.
- **Texto seguro:** toda cadena de la API, incluido `content`, se escribe con `textContent` o con propiedades de `Element` que no interpretan HTML. La lista de funciones prohibidas (`innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval`, `new Function`) se verifica en CA-06 con una búsqueda sobre los archivos de la feature.
- **URLs:** solo `http`, `https` y rutas relativas (RN-07). No se ejecuta contenido de la API.
- **Identificadores:** `getNewsItem(id)` acepta solo enteros positivos antes de construir la ruta, para que una cadena rara no llegue a la URL.
- **Almacenamiento:** ninguno para el contenido. No se usan `localStorage` ni `sessionStorage` en esta feature (RN-03).
- **Datos del visitante:** no se envían. No hay analíticas nuevas.
- **Contenido de muestra:** se elimina del HTML; no hay respaldo estático que pueda confundirse con contenido real (RN-02).
- **Accesibilidad:** `role="status"` para estados, `aria-busy` en contenedores, `alt` en imágenes informativas, placeholders decorativos, `button` nativo para «Reintentar», etiqueta «Contenido:» como texto (no encabezado), foco visible y encabezados en orden (`h2` de sección y `h3` de tarjeta). Las transformaciones de `008` se revisan con contenido dinámico (ver riesgos).
- **Rendimiento:** imágenes diferidas (`loading="lazy"`), `content-visibility` existente, sin bibliotecas. Por visita a la portada: 2 listados y hasta 3 detalles de noticia; en `noticias.html`, 1 listado por página y un detalle por tarjeta mostrada (cambio del 2026-11-08, ver riesgos).
- **Portabilidad:** HTML, CSS y JS estáticos; funcionan igual en local y en cualquier servidor estático. La API es la única dependencia (ADR 0013 no aplica al portal).
- **Operación:** la base URL (meta por página) y el origen en CORS se configuran por ambiente (`infra/README.md`). Sin secretos.

## Mapeo de criterios a pruebas

Todas las pruebas están en `apps/web/src/tests/news-events.test.mjs`, con nombres `CA-01 dynamic-news-events: …`. Se ejecutan con `node --test apps/web/src/tests/news-events.test.mjs`.

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | Portada: con `fetch` simulado devuelve tres noticias; el DOM de `#noticias` tiene tres tarjetas en orden, cada una con su bloque «Contenido:» (CA-14), sin tarjetas de muestra ni la nota de muestra. | `web` / `apps/web/src/tests/news-events.test.mjs` |
| CA-02 | Portada: con `fetch` simulado devuelve dos eventos; la petición es `events?limit=2`, `#eventGrid` tiene `data-ne-limit="2"`; `#eventos` muestra nombre, fechas, horario y ubicación; no queda «Actividades de ejemplo». | `web` / `news-events.test.mjs` |
| CA-03 | Estado de carga: antes de resolver `fetch`, existe `role="status"` con «Cargando noticias…» y `aria-busy="true"`; tras resolver, ambos se retiran. | `web` / `news-events.test.mjs` |
| CA-04 | Respuesta `data: []` en noticias y eventos muestra los textos de vacío y ninguna tarjeta. | `web` / `news-events.test.mjs` |
| CA-05 | Red caída, `500`, JSON inválido y `data` ausente muestran el texto de error; no quedan datos previos; no hay excepción sin capturar. «Reintentar» en portada, `noticias.html` y `eventos.html`: nueva petición, estado de carga, sin tarjetas duplicadas y foco. | `web` / `news-events.test.mjs` |
| CA-06 | Título, ubicación y `content` con `<img src=x onerror=…>` se muestran como texto (`textContent` del nodo) sin crear `img` ni `script`; búsqueda estática de `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval` y `new Function` en `js/` sin resultados. | `web` / `news-events.test.mjs` |
| CA-07 | `image_url` `https` → `img` con `loading`, `decoding` y `alt`; `javascript:` y `data:` → placeholder; evento `error` de la imagen → placeholder; `null` → placeholder con `aria-hidden`. | `web` / `news-events.test.mjs` |
| CA-08 | Fechas `2026-11-07` → «7 de noviembre de 2026»; rangos de mismo mes, de meses distintos y de fin nulo; `2026-02-30` y texto inválido → sin salida de error ni «Invalid Date». | `web` / `news-events.test.mjs` |
| CA-09 | `api.js` es el único archivo que contiene `fetch(`; la llamada usa `credentials: 'omit'`, `Accept`, sin `Authorization` ni CSRF; base URL desde la meta y `/api/v1` por defecto; `AbortController` con 10 s; `getNewsItem('abc')`, `getNewsItem('0')` y `getNewsItem('1.5')` devuelven `bad-id` sin llamar a `fetch`. | `web` / `news-events.test.mjs` |
| CA-10 | Enlaces «Ver todas» apuntan a `noticias.html` y `eventos.html`; `noticias.html` pide `page` y `limit=10`, muestra «Cargar más» solo con `has_more: true` y añade tarjetas; `eventos.html` pide `events` sin `limit`; las tarjetas de `noticias.html` tienen el bloque de CA-14. | `web` / `news-events.test.mjs` |
| CA-11 | `index.html` conserva los IDs de navegación, mapa, búsqueda y formularios, y carga `script.js`, `animations.js` y `accessibility.js`; `relocation.test.mjs` se ejecuta y sus resultados se registran. | `web` / `news-events.test.mjs` (estructura) + `relocation.test.mjs` (ejecución) |
| CA-12 | Reglas CSS presentes en `news-events.css` (`max-width: 100%` en imágenes, `:focus-visible` en botones y enlaces, `prefers-reduced-motion` si hay animación); verificación manual a 360/390/768/1024/1366 px en navegador. | `web` / `news-events.test.mjs` (CSS) + manual |
| CA-13 | Lista de nombres `CA-01`…`CA-12` y `CA-14`…`CA-16` en el archivo de pruebas y verificación de que cada uno aparece como test. | `web` / `news-events.test.mjs` |
| CA-14 | Con `fetch` simulado y DOM simulado: al mostrarse una tarjeta pide `news/{id}` una sola vez y muestra «Cargando contenido…» en `role="status"`; al resolver muestra `content` como texto con saltos de línea; no hay botón de expandir ni `aria-expanded`; con `404`, fallo o JSON inválido muestra el mensaje y «Reintentar», que pide solo ese detalle; `content` vacío oculta el bloque; al añadir tarjetas con «Cargar más» no se repiten peticiones; una tarjeta fallida no bloquea las demás. | `web` / `news-events.test.mjs` |
| CA-15 | Reglas CSS de `ne-media` en `news-events.css`: `object-fit: contain`, `object-position: center`, `max-width: 100%`, `max-height: 100%`, `width: auto`, `height: auto`, `background` con `var(--surface-subtle)`, sin `cover`, `fill`, `transform` ni colores hex en esas reglas; el placeholder usa la misma clase. Verificación visual manual a 360 px y 1366 px (T-11). | `web` / `news-events.test.mjs` (CSS) + manual |
| CA-16 | `index.html`, `noticias.html` y `eventos.html` contienen exactamente una `<meta name="arca-api-base">` con el mismo `content`, terminado en `/api/v1`; `apps/web/README.md` no se comprueba (se corrige en T-22). | `web` / `news-events.test.mjs` |

Las pruebas usan un `fetch` simulado y nunca llaman a la API real. La prueba de integración real se hace en la verificación manual (T-11), no en la suite automática.

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Parcial | HTML, CSS y JavaScript estáticos, sin dependencias ni servicios propietarios; el stack declarado para el portal es React 19 + TS + Vite (`apps/web/AGENTS.md`). **Excepción:** mantener HTML y JS estático para estas páginas, ADR 0024 (Aceptado el 2026-11-07). |
| II. La spec manda | Sí | Spec 009 Aprobada (Jonathan, 2026-11-07; cambios del 2026-11-08 aprobados el 2026-11-08), con este plan, sus tasks y el ADR 0024 Aceptado. |
| III. Lógica separada de la interfaz | Parcial | No hay reglas de negocio en el portal (visibilidad, vigencia, orden y «hoy» en la API; RN-01). No hay `fetch` en componentes de presentación: el `fetch` vive solo en `js/api.js`. **Excepción:** la UI no usa `@arca/api-client` ni hooks. ADR 0024. |
| IV. Un test por criterio | Sí, con runner distinto | Tests `CA-01` a `CA-16` con `node --test`, como `web-001` y `web-008`. El AGENTS de `web` pide Vitest: la excepción de runner está en el ADR 0024. |
| V. Una sola fuente de verdad para los datos | Sí | El portal no guarda datos de negocio ni cachea contenido; la API es la única fuente. Sin escritura. |
| VI. Código en inglés, personas en español | Sí | Identificadores y nombres de archivo en inglés (`news-events.js`, `api.js`, `ArcaApi`, `ne-media`, `ne-content`); textos visibles, de estado y de error en español. |

**Excepciones registradas en el ADR 0024 (Aceptado el 2026-11-07):** (1) arquitectura estática sin `@arca/api-client` ni build para `apps/web` (`AGENTS.md` de `web`, Constitución III); (2) runner `node --test` en lugar de Vitest para este módulo (Constitución IV, con precedente en `web-001` y `web-008`). Si el ADR no se aprueba, no se implementa esta spec.

## Riesgos y decisiones

- **ADR requerido:** sí, `docs/adr/0024-web-static-portal-exception.md` (Aceptado el 2026-11-07). No se requiere ADR de dependencia.
- **Alternativas consideradas:**
  - Migrar ahora a React + Vite + `@arca/api-client`: descartada en esta spec; la migración se reevalúa con la spec de pagos y su ADR (ADR 0024).
  - Generar el HTML en build-time con datos de la API: descartada porque el contenido debe reflejar publicaciones sin redeploy.
  - Contenido de muestra como respaldo si la API falla: descartada (RN-02).
  - Usar módulos ES (`type="module"`): descartada para no depender de la detección de módulos de Node en `node --test`; se usa el patrón de `accessibility.js`.
  - Incluir `content` en el listado: descartada (ver «Decisión: detalle por noticia»); requiere cambiar `api-011` RN-07.
  - Pedir el detalle solo al pulsar un botón «Ver todo el contenido» y expandir la tarjeta (decisión de 2026-11-07): descartada el 2026-11-08 por decisión de Jonathan.
  - Recortar la imagen con `object-fit: cover` (estado actual en el dashboard): descartada por la decisión 3 de 2026-11-07.
- **Más peticiones (cambio del 2026-11-08, aprobado el 2026-11-08):** cada noticia mostrada pide su detalle. Por visita a la portada: 5 peticiones (2 listados y 3 detalles). En `noticias.html`: 1 listado por página y hasta 10 detalles por página, más 10 por cada «Cargar más». Mitigación: un detalle por tarjeta, sin repetirlo (RN-11; CA-14 a y h); la carga de una tarjeta no bloquea el listado ni a las demás; un fallo queda aislado en su tarjeta con «Reintentar» solo de ese detalle (CA-14 d); no hay caché persistente (RN-03), así que cada visita vuelve a pedirlos.
- **Ráfaga de peticiones simultáneas (pregunta 9, decisión 2026-11-08: a la vez):** al no serializar, una página de `noticias.html` lanza hasta 10 detalles a la vez, y la portada hasta 3. Riesgo: si la API o una capa intermedia limita la frecuencia de peticiones y responde con un código distinto de `2xx`, esa tarjeta muestra su error (CA-14 d) y se reintenta solo ese detalle. No se añade cola ni límite de concurrencia en esta spec; si la ráfaga da problemas en pruebas (T-11), se abre una spec de operación para limitar la concurrencia.
- **Bionic Reading (`008`) con contenido dinámico:** `accessibility.js` aplica las transformaciones al cargar el DOM. Las tarjetas y el contenido de noticias que llegan después podrían no recibir el formato. Mitigación: al terminar el render, `news-events.js` dispara un evento `CustomEvent` que `accessibility.js` puede escuchar si el modo está activo. Requiere un cambio en `008`; se propone como tarea. No está incluido en la aprobación del 2026-11-08 y requiere aprobación separada (T-12 abierta).
- **Puerto de desarrollo:** resuelto en 8080. Hay que arrancar el servidor en `localhost`, no en `127.0.0.1`, porque el origen cuenta el host (`api-011` RN-12). Corrección del README: T-22.
- **Meta repetida en tres páginas:** un cambio de ambiente debe hacerse en las tres. CA-16 evita que se desalineen.
- **Fallo de CORS:** el mensaje de error del portal es genérico; el diagnóstico se hace con `curl` (`infra/README.md`).
- **Sin JavaScript:** limitación aceptada y documentada.
- **Imagen pequeña:** no se amplía (CA-15 d); puede verse pequeña y centrada. Es intencional.

## Orden y aprobación

0. **Aprobado (2026-11-08):** Jonathan aprueba los cambios de spec, plan y tasks del 2026-11-08 y responde las preguntas 8 (foco tras «Reintentar» igual que CA-05) y 9 (peticiones de detalle a la vez). Se cumple P-04 de las tasks.
1. ADR 0024 aceptado el 2026-11-07 (requisito cumplido).
2. Spec 009, este plan y su Constitution Check aprobados el 2026-11-07. La pregunta 2 de la spec (producción) queda pendiente y no bloquea.
3. Confirmar que `api-011` está Implementada y disponible en el ambiente de pruebas con `CORS_ALLOWED_ORIGINS` que incluye `http://localhost:8080`.
4. `js/api.js` (incluye `getNewsItem`) y pruebas de CA-09.
5. `js/news-events.js`: escapado, imágenes, fechas, estados; pruebas de CA-03 a CA-08.
6. `index.html`: marcado de estado, enlaces, `#eventGrid` con `data-ne-limit="2"` y meta; render de noticias (3) y eventos (2); pruebas de CA-01, CA-02 y CA-16.
7. Bloque de contenido completo por tarjeta de noticia, con carga automática, error y «Reintentar» (CA-14); pruebas.
8. `noticias.html` y `eventos.html`; pruebas de CA-10.
9. `news-events.css`: estados, foco, bloque de contenido, caja de imagen (CA-15); pruebas de reglas CSS (CA-12, CA-15) y verificación manual.
10. Pruebas de integridad: CA-11 (estructura y `relocation.test.mjs`) y CA-13.
11. Verificación: `node --test apps/web/src/tests/news-events.test.mjs`, `node --test apps/web/src/tests/relocation.test.mjs`, `git diff --check`, prueba manual con API local en `localhost:8080`, `/verify` (apps/web sigue sin `package.json`; se reporta como no inicializada).
12. Documentación `apps/web/docs/portal-noticias-eventos.md` (por crear), corrección de `apps/web/README.md` (T-22) y sección en `infra/README.md`.

**Dependencias:** `api-011` (Aprobada el 2026-11-07; debe estar Implementada antes de probar el portal; incluye `news/{id}`), `api-006` (eventos), ADR 0024 (Aceptado el 2026-11-07), `008` (cambio opcional de integración de la lectura asistida, sujeto a aprobación separada), `dashboard-007` (mismo criterio de imagen; independiente).

**Aprobaciones requeridas:**

| Rol | Aprueba | Estado |
|---|---|---|
| Responsable funcional | Spec 009 (preguntas resueltas el 2026-11-07; producción pendiente, no bloquea) | Aprobado (Jonathan, 2026-11-07). Cambios del 2026-11-08 (incluidas preguntas 8 y 9): aprobado por Jonathan, 2026-11-08 |
| Equipo técnico | Este plan, Constitution Check y excepciones | Aprobado (Jonathan, 2026-11-07). Cambios del 2026-11-08: aprobado por Jonathan, 2026-11-08 |
| Equipo (ADR) | ADR 0024: excepción de arquitectura y runner | Aceptado (2026-11-07) |
