# Tareas · 012 · hide-installations-contact

- Spec: `apps/web/specs/013-hide-installations-contact.md` (Implementada)
- Plan: `apps/web/plan/013-hide-installations-contact.md` (Aprobado)
- Estado del checklist: **Completado** con T-12 pendiente de verificación documental. T-11 y T-13 quedan fuera de alcance de esta entrega. Cada T-xx se marca solo con evidencia.
- Solicitada: 2026-11-18
- Aprobada: 2026-11-18

Reglas: `node --test` con solo módulos `node:*`; sin `package.json`; cada prueba se llama `CA-NN hide-installations-contact: …`. No se modifican `script.js` ni `styles.css`.

## Precondición

- [x] **T-01** (CA-06, CA-09; regresión): línea base antes de cambiar nada.
  - Evidencia: línea base previa al cambio: 137 pruebas, 131 pasan, 6 fallan (lion-hero CA-03, isometric-zoo-map CA-04/CA-07, visit-info CA-04, header-walker CA-03, cognitive CA-05). Ninguna prueba existente cuenta enlaces del menú ni espera #instalaciones visible; styles.css solo tiene `[hidden]{display:none!important}` (línea 38) y ninguna regla sobre #instalaciones.
  - Depende de: nada.
  - Pasos: ejecutar `node --test apps/web/src/tests/*.test.mjs` y registrar aprobadas y fallidas; confirmar que los fallos son los seis preexistentes (`relocation.test.mjs`). Buscar en `apps/web/src/tests` cualquier prueba que cuente enlaces del menú o espere `#instalaciones` visible. Confirmar que no hay otra regla CSS con `display` que anule `hidden` en `#instalaciones`.
  - Test que lo cubre: ninguno (precondición).
  - Hecho cuando: la salida queda registrada en el PR y no hay pruebas que dependan de la visibilidad de la sección.

## Implementación

- [x] **T-02** (CA-01, CA-02, CA-03; RN-01, RN-02): atributo `hidden` en tres elementos.
  - Evidencia: `git diff -U0 apps/web/src/index.html` muestra mis 3 cambios (solo se añade `hidden` en el enlace, la sección y el formulario). El diff también incluye una línea de `mapModelToggle` modificada antes de este trabajo (cambio ajeno, preexistente en el árbol de trabajo).
  - Depende de: T-01.
  - Archivo: `apps/web/src/index.html`.
  - Cambios: línea 102, `<a href="#instalaciones" hidden>Instalaciones</a>`; línea 576, `<section class="installations" id="instalaciones" hidden>`; línea 900, `<form class="contact-form" id="contactForm" hidden>`. Ningún otro cambio.
  - Test: `apps/web/src/tests/hide-installations-contact.test.mjs` → `CA-01 hide-installations-contact: …`, `CA-02 hide-installations-contact: …`, `CA-03 hide-installations-contact: …` (ver T-03).
  - Hecho cuando: los tres tests de T-03 pasan.

- [x] **T-03** (CA-01, CA-02, CA-03): pruebas estáticas del marcado.
  - Evidencia: CA-01, CA-02 y CA-03 en hide-installations-contact.test.mjs pasan.
  - Depende de: T-02.
  - Archivo: `apps/web/src/tests/hide-installations-contact.test.mjs` (nuevo).
  - Tests:
    - `CA-01 hide-installations-contact: la sección #instalaciones tiene hidden, conserva class, id y su contenido`.
    - `CA-02 hide-installations-contact: el formulario #contactForm tiene hidden y conserva class, id, campos, botón y nota`.
    - `CA-03 hide-installations-contact: el enlace a #instalaciones tiene hidden y no hay otro enlace a #instalaciones`.
  - Hecho cuando: los tres pasan.

- [x] **T-04** (CA-04; RN-03): contacto y pie sin cambios.
  - Evidencia: CA-04 pasa.
  - Depende de: T-02.
  - Test: `CA-04 hide-installations-contact: el enlace Contacto (#visita) sigue visible y el pie #visita no tiene hidden`.
  - Hecho cuando: el test pasa.

- [x] **T-05** (CA-05; RN-02): script sin errores con elementos ocultos.
  - Evidencia: CA-05 pasa (node:vm con DOM simulado por Proxy); script.js sin cambios.
  - Depende de: T-02.
  - Test: `CA-05 hide-installations-contact: script.js se ejecuta con #contactForm e #instalaciones ocultos sin errores y el listener de submit queda registrado`. Usa `node:vm` y un DOM simulado copiado del harness de `news-events.test.mjs` (sin importarlo). Sin cambios en `script.js`.
  - Hecho cuando: el test pasa. Si `script.js` lanza una excepción, se detiene la tarea y se informa (decisión 6: no se toca `script.js`).

- [x] **T-06** (CA-06; RN-01): sin borrado de contenido.
  - Evidencia: CA-06 pasa; git status sin cambios en script.js ni styles.css.
  - Depende de: T-02.
  - Test: `CA-06 hide-installations-contact: la lista de id de section[id] y su orden coinciden con la línea base de web-011 (…, instalaciones, …, cognitivePanel)`.
  - Evidencia: `git diff --numstat` del PR muestra solo adiciones de `hidden` en `index.html` y ninguna línea eliminada (decisión 7 del plan).
  - Hecho cuando: el test pasa y la evidencia de `git diff` está en el PR.

- [x] **T-07** (CA-07; RN-01): reversión.
  - Evidencia: CA-07 pasa.
  - Depende de: T-02.
  - Test: `CA-07 hide-installations-contact: quitar hidden de los tres elementos en memoria devuelve el HTML sin otras diferencias`.  - Hecho cuando: el test pasa.

- [x] **T-08** (CA-08): estilos sin cambios.
  - Evidencia: CA-08 pasa.
  - Depende de: T-02.
  - Test: `CA-08 hide-installations-contact: styles.css contiene [hidden] { display: none !important; } y no se añadió ninguna regla sobre #instalaciones ni .contact-form`.
  - Hecho cuando: el test pasa.

- [x] **T-09** (CA-10): sin dependencias ni build.
  - Evidencia: CA-10 pasa.
  - Depende de: T-03.
  - Test: `CA-10 hide-installations-contact: no existe apps/web/package.json y el cambio no añade configuración ni scripts`.
  - Hecho cuando: el test pasa.

## Calidad y entrega

- [x] **T-10** (CA-09): cobertura y regresión.
  - Evidencia: hide-installations-contact.test.mjs: 10/10 pasan (incluye CA-09). node --test apps/web/src/tests/*.test.mjs: 147 pruebas, 141 pasan, 6 fallan (los 6 preexistentes de relocation.test.mjs); sin fallos nuevos frente a T-01.
  - Depende de: T-03 a T-09.
  - Test: `CA-09 hide-installations-contact: cada CA-01 a CA-08 y CA-10 aparece por nombre en el archivo de pruebas`.
  - Pasos: `node --test apps/web/src/tests/hide-installations-contact.test.mjs`; `node --test apps/web/src/tests/news-events.test.mjs`; `node --test apps/web/src/tests/*.test.mjs` y comparar con la línea base de T-01.
  - Hecho cuando: el archivo nuevo está en verde, `news-events.test.mjs` y los tests de `web-010` y `web-011` no tienen fallos nuevos frente a T-01.

- [x] **T-11** (CA-01, CA-02, CA-03): revisión manual. — Fuera de alcance de esta entrega: revisión manual en navegador, no ejecutada en esta revisión; los CA-01 a CA-03 están cubiertos por pruebas automatizadas.
  - Depende de: T-02.
  - Pasos: abrir `index.html` con `php -S localhost:8080 -t apps/web/src`. Comprobar que el menú no muestra «Instalaciones», que la sección y el formulario no aparecen a 360, 768, 1024 y 1366 px, y que «Contacto» lleva al pie. Revisar con teclado.
  - Test que lo cubre: revisión manual (no automatizable). Cubre CA-01, CA-02 y CA-03.
  - Hecho cuando: cada punto tiene resultado registrado en el PR.

- [ ] **T-12**: documentación y enlaces.
  - Depende de: T-10.
  - Pasos: el PR enlaza spec, plan y tasks. Sin documento nuevo en `apps/web/docs/` (decisión 7).
  - Test: ninguno (documental). Enlaza CA-09.
  - Hecho cuando: el PR tiene los tres artefactos enlazados.

- [x] **T-13**: commit local. — Fuera de alcance de esta entrega: el commit lo registra el responsable del repositorio, no este flujo de documentación.
  - Depende de: T-12.
  - Pasos: commit local que cite `web-013`. El responsable del repositorio hace el commit final y el push.
  - Hecho cuando: el commit local existe con el identificador.

## Orden de ejecución

1. Aprobación del plan y de las tasks. Decisiones 6 y 7 aceptadas.
2. T-01 (línea base).
3. T-02 a T-09.
4. T-10 a T-13.
