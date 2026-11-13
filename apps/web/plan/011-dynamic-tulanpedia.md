# Plan técnico · 011 · dynamic-tulanpedia

- Spec: `apps/web/specs/011-dynamic-tulanpedia.md`
- Estado de spec: Aprobada (Jonathan, responsable de backend, 2026-11-12). Aprobar la spec no autoriza implementar: la implementación espera a `api-015` implementada (DBR-013 ya está en «Lista para backend» desde el 2026-11-12).
- Estado de este plan: **Borrador, pendiente de aprobación técnica del equipo y de Jonathan.** No está aprobado. No se implementa ni se marca ninguna T-xx hasta esa aprobación.
- Tasks: `apps/web/tasks/011-dynamic-tulanpedia.md` (Borrador, mismo NNN-slug).
- ADR de excepción: `docs/adr/0028-dynamic-tulanpedia-catalog.md` (Aceptado 2026-11-12). Extiende la excepción de `docs/adr/0024-web-static-portal-exception.md` (Aceptado; no se modifica). `docs/adr/0027-dynamic-public-memories-gallery.md` (Aceptado 2026-11-12) no aplica.
- Responsable técnico: por identificar (frontend del portal).
- Dependencias bloqueantes de implementación:
  - `api-015` (`GET /api/v1/published-species`): Aprobada 2026-11-12, **sin implementar**. No se puede verificar contra la API real hasta que exista. Hasta entonces, las pruebas usan respuestas simuladas.
  - DBR-013 (`docs/database/requests/DBR-013-species-requests.md`): Aprobada por BD y backend; migración **aplicada en `arca_pruebas`** (lote 5), verificada el 2026-11-12; «Lista para backend». Pendiente de BD: EXPLAIN y registro de fecha y responsable.
  - `web-009` (módulo `js/api.js`, meta `arca-api-base`): reutilizado; su implementación está parcial según su tasks.
  - `api-014` y `dashboard-010`: origen de las especies publicadas. No bloquean el desarrollo del portal con respuestas simuladas.

## Diseño de solución

TulanPedia (`#animales` de `apps/web/src/index.html`) sigue siendo HTML, CSS y JavaScript clásico, sin build, sin `package.json` y sin paquetes (ADR 0028, condiciones 1 a 7). El flujo es:

1. `index.html` muestra en `#animales` solo el estado inicial de carga, sin tarjetas de muestra, con filtros vacíos y ocultos.
2. `js/api.js` añade `getSpecies()`, que pide `GET {base}/published-species` con la misma política de red de `web-009` (`credentials: 'omit'`, `Accept: application/json`, 10 s, base desde `<meta name="arca-api-base">`). Sigue siendo el único archivo con `fetch`.
3. `js/animals.js` (nuevo) recibe el resultado de `ArcaApi.getSpecies()`, pinta estados (carga, vacío, error), crea las tarjetas con la DOM API, construye las opciones de los filtros a partir de la lista recibida y gestiona contador, «Limpiar filtros» y «Reintentar». No llama a la red. Expone `ArcaTulanpedia` como global, igual que `ArcaNewsEvents`.
4. `script.js` deja de filtrar `.animal-card`: se retira el bloque de filtros de animales. El resto del script no cambia.
5. `animals.css` (nuevo) da la caja de imagen de proporción fija, el placeholder, los ajustes de 360 px y el foco visible. No se modifica `styles.css` ni `animations.css`.

Orden de carga de scripts en `index.html`, todos con `defer` y en este orden: `script.js`, `animations.js`, `accessibility.js`, `js/api.js`, `js/news-events.js`, `js/animals.js`. `js/animals.js` debe ir después de `js/api.js` porque usa el global `ArcaApi`. En los estilos, `animals.css` va después de `news-events.css`.

Se usa script clásico (IIFE con `root`), no módulo ES, por el mismo motivo que `web-009`: el runner `node --test` carga los archivos en un contexto `node:vm`.

### Responsabilidades

| Pieza | Responsabilidad | No hace |
|---|---|---|
| `js/api.js` | Red: URL, cabeceras, tiempo máximo, resultado uniforme `{ ok, data, meta }` o `{ ok: false, reason }` | No conoce el DOM |
| `js/animals.js` | Presentación: estados, tarjetas, filtros, contador, texto seguro, validación de URL de imagen, etiquetas de `category` | No llama a `fetch`; no decide qué especies son visibles ni su orden (RN-01) |
| `script.js` | Resto de la portada (navegación, mapa, boletos, contacto) | No conoce la lista de especies |
| `animals.css` | Caja de imagen, placeholder, estados, foco, 360 px, guarda contra zoom | No cambia `styles.css` |
| API (`api-015`) | Visibilidad (`is_published = 1`, `deleted_at` nulo), orden, campos publicados | No es parte de este plan |

## Cambios por área

| Área | Archivos previstos | Propósito |
|---|---|---|
| Portal (HTML) | `apps/web/src/index.html` | Quitar las cuatro `article.animal-card` de muestra, `p.demo-note` y los `p.model-note`; quitar el bloque de script de tarjetas con `data-model` (conservando `var viewerLoaded`, que usa el visor del mapa); estado inicial de `#animalStatus` y `#animalGrid[aria-busy="true"]`; filtros vacíos y ocultos; añadir el selector «Tipo de animal» (`#categoryFilter`); cargar `animals.css` y `js/animals.js` con `defer`; sustituir la introducción de `#animales` por el texto exacto de CA-23. No cambia el orden de secciones. |
| Portal (JS) | `apps/web/src/js/api.js` | Añadir `getSpecies()`. No cambia `request`. |
| Portal (JS) | `apps/web/src/js/animals.js` (nuevo) | Estados, tarjetas, filtros derivados, contador, reintento y helpers puros. |
| Portal (JS) | `apps/web/src/script.js` | Retirar el bloque de filtros de animales (ver «Retirada en `script.js`»). |
| Portal (CSS) | `apps/web/src/animals.css` (nuevo) | Caja `tp-media`, placeholder, estados `tp-status`, bloque `tp-details`, foco, 360 px y guarda contra zoom. |
| Pruebas | `apps/web/src/tests/animals.test.mjs` (nuevo) | Un test por CA-01 a CA-24, con `node:test`, `node:vm` y DOM simulado. |
| Pruebas existentes | `apps/web/src/tests/relocation.test.mjs`, `apps/web/src/tests/news-events.test.mjs` | Solo ejecución como regresión. Si alguna comprobación depende de las fichas de muestra, se informa antes de cambiarla. |
| Documentación | `apps/web/docs/tulanpedia-catalogo.md` (nuevo) | Referencia local (ver «Documentación local»). |
| Infraestructura | `infra/README.md` | Sección «Portal público (TulanPedia)» (ver «Nota de infraestructura»). |
| Assets | Ninguno se borra | `giraffe-*.webp`, `icon-3d-56.webp`, `nyilonelycompany-nature-51.glb` y las fotos de muestra dejan de estar referenciados en `#animales`. La limpieza es tarea futura (spec, «Cambios por área»). |

## Contrato y datos

### Endpoint consumido (solo `GET`)

| Uso | Ruta | Respuesta esperada | Uso en la UI |
|---|---|---|---|
| Lista de especies publicadas | `GET {base}/published-species` (sin parámetros) | `{"data": [ … ]}`; `data` es un array | `#animales` (CA-01) |

- `base` sale de `<meta name="arca-api-base" content="http://localhost:8000/api/v1">` en `index.html` (ya existe; CA-15). En desarrollo, el origen del portal `http://localhost:8080` debe estar en `CORS_ALLOWED_ORIGINS` (`api-015` CA-10).
- No se usan los filtros `habitat`, `name` ni `category` de `api-015`: el filtrado es en memoria (RN-07). `name` queda sin consumidor (`api-015` pregunta 7).
- No se usa `GET /api/v1/species` (`api-006`), que es para la app móvil.

### Forma de cada especie que consume la UI

Campos según `api-015` CA-03 y CA-13. Siempre: `id`, `common_name`, `category` (puede ser `null`), `image_url` (puede ser `null`). Según `published_fields`: `scientific_name`, `origin`, `habitat`. Los campos extra (`conservation_status`, `size_cm`, `gestation_period`, `diet`, `longevity`, `characteristics`) **no llegan** mientras esté vigente la decisión «no por ahora» (`api-015` CA-13; ADR 0028). El mapeo de esos campos se implementa igualmente porque CA-19 lo exige y se prueba con respuestas simuladas.

Claves que la UI ignora aunque lleguen (RN-08 y RN-10): `is_published`, `published_at`, `published_fields`, `image_path`, `created_by`, `reviewed_by`, `reviewed_at`, `rejection_reason`, `species_request_id` y cualquier otra no listada.

### Interfaz de `js/api.js` (añadido)

```
getSpecies: function () { return request('/published-species', null, 'list'); }
```

- Usa `request` sin cambios: `credentials: 'omit'`, `Accept: application/json`, `AbortController` de 10 s, validación de `data` como array y resultado `{ ok: true, data, meta }` o `{ ok: false, reason: 'network' | 'http' | 'timeout' | 'invalid' }`.
- `buildQuery(null)` devuelve cadena vacía, así que la URL es exactamente `{base}/published-species`.
- La UI no muestra `reason`; solo elige el texto de error de CA-07.

### Helpers puros de `js/animals.js`

Expuestos en `ArcaTulanpedia.helpers` para las pruebas:

| Helper | Regla |
|---|---|
| `safeImageUrl(value)` | Devuelve la URL si es `http:` o `https:` absoluta (se parsea con `new URL`), o una ruta que empieza por `/` y no por `//` ni `/\`. Cualquier otro valor (`null`, `javascript:`, `data:`, ruta sin `/`, no string) devuelve `null`. |
| `categoryLabel(key)` | Busca en la tabla de presentación con `Object.prototype.hasOwnProperty.call` (evita claves heredadas como `constructor`). Si la clave no existe, devuelve la clave tal como llega (RN-11). |
| `habitatKey(value)` | `value.trim().toLocaleLowerCase('es')`. No quita acentos (decisión 2026-11-11). Vacío o no string → `null`. |
| `fieldRows(species)` | Devuelve las filas `{ label, text }` en el orden de la ficha, solo para valores válidos (ver tabla abajo). |
| `countText(n)` | `1 especie encontrada` o `N especies encontradas`. |
| `sortByLabel(list)` | Orden alfabético con `localeCompare(b, 'es')`. |

#### Tabla fija de etiquetas de `category` (presentación, RN-11)

| Clave recibida (DBR-004) | Etiqueta en español |
|---|---|
| `mammal` | Mamífero |
| `bird` | Ave |
| `reptile` | Reptil |
| `amphibian` | Anfibio |
| `fish` | Pez |
| `invertebrate` | Invertebrado |

- Una clave fuera de esta tabla se muestra tal como llega (texto, no HTML) y aparece en el filtro con ese mismo texto. Un tipo nuevo exige actualizar la API y esta tabla (riesgo registrado).
- `category` `null`, vacío o no string: no genera opción de filtro, no genera fila y la especie aparece solo en «Todos los tipos».

#### Filas de la ficha (CA-19)

Orden de presentación (decisión del plan, pregunta 6): «Tipo de animal» primero, luego las demás en el orden de CA-19.

| Clave | Etiqueta | Valor válido |
|---|---|---|
| `category` | Tipo de animal | Clave con etiqueta de la tabla (o la clave tal cual) |
| `scientific_name` | Nombre científico | String con texto tras `trim()` |
| `origin` | Área de distribución natural | String con texto tras `trim()` |
| `habitat` | Hábitat | String con texto tras `trim()` |
| `conservation_status` | Estado de conservación | String con texto tras `trim()` |
| `size_cm` | Tamaño | Número finito, o string con texto; se muestra con el sufijo ` cm` (supuesto S-3) |
| `gestation_period` | Gestación | String con texto |
| `diet` | Alimentación | String con texto |
| `longevity` | Esperanza de vida | String con texto |
| `characteristics` | Características | String con texto |

Un valor `null`, vacío, booleano, objeto o array no genera fila. El nombre común (`h3`) y la foto no son filas: se muestran siempre (CA-19).

## Estados y flujo de la sección

### Marcado de estado (en `index.html`)

- `p#animalStatus.tp-status` con `role="status"`, `tabindex="-1"` (para recibir el foco), texto inicial «Cargando especies…». Dentro, en error, el botón `button#animalRetry` «Reintentar».
- `div#animalGrid.animal-grid` con `aria-busy="true"` y sin tarjetas en el HTML.
- `div#animalFilters.animal-filters` con `hidden`. Dentro: los tres `label` con `id` (`speciesFilterField`, `habitatFilterField`, `categoryFilterField`), los tres `select` (`speciesFilter`, `habitatFilter`, `categoryFilter`), `button#clearFilters` y `p#animalCount` (`aria-live="polite"`, `hidden`).
- `p#noAnimals.empty-state` con `hidden`. Texto: «No encontramos especies con esos filtros. Prueba con otra búsqueda.» (texto de la spec; pregunta 3).

### Transiciones de `load()`

Un `busy` evita dos peticiones a la vez; «Reintentar» no está disponible mientras hay una petición en curso.

| Resultado de `ArcaApi.getSpecies()` | Estado | Foco |
|---|---|---|
| Carga iniciada | `#animalStatus` muestra «Cargando especies…», `#animalGrid` queda con `aria-busy="true"` y vacío, filtros y contador ocultos, `#noAnimals` oculto | Ninguno en la primera carga; en un reintento, al `#animalStatus` |
| `ok: true`, `data` con especies válidas | `#animalStatus` oculto, `aria-busy="false"`, tarjetas en el orden recibido, filtros y contador visibles según CA-21 y CA-22 | En un reintento, a `#animalGrid` (`tabindex="-1"`) |
| `ok: true`, `data: []` o sin especies válidas (Q4) | `#animalStatus` muestra «Aún no hay especies publicadas.»; sin tarjetas, filtros ni contador; `#noAnimals` oculto | En un reintento, al `#animalStatus` |
| `ok: false` | `#animalStatus` muestra «No pudimos cargar las especies. Inténtalo más tarde.» y `#animalRetry`; grid vacío (sin datos anteriores); filtros ocultos | En un reintento que vuelve a fallar, a `#animalRetry` |

- «Reintentar» llama a `load()` otra vez con los mismos parámetros (ninguno), muestra el estado de carga y mueve el foco como se indica arriba.
- Cada carga reemplaza la lista completa. No hay caché: una especie republicada aparece en la carga siguiente (CA-20, CA-24).
- Una especie sin `common_name` string no vacío, o un elemento que no es objeto, se omite (Q4). Si no queda ninguna válida, se aplica el estado vacío.

### Filtros y contador

- Estado de filtros: `{ species: '', habitat: '', category: '' }`. Todo se aplica sobre la lista en memoria (RN-07). Ningún cambio de filtro hace petición.
- **«Especie» (`#speciesFilter`):** «Todas las especies» (`value=""`) y un `option` por cada `common_name` distinto, ordenado por `sortByLabel`. El `value` de la opción es el `common_name` exacto. Dos especies con el mismo nombre comparten opción. Visible si hay al menos una especie.
- **«Hábitat» (`#habitatFilter`, en `#habitatFilterField`):** «Todos los hábitats» (`value=""`) y una opción por cada `habitatKey` distinto. La etiqueta de la opción es la primera forma recibida, con `trim()`. Ordenado por etiqueta. Si ninguna especie trae `habitat` válido, `#habitatFilterField` se oculta (CA-21). Una especie sin hábitat aparece en «Todos» y en su opción de «Especie», pero no al filtrar por hábitat.
- **«Tipo de animal» (`#categoryFilter`, en `#categoryFilterField`; id propuesto, pregunta 7):** «Todos los tipos» (`value=""`) y una opción por cada clave válida distinta, con la etiqueta de `categoryLabel`, ordenado por etiqueta. Siempre visible. Si no hay ninguna `category` válida, solo queda «Todos los tipos» y el `select` se deshabilita (CA-22). Una especie sin `category` no aparece al filtrar por tipo.
- **Coincidencia:** la especie es visible si cumple a la vez los filtros activos: `common_name === species`, `habitatKey(habitat) === habitat`, `category === category`.
- **Contador (`#animalCount`):** `countText(visibles)`. Con cero visibles, `#noAnimals` se muestra.
- **«Limpiar filtros» (`#clearFilters`):** pone los tres `select` en `""`, reaplica el filtro sin petición y mantiene el foco en el botón.
- **Atributos:** las opciones se crean con `document.createElement('option')`, `option.value = …` y `option.textContent = …`. No quedan valores fijos en el HTML (CA-04).

### Tarjetas

Estructura generada con la DOM API:

```
article.animal-card [hidden según filtro]
  div.tp-media
    img[src][loading="lazy"][decoding="async"][alt=common_name]   (si safeImageUrl no es null)
    span.tp-placeholder[aria-hidden="true"] > i.bi.bi-image        (si no hay URL válida o la imagen falla)
  div.animal-card-body
    h3  common_name (textContent)
    div.tp-details                                                  (solo si hay al menos una fila)
      p.tp-details-title  «Conocer más sobre la especie»
      dl > (dt + dd) por cada fila de fieldRows
```

- El nombre común es `h3` (CA-14). El título de la sección sigue siendo `h2` existente.
- Si `fieldRows` está vacío, no se crea `div.tp-details` (CA-19).
- El bloque «Conocer más» es visible, no `details` (supuesto S-1; pregunta 2). No hay botón de expansión (la spec deja fuera «detalle expandible»).
- La imagen: `img.src` (propiedad), `alt` con `setAttribute('alt', common_name)`, y un listener `error` que reemplaza `img` por el placeholder en la misma caja. El `img` no se crea si `safeImageUrl` devuelve `null`.
- Todo texto de la API se escribe con `textContent`. No hay `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write` ni `eval`.

## Seguridad, offline y operación

- **Solo lectura pública (RN-03):** un `GET` a `published-species`, sin cookies, sin `Authorization`, `credentials: 'omit'`. No hay sesión ni datos del visitante.
- **Sin estado en el navegador:** no se usan `localStorage`, `sessionStorage`, `IndexedDB` ni `document.cookie`. La lista vive en memoria mientras la página está abierta (CA-17).
- **Texto seguro (RN-04, CA-11):** todos los datos de la API se escriben como texto. El `alt`, el `src` y los atributos `aria` van por `setAttribute` o propiedad, nunca por cadena HTML.
- **URLs de imagen (RN-04, CA-09):** solo `http`, `https` o rutas del mismo origen que empiezan por `/` (no `//`). El resto usa el placeholder. Un `image_url` con `//host/…` se rechaza.
- **Claves de tabla:** `hasOwnProperty` evita que una `category` como `constructor` o `__proto__` tome valores heredados.
- **Imágenes:** `loading="lazy"` y `decoding="async"`; las fotos son públicas (`media/species/`, ADR 0026). El plan no consume rutas de `media/species-requests/` (`api-015` CA-08).
- **Sin datos personales (RN-10):** no se muestra ni pide información de quien envió la solicitud o la revisó.
- **Rendimiento:** una petición por carga. No hay paginación (`api-015` pregunta 3). Coste de imágenes: revisión manual (T-15).
- **Operación:** la base de la API y el origen en CORS se configuran por ambiente (`web-009`, `infra/README.md`). Sin secretos.
- **Portabilidad:** HTML, CSS y JS estáticos. Sin build. Funciona igual en `php -S localhost:8080 -t apps/web/src` y en un servidor estático. La MySQL 8.0.x no interviene en este módulo.
- **Accesibilidad (CA-14):** `role="status"` en estados (`#animalStatus`), `aria-live="polite"` en `#animalCount`, `aria-busy` en `#animalGrid`, `h2` de sección y `h3` de especie, foco visible en `#animalRetry`, `#clearFilters` y selects (`:focus-visible` en `animals.css`), sin desbordamiento a 360 px.
- **Sin JavaScript:** la sección queda en «Cargando especies…». Limitación aceptada (ADR 0028).

## Retirada en `script.js`

Cambios concretos (líneas actuales de `script.js`):

- Retirar `const speciesFilter`, `const habitatFilter`, `const animalCount`, `const noAnimals`, `animalCards`, `filterAnimals()`, los listeners de `input` (con `debounce`), de `speciesFilter`/`habitatFilter` y de `clearFilters`, y la llamada inicial `filterAnimals()`.
- **Conservar** la línea `const searchInput = $('searchInput');`. `relocation.test.mjs` (línea 197) usa esa línea como ancla al extraer el controlador de navegación; también conservar `const menuToggle =` como inicio de ese bloque.
- Eliminar `normalize` y `debounce` solo si no quedan usos después del cambio. Comprobar con búsqueda antes de borrarlos.
- El listener de `#searchForm` depende de la decisión de la pregunta 1 (cabecera). Propuesta por defecto: no filtra; solo lleva a `#animales` con `scrollIntoView`. Requiere aprobación.
- No cambia el mapa, los boletos ni el formulario de contacto.

## Zoom de `animations.css` (CA-09)

`animations.css` (líneas 202-204) aplica `transform: scale(1.06)` a `.animal-card:hover > img`. La solución es estructural, sin tocar `animations.css`:

- La foto está dentro de `div.tp-media`, así que no es hija directa de `.animal-card` y el selector no coincide.
- `animals.css` añade una guarda explícita: `.animal-card:hover .tp-media img { transform: none; transition: none; }`, con mayor especificidad, para que la regla no dependa del orden de carga.
- Queda como alternativa descartada eliminar esas líneas de `animations.css`: es un archivo compartido y la guarda basta sin tocarlo.
- El levantamiento de la tarjeta (`translateY(-4px)` en `styles.css`) se mantiene: no es zoom de la imagen.

## Estilos (`animals.css`)

- `.tp-media`: `aspect-ratio: 4 / 3; background: var(--surface-subtle); display: grid; place-items: center; overflow: hidden; min-width: 0;`. Sin colores hexadecimales. Sin `cover` ni `fill`.
- `.tp-media img`: `display: block; width: auto; height: auto; max-width: 100%; max-height: 100%; object-fit: contain; object-position: center;` (CA-09, RN-09).
- `.tp-placeholder`: misma caja, `aria-hidden` en el marcado, icono `bi-image`.
- `.tp-status`, `.tp-details`, `.tp-details-title`: solo clases nuevas con prefijo `tp-`.
- `.animal-card`, `.animal-grid`, `.animal-filters`, `.results-count`, `.empty-state` se reutilizan de `styles.css` (RN-09 de web-009, criterio de diseño).
- 360 px: `.tp-media` no supera el ancho de la tarjeta; `.animal-card { min-width: 0 }` ya existe en `styles.css`; el botón y los selects ocupan el ancho disponible (`width: 100%`, `min-width: 0`).
- Foco: `:focus-visible` con `outline: 3px solid var(--primary)` en `#animalRetry`, `#clearFilters` y los `select`. `#animalStatus` y `#animalGrid` tienen `tabindex="-1"` solo para recibir el foco programado; no muestran anillo de foco al recibirlo por script (`:focus:not(:focus-visible)`).
- Prohibido: `url(...)` remoto, `@import`, fuentes externas, hex en las reglas nuevas.

## Introducción de la sección (CA-23)

Texto exacto en el bloque `.section-heading > p` de `#animales`: «Filtra las especies por tipo de animal, especie o hábitat. En cada ficha verás la información que el zoológico ha publicado para la especie.». El titular «Encuentros inolvidables» y el `h2` «TulanPedia» no cambian.

## Documentación local (`apps/web/docs/tulanpedia-catalogo.md`, nuevo)

Contenido mínimo, en español:

1. Qué muestra la sección y de dónde sale (`GET /api/v1/published-species`, `api-015`).
2. Configuración: `<meta name="arca-api-base">` en `index.html` (`http://localhost:8000/api/v1` en desarrollo); origen `http://localhost:8080` en `CORS_ALLOWED_ORIGINS`; `127.0.0.1:8080` es otro origen.
3. Filtros y sus reglas (opciones derivadas de la respuesta, ocultación de «Hábitat», «Tipo de animal» siempre visible).
4. Tabla de etiquetas de `category` y tratamiento de claves desconocidas.
5. Estados de carga, vacío, error y reintento.
6. Seguridad: texto seguro, URLs de imagen, sin almacenamiento, `credentials: 'omit'`.
7. Excepción de arquitectura: ADR 0028 (y ADR 0024 para el patrón común), condiciones y reevaluación.
8. Cómo probar: `node --test apps/web/src/tests/animals.test.mjs` y la verificación manual de `curl`.
9. Limitaciones: sin JavaScript no hay catálogo; la sección queda vacía hasta la primera publicación; los campos extra no llegan mientras esté vigente «no por ahora».

Corrección de «Busca por nombre» en `index.html` (línea 260) es el texto de CA-23. Se hace en la tarea de documentación.

## Nota de infraestructura

`infra/README.md`, sección «Portal público (TulanPedia)», en el mismo PR (`AGENTS.md`):

- `CORS_ALLOWED_ORIGINS` incluye `http://localhost:8080` en desarrollo (mismo requisito de `web-009`).
- La meta `arca-api-base` de `index.html`, `noticias.html` y `eventos.html` tiene el mismo valor.
- Evidencia: `curl -i -H "Origin: http://localhost:8080" http://localhost:8000/api/v1/published-species` responde `200` con `Access-Control-Allow-Origin: http://localhost:8080`.
- Sin valores reales ni secretos.

## Mapeo de criterios a pruebas

Todas las pruebas automatizadas están en `apps/web/src/tests/animals.test.mjs`, con nombres `CA-NN dynamic-tulanpedia: …`. Se ejecutan con `node --test apps/web/src/tests/animals.test.mjs`. No llaman a la API real: `fetch` se simula en el contexto `node:vm`.

| Criterio | Prueba automatizada | App/ubicación | Manual o evidencia adicional |
|---|---|---|---|
| CA-01 | Respuesta simulada con tres especies: tres `article.animal-card` en el orden recibido; `#animales` no tiene tarjetas fijas; cada tarjeta tiene nombre y foto | `web` / `animals.test.mjs` | Contrato real con `api-015` (T-15) |
| CA-02 | Respuesta de dos especies: se dibujan dos y no se añade ni se completa ninguna; una respuesta sin una especie no genera tarjeta | `web` / `animals.test.mjs` | — |
| CA-03 | Filtros combinados sobre la lista en memoria; `#animalCount` singular y plural; «Limpiar filtros» restablece los tres; cero peticiones adicionales | `web` / `animals.test.mjs` | — |
| CA-04 | Opciones de «Especie» ordenadas con «Todas» primero; hábitats deduplicados sin distinguir mayúsculas y con la primera forma; `null` y vacíos descartados; sin valores fijos «Sabana», «Bosque», «Aviario», «Reptilario» en el HTML | `web` / `animals.test.mjs` | — |
| CA-05 | Antes de resolver la petición: `#animalStatus` con «Cargando especies…», `role="status"`, `#animalGrid` con `aria-busy="true"` | `web` / `animals.test.mjs` | — |
| CA-06 | `data: []`: texto de vacío; sin tarjetas, filtros, contador ni `#noAnimals` | `web` / `animals.test.mjs` | — |
| CA-07 | Red caída, `500`, JSON inválido y `data` ausente: texto de error con `role="status"` y `#animalRetry`; sin datos previos; «Reintentar» pide de nuevo, muestra carga y mueve el foco | `web` / `animals.test.mjs` | API apagada en navegador (T-15) |
| CA-08 | Lectura estática de `index.html`: no hay cuatro `article.animal-card` de muestra, `demo-note`, `model-note`, `data-model` ni `.glb` dentro de `#animales` | `web` / `animals.test.mjs` | — |
| CA-09 | `https` → `img` con `loading`, `decoding`, `alt`; `null`, `javascript:`, `data:`, `//host` y error de carga → placeholder con `aria-hidden`; CSS sin `cover`, `fill`, zoom ni hex | `web` / `animals.test.mjs` | Imágenes reales (T-15) |
| CA-10 | `getSpecies()` pide `{base}/published-species` con `credentials: 'omit'`, `Accept`, 10 s y base de la meta; `js/animals.js` no contiene `fetch(` | `web` / `animals.test.mjs` | — |
| CA-11 | `<img src=x onerror=…>` en nombre, hábitat, origen y URL se muestra como texto; búsqueda estática de `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval` y `new Function` en `js/animals.js` y `js/api.js` sin resultados | `web` / `animals.test.mjs` | — |
| CA-12 | `index.html` conserva los IDs y las referencias a scripts; `script.js` no referencia `.animal-card`, `speciesFilter`, `habitatFilter`, `clearFilters`, `animalCount` ni `noAnimals`; el bloque de `data-model` no está y `viewerLoaded` sí | `web` / `animals.test.mjs` | Regresión: `relocation.test.mjs` (T-16) |
| CA-13 | Orden de `section[id]` igual a la línea base de T-01; `#animales` antes de `#mapa` | `web` / `animals.test.mjs` | — |
| CA-14 | Reglas CSS de `.tp-media img` y de `.animal-card` (`min-width: 0`); `:focus-visible` en `#animalRetry` y `#clearFilters`; `h2` de sección y `h3` de especie; `role="status"` | `web` / `animals.test.mjs` | Anchos 360, 390, 768, 1024 y 1366 px (T-15) |
| CA-15 | Las tres páginas (`index.html`, `noticias.html`, `eventos.html`) tienen exactamente una meta `arca-api-base` con el mismo `content` terminado en `/api/v1` | `web` / `animals.test.mjs` | — |
| CA-16 | Cada `CA-01` a `CA-24` aparece como nombre de test en el archivo | `web` / `animals.test.mjs` | — |
| CA-17 | No existe `apps/web/package.json`; `animals.js` y `api.js` no usan `localStorage`, `sessionStorage`, `document.cookie`, `credentials` distinto de `omit`; no hay URL remota nueva en `#animales` ni en `animals.css` | `web` / `animals.test.mjs` | — |
| CA-18 | `#animales` no tiene carrusel, visor, `data-model`, `.glb` ni «Jirafa» | `web` / `animals.test.mjs` | — |
| CA-19 | Combinaciones: nombre y foto siempre; solo filas con valor válido; `category` `null` omitida; sin `div.tp-details` si no hay filas; claves no listadas (`created_by`, `reviewed_by`) no se muestran | `web` / `animals.test.mjs` | — |
| CA-20 | `data: []` no cambia el HTML; una segunda carga con una especie la muestra sin cambiar el HTML | `web` / `animals.test.mjs` | — |
| CA-21 | Sin `habitat` válido: `#habitatFilterField` oculto; con al menos una especie: «Especie» visible | `web` / `animals.test.mjs` | — |
| CA-22 | Tres casos: varias categorías (todas con «Todos los tipos»); una sola (visible y seleccionable); ninguna (solo «Todos los tipos», deshabilitado) | `web` / `animals.test.mjs` | — |
| CA-23 | Texto exacto de la introducción dentro de `#animales`; sin «Busca por nombre» ni frase de búsqueda por nombre | `web` / `animals.test.mjs` | — |
| CA-24 | Respuesta sin una especie despublicada: no genera tarjeta; en la carga siguiente con la especie republicada, aparece sin cambiar el HTML | `web` / `animals.test.mjs` | Evidencia manual con una especie despublicada en `arca_pruebas` (T-15) |

Regla de estado: un CA sin prueba automatizada o sin evidencia manual no puede marcarse como cumplido.

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Parcial | HTML, CSS y JavaScript estáticos, sin dependencias ni servicios propietarios, sin build ni `package.json`. La stack declarada para el portal es React 19 + TS + Vite (`apps/web/AGENTS.md`). **Excepción:** ADR 0028, decisión 1 a 3 (sección TulanPedia de la portada), que extiende ADR 0024. |
| II. La spec manda | Parcial | Spec `web-011` Aprobada el 2026-11-12, con esta propuesta de plan y sus tasks en Borrador. No hay código hasta aprobar plan y tasks y cumplir las dependencias (`api-015` implementada; DBR-013 ya cumple «Lista para backend»). |
| III. Lógica separada de la interfaz | Parcial | Sin reglas de negocio en el portal: la visibilidad, el orden y los campos los decide la API (RN-01). Los filtros son presentación sobre la lista recibida (RN-07) y la tabla de etiquetas es presentación (RN-11). `fetch` solo en `js/api.js`. **Excepción:** no hay `@arca/api-client` ni hooks (ADR 0028, decisión 1). |
| IV. Un test por criterio | Sí, con runner distinto | Un test por CA-01 a CA-24 con `node --test` y nombres `CA-NN dynamic-tulanpedia`. Vitest no se usa (ADR 0028, decisión 3). CA-16 comprueba la cobertura. Este plan no afirma que ninguna prueba pase: el resultado se registra en T-16 con evidencia de ejecución. |
| V. Una sola fuente de verdad para los datos | Sí | El portal no guarda ni cachea datos de negocio. La API es la fuente. Sin escritura. Datos públicos, sin datos clínicos ni financieros. |
| VI. Código en inglés, personas en español | Sí | Identificadores en inglés (`animals.js`, `getSpecies`, `published-species`, `categoryFilter`, `tp-media`), claves de `category` en inglés (valores de DBR-004). Textos visibles, de estado y de error en español. |

Excepciones registradas: ADR 0028 (aceptado el 2026-11-12). Si el ADR no se aprueba o se revoca, este plan no se implementa.

## Riesgos y decisiones

- **ADR requerido/aprobado:** ADR 0028 Aceptado (2026-11-12). No se requiere ADR de dependencia: no hay paquetes nuevos.
- **Bloqueo de contrato:** sin `api-015` implementada no hay datos reales. Mitigación: desarrollo con respuestas simuladas; la verificación real queda en T-15 y no se declara antes.
- **Bloqueo de BD (resuelto el 2026-11-12):** DBR-013 está aplicada en `arca_pruebas` con evidencia de solo lectura (`api-015` RN-02). La verificación real sigue bloqueada por `api-015` implementada.
- **Portal vacío hasta la primera publicación:** aceptado (spec, decisión de 2026-11-11). Se muestra «Aún no hay especies publicadas.».
- **Pérdida del contenido de las fichas de muestra:** dieta, longevidad, características y curiosidades no tienen fuente en la solicitud; se retiran (spec, riesgos).
- **Campos extra no llegan:** con «no por ahora», la ficha muestra nombre, foto, nombre científico, área de distribución natural, hábitat y tipo de animal cuando la Dirección los publica. El mapeo de los demás campos se prueba con respuestas simuladas.
- **Tabla de `category`:** un tipo nuevo en DBR-004 exige actualizar la API y la tabla. Sin tabla, la clave se muestra tal cual.
- **Variantes de hábitat:** «Bosque» y «bosque» son una sola opción, pero «Bosque» y «Bósque» son dos (no se quitan acentos, decisión 2026-11-11). Es calidad de datos.
- **Nombres repetidos:** dos especies con el mismo `common_name` comparten la opción «Especie» y se filtran juntas. Riesgo bajo; el zoológico debe distinguir los nombres.
- **Bionic Reading (`008`) con contenido dinámico:** el contenido llega después de cargar la página y puede quedar sin formato de `accessibility.js`. Verificación manual (T-15). Cambiar `accessibility.js` requiere aprobación separada.
- **Imágenes grandes:** `lazy` y caja fija; coste en la verificación manual.
- **Regresión de pruebas existentes:** según `apps/web/tasks/009-dynamic-news-events.md`, `relocation.test.mjs` tiene 6 fallos preexistentes en otros módulos. Antes de implementar, T-01 registra la línea base; los fallos no se atribuyen a este cambio.
- **Divergencias detectadas en la spec (ver «Divergencias»):** se resuelven en el plan sin modificar la spec.
- **Alternativas consideradas:**
  - Migrar la sección a React + Vite + `@arca/api-client` con hooks y Vitest: descartada por ADR 0028 (obliga a `package.json` y build para una lista de lectura). Se reevalúa con la spec de pagos o si el catálogo crece.
  - Generar las fichas en build con datos de la API: descartada (el zoológico debe ver una publicación sin redespliegue).
  - Mantener las fichas de muestra y añadir la lista debajo: descartada (contradice RN-02).
  - Reutilizar `GET /api/v1/species` (`api-006`): descartada (contrato de la app móvil; no distingue publicadas).
  - Expansión por `details` para «Conocer más»: descartada por ahora (supuesto S-1); el bloque es visible.
  - Quitar la regla de zoom de `animations.css`: descartada (archivo compartido; la guarda y la estructura bastan).

## Divergencias detectadas (spec frente a repositorio y entre secciones de la spec)

- **D-1:** la spec dice «CA-01 a CA-18» en «Cambios por área» (`animals.test.mjs`) y «CA-01 a CA-24» en CA-16. El plan sigue CA-16 (CA-01 a CA-24). No se modifica la spec; se pide confirmación (pregunta 8).
- **D-2:** el texto actual de `#noAnimals` en `index.html` dice «No encontramos animales con esos filtros…»; la spec dice «especies». El plan usa el texto de la spec (pregunta 3).
- **D-3:** el contador actual dice «animal encontrado» (`script.js`); la spec exige «especie encontrada». El plan usa la spec.
- **D-4:** la cabecera tiene un formulario de búsqueda (`#searchForm`, `#searchInput`, placeholder «Buscar un animal...») que hoy filtra las tarjetas. La spec no lo menciona. Ver pregunta 1.
- **D-5:** la spec no fija el `id` del nuevo selector «Tipo de animal». El plan propone `categoryFilter` (pregunta 7).
- **D-6:** la spec pide `#animalCount` (`aria-live`). El plan mantiene el `id` existente.

## Preguntas abiertas (máximo 8 por ronda)

1. **Cabecera.** El formulario de búsqueda de la cabecera (`#searchForm`, `#searchInput`, «Buscar un animal...») filtraba las tarjetas. Sin tarjetas, ¿qué debe hacer? Propuesta del plan: conservar los IDs (los exige `web-009` CA-11 y `relocation.test.mjs`), que al enviar solo lleve a `#animales` sin filtrar. Alternativas: ocultarlo, o dejarlo sin cambio (sin efecto). Responde Jonathan.
2. **Bloque «Conocer más».** ¿Se muestra visible (propuesta) o como `details` colapsable? La spec deja fuera el detalle expandible.
3. **Texto sin resultados.** ¿Se mantiene «No encontramos especies con esos filtros. Prueba con otra búsqueda.» (spec)? «Otra búsqueda» no tiene campo de búsqueda en esta sección. Propuesta: mantener el texto de la spec hasta aprobar un cambio.
4. **Especie inválida.** Si llega una especie sin `common_name` o un elemento que no es objeto, ¿se omite (propuesta) o se trata como error de carga?
5. **Unidad de `size_cm`.** ¿Se muestra con ` cm` (propuesta, supuesto S-3) o tal como llega?
6. **Orden de la ficha.** ¿«Tipo de animal» primero (propuesta) o al final, como en la lista de CA-19?
7. **Id del selector «Tipo de animal».** ¿`categoryFilter` (propuesta) o otro nombre?
8. **Alcance de CA-16.** ¿Confirmas que el test de cobertura cubre CA-01 a CA-24 (texto de CA-16), y no CA-01 a CA-18 («Cambios por área»)?

## Supuestos del plan

- **S-1:** el bloque «Conocer más» es visible, sin `details` (pregunta 2).
- **S-2:** la proporción de la caja de imagen es 4:3 (`aspect-ratio`). No está en la spec; afecta solo al aspecto.
- **S-3:** `size_cm` se muestra con ` cm` (pregunta 5).
- **S-4:** `image_url` relativa solo se acepta si empieza por `/` y no por `//` (RN-04 de la spec, «rutas relativas del mismo origen»). La API entrega URL absoluta.
- **S-5:** el foco en un reintento exitoso va a `#animalGrid` (`tabindex="-1"`) y en uno fallido va a `#animalRetry`, igual que `web-009` CA-05.
- **S-6:** en la primera carga el foco no se mueve (CA-07 de la spec se refiere al reintento).

## Orden y aprobación

Secuencia de implementación (detalle en `apps/web/tasks/011-dynamic-tulanpedia.md`):

1. T-01 precondiciones y línea base (`api-015` implementada con evidencia; DBR-013 «Lista para backend», cumplido el 2026-11-12; regresión registrada).
2. T-02 `getSpecies()` en `js/api.js`.
3. T-03 helpers puros de `js/animals.js`.
4. T-04 marcado de `index.html` (sin tarjetas de muestra, IDs, estado inicial).
5. T-05 estados de carga, vacío, error y reintento.
6. T-06 tarjetas, imagen y campos.
7. T-07 filtros derivados, contador y limpiar.
8. T-08 visibilidad y republicación.
9. T-09 retirada de filtros en `script.js`.
10. T-10 `animals.css`.
11. T-11 pruebas estáticas de seguridad y configuración.
12. T-12 suite completa y cobertura de CA-16.
13. T-13 introducción (CA-23) y documentación local.
14. T-14 `infra/README.md`.
15. T-15 verificación manual con API real cuando exista.
16. T-16 calidad y entrega.

Aprobaciones requeridas:

| Rol | Aprueba | Estado |
|---|---|---|
| Responsable funcional | Spec `web-011` | Aprobada (Jonathan, 2026-11-12) |
| Equipo técnico | Este plan, Constitution Check, excepción ADR 0028 y respuestas a las preguntas 1 a 8 | **Pendiente** |
| Responsable de BD | DBR-013 en «Lista para backend» (migración aplicada en `arca_pruebas` con evidencia) | **Cumplido** el 2026-11-12 (migración aplicada, lote 5). Pendiente de BD: EXPLAIN y registro de fecha y responsable |
| Backend | `api-015` implementada con evidencia (`curl` y pruebas PHPUnit) | **Pendiente** |
| Equipo (ADR) | ADR 0028 | Aceptado (2026-11-12) |

Evidencias requeridas para marcar la spec como Implementada: las de T-16 y los resultados de T-15. Este plan no cambia el estado de la spec ni de las tasks.
