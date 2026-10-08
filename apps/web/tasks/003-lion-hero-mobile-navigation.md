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

- [x] **T-06** (CA-01..CA-05): ejecutar `node --test apps/web/src/tests/relocation.test.mjs`; completar la revisión responsive en escritorio a 1024 y 1366 px, y tamaños 360, 390 y 768 px con menú cerrado/abierto, Escape y foco. El navegador confirmó que el documento no desborda y que las fechas de eventos caben en los anchos revisados; también se inspeccionaron 1920 y 2560 px. Las pruebas propias de 003 pasan (6/6); en la suite completa hay cuatro fallos en contenido preexistente del worktree: una referencia local a `web/packages/ui/logo.jpeg` y tres criterios de `isometric-zoo-map`. El navegador integrado no emitió automáticamente `MediaQueryList.change` al redimensionar; se disparó explícitamente para comprobar la restauración del menú entre móvil y escritorio.
- [ ] **T-07** (CA-01..CA-05): ejecutar `git diff --check` y `/verify`; revisar assets protegidos y conservar las modificaciones ajenas previas del worktree. La comprobación global señala una línea vacía final en el `index.html` preexistente; la comprobación de los archivos tocados por esta tarea pasa. `/verify` informa que `apps/web` no está inicializada para npm.
- [ ] **T-08**: marcar spec, plan y tasks como implementados solo tras verificar todos los criterios y registrar evidencia; enlazar los artefactos 003 en el PR y citar `web-003`.

No se requieren cambios de API, datos, permisos de servidor, migraciones, auditoría, sincronización ni documentación de otra app. No se realiza `git add` ni `git commit` como parte de estas tareas.

## Evidencia de ejecución

- T-01..T-05: implementados; cambios estructurales y CSS limitados a los artefactos autorizados. Los once assets conservan sus SHA-256 esperados.
- T-06: `node --test --test-name-pattern='lion-hero-mobile-navigation' apps/web/src/tests/relocation.test.mjs`: 6 tests, 6 pass, 0 fail. La suite completa tiene 24 tests: 20 pass y 4 fail: CA-05 de referencias locales (`web/packages/ui/logo.jpeg`) y CA-01..CA-03 de `isometric-zoo-map`; todas las pruebas de 003 pasan.
- Navegador: 360, 390, 768, 1024 y 1366 px verificados sin desbordamiento horizontal del documento ni de fechas de evento; menú cerrado en móvil y desplegado en escritorio. En móvil se comprobó apertura, Escape y retorno de foco. También se revisaron 1920 y 2560 px y el portal ocupa el ancho disponible.
- T-07 parcial: `git diff --check -- apps/web/src/styles.css apps/web/src/tests/relocation.test.mjs` pasa. La comprobación global detecta una línea vacía al final de `apps/web/src/index.html`, archivo modificado antes de esta tarea y no editado aquí. La suite verificó sin cambios los hashes de los 11 assets protegidos.
- `/verify`: `apps/web` aún no está inicializada; falta `apps/web/src/package.json`, por lo que no existen scripts npm para formato, lint, tipos o test.
- T-08 sigue pendiente: no se declara la feature Implementada mientras la suite completa conserve los cuatro fallos asociados al contenido ya modificado en el worktree.
