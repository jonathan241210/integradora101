# 014 · news-pagination-and-feedback

- App dueña: `dashboard`
- Apps/paquetes afectados: `dashboard`
- Estado: Aprobada
- Aprobación funcional: la persona solicitante pidió proceder con la paginación y confirmó la PWA veterinaria como referencia visual, después de solicitar tres avisos por página y retirar la campana.

## Problema y objetivos

Noticias muestra todas las tarjetas en una sola página. La barra superior muestra una campana de demostración y los avisos de la aplicación necesitan distinguir mejor el resultado de cada acción.

## Actores y permisos

El personal que ya puede consultar Noticias usa la paginación. Los avisos corresponden a las acciones que cada cuenta ya tiene autorizadas.

## Historia de usuario

Como parte del personal del zoológico, quiero recorrer Noticias por páginas y ver una notificación temporal al terminar una acción.

## Criterios de aceptación

- **CA-01:** Con hasta seis noticias, el listado muestra todas y oculta los controles de paginación. Desde la séptima, muestra seis tarjetas por página como máximo y permite avanzar y retroceder con teclado.
- **CA-02:** Si se elimina el último elemento de una página, el listado muestra la última página disponible. Tras crear, editar o cambiar el estado de una noticia, el listado conserva el orden que recibe de la API.
- **CA-03:** La barra superior se muestra sin la campana de demostración.
- **CA-04:** Cuando una acción existente genera un aviso de éxito o error, aparece una notificación flotante sobre el contenido, con la presentación de `Alert` que usa la PWA veterinaria al guardar, un indicador visual y textual de su tipo y un botón accesible para cerrarla. Como en la PWA, el éxito se anuncia con `role="status"` y el error con `role="alert"`. El aviso no toma el foco.
- **CA-05:** Por solicitud de la persona usuaria, se retira la sección «Notificaciones» del menú lateral. Cada aviso flotante se cierra automáticamente a los cinco segundos o antes si se pulsa el botón de cierre.

## Reglas y datos

- La paginación de Noticias usa el control numerado de Recintos, con la página actual resaltada. Cuando el dispositivo permite movimiento, los avisos tienen una animación breve de entrada y al cerrarse se desplazan hacia arriba mientras se desvanecen.

- **RN-01:** La paginación presenta la colección devuelta por la API y mantiene el total del listado y los permisos actuales. El cambio es de presentación y usa el contrato vigente.
- **RN-02:** Solo se conserva en memoria el aviso flotante visible. Cada nuevo aviso inicia su propio plazo de cierre.
- Los avisos usan los colores semánticos del tema. Las notificaciones del servidor, el sondeo y las entregas por correo o push quedan fuera del alcance de esta propuesta.

## Dependencias y validación

- Paginación de Eventos en `dashboard-011` y avisos existentes del dashboard como referencias de interacción.
- Referencia visual: `apps/pwa/src/views/SaveFeedback.tsx`, que usa el componente compartido `Alert`.

## Nota de revisión (2026-11-21, dashboard-020)

- La regla general de mensajes del dashboard queda en `dashboard-020` RN-07: éxito y error general de una acción fuera de diálogo son aviso emergente; errores de campo junto al campo; diálogos dentro del diálogo; carga y 403 de vista como estado de la vista.
- CA-04 de esta spec se aplica a todo el dashboard y no solo a Noticias. Su texto y su número no cambian.
- El texto en línea de `ActionError` fuera de diálogos se retira (`dashboard-020` CA-20).
