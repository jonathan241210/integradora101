# 013 · hide-installations-contact

- App dueña: `web`
- Apps/paquetes afectados: `web` (solo `apps/web/src/index.html`; `styles.css` y `script.js` no cambian). Sin cambios en `api`, `dashboard`, `pwa`, `mobile` ni paquetes.
- Estado: Implementada
- Solicitada: 2026-11-18
- Aprobada: 2026-11-18
- Aprobación funcional: Aprobada
- Dependencias: ninguna de API ni de BD. Las líneas base de orden de secciones de `web-010` y `web-011` siguen válidas porque las secciones permanecen en el DOM; solo se anota en «Revisión».
- Este borrador no autoriza plan, tasks ni código.

## Problema y contexto

El portal institucional muestra hoy la sección «Todo para un gran día» (`#instalaciones`) y el formulario «Escríbenos» (`#contactForm`). El zoológico quiere ocultarlos temporalmente, sin borrar nada, para poder volver a mostrarlos más adelante con un solo cambio.

Ubicación actual en `apps/web/src/index.html`:
- Enlace del menú «Instalaciones»: `<a href="#instalaciones">`, línea 102.
- Sección: `<section class="installations" id="instalaciones">`, línea 576.
- Formulario: `<form class="contact-form" id="contactForm">`, línea 900. El título «Escríbenos» y el resto de campos están dentro del formulario, así que ocultarlo basta.
- Enlace «Contacto»: `<a href="#visita">`, línea 107. Apunta al pie de página (`<footer id="visita">`), que no se oculta.
- Listener del formulario: `apps/web/src/script.js`, línea 209 (`$('contactForm').addEventListener(...)`).

## Objetivos

- Ocultar la sección `#instalaciones` y el formulario `#contactForm` sin borrar su markup ni sus `id`.
- Ocultar el enlace «Instalaciones» del menú para que no quede un ancla que no lleva a ningún lado.
- Dejar el enlace «Contacto» y el pie de página como están.
- Que la página siga cargando sin errores de consola con los elementos ocultos.
- Que volver a mostrarlos sea quitar el atributo `hidden`.

## Fuera de alcance

- Borrar, mover o reescribir el contenido de la sección o del formulario.
- Cambiar los textos, las imágenes, los campos ni el comportamiento del formulario cuando esté visible.
- Eliminar el enlace «Contacto» o cambiar su destino.
- Ocultar el pie de página (`#visita`), que contiene la información de contacto y las redes.
- Cualquier cambio de la API, de la base de datos o de otras apps.
- Eliminar los assets de la sección (por ejemplo, las imágenes de instalaciones), si los hay.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Visitante del portal | No ver una sección ni un formulario que no están disponibles | Ninguno |
| Visitante con lector de pantalla | No encontrar un enlace de menú que no lleva a ningún contenido | Ninguno |
| Equipo del portal | Ocultar y volver a mostrar con un cambio pequeño y revisable | Acceso al repositorio |

## Historias de usuario

- Como visitante, quiero que el portal no me muestre una sección ni un formulario que no están disponibles, para no perder tiempo en ellos.
- Como equipo del portal, quiero ocultar esa sección y ese formulario sin borrarlos, para poder volver a mostrarlos después con un cambio de una línea.

## Criterios de aceptación

- **CA-01 (sección oculta):** Dado `index.html` después del cambio, cuando se revisa `<section id="instalaciones">`, entonces tiene el atributo `hidden`, conserva su `class`, su `id` y todo su contenido, y no se muestra en pantalla a 360, 768, 1024 y 1366 px. Se verifica con una prueba estática del atributo y con una revisión manual en los cuatro anchos.
- **CA-02 (formulario oculto):** Dado `index.html` después del cambio, cuando se revisa `<form id="contactForm">`, entonces tiene el atributo `hidden`, conserva su `class`, su `id`, sus campos (`contactName`, `contactEmail`, `contactMessage`), su botón y su nota, y no se muestra en pantalla en los mismos anchos.
- **CA-03 (enlace del menú oculto):** Dado el menú de navegación, cuando se revisa el enlace `<a href="#instalaciones">`, entonces tiene el atributo `hidden` y no es visible ni alcanzable con tabulación. No queda ningún enlace visible a `#instalaciones` en la página.
- **CA-04 (contacto se mantiene):** Dado el menú y el pie de página, cuando se revisan, entonces el enlace «Contacto» (`href="#visita"`) sigue visible con el mismo texto y destino, y el pie `<footer id="visita">` no tiene `hidden` ni cambios.
- **CA-05 (sin errores con ocultos):** Dada la página cargada con el formulario y la sección ocultos, cuando `script.js` se ejecuta, entonces no hay errores en consola. El listener del formulario sigue registrado, porque el elemento existe aunque esté oculto, así que `script.js` no necesita cambios. Una guarda `?.` en la línea 209 sería defensiva y se decide en el plan; no es requisito de esta spec. Se verifica con la prueba del módulo que simula el DOM.
- **CA-06 (sin borrado):** Dado `index.html` antes y después del cambio, cuando se comparan, entonces la única diferencia es la adición del atributo `hidden` en los tres elementos (`#instalaciones`, `#contactForm` y el enlace del menú). No se eliminan líneas ni `id`. La prueba compara la lista de `id` y el orden de `section[id]` con la línea base de `web-010` y `web-011`.
- **CA-07 (reversión):** Dado el cambio, cuando se quita el atributo `hidden` de los tres elementos, entonces la sección, el formulario y el enlace vuelven a mostrarse sin otros cambios. Se documenta en `apps/web/docs/` si existe la documentación local.
- **CA-08 (estilos):** Dado `styles.css`, cuando se revisa, entonces ya contiene la regla global `[hidden] { display: none !important; }` (línea 38), que gana sobre `.contact-form { display: grid }` (línea 683). No se añade ni se cambia ninguna regla de `styles.css`. Se verifica con una prueba estática de esa regla y con la revisión manual de CA-01 y CA-02.
- **CA-09 (cobertura):** Dada la suite `node --test` del portal, cuando se ejecuta, entonces hay al menos un test que nombra cada CA-01 a CA-08, sin dependencias nuevas. Los tests existentes de `web-010` y `web-011` (incluidos los que comprueban ids, como `contactForm` en `news-events.test.mjs`) siguen en verde.
- **CA-10 (sin dependencias ni build):** El cambio no añade paquetes, build, scripts de terceros ni archivos de configuración (`apps/web/AGENTS.md`; ADR 0024).

## Reglas de negocio

- **RN-01 (ocultar, no borrar):** Se usa el atributo `hidden` nativo. No se eliminan nodos ni se cambian ids, para que los tests que los buscan sigan funcionando y para que la reversión sea trivial.
- **RN-02 (sin ancla muerta):** Ningún enlace de la página apunta a una sección oculta.
- **RN-03 (contacto por el pie):** El enlace «Contacto» apunta a `#visita`, el pie de página, que sigue visible con su información de contacto.
- **RN-04 (textos en español):** Los textos que quedan visibles siguen en español (`apps/web/AGENTS.md`).

## Datos, privacidad y auditoría

- No hay datos personales ni de API. El formulario no envía nada (es de demostración según su nota), y el cambio no lo altera.
- No hay auditoría ni DBR.

## Flujos y errores

1. El visitante abre el portal. El menú no muestra «Instalaciones». La sección «Todo para un gran día» y el formulario «Escríbenos» no aparecen.
2. El visitante usa «Contacto» en el menú y llega al pie de página, que sigue igual.
3. Si la sección o el formulario se ocultan con `hidden` y algún script los necesita, la página no falla, porque el elemento sigue en el DOM.

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:** ninguna. No hay ADR nuevo ni cambio de la excepción de ADR 0024.
- **Riesgos:**
  - **Regla CSS que anula `hidden`:** `.contact-form` tiene `display: grid`, pero la regla global `[hidden]` de `styles.css` (línea 38) usa `!important` y gana. Se verifica en CA-08. Si alguien añade un `display` con `!important` más adelante, la sección se vería; la revisión manual lo detecta.
  - **Lector de pantalla:** un elemento con `hidden` sale del árbol de accesibilidad, lo que es lo esperado.
  - **Pruebas de orden de secciones:** si `web-010` o `web-011` cuentan secciones visibles en lugar de ids, cambiarían. Se revisa en el plan.
- **Decisiones** (cerradas por el equipo):
  - Enlaces externos a `#instalaciones`: no hay enlaces conocidos. Verificado en `apps/web/src`: solo el enlace del menú (línea 102). Se acepta.
  - El enlace «Contacto» se mantiene hacia el pie de página, no hacia el formulario oculto (RN-03).

## Revisión

- Aprobación: Aprobada. Decisiones: sin enlaces externos conocidos y «Contacto» al pie.
- Enmienda de notas: `apps/web/specs/011-dynamic-tulanpedia.md` y `apps/web/specs/010-dynamic-memories.md` registran el orden de secciones (`instalaciones` incluido) como línea base. Ese orden no cambia con esta spec, porque las secciones siguen en el DOM. Solo se anota aquí; esas specs no se modifican.
- Evidencia/enlaces: `apps/web/src/index.html` (líneas 102, 107, 576 y 900), `apps/web/src/styles.css` (línea 38, regla `[hidden]`; líneas 450 y 683, sin `display` que anule el atributo en la sección), `apps/web/src/script.js` (línea 209), `apps/web/src/tests/news-events.test.mjs` (lista de ids, línea 435), `apps/web/tasks/011-dynamic-tulanpedia.md` (línea base de `animals.test.mjs`).
