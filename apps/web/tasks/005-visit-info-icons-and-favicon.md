# Tareas · 005 · visit-info-icons-and-favicon

- Spec: `apps/web/specs/005-visit-info-icons-and-favicon.md` (Estado: **Implementada**)
- Plan: `apps/web/plan/005-visit-info-icons-and-favicon.md` (Estado técnico: **Implementado y verificado**)
- Estado del checklist: Incremento de desplazamiento aprobado por el solicitante el 2026-10-08; tareas implementadas y verificadas

## Trazabilidad

| Criterio / regla | Tareas que lo cubren |
|---|---|
| CA-01 / RN-01, RN-03 | T-02, T-03, T-06, T-07 |
| CA-02 / RN-02 | T-01, T-03 |
| CA-03 / RN-01..RN-03 | T-03, T-04, T-07 |
| CA-04 / RN-04 | T-06, T-07 |

## Implementación

- [x] **T-01** (CA-02; RN-02): copiar el logo existente `packages/ui/logo.jpeg` a `apps/web/src/assets/zoo-logo.jpeg` sin modificar ni eliminar el original; actualizar el favicon de `apps/web/src/index.html` a una ruta relativa local `assets/zoo-logo.jpeg`.
- [x] **T-02** (CA-01; RN-01, RN-03): ajustar `apps/web/src/styles.css` para disponer verticalmente y centrar cada icono encima del contenido de horario, ubicación y boletos; conservar los textos y el enlace, con bloques legibles y adaptables en los breakpoints existentes.
- [x] **T-03** (CA-01..CA-03; RN-01..RN-03): ampliar `apps/web/src/tests/relocation.test.mjs` con tests `CA-01 visit-info-icons-and-favicon`, `CA-02 visit-info-icons-and-favicon` y `CA-03 visit-info-icons-and-favicon`; verificar contrato de estilos responsive, referencia y existencia local del logo, y textos/enlace conservados. Mantener la suite sin dependencias nuevas.

## Calidad y entrega

- [x] **T-04** (CA-01..CA-03): ejecutar tests enfocados y la suite completa, `git diff --check` y `/verify`; registrar fallos previos por separado y revisar visualmente 360, 390, 768, 1024 y 1366 px además de la carga efectiva del favicon.
- [x] **T-05**: registrar evidencias y actualizar el estado de esta feature a Implementada solo cuando todos sus criterios estén verificados; no modificar ni revertir los otros cambios preexistentes del worktree.
- [x] **T-06** (CA-04; RN-04): actualizar `apps/web/src/styles.css` para aplicar `margin-top: 8px` solo a `.infobar .info-icon`, manteniendo centrado y orden visual de los tres bloques.
- [x] **T-07** (CA-01, CA-03, CA-04; RN-01, RN-03, RN-04): añadir el test nombrado `CA-04 visit-info-icons-and-favicon` y reforzar las pruebas de CA-01 para verificar desplazamiento de 8 px, centrado, texto/enlaces conservados y reglas responsive.
- [x] **T-08** (CA-01..CA-04): ejecutar pruebas enfocadas y suite completa, `git diff --check` y `/verify`; revisar navegador a 360, 390, 768, 1024 y 1366 px.
- [x] **T-09**: dejar spec, plan y tasks Implementados cuando el incremento cumpla CA-04, registrar evidencia y mantener intactos otros cambios preexistentes.

No se requieren cambios de API, datos, permisos de servidor, migraciones, auditoría o sincronización. No se agregan dependencias ni se realiza `git add` o `git commit`.

## Evidencia de ejecución

- Tests dirigidos: `node --test --test-name-pattern='visit-info-icons-and-favicon' apps/web/src/tests/relocation.test.mjs`: 3 tests, 3 pass, 0 fail.
- Suite completa: 27 tests, 24 pass, 3 fail; los tres fallos son CA-01..CA-03 de `004-isometric-zoo-map` y no están relacionados con esta feature.
- Navegador: 360, 390, 768, 1024 y 1366 px; cada icono quedó centrado sobre su bloque, con texto visible y sin desbordamiento horizontal. El favicon `assets/zoo-logo.jpeg` responde HTTP 200 y `image/jpeg` (29,562 bytes).
- `git diff --check` pasa para los archivos modificados por esta feature. El original `packages/ui/logo.jpeg` se conserva byte por byte.
- `/verify`: `apps/web` aún no está inicializada; falta `apps/web/src/package.json`, así que no existen scripts npm de formato, lint, tipos o test.
- Incremento CA-04: `node --test apps/web/src/tests/relocation.test.mjs`: 29 tests, 29 pass, 0 fail; navegador confirma `margin-top: 8px`, centrado y ausencia de desbordamiento a 360, 390, 768, 1024 y 1366 px. El favicon local responde HTTP 200 `image/jpeg`.
- `/verify` identifica `apps/web` aún no inicializada por falta de `apps/web/src/package.json`; no existen scripts npm de formato, lint, tipos o test.
- No se creó PR ni commit en esta tarea; los artefactos `web-005` quedan identificados aquí para enlazarlos cuando se abra el PR.
