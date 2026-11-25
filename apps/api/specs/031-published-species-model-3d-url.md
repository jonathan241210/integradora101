# 031 · published-species-model-3d-url

- App dueña: `api`
- Apps/paquetes afectados: `api` (extiende contrato de `GET /api/v1/published-species` para exponer `model_3d_url` resuelta); `web` (consumidor TulanPedia `web-014`); `mobile` (sin cambios; no consume published-species).
- Estado: Aprobada
- Solicitante / responsable funcional: Usuario (sesión actual)
- Aprobación funcional: Aprobada por usuario en sesión (2026-11-25), como parte de `web-014` recomendaciones.

## Problema y contexto

`web-014` necesita mostrar modelos 3D en TulanPedia para especies publicadas. `species.model_3d_path` ya existe en BD, pero `PublishedSpeciesResource` (api-015) no lo expone. Se requiere ampliar el contrato público de published-species con una URL segura y resuelta.

## Objetivos

- Exponer `model_3d_url` en cada elemento de `GET /api/v1/published-species`.
- Resolver/validar la URL en servidor; devolver `null` si falta, es inválida o el archivo no existe.
- Mantener compatibilidad con consumidores actuales.

## Fuera de alcance

- Subida/administración de modelos 3D.
- Cambios de esquema BD (campo `model_3d_path` ya existe).
- Exponer modelos 3D en endpoints privados fuera de esta necesidad.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Visitante/portal web | Recibir URL de modelo 3D cuando exista | Ninguno; endpoint público |
| Equipo API | Implementar resolución segura | Acceso repo |

## Criterios de aceptación

- **CA-01 (campo):** Dada una respuesta de `GET /api/v1/published-species`, cuando se serializa una especie, entonces cada elemento incluye `model_3d_url` (string URL o `null`) además de los campos existentes.
- **CA-02 (resolución válida):** Dada una especie publicada con `model_3d_path` válido (`models/<archivo>.glb`, sin `..`, sin backslashes) y archivo existente en disco público configurado, cuando se consulta, entonces `model_3d_url` es la URL pública del archivo.
- **CA-03 (inválido/inexistente):** Dado `model_3d_path` null, vacío, con formato inválido, extensión distinta de `.glb`, o archivo inexistente, cuando se consulta, entonces `model_3d_url` es `null` y la respuesta no falla.
- **CA-04 (seguridad):** La respuesta no expone rutas internas del servidor; no acepta `..`, `\`, esquemas externos ni rutas fuera de `models/`.
- **CA-05 (compatibilidad):** Los campos existentes de api-015 no cambian su semántica.
- **CA-06 (pruebas):** Existe al menos un test PHPUnit por CA-01 a CA-05 usando `DatabaseTransactions` sobre `arca_pruebas`.

## Reglas de negocio

- **RN-01:** Solo lectura; sin writes ni Activitylog.
- **RN-02:** Resolver URL con Action dedicada (patrón `ResolvePublishedSpeciesImageUrlAction`).
- **RN-03:** Aceptar solo `.glb` bajo prefijo `models/`.
- **RN-04:** `model_3d_path` es la fuente canónica en BD; `model_3d_url` es la representación pública resuelta.

## Datos, privacidad y auditoría

- Sin datos personales/clínicos/financieros. No requiere DBR ni cambio de esquema.

## Flujos y errores

- Path válido + archivo existe => URL pública. Cualquier otra condición => `null`.

## Dependencias, riesgos y preguntas

- Dependencias: api-015, web-014, disco público/storage link.
- Riesgos: archivos pesados; modelos faltantes. Mitigación: resolver null-safe.
- Preguntas pendientes: ninguna (decisiones heredadas de web-014).

## Revisión

- Aprobadores y fecha: Usuario, 2026-11-25.
- Evidencia: `apps/web/specs/014-species-3d-models.md`.