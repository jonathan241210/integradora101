# 011 · dynamic-tulanpedia

- App dueña: `web`
- Apps/paquetes afectados: `web` (dueña de la sección TulanPedia de `index.html` (`#animales`), sus estados de carga, error y vacío, sus filtros y su estilo); `api` (proveedor: lectura pública de especies publicadas, `api-015`, Borrador; `api-006` no cambia); `dashboard` (origen de la publicación, `dashboard-010`; sin cambios en esta spec); `pwa` (origen de las solicitudes, `pwa-005`; sin cambios); `docs/adr/0028-dynamic-tulanpedia-catalog.md` (excepción de arquitectura de esta sección, Propuesto). ADR 0024 y ADR 0027 no se modifican.
- Estado: Borrador
- Solicitante / responsable funcional: veterinario (solicitud de publicar especies, 2026-11-11); responsable funcional del catálogo: por designar.
- Aprobación funcional: pendiente.
- Aprobado por: (pendiente).
- Dependencias: `api-015` (Borrador; lectura pública de especies publicadas, `GET /api/v1/published-species`); `dashboard-010` (Borrador; publicación de solicitudes); `web-010` (Borrador; patrón de galería dinámica); ADR 0028 (Propuesto; debe aprobarse antes de aprobar esta spec); ADR 0024 (Aceptado; no se modifica) y ADR 0027 (Propuesto; no se modifica).

## Problema y contexto

La sección TulanPedia (`#animales` en `apps/web/src/index.html`) muestra cuatro fichas fijas de muestra (león, jirafa, guacamaya y tortuga) con datos de ejemplo. El propio portal lo avisa con una nota «Fichas de muestra: confirma en el zoológico los datos de ejemplares, edades y recintos.». El visitante ve especies que no se han publicado en el catálogo.

Con `dashboard-010` y `pwa-005`, el veterinario propone especies y la Dirección (`zoo-admin`) las publica o las rechaza. La sección debe mostrar solo las especies publicadas, desde la API, y sustituir las fichas de muestra.

Esta spec sigue el mismo modelo que `web-010` (galería dinámica): HTML y JavaScript estático, un único módulo de red, texto seguro y sin build. Ese modelo se registra para esta sección en ADR 0028, que extiende la excepción de ADR 0024 sin modificarlo, igual que ADR 0027.

Afectados: visitantes del portal (lectura), equipo del portal (mantenimiento) y el zoológico, que ve reflejada en TulanPedia cada especie que publica.

## Decisiones tomadas (2026-11-11)

- La sección lee solo especies publicadas desde la API pública, en `GET {base}/published-species` (ruta de `api-015`). `api-006` no se modifica. El portal no decide qué es visible ni en qué orden.
- Las fichas de muestra y la nota «Fichas de muestra» se retiran de `index.html`.
- Los filtros por especie y por hábitat, el botón «Limpiar filtros» y el contador de resultados se conservan, y se añade el filtro «Tipo de animal» (2026-11-11).
- **Filtro «Hábitat»:** se arma con los valores distintos de `habitat` de las especies publicadas (texto libre normalizado, CA-04 y RN-11).
- **Filtro «Especie»:** se arma con `common_name` de las especies publicadas.
- **Filtro «Tipo de animal» (2026-11-11):** se arma con los valores distintos de `category` que trae la respuesta de `api-015` (lista cerrada de DBR-004), con etiquetas en español (Mamífero, Ave, Reptil, Anfibio, Pez, Invertebrado). Va junto a «Especie» y «Hábitat» (CA-03, CA-04, CA-22). La solicitud captura `category` desde el 2026-11-11 (DBR-013 pregunta 10, resuelta).
- El orden de las secciones de `index.html` no cambia: `#animales` sigue antes de `#mapa`.
- **Vacío (2026-11-11):** sin especies publicadas se muestra «Aún no hay especies publicadas.» y se ocultan los filtros y el contador (CA-06, CA-20, RN-13).
- **Campos de la ficha (2026-11-11):** la tarjeta muestra nombre común y foto siempre, y los demás campos solo si la API los trae porque la Dirección los marcó (`api-014` RN-13; CA-19, RN-12). Por defecto, «Nombre científico», «Origen» y «Hábitat» vienen marcados.
- **Filtro «Hábitat» (2026-11-11):** se oculta si ninguna especie trae `habitat` (CA-21).
- **Modelo 3D de la jirafa (2026-11-11): se retira** con su ficha. Se quitan la tarjeta de la jirafa y el código de tarjetas con `data-model` (CA-12, CA-18). El visor del mapa (`assets/Mapa.glb`) no es de esta sección y no cambia.
- **Introducción (2026-11-11, decisión del usuario):** la frase de introducción de `#animales` describe los filtros reales (Tipo de animal, Especie y Hábitat) y no promete búsqueda por nombre ni campos que la API no trae. No se añade campo de búsqueda. Texto exacto en CA-23.
- **Despublicadas fuera del portal (2026-11-12):** una especie despublicada, con publicación eliminada o con una solicitud `update` viva no aparece en TulanPedia (CA-24; `api-015` CA-18).
- Fuera de alcance: carrusel y cualquier visor 3D nuevo.
- Excepción de arquitectura: ADR 0028 (Propuesto).
- **Meta de la API (pregunta 8, resuelta):** `<meta name="arca-api-base">` apunta a la API (`http://localhost:8000/api/v1` en desarrollo). `http://localhost:8080` es el origen del portal y debe estar en `CORS_ALLOWED_ORIGINS`. No es una divergencia.

## Objetivos

- Sustituir las cuatro fichas de muestra de `#animales` por las especies publicadas que devuelve la API.
- Conservar los filtros de especie y hábitat, y añadir el de tipo de animal, sobre la lista recibida, con opciones tomadas de esa lista.
- Mostrar estados de carga, vacío y error en español, sin fichas de muestra.
- Mostrar cada foto completa y centrada, y cada dato como texto seguro.
- Mantener el portal sin dependencias nuevas ni build (ADR 0024, ADR 0027 y ADR 0028).

## Fuera de alcance

- Modelo 3D: se retira de TulanPedia (CA-12, CA-18). El visor del mapa queda fuera de esta spec.
- Carrusel o galería de fotos de la especie.
- Página propia de cada especie (URL por especie) o detalle expandible salvo que se apruebe la pregunta 2.
- Búsqueda por texto y campo de búsqueda (ver pregunta 3).
- Animales individuales, recintos o estado de salud (`pwa`, `api`).
- Momentos, noticias y eventos: sin cambios en esta spec.
- Cambios en `apps/web/src/styles.css` (los estilos nuevos van en un archivo propio).
- Caché persistente en el navegador (`localStorage`, `IndexedDB`).
- Cualquier escritura en la API.
- Pagos (`Payments`).

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Visitante del portal | Ver las especies publicadas y filtrarlas | Ninguno; contenido público |
| Visitante con lector de pantalla | Recibir los estados de carga, vacío y error, y el resultado del filtro | Ninguno |
| Equipo del portal | Mantener el módulo y la configuración de la API | Acceso al repositorio |
| Zoológico (publicación) | Publicar especies en el dashboard | `species.review` (`dashboard-010`); no cambia en esta spec |

## Historias de usuario

- Como visitante, quiero ver las especies que el zoológico tiene en su catálogo, para conocerlas antes de mi visita.
- Como visitante, quiero filtrar las especies por hábitat y por especie, para encontrar la que me interesa.
- Como visitante, quiero que la foto de cada especie se vea completa, para reconocerla tal como se publicó.
- Como visitante con lector de pantalla, quiero que el portal me avise si la sección se está cargando, si no hay especies o si hubo un error.

## Criterios de aceptación

- **CA-01 (especies publicadas):** Dada la portada con la API pública disponible, cuando termina la carga de `#animales`, entonces muestra una tarjeta por cada especie que devuelve `GET {base}/published-species` (`api-015` CA-01), en el orden de la respuesta. Cada tarjeta muestra nombre común y foto siempre, y los demás campos solo si la respuesta los trae (CA-19). No hay tarjetas fijas en el HTML. La prueba comprueba la forma de la respuesta y el orden recibido. La verificación de contrato depende de la aprobación de `api-015`.
- **CA-02 (no aparecen las no publicadas):** Dado que la API devuelve solo especies publicadas (`api-015` CA-01), cuando la sección se renderiza, entonces el portal no filtra ni completa datos: muestra exactamente lo que recibe. Verificación: prueba del módulo con respuesta simulada.
- **CA-03 (filtros):** Dada la sección con especies, cuando el visitante cambia el filtro «Especie», el filtro «Hábitat», el filtro «Tipo de animal» o pulsa «Limpiar filtros», entonces solo se muestran las tarjetas que cumplen los filtros, el contador `#animalCount` (`aria-live="polite"`) indica cuántas hay («1 especie encontrada» o «N especies encontradas») y «Limpiar filtros» restablece los tres filtros. El filtro se hace sobre la lista recibida, sin nueva petición. «Especie» coincide con el `common_name` elegido; «Hábitat» coincide con el valor normalizado de CA-04; «Tipo de animal» coincide con la `category` elegida.
- **CA-04 (opciones de filtro derivadas):** Las opciones se generan a partir de la respuesta, sin valores fijos en el HTML (la lista fija «Sabana», «Bosque», «Aviario» y «Reptilario» se retira):
  - «Especie»: un valor por cada `common_name` distinto, ordenado alfabéticamente, con «Todas las especies» primero.
  - «Hábitat»: un valor por cada `habitat` distinto después de normalizarlo (quitar espacios al inicio y al final; comparar sin distinguir mayúsculas; se muestra la primera forma recibida), ordenado alfabéticamente, con «Todos los hábitats» primero. Los valores `null` o vacíos no generan opción.
  - Una especie sin hábitat no aparece al filtrar por hábitat, pero sí en «Todas» y en su propia opción de «Especie». Si ninguna especie trae `habitat`, el filtro «Hábitat» se oculta (CA-21).
  - «Tipo de animal»: un valor por cada `category` distinta presente en la respuesta, con la etiqueta en español de RN-11, ordenado alfabéticamente por etiqueta, con «Todos los tipos» primero. Los valores `null` no generan opción. Una especie sin `category` aparece en «Todas» y en su propia opción de «Especie», pero no al filtrar por tipo. Las reglas de vacío y de una sola opción están en CA-22.
  - Los atributos `data-species` y `data-habitat` de las opciones actuales de `index.html` se sustituyen por los datos de la API; no quedan valores fijos en el HTML.
- **CA-05 (carga):** Dada una petición en curso, cuando la sección está cargando, entonces muestra «Cargando especies…» en un elemento con `role="status"`, y el contenedor `#animalGrid` tiene `aria-busy="true"` hasta que termina.
- **CA-06 (vacío):** Dada una respuesta `200` con `data: []`, cuando se renderiza, entonces muestra «Aún no hay especies publicadas.» sin tarjetas. Los filtros y el contador se ocultan mientras no hay especies (decisión del usuario 2026-11-11; CA-20). Este mismo estado aparece antes de que se publique la primera especie.
- **CA-07 (error y reintento):** Dada una petición fallida (red, respuesta distinta de `2xx`, JSON no válido o `data` ausente), cuando se renderiza, entonces muestra «No pudimos cargar las especies. Inténtalo más tarde.» en un elemento con `role="status"` y un botón «Reintentar». «Reintentar» vuelve a pedir la lista con los mismos parámetros, muestra el estado de carga, mueve el foco al estado de carga y después al contenido o, si vuelve a fallar, al botón. No muestra fichas de muestra ni datos anteriores.
- **CA-08 (fichas de muestra retiradas):** Dado `index.html` después del cambio, cuando se revisa, entonces no contiene las cuatro `article.animal-card` de muestra (león, jirafa, guacamaya, tortuga), ni el `<p class="demo-note">` «Fichas de muestra…», ni los `<p class="model-note">` de las fichas de muestra, ni `data-model` ni referencias a `.glb` dentro de `#animales`. Se comprueba con una prueba estática.
- **CA-09 (imagen completa y respaldo):** Dada una especie con foto (`image_url` de la API), cuando se renderiza, entonces la imagen usa `loading="lazy"`, `decoding="async"`, `alt` con el nombre común y se ve completa y centrada dentro de una caja de proporción fija (`object-fit: contain`, fondo `--surface-subtle`, sin ampliación al pasar el cursor). Si `image_url` es `null`, usa un esquema distinto de `http:` o `https:` (por ejemplo `javascript:` o `data:`), o la imagen falla al cargar, entonces muestra un marcador decorativo (`aria-hidden="true"`) con la misma caja, sin hueco vacío.
- **CA-10 (módulo de red):** Dado el código de TulanPedia, cuando se revisa, entonces la lectura de la API ocurre solo en `js/api.js`, que añade la función `getSpecies()` (llama a `published-species`) con `credentials: 'omit'`, `Accept: application/json`, tiempo máximo de 10 segundos y base URL de `<meta name="arca-api-base">`. El módulo de TulanPedia no llama a `fetch`.
- **CA-11 (texto seguro):** Dado un nombre común, científico, origen, hábitat o URL que contiene HTML (por ejemplo `<img src=x onerror=alert(1)>`), cuando se renderiza, entonces se muestra como texto literal. Ningún módulo de TulanPedia usa `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write` ni `eval` con datos de la API. Se comprueba con una prueba estática.
- **CA-12 (no regresión de `index.html` y scripts):** Dado `index.html` después del cambio, cuando se carga, entonces conserva los identificadores de la sección (`animales`, `speciesFilter`, `habitatFilter`, `clearFilters`, `animalCount`, `animalGrid`, `noAnimals`), las secciones existentes y sus identificadores, y las referencias a `script.js`, `animations.js`, `accessibility.js`, `js/api.js` y `js/animals.js`. El código de `script.js` que filtra `.animal-card` se adapta para trabajar con las tarjetas renderizadas o se reemplaza por el módulo nuevo, sin errores de consola sin tarjetas de muestra. El bloque de `index.html` que activa el visor de tarjetas (`.animal-card[data-model]`) se elimina, porque ya no tiene tarjetas que lo activen. El visor del mapa (`#mapModelToggle`) no cambia.
- **CA-13 (orden de secciones):** Dado `index.html` después del cambio, cuando se recorren las secciones de la página, entonces el orden de los identificadores de sección es el mismo que antes del cambio; `#animales` aparece antes de `#mapa`.
- **CA-14 (accesibilidad y adaptación):** Dada la sección, cuando se usa a 360, 390, 768, 1024 y 1366 px, entonces no hay desbordamiento horizontal, las fotos no superan el ancho de su tarjeta, los controles (incluido «Reintentar» y «Limpiar filtros») tienen foco visible, el título de la sección se mantiene como `h2` y el nombre de cada especie como `h3`, y los estados se anuncian con `role="status"`.
- **CA-15 (configuración):** Dada la página `index.html`, cuando se revisa, entonces usa la misma `<meta name="arca-api-base">` que las demás páginas de `web-009` (CA-16). Esa meta contiene la base de la API, no el origen del portal. La sección no define otra base de API.
- **CA-16 (cobertura de pruebas):** Dada la suite `node --test` del portal, cuando se ejecuta, entonces existe al menos un test que nombra cada CA-01 a CA-24 sin dependencias nuevas.
- **CA-17 (condiciones de ADR 0028):** Dada la sección, cuando se revisa, entonces no hay `package.json`, build, paquetes ni scripts de terceros añadidos por esta spec; no se usan cookies, `localStorage`, `sessionStorage` ni credenciales; y las URLs de imagen se validan según RN-04. Cumple las condiciones heredadas de `docs/adr/0028-dynamic-tulanpedia-catalog.md`. Se comprueba con una prueba estática.
- **CA-18 (sin carrusel; modelo 3D retirado):** Dada la sección `#animales`, cuando se revisa, entonces no hay carrusel ni visor 3D, no hay `data-model` ni referencias a `.glb`, y la jirafa ya no aparece. Esta spec no añade referencias nuevas a `.glb` ni a `carousel`. Verificación: prueba estática.
- **CA-19 (campos de la ficha):** Dada una especie de la respuesta, cuando se renderiza, entonces muestra siempre el nombre común (`h3`) y la foto. Cada campo opcional que trae con valor no nulo se muestra con su etiqueta en la lista «Conocer más sobre la especie»: `scientific_name` «Nombre científico», `habitat` «Hábitat», `origin` «Origen», `conservation_status` «Estado de conservación», `size_cm` «Tamaño», `gestation_period` «Gestación», `diet` «Alimentación», `longevity` «Esperanza de vida» y `characteristics` «Características». `category` se muestra como «Tipo de animal», con la etiqueta de RN-11, cuando no es `null` (propuesta por confirmar: se publica siempre). Con los predeterminados de `api-014` RN-13 («Nombre científico», «Origen» y «Hábitat» marcados), la tarjeta suele traer esas tres etiquetas; si la Dirección las desmarcó, no aparecen. Los campos ausentes o `null` no muestran fila. Si no hay ningún campo opcional, no se muestra el bloque «Conocer más». Verificación: prueba del módulo con combinaciones de campos.
- **CA-20 (vacío):** Dada una respuesta `200` con `data: []`, cuando se renderiza, entonces la sección muestra «Aún no hay especies publicadas.» y no muestra tarjetas, filtros, contador ni `#noAnimals`. Cuando se publica la primera especie, la carga siguiente la muestra sin cambios en el HTML (CA-01). Verificación: prueba del módulo.
- **CA-21 (filtros según los datos):** Dada una respuesta en la que ninguna especie trae `habitat`, cuando se renderiza, entonces el filtro «Hábitat» no se muestra. El filtro «Especie» se muestra si hay al menos una especie. Verificación: prueba del módulo.
- **CA-22 (filtro «Tipo de animal»; casos límite, 2026-11-11):** Dada la sección con especies (CA-06 no aplica), cuando se renderiza, entonces el filtro «Tipo de animal» se muestra siempre, con «Todos los tipos» y una opción por cada `category` distinta (CA-04). Con una sola categoría distinta, el filtro muestra «Todos los tipos» y esa opción; no se oculta. Si ninguna especie trae `category`, muestra solo «Todos los tipos» con el control deshabilitado (**propuesta por confirmar**; a diferencia de «Hábitat» en CA-21, no se oculta con cero datos). Verificación: prueba del módulo con esas tres combinaciones.

- **CA-23 (introducción de la sección; decisión del usuario 2026-11-11):** Dada la sección `#animales`, cuando se carga la página, entonces la introducción dice exactamente: «Filtra las especies por tipo de animal, especie o hábitat. En cada ficha verás la información que el zoológico ha publicado para la especie.». La introducción no contiene la frase de búsqueda por nombre, porque la sección no tiene campo de búsqueda; el filtro `name` de `api-015` queda sin consumidor en esta versión (`api-015` pregunta 7). El titular «Encuentros inolvidables» no cambia. Verificación: prueba estática de `index.html` que comprueba el texto exacto y la ausencia de la frase de búsqueda por nombre dentro de `#animales`.
- **CA-24 (despublicadas y eliminadas fuera del portal; decisión del usuario 2026-11-12):** Dada una especie despublicada (`is_published = 0`), una con publicación eliminada o una con una solicitud `update` viva sobre una especie despublicada, cuando el visitante carga TulanPedia, entonces la especie no aparece por esa causa (`api-015` CA-18). Cuando se republica, la carga siguiente la muestra sin cambios en el HTML (CA-01). Verificación: prueba del módulo con respuesta simulada en la que la especie no viene (no genera tarjeta), y evidencia manual en `arca_pruebas` con una especie despublicada.

## Reglas de negocio

- **RN-01 (solo presentación):** El portal no decide qué especies son visibles, ni su orden, ni su texto. Eso lo decide la API a partir de las especies publicadas (`api-015` RN-03; `dashboard-010`, `api-014`). El portal solo presenta lo que recibe.
- **RN-02 (sin contenido de muestra):** Ningún estado muestra fichas inventadas. Si la API falla, se muestra el estado de error (CA-07).
- **RN-03 (solo lectura y público):** El portal solo hace `GET`, sin cookies, sin credenciales y sin datos del visitante. No guarda la lista en el navegador.
- **RN-04 (texto seguro):** Los datos de la API se tratan siempre como texto. Las URLs de imagen se aceptan solo si son `http:`, `https:` o rutas relativas del mismo origen (igual que `web-009` RN-07).
- **RN-05 (sin dependencias):** No se añaden paquetes, build, fuentes remotas ni scripts de terceros (`web-009` RN-05; ADR 0028).
- **RN-06 (un solo módulo de red):** La lectura de la API ocurre solo en `js/api.js` (`web-009` RN-06). Esta spec añade una función a ese módulo; no crea otro.
- **RN-07 (filtros en el cliente sobre la lista recibida):** Filtrar por especie o hábitat es presentación sobre la lista ya recibida. No cambia lo que la API decide ni hace una petición nueva.
- **RN-08 (textos en español):** Todos los textos visibles están en español (`apps/web/AGENTS.md`).
- **RN-09 (imagen completa):** Ninguna foto se recorta ni se estira (`web-009` RN-10).
- **RN-10 (sin datos personales):** La sección no muestra ni pide datos del veterinario que envió la solicitud, ni del revisor (`dashboard-010` CA-05).
- **RN-11 (opciones de filtro sin fuente fija):** Las opciones de «Especie», «Hábitat» y «Tipo de animal» salen solo de la respuesta de `api-015` (CA-04). El portal no define listas de hábitats ni de tipos en el código ni en el HTML. Para «Tipo de animal» solo traduce las seis claves de `category` (DBR-004) a etiquetas en español (Mamífero, Ave, Reptil, Anfibio, Pez, Invertebrado) con una tabla de presentación, que no decide qué tipos existen. Si llega una clave que la tabla no conoce, se muestra tal como llega (**por confirmar**). El hábitat es texto libre normalizado (quitar espacios sobrantes, sin distinguir mayúsculas), con longitud máxima de 150 caracteres (DBR-013 pregunta 2, resuelta).
- **RN-12 (campos presentes):** La tarjeta muestra solo lo que la API devuelve. La Dirección elige los campos con `api-014` RN-13; el portal no añade ni completa datos (CA-02, CA-19).
- **RN-13 (vacío):** Sin especies publicadas no hay filtros ni contador, y el portal no muestra fichas de muestra (CA-20).

## Datos, privacidad y auditoría

- Los datos son especies publicadas por el zoológico: nombre común, foto y los campos que la Dirección marca para la ficha (`api-014` RN-13). No hay datos personales, clínicos ni financieros.
- El portal no guarda nada en el navegador y no envía datos del visitante.
- No hay auditoría: el portal no escribe en la API.
- No requiere DBR ni cambios de esquema en esta spec. La DBR de solicitudes y de `species` está en `docs/database/requests/DBR-013-species-requests.md` (Borrador). `api-015` depende de ella.

## Flujos y errores

### Flujo principal

1. El visitante abre `index.html`. TulanPedia muestra el estado de carga.
2. `js/api.js` pide `GET {base}/published-species`.
3. `js/animals.js` (nuevo) construye las tarjetas con texto seguro, la imagen completa o el marcador, y las opciones de los filtros a partir de la respuesta (CA-04).
4. El visitante filtra por especie o hábitat; el contador se actualiza.
5. Si la respuesta es vacía, muestra el estado de vacío. Si falla, muestra el error con «Reintentar».

### Errores esperados

- Red caída, `5xx`, `404` de la ruta, JSON no válido o tiempo de espera excedido → estado de error (CA-07).
- `200` con `data: []` → estado de vacío (CA-06).
- Imagen que no carga o `image_url` no válido → marcador (CA-09).
- Origen no permitido por CORS → el navegador bloquea la lectura; la sección muestra el error (CA-07).
- Filtro sin resultados → mensaje «No encontramos especies con esos filtros. Prueba con otra búsqueda.» (texto existente de `#noAnimals`, reutilizado).

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:**
  - **`api-015` (Borrador):** `GET /api/v1/published-species`, lectura pública de especies publicadas con filtros opcionales que esta spec no usa. Esta spec no se implementa sin ese contrato aprobado.
  - `dashboard-010` (Borrador; aceptación y edición de solicitudes).
  - `web-010` (patrón de galería dinámica) y `web-009` (módulo `js/api.js`, meta `arca-api-base`).
  - **ADR 0028 (Propuesto):** excepción de arquitectura para TulanPedia, que extiende la de ADR 0024 a esta sección. Debe aprobarse antes de aprobar esta spec.
  - ADR 0024 (Aceptado) y ADR 0027 (Propuesto): no se modifican.
  - `api-013` (Borrador) y ADR 0026 (Propuesto, enmienda del 2026-11-11): la foto de una especie publicada sale de `media/species/`, carpeta pública.
  - `api-014` (Borrador): la publicación actualiza la especie existente y copia su foto a `media/species/`.
  - No hay dependencias nuevas de npm.
- **Riesgos:**
  - **Portal vacío hasta la primera publicación:** al retirar las fichas de muestra, TulanPedia quedará vacía hasta que el zoológico publique especies. Aceptado el 2026-11-11 (pregunta 1 resuelta; CA-06 y CA-20).
  - **Pérdida de contenido de las fichas:** las fichas de muestra tenían datos (dieta, longevidad, características, curiosidades) que la solicitud no trae. La ficha pública mostrará solo los campos que la Dirección marque y que la solicitud guarde (`api-014` RN-13). La descripción libre y las curiosidades no tienen fuente y se retiran (pregunta 2).
  - **Etiquetas de tipo de animal:** la tabla de presentación de RN-11 depende de la lista cerrada de DBR-004. Un tipo nuevo exige actualizar la API y la tabla del portal.
  - **Variantes de hábitat:** dos escrituras distintas del mismo hábitat (por ejemplo, con o sin acento) generan dos opciones de filtro. Solo se normalizan espacios y mayúsculas (RN-11; pregunta 5).
  - **Excepción de arquitectura:** el portal sigue sin cumplir `apps/web/AGENTS.md` ni las Constituciones III y IV en esta sección. Queda registrado en ADR 0028.
  - **Bionic Reading y Regla de Lectura (`008`):** el contenido de TulanPedia llega después de la carga y podría quedar sin formato de accesibilidad. Se verifica en la prueba manual de la sección.
  - **Imágenes grandes:** las fotos se cargan con `lazy`; el coste se revisa en la verificación manual.
  - **Efecto de animaciones:** `animations.css` aplica `transform` a `.animal-card > img` al pasar el cursor. Con `object-fit: contain`, el zoom sobre una imagen contenida rompe CA-09; las reglas de `web-011` la anulan para las tarjetas dinámicas.
- **Preguntas pendientes** (máximo 8 por ronda):
  1. **Vacío y filtros.** ¿Es aceptable que TulanPedia muestre «Aún no hay especies publicadas.» hasta la primera publicación? **Resuelta, decisión del usuario 2026-11-11:** sí. Se muestra «Aún no hay especies publicadas.» y se ocultan los filtros y el contador (CA-06, CA-20, RN-13).
  2. **Contenido de la ficha.** ¿La tarjeta muestra solo nombre, nombre científico, origen, hábitat y foto? ¿Se mantiene un bloque «Conocer más» con dieta, longevidad y características? **Resuelta, decisión del usuario 2026-11-11 (en lo que tiene fuente):** la tarjeta muestra los campos que la Dirección marca (CA-19). La descripción libre no tiene fuente y no se muestra. El tipo de animal sí se muestra desde el 2026-11-11 (`category`, CA-19; DBR-013 pregunta 10, resuelta). La fuente de los campos extra sigue abierta (`api-014` pregunta 3; DBR-013 pregunta 8).
  3. **Campo de búsqueda.** **Resuelta, decisión del usuario 2026-11-11:** no se añade campo de búsqueda. La introducción se corrige para describir los filtros reales (CA-23). La búsqueda por nombre podrá añadirse después.
  4. **Fuente de las opciones de «Especie».** **Resuelta, decisión del usuario 2026-11-11:** las opciones salen de `common_name` de las especies publicadas (CA-04, RN-11). **Tipo de animal: resuelto, decisión del usuario (2026-11-11):** hay filtro «Tipo de animal» sobre `category` (CA-03, CA-04, CA-22). La solicitud de especie captura `category` (DBR-013 pregunta 10; `api-014` CA-25).
  5. **Hábitat.** **Resuelta, decisión del usuario 2026-11-11:** texto libre normalizado (quitar espacios sobrantes, sin distinguir mayúsculas), con las opciones tomadas de `species.habitat` de las especies publicadas (CA-04, RN-11), y longitud máxima de 150 caracteres (DBR-013 pregunta 2). No se normalizan los acentos (decisión del usuario 2026-11-11; `api-015` pregunta 8).
  6. **Modelo 3D.** La jirafa tiene hoy un modelo 3D (`assets/nyilonelycompany-nature-51.glb`). ¿Se retira junto con la ficha de muestra, o se conserva para una spec futura? **Resuelta, decisión del usuario 2026-11-11:** se retira junto con la ficha de la jirafa (CA-12, CA-18). Los assets `.glb` y las imágenes estáticas dejan de estar referenciados y no se borran en esta spec (ver «Cambios por área»).
  7. **Titular de la sección.** **Resuelta, decisión del usuario 2026-11-11:** el titular «Encuentros inolvidables» no cambia. La introducción sí cambia (CA-23).
  8. **Origen de la URL de API en producción.** **Resuelta, decisión del usuario 2026-11-11 (falso positivo).** `<meta name="arca-api-base">` apunta a la API: `http://localhost:8000/api/v1` en desarrollo. `http://localhost:8080` es el origen del portal y debe estar en `CORS_ALLOWED_ORIGINS` (`api-011` RN-12). Confirmado: `web-009` CA-16 fija exactamente esa separación, así que no hay contradicción. Sigue abierto, y no bloquea esta spec, el origen de producción del portal y de la API (`web-009` pregunta 2).

## Cambios por área

| Área | Archivos previstos | Propósito |
|---|---|---|
| Portal | `apps/web/src/index.html` | Vaciar `#animalGrid` de las cuatro fichas de muestra, retirar `demo-note`, las notas de modelo y el visor de tarjetas `.animal-card[data-model]` del script, que no tiene tarjetas que lo activen (CA-12), poner el estado inicial de carga y las opciones de filtro vacías (sin valores fijos de hábitat ni de tipo), con el selector «Tipo de animal» junto a «Especie» y «Hábitat»; conservar identificadores, secciones y `<meta name="arca-api-base">`; cargar `js/animals.js` con `defer`. Reemplazar la introducción de `#animales` por el texto exacto de CA-23. No cambia el orden de secciones. |
| Portal | `apps/web/src/js/api.js` | Añadir la función `getSpecies()`, que pide `GET {base}/published-species` (mismo módulo, misma política de red de `web-009` RN-06). |
| Portal | `apps/web/src/js/animals.js` (nuevo) | Renderiza estados, tarjetas, filtros con opciones derivadas (CA-04), contador, imagen completa o marcador, y texto seguro con DOM API (`createElement`, `textContent`, `setAttribute`). No llama a `fetch`. |
| Portal | `apps/web/src/script.js` | Adaptar el filtro que lee `.animal-card` para que trabaje con las tarjetas renderizadas o retirarlo de la sección, sin cambiar lo demás. Pendiente de revisión en el plan. |
| Portal | `apps/web/src/animals.css` (nuevo) | Estados, caja de imagen de proporción fija, marcador, ajustes de 360 px y anulación del zoom de `animations.css` para las tarjetas dinámicas. No modifica `styles.css`. |
| Pruebas | `apps/web/src/tests/animals.test.mjs` (nuevo) | Tests `CA-01` a `CA-18` con `node:test`, `node:vm` y un DOM simulado, sin dependencias. |
| Pruebas existentes | `apps/web/src/tests/relocation.test.mjs` | Solo revisión. Si una comprobación depende de las fichas de muestra, se informa antes de cambiarla. |
| Documentación | `apps/web/docs/tulanpedia-catalogo.md` (por crear) | Referencia local: configuración de la base URL, origen permitido, comportamiento de filtros y excepción de arquitectura con enlace al ADR 0028. |
| Assets (solo documentar) | `apps/web/src/assets/nyilonelycompany-nature-51.glb`, `giraffe-*.webp`, `lion-*.webp`, `macaw-*.webp`, `turtle-*.webp` e `icon-3d-56.webp` | Dejan de estar referenciados por `index.html` en TulanPedia. **No se borran en esta spec.** La limpieza va en una tarea futura, después de comprobar con búsqueda que no hay otra referencia. `assets/Mapa.glb` y `assets/model-viewer.min.js` siguen en uso (mapa) y no cambian. |
| ADR | `docs/adr/0028-dynamic-tulanpedia-catalog.md` | Excepción de arquitectura para esta sección (Propuesto). Esta spec solo lo referencia. |

## Nota de infraestructura

Esta spec no cambia requisitos de ambiente nuevos: reutiliza `CORS_ALLOWED_ORIGINS` (con el origen del portal, `http://localhost:8080` en desarrollo) y la meta `arca-api-base` de `web-009`. Si se aprueba, el PR anota en `infra/README.md` la misma condición de origen de `web-009` (sección «Portal público»).

## Revisión

- Aprobadores y fecha: pendiente.
- Aprobado por: (pendiente).
- Estado: Borrador. No pasa a Aprobada hasta que ADR 0028 esté aprobado, `api-015` tenga contrato aprobado y DBR-013 esté aprobada (con BD decidido 2a). Las preguntas 1 a 7 están resueltas el 2026-11-11. La pregunta 5 queda cerrada en lo de acentos.
- Divergencias:
  - **Resuelta (2026-11-11), falso positivo:** la meta `arca-api-base` de `index.html`, `noticias.html` y `eventos.html` apunta a la API (`http://localhost:8000/api/v1`). El origen `http://localhost:8080` es el del portal y se configura en CORS. Pregunta 8.
  - Hay dos archivos `apps/web/specs/010-*.md` (`010-custom-not-found-page.md` y `010-dynamic-memories.md`). Esta spec usa `011` para no añadir otro duplicado.
- Historial: borrador del 2026-11-11, a partir de `web-010`, `dashboard-010` y la solicitud de la sesión principal. Ampliación del mismo día: endpoint `published-species` (`api-015`), filtros derivados de la respuesta y pregunta 8 resuelta. Segunda ampliación del mismo día: vacío aceptado, campos de la ficha según `published_fields`, filtro de hábitat oculto si no hay datos, modelo 3D de la jirafa retirado y nuevos CA-19 a CA-21. Tercera ampliación del mismo día: predeterminados de la ficha (origen marcado; CA-19). Cuarta ampliación del mismo día (tipo de animal): filtro «Tipo de animal» (CA-03, CA-04, CA-19, CA-22; RN-11), regla simple de vacío y de una sola opción (propuesta por confirmar), etiquetas en español como tabla de presentación, pregunta 4 resuelta y nuevos CA-22. **2026-11-11, cambio de modelo:** la fuente deja de ser la solicitud aceptada y pasa a ser la especie publicada (`api-015` lee `species` con `is_published = 1`); el endpoint se renombra de `accepted-species` a `published-species` (`api-015`, pregunta 1) en las decisiones, en CA-01, CA-10, el flujo principal y la tabla de cambios por área; los textos «aceptada» pasan a «publicada». No cambian los CA ni las RN, ni la lista de campos ni los filtros. **2026-11-11 (decisiones del usuario sobre preguntas 3, 5 y 7):** introducción corregida para describir los filtros reales (CA-23, sin campo de búsqueda); acentos no se normalizan; el titular no cambia. **2026-11-12 (tercera ronda):** CA-24 nuevo: una especie despublicada, con publicación eliminada o con solicitud `update` viva no aparece en TulanPedia; CA-16 cubre CA-01 a CA-24.
- Evidencia/enlaces: `apps/web/src/index.html` (sección `#animales`, líneas 252 a 419, y `#mapa` en la línea 423), `apps/web/src/script.js` (filtros, líneas 82 a 126), `apps/web/src/styles.css` (reglas `.animal-card`), `apps/web/src/animations.css` (líneas 202 a 204), `apps/web/specs/009-dynamic-news-events.md` (CA-16 y RN-09), `apps/web/specs/010-dynamic-memories.md`, `apps/api/specs/015-public-species-read.md`, `apps/api/specs/006-public-catalog-read.md`, `apps/api/specs/014-species-requests.md`, `apps/dashboard/specs/010-public-content-management.md`, `docs/adr/0024-web-static-portal-exception.md`, `docs/adr/0027-dynamic-public-memories-gallery.md`, `docs/adr/0028-dynamic-tulanpedia-catalog.md`, `docs/database/requests/DBR-013-species-requests.md`.
