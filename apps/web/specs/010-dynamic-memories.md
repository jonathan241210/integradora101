# 010 · dynamic-memories

- App dueña: `web`
- Apps/paquetes afectados: `web` (dueña de la galería «Momentos para recordar» de `index.html`, su estado de carga, error y vacío, y su estilo); `api` (proveedor: `api-012` para `GET /api/v1/memories`; reglas de publicación y vigencia en `api-010`); `docs/adr/0027-dynamic-public-memories-gallery.md` (excepción de arquitectura de esta galería, Aceptado 2026-11-12). ADR 0024 no se modifica: solo cubre `web-009`.
- Estado: En progreso (2026-11-14: preguntas 5 a 8 resueltas por Jonathan; T-27 registrada; 2026-11-13: rediseño del carrusel aprobado por Jonathan, ver «Enmienda 2026-11-13»; la implementación previa del carrusel queda pendiente de reajuste en tasks; las verificaciones manuales siguen abiertas). Aprobada el 2026-11-12 por Jonathan, responsable de backend. Aprobar no autoriza implementar: la implementación empieza cuando existan plan y tasks aprobados. `api-012` y `api-010` están Aprobadas (2026-11-12); DBR-012 está Lista para backend (aplicada en `arca_pruebas` el 2026-11-11). ADR 0026 y ADR 0027 están Aceptados (2026-11-12).
- Solicitante / responsable funcional: Aksel (decisión del 2026-11-10). Respuestas del responsable: Jonathan (2026-11-10).
- Aprobación funcional: Jonathan (responsable de backend), 2026-11-12. Solicitante original: Aksel.
- Aprobado por: Jonathan (responsable de backend), 2026-11-12.
- Dependencias: `api-012` (Aprobada 2026-11-12) y `api-010` (Aprobada 2026-11-12) en el ambiente; `web-009` (Aprobada, con implementación en curso) por el módulo `js/api.js` y la meta `arca-api-base`. ADR 0027 (Aceptado 2026-11-12) cubre esta galería.

## Problema y contexto

La sección «Momentos para recordar» (`#galeria` en `apps/web/src/index.html`, línea 944 y siguientes) muestra tres botones con fotos fijas (`.foto.f1`, `.f2`, `.f3`) sin contenido real. Cuando el zoológico acepte peticiones de visitantes (`api-010`), la galería debe mostrar esas fotos y sus opiniones desde la API, y no las fotos de muestra.

Esta spec sustituye esas fotos fijas por un listado dinámico que lee `GET /api/v1/memories` (`api-012`). Sigue el mismo modelo que la portada de noticias y eventos de `web-009`: HTML y JavaScript estático, un único módulo de red y texto seguro. Ese modelo se registra para esta galería en ADR 0027, porque ADR 0024 se limita a `web-009`.

Afectados: visitantes del portal (lectura), equipo del portal (mantenimiento) y el zoológico, que ve reflejada en el portal cada foto que acepta en el dashboard (`dashboard-008`) durante su plazo de publicación.

## Decisiones tomadas (2026-11-10)

- **Ruta (P12):** la galería lee `GET /api/v1/memories`, decisión final de `api-012`.
- **Excepción de arquitectura (P10):** la galería se registra en `docs/adr/0027-dynamic-public-memories-gallery.md` (Aceptado 2026-11-12), como ADR nuevo. No se enmienda el ADR 0024.
- La galería muestra solo las peticiones que la API devuelve como aceptadas y vigentes (`api-012`). El portal no decide qué es visible, ni filtra por fecha de vencimiento.
- La galería muestra la imagen y la opinión. No muestra nombre, correo ni apodo del visitante.
- Estados de carga, vacío y error, con botón «Reintentar» en el error (igual que `web-009`).

## Decisiones tomadas (2026-11-12)

Decisiones del usuario (2026-11-12). Cierran la pregunta 1 y amplían el alcance de la galería con un carrusel. No aprueban la spec.

- **Cantidad (pregunta 1):** la galería muestra **hasta 6 momentos** cargados en una sola petición (`GET {base}/memories?limit=6`), sin «Cargar más» (CA-15).
- **Carrusel:** los momentos se presentan en un carrusel con avance automático cada 5 segundos, pausa al pasar el cursor o al enfocar con teclado, y controles anterior y siguiente con nombre accesible (CA-16 a CA-23). Sin visor a pantalla completa, sin zoom y sin miniaturas. Sin librería nueva (RN-11).
- **Botón visible de pausa (pregunta 4, decisión del usuario 2026-11-12, recomendación aceptada):** un botón «Pausar carrusel» / «Reanudar carrusel» con nombre accesible que cambia con el estado, visible solo con 2 o más momentos y avance automático activo (CA-23, RN-13). La pausa manual se mantiene hasta que el visitante reanuda (sin `localStorage`). La pausa por cursor o foco de CA-21 se conserva. WCAG 2.2.2 queda cubierto por este botón y por la regla de movimiento reducido. **Superada por la enmienda del 2026-11-13 (CA-23 retirado; ver pregunta 5).**
- **Movimiento reducido:** sin avance automático si el visitante tiene activa la preferencia de movimiento reducido (CA-20). Con esa preferencia no hay avance, así que tampoco se muestra el botón de pausa (RN-13).
- **Plazo corto:** `api-010` (RN-21, decisión del 2026-11-12) publica cada foto solo **7 días**. La galería puede tener pocos momentos con frecuencia. El vacío, y un solo momento sin controles, son casos normales (RN-12).
- Los textos de vacío y de error, resueltos el 2026-11-12 (pregunta 3), no cambian.

## Enmienda 2026-11-13: rediseño del carrusel

- **Aprobación:** pedido por Jonathan (responsable de backend) y aprobado el 2026-11-13. Esta enmienda reemplaza las decisiones del carrusel del 2026-11-12 donde chocan. No aprueba la spec ni autoriza implementar: la implementación sigue al plan y a las tasks.
- **Sale:** la paginación numérica (1, 2, 3…), el contador de momentos, los botones de texto «Momento anterior» y «Momento siguiente» visibles, y el botón «Pausar carrusel» / «Reanudar carrusel» con sus anuncios. CA-23 queda retirado (se conserva el número) y RN-13 queda retirada.
- **Entra:** fundido cruzado de unos 600 ms (CA-24); dos flechas grandes superpuestas a los lados de la imagen, con nombre accesible «Momento anterior» y «Momento siguiente» (CA-25); acercamiento lento y sutil de la imagen visible (CA-26, sujeto a la pregunta 7); flechas del teclado izquierda y derecha cuando el foco está dentro del carrusel (CA-18).
- **Se mantiene:** avance automático cada 5 s (CA-16); pausa por cursor o foco (CA-21), que pasa a ser la única pausa; un solo momento sin flechas ni avance (CA-17); sin numeración ni contador (CA-27).
- **Movimiento reducido:** sin avance automático, sin fundido y sin acercamiento; las flechas siguen funcionando (CA-20, RN-15).
- **Anuncios:** los cambios automáticos no se anuncian (CA-27). Un cambio pedido por el visitante se anuncia como «Momento {n} de {total}» en un elemento visualmente oculto para lectores de pantalla (pregunta 8).
- **Sin cambios de texto:** CA-01 a CA-07, CA-09 a CA-12, CA-14, CA-15 y CA-22. La petición (`limit=6`), los estados y los datos no cambian: `api-012` y `js/api.js` no se tocan.
- **Coordinación:** `web-011` no tiene carrusel en `#animales` (su CA-18); no hay conflicto con esta enmienda, que solo afecta a `#galeria`.
- **ADR 0027:** no se modifica. Su punto 7 nombra el botón visible de pausa, que esta enmienda retira (pregunta 6).
- **Bloqueos:** CA-26 y la tarea T-21 esperan a la pregunta 7. El resto del rediseño puede implementarse; las preguntas 5 y 6 se resuelven antes de la revisión de accesibilidad (T-27). **Resueltas el 2026-11-14** (preguntas 5 a 8 de la enmienda): CA-26 y T-21 quedan desbloqueados.

## Objetivos

- Sustituir las tres fotos fijas de `#galeria` por las peticiones aceptadas y vigentes que devuelve la API.
- Mostrar cada foto completa y centrada, con su opinión como texto.
- Presentar hasta seis momentos en un carrusel accesible por teclado y lector de pantalla, con avance automático, fundido cruzado, flechas, pausa por cursor o foco y sin animaciones con movimiento reducido (CA-15 a CA-27).
- Mostrar estados de carga, vacío y error en español, sin fotos de muestra.
- Mantener el portal sin dependencias nuevas ni build (ADR 0024 y ADR 0027).

## Fuera de alcance

- Página propia de «Momentos» con URL, paginación («Cargar más») o filtros. Solo la galería de la portada.
- Visor a pantalla completa, zoom interactivo o galería con miniaturas. El carrusel sí está en alcance desde el 2026-11-12 (CA-15 a CA-27). El acercamiento automático sutil de CA-26 no es un zoom interactivo.
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
- **CA-08 (imagen completa y centrada):** Dada una foto de la galería, cuando se muestra, entonces se ve completa (`object-fit: contain`), centrada dentro de una caja de proporción fija, sin ampliarse por encima de su tamaño natural y sin efecto de zoom al pasar el cursor. El fondo de la caja usa el token `--surface-subtle`. El marcador de CA-07 usa la misma caja y regla. Enmienda 2026-11-13: la única excepción a «sin ampliarse» es el acercamiento de CA-26, que no recorta la foto y se rige por la pregunta 7.
- **CA-09 (módulo de red):** Dado el código de la galería, cuando se revisa, entonces la lectura de la API ocurre solo en `js/api.js`, que añade la función de lectura de momentos con `credentials: 'omit'`, `Accept: application/json`, tiempo máximo de 10 segundos y base URL de `<meta name="arca-api-base">`. El módulo de la galería no llama a `fetch`.
- **CA-10 (accesibilidad y adaptación):** Dada la portada, cuando se usa a 360, 390, 768, 1024 y 1366 px, entonces no hay desbordamiento horizontal, las fotos no superan el ancho de su contenedor, el botón «Reintentar» tiene foco visible, el encabezado de la sección se mantiene como `h2` y cada momento no lleva encabezado propio (no tiene título en esta versión). El texto de estado se anuncia con `role="status"`.
- **CA-11 (no regresión):** Dada `index.html` después del cambio, cuando se carga, entonces conserva los identificadores y las secciones existentes, el enlace «Descubre los animales» de la cabecera de la galería, y las referencias a `script.js`, `animations.js` y `accessibility.js`. Las pruebas estructurales de `relocation.test.mjs` siguen en verde o sus fallos previos quedan registrados sin atribuirlos a este cambio.
- **CA-12 (configuración):** Dada la página `index.html`, cuando se revisa, entonces usa la misma `<meta name="arca-api-base">` que las demás páginas de `web-009` (CA-16). La galería no define otra base de API.
- **CA-13 (cobertura de pruebas):** Dada la suite `node --test` del portal, cuando se ejecuta, entonces existe al menos un test que nombra cada CA vigente (CA-01 a CA-22 y CA-24 a CA-27; CA-23 retirado, nombrado solo en su test de retirada) sin dependencias nuevas. Los tests del carrusel (CA-15 a CA-27) usan el mismo runner y el DOM simulado de `web-009`.
- **CA-14 (condiciones de ADR 0027):** Dada la galería, cuando se revisa, entonces no hay `package.json`, build, paquetes ni scripts de terceros añadidos por esta spec; no se usan cookies, `localStorage`, `sessionStorage` ni credenciales; y las URLs de imagen se validan según RN-04. Cumple las condiciones de `docs/adr/0027-dynamic-public-memories-gallery.md`. Se comprueba con una prueba estática.
- **CA-15 (cantidad, una petición):** Dada la portada con la API disponible, cuando se carga la galería, entonces se hace una sola petición `GET {base}/memories?limit=6`, sin paginación ni «Cargar más». Con 6 o más momentos en la respuesta, se muestran los 6 primeros en el orden de la API. Con 1 a 5, se muestran esos. Con 0, se muestra el estado de CA-03. Se comprueba con una prueba que simula la respuesta de la API.
- **CA-16 (avance automático; enmendado 2026-11-13):** Dado un carrusel con 2 a 6 momentos y sin preferencia de movimiento reducido, cuando se muestra, entonces cambia al momento siguiente cada 5 segundos con el fundido de CA-24 y, desde el último, vuelve al primero. El avance se detiene mientras el cursor o el foco esté dentro del carrusel (CA-21). Cada cambio muestra un momento completo (imagen y opinión juntas).
- **CA-17 (un solo momento; enmendado 2026-11-13):** Dado un único momento, cuando se muestra, entonces se ve sin flechas anterior y siguiente y sin avance automático. Con 2 a 6 momentos se aplican CA-18 y CA-19, CA-24 a CA-26 y, con avance automático, CA-16.
- **CA-18 (flechas; enmendado 2026-11-13):** Dado un carrusel con 2 a 6 momentos, cuando se muestra, entonces tiene dos flechas, «Momento anterior» (izquierda) y «Momento siguiente» (derecha), con esos nombres accesibles (CA-25). No hay paginación numérica, indicadores ni contador (CA-27). Pulsar una flecha cambia el momento y no mueve el foco. Las flechas izquierda y derecha del teclado cambian el momento cuando el foco está dentro del carrusel; ese cambio tampoco mueve el foco.
- **CA-19 (teclado y lector de pantalla):** Dado el carrusel, cuando se usa solo con teclado, entonces Tab recorre «Momento anterior» y «Momento siguiente» en ese orden (CA-25); Intro y Espacio activan el control, todos tienen foco visible (CA-10) y el carrusel no atrapa el foco. Con lector de pantalla, el contenedor se anuncia como «Momentos para recordar» con su posición actual, y cada momento se anuncia con su imagen (CA-07) y su opinión. Los cambios automáticos no mueven el foco ni se anuncian (CA-27).
- **CA-20 (movimiento reducido; enmendado 2026-11-13):** Dado un visitante con la preferencia de movimiento reducido del sistema activa, cuando se muestra un carrusel de 2 a 6 momentos, entonces no hay avance automático, ni fundido (CA-24) ni acercamiento (CA-26), el cambio de momento es inmediato y las flechas de CA-18 siguen funcionando. Se comprueba con una prueba que simula la preferencia.
- **CA-21 (pausa por cursor o foco; enmendado 2026-11-13):** Dado un carrusel con avance automático, cuando el cursor pasa por encima o cuando el foco de teclado está dentro del carrusel, entonces el avance se detiene; al salir el cursor o perder el foco, se reanuda. No hay botón de pausa (CA-23 retirado).
- **CA-22 (sin librerías y sin estados nuevos):** Dado el código del carrusel, cuando se revisa, entonces no hay librerías, `package.json`, build ni scripts de terceros añadidos (RN-11); no se usa `localStorage` ni `sessionStorage` para la posición; y los estados de carga, vacío y error de CA-02 a CA-04 no cambian. Se comprueba con una prueba estática.
- **CA-23 (botón de pausa): retirado (2026-11-13).** La enmienda del 2026-11-13, pedida por Jonathan, retira el botón de pausa. No hay botón «Pausar carrusel» ni «Reanudar carrusel», ni los anuncios «Carrusel en pausa.» o «Carrusel reanudado.». El número se conserva para no renumerar. La pausa solo ocurre por cursor o foco (CA-21). Verificación: prueba estática de que no existen esos textos ni `#memPause` (CA-27).

- **CA-24 (fundido cruzado; nuevo 2026-11-13):** Dado un cambio de momento (automático o pedido por el visitante), cuando ocurre, entonces el momento que sale se desvanece y el que entra aparece con un fundido cruzado de unos 600 ms (transición de opacidad de 600 ms). Ningún cambio desplaza la imagen lateralmente. Con movimiento reducido no hay fundido (CA-20). Verificación: prueba de CSS con la duración y prueba del módulo con el DOM simulado.

- **CA-25 (flechas grandes superpuestas; nuevo 2026-11-13):** Dado un carrusel con 2 a 6 momentos, cuando se muestra, entonces hay dos flechas superpuestas a los lados de la imagen, dentro de la caja de la foto y sin ocupar una fila propia. Cada flecha tiene un área de pulsación de al menos 44 × 44 px (tamaño propuesto, a confirmar en la revisión manual T-15) y se muestra solo con icono, sin texto visible. Su nombre accesible es «Momento anterior» (izquierda) y «Momento siguiente» (derecha), en `aria-label`. Tienen foco visible (CA-10). Verificación: prueba estática de marcado y CSS, y prueba del módulo con los nombres.

- **CA-26 (acercamiento sutil; nuevo 2026-11-13; sujeto a la pregunta 7):** Dada la imagen visible de un momento, cuando se muestra durante su ciclo de 5 segundos, entonces se acerca de forma lenta y sutil (efecto Ken Burns) desde una escala inicial a una final, sin recortar la foto y sin superar su tamaño contenido. Propuesta: de 0,96 a 1,00 durante el ciclo. Con movimiento reducido no hay acercamiento (CA-20). Pregunta 7 resuelta (2026-11-14): CA-26 se implementa con la magnitud propuesta (0,96 a 1,00), que no recorta la foto. Verificación: prueba de CSS con la escala inicial y final, y prueba de la preferencia.

- **CA-27 (sin numeración, sin contador y anuncios; nuevo 2026-11-13):** Dado el carrusel, cuando se revisa, entonces no hay numeración de momentos (1, 2, 3…), indicadores, contador de momentos ni botón de pausa. La región conserva su nombre accesible «Momentos para recordar» y cada momento su etiqueta «Momento {n} de {total}» (CA-19). El avance automático no escribe en `#memAnnounce` y no mueve el foco. Un cambio pedido por el visitante (flecha o teclado) escribe «Momento {n} de {total}» en `#memAnnounce`, un elemento visualmente oculto solo para lectores de pantalla (propuesta, pregunta 8). Verificación: prueba estática de marcado y prueba del módulo con temporizador simulado.

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
- **RN-11 (carrusel sin dependencias):** El carrusel usa solo el JavaScript clásico del portal y los estilos propios de la galería. No añade librerías de carrusel, build, paquetes ni scripts de terceros (RN-05; ADR 0027, condición 2). No guarda la posición en el navegador (RN-03).
- **RN-12 (pocos momentos):** La galería no rellena huecos ni inventa contenido para llegar a seis. Con un solo momento se muestra sin controles (CA-17); con ninguno, el estado de vacío (CA-03). Es el comportamiento esperado con el plazo de 7 días (`api-010` RN-21).
- **RN-13 (botón de pausa): retirada (2026-11-13).** Ya no aplica: no hay botón de pausa (CA-23 retirado).
- **RN-14 (sin numeración ni contador; nuevo 2026-11-13):** el carrusel no muestra números de posición, indicadores ni contador (CA-27). Los controles son flechas (CA-25).
- **RN-15 (movimiento reducido sin animaciones; nuevo 2026-11-13):** con preferencia de movimiento reducido no hay avance automático, fundido ni acercamiento (CA-20, CA-24, CA-26).

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
  - **ADR 0027 (Aceptado 2026-11-12):** excepción de arquitectura para la galería dinámica. Confirmada por Jonathan, 2026-11-12, incluida la enmienda de alcance del carrusel y el botón de pausa. **Enmienda 2026-11-13:** el punto 7 del ADR nombra el botón visible de pausa, que esta enmienda retira; el ADR no se modifica (pregunta 6). Sin aprobación, la galería no se implementa con HTML y JavaScript estático, porque el portal debe seguir `apps/web/AGENTS.md`.
  - `api-013` (Aprobada 2026-11-12) y ADR 0026 (Aceptado 2026-11-12): `image_url` sale de `MEDIA_PUBLIC_URL` o de `APP_URL` más `/media`, y puede ser `http` o `https` (`api-013` RN-04). Ver «Nota de almacenamiento».
  - No hay dependencias nuevas.
- **Riesgos:**
  - Opinión con datos personales que se publicaría al aceptar (`api-010` riesgos). La revisión manual es la barrera.
  - Una galería vacía al principio: el zoológico debe aceptar peticiones antes de que se vea contenido. El texto de vacío lo cubre (CA-03).
  - Plazo de 7 días (`api-010` RN-21, decisión del 2026-11-12): la galería tendrá pocos momentos con frecuencia. Un solo momento o ninguno son casos normales; la galería no rellena huecos (RN-12).
  - Carrusel con avance automático: puede distraer o molestar a quien lee. Se mitiga con la pausa por cursor o foco (CA-21), el movimiento reducido (CA-20) y las flechas (CA-18, CA-25). **Enmienda 2026-11-13:** sin botón de pausa, WCAG 2.2.2 (contenido que se mueve solo y dura más de 5 segundos) no tiene un mecanismo de control explícito para quien no usa ratón ni teclado dentro del carrusel; la pregunta 5 lo sometió a decisión, resuelta el 2026-11-14 (cobertura por cursor, foco y movimiento reducido, sin botón).
  - Si la API no responde, la portada muestra el error y no fotos de muestra.
  - Imágenes grandes: el navegador las carga con `lazy`; el coste se revisa en la verificación manual.
  - Retirada tardía: una foto retirada del dashboard antes de su vencimiento puede seguir visible hasta que se recargue la galería o la caché del navegador caduque (`api-010` pregunta 1).
  - Alcance que crece: si la galería necesita paginación, filtros o una página propia, se reevalúa el ADR 0027 (su sección «Reevaluación»).
- **Preguntas pendientes:**
  1. ¿Cuántos momentos muestra la galería? Propuesta: 6, en una sola tanda y sin «Cargar más». **Resuelta, decisión del usuario 2026-11-12:** hasta 6 momentos en una sola petición, sin «Cargar más», presentados en un carrusel (CA-15 a CA-23).
  2. Resuelta por el responsable (2026-11-10): la excepción de arquitectura se registra en ADR 0027, no como enmienda del 0024.
  3. ¿El texto del marcador de vacío y del error es el propuesto? Propuesta: «Aún no hay momentos publicados.» y «No pudimos cargar los momentos. Inténtalo más tarde.». **Resuelta, decisión del usuario 2026-11-12:** se usan esos dos textos, tal como están en CA-03 y CA-04.
4. ¿Se añade un botón visible «Pausar» / «Reanudar» junto a los controles del carrusel? Motivo: la pausa al pasar el cursor o al enfocar con teclado no basta para quien no usa cursor ni teclado y necesita detener el movimiento; WCAG 2.2.2 pide un mecanismo para detener el contenido que se mueve solo y dura más de 5 segundos. **Resuelta, decisión del usuario 2026-11-12 (recomendación aceptada):** sí, un botón visible «Pausar carrusel» / «Reanudar carrusel» con nombre accesible y anuncio de estado (CA-23, RN-13). Cubre WCAG 2.2.2 para el carrusel.

  5. **WCAG 2.2.2 sin botón de pausa (2026-11-13).** Sin botón, el mecanismo para detener el movimiento queda en la pausa por cursor o foco (CA-21) y en la preferencia de movimiento reducido (CA-20). Eso no alcanza a quien usa el carrusel sin ratón y sin foco dentro, ni a quien no tiene activa la preferencia del sistema. ¿Se acepta esa cobertura, o se reabre un control de pausa? Afecta a la revisión de accesibilidad (T-27). **Respuesta (2026-11-14, Jonathan, adoptando las recomendaciones): se acepta.** Sin botón de pausa; la cobertura queda en la pausa por cursor o foco (CA-21) y en el movimiento reducido (CA-20). No se reabre ningún control de pausa.
  6. **ADR 0027, punto 7 (2026-11-13).** El punto 7 y su enmienda del 2026-11-12 describen el carrusel «con un botón visible de pausa». La enmienda del 2026-11-13 lo retira. El ADR no se ha modificado. ¿Se enmienda el texto del punto 7 (sin cambiar sus condiciones 1 a 7), o se deja anotada la divergencia? **Respuesta (2026-11-14): se deja anotada la divergencia** en `docs/adr/0027-dynamic-public-memories-gallery.md` con una nota de enmienda fechada 2026-11-14 que retira el botón visible de pausa y describe el sustituto. Las condiciones 1 a 7 no cambian y el texto del punto 7 no se reescribe.
  7. **Acercamiento sutil y recorte (2026-11-13).** CA-08 y RN-09 piden que la foto se vea completa y sin ampliarse por encima de su tamaño natural; la decisión del 2026-11-12 dice «sin zoom». Un acercamiento que supere el tamaño contenido recorta los bordes de la foto. Propuesta: escala de 0,96 a 1,00 durante el ciclo (CA-26), que nunca recorta ni amplía por encima del tamaño contenido. ¿Se acepta, o se prefiere otra magnitud? Otra magnitud exigiría enmendar CA-08 y RN-09. Bloquea CA-26 y la tarea T-21. **Respuesta (2026-11-14, Jonathan): se acepta** la escala de 0,96 a 1,00 durante el ciclo, sin recorte; es compatible con CA-08 y RN-09. Desbloquea T-21 y CA-26.
  8. **Anuncio de cambios pedidos por el visitante (2026-11-13).** Propuesta: al pulsar una flecha o usar el teclado, `#memAnnounce` anuncia «Momento {n} de {total}», visualmente oculto; los cambios automáticos no se anuncian (CA-27). ¿Se acepta, o la región no debe anunciar la posición? Afecta a CA-19 y CA-27. **Respuesta (2026-11-14, Jonathan): se acepta.** Un cambio pedido por el visitante anuncia «Momento {n} de {total}» en `#memAnnounce`, visualmente oculto; los cambios automáticos no anuncian nada. Nada visible indica la cantidad de momentos.

Estado de las preguntas (2026-11-12): la pregunta 1 queda resuelta por el usuario el mismo día (cantidad y carrusel). La pregunta 4 queda resuelta el mismo día (botón de pausa, CA-23). Desde la enmienda del 2026-11-13 las preguntas 5 a 8 estaban abiertas y quedan resueltas el 2026-11-14; la aprobación funcional de 2026-11-12 sigue registrada (ver «Revisión»).

## Nota de almacenamiento (2026-11-10)

Decisión del responsable, aprobada con esta spec por Jonathan el 2026-11-12.

- **CA-07 (imagen):** `image_url` de un momento aceptado sale de la carpeta versionada de la API (`/media/memories/...`), y puede ser `http` o `https` según `APP_URL` o `MEDIA_PUBLIC_URL` (`api-013` RN-04). Por la decisión del responsable (`api-013` D-02), los momentos pendientes y rechazados no tienen `image_url` en ninguna respuesta, así que la galería nunca los recibe. Si la API devuelve `null` porque no hay imagen, o porque el archivo no ha llegado todavía con `pull`, el marcador de CA-07 se mantiene.
- **Sin cambios de código por esta spec por la parte de almacenamiento.** La galería no necesita CORS para `<img>` (`api-013` RN-12). No se añade ninguna llamada nueva al almacenamiento.
- **Dependencia de ADR:** la galería depende de ADR 0027 (Aceptado 2026-11-12), no de una enmienda al ADR 0024.
- **Otras specs con la frase «APP_URL, storage:link y disco persistente»:** `apps/web/specs/009-dynamic-news-events.md` (línea 204) describe el checklist actual, válido para el valor por defecto. Se revisará cuando se apruebe `api-013`, porque la carpeta `media/` añade `PUBLIC_MEDIA_DISK=media` y el enlace `public/media`.

## Revisión

- Aprobadores y fecha: Jonathan (responsable de backend), 2026-11-12. Solicitante original: Aksel.
- Aprobado por: Jonathan (responsable de backend), 2026-11-12.
- Estado: Aprobada (2026-11-12). Aprobar no autoriza implementar: la implementación empieza cuando existan plan y tasks aprobados. Confirmado por el usuario el 2026-11-12: RN-13 (el botón de pausa no aparece si no hay nada que pausar), los textos de anuncio «Carrusel en pausa.» y «Carrusel reanudado.» (CA-23) y el rango de 2 a 6 momentos (CA-16 a CA-20). Sin preguntas abiertas.
- Historial: 2026-11-12: pregunta 3 resuelta por el usuario (textos de vacío y error de CA-03 y CA-04). 2026-11-12, mismo día: pregunta 1 resuelta por el usuario (hasta 6 momentos en carrusel, CA-15 a CA-22). Su plazo de publicación pasa a 7 días en `api-010`. Nueva pregunta 4 (botón de pausa). Estado sin cambios (Borrador); esta decisión no aprueba la spec. 2026-11-12, decisión del usuario («acepto las recomendaciones»): pregunta 4 resuelta con botón visible de pausa (CA-23, RN-13); CA-16 a CA-21 ajustados a la pausa manual; CA-13 cubre CA-01 a CA-23; WCAG 2.2.2 queda cubierto. Corrección de redacción: los rangos «2 a 5 momentos» de CA-16 a CA-20 pasan a «2 a 6» para cubrir el máximo de seis de CA-15 y la excepción de ADR 0027 (punto 7). Estado sin cambios (Borrador); esta decisión no aprueba la spec.
- Enmienda 2026-11-13: rediseño del carrusel pedido por Jonathan (responsable de backend) y aprobado el mismo día. CA cambiados: CA-08, CA-13, CA-16, CA-17, CA-18, CA-19, CA-20 y CA-21. CA-23 retirado (número conservado). CA nuevos: CA-24 a CA-27. RN-13 retirada; RN-14 y RN-15 nuevas. Sin cambio de texto: CA-01 a CA-07, CA-09 a CA-12, CA-14, CA-15 y CA-22. Preguntas 5 a 8 abiertas en la enmienda; resueltas el 2026-11-14 por Jonathan (responsable de backend), adoptando las recomendaciones: 5 (se acepta la cobertura sin botón de pausa), 6 (divergencia anotada en ADR 0027), 7 (escala de 0,96 a 1,00 sin recorte), 8 (anuncio solo tras cambio del visitante). Desbloquea T-21 y la parte de anuncio de T-23; T-27 queda registrada. Estado de la spec: En progreso.
- Evidencia/enlaces: `apps/web/src/index.html` (sección `#galeria`, líneas 944 y siguientes), `apps/web/specs/009-dynamic-news-events.md` (módulo de red, estados y escapado), `apps/api/specs/012-public-memories-read.md`, `apps/api/specs/010-visitor-memory-requests.md`, `apps/dashboard/specs/008-memory-moderation.md`, `docs/adr/0024-web-static-portal-exception.md`, `docs/adr/0027-dynamic-public-memories-gallery.md`.
