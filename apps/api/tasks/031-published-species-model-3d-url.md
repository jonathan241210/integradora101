# Tareas · 031 · published-species-model-3d-url

- Spec: `apps/api/specs/031-published-species-model-3d-url.md`
- Plan: `apps/api/plan/031-published-species-model-3d-url.md`

## Implementación

- [x] **T-01** (CA-02, CA-03, CA-04, RN-02, RN-03): crear `ResolvePublishedSpeciesModel3dUrlAction` que valide `models/*.glb`, rechace rutas inseguras y devuelva URL pública o `null`.
- [x] **T-02** (CA-01, CA-05): agregar `species.model_3d_path` al select de `ListPublishedSpeciesAction` y exponer `model_3d_url` en `PublishedSpeciesResource`.
- [x] **T-03** (CA-01..CA-05): agregar/actualizar tests PHPUnit (`PublishedSpeciesTest`, `PublishedSpeciesModel3dTest`) cubriendo contrato, resolución, inválidos/inseguros y compatibilidad.

## Calidad y entrega

- [x] **T-04** (CA-06): ejecutar tests focalizados de published-species y registrar resultado.
- [ ] **T-05**: enlazar spec/plan/tasks en PR/cambio y ejecutar `/verify` cuando corresponda.