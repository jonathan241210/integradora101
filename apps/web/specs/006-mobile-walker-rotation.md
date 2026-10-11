# 006 · mobile-walker-rotation

- App dueña: `web`
- Apps/paquetes afectados: `apps/web`
- Estado: En progreso
- Solicitante / responsable funcional: Solicitante de esta conversación; nombre por identificar
- Aprobación funcional: Solicitante, 2026-10-08

## Problema y contexto

El portal muestra seis animalitos animados que caminan por la parte inferior de la pantalla. En un teléfono o una pantalla pequeña pueden aparecer demasiados a la vez y ocupar demasiado espacio. La spec `003-lion-hero-mobile-navigation` cubre la navegación adaptable y el hero, pero no modifica las animaciones decorativas de los animalitos.

## Objetivos

- En pantallas pequeñas, mostrar como máximo dos animalitos a la vez.
- Intercambiar los animalitos visibles por otra pareja cada 8 segundos.
- Conservar el comportamiento actual en pantallas mayores y las interacciones existentes.

## Fuera de alcance

- Cambiar la cabecera, los textos o la posición de los enlaces del menú.
- Cambiar la cantidad, ilustraciones, textos, direcciones o tamaños configurados de los animalitos.
- Cambiar la velocidad o trayectoria de sus animaciones.
- Modificar otras aplicaciones, paquetes, la API, datos o dependencias.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Visitante | Ver una cantidad cómoda de animalitos animados al usar el portal desde el teléfono | Ninguno; contenido público |
| Equipo de desarrollo | Mantener el comportamiento decorativo adaptable sin afectar la funcionalidad existente | Acceso al repositorio |

## Historias de usuario

Como visitante del portal desde un teléfono, quiero ver solo dos animalitos a la vez y que cambien periódicamente para disfrutar las animaciones sin que ocupen demasiado espacio.

## Criterios de aceptación

- **CA-01:** Dado un viewport de hasta 560 px, cuando se muestren los animalitos, entonces habrá como máximo dos visibles a la vez y la pareja cambiará cada 8 segundos, recorriendo las parejas en el orden actual de la lista hasta volver a empezar.
- **CA-02:** Dado un viewport mayor de 560 px, cuando se cargue el portal, entonces los seis animalitos conservarán su comportamiento actual de animación, visibilidad y distribución.
- **CA-03:** Dado el control actual para mostrar u ocultar los animalitos, cuando se use en pantallas pequeñas o grandes, entonces continuará alternando la visibilidad del conjunto sin alterar el máximo de dos animalitos visibles en pantallas pequeñas; también se conservarán las interacciones actuales, la preferencia de movimiento reducido y la ocultación al imprimir.
- **CA-04:** Dada la suite `node --test apps/web/src/tests/relocation.test.mjs`, cuando se ejecute, entonces incluirá pruebas nombradas para CA-01..CA-04 que comprueben el límite móvil, el intercambio cada 8 segundos, la conservación del comportamiento de escritorio y el contrato de las interacciones existentes, sin agregar dependencias.

## Reglas de negocio

- **RN-01:** El límite de dos animalitos y el intercambio cada 8 segundos aplican únicamente a viewports de hasta 560 px.
- **RN-02:** En móvil, las parejas se forman consecutivamente siguiendo el orden ya definido: los primeros dos, los siguientes dos y los últimos dos; después el ciclo se repite.
- **RN-03:** En viewports mayores de 560 px no cambia la experiencia existente de las seis animaciones.
- **RN-04:** La adaptación solo organiza la presentación; no cambia los textos, ilustraciones, enlaces ni funcionalidades existentes del portal.

## Datos, privacidad y auditoría

No se crean, consultan ni modifican datos. No se tratan datos personales, clínicos o financieros ni se accede a la API o a `settings_colores`.

## Flujos y errores

1. El portal detecta el ancho de pantalla mediante estilos/adaptación responsive.
2. En un viewport de hasta 560 px se muestra la primera pareja y, cada 8 segundos, se reemplaza por la pareja siguiente.
3. Después de la tercera pareja, se vuelve a mostrar la primera y el ciclo continúa mientras el portal permanezca abierto.
4. En un viewport mayor de 560 px se conservan las seis animaciones como funcionan actualmente.
5. El control de visibilidad sigue ocultando y mostrando los animalitos, y las preferencias de movimiento reducido y de impresión siguen ocultándolos.

## Dependencias, riesgos y preguntas

- Dependencias/ADR: No se agregan dependencias ni se requiere ADR.
- Riesgos: El intercambio frecuente podría resultar molesto o interrumpir una interacción en curso; se debe conservar el control actual para ocultar las animaciones y comprobar el comportamiento si cambia el tamaño de la pantalla durante el uso.
- Preguntas pendientes: Confirmar que el alcance, el límite de hasta 560 px, las parejas en el orden actual y el intercambio cada 8 segundos son los deseados.

## Revisión

- Aprobadores y fecha: Solicitante, 2026-10-08.
- Evidencia/enlaces: La preferencia de hasta dos animalitos y el intervalo de 8 segundos fueron confirmados por el solicitante en esta conversación. La spec `003-lion-hero-mobile-navigation` mantiene su alcance de navegación y hero sin cambios. Las cuatro pruebas específicas CA-01..CA-04 pasan y la verificación en navegador confirmó dos animalitos a 390 px, seis a 1024 px, el cambio de pareja después de 8 segundos y el control de ocultar/mostrar. La suite completa registra 32/33 pruebas aprobadas; falla una prueba preexistente de `visit-info-icons-and-favicon` que espera `margin-top: 8px` en los iconos de visita. Esta spec permanece En progreso hasta que se resuelva y vuelva a verificarse el bloqueo de la suite.
