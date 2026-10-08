# Tareas · 002 · brand-color-refresh

- Spec: `apps/web/specs/002-brand-color-refresh.md`
- Plan: `apps/web/plan/002-brand-color-refresh.md`

## Implementación

- [x] **T-01** (CA-04, RN-02): actualizar spec, plan y tasks de `001-relocate-static-portal` para documentar que esta feature aprobada permite modificar `styles.css`; conservar las garantías de HTML, JavaScript, referencias y assets.
- [x] **T-02** (CA-01, CA-02; RN-01, RN-02, RN-03): refactorizar `apps/web/src/styles.css` para centralizar los colores, foregrounds, tipografía y tamaño base documentados, y aplicarlos a títulos, navegación, botones, secciones, formularios, mapa, avisos y pie sin cambiar estructura ni interacciones.
- [x] **T-03** (CA-01, CA-02; RN-01, RN-02): añadir tests nombrados que verifiquen valores de tokens exactos, mapeo semántico a la interfaz y ausencia de las antiguas variables de marca. Archivo: `apps/web/src/tests/relocation.test.mjs`.
- [x] **T-04** (CA-03; RN-03): añadir cálculo de contraste WCAG 2.1 y tests nombrados para cada par de texto/fondo sólido usado; validar 4.5:1 para texto normal y 3:1 para texto grande/controles pertinentes. Archivo: `apps/web/src/tests/relocation.test.mjs`.
- [x] **T-05** (CA-04; RN-02): ajustar el test de hashes de la reubicación para permitir exclusivamente la modificación aprobada de `styles.css`; conservar hashes/verificaciones de HTML, JavaScript y assets, las referencias locales y los breakpoints responsivos. Archivo: `apps/web/src/tests/relocation.test.mjs`.
- [x] **T-06** (CA-05): verificar mediante un test nombrado que la suite incluye tests CA-01..CA-05, usa únicamente módulos `node:` y no necesita `package.json` ni dependencias. Archivo: `apps/web/src/tests/relocation.test.mjs`.

## Calidad y entrega

- [x] **T-07** (CA-01..CA-05): ejecutar `node --test apps/web/src/tests/relocation.test.mjs`, revisar `git diff --check` y verificar visualmente el portal en escritorio y móvil; corregir fallos de contraste o regresiones antes de completar.
- [x] **T-08** (CA-04): ejecutar `/verify` para la app modificada y comprobar que no cambiaron `index.html`, `script.js`, assets, API ni base de datos.
- [x] **T-09**: registrar resultados y actualizar el estado de spec, plan y tasks a Implementada únicamente cuando todas las tareas y criterios estén verificados.

Cada criterio CA-xx tiene una tarea explícita de prueba automatizada (T-03, T-04, T-05 o T-06) y una verificación final. No se agregan dependencias, endpoints ni cambios de datos.

## Evidencia de ejecución

- T-01..T-06: CSS de la página actualizado y tokens semánticos, tipografía y pares de contraste verificados por pruebas.
- T-07: `node --test apps/web/src/tests/relocation.test.mjs`: 12 tests, 12 pass, 0 fail; `git diff --check` sin errores. Browser verificado a escritorio y móvil; con ancho 390px no hay desbordamiento horizontal del documento.
- T-08: `/verify`: `apps/web` aún no está inicializada porque no tiene `src/package.json`; no existen scripts npm que ejecutar. La suite de Node cubre los criterios y conserva los hashes de los 13 archivos fuera del CSS aprobado.
- T-09: spec, plan y tasks de esta feature marcados Implementada/completados tras pasar verificaciones.
