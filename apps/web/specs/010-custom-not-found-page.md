# 010 · custom-not-found-page

- App dueña: `web`
- Apps/paquetes afectados: `apps/web`, `infra`
- Estado: Implementada
- Solicitante / responsable funcional: Gregorio
- Aprobación funcional: Gregorio, 2026-11-10

## Problema y contexto

El portal institucional no tiene una página propia para direcciones inexistentes. Cuando una persona visita una URL inválida, la respuesta y la presentación dependen del servidor que publique los archivos, por lo que puede ver una página técnica sin identidad institucional o incluso recibir la portada con estado `200`.

El portal actual es HTML, CSS y JavaScript estático conforme al ADR 0024. En desarrollo se sirve con el servidor integrado de PHP, pero el hosting y el servidor de producción todavía están por definir en `infra/README.md` y `docs/arquitectura/despliegue.md`. Esta feature debe ofrecer una experiencia 404 institucional sin elegir de forma implícita un proveedor de producción.

## Objetivos

- Crear `apps/web/src/404.html` con el diseño visual vigente del portal y contenido en español.
- Explicar de forma clara que la página solicitada no existe.
- Ofrecer acciones visibles para volver al inicio, consultar noticias y consultar eventos.
- Hacer que el servidor PHP local entregue `404.html` con estado HTTP `404` para una ruta o archivo inexistente.
- Documentar en el checklist de despliegue que el servidor de producción debe conservar el estado HTTP `404` al mostrar la página institucional.
- Cubrir el contenido, la accesibilidad básica y el código de estado con pruebas automatizadas sin dependencias nuevas.

## Fuera de alcance

- Elegir o contratar un proveedor de hosting.
- Agregar una configuración específica de Nginx, Apache, Caddy, Netlify, Vercel u otro proveedor mientras la plataforma de producción siga sin definirse.
- Convertir el portal a React, Vite, Tailwind o TypeScript.
- Incorporar búsqueda, sugerencias basadas en la URL, telemetría o reportes de enlaces rotos.
- Modificar las respuestas JSON `404` de la API Laravel.
- Cambiar el contenido o comportamiento de `index.html`, `noticias.html` o `eventos.html`, salvo los recursos compartidos estrictamente necesarios para mantener el diseño.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Visitante | Entender que la dirección no existe y continuar navegando | Ninguno; página pública |
| Visitante con lector de pantalla o teclado | Identificar el error y activar una ruta de recuperación | Ninguno; página pública |
| Equipo de despliegue | Configurar el servidor para conservar el estado HTTP correcto | Acceso al ambiente y configuración del servidor |

## Historias de usuario

- Como visitante, quiero reconocer que una dirección no existe para no confundir el error con una falla general del zoológico.
- Como visitante, quiero volver al inicio o abrir noticias y eventos para continuar navegando sin editar manualmente la dirección.
- Como integrante del equipo, quiero que una URL inexistente responda realmente `404` para que navegadores, buscadores y monitoreo no la interpreten como contenido válido.

## Criterios de aceptación

- **CA-01:** Dada `apps/web/src/404.html`, cuando se abre, entonces conserva la identidad institucional del portal mediante sus estilos y recursos existentes, muestra un encabezado principal visible con el código `404` y un mensaje en español que indica que la página no fue encontrada.
- **CA-02:** Dada la página 404, cuando el visitante busca una ruta de recuperación, entonces encuentra enlaces funcionales y distinguibles para «Volver al inicio», «Ver noticias» y «Ver eventos», dirigidos respectivamente a `index.html`, `noticias.html` y `eventos.html` mediante rutas relativas compatibles con el portal estático.
- **CA-03:** Dada la página 404, cuando se usa con teclado o tecnología de asistencia, entonces mantiene un orden de foco lógico, un único `h1`, enlaces con texto descriptivo, idioma español declarado, título de documento descriptivo y foco visible mediante los estilos vigentes.
- **CA-04:** Dado el servidor PHP local iniciado según `apps/web/README.md`, cuando se solicita una ruta o archivo inexistente, entonces responde con estado HTTP `404`, encabezado `Content-Type: text/html; charset=UTF-8` y el contenido de `404.html`; los archivos existentes conservan su estado y contenido normales.
- **CA-05:** Dado el despliegue de producción, cuando se publique el portal, entonces el checklist de `infra/README.md` exige configurar la página institucional como documento de error sin convertir la respuesta en `200`; la sintaxis concreta queda pendiente hasta que se defina el servidor de producción.
- **CA-06:** Dada la implementación, cuando se ejecutan las pruebas de `web-010`, entonces cada criterio CA-01 a CA-05 está nombrado y cubierto sin instalar dependencias ni crear un manifiesto para el portal.

## Reglas de negocio

- **RN-01:** Una dirección inexistente siempre conserva el estado HTTP `404`; una redirección a la portada o una página 404 servida como `200` no cumple.
- **RN-02:** La página es pública, no solicita autenticación y no muestra datos personales, clínicos, financieros ni detalles técnicos del servidor.
- **RN-03:** Los enlaces de recuperación usan rutas relativas y funcionan bajo el servidor PHP local y bajo un servidor estático configurado con la raíz en `apps/web/src/`.
- **RN-04:** La implementación reutiliza tokens, estilos y recursos existentes; no agrega dependencias, colores de marca fijados directamente ni llamadas a la API.
- **RN-05:** La configuración específica de producción se añadirá únicamente después de definir el hosting y el servidor; hasta entonces el repositorio documentará el requisito verificable y ofrecerá una configuración ejecutable para el servidor PHP local.

## Datos, privacidad y auditoría

La página no crea, consulta ni modifica datos del sistema. No usa cookies, almacenamiento local, analítica, formularios ni peticiones de red. No trata datos personales, clínicos o financieros y no requiere auditoría ni DBR.

No se crea ni modifica ningún esquema, función o procedimiento de base de datos.

## Flujos y errores

1. El visitante solicita una URL inexistente.
2. El servidor conserva el estado HTTP `404` y entrega la página institucional.
3. La página explica el problema sin exponer rutas internas ni trazas.
4. El visitante puede regresar al inicio o abrir las páginas de noticias y eventos.
5. Si un recurso decorativo no carga, el texto y los tres enlaces siguen disponibles y utilizables.

Los recursos existentes no se interceptan: el servidor los entrega normalmente. La página 404 no realiza reintentos ni peticiones a la API.

## Dependencias, riesgos y preguntas

- Dependencias/ADR: no agrega dependencias ni requiere un ADR nuevo; conserva la excepción de portal estático aceptada en ADR 0024. El requisito de despliegue se registra en `infra/README.md` conforme al ADR 0023 y a las reglas raíz.
- Riesgos: devolver `200` por una configuración incorrecta; crear un bucle si el documento 404 no puede resolverse; enlaces relativos rotos cuando la URL inválida contiene varios segmentos; divergencia entre el servidor PHP local y el futuro servidor de producción.
- Preguntas pendientes:
  1. Resuelta por Gregorio el 2026-11-10: se aprueban el alcance y los criterios CA-01 a CA-06.
  2. Resuelta para esta feature por Gregorio el 2026-11-10: mientras el servidor o proveedor de producción siga sin definirse, la implementación cubrirá el servidor PHP local y dejará el requisito de producción en el checklist, sin inventar una configuración específica.

## Revisión

- Aprobadores y fecha: aprobación funcional, técnica y del checklist por Gregorio, 2026-11-10.
- Evidencia/enlaces: `apps/web/plan/010-custom-not-found-page.md`, `apps/web/tasks/010-custom-not-found-page.md` y `apps/web/src/tests/not-found.test.mjs`. Suite enfocada: 6 tests, 6 aprobados, 0 fallidos; incluye respuesta HTTP real, archivos válidos en `200` y rechazo de traversal. Revisión visual aprobada en 360, 768 y 1366 px, sin desbordamiento y con foco visible. `git diff --check` y sintaxis PHP sin errores.
