# 005 · visit-info-icons-and-favicon

- App dueña: `web`
- Apps/paquetes afectados: `apps/web`
- Estado: Implementada
- Solicitante / responsable funcional: Solicitante de esta conversación; nombre por identificar
- Aprobación funcional: Solicitante, 2026-10-08

## Problema y contexto

En la franja de información para planear la visita, los iconos de horario, ubicación y boletos no quedan centrados sobre sus respectivos textos. El favicon referencia `web/packages/ui/logo.jpeg`, ruta que no resuelve desde el document root del portal. La persona solicitante pidió centrar los iconos y utilizar correctamente el logo compartido como favicon.

La feature 003 cubre adaptación responsive y navegación, pero excluye cambios de recursos e identidad fuera del hero; la feature 002 no cubre cambios de favicon o disposición visual. Esta feature se registra por separado.

La implementación inicial centró los iconos encima de sus textos. El 2026-10-08 la persona solicitante pidió bajarlos 8 px de forma uniforme dentro de cada bloque y aprobó este incremento.

## Objetivos

- Centrar el icono de cada dato de visita encima del texto asociado en las tres columnas.
- Mostrar como favicon el logo proporcionado, con una referencia local válida desde el portal.
- Mantener legibles y ordenados los tres datos en móvil, tablet y escritorio, sin alterar sus textos ni enlaces.
- Bajar ligeramente la posición de los iconos dentro de sus bloques sin separarlos visualmente de los textos asociados.

## Fuera de alcance

- Rediseñar, recortar o reemplazar el logo o los iconos.
- Cambiar los textos, destinos, estilo general de marca o el contenido de otras secciones.
- Agregar paquetes, servicios remotos, API, datos o dependencias externas.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Visitante | Identificar con rapidez horario, ubicación y acceso a boletos, y reconocer el sitio en la pestaña del navegador | Ninguno; contenido público |
| Equipo de desarrollo | Mantener recursos locales y presentación adaptable | Acceso al repositorio |

## Historias de usuario

Como visitante, quiero ver centrados los iconos de la información de visita y reconocer el portal por su logo en la pestaña del navegador para orientarme con claridad.

## Criterios de aceptación

- **CA-01:** Dada la franja de información de visita, cuando se muestre a 360, 390, 768, 1024 y 1366 px, entonces cada icono de horario, ubicación y boletos quedará centrado encima de su texto, manteniendo las tres etiquetas, enlaces y legibilidad sin desbordamiento horizontal.
- **CA-02:** Dado el favicon del portal, cuando se cargue desde `apps/web/src/`, entonces mostrará el logo proporcionado desde un recurso local bajo `apps/web/src/`, y la referencia resolverá sin rutas a directorios fuera del document root ni peticiones a un proveedor remoto.
- **CA-03:** Dada la suite `node --test apps/web/src/tests/relocation.test.mjs`, cuando se ejecute, entonces incluirá tests nombrados para CA-01..CA-03 que verifiquen alineación responsive, recurso local del favicon y conservación de textos/enlaces, sin agregar dependencias.
- **CA-04:** Dada la franja de información de visita, cuando se muestre en los anchos de CA-01, entonces los tres iconos estarán ligeramente más abajo que en la implementación inicial, seguirán centrados encima de los textos correspondientes y no causarán recorte ni desbordamiento.

## Reglas de negocio

- **RN-01:** Los iconos representan únicamente horario, ubicación e información de boletos ya publicados; la disposición visual no cambia su significado ni prioridad.
- **RN-02:** El favicon utilizará el logo proporcionado como recurso local del portal; no cargará desde URL externa ni mediante una ruta que escape del document root.
- **RN-03:** No se altera la paleta general ni el contenido, los enlaces o la lógica del portal.
- **RN-04:** El desplazamiento de los iconos es pequeño y uniforme en los tres bloques; no cambia su orden, etiqueta ni relación con el contenido.

## Datos, privacidad y auditoría

No se crean, consultan ni modifican datos. No se tratan datos personales, clínicos o financieros ni se accede a la API o a `settings_colores`.

## Flujos y errores

1. El navegador carga el favicon desde el recurso local referenciado por `index.html`.
2. La franja presenta cada icono centrado encima de su texto, conservando las etiquetas y el enlace a boletos.
3. En pantallas estrechas, los bloques se apilan y mantienen separación y lectura sin recorte.
4. Si el recurso del favicon no estuviera disponible, el contenido y la navegación del portal siguen utilizables.

## Dependencias, riesgos y preguntas

- Dependencias/ADR: No se agregan dependencias ni se requiere ADR.
- Riesgos: El logo es una imagen rasterizada proporcionada; se conserva tal cual y se usa solo para favicon.
- Preguntas pendientes: Ninguna.

## Revisión

- Aprobadores y fecha: Solicitante, 2026-10-08; aprobó CA-04/RN-04 y un desplazamiento uniforme de 8 px.
- Evidencia/enlaces: La implementación inicial de CA-01..CA-03 se verificó con pruebas dirigidas y navegador; el favicon local respondió HTTP 200. La persona solicitante aprobó el alcance ampliado CA-04/RN-04 en esta conversación.
