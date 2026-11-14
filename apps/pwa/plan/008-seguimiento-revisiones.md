# Plan técnico · 008 · seguimiento-revisiones

- Spec: `apps/pwa/specs/008-seguimiento-revisiones.md`
- Estado de spec: Aprobada
- Responsable técnico: `<por definir / backend + PWA>`

## Diseño de solución

Se extiende el flujo de diagnóstico clínico para que **cada diagnóstico (intenso o rápido)** registre seguimiento obligatorio y sea una nueva atención en `clinical_evaluations`. La API sigue siendo autoridad: recibe y valida el contrato de evaluación (incluido seguimiento), persiste en tablas clínicas y expone el historial; la PWA captura datos, consume `@arca/api-client` y renderiza historial/PDF sin reglas de negocio de dominio.

- **Esquema:** DBR-016 en “Lista para backend” (aplicada en `arca_pruebas` 2026-11-14, evidencia `SHOW CREATE TABLE` pendiente) agrega `follow_up_status`, `next_review_date`, `is_follow_up` en `clinical_evaluations`. DBR-015 aporta `patient_age` y `deleted_at`. Ningún agente crea/aplica migraciones ni SQL.
- **Contrato/guardado:** `POST /api/v1/staff/clinical-evaluations` (ruta nombrada existente, JSON) recibe campos de seguimiento para `kind=intense|quick` (y compatibilidad `kind=review`). Validación server-side obligatoria: `is_follow_up=1`, `follow_up_status` ∈ {`stable`,`monitoring`,`follow_up`}, `next_review_date` (DATE) y motivo presentes; errores en español (422). `evaluation_type` sigue como formato (`Historia_Clinica_Completa` / `Revision_Rapida`); `destination_ruling` no sustituye `follow_up_status`.
- **PWA (revisión aprobada 2026-11-14):** menú/inicio conserva accesos a **Diagnóstico intenso** y **Diagnóstico rápido**. Al guardar un formato clínico completo se abre una **ventana emergente de confirmación** con mini-formulario de seguimiento (motivo, estado, próxima revisión) y acciones **Cancelar** (revisar/editar) / **Confirmar guardado**. `ReviewFormView`/atajo de revisión mantienen capacidad de registro vía formatos. Historial en perfil muestra Estado y Próxima revisión. Sin modo offline (online, sesión staff).
- **Sin borrado físico:** SoftDeletes/auditoría según esquema/modelos vigentes (Constitución V); no se sobrescriben atenciones previas.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| API / datos | `apps/api/src/app/Http/Controllers/Api/ClinicalEvaluationController.php` | Validar/guardar seguimiento obligatorio en intense/quick; mapear `follow_up_status`, `next_review_date`, `is_follow_up`, motivo; refactor o compatibilidad de `storeReview`/`kind=review`. |
| API / modelos/recursos | `apps/api/src/app/Models/ClinicalEvaluation.php` (fillable/casts), recursos/controladores que serializan historial de animal (`AnimalProfile`/evaluaciones) | Exponer `follow_up_status`, `next_review_date`, `is_follow_up`, `patient_age` en respuestas de historial/detalle. |
| API / pruebas | `apps/api/src/tests/Feature/*ClinicalEvaluation*` (o nuevo test feature) | Cobertura por CA: creación con seguimiento obligatorio, validaciones, historial. `DatabaseTransactions` sobre `arca_pruebas`. |
| PWA / servicio | `apps/pwa/src/services/apiClient.ts` | Tipar y transportar campos de seguimiento en `createEvaluation`/payload y en `AnimalEvaluation` (historial). |
| PWA / vistas/navegación | `apps/pwa/src/views/HomeView.tsx`, `apps/pwa/src/views/AppShell.tsx`, `apps/pwa/src/viewmodels/pwaDemo.ts`, `apps/pwa/src/views/DiagnosisChooserView.tsx` | Mantener accesos a formatos **Intenso** y **Rápido** en menú/inicio; sin entrada separada “Nueva atención/revisión”. Compatibilidad/redirección de revisión según corresponda. |
| PWA / formularios y confirmación | `apps/pwa/src/views/DiagnosisIntenseView.tsx`, `apps/pwa/src/views/DiagnosisQuickView.tsx` | Al guardar formato completo, mostrar ventana emergente de confirmación con mini-formulario de seguimiento obligatorio y acciones **Cancelar** / **Confirmar guardado**. |
| PWA / compatibilidad | `apps/pwa/src/views/ReviewFormView.tsx` | Mantener capacidad de registrar seguimientos mediante formatos intenso/rápido (redirección/integración) sin borrado físico. |
| PWA / historial | `apps/pwa/src/views/AnimalProfileView.tsx` | Tabla con columnas **Estado de seguimiento** y **Próxima revisión** (y marca), detalle/PDF coherente. |
| PWA / pruebas | `apps/pwa/src/tests/*` (según infraestructura existente) | Pruebas de UI/cliente por CA implementado donde aplique. |
| Documentación | `apps/pwa/docs/*`, `docs/database/requests/DBR-016-...md` | Actualizar docs operativas y adjuntar evidencia `SHOW CREATE TABLE` cuando esté disponible. |

## Contrato y datos

- **Endpoint:** `POST /api/v1/staff/clinical-evaluations` (ruta nombrada `staff.clinical-evaluations.store` o equivalente según rutas actuales), autenticación staff (Sanctum/web), autorización por permisos de evaluaciones clínicas existentes. Request body: `{ kind: 'intense'|'quick'|'review' (compat transitoria si se mantiene), animal_id, data: { ...campos formato..., follow_up_status, next_review_date, follow_up_reason, is_follow_up } }`.
- **Validación/Actions/Resources:** Form Request o validación en controlador (consistente con código actual) que exija seguimiento para diagnósticos del flujo: `follow_up_status` in `stable,monitoring,follow_up`, `next_review_date` date required, motivo required, `is_follow_up` true. Mapear motivo a `evaluation_reason` (catálogo: `routine`/`treatment`/`observation` con etiquetas en español) y persistir campos DBR-016. Respuesta JSON 201 con evaluación creada; errores 422 en español.
- **DBR relacionada:** DBR-016 `docs/database/requests/DBR-016-clinical-evaluation-follow-up-fields.md` — **Lista para backend**, aplicada en `arca_pruebas` 2026-11-14, evidencia `SHOW CREATE TABLE` pendiente. DBR-015 aplicada (edad/SoftDeletes). No se crean migraciones en este cambio.
- **Historial/lectura:** serializar `follow_up_status`, `next_review_date`, `is_follow_up` en evaluaciones devueltas por perfil/listado de animal para CA-05.
- **Errores y compatibilidad:** mantener compatibilidad razonable con registros previos sin seguimiento estructurado (mostrar “—”); el flujo `kind=review` existente se alinea al nuevo modelo (campos estructurados) o se retira a favor del flujo unificado.

## Seguridad, offline y operación

- Datos clínicos sensibles: acceso solo staff autenticado/autorizado, sin exposición pública. Sin borrado físico (SoftDeletes) y auditoría según Constitución V/modelos.
- Validación server-side como fuente de verdad; la PWA valida en cliente para UX pero no sustituye API.
- Operación online únicamente (sesión staff); sin sincronización/offline en esta iteración. Mensajes de error claros en español, sin afirmar guardado ante fallo de red/API.
- Portabilidad MySQL 8.0.x Aiven/local preservada (tipos/fechas compatibles); sin secretos en repo; usar `.env`/config existente.

## Mapeo de criterios a pruebas

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | Feature test: crear evaluación intensa y rápida genera nuevo registro con `evaluation_type`/fecha/`patient_age` y no modifica anterior | `apps/api/src/tests/Feature/` (ClinicalEvaluation) |
| CA-02 | Test/verificación PWA: al intentar guardar formato completo se abre confirmación con mini-formulario de seguimiento y opciones Cancelar/Confirmar | `apps/pwa/src/tests/` y/o verificación manual |
| CA-03 | Feature test: guardar sin `follow_up_status`/`next_review_date`/motivo o con estado inválido retorna 422; con datos válidos persiste `is_follow_up=1` y campos | `apps/api/src/tests/Feature/` |
| CA-04 | Test/verificación PWA: menú/inicio ofrece accesos a **Diagnóstico intenso** y **Diagnóstico rápido** | `apps/pwa/src/tests/` y/o verificación manual |
| CA-05 | Feature test: historial de animal incluye estado/próxima revisión; test UI/ render de tabla con columnas | `apps/api/src/tests/Feature/` + `apps/pwa/src/tests/` |
| CA-06 | Revisión/ajuste de `ReviewFormView` y rutas de navegación: redirige/integra al flujo unificado, sin borrado físico | `apps/pwa/src/views/*` + pruebas de navegación si aplica |
| CA-07 | Revisión de modelos/operaciones: no borrado físico (SoftDeletes) en guardado clínico | `apps/api/src/app/Models/*` + pruebas existentes/ajustadas |
| CA-08 | Ejecución de suites por CA implementado (API PHPUnit, PWA test runner disponible) | `apps/api` / `apps/pwa` |

> Nota: ubicación/nombres exactos de tests se concretan en `/sdd-tasks` según estructura real de suites en `apps/api` y `apps/pwa`.

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | Laravel 12/PHP 8.4, React 19/Vite/Tailwind, MySQL 8.0.x portable Aiven/local; sin dependencias nuevas planeadas. DBR-016 aplicada en `arca_pruebas`. |
| II. La spec manda | Sí | Spec `008-seguimiento-revisiones.md` Aprobada (2026-11-14); plan trazado a CA/RN; sin implementación fuera de alcance. |
| III. Lógica separada de la interfaz | Sí | Validación/persistencia/reglas en API (controlador/validación/modelos); PWA solo captura, consume `@arca/api-client` y presenta historial. |
| IV. Un test por criterio | Sí (planificado) | Tabla de mapeo CA→prueba; ejecución en entorno con toolchain (`arca_pruebas`, sin RefreshDatabase). |
| V. Una sola fuente de verdad para los datos | Sí | `clinical_evaluations` en MySQL como autoridad; sin borrado físico; seguimiento estructurado en columnas DBR-016; cliente no autoritativo. |
| VI. Código en inglés, personas en español | Sí | Código/rutas/campos técnicos en inglés; UI, mensajes, specs/plan/docs en español. |

Ninguna excepción se implementa sin revisión y acuerdo requeridos.

## Riesgos y decisiones

- **ADR requerido/aprobado:** ninguno nuevo identificado; se apoya en ADRs/stack existentes y DBR-016 aprobada/aplicada. No se introducen tecnologías propuestas no aprobadas.
- **Riesgos:**
  - Cambio de validación (seguimiento obligatorio) puede romper flujos/consumidores actuales de guardado intenso/rápido → ajustar PWA y contrato en el mismo cambio y cubrir con tests.
  - Registros históricos sin `follow_up_status/next_review_date` → mostrar “—” y no asumir backfill.
  - `ReviewFormView` y atajos de navegación → rediseño cuidadoso para no perder capacidad de registro (CA-06).
  - Evidencia post-migración DBR-016 (`SHOW CREATE TABLE`) pendiente de adjuntar.
- **Alternativas y mitigaciones:** reutilizar formularios intenso/rápido con bloque compartido de seguimiento (evita tercer formato, RN-01); validar en API aunque falle cliente; conservar datos en formulario ante error de red.

## Orden y aprobación

1. **Prerequisitos:** spec Aprobada (hecho). Confirmar evidencia DBR-016 y estado de suites de prueba en entorno con `php`/`composer`/`pnpm`.
2. **API (contrato y persistencia):** ampliar validación/guardado en `ClinicalEvaluationController` + modelo/recursos para seguimiento obligatorio y exposición en historial; pruebas Feature.
3. **PWA (flujo y UI):** bloque de seguimiento en intenso/rápido, nuevo punto de entrada desde pantalla inicial, reemplazo/redirección de `ReviewFormView`, columnas Estado/Próxima revisión en historial; pruebas PWA.
4. **Verificación y docs:** ejecutar `/verify` y suites relevantes en `arca_pruebas`; actualizar docs PWA y adjuntar evidencia DBR-016.
5. **Aprobación:** revisión técnica de API/PWA y validación funcional por Victor Adrian (solicitante/responsable funcional) con evidencia de CA-01..CA-08 antes de dar por cerrado el cambio.
