# Tareas · 007 · diagnostico-intenso-parte1-guardado

- Spec: `apps/pwa/specs/007-diagnostico-intenso-parte1-guardado.md`
- Plan: `apps/pwa/plan/007-diagnostico-intenso-parte1-guardado.md`

> **Decisiones registradas:** modalidad **B** (guardar solo cuando partes 1 y 2 completas), `patient_age` en `clinical_evaluations` y SoftDeletes clínicos vía **DBR-015 (Lista para backend, aplicada en `arca_pruebas` 2026-11-13; evidencia post-migración detallada pendiente)**.  
> **Precondición:** cumplida para iniciar implementación consumidora (confirmación de aplicación BD). Pendiente adjuntar evidencia `SHOW CREATE TABLE` en DBR-015.

## Definición y contrato

- [x] **T-01** (CA-01..06): Modalidad B, mapeo de guardado intenso y dependencia DBR-015 documentados en spec/plan.
- [x] **T-02** (CA-01..04): Contrato inicial PWA↔API implementado (`kind`, `animal_id`, `data`) con `patient_age` (`intense-age`) y tipo de movilización por checkboxes; validación mínima en UI (animal, fecha, paso 2, contenido de parte 2). Validaciones adicionales de completitud pueden refinarse.

## Implementación

- [x] **T-03** (CA-01, CA-02, CA-05): API: `storeIntense` persiste `patient_age` y mapea checkboxes de movilización; modelos clínicos con `SoftDeletes`; `veterinarian_id` desde sesión.
- [x] **T-04** (CA-02): Persistencia de anamnesis/contenciones y parte 2 en `clinical_evaluations/findings/restraints/lab_samples` vía flujo existente ajustado.
- [x] **T-05** (CA-01, CA-03): PWA: `createEvaluation` habilitado (POST), envío al completar partes 1+2 y errores/confirmación en español.
- [x] **T-06** (CA-04): Retiro de `animals.estimated_age` en API (`AnimalController`, `EnclosureResource`, tests) y PWA (`apiClient`, perfil/edad, alta).

## Pruebas y calidad

- [ ] **T-07** (CA-01): Pruebas API específicas de evaluación intensa completa con `patient_age` y metadatos.
- [ ] **T-08** (CA-02): Pruebas API de persistencia de contenciones (checkboxes), hallazgos, signos vitales y muestras.
- [ ] **T-09** (CA-03): Pruebas API/PWA de rechazo/errores cuando faltan datos o falla la solicitud.
- [ ] **T-10** (CA-05): Pruebas/comprobación de SoftDeletes y ausencia de borrado físico en flujo clínico.
- [ ] **T-11** (CA-06): Ejecutar `/verify` y registrar resultados (pendiente en este entorno).
