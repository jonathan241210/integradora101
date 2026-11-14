# Tareas · 008 · seguimiento-revisiones

- Spec: `apps/pwa/specs/008-seguimiento-revisiones.md`
- Plan: `apps/pwa/plan/008-seguimiento-revisiones.md`

## Base de datos (responsable de BD)

- [x] **T-00** (CA-01, CA-03, CA-05, CA-07): DBR-016 aprobada y aplicada en `arca_pruebas` (2026-11-14, estado “Lista para backend”). **Pendiente:** adjuntar evidencia `SHOW CREATE TABLE clinical_evaluations` en `docs/database/requests/DBR-016-clinical-evaluation-follow-up-fields.md`. Sin nuevas migraciones por agente.

## Implementación API

- [x] **T-01** (CA-01, CA-03, CA-07, RN-01, RN-02, RN-03, RN-05): `ClinicalEvaluationController` valida y persiste seguimiento obligatorio para intense/quick (`is_follow_up=1`, `follow_up_status` catálogo, `next_review_date`, motivo → `evaluation_reason` normalizado); crea nueva evaluación con tipo/fecha/`patient_age` propios. 422 en español ante datos faltantes/inválidos.
- [x] **T-02** (CA-06, RN-03, RN-05): `storeReview`/`kind=review` alineado a campos estructurados de seguimiento (compatibilidad) y `ReviewFormView` redirigido al flujo unificado, sin borrado físico.
- [x] **T-03** (CA-05, RN-04): Historial de animal expone campos de evaluación (incl. `follow_up_status`, `next_review_date`, `is_follow_up`, `patient_age`) vía modelos/serialización existente; cliente muestra “—” cuando no hay datos estructurados.
- [x] **T-04** (CA-01): Prueba automatizada API añadida (`apps/api/src/tests/Feature/ClinicalEvaluationFollowUpTest.php`) — nuevas evaluaciones intense/quick con tipo/fecha/edad propios. *No ejecutada en este entorno (sin `php`/`arca_pruebas`).*
- [x] **T-05** (CA-03): Prueba automatizada API añadida — rechazo 422 por seguimiento faltante/estado inválido y persistencia correcta con datos válidos. *No ejecutada.*
- [x] **T-06** (CA-05): Prueba automatizada API añadida — perfil/historial expone campos de seguimiento y edad. *No ejecutada.*
- [x] **T-07** (CA-07): Guardado clínico sin borrado físico (modelos con `SoftDeletes`/flujo de alta preservado). Verificación automatizada completa pendiente de ejecución en entorno de pruebas.

## Implementación PWA

- [x] **T-08** (CA-02, CA-03, RN-03, RN-05): `apps/pwa/src/services/apiClient.ts` actualizado (tipos `AnimalEvaluation` con seguimiento, envío de `is_follow_up`).
- [x] **T-09** (CA-02, CA-03): Bloque de seguimiento obligatorio en `DiagnosisIntenseView.tsx` (motivo/estado/próxima revisión) con validación cliente en español.
- [x] **T-10** (CA-02, CA-03): Bloque de seguimiento obligatorio en `DiagnosisQuickView.tsx` con validación cliente.
- [x] **T-11** (CA-04, CA-06, RN-06): *(Revisado 2026-11-14 por cambio de flujo aprobado)* Punto de entrada inicial implementado; sustituido por T-17 para restaurar accesos directos a formatos Intenso/Rápido en menú/inicio. Compatibilidad de revisión cubierta por T-20.
- [x] **T-12** (CA-05, RN-04): Historial en `AnimalProfileView.tsx` con columnas **Estado** y **Próxima revisión** (y detalle con seguimiento), manteniendo “Ver”/PDF por historial.
- [ ] **T-13** (CA-02, CA-04): Prueba automatizada PWA pendiente (infraestructura/runner a confirmar).
- [ ] **T-14** (CA-05): Prueba automatizada PWA pendiente (render de Estado/Próxima revisión).

## Revisión de flujo (aprobada 2026-11-14)

- [x] **T-17** (CA-04, RN-06): Restaurar en menú/inicio accesos a **Diagnóstico intenso** y **Diagnóstico rápido** (como antes), eliminando la entrada “Nueva atención/revisión”; ajustar `HomeView`, `pwaDemo`, `AppShell`, `DiagnosisChooserView`.
- [x] **T-18** (CA-02, CA-03): En `DiagnosisIntenseView`, retirar seguimiento inline y al “Guardar” (formato completo) mostrar ventana emergente de confirmación con mini-formulario de seguimiento (motivo, estado, próxima revisión) y acciones **Cancelar** / **Confirmar guardado**.
- [x] **T-19** (CA-02, CA-03): En `DiagnosisQuickView`, mismo flujo de confirmación con mini-formulario de seguimiento al guardar.
- [x] **T-20** (CA-06): Ajustar `ReviewFormView`/atajos para mantener capacidad de registro de seguimientos vía formatos intenso/rápido sin entrada separada.

## Calidad y entrega

- [ ] **T-15** (CA-08): `/verify` y suites API/PWA no ejecutadas en este entorno (sin `php`/`composer`/`pnpm` en PATH; pruebas API requieren `arca_pruebas`).
- [ ] **T-16**: Evidencia `SHOW CREATE TABLE clinical_evaluations` (DBR-016) y actualización de docs PWA pendientes de adjuntar/confirmar; trazabilidad spec/plan/tasks presente en repo.

Cada tarea de código nombra CA/RN cubiertos; todo CA-01..CA-08 tiene al menos una tarea de prueba o verificación explícita (T-04, T-05, T-06, T-07, T-13, T-14, T-15). No se agregan migraciones/SQL (DBR-016 ya en “Lista para backend”). Ajustar nombres de archivos de test/runner a la estructura real en `/sdd-implement`.
