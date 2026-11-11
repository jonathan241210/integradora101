# 005 · species-request-submission

- App dueña: `pwa`
- Apps/paquetes afectados: `pwa`, `api` (`api-014` species-requests backend), `packages/ui`
- Estado: Borrador
- Solicitante / responsable funcional: (por designar)
- Aprobación funcional: (pendiente)

## Problema y contexto

Actualmente, el módulo veterinario (`pwa`) permite registrar animales individuales que se guardan directamente en el catálogo. Sin embargo, se necesita un flujo de solicitud donde el veterinario proponga nuevas especies para el catálogo público, adjuntando datos y una fotografía. La Dirección del Zoológico (`zoo-admin`) revisa y aprueba estas solicitudes antes de que la especie sea visible en el catálogo de visitantes.

## Objetivos

- Permitir que el veterinario registre una solicitud de nueva especie con foto desde la PWA.
- Separar el registro de especies del animal individual: la solicitud propone la especie, no un animal específico.
- Que la foto y los datos se guarden como pendientes de revisión sin publicarse automáticamente.
- Que la Dirección revise, edite si es necesario, y acepte o rechace mediante el dashboard.
- Que el veterinario no vea feedback del rechazo; solo inicia la solicitud.

## Fuera de alcance

- Edición de solicitudes pendientes por el veterinario después de enviar.
- Solicitud de nuevos animales individuales (solo especies para catálogo).
- Cambios de esquema de base de datos en esta spec (depende de `api-014`).
- Exportación o descarga de fotos de solicitudes desde la PWA.
- Integración con el módulo de diagnósticos en esta versión.

## Actores y historias de usuario

| Actor/rol | Necesidad |
|---|---|
| `veterinarian` | Enviar solicitud de especie con foto desde la PWA |
| `zoo-admin` | Revisar y aprobar/rechazar en el dashboard (`dashboard-009`) |
| `admin` | Sin acceso a esta función (no es gestor de especies) |
| Visitante | No ve solicitudes, solo catálogo publicado |

- Como veterinario, quiero proponer una nueva especie para el catálogo, adjuntando foto y datos, para que la Dirección la revise antes de publicarla.

## Criterios de aceptación

### Formulario y envío

- **CA-01:** Dado un formulario en la sección «Registrar especie», cuando carga, entonces muestra campos: Nombre común, Nombre científico, Origen, Hábitat, Foto (subida obligatoria), con validación por campo.
- **CA-02:** Dado datos válidos y una foto soportada (JPG, PNG; máx. 5 MB), cuando se envía el formulario, entonces la PWA llama a `POST /api/v1/veterinarian/species-requests` con Sanctum y CSRF, incluye la foto como multipart, y conserva los datos en el formulario si hay error HTTP.
- **CA-03:** Ante respuesta `201`, la PWA muestra confirmación «Solicitud enviada. La Dirección la revisará.» y limpia el formulario; ante `422` (validación), muestra errores junto a cada campo en español; ante `401` (sesión vencida) o error de red, muestra aviso sin limpiar.
- **CA-04:** El tamaño máximo de foto es 5 MB; si se excede, la PWA rechaza la subida con mensaje «La foto no puede superar 5 MB.» sin enviar a la API.

### Campos de solicitud

- **CA-05:** La solicitud incluye: nombre común (requerido, máx. 150 caracteres), nombre científico (requerido, máx. 150), origen, hábitat, foto (binario), y se envía como `multipart/form-data`.
- **CA-06:** La API rechaza nombres duplicados (nombre común ya existe en solicitud pendiente o especie publicada) con `422` en español: «La especie ya fue solicitada o existe en el catálogo.»

### Confirmación y flujo

- **CA-07:** Una solicitud exitosa no muestra al veterinario el estado posterior: no hay enlace a seguimiento, no aparece en una lista de «mis solicitudes» en esta versión.
- **CA-08:** Si la foto no se puede procesar (formato inválido, corrupta), la API responde `422` con «No se pudo procesar la foto. Intenta con otro archivo.»

## Reglas de negocio

- **RN-01:** Solo personal con rol `veterinarian` puede enviar solicitudes. Sin ese rol, la sección no aparece; si se abre por URL, la PWA muestra un aviso de sin permiso.
- **RN-02:** La solicitud se guarda como pendiente en estado `submitted`; no crea ni publica la especie automáticamente.
- **RN-03:** La foto se almacena en la carpeta `media/species-requests/` en la API (similar a `api-013`), no se expone por URL pública hasta que sea aceptada.
- **RN-04:** La sesión debe ser válida (Sanctum cookie + CSRF); no se guardan credenciales en el cliente.
- **RN-05:** Mensajes en español, identificadores en inglés; la foto no requiere consentimiento adicional (se entiende que el veterinario la carga bajo autorización).

## Datos, privacidad y auditoría

- La foto se guarda privada hasta aceptación; no aparece en búsquedas públicas ni en el catálogo web.
- El nombre del veterinario que envía se registra en `created_by` para auditoría.
- No se recogen datos personales de visitantes, solo de la especie.

## Flujos y errores

1. Veterinario abre «Registrar especie» en la PWA.
2. Completa nombre común, científico, origen, hábitat, elige foto (máx. 5 MB).
3. Envía; la PWA valida campos y tamaño de foto.
4. Si es válido, envía a `POST /api/v1/veterinarian/species-requests`.
5. Respuesta `201` → confirmación y formulario limpio.
6. Respuesta `422` → errores mostrados junto a campos.
7. Respuesta `401` → «Tu sesión expiró»; `500` → error genérico.

## Dependencias, riesgos y decisiones

- **Dependencia:** `api-014` (especies-requests backend), `api-013` (almacenamiento de imágenes), `dashboard-009` (revisión administrativa).
- **Riesgos:**
  - Una foto corrupta o en formato no soportado causa error 422 después de enviar; debe reintentar el veterinario.
  - Sin lista de seguimiento, el veterinario no sabe si la solicitud se procesa.
- **Decisión:** Esta versión no implementa lista de «mis solicitudes» en la PWA; se agrega en una spec posterior si se requiere.

## Revisión

- Aprobadores y fecha: (pendiente)
- Estado: Borrador (requiere validación técnica de BD y de API antes de pasar a En progreso)
