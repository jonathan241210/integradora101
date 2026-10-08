# Plan técnico · 004 · isometric-zoo-map

- Spec: `apps/web/specs/004-isometric-zoo-map.md`
- Estado de spec: Aprobada
- Responsable técnico: Por identificar
- Estado técnico: En progreso
- Fecha del plan: 2026-10-08

## Diseño de solución

Mantener el portal estático aprobado en `apps/web/src/`; no migrar framework ni incorporar paquetes. Reemplazar el dibujo esquemático actual por una escena local compuesta por un SVG decorativo como superficie ilustrada y controles HTML semánticos superpuestos para las zonas. Dibujar una base en perspectiva elevada con caminos, vegetación y recintos de formas geométricas; usar sombras, niveles y proyección CSS moderada para sugerir profundidad, sin mapa, tiles, georreferenciación ni datos de otro proveedor.

Representar Felinos, Aviario, Reptilario, Primates, Granja, Lago y Entrada en el mapa. Mantener también la leyenda actual de Entrada, Baños, Alimentos, Bebederos, Áreas de descanso, Enfermería y Tiendas. Cada control utiliza un SVG inline decorativo, con nombre visible asociado y `aria-pressed` sincronizado. Los SVG pueden reutilizar símbolos declarados en el mismo HTML; no cargar iconos desde CDN ni instalar Bootstrap Icons. El estilo será de trazos simples y consistentes, inspirado en iconografía de interfaz, no una copia de la biblioteca.

Reusar el estado de selección actual y la región `aria-live`; ampliar el controlador para activar igual desde mapa y leyenda, marcar todos los controles con el mismo `data-name` como seleccionados y retirar el estado anterior. Preservar activación nativa de botón con Enter/Espacio, orden de tabulación, foco visible y contenido alternativo en texto. Mantener el aviso de que el mapa es demostrativo y no está a escala.

El dibujo y los controles se adaptan al ancho: la superficie conserva aspect ratio, los botones no se salen del contenedor y, si falta la ornamentación SVG/CSS, los nombres y controles semánticos siguen estando presentes. La prueba existente en Node se ampliará con tests CA-01..CA-06, comprobación de los datos de zonas/leyenda y un test aislado de selección usando `node:vm`; la interacción visual en los viewports del CA-05 se comprobará en navegador integrado, sin nuevo paquete.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| Portal estático | `apps/web/src/index.html` | Reemplazar la topología gráfica actual por escena SVG inline con botones HTML de zonas e iconos inline para mapa/leyenda. |
| Portal estático | `apps/web/src/styles.css` | Crear la superficie ilustrada elevada/isométrica, profundidad por capas, marcadores, estado seleccionado, tipografía/iconos legibles y responsive. |
| Portal estático | `apps/web/src/script.js` | Sincronizar selección, `aria-pressed`, resaltado de la zona correspondiente y anuncio existente; no añadir persistencia ni geolocalización. |
| Pruebas | `apps/web/src/tests/relocation.test.mjs` | Añadir tests nombrados para CA-01..CA-06 y test de interacción con builtins Node; conservar hashes de assets existentes y pruebas de 001..003. |
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
| CA-01 | `CA-01 isometric-zoo-map` verifica presencia de escena SVG local, composición de relieve/senderos/zones y ausencia de referencias a proveedores. | Node `node:test`; `apps/web/src/tests/relocation.test.mjs`. |
| CA-02 | `CA-02 isometric-zoo-map` comprueba todas las 13 zonas/servicios conservadas, asociación de icono SVG local, nombre accesible y texto correspondiente. | Node `node:test`; `apps/web/src/tests/relocation.test.mjs`. |
| CA-03 | `CA-03 isometric-zoo-map` comprueba texto visible de mapa demostrativo/no a escala/no preciso y estructura accesible. | Node `node:test`; `apps/web/src/tests/relocation.test.mjs`. |
| CA-04 | `CA-04 isometric-zoo-map` ejecuta el controlador de selección en DOM simulado y comprueba anuncio, resaltado y `aria-pressed` para mapa/leyenda. | Node `node:test` con `node:vm`; `apps/web/src/tests/relocation.test.mjs`. |
| CA-05 | `CA-05 isometric-zoo-map` comprueba reglas responsive y affordances de controles; navegador integrado revisa el layout, el foco y `scrollWidth <= innerWidth` en los cinco viewports de la spec. | Node `node:test` y navegador integrado; `apps/web/src/tests/relocation.test.mjs`. |
| CA-06 | `CA-06 isometric-zoo-map` confirma tests nombrados CA-01..CA-06, imports limitados a builtins y ausencia de dependencias/manifiesto nuevos. | Node `node:test`; `apps/web/src/tests/relocation.test.mjs`. |

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | Solo HTML, SVG, CSS, DOM y Node builtins; no se añaden servicios o dependencias. El mantenimiento del portal estático sigue la excepción funcional aprobada en spec 001 y features previas. |
| II. La spec manda | Sí | La spec 004 está Aprobada. La implementación futura queda limitada a escena ilustrativa, iconos y controles funcionales que describe. |
| III. Lógica separada de la interfaz | Sí | No se introducen lógica de negocio, peticiones de red, cálculos de recorrido ni acciones de servidor. |
| IV. Un test por criterio | Sí | La prueba persistente incorpora tests llamados CA-01..CA-06 y un test de interacción de selección. |
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

## Orden y aprobación

1. Obtener aprobación técnica de este plan.
2. Preparar `apps/web/tasks/004-isometric-zoo-map.md` con tareas atómicas y trazabilidad CA/RN.
3. Implementar SVG local y controles/leyenda semánticos en `index.html`.
4. Implementar estilo 3D ilustrativo responsive e iconografía en `styles.css`.
5. Integrar selección/resaltado/aria en `script.js` y crear pruebas nombradas con `node:test`.
6. Ejecutar pruebas, verificar los cinco viewports visualmente, comprobar assets protegidos, `git diff --check` y `/verify`.
7. Marcar las tareas y la spec como Implementadas solo después de superar todos los criterios y registrar evidencia.

La aprobación funcional de la spec, la aprobación técnica del plan y la aprobación de las tareas fueron otorgadas por la persona solicitante el 2026-10-08 en esta conversación. La persona solicitante autorizó también continuar con pruebas automatizadas y documentar la limitación visual pendiente de la feature 003; se conserva dicha evidencia incompleta y no se marca su CA-04 como comprobado. La revisión visual responsive del mapa tampoco pudo ejecutarse con el navegador integrado y queda pendiente, sin afirmar que `scrollWidth` esté medido.
