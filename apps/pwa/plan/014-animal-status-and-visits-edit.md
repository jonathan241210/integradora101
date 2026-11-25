# Plan técnico · 014 · Edición de estatus de estancia y permiso de visitas

- Spec: `apps/pwa/specs/014-animal-status-and-visits-edit.md`
- Estado de spec: Aprobada (2026-11-24)
- Responsable técnico: Por identificar

> Implementar solo el alcance aprobado: PWA + API para `stay_status` y `can_receive_visits`. Antes de backend, resolver la persistencia del motivo obligatorio del cambio de estatus (auditoría existente o DBR).

## Diseño de solución

Agregar un flujo de edición acotado para `stay_status` y `can_receive_visits` del animal. La PWA presenta la acción en el perfil del animal; la API valida permisos, reglas de transición y persiste el cambio. No hay guardado offline: la edición requiere confirmación del servidor.

## Dónde se harán modificaciones

| Área/app | Archivo/módulo | Cambio previsto |
|---|---|---|
| API / rutas | `apps/api/src/routes/api.php` | Agregar ruta nombrada staff para actualizar animal (propuesta: `PATCH /api/v1/staff/animals/{animal}` → `staff.animals.update`). |
| API / validación | `apps/api/src/app/Http/Requests/Staff/UpdateAnimalStatusRequest.php` (nuevo) | Validar `stay_status` (`sometimes|required|in:...`), `can_receive_visits` (`sometimes|required|boolean`) y `reason` obligatorio cuando cambia `stay_status`. Mensajes en español. |
| API / dominio | `apps/api/src/app/Actions/Staff/UpdateAnimalStatusAction.php` (nuevo) | Aplicar transiciones controladas (RN-05), forzar `can_receive_visits=0` en `Resguardo_Profepa/Trasladado/Liberado` (RN-04), persistir y registrar auditoría. |
| API / controlador | `apps/api/src/app/Http/Controllers/Api/AnimalController.php` | Agregar método `update` delgado: FormRequest → Action → respuesta JSON. |
| API / autorización | `apps/api/src/app/Policies/AnimalPolicy.php` (nuevo o existente) / permisos Spatie | Autorizar edición con permiso `animals.update`. |
| API / modelo | `apps/api/src/app/Models/Animal.php` | Solo si se requiere auditoría/constantes/casts; mantener SoftDeletes y compatibilidad. |
| API / tests | `apps/api/src/tests/Feature/AnimalStatusUpdateTest.php` (nuevo) | Cobertura CA-01..CA-05: éxito, validación, permiso, transición, impacto. |
| PWA / contrato | `apps/pwa/src/services/apiClient.ts` | Agregar tipo/función `updateAnimalStatus` o `updateAnimal`. |
| PWA / viewmodel | `apps/pwa/src/viewmodels/useAnimalActions.ts` (o hook dedicado) | Exponer acción de edición con manejo de estado/error. |
| PWA / UI | `apps/pwa/src/views/AnimalProfileView.tsx` | Mostrar valor actual de `can_receive_visits`; agregar acción “Editar estado y exhibición” con formulario/modal, confirmación y feedback. |
| PWA / tests | `apps/pwa/src/tests/screens.test.tsx` o test dedicado | Verificar render de estado actual, controles de edición y mensajes de error/éxito. |
| Docs | `apps/pwa/docs/*`, `apps/api/docs/*` si aplica | Actualizar flujo operativo y contrato. |

## Contrato y datos

- **Endpoint propuesto**: `PATCH /api/v1/staff/animals/{animal}` (`staff.animals.update`), auth Sanctum, permiso `animals.update`.
- **Request**:
  ```json
  {
    "stay_status": "Permanente",
    "can_receive_visits": 1,
    "reason": "Motivo del cambio de estatus"
  }
  ```
  `stay_status` y `can_receive_visits` `sometimes`; al menos uno requerido. `reason` obligatorio cuando cambia `stay_status`.
- **Response 200**: datos mínimos del animal actualizado (`id`, `stay_status`, `can_receive_visits`, `updated_at`).
- **Errores**: 401 sesión, 403 permiso, 404 animal, 422 validación/transición inválida.
- **DBR**: no requerida. Columnas existentes verificadas en `arca_pruebas` (2026-11-24). Motivo persistido en `activity_log.properties.reason` vía `LogAdminActivityAction`.
- **Auditoría**: registrar usuario, fecha, antes/después y motivo en activity log (`admin`, evento `animal_status_updated`).

## Seguridad, offline y operación

- Permiso en servidor; no exponer edición sin autorización.
- Sin guardado offline; la acción es confirmada por servidor.
- Registrar auditoría de cambios sensibles de exhibición/estatus.
- No permitir que el cliente fuerce transiciones no autorizadas.

## Mapeo de criterios a pruebas

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | Renderiza perfil con estatus y permiso de visitas, y acción de edición visible para usuario autorizado | PWA Vitest |
| CA-02 | PATCH válido cambia `can_receive_visits` y persiste | API PHPUnit Feature |
| CA-03 | PATCH válido cambia `stay_status` y persiste | API PHPUnit Feature |
| CA-04 | Rechaza inválido/sin permiso/sesión/transición no permitida; no muta datos | API PHPUnit + PWA feedback |
| CA-05 | Visibilidad pública/móvil respeta reglas tras cambio | API PHPUnit (catálogo/visitor según alcance) |

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | Reusa Laravel/React/MySQL existentes; sin dependencia nueva prevista. |
| II. La spec manda | Sí | Spec 014 aprobada el 2026-11-24. |
| III. Lógica separada de la interfaz | Sí | PWA envía intención; API valida/transiciona/persiste. |
| IV. Un test por criterio | Planificado | CA-01..CA-05 mapeados. |
| V. Una sola fuente de verdad para los datos | Sí | MySQL/API autoridad; sin offline para esta edición. |
| VI. Código en inglés, personas en español | Sí | Rutas/campos en inglés; UI/errores/docs en español. |

## Riesgos y decisiones

- ADR no previsto salvo que se introduzca dependencia o cambio arquitectónico.
- Riesgo principal: reglas de transición no definidas. Mitigación: cerrar preguntas de spec antes de plan final.
- Riesgo de visibilidad: alinear `publiclyVisible`/visitabilidad si el negocio lo requiere.

## Orden y aprobación

1. Aprobar spec 014 y cerrar preguntas pendientes.
2. Confirmar esquema vivo de `arca_pruebas` en solo lectura.
3. Implementar API (request/action/policy/controller/tests).
4. Implementar PWA (apiClient/viewmodel/vista/tests).
5. Ejecutar `/verify` y registrar evidencia.
6. Actualizar docs y enlazar spec/plan/tasks en PR.
