# 006 · diagnostico-intenso-parte1-precarga

- App dueña: `pwa`
- Apps/paquetes afectados: `pwa`, `api` (lectura de sesión y catálogo de animales existente)
- Estado: Aprobada
- Solicitante / responsable funcional: Victor Adrian
- Aprobación funcional: Victor Adrian, 2026-11-13 (confirmación de implementación de parte 1 según indicaciones)

## Problema y contexto

En el “Diagnóstico intenso” (spec 002), la parte 1 “Historia clínica del ejemplar” exige capturar datos que ya existen en el sistema (personal que registra y datos del animal). Reingresarlos manualmente genera duplicidad y riesgo de inconsistencia. Con la operación en línea (sesión iniciada), es posible precargar estos datos desde la fuente de verdad.

## Objetivos

- Precargar automáticamente en la parte 1 del diagnóstico intenso: MVZ desde el usuario autenticado; y, al seleccionar un animal, nombre, especie, identificación, sexo y edad (calculada desde `birth_date` o `estimated_age` del animal) desde el registro del animal.
- Permitir editar todos los campos precargados (la información puede ajustarse al momento de la evaluación) como valores sugeridos/precargados.
- Mantener “Peso” y “Fecha” editables como está. No se requiere snapshot de edad en BD clínica adicional (la fecha de la evaluación en `clinical_evaluations.evaluation_date` establece cuándo se realizó el diagnóstico); se mantiene el modelo actual de `animals` (`birth_date` + `estimated_age`).

## Fuera de alcance

- Implementación de anamnesis, parte 2 (evaluación clínica) y guardado/persistencia del diagnóstico en BD.
- Modo offline/caché local (se abordará después; requiere inicio de sesión en línea).
- Cambios de esquema de BD.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Personal veterinario autenticado | Registrar diagnóstico intenso con datos de contexto precargados | Sesión Sanctum staff; acceso a perfil propio (`/api/v1/auth/me`) y a animales (`/api/v1/staff/animals`) |

## Historias de usuario

Como personal veterinario, quiero que al iniciar un diagnóstico intenso se precargue mi nombre como MVZ y los datos del animal seleccionado, para no reescribir información ya registrada y reducir errores.

## Criterios de aceptación

- **CA-01 (MVZ desde sesión):** Dado un usuario staff autenticado, cuando abre el diagnóstico intenso, entonces el campo “MVZ” se rellena con el nombre del usuario (`first_name` + `last_name` + `second_last_name` si existe) como valor sugerido y es editable.
- **CA-02 (Precarga por animal):** Dado que existen animales, cuando el usuario selecciona un animal, entonces se precargan en sus inputs “Nombre”, “Especie”, “Identificación”, “Sexo” y “Edad” (calculada desde `birth_date` o `estimated_age`) con los datos del animal como valores sugeridos y son editables (sin eliminar los campos).
- **CA-03 (Peso y fecha):** “Peso (kg)” y “Fecha” permanecen editables con su comportamiento actual.
- **CA-04 (Sin selección):** Dado que no se ha seleccionado animal, cuando se visualiza la parte 1, entonces los campos dependientes del animal permanecen vacíos hasta la selección (MVZ puede seguir precargado desde sesión).
- **CA-05 (Manejo online/errores):** Dado que la precarga depende de datos en línea, cuando falla la carga de sesión o de animales, entonces se informa el error en español sin romper el formulario y sin afirmar datos incorrectos.
- **CA-06 (Pruebas):** Dada la suite automatizada, entonces existe al menos una prueba por cada CA-01 a CA-05.

## Reglas de negocio

- **RN-01:** MVZ se sugiere desde el usuario autenticado (`auth.me`) como valor precargado editable.
- **RN-02:** Nombre, especie, identificación, sexo y edad se sugieren desde el animal seleccionado (`animal_id`) como valores precargados editables; pueden ajustarse al contexto de la evaluación.
- **RN-03:** La edad se precarga calculada desde `birth_date` o `estimated_age` del animal pero es editable. El peso es editable. No se agrega snapshot de edad en BD clínica en este alcance; `evaluation_date` indica cuándo se realizó el diagnóstico.
- **RN-04:** La precarga es funcionalidad online; no implica guardado offline ni persistencia del diagnóstico. Se mantiene el modelo actual de `animals` (`birth_date` + `estimated_age`).

## Datos, privacidad y auditoría

- Datos leídos: perfil del staff (`first_name`, `last_name`, `second_last_name`, `full_name`) y datos de animales (`id`, `name`, `species`, `tag_number`, `sex`, `birth_date`, `estimated_age`). No se crea ni modifica esquema (sin DBR).
- Los datos clínicos del formulario siguen el alcance de la spec 002 (memoria/PDF) salvo que una spec posterior defina persistencia.

## Mapeo informativo: campos parte 1 del diagnóstico intenso y BD clínica (referencia)

> Referencia de destino si el diagnóstico se persiste vía `POST /api/v1/staff/clinical-evaluations` (`ClinicalEvaluationController@storeIntense`) y esquema `clinical_evaluations`/tablas hijas. **Hoy la PWA no guarda diagnósticos.**

| Campo formulario (parte 1) | Destino en BD (si se persiste) | Nota |
|---|---|---|
| Animal (selector, `intense-animal`) | `clinical_evaluations.animal_id` (FK `animals`) | Vincula la evaluación al ejemplar. |
| MVZ (`intense-mvz`) | `clinical_evaluations.veterinarian_id` (FK `users`, tomado del usuario autenticado) y copia textual en `assessment_reason` (`"MVZ: ..."`) | No hay columna `mvz_name`; el responsable real es `veterinarian_id`. |
| Fecha (`intense-date`) | `clinical_evaluations.evaluation_date` | Obligatoria en BD. |
| Nombre, especie, identificación, edad, sexo del paciente | **Sin columnas propias en `clinical_evaluations`** | Identidad/sexo/identificación residen en `animals`; la edad del momento no se guarda en evaluación con el mapeo actual. |
| Peso (`intense-weight`) | `clinical_evaluations.weight_kg` | Numérico. |
| Movilización física/química | `assessment_reason`/`animal_restraints.notes` (texto) | Sin columnas dedicadas. |
| Contención química (tabla) | `animal_restraints` (filas: `drug`, `dose_mg_per_kg`, `dose_ml`, `administered_time`, `notes`, `mobilization_type='chemical'`) | Estructurado en tabla hija. |
| Contención física y observaciones | `animal_restraints` (`mobilization_type='physical'`, `physical_method` truncado, `notes`) y `assessment_reason` | Parcial/compactado. |

## Flujos y errores

1. Abrir diagnóstico intenso → se obtiene perfil de sesión y se rellena MVZ (solo lectura).
2. Cargar lista de animales → seleccionar animal → rellenar nombre/especie/identificación/sexo (solo lectura); edad y peso editables.
3. Si falla sesión/animales → mostrar mensaje y permitir continuar con lo disponible sin datos inventados.

## Dependencias, riesgos y preguntas

- Dependencias: sesión staff activa, `GET /api/v1/auth/me`, `GET /api/v1/staff/animals`.
- Riesgos: cambio de comportamiento respecto a spec 002 (campos antes editables/manuales pasan a precargados/bloqueados); depende de conectividad.
- Decisiones confirmadas/ajustadas (2026-11-13): MVZ precargado desde usuario autenticado (`first_name` + `last_name` + `second_last_name` si existe) y **editable**; nombre, especie, identificación, sexo y edad precargados desde animal seleccionado y **editables**; edad precargada (calculada desde `birth_date` o `estimated_age`) y editable; peso y fecha editables. Ajuste posterior: se retira el sombreado visual de los campos precargados. No se modifica esquema de `animals` ni se agrega edad en `clinical_evaluations` (`evaluation_date` marca el momento). Se mantiene el modelo actual de `animals`.

## Revisión

- Aprobadores y fecha: `<pendiente aprobación funcional>`
- Evidencia/enlaces: `apps/pwa/specs/002-diagnostico-intenso-rapido-pdf.md`, `docs/database/esquema-ingles.md` (tablas 10-13), `ClinicalEvaluationController@storeIntense`.