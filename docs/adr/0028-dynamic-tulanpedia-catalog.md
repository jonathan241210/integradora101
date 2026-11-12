# 0028 · Catálogo dinámico TulanPedia en el portal: excepción acotada a web-011

- Estado: Propuesto (2026-11-11). No autoriza la implementación de `web-011` hasta su aprobación por el equipo.
- Fecha: 2026-11-11
- Spec relacionada: `apps/web/specs/011-dynamic-tulanpedia.md` (Borrador; plan y tasks pendientes). Relacionada con `apps/dashboard/specs/010-public-content-management.md` (Borrador, origen de las especies publicadas), con `apps/api/specs/015-public-species-read.md` (Borrador, lectura pública de especies publicadas) y con `apps/web/specs/010-dynamic-memories.md`. Extiende la excepción de `docs/adr/0024-web-static-portal-exception.md` del mismo modo que lo hace `docs/adr/0027-dynamic-public-memories-gallery.md`.
- Aprobado por: (pendiente, nombre del compañero)

## Contexto

- `apps/web/AGENTS.md` define el portal institucional como SPA con React 19, TypeScript, Vite 7 y Tailwind CSS 4, que usa `@arca/api-client` y hooks. La Constitución III exige que la UI llame a `@arca/api-client` mediante hooks, y la IV exige un test automatizado por criterio.
- El ADR 0024 (Aceptado el 2026-11-07) autoriza HTML y JavaScript estático para las páginas de `web-009`: portada, `noticias.html` y `eventos.html`. Su punto 4 limita la excepción a esas páginas y módulos, y dice que no se extiende a otros módulos sin un ADR nuevo.
- El ADR 0027 (Propuesto) cubre la galería de momentos de `web-010`, con las mismas condiciones.
- TulanPedia (`#animales` de `apps/web/src/index.html`) es hoy HTML fijo con cuatro fichas de muestra y un filtro en JavaScript clásico (`script.js`). Con `dashboard-010`, el zoológico publica especies existentes que el veterinario propone (`api-014`; la especie no se crea al publicar). `web-011` sustituye las fichas por la lista pública de especies publicadas, que sirve `api-015` (`GET /api/v1/published-species`).
- La sección es de lectura pública, sin sesión, sin formularios y sin escritura, igual que la galería. Los datos los revisa el zoológico antes de publicarlos (`dashboard-010`).

## Decisión

Para la sección TulanPedia de la portada (`#animales`, `web-011`), el portal mantiene HTML y JavaScript estático, con las mismas condiciones que el ADR 0024 y con su alcance propio:

1. **Sin `@arca/api-client`.** La lectura de la API ocurre solo en `src/js/api.js`, que añade la función `getSpecies()` (`web-011` CA-10). No hay hooks en el portal. Es la misma regla de `web-009` RN-06.
2. **Sin build, sin `package.json` y sin dependencias.** Se usan scripts clásicos con `defer`. No se añaden paquetes, fuentes remotas ni scripts de terceros (`web-011` RN-05, CA-17).
3. **Runner `node --test`** con `node:vm`, `node:fs` y un DOM simulado, como en `web-009` y `web-010`. No se usa Vitest (`web-011` CA-16).
4. **Texto seguro.** Todo dato de la API se escribe como texto (`textContent`). No se usan `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write` ni `eval` con datos de la API. Se verifica con una prueba estática (`web-011` CA-11).
5. **URLs de imagen limitadas.** Solo `http:`, `https:` o rutas relativas del mismo origen. Cualquier otro esquema muestra el marcador decorativo (`web-011` RN-04, CA-09).
6. **Sin estado en el navegador.** No hay cookies, `localStorage`, `sessionStorage` ni credenciales (`credentials: 'omit'`). Cada carga pide la lista a la API. Los filtros actúan sobre la lista recibida en memoria, y sus opciones salen de esa misma lista (`web-011` CA-04, RN-11).
7. **Alcance acotado.** La excepción cubre solo la sección TulanPedia de la portada, con `GET {base}/published-species` (lectura pública de especies publicadas, `api-015`). No cubre una página propia por especie, un carrusel, un visor 3D, formularios ni ninguna otra página o app. Cualquier extensión requiere un ADR nuevo.
8. **Campos publicados y estado vacío (2026-11-11).** El portal solo presenta lo que devuelve `api-015` (CA-13); no decide qué se publica (`web-011` RN-01 y RN-12). Sin especies publicadas, la sección muestra su estado vacío (`web-011` CA-20). La retirada del modelo 3D de la jirafa no cambia esta excepción.

## Justificación

- El contenido es público, de solo lectura y de tamaño pequeño. Una lista de especies no justifica un build, dependencias ni un segundo modelo de trabajo en el portal.
- El portal ya usa este patrón (`web-001`, Implementada; `web-008`, Implementada; `web-009`, Aprobada; `web-010`, Borrador con ADR 0027 Propuesto). Mantenerlo evita tener varios modelos de trabajo en el mismo sitio.
- Se separa de ADR 0024 y de ADR 0027 para que cada ADR registre lo que autoriza y cuándo. Ninguno de los dos cambia.

## Alternativas consideradas

- **Enmendar el ADR 0024 para incluir TulanPedia.** Descartada por la misma razón que en ADR 0027: el ADR 0024 está aceptado para `web-009` y mezclaría decisiones en un solo registro.
- **Usar el ADR 0027 para TulanPedia.** Descartada: el ADR 0027 se limita a la galería de momentos. Mezclar dos módulos en un solo ADR reduce la trazabilidad.
- **Migrar la sección a React + Vite + `@arca/api-client` con hooks y Vitest.** Cumple `apps/web/AGENTS.md` y las Constituciones III y IV. Descartada para esta sección: obliga a crear `package.json`, dependencias y build para una lista de lectura, y retrasa la entrega. Se reevalúa con la spec de pagos (ADR 0024, «Reevaluación») o si el catálogo crece.
- **Generar las fichas en el build con los datos de la API.** Descartada: el zoológico debe ver una especie publicada sin redespliegue.
- **Mantener las fichas de muestra y añadir la lista dinámica debajo.** Descartada: el portal mostraría especies inventadas junto a las publicadas, lo que contradice `web-011` RN-02.
- **Widget o iframe de un servicio externo.** Descartada: pasa datos y contenido a un tercero, y no cumple la Constitución I.
- **Reutilizar `GET /api/v1/species` (`api-006`) para el portal.** Descartada: esa ruta compone la ficha desde `animals` para la app móvil y no distingue especies publicadas. Se usa una ruta propia (`api-015`), sin cambiar `api-006`.

## Consecuencias

### Positivas

- Entrega del catálogo público sin build ni dependencias nuevas.
- Un solo módulo de red (`api.js`) y un solo punto de verificación de seguridad (texto seguro, URLs, sin almacenamiento) para el portal.
- El patrón coincide con `web-001`, `web-008`, `web-009` y `web-010`.
- La trazabilidad queda clara: cada excepción de arquitectura del portal tiene su ADR.
- Se retiran de la portada las fichas de muestra, que no corresponden a especies del zoológico.

### Riesgos o costos

- **Deuda de arquitectura, ampliada otra vez:** el portal no cumple la arquitectura objetivo de `apps/web/AGENTS.md` ni las Constituciones III y IV en la sección TulanPedia. La deuda se registra aquí, en `web-011` y en el ADR 0024. Hay tres excepciones de arquitectura en el portal (`web-009`, `web-010` y `web-011`), cada una con su ADR.
- **Dos formas de consumir la API en el repositorio** (`@arca/api-client` en los clientes y `api.js` en el portal), sin tipos compartidos para el portal.
- **Sin tipado** en la capa de presentación del portal; se compensa con pruebas de forma (`web-011` CA-01 a CA-21).
- **Riesgo de crecimiento de alcance:** la excepción podría usarse para más páginas o más lógica de cliente. Se mitiga con el alcance acotado de este ADR y con la reevaluación.
- **Dependencia de contrato:** la sección no puede implementarse hasta que exista la lectura pública de especies publicadas (`api-015`, Borrador), que a su vez depende de DBR-013 (`species.is_published`, decidido el 2026-11-11 con el modelo de publicación; la opción de origen 2a sigue pendiente de BD y la imagen 2b queda resuelta por diseño). Sin ese contrato, este ADR no tiene efecto práctico.
- **Sin JavaScript no hay catálogo:** limitación aceptada y documentada, igual que en `web-009`.
- **Variantes de hábitat:** las opciones de hábitat son texto libre normalizado; dos escrituras distintas generan dos opciones. Riesgo de calidad de datos, no de arquitectura (`web-011` riesgos).

## Recomendación de almacenamiento de fotos (2026-11-11)

- La sección de TulanPedia consume `image_url` de `media/species/` (la foto de una especie publicada, pública por diseño). Esta sección no consume ninguna foto de `media/species-requests/`.
- En pruebas, la foto **pendiente** de una solicitud de especie está en `media/species-requests/`, que el servidor publica por `/media`. Quien conozca su URL puede verla. La API no la devuelve (`api-014` CA-06). Es deuda y riesgo conocido (ADR 0026, riesgo m).
- **Recomendación explícita antes de producción:** cambiar `species-requests/` a almacenamiento privado (ruta protegida con `species.review` o URL firmada) o migrar a otro almacenamiento (ver `docs/propuestas/almacenamiento-objetos-s3.md`). Se configurará entonces, en `.env` y en `infra/README.md`.

## Decisión pendiente del responsable de BD: campos extra de la ficha pública

- Estado: **pendiente de decisión del responsable de BD**. Esta sección no decide nada y no cambia el estado Propuesto de este ADR.
- Fecha de la pregunta: 2026-11-11.
- Enlaces: `docs/database/requests/DBR-013-species-requests.md` (pregunta 8); `apps/api/specs/014-species-requests.md` (pregunta 3, RN-13, CA-21); `docs/database/requests/DBR-013-species-requests.md` (pregunta 10, `category`); `apps/pwa/specs/005-species-request-submission.md` (CA-09 a CA-11); `apps/api/specs/015-public-species-read.md` (RN-06, CA-03, CA-13); `apps/web/specs/011-dynamic-tulanpedia.md` (RN-12); `apps/dashboard/specs/010-public-content-management.md` (CA-07, RN-14).

### Pregunta

¿El formulario de la PWA debe pedir también estos campos de especie (estado de conservación, tamaño, gestación, alimentación, esperanza de vida, características) para poder publicarlos en TulanPedia?

**`category` (tipo de animal): decidido por el usuario (2026-11-11), fuera de esta pregunta.** La columna ya existe en `species` (DBR-004). La solicitud la captura (lista cerrada; `api-014` CA-25 y DBR-013 pregunta 10), y TulanPedia la usa como filtro (`web-011` CA-22). Esta sección ya no incluye `category` en la decisión de BD. Efecto de `category` (decidido): las especies publicadas con tipo cuentan en las misiones de mobile (`category_species_count`, `api-005`). **Decidido (2026-11-11):** (1) el tipo de animal es obligatorio en la solicitud (`api-014` CA-25); (2) `category` se publica siempre cuando la especie lo tiene, sin ser desmarcable, y no entra en `published_fields`.

Situación: `pwa-005` envía nombre común, nombre científico, origen, hábitat y foto, y desde el 2026-11-11 también el tipo de animal (`category`, decidido). El `published_fields` predeterminado es `["scientific_name","origin","habitat"]` (`api-014` RN-13). Las seis casillas extra no tienen fuente en `species_publication_requests`, así que `pwa-005` CA-11 las oculta.

### Qué existe realmente en la base

En el repositorio no encuentro migración que cree `species` ni `animals`: solo hay renombrados de columnas (`2026_10_14_000001_rename_tables_and_columns_to_english.php`) y la adición de `species.category` (`2026_10_15_000004_visitor_progress_schema.php`; DBR-004, `VARCHAR(30)` NULL, la retira solo `down()`). Las columnas se toman de `docs/database/esquema-ingles.md` y del mapeo de DBR-001. Los modelos `Species` y `Animal` no declaran columnas (`$guarded = []`).

| Campo de la ficha | Dónde existe hoy | Tipo documentado | Alcance |
|---|---|---|---|
| Estado de conservación | `species.conservation_status` | VARCHAR(100) NULL | especie |
| Tamaño | `species.size_cm` | DECIMAL(8,2) NULL | especie |
| Gestación | `species.gestation_period` | VARCHAR(100) NULL | especie |
| Alimentación | `animals.diet` | TEXT NULL | individuo |
| Esperanza de vida | `animals.longevity` | VARCHAR(50) NULL | individuo |
| Características | `animals.characteristics` | TEXT NULL | individuo |
| Tipo de animal (`category`) | `species.category` | VARCHAR(30) NULL, lista cerrada (`mammal`, `bird`, `reptile`, `amphibian`, `fish`, `invertebrate`; DBR-004) | especie |

- `species` no tiene `origin`, `diet`, `longevity` ni `characteristics`. Sí tiene `habitat` (VARCHAR(255)), `distribution` y `category`; el origen de la solicitud se resuelve en la opción 2a de DBR-013. `category` la leen `api-006` (CA-01) y las misiones de mobile (`category_species_count`, `api-005`). Desde el 2026-11-11 la solicitud de especie la captura (decisión del usuario). No verificado contra la base `arca_pruebas`: el código y los tests la dan por existente.
- **Hallazgo:** `apps/api/src/app/Http/Resources/SpeciesResource.php`, que usa `api-006` (la app móvil), ya devuelve `conservation_status`, `size_cm` y `gestation_period` de `species`, y además `longevity`, `diet` y `characteristics` tomados de un animal representativo (`representativeAnimal()`, el primero con foto). Hoy, por tanto, datos de un individuo aparecen en la respuesta de especie.

### Opciones

| Aspecto | (A) No ampliar por ahora | (B) Ampliar con los campos de `species` | (C) Ampliar también con los campos de `animals` |
|---|---|---|---|
| Migración | Ninguna adicional a DBR-013. | Ninguna sobre `species`, porque las columnas ya existen. Tres columnas en `species_publication_requests` dentro de la misma migración de DBR-013 (tabla nueva, sin datos). `category` va en esa migración por decisión aparte (DBR-013 pregunta 10), fuera de esta comparación. | (C1) Columnas nuevas en `species` (migración aparte, con DBR propia) y en `species_publication_requests`. (C2) Tabla hija o estructura clave-valor, con una DBR más grande. |
| Columnas nuevas en `species_publication_requests` | Ninguna. | `conservation_status` VARCHAR(100) NULL, `size_cm` DECIMAL(8,2) NULL, `gestation_period` VARCHAR(100) NULL (mismos tipos que `species`). `category` no entra en esta comparación (decidido el 2026-11-11). | Las de B, más `diet` TEXT, `longevity` VARCHAR(50) y `characteristics` TEXT (C1), o una estructura propia (C2). |
| Qué se llena en `species` al aceptar | `common_name`, `scientific_name`, `habitat` y `distribution` u `origin` según 2a. Los tres campos de especie quedan NULL. | Lo anterior, más `conservation_status`, `size_cm` y `gestation_period` (`api-014` CA-08). `category` se copia en cualquier caso (decidido). Las especies existentes no cambian. | C1: lo anterior, y las tres claves de `animals` como columnas nuevas de `species`, que nacen vacías. C2: nada nuevo en `species`; las claves quedan en la solicitud o en la tabla hija. |
| `api-014` | RN-13 sin cambio; las seis claves siguen sin implementarse. | RN-13 implementa tres claves; CA-06, CA-15 y CA-16 suman tres campos; CA-21 valida el tamaño como número positivo (a definir en el plan). `category` ya se captura y valida en CA-01, CA-15 y CA-25 de `api-014`, fuera de `published_fields`. | RN-13 implementa las seis; CA-06, CA-15, CA-16 y CA-21 se amplían; hay que definir cómo se valida el texto largo de `diet` y `characteristics`. |
| `pwa-005` | CA-09 y CA-11 sin cambio; las casillas extra siguen ocultas. | CA-09 muestra tres casillas más con su campo (texto, número en cm y texto); CA-11 deja ocultas solo las tres de `animals`. El selector «Tipo de animal» (`pwa-005` CA-12) no depende de esta opción. | CA-11 queda vacío: las seis casillas visibles. |
| `api-015` | Sin cambio. RN-06 solo lee `scientific_name`, `origin` y `habitat`. | RN-06 y CA-03/CA-13 aceptan tres claves más, y cierran parte de la pregunta 8 de `api-015`. `category` se publica en cualquier caso (`api-015` CA-03 y CA-15). | RN-06 lee seis claves; con C1 desde `species`, con C2 desde la tabla hija. |
| `web-011` | Tarjeta con nombre, foto, nombre científico, origen y hábitat (RN-12). | La tarjeta puede mostrar tamaño, gestación y conservación si la Dirección los marca (RN-12). Filtros sin cambio en esta opción (RN-11). El filtro «Tipo de animal» (`category`) ya está decidido (`web-011` CA-22). | Tarjeta más densa; alimentación, longevidad y características como texto largo. |
| `dashboard-010` | Sin cambio. | CA-07 y el detalle muestran tres campos más para revisar y editar. | CA-07 y el detalle muestran seis campos; los textos largos ocupan más espacio en la revisión. |
| Formulario móvil del veterinario | 5 campos y foto, más el selector de tipo de animal (decidido), y 3 casillas predeterminadas. | 3 campos más: dos de texto y uno numérico. | 6 campos más, dos de ellos textos largos que se escriben en el móvil. |
| Dato por especie o por individuo | No hay dato individual en la ficha. | Los tres son de especie: el veterinario propone el valor para la especie y la Dirección lo revisa. `category` también describe la especie, no el ejemplar. | Alimentación, esperanza de vida y características describen un ejemplar. Como ficha de especie crean una segunda fuente de verdad (Constitución V) y repiten el problema de `api-006`. No se considera copiar datos de un animal concreto a la especie. |
| Efecto en `api-006` (app móvil) | Sin cambio. | `GET /api/v1/species` ya expone estos tres campos desde `species`: las especies publicadas con esos datos los mostrarán también en la app móvil. Avisar a `mobile`, que además verá contar las especies con `category` en las misiones `category_species_count`. | Igual que B. Además, `api-006` ya toma `longevity`, `diet` y `characteristics` de un animal representativo; con C1 habría dos orígenes para el mismo nombre. |

### Recomendación: (B)

1. Los tres campos son de especie y ya existen en `species`. B no requiere migración sobre `species` y solo añade columnas a una tabla nueva, sin datos que migrar.
2. Alimentación, esperanza de vida y características describen un ejemplar. Como ficha de especie duplican la fuente de `animals` (Constitución V) y ya hay un antecedente en `api-006`. Antes de incluirlos hay que decidir si son de especie (entonces, columnas propias de `species` con su DBR) o si quedan fuera de TulanPedia.
3. El formulario crece en tres campos, sin textos largos.
4. `category` queda fuera de esta recomendación: se decidió aparte el 2026-11-11 (DBR-013 pregunta 10). La recomendación (B) no cambia.

Condiciones de B:
- Avisar a `mobile` del cambio en `api-006`, que ya expone los tres campos y `category`.
- `category` (decidido): la API valida la lista cerrada de DBR-004 (`mammal`, `bird`, `reptile`, `amphibian`, `fish`, `invertebrate`) y la PWA muestra un selector, no texto libre.
- Producto decide si `conservation_status` es texto libre o lista cerrada. Una lista cerrada exige una lista en la API (`api-014` RN-13).
- `size_cm` es DECIMAL(8,2): el máximo es 999999.99. La API valida el valor antes de guardarlo.

### Decisión

La decisión es del responsable de BD. Lo que BD documente en DBR-013, y su aprobación separada de BD y backend (`docs/database/requests/README.md`, regla 4), define qué se implementa. Las specs se actualizarán según su respuesta: `api-014` RN-13 y CA-21, `pwa-005` CA-09 a CA-11, `api-015` RN-06 y `dashboard-010` CA-07; y `web-011` RN-11 y CA-22 (filtro por `category`, ya decidido). Hasta esa respuesta, ninguna de las seis claves se implementa. `category` sí se implementa (decisión del usuario, 2026-11-11).

### Recálculo con el modelo de publicación (2026-11-11)

Con el modelo nuevo (`api-014`, DBR-013), la solicitud propone correcciones a una especie que ya existe. El análisis anterior cambia en estos puntos. La decisión sigue siendo del responsable de BD y ninguna de las seis claves se implementa hasta que la responda.

- **Las tres claves de especie** (`conservation_status`, `size_cm`, `gestation_period`) ya existen en `species`. Con el modelo nuevo se guardan como correcciones en la solicitud, igual que `scientific_name`, `habitat` y `origin` (NULL = sin corrección), y al publicar se escriben en la fila de `species`. El formulario las precarga con el valor actual de la especie (`pwa-005` CA-14), así que el veterinario ve lo que ya hay antes de corregirlo. Las columnas de corrección de la opción B **no están todavía en el contrato de la tabla** de DBR-013: se añadirían si BD acepta la pregunta 8.
- **Las tres claves de individuo** (`diet`, `longevity`, `characteristics`) siguen describiendo un ejemplar. Una corrección de especie no puede tomarlas de un animal concreto. Para incluirlas en la ficha hace falta una decisión de producto sobre si son de especie (opción C1, con columnas nuevas en `species`) o si quedan fuera (opción A o B).
- **Recomendación (B) sin cambio:** tres columnas de corrección en `species_publication_requests`, copiadas a `species` al publicar. No se añade nada a `species` para estos tres campos, porque ya existen.
- **Efecto nuevo:** al publicar, los campos de especie cambian la fila compartida que lee `api-006` (`GET /api/v1/species`, app móvil). Ese endpoint ya los expone desde `species`; con el modelo nuevo el valor puede venir de una corrección aprobada por la Dirección.
- **`category`** sigue fuera de esta comparación (decidido el 2026-11-11): la solicitud la captura, la publicación la escribe y `api-015` la publica siempre.

## Reevaluación

- **Obligatoria** antes de aprobar la spec de pago con tarjeta en el portal, junto con su ADR y su proveedor (ADR 0009).
- **También** si la sección necesita una página propia por especie, un visor 3D, un carrusel, paginación o más lógica de cliente.
- **También** si el portal crece más allá de las páginas de `web-009`, de la galería de `web-010` y de TulanPedia, o si se requieren cookies o autenticación del visitante.

## Validación y revisión

- Aprobación del equipo: **pendiente.** Aprobado por: (pendiente, nombre del compañero). Hasta esa aprobación, `web-011` no puede pasar a Aprobada ni implementarse.
- Historial: 2026-11-11, cambio de modelo en el catálogo de especies. La solicitud pasa de «especie nueva creada al aceptar» a «publicación de una especie existente» (`api-014`). Términos actualizados: `published-species` (antes `accepted-species`), «especies publicadas», `species_publication_requests`. Nueva subsección «Recálculo con el modelo de publicación» que rehace el análisis de campos extra. La decisión de BD sobre los campos extra (pregunta 8 de DBR-013) sigue abierta. Sin cambio en la decisión ni en su estado (Propuesto). **2026-11-12 (tercera ronda):** TulanPedia no muestra especies despublicadas, con publicación eliminada o con una solicitud `update` viva sobre una especie despublicada (`web-011` CA-24, `api-015` CA-18). Esta excepción no cambia: la visibilidad sigue siendo solo `species.is_published = 1`. La decisión de `category` queda en su estado decidido (2026-11-11). La pregunta de campos extra sigue abierta para BD.
- Revisión obligatoria: al especificar el pago con tarjeta, al cambiar el alcance del portal, al pedir una página propia por especie y antes de producción (recomendación de almacenamiento de fotos).
- Constitución: no cambia. Esta es una excepción por app, registrada según `AGENTS.md` raíz.
- Enlaces: `apps/web/specs/011-dynamic-tulanpedia.md` (RN-02 a RN-07 y RN-11, CA-06, CA-08, CA-09, CA-11, CA-16, CA-17), `apps/web/specs/010-dynamic-memories.md`, `apps/web/specs/009-dynamic-news-events.md` (RN-05, RN-06, RN-08, CA-16), `apps/dashboard/specs/010-public-content-management.md` (CA-40 a CA-42, D-1, D-3), `apps/api/specs/015-public-species-read.md`, `apps/api/specs/014-species-requests.md`, `apps/api/specs/006-public-catalog-read.md`, `docs/adr/0024-web-static-portal-exception.md`, `docs/adr/0026-object-storage-s3-images.md` (enmienda de 2026-11-11), `docs/adr/0027-dynamic-public-memories-gallery.md`, `docs/adr/0009-pagos-electronicos-futuros.md`.
