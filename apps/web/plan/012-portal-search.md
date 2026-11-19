# Plan técnico · 012 · portal-search

- Spec: `apps/web/specs/012-portal-search.md` (Estado: **Aprobada**, Jonathan, 2026-11-18).
- Estado: Implementado y verificado; ajuste visual CA-02/CA-05 completado por solicitud de Jonathan el 2026-11-18; ADR 0031 aceptado.
- Responsable técnico: por identificar.
- ADR de excepción: `docs/adr/0031-global-portal-search-static-exception.md` (Aceptado por Jonathan, 2026-11-18).

## Diseño de solución

La búsqueda global se integra en el portal HTML/JavaScript estático existente. Un módulo nuevo, `js/search.js`, controla consulta, estados, resultados, accesibilidad y navegación; delega toda la red en el módulo existente `js/api.js`. No se añade un endpoint de búsqueda: se consultan los endpoints públicos ya disponibles y se busca en memoria del navegador sobre los datos recibidos.

Al enviar una consulta, se crean dos grupos de resultados:

1. **Contenido estático de portada.** Se indexa el texto visible de las secciones públicas de `main` (encabezados, párrafos, preguntas, etiquetas y texto alternativo), asociándolo a su `section[id]`. Se excluyen cabecera, pie, controles, estados técnicos, elementos ocultos y datos que no formen parte de la lectura pública.
2. **Contenido dinámico publicado.** Se obtienen todas las páginas de noticias y momentos vigentes mediante `meta.has_more`, todos los eventos vigentes y todas las especies publicadas. Por noticia se consulta el detalle público para incluir su contenido completo. La búsqueda solo compara campos que los módulos de presentación ya muestran: especies, nombre/categoría/hábitat y demás campos publicados; noticias, título/categoría/descripción/contenido; eventos, nombre/descripción/ubicación/fechas; momentos, opinión.

Las cuatro fuentes dinámicas se cargan independientemente en paralelo. Se conserva el resultado exitoso de cada fuente; una falla parcial genera un aviso en español que identifica la fuente y no descarta los resultados restantes. Las respuestas quedan en memoria mientras la página está abierta para que consultas posteriores no repitan peticiones. No se usa almacenamiento persistente.

Los resultados se presentan en un panel asociado al buscador, agrupados por tipo y con título, fragmento breve y enlace. Un enlace de contenido estático desplaza a su sección. Un enlace de especie abre la sección de TulanPedia y aplica el texto en sus filtros. Noticias y eventos abren su página de listado con un localizador estable para que el módulo de lista cargue la página correcta y enfoque la tarjeta. La actualización de `news-events.js` mantiene el contrato editorial y de carga actual.

La búsqueda aplica normalización de mayúsculas, espacios y diacríticos para comparar texto. La consulta permanece como texto literal, con límite de longitud definido por el componente y sin enviarse a la API ni a servicios externos. No se resaltan coincidencias mediante HTML.

**Precondición de implementación:** el ADR 0031 está aceptado. Los ADR 0024, 0027 y 0028 siguen limitados a sus módulos; el ADR nuevo autoriza la búsqueda global y conserva las salvaguardas comunes.

## Cambios por área

Ajuste visual autorizado: el contenedor de acciones deja de ser el bloque de referencia del dropdown y se eleva sobre la fila de navegación; el panel absoluto se coloca bajo la cabecera completa en móvil y escritorio. `render` añade título y agrupa los reintentos, el aviso usa un fondo semántico suave y las tarjetas separan tipo, título y fragmento con tipografía y espacios consistentes. CSS limita el alto al viewport y permite desplazamiento interno; se actualiza la versión de CSS y del renderizador para recargar la presentación. Se conservan los flujos de búsqueda y navegación existentes.

Corrección adicional autorizada: un helper `js/search-target.js` compartido por las tres páginas aplica una clase temporal al encabezado estático o tarjeta dinámica. La clase pulsa dos veces suavemente, se elimina a los 2400 ms y se reinicia al volver a elegir el mismo destino; `prefers-reduced-motion` conserva solo el borde. El buscador controla el submit en fase captura para impedir un manejador heredado que todavía desplace a Animales. Se evita que el enfoque inicial pendiente de especies interrumpa una búsqueda nueva. Las URLs de scripts modificados y CSS compartido incluyen una versión local para renovar recursos previamente cacheados, sin cambiar sus archivos físicos ni añadir dependencias.

Corrección CA-04/CA-05 autorizada el 2026-11-18: `search.js` queda como único controlador del formulario; se elimina el envío heredado de `script.js`. El panel cierra al activar un resultado, al pulsar Escape en campo/panel o al hacer clic fuera; la finalización de cargas respeta el estado cerrado. Los enlaces conservan su navegación nativa y las anclas reciben foco; una especie oculta por filtros se revela antes de enfocar. La página de destino de noticias se calcula con el tamaño del listado (10), aunque el índice descargue páginas de 50. Los grupos de resultados anulan el padding global de las secciones para mantener el panel compacto.

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| Portal / HTML | `apps/web/src/index.html` | Cambiar placeholder y etiqueta accesible del campo; añadir región de resultados vinculada con `aria-controls`; cargar `js/search.js`; conservar `#searchForm` y `#searchInput`. |
| Portal / API cliente | `apps/web/src/js/api.js` | Añadir opción `page` a `getMemories`; mantener en este archivo todas las llamadas `fetch`; reutilizar `getNews`, `getNewsItem`, `getEvents`, `getSpecies` y `getMemories`. |
| Portal / búsqueda | `apps/web/src/js/search.js` (nuevo) | Indexación de texto estático, carga y normalización de las fuentes públicas, coincidencias, fragmentos, estados parciales, caché de sesión en memoria y control accesible del panel. |
| Portal / destino | `apps/web/src/js/search-target.js` (nuevo) | Resaltado temporal repetible del encabezado o tarjeta, compartido por las tres páginas y sin alterar foco ni datos. |
| Portal / listas | `apps/web/src/js/news-events.js` | Exponer navegación profunda a noticia/evento por ID y página, manteniendo paginación, estados y contenido actuales. |
| Portal / catálogo | `apps/web/src/js/animals.js` | Exponer una forma segura de localizar y enfocar una especie publicada desde un resultado de búsqueda, sin alterar los filtros existentes. |
| Portal / páginas | `apps/web/src/noticias.html`, `apps/web/src/eventos.html` | Añadir IDs estables a tarjetas y soportar parámetros de página/ID provenientes de resultados globales. |
| Portal / estilos | `apps/web/src/styles.css` | Estilos adaptables del panel, resultados, resaltado por foco y mensajes; solo tokens semánticos y modo claro. |
| Pruebas | `apps/web/src/tests/search.test.mjs` (nuevo) | Tests de CA-01 a CA-08 con `node:test`, `node:vm` y DOM/fetch simulados, sin dependencias nuevas ni llamadas de red reales. |
| Pruebas existentes | `apps/web/src/tests/news-events.test.mjs`, `animals.test.mjs`, `relocation.test.mjs` | Regresión de contratos, IDs y estructura compartida. |
| ADR | `docs/adr/0031-global-portal-search-static-exception.md` (Aceptado) | Autoriza la extensión acotada de la excepción arquitectónica y registra límites y compensaciones. |
| Sin cambios previstos | API Laravel, esquema/DBR, `@arca/api-client`, paquetes, autenticación, producción | Se reutilizan endpoints públicos existentes. |

## Contrato y datos

### Endpoints públicos existentes

| Fuente | Contrato de lectura | Paginación y datos usados |
|---|---|---|
| Especies | `GET {base}/published-species` | Lista sin paginación según `api-015`; campos ya autorizados por `published_fields`. |
| Noticias | `GET {base}/news?page=N&limit=50` | Seguir `meta.has_more`; por cada noticia visible, `GET {base}/news/{id}` para incluir `content` publicado. |
| Eventos | `GET {base}/events` | Lista completa vigente; `api-006`/`api-011` no requiere `page`. |
| Momentos | `GET {base}/memories?page=N&limit=50` | Seguir `meta.has_more`; texto de `opinion` e imagen/fecha solo si ya se muestran como texto en el portal. |

Se conserva la envoltura de `js/api.js`: `{ ok, data, meta }` o `{ ok: false, reason }`, `credentials: 'omit'`, `Accept: application/json`, sin `Authorization` ni CSRF y máximo de 10 segundos por solicitud. `getMemories(options)` debe incluir `page` además de `limit`. `search.js` no llama `fetch` ni interpreta mensajes técnicos de error.

### Navegación profunda

- Contenido estático: `index.html#<section-id>`.
- Especies: `index.html#animal-{id}` apunta al identificador estable añadido a cada tarjeta; se enfoca el resultado después de cargar TulanPedia.
- Noticias: `noticias.html?page=N#news-{id}`. El listado inicia en la página indicada, muestra la tarjeta ancla y conserva «Cargar más» desde esa página.
- Eventos: `eventos.html#event-{id}`. La lista vigente ya se carga completa.
- Se valida que los IDs recibidos sean enteros positivos antes de formar una URL. Ningún dato editorial se concatena como HTML.

### Privacidad y carga

- La consulta solo se compara localmente; no se envía a la API, se guarda en URL ni se registra en almacenamiento.
- Las respuestas se mantienen en variables en memoria durante la sesión de página. Se limpia la caché al abandonar la página de forma natural.
- Las fuentes fallan de manera independiente. El panel muestra resultados disponibles y un aviso parcial por fuente fallida; si fallan todas, comunica error global y ofrece «Reintentar».
- Las peticiones por noticia para recuperar el cuerpo se limitan a las noticias efectivamente devueltas por el API. No se amplían respuestas ni se crean tablas.
- **Riesgo de carga:** el API no declara un máximo total de registros. La paginación de noticias y momentos puede producir muchas solicitudes; el cliente limita la concurrencia de detalles de noticias (máximo 4 simultáneas), pagina en orden y mantiene reintento por fuente. Se medirá la experiencia en la verificación manual y se reconsiderará un endpoint de búsqueda si el catálogo crece.

## Seguridad, offline y operación

- Todo contenido editorial se inserta mediante `textContent` y nodos DOM; el fragmento se limita y escapa de forma segura al presentarse.
- La búsqueda solo solicita endpoints públicos existentes; no envía credenciales, cookies, consultas ni datos personales.
- Las URLs de anclas se construyen con IDs validados y páginas enteras positivas. Los resultados no alteran la publicación ni la visibilidad decidida por la API.
- Si una fuente devuelve error, se mantiene el resto; sin conexión no se persiste un índice para otra visita.
- No hay cambios de servidor, entorno, dependencias o esquema; no requiere cambio en `infra/README.md` ni DBR.
- El despliegue requiere que los endpoints existentes estén disponibles y CORS permita el origen del portal, como ya especifican `api-011`, `api-012` y `api-015`.
- La ejecución estática propuesta es una excepción a Constitution III y IV y a `apps/web/AGENTS.md`; solo se puede implementar después de aceptar ADR 0031. Si el equipo no acepta esa excepción, se detiene y se rediseña la solución conforme a la arquitectura React y `@arca/api-client`.

## Mapeo de criterios a pruebas

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | `test_ca01_searches_static_and_all_public_sources` | `web/src/tests/search.test.mjs` |
| CA-02 | `test_ca02_renders_typed_results_with_title_snippet_and_link` | `web/src/tests/search.test.mjs` |
| CA-03 | `test_ca03_announces_empty_results_and_accepts_new_query` | `web/src/tests/search.test.mjs` |
| CA-04 | `test_ca04_deep_links_to_static_species_news_and_event` | `web/src/tests/search.test.mjs` |
| CA-05 | `test_ca05_keyboard_and_screen_reader_accessible_results` | `web/src/tests/search.test.mjs` |
| CA-06 | `test_ca06_only_public_data_and_query_stays_local` | `web/src/tests/search.test.mjs` |
| CA-07 | `test_ca07_empty_query_and_partial_or_total_source_failures` | `web/src/tests/search.test.mjs` |
| CA-08 | `test_ca08_every_acceptance_criterion_has_named_automated_test` | `web/src/tests/search.test.mjs` |

Cobertura adicional de la corrección autorizada (2026-11-18): CA-04 se verifica con `test_ca04_submit_with_portal_script_stays_in_place_and_result_uses_its_destination`, `test_ca04_news_after_first_ten_records_links_to_the_page_containing_the_card`, `test_ca04_species_link_locates_card_again_when_hash_is_unchanged` y «CA-04 portal-search: un resultado de especie oculto por filtros se revela, actualiza el contador y recibe foco» (`animals.test.mjs`). CA-05 se verifica con `test_ca05_outside_click_closes_panel_without_stealing_focus_and_inside_click_keeps_it_open`, `test_ca05_escape_from_result_or_input_closes_panel_and_returns_focus` y `test_ca05_closing_during_loading_or_retry_does_not_reopen_panel`.

La corrección adicional prueba CA-04 con `test_ca04_submit_ignores_legacy_animal_redirects_and_cancels_pending_catalog_focus`, `test_ca04_static_result_highlights_its_destination`, `test_ca04_all_pages_load_current_navigation_and_shared_highlight`, resaltado de noticias/eventos y la carga pendiente de especies. `search-target.test.mjs` cubre selección, repetición, limpieza temporal y preservación de foco (CA-04/CA-05); CA-05 de `search.test.mjs` verifica la regla CSS de movimiento reducido.

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | JavaScript y HTML existentes; endpoints y formato existentes; sin dependencias ni BD. |
| II. La spec manda | Sí | Spec, plan y tasks `012-portal-search` aprobados y completados; ADR 0031 aceptado. |
| III. Lógica separada de la interfaz | Excepción aceptada | ADR 0031 autoriza `js/search.js` y el uso de `js/api.js` dentro del alcance de `web-012`; no se amplía a otras features. |
| IV. Un test por criterio | Excepción aceptada | ADR 0031 autoriza `node --test` con DOM/API simulados para CA-01 a CA-08; cada CA queda ligado a un test nombrado en este plan. |
| V. Una sola fuente de verdad para los datos | Sí | Las fuentes dinámicas provienen de endpoints de lectura; no hay copia persistente ni escritura. |
| VI. Código en inglés, personas en español | Sí | Identificadores y URLs en inglés; interfaz, estados y mensajes en español. |

Las excepciones de III y IV quedan resueltas solo para esta feature por el ADR 0031 aceptado. La spec, el plan y los tasks siguen siendo obligatorios antes de implementar.

## Riesgos y decisiones

- ADR 0031 aceptado para extender el alcance de la excepción de portal estático; sus salvaguardas de texto seguro, lectura pública, `api.js` como único módulo de red, cero persistencia y test por CA son obligatorias.
- News y memories usan paginación simple sin total. Se recorren páginas hasta `has_more: false`; cada fallo deja esa fuente marcada como incompleta.
- Las noticias requieren peticiones de detalle por item para buscar también `content`. La concurrencia limitada y carga al enviar la consulta evitan descargar esos detalles en cada visita sin búsqueda.
- Los enlaces profundos de una noticia requieren iniciar el listado en página N; la página no debe depender de cargar primero todas las páginas anteriores.
- El texto de imágenes no se indexa salvo `alt` descriptivo visible/accesible ya aprobado; no se buscan metadatos internos ni campos no publicados.
- Puede haber diferencias si el contenido se publica o vence mientras se prepara el índice. Cada envío crea/renueva el índice en memoria; no hay garantía de consistencia transaccional entre endpoints.

## Orden y aprobación

1. Desglosar tasks atómicas y trazables a CA-01…CA-08 (plan y ADR aprobados).
2. Confirmar contratos y disponibilidad de `api-011`, `api-012`, `api-015`, `web-009`, `web-010` y `web-011`; anotar cualquier dependencia faltante como bloqueante, sin ampliar alcance.
3. Obtener aprobación de los tasks antes de implementar.
4. Implementar en el orden aprobado y sin ampliar alcance.
5. Ejecutar `/verify` para `web`, registrar evidencia por CA y completar spec/plan/tasks. Hecho: la app aún no tiene `src/package.json`; se ejecutaron suites directas y se documentaron las limitaciones en tasks.

- Aprobación funcional de la spec: Jonathan, 2026-11-18.
- Aprobador técnico: Jonathan, 2026-11-18.
- Estado de aprobación del plan: aprobado; Constitution Check III–IV resuelto por ADR 0031 aceptado. Tasks aprobados el 2026-11-18 y completados con evidencia en `apps/web/tasks/012-portal-search.md`.
