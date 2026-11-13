# Tareas · 011 · collapsible-menu-event-pagination

- Spec: `apps/dashboard/specs/011-collapsible-menu-event-pagination.md` (aprobada).
- Plan: `apps/dashboard/plan/011-collapsible-menu-event-pagination.md` (aprobado para implementar por la persona solicitante; validación técnica del equipo pendiente).

## Implementación y verificación

- [x] **T-01** (CA-01, CA-02, CA-06): Añadir estado temporal de menú de escritorio y botón accesible; contraer a iconos solo en administración y ejecutivo, preservando menú móvil, permisos, tokens y taquilla.
- [x] **T-02** (CA-03, CA-04, CA-05): Paginar los eventos recibidos en grupos de cuatro desde el ViewModel, reutilizando la barra existente y conservando edición, confirmaciones, orden y operaciones.
- [x] **T-03** (CA-01 a CA-07): Añadir pruebas centradas en estados del menú, límites de página, cambios y confirmaciones; ejecutar tipos, suite y build.
- [x] **T-04** (CA-02, CA-06): Revisar en navegador, con datos simulados, teclado y anchos de 360, 768 y 1366 px; documentar alcance y resultados.
- [x] **T-05**: Actualizar manual del dashboard, estado y trazabilidad.

## Evidencia

- `npm run types`, `npm test` (308 pruebas) y `npm run build` completados correctamente; `git diff --check` sin errores.
- En navegador, con respuestas simuladas: menú de escritorio contraído y expandido con teclado; menú móvil a 360 y 768 px con Escape y retorno de foco; sin desbordamiento horizontal a 360, 768 y 1366 px. El perfil de taquilla conserva su navegación y no muestra el botón de escritorio.
- Con nueve eventos simulados se recorrieron tres páginas, se bloqueó la paginación durante la confirmación y, al eliminar el único evento de la última página, se mostró la página 2 de 2 con cuatro eventos. No se modificaron datos reales.
- Sigue pendiente la validación técnica del equipo indicada en el plan.

## Ajuste solicitado: despliegue automático

- [x] **T-06** (CA-01, CA-02, CA-06): Iniciar el menú de escritorio contraído y desplegarlo con cursor o foco, conservando el botón para fijarlo abierto y el menú móvil; actualizar pruebas y manual.
- [x] **T-07** (CA-01, CA-02, CA-06): Verificar tipos, pruebas y compilación, además de cursor, foco y anchos adaptables en navegador.

Se verificaron tipos, 309 pruebas, build y `git diff --check`. En navegador con datos simulados se comprobó el despliegue por cursor y foco a 900 y 1366 px, sin desplazar el contenido; también el estado del botón de fijación y la apertura y cierre móviles a 360 y 768 px. No hubo desbordamiento horizontal en esos anchos. La pestaña compartida estaba oculta: la activación del botón se comprobó con eventos simulados, no con una pulsación física de teclado.

## Ajuste solicitado: taquilla

- [x] **T-08** (CA-01, CA-02, CA-06, CA-08): Aplicar el menú de iconos y mejorar visualmente venta e historial de taquilla sin modificar sus operaciones ni impresión.
- [x] **T-09** (CA-06, CA-08): Actualizar pruebas y manual; verificar tipos, suite, build y navegación y venta con datos simulados en navegador.

Se verificaron tipos, 310 pruebas, build y `git diff --check`. Con respuestas simuladas se comprobó el menú por cursor y foco, la cotización, el resultado de venta, el historial y la presentación de tres boletos en modo impresión. Venta e historial no presentaron desbordamiento de página a 360, 768 y 1366 px; el menú móvil se abrió y cerró con eventos simulados. No se registraron ventas reales. La validación técnica del equipo sigue pendiente.

## Ajuste solicitado: animaciones

- [x] **T-10** (CA-09): Suavizar el menú y animar el resultado de venta, respetando movimiento reducido y la impresión.
- [x] **T-11** (CA-09): Verificar pruebas, compilación y comportamiento en navegador con datos simulados.

Se verificaron tipos, 314 pruebas, build y `git diff --check`. Con respuestas simuladas se comprobó la transición de los menús de administración y taquilla, foco, menú móvil a 360 y 768 px, venta exitosa, movimiento reducido y estilos de impresión. Al estar oculta la pestaña compartida, se avanzaron las animaciones mediante el navegador para comprobar sus estados intermedios y finales. No se registraron ventas reales; la validación técnica del equipo sigue pendiente.

## Ajuste solicitado: palomita de venta

- [x] **T-12** (CA-10): Añadir la palomita animada únicamente al resultado de venta y respetar movimiento reducido e impresión.
- [x] **T-13** (CA-10): Verificar pruebas, compilación y dos ventas simuladas en navegador.

Se verificaron tipos, 316 pruebas, build y `git diff --check`. En navegador se completaron dos ventas simuladas y se comprobaron los estados inicial, intermedio y final del trazo en ambas, movimiento reducido, impresión y ausencia de desbordamiento a 360 px. La pestaña estaba oculta y se avanzó la animación manualmente para verificarla. No se registraron ventas reales; la validación técnica del equipo sigue pendiente.

## Ajuste solicitado: movimiento y bordes

- [x] **T-14** (CA-09, CA-10): Ralentizar el menú, redondear sus bordes y mejorar la entrada de la palomita respetando movimiento reducido.
- [x] **T-15** (CA-09, CA-10): Verificar pruebas y comportamiento visual con datos simulados.

Se verificaron tipos, 316 pruebas, build y `git diff --check`. En navegador se comprobaron el borde redondeado y la transición en administración y taquilla, el menú móvil a 360 y 768 px, la entrada de la palomita en una venta simulada, movimiento reducido e impresión. No se registraron ventas reales; la validación técnica del equipo sigue pendiente.

## Ajuste solicitado: celebración de boleto

- [x] **T-16** (CA-11): Mostrar una animación de boleto y palomita de hasta tres segundos solo al completar una venta, sin bloquear acciones.
- [x] **T-17** (CA-11): Verificar duración, dos ventas simuladas, movimiento reducido, impresión y pruebas.

Se verificaron tipos, 318 pruebas, build y `git diff --check`. En dos ventas simuladas se comprobó que la animación se repite y dura 2,3 segundos, que las acciones permanecen habilitadas y que se respeta movimiento reducido e impresión; a 360 px no hubo desbordamiento. No se registraron ventas reales; la validación técnica del equipo sigue pendiente.
