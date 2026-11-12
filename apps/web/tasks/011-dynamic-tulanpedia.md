# Tareas · 011 · dynamic-tulanpedia

- Spec: `apps/web/specs/011-dynamic-tulanpedia.md` (Estado: **Aprobada**, Jonathan, 2026-11-12; aprobar no autoriza implementar).
- Plan: `apps/web/plan/011-dynamic-tulanpedia.md` (Estado: **Borrador**, pendiente de aprobación técnica y de Jonathan).
- ADR de excepción: `docs/adr/0028-dynamic-tulanpedia-catalog.md` (Aceptado, 2026-11-12). Extiende `docs/adr/0024-web-static-portal-exception.md`.
- Dependencias bloqueantes: `api-015` (Aprobada, **sin implementar**) y DBR-013 (en «Lista para backend» desde el 2026-11-12; migración aplicada en `arca_pruebas`, lote 5). `api-015` sigue sin implementar.
- Checklist: sin ninguna T-xx marcada. Cada T-xx se marca solo con evidencia aportada por la sesión principal o por el responsable de la verificación, y solo después de la aprobación de este plan.
- Sin dependencias nuevas, sin `package.json`, sin build. Las pruebas usan `node --test` y no llaman a la API real.

## Base de datos (responsable de BD)

No hay tareas de BD propias de `apps/web`. La precondición DBR-013 se comprueba en T-01 (evidencia del responsable de BD).

## Implementación

- [ ] **T-01** (CA-01, CA-10, CA-13; RN-02) — **Precondiciones y línea base** (bloqueante; no es código):
  - (a) `api-015` implementada con evidencia: `curl -i -H "Origin: http://localhost:8080" http://localhost:8000/api/v1/published-species` responde `200`, con `Access-Control-Allow-Origin: http://localhost:8080` y `{"data": [...]}`; y las pruebas PHPUnit `test_ca01` a `test_ca18` de `api-015` están en verde (evidencia del equipo de backend).
  - [x] (b) DBR-013 en «Lista para backend» con evidencia de la migración aplicada en `arca_pruebas` (responsable de BD). **Evidencia (verificado 2026-11-12, lote 5):** migración `Ran` por consulta de solo lectura de backend; fecha y responsable de la aplicación: por registrar por BD.
  - (c) Plan y tasks aprobados por el equipo y por Jonathan, con las respuestas a las preguntas 1 a 8 del plan.
  - (d) Línea base del orden de secciones de `apps/web/src/index.html` registrada en el PR: `porque-visitar`, `animales`, `mapa`, `ubicacion`, `instalaciones`, `noticias`, `eventos`, `boletos`, `preguntas`, `galeria` (y `cognitivePanel`, de tipo diálogo). Esa lista se copia a `animals.test.mjs` en T-04.
  - (e) Línea base de regresión: número de pruebas aprobadas y fallidas de `node --test apps/web/src/tests/relocation.test.mjs` y de `node --test apps/web/src/tests/news-events.test.mjs`, antes de cualquier cambio. Los fallos preexistentes (6 en `relocation.test.mjs`, según `apps/web/tasks/009-dynamic-news-events.md`) se registran sin atribuirlos a este cambio.
  - (f) Confirmar que `apps/web/src/js/api.js` existe con la función `request` de `web-009` sin cambios pendientes.
  - **Criterios de hecho:** (a) a (f) con evidencia adjunta al PR. Si (a) o (b) faltan, no se empieza T-02.
  - **Archivos:** ninguno (solo evidencia).
  - **Verificación:** comandos de (a), (e) y la lista de (d) en el PR.

- [ ] **T-02** (CA-10, CA-17; RN-03, RN-05, RN-06) — **Módulo de red:** añadir `getSpecies()` a `js/api.js` y crear el archivo de pruebas con su estructura.
  - Añadir `getSpecies: function () { return request('/published-species', null, 'list'); }` dentro de `root.ArcaApi`. No cambiar `request`, `getNews`, `getEvents` ni `getNewsItem`.
  - Crear `apps/web/src/tests/animals.test.mjs` con `node:test`, `node:assert/strict`, `node:fs`, `node:path` y `node:vm`, y con el DOM simulado y `fetch` simulado de `news-events.test.mjs` (sin dependencias).
  - Tests:
    - `CA-10 dynamic-tulanpedia: getSpecies pide {base}/published-species con credentials omit, Accept application/json, 10 s y la base de la meta`.
    - `CA-10 dynamic-tulanpedia: getSpecies devuelve {ok:false, reason} con red caída, 500, JSON inválido y data ausente`.
  - **Criterios de hecho:** los dos tests en verde; `news-events.test.mjs` sin cambios de resultado.
  - **Archivos:** `apps/web/src/js/api.js`, `apps/web/src/tests/animals.test.mjs` (nuevo).
  - **Verificación:** `node --test apps/web/src/tests/animals.test.mjs` (solo los tests de esta tarea) y `node --test apps/web/src/tests/news-events.test.mjs`.

- [ ] **T-03** (CA-09, CA-19; RN-04, RN-11) — **Helpers puros:** crear `apps/web/src/js/animals.js` como script clásico (IIFE con `root`), que expone `ArcaTulanpedia.helpers` sin tocar el DOM todavía.
  - `safeImageUrl(value)`: `http`/`https` absolutas parseadas con `new URL`, o rutas que empiezan por `/` y no por `//` ni `/\`; el resto, `null`.
  - `categoryLabel(key)`: tabla fija de seis claves (`mammal`, `bird`, `reptile`, `amphibian`, `fish`, `invertebrate`) con `Object.prototype.hasOwnProperty.call`; clave desconocida, tal cual.
  - `habitatKey(value)`: `trim()` y `toLocaleLowerCase('es')`; vacío o no string → `null`.
  - `fieldRows(species)`: filas en el orden del plan (`category` primero), solo para valores válidos; `size_cm` con sufijo ` cm`.
  - `countText(n)` y `sortByLabel(list)`.
  - Tests:
    - `CA-09 dynamic-tulanpedia: safeImageUrl acepta solo http, https y rutas que empiezan por /; rechaza javascript:, data:, //host, rutas sin barra y valores no string`.
    - `CA-19 dynamic-tulanpedia: fieldRows devuelve solo los campos con valor válido, con las etiquetas exactas de la spec`.
    - `CA-11 dynamic-tulanpedia: categoryLabel no toma valores heredados (constructor, __proto__) y muestra las claves desconocidas tal como llegan`.
  - **Criterios de hecho:** tres tests en verde; `animals.js` no contiene `fetch(`.
  - **Archivos:** `apps/web/src/js/animals.js` (nuevo), `apps/web/src/tests/animals.test.mjs`.
  - **Verificación:** `node --test apps/web/src/tests/animals.test.mjs`.

- [ ] **T-04** (CA-08, CA-12, CA-13, CA-18; RN-02) — **Marcado de `index.html`:** retirar la muestra y preparar los contenedores.
  - En `#animales`: quitar las cuatro `article.animal-card` (león, jirafa, guacamaya, tortuga), los `p.model-note` y `p.demo-note`.
  - Quitar el bloque 1 del script en línea (`.animal-card[data-model]`). **Conservar** `var viewerLoaded = false;` (lo usa el bloque 1b del mapa) y todo el bloque 1b (`#mapModelToggle`).
  - Sustituir el contenido de `#animales` por: `div#animalFilters.animal-filters[hidden]` con los `label#speciesFilterField`, `label#habitatFilterField[hidden]` y `label#categoryFilterField[hidden]` (los tres `select` con `id` existentes `speciesFilter` y `habitatFilter`, y el nuevo `categoryFilter`), `button#clearFilters` y `p#animalCount[hidden]`; `p#animalStatus.tp-status[role="status"][tabindex="-1"]` con «Cargando especies…»; `div#animalGrid.animal-grid[aria-busy="true"]` vacío; `p#noAnimals.empty-state[hidden]` con el texto de la spec.
  - Quitar las opciones fijas «Sabana», «Bosque», «Aviario», «Reptilario» y los `data-species`/`data-habitat` (CA-04).
  - Enlazar `<link rel="stylesheet" href="animals.css">` después de `news-events.css` y `<script src="js/animals.js" defer>` después de `js/news-events.js`.
  - Crear `apps/web/src/animals.css` con solo un comentario (se completa en T-10) para que las referencias locales resuelvan.
  - No cambiar el orden de secciones ni el resto de `index.html`. La introducción de CA-23 se corrige en T-13.
  - Tests:
    - `CA-08 dynamic-tulanpedia: index.html no tiene las cuatro fichas de muestra, demo-note, model-note, data-model ni .glb dentro de #animales`.
    - `CA-12 dynamic-tulanpedia: index.html conserva los IDs de la sección y las referencias a script.js, animations.js, accessibility.js, js/api.js y js/animals.js`.
    - `CA-13 dynamic-tulanpedia: el orden de secciones coincide con la línea base de T-01 y #animales va antes de #mapa`.
    - `CA-18 dynamic-tulanpedia: #animales no tiene carrusel, visor 3D, data-model, .glb ni la jirafa`.
  - **Criterios de hecho:** los cuatro tests en verde; `relocation.test.mjs` sin nuevos fallos respecto de T-01 (e); `index.html` abre sin errores de sintaxis en el navegador.
  - **Archivos:** `apps/web/src/index.html`, `apps/web/src/animals.css` (nuevo, mínimo), `apps/web/src/tests/animals.test.mjs`.
  - **Verificación:** `node --test apps/web/src/tests/animals.test.mjs`; `node --test apps/web/src/tests/relocation.test.mjs` comparado con T-01 (e).

- [ ] **T-05** (CA-05, CA-06, CA-07; RN-02, RN-13) — **Estados de carga, vacío, error y reintento** en `js/animals.js`.
  - `load()`: llama una vez a `ArcaApi.getSpecies()`; un flag `busy` evita dos peticiones a la vez.
  - Carga: `#animalStatus` con «Cargando especies…» visible, `#animalGrid` con `aria-busy="true"` y vacío, filtros y contador ocultos, `#noAnimals` oculto.
  - Vacío (`data: []` o sin especies válidas): «Aún no hay especies publicadas.» en `#animalStatus`; sin tarjetas, filtros ni contador; `#noAnimals` oculto.
  - Error (`ok: false`): «No pudimos cargar las especies. Inténtalo más tarde.» y `button#animalRetry` «Reintentar» dentro de `#animalStatus`; grid vacío; filtros ocultos.
  - «Reintentar» llama a `load()` otra vez y mueve el foco según S-5 del plan: al estado en la carga; a la cuadrícula (`#animalGrid`, `tabindex="-1"`) si responde bien; a `#animalRetry` si vuelve a fallar.
  - Ninguna transición conserva datos de la carga anterior.
  - Tests:
    - `CA-05 dynamic-tulanpedia: antes de resolver la petición, #animalStatus anuncia «Cargando especies…» con role="status" y #animalGrid tiene aria-busy="true"`.
    - `CA-06 dynamic-tulanpedia: data vacío muestra «Aún no hay especies publicadas.» sin tarjetas, filtros, contador ni #noAnimals`.
    - `CA-07 dynamic-tulanpedia: red caída, 500, JSON inválido y data ausente muestran el error con #animalRetry, sin datos previos; «Reintentar» pide de nuevo, muestra la carga y mueve el foco`.
  - **Criterios de hecho:** tres tests en verde; no hay `fetch(` en `js/animals.js`; el mensaje de error no muestra el `reason`.
  - **Archivos:** `apps/web/src/js/animals.js`, `apps/web/src/tests/animals.test.mjs`.
  - **Verificación:** `node --test apps/web/src/tests/animals.test.mjs`.

- [ ] **T-06** (CA-01, CA-02, CA-09, CA-11, CA-19; RN-01, RN-04, RN-08, RN-10, RN-12) — **Tarjetas, imágenes y campos.**
  - Con datos válidos, `load()` crea un `article.animal-card` por especie en el orden recibido, con la estructura de la sección «Tarjetas» del plan (`div.tp-media`, `h3`, `div.tp-details` solo si hay filas).
  - Imagen: `img` con `loading="lazy"`, `decoding="async"`, `alt` = nombre común, `src` solo si `safeImageUrl` lo acepta; `error` reemplaza la imagen por `span.tp-placeholder[aria-hidden="true"]` en la misma caja. Sin URL válida, solo placeholder.
  - Todo texto por `textContent`; sin `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write` ni `eval`.
  - Las claves no listadas (`created_by`, `reviewed_by`, `is_published`, `image_path`, etc.) no se muestran.
  - Las especies inválidas (no objeto o sin `common_name` no vacío) se omiten (pregunta 4 del plan).
  - Tests:
    - `CA-01 dynamic-tulanpedia: una tarjeta por especie, en el orden recibido, sin tarjetas fijas en #animales; cada tarjeta tiene nombre y foto`.
    - `CA-02 dynamic-tulanpedia: se dibuja exactamente lo recibido; una especie que no llega no genera tarjeta`.
    - `CA-09 dynamic-tulanpedia: https con loading, decoding y alt; null, javascript:, data: y error de carga muestran placeholder con aria-hidden en la misma caja`.
    - `CA-11 dynamic-tulanpedia: <img src=x onerror=…> en nombre, hábitat, origen y URL se muestra como texto y no crea elementos; búsqueda estática de APIs HTML inseguras en js/animals.js y js/api.js sin resultados`.
    - `CA-19 dynamic-tulanpedia: combinaciones de campos: nombre y foto siempre; filas solo con valor; sin bloque «Conocer más» si no hay filas; category null omitida`.
  - **Criterios de hecho:** cinco tests en verde; `h3` para cada nombre; ningún `innerHTML` en `js/animals.js`.
  - **Archivos:** `apps/web/src/js/animals.js`, `apps/web/src/tests/animals.test.mjs`.
  - **Verificación:** `node --test apps/web/src/tests/animals.test.mjs`.

- [ ] **T-07** (CA-03, CA-04, CA-21, CA-22; RN-07, RN-08, RN-11) — **Filtros derivados, contador y «Limpiar filtros»** en `js/animals.js`.
  - Opciones de «Especie» (`common_name` distintos, ordenados, «Todas las especies» primero), de «Hábitat» (`habitatKey` distinto, primera forma recibida, «Todos los hábitats» primero) y de «Tipo de animal» (claves válidas con `categoryLabel`, ordenadas por etiqueta, «Todos los tipos» primero). Las opciones se crean con la DOM API.
  - «Hábitat» oculto si no hay `habitat` válido (`#habitatFilterField[hidden]`). «Tipo de animal» siempre visible; sin `category` válida, solo «Todos los tipos» y `select` deshabilitado.
  - Filtro en memoria: `common_name === species`, `habitatKey(habitat) === habitat`, `category === category`, todos a la vez. Sin petición nueva.
  - `#animalCount` con `countText`; `#noAnimals` visible si no hay coincidencias.
  - «Limpiar filtros» pone los tres `select` en vacío y reaplica; el foco se queda en el botón.
  - Tests:
    - `CA-03 dynamic-tulanpedia: filtros combinados sobre la lista en memoria; contador singular y plural; «Limpiar filtros» restablece los tres; sin peticiones adicionales`.
    - `CA-04 dynamic-tulanpedia: opciones ordenadas con «Todas» primero; hábitats sin distinguir mayúsculas con la primera forma; null y vacíos descartados; sin valores fijos en el HTML; etiquetas de category en español`.
    - `CA-21 dynamic-tulanpedia: sin habitat válido el filtro de hábitat queda oculto; con al menos una especie, «Especie» está visible`.
    - `CA-22 dynamic-tulanpedia: tres casos de tipo: varias categorías; una sola (visible, no se oculta); ninguna (solo «Todos los tipos», deshabilitado)`.
  - **Criterios de hecho:** cuatro tests en verde; una especie sin hábitat aparece en «Todos» y en su opción de «Especie», pero no al filtrar por hábitat.
  - **Archivos:** `apps/web/src/js/animals.js`, `apps/web/src/tests/animals.test.mjs`.
  - **Verificación:** `node --test apps/web/src/tests/animals.test.mjs`.

- [ ] **T-08** (CA-20, CA-24; RN-01, RN-13) — **Visibilidad y republicación.**
  - Sin código nuevo de caché: cada carga reemplaza la lista. Esta tarea comprueba ese comportamiento.
  - Tests:
    - `CA-20 dynamic-tulanpedia: data vacío no cambia el HTML; en una segunda carga con una especie aparece sin cambios en index.html`.
    - `CA-24 dynamic-tulanpedia: una especie que no viene en la respuesta no genera tarjeta; cuando vuelve en la carga siguiente, aparece sin cambiar el HTML`.
  - **Criterios de hecho:** dos tests en verde; `index.html` leído una vez por prueba y sin cambios entre cargas.
  - **Archivos:** `apps/web/src/tests/animals.test.mjs`.
  - **Verificación:** `node --test apps/web/src/tests/animals.test.mjs`. La evidencia manual de CA-24 es T-15.

- [ ] **T-09** (CA-12; RN-06) — **Retirar el filtro de animales de `script.js`.** Depende de la respuesta a la pregunta 1 del plan (cabecera).
  - Quitar `speciesFilter`, `habitatFilter`, `animalCount`, `noAnimals`, `animalCards`, `filterAnimals()`, los listeners de `input` (con `debounce`), de `speciesFilter`, `habitatFilter` y `clearFilters`, y la llamada inicial `filterAnimals()`.
  - Conservar `const menuToggle =` y `const searchInput = $('searchInput');`, que son anclas de `relocation.test.mjs`.
  - Quitar `normalize` y `debounce` solo si ya no tienen usos (comprobar con búsqueda).
  - Listener de `#searchForm`: según la respuesta a la pregunta 1 (por defecto, sin filtrar; solo `scrollIntoView` a `#animales`).
  - Tests:
    - `CA-12 dynamic-tulanpedia: script.js no referencia .animal-card, speciesFilter, habitatFilter, clearFilters, animalCount ni noAnimals`.
  - **Criterios de hecho:** el test en verde; `relocation.test.mjs` y `news-events.test.mjs` sin nuevos fallos respecto de T-01 (e); cero errores de consola al cargar la página sin especies (se verifica en T-15).
  - **Archivos:** `apps/web/src/script.js`, `apps/web/src/tests/animals.test.mjs`.
  - **Verificación:** `node --test apps/web/src/tests/animals.test.mjs`; `node --test apps/web/src/tests/relocation.test.mjs` comparado con T-01 (e).

- [ ] **T-10** (CA-09, CA-14; RN-09) — **Estilos de `animals.css`.**
  - `.tp-media`: `aspect-ratio: 4 / 3`, `background: var(--surface-subtle)`, `display: grid`, `place-items: center`, `overflow: hidden`, `min-width: 0`.
  - `.tp-media img`: `display: block; width: auto; height: auto; max-width: 100%; max-height: 100%; object-fit: contain; object-position: center`. Sin `cover`, `fill` ni `transform`.
  - Guarda de zoom: `.animal-card:hover .tp-media img { transform: none; transition: none; }` (CA-09).
  - `.tp-placeholder`, `.tp-status`, `.tp-details`, `.tp-details-title`: solo clases con prefijo `tp-`, sin hex.
  - Foco: `:focus-visible` con `outline: 3px solid var(--primary)` en `#animalRetry`, `#clearFilters` y los selects. `#animalStatus` y `#animalGrid` no muestran anillo al recibir foco por script.
  - Ajustes de 360 px: botón y selects a `width: 100%` y `min-width: 0`; `.tp-media` nunca supera el ancho de la tarjeta.
  - No modificar `styles.css` ni `animations.css`.
  - Tests:
    - `CA-09 dynamic-tulanpedia: CSS de la caja de imagen con object-fit contain, sin cover ni fill, con var(--surface-subtle) y con la guarda de zoom`.
    - `CA-14 dynamic-tulanpedia: CSS con min-width 0, max-width 100% en imágenes, :focus-visible en #animalRetry y #clearFilters, y reglas para 360 px; h2 de sección, h3 por especie y role="status" en #animalStatus`.
  - **Criterios de hecho:** dos tests en verde; `animations.css` y `styles.css` sin cambios en git.
  - **Archivos:** `apps/web/src/animals.css`, `apps/web/src/tests/animals.test.mjs`.
  - **Verificación:** `node --test apps/web/src/tests/animals.test.mjs`; `git diff --stat` sin `styles.css` ni `animations.css`.

- [ ] **T-11** (CA-11, CA-15, CA-17; RN-03, RN-05, RN-06) — **Pruebas estáticas de seguridad y configuración.**
  - CA-11: búsqueda de `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval` y `new Function` en `js/animals.js` y `js/api.js`, sin resultados.
  - CA-17: no existe `apps/web/package.json`; `animals.js`, `api.js` y `animals.css` no usan `localStorage`, `sessionStorage`, `document.cookie` ni `credentials` distinto de `'omit'`; no hay `http`/`https` remotos nuevos en `#animales` ni en `animals.css`; los scripts de `#animales` son locales.
  - CA-15: `index.html`, `noticias.html` y `eventos.html` tienen exactamente una meta `arca-api-base`, con el mismo `content`, que termina en `/api/v1`. La sección no define otra base de API.
  - Tests:
    - `CA-11 dynamic-tulanpedia: revisión estática de innerHTML, outerHTML, insertAdjacentHTML, document.write, eval y new Function en js/`.
    - `CA-15 dynamic-tulanpedia: las tres páginas tienen la misma meta arca-api-base terminada en /api/v1`.
    - `CA-17 dynamic-tulanpedia: sin package.json, sin almacenamiento, credentials solo omit y sin recursos remotos nuevos`.
  - **Criterios de hecho:** tres tests en verde.
  - **Archivos:** `apps/web/src/tests/animals.test.mjs`.
  - **Verificación:** `node --test apps/web/src/tests/animals.test.mjs`.

- [ ] **T-12** (CA-16; RN-05) — **Suite completa y cobertura.**
  - Añadir `CA-16 dynamic-tulanpedia: cada criterio CA-01 a CA-24 tiene al menos un test que lo nombra`. Lee el propio archivo y comprueba los 24 nombres.
  - Comprobar que los imports son solo `node:*` y que no hay `package.json`.
  - Tests:
    - `CA-16 dynamic-tulanpedia: cada criterio tiene su prueba (CA-01 a CA-24)`.
  - **Criterios de hecho:** la suite completa en verde; los 24 CA tienen su nombre; ningún test depende de la red ni de la API real.
  - **Archivos:** `apps/web/src/tests/animals.test.mjs`.
  - **Verificación:** `node --test apps/web/src/tests/animals.test.mjs` con el número de pruebas y de aprobadas registrado en el PR.

- [ ] **T-13** (CA-23; RN-08) — **Introducción y documentación local.**
  - En `index.html`, línea ~260, reemplazar «Busca por nombre o filtra por especie y hábitat. En cada ficha encontrarás información general…» por el texto exacto de CA-23: «Filtra las especies por tipo de animal, especie o hábitat. En cada ficha verás la información que el zoológico ha publicado para la especie.». El titular «Encuentros inolvidables» y el `h2` «TulanPedia» no cambian.
  - Crear `apps/web/docs/tulanpedia-catalogo.md` con las nueve secciones del plan («Documentación local»): fuente de datos, configuración de la meta y del origen de CORS, filtros, tabla de etiquetas de `category`, estados, seguridad, excepción de ADR 0028 con enlace, cómo probar y limitaciones.
  - Tests:
    - `CA-23 dynamic-tulanpedia: la introducción de #animales dice exactamente el texto de la spec y no contiene la frase de búsqueda por nombre`.
  - **Criterios de hecho:** test en verde; el documento enlaza `docs/adr/0028-dynamic-tulanpedia-catalog.md` y no contiene valores de producción ni secretos; la tabla de etiquetas coincide con `categoryLabel`.
  - **Archivos:** `apps/web/src/index.html`, `apps/web/docs/tulanpedia-catalogo.md` (nuevo), `apps/web/src/tests/animals.test.mjs`.
  - **Verificación:** `node --test apps/web/src/tests/animals.test.mjs`; revisión de que la tabla del documento y la de `js/animals.js` son idénticas.

- [ ] **T-14** (CA-15, CA-17; Nota de infraestructura del plan) — **Requisitos de ambiente en `infra/README.md`** (mismo PR, según `AGENTS.md`).
  - Añadir la sección «Portal público (TulanPedia)» con: origen `http://localhost:8080` en `CORS_ALLOWED_ORIGINS` (desarrollo); meta `arca-api-base` igual en las tres páginas; evidencia con `curl -i -H "Origin: http://localhost:8080" <API>/api/v1/published-species`.
  - Sin valores reales ni secretos.
  - **Criterios de hecho:** sección presente; la evidencia `curl` documentada sin dominio real ni secretos.
  - **Archivos:** `infra/README.md`.
  - **Verificación:** revisión del diff; `git diff --check`.

- [ ] **T-15** (CA-01, CA-07, CA-09, CA-14, CA-24; manual) — **Verificación en navegador con la API real.** Pendiente de `api-015` implementada (DBR-013 ya aplicada en `arca_pruebas`, 2026-11-12).
  - Con la API en `http://localhost:8000` y el portal en `php -S localhost:8080 -t apps/web/src` (origen exacto, no `127.0.0.1`):
    - CA-01: lista real, orden y campos de la respuesta.
    - CA-07: con la API apagada, mensaje de error y «Reintentar» con teclado (Enter y Espacio) y con ratón; foco como en S-5.
    - CA-09: fotos completas y centradas (horizontal, vertical y cuadrada); placeholder con una URL rota.
    - CA-14: anchos 360, 390, 768, 1024 y 1366 px sin desbordamiento horizontal; foco visible; orden `h2` y `h3`.
    - CA-24: en `arca_pruebas`, despublicar una especie (desde `dashboard-010`), recargar y comprobar que no aparece; republicarla y comprobar que vuelve.
    - Sin errores de consola al cargar con y sin especies (T-09).
    - Riesgo de `accessibility.js` (Bionic Reading) sobre tarjetas cargadas después: registrar si se aplica o no.
    - Coste de imágenes: peso de la lista y de las fotos en la pestaña de red.
  - **Criterios de hecho:** cada punto con resultado (aprobado, fallido o no aplicable) y capturas o notas en el PR. Un punto no verificado no se marca.
  - **Archivos:** ninguno (evidencia).
  - **Verificación:** notas y capturas en el PR.

- [ ] **T-16** (CA-16; DoD de la spec) — **Calidad y entrega.**
  - Ejecutar `node --test apps/web/src/tests/animals.test.mjs`, `node --test apps/web/src/tests/relocation.test.mjs` y `node --test apps/web/src/tests/news-events.test.mjs`; registrar aprobadas, fallidas y fallos preexistentes frente a T-01 (e).
  - `git diff --check`.
  - `/verify`: `apps/web` no tiene `package.json`; reportar la app como no inicializada, sin crearlo.
  - PR: enlazar spec, plan, tasks y ADR 0028; commit con el identificador `web-011` en inglés (por ejemplo, `feat(web-011): ...`).
  - Estado de la spec: no cambiarlo en esta tarea. Pasa a «En progreso» o «Implementada» solo con la aprobación de Jonathan y las evidencias de T-01 a T-15. Si cambia el estado, correr `generar_config.py` y reiniciar el mapa de Neuromapa, como pide la memoria del usuario.
  - **Criterios de hecho:** resultados registrados; PR con los tres artefactos enlazados; ningún CA sin prueba o sin evidencia.
  - **Archivos:** ninguno nuevo.
  - **Verificación:** salida de las tres suites, `git diff --check` y `/verify`.

## Trazabilidad CA → tarea → prueba

| CA | Tareas | Prueba automatizada (`animals.test.mjs`) | Evidencia manual |
|---|---|---|---|
| CA-01 | T-01, T-06 | `CA-01 dynamic-tulanpedia: una tarjeta por especie…` | T-15 (API real) |
| CA-02 | T-06 | `CA-02 dynamic-tulanpedia: se dibuja exactamente lo recibido…` | — |
| CA-03 | T-07 | `CA-03 dynamic-tulanpedia: filtros combinados…` | — |
| CA-04 | T-03, T-07 | `CA-04 dynamic-tulanpedia: opciones ordenadas…` | — |
| CA-05 | T-05 | `CA-05 dynamic-tulanpedia: antes de resolver la petición…` | — |
| CA-06 | T-05 | `CA-06 dynamic-tulanpedia: data vacío…` | — |
| CA-07 | T-05 | `CA-07 dynamic-tulanpedia: red caída, 500…` | T-15 (API apagada) |
| CA-08 | T-04 | `CA-08 dynamic-tulanpedia: index.html no tiene las cuatro fichas…` | — |
| CA-09 | T-03, T-06, T-10 | `CA-09 dynamic-tulanpedia: https con loading…`; `CA-09 … safeImageUrl…`; `CA-09 … CSS…` | T-15 (imágenes reales) |
| CA-10 | T-02 | `CA-10 dynamic-tulanpedia: getSpecies pide…`; `CA-10 … getSpecies devuelve…` | — |
| CA-11 | T-03, T-06, T-11 | `CA-11 dynamic-tulanpedia: <img src=x…>…`; `CA-11 … categoryLabel…`; `CA-11 … revisión estática…` | — |
| CA-12 | T-04, T-09 | `CA-12 dynamic-tulanpedia: index.html conserva los IDs…`; `CA-12 … script.js no referencia…` | Regresión (T-16) |
| CA-13 | T-01, T-04 | `CA-13 dynamic-tulanpedia: el orden de secciones…` | — |
| CA-14 | T-05, T-10 | `CA-14 dynamic-tulanpedia: CSS con min-width 0…` | T-15 (anchos 360 a 1366 px) |
| CA-15 | T-11, T-14 | `CA-15 dynamic-tulanpedia: las tres páginas tienen la misma meta…` | Revisión (T-14) |
| CA-16 | T-12 | `CA-16 dynamic-tulanpedia: cada criterio tiene su prueba…` | — |
| CA-17 | T-02, T-11, T-14 | `CA-17 dynamic-tulanpedia: sin package.json…` | — |
| CA-18 | T-04 | `CA-18 dynamic-tulanpedia: #animales no tiene carrusel…` | — |
| CA-19 | T-03, T-06 | `CA-19 dynamic-tulanpedia: fieldRows…`; `CA-19 … combinaciones…` | — |
| CA-20 | T-05, T-08 | `CA-20 dynamic-tulanpedia: data vacío no cambia el HTML…` | — |
| CA-21 | T-07 | `CA-21 dynamic-tulanpedia: sin habitat válido…` | — |
| CA-22 | T-07 | `CA-22 dynamic-tulanpedia: tres casos de tipo…` | — |
| CA-23 | T-13 | `CA-23 dynamic-tulanpedia: la introducción de #animales…` | — |
| CA-24 | T-08 | `CA-24 dynamic-tulanpedia: una especie que no viene…` | T-15 (despublicar y republicar en `arca_pruebas`) |

Cobertura: 24 de 24 CA tienen al menos una tarea y una prueba con nombre en `animals.test.mjs`.

## Trazabilidad RN → tarea

| RN | Tareas |
|---|---|
| RN-01 (solo presentación) | T-06, T-08 |
| RN-02 (sin contenido de muestra) | T-01, T-04, T-05 |
| RN-03 (solo lectura y público) | T-02, T-11 |
| RN-04 (texto seguro) | T-03, T-06, T-11 |
| RN-05 (sin dependencias) | T-02, T-11, T-12 |
| RN-06 (un solo módulo de red) | T-02, T-09, T-11 |
| RN-07 (filtros en el cliente) | T-07 |
| RN-08 (textos en español) | T-05, T-06, T-07, T-13 |
| RN-09 (imagen completa) | T-10 |
| RN-10 (sin datos personales) | T-06 |
| RN-11 (opciones sin fuente fija) | T-03, T-07 |
| RN-12 (campos presentes) | T-06 |
| RN-13 (vacío) | T-05, T-08 |

Cobertura: 13 de 13 RN tienen al menos una tarea.

## Definición de terminado

- Spec Aprobada, plan y tasks con el mismo NNN-slug (`011-dynamic-tulanpedia`), y plan y tasks aprobados por el equipo y por Jonathan.
- Todas las T-xx aplicables marcadas con evidencia. Ninguna marcada sin ella.
- Un test automatizado por CA-01 a CA-24, nombrado en `apps/web/src/tests/animals.test.mjs`, en verde.
- `/verify`: `apps/web` no inicializada (sin `package.json`), reportado como tal.
- Sin violaciones de los seis principios (Constitution Check del plan); la excepción está en ADR 0028.
- `infra/README.md` actualizado en el mismo PR (T-14); `apps/web/docs/tulanpedia-catalogo.md` creado (T-13).
- PR con spec, plan y tasks enlazados; commit con `web-011`; sin secretos ni artefactos generados.
- Estado de la spec cambiado solo con aprobación de Jonathan y evidencias.
