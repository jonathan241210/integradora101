# 003 · lion-hero-mobile-navigation

- App dueña: `web`
- Apps/paquetes afectados: `apps/web`
- Estado: En progreso
- Solicitante / responsable funcional: Solicitante de esta conversación; nombre por identificar
- Aprobación funcional: Solicitante, 2026-10-08 (aprobación en esta conversación)

## Problema y contexto

El hero del portal público muestra una capa color vino sobre la fotografía del león, aunque la versión anterior usaba una capa verde. En pantallas pequeñas, la navegación conserva todos los enlaces en una fila horizontal, lo que la hace apretada y difícil de usar.

La spec aprobada `002-brand-color-refresh` cubre el cambio de paleta general, pero excluye cambios de navegación e interacciones. Esta feature se limita a recuperar el verde únicamente en la capa de la fotografía del león y a mejorar la navegación adaptable; los demás colores de marca permanecen sin cambios.

## Objetivos

- Recuperar sobre la fotografía del león el degradado verde de la versión anterior del portal.
- Mantener los enlaces de navegación desplegados en escritorio y ofrecer un menú hamburguesa accesible en tabletas y móviles.
- Adaptar la cabecera y el contenido del portal a pantallas pequeñas sin desbordamiento horizontal ni pérdida de contenido o acciones.
- Añadir verificaciones automatizadas de los criterios sin incorporar dependencias.

## Fuera de alcance

- Cambiar la paleta general, los botones, el pie, los títulos u otras superficies del portal.
- Cambiar contenido, destinos de enlaces, imágenes, formularios o interacciones existentes, salvo el comportamiento de apertura y cierre del menú.
- Migrar el portal estático a React, TypeScript, Vite o Tailwind.
- Modificar la API, la base de datos, otras aplicaciones o paquetes, o consultar/escribir `settings_colores`.
- Agregar dependencias o cargar recursos tipográficos externos.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Visitante | Identificar la página del león con su tono verde anterior y navegar con facilidad desde cualquier dispositivo | Ninguno; contenido público |
| Equipo de desarrollo | Mantener el diseño adaptable y verificable sin alterar el resto del portal | Acceso al repositorio |

## Historias de usuario

Como visitante, quiero ver el hero del león con su degradado verde anterior y abrir una navegación clara en mi teléfono para recorrer el portal sin dificultad.

## Criterios de aceptación

- **CA-01:** Dado el hero del león, cuando se cargue el portal, entonces la fotografía conservará su recurso actual y tendrá la capa verde usada anteriormente (`rgba(10, 40, 18, .82)`, `.62` y `.28` en el degradado); el texto del hero seguirá siendo legible y el resto de la paleta del portal no cambiará.
- **CA-02:** Dado un viewport de escritorio de al menos 821 px, cuando se muestre la cabecera, entonces todos los enlaces principales seguirán visibles en la navegación desplegada y el control hamburguesa no será visible.
- **CA-03:** Dado un viewport de hasta 820 px, cuando se muestre la cabecera, entonces los enlaces estarán agrupados en un menú inicialmente cerrado y habrá un botón accesible que lo abre y cierra. El botón expondrá su estado con `aria-expanded` y su relación con el menú con `aria-controls`; el menú podrá operarse con teclado, cerrarse con Escape devolviendo el foco al botón y cerrarse al elegir un enlace. El buscador y la acción de compra de boletos seguirán disponibles.
- **CA-04:** Dado el portal en anchos de 360, 390, 768, 1024 y 1366 px, cuando se revisen la cabecera y las secciones existentes, entonces no habrá desbordamiento horizontal del documento, contenido oculto ni controles superpuestos o inaccesibles; las imágenes y el hero conservarán un tamaño legible.
- **CA-05:** Dada la suite de verificación ejecutada con `node --test apps/web/src/tests/relocation.test.mjs`, cuando finalice, entonces incluirá pruebas nombradas para CA-01..CA-05, verificará los estilos y el contrato accesible del menú, y no requerirá paquetes nuevos.

## Reglas de negocio

- **RN-01:** Solo el degradado superpuesto a la fotografía del león recupera los tonos verdes previos; no se revierte la paleta general aprobada en `002-brand-color-refresh`.
- **RN-02:** La navegación se presenta desplegada en escritorio (ancho mayor a 820 px) y colapsada tras un botón hamburguesa en anchos de hasta 820 px.
- **RN-03:** El control comunica el estado abierto/cerrado a tecnologías de asistencia y conserva navegación por teclado, foco visible y cierre predecible.
- **RN-04:** La mejora adaptable conserva los textos, destinos, recursos e interacciones actuales fuera del menú.

## Datos, privacidad y auditoría

No se crean, consultan ni modifican datos. No se usan datos personales, clínicos o financieros. No se accede a la API ni a `settings_colores`.

## Flujos y errores

1. El navegador carga el portal estático con el hero del león y su degradado verde.
2. En escritorio, los enlaces se muestran en línea como actualmente.
3. En tabletas y móviles, el visitante activa el botón hamburguesa con puntero o teclado para abrir o cerrar la lista de enlaces.
4. Al cerrar mediante Escape, el foco regresa al botón; al seguir un enlace, el menú se cierra y se conserva el destino actual.
5. Si JavaScript no llega a inicializarse, los enlaces de navegación permanecen accesibles.
6. La prueba automatizada comprueba los contratos de estilos, estructura y comportamiento definidos; la revisión visual en viewport completa comprueba distribución, foco y ausencia de desbordamiento.

## Dependencias, riesgos y preguntas

- Dependencias/ADR: no se agregan dependencias ni se requiere ADR.
- Riesgos: una cabecera con menú desplegado puede ocultar contenido en pantallas pequeñas; se mitiga con altura adaptable, scroll normal y pruebas en los anchos definidos.
- Preguntas pendientes: ninguna de alcance. El nombre de la persona responsable funcional no está registrado; el solicitante aprobó el alcance el 2026-10-08.

## Revisión

- Aprobadores y fecha: Solicitante, 2026-10-08 (alcance aprobado en esta conversación).
- Evidencia/enlaces: La paleta general de referencia sigue documentada en [`002-brand-color-refresh`](./002-brand-color-refresh.md); el verde de la capa del hero corresponde a los valores previos de `apps/web/src/styles.css`.
- Decisión de verificación: El 2026-10-08 la persona solicitante autorizó continuar con pruebas automatizadas y dejar anotada la limitación de revisión visual responsive. No se considera verificado el desbordamiento visual real hasta ejecutar la comprobación de navegador pendiente en T-06.
