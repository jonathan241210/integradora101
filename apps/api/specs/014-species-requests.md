# 014 · species-requests

- App dueña: `api`
- Apps/paquetes afectados: `api` (dueña: envío, revisión, publicación, auditoría), `pwa` (`pwa-005` consumidor), `dashboard` (`dashboard-009` revisión), `packages/api-client` (métodos y tipos)
- Estado: Borrador
- Solicitante / responsable funcional: (por designar)
- Responsable de BD: (por designar; requiere DBR para tabla `species_requests`)
- Aprobación funcional: (pendiente)

## Problema y contexto

No existe actualmente un mecanismo para que el veterinario proponga nuevas especies al catálogo. Hoy se registran animales individuales que crean especies automáticamente. Se necesita un flujo intermedio donde:

1. El veterinario envía una solicitud con datos de la especie y una foto.
2. La API guarda la solicitud como pendiente sin publicar.
3. La Dirección (`zoo-admin`) la revisa en el dashboard y decide aceptar o rechazar.
4. Al aceptar, se registra la especie en el catálogo público.

## Objetivos

- Exponer endpoint `POST /api/v1/veterinarian/species-requests` para que la PWA envíe solicitudes con foto multipart.
- Validar datos de la especie: nombres únicos, foto soportada (JPG, PNG; máx. 5 MB).
- Guardar en tabla `species_requests` con estado `submitted`.
- Exponer endpoints administrativos `GET /api/v1/admin/species-requests` para listado paginado filtrable por estado.
- Exponer `GET /api/v1/admin/species-requests/{id}` con foto (binario) y `POST .../accept` / `POST .../reject` para `zoo-admin`.
- Publicar especie en `species` al aceptar.
- Registrar auditoría de envío, revisión, decisiones y rechazo.

## Fuera de alcance

- Edición de solicitudes pendientes.
- Reenvío o corrección por el veterinario.
- Cambios de esquema de `species` en esta spec (solo lectura); depende de DBR propia.
- Integración con registros de animales individuales (son procesos separados).
- Exportación de solicitudes.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| `veterinarian` | Enviar solicitud | Sesión válida (Sanctum) |
| `zoo-admin` | Revisar, aceptar, rechazar | Sesión válida + 2FA; permiso `species.review` (nuevo) |
| `admin` | Sin acceso | — |
| `executive`, `cashier` | Sin acceso | — |

## Historias de usuario

- Como veterinario, quiero enviar una solicitud de nueva especie con foto para que la Dirección la revise antes de publicarla en el catálogo.
- Como `zoo-admin`, quiero ver las solicitudes pendientes, revisar la foto y los datos, y decidir aceptarla o rechazarla.

## Criterios de aceptación

### Envío (veterinario)

- **CA-01:** Dado un veterinario con sesión válida, cuando llama `POST /api/v1/veterinarian/species-requests` con multipart (nombre común, científico, origen, hábitat, foto binaria), entonces:
  - Valida nombres (requeridos, máx. 150 caracteres).
  - Valida foto (JPG o PNG, máx. 5 MB).
  - Rechaza si nombre común existe en `species` o en `species_requests` con estado `submitted`/`accepted`.
  - Rechaza si foto es corrupta o formato inválido.
  - Responde `201` si es válido; `422` si hay error de validación; `401` si sesión inválida.

- **CA-02:** Ante `201`, la respuesta incluye `id`, `status` (`submitted`), `created_at`; la foto se guarda en `media/species-requests/{id}.{ext}` (ruta privada, no expuesta por URL).

- **CA-03:** Ante `422`, la respuesta incluye mensajes en español: «Nombre común requerido.», «La especie ya fue solicitada.», «No se pudo procesar la foto.» (según corresponda).

- **CA-04:** La foto se valida: MIME type (`image/jpeg`, `image/png`), tamaño máximo 5 MB, dimensiones mínimas 400x300 px (opcional, a decidir con diseño).

### Listado y detalle (administración)

- **CA-05:** Dado `zoo-admin` con `species.review`, cuando llama `GET /api/v1/admin/species-requests?status=submitted`, entonces lista solicitudes paginadas (10 por página), ordenadas por `created_at` descendente, con campos: `id`, `common_name`, `scientific_name`, `status`, `created_at`, `veterinarian_name` (del `created_by`); no incluye la foto en el JSON.

- **CA-06:** Dado un `id` válido, cuando llama `GET /api/v1/admin/species-requests/{id}`, entonces responde `200` con:
  - `id`, `common_name`, `scientific_name`, `origin`, `habitat`, `status`, `created_at`, `veterinarian_name`, `rejection_reason` (si aplica).
  - Sin URL de foto en el JSON; la foto se sirve por ruta autenticada `GET /api/v1/admin/species-requests/{id}/image` (binario, con `memories.review` y 2FA).

- **CA-07:** Dado sin permiso `species.review`, cuando llama cualquier endpoint de solicitudes, responde `403`.

### Aceptación

- **CA-08:** Dado una solicitud en `submitted`, cuando llama `POST /api/v1/admin/species-requests/{id}/accept`, entonces:
  - Crea un registro en `species` con los datos (`common_name`, `scientific_name`, `origin`, `habitat`).
  - La foto se copia de `media/species-requests/{id}` a `media/species/{species_id}.{ext}` (pública).
  - Actualiza solicitud a status `accepted`, guarda `reviewed_by` y `reviewed_at`.
  - Responde `200` con la especie creada.
  - Registra auditoría: "Especie solicitada por {vet} aceptada por {admin}".

- **CA-09:** Dado una solicitud no en `submitted`, cuando intenta aceptar, responde `422`: «Esta solicitud ya fue revisada.»

### Rechazo

- **CA-10:** Dado una solicitud en `submitted`, cuando llama `POST /api/v1/admin/species-requests/{id}/reject` con cuerpo `{rejection_reason}` (requerido, 1-500 caracteres), entonces:
  - Actualiza solicitud a status `rejected`.
  - Guarda `rejection_reason`, `reviewed_by`, `reviewed_at`.
  - Borra la foto de `media/species-requests/{id}`.
  - Responde `200`.
  - Registra auditoría: "Especie solicitada rechazada: {motivo}".

- **CA-11:** Ante motivo faltante o fuera de rango, responde `422`: «Motivo requerido (1-500 caracteres).»

### Transversales

- **CA-12:** Dado cualquier `401` en estas rutas, responde sin sesión válida. Dado cualquier `403`, responde sin permiso.

- **CA-13:** Dada la suite de PHPUnit, cuando se ejecuta `php artisan test`, entonces corre contra `arca_pruebas` y existe al menos un test que nombra cada CA-01 a CA-12.

## Reglas de negocio

- **RN-01:** Solo `veterinarian` puede enviar; solo `zoo-admin` (con `species.review` y 2FA) puede revisar. Ningún otro rol tiene acceso.

- **RN-02:** Estados válidos: `submitted`, `accepted`, `rejected`. Transiciones: `submitted` → `accepted` o `rejected`; terminal.

- **RN-03:** Nombre común es único entre `species` publicadas y solicitudes `submitted`; permite duplicados en `rejected`.

- **RN-04:** Foto se almacena privada en `media/species-requests/` mientras está pendiente; se copia a `media/species/` al aceptar; se borra del `requests/` al rechazar.

- **RN-05:** La API es la única autoridad de transiciones de estado; el dashboard solo presenta y solicita, no calcula.

- **RN-06:** Mensajes en español; identificadores, rutas y campos en inglés (Constitución VI).

- **RN-07:** Solicitudes rechazadas no se muestran en la lista de la PWA ni en el dashboard del veterinario (feedback solo administrativo).

- **RN-08:** Foto binaria se entrega solo por ruta autenticada `admin.species-requests.image` (análogo a `admin.memories.image` de `api-013`).

## Datos, privacidad y auditoría

- Solicitud pendiente es privada: foto no accesible por URL pública.
- Especie aceptada es pública: foto y datos visibles en el catálogo.
- Auditoría registra: veterinario creador, admin revisor, timestamp, estado, motivo de rechazo.
- No requiere consentimiento adicional del veterinario (obra por encargo).

## Flujos y errores

1. Veterinario envía solicitud con foto → `201` si válido.
2. `zoo-admin` lista solicitudes `submitted` → filtro por estado.
3. Abre detalle → ve foto por ruta autenticada, datos.
4. Acepta → especie publicada en catálogo.
5. Rechaza con motivo → solicitud rechazada, foto borrada.
6. Veterinario no ve ningún resultado del rechazo (no hay feedback).

## Dependencias, riesgos y preguntas

- **Dependencias:**
  - DBR propia para tabla `species_requests` (similar a `visitor_memories` de DBR-012).
  - `api-013` para almacenamiento de imágenes (discos, rutas autenticadas).
  - `dashboard-009` para interfaz de revisión.
  - Permiso `species.review` nuevo (añadir a `RolesAndPermissionsSeeder`).

- **Riesgos:**
  - Sin lista de seguimiento, veterinario desconoce el resultado.
  - Foto no borrada en caso de error después de la decisión → riesgo de huérfanos.
  - Validación de formato de foto requiere librería (¿imagick/gd?).

- **Preguntas abiertas:**
  1. ¿La solicitud rechazada se borra después de X días automáticamente?
  2. ¿El veterinario debe recibir notificación de aceptación (email, aviso en PWA)?
  3. ¿Qué campos adicionales necesita la especie (dieta, longevidad, características)?

## Revisión

- Aprobadores y fecha: (pendiente)
- Estado: Borrador (requiere validación técnica y DBR antes de En progreso)
