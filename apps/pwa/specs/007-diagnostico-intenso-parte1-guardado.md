# 007 · diagnostico-intenso-parte1-guardado

- App dueña: `pwa`
- Apps/paquetes afectados: `pwa`, `api` (`ClinicalEvaluationController`, modelos/rutas/validación clínica), `docs/database` (DBR-015)
- Estado: Aprobada para implementación (modalidad B; DBR-015 “Lista para backend”, evidencia post-migración detallada pendiente)
- Solicitante / responsable funcional: Victor Adrian
- Aprobación funcional: Victor Adrian, 2026-11-13 (iniciar implementación de guardado completo al enviar partes 1 y 2)

## Problema y contexto

La parte 1 del “Diagnóstico intenso” (spec 002/006) hoy captura datos en memoria/PDF pero no los persiste en BD (`createEvaluation` deshabilitado). Se requiere iniciar el guardado en BD de los datos de la parte 1 (historia clínica del ejemplar y anamnesis/contenciones capturadas en esa etapa), en operación online.

Decisiones previas/actualizadas en conversación: contención física y química pueden capturarse ambas; “Tipo de movilización” se captura con checkboxes (Física/Química). La **edad del momento** debe persistir en cada diagnóstico/evaluación clínica (dato histórico) y `animals.estimated_age` debe retirarse, dejando `birth_date` como referencia del ejemplar: esto requiere **DBR-015** (borrador, `docs/database/requests/DBR-015-clinical-evaluation-age-and-animal-estimated-age-removal.md`) para agregar una columna de edad en `clinical_evaluations` (p. ej. `patient_age`) y eliminar `animals.estimated_age`. `clinical_evaluations.evaluation_date` marca cuándo se realizó el diagnóstico; las tablas hijas (`animal_restraints`, `clinical_evaluation_findings`, `lab_samples`) concentran otros datos.

## Objetivos

- Permitir guardar en BD el diagnóstico intenso **completo** (parte 1 y parte 2) en un solo envío, cuando ambas partes estén llenas, evitando diagnósticos incompletos.
- Registrar correctamente fecha, animal, veterinario responsable, edad del momento y los datos capturados con contrato y validación definidos.

## Fuera de alcance

- Guardado offline/sincronización y guardado progresivo/borrador en BD (modalidad A descartada: se envía solo al completar ambas partes).
- Cambios de esquema no aprobados/aplicados por DBR (DBR-015 aprobada, pendiente de aplicación/evidencia para “Lista para backend”). 

## Modalidad de guardado (decidida)

- **Modalidad B:** el diagnóstico intenso se envía y persiste en BD **solo cuando la parte 1 y la parte 2 están completas** (un solo registro por envío), para evitar diagnósticos incompletos. No hay borrador progresivo en BD.

## Mapeo: dónde se guarda el diagnóstico intenso en BD

> Basado en `ClinicalEvaluationController@storeIntense` y `docs/database/esquema-ingles.md` (tablas 10-13), con ajustes por DBR-015.

| Dato (formulario) | Tabla | Columna(s) / destino | Nota |
|---|---|---|---|
| Animal seleccionado | `clinical_evaluations` | `animal_id` (FK `animals`) | Obligatorio. |
| MVZ (usuario autenticado) | `clinical_evaluations` | `veterinarian_id` (FK `users`) | Responsable real desde sesión; el texto MVZ puede ir en `assessment_reason` (`MVZ: ...`). |
| Fecha | `clinical_evaluations` | `evaluation_date` | Obligatoria. |
| Nombre, especie, identificación, sexo | `animals` / `species` (vía `animal_id`) | — | No se duplican en la evaluación. |
| **Edad (momento del diagnóstico)** | `clinical_evaluations` | `patient_age` (DBR-015, `VARCHAR(50) NULL`) | Snapshot por diagnóstico; se captura/edita en parte 1 y se persiste en la evaluación. |
| Peso | `clinical_evaluations` | `weight_kg` | Numérico. |
| Tipo de movilización (Física/Química, checkboxes) | `animal_restraints` / `assessment_reason` | según mapeo acordado | A linearizar desde `intense-mobilization-type-physical/chemical` al guardar. |
| Contención química (tabla, hasta 12 filas) | `animal_restraints` | `mobilization_type='chemical'`, `drug`, `dose_mg_per_kg`, `dose_ml`, `administered_time`, `notes` | 1 fila por renglón con datos. |
| Contención física (métodos + observaciones) | `animal_restraints` | `mobilization_type='physical'`, `physical_method`, `notes` | Métodos/notas; ajustar mapeo al quitar campos de texto libre de movilización. |
| Notas/afectados/MVZ texto | `clinical_evaluations` | `assessment_reason` | Compactado (p. ej. notas generales, animales afectados, `MVZ: ...`). |
| Sistemas (parte 2) | `clinical_evaluation_findings` | `clinical_evaluation_id`, `organ_system`, `status`, `description` | 1 fila por sistema con valor. |
| Signos vitales (parte 2) | `clinical_evaluations` | `temperature_c`, `respiratory_rate`, `heart_rate`, `capillary_refill_time`, `body_condition_score` | Numéricos. |
| Sinología/diagnósticos (parte 2) | `clinical_evaluations` | `presumptive_diagnosis`, `definitive_diagnosis`, y campos según mapeo (`evaluation_type`, `evaluation_reason`, etc.) | `evaluation_type='Historia_Clinica_Completa'`, `evaluation_reason='clinical_history'`. |
| Muestras/lab/biopsia/Rx (parte 2) | `lab_samples` | `clinical_evaluation_id`, `sample_type`, `result_notes` (y `file_path` si aplica) | 1 fila por muestra/tipo. |
| Eliminación lógica clínica | `clinical_evaluations`, `clinical_evaluation_findings`, `animal_restraints`, `lab_samples` | `deleted_at` (DBR-015) | SoftDeletes; sin borrado físico de datos clínicos. |

## Decisiones registradas (2026-11-13)

1. **Modalidad:** **B — guardar en BD solo cuando las dos partes (1 y 2) estén completas** en un solo envío (evita diagnósticos incompletos). Sin borrador progresivo en BD.
2. **Edad (DBR-015, aprobada):** `patient_age VARCHAR(50) NULL` en `clinical_evaluations`. Se retira `animals.estimated_age` (queda `birth_date`). Backfill: 1 registro con `estimated_age` en `arca_pruebas` a registrar por BD antes de `DROP`. Persistencia de `patient_age` depende de que DBR-015 esté aplicada y en “Lista para backend”.
3. **SoftDeletes clínicos (DBR-015, aprobada):** `deleted_at` en `clinical_evaluations`, `clinical_evaluation_findings`, `animal_restraints`, `lab_samples`. Modelos/flujo sin borrado físico; auditoría (Activitylog/BaseModel) a implementar en código según Constitución V.
4. **Anamnesis:** tipo de movilización por checkboxes (Física/Química); mapeo a ajustar en implementación de guardado.

## Pendientes para implementar (bloqueantes)

- DBR-015 aplicada en `arca_pruebas` con evidencia → “Lista para backend” (incluye registro del valor único de `estimated_age`).
- Definir validación exacta de “ambas partes completas” y campos obligatorios/mensajes en español.
- Alineación de `storeIntense`/contrato PWA a checkboxes de movilización y a `patient_age`.
- Implementar SoftDeletes/auditoría en modelos clínicos y pruebas por CA.

## Criterios de aceptación (borrador, a concretar)

- **CA-01:** Dado un usuario staff autenticado, cuando completa y envía las partes 1 y 2 válidas, entonces se crea el registro clínico en BD con `animal_id`, `evaluation_date`, `veterinarian_id` y `patient_age` correctos (según mapeo).
- **CA-02:** Los datos de parte 1 (anamnesis/tipo de movilización/contenciones, peso) y parte 2 (sistemas, signos vitales, sinología, muestras) se persisten en las tablas/columnas acordadas sin perder información capturada.
- **CA-03:** Si faltan datos obligatorios o las partes no están completas, o falla la solicitud, la PWA muestra error claro en español y no afirma guardado exitoso ni crea registro incompleto.
- **CA-04:** No se modifica el esquema sin DBR aprobada/aplicada. La edad por diagnóstico se persiste tras DBR-015 “Lista para backend”; sin ello el guardado de `patient_age`/retiro de `estimated_age` no se consume.
- **CA-05:** Los registros clínicos no se borran físicamente (SoftDeletes) y quedan auditados según estrategia aprobada.
- **CA-06:** Pruebas automatizadas cubren cada criterio acordado (API Feature y, si aplica, PWA).

## Datos, privacidad y auditoría

- Datos clínicos/identificativos: aplicar controles de acceso por sesión/permisos, auditoría y no borrado físico según Constitución V. Requiere definir estrategia técnica compatible con el esquema actual.

## Riesgos

- Guardado progresivo implica contrato de actualización y posible estado/borrador (riesgo de esquema/DBR).
- Divergencia entre formulario (edad precargada editable) y ausencia de columna de edad en evaluación.
- Modelos clínicos sin SoftDeletes/Activitylog (deuda de cumplimiento a resolver).

## Aprobación

- Aprobadores y fecha: `<pendiente>`
- Evidencia: specs 002/006, `docs/database/esquema-ingles.md`, `ClinicalEvaluationController@storeIntense`
