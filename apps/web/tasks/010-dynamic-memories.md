# Tareas · 010 · dynamic-memories

- Spec: `apps/web/specs/010-dynamic-memories.md` (Estado: **Aprobada**, Jonathan, responsable de backend, 2026-11-12; aprobar no autoriza implementar).
- Plan: `apps/web/plan/010-dynamic-memories.md` (Estado: **Borrador**, pendiente de aprobación técnica del equipo y de Jonathan).
- ADR de excepción: `docs/adr/0027-dynamic-public-memories-gallery.md` (Aceptado 2026-11-12, con la enmienda del carrusel confirmada el mismo día).
- Estado de este documento: **Borrador**. Se redacta antes de la aprobación del plan, según lo pedido; el skill `/sdd-tasks` exige plan aprobado antes de escribir tasks. **Ninguna T-xx se implementa ni se marca hasta que el plan esté aprobado.**
- Checklist: sin ninguna T-xx marcada. Cada T-xx se marca solo con evidencia aportada por la sesión principal o por el responsable de la verificación.
- Dependencias bloqueantes: `api-012` (Aprobada, **sin implementar**) para la verificación real, y DBR-012 (Lista para backend, aplicada en `arca_pruebas` el 2026-11-11). Coordinación con `web-011` sobre `index.html` y `js/api.js` (ver el plan).
- Sin dependencias nuevas, sin `package.json`, sin build. Las pruebas usan `node --test` y no llaman a la API real.

## Base de datos (responsable de BD)

No hay tareas de BD propias de `apps/web`. La precondición DBR-012 se comprueba en T-01 (evidencia del responsable de BD). No se crea esquema.

## Implementación

- [ ] **T-01** (CA-09, CA-11, CA-15; RN-02, RN-03) — **Precondiciones y línea base** (bloqueante; no es código):
  - (a) `api-012` implementada con evidencia: las pruebas PHPUnit de `api-012` (`CA-01` a `CA-12`) están en verde contra `arca_pruebas` (evidencia del equipo de backend), y `curl -i -H "Origin: http://localhost:8080" "http://localhost:8000/api/v1/memories?limit=6"` responde `200` con `Access-Control-Allow-Origin: http://localhost:8080` y `{"data": [...]}`.
  - (b) DBR-012 aplicada en `arca_pruebas` (`api-010`), con evidencia de solo lectura del responsable de BD. Para T-15, al menos un momento aceptado y vigente creado en `arca_pruebas` por el flujo aprobado. Nunca en `arca_zoo`.
  - (c) Plan y tasks aprobados por el equipo técnico y por Jonathan, con respuestas a las preguntas 1 a 7 del plan.
  - (d) Línea base de `apps/web/src/index.html`, en el PR: orden de los `section[id]` (`porque-visitar`, `animales`, `mapa`, `ubicacion`, `instalaciones`, `noticias`, `eventos`, `boletos`, `preguntas`, `galeria`) y los `id` de `#galeria`. Se copia a `memories.test.mjs` en T-13.
  - (e) Línea base de regresión: número de pruebas aprobadas y fallidas de `node --test apps/web/src/tests/relocation.test.mjs` y de `node --test apps/web/src/tests/news-events.test.mjs`, antes de cualquier cambio. Los 6 fallos preexistentes de `relocation.test.mjs` se registran sin atribuirlos a este cambio.
  - (f) Acuerdo de orden con `web-011` (pregunta 5 del plan): si `web-011` ya está mergeada, esta implementación parte de su estado; si no, se aplica el orden de la tabla de coordinación del plan.
  - (g) `apps/web/src/js/api.js` existe con `request` sin cambios pendientes.
  - **Criterios de hecho:** (a) a (g) con evidencia adjunta al PR. Si (a) o (b) faltan, no se empieza T-02.
  - **Archivos:** ninguno (solo evidencia).
  - **Verificación:** comandos de (a) y (e), y la lista de (d), en el PR.

- [ ] **T-02** (CA-09; RN-03, RN-06) — **Módulo de red:** añadir `getMemories` a `js/api.js` y crear el archivo de pruebas con su estructura.
  - Añadir `getMemories: function (options) { var opts = options || {}; return request('/memories', { limit: opts.limit }, 'list'); }` dentro de `root.ArcaApi`, después de `getNewsItem` (y tras `getSpecies`, si `web-011` ya está). No cambiar `request` ni las funciones existentes.
  - Crear `apps/web/src/tests/memories.test.mjs` con `node:test`, `node:assert/strict`, `node:fs`, `node:path` y `node:vm`. Copiar el DOM simulado y el `fetch` simulado de `news-events.test.mjs` (sin dependencias ni archivo compartido). Extender el DOM para: reflejar `hidden` como atributo, `focusin`/`focusout` con `relatedTarget`, `mouseenter`/`mouseleave`; y simular `setInterval`, `clearInterval` y `matchMedia`.
  - Tests:
    - `CA-09 dynamic-memories: getMemories pide {base}/memories?limit=6 con credentials omit, Accept application/json, tiempo máximo de 10 s y la base de la meta`.
    - `CA-09 dynamic-memories: getMemories devuelve {ok:false, reason} con red caída, 500, JSON inválido y data ausente`.
    - `CA-09 dynamic-memories: api.js es el único archivo con fetch( en la galería; memories.js y memories-carousel.js no lo contienen`. (Este test puede fallar hasta T-04; se marca en verde cuando existan ambos archivos.)
  - **Criterios de hecho:** los dos primeros tests en verde; `news-events.test.mjs` sin cambios de resultado.
  - **Archivos:** `apps/web/src/js/api.js`, `apps/web/src/tests/memories.test.mjs` (nuevo).
  - **Verificación:** `node --test apps/web/src/tests/memories.test.mjs` (solo los tests de esta tarea) y `node --test apps/web/src/tests/news-events.test.mjs`.

- [ ] **T-03** (CA-07; RN-04, RN-05) — **Helpers de imagen y constantes:** crear `apps/web/src/js/memories.js` como script clásico (IIFE con `root`), que expone `ArcaMemories.helpers` sin tocar el DOM todavía.
  - `safeImageUrl(value)`: acepta `http:` y `https:` absolutas (con `new URL`), o rutas que empiezan por `/` y no por `//` ni `/\`. Cualquier otro valor (`null`, `javascript:`, `data:`, `//host`, texto sin `/`, valores que no son texto) devuelve `null`.
  - Constantes: `MEMORY_LIMIT = 6` y `ALT_TEXT = 'Foto compartida por un visitante del zoológico'`.
  - Tests:
    - `CA-07 dynamic-memories: safeImageUrl acepta solo http, https y rutas que empiezan por /; rechaza javascript:, data:, //host, rutas sin barra y valores que no son texto`.
  - **Criterios de hecho:** test en verde; `memories.js` sin `fetch(`, `innerHTML` ni `eval`.
  - **Archivos:** `apps/web/src/js/memories.js` (nuevo), `apps/web/src/tests/memories.test.mjs`.
  - **Verificación:** `node --test apps/web/src/tests/memories.test.mjs`.

- [ ] **T-04** (CA-01, CA-06, CA-07; RN-04, RN-07) — **Momento: imagen y opinión con texto seguro.** En `memories.js`, `buildSlide(memory)` crea un `div.mem-slide` con:
  - `div.mem-media` que contiene `img` (`loading="lazy"`, `decoding="async"`, `alt` = `ALT_TEXT`, `src` por propiedad solo si `safeImageUrl` lo acepta) o, si no hay URL válida, `span.mem-placeholder[aria-hidden="true"]` con `bi-image`. Un listener `error` del `img` sustituye la imagen por el marcador en la misma caja.
  - `p.mem-opinion` con la opinión en `textContent` (si no es texto, vacía).
  - Solo se leen `image_url` y `opinion`. No se usan `id`, `published_at`, `published_until`, nombre, correo, apodo ni avatar. Sin `h3`, `h4` ni `section`.
  - Tests:
    - `CA-01 dynamic-memories: cada momento solo presenta la imagen y la opinión; no lee published_until ni datos del visitante (RN-07, RN-10)`.
    - `CA-06 dynamic-memories: <img src=x onerror=…> en la opinión se muestra como texto y no crea img ni script; búsqueda estática de innerHTML, outerHTML, insertAdjacentHTML, document.write, eval y new Function en memories.js y memories-carousel.js sin resultados`. (La búsqueda sobre `memories-carousel.js` pasa cuando T-07 exista; si falta, se marca como pendiente y no en verde.)
    - `CA-07 dynamic-memories: https y http con loading, decoding y alt; null, javascript:, data: y error de carga muestran el marcador aria-hidden en la misma caja`.
  - **Criterios de hecho:** tres tests en verde; ningún `innerHTML`, `outerHTML` ni `insertAdjacentHTML` en `memories.js`.
  - **Archivos:** `apps/web/src/js/memories.js`, `apps/web/src/tests/memories.test.mjs`.
  - **Verificación:** `node --test apps/web/src/tests/memories.test.mjs`.

- [ ] **T-05** (CA-02, CA-03, CA-04, CA-05; RN-02, RN-08) — **Estados de carga, vacío, error y reintento** en `memories.js`.
  - `load()`: una llamada por carga a `ArcaApi.getMemories({ limit: MEMORY_LIMIT })`; un flag `busy` evita dos peticiones a la vez.
  - Carga: `#memStatus` con «Cargando momentos…» visible; `#memGallery` con `aria-busy="true"`; carrusel y `#memRetry` ocultos; sin slides.
  - Vacío (`data: []` o sin objetos válidos): `#memStatus` con «Aún no hay momentos publicados.»; sin slides, carrusel ni `#memRetry`.
  - Error (`ok: false`): `#memStatus` con «No pudimos cargar los momentos. Inténtalo más tarde.» y `#memRetry` visible con «Reintentar»; sin slides ni datos previos. No se muestra `reason`.
  - «Reintentar» llama a `load()` de nuevo con los mismos parámetros y mueve el foco: a `#memStatus` al empezar; a `#memGallery` si responde con momentos; a `#memStatus` si responde vacío; a `#memRetry` si vuelve a fallar (S-7 y S-8 del plan).
  - Tests:
    - `CA-02 dynamic-memories: antes de resolver la petición, #memStatus anuncia «Cargando momentos…» con role="status" y #memGallery tiene aria-busy="true"`.
    - `CA-03 dynamic-memories: data vacío muestra «Aún no hay momentos publicados.» sin slides, carrusel ni #memRetry`.
    - `CA-04 dynamic-memories: red caída, 500, JSON inválido y data ausente muestran el error con #memRetry; «Reintentar» pide de nuevo, muestra la carga y mueve el foco según el estado`.
    - `CA-05 dynamic-memories: tras un error no queda ninguna foto de muestra, ningún «Ver foto» ni slides de la carga anterior`.
  - **Criterios de hecho:** cuatro tests en verde; el texto de error no contiene el `reason`.
  - **Archivos:** `apps/web/src/js/memories.js`, `apps/web/src/tests/memories.test.mjs`.
  - **Verificación:** `node --test apps/web/src/tests/memories.test.mjs`.

- [ ] **T-06** (CA-01, CA-15; RN-01, RN-10, RN-12) — **Carga de seis momentos en una petición.** En `load()`:
  - Con `ok: true` y `data` válido, se toman los primeros `MEMORY_LIMIT` (6) objetos en el orden recibido, se construye un slide por cada uno (T-04) y se monta el carrusel (T-07). Con 1 a 5 se muestran esos; con 0 (o sin objetos válidos), estado de vacío (T-05).
  - La galería no usa `page`, `has_more`, «Cargar más» ni `published_until`. No ordena ni filtra por fecha (RN-01, RN-10).
  - Tests:
    - `CA-01 dynamic-memories: con 8 momentos en la respuesta se dibujan los 6 primeros en el orden de la API; en el HTML no quedan f1, f2 ni f3`.
    - `CA-15 dynamic-memories: se hace una sola petición GET memories?limit=6, sin page ni «Cargar más»; con 1 a 5 se muestran esos; con 0 se muestra el estado de vacío`.
    - `CA-01 dynamic-memories: memories.js no contiene published_until ni has_more (la vigencia la decide la API)`.
  - **Criterios de hecho:** tres tests en verde.
  - **Archivos:** `apps/web/src/js/memories.js`, `apps/web/src/tests/memories.test.mjs`.
  - **Verificación:** `node --test apps/web/src/tests/memories.test.mjs`.

- [ ] **T-07** (CA-17, CA-18; RN-11, RN-12, RN-13) — **Núcleo del carrusel:** crear `apps/web/src/js/memories-carousel.js` como script clásico (IIFE con `root`), que expone `ArcaMemoriesCarousel.mount(container, slides, deps)` → `{ destroy() }`.
  - Muestra un slide a la vez con el atributo `hidden` (sin animación).
  - Con 2 a 6 momentos: botones «Momento anterior» y «Momento siguiente» (`#memPrev`, `#memNext`) visibles, con el texto igual a su nombre accesible; indicadores creados en `#memIndicators` con `aria-label` «Ir al momento {n} de {total}»; el momento actual con `aria-current="true"`. Desde el último, «siguiente» va al primero; desde el primero, «anterior» va al último.
  - Pulsar un control o un indicador cambia el momento y no llama a `focus()`.
  - Con 1 momento: sin `#memPrev`, `#memNext`, indicadores ni `#memPause` (`hidden`), y sin temporizador (CA-17).
  - Los nombres de `#memPrev`, `#memNext` y `#memIndicators` se buscan por `id` dentro del contenedor.
  - Tests:
    - `CA-18 dynamic-memories: con 2 a 6 momentos, anterior, siguiente e indicadores tienen los nombres exactos; el actual lleva aria-current; pulsar cambia el momento y no mueve el foco`.
    - `CA-17 dynamic-memories: un único momento se ve sin controles, sin indicadores, sin botón de pausa y sin temporizador`.
  - **Criterios de hecho:** dos tests en verde; `memories-carousel.js` sin `fetch(`, `localStorage` ni librerías.
  - **Archivos:** `apps/web/src/js/memories-carousel.js` (nuevo), `apps/web/src/tests/memories.test.mjs`.
  - **Verificación:** `node --test apps/web/src/tests/memories.test.mjs`.

- [ ] **T-08** (CA-16, CA-21; RN-13) — **Temporizador, cursor y foco.**
  - Con 2 a 6 momentos y sin movimiento reducido (T-09): avance con `deps.setInterval` cada `intervalMs` (por defecto 5000 ms). Desde el último vuelve al primero.
  - Pausa por cursor: `mouseenter` en el contenedor detiene el temporizador; `mouseleave` lo reanuda si no hay pausa manual (T-09).
  - Pausa por foco: `focusin` dentro del contenedor detiene el temporizador; `focusout` con `relatedTarget` fuera del contenedor lo reanuda.
  - Navegación manual (anterior, siguiente, indicador) reinicia la cuenta de 5 s si el temporizador está activo (S-5 del plan).
  - `destroy()` cancela el temporizador y deja de cambiar momentos.
  - Tests:
    - `CA-16 dynamic-memories: con 3 momentos sin movimiento reducido cambia cada 5 s con temporizador simulado, vuelve al primero desde el último y cada cambio muestra imagen y opinión juntas`.
    - `CA-21 dynamic-memories: el cursor dentro detiene el avance y al salir se reanuda; el foco dentro lo detiene y al perderlo se reanuda`.
  - **Criterios de hecho:** dos tests en verde; `destroy()` limpia el temporizador (comprobado en la prueba de CA-16).
  - **Archivos:** `apps/web/src/js/memories-carousel.js`, `apps/web/src/tests/memories.test.mjs`.
  - **Verificación:** `node --test apps/web/src/tests/memories.test.mjs`.

- [ ] **T-09** (CA-20, CA-23; RN-13) — **Botón de pausa, anuncio y movimiento reducido.**
  - `#memPause`: visible solo con 2 a 6 momentos y sin movimiento reducido; nunca deshabilitado. Texto «Pausar carrusel», que pasa a «Reanudar carrusel» tras pulsarlo y vuelve a «Pausar carrusel» al pulsarlo de nuevo.
  - Pausa manual con prioridad: mientras está activa, cursor y foco no la cambian; sigue activa al salir. Anterior, siguiente e indicadores no cambian el estado de pausa.
  - Al pulsar: `#memAnnounce` (`role="status"`) recibe «Carrusel en pausa.» o «Carrusel reanudado.». Los avances automáticos no escriben en `#memAnnounce`.
  - El botón se activa con Intro y Espacio (nativo) y no mueve el foco.
  - Movimiento reducido: `matchMedia('(prefers-reduced-motion: reduce)')`. Si coincide, sin temporizador, sin `#memPause`, controles operativos y cambio sin desplazamiento animado (sin `scrollTo`, `scrollIntoView` con `smooth` ni `transition`). Se escucha `change` y se recalcula.
  - Sin `localStorage` ni `sessionStorage`: la pausa dura mientras la página esté abierta (CA-23, CA-22).
  - Tests:
    - `CA-23 dynamic-memories: pausar cambia el botón a «Reanudar carrusel» y anuncia «Carrusel en pausa.»; reanudar vuelve a «Pausar carrusel» y anuncia «Carrusel reanudado.»; con 2 a 6 momentos y sin movimiento reducido el botón es visible`.
    - `CA-23 dynamic-memories: la pausa manual prevalece sobre cursor y foco; anterior, siguiente e indicadores no cambian la pausa; los avances automáticos no escriben en el anuncio`.
    - `CA-20 dynamic-memories: con preferencia de movimiento reducido no hay avance automático, no hay botón de pausa, los controles funcionan y no se usa desplazamiento animado`.
  - **Criterios de hecho:** tres tests en verde; el botón no aparece deshabilitado en ningún caso.
  - **Archivos:** `apps/web/src/js/memories-carousel.js`, `apps/web/src/tests/memories.test.mjs`.
  - **Verificación:** `node --test apps/web/src/tests/memories.test.mjs`.

- [ ] **T-10** (CA-19; RN-08) — **Teclado y lector de pantalla.**
  - Estructura: `#memCarousel` con `role="region"`, `aria-label="Momentos para recordar"` y `aria-roledescription="carrusel"`; cada slide con `role="group"`, `aria-roledescription="diapositiva"` y `aria-label` «Momento {n} de {total}»; los slides ocultos tienen `hidden`.
  - Orden del DOM: slides, «Momento anterior», «Momento siguiente», indicadores, «Pausar/Reanudar carrusel». Todos los controles son `button type="button"`.
  - Un cambio automático no llama a `focus()`.
  - El carrusel no atrapa el foco: no hay `tabindex` positivo ni listeners de `keydown` que impidan Tab.
  - Tests:
    - `CA-19 dynamic-memories: el orden de tabulación es anterior, siguiente, indicadores y pausa; los controles son button nativos`.
    - `CA-19 dynamic-memories: el contenedor se anuncia como «Momentos para recordar» y cada momento como «Momento n de N», con su imagen y su opinión; un cambio automático no mueve el foco`.
  - **Criterios de hecho:** dos tests en verde.
  - **Archivos:** `apps/web/src/js/memories-carousel.js`, `apps/web/src/js/memories.js`, `apps/web/src/tests/memories.test.mjs`.
  - **Verificación:** `node --test apps/web/src/tests/memories.test.mjs`; la verificación con lector de pantalla es T-15.

- [ ] **T-11** (CA-14, CA-22; RN-03, RN-05, RN-11) — **Pruebas estáticas de dependencias y almacenamiento.**
  - CA-14: no existe `apps/web/package.json`; `index.html`, `memories.js`, `memories-carousel.js` y `memories.css` no añaden librerías, `<script src>` ni `<link>` remotos; `api.js` y los módulos de la galería no usan `localStorage`, `sessionStorage`, `document.cookie` ni `credentials` distinto de `'omit'`.
  - CA-22: `memories-carousel.js` no usa `localStorage` ni `sessionStorage` para la posición; no hay librerías de carrusel; los textos de carga, vacío y error (T-05) siguen igual.
  - Tests:
    - `CA-14 dynamic-memories: sin package.json, build ni recursos remotos nuevos; sin cookies, localStorage, sessionStorage ni credenciales`.
    - `CA-22 dynamic-memories: el carrusel no usa librerías ni almacenamiento del navegador; los estados de carga, vacío y error mantienen sus textos`.
  - **Criterios de hecho:** dos tests en verde.
  - **Archivos:** `apps/web/src/tests/memories.test.mjs`.
  - **Verificación:** `node --test apps/web/src/tests/memories.test.mjs`.

- [ ] **T-12** (CA-08, CA-10; RN-09) — **Estilos de `memories.css`.**
  - Crear `apps/web/src/memories.css` solo con clases `mem-*`:
    - `.mem-media`: `aspect-ratio: 4 / 3`, `background: var(--surface-subtle)`, `display: grid`, `place-items: center`, `overflow: hidden`, `min-width: 0`.
    - `.mem-media img`: `object-fit: contain; object-position: center; width: auto; height: auto; max-width: 100%; max-height: 100%`. Sin `cover`, `fill`, `transform` ni zoom en hover.
    - `.mem-placeholder`: misma caja y regla.
    - `.mem-slide[hidden] { display: none !important; }` para que `hidden` gane a `display: grid`.
    - `.mem-status`, `.mem-carousel`, `.mem-controls`, `.mem-indicators`, `.mem-btn`, `.mem-pause`, `.mem-announce`: `min-width: 0`; botones con `width: auto` que se ajustan en 360 px (`flex-wrap`).
    - Foco: `:focus-visible { outline: 3px solid var(--primary); }` en `.mem-btn`, indicadores y `#memRetry`. `#memGallery` y `#memStatus` no muestran anillo al recibir foco por script (`:focus:not(:focus-visible)`).
    - `@media (prefers-reduced-motion: reduce)`: sin `transition` en `.mem-carousel` ni en `.mem-media img`.
    - Prohibido: colores hexadecimales en las reglas nuevas, `url(...)` remoto, `@import`, fuentes externas.
  - No modificar `styles.css` ni `news-events.css`.
  - Tests:
    - `CA-08 dynamic-memories: CSS de la caja de imagen con object-fit contain, sin cover ni fill, con var(--surface-subtle), con el marcador en la misma caja y sin transform`.
    - `CA-10 dynamic-memories: CSS sin desbordamiento (max-width 100% en imágenes, min-width 0 en contenedores), :focus-visible en botones y reglas para 360 px`.
  - **Criterios de hecho:** dos tests en verde; `styles.css` y `news-events.css` sin cambios en git.
  - **Archivos:** `apps/web/src/memories.css` (nuevo), `apps/web/src/tests/memories.test.mjs`.
  - **Verificación:** `node --test apps/web/src/tests/memories.test.mjs`; `git diff --stat` sin `styles.css` ni `news-events.css`.

- [ ] **T-13** (CA-01, CA-02, CA-10, CA-11, CA-12; RN-02) — **Marcado de `index.html`.**
  - Head: añadir `<link rel="stylesheet" href="memories.css">` después de `animals.css` si existe (`web-011`); si no, después de `news-events.css` (línea 35).
  - `#galeria`: reemplazar **solo** el bloque `<div class="fotos">…</div>` (líneas 964 a 968, con `f1`, `f2` y `f3`) por el marcado de `#memGallery` de la sección «Marcado de #galeria» del plan. No tocar `.galeria-head`, ni el enlace «Descubre los animales», ni la meta de la línea 7.
  - Scripts (después de `js/news-events.js`, línea 71, y tras `js/animals.js` si existe): `js/memories-carousel.js` y `js/memories.js`, ambos con `defer`, en ese orden.
  - No añadir `section`, `h3` ni `id` fuera de `#memGallery`.
  - `script.js` no se toca (ver «Sobre script.js» del plan).
  - Tests (en `memories.test.mjs`):
    - `CA-01 dynamic-memories: index.html no contiene las fotos fijas f1, f2 ni f3 ni la clase fotos dentro de #galeria`.
    - `CA-02 dynamic-memories: el HTML inicial de #memStatus tiene role="status" con «Cargando momentos…» y #memGallery tiene aria-busy="true"`.
    - `CA-10 dynamic-memories: #galeria conserva su h2 «Momentos para recordar» y ningún momento tiene encabezado propio`.
    - `CA-11 dynamic-memories: index.html conserva los id y las secciones de la línea base (T-01 d), el enlace «Descubre los animales» y las referencias a script.js, animations.js y accessibility.js`.
    - `CA-12 dynamic-memories: index.html, noticias.html y eventos.html tienen exactamente una meta arca-api-base con el mismo content; la galería no define otra base`.
  - **Criterios de hecho:** cinco tests en verde; `relocation.test.mjs` sin nuevos fallos respecto de T-01 (e); `index.html` sin errores de sintaxis en el navegador (se verifica en T-15).
  - **Archivos:** `apps/web/src/index.html`, `apps/web/src/tests/memories.test.mjs`.
  - **Verificación:** `node --test apps/web/src/tests/memories.test.mjs`; `node --test apps/web/src/tests/relocation.test.mjs` comparado con T-01 (e).

- [ ] **T-14** (CA-13) — **Cobertura de criterios.**
  - Añadir el test `CA-13 dynamic-memories: cada criterio CA-01 a CA-23 tiene al menos un test que lo nombra`. Lee el propio archivo y comprueba los 23 nombres.
  - Comprobar que los imports son solo `node:*`.
  - **Criterios de hecho:** el test en verde con los 23 nombres encontrados.
  - **Archivos:** `apps/web/src/tests/memories.test.mjs`.
  - **Verificación:** `node --test apps/web/src/tests/memories.test.mjs`.

## Verificación manual y evidencia

- [ ] **T-15** (CA-01, CA-03, CA-04, CA-07, CA-08, CA-10, CA-15, CA-16, CA-19, CA-20, CA-23; manual, pendiente de `api-012` implementada) — **Verificación en navegador con la API real.** Con la API en `http://localhost:8000` y el portal en `php -S localhost:8080 -t apps/web/src` (origen exacto, no `127.0.0.1`):
  - CA-01 y CA-15: lista real, máximo seis, orden de la API, una sola petición en la pestaña de red.
  - CA-03: con cero momentos en `arca_pruebas`, texto de vacío sin carrusel.
  - CA-04: con la API apagada, error y «Reintentar» con teclado (Intro y Espacio) y con ratón; foco según S-7 y S-8.
  - CA-07 y CA-08: fotos completas y centradas (horizontal, vertical y cuadrada); marcador con una URL rota o con `image_url` `null`.
  - CA-10: anchos 360, 390, 768, 1024 y 1366 px sin desbordamiento horizontal; foco visible; un solo `h2`.
  - CA-16 y CA-21: avance cada 5 s con cronómetro; pausa con cursor y con foco.
  - CA-19 y CA-23: un lector de pantalla (al menos uno, con su navegador) anuncia «Momentos para recordar», la posición, el botón de pausa y «Carrusel en pausa.»/«Carrusel reanudado.»; Tab sigue el orden de RN-13 y CA-19.
  - CA-20: con «reducir movimiento» activo en el sistema, sin avance, sin botón de pausa, controles operativos.
  - Sin errores de consola con la galería vacía, con uno, con varios y con la API apagada.
  - Riesgo de `accessibility.js` (Bionic Reading) sobre los momentos cargados después: registrar si se aplica o no.
  - Coste de imágenes: peso de la respuesta y de las fotos en la pestaña de red.
  - **Criterios de hecho:** cada punto con resultado (aprobado, fallido o no aplicable) y capturas o notas en el PR. Un punto no verificado no se marca.
  - **Archivos:** ninguno (evidencia).
  - **Verificación:** notas y capturas en el PR.

## Documentación e infraestructura

- [ ] **T-16** (RN-08, RN-13; documentación del plan) — **Documentación local.** Crear `apps/web/docs/momentos-galeria.md` con las nueve secciones de «Documentación local» del plan: qué muestra y de dónde sale; configuración de la meta y del origen de CORS; plazo de siete días y vacío normal; carrusel (avance, pausa, botón, movimiento reducido); estados; seguridad; excepción ADR 0027 con su enmienda; cómo probar; limitaciones.
  - Comprobar que el documento coincide con el código entregado (nombres de los botones, textos de estado y de anuncio, valor de `limit`, intervalo de 5 s).
  - **Criterios de hecho:** el documento enlaza `docs/adr/0027-dynamic-public-memories-gallery.md`, no contiene valores de producción ni secretos y su texto coincide con el código.
  - **Archivos:** `apps/web/docs/momentos-galeria.md` (nuevo).
  - **Verificación:** revisión del diff contra `memories.js`, `memories-carousel.js` y `index.html`.

- [ ] **T-17** (CA-12, RN-03) — **Requisitos de ambiente en `infra/README.md`** (mismo PR, según `AGENTS.md`).
  - Añadir al final la sección «Portal público (Momentos para recordar)» con: origen `http://localhost:8080` en `CORS_ALLOWED_ORIGINS` (desarrollo; ya requerido por `web-009`); meta `arca-api-base` igual en las tres páginas; `<img>` no necesita CORS (`api-013` RN-12); evidencia `curl -i -H "Origin: http://localhost:8080" <API>/api/v1/memories?limit=6`.
  - No cambiar las secciones existentes (en particular la sección de `web-011`, si ya existe). Sin valores reales ni secretos.
  - **Criterios de hecho:** sección presente al final; la evidencia `curl` documentada sin dominio real ni secretos.
  - **Archivos:** `infra/README.md`.
  - **Verificación:** revisión del diff; `git diff --check`.

## Calidad y entrega

- [ ] **T-18** (CA-13 y todos los CA; DoD de la spec) — **Calidad y entrega.**
  - Ejecutar `node --test apps/web/src/tests/memories.test.mjs`, `node --test apps/web/src/tests/news-events.test.mjs` y `node --test apps/web/src/tests/relocation.test.mjs`; registrar aprobadas, fallidas y fallos preexistentes frente a T-01 (e).
  - Ejecutar `git diff --check`.
  - `/verify`: `apps/web` no tiene `package.json`; reportar la app como no inicializada, sin crearlo.
  - PR: enlazar spec, plan, tasks y ADR 0027; commit con el identificador `web-010` en inglés (por ejemplo, `feat(web-010): ...`).
  - Estado de la spec: no se cambia en esta tarea. Pasa a «En progreso» o «Implementada» solo con la aprobación de Jonathan y las evidencias de T-01 a T-17. Si cambia el estado, correr `generar_config.py` y reiniciar el mapa de Neuromapa, como pide la memoria del usuario.
  - **Criterios de hecho:** resultados registrados; PR con los tres artefactos enlazados; ningún CA sin prueba o sin evidencia.
  - **Archivos:** ninguno nuevo.
  - **Verificación:** salida de las tres suites, `git diff --check` y `/verify`.

## Trazabilidad CA → tarea → prueba

| CA | Tareas | Prueba automatizada (`memories.test.mjs`) | Evidencia manual |
|---|---|---|---|
| CA-01 | T-04, T-06, T-13 | `CA-01 dynamic-memories: con 8 momentos…`; `CA-01 … cada momento solo presenta…`; `CA-01 … memories.js no contiene published_until…`; `CA-01 … index.html no contiene las fotos fijas…` | T-15 (API real) |
| CA-02 | T-05, T-13 | `CA-02 dynamic-memories: antes de resolver…`; `CA-02 … el HTML inicial…` | — |
| CA-03 | T-05 | `CA-03 dynamic-memories: data vacío…` | T-15 (vacío real) |
| CA-04 | T-05 | `CA-04 dynamic-memories: red caída, 500…` | T-15 (API apagada) |
| CA-05 | T-05 | `CA-05 dynamic-memories: tras un error…` | — |
| CA-06 | T-04 | `CA-06 dynamic-memories: <img src=x onerror=…>…` | — |
| CA-07 | T-03, T-04 | `CA-07 dynamic-memories: safeImageUrl…`; `CA-07 … https y http con loading…` | T-15 (URL rota) |
| CA-08 | T-12 | `CA-08 dynamic-memories: CSS de la caja de imagen…` | T-15 (proporciones) |
| CA-09 | T-02 | `CA-09 dynamic-memories: getMemories pide…`; `CA-09 … getMemories devuelve…`; `CA-09 … api.js es el único archivo…` | — |
| CA-10 | T-12, T-13 | `CA-10 dynamic-memories: CSS sin desbordamiento…`; `CA-10 … #galeria conserva su h2…` | T-15 (360 a 1366 px) |
| CA-11 | T-13 | `CA-11 dynamic-memories: index.html conserva los id…` | `relocation.test.mjs` (T-01 e, T-13) |
| CA-12 | T-13, T-17 | `CA-12 dynamic-memories: index.html, noticias.html y eventos.html…` | Revisión (T-17) |
| CA-13 | T-14, T-18 | `CA-13 dynamic-memories: cada criterio CA-01 a CA-23…` | — |
| CA-14 | T-11 | `CA-14 dynamic-memories: sin package.json…` | — |
| CA-15 | T-06 | `CA-15 dynamic-memories: se hace una sola petición…` | T-15 |
| CA-16 | T-08 | `CA-16 dynamic-memories: con 3 momentos…` | T-15 (cronómetro) |
| CA-17 | T-07 | `CA-17 dynamic-memories: un único momento…` | — |
| CA-18 | T-07 | `CA-18 dynamic-memories: con 2 a 6 momentos…` | — |
| CA-19 | T-10 | `CA-19 dynamic-memories: el orden de tabulación…`; `CA-19 … el contenedor se anuncia…` | T-15 (lector de pantalla y teclado) |
| CA-20 | T-09 | `CA-20 dynamic-memories: con preferencia de movimiento reducido…` | T-15 (preferencia del sistema) |
| CA-21 | T-08 | `CA-21 dynamic-memories: el cursor dentro…` | — |
| CA-22 | T-11 | `CA-22 dynamic-memories: el carrusel no usa librerías…` | — |
| CA-23 | T-09 | `CA-23 dynamic-memories: pausar cambia el botón…`; `CA-23 … la pausa manual prevalece…` | T-15 (lector de pantalla) |

Cobertura: 23 de 23 CA tienen al menos una tarea y una prueba con nombre en `memories.test.mjs`.

## Trazabilidad RN → tarea

| RN | Tareas |
|---|---|
| RN-01 (solo presentación; orden de la API) | T-04, T-06 |
| RN-02 (sin contenido de muestra) | T-01, T-05, T-13 |
| RN-03 (solo lectura y público) | T-01, T-02, T-11, T-17 |
| RN-04 (texto seguro y URLs) | T-03, T-04, T-11 |
| RN-05 (sin dependencias) | T-03, T-11 |
| RN-06 (un solo módulo de red) | T-02 |
| RN-07 (sin datos personales) | T-04 |
| RN-08 (textos en español) | T-05, T-16 |
| RN-09 (imagen completa) | T-12 |
| RN-10 (vigencia en la API) | T-06 |
| RN-11 (carrusel sin dependencias) | T-07, T-11 |
| RN-12 (pocos momentos) | T-06, T-07 |
| RN-13 (botón de pausa) | T-07, T-08, T-09 |

Cobertura: 13 de 13 RN tienen al menos una tarea. RN sin cobertura: ninguna.

## Definición de terminado

- Spec Aprobada, plan y tasks con el mismo NNN-slug (`010-dynamic-memories`), y plan y tasks aprobados por el equipo y por Jonathan.
- Todas las T-xx aplicables marcadas con evidencia. Ninguna marcada sin ella.
- Un test automatizado por CA-01 a CA-23, nombrado en `apps/web/src/tests/memories.test.mjs`, en verde.
- `/verify`: `apps/web` no inicializada (sin `package.json`), reportado como tal.
- Sin violaciones de los seis principios (Constitution Check del plan); la excepción está en ADR 0027.
- `apps/web/docs/momentos-galeria.md` creado (T-16); `infra/README.md` actualizado en el mismo PR (T-17).
- PR con spec, plan y tasks enlazados; commit con `web-010`; sin secretos ni artefactos generados.
- Estado de la spec cambiado solo con aprobación de Jonathan y evidencias.
