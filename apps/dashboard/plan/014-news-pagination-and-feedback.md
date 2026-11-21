# Plan técnico · 014 · news-pagination-and-feedback

- Spec: `apps/dashboard/specs/014-news-pagination-and-feedback.md`.
- Estado del plan: aprobado por la persona solicitante en la conversación.

## Diseño

- Noticias conserva el listado y el orden recibido de la API. El ViewModel deriva páginas de seis elementos. La vista reutiliza `PaginationBar` y el patrón de Eventos para conservar el elemento durante una confirmación, ajustar la página tras una baja y localizar el resultado seleccionado desde el buscador.
- La barra superior retira el botón de demostración y el menú lateral omite la sección Notificaciones.
- La notificación flotante usa el `Alert` compartido y los roles de anuncio de `SaveFeedback` en la PWA. Un efecto programa el cierre en cinco segundos y cancela el temporizador al cerrar, sustituir el aviso o desmontar la vista. El cierre se aplica al identificador del aviso correspondiente.
- Los errores asociados a un campo conservan su ubicación junto al control. Se descarta el aviso vigente al terminar la sesión o cambiar de cuenta.
- Se conservan rutas de la API, contratos, permisos, validación y estados de carga. El trabajo es de presentación frontend y no requiere acceso a BD, DBR, cambios de sincronización ni dependencias.

## Pruebas

Activar `showPageNumbers` en Noticias y comprobar `aria-current` en la página activa. Aplicar la animación de entrada con CSS bajo `prefers-reduced-motion: no-preference`.

| Criterio | Verificación automatizada en dashboard |
| --- | --- |
| CA-01 | Límite de seis, segunda página con siete elementos y controles accesibles. |
| CA-02 | Ajuste al borrar, orden de la API y resolución de página para el buscador. |
| CA-03 | La barra superior renderiza las acciones de sesión sin el botón de demostración. |
| CA-04 | Roles de anuncio para éxito y error y cierre accesible. |
| CA-05 | Ausencia de la sección en el menú y cierre limitado al identificador del aviso vigente. |

## Constitution Check

| Principio | Evidencia |
| --- | --- |
| I | React, TypeScript y componentes existentes. |
| II | Spec 014 y checklist del mismo nombre tras aprobación técnica. |
| III | Paginación y avisos en ViewModels, con lógica de dominio en la API. |
| IV | Pruebas Vitest con identificadores CA-01 a CA-05. |
| V | Estado transitorio de interfaz, sin persistencia ni cambios de datos. |
| VI | Código en inglés y mensajes de interfaz en español. |

## Secuencia y aprobación

Validar el plan con la persona responsable de la aprobación técnica del dashboard, preparar el checklist, implementar paginación y avisos, y ejecutar comprobación de tipos y pruebas.
