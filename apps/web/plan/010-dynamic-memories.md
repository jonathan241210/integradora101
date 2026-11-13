# Plan técnico · 010 · dynamic-memories

- Spec: `apps/web/specs/010-dynamic-memories.md` (Estado: **Aprobada**, Jonathan, responsable de backend, 2026-11-12; aprobar la spec no autoriza implementar).
- Estado: **Aprobado** (Jonathan, responsable de backend, 2026-11-13). Implementación pendiente de iniciar; coordinación en `docs/trabajo-paralelo-momentos-especies.md`.
  - Aviso vigente: no se marca ninguna T-xx sin evidencia. Las preguntas 1 a 7 del plan quedan resueltas el 2026-11-13 (sección «Preguntas»). La dependencia de `api-012` implementada sigue abierta.
- Tasks: `apps/web/tasks/010-dynamic-memories.md` (Aprobado, Jonathan, 2026-11-13; mismo NNN-slug; ninguna T-xx marcada).
- ADR de excepción: `docs/adr/0027-dynamic-public-memories-gallery.md` (Aceptado 2026-11-12, con la enmienda del carrusel confirmada por Jonathan el mismo día). `docs/adr/0024-web-static-portal-exception.md` no se modifica.
- Responsable técnico de implementación: Jonathan (coordina las sesiones de Claude Code). Plan y tasks aprobados por él, en nombre del equipo, el 2026-11-13 (pregunta 6).
- Dependencias:
  - `api-012` (`GET /api/v1/memories`): Aprobada 2026-11-12, **sin implementar**. Hasta que exista, las pruebas usan respuestas simuladas y la verificación real queda en T-15.
  - `api-010` (datos, publicación y vigencia): Aprobada 2026-11-12. DBR-012 aplicada en `arca_pruebas` (2026-11-11), Lista para backend.
  - `web-009` (módulo `js/api.js`, meta `arca-api-base`): reutilizado.
  - `web-011` (TulanPedia): comparte `apps/web/src/index.html` y `apps/web/src/js/api.js`. Ver «Coordinación con web-011».

## Diseño de solución

La galería «Momentos para recordar» (`#galeria`) sigue siendo HTML, CSS y JavaScript clásico, sin build, sin `package.json` y sin paquetes (ADR 0027, condiciones 1 a 7). Es el mismo patrón de `web-009`, con dos piezas de comportamiento nuevas y separadas:

1. **Red (`js/api.js`).** Se añade `getMemories(options)` al objeto `ArcaApi` existente. Es la única función de red de la galería. Usa `request` sin cambios: base desde `<meta name="arca-api-base">`, `credentials: 'omit'`, `Accept: application/json`, 10 s de tiempo máximo y resultado uniforme `{ ok, data, meta }` o `{ ok: false, reason }`.
2. **Contenido (`js/memories.js`, nuevo).** Pide `getMemories({ limit: 6 })` una sola vez por carga, toma los 6 primeros en el orden de la API, pinta los estados (carga, vacío, error y reintento), construye cada momento (imagen o marcador, y opinión) con texto seguro y gestiona el foco. No conoce el temporizador ni la pausa. No llama a `fetch`.
3. **Carrusel (`js/memories-carousel.js`, nuevo).** Recibe los momentos ya construidos y se encarga solo del comportamiento: qué momento se ve, controles, indicadores, avance automático cada 5 s, pausa por cursor o foco, botón de pausa manual, anuncios y movimiento reducido. No conoce la red ni el contenido de cada momento.

La separación entre `memories.js` (contenido) y `memories-carousel.js` (comportamiento) permite probar cada parte con el DOM simulado de `web-009`. Es una decisión de este plan (pregunta 7).

Los scripts son clásicos con `defer`, como `accessibility.js` y `news-events.js`, y se prueban en `node:vm` con DOM simulado.

El carrusel no crea encabezados por momento ni landmarks nuevos: el encabezado de sección sigue siendo el `h2` «Momentos para recordar» de `#galeria`.

### Orden de los momentos y vigencia

- La galería muestra lo que devuelve la API, en su orden (RN-01). No filtra por `published_until` (RN-10) ni ordena (CA-15).
- Se piden 6 y se toman los 6 primeros de `data`. `meta.has_more` no se usa.
- Elementos de `data` que no son objetos se omiten (supuesto S-6; pregunta 1). Si no queda ninguno, es el estado de vacío (CA-03).

### Estados de la galería

| Estado | Qué se ve | Foco al terminar |
|---|---|---|
| Carga | `#memStatus` con «Cargando momentos…» (`role="status"`); `#memGallery` con `aria-busy="true"`; carrusel y «Reintentar» ocultos | Primera carga: ninguno. Reintento: a `#memStatus` (CA-04) |
| Éxito con 1 a 6 momentos | `#memStatus` oculto; `#memGallery` con `aria-busy="false"`; carrusel visible (con o sin controles, CA-17) | Reintento: a `#memGallery` (`tabindex="-1"`) |
| Vacío (`data: []` o sin objetos válidos) | `#memStatus` con «Aún no hay momentos publicados.»; sin carrusel ni «Reintentar» | Reintento: a `#memStatus` |
| Error (red, `5xx`, `404`, JSON no válido, `data` ausente, tiempo máximo) | `#memStatus` con «No pudimos cargar los momentos. Inténtalo más tarde.»; `#memRetry` visible; sin datos previos | Reintento que vuelve a fallar: a `#memRetry` |

«Reintentar» llama a `load()` con los mismos parámetros. Un `busy` evita dos peticiones en curso.

### Decisión: el temporizador y la pausa (CA-16, CA-20, CA-21, CA-23, RN-13)

- **Avance:** `setInterval` con `CAROUSEL_INTERVAL_MS = 5000` (inyectable para pruebas). Desde el último momento vuelve al primero. Cada cambio cambia el atributo `hidden` de los momentos; no hay animación de desplazamiento.
- **Motivos de pausa** (sin contar el movimiento reducido): (a) pausa manual con el botón (`#memPause`); (b) cursor encima del carrusel (`mouseenter` / `mouseleave`); (c) foco dentro del carrusel (`focusin` / `focusout`, comprobando `relatedTarget`). La pausa manual tiene prioridad: mientras está activa, (b) y (c) no la cambian (CA-23).
- **Cuándo hay temporizador:** solo con 2 a 6 momentos, sin pausa activa y sin movimiento reducido. Con un solo momento no hay temporizador (CA-17).
- **Navegación manual** (anterior, siguiente, indicador): cambia el momento, no cambia el estado de pausa (CA-23) y reinicia la cuenta de 5 s si el temporizador está activo (supuesto S-5; pregunta 4).
- **Botón de pausa:** visible solo con 2 a 6 momentos y sin movimiento reducido (RN-13). Nunca se muestra deshabilitado. Su texto alterna entre «Pausar carrusel» y «Reanudar carrusel». Al pulsarlo, `#memAnnounce` (`role="status"`) recibe «Carrusel en pausa.» o «Carrusel reanudado.». Los avances automáticos no escriben en `#memAnnounce`.
- **Movimiento reducido:** `matchMedia('(prefers-reduced-motion: reduce)')`. Si coincide: sin temporizador, sin botón de pausa, controles operativos, cambio sin desplazamiento animado (`scrollTo`, `scrollIntoView` con `behavior: 'smooth'` y `transition` no se usan en los cambios). Se escucha el evento `change` de la consulta: si cambia la preferencia con la página abierta, se recalcula.
- **Destrucción:** `mount()` devuelve `{ destroy() }`. Al reintentar, `memories.js` destruye la instancia anterior (cancela el temporizador) antes de montar la nueva. Los listeners del contenedor se registran una sola vez y consultan la instancia activa.

### Foco y teclado (CA-04, CA-18, CA-19)

- Orden de tabulación dentro del carrusel (orden del DOM): momentos (no enfocables), «Momento anterior», «Momento siguiente», indicadores, «Pausar/Reanudar carrusel».
- Los controles son `button type="button"` nativos: Intro y Espacio funcionan sin código extra.
- Pulsar un control no mueve el foco. Los cambios automáticos no llaman a `focus()`.
- Nombres accesibles: el contenedor es `role="region"` con `aria-label="Momentos para recordar"` y `aria-roledescription="carrusel"`; cada momento es `role="group"` con `aria-roledescription="diapositiva"` y `aria-label="Momento {n} de {total}"`; cada indicador tiene `aria-label="Ir al momento {n} de {total}"`; el momento actual lleva `aria-current="true"` (no solo color).

### Imagen y texto seguro (CA-06, CA-07, CA-08, RN-04, RN-07, RN-09)

- Cada momento construye un `div.mem-slide` con un `div.mem-media` y un `p.mem-opinion`. Solo se usan `image_url` y `opinion`. No se muestran ni se leen `id`, `published_at`, `published_until`, nombre, correo, apodo ni avatar (RN-07).
- Todo dato de la API se escribe con `textContent` o con propiedades del elemento (`img.src`, `setAttribute('alt', …)`). No se usan `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write` ni `eval` (CA-06).
- `safeImageUrl(value)`: acepta `https:` o `http:` absolutas (se parsean con `new URL`), o rutas que empiezan por `/` y no por `//` ni `/\`. El resto (`null`, `javascript:`, `data:`, `//host`, texto sin `/`, valores no texto) devuelve `null` y muestra el marcador (supuesto S-4; pregunta 2).
- Con URL válida: `img` con `loading="lazy"`, `decoding="async"`, `alt="Foto compartida por un visitante del zoológico"` y `src` asignado por propiedad. Un listener `error` sustituye la imagen por el marcador en la misma caja.
- Sin URL válida o si falla la carga: `span.mem-placeholder[aria-hidden="true"]` con el icono `bi-image` de Bootstrap Icons (ya cargado en `index.html`) en la misma caja.
- Caja fija: `.mem-media` con `aspect-ratio: 4 / 3`, `background: var(--surface-subtle)`, `display: grid; place-items: center`. La imagen usa `object-fit: contain; object-position: center; width: auto; height: auto; max-width: 100%; max-height: 100%`; sin `cover`, `fill`, `transform` ni zoom al pasar el cursor (CA-08, RN-09).

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| Portal (HTML) | `apps/web/src/index.html` | (1) Head: `<link rel="stylesheet" href="memories.css">` (ver «Coordinación con web-011»). (2) `#galeria`: reemplazar **solo** el bloque `<div class="fotos">…</div>` (líneas 964 a 968, con `f1`, `f2` y `f3`) por el marcado de `#memGallery`. (3) Scripts: `js/memories-carousel.js` y `js/memories.js` con `defer`, después de `js/api.js` y `js/news-events.js`. No se toca `.galeria-head` (incluido el enlace «Descubre los animales»), ni la meta de la línea 7, ni ninguna otra sección. |
| Portal (JS) | `apps/web/src/js/api.js` | Añadir `getMemories(options)` a `root.ArcaApi`: `request('/memories', { limit: opts.limit }, 'list')`. No cambiar `request`, `getNews`, `getEvents`, `getNewsItem` ni (si ya existe) `getSpecies`. |
| Portal (JS) | `apps/web/src/js/memories.js` (nuevo) | Contenido de la galería: `load()` con `getMemories({ limit: 6 })`, estados, construcción de momentos, `safeImageUrl`, reintento y foco. Expone `ArcaMemories` con sus helpers para las pruebas. Sin `fetch`. |
| Portal (JS) | `apps/web/src/js/memories-carousel.js` (nuevo) | Comportamiento del carrusel: `ArcaMemoriesCarousel.mount(container, slides, deps)` → `{ destroy }`. Controles, indicadores, temporizador, pausa, botón de pausa, anuncio y movimiento reducido. Sin red ni contenido. |
| Portal (CSS) | `apps/web/src/memories.css` (nuevo) | Caja `mem-media`, marcador, estados `mem-status`, carrusel `mem-carousel`, controles, indicadores, foco visible, ajustes de 360 px y `prefers-reduced-motion`. Solo clases con prefijo `mem-`. Sin hex ni URL remotas. |
| Pruebas | `apps/web/src/tests/memories.test.mjs` (nuevo) | Un test por CA-01 a CA-23 con `node:test`, `node:vm`, `node:fs`, `node:path` y DOM simulado. Sin red real. |
| Pruebas existentes | `apps/web/src/tests/relocation.test.mjs`, `apps/web/src/tests/news-events.test.mjs` | Solo ejecución como regresión. No se modifican. |
| Documentación | `apps/web/docs/momentos-galeria.md` (nuevo, por crear) | Referencia local (ver «Documentación local»). |
| Infraestructura | `infra/README.md` | Sección nueva «Portal público (Momentos para recordar)». Solo se añade al final, sin cambiar las secciones existentes. |
| Sin cambios | `apps/web/src/styles.css`, `animations.css`, `accessibility.*`, `news-events.css`, `script.js`, `apps/api/**`, `docs/adr/**` | Restricciones de la spec (fuera de alcance) y del ADR 0027. |

### Sobre `script.js` (bloque `.foto` heredado)

`script.js` líneas 174 a 177 registran un listener en `document.querySelectorAll('.foto')` que muestra «Fotografía N de la galería». Con el marcado nuevo, la lista queda vacía y el bloque no hace nada. **Este plan no lo elimina** por dos razones: `script.js` lo edita `web-011` (T-09), y `relocation.test.mjs` línea 288 usa esa línea como ancla de fin del controlador del mapa. Eliminarlo cambiaría esa prueba. Ver pregunta 3.

## Coordinación con web-011 (TulanPedia)

`web-011` (plan aprobado el 2026-11-13) edita los mismos archivos compartidos. Esta tabla fija el punto de contacto de cada uno. Las dos specs no tocan el contenido de las otras secciones.

| Archivo | web-010 toca | web-011 toca | Regla de integración |
|---|---|---|---|
| `index.html`, `<head>` (líneas 31 a 35) | `memories.css` después de `animals.css` si existe; si no, después de `news-events.css` | `animals.css` después de `news-events.css` | Orden final: `news-events.css` → `animals.css` → `memories.css`. |
| `index.html`, scripts (líneas 66 a 71) | `js/memories-carousel.js` y `js/memories.js` después de `js/animals.js` si existe; si no, después de `js/news-events.js` | `js/animals.js` después de `js/news-events.js` | Orden final: `api.js` → `news-events.js` → `animals.js` → `memories-carousel.js` → `memories.js`. |
| `index.html`, `#galeria` (líneas 944 a 970) | Solo `<div class="fotos">…</div>` (964 a 968) | No toca `#galeria` | Sin conflicto. |
| `index.html`, `#animales` | No toca | Sustituye las fichas de muestra y el texto de introducción | El test de «sin carrusel» de web-011 CA-18 debe acotarse a `#animales`. El carrusel de `#galeria` no debe contar como fallo. |
| `index.html`, `section[id]` | No añade ni quita secciones | Sin cambio de orden | Sin conflicto con web-011 CA-13. |
| `js/api.js` | Añade `getMemories` al final del objeto `ArcaApi` | Añade `getSpecies` | Ambas funciones se añaden tras `getNewsItem`; el segundo PR resuelve el conflicto de posición sin cambiar el contenido. |
| `script.js` | Nada | Retira el filtro de animales | Solo lo toca web-011. |
| `infra/README.md` | Sección nueva al final | Sección nueva «Portal público (TulanPedia)» | Ambas se añaden como secciones separadas. |
| Nombres | `mem-*`, `memStatus`, `memGallery`, `memRetry`, `memCarousel`, `memSlides`, `memPrev`, `memNext`, `memIndicators`, `memPause`, `memAnnounce`, `ArcaMemories`, `ArcaMemoriesCarousel` | `tp-*`, `animalStatus`, `animalGrid`, `animalRetry`, `categoryFilter`, `ArcaTulanpedia` | Sin colisiones de id, clase ni global. |
| Pruebas | `memories.test.mjs` | `animals.test.mjs` | Archivos separados. |

Orden de implementación recomendado: web-011 primero, o ambas en el mismo PR con el orden de la tabla. Ver pregunta 5.

## Contrato y datos

### Endpoint consumido (solo `GET`)

| Uso | Ruta | Respuesta esperada | Uso en la UI |
|---|---|---|---|
| Galería | `GET {base}/memories?limit=6` | `{"data": [ { "id", "opinion", "image_url", "published_at" } ], "meta": {…}}` | `#galeria` (CA-01, CA-15) |

- `base` sale de `<meta name="arca-api-base" content="http://localhost:8000/api/v1">` en `index.html` (ya existe, línea 7; CA-12). Desarrollo: el origen `http://localhost:8080` debe estar en `CORS_ALLOWED_ORIGINS` (`api-012` CA-09).
- No se usa `page` ni `has_more`. No se usa `GET /api/v1/memories/{id}` (no existe en `api-012`).
- La UI solo lee `image_url` y `opinion` de cada elemento. El resto de campos se ignora (RN-07).

### Interfaz de `js/api.js` (añadido)

```
getMemories: function (options) {
  var opts = options || {};
  return request('/memories', { limit: opts.limit }, 'list');
}
```

- `buildQuery` omite los valores `undefined`, así que sin `limit` la URL es `{base}/memories`. La galería siempre pasa `limit: 6`.
- Resultado: `{ ok: true, data, meta }` o `{ ok: false, reason: 'network' | 'http' | 'timeout' | 'invalid' }`. La UI no muestra `reason`; solo elige el texto de CA-04.

### Interfaz de `js/memories.js`

- `ArcaMemories.init()` (llamada al cargar el script; no hace nada si falta `#memGallery`).
- `ArcaMemories.load()`: una petición por llamada, `busy` contra duplicados.
- `ArcaMemories.helpers` (para pruebas): `safeImageUrl(value)`, `buildSlide(memory)`, `MEMORY_LIMIT` (6), `ALT_TEXT`.

### Interfaz de `js/memories-carousel.js`

- `ArcaMemoriesCarousel.mount(container, slides, deps)` → `{ destroy() }`.
  - `container`: `#memCarousel`. Los controles, indicadores y anuncio se buscan dentro de él por `id` (`#memPrev`, `#memNext`, `#memIndicators`, `#memPause`, `#memAnnounce`).
  - `slides`: array de elementos `div.mem-slide` ya construidos por `memories.js`.
  - `deps` (opcionales, para pruebas): `{ setInterval, clearInterval, matchMedia, intervalMs }`. Por defecto usa los globales y `CAROUSEL_INTERVAL_MS = 5000`.
- Con 1 momento: no crea indicadores, oculta controles y pausa, y no inicia temporizador (CA-17).
- Con 2 a 6 momentos: crea un indicador por momento, muestra el primero y aplica la regla de temporizador y pausa descrita arriba.

### Marcado de `#galeria` (propuesto, sustituye a `.fotos`)

```html
<div class="mem-gallery" id="memGallery" aria-busy="true" tabindex="-1">
  <p class="mem-status" id="memStatus" role="status" aria-live="polite" tabindex="-1">Cargando momentos…</p>
  <button class="mem-btn mem-retry" id="memRetry" type="button" hidden>Reintentar</button>
  <div class="mem-carousel" id="memCarousel" role="region" aria-roledescription="carrusel" aria-label="Momentos para recordar" hidden>
    <div class="mem-slides" id="memSlides"></div>
    <div class="mem-controls">
      <button class="mem-btn" id="memPrev" type="button">Momento anterior</button>
      <button class="mem-btn" id="memNext" type="button">Momento siguiente</button>
      <div class="mem-indicators" id="memIndicators"></div>
      <button class="mem-btn mem-pause" id="memPause" type="button" hidden>Pausar carrusel</button>
    </div>
    <p class="mem-announce" id="memAnnounce" role="status"></p>
  </div>
</div>
```

- Los `id` son únicos en la página. Ningún elemento nuevo es `section`, `header` ni `h3` (CA-10).
- Los indicadores son `button type="button"` creados por JS con `aria-label`; el de la posición actual lleva `aria-current="true"`.
- Los botones de anterior y siguiente tienen texto visible igual a su nombre accesible, para que coincidan (WCAG 2.5.3).

## Seguridad, offline y operación

- **Solo lectura pública (RN-03):** un `GET` a `memories`, sin cookies, sin `Authorization`, `credentials: 'omit'`. No hay sesión ni datos del visitante.
- **Sin estado en el navegador:** no se usan `localStorage`, `sessionStorage`, `IndexedDB` ni `document.cookie`. La pausa dura mientras la página esté abierta; recargar la página devuelve el avance automático (CA-23, CA-22).
- **Texto seguro (RN-04):** toda cadena de la API va por `textContent` o propiedades. Prueba estática de CA-06 sobre `memories.js` y `memories-carousel.js`.
- **URLs de imagen (RN-04):** solo `http`, `https` y rutas del mismo origen que empiezan por `/` (no `//`). El resto usa el marcador. `image_url` de `api-013` puede ser `http` o `https` según `MEDIA_PUBLIC_URL` o `APP_URL`; `<img>` no necesita CORS (`api-013` RN-12).
- **Sin datos personales (RN-07):** solo se usan `image_url` y `opinion`.
- **Accesibilidad (CA-02, CA-04, CA-10, CA-19, CA-23):** `role="status"` en `#memStatus` y `#memAnnounce`; `aria-busy` en `#memGallery`; `alt` en imágenes informativas; marcadores con `aria-hidden`; botones nativos; foco visible con `:focus-visible` y `outline` con `var(--primary)`; `prefers-reduced-motion` sin temporizador ni transiciones del carrusel.
- **Rendimiento:** una petición por carga, sin caché (RN-03). Imágenes con `loading="lazy"` y `decoding="async"`. Coste de imágenes: revisión manual (T-15).
- **Portabilidad:** HTML, CSS y JS estáticos. Funciona igual en `php -S localhost:8080 -t apps/web/src` y en un servidor estático. No depende de MySQL ni de la API para cargar la página; la galería sí depende de la API.
- **Operación:** `arca-api-base` y el origen en CORS se configuran por ambiente (`infra/README.md`). No hay secretos ni valores de producción en el repositorio.
- **Sin JavaScript:** la galería queda en «Cargando momentos…» (limitación aceptada, ADR 0027).

## Mapeo de criterios a pruebas

Todas las pruebas están en `apps/web/src/tests/memories.test.mjs`, con nombres `CA-NN dynamic-memories: …`. Se ejecutan con `node --test apps/web/src/tests/memories.test.mjs`. No llaman a la API real: `fetch`, `setInterval`, `clearInterval` y `matchMedia` se simulan en el contexto `node:vm`.

| Criterio | Prueba automatizada | App/ubicación | Evidencia manual |
|---|---|---|---|
| CA-01 | Respuesta simulada de 8 momentos: se dibujan 6 primeros en orden, cada uno con imagen y opinión; sin `f1`, `f2` ni `f3` en el HTML; solo se leen `image_url` y `opinion` (RN-07); `memories.js` no contiene `published_until` (RN-10) | `web` / `memories.test.mjs` | T-15 (API real) |
| CA-02 | Antes de resolver: `#memStatus` con «Cargando momentos…» y `role="status"`; `#memGallery` con `aria-busy="true"`; estático: el HTML inicial tiene lo mismo | `web` / `memories.test.mjs` | — |
| CA-03 | `data: []` → «Aún no hay momentos publicados.»; sin slides, carrusel ni «Reintentar» | `web` / `memories.test.mjs` | T-15 (vacío real) |
| CA-04 | Red caída, `500`, JSON inválido y `data` ausente → texto de error con `role="status"` y `#memRetry`; sin datos previos; «Reintentar» pide de nuevo, muestra carga y mueve el foco según el estado | `web` / `memories.test.mjs` | T-15 (API apagada) |
| CA-05 | Tras un error no hay `img` ni texto «Ver foto» ni slides de la carga anterior | `web` / `memories.test.mjs` | — |
| CA-06 | `<img src=x onerror=…>` en la opinión se muestra como texto y no crea `img` ni `script`; búsqueda estática de `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval` y `new Function` en `js/memories.js` y `js/memories-carousel.js` sin resultados | `web` / `memories.test.mjs` | — |
| CA-07 | `https` y `http` → `img` con `loading`, `decoding` y `alt`; `null`, `javascript:`, `data:`, `//host` y error de carga → marcador con `aria-hidden` en la misma caja | `web` / `memories.test.mjs` | T-15 (URL rota) |
| CA-08 | CSS de `.mem-media img`: `object-fit: contain`, `max-width`, `max-height`, `width` y `height` auto; sin `cover`, `fill`, `transform` ni zoom en hover; `var(--surface-subtle)`; el marcador usa la misma caja | `web` / `memories.test.mjs` (CSS) | T-15 (proporciones) |
| CA-09 | `getMemories` pide `{base}/memories?limit=6` con `credentials: 'omit'`, `Accept`, 10 s y la base de la meta; devuelve `{ok:false}` con red caída, `500`, JSON inválido y `data` ausente; `memories.js` y `memories-carousel.js` no contienen `fetch(` | `web` / `memories.test.mjs` | — |
| CA-10 | CSS: `max-width: 100%` en imágenes, `min-width: 0` en contenedores, botones con `:focus-visible`; estático: un solo `h2` en `#galeria` y ningún `h3`, `h4` ni `section` nuevo; `role="status"` en `#memStatus` | `web` / `memories.test.mjs` | T-15 (360 a 1366 px) |
| CA-11 | `index.html` conserva los IDs y secciones de la línea base de T-01 (d), el enlace «Descubre los animales», y las referencias a `script.js`, `animations.js` y `accessibility.js` | `web` / `memories.test.mjs` (estructura) + `relocation.test.mjs` (ejecución) | — |
| CA-12 | `index.html`, `noticias.html` y `eventos.html` tienen exactamente una `<meta name="arca-api-base">` con el mismo `content`; `index.html` no define otra base | `web` / `memories.test.mjs` | — |
| CA-13 | Test que lee el propio archivo y comprueba que cada nombre CA-01 a CA-23 aparece como test | `web` / `memories.test.mjs` | — |
| CA-14 | `apps/web/package.json` no existe; `index.html` no añade `<script src>` ni `<link>` remotos; `memories.js`, `memories-carousel.js`, `memories.css` y `api.js` no usan `localStorage`, `sessionStorage`, `document.cookie` ni `credentials` distinto de `'omit'` | `web` / `memories.test.mjs` | — |
| CA-15 | Una sola petición con `limit=6` (sin `page`, sin «Cargar más»); 8 respuestas → 6; 1 a 5 → esos; 0 → vacío | `web` / `memories.test.mjs` | T-15 |
| CA-16 | Con 3 momentos y sin movimiento reducido: cambia cada 5 s con `setInterval` simulado y vuelve al primero desde el último; cada cambio muestra un slide completo | `web` / `memories.test.mjs` | T-15 (cronometrado) |
| CA-17 | Un momento: sin `#memPrev`, `#memNext`, indicadores ni `#memPause` (`hidden`); sin temporizador | `web` / `memories.test.mjs` | — |
| CA-18 | Con 2 a 6 momentos: nombres exactos de anterior, siguiente e indicadores; `aria-current` en el actual; pulsar cambia el momento y no llama a `focus()` | `web` / `memories.test.mjs` | — |
| CA-19 | Orden del DOM: momentos, anterior, siguiente, indicadores, pausa; controles son `button`; `role="region"` con nombre «Momentos para recordar»; slides con `role="group"` y «Momento n de N»; un cambio automático no llama a `focus()` | `web` / `memories.test.mjs` | T-15 (lector de pantalla y teclado) |
| CA-20 | Con `matchMedia` que coincide con `reduce`: sin temporizador, sin `#memPause`, controles operativos, sin `scrollTo`/`scrollIntoView` con `smooth` en el código del carrusel | `web` / `memories.test.mjs` | T-15 (preferencia del sistema) |
| CA-21 | Cursor dentro (`mouseenter`) detiene el temporizador; `mouseleave` lo reanuda; foco dentro (`focusin`) lo detiene; `focusout` fuera lo reanuda | `web` / `memories.test.mjs` | — |
| CA-22 | Estático: `memories-carousel.js` no usa `localStorage` ni `sessionStorage`; no hay `package.json`, librerías ni scripts nuevos; textos de carga, vacío y error no cambian | `web` / `memories.test.mjs` | — |
| CA-23 | Pulsar «Pausar carrusel» detiene y cambia a «Reanudar carrusel»; anuncio «Carrusel en pausa.»/«Carrusel reanudado.» en `#memAnnounce`; pausa manual prevalece sobre cursor y foco; anterior, siguiente e indicadores no cambian la pausa; con 2 a 6 momentos y sin movimiento reducido el botón es visible | `web` / `memories.test.mjs` | T-15 (lector de pantalla) |

Regla de estado: un CA sin prueba automatizada o sin evidencia manual no puede marcarse como cumplido. Las pruebas de vigencia de la API (`api-012` CA-12) se verifican en `apps/api`, no aquí.

## Documentación local (`apps/web/docs/momentos-galeria.md`, por crear)

Contenido mínimo, en español:

1. Qué muestra la galería y de dónde sale (`GET /api/v1/memories?limit=6`, `api-012`): hasta seis momentos aceptados y vigentes, en el orden de la API.
2. Configuración: `<meta name="arca-api-base">` en `index.html`, `noticias.html` y `eventos.html` (`http://localhost:8000/api/v1` en desarrollo); origen `http://localhost:8080` en `CORS_ALLOWED_ORIGINS`; `127.0.0.1:8080` es otro origen.
3. Plazo de publicación de 7 días (`api-010` RN-21): la galería puede tener pocos momentos o ninguno, y no rellena huecos (RN-12).
4. Carrusel: avance cada 5 s, pausa por cursor o foco, botón «Pausar carrusel» / «Reanudar carrusel», controles e indicadores, movimiento reducido.
5. Estados de carga, vacío, error y reintento.
6. Seguridad: texto seguro, URLs de imagen, sin almacenamiento, `credentials: 'omit'`, sin datos del visitante.
7. Excepción de arquitectura: ADR 0027 (con su enmienda del carrusel), condiciones 1 a 7 y reevaluación. El enlace al ADR 0024 se incluye solo como referencia del patrón común.
8. Cómo probar: `node --test apps/web/src/tests/memories.test.mjs` y la verificación manual de T-15 con `curl`.
9. Limitaciones: sin JavaScript no hay galería; una foto retirada del dashboard puede seguir visible hasta recargar (`api-010` pregunta 1); los momentos vencidos dejan de mostrarse sin aviso.

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Parcial | HTML, CSS y JavaScript estáticos, sin dependencias, sin build, sin `package.json`, sin servicios propietarios; la galería funciona con la misma API en local y en cualquier servidor estático. El stack declarado para el portal es React 19 + TS + Vite (`apps/web/AGENTS.md`). **Excepción:** ADR 0027 (Aceptado 2026-11-12), condiciones 1 a 7 y alcance acotado, con la enmienda del carrusel (punto 7). |
| II. La spec manda | Sí, con condición de dependencias | Spec `web-010` Aprobada el 2026-11-12, con plan y tasks aprobados el 2026-11-13. No hay código hasta cumplir la dependencia de `api-012` implementada. |
| III. Lógica separada de la interfaz | Parcial | No hay reglas de negocio en el portal: la visibilidad, la vigencia, el orden y la cantidad de momentos los decide la API (RN-01); el `limit=6` es un parámetro de presentación pedido por la spec (CA-15). `fetch` solo en `js/api.js`. **Excepción:** no hay `@arca/api-client` ni hooks (ADR 0027, condición 1). |
| IV. Un test por criterio | Sí, con runner distinto | Un test por CA-01 a CA-23 con `node --test` y nombres `CA-NN dynamic-memories`, como `web-009`. Vitest no se usa (ADR 0027, condición 3). CA-13 comprueba la cobertura. Este plan no afirma que ninguna prueba pase: el resultado se registra en T-18. |
| V. Una sola fuente de verdad para los datos | Sí | El portal no guarda ni cachea datos. La API es la única fuente. Sin escritura. No hay tablas nuevas ni migraciones (RN-02 de `api-012`). |
| VI. Código en inglés, personas en español | Sí | Identificadores en inglés (`memories.js`, `memories-carousel.js`, `getMemories`, `mem-*`, `ArcaMemories`); textos visibles, de estado, de error y de anuncio en español. |

Excepciones registradas: ADR 0027 (Aceptado 2026-11-12). Si el ADR se revoca, este plan no se implementa.

## Riesgos y decisiones

- **ADR requerido/aprobado:** ADR 0027, Aceptado el 2026-11-12. No se requiere ADR de dependencia: no hay paquetes nuevos.
- **Plazo de 7 días (`api-010` RN-21):** la galería tendrá pocos momentos o ninguno con frecuencia. Mitigación: estado de vacío (CA-03), sin relleno (RN-12) y un solo momento sin controles (CA-17). Esta situación es normal y no es un error.
- **Carrusel con pocos momentos:** con 2 momentos el avance alterna dos fotos cada 5 s; con 2 a 6, el botón de pausa siempre está visible. Mitigación: controles, indicadores y pausa por cursor y foco (CA-18, CA-21, CA-23). Es un riesgo de experiencia que se revisa en T-15.
- **Distracción y WCAG 2.2.2:** el avance automático dura más de 5 s y se mueve solo. Mitigación: botón visible de pausa (CA-23), movimiento reducido sin avance (CA-20) y pausa por cursor y foco (CA-21). Esto cubre WCAG 2.2.2 para el carrusel, según la spec.
- **Anuncios de lectores de pantalla:** `role="status"` en `#memAnnounce` depende del lector de pantalla y del navegador. Se verifica en T-15 con al menos un lector; no se asume compatibilidad universal. `aria-roledescription` (en español) tiene soporte variable; si falla, la etiqueta `aria-label` de cada momento sigue dando la posición.
- **Bionic Reading (`008`) con contenido dinámico:** `accessibility.js` aplica las transformaciones al cargar la página. Los momentos llegan después y podrían no recibir el formato. Se registra en T-15. Cambiar `accessibility.js` requiere aprobación separada (igual que `web-009` T-12).
- **Retirada tardía:** una foto retirada del dashboard antes de su vencimiento puede seguir visible hasta recargar (`api-010` pregunta 1).
- **Bloque `.foto` heredado en `script.js`:** queda sin efecto (ver «Sobre script.js»). Riesgo bajo, documentado.
- **Conflictos con web-011:** ver «Coordinación con web-011». Riesgo de conflicto de merge en `index.html` (head y scripts) y en `js/api.js`. Mitigación: anclas fijas y orden acordado.
- **Imágenes grandes:** `lazy` y caja fija; coste en T-15.
- **Alcance que crece:** si la galería necesita paginación, filtros, página propia, visor o más lógica de cliente, se reevalúa el ADR 0027 (su sección «Reevaluación»). El carrusel ya está aprobado.
- **Divergencias detectadas en la spec (no se corrigen aquí):**
  - D-1: la spec, en «Dependencias», dice que la galería usa los tokens de `news-events.css`. Los tokens `--primary` y `--surface-subtle` están definidos en `styles.css` (líneas 3 y 16). El plan usa `styles.css`. No cambia el alcance; conviene corregir la spec en su próxima revisión.
  - D-2: la spec, en «Flujo principal», nombra solo `js/memories.js`. El plan añade `js/memories-carousel.js` (pregunta 7).
  - D-3: la spec pide «el contenedor se anuncia como “Momentos para recordar” con su posición actual» (CA-19). El plan lo cumple con `role="region"` y `aria-label`, y con «Momento n de N» por diapositiva. Es una lectura de la spec; se confirma en T-15.
- **Alternativas consideradas:**
  - Un solo archivo JavaScript para galería y carrusel: descartada para poder probar el comportamiento sin cargar el contenido, y para separar lo que cambia (contenido, ADR) de lo que no cambia (carrusel).
  - Migrar la galería a React + Vite + `@arca/api-client` con hooks y Vitest: descartada por ADR 0027 (obliga a `package.json` y build para una galería de lectura).
  - Usar una librería de carrusel: descartada (RN-11; ADR 0027, condición 2).
  - Guardar la pausa en `localStorage`: descartada (RN-03, CA-22).
  - Mostrar los momentos con `<details>` o paginación: descartada (fuera de alcance; «Cargar más» no entra).

## Orden y aprobación

Secuencia de implementación (detalle en `apps/web/tasks/010-dynamic-memories.md`):

0. Precondiciones (T-01): `api-012` implementada con evidencia; DBR-012 aplicada en `arca_pruebas`; plan y tasks aprobados (cumplido el 2026-11-13); línea base de `index.html`, `relocation.test.mjs` y `news-events.test.mjs`; estado de web-011 acordado.
1. `js/api.js` (`getMemories`) y el archivo de pruebas con su estructura (T-02).
2. `js/memories.js` helpers y seguridad de URL (T-03), construcción de momentos (T-04), estados y reintento (T-05), carga de 6 y vigencia (T-06).
3. `js/memories-carousel.js`: núcleo de controles e indicadores (T-07), temporizador y pausa por cursor y foco (T-08), botón de pausa, anuncio y movimiento reducido (T-09), accesibilidad de teclado y lector de pantalla (T-10).
4. Pruebas estáticas de seguridad, almacenamiento y dependencias (T-11).
5. `memories.css` (T-12).
6. `index.html`: marcado de `#galeria`, head y scripts (T-13), siguiendo el orden de «Coordinación con web-011».
7. Cobertura CA-13 (T-14).
8. Verificación manual con API real (T-15).
9. Documentación local (T-16) e infraestructura (T-17).
10. Calidad y entrega (T-18).

**Dependencias:** `api-012` (sin implementar: bloquea T-15, no las pruebas simuladas), `api-010` (DBR-012 aplicada, Lista para backend), `web-009` (`js/api.js`, meta), `web-011` (orden de `index.html` y `js/api.js`, ver «Coordinación»), ADR 0027 (Aceptado).

**Aprobaciones requeridas:**

| Rol | Aprueba | Estado |
|---|---|---|
| Responsable funcional | Spec `web-010` | Aprobada (Jonathan, responsable de backend, 2026-11-12). Solicitante original: Aksel. |
| Equipo técnico | Este plan, Constitution Check, excepción ADR 0027, respuestas a las preguntas 1 a 7 | Aprobado: Jonathan, responsable de backend, en nombre del equipo, 2026-11-13 |
| Backend | `api-012` implementada con evidencia (PHPUnit y `curl`) | **Pendiente** |
| Responsable de BD | DBR-012 aplicada en `arca_pruebas` | Cumplido el 2026-11-11 (según `api-012` y `api-010`) |
| Equipo (ADR) | ADR 0027 | Aceptado (2026-11-12) |

Evidencias requeridas para marcar la spec como Implementada: las de T-18 y los resultados de T-15. Este plan no cambia el estado de la spec ni de las tasks.

## Preguntas (resueltas el 2026-11-13)

1. **Elementos inválidos en `data`.** Si un elemento de `data` no es un objeto, ¿se omite (propuesta, como `web-011` pregunta 4) o se trata la respuesta como error? **Resuelta (2026-11-13, Jonathan): se omite**, como en `web-011`.
2. **Rutas `//host/…`.** La spec dice «rutas relativas del mismo origen» (RN-04). ¿Se confirma que `//host/…` se rechaza (propuesta) aunque sea `http` o `https` implícito? **Resuelta (2026-11-13, Jonathan): se rechaza.**
3. **Bloque `.foto` de `script.js`.** ¿Se deja como está en `web-010` (propuesta, sin tocar `script.js` ni el ancla de `relocation.test.mjs` línea 288), o se elimina en una tarea posterior acordada con `web-011`? **Resuelta (2026-11-13, Jonathan): se deja como está** (propuesta).
4. **Reinicio de la cuenta de 5 s.** Al pulsar anterior, siguiente o un indicador con el avance activo, ¿la cuenta se reinicia (propuesta) o sigue su curso? **Resuelta (2026-11-13, Jonathan): se reinicia** (propuesta).
5. **Orden con web-011.** ¿`web-010` se implementa después de `web-011` (propuesta, un solo PR de `index.html`), o en paralelo con rebase sobre el orden de la tabla de coordinación? **Resuelta (2026-11-13, Jonathan): `web-010` después de `web-011`**, en un solo PR de `index.html` (propuesta).
6. **Aprobador técnico.** La spec deja «Responsable técnico: por identificar». ¿Quién aprueba este plan y sus tasks (propuesta: el equipo técnico, con Jonathan como responsable funcional)? **Resuelta (2026-11-13): plan y tasks aprobados por Jonathan en nombre del equipo.** El responsable técnico de la implementación es Jonathan (coordina las sesiones de Claude Code), 2026-11-13.
7. **Archivo de carrusel.** ¿Dos archivos JavaScript (`js/memories.js` y `js/memories-carousel.js`, propuesta) requieren solo la nota de este plan, o también una enmienda del ADR 0027 (su «Reevaluación» menciona «más lógica de cliente»)? **Resuelta (2026-11-13): solo la nota de este plan.** El carrusel ya está en el alcance del ADR 0027 (punto 7, con su enmienda del 2026-11-12); separar el código en dos archivos no añade alcance. Opción propuesta por la sesión de documentación, aceptada por Jonathan.

## Supuestos del plan

- **S-1:** la lista de `api-012` llega en el orden de `published_at` descendente y `id` descendente; la galería no reordena (CA-15, RN-01).
- **S-2:** la proporción de la caja de imagen es 4:3 (`aspect-ratio`). No está en la spec; afecta solo a la forma de la caja.
- **S-3:** el texto de los botones de anterior y siguiente es visible («Momento anterior», «Momento siguiente»), igual que su nombre accesible.
- **S-4:** `image_url` relativa se acepta si empieza por `/` y no por `//` ni `/\` (pregunta 2).
- **S-5:** la navegación manual reinicia la cuenta de 5 s si el avance está activo (pregunta 4).
- **S-6:** los elementos de `data` que no son objetos se omiten (pregunta 1).
- **S-7:** el foco en un reintento exitoso va a `#memGallery` y en uno fallido va a `#memRetry`, igual que `web-009` CA-05.
- **S-8:** la primera carga no mueve el foco (CA-04 se refiere al reintento).
- **S-9:** los textos del anuncio alternan («Carrusel en pausa.» / «Carrusel reanudado.»), así que cada pulsación cambia el contenido de `#memAnnounce` y el lector lo anuncia. Si una prueba manual muestra que no lo anuncia, se revisa en T-15.
