# 008 · cognitive-accessibility-assistant

- App dueña: `web`
- Apps/paquetes afectados: `apps/web`
- Estado: Implementada
- Solicitante / responsable funcional: Solicitante de esta conversación; nombre por identificar
- Aprobación funcional: Solicitante, 2026-10-08

## Problema y contexto

El portal público no ofrece un panel desde el que cada visitante pueda adaptar la lectura y reducir distracciones. La persona solicitante pide incorporar un panel flotante “Asistente Cognitivo” con perfiles y herramientas visuales opcionales. No se encontró una feature existente que cubra este panel; las specs actuales de `apps/web` describen otras características.

El resumen de página con IA se mostrará solo como opción visual no disponible. Esta feature no conectará con servicios de IA, no solicitará ni almacenará claves y no mostrará mensajes sobre configuración de claves.

## Objetivos

- Añadir un panel flotante identificable como “Asistente Cognitivo”, usable con teclado y tecnologías de asistencia.
- Permitir activar y desactivar individualmente los modos Foco, Lectura para dislexia, Bionic Reading, Regla de Lectura e Interfaz Calma.
- Ofrecer perfiles predefinidos y permitir ajustes individuales posteriores.
- Conservar las preferencias en el navegador y ofrecer una acción para restablecerlas.
- Mantener las funciones de búsqueda, navegación, mapa, formularios y animaciones existentes del portal.
- Mostrar “Resumir esta página” como opción visual no disponible, sin implementar IA o integración externa.

## Fuera de alcance

- Generar resúmenes, usar modelos de IA o integrar proveedores/servicios externos.
- Solicitar, configurar, exponer o guardar claves API.
- Enviar el contenido de la página a terceros.
- Crear cuentas, almacenar perfiles en servidor o vincular preferencias con la identidad de una persona.
- Alterar el contenido original, destinos de navegación o reglas de negocio del portal.
- Añadir paquetes o fuentes remotas; cualquier fuente tipográfica nueva requeriría verificar licencia y aprobación por separado.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Visitante | Ajustar la presentación de lectura a sus preferencias y necesidades | Ninguno; portal público |
| Equipo de desarrollo | Mantener una herramienta local, reversible y compatible con el portal | Acceso al repositorio |

## Historias de usuario

Como visitante del portal, quiero elegir una forma de lectura y activar herramientas visuales opcionales para leer la información con más comodidad, sin que el panel cambie el contenido o me impida usar el sitio.

## Criterios de aceptación

- **CA-01:** Dada cualquier página del portal, cuando se active el control flotante del Asistente Cognitivo con puntero o teclado, entonces abrirá un panel con título accesible, controles etiquetados y estados comunicados semánticamente; al cerrarlo devolverá el foco al control que lo abrió y no cubrirá permanentemente la navegación ni atrapará el teclado.
- **CA-02:** Dado el selector de perfiles, cuando se elija “Lectura clara”, “Enfoque” o “Calma”, entonces activará respectivamente Lectura para dislexia más espaciado, Modo Foco más Regla de Lectura, o Interfaz Calma; el selector reflejará los cambios manuales posteriores con el estado “Personalizado”. “Sin perfil” y “Restablecer” dejarán todas las herramientas apagadas.
- **CA-03:** Dado un modo individual, cuando se active o desactive, entonces el efecto correspondiente se aplicará a la presentación del portal y podrá revertirse sin alterar el texto original, enlaces, formularios, controles, navegación por teclado o estructura accesible:
  - Modo Foco atenúa el contenido periférico y deja identificable la zona de lectura actual.
  - Lectura para dislexia aplica una pila tipográfica disponible localmente y aumenta moderadamente el espaciado entre letras y líneas, sin descargar fuentes.
  - Bionic Reading destaca visualmente el inicio de palabras sin cambiar el texto accesible ni el texto copiado.
  - Regla de Lectura muestra una guía horizontal que sigue el puntero y se reposiciona con el foco de teclado, sin bloquear clics ni selección de texto.
  - Interfaz Calma reduce animaciones y estímulos visuales, conservando contraste suficiente y respetando la preferencia del sistema para movimiento reducido.
- **CA-04:** Dado que se modifican perfiles o modos individuales, cuando se recargue el portal en el mismo navegador, entonces se restaurarán las preferencias previamente guardadas; al usar “Restablecer” se borrarán esas preferencias locales y se desactivarán los modos. Si el almacenamiento del navegador no está disponible, el panel seguirá funcionando hasta finalizar la página actual y no mostrará un error bloqueante.
- **CA-05:** Dada la opción “Resumir esta página”, cuando se muestre el panel, entonces estará visible como control no disponible y claramente identificado como “Próximamente”; al intentar usarlo no enviará contenido, no hará peticiones ni pedirá configuración de API keys.
- **CA-06:** Dado el panel y todas sus herramientas, cuando se usen a 360, 390, 768, 1024 y 1366 px, entonces el panel permanecerá dentro del viewport, sus controles podrán operarse con teclado y táctil, no habrá desbordamiento horizontal y las funciones actuales del sitio seguirán disponibles.
- **CA-07:** Dada la suite `node --test apps/web/src/tests/relocation.test.mjs`, cuando se ejecute, entonces incluirá tests nombrados para CA-01..CA-07 que cubran apertura/cierre/foco, perfiles, cada modo, persistencia y restablecimiento, estado no disponible del resumen y adaptación responsive sin dependencias nuevas.

## Reglas de negocio

- **RN-01:** Cada modo de accesibilidad es opcional, reversible e independiente, salvo las combinaciones predefinidas descritas en los perfiles.
- **RN-02:** Los perfiles son ajustes locales de presentación: “Lectura clara” activa dislexia y espaciado; “Enfoque” activa modo foco y regla de lectura; “Calma” activa interfaz calma.
- **RN-03:** Si la persona modifica individualmente un modo después de escoger un perfil, el selector indica “Personalizado”; no se modifica el contenido fuente del portal ni su semántica accesible.
- **RN-04:** Las preferencias se guardan únicamente en el almacenamiento local de ese navegador; no se envían a la API, a `settings_colores` ni a proveedores externos.
- **RN-05:** La función de resumen es solo una presentación no disponible; no hay conectividad con IA, petición de contenido o gestión de claves en esta feature.
- **RN-06:** Los ajustes visuales no deben impedir el acceso a información, controles, foco visible, teclado o tecnologías de asistencia, y deben respetar movimiento reducido del sistema.

## Datos, privacidad y auditoría

Solo se guardan en el navegador preferencias de interfaz no identificables (perfil y estados booleanos de herramientas). No se guardan datos personales ni se crean cuentas. No se transmite contenido de la página ni preferencias a servidor o terceros. Si el navegador no permite almacenamiento local, los ajustes permanecen solo en memoria durante la página actual.

## Flujos y errores

1. La persona abre el panel desde el control flotante.
2. El panel muestra “Sin perfil” si no hay preferencias activas; se puede elegir un perfil o modificar modos por separado.
3. La selección aplica los modos asociados y actualiza su estado visual y accesible.
4. Una modificación manual convierte el selector a “Personalizado”; las preferencias se guardan localmente.
5. “Restablecer” desactiva herramientas, selecciona “Sin perfil” y elimina preferencias guardadas.
6. “Resumir esta página” aparece deshabilitado y no realiza acciones de red.
7. Si falla el almacenamiento local, los cambios siguen disponibles en memoria durante la sesión y el panel no se bloquea.
8. Si el panel se cierra, se puede reabrir desde su control; el foco vuelve al control al cerrar.

## Dependencias, riesgos y preguntas

- Dependencias/ADR: No se agregan paquetes ni recursos remotos; no se requiere ADR. Los cambios quedan limitados a `apps/web`.
- Riesgos:
  - La aplicación de formato a muchos elementos puede afectar rendimiento o contenido dinámico; se debe limitar a texto de contenido y evitar entradas, controles y contenido SVG.
  - Los efectos visuales pueden reducir legibilidad si alteran demasiado el contraste; se deben probar con contraste suficiente y permitir desactivarlos.
  - El selector de perfiles y los controles individuales pueden quedar desincronizados; se debe reflejar el estado “Personalizado” al apartarse de las combinaciones predefinidas.
- Preguntas pendientes: Confirmar que el alcance de los cinco modos, los tres perfiles, el almacenamiento solo local con restablecimiento y el botón de resumen visual no disponible corresponden a lo solicitado.

## Revisión

- Aprobadores y fecha: Solicitante, 2026-10-08.
- Evidencia/enlaces: El solicitante pidió añadir el panel descrito como “Asistente Cognitivo”. Confirmó tres perfiles (“Lectura clara”, “Enfoque” y “Calma”), persistencia solo en el navegador con restablecimiento, y que “Resumir esta página” debe ser visual sin IA funcional ni configuración de claves. Verificación final: siete pruebas CA-01..CA-07 enfocadas aprobadas; 44 de 45 pruebas de la suite completa aprobadas. La única falla es el test preexistente `CA-04 visit-info-icons-and-favicon`, ajeno a esta feature. Se verificaron en navegador los viewports 360, 390, 768, 1024 y 1366 px sin overflow horizontal; Bionic Reading conserva la selección exacta y la Regla de Lectura no intercepta eventos. `/verify` identificó `apps/web` como no inicializada por ausencia de `apps/web/src/package.json`. Esta feature no duplica las specs 001–007.
