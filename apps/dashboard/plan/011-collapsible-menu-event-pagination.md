# Plan técnico · 011 · collapsible-menu-event-pagination

- Spec: `apps/dashboard/specs/011-collapsible-menu-event-pagination.md`.
- Estado: aprobado para implementación por la persona solicitante, 2026-11-12; validación técnica del equipo pendiente.
- Dependencias: `dashboard-003` y `dashboard-004`; no requiere DBR ni nuevas dependencias.

## Solución

- Menú: iniciar contraído en escritorio y desplegar temporalmente la barra al pasar el cursor o al recibir foco, superponiéndola al contenido sin desplazarlo. El botón con icono fija o desfija la barra y comunica su estado con `aria-pressed`. En administración, ejecutivo y taquilla, los botones conservan sus nombres accesibles aunque se oculten sus etiquetas visuales. Mantener el estado y comportamiento móvil separados, incluido Escape y devolución de foco.
- Taquilla: destacar tarjetas de precios, cantidades y acciones de venta, y mejorar la presentación del historial con los tokens existentes. Mantener los datos y operaciones de `dashboard-005`, así como los estilos y el flujo de impresión.
- Eventos: el ViewModel de eventos calcula la página visible de la lista ya recibida, de cuatro elementos, sin alterar la API ni el orden. Reutilizar `PaginationBar`; ajustar la página al último valor válido si la lista se reduce. Deshabilitar sus controles mientras exista confirmación pendiente o una acción en curso y conservar formulario y edición.
- Si una recarga reordena los eventos mientras hay una confirmación abierta, mantener visible la página que contiene ese evento; si el registro ya no está en la lista, la confirmación no debe permitir una operación sobre un elemento inexistente.
- Mantener los componentes, mensajes, acciones, permisos, tokens, colores y tipografía actuales; sin cambios de contrato, datos ni persistencia. Los estilos se adaptan a los puntos de corte actuales.

## Pruebas y trazabilidad

| Criterio | Verificación |
|---|---|
| CA-01 | Tests del estado de shell y del marcado del control y los nombres accesibles de las secciones. |
| CA-02 | Tests de accesibilidad y del estado móvil; revisión con teclado. |
| CA-03 | Tests de listas de 0, 4, 5 y 9 eventos, orden y navegación. |
| CA-04 | Tests de reducción de lista y acciones existentes; suite de contenido. |
| CA-05 | Test de controles deshabilitados con confirmación y conservación del formulario. |
| CA-06 | Revisión de estilos y navegador en 360, 768 y 1366 px, sin desbordamiento. |
| CA-07 | Suite de Vitest, tipos y build del dashboard. |
| CA-08 | Tests de presentación de venta y navegación de taquilla, suite existente de venta e historial y revisión en navegador con respuestas simuladas. |

## Constitution Check

| Principio | Comprobación |
|---|---|
| I. Stack mínimo | Sin dependencias ni tecnología nuevas. |
| II. Spec manda | Spec 011 aprobada; este plan requiere aprobación técnica antes de tareas e implementación. |
| III. Lógica separada | La paginación es estado de presentación en ViewModel; sin cálculos de negocio ni llamadas nuevas. |
| IV. Un test por criterio | Tests nombrados CA-01 a CA-07; además revisión de navegador. |
| V. Datos | La API sigue siendo autoridad; no se cambia persistencia ni esquema. |
| VI. Idioma | Código en inglés; etiquetas, mensajes y documentación en español. |

## Riesgos y verificación

El endpoint actual entrega todos los eventos, así que la paginación en cliente no mejora la transferencia para listas grandes. Al disminuir la lista se debe ajustar la página sin perder la última tarjeta ni dejar una confirmación inaccesible. Verificar `npm run types`, `npm test` y `npm run build`, más interacción y anchos en navegador con datos de prueba sin modificar registros reales.
