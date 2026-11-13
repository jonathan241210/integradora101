# 011 · collapsible-menu-event-pagination

- App dueña: `dashboard`.
- Apps/paquetes afectados: `dashboard`; sin cambios en API ni paquetes compartidos.
- Estado: Aprobada por la persona solicitante, 2026-11-12.
- Solicitante: persona usuaria.
- Relación: complementa la navegación de `dashboard-003` y el listado y las confirmaciones de eventos de `dashboard-004`; no sustituye sus permisos ni operaciones.

## Problema y objetivos

El menú lateral ocupa espacio en pantallas grandes y la lista de eventos muestra todas las tarjetas a la vez. Se solicita un botón con icono para contraer el menú y una paginación de cuatro eventos por página, conservando el diseño y los colores actuales.

## Alcance

- El menú de administración y del panel ejecutivo comienza contraído en pantallas grandes, con iconos visibles. Se despliega al pasar el cursor o al recibir foco; un botón identificado permite fijarlo abierto o volver al comportamiento automático.
- En pantallas pequeñas se conserva el menú móvil existente, con su botón de apertura y cierre.
- La lista administrativa de eventos se divide en páginas de hasta cuatro tarjetas, con controles anterior/siguiente y número de página.
- Se conservan las acciones de eventos, los permisos, el orden entregado por la API, los formularios y los colores y tipografía actuales.

## Fuera de alcance

- Cambios a la API, base de datos, permisos, dependencias o pantallas de taquilla.
- Paginación de noticias u otras listas, búsqueda de eventos o cambio del orden de los datos.
- Persistir el estado del menú o de la página después de salir de la sesión o de la sección.

## Actores

- Personal con acceso a la navegación administrativa o ejecutiva: contrae y expande el menú.
- `admin` y `zoo-admin` con `events.manage`: consultan y gestionan eventos paginados.

## Criterios de aceptación

- **CA-01:** En una pantalla grande, el menú lateral comienza contraído con los iconos visibles; se despliega al pasar el cursor o recibir foco y vuelve a contraerse al salir. Un botón con icono permite fijarlo abierto o volver al comportamiento automático. El contenido aprovecha el espacio liberado sin desplazarse al desplegar temporalmente el menú.
- **CA-02:** El botón de menú y las opciones tienen nombres accesibles, foco visible y funcionamiento con teclado; en móvil se mantiene la apertura y el cierre existentes, incluido Escape.
- **CA-03:** La lista de eventos muestra como máximo cuatro tarjetas por página, en el orden recibido, y permite avanzar y retroceder indicando la página actual y el total de eventos. Con cero eventos se conserva el estado vacío.
- **CA-04:** Tras actualizar la lista, si la página seleccionada ya no existe, se muestra la última página disponible; crear, editar, activar, desactivar y eliminar conservan sus flujos y confirmaciones.
- **CA-05:** Una confirmación en línea no queda oculta por cambiar de página: mientras esté abierta se deshabilita el cambio de página hasta confirmarla o cancelarla. El formulario y sus valores no se descartan al paginar.
- **CA-06:** A 360, 768 y 1366 px no hay desbordamiento horizontal de la página y los controles permanecen utilizables. Se mantienen los tokens semánticos, colores y tipografía existentes.
- **CA-07:** Las pruebas automatizadas cubren menú contraído/expandido, límites de cuatro eventos, cambios de página, ajuste tras eliminación y confirmación pendiente; las pruebas existentes pasan.

## Reglas y datos

- No cambia la autorización: la API continúa protegiendo las operaciones y el menú muestra solo secciones permitidas.
- La API existente entrega el listado de eventos; la paginación solo organiza en pantalla los registros ya recibidos y no cambia la consulta ni el orden. No reduce la cantidad de datos transferidos.
- El estado de menú y página es temporal. El menú móvil conserva su comportamiento actual.
- No se añade persistencia, auditoría, cambios de esquema ni DBR.

## Aprobación

La persona solicitante aprobó este alcance el 2026-11-12: menú de iconos al contraer y cuatro eventos por página, con confirmaciones visibles y sin cambiar la API.

El 2026-11-12 la persona solicitante pidió que el menú muestre inicialmente solo iconos y se despliegue al acercar el cursor; se conserva el acceso por teclado y el botón para fijarlo abierto.
