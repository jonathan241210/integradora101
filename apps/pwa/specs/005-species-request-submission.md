# 005 · species-request-submission

- App dueña: `pwa`
- Apps/paquetes afectados: `pwa`, `api` (`api-014` species-requests backend), `packages/ui`
- Estado: Borrador
- Solicitante / responsable funcional: (por designar)
- Aprobación funcional: (pendiente)

## Decisiones tomadas (2026-11-11)

- **Foto reemplazable por la Dirección.** El veterinario no edita después de enviar. La Dirección puede reemplazar la foto antes de aceptar (`api-014` CA-23).
- **Ficha pública.** El veterinario elige qué mostrar en la ficha pública, con los predeterminados ya marcados (CA-09 a CA-11): «Nombre científico», «Origen» y «Hábitat». Nombre común y foto siempre se muestran. Desmarcar un campo solo evita que se muestre en el portal; el dato sigue guardado en la solicitud y es visible para `zoo-admin` en el dashboard.
- **Tipo de animal (2026-11-11).** El veterinario elige el tipo de animal con un selector de la lista cerrada de DBR-004 (CA-12). Obligatorio: **por confirmar**. Sin este campo, la especie aceptada tendría `category` NULL y no contaría en las misiones ni en el filtro por tipo de TulanPedia.

## Problema y contexto

Actualmente, el módulo veterinario (`pwa`) permite registrar animales individuales que se guardan directamente en el catálogo. Sin embargo, se necesita un flujo de solicitud donde el veterinario proponga nuevas especies para el catálogo público, adjuntando datos y una fotografía. La Dirección del Zoológico (`zoo-admin`) revisa y aprueba estas solicitudes antes de que la especie sea visible en el catálogo de visitantes.

## Objetivos

- Permitir que el veterinario registre una solicitud de nueva especie con foto desde la PWA.
- Separar el registro de especies del animal individual: la solicitud propone la especie, no un animal específico.
- Que la foto y los datos se guarden como pendientes de revisión sin publicarse automáticamente.
- Que la Dirección revise, edite si es necesario (`api-014` CA-14 a CA-19), y acepte o rechace mediante el dashboard (`dashboard-010`).
- Que el veterinario no vea feedback del rechazo; solo inicia la solicitud.

## Fuera de alcance

- Edición de solicitudes pendientes por el veterinario después de enviar.
- Solicitud de nuevos animales individuales (solo especies para catálogo).
- Cambios de esquema de base de datos en esta spec (depende de `api-014` y DBR-013).
- Exportación o descarga de fotos de solicitudes desde la PWA.
- Integración con el módulo de diagnósticos en esta versión.

## Actores y historias de usuario

| Actor/rol | Necesidad |
|---|---|
| `veterinarian` | Enviar solicitud de especie con foto desde la PWA |
| `zoo-admin` | Revisar, editar, aprobar o rechazar en el dashboard (`dashboard-010`) |
| `admin` | Sin acceso a esta función (no es gestor de especies) |
| Visitante | No ve solicitudes, solo catálogo publicado (`api-015`, `web-011`) |

- Como veterinario, quiero proponer una nueva especie para el catálogo, adjuntando foto y datos, para que la Dirección la revise antes de publicarla.

## Criterios de aceptación

### Formulario y envío

- **CA-01:** Dado un formulario en la sección «Registrar especie», cuando carga, entonces muestra campos: Nombre común, Nombre científico, Origen (la etiqueta definitiva depende de la opción 2a de DBR-013), Hábitat, Tipo de animal (selector, CA-12), Foto (subida obligatoria) y el bloque «Qué mostrar en la ficha pública» (CA-09), con validación por campo.
- **CA-02:** Dado datos válidos y una foto soportada (JPG, PNG; máx. 5 MB), cuando se envía el formulario, entonces la PWA llama a `POST /api/v1/veterinarian/species-requests` con Sanctum y CSRF, incluye la foto como multipart, y conserva los datos en el formulario si hay error HTTP.
- **CA-03:** Ante respuesta `201`, la PWA muestra confirmación «Solicitud enviada. La Dirección la revisará.» y limpia el formulario; ante `422` (validación), muestra errores junto a cada campo en español; ante `401` (sesión vencida) o error de red, muestra aviso sin limpiar.
- **CA-04:** El tamaño máximo de foto es 5 MB; si se excede, la PWA rechaza la subida con mensaje «La foto no puede superar 5 MB.» sin enviar a la API.

### Campos de solicitud

- **CA-05:** La solicitud incluye: nombre común (requerido, máx. 150 caracteres), nombre científico (requerido, máx. 150), origen, hábitat, tipo de animal (`category`, CA-12), foto (binario), la selección `published_fields` (CA-10), y se envía como `multipart/form-data`.
- **CA-06:** La API rechaza nombres duplicados (nombre común ya existe en solicitud pendiente o especie publicada) con `422` en español: «La especie ya fue solicitada o existe en el catálogo.»

### Confirmación y flujo

- **CA-07:** Una solicitud exitosa no muestra al veterinario el estado posterior: no hay enlace a seguimiento, no aparece en una lista de «mis solicitudes» en esta versión.
- **CA-08:** Si la foto no se puede procesar (formato inválido, corrupta), la API responde `422` con «No se pudo procesar la foto. Intenta con otro archivo.»

### Ficha pública (2026-11-11)

- **CA-09 (qué mostrar en la ficha pública):** Dado el formulario, cuando carga, entonces muestra el bloque «Qué mostrar en la ficha pública» con estas casillas. Marcadas por defecto: «Nombre científico», «Origen» y «Hábitat». Desmarcadas por defecto: «Estado de conservación», «Tamaño», «Gestación», «Alimentación», «Esperanza de vida» y «Características». «Nombre común», «Tipo de animal» (el selector de CA-12) y «Foto» aparecen siempre, sin casilla. Las etiquetas y los predeterminados coinciden con `api-014` RN-13. El veterinario puede desmarcar cualquiera de las tres casillas marcadas para no publicar ese campo, o marcar una de las demás cuando tenga fuente (ver la pregunta abierta de «Dependencias, riesgos y decisiones»). Desmarcar solo evita que se muestre en el portal: el dato sigue guardado en la solicitud y es visible para `zoo-admin` en el dashboard.
- **CA-10 (envío de la selección):** Dado el envío, cuando el veterinario deja las casillas como están o cambia alguna, entonces la PWA envía `published_fields` como cadena JSON con las claves marcadas (por ejemplo, `["scientific_name","origin","habitat"]`), o `[]` si no hay ninguna. Si la API responde `422` por una clave no permitida o por formato (`api-014` CA-21), la PWA muestra el mensaje junto al bloque y conserva las casillas y los demás datos.
- **CA-11 (fuentes pendientes):** Mientras DBR-013 pregunta 8 esté abierta, las casillas de CA-09 que no tienen fuente en la solicitud («Estado de conservación», «Tamaño», «Gestación», «Alimentación», «Esperanza de vida» y «Características») no se muestran. «Origen» sí se muestra, porque la solicitud ya lo guarda. Verificación: prueba del formulario con la lista de `api-014` RN-13.
- **CA-12 (tipo de animal, 2026-11-11):** Dado el formulario, cuando carga, entonces muestra «Tipo de animal» como selector (no como texto libre) con las seis opciones de DBR-004 y estas etiquetas: Mamífero (`mammal`), Ave (`bird`), Reptil (`reptile`), Anfibio (`amphibian`), Pez (`fish`) e Invertebrado (`invertebrate`). El valor enviado es la clave en inglés (`category`), como exige `api-014` CA-25. Si no hay elección al enviar, el selector muestra un error en español junto al campo (**obligatorio por confirmar**). Si la API responde `422` por `category` (valor fuera de la lista o falta), la PWA muestra el mensaje junto al selector y conserva los demás datos. Verificación: test de Vitest que nombra CA-12.

## Reglas de negocio

- **RN-01:** Solo personal con rol `veterinarian` puede enviar solicitudes, por regla de rol (igual que `api-014` RN-01; no hay permiso propio de envío). Sin ese rol, la sección no aparece; si se abre por URL, la PWA muestra un aviso de sin permiso. La API es la que aplica esta regla.
- **RN-02:** La solicitud se guarda como pendiente en estado `submitted`; no crea ni publica la especie automáticamente.
- **RN-03 (foto):** La foto se almacena en `media/species-requests/` en la API (`api-014` RN-04). En pruebas esa carpeta se publica por `/media` (enmienda del ADR 0026, 2026-11-11): la API no devuelve su URL y la PWA no la muestra. Antes de producción se cambia el almacenamiento (ver «Recomendación antes de producción» en `api-014`).
- **RN-04:** La sesión debe ser válida (Sanctum cookie + CSRF); no se guardan credenciales en el cliente.
- **RN-05:** Mensajes en español, identificadores en inglés; la foto no requiere consentimiento adicional (se entiende que el veterinario la carga bajo autorización).

## Datos, privacidad y auditoría

- La foto se guarda sin URL en las respuestas de la API hasta su aceptación; no aparece en búsquedas públicas ni en el catálogo web. En pruebas, la carpeta de pendientes es alcanzable por `/media` si se conoce la URL (riesgo aceptado, `api-014` y ADR 0026, riesgo m).
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

- **Dependencia:** `api-014` (especies-requests backend), `api-013` (almacenamiento de imágenes), `dashboard-010` (revisión administrativa; absorbe `dashboard-009`), DBR-013 (tabla `species_requests`, Borrador).
- **Riesgos:**
  - Una foto corrupta o en formato no soportado causa error 422 después de enviar; debe reintentar el veterinario.
  - Sin lista de seguimiento, el veterinario no sabe si la solicitud se procesa.
  - Foto pendiente alcanzable por URL en pruebas (ADR 0026, riesgo m).
  - Tipo de animal opcional por error: si la obligatoriedad no se confirma, la especie puede aceptarse con `category` NULL y no contaría en las misiones ni en el filtro por tipo (**por confirmar**).
- **Decisión:** Esta versión no implementa lista de «mis solicitudes» en la PWA; se agrega en una spec posterior si se requiere.
- **Decisión (2026-11-11):** la selección de la ficha pública (CA-09 a CA-11) entra en esta spec. Las fuentes de los campos extra quedan abiertas (DBR-013 pregunta 8; `api-014` pregunta 3).
- **Pregunta abierta (remitida a `api-014` pregunta 6):** ¿el envío sigue por regla de rol `veterinarian` o se convierte en permiso? Propuesta: rol, como en RN-01.
- **Pregunta abierta (ampliación del formulario, 2026-11-11):** ¿el formulario de la PWA debe pedir también estos campos de especie para poder publicarlos? Son «Estado de conservación», «Tamaño», «Gestación», «Alimentación», «Esperanza de vida» y «Características». Remitida a `api-014` pregunta 3 y DBR-013 pregunta 8. Hasta responderla, el formulario no cambia, salvo el selector «Tipo de animal» (CA-12, decidido el 2026-11-11).

## Revisión

- Aprobadores y fecha: (pendiente)
- Estado: Borrador (requiere validación técnica de BD y de API antes de pasar a En progreso)
- Historial: 2026-11-11, RN-01 confirmada como regla de rol; RN-03 y «Datos» actualizados por la decisión de la foto en carpeta pública durante pruebas. 2026-11-11 (2): selección de la ficha pública (CA-09 a CA-11) y foto reemplazable por la Dirección. 2026-11-11 (3): «Origen» marcado por defecto (CA-09, CA-10, CA-11); pregunta abierta sobre la ampliación del formulario. 2026-11-11 (4): campo «Tipo de animal» (`category`, selector de lista cerrada; CA-01, CA-05, CA-09, CA-12 nuevo, riesgos), obligatoriedad por confirmar.
