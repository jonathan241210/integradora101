# Tareas · 014 · species-3d-models

- Spec: `apps/web/specs/014-species-3d-models.md`
- Plan: `apps/web/plan/014-species-3d-models.md`

## Implementación

- [x] **T-01** (CA-01, CA-02, CA-03, CA-04, RN-01, RN-02, RN-03): actualizar `apps/web/src/js/animals.js` para validar `model_3d_url`, mostrar botón 3D, cargar `model-viewer` perezosamente y alternar foto/modelo con fallback.
- [x] **T-02** (CA-05, CA-06): agregar estilos en `apps/web/src/animals.css` para botón/visor 3D, foco visible y responsive; sin cambios al mapa.
- [x] **T-03** (CA-01..CA-06, CA-08): actualizar/agregar pruebas en `apps/web/src/tests/animals.test.mjs` para URL segura, botón, toggle, fallback y no regresión.

## Calidad y entrega

- [ ] **T-04** (CA-08): ejecutar pruebas web (`node --test apps/web/src/tests/animals.test.mjs`) y registrar resultado. Node no disponible en este entorno.
- [ ] **T-05**: ejecutar `/verify`, actualizar docs afectadas y enlazar spec/plan/tasks en PR/cambio.