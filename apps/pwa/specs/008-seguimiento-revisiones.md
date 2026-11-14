# 008 · seguimiento-revisiones

- App dueña: `pwa`
- Apps/paquetes afectados: `pwa`, `api` (contrato/guardado de evaluaciones clínicas), `docs/database` (DBR-016)
- Estado: Aprobada
- Solicitante / responsable funcional: Victor Adrian
- Aprobación funcional: Victor Adrian, 2026-11-14 (aprobada; catálogos definitivos para esta iteración). Revisión de flujo aprobada 2026-11-14: menú con formatos Intenso/Rápido, seguimiento capturado en ventana de confirmación al guardar, confirmación Cancelar/Confirmar en diagnósticos intenso y rápido.

## Problema y contexto

El seguimiento clínico (revisión rutinaria, control de tratamiento, observación) requiere registrar la evolución del animal en el tiempo. Hoy existe un formulario ligero “Registrar revisión” (`kind=review`) que crea un registro `Revision_Rapida` con poco detalle clínico y guarda estado/próxima revisión de forma no estructurada. Además, en muchos casos la revisión requiere el mismo nivel de evaluación que un diagnóstico rápido o intenso.

Se requiere que **cada diagnóstico/atención** (intenso o rápido) se registre como una **nueva evaluación clínica** con su propio historial (fecha, edad del momento, hallazgos) e incluya obligatoriamente **contexto de seguimiento** (motivo, estado del animal y próxima revisión) para dar continuidad al tratamiento, evaluar la mejoría del ejemplar y planear próximas revisiones. El historial clínico del animal ya se acumula en `clinical_evaluations` y se visualiza en el perfil; debe permitir consultar cada evento sin saturar la interfaz.

DBR-016 (Lista para backend, aplicada en `arca_pruebas` 2026-11-14) agrega `follow_up_status`, `next_review_date`, `is_follow_up` en `clinical_evaluations`. La edad por diagnóstico se guarda en `patient_age` (DBR-015) y el perfil debe reflejar la edad del diagnóstico más reciente cuando exista (ya preparado en UI).

## Objetivos

- Registrar cada diagnóstico/atención como una **nueva evaluación** usando formato **Rápido** o **Intenso**, según el criterio clínico, sin crear un tercer formato.
- Capturar obligatoriamente en cada diagnóstico el **motivo de seguimiento**, el **estado del animal** y la **próxima revisión**, de forma estructurada, para evaluar la mejoría y planear próximas revisiones.
- Mantener el historial cronológico por animal: cada atención conserva su `evaluation_date`, `patient_age` y datos clínicos; el perfil muestra el historial y la edad actual basada en el diagnóstico más reciente.
- Permitir iniciar el diagnóstico desde los formatos **Intenso** y **Rápido** del menú/inicio y, al guardar, confirmar la información mediante una ventana emergente que incluye el seguimiento como parte del proceso.

## Fuera de alcance

- Agenda/notificaciones automáticas de próximas revisiones (salvo visualización del dato).
- Agrupación por “episodio/tratamiento” con identificador dedicado (requeriría DBR adicional).
- Edición destructiva de registros históricos (los datos clínicos no se borran físicamente).
- Backfill automático de revisiones previas almacenadas en texto (DBR-016 lo define como opcional/manual).

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Personal veterinario / staff autorizado | Registrar revisiones (rápidas o intensas) con seguimiento y consultar historial por animal | Sesión staff (`web`/Sanctum) y permisos de evaluaciones clínicas existentes en API (p. ej. acceso a `staff/clinical-evaluations` y `staff/animals`) |

## Historias de usuario

- Como personal veterinario, quiero iniciar una atención desde el menú/inicio eligiendo el formato rápido o intenso, para registrar el diagnóstico clínico como siempre.
- Como personal veterinario, quiero que al guardar el formato completo se me solicite en una ventana de confirmación el seguimiento (motivo, estado del animal y próxima revisión) y pueda cancelar para revisar o confirmar el guardado, para asegurar la continuidad del tratamiento y la calidad de los datos.
- Como personal veterinario, quiero ver el historial clínico del animal en una tabla con estado y próxima revisión, y abrir el detalle/PDF de cada atención, para consultar la evolución sin saturar la interfaz.

## Criterios de aceptación

- **CA-01 (Nueva atención con historial):** Dado un animal, cuando se registra un diagnóstico/atención, entonces se crea una **nueva** evaluación en `clinical_evaluations` (no se modifica la anterior) con `evaluation_type` `Revision_Rapida` o `Historia_Clinica_Completa` según el formato elegido, `evaluation_date` y `patient_age` propios.
- **CA-02 (Seguimiento en confirmación al guardar):** Dado que el usuario llena completamente el formato clínico (Rápido o Intenso) y presiona “Guardar”, entonces se abre una **ventana emergente de confirmación** como parte del proceso con un pequeño formulario para capturar el **seguimiento** de ese diagnóstico (motivo, estado del animal y próxima revisión) y las opciones **Cancelar** (cerrar y volver a revisar/editar sin guardar) y **Confirmar guardado**.
- **CA-03 (Seguimiento obligatorio en cada diagnóstico):** Dado cualquier diagnóstico guardado por este flujo, cuando se confirma el guardado, entonces son obligatorios `is_follow_up=1`, `follow_up_status` (catálogo: `stable`, `monitoring`, `follow_up`), `next_review_date` y el motivo de seguimiento; si falta alguno, se muestra error en español y no se guarda.
- **CA-04 (Inicio desde formatos del menú/inicio):** Dada la PWA, cuando el usuario inicia una atención, entonces puede hacerlo desde los accesos de **Diagnóstico intenso** y **Diagnóstico rápido** en el menú/inicio (como formatos principales), además de poder consultar historiales desde el perfil. No se requiere una entrada separada “Nueva atención/revisión”.
- **CA-05 (Historial y perfil):** Dado un animal con evaluaciones, cuando se consulta su perfil, entonces el historial se muestra en tabla compacta con columnas/datos que incluyen **Tipo, Fecha, Motivo/diagnóstico, Estado de seguimiento y Próxima revisión**, marca de seguimiento, y acceso a ver detalle y descargar PDF por historial; el perfil muestra la edad del **diagnóstico más reciente** con `patient_age` (o cálculo desde `birth_date` si no existe).
- **CA-06 (Compatibilidad de revisión ligera):** Dado el flujo actual `Registrar revisión` (`ReviewFormView`, kind `review`), cuando se implemente el nuevo flujo, entonces se mantiene la capacidad de registrar seguimientos mediante los formatos intenso/rápido (redirección/integración según corresponda) sin borrado físico de registros existentes.
- **CA-07 (Datos clínicos):** Dado el guardado de diagnósticos, entonces no se realiza borrado físico de registros clínicos y se respetan SoftDeletes/auditoría según esquema y políticas vigentes.
- **CA-08 (Pruebas):** Dada la suite automatizada, entonces existe al menos una prueba por cada CA implementado en esta iteración (API/PWA según corresponda).

## Reglas de negocio

- **RN-01:** `evaluation_type` solo admite los formatos clínicos `Historia_Clinica_Completa` (intenso) y `Revision_Rapida` (rápido). El seguimiento es contexto (`is_follow_up`, estado, próxima revisión), no un formato adicional.
- **RN-02:** Cada diagnóstico genera un nuevo registro; no se sobrescribe la atención anterior. `patient_age` corresponde al momento de esa atención.
- **RN-03:** **Todo diagnóstico registrado por este flujo incluye seguimiento obligatorio:** `is_follow_up=1`, `follow_up_status` (catálogo: `stable`, `monitoring`, `follow_up`), `next_review_date` y motivo de seguimiento son obligatorios para evaluar la mejoría y planear próximas revisiones. `destination_ruling` se mantiene para resolución/destino clínico final cuando aplique, separado del estado de seguimiento.
- **RN-04:** El perfil presenta la edad del animal según el diagnóstico más reciente con `patient_age`; si no hay, se usa la edad derivada de `birth_date`. La tabla de historial debe mostrar estado y próxima revisión.
- **RN-05:** Motivos de seguimiento considerados: rutina, control de tratamiento, observación (mapear a `evaluation_reason`/campos según contrato API).
- **RN-06:** El punto de entrada principal son los formatos **Diagnóstico intenso** y **Diagnóstico rápido** en menú/inicio. Tras completar el formato clínico, el guardado requiere una **confirmación** con captura de seguimiento (motivo, estado, próxima revisión) antes de persistir. El historial en el perfil permite consultar y descargar cada atención.

## Datos, privacidad y auditoría

- **Datos:** `clinical_evaluations` (`animal_id`, `veterinarian_id`, `evaluation_type`, `evaluation_reason`, `evaluation_date`, `patient_age`, `follow_up_status`, `next_review_date`, `is_follow_up`, signos/diagnósticos según formato) y tablas hijas (`clinical_evaluation_findings`, `animal_restraints`, `lab_samples`) cuando aplique.
- **Esquema:** DBR-016 **Lista para backend** (aplicada en `arca_pruebas` 2026-11-14, evidencia post-migración detallada pendiente) agrega `follow_up_status`, `next_review_date`, `is_follow_up`. DBR-015 (aplicada) aporta `patient_age` y `deleted_at` en tablas clínicas. Sin nuevas DBR salvo que surja un cambio adicional.
- **Clínico/auditoría:** datos clínicos sin borrado físico (SoftDeletes) y auditables según Constitución V y modelos vigentes.

## Flujos y errores

1. **Nueva atención (intenso/rápido):** menú/inicio → elegir **Diagnóstico intenso** o **Diagnóstico rápido** → completar el formato clínico → presionar “Guardar” → ventana emergente de confirmación con formulario de seguimiento (motivo, estado, próxima revisión) → **Cancelar** (revisar/editar) o **Confirmar guardado** → nueva fila en historial.
2. **Historial:** perfil del animal → tabla compacta (Tipo, Fecha, Motivo/diagnóstico, Estado, Próxima revisión) → “Ver” detalle → “PDF” por historial; perfil muestra edad del diagnóstico más reciente.
3. **Validación/errores:** formato clínico y seguimiento obligatorio (motivo, estado, próxima revisión) validados con mensajes en español; si falta seguimiento en la confirmación o falla la red/API, no se afirma guardado y se conservan los datos para revisión.
4. **Conectividad:** operación online (sesión staff). Sin modo offline de guardado en esta iteración.

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:** DBR-016 “Lista para backend” (aplicada en `arca_pruebas`, 2026-11-14; evidencia detallada pendiente); specs 002/006/007; historial en perfil ya ajustado a tabla con detalle/PDF por historial y edad desde último diagnóstico.
- **Riesgos:** coexistencia temporal con `ReviewFormView`/`kind=review` y datos previos con seguimiento en texto; necesidad de alinear contrato API/PWA y validaciones; impacto en UX de guardado (modal de confirmación/seguimiento) en formatos intenso y rápido.
- **Decisiones incorporadas (2026-11-14, Victor Adrian):** (1) menú/inicio mantiene **Diagnóstico intenso** y **Diagnóstico rápido** (sin entrada separada “Nueva atención/revisión”); (2) **cada diagnóstico requiere seguimiento obligatorio** (motivo, estado y próxima revisión) para evaluar mejoría y planear próximas revisiones; (3) al guardar un formato completo se muestra **ventana emergente de confirmación** con mini-formulario de seguimiento y opciones **Cancelar** (revisar) / **Confirmar guardado** (alcance: diagnósticos intenso y rápido); (4) historial muestra estado y próxima revisión. Detalle de `ReviewFormView`/compatibilidad se define en plan manteniendo capacidad de registro.
- **Preguntas pendientes:** ninguna bloqueante identificada; validar en aprobación funcional si el catálogo de motivos (`rutina`, `control de tratamiento`, `observación`) y estados (`stable`, `monitoring`, `follow_up`) es definitivo o extensible.

## Revisión

- Aprobadores y fecha: Victor Adrian, 2026-11-14 (aprobación funcional inicial y revisión de flujo: menú intenso/rápido + confirmación con seguimiento al guardar)
- Evidencia/enlaces: `docs/database/requests/DBR-016-clinical-evaluation-follow-up-fields.md`, `apps/pwa/src/views/AnimalProfileView.tsx`, `apps/api/src/app/Http/Controllers/Api/ClinicalEvaluationController.php`, specs 002/006/007.