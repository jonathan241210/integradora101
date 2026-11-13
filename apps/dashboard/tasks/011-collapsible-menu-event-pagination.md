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
