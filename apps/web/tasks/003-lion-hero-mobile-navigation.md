# Tareas · 003 · lion-hero-mobile-navigation

- Spec: `apps/web/specs/003-lion-hero-mobile-navigation.md` (Estado: **Aprobada**)
- Plan: `apps/web/plan/003-lion-hero-mobile-navigation.md` (Estado técnico: **Aprobado para tareas**)
- Estado del checklist: Aprobado por el solicitante el 2026-10-08; implementación con verificación visual responsive pendiente, cuya limitación fue aceptada para continuar con otras tareas.

## Trazabilidad

| Criterio / regla | Tareas que lo cubren |
|---|---|
| CA-01 / RN-01 | T-04, T-05 |
| CA-02 / RN-02 | T-02, T-03, T-05, T-06 |
| CA-03 / RN-03 | T-02, T-03, T-05, T-06 |
| CA-04 / RN-04 | T-04, T-05, T-06 |
| CA-05 | T-05, T-06 |

## Implementación

- [x] **T-01** (CA-02..CA-05; RN-02..RN-04): ampliar los artefactos 001 de spec, plan y tasks para autorizar explícitamente los cambios de navegación en `index.html` y `script.js` bajo la spec 003. Integrar los cambios no confirmados de las specs 001/002 sin reemplazarlos; conservar las evidencias históricas y los alcances ya aprobados.
- [x] **T-02** (CA-02, CA-03; RN-02, RN-03): añadir al encabezado de `apps/web/src/index.html` un botón hamburguesa con `type`, nombre accesible, `aria-controls` y estado `aria-expanded`, asociado al `<nav>` existente. Mantener el botón oculto y los enlaces visibles en el HTML inicial para no perder navegación si JavaScript no inicializa.
- [x] **T-03** (CA-02, CA-03; RN-02, RN-03): implementar en `apps/web/src/script.js` la apertura/cierre únicamente hasta 820 px, la sincronización de `hidden`/`aria-expanded`, el cierre con Escape y retorno de foco, el cierre al elegir un enlace y la restauración del menú desplegado al entrar a escritorio. No alterar otras interacciones existentes.
- [x] **T-04** (CA-01, CA-02, CA-04; RN-01, RN-02, RN-04): actualizar `apps/web/src/styles.css` para recuperar solo en `.hero` el degradado verde legado y adaptar header, menú, acciones y secciones a los viewports especificados, evitando desbordamientos y sin alterar la paleta restante.
- [x] **T-05** (CA-01..CA-05; RN-01..RN-04): añadir pruebas nombradas para los cinco criterios en `apps/web/src/tests/relocation.test.mjs`. Verificar color/recurso del hero, marcado y estilos del menú, contratos de teclado/foco, breakpoints y requisitos de la suite; conservar hashes de recursos fuera de alcance, quitando las verificaciones exactas de contenido solo para `index.html` y `script.js`, ya autorizados por 003. No agregar paquetes.

## Calidad y entrega

- [ ] **T-06** (CA-01..CA-05): ejecutar `node --test apps/web/src/tests/relocation.test.mjs`; completar la revisión visual responsive en escritorio a 1024 y 1366 px, y tamaños 360, 390 y 768 px con menú cerrado/abierto, teclado, Escape, foco, cambio de tamaño y `scrollWidth <= innerWidth`. La suite Node ya valida los contratos de color, estructura responsive e interacciones simuladas; queda pendiente la verificación de navegador porque el ID de página del navegador integrado dejó de estar disponible.
- [ ] **T-07** (CA-01..CA-05): ejecutar `git diff --check` y `/verify`; revisar assets protegidos y conservar las modificaciones ajenas previas del worktree. Registrar resultados y señalar que `apps/web` no está inicializada para npm. La parte de inspección visual completa queda ligada a T-06.
- [ ] **T-08**: marcar spec, plan y tasks como implementados solo tras verificar todos los criterios y registrar evidencia; enlazar los artefactos 003 en el PR y citar `web-003`.

No se requieren cambios de API, datos, permisos de servidor, migraciones, auditoría, sincronización ni documentación de otra app. No se realiza `git add` ni `git commit` como parte de estas tareas.

## Evidencia de ejecución

- T-01..T-05: implementados; cambios estructurales y CSS limitados a los artefactos autorizados. Los once assets conservan sus SHA-256 esperados.
- T-06 parcial: `node --test apps/web/src/tests/relocation.test.mjs`: 18 tests, 18 pass, 0 fail. `node --check apps/web/src/script.js` y `git diff --check` pasan. Las pruebas unitarias de CA-03 ejecutan aperturas, cierre Escape, foco, selección de enlace y cambios entre breakpoints en un DOM simulado.
- Navegador: el portal cargó en la sesión integrada, pero la página dejó de estar disponible al ejecutar la comprobación interactiva responsive; las llamadas siguientes indicaron que no encontraron el ID de página. No se pudo medir `scrollWidth` en todos los anchos; mantener T-06/T-07 pendientes y no marcar la feature Implementada.
- `/verify`: `apps/web` aún no está inicializada; falta `apps/web/src/package.json`, por lo que no existen scripts npm para formato, lint, tipos o test. La suite Node anterior sí se ejecutó.
- Decisión de avance: El 2026-10-08 la persona solicitante autorizó continuar con las pruebas automatizadas y dejar anotada la limitación visual. T-06/T-07 y el cierre de CA-04 permanecen pendientes de una sesión de navegador utilizable.
