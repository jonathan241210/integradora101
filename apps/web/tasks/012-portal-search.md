# Tareas · 012 · portal-search

- Spec: `apps/web/specs/012-portal-search.md` (Aprobada por Jonathan, 2026-11-18).
- Plan: `apps/web/plan/012-portal-search.md` (Aprobado por Jonathan, 2026-11-18).
- ADR: `docs/adr/0031-global-portal-search-static-exception.md` (Aceptado por Jonathan, 2026-11-18).
- Estado del checklist: Aprobado por Jonathan, 2026-11-18; implementación completada y verificada el 2026-11-18.
- Todas las tareas aplicables están completas; la evidencia de implementación y corrección se registra abajo.

## Trazabilidad CA → tareas y pruebas

| CA | Tarea de implementación | Tarea de prueba | Test automatizado previsto |
|---|---|---|---|
| CA-01 | T-03 | T-08 | `test_ca01_searches_static_and_all_public_sources` |
| CA-02 | T-04 | T-09 | `test_ca02_renders_typed_results_with_title_snippet_and_link` |
| CA-03 | T-04 | T-10 | `test_ca03_announces_empty_results_and_accepts_new_query` |
| CA-04 | T-05 | T-11 | `test_ca04_deep_links_to_static_species_news_and_event` |
| CA-05 | T-06 | T-12 | `test_ca05_keyboard_and_screen_reader_accessible_results` |
| CA-06 | T-03, T-07 | T-13 | `test_ca06_only_public_data_and_query_stays_local` |
| CA-07 | T-04 | T-14 | `test_ca07_empty_query_and_partial_or_total_source_failures` |
| CA-08 | T-15 | T-15 | `test_ca08_every_acceptance_criterion_has_named_automated_test` |

## Implementación

- [x] **T-01** — **Precondiciones y línea base** (bloqueante; sin código): confirmar en el árbol de trabajo los contratos y estados de `api-011`, `api-012`, `api-015`, `web-009`, `web-010` y `web-011`; verificar que el portal mantiene el módulo único de red `js/api.js` y que los puntos de integración previstos existen. Registrar la línea base de resultados de `relocation.test.mjs`, `news-events.test.mjs` y `animals.test.mjs` sin modificar archivos ajenos a `web-012`.
  - Criterio de hecho: dependencias/limitaciones y resultados de línea base anotados aquí con fecha; si algún endpoint requerido no está implementado, detener su integración y registrar el bloqueo sin ampliar la spec.
  - Evidencia (2026-11-18): en el código existen `GET /published-species`, `GET /memories` (Request/Controller/Action), noticias con listado/detalle y eventos; `js/animals.js`, `js/memories.js`, `js/news-events.js` y `js/api.js` están presentes. No se comprobó conectividad de ambiente. Línea base: `node apps/web/src/tests/relocation.test.mjs` 39/45 (seis fallos preexistentes: extractores VM de navegación/mapa, regla de iconos 8 px y markup de resumen cognitivo); `news-events.test.mjs` 1/1 archivo aprobado; `animals.test.mjs` 1/1 archivo aprobado.
  - Archivos: este checklist únicamente.

- [x] **T-02** (CA-01, CA-06; RN-04) — **Paginar momentos en el módulo de API:** extender `ArcaApi.getMemories(options)` en `apps/web/src/js/api.js` para enviar `page` además de `limit`, sin cambiar `request` ni contratos de las funciones existentes. Mantener `fetch` únicamente en `api.js`, `credentials: 'omit'`, `Accept: application/json` y el timeout actual.
  - Test de contrato nombrado `CA-06`: `test_ca06_get_memories_passes_page_and_limit_without_credentials` en `apps/web/src/tests/search.test.mjs`.
  - Criterio de hecho: el test observa URL y opciones correctas y confirma que consulta vacía, cookies y cabeceras de autorización no se envían.
  - Archivos: `apps/web/src/js/api.js`, `apps/web/src/tests/search.test.mjs`.
  - Evidencia: `test_ca06_get_memories_passes_page_and_limit_without_credentials` pasa; URL observada `/memories?page=2&limit=50`, credenciales omitidas y solo `Accept` público.

- [x] **T-03** (CA-01, CA-06; RN-01, RN-03, RN-04) — **Carga e índice en memoria:** crear `apps/web/src/js/search.js`. Indexar texto visible de las secciones públicas de `main`; obtener listas completas de especies, noticias, eventos y momentos publicados usando `ArcaApi`; seguir `meta.has_more` para noticias y momentos; obtener detalle público de noticias con concurrencia máxima de cuatro; normalizar mayúsculas, espacios y diacríticos para buscar; crear un índice en memoria reutilizable entre consultas. Leer únicamente campos visibles y publicados según el plan; aislar resultados y errores por fuente.
  - Pruebas de CA-01 y CA-06 se desarrollan en T-08 y T-13.
  - Criterio de hecho: `search.js` no contiene `fetch`, almacenamiento persistente ni selección de campos privados; cada iterador se detiene con `has_more: false`; los fallos de una fuente no descartan las demás.
  - Archivos: `apps/web/src/js/search.js` (nuevo), `apps/web/src/js/api.js`.
  - Evidencia: tests CA-01/CA-06 pasan; incluyen todas las fuentes, paginación `has_more`, detalle de noticia, campos públicos y ausencia de consultas en red desde `search.js`.

- [x] **T-04** (CA-02, CA-03, CA-07; RN-02) — **Panel y resultados:** en `index.html`, cambiar el texto del campo a búsqueda en el portal, añadir la región de resultados asociada y cargar `js/search.js`. En `search.js`, renderizar grupos con tipo, título, fragmento y enlace; implementar consulta vacía, carga, vacío, error total, avisos parciales y reintento por fuente. Construir resultados con nodos y `textContent`.
  - Pruebas de CA-02, CA-03 y CA-07 se desarrollan en T-09, T-10 y T-14.
  - Criterio de hecho: el formulario conserva `#searchForm` y `#searchInput`; hay estado en español y el resultado previo no se presenta como resultado de una consulta nueva.
  - Archivos: `apps/web/src/index.html`, `apps/web/src/js/search.js`, `apps/web/src/styles.css`.
  - Evidencia: tests CA-02, CA-03 y CA-07 pasan; render seguro con nodos, estado vacío y errores/reintentos parciales y totales.

- [x] **T-05** (CA-04; RN-01) — **Navegación a contenido:** añadir identificadores estables a tarjetas de especies, noticias y eventos; exponer localización/enfoque de especie en `animals.js`; permitir que `news-events.js` abra una noticia desde `noticias.html?page=N#news-{id}` y evento desde `eventos.html#event-{id}`; soportar foco después de cargar y conservar filtros/paginación normales. Los destinos estáticos usan el `section[id]` correspondiente.
  - La página de noticias debe cargar la página indicada sin recorrer previamente las páginas anteriores y mantener la paginación desde ese punto.
  - Test de CA-04 se desarrolla en T-11.
  - Criterio de hecho: IDs de recurso se validan como enteros positivos; datos editoriales no se concatenan en HTML; los enlaces a registros fuera de la primera página llegan a su tarjeta.
  - Archivos: `apps/web/src/js/search.js`, `apps/web/src/js/animals.js`, `apps/web/src/js/news-events.js`, `apps/web/src/noticias.html`, `apps/web/src/eventos.html`.
  - Evidencia: tests CA-04 verifican hash estático y especies, página 3 de noticias sin recorrer páginas anteriores, y foco de tarjetas de noticia/evento tras carga.

- [x] **T-06** (CA-05; RN-02) — **Accesibilidad del buscador y sus resultados:** conectar `aria-controls`, `aria-expanded`/estado pertinente, nombre accesible del campo, región de anuncios para carga/vacío/error y navegación de teclado entre el formulario y enlaces. Asegurar foco visible, orden predecible, cierre del panel con Escape y devolución del foco cuando corresponda; adaptar el panel a móvil y escritorio con tokens semánticos.
  - Test de CA-05 se desarrolla en T-12.
  - Criterio de hecho: no se captura teclado globalmente fuera del buscador; los enlaces son elementos nativos y todos los estados anunciables tienen roles/relaciones verificables.
  - Archivos: `apps/web/src/index.html`, `apps/web/src/js/search.js`, `apps/web/src/styles.css`.
  - Evidencia: test CA-05 verifica nombre accesible, relación ARIA, región y foco visible; browser QA confirmó Escape, cierre del panel y retorno de foco.

- [x] **T-07** (CA-06; RN-01, RN-02, RN-04) — **Salvaguardas de privacidad y texto seguro:** validar que la consulta solo se compara localmente, no se añade a URL ni se envía a ningún endpoint; datos de API se presentan como texto; no se usan `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval`, cookies, `localStorage` ni `sessionStorage`; revisar que solo se indexan campos públicos mostrados por el portal.
  - Test de CA-06 se desarrolla en T-13.
  - Criterio de hecho: búsquedas estáticas de patrones prohibidos y pruebas de payload HTML confirman renderizado literal; endpoints llamados son exclusivamente GET públicos documentados.
  - Archivos: `apps/web/src/js/search.js`, `apps/web/src/js/api.js`, `apps/web/src/tests/search.test.mjs`.
  - Evidencia: CA-06 pasa con inspección estática de APIs prohibidas y payload HTML literal; `git diff` confirma que la consulta no se concatena en URLs de API.

## Pruebas automatizadas

- [x] **T-08** (CA-01) — `test_ca01_searches_static_and_all_public_sources`: pasa con secciones estáticas y las cinco fuentes públicas, incluida paginación.
- [x] **T-09** (CA-02) — `test_ca02_renders_typed_results_with_title_snippet_and_link`: pasa; valida grupo, título, fragmento y enlace.
- [x] **T-10** (CA-03) — `test_ca03_announces_empty_results_and_accepts_new_query`: pasa; valida vacío y consulta válida posterior.
- [x] **T-11** (CA-04) — `test_ca04_deep_links_to_static_species_news_and_event` y `test_ca04_news_and_event_pages_load_and_focus_the_linked_card`: pasan; incluida noticia en página 3.
- [x] **T-12** (CA-05) — `test_ca05_keyboard_and_screen_reader_accessible_results`: pasa; valida etiquetas, ARIA, foco visible y Escape.
- [x] **T-13** (CA-06) — `test_ca06_get_memories_passes_page_and_limit_without_credentials` y `test_ca06_only_public_data_and_query_stays_local`: pasan; solo datos públicos y consulta local.
- [x] **T-14** (CA-07) — `test_ca07_empty_query_and_partial_or_total_source_failures`: pasa; cubre vacío, fallos parciales/totales y reintento por fuente.
- [x] **T-15** (CA-08) — `test_ca08_every_acceptance_criterion_has_named_automated_test`: pasa; verifica nombres para todos los criterios.

## Calidad y entrega

- [x] **T-16** (CA-01 a CA-08) — `/verify` informa que `apps/web` aún no está inicializada: no existe `apps/web/src/package.json`, por lo que no hay scripts npm que ejecutar. Verificación directa: `search.test.mjs` 10/10, `news-events.test.mjs` 18/18, `animals.test.mjs` 31/31. `relocation.test.mjs` 39/45; los seis fallos de navegación/mapa/iconos/capa de cabecera/resumen cognitivo coinciden con la línea base T-01. `node --check` de los cuatro módulos y `git diff --check` pasan.
- [x] **T-17** (CA-01 a CA-08) — Browser QA en 360, 390, 768, 1024 y 1366 px: `scrollWidth === clientWidth` en todos; consultas «Jaguar», «prueba» y «horario» mostraron especies, noticias, eventos y secciones estáticas; el enlace de evento abrió y enfocó su tarjeta; Escape cerró el panel y devolvió foco. Se observó estado parcial ante fuentes no disponibles. La cobertura de error total y relaciones de accesibilidad se complementa con CA-05/CA-07 automatizados; lector de pantalla no se verificó con un dispositivo separado.
- [x] **T-18** (CA-04, CA-05, CA-06) — Añadida `apps/web/docs/busqueda-portal.md` con uso, fuentes, privacidad y mantenimiento; enlaza spec y ADR 0031. Spec, plan y tasks comparten `012-portal-search`; sin servidor, dependencias nuevas ni cambios de infraestructura.

## Corrección autorizada · CA-04/CA-05 · 2026-11-18

Jonathan solicita cerrar con clic fuera, eliminar la redirección automática a Animales y navegar al resultado. Tareas aprobadas por esta solicitud:

- [x] **T-19** (CA-04) — Retirado el submit heredado de `script.js`; el enlace cierra el panel y conserva su destino nativo, incluidas aperturas en otra pestaña. Las especies ocultas por filtros se revelan y los clics repetidos sobre la misma ficha vuelven a localizarla. Noticias calcula su destino con el tamaño de listado de diez registros aunque el índice descargue cincuenta por página.
- [x] **T-20** (CA-05) — Clic fuera y Escape desde campo/panel cierran; clic fuera conserva el foco del elemento pulsado. Las cargas pendientes respetan el cierre. `composedPath()` evita tratar como exterior el clic de reintento cuyo botón ya fue sustituido. Los grupos anulan el padding global de sección.
- [x] **T-21** (CA-04, CA-05) — Tests nuevos de flujo con `script.js` completo y búsqueda coexistentes, noticias 11/50/51/53 en su página, especie oculta por filtros, repetición del hash, clic fuera/dentro, enlace, Escape y cierre durante búsqueda/reintento. Se actualizó la expectativa antigua de `animals.test.mjs` que exigía ir a Animales y el delimitador de extracción de navegación en `relocation.test.mjs` por la retirada del controlador heredado.
- [x] **T-22** (CA-04, CA-05) — Búsqueda 16/16; especies 32/32; noticias/eventos 18/18; estructura 39/45 con los mismos seis fallos de línea base. Sintaxis de los módulos modificados y `git diff --check` pasan. `/verify`: no hay `apps/web/src/package.json`, sin scripts npm disponibles. Browser QA: «frecuente» mantuvo `scrollY: 0`; clic fuera cerró con `aria-expanded=false`; el enlace abrió `#preguntas`, cerró y enfocó la sección, con su encabezado visible. Padding de grupo `0px`, altura 155 px. Guía actualizada.

## Resaltado y corrección adicional autorizados · 2026-11-18

- [x] **T-23** (CA-04, CA-05) — `js/search-target.js` compartido por las tres páginas marca encabezado de sección/main o tarjeta; reinicia al repetir destino, cancela la marca anterior y limpia a los 2400 ms. CSS pulsa dos veces suavemente; movimiento reducido conserva borde sin animación. Helper 4/4 y llamadas integradas en búsqueda/especies/listados verificadas.
- [x] **T-24** (CA-04) — Submit en fase captura con `preventDefault`/`stopImmediatePropagation`; prueba con manejadores heredados registrados antes y después confirma que no desplazan a Animales. `cancelInitialFocus` evita el enfoque inicial pendiente de una especie anterior. Recursos de navegación y estilos usan `?v=web-012-3` en portada y listados. Una pestaña abierta requiere recarga; no se pudo atribuir el reporte original a caché con certeza.
- [x] **T-25** (CA-04, CA-05) — Búsqueda 19/19; helper 4/4; especies 33/33; noticias/eventos 18/18; galería 37/37. Estructura 39/45, mismos seis fallos previos. Sintaxis y `git diff --check` pasan. Browser en `http://localhost:8080/index.html`: versiones nuevas confirmadas; Enter muestra resultados sin ir a Animales; FAQ abre `#preguntas`, cierra panel y enfoca sección; encabezado con animación `search-target-pulse`, 0,9 s ×2; se elimina y vuelve a activarse al repetir destino. API no respondió durante esta revisión: navegación dinámica se validó con simulación. Guía actualizada.

## Ajuste visual autorizado · 2026-11-18

- [x] **T-26** (CA-02, CA-05) — `top-actions` usa posición estática y capa 3 para que el panel se ancle bajo toda la cabecera y no quede atravesado por el menú. Añadidos título, aviso compacto, reintentos en dos columnas, tarjetas con tipografía/espacios coherentes y fragmentos de dos líneas. Botón de envío con flecha SVG visible. Tokens semánticos; alto limitado con desplazamiento interno; CSS y renderizador versionados `web-012-4`.
- [x] **T-27** (CA-02, CA-05) — `node apps/web/src/tests/search.test.mjs`: 19/19; cubre render, foco, clic exterior y navegación. `node --check` y `git diff --check` pasan. Browser en 360, 390, 768, 1065 y 1366 px: panel bajo la cabecera, dentro del viewport y sin desbordamiento horizontal; aviso y acciones legibles; scroll interno disponible. Se restauró el tamaño original del navegador. `/verify`: sin `apps/web/src/package.json`, no hay scripts npm disponibles. Guía actualizada.

## Evidencia y seguimiento

- Preparación de publicación en `DevOps` (2026-11-18): el ADR local se numera 0031 al sincronizar el remoto, donde 0030 ya pertenece al selector de galería móvil. Se conservan la decisión y aprobaciones originales; spec, plan, tasks, guía e índice enlazan el número definitivo.
- Aprobación de tasks: Jonathan, 2026-11-18.
- Fecha de aprobación: 2026-11-18.
- Dependencias: ADR 0031 Aceptado (2026-11-18); spec y plan aprobados. T-01 precede al código. Implementación inicia únicamente después de aprobar este checklist.
- Verificaciones finales (2026-11-18): búsqueda 19/19, helper 4/4, noticias/eventos 18/18, especies 33/33 y galería 37/37 con `node apps/web/src/tests/<suite>.test.mjs`; estructura 39/45, mismos seis fallos preexistentes. Sintaxis de módulos y `git diff --check` pasan. `/verify`: `apps/web` aún no inicializada por ausencia de `src/package.json`.
