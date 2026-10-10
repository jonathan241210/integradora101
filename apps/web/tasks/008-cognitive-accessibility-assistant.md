# Tareas · 008 · cognitive-accessibility-assistant

- Spec: `apps/web/specs/008-cognitive-accessibility-assistant.md` (Estado: **En progreso**)
- Plan: `apps/web/plan/008-cognitive-accessibility-assistant.md` (Estado técnico: **Implementado y verificado localmente**)
- Checklist: Aprobado por el solicitante, 2026-10-08

## Trazabilidad

| Criterio / regla | Tareas que lo cubren |
|---|---|
| CA-01 / RN-06 | T-02, T-03, T-08 |
| CA-02 / RN-01, RN-02, RN-03 | T-03, T-04, T-08 |
| CA-03 / RN-01, RN-06 | T-03, T-05, T-08 |
| CA-04 / RN-04 | T-03, T-06, T-08 |
| CA-05 / RN-05 | T-02, T-07 |
| CA-06 / RN-06 | T-04, T-05, T-08, T-09 |
| CA-07 | T-10 |

## Implementación

- [x] **T-01** (preparación CA-01..CA-07): ampliar `apps/web/src/tests/relocation.test.mjs` con un fixture Node integrado para ejecutar el controlador de accesibilidad aislado y simular controles, atributos, foco, eventos y `localStorage`. No agregar dependencias.
- [x] **T-02** (CA-01, CA-05; RN-05, RN-06): actualizar `apps/web/src/index.html` con lanzador flotante y panel no modal; incluir título/relaciones accesibles, selector de perfiles, controles etiquetados, botón de restablecer y resumen deshabilitado “Próximamente”. Cargar recursos locales nuevos sin alterar navegación ni estructura de contenido.
- [x] **T-03** (CA-01, CA-02, CA-04; RN-01..RN-04, RN-06): crear `apps/web/src/accessibility.js` con estado versionado, defaults, aplicación de perfiles, detección de “Personalizado”, persistencia limitada a `localStorage`, recuperación ante errores de almacenamiento, apertura/cierre Escape y retorno de foco, restablecimiento y carga inicial.
- [x] **T-04** (CA-02, CA-06; RN-01..RN-03, RN-06): añadir a `accessibility.js` la activación/reversión de clases para lectura clara, foco y calma; limitar efectos a texto elegible, mantener contraste y controles legibles, y no ocultar contenido ni reemplazar la semántica original.
- [x] **T-05** (CA-03, CA-06; RN-01, RN-06): implementar Bionic Reading y Regla de Lectura en `accessibility.js`, excluyendo controles, enlaces interactivos, SVG, contenido editable y nodos no visibles; restaurar exactamente el texto/nodos y conservar lectura asistida, copia de texto, foco, puntero y clics.
- [x] **T-06** (CA-04; RN-04): completar lectura, validación, escritura y borrado de preferencias locales; comprobar funcionamiento solo en memoria si `localStorage` no está disponible o contiene datos inválidos.
- [x] **T-07** (CA-05; RN-05): confirmar que el resumen queda deshabilitado y rotulado “Próximamente”; no añadir llamadas de red, manejo de API keys, lector de contenido ni acciones que simulen procesamiento.
- [x] **T-08** (CA-01..CA-04, CA-06; RN-01..RN-04, RN-06): crear `apps/web/src/accessibility.css` para panel, perfiles, modos, foco visible, regla no interceptora y disposición responsive; conservar tokens existentes, respetar movimiento reducido y garantizar que el widget no produce desplazamiento horizontal.
- [x] **T-09** (CA-06; RN-06): enlazar CSS y JavaScript del widget en `index.html`; probar coexistencia con navegación responsive, mapa, búsqueda, formularios y animaciones existentes a los viewports de la spec, sin cambiar sus contratos.
- [x] **T-10** (CA-01..CA-07): añadir pruebas separadas y nombradas para todos los criterios en `apps/web/src/tests/relocation.test.mjs`, incluyendo perfiles, cada modo individual, reversión, copia/accesibilidad, persistencia/storage fallido, resumen inactivo, teclado, responsive y suite sin dependencias nuevas.

## Calidad y entrega

- [x] **T-11** (CA-01..CA-07): ejecutar los tests enfocados de esta feature y `node --test apps/web/src/tests/relocation.test.mjs`; resolver regresiones causadas por el widget y registrar fallos preexistentes, incluyendo el fallo conocido de `visit-info-icons-and-favicon` si persiste.
- [x] **T-12** (CA-01..CA-07): ejecutar `/verify` para `apps/web`, indicar si no está inicializada por falta de `apps/web/src/package.json`, revisar por navegador teclado, árbol de accesibilidad, contraste y viewports 360/390/768/1024/1366, y ejecutar `git diff --check`.
- [x] **T-13**: actualizar evidencia y estado de la spec/plan/tasks según resultados; no marcar Implementada si hay criterios sin prueba o falla atribuible al cambio. No crear commit.

## Aprobación y dependencias

- T-01 precede a T-03..T-10 porque prepara el harness necesario para probar interacción y persistencia.
- T-02 precede a T-03..T-09 porque define el marcado y los selectores semánticos.
- T-03 precede a T-04..T-07 y T-10.
- T-08 y T-09 preceden a la verificación visual T-12.
- Aprobación funcional de la spec: Solicitante, 2026-10-08.
- Aprobación técnica del plan: Solicitante, 2026-10-08.
