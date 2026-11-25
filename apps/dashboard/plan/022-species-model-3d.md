# Plan técnico · 022 · species-model-3d

- Spec: `apps/dashboard/specs/022-species-model-3d.md`
- Estado de spec: Aprobada
- Responsable técnico: Sesión actual

## Diseño de solución

Mostrar aviso de modelo 3D en el detalle de solicitud pendiente, arriba de “Aceptar y publicar” y “Aceptar sin publicar”, usando `model_3d` entregado por la API.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| Dashboard | `packages/api-client/admin-types.ts` | Agregar `model_3d` a `SpeciesRequestDetailDto` |
| Dashboard | `apps/dashboard/src/views/SpeciesRequestDetailView.tsx` | Renderizar aviso por estado |
| Tests | `apps/dashboard/src/tests/species-request-detail.test.tsx` | CA-01..CA-05 |

## Mapeo de criterios a pruebas

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | detectado muestra aviso | species-request-detail.test.tsx |
| CA-02 | asignado muestra aviso | species-request-detail.test.tsx |
| CA-03 | faltante muestra aviso | species-request-detail.test.tsx |
| CA-04 | aviso antes de aceptar/publicar | species-request-detail.test.tsx |
| CA-05 | no bloquea flujo | comportamiento existente + no cambios en acciones |
| CA-06 | prueba automatizada | species-request-detail.test.tsx |

## Constitution Check

| Principio | Cumple | Evidencia |
|---|---|---|
| I. Stack mínimo y portable | Sí | Sin deps |
| II. La spec manda | Sí | dashboard-022 aprobada |
| III. Lógica separada de la interfaz | Sí | API detecta, view renderiza |
| IV. Un test por criterio | Sí | test agregado |
| V. Una sola fuente de verdad para los datos | Sí | API/model_3d_path |
| VI. Código en inglés, personas en español | Sí | UI en español |