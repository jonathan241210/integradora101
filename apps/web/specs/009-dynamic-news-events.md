# 009 · dynamic-news-events

- App dueña: `web`
- Apps/paquetes afectados: `apps/web` (dueña: portada, página de noticias, página de eventos, contenido completo de cada noticia en su tarjeta e imágenes); `api` (proveedor, `api-011` para `GET /api/v1/news`, `GET /api/v1/news/{news}` y `GET /api/v1/events?limit=`, y `api-006` para `GET /api/v1/events`); `packages/api-client` (no se usa: ver excepción de arquitectura); `docs/adr/0024-web-static-portal-exception.md` (ADR de excepción, Aceptado el 2026-11-07).
- Estado: Aprobada (Jonathan, 2026-11-07; cambios del 2026-11-08 aprobados por Jonathan, 2026-11-08; ver «Revisión»). No está Implementada: la implementación y las pruebas siguen abiertas en las tasks.
- Solicitante / responsable funcional: Jonathan
- Aprobación funcional: aprobada por Jonathan, 2026-11-07. Cambios del 2026-11-08 solicitados y aprobados por Jonathan, 2026-11-08 («déjalas a la vez, aprobado todo»).
- Dependencias: `api-011` (Aprobada el 2026-11-07; debe estar Implementada y disponible en el ambiente de pruebas con CORS configurado antes de implementar el portal) y `api-006` (eventos). ADR 0024 **Aceptado** el 2026-11-07: requisito cumplido (ver «Dependencias, riesgos y preguntas»).
- Decisiones del usuario (2026-11-07) incorporadas:
  1. Puerto de desarrollo del portal: `http://localhost:8080`, que se añade a `CORS_ALLOWED_ORIGINS`. La base de la API se define con `<meta name="arca-api-base">` en cada página.
  2. Contenido completo de una noticia: el listado no incluye `content`. Modificada el 2026-11-08 (decisión 7): el portal pide el detalle automáticamente una vez por tarjeta y lo muestra en ella (CA-14); ya no hay botón de expansión.
  3. Imágenes: completas y centradas, sin recorte ni sensación de zoom, en la portada y en las páginas (CA-15). El mismo criterio se aplica en el dashboard (`dashboard-007`).
  4. Excepción de arquitectura documentada en `docs/adr/0024-web-static-portal-exception.md` (Aceptado el 2026-11-07).
  5. **Error con reintento (2026-11-07, ampliada el mismo día):** si la API falla, la portada, `noticias.html` y `eventos.html` muestran el mensaje de error con botón «Reintentar» que vuelve a pedir la sección (CA-05); no se muestra contenido de muestra.
  6. **Textos y alcance (2026-11-07, modificada el 2026-11-08):** 3 noticias y 2 eventos en la portada; textos de vacío «Aún no hay noticias publicadas» y «Aún no hay eventos vigentes»; el contenido completo de cada noticia se muestra en su tarjeta (CA-14), también en las noticias de la portada; las tarjetas de eventos no tienen contenido completo; zona horaria de la vigencia decidida por `api-011` (`America/Mexico_City`); producción del portal pendiente, no bloquea.
  7. **Cambios de alcance (2026-11-08, solicitados y aprobados por Jonathan):** (a) la portada muestra 2 eventos en lugar de 3 (`GET /api/v1/events?limit=2`, `data-ne-limit="2"` en `#eventGrid`); las noticias siguen en 3 (CA-01) y las páginas de listado no cambian; (b) se elimina el botón «Ver todo el contenido» y el patrón de expandir y contraer. Cada tarjeta de noticia, en la portada y en `noticias.html`, muestra siempre un bloque con la etiqueta «Contenido:» y el contenido completo, pedido automáticamente una vez por tarjeta y lanzado a la vez que las demás peticiones de detalle (CA-14; pregunta 9). Aprobado por Jonathan el 2026-11-08.

## Problema y contexto

La portada pública (`apps/web/src/index.html`, secciones `#noticias` y `#eventos`) muestra tarjetas de muestra con textos fijos («Pequeñas acciones, grandes cambios», «Actividades de ejemplo»). El propio portal avisa que el contenido es de muestra. Los visitantes ven noticias y eventos que no existen, y el zoológico no puede publicar avisos sin cambiar el código.

La API ya puede exponer noticias publicadas (`api-011`) y eventos vigentes (`api-006`). Esta spec conecta la portada con esos datos, crea dos páginas de listado («Ver todas») y muestra el contenido completo de cada noticia dentro de su tarjeta, sin que el visitante tenga que pulsar nada.

Decisión de arquitectura de esta spec: el portal se mantiene como HTML y JavaScript estático, sin build y sin `@arca/api-client`. La justificación es que el contenido es público, de solo lectura y cacheable, y no requiere estado de sesión ni formularios. Esta decisión se aparta de `apps/web/AGENTS.md` y de la Constitución III y IV; por eso requiere el ADR 0024 aprobado (ver «Dependencias, riesgos y preguntas»). El pago con tarjeta futuro tendrá su propia spec y su propio ADR, y allí se reevaluará migrar a SPA.

Afectados: visitantes del portal (lectura), equipo de desarrollo del portal (mantenimiento), y el zoológico (publica desde el dashboard y ve reflejado el contenido en la portada).

## Objetivos

- Sustituir las tarjetas de muestra de `#noticias` y `#eventos` por contenido de la API: las tres noticias más recientes y hasta dos eventos vigentes (el orden y la vigencia los decide la API).
- Ofrecer las páginas `noticias.html` y `eventos.html` con enlaces «Ver todas».
- Mostrar el contenido completo de cada noticia dentro de su tarjeta, sin cambiar de página y sin acción del visitante.
- Mostrar las imágenes completas, centradas y sin recorte, en tarjetas y en estados de carga o de respaldo.
- Mostrar estados de carga, vacío y error en español, sin datos inventados.
- Renderizar todo el contenido de la API como texto, sin insertar HTML.
- Usar un único módulo de red (`js/api.js`) con base URL configurable por página, sin cookies ni cabeceras de autenticación.
- Cubrir cada CA-xx con al menos un test `node --test`, sin dependencias nuevas.

## Fuera de alcance

- Migrar el portal a React, Vite, Tailwind o TypeScript (se decide en la spec de pagos o en una spec propia, ver ADR 0024).
- Usar `@arca/api-client` o crear `package.json`, scripts de build o manifiestos.
- Página de detalle de noticia con URL propia: el contenido completo se muestra en la tarjeta (CA-14). No hay rutas nuevas por noticia.
- Botón «Ver todo el contenido», expansión o contracción de las tarjetas de noticia (decisión de 2026-11-08).
- Contenido completo en las tarjetas de eventos: esta spec no lo añade (decisión de 2026-11-07: el bloque de contenido es solo para noticias).
- Búsqueda, filtros por categoría o fecha, ordenamiento configurable.
- Caché persistente en el navegador, `localStorage` o `IndexedDB` para contenido de la API.
- Servir imágenes desde el portal: se usan las URLs `image_url` de la API.
- Recorte, zoom, galería o visor de imágenes a pantalla completa en el portal.
- Cambios de diseño de otras secciones, mapa, navegación, accesibilidad (`008`) o animaciones, salvo lo necesario para cargar los archivos nuevos.
- Notificaciones, suscripción o formularios de contacto.
- Cualquier escritura en la API; el portal no publica contenido (`apps/web/AGENTS.md`).
- Cambios en la vigencia o la zona horaria: los decide la API (`api-011` RN-14).
- Cambios en la API: esta spec solo consume `limit=2` y `GET /news/{id}` con los contratos ya existentes.
- Cambios de `apps/web/src/index.php` y del resto de `src/` que no sean los listados en «Cambios por área».
- Corregir `apps/web/README.md`: se hace como tarea (T-22), no en esta spec.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Visitante | Ver avisos y eventos vigentes en la portada y en sus páginas, y leer una noticia completa | Ninguno; contenido público |
| Visitante con lector de pantalla | Recibir los estados de carga, vacío y error, y el estado del contenido de cada noticia | Ninguno |
| Equipo de desarrollo del portal | Configurar la URL de la API por página y mantener el módulo | Acceso al repositorio |
| Zoológico (publicación) | Publicar y retirar noticias y eventos | Ya existe en el dashboard (`news.manage`, `events.manage`); no cambia en esta spec |

## Historias de usuario

- Como visitante, quiero ver las noticias más recientes en la portada para enterarme de los avisos del zoológico.
- Como visitante, quiero ver los eventos vigentes en la portada para planear mi visita.
- Como visitante, quiero ver todas las noticias y eventos en sus páginas, para no perderme nada publicado.
- Como visitante, quiero leer el contenido completo de una noticia sin salir de la página, para entender el aviso.
- Como visitante, quiero ver las imágenes completas y centradas, para reconocer el cartel tal como se publicó.
- Como visitante con lector de pantalla, quiero que el portal me avise si el contenido se está cargando, si no hay nada o si hubo un error.

## Criterios de aceptación

- **CA-01 (noticias en portada):** Dada la portada cargada con la API disponible, cuando termina la carga de `#noticias`, entonces muestra como máximo tres noticias en el orden que devuelve `GET /api/v1/news?limit=3` (título, categoría, fecha de publicación en español, descripción si existe y el bloque de contenido de CA-14) y no queda ninguna tarjeta de muestra ni la nota «Las noticias son contenido de muestra».
- **CA-02 (eventos en portada):** Dada la portada cargada con la API disponible, cuando termina la carga de `#eventos`, entonces muestra como máximo dos eventos de `GET /api/v1/events?limit=2` (nombre, fechas en español, horario `start_time`–`end_time` si existen, ubicación y descripción). El límite de dos se indica en el HTML con `data-ne-limit="2"` en `#eventGrid`. No queda el texto «Actividades de ejemplo» ni las tarjetas de muestra.
- **CA-03 (carga):** Dada una petición en curso, cuando la sección está cargando, entonces muestra el texto «Cargando noticias…» o «Cargando eventos…» en un elemento con `role="status"`, y el contenedor tiene `aria-busy="true"` hasta que termina.
- **CA-04 (vacío):** Dada una respuesta `200` con `data: []`, cuando se renderiza la sección, entonces muestra «Aún no hay noticias publicadas» en noticias y «Aún no hay eventos vigentes» en eventos (texto confirmado el 2026-11-07, pregunta 5), sin tarjetas.
- **CA-05 (error):** Dada una petición fallida (red, respuesta distinta de `2xx`, JSON no válido o `data` ausente), cuando se renderiza la sección, entonces muestra «No pudimos cargar las noticias. Inténtalo más tarde.» (o el equivalente de eventos) en un elemento con `role="status"`, no muestra datos anteriores y no deja ningún error sin capturar ni expone detalles técnicos. En la portada, en `noticias.html` y en `eventos.html`, el estado de error incluye un botón «Reintentar» que vuelve a pedir la sección con los mismos parámetros: muestra el estado de carga (CA-03), no duplica tarjetas, mueve el foco al estado de carga y después al contenido o al nuevo botón si vuelve a fallar; si la nueva petición responde bien, sustituye el error por el contenido (decisión de 2026-11-07, ampliada a las tres páginas). Si falla «Cargar más» en `noticias.html`, se conserva lo mostrado y el propio botón «Cargar más» permite reintentar la página siguiente.
- **CA-06 (escapado seguro):** Dado un título, descripción, categoría, nombre de evento, ubicación o contenido que contiene HTML (p. ej. `<img src=x onerror=alert(1)>`), cuando se renderiza, entonces se muestra como texto literal. Ningún módulo del portal usa `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write` ni `eval` con datos de la API.
- **CA-07 (imágenes: datos y respaldo):** Dada una noticia o evento con `image_url`, cuando se renderiza, entonces la imagen usa `loading="lazy"`, `decoding="async"` y `alt` igual al título o nombre. Si `image_url` es `null`, no usa un esquema distinto de `http:` o `https:` (p. ej. `javascript:`, `data:`), o la imagen falla al cargar, entonces se muestra un placeholder decorativo (`aria-hidden="true"`) sin hueco vacío. La forma en que se ve la imagen (completa y centrada) se verifica en CA-15.
- **CA-08 (fechas en español):** Dada una fecha `YYYY-MM-DD`, cuando se formatea, entonces se muestra en español sin desplazamiento de zona horaria (p. ej. `7 de noviembre de 2026`); un rango de evento se muestra como «del 22 al 29 de octubre de 2026» o «22 de octubre de 2026» si la fecha de fin es nula o igual a la de inicio. Una fecha inválida no muestra `Invalid Date` ni texto de error: se omite.
- **CA-09 (módulo de red):** Dado el código del portal, cuando se revisa, entonces `js/api.js` es el único archivo que llama a `fetch`; usa `credentials: 'omit'`, `Accept: application/json` y no envía cabeceras `Authorization` ni de CSRF; la base URL se lee de `<meta name="arca-api-base">` y, si está vacía o ausente, usa la ruta relativa `/api/v1`; cada petición tiene un tiempo máximo de espera de 10 segundos; y `getNewsItem(id)` no hace ninguna petición si el identificador no es un entero positivo.
- **CA-10 (páginas de listado):** Dada la portada, cuando se activa «Ver todas» de noticias o de eventos, entonces abre `noticias.html` o `eventos.html`. `noticias.html` pide `GET /api/v1/news?page=N&limit=10` y muestra «Cargar más» solo si `meta.has_more` es `true`; sus tarjetas muestran el bloque de contenido de CA-14. `eventos.html` pide `GET /api/v1/events` sin `limit` y muestra la lista completa de eventos vigentes.
- **CA-11 (no regresión):** Dado `index.html` después del cambio, cuando se carga, entonces conserva los identificadores y las secciones existentes (navegación, mapa, búsqueda, formularios y animaciones), mantiene las referencias a `script.js`, `animations.js` y `accessibility.js`, y las pruebas estructurales de `relocation.test.mjs` siguen en verde o sus fallos preexistentes quedan registrados sin atribuir al cambio.
- **CA-12 (accesibilidad y adaptación):** Dada la portada y las dos páginas, cuando se usan a 360, 390, 768, 1024 y 1366 px, entonces no hay desbordamiento horizontal, las imágenes no superan el ancho del contenedor, los enlaces y los botones (incluido «Reintentar») tienen foco visible, los encabezados mantienen el orden `h2` de sección y `h3` de tarjeta, y el texto de estado se anuncia con `role="status"`. Verificación automática de reglas CSS y verificación manual en navegador.
- **CA-13 (cobertura de pruebas):** Dada la suite `node --test apps/web/src/tests/news-events.test.mjs`, cuando se ejecuta, entonces contiene tests nombrados `CA-01` a `CA-12` y `CA-14` a `CA-16` (los verificables en Node) sin dependencias nuevas, y `CA-13` verifica que todos esos criterios tienen su test.
- **CA-14 (contenido completo en la tarjeta):** Dada una tarjeta de noticia en la portada o en `noticias.html`, cuando la tarjeta se muestra, entonces:
  - (a) pide una sola vez `GET {base}/news/{id}`, sin que el visitante haga nada; no vuelve a pedir ese detalle mientras la página esté abierta, salvo el reintento de (d);
  - (b) mientras espera, muestra el bloque de la tarjeta con la etiqueta «Contenido:» (texto, no encabezado) y el texto «Cargando contenido…» en un elemento con `role="status"`;
  - (c) al llegar, muestra el `content` completo dentro de la misma tarjeta, sin cambiar de página, como texto (CA-06) y conservando los saltos de línea;
  - (d) si la petición falla, responde `404` o devuelve JSON no válido, muestra en la tarjeta «No pudimos cargar el contenido de esta noticia. Inténtalo más tarde.» en un elemento con `role="status"` y un botón «Reintentar» que vuelve a pedir solo ese detalle, mostrando otra vez «Cargando contenido…» mientras espera; el resto de la tarjeta y de la página no cambia;
  - (e) si el `content` llega vacío o solo con espacios, no se muestra el bloque (ni la etiqueta);
  - (f) la tarjeta no tiene botón de expandir ni de contraer: el contenido se ve siempre que esté cargado, y no hay `aria-expanded` ni `aria-controls` para este contenido;
  - (g) el botón «Reintentar» es un `button` nativo, se opera con Enter y Espacio y tiene foco visible; al activarlo, el foco pasa al estado de carga y después al contenido (si carga) o al nuevo botón «Reintentar» (si vuelve a fallar); la carga inicial no mueve el foco;
  - (h) añadir tarjetas con «Cargar más» no repite las peticiones de las tarjetas ya mostradas, y una tarjeta que tarda o falla no impide mostrar las demás.
- **CA-15 (imágenes completas y centradas):** Dada una imagen de noticia o evento en la portada o en las páginas, cuando se muestra, entonces: (a) se ve completa, sin recorte en ningún borde (`object-fit: contain`); (b) queda centrada horizontal y verticalmente dentro de una caja de proporción fija; (c) el espacio sobrante muestra el fondo neutro del token `--surface-subtle`, sin colores fijos en `news-events.css`; (d) no se amplía por encima de su tamaño natural (sin sensación de zoom ni `transform` en hover); (e) la misma caja y regla se usan para el placeholder de CA-07; y (f) no hay desbordamiento a 360 px. Verificado con pruebas de reglas CSS y verificación visual manual (T-11).
- **CA-16 (configuración por página):** Dadas `index.html`, `noticias.html` y `eventos.html`, cuando se revisan, entonces cada una contiene exactamente una `<meta name="arca-api-base">`, las tres tienen el mismo valor, y el valor termina en `/api/v1`. La URL de desarrollo del portal documentada es `http://localhost:8080`, origen que `CORS_ALLOWED_ORIGINS` debe incluir en desarrollo (`api-011` RN-12), y el comando de `apps/web/README.md` se corrige en T-22.

## Reglas de negocio

- **RN-01 (solo presentación):** El portal no decide qué es visible, ni el orden, ni la vigencia, ni la fecha de «hoy». Eso lo decide `api-011` (noticias, con RN-14 en `America/Mexico_City`) y `api-006` (eventos). El portal solo presenta lo que recibe.
- **RN-02 (sin contenido de muestra):** No se muestra contenido inventado en ningún estado. Si la API falla, se muestra el estado de error, no tarjetas de muestra.
- **RN-03 (solo lectura y público):** El portal solo hace `GET`, sin cookies, sin credenciales y sin datos del visitante. No almacena contenido de la API en el navegador: el contenido completo de una noticia vive solo en memoria mientras la página está abierta.
- **RN-04 (textos en español):** Todos los textos visibles, de estado y de error están en español (`apps/web/AGENTS.md`).
- **RN-05 (sin dependencias):** No se añaden paquetes, `package.json`, build, fuentes remotas ni scripts de terceros.
- **RN-06 (un solo módulo de red):** La lectura de la API ocurre solo en `js/api.js`. `js/news-events.js` no llama a `fetch`.
- **RN-07 (texto seguro):** Los datos de la API se tratan siempre como texto. Las URLs de imagen se aceptan solo si son `http:`, `https:` o rutas relativas del mismo origen.
- **RN-08 (excepción de arquitectura):** Esta spec mantiene HTML y JavaScript estático. Es excepción a `apps/web/AGENTS.md` (SPA React) y a la Constitución III («la UI llama a `@arca/api-client` mediante hooks») y IV (runner), y requiere el ADR 0024 aceptado (2026-11-07) para su implementación.
- **RN-09 (compatibilidad de la portada):** Los estilos y clases existentes de tarjetas (`news-grid`, `news-card`, `event-grid`, `event-card`) se reutilizan para mantener el diseño actual; los estilos nuevos van en un archivo propio.
- **RN-10 (imagen completa):** Ninguna imagen de contenido se recorta ni se estira: se muestra completa dentro de su caja (CA-15). No se usa `object-fit: cover` ni `fill` en imágenes de contenido.
- **RN-11 (un detalle por noticia):** Cada noticia mostrada pide su detalle (`GET /news/{id}`) como máximo una vez por visita a la página, salvo el reintento tras un error (CA-14 a, d y h).

## Datos, privacidad y auditoría

- Los datos son contenido público de noticias y eventos. No hay datos personales, clínicos ni financieros.
- El portal no guarda nada en el navegador: no usa `localStorage` ni cookies para este contenido. Las preferencias de accesibilidad de `008` siguen siendo las únicas que usan almacenamiento local.
- No se envían datos del visitante a la API ni a terceros. No se usan analíticas nuevas en esta spec.
- No hay auditoría: el portal no escribe en la API.
- No requiere DBR ni cambios de esquema.

## Flujos y errores

### Flujo principal (portada)

1. El visitante abre `index.html`. Cada sección muestra su estado de carga.
2. `js/api.js` pide `GET {base}/news?limit=3` y `GET {base}/events?limit=2`.
3. `js/news-events.js` renderiza las tarjetas con texto seguro, imagen completa o placeholder y fechas en español.
4. Cada tarjeta de noticia pide `GET {base}/news/{id}` al mostrarse (una vez) y muestra el contenido completo en su bloque «Contenido:» (CA-14). El visitante no necesita pulsar nada.
5. El visitante usa «Ver todas» para ir a `noticias.html` o `eventos.html`.

### Flujo en `noticias.html`

1. Pide `GET {base}/news?page=1&limit=10`.
2. Si `meta.has_more` es `true`, muestra «Cargar más», que pide la página siguiente y añade tarjetas al final sin borrar las anteriores.
3. Si la página siguiente falla, conserva lo ya mostrado y muestra el mensaje de error de la sección.
4. Cada tarjeta pide su detalle al mostrarse (CA-14), sin bloquear el listado ni las demás tarjetas. Las peticiones de detalle de una página se lanzan todas a la vez, sin esperar a las demás tarjetas (pregunta 9, resuelta el 2026-11-08).

### Errores esperados

- Red caída, `5xx`, `404` de la ruta, JSON inválido o tiempo de espera excedido en el listado → estado de error (CA-05).
- `200` con `data: []` → estado vacío (CA-04).
- `422` por parámetros: no ocurre con los valores fijos de esta spec; si ocurre, se trata como error (CA-05).
- Detalle de noticia que falla, responde `404` o devuelve JSON no válido → mensaje de error y botón «Reintentar» dentro de la tarjeta, sin afectar al resto (CA-14 d).
- Detalle de noticia con `content` vacío → la tarjeta no muestra el bloque de contenido (CA-14 e).
- Imagen que no carga → placeholder (CA-07).
- Base URL mal configurada (`/api/v1` no existe en el servidor del portal) → error de carga (CA-05); la configuración correcta se documenta en `infra/README.md`.
- Origen no permitido por CORS → el navegador bloquea la lectura; el portal muestra el estado de error (CA-05).

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:**
  - `api-011` (noticias, `GET /news/{id}` y `limit` en eventos, que esta spec usa con `limit=2`) y `api-006` (eventos) disponibles en el ambiente.
  - **ADR 0024, aceptado (2026-11-07):** `docs/adr/0024-web-static-portal-exception.md`. Registra que `apps/web` mantiene HTML y JavaScript estático para las páginas de contenido público (`apps/web/AGENTS.md`; Constitución III y IV en lo relativo a `@arca/api-client` y a Vitest), con reevaluación de SPA en la spec de pagos. Mientras no esté aprobado, esta spec no se aprueba ni se implementa.
  - Precedente: `web-001` (Implementada) y `web-008` (Implementada) ya usan HTML estático y `node --test`. Esta spec no amplía el precedente a otros componentes que no sean los de contenido público.
  - No hay dependencias nuevas (RN-05). No requiere ADR de dependencia.
- **Riesgos:**
  - **Excepción de arquitectura:** el portal estático no cumple la arquitectura objetivo (React, Vite, `@arca/api-client`). Si el ADR no se aprueba, esta spec no avanza. Si se aprueba, la deuda queda registrada.
  - **CORS y orígenes:** el portal necesita que su origen exacto esté en `CORS_ALLOWED_ORIGINS` de cada ambiente (`api-011` RN-12). En desarrollo es `http://localhost:8080`; `127.0.0.1:8080` es otro origen. Sin eso, la portada no muestra datos.
  - **Puerto de desarrollo:** resuelto. `apps/web/README.md` usa `php -S 127.0.0.1:8000`, que choca con la API y no coincide con el origen permitido. La corrección es tarea T-22 (`php -S localhost:8080 -t apps/web/src`).
  - **Meta por página:** la base de la API está repetida en tres páginas. Un cambio de ambiente debe hacerse en las tres; CA-16 comprueba que coincidan.
  - **Bionic Reading y Regla de Lectura (`008`):** las transformaciones de `accessibility.js` se aplican al cargar la página. El contenido que llega después de la carga (tarjetas y contenido completo de las noticias, que llega tras una petición) podría quedar sin formato. Se prueba en CA-11 y en la verificación manual de T-11 y T-12.
  - **Zona horaria en fechas:** las fechas `YYYY-MM-DD` se formatean sin `Date` para no desplazarlas un día; si la API cambia el formato, CA-08 falla. La fecha de corte de la vigencia la decide la API (`api-011` RN-14).
  - **Imágenes pequeñas:** con `object-fit: contain` y sin ampliar (CA-15 d), una imagen menor que la caja se verá pequeña y centrada, no estirada. Es intencional, pero puede parecer poco llamativa.
  - **Más peticiones (cambio de 2026-11-08, aprobado el 2026-11-08):** al mostrar el contenido completo sin acción del visitante, cada tarjeta de noticia pide su detalle. Coste: en la portada, por visita, 2 listados (noticias y eventos) más 3 detalles; en `noticias.html`, 1 listado por página más hasta 10 detalles por página, y otros 10 por cada «Cargar más». **Pregunta 9 resuelta (2026-11-08, Jonathan):** los detalles se lanzan todos a la vez, una por tarjeta, sin serializar. Esto acorta el tiempo hasta ver el contenido de la última tarjeta, pero concentra una ráfaga de hasta 3 peticiones simultáneas en la portada y de hasta 10 en cada página de `noticias.html`. Si la API limita la frecuencia de peticiones y responde con un código distinto de `2xx`, esa tarjeta muestra el error de CA-14 d y se reintenta solo ese detalle; no se reintenta en bloque. Mitigación: un detalle por tarjeta y sin repetirlo (RN-11, CA-14 a y h); la carga de una tarjeta no bloquea el listado ni a las demás (CA-14 h); un fallo queda aislado en su tarjeta y se reintenta solo ese detalle (CA-14 d); no hay caché persistente (RN-03), así que cada visita vuelve a pedirlos. Si el volumen o la ráfaga crecen, se evalúa en una spec de operación (p. ej. limitar la concurrencia o carga diferida por proximidad, no incluida aquí).
  - **Imágenes anteriores a `api-008`:** sin `image_url`, la tarjeta muestra el placeholder.
- **Preguntas (estado tras los cambios del 2026-11-08):**
  1. **Resuelta (2026-11-07):** ADR 0024 aceptado por el equipo (excepción de arquitectura para `apps/web`: HTML y JavaScript estáticos, sin `@arca/api-client` ni build, y `node --test` como runner; reevaluación de SPA en la spec de pagos).
  2. **Pendiente, no bloquea (decisión del usuario, 2026-11-07):** origen de producción y valor de `<meta name="arca-api-base">` en producción: opción A (meta en cada página con la URL absoluta de la API) o opción B (el servidor del portal reenvía `/api/v1` a la API, mismo origen, sin CORS). El desarrollo queda resuelto (`http://localhost:8080` y la meta por página); la producción no tiene dominio definido.
  3. **Resuelta (2026-11-07, modificada 2026-11-08):** tres noticias y dos eventos en la portada (`limit=2` para eventos), con «Ver todas» hacia las páginas de listado.
  4. **Resuelta (2026-11-07, modificada 2026-11-08):** las páginas de listado usan tarjetas con título, categoría, fecha, descripción y el bloque «Contenido:» con el contenido completo, que se pide automáticamente por tarjeta (CA-14); no hay página de detalle con URL propia.
  5. **Resuelta (2026-11-07):** textos de vacío «Aún no hay noticias publicadas» y «Aún no hay eventos vigentes».
  6. **Resuelta (2026-11-07, ampliada):** si la API falla, la portada, `noticias.html` y `eventos.html` muestran el mensaje de error con botón «Reintentar» (CA-05); no ocultan la sección.
  7. **Resuelta (2026-11-07):** el contenido completo en la tarjeta es solo para noticias; las tarjetas de eventos no lo tienen.
  8. **Resuelta (2026-11-08, Jonathan):** al pulsar «Reintentar» en el detalle de una noticia, el foco se comporta igual que en CA-05: pasa al estado de carga y después al contenido si carga bien o al nuevo botón «Reintentar» si vuelve a fallar. La carga inicial no mueve el foco.
  9. **Resuelta (2026-11-08, Jonathan):** las peticiones de detalle de noticias se lanzan **todas a la vez**, una por tarjeta, sin esperar a las demás; no se serializan. Aplica a la portada (hasta 3) y a cada página de `noticias.html` (hasta 10, y 10 más por cada «Cargar más»).

## Cambios por área

| Área | Archivos previstos | Propósito |
|---|---|---|
| Portal | `apps/web/src/index.html` | Reemplazar las tarjetas de muestra de `#noticias` y `#eventos` por contenedores con estado inicial de carga; `#eventGrid` con `data-ne-limit="2"`; enlaces «Ver todas»; `<meta name="arca-api-base">`; carga de `news-events.css`, `js/api.js` y `js/news-events.js` con `defer`. No cambia las demás secciones. |
| Portal | `apps/web/src/noticias.html` (nuevo) | Página de listado de noticias con «Cargar más» y, en cada tarjeta, el bloque «Contenido:» de CA-14. Misma cabecera y pie que `index.html`; mismo `<meta name="arca-api-base">`. |
| Portal | `apps/web/src/eventos.html` (nuevo) | Página de listado de eventos vigentes; mismo `<meta name="arca-api-base">`. |
| Portal | `apps/web/src/js/api.js` (nuevo) | Único módulo de red: `fetch` con `credentials: 'omit'`, `Accept`, tiempo máximo, base URL desde la meta, normalización de errores y `getNewsItem(id)` con validación del identificador. Expone una interfaz global simple (script clásico, no módulo ES). |
| Portal | `apps/web/src/js/news-events.js` (nuevo) | Renderiza estados, tarjetas, el bloque de contenido completo de cada noticia (carga automática, error con «Reintentar»), imagen completa o placeholder, y fechas en español usando solo DOM API (`createElement`, `textContent`, `setAttribute`). No llama a `fetch`. |
| Portal | `apps/web/src/news-events.css` (nuevo) | Estados de carga, vacío y error; bloque de contenido (`ne-content`) con saltos de línea; caja de imagen de proporción fija con `object-fit: contain` y centrado; placeholder; foco visible; ajustes para 360 px. Reutiliza tokens existentes (`--surface-subtle`). No modifica `styles.css`. |
| Pruebas | `apps/web/src/tests/news-events.test.mjs` (nuevo) | Tests `CA-01` a `CA-16` con `node:test`, `node:vm` y un DOM simulado, sin dependencias. |
| Pruebas existentes | `apps/web/src/tests/relocation.test.mjs` | Solo revisión. Si una comprobación depende de las tarjetas de muestra, se informa antes de cambiarla. |
| Documentación | `apps/web/docs/portal-noticias-eventos.md` (por crear) | Referencia local: configuración de la base URL por página y ambiente, orígenes permitidos, modo de ejecución en `localhost:8080`, la carga automática del contenido por noticia, la excepción de arquitectura con enlace al ADR 0024. |
| Documentación | `apps/web/README.md` (corregir solo como tarea, T-22) | El comando `php -S 127.0.0.1:8000 -t apps/web/src` pasa a `php -S localhost:8080 -t apps/web/src`. Esta spec no edita el README. |
| Infraestructura | `infra/README.md` (ajuste) | Requisitos de ambiente (ver «Nota para infra/README.md»). |
| ADR | `docs/adr/0024-web-static-portal-exception.md` | ADR de excepción de arquitectura (Aceptado el 2026-11-07 por el equipo de desarrollo). Esta spec solo lo referencia. |

## Nota para `infra/README.md`

Esta spec agrega requisitos de ambiente y, según `AGENTS.md`, se anotan en `infra/README.md` en el mismo PR. Se propone añadir la sección «Portal público (noticias y eventos)» con:

- [ ] `CORS_ALLOWED_ORIGINS` incluye el origen exacto (esquema, host y puerto) desde el que se sirve el portal en cada ambiente. Desarrollo: `http://localhost:8080`.
- [ ] La base URL de la API del portal está definida en `<meta name="arca-api-base">` de `index.html`, `noticias.html` y `eventos.html` (las tres con el mismo valor), o el servidor reenvía `/api/v1` al mismo origen (pregunta 2).
- [ ] `APP_URL`, `php artisan storage:link` y el disco persistente del checklist existente cubren las imágenes de noticias y eventos.
- [ ] DBR-005 aplicada en el ambiente (`deleted_at` en `news` y `events`).
- [ ] **Evidencia:** `curl -i -H "Origin: http://localhost:8080" <API>/api/v1/news?limit=3` responde `200` con `Access-Control-Allow-Origin: http://localhost:8080`, y la portada muestra al menos una noticia publicada.

## Revisión

- Aprobadores y fecha: Jonathan, 2026-11-07 (aprobación explícita del usuario sobre spec, plan y tasks); ADR 0024 aceptado por el equipo de desarrollo, 2026-11-07. Estado Aprobada para la versión del 2026-11-07.
- Aprobación de los cambios del 2026-11-08: Jonathan, 2026-11-08, en el chat («déjalas a la vez, aprobado todo»). Cubre spec, plan y tasks, con: 3 noticias y 2 eventos en la portada (CA-01, CA-02); bloque «Contenido:» sin botón con carga automática del detalle por tarjeta (CA-14); foco tras «Reintentar» igual que CA-05 (pregunta 8); y peticiones de detalle lanzadas todas a la vez (pregunta 9). El estado de la spec sigue Aprobada; no pasa a Implementada hasta cumplir la definición de terminado.
- Evidencia de implementación parcial (2026-11-08): `node --test apps/web/src/tests/news-events.test.mjs` con 18 de 18 pruebas en verde (nombres CA-01 a CA-12 y CA-14 a CA-16, con CA-13 verificando la lista) e `index.html` con `data-ne-limit="2"` en `#eventGrid`. El resultado de `relocation.test.mjs` tiene 6 fallos preexistentes en pruebas de otros módulos, ya presentes en el último commit; no se atribuyen a esta spec (CA-11).
- Preguntas 8 y 9 resueltas (2026-11-08).
- Evidencia/enlaces: `apps/web/specs/001-relocate-static-portal.md` (portal estático, Implementada), `apps/web/specs/008-cognitive-accessibility-assistant.md` (interacción con transformaciones de lectura, Implementada), `apps/api/specs/011-public-news-read.md` (endpoints y RN-14), `apps/api/specs/006-public-catalog-read.md` (eventos), `apps/dashboard/specs/007-content-image-display.md` (mismo criterio de imagen completa en el dashboard), `docs/adr/0024-web-static-portal-exception.md` (excepción aceptada el 2026-11-07), `apps/web/AGENTS.md` (regla de SPA y de `@arca/api-client`).
