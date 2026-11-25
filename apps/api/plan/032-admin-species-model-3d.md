# Plan técnico · 032 · admin-species-model-3d

- Spec: `apps/api/specs/032-admin-species-model-3d.md`
- Estado de spec: Aprobada
- Responsable técnico: Sesión actual

## Diseño de solución

Agregar detección automática de modelo 3D por convención de nombre y autoasignación al aceptar solicitud. Sin subida de archivos, sin DBR.

Flujo:
1. `ResolveSpeciesModel3dDetectionAction` normaliza `common_name`, busca `models/<slug>.glb` en disco público; prioridad a `species.model_3d_path` válido.
2. `ShowSpeciesPublicationRequestAction` adjunta `model_3d_detection` al request.
3. `SpeciesPublicationRequestDetailResource` expone `model_3d`.
4. `AcceptSpeciesPublicationRequestAction` asigna `model_3d_path` si estado `detected`.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| API | `app/Actions/Admin/SpeciesPublication/ResolveSpeciesModel3dDetectionAction.php` | Normalizar nombre y detectar archivo |
| API | `app/Actions/Admin/SpeciesPublication/ShowSpeciesPublicationRequestAction.php` | Adjuntar detección |
| API | `app/Actions/Admin/SpeciesPublication/AcceptSpeciesPublicationRequestAction.php` | Autoasignar al aceptar |
| API | `app/Http/Resources/Admin/SpeciesPublicationRequestDetailResource.php` | Exponer `model_3d` |
| Tests | `tests/Feature/SpeciesPublication/AdminSpeciesRequestModel3dTest.php` | CA-01..CA-06 |

## Contrato y datos

- Detalle solicitud admin incluye `model_3d: {status, detected_model_3d_path, model_3d_url}`.
- Sin migración. Sin cambios de permisos.

## Mapeo de criterios a pruebas

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | detectado por nombre normalizado | AdminSpeciesRequestModel3dTest |
| CA-02 | prioridad model_3d_path existente | AdminSpeciesRequestModel3dTest |
| CA-03 | aviso contrato/estado | AdminSpeciesRequestModel3dTest |
| CA-04 | autoasignación al aceptar | AdminSpeciesRequestModel3dTest |
| CA-05 | missing no bloquea | AdminSpeciesRequestModel3dTest |
| CA-06 | autorización por ruta admin existente | tests existentes de species publication + revisión |
| CA-07 | suite nombrada por CA | AdminSpeciesRequestModel3dTest |

## Constitution Check

| Principio | Cumple | Evidencia |
|---|---|---|
| I. Stack mínimo y portable | Sí | Sin deps nuevas |
| II. La spec manda | Sí | api-032 aprobada |
| III. Lógica separada de la interfaz | Sí | Action/Resource/Controller |
| IV. Un test por criterio | Sí | CA-01..CA-05 cubiertos; CA-06 por rutas existentes |
| V. Una sola fuente de verdad para los datos | Sí | species.model_3d_path + media/models |
| VI. Código en inglés, personas en español | Sí | Código inglés, UI/spec español |