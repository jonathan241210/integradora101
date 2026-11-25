# Plan técnico · 031 · published-species-model-3d-url

- Spec: `apps/api/specs/031-published-species-model-3d-url.md`
- Estado de spec: Aprobada
- Responsable técnico: Por confirmar (sesión actual)

## Diseño de solución

Ampliar el contrato público `GET /api/v1/published-species` (api-015) para incluir `model_3d_url` por especie. La URL se resuelve en servidor con una Action dedicada, siguiendo el patrón de `ResolvePublishedSpeciesImageUrlAction`. No hay cambios de esquema ni escrituras.

Flujo:
1. `ListPublishedSpeciesAction` agrega `species.model_3d_path` al `select`.
2. `PublishedSpeciesResource` agrega `model_3d_url` usando `ResolvePublishedSpeciesModel3dUrlAction`.
3. `ResolvePublishedSpeciesModel3dUrlAction` valida prefijo `models/`, extensión `.glb`, sin `..`/`\`, existencia en disco público; devuelve URL pública o `null`.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| API / datos | `apps/api/src/app/Actions/Catalog/ResolvePublishedSpeciesModel3dUrlAction.php` (nuevo) | Resolver/validar URL pública del modelo 3D |
| API / datos | `apps/api/src/app/Actions/Catalog/ListPublishedSpeciesAction.php` | Incluir `species.model_3d_path` en select |
| API / datos | `apps/api/src/app/Http/Resources/Catalog/PublishedSpeciesResource.php` | Exponer `model_3d_url` |
| API / pruebas | `apps/api/src/tests/Feature/Catalog/PublishedSpeciesReadTest.php` (o archivo existente de api-015) | Cubrir CA-01..CA-06 |
| Documentación | `apps/api/specs/015-public-species-read.md` / notas si aplica | Registrar extensión de contrato sin romper semántica existente |

## Contrato y datos

- Endpoint: `GET /api/v1/published-species` (nombre `published-species.index`, público, solo lectura) — sin cambio de ruta/auth.
- Cambio de contrato: agrega campo `model_3d_url: string|null` en cada item. Campos existentes mantienen semántica.
- Validación de ruta de modelo: aceptar solo `models/<archivo>.glb`, sin `..`, sin `\`, sin URL externa. Archivo debe existir en disco público resuelto por `ResolveMediaDiskAction`.
- DBR/migración: no requerida; `species.model_3d_path` ya existe.
- Errores: nunca 500 por modelo faltante/inválido; devolver `model_3d_url=null`.

## Seguridad, offline y operación

- Sin datos sensibles. No exponer rutas internas. Validar path antes de resolver.
- Sin writes/Activitylog. Compatible MySQL 8.0.x/Aiven/local (solo lectura).
- Modelos pueden ser pesados: la API solo entrega URL; la descarga la hace el cliente.

## Mapeo de criterios a pruebas

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | `test_caXX_published_species_includes_model_3d_url` | `apps/api/src/tests/Feature/Catalog/PublishedSpeciesReadTest.php` |
| CA-02 | `test_caXX_model_3d_url_resolves_valid_glb` | mismo |
| CA-03 | `test_caXX_model_3d_url_null_for_invalid_or_missing` | mismo |
| CA-04 | `test_caXX_model_3d_url_rejects_unsafe_paths` | mismo |
| CA-05 | regresión campos existentes api-015 | mismo |
| CA-06 | cobertura de suite nombrada por CA | mismo |

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | Laravel/PHP existente, disco público configurable, sin dependencia nueva. |
| II. La spec manda | Sí | Spec `api-031` Aprobada; CA-01..CA-06 trazables. |
| III. Lógica separada de la interfaz | Sí | Resolución en Action; Resource serializa; controlador sin cambio de lógica. |
| IV. Un test por criterio | Sí | Tabla de mapeo CA-01..CA-06. |
| V. Una sola fuente de verdad para los datos | Sí | `species.model_3d_path` en BD; API resuelve URL. |
| VI. Código en inglés, personas en español | Sí | Código/rutas en inglés; mensajes/spec en español. |

## Riesgos y decisiones

- ADR requerido/aprobado: no. Reusa patrón api-013/api-015.
- Riesgos: aumentar payload levemente; archivos .glb grandes (mitiga cliente). Mitigación: URL null-safe.
- Decisión: usar `model_3d_url` resuelta, no path crudo.

## Orden y aprobación

1. Aprobar plan (este documento).
2. Crear tasks `apps/api/tasks/031-published-species-model-3d-url.md`.
3. Implementar Action + select + Resource + tests.
4. Ejecutar PHPUnit focalizado y luego `/verify` según corresponda.