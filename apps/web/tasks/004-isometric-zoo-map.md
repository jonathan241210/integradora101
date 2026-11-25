# Tareas · 004 · isometric-zoo-map

- Spec: `apps/web/specs/004-isometric-zoo-map.md` (Estado: **Implementada**)
- Plan: `apps/web/plan/004-isometric-zoo-map.md` (Estado técnico: **Implementado y verificado**)
- Estado del checklist: Incremento de zoom aprobado; tareas implementadas y verificadas.
- Solicitada: 2026-10-08
- Aprobada: 2026-10-08

## Trazabilidad

| Criterio / regla | Tareas que lo cubren |
|---|---|
| CA-01 / RN-01 | T-02, T-03, T-06 |
| CA-02 / RN-02, RN-03 | T-02, T-04, T-06 |
| CA-03 / RN-01 | T-02, T-06 |
| CA-04 / RN-04, RN-05 | T-04, T-05, T-06 |
| CA-05 / RN-03, RN-05 | T-03, T-06, T-07 |
| CA-06 | T-06, T-13, T-14, T-15 |
| CA-07 / RN-05, RN-06 | T-10, T-11, T-12, T-14, T-15 |

## Implementación

- [x] **T-01** (CA-01..CA-06): antes de editar superficies compartidas, ejecutar y registrar las pruebas automatizadas de `003-lion-hero-mobile-navigation`, verificar `/verify`/diff y conservar la limitación visual responsive pendiente. La persona solicitante autorizó continuar sobre esta evidencia, sin afirmar que la verificación `scrollWidth` de CA-04 esté completa.
- [x] **T-02** (CA-01..CA-03; RN-01, RN-02): reemplazar el esquema `.map` de `apps/web/src/index.html` por una escena SVG local y una colección de botones semánticos para Felinos, Aviario, Reptilario, Primates, Granja, Lago y Entrada. Mantener la leyenda de servicios (Entrada, Baños, Alimentos, Bebederos, Áreas de descanso, Enfermería y Tiendas), el aviso demostrativo y el área viva; evitar recursos o referencias de proveedores externos.
- [x] **T-03** (CA-01, CA-02, CA-05; RN-01, RN-03, RN-05): implementar en `apps/web/src/styles.css` la superficie de mapa en perspectiva elevada/isométrica con caminos, recintos, niveles y SVG inline con estilo lineal propio; adaptar escena, marcadores, textos e iconos sin ocultar nombres ni provocar overflow. No cambiar paleta ni elementos fuera del mapa.
- [x] **T-04** (CA-02, CA-04; RN-02, RN-03, RN-05): añadir iconos SVG locales a cada marcador y control de la leyenda en `apps/web/src/index.html`; marcar los SVG decorativos como `aria-hidden`, conservar texto visible/nombre accesible y usar botones nativos con `aria-pressed` inicializado correctamente.
- [x] **T-05** (CA-04; RN-04, RN-05): actualizar el controlador de `apps/web/src/script.js` para seleccionar zonas/servicios tanto desde la escena como desde la leyenda, sincronizar resaltado y `aria-pressed` entre controles con el mismo nombre y actualizar la región `aria-live`, manteniendo foco y activación nativa.
- [x] **T-06** (CA-01..CA-06; RN-01..RN-05): agregar tests nombrados CA-01..CA-06 en `apps/web/src/tests/relocation.test.mjs`. Verificar SVG local y topología visual, las 13 zonas/servicios con etiquetas/iconos, aviso de mapa aproximado, selección/resaltado/aria en ambos controles, estilos responsive y solo imports Node builtins. Reutilizar el runner sin manifiesto ni dependencias nuevas; conservar hashes de assets existentes.

## Calidad y entrega

- [x] **T-07** (CA-01..CA-06): revisar en navegador integrado la escena a 360, 390, 768, 1024 y 1366 px, confirmar `scrollWidth <= innerWidth`, foco, leyenda e interacción.
- [x] **T-08** (CA-01..CA-06): ejecutar `/verify`, confirmar que `apps/web` continúa no inicializada al no tener `src/package.json`, revisar diffs para conservar los cambios previos del worktree y registrar tests, viewports y assets protegidos.
- [x] **T-09**: marcar spec, plan y tasks Implementados tras completar T-01..T-08; los artefactos quedan enlazados en esta checklist para el PR `web-004`.
- [x] **T-10** (CA-07; RN-05, RN-06): en `apps/web/src/index.html`, agrupar el SVG y todos los marcadores en una escena transformable; agregar botones semánticos de acercar, alejar y restablecer, con controles fuera de la escena y estado accesible.
- [x] **T-11** (CA-01, CA-05, CA-07; RN-01, RN-05, RN-06): refinar en `apps/web/src/styles.css` las capas, sombras y profundidad ilustrativa; definir escala visual responsive sin mover los controles ni generar desbordamiento.
- [x] **T-12** (CA-04, CA-07; RN-04..RN-06): en `apps/web/src/script.js`, implementar pasos de escala de 10 % dentro del rango 100–150 %, deshabilitar los botones direccionales al llegar al límite, anunciar la escala y restablecerla a 100 % sin cambiar la selección ni perder foco.
- [x] **T-13** (CA-01, CA-05, CA-06; RN-01, RN-03, RN-05): añadir/actualizar tests nombrados que comprueben profundidad local, escena agrupada y estilos responsive; conservar la cobertura actual de estructura, regiones y dependencias.
- [x] **T-14** (CA-07, CA-06; RN-05, RN-06): añadir un test aislado con `node:vm` para zoom hacia ambos límites, estado deshabilitado, cambio de escala, restablecimiento, anuncio, preservación de selección y foco.
- [x] **T-15** (CA-01, CA-05, CA-07): revisar en navegador 360, 390, 768, 1024 y 1366 px; confirmar zoom por teclado/puntero, interacción con marcadores, regreso a escala inicial y `scrollWidth <= innerWidth`.
- [x] **T-16** (CA-01..CA-07): ejecutar suite enfocada y completa, `git diff --check` y `/verify`; registrar los fallos preexistentes ajenos sin ocultarlos.
- [x] **T-17**: marcar spec, plan y tasks Implementados solo tras completar las verificaciones y preservar el historial de validación inicial.

No se crean rutas, endpoints, migraciones, almacenamiento, permisos de servidor ni dependencias. La enmienda aprobada sustituye la restricción histórica de no modificar assets: incorpora fotografía y modelo 3D locales. No se realiza `git add` ni `git commit` como parte de estas tareas.

## Enmienda aprobada · vista aérea 2D y mapa 3D ·

- [x] **T-18** (CA-01, CA-05, CA-07): sustituir el arte SVG por `assets/mapa-2d.jpg`, configurar `assets/mapa_corregido.glb` como modelo alterno y anunciar carga/error; ante error, volver a 2D. Mantener zonas, selección, zoom y navegación local.
  - Aprobación: solicitante, registrada en la revisión de la spec.
  - Evidencia: código integrado de la rama de trabajo de la galería 3D; los recursos `mapa-2d.jpg`, `mapacompleto.glb` y `model-viewer.min.js` son locales.
- [x] **T-19** (CA-01, CA-05): ajustar el test CA-01 y los documentos de plan/tasks a los nombres efectivos de los recursos; mantener pruebas de accesibilidad, error y ausencia de proveedores.
  - Evidencia: nombre `mapacompleto.glb` alineado en spec, test y mensaje de error; el test de integridad ya no exige el GLB retirado por la enmienda aprobada.
  - Archivos: `apps/web/specs/004-isometric-zoo-map.md`, `plan/004-isometric-zoo-map.md`, `tasks/004-isometric-zoo-map.md`, `src/index.html`, `src/styles.css`, `src/tests/relocation.test.mjs`, `src/assets/`.

## Evidencia de ejecución

- T-01..T-06: implementadas. La escena usa SVG/HTML local; las 13 zonas/servicios tienen controles etiquetados e iconos SVG propios, con `aria-pressed` sincronizado y anuncios en la región viva.
- Evidencia histórica de T-06 (implementación inicial): `node --test apps/web/src/tests/relocation.test.mjs`: 24 tests, 24 pass, 0 fail; los once assets protegidos conservan sus hashes.
- La limitación original de revisión visual quedó resuelta en T-07/T-15 con la validación actual en navegador documentada abajo.
- T-08: `/verify` reporta `apps/web` aún no inicializada porque no existe `apps/web/src/package.json`; `node --check apps/web/src/script.js`, `git diff --check` y diagnósticos editoriales pasan.
- T-07/T-15: revisión en navegador a 360, 390, 768, 1024 y 1366 px; en todos los anchos `documentElement.scrollWidth` coincidió con `clientWidth`, los controles permanecieron dentro de la tarjeta y los tres iconos de visita conservaron centrado y `margin-top: 8px`.
- T-10..T-14: escena agrupada con escala 100–150 % en saltos de 10 %, iconos SVG locales con símbolos internos, profundidad CSS, botones accesibles y estado vivo. La prueba de reset confirma que la selección y el foco sobreviven; el control Reset queda habilitado para no perder foco al volver a 100 %.
- T-16: `node --test apps/web/src/tests/relocation.test.mjs`: 29 tests, 29 pass, 0 fail; `node --check apps/web/src/script.js` y `git diff --check` pasan. En navegador se comprobó además el límite 150 %, estado deshabilitado del zoom de acercamiento y restablecimiento.
- T-16: `/verify` identifica `apps/web` aún no inicializada por falta de `apps/web/src/package.json`; no hay scripts npm de formato, lint, tipos o test que ejecutar. El favicon local responde HTTP 200 `image/jpeg`.
- No se creó PR ni commit en esta tarea; los tres artefactos `web-004` quedan identificados aquí para enlazarlos cuando se abra el PR.

- [x] **T-20** (CA-01, CA-05): sincronizar la referencia a `mapa_corregido.glb`, comprobar la cabecera y la longitud del recurso en CA-01 y conservar el retorno a 2D durante la carga o ante un error.
- [x] **T-21** (CA-01, CA-05): cargar `assets/MAPA_2D.svg`, ajustar el marco 2D a la proporción de la imagen y comprobar la referencia y dimensiones en CA-01.
- [x] **T-22** (CA-02, CA-04, CA-05): retirar la columna lateral, mantener accesibles los marcadores 2D y comprobar el estado de selección y el diseño adaptable.
- [x] **T-23** (CA-01, CA-05): centrar el SVG en un marco vertical, reservar el ancho de la tarjeta para el modelo 3D y encuadrar el modelo desde arriba.
- [x] **T-24** (CA-02, CA-04, CA-05, CA-07): retirar botones y controlador 2D, mantener el selector accesible, adaptar el marco 3D en móvil y configurar el visor para permitir el desplazamiento vertical.
- [x] **T-25** (CA-06): ajustar pruebas obsoletas tras retirar el controlador del mapa de `script.js`: el bloque de navegación de CA-03 (`lion-hero-mobile-navigation`, `header-walker-layer`) termina ahora en el marcador de la galería y CA-12 de `animals.test.mjs` verifica el estado del alternador (`mapViewer`, `viewerLoading`) en lugar de `viewerLoaded`.

## Enmienda del 24 de noviembre de 2026

La persona solicitante aprobó los pasos de integración, consulta y verificación descritos en el plan.

- [x] **T-26** (CA-01/02/03/04/07). Integrar el PNG original y el GLB exportado del generador con sus rótulos. Adaptar las pruebas del plano y del modelo.
- [x] **T-27** (CA-05/08/09). Añadir las consultas públicas, el directorio adaptable y pruebas de sus contenidos y estados por grupo.
- [x] **T-28** (CA-01 a CA-09). Ejecutar la suite completa y revisar ambas vistas, la posición del directorio y la navegación por teclado en navegador.

**Evidencia del 24 de noviembre de 2026.** La suite `node --test --test-isolation=none apps/web/src/tests/*.test.mjs` completó 178 pruebas, todas aprobadas. `node --check` pasó en los dos módulos del directorio y `git diff --check` pasó. El portal estático carece de manifiesto npm y de scripts de formato, lint o tipos. La imagen distribuida coincide byte por byte con el PNG entregado. El GLB tiene 58 recintos con rótulos convertidos a mallas.

En Chrome, cada nombre de las dos listas coincidió con su respuesta pública (63 recintos y 18 lugares en esta revisión). Se comprobó la disposición debajo a 360, 390 y 768 px y a la derecha a 1024 y 1366 px. La página mantuvo su ancho, el GLB cargó bajo demanda y el teclado permitió alternar las vistas y recorrer las listas. Con respuestas de prueba se comprobaron un catálogo vacío, un fallo parcial y la recuperación del plano al fallar el GLB.

## Zoom en ambas vistas · 24 de noviembre de 2026

- [x] **T-29** (CA-02/05/10). Incorporar controles comunes, lectura de porcentaje y desplazamiento del plano ampliado.
- [x] **T-30** (CA-07/10/11). Ajustar la cámara del modelo y sincronizar controles durante la carga, el cambio de vista y la recuperación de un error.
- [x] **T-31** (CA-02/05/07/10/11). Ejecutar la suite del portal y verificar zoom, límites, teclado y encuadre en navegador de escritorio y móvil.

**Verificación.** Pasaron las 181 pruebas del portal. En Chrome de escritorio a 1366 px y en una pantalla táctil emulada de 390 px se comprobó el recorrido entre 100 y 300 %, el acceso a los bordes del PNG, la distancia y rotación de la cámara 3D, la memoria por vista y el restablecimiento. La rueda sobre el modelo permite desplazar la página. La prueba CA-11 cubre la carga pendiente, el fallo y el retorno a 2D.

## Sustitución del plano 2D por SVG

- [x] **T-32** (CA-01/05/10). Sustituir la imagen del plano por el SVG suministrado y verificar su formato y controles.

## Marcadores públicos del plano

- [x] **T-33** (CA-12). Vincular ambos catálogos a la capa del plano y comprobar nombres, posiciones, datos parciales y zoom.

En Chrome se contrastaron nombres y coordenadas de los 60 recintos y 6 lugares posicionados con las dos respuestas de la API. Se verificó la alineación al ampliar a 1366 y 390 px. La suite completa pasó sus 182 pruebas.

## Modelo de Blender y arrastre del plano

- [x] **T-34** (CA-13/14). Comprobar la exportación, la proyección de los puntos públicos y el arrastre del plano ampliado, incluido el final del gesto.

Chrome cargó el GLB y se contrastaron los 66 hotspots con la API local. Se verificó el arrastre del plano en cuatro direcciones y su detención al soltar. Pasaron las 184 pruebas del portal.

## Exploración desde el directorio

- [x] **T-35** (CA-15). Implementar y verificar búsqueda, filtro y localización en 2D y 3D.

En Chrome se verificaron la búsqueda, el filtro por tipo, la localización del registro en 2D y 3D, el estado sin coincidencias y el ancho móvil de 390 px. Pasaron las 185 pruebas del portal.

## Inicio junto a Boletaje

- [x] **T-36** (CA-16). Colocar Inicio junto a Boletaje en las dos vistas y verificar el caso sin coordenadas de Boletaje.

## Visibilidad de los accesos

- [x] **T-37** (CA-17). Verificar los rótulos de los dos mapas con y sin registros públicos.
