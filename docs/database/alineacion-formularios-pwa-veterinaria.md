# Alineación de formularios PWA veterinaria con la base de datos

> **Tipo:** Documento de análisis y alineación (no aprobado como DBR ni como spec).  
> **Fecha:** 2026-11-12  
> **Alcance:** Formularios de **Diagnóstico intenso**, **Diagnóstico rápido** y **Registro de animales** en `apps/pwa`.  
> **Objetivo:** Definir qué falta y cómo deben alinearse los formularios, la API y la BD para que la información capturada se integre a la base de datos de forma natural, completa y trazable.

---

## 1. Resumen ejecutivo

| Formulario | Guarda hoy | Estado de alineación | Acción principal |
|---|---|---|---|
| Registro de animales | **Sí** (endpoint activo) | **Mayormente alineado** con persistencia; hay desajustes de representación | Ajustes de mapeo/UX y validaciones; cambios de esquema solo si se exige fidelidad adicional (DBR). |
| Diagnóstico intenso | **No** | **Desalineado** (spec sin persistencia + cliente bloqueado + mapeo incompleto/lossy) | Redefinir alcance por SDD, habilitar envío, completar mapeo API y cubrir brechas de BD vía DBR donde falte estructura. |
| Diagnóstico rápido | **No** | **Desalineado** (mismas causas) | Igual que intenso, con su propio mapeo de campos. |

**Causas raíz de que los diagnósticos no guardan:**
1. **PWA (bloqueo):** `apps/pwa/src/services/apiClient.ts` → `createEvaluation()` lanza error y no realiza petición HTTP.
2. **Spec vigente:** `apps/pwa/specs/002-diagnostico-intenso-rapido-pdf.md` declara captura/PDF en memoria, sin persistencia ni conexión API (RN-01, fuera de alcance).
3. **Mapeo incompleto:** aunque existe `POST /api/v1/staff/clinical-evaluations` y `ClinicalEvaluationController`, el contrato actual no representa fielmente todos los datos del formato.
4. **Gobierno de BD:** no hay DBR/migraciones de dominio clínico en el repo para estas tablas; cualquier campo que requiera nueva columna/tabla/constraint exige DBR aprobada y migración del responsable de BD.

---

## 2. Fuentes y restricciones

- **Formularios/UI:** `apps/pwa/src/views/DiagnosisIntenseView.tsx`, `DiagnosisQuickView.tsx`, `AnimalFormView.tsx`, `apps/pwa/src/viewmodels/diagnosisForms.ts`, `apps/pwa/src/services/apiClient.ts`.
- **SDD PWA:** `apps/pwa/specs|plan|tasks/002-diagnostico-intenso-rapido-pdf.md`, `004-animal-registration.md`.
- **API/rutas/modelos:** `apps/api/src/routes/api.php`, `apps/api/src/app/Http/Controllers/Api/ClinicalEvaluationController.php`, `AnimalController.php`, modelos `ClinicalEvaluation`, `ClinicalEvaluationFinding`, `AnimalRestraint`, `LabSample`, `Animal`.
- **Esquema de referencia:** `docs/database/esquema-ingles.md`, `DBR-001-english-schema-normalization.md`.
- **Reglas obligatorias:** Constitución/`AGENTS.md` — la API es dueña de datos y validación; esquema solo por migración Laravel nacida de DBR aprobada (creada/aplicada por responsable de BD); código de negocio no en SPAs; cambios con SDD; un test por CA-xx; sin SQL manual.

---

## 3. Principios de integración “natural” (objetivo)

Para que un envío se integre de forma natural a la BD:
1. **Cada dato capturado tiene destino explícito:** columna, tabla relacionada o regla de derivación documentada (sin pérdida silenciosa).
2. **El contrato es estable y validado:** payload del formulario ↔ Form Request/API ↔ columnas/tipos/constraints coherentes.
3. **Sin transformaciones opacas:** truncamientos, concatenaciones en texto libre o inferencias solo si están aprobadas y documentadas; preferir estructura cuando el dato debe consultarse o auditarse.
4. **La API conserva autoridad:** el cliente envía datos del formulario; el servidor asigna identidad/derivados controlados (p. ej. `veterinarian_id`, fechas de sistema cuando aplique) y valida.
5. **Trazabilidad SDD/BDR:** lo que no cabe en el esquema actual se resuelve con DBR antes de implementar persistencia de ese dato.

---

## 4. Registro de animales — alineación

**Destino BD principal:** tabla `animals` (FK a `enclosures`, `species`, `users`).  
**Estado:** persistencia operativa vía `POST /api/v1/staff/animals`.

### 4.1 Mapeo actual (campo a campo)

| Campo formulario (PWA) | Payload | Columna/destino BD | Estado | Nota |
|---|---|---|---|---|
| Nombre | `name` | `animals.name` | Alineado | Obligatorio. |
| Especie | `species` (texto) | `animals.species_id` vía `Species::firstOrCreate(common_name)` | Alineado funcional | Efecto colateral: crea catálogo si no existe. |
| Identificación | `tag_number` | `animals.tag_number` | Alineado | Obligatorio/único en API/form; esquema lo documenta nullable (DBR-011) — más estricto en UI/API. |
| Recinto | `enclosure_id` | `animals.enclosure_id` | Alineado | Obligatorio y `exists:enclosures,id`; respeta NOT NULL/FK. |
| Sexo | `sex` (`hembra|macho|unknown`) | `animals.sex` (`F|M|I`) | Alineado con transformación | Conversión de dominio en API. |
| Fecha de nacimiento | `birth_date` | `animals.age` (texto `"Nacimiento: YYYY-MM-DD"`) | **Desalineado semánticamente** | No existe `birth_date` en `animals`; el dato se degrada a texto. |
| Origen | `origin` (`rescue|birth|transfer`) | `animals.origin` (etiqueta ES) | Alineado con transformación | Valores controlados en API. |
| Observaciones | `notes` | `animals.characteristics` | Alineado con renombre | Mismo contenido, distinto nombre conceptual. |
| — | (servidor) | `responsible_id`, `entry_date`, `stay_status` | Correcto | Autoridad de servidor. |

**Campos de `animals` no capturados en el formulario:** `longevity`, `reproduction`, `diet`, `photo_path`, `entry_time`, `can_receive_visits` (y los asignados por servidor/sistema). Definir si deben permanecer fuera de alcance o incorporarse en una spec futura.

### 4.2 Acciones de alineación recomendadas
- **Sin DBR (contrato/UX/API):** documentar en UI la transformación `fecha de nacimiento → age (texto)` o, si se requiere fecha real, planificar DBR; unificar mensajes/validaciones; explicitar que “Observaciones” alimenta `characteristics`.
- **Con DBR (si se requiere fidelidad):** columna `birth_date` (DATE, nullable) y/o campos faltantes (`photo_path`, etc.) según necesidad funcional aprobada; ajustar `tag_number` nullable solo si el negocio lo permite.
- **Pruebas:** mantener CA-01..03 y agregar cobertura ante cualquier cambio de mapeo.

---

## 5. Diagnóstico intenso — alineación

**Destino BD (esquema de referencia):** `clinical_evaluations`, `clinical_evaluation_findings`, `animal_restraints`, `lab_samples`.  
**Endpoint API existente:** `POST /api/v1/staff/clinical-evaluations` (`kind=intense`).

### 5.1 Mapeo deseado (integración natural)

| Dato del formato (UI) | Clave/formulario | Destino BD natural | Estado hoy | Acción |
|---|---|---|---|---|
| Animal | `intense-animal` | `clinical_evaluations.animal_id` (FK) | Mapeado en API, no enviado | Habilitar envío + validar existencia/permisos. |
| Fecha | `intense-date` | `clinical_evaluations.evaluation_date` | Mapeado | Enviar y validar fecha. |
| Veterinario (MVZ) | `intense-mvz` (y/o usuario) | `clinical_evaluations.veterinarian_id` (FK) + representación de nombre si aplica | **Parcial/confuso** | `veterinarian_id` debe venir del usuario autenticado; decidir si “MVZ” mostrado se guarda como dato histórico (DBR) o es solo display. |
| Peso | `intense-weight` | `clinical_evaluations.weight_kg` | Mapeado | Alinear unidades/tipo. |
| Temp., FR, FC, TLC, C.C. | `intense-vital-*` | `temperature_c`, `respiratory_rate`, `heart_rate`, `capillary_refill_time`, `body_condition_score` | Mapeado | Definir formato canónico de `body_condition_score` (entero 1-5 vs `3/5`) y ajustar API/esquema por acuerdo. |
| Diagnóstico presuntivo/definitivo | `intense-presumptive/definitive` | `presumptive_diagnosis`, `definitive_diagnosis` | Mapeado | OK estructural. |
| Evaluación por sistemas (12) | `intense-eval-*` | `clinical_evaluation_findings` (1 fila por sistema con valor) | Mapeado | Definir catálogo `organ_system` y semántica de `status`. |
| Contención química (tabla) | `intense-restraint-{n}-*` | `animal_restraints` (tipo químico: drug, dosis, hora, notas) | Mapeado | Conservar todas las filas no vacías; validar rangos/formatos de hora. |
| Contención física / movilización | `intense-physical-*`, `intense-mobilization-*` | `animal_restraints` (tipo físico) | **Lossy** | Evitar truncamiento (hoy 50 chars en `physical_method`), normalizar métodos si se requiere consulta. |
| Tipos de muestra / biopsia / rayos X / lab | `intense-sample*`, `intense-biopsy/xray/lab` | `lab_samples` | **Parcial/ad hoc** | Definir contrato de tipos y notas; DBR si se requieren flags/campos específicos. |
| Tipo/motivo de evaluación | (derivado) | `evaluation_type`, `evaluation_reason` | Fijo en API | Acordar valores canónicos (`Historia_Clinica_Completa`, motivo). |
| Observaciones generales, nº afectados | `intense-general-notes`, `intense-affected` | `assessment_reason` (texto concatenado) | **Lossy** | DBR si deben ser columnas consultables; si no, formato de texto documentado. |
| Datos paciente (nombre, especie, identificación, edad, sexo) | `intense-name/species/identification/age/sex` | `animals` (no duplicar) o columnas históricas en evaluación | **Sin destino en evaluación** | **Decisión requerida:** lectura desde `animal_id` vs. snapshot histórico (requiere DBR). |

### 5.2 Brechas que requieren DBR (candidatas, sujetas a aprobación)
- Columnas para snapshot/atributos históricos si el formato exige conservarlos en la evaluación (p. ej. MVZ mostrado, afectados, movilización estructurada).
- Campos/flags explícitos de muestreo y toma de muestra (Sí/No global) si no basta con filas en `lab_samples`.
- Normalización de métodos de contención física o ajustes de longitud/tipo (`physical_method`, `body_condition_score`).
- Cualquier nueva tabla/relación necesaria para no perder granularidad del formato.

> Nota: estas son brechas identificadas; la DBR la define, solicita y aprueba el flujo de BD del proyecto (`docs/database/requests/`), y la migración la ejecuta el responsable de BD.

---

## 6. Diagnóstico rápido — alineación

**Destino BD:** `clinical_evaluations`, `clinical_evaluation_findings`.  
**Endpoint API existente:** `POST /api/v1/staff/clinical-evaluations` (`kind=quick`).

### 6.1 Mapeo deseado

| Dato del formato (UI) | Clave/formulario | Destino BD natural | Estado hoy | Acción |
|---|---|---|---|---|
| Animal | `quick-animal` | `clinical_evaluations.animal_id` | Mapeado, no enviado | Habilitar envío. |
| Motivo | `quick-reason` | `evaluation_reason` (o campo dedicado) | **Truncado** a 100 chars | Evitar truncamiento; DBR si se requiere mayor longitud/campo propio. |
| Fecha | `quick-date` | `evaluation_date` | Mapeado | OK. |
| Peso, FC, FR, Temp | `quick-weight/heart-rate/respiratory-rate/temperature` | `weight_kg`, `heart_rate`, `respiratory_rate`, `temperature_c` | Mapeado | OK. |
| Actitud | casillas `quick-attitude-*` | `attitude` | Mapeado (agregado) | Definir formato de múltiples valores. |
| Condición corporal (puntaje) | `quick-body-score` | `body_condition_score` | Mapeado | Alinear formato canónico. |
| Condición corporal (texto bajo/ideal/sobrepeso) | casillas `quick-body-condition-*` | (sin destino claro) | **No se guarda** | DBR/campo o finding si debe persistir. |
| Hallazgos por sistema (ojos, orejas, oral, digestivo, piel, cardio, resp, músculo-esq., urogenital) | casillas `quick-{grupo}-*` | `clinical_evaluation_findings` | **Comprimido** (1 fila/grupo, opciones unidas) | Decidir granularidad: agregada (documentar) o normalizada (DBR/modelo). |
| Diagnóstico | `quick-diagnosis` | `presumptive_diagnosis` | Mapeado | Definir si requiere también definitivo. |
| Recomendaciones | `quick-recommendations` | `recommendations` | Mapeado | OK. |
| Apto para liberación | `quick-release` | `is_fit_for_wild_release` | Mapeado | Aclarar semántica Sí/No/no respondido y validación. |
| Especie, edad, sexo (en formato) | `quick-species/age/sex` | `animals` (referencia) o snapshot | **Sin destino en evaluación** | No duplicar o DBR para snapshot histórico. |
| Firma | (impresa) | — | No dato | Fuera de persistencia. |

### 6.2 Brechas que requieren DBR (candidatas)
- Almacenamiento estructurado de opciones de condición corporal y/o hallazgos por opción.
- Campo de motivo con longitud adecuada o campo dedicado.
- Snapshot de datos del paciente en la evaluación, si el negocio lo exige.

---

## 7. Cambios necesarios por capa (para habilitar integración natural)

### 7.1 PWA (`apps/pwa`)
- Implementar `createEvaluation` real (quitar stub) usando `@arca/api-client`/`http.request` contra `POST /api/v1/staff/clinical-evaluations` con payload `{ kind, animal_id, data }`.
- Mantener comportamiento seguro: confirmación solo con 201, conservar datos ante error, mensajes claros de sesión/conectividad/validación, sin prometer guardado offline.
- Enviar claves/valores alineados al contrato acordado; no incluir lógica clínica en componentes.
- Cubrir cada CA-xx con pruebas (Vitest) y accesibilidad/estados.

### 7.2 API (`apps/api`)
- Formalizar contrato de entrada (Form Request) para `kind`, `animal_id` y estructura de `data` (intenso/rápido), con reglas y mensajes en español.
- Completar `ClinicalEvaluationController` (o Actions dedicadas) para mapear **todos** los campos aprobados sin truncamientos/pérdida no documentada; normalizar catálogos (sistemas, tipos de muestra, métodos) y formatos (`body_condition_score`, fechas/horas).
- Mantener controlador delgado (Request → Action → Resource/JSON), Policies/permisos Sanctum, y autoridad de `veterinarian_id`/derivados.
- Agregar/ajustar tests Feature (PHPUnit, `DatabaseTransactions`, `arca_pruebas`) por criterio.

### 7.3 Base de datos (gobernada)
- **Sin DBR:** no hay cambios de esquema. Solo es viable persistir lo que ya tiene destino compatible.
- **Con DBR aprobada (`docs/database/requests/`)**: agregar/modificar columnas, tablas, constraints o índices necesarios para los datos hoy sin destino estructurado. La migración Laravel la crea, prueba y aplica el responsable de BD; backend consume cuando la DBR esté “Lista para backend”.
- Documentar versión/charset/collation/modo SQL relevantes del entorno y mantener portabilidad Aiven/local.

---

## 8. Flujo objetivo de guardado (diagnósticos)

1. Usuario autenticado (personal veterinario) completa intenso o rápido y envía.
2. PWA valida presencia mínima en UI y envía `POST /api/v1/staff/clinical-evaluations` con cookie Sanctum + CSRF.
3. API valida (Form Request), autoriza, y en transacción crea `clinical_evaluations` + filas hijas (`findings`, `restraints`, `lab_samples`) según mapeo aprobado.
4. Respuesta `201` con identificador/fecha → PWA muestra confirmación y (según spec) limpia o permite nueva acción; ante error conserva datos y muestra mensaje.
5. No se guarda nada en modo offline salvo que una spec futura lo defina explícitamente (borradores + sincronización confirmada por servidor).

---

## 9. Plan de trabajo recomendado (SDD)

1. **Acordar decisiones abiertas** (sección 10) con responsables funcional/técnico/BD.
2. **Spec (nueva o enmienda):** alcance de persistencia de diagnósticos (reemplaza/ajusta el “sin guardar” de 002), CA-xx, RN-xx, privacidad y manejo de errores.
3. **DBR(s):** para cada brecha estructural aprobada; esperar estado “Lista para backend”.
4. **Plan técnico:** mapeo definitivo campo→columna, contrato API, transacciones y validaciones.
5. **Tasks:** T-xx trazables a CA-xx (PWA, API, pruebas).
6. **Implementación + pruebas + `/verify`** y actualización de docs (`apps/pwa/docs/`, este documento si aplica).

---

## 10. Decisiones abiertas (requieren acuerdo)

1. ¿Los diagnósticos deben **persistirse** en BD (cambiando el alcance de 002) o mantenerse solo como PDF/memoria? (condiciona todo lo demás).
2. Datos del paciente mostrados en el formato (nombre/especie/edad/sexo/identificación): ¿se leen siempre del `animal_id` o se guarda un **snapshot histórico** en la evaluación?
3. “MVZ” y “nº de animales afectados”: ¿columnas propias o texto en `assessment_reason`?
4. Nivel de detalle a persistir: ¿opciones de casillas **normalizadas/estructuradas** o agregadas en texto/descripción?
5. Formato canónico de `body_condition_score`, longitudes de `evaluation_reason`/`physical_method` y catálogo de `sample_type`/métodos.
6. Semántica de “apto para liberación” y de campos opcionales/no respondidos (NULL vs valor por defecto).
7. ¿Se incorpora **guardado offline/borradores** (requiere ADR/capacidades aprobadas) o solo envío en línea?

---

## 11. Criterio de “alineado” (definición de listo)

- [ ] Cada campo de los formularios tiene destino documentado (columna/tabla/derivación) o exclusión explícita aprobada.
- [ ] No hay pérdida silenciosa de datos que el negocio requiera conservar.
- [ ] Payload PWA, validación API y esquema BD son consistentes en nombres, tipos y obligatoriedad.
- [ ] Brechas estructurales resueltas vía DBR aprobada y migración aplicada por responsable de BD.
- [ ] Guardado clínico habilitado con confirmación real, manejo de errores y sin afirmaciones falsas.
- [ ] Pruebas automatizadas por CA-xx y verificación de apps afectadas.

---

*Este documento describe el estado y la alineación objetivo según la evidencia disponible en el repositorio; no sustituye una spec aprobada ni una DBR aprobada.*
