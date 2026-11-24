# Tareas · 011 · loading-notices-and-animal-view

- Solicitada: 2026-11-19
- Aprobada: 2026-11-19
- Spec: `apps/pwa/specs/011-loading-notices-and-animal-view.md`
- Plan: `apps/pwa/plan/011-loading-notices-and-animal-view.md`
- Aprobación del checklist: implementación autorizada por el solicitante.

## Implementación y pruebas

- [x] **T-01 (CA-01, RN-01)**. Actualizar `Spinner`, `LoadingScreen` y sus estilos. Reutilizar el indicador en las esperas de datos, fotos, envío y sincronización que hoy muestran solo texto. Mantener las etiquetas en español, el bloqueo de acciones ocupadas y el estado visible con movimiento reducido.
- [x] **T-02 (CA-01)**. Añadir una prueba Vitest que compruebe el indicador, la etiqueta accesible, los estados de espera y la regla de movimiento reducido.
- [x] **T-03 (CA-02, RN-01, RN-02)**. Adaptar `ToastCenter` y sus estilos a móvil y escritorio. Diferenciar las variantes por icono y color, mantener una región viva y hacer visible el foco del botón de cierre. Reutilizar la suscripción y el cierre existentes.
- [x] **T-04 (CA-02)**. Añadir una prueba Vitest de región viva, variantes y cierre de avisos con registros de prueba.
- [x] **T-05 (CA-03, RN-03)**. Colocar «Orden» en su propia fila debajo del buscador y antes del listado en `AnimalsView`. Alinear a la derecha y adaptar al ancho móvil, conservando búsqueda, opciones y paginación.
- [x] **T-06 (CA-03)**. Añadir una prueba Vitest de ubicación del selector y del comportamiento del orden junto con búsqueda y paginación.
- [x] **T-07 (CA-04, RN-01, RN-03)**. En `AnimalProfileView`, activar la ampliación sobre la foto cargada y reutilizar `Dialog` con la imagen ajustada, un botón «Cerrar», Escape y retorno de foco. Conservar la acción de cambiar foto y los estados sin imagen o con error.
- [x] **T-08 (CA-04)**. Añadir una prueba Vitest de disponibilidad de la ampliación y de la acción independiente para cambiar foto. Cubrir apertura y cierre con las capacidades de prueba existentes.

## Calidad y entrega

- [x] **T-09 (CA-01 a CA-04)**. Ejecutar `/verify` y registrar el resultado de las pruebas y la compilación. Revisar en navegador la ubicación del selector, los avisos en pantallas estrechas, el ajuste de la imagen, el foco, Escape y el movimiento reducido.
- [x] **T-10 (CA-03, CA-04)**. Actualizar el flujo de consulta de animales en `apps/pwa/README.md`.
- [ ] **T-11**. Enlazar spec, plan y tareas en el PR de entrega.

Verificación local: `npm test` aprobó 122 pruebas. `npm run build` compiló con un aviso de tamaño en el módulo de PDF. La compilación ejecuta TypeScript. No hay scripts separados de formato, lint o tipos.

En Edge a 492 px y con movimiento reducido se verificaron la posición del selector, el ajuste del visor, el retorno de foco y el cierre del aviso. Vitest cubrió el evento de cancelación del diálogo.
