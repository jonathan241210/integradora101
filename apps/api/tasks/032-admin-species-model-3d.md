# Tareas · 032 · admin-species-model-3d

- Spec: `apps/api/specs/032-admin-species-model-3d.md`
- Plan: `apps/api/plan/032-admin-species-model-3d.md`

## Implementación

- [x] **T-01** (CA-01, CA-02, RN-03, RN-04): crear `ResolveSpeciesModel3dDetectionAction` con normalización documentada y prioridad a `model_3d_path` válido.
- [x] **T-02** (CA-01, CA-03): exponer `model_3d` en `SpeciesPublicationRequestDetailResource` y adjuntar detección en `ShowSpeciesPublicationRequestAction`.
- [x] **T-03** (CA-04, CA-05): autoasignar modelo detectado en `AcceptSpeciesPublicationRequestAction` sin bloquear aceptación.
- [x] **T-04** (CA-07): agregar `AdminSpeciesRequestModel3dTest` cubriendo detección, prioridad, missing y autoasignación.

## Calidad y entrega

- [x] **T-05**: ejecutar tests focalizados de species publication relacionados. `AdminSpeciesRequestModel3dTest` pasó (4 passed).
- [ ] **T-06**: ejecutar `/verify` amplio y registrar evidencia.