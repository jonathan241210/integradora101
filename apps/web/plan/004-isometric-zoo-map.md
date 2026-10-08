# Plan técnico · 004 · isometric-zoo-map

- Spec: `apps/web/specs/004-isometric-zoo-map.md`
- Estado de spec: Implementada
- Responsable técnico: Por identificar
- Estado técnico: Implementado y verificado; el botón de restablecer permanece habilitado para conservar el foco al volver a 100 %.
- Fecha del plan: 2026-10-08

## Diseño de solución

Mantener el portal estático aprobado en `apps/web/src/`; no migrar framework ni incorporar paquetes. Reemplazar el dibujo esquemático actual por una escena local compuesta por un SVG decorativo como superficie ilustrada y controles HTML semánticos superpuestos para las zonas. Dibujar una base en perspectiva elevada con caminos, vegetación y recintos de formas geométricas; usar sombras, niveles y proyección CSS moderada para sugerir profundidad, sin mapa, tiles, georreferenciación ni datos de otro proveedor.

Representar Felinos, Aviario, Reptilario, Primates, Granja, Lago y Entrada en el mapa. Mantener también la leyenda actual de Entrada, Baños, Alimentos, Bebederos, Áreas de descanso, Enfermería y Tiendas. Cada control utiliza un SVG inline decorativo, con nombre visible asociado y `aria-pressed` sincronizado. Los SVG pueden reutilizar símbolos declarados en el mismo HTML; no cargar iconos desde CDN ni instalar Bootstrap Icons. El estilo será de trazos simples y consistentes, inspirado en iconografía de interfaz, no una copia de la biblioteca.

Reusar el estado de selección actual y la región `aria-live`; ampliar el controlador para activar igual desde mapa y leyenda, marcar todos los controles con el mismo `data-name` como seleccionados y retirar el estado anterior. Preservar activación nativa de botón con Enter/Espacio, orden de tabulación, foco visible y contenido alternativo en texto. Mantener el aviso de que el mapa es demostrativo y no está a escala.

Para el nuevo zoom, envolver el arte SVG y sus marcadores en un contenedor `.map-scene` que escale como una sola unidad mediante una variable CSS, dejando los controles fuera de esa transformación. Añadir tres botones HTML accesibles: acercar, alejar y restablecer. El zoom se limita al 100–150 % en pasos del 10 %; los botones direccionales quedan deshabilitados en su límite y exponen ese estado de forma nativa. Restablecer permanece habilitado también al 100 % para que su activación sea idempotente y no pierda el foco al regresar a la escala inicial. Un texto de estado visible y `aria-live="polite"` anuncia el porcentaje. Restablecer vuelve a 100 % sin cambiar la selección ni el foco. La nueva escala solo cambia presentación; no calcula distancia, ubicación o ruta.

El dibujo y los controles se adaptan al ancho: la superficie conserva aspect ratio, los botones no se salen del contenedor y, si falta la ornamentación SVG/CSS, los nombres y controles semánticos siguen estando presentes. La prueba existente en Node se ampliará con tests CA-01..CA-06, comprobación de los datos de zonas/leyenda y un test aislado de selección usando `node:vm`; la interacción visual en los viewports del CA-05 se comprobará en navegador integrado, sin nuevo paquete.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| Portal estático | `apps/web/src/index.html` | Mantener la escena SVG y marcadores existentes; agrupar arte y marcadores para zoom y añadir controles semánticos de acercar, alejar y restablecer. |
| Portal estático | `apps/web/src/styles.css` | Profundizar relieves visuales existentes sin alterar paleta; escalar escena agrupada, mantener controles externos a la escala y ajustar responsive/accesibilidad. |
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
| CA-01 | `CA-01 isometric-zoo-map` verifica escena SVG local con relieve/capas mejorados, senderos y ausencia de referencias a proveedores. | Node `node:test`; `apps/web/src/tests/relocation.test.mjs`. |
| CA-02 | `CA-02 isometric-zoo-map` comprueba todas las 13 zonas/servicios conservadas, asociación de icono SVG local, nombre accesible y texto correspondiente. | Node `node:test`; `apps/web/src/tests/relocation.test.mjs`. |
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

1. Plan actualizado aprobado por el solicitante el 2026-10-08.
2. Actualizar `apps/web/tasks/004-isometric-zoo-map.md` con tareas atómicas de zoom, selección y pruebas CA/RN; obtener aprobación del checklist actualizado.
3. Agrupar arte SVG y marcadores existentes, e incorporar botones y estado accesibles de zoom en `index.html`.
4. Refinar el relieve ilustrativo y los estilos responsive de la escena/controles en `styles.css`.
5. Integrar los estados de zoom y selección en `script.js`; comprobar límites, restablecimiento, anuncios y foco.
6. Añadir tests nombrados CA-01..CA-07, revisar los cinco viewports y el estado de selección, ejecutar suite protegida, `git diff --check` y `/verify`.
7. Marcar tareas y spec como Implementadas solo después de superar criterios y registrar evidencia.

La aprobación funcional del alcance ampliado fue otorgada por el solicitante el 2026-10-08. La aprobación técnica de este plan revisado y del checklist de tareas está pendiente. La revisión anterior de la escena tampoco pudo ejecutarse con navegador integrado; esta ampliación incluirá una revisión visual nueva de los viewports y no se marcará completa hasta registrarla.
