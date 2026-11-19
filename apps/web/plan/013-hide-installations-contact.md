# Plan técnico · 012 · hide-installations-contact

- Spec: `apps/web/specs/012-hide-installations-contact.md` (Aprobada, Jonathan, 2026-11-18)
- Estado del plan: **Aprobado** (Jonathan, 2026-11-18). Autoriza la implementación según sus tasks.
- Tasks: `apps/web/tasks/012-hide-installations-contact.md` (Borrador, mismo NNN-slug).
- Responsable técnico: por confirmar. Aprobador funcional de la spec: Jonathan.
- Dependencias: ninguna de API, de BD ni de otras apps. ADR 0024 (excepción del portal estático) sin cambios.

## Diseño de solución

El cambio es de marcado: el atributo nativo `hidden` en tres elementos de `apps/web/src/index.html`. Los elementos siguen en el DOM con sus `id`, sus textos y sus scripts, así que la reversión es quitar el atributo.

No cambian `script.js` ni `styles.css` (la spec lo fija en «Apps afectadas» y en CA-05 y CA-08). Las dos decisiones del diseño de referencia quedan sin efecto:

- **Guarda `?.` en `script.js:209`.** No se aplica. El elemento `#contactForm` existe aunque esté oculto, así que el listener se registra sin error. Una guarda sería defensiva y no es requisito (CA-05). Decisión 6 aceptada (2026-11-18): no se toca `script.js`.
- **Regla `[hidden]{display:none!important}` en `styles.css`.** No hace falta añadirla: ya existe en la línea 38 (CA-08 de la spec). Gana sobre `.contact-form { display: grid }` (línea 683, según la spec).

## Cambios por área

| Área | Archivo | Cambio | Líneas actuales (verificadas) |
|---|---|---|---|
| Portal (marcado) | `apps/web/src/index.html` | Añadir `hidden` al enlace del menú | Línea 102: `<a href="#instalaciones">Instalaciones</a>` |
| Portal (marcado) | `apps/web/src/index.html` | Añadir `hidden` a la sección | Línea 576: `<section class="installations" id="instalaciones">` (cierre en la línea 621) |
| Portal (marcado) | `apps/web/src/index.html` | Añadir `hidden` al formulario | Línea 900: `<form class="contact-form" id="contactForm">` (cierre en la línea 925) |
| Pruebas | `apps/web/src/tests/hide-installations-contact.test.mjs` (nuevo) | Pruebas estáticas y con DOM simulado; `node:test`, sin dependencias | — |
No cambian: `apps/web/src/script.js`, `apps/web/src/styles.css`, `apps/web/src/animations.css`, `infra/README.md`, ninguna otra app ni paquete.

El enlace «Contacto» (`href="#visita"`, línea 107) y el pie `<footer class="footer" id="visita">` (línea 870) no cambian (CA-04 y RN-03).

## Contrato y datos

- No hay API, datos personales ni almacenamiento. El formulario no envía nada (es de demostración según su nota).
- Sin cambio de `#visita`, de `#contactName`, `#contactEmail`, `#contactMessage` ni del botón.

## Seguridad, offline y operación

- Ocultar con `hidden` no oculta el contenido a las herramientas que lo leen; es presentación. No hay datos sensibles en esos elementos.
- Un elemento con `hidden` sale del árbol de accesibilidad y no recibe foco. Es lo esperado (spec, «Riesgos»).
- Portabilidad: HTML estático; sin build, sin paquetes (ADR 0024, CA-10).
- Sin requisitos de ambiente nuevos; `infra/README.md` no cambia.

## Pruebas

Archivo: `apps/web/src/tests/hide-installations-contact.test.mjs`, con `node --test` y solo módulos `node:*`. Cada prueba se llama `CA-NN hide-installations-contact: …`.

| CA | Prueba automatizada | Tipo |
|---|---|---|
| CA-01 | `<section id="instalaciones">` tiene `hidden`, conserva `class`, `id` y el contenido (cuenta de nodos hijos igual a la línea base) | Estática |
| CA-02 | `<form id="contactForm">` tiene `hidden`, conserva `class`, `id`, los campos `contactName`, `contactEmail`, `contactMessage`, el botón y la nota | Estática |
| CA-03 | El enlace `<a href="#instalaciones">` tiene `hidden`; no hay otro enlace a `#instalaciones` en `index.html` | Estática |
| CA-04 | `<a href="#visita">Contacto</a>` sin `hidden`; `<footer id="visita">` sin `hidden` | Estática |
| CA-05 | Carga `script.js` en `node:vm` con un DOM simulado en el que `#contactForm` y `#instalaciones` tienen `hidden`; no hay excepciones; el listener de `submit` queda registrado | DOM simulado (sin dependencias; el harness se copia de `news-events.test.mjs`, no se importa) |
| CA-06 | La lista de `id` de `section[id]` y su orden coinciden con la línea base de `web-011` (`porque-visitar`, `animales`, `mapa`, `ubicacion`, `instalaciones`, `noticias`, `eventos`, `boletos`, `preguntas`, `galeria`, `cognitivePanel`). Solo se añade `hidden` en los tres elementos (verificación con `git diff` en el PR; decisión 7 aceptada, 2026-11-18) | Estática + evidencia de `git diff` |
| CA-07 | Quitar `hidden` de los tres elementos en memoria y comparar con el HTML sin `hidden`: sin otras diferencias | Estática |
| CA-08 | `styles.css` contiene `[hidden] { display: none !important; }`; no se añadió ninguna regla que sobrescriba `hidden` en la sección ni en el formulario | Estática |
| CA-09 | Un test por cada CA-01 a CA-08 (cobertura), y los tests existentes de `web-010` y `web-011` siguen en verde | Cobertura + regresión |
| CA-10 | No existe `apps/web/package.json`; no hay cambios en archivos de configuración ni en `scripts` | Estática |

Revisión manual (no automatizable): CA-01 y CA-02 a 360, 768, 1024 y 1366 px; CA-03 con teclado (tabulación no alcanza el enlace oculto).

**Regresión:** antes de cambiar nada, registrar la línea base de `node --test apps/web/src/tests/*.test.mjs`. Hoy hay seis fallos preexistentes en `relocation.test.mjs` (CA-03 lion-hero-mobile-navigation, CA-04 y CA-07 isometric-zoo-map, CA-04 visit-info-icons-and-favicon, CA-03 header-walker-layer, CA-05 cognitive-accessibility-assistant), que no pertenecen a este cambio. Según el registro de `web-011` (2026-11-13) eran esos seis; hay que volver a medirlo antes de implementar. Este plan no afirma que ninguna prueba pase.

## Constitution Check

| Principio | Cumple | Evidencia |
|---|---|---|
| I. Stack mínimo y portable | Sí | HTML estático. Sin dependencias. ADR 0024 sin cambios |
| II. La spec manda | Sí, con condición | Spec 012 Aprobada (2026-11-18). Plan y tasks en Borrador: no hay código hasta su aprobación |
| III. Lógica separada de la interfaz | Sí | No hay lógica de negocio ni llamadas de red nuevas |
| IV. Un test por criterio | Sí, al implementar | Tabla de pruebas CA-01 a CA-10 |
| V. Una sola fuente de verdad para los datos | Sí | No se guarda ni se cachea ningún dato |
| VI. Código en inglés, personas en español | Sí | Ids en inglés; textos visibles en español (RN-04) |

## Riesgos y decisiones

- **Regla CSS que anula `hidden`:** `.contact-form` tiene `display: grid`, pero la regla global de la línea 38 usa `!important`. Si alguien añade un `display` con `!important`, la sección volvería a verse. La revisión manual y CA-08 lo detectan.
- **Pruebas de orden de secciones:** `web-010` y `web-011` comparan `id`, no elementos visibles. El orden no cambia.
- **Línea base de `web-011` en `animals.test.mjs`:** ya contiene la lista con `instalaciones`. Este cambio la reutiliza.
- **Verificación pendiente de dos puntos en T-01:** que ninguna prueba existente cuente enlaces del menú ni espere la sección visible, y que no haya otra regla CSS con `display` que anule `hidden` en `#instalaciones`.
- **Enlaces externos a `#instalaciones`:** verificado en `apps/web/src`: solo el enlace de la línea 102 (decisión de la spec).

## Decisiones aceptadas (2026-11-18)

6. **Guarda `?.` en `script.js:209`:** no se aplica. `script.js` no cambia.
7. **Verificación de CA-06 y CA-07:** con `git diff` en el PR y, en las pruebas, con la lista de `id` y su orden. No se crea documento nuevo en `apps/web/docs/`.

## Orden y aprobación

1. Aprobación técnica de este plan y de sus tasks. Decisiones 6 y 7 aceptadas (2026-11-18).
2. T-01 (línea base de regresión) antes que cualquier cambio.
3. Marcado en `index.html`, pruebas, revisión manual y calidad.
4. Este cambio no depende de otras specs y puede implementarse primero (`apps/web/src` no tiene build).
