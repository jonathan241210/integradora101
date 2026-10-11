# 007 · header-walker-layer

- App dueña: `web`
- Apps/paquetes afectados: `apps/web`
- Estado: En progreso
- Solicitante / responsable funcional: Solicitante de esta conversación; nombre por identificar
- Aprobación funcional: Solicitante, 2026-10-08; aprobó la spec y la reducción visual.

## Problema y contexto

Los animalitos animados caminan actualmente por la parte inferior de la pantalla. La persona solicitante quiere verlos en la franja superior de la página, en la zona de la cabecera señalada en la imagen, pasando por detrás de los textos y controles del menú. La navegación, las letras, el buscador y el botón de boletos deben conservar su apariencia legible y su funcionalidad.

La spec `006-mobile-walker-rotation` ya regula el límite de dos animalitos en pantallas de hasta 560 px, el intercambio de parejas cada 8 segundos y la conservación de las seis animaciones en escritorio. Esta spec complementa esos requisitos con la ubicación y las capas visuales; no duplica ni elimina los criterios anteriores.

## Objetivos

- Presentar los animalitos caminando por la franja superior de la cabecera, en lugar de la zona inferior.
- Reducir su tamaño visual solamente en la cabecera para que quepan dentro de la franja marcada.
- Mantener los animalitos por detrás de los textos y controles interactivos de la cabecera.
- Preservar el funcionamiento y la legibilidad del menú, los enlaces, el buscador y la acción de compra de boletos.
- Conservar el comportamiento responsive aprobado en `006-mobile-walker-rotation`.

## Fuera de alcance

- Cambiar textos, enlaces, destinos, orden, diseño o comportamiento del menú.
- Cambiar el buscador, el botón de compra de boletos, el logo o el contenido de la cabecera.
- Cambiar la cantidad de animalitos, sus ilustraciones, mensajes, trayectorias o tamaños configurados en `animations.js`; sí se permite reducir su presentación visual con CSS mientras se muestran en la cabecera.
- Alterar la regla responsive de hasta dos animalitos y rotación cada 8 segundos en pantallas de hasta 560 px establecida en `006-mobile-walker-rotation`.
- Modificar otras aplicaciones, paquetes, la API, datos o dependencias.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Visitante | Ver los animalitos en la franja superior sin perder legibilidad ni acceso al menú | Ninguno; contenido público |
| Equipo de desarrollo | Integrar las animaciones con la cabecera sin interferir con sus controles | Acceso al repositorio |

## Historias de usuario

Como visitante del portal, quiero ver los animalitos caminar por la franja superior detrás del menú para disfrutar de la animación sin que tape sus textos ni interfiera con la navegación.

## Criterios de aceptación

- **CA-01:** Dada la cabecera del portal en un viewport móvil o de escritorio, cuando se muestren los animalitos, entonces estos recorrerán visualmente la franja superior de la cabecera en lugar de la parte inferior de la pantalla y sus dibujos cabrán verticalmente en la franja sin invadir el hero.
- **CA-02:** Dado un animalito que cruce el área del logo, los enlaces, el buscador o el botón de boletos, cuando se superponga visualmente a esa zona, entonces el animalito quedará detrás de los textos y controles, los textos seguirán legibles y los controles conservarán sus estilos y estado.
- **CA-03:** Dado cualquier animalito situado en la cabecera, cuando una persona use puntero, teclado o tecnología de asistencia en el menú, el buscador o el botón de boletos, entonces las animaciones no interceptarán eventos, foco ni activación de los controles.
- **CA-04:** Dado el portal en móvil y escritorio, cuando se use la cabecera, entonces se conservarán el menú responsivo y los enlaces existentes, y seguirá aplicándose el comportamiento de máximo dos animalitos con cambio cada 8 segundos en pantallas de hasta 560 px según `006-mobile-walker-rotation`.
- **CA-05:** Dada la suite `node --test apps/web/src/tests/relocation.test.mjs`, cuando se ejecute, entonces incluirá pruebas nombradas para CA-01..CA-05 que verifiquen la posición superior, las capas visuales, la ausencia de interferencia con los controles, la conservación del comportamiento responsive y la cobertura automatizada sin añadir dependencias.

## Reglas de negocio

- **RN-01:** Los animalitos se muestran en la franja superior de la cabecera y no en la franja inferior de la pantalla; su tamaño de presentación se reduce solo en esta ubicación para que quepan en ella.
- **RN-02:** Los textos y controles existentes de la cabecera se mantienen visualmente por delante de los animalitos.
- **RN-03:** La capa de animación decorativa no captura eventos de puntero destinados al menú, al buscador ni a las acciones de la cabecera.
- **RN-04:** Los requisitos responsive de `006-mobile-walker-rotation` continúan vigentes y no se modifican.
- **RN-05:** No se cambian los textos, destinos, orden ni comportamiento funcional de la navegación existente.

## Datos, privacidad y auditoría

No se crean, consultan ni modifican datos. No se tratan datos personales, clínicos o financieros ni se accede a la API o a `settings_colores`.

## Flujos y errores

1. El portal muestra la cabecera con su menú y acciones habituales.
2. Los animalitos cruzan la franja superior como una capa decorativa por detrás de los textos y controles.
3. La persona visitante puede seguir usando la navegación, el buscador y la compra de boletos como antes.
4. En pantallas de hasta 560 px se mantiene la rotación entre parejas establecida por `006-mobile-walker-rotation`.
5. El control para ocultar o mostrar animalitos continúa funcionando y, al ocultarlos, la cabecera conserva su presentación y funcionalidad.

## Dependencias, riesgos y preguntas

- Dependencias/ADR: No se agregan dependencias ni se requiere ADR.
- Riesgos: Mover una capa animada a una cabecera sticky puede alterar el apilamiento visual o cubrir hitboxes si se configura incorrectamente. Se mitigará manteniendo la capa no interactiva y comprobando los controles con navegador en móvil y escritorio. El tamaño original de los SVG puede sobrepasar la altura de la cabecera; el solicitante confirmó reducirlos visualmente en esa franja.
- Preguntas pendientes: Ninguna para el alcance visual descrito. El solicitante confirmó que los animalitos deben pasar detrás del menú y que sus textos y botones deben seguir legibles y utilizables.

## Revisión

- Aprobadores y fecha: Solicitante, 2026-10-08.
- Evidencia/enlaces: El solicitante pidió mover los animalitos a la franja superior marcada en la imagen y confirmó que deben quedar detrás del menú con textos y botones legibles y operables. También autorizó reducirlos visualmente para que quepan en la cabecera. Las pruebas específicas CA-01..CA-05 pasan. En navegador se comprobaron anchos de 390, 768, 1024 y 1366 px, límite de capa de 76 px, dibujos de 40–48 px, rotación responsive, menú, enlaces, buscador y compra de boletos sin desbordamiento horizontal. La suite completa tiene 37/38 pruebas aprobadas; queda un fallo preexistente en `visit-info-icons-and-favicon` por la regla de margen de los iconos, sin relación con esta feature. La spec permanece En progreso hasta resolver el bloqueo de la suite.
