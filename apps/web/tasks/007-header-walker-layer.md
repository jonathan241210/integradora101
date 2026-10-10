# Tareas · 007 · header-walker-layer

- Spec: `apps/web/specs/007-header-walker-layer.md` (Estado: **Aprobada**)
- Plan: `apps/web/plan/007-header-walker-layer.md` (Estado técnico: **Aprobado para tareas**)
- Checklist: Aprobado por el solicitante, 2026-10-08

## Trazabilidad

| Criterio / regla | Tareas que lo cubren |
|---|---|
| CA-01 / RN-01 | T-02, T-03, T-04 |
| CA-02 / RN-02 | T-03, T-05 |
| CA-03 / RN-03 | T-02, T-05 |
| CA-04 / RN-04, RN-05 | T-02, T-04, T-06 |
| CA-05 | T-07, T-08 |

## Implementación

- [x] **T-01** (preparación CA-01..CA-05): extender el entorno de prueba Node existente en `apps/web/src/tests/relocation.test.mjs` para modelar `.topbar`, su contenido y la inserción de la capa de animaciones. No agregar dependencias.
- [x] **T-02** (CA-01, CA-03, CA-04; RN-03, RN-04, RN-05): actualizar `apps/web/src/animations.js` para insertar `.zoo-walkers` dentro de `.topbar` si existe y usar `document.body` solo como fallback. Conservar los seis animales, los listeners de interacción, el botón de visibilidad y el selector responsive con su rotación de 8 segundos.
- [x] **T-03** (CA-01, CA-02; RN-01, RN-02): actualizar `apps/web/src/animations.css` para confinar la capa al área de la cabecera y colocarla detrás del contenido mediante stacking context local. Reducir visualmente los SVG en la cabecera para que no sobresalgan hacia el hero; conservar el tamaño original fuera de esa ubicación y el estilo del botón actual.
- [x] **T-04** (CA-01; RN-01): agregar un test llamado `CA-01 header-walker-layer` que verifique que la capa vive en la cabecera, no en la parte inferior del body, tiene límites del header y los SVG se ajustan visualmente a la franja.
- [x] **T-05** (CA-02, CA-03; RN-02, RN-03): agregar tests llamados `CA-02 header-walker-layer` y `CA-03 header-walker-layer` que verifiquen contenido interactivo encima de la capa, `pointer-events` de la capa no interceptores y conservación de listeners de interacción de animales y controles.
- [x] **T-06** (CA-04; RN-04, RN-05): agregar un test llamado `CA-04 header-walker-layer` que verifique que no cambian la estructura, atributos accesibles, enlaces y comportamiento del menú, y que la selección mobile/desktop y la rotación cada 8 segundos de la spec 006 se conservan.
- [x] **T-07** (CA-05): agregar un test llamado `CA-05 header-walker-layer` que compruebe cobertura nombrada CA-01..CA-05 y uso exclusivo de módulos integrados de Node; mantener los tests ya existentes.

## Calidad y entrega

- [x] **T-08** (CA-01..CA-05): ejecutar pruebas enfocadas de esta feature y `node --test apps/web/src/tests/relocation.test.mjs`; registrar fallos ajenos ya existentes, ejecutar `/verify` y dejar claro que `apps/web` no está inicializada si falta `apps/web/src/package.json`.
- [x] **T-09** (CA-01..CA-05): revisar en navegador las anchuras de 390, 768, 1024 y 1366 px, incluyendo menú móvil abierto, clics en enlaces/buscador/boletos, menú con foco y ausencia de desbordamiento; ejecutar `git diff --check` y actualizar la evidencia y estados sin declarar Implementada si queda un bloqueo de suite.

## Aprobación y dependencias

- T-01 precede a T-02..T-07 porque habilita las pruebas de montaje e interacción.
- T-02 y T-03 preceden a T-04..T-06.
- T-07 debe quedar junto con la cobertura de CA-01..CA-04.
- T-08 y T-09 cierran la verificación.
- Aprobación funcional de la spec: Solicitante, 2026-10-08.
- Aprobación técnica del plan: Solicitante, 2026-10-08.

## Evidencia de ejecución

- T-01..T-07 implementadas; las pruebas CA-01..CA-05 enfocadas pasan (5/5).
- Navegador integrado: a 390, 768, 1024 y 1366 px la capa está limitada a 76 px de la cabecera, los SVG miden como máximo 48 px de alto, se mantienen 2 animales en móvil y 6 en escritorio, y no hay desbordamiento horizontal. Menú responsive, enlace, buscador y compra de boletos responden.
- Suite completa: `node --test apps/web/src/tests/relocation.test.mjs` ejecuta 38 pruebas, 37 pasan y 1 falla. El fallo preexistente es `CA-04 visit-info-icons-and-favicon`, que espera `margin-top: 8px` en `.infobar .info-icon` de `styles.css`; no es causado por esta feature.
- `/verify`: `apps/web` aún no inicializada, falta `apps/web/src/package.json`; por tanto no hay scripts npm de formato, lint, tipos o test.
- `git diff --check` pasa. La feature queda En progreso hasta que el fallo preexistente de la suite se resuelva y se verifique la suite completa.
