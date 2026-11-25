# Plan técnico · 004 · isometric-zoo-map

- Spec: `apps/web/specs/004-isometric-zoo-map.md`
- Estado de spec: Implementada
- Solicitada: 2026-10-08
- Aprobada: 2026-10-08
- Responsable técnico: Frontend
- Estado técnico: Implementado. La enmienda vigente retira los marcadores interactivos y el zoom 2D. El marco mantiene el SVG completo y el visor 3D usa proporción 4:3 en móviles. Se conserva la rotación con `camera-controls` y se configuran `disable-zoom`, `disable-pan` y `touch-action="pan-y"` para permitir el desplazamiento vertical. Las referencias a selección y zoom corresponden a revisiones previas.
- Aprobación técnica: Aprobada

## Diseño de solución

**Enmienda aprobada:** la superficie 2D pasa a usar la fotografía local `assets/mapa-2d.jpg`; el control alterna a `assets/mapacompleto.glb` mediante el `model-viewer` local existente. El estado de carga/error se anuncia en una región viva y, si falla el GLB, se restaura la vista 2D. Esta enmienda sustituye la ilustración dibujada descrita en el plan original, conserva los marcadores y controles de zoom, y no incorpora dependencias ni recursos externos.

Mantener el portal estático aprobado en `apps/web/src/`; no migrar framework ni incorporar paquetes. Reemplazar el dibujo esquemático actual por una escena local compuesta por un SVG decorativo como superficie ilustrada y controles HTML semánticos superpuestos para las zonas. Dibujar una base en perspectiva elevada con caminos, vegetación y recintos de formas geométricas; usar sombras, niveles y proyección CSS moderada para sugerir profundidad, sin mapa, tiles, georreferenciación ni datos de otro proveedor.

Representar Felinos, Aviario, Reptilario, Primates, Granja, Lago y Entrada en el mapa. Retirar la columna lateral aprobada en la enmienda. Cada control utiliza un SVG decorativo, un nombre accesible y `aria-pressed` sincronizado.

Reusar el estado de selección actual y la región `aria-live`; ampliar el controlador para activar igual desde mapa y leyenda, marcar todos los controles con el mismo `data-name` como seleccionados y retirar el estado anterior. Preservar activación nativa de botón con Enter/Espacio, orden de tabulación, foco visible y contenido alternativo en texto. Mantener el aviso de que el mapa es demostrativo y no está a escala.

Para el nuevo zoom, envolver el arte SVG y sus marcadores en un contenedor `.map-scene` que escale como una sola unidad mediante una variable CSS, dejando los controles fuera de esa transformación. Añadir tres botones HTML accesibles: acercar, alejar y restablecer. El zoom se limita al 100–150 % en pasos del 10 %; los botones direccionales quedan deshabilitados en su límite y exponen ese estado de forma nativa. Restablecer permanece habilitado también al 100 % para que su activación sea idempotente y no pierda el foco al regresar a la escala inicial. Un texto de estado visible y `aria-live="polite"` anuncia el porcentaje. Restablecer vuelve a 100 % sin cambiar la selección ni el foco. La nueva escala solo cambia presentación; no calcula distancia, ubicación o ruta.

El dibujo y los controles se adaptan al ancho: la superficie conserva aspect ratio, los botones no se salen del contenedor y, si falta la ornamentación SVG/CSS, los nombres y controles semánticos siguen estando presentes. La prueba existente en Node se ampliará con tests CA-01..CA-06, comprobación de los datos de zonas/leyenda y un test aislado de selección usando `node:vm`; la interacción visual en los viewports del CA-05 se comprobará en navegador integrado, sin nuevo paquete.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| Portal estático | `apps/web/src/index.html` | Mantener la escena SVG y marcadores existentes; agrupar arte y marcadores para zoom y añadir controles semánticos de acercar, alejar y restablecer. |
| Portal estático | `apps/web/src/styles.css` | Profundizar relieves visuales existentes sin alterar paleta; escalar escena agrupada, mantener controles externos a la escala y ajustar responsive/accesibilidad. |
| Portal / mapa actualizado | `apps/web/src/index.html`, `apps/web/src/styles.css` | Mostrar la fotografía 2D local, alternar el GLB local y anunciar carga/error con retorno a 2D; conservar marcadores y zoom. |
| Recursos locales | `apps/web/src/assets/MAPA_2D.svg`, `mapa_corregido.glb` | Suministrar la vista 2D y el modelo 3D aprobado, sin servicios externos. El marco 2D mantiene la proporción de la imagen vertical 2160 × 2304. |
| Portal estático | `apps/web/src/script.js` | Conservar la selección sincronizada e implementar zoom acotado 100–150 %, estado accesible y restablecimiento sin modificar selección/foco. |
| Pruebas | `apps/web/src/tests/relocation.test.mjs` | Añadir pruebas nombradas para CA-01..CA-07 y simulación de selección/zoom con builtins Node; conservar hashes de assets existentes y pruebas de 001..003. |
| Artefactos SDD relacionados | `apps/web/specs/001-relocate-static-portal.md`, `apps/web/plan/001-relocate-static-portal.md`, `apps/web/tasks/001-relocate-static-portal.md` | Ampliar el registro de alcance posterior solo si se requiere una excepción de integridad estructural adicional para esta feature; no borrar evidencias históricas. |
| Artefactos de feature | `apps/web/specs/004-isometric-zoo-map.md`, `apps/web/plan/004-isometric-zoo-map.md`, `apps/web/tasks/004-isometric-zoo-map.md` | Mantener trazabilidad de aceptación, implementación y verificación. |

## Contrato y datos

- Endpoints con rutas nombradas, autenticación y permisos: No aplica; mapa público completamente local.
- Validación/Form Requests, Actions, Resources y Policies: No aplica; la selección solo actualiza presentación y estado efímero.
- Migraciones, `BaseModel`, auditoría y SoftDeletes: No aplica; no se crea, consulta ni modifica almacenamiento.
- Errores y compatibilidad: Sin red ni proveedor, el mapa no depende de claves, cuota, cookies o geolocalización. El SVG es decorativo; etiquetas y botones HTML constituyen el contenido funcional. Los errores de dibujo no silencian los nombres ni la selección de zonas.

## Seguridad, offline y operación

- No hay solicitudes `fetch`/`axios`, dependencias remotas, imágenes satelitales, telemetría o carga de datos.
- No hay permisos del dispositivo ni acceso a ubicación; no se almacena la selección.
- La superficie dibujada contiene únicamente formas estáticas controladas por el repositorio; no se genera SVG desde input del usuario.
- Portabilidad: SVG inline, HTML, CSS y DOM estándar compatibles con el portal estático y servidores locales/Google Cloud.
- No hay sincronización ni dependencias offline adicionales; el mapa ya es local y permanece utilizable sin servicios externos.
- Accesibilidad: botones nativos con texto, SVG decorativos `aria-hidden`, `aria-pressed`, foco visible, activación por teclado, región viva y aviso de mapa aproximado.
- Verificación: `node --test apps/web/src/tests/relocation.test.mjs`, revisión con navegador integrado para 360, 390, 768, 1024 y 1366 px, `git diff --check` y `/verify`. `apps/web` carece de `src/package.json`, por lo que la suite de la app se declara no inicializada; no se crean scripts npm.

## Mapeo de criterios a pruebas

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | `CA-01 isometric-zoo-map` verifica fotografía 2D y GLB locales, alternancia con estado de carga/error y ausencia de proveedores. | Node `node:test`; `apps/web/src/tests/relocation.test.mjs`. |
| CA-02 | `CA-02 isometric-zoo-map` comprueba los siete marcadores accesibles y la ausencia de la columna lateral. | Node `node:test`; `apps/web/src/tests/relocation.test.mjs`. |
| CA-03 | `CA-03 isometric-zoo-map` comprueba texto visible de mapa demostrativo/no a escala/no preciso y estructura accesible. | Node `node:test`; `apps/web/src/tests/relocation.test.mjs`. |
| CA-04 | `CA-04 isometric-zoo-map` ejecuta el controlador de selección en DOM simulado y comprueba anuncio, resaltado y `aria-pressed` para mapa/leyenda. | Node `node:test` con `node:vm`; `apps/web/src/tests/relocation.test.mjs`. |
| CA-05 | `CA-05 isometric-zoo-map` comprueba reglas responsive para escena, marcadores y controles; navegador integrado revisa layout/foco/sin desbordamiento en los cinco viewports. | Node `node:test` y navegador integrado; `apps/web/src/tests/relocation.test.mjs`. |
| CA-06 | `CA-06 isometric-zoo-map` confirma tests nombrados CA-01..CA-07, imports limitados a builtins y ausencia de dependencias/manifiesto nuevos. | Node `node:test`; `apps/web/src/tests/relocation.test.mjs`. |
| CA-07 | `CA-07 isometric-zoo-map` simula límites inferior/superior, pasos de escala, actualización del estado, restablecimiento, conservación de selección y foco. | Node `node:test` con `node:vm`; `apps/web/src/tests/relocation.test.mjs`. |

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | Solo HTML, SVG, CSS, DOM y Node builtins; no se añaden servicios o dependencias. El mantenimiento del portal estático sigue la excepción funcional aprobada en spec 001 y features previas. |
| II. La spec manda | Sí | La spec 004 aprobada incluye la ampliación; implementación limitada a escena ilustrativa, iconos, selección y zoom local descritos. |
| III. Lógica separada de la interfaz | Sí | No se introducen lógica de negocio, peticiones de red, cálculos de recorrido ni acciones de servidor. |
| IV. Un test por criterio | Sí, planeado | Se incorporarán pruebas nombradas CA-01..CA-07, incluidos tests simulados para interacción de selección y zoom. |
| V. Una sola fuente de verdad para los datos | Sí | Sin datos ni persistencia; la posición visual del diagrama no pretende ser registro geográfico. |
| VI. Código en inglés, personas en español | Sí | Clases, ids y funciones en inglés; contenido y documentación al visitante en español. |

No se requiere excepción constitucional ni ADR.

## Riesgos y decisiones

- ADR requerido/aprobado: No aplica; no se incorporan tecnologías nuevas.
- Decisiones aprobadas: ilustración aproximada; no fotografía satelital, API, proveedor o mapa real; zonas actuales únicamente; SVG creados localmente con estilo similar a Bootstrap Icons; no incorporar Bootstrap Icons.
- Riesgo de confundir la ilustración con el plano real: mitigación con aviso permanente, leyenda y copy explícito; no usar escala, brújula ni rutas como si fueran precisas.
- Riesgo de superposición de marcadores en móvil: mitigación con coordenadas porcentuales probadas, ajuste responsive y posibilidad de seleccionar también la lista en columna.
- Riesgo de duplicar anuncios accesibles por SVG y texto: los SVG de cada control serán decorativos y el nombre provendrá del texto visible.
- Riesgo de selector no sincronizado entre mapa y leyenda: se actualiza por igualdad del mismo `data-name` y `aria-pressed` en ambas vistas, cubierto con test de interacción.
- Riesgo de que el zoom haga que marcadores desaparezcan fuera del viewport: el zoom se aplica al grupo completo de arte y marcadores, se limita a 150 % y conserva el recorte del contenedor; se verifica en viewports de aceptación.
- Riesgo de confundir aumento visual con escala real: se mantiene el aviso del mapa aproximado y se comunica que el control cambia solo la visualización.

## Orden y aprobación

1. Plan actualizado aprobado por el solicitante.
2. Actualizar `apps/web/tasks/004-isometric-zoo-map.md` con tareas atómicas de zoom, selección y pruebas CA/RN; obtener aprobación del checklist actualizado.
3. Agrupar arte SVG y marcadores existentes, e incorporar botones y estado accesibles de zoom en `index.html`.
4. Refinar el relieve ilustrativo y los estilos responsive de la escena/controles en `styles.css`.
5. Integrar los estados de zoom y selección en `script.js`; comprobar límites, restablecimiento, anuncios y foco.
6. Añadir tests nombrados CA-01..CA-07, revisar los cinco viewports y el estado de selección, ejecutar suite protegida, `git diff --check` y `/verify`.
7. Marcar tareas y spec como Implementadas solo después de superar criterios y registrar evidencia.

La aprobación funcional del alcance ampliado fue otorgada por el solicitante. La aprobación técnica de este plan revisado y del checklist de tareas está pendiente. La revisión anterior de la escena tampoco pudo ejecutarse con navegador integrado; esta ampliación incluirá una revisión visual nueva de los viewports y no se marcará completa hasta registrarla.

El bot?n carga `assets/mapa_corregido.glb` bajo HTTP o HTTPS. El visor solicita el modelo al activarse, respeta el retorno a 2D durante la carga y permite volver a intentar despu?s de un error.

## Enmienda del 24 de noviembre de 2026

La revisión funcional aprobada al final de la spec reemplaza el contrato anterior de recursos y columna lateral. El trabajo comprende tres pasos.

1. Distribuir el PNG original y exportar la escena del generador en una sesión limpia de Blender. Convertir los rótulos a mallas y conservar las geometrías, los materiales y el encuadre aéreo. Cargar el GLB a demanda con el visor local y ajustar el marco al formato 4:3 del plano.
2. Añadir un directorio semántico junto a la tarjeta, debajo en pantallas estrechas. Reutilizar el cliente público de la portada para consultar en paralelo las rutas nombradas `enclosures.index` y `zoo-places.index`. Cada grupo renderiza nombres como texto y comunica sus estados con independencia del mapa y del otro grupo.
3. Verificar PNG y GLB (CA-01/02), controles y aviso (CA-03/04/07), disposición adaptable (CA-05), suite completa (CA-06) y nombres, duplicados legítimos, lentitud, listas vacías y fallos parciales (CA-08/09). Probar ambas vistas en navegador.

**Revisión constitucional I–VI.** Se aprovechan el visor y el cliente existentes (I). La enmienda de web-004 delimita los cambios (II). La API decide la visibilidad y el portal presenta el resultado (III). Se asignan pruebas a los criterios en la suite estática (IV). Los catálogos públicos continúan siendo la fuente de verdad y se verificó el esquema de arca_pruebas (V). Los identificadores de código van en inglés y la interfaz en español (VI). El ADR 0033 registra la excepción de III y IV acotada al nuevo directorio. La portada mantiene su funcionamiento sin sesión ni almacenamiento de datos del visitante.

La persona solicitante aprobó este plan, el ADR 0033 y la ejecución de los tres pasos el 24 de noviembre de 2026.

## Zoom en ambas vistas · 24 de noviembre de 2026

El controlador del mapa gestionará botones comunes y una escala independiente por vista, del 100 al 300 % en pasos de 25 puntos. El PNG crecerá en un área desplazable, conservando el centro visible al cambiar de escala. En 3D se ajustará el radio de la cámara del visor local alrededor del punto de interés. Los botones quedarán fuera del área que se amplía. Se comprobarán los límites, el cambio de vista y la recuperación de errores (CA-02/07/10/11), con pruebas del controlador y del modelo en navegador. El cambio de presentación utiliza los recursos y catálogos vigentes.

## Sustitución del plano 2D por SVG

Usar el SVG original como imagen local del plano 2D en el marco 4:3 y verificar su referencia, área de dibujo y zoom.

## Marcadores públicos del plano

Reutilizar las dos lecturas del directorio para situar los marcadores por map_x y map_y normalizados, sobre la misma superficie que se amplía. Ocultar la capa ilustrativa icons_auto. La consulta de arca_pruebas de esta revisión confirmó ambas columnas en las dos tablas (DBR-008 y DBR-019). El contrato público existente cubre el cambio sin migraciones.

## Modelo de Blender y arrastre del plano

Exportar la geometría del archivo suministrado a GLB y sustituir sus etiquetas estáticas por hotspots de model-viewer. Los 57 puntos comunes entre Blender y el SVG confirman 0,01 m por píxel y un origen glTF de (−8,02590, −5,14037) en X/Z. Aplicar esta transformación a los registros posicionados que ya recibe el directorio. El arrastre usa captura de puntero en el plano 2D ampliado.

## Exploración desde el directorio

Filtrar en memoria las respuestas del directorio, usar una sola zona de resultados y localizar cada registro mediante su catálogo e identificador en el plano o en el modelo. Mantener los estados independientes de carga y error.

## Inicio junto a Boletaje

Aplicar la posición relativa a los lugares públicos antes de dibujar sus marcadores 2D y 3D. Separar los puntos 48 píxeles en horizontal y 20 en vertical en el plano de 1600 × 1200. Si falta una posición válida para Boletaje, conservar la posición pública de Inicio.

## Visibilidad de los accesos

Representar ambos hitos cartográficos con los IDs públicos cuando existan, usando el centro canónico de Boletaje si faltan coordenadas. Las referencias locales se limitan al dibujo.

## Selección de un área en 3D

Para CA-22 y CA-23, el directorio y los marcadores activan la misma operación en el visor. El visor centra la cámara en la posición del marcador y aplica el nivel absoluto del 200 % con el controlador de zoom existente. Una flecha de CSS acompaña al marcador activo. Restablecer limpia la selección. Si el modelo está cargando, se aplica la última selección cuando esté listo.

Para CA-23, el rótulo usa el mismo estado de selección que la flecha. Su ancho se ajusta al nombre y al espacio del visor, con salto de línea para nombres largos.
