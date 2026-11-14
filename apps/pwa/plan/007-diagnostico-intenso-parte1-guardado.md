# Plan técnico · 007 · diagnostico-intenso-parte1-guardado

- Spec: `apps/pwa/specs/007-diagnostico-intenso-parte1-guardado.md`
- Estado de spec: Borrador con decisiones registradas (modalidad B, DBR-015 aprobada; pendiente aplicación/evidencia DBR-015 y aprobación funcional del alcance de implementación)
- Responsable técnico: Por identificar

## Resumen

Persistir en BD el diagnóstico intenso **solo cuando las partes 1 y 2 estén completas** (un envío, modalidad B), alineando PWA y API al mapeo de `clinical_evaluations`/`clinical_evaluation_findings`/`animal_restraints`/`lab_samples`. Depende de **DBR-015** (aprobada, pendiente “Lista para backend”) para `patient_age` y SoftDeletes clínicos (`deleted_at`) y retiro de `animals.estimated_age`.

## Enfoque

- Reutilizar/ajustar `POST /api/v1/staff/clinical-evaluations` y `ClinicalEvaluationController@storeIntense`: validar completitud de partes 1+2, mapear `patient_age` y tipo de movilización (checkboxes), persistir en tablas según mapeo de la spec.
- Habilitar `createEvaluation` en `apps/pwa/src/services/apiClient.ts` y flujo de envío/errores en `DiagnosisIntenseView.tsx` (solo al completar paso 2/ambas partes).
- Modelos clínicos: incorporar SoftDeletes (`deleted_at`) y estrategia de auditoría (Activitylog/BaseModel) sin borrado físico, conforme Constitución V.
- Retirar consumo de `animals.estimated_age` en API/PWA tras DBR-015 aplicada (alta/perfil/diagnóstico).

## Impactos previstos

- `apps/pwa/src/services/apiClient.ts`, `apps/pwa/src/views/DiagnosisIntenseView.tsx` (y validación UI de completitud).
- `apps/api/src/app/Http/Controllers/Api/ClinicalEvaluationController.php`, modelos `ClinicalEvaluation`, `ClinicalEvaluationFinding`, `AnimalRestraint`, `LabSample`, validación/rutas según corresponda.
- Pruebas Feature API (`DatabaseTransactions`, `arca_pruebas`) y pruebas PWA por CA.

## Constitution Check

- MVC/API delgada; clientes consumen API. **OK.**
- Esquema solo por DBR aprobada/aplicada. **DBR-015 aprobada; bloqueante hasta “Lista para backend” para `patient_age`/`deleted_at`/retiro `estimated_age`.**
- Datos clínicos auditados y sin borrado físico. **Requiere implementar SoftDeletes/auditoría en modelos y evitar borrado físico.**

## Verificación

- `/verify` apps modificadas; tests por CA. No usar `arca_zoo`, no `RefreshDatabase`.
