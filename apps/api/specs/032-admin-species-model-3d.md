# 032 · admin-species-model-3d

- App dueña: `api`
- Apps/paquetes afectados: `api` (detección de modelo 3D por convención, aviso en detalle de solicitud, asignación automática al aceptar); `dashboard` (consumidor, `dashboard-022`); `pwa` (sin cambios).
- Estado: Aprobada
- Solicitante / responsable funcional: Usuario (sesión actual)
- Aprobación funcional: Aprobada por usuario en sesión (2026-11-25)

## Problema y contexto

El portal ya muestra modelos 3D (`web-014`, `api-031`) usando `species.model_3d_path`. Los `.glb` se colocan manualmente en la carpeta de modelos. Se necesita que, al aceptar/publicar una solicitud en dashboard, el sistema detecte si existe un modelo 3D para la especie y lo asigne automáticamente, mostrando un aviso claro al admin.

## Objetivos

- Detectar automáticamente si existe un modelo 3D para la especie por convención de nombre.
- Informar en el detalle de la solicitud si el modelo se asignará automáticamente, si ya está asignado, o si falta.
- Al aceptar/publicar (o aceptar sin publicar), asignar `species.model_3d_path` automáticamente si se detectó archivo y la especie no tiene modelo válido.

## Fuera de alcance

- Subida de `.glb` desde Dashboard o PWA.
- Cambios de esquema/DBR.
- Visor 3D en dashboard.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| `zoo-admin` | Ver aviso y aceptar/publicar solicitud | `species.review` |

## Criterios de aceptación

- **CA-01 (detección):** Dado el detalle de una solicitud pendiente, cuando la API lo entrega, entonces incluye información de detección 3D: `model_3d_status` (`assigned` | `detected` | `missing`), `detected_model_3d_path` (string|null) y/o campo acordado en plan.
- **CA-02 (convención):** La detección busca en el disco público de modelos un `.glb` por nombre normalizado del `common_name` de la especie. Si `species.model_3d_path` ya apunta a un archivo válido, tiene prioridad y el estado es `assigned`.
- **CA-03 (aviso dashboard):** El contrato permite al dashboard mostrar arriba de los botones de aceptación: detectado => “Se detectó un modelo 3D y se asignará automáticamente al aceptar.”; asignado => “Modelo 3D ya asignado.”; faltante => “No hay modelo 3D disponible. Comunícate con Sistemas.”
- **CA-04 (autoasignación):** Dado aceptar/publicar o aceptar sin publicar con estado `detected`, cuando la aceptación se completa exitosamente, entonces la especie queda con `model_3d_path` asignado al archivo detectado. Operación transaccional con la aceptación.
- **CA-05 (sin bloqueo):** Dado estado `missing`, cuando se acepta/publica, entonces la aceptación funciona normal y `model_3d_path` no cambia.
- **CA-06 (autorización):** Solo `species.review` recibe esta información por endpoints admin protegidos.
- **CA-07 (pruebas):** Existe al menos un test PHPUnit por CA-01..CA-06.
- **CA-08 (toggle, extensión):** Dado un modelo 3D asignado/detectado, cuando un `zoo-admin` con `species.review` llama el endpoint de toggle, entonces la especie actualiza `model_3d_enabled` (`true/false`) sin borrar `model_3d_path`. Si no hay modelo disponible, responde error de validación. Depende de DBR-027.
- **CA-09 (respeto al toggle, extensión):** Si `model_3d_enabled=false`, el portal público no expone `model_3d_url` y la autoasignación al aceptar no reactiva el modelo. Depende de DBR-027.

## Reglas de negocio

- **RN-01:** Detección solo lectura; no sube ni borra archivos.
- **RN-02:** Falta de modelo no bloquea aceptación/publicación.
- **RN-03:** Prioridad: `model_3d_path` válido existente > archivo detectado por convención > missing.
- **RN-04:** Convención de nombre documentada y determinista.

## Normalización de nombres de modelo 3D (obligatoria)

Al agregar un nuevo modelo `.glb`, el archivo debe nombrarse con esta regla para que el sistema lo detecte:

1. Tomar `species.common_name`.
2. Convertir a minúsculas.
3. Quitar acentos/diacríticos (`á->a`, `é->e`, `í->i`, `ó->o`, `ú->u`, `ü->u`, `ñ->n`).
4. Reemplazar cualquier secuencia de caracteres no alfanuméricos por `-`.
5. Eliminar `-` al inicio/final y colapsar múltiples `-`.
6. Agregar extensión `.glb`.
7. Guardar en `apps/api/src/media/models/` (y copiar a `apps/web/src/media/models/` mientras el portal corra en 8080).

Ejemplos:

| Nombre común | Archivo esperado |
|---|---|
| Hipopótamo | `hipopotamo.glb` |
| León Africano | `leon-africano.glb` |
| Búho | `buho.glb` |
| Tortuga | `tortuga.glb` |
| Cotorro | `cotorro.glb` |

> Nota: si un archivo ya existente tiene otro nombre (ej. `TORTUGA.glb`), se puede renombrar al formato normalizado o asignar `species.model_3d_path` manualmente en BD.

## Datos, privacidad y auditoría

- Sin cambio de esquema. Usa `species.model_3d_path` y archivos en disco `media/models`.
- Sin datos personales.

## Flujos y errores

- Admin abre solicitud pendiente -> API calcula detección 3D -> dashboard muestra aviso arriba de aceptar/aceptar sin publicar -> admin acepta -> backend asigna modelo si `detected`.

## Dependencias, riesgos y preguntas

- Dependencias: api-014, api-031, dashboard-022.
- Riesgos: nombres de archivo no normalizados. Mitigación: documentación clara y fallback a model_3d_path existente.
- Decisiones confirmadas: 20 MB no aplica (sin subida), sin DBR, conservar modelo actual si no hay nuevo detectado, aviso también en “Aceptar sin publicar”, mostrar “Modelo 3D ya asignado”.

## Revisión

- Aprobadores y fecha: Usuario, 2026-11-25.
- Evidencia: conversación de sesión.