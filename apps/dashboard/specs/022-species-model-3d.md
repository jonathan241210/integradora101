# 022 · species-model-3d

- App dueña: `dashboard`
- Apps/paquetes afectados: `dashboard` (aviso de modelo 3D en detalle de solicitud antes de aceptar/publicar); `api` (detección/autoasignación, `api-032`); `pwa` (sin cambios).
- Estado: Aprobada
- Solicitante / responsable funcional: Usuario (sesión actual)
- Aprobación funcional: Aprobada por usuario en sesión (2026-11-25)

## Problema y contexto

El admin acepta/publica solicitudes de especie en el dashboard. Los modelos 3D se colocan manualmente en la carpeta de modelos. Se necesita un aviso claro antes de aceptar para saber si hay modelo 3D disponible, si ya está asignado, o si falta.

## Objetivos

- Mostrar aviso arriba de “Aceptar y publicar” y “Aceptar sin publicar”.
- Indicar estado del modelo 3D: detectado, ya asignado, o faltante.

## Fuera de alcance

- Subir `.glb` desde dashboard o PWA.
- Visor 3D en dashboard.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| `zoo-admin` | Ver aviso antes de aceptar/publicar | `species.review` |

## Criterios de aceptación

- **CA-01 (detectado):** Dado `model_3d_status=detected`, cuando se renderiza la zona de decisión, entonces muestra arriba de los botones de aceptación: “Se detectó un modelo 3D y se asignará automáticamente al aceptar.”
- **CA-02 (asignado):** Dado `model_3d_status=assigned`, cuando se renderiza, entonces muestra: “Modelo 3D ya asignado.”
- **CA-03 (faltante):** Dado `model_3d_status=missing`, cuando se renderiza, entonces muestra: “No hay modelo 3D disponible. Comunícate con Sistemas.”
- **CA-04 (ubicación):** El aviso aparece en el detalle de solicitud pendiente, después de “Editar / Aceptar y publicar / Aceptar sin publicar” (zona de acciones).
- **CA-05 (no bloquea):** El aviso no impide aceptar/publicar; el flujo actual sigue funcionando.
- **CA-06 (accesibilidad/pruebas):** Aviso con semántica visible, texto en español, no solo color; existe al menos una prueba automatizada por CA-01..CA-05.
- **CA-07 (toggle, extensión):** Dado `model_3d.status` `assigned` o `detected` y `can_toggle=true`, cuando se renderiza, entonces muestra un switch para activar/desactivar el modelo 3D. Si `missing`, no muestra switch y solo muestra el aviso. Depende de DBR-027/api-032 extensión.

## Reglas de negocio

- **RN-01:** Dashboard consume detección desde API; no inspecciona filesystem.
- **RN-02:** No fetch directo en componentes; MVVM existente.
- **RN-03:** Falta de modelo no bloquea decisión.

## Datos, privacidad y auditoría

- Sin datos personales. Solo metadata de disponibilidad.

## Flujos y errores

- Abrir solicitud pendiente -> ver aviso -> aceptar/aceptar sin publicar. Errores existentes se mantienen.

## Dependencias, riesgos y preguntas

- Dependencias: `dashboard-010`, `api-032`.
- Riesgos: nombre de archivo no normalizado. Mitigación: regla documentada en api-032.
- Decisiones confirmadas: aviso también en “Aceptar sin publicar”; mostrar “Modelo 3D ya asignado”.

## Revisión

- Aprobadores y fecha: Usuario, 2026-11-25.
- Evidencia: conversación de sesión.