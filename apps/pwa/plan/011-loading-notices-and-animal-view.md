# Plan técnico · 011 · loading-notices-and-animal-view

- Spec: `apps/pwa/specs/011-loading-notices-and-animal-view.md`
- Estado de spec: Aprobada
- Revisión técnica: aprobación del equipo confirmada por el solicitante el 2026-11-19.
- Responsable técnico: por identificar

## Diseño de solución

| Área | Módulos previstos | Cambio |
|---|---|---|
| Carga | `src/views/Spinner.tsx`, `src/views/`, `src/styles.css` | Reutilizar `Spinner` y `LoadingScreen`. Incorporar el indicador compartido a los estados visibles de carga de fotos y datos, envío y sincronización que hoy muestran solo texto. Ajustar estilos del indicador y detener su animación con `prefers-reduced-motion`. Mantener las etiquetas en español y los estados que impiden envíos duplicados. |
| Avisos | `src/views/ToastCenter.tsx`, `src/styles.css` | Usar clases con tokens semánticos, variantes distinguibles por icono y color, y ancho adaptable al móvil. Mantener una región viva y controles de cierre con foco visible. Reutilizar la suscripción y el cierre existentes. |
| Directorio | `src/views/AnimalsView.tsx`, `src/styles.css` | Colocar «Orden» en su propia fila debajo del bloque de búsqueda y antes del listado. Alinear a la derecha y permitir que se adapte al ancho del móvil. Conservar las opciones, el orden por defecto y el enlace con búsqueda y paginación. |
| Foto del perfil | `src/views/AnimalProfileView.tsx`, `src/styles.css` | Habilitar un botón sobre la foto cuando su carga termine correctamente. Reutilizar el `Dialog` existente de `@arca/ui`, con imagen ajustada al área visible, botón «Cerrar» y salida con Escape. Devolver el foco al botón de ampliación al cerrar. Mantener «Cambiar foto» como control independiente. |

## Contrato, datos y operación

Los cambios usan los contratos, permisos y datos que ya consume la PWA. El visor reutiliza la URL de la foto cargada. Su estado vive en la vista de perfil y se descarta al salir. Si la imagen falta o falla, se muestra el estado correspondiente y se conserva la gestión de fotos vigente. Se mantienen los disparadores, tiempos, aislamiento por sesión y comportamiento offline de los avisos de `009`. El plan es de presentación y no requiere consulta previa del esquema, DBR, migraciones, cambios de despliegue ni ADR. La compatibilidad existente con MySQL 8.0.x en Aiven y en local se conserva.

## Mapeo de criterios a pruebas

| Criterio | Prueba automatizada prevista en `apps/pwa/src/tests/` |
|---|---|
| CA-01 | Comprobar el indicador compartido, su etiqueta accesible, su uso en los estados de espera y la regla de movimiento reducido. |
| CA-02 | Comprobar región viva, variantes y cierre de avisos con registros de prueba mediante la interfaz de notificaciones existente. |
| CA-03 | Comprobar orden de elementos en el directorio y conservación de las opciones, la búsqueda y la paginación. |
| CA-04 | Comprobar que la ampliación se ofrece para una foto cargada y que conserva la acción independiente de cambio. Cubrir apertura y cierre con las capacidades de prueba existentes y comprobar Escape, foco y ajuste al área visible en navegador. |

## Constitution Check

| Principio | Cumple en el diseño | Evidencia prevista |
|---|---|---|
| I. Stack mínimo y portable | Sí | React, CSS, Vitest y `@arca/ui` vigentes. |
| II. La spec manda | Sí | Spec `pwa-011` aprobada. El checklist se prepara tras la aprobación técnica. |
| III. Lógica separada de la interfaz | Sí | Estado visual en vistas y mismas interfaces de datos y sincronización. |
| IV. Un test por criterio | Sí | La tabla asigna cobertura automatizada a los cuatro CA. |
| V. Una sola fuente de verdad para los datos | Sí | Cambios de presentación sobre los datos y avisos existentes. |
| VI. Código en inglés, personas en español | Sí | Identificadores en inglés y textos visibles en español. |

## Riesgos y secuencia

1. Ajustar el indicador compartido y aplicarlo a los estados pendientes identificados.
2. Actualizar los avisos y revisar el ancho y la ubicación en móvil.
3. Mover el selector y agregar la ampliación. Verificar el foco del diálogo y su independencia del botón de subida.
4. Ejecutar las pruebas y la compilación de la PWA con `/verify`. Revisar en navegador el ajuste de la foto, el foco, los avisos y el movimiento reducido.

El solicitante aprobó el alcance funcional y confirmó la aprobación técnica el 2026-11-19.
