# Momentos para recordar · Guía de contrato para la app móvil

- App dueña de esta guía: `api` (referencia para `mobile`)
- Apps/paquetes afectados: `mobile` (consumidor, specs `mobile-010` y `mobile-004`), `api` (`api-010`, `api-012`, `api-013`, `api-004`), `packages/api-client` (métodos y tipos del visitante)
- Estado: **Borrador**. Esta guía no es una spec ni aprueba nada. `api-010` está **Aprobada** (2026-11-12, Jonathan) con plan y tasks pendientes. La parte móvil espera a `mobile-010`, que sigue en **Borrador** (su aprobación funcional es de otra persona), y a su plan y tasks.
- Fuente de verdad: las specs. Si esta guía y una spec difieren, manda la spec y esta guía se corrige.
- Fecha: 2026-11-12
- Responsable backend: Jonathan (`api-010`). `api-012` y `api-013` tienen el responsable backend «por definir» en su spec.
- Aprobación funcional de `api-010`: Jonathan (responsable de backend), 2026-11-12. La de `mobile-010` sigue pendiente de Aksel.
- Encargado de la app móvil: por confirmar (la app la desarrolla otra persona).

## 0. Cómo leer esta guía

- Sin otra indicación, los CA-xx y RN-xx citados son de `api-010`. Los de `mobile-010` se citan como «mobile-010 CA-xx».
- «Pendiente / por confirmar con backend» marca lo que las specs no fijan. No se implementa nada de eso hasta tener respuesta. La lista consolidada está en la sección 10.
- Los textos entre comillas latinas (« ») son literales de las specs. Los textos de la app (`mobile-010`) son de la app.

## 1. Flujo de momentos desde el visitante

1. El visitante entra al módulo «Momentos» (entrada delegada al encargado de móvil; `mobile-010` P8 / Q1).
2. Si la lista trae `meta.can_submit` falso o `meta.open_request_id` no nulo, la app no ofrece el formulario de envío (`mobile-010` CA-14, CA-15).
3. Elige una imagen. El permiso de galería se pide solo en ese momento (`mobile-010` CA-01, RN-08). La validación local de tipo y tamaño es ayuda; la API decide (`mobile-010` CA-03, RN-04).
4. Escribe la opinión (opcional, ver divergencia D1 en la sección 7), marca la casilla de consentimiento y pulsa «Enviar petición» (`mobile-010` CA-02, CA-05).
5. Con 201, la app muestra la petición como «Enviada» con el texto «Tu petición se envió. El zoológico la revisará; todavía no está publicada.» (`mobile-010` CA-04). Nunca dice que la foto ya está en el portal.
6. En «Mis momentos», la app consulta su lista con `GET /api/v1/visitor/memories` cada vez que se abre la pantalla (`mobile-010` CA-06, `api-010` CA-06). **No hay notificaciones push ni correo de aviso** (`api-010` «Fuera de alcance»; `mobile-010` «Fuera de alcance»). La aceptación se ve cuando el visitante abre la app.
7. Si la petición está rechazada, la app muestra el motivo y los campos marcados, y ofrece «Corregir y reenviar» (`mobile-010` CA-07, CA-16). El reenvío es a la misma petición (`api-010` RN-19).
8. Si está aceptada, la app muestra hasta cuándo está publicada según `is_published` y `published_until` (`mobile-010` CA-08, RN-13). La app no calcula el plazo.

### 1.1 Estados

| `status` (API) | Nombre en la app | Qué muestra la app | Fuente |
|---|---|---|---|
| `submitted` | Enviada | Tras el 201: «Tu petición se envió. El zoológico la revisará; todavía no está publicada.» | `api-010` RN-01; `mobile-010` CA-04 |
| `in_review` | En proceso | Etiqueta «En proceso». Texto de la tarjeta: pendiente de definir | `api-010` RN-01, CA-08; `mobile-010` RN-02 |
| `accepted` | Aceptada | Si `is_published` es verdadero: «Publicada en «Momentos para recordar» del portal hasta el {fecha}.». Si es falso: «La publicación terminó el {fecha}. Ya no se muestra en el portal.» | `mobile-010` CA-08; `api-010` CA-06, CA-31 |
| `rejected` | Rechazada | Motivo con la etiqueta «Motivo» (texto de `rejection_reason`). Campos marcados: «La foto no cumple lo indicado» si incluye `image`; «La opinión necesita cambios» si incluye `content`. Botón «Corregir y reenviar» | `mobile-010` CA-07, CA-16; `api-010` RN-04, RN-20 |

Reglas de presentación:
- Una petición que no está `accepted`, o cuyo `is_published` es falso, nunca se presenta como publicada (`api-010` RN-03; `mobile-010` CA-08).
- Ningún error dice que la petición se guardó (`mobile-010` CA-09).
- Los estados llegan como código en inglés. La app los traduce; no los calcula (`api-010` RN-01; `mobile-010` RN-02).
- El motivo y los campos marcados se muestran con texto, no solo con color (`mobile-010` CA-07, CA-12).

## 2. Qué entrega backend y cuándo

### 2.1 Estado real a 2026-11-12

Nada de la API de momentos está implementado. Lo que hay:

| Elemento | Estado | Fuente |
|---|---|---|
| Spec `api-010` | Aprobada (2026-11-12, Jonathan, responsable de backend), incluida la fase 2. Validación técnica/BD aprobada el 2026-11-11. Falta plan y tasks | `apps/api/specs/010-visitor-memory-requests.md` |
| Plan y tasks de `api-010` | **No existen**. Por crear. Ojo: los `010-*` que hay en `apps/api/plan/` y `apps/api/tasks/` son de `010-public-enclosures-read` | `apps/api/plan/`, `apps/api/tasks/` |
| DBR-012 (tablas `visitor_memories` y `visitor_memory_reviews`) | Aplicada en `arca_pruebas` el 2026-11-11. Lista para backend. Staging y producción pendientes | `docs/database/requests/DBR-012-visitor-memories.md`; migración `apps/api/src/database/migrations/2026_11_11_000012_visitor_memories_schema.php` |
| Actions de momentos en la API | No existen. En `apps/api/src/app/Actions/Visitor/` solo hay acciones de cuenta y progreso | — |
| Rutas `visitor/memories*` | No implementadas | `api-010` CA-21 |
| Permiso `memories.review` en el seeder | Pendiente de implementar | `api-010` CA-16; `docs/03-roles-y-permisos.md` |
| Lectura pública `GET /api/v1/memories` | Aprobada (2026-11-12), no implementada; falta plan y tasks. La usa el portal, no la app | `apps/api/specs/012-public-memories-read.md` |
| `DELETE /api/v1/visitor/me` con `memories_policy` | No implementado. `api-004` (Implementada) no tiene ese parámetro | `apps/api/specs/004-visitor-authentication.md` CA-14 |
| Almacenamiento de imágenes (`apps/api/src/media/`) | Carpeta no creada. `api-013` Aprobada (2026-11-12); ADR 0026 Aceptado el 2026-11-12 | `apps/api/specs/013-object-storage-images.md` |
| `packages/api-client/visitor.ts` | Sin métodos de momentos. `deleteAccount(password)` no envía `memories_policy`. La función interna `send` fija `Content-Type: application/json` y serializa el cuerpo con `JSON.stringify`, así que hoy **no soporta multipart** | `packages/api-client/visitor.ts` |

Lo que sí existe y puede usarse para pruebas de sesión, según su spec (no lo he ejecutado): `POST /api/v1/visitor/auth/register`, `POST /api/v1/visitor/auth/email/verify`, `POST /api/v1/visitor/auth/login`, `POST /api/v1/visitor/auth/refresh`, `GET /api/v1/visitor/me` (`api-004`, Implementada el 2026-10-21).

### 2.2 Entregas: división propuesta

> La división en fases no aparece en ninguna spec. La propone la sesión principal y queda **pendiente de aprobación**. Cuando exista `plan/010` y `tasks/010`, ellos la fijarán.

- **Fase 1 (backend, sin contrato móvil):** revisión de `zoo-admin` (`admin.memories.*`, `api-010` CA-07 a CA-16, CA-28, CA-29); plazo de publicación (CA-30, CA-31); seeder de `memories.review` (CA-16); lectura pública (`api-012`); almacenamiento (`api-013`). Es lo que consumen el dashboard y el portal, no la app.
- **Fase 2 (backend para la app):** `POST /api/v1/visitor/memories` (`api-010` CA-01 a CA-05, CA-23 a CA-25), `GET /api/v1/visitor/memories` (CA-06) y `POST /api/v1/visitor/memories/{id}/resubmit` (CA-26, CA-27). Es lo que consume `mobile`.
- **Cambios en otras specs (no son fase 1 ni fase 2):** `api-004` (CA-14 con `memories_policy` y términos en el registro) y `mobile-004` (pantalla de borrado y casilla de términos). Ver sección 5.

### 2.3 Cuándo

- No hay fecha comprometida en ninguna spec.
- La fase 2 espera a que `api-010` esté Aprobada. DBR-012 lo dice así: el backend implementa `api-010` cuando Aksel firme la spec (DBR-012, «Orden de despliegue», paso 4).
- La implementación del backend también exige el plan y las tasks de `api-010`, que hoy no existen.

### 2.4 Cómo probar mientras tanto

- **No hay endpoints de momentos que llamar.** Ningún entorno responde hoy a `visitor/memories`. No hay que simular la API en la app.
- **Tests de la app (Jest):** con un cliente simulado, como indica `apps/mobile/docs/estandares-integracion-api.md` (sección 9) y `mobile-010` CA-13. Las respuestas de prueba viven en los tests, no en el código de la app.
- **Prohibido simular en tiempo de ejecución.** Sin `EXPO_PUBLIC_API_URL` no hay envío real y la app no publica ni simula (`mobile-010` RN-05).
- **Ambiente:** solo `arca_pruebas` para la base de datos de pruebas. Nunca `arca_zoo` (producción). El encargado de móvil no apunta la app a producción.
- **Imágenes de prueba:** solo datos de prueba. Nunca fotos de visitantes reales (`api-013` CA-22, RN-15). Versionar imágenes en git tiene riesgos aceptados (ADR 0026); no subir fotos reales.
- **Ejemplos JSON de respuesta:** Pendiente / por confirmar con backend. Ninguna spec los define. Propuesta sin decidir: que backend los añada a esta guía al implementar la fase 2, con respuestas reales de `arca_pruebas`.

## 3. Contrato de API que consume `mobile`

### 3.1 Reglas comunes

- Prefijo: `/api/v1`. Nombres de ruta en la API (`api-010` CA-21): `visitor.memories.store`, `visitor.memories.index`, `visitor.memories.resubmit`.
- **Autenticación:** Bearer de visitante. Token de acceso Sanctum con ability `visitor`, vigencia 15 minutos; refresh opaco de 30 días con rotación en cada uso (`api-004` CA-05, CA-06). Un token de personal no sirve en estas rutas (`api-004` CA-08). Los visitantes no reciben roles ni permisos de Spatie (`docs/03-roles-y-permisos.md`, «Visitantes con cuenta»).
- **Correo verificado:** sin verificar, la API responde 403 `email_not_verified` (`api-010` CA-05; `api-004` CA-04).
- **Sin URL de imagen:** ninguna respuesta del visitante incluye URL ni ruta de la imagen (`api-010` CA-01, CA-06, CA-17; `api-013` RN-16). La app no pide ni muestra la imagen de una petición en «Mis momentos» (`mobile-010` «Datos, privacidad y auditoría»).
- **Formato de fechas:** Pendiente / por confirmar con backend (ver 3.6).

### 3.2 `POST /api/v1/visitor/memories` · `visitor.memories.store` · 201

Multipart (`api-010` CA-01).

| Campo de entrada | Obligatorio | Regla | Fuente |
|---|---|---|---|
| Archivo de imagen | Sí | JPG (`.jpg`, `.jpeg`), PNG o WebP. Máximo 5 MB, que son 5 120 KB. Una imagen por petición. La API quita los metadatos (incluida la ubicación GPS) y guarda el SHA-256 | `api-010` RN-05, CA-01, CA-02 |
| Opinión | No | Texto plano de 1 a 300 caracteres si se envía. Si no se envía, se guarda como NULL | `api-010` RN-06, CA-03, Pregunta 7 |
| Casilla de consentimiento | Sí | Debe estar marcada. Se guarda `consent_at` | `api-010` CA-04, RN-08 |

- **Nombres de los campos de entrada:** Pendiente / por confirmar con backend. La spec usa `errors.image`, `errors.opinion` y `errors.consent` como claves de error, lo que sugiere `image`, `opinion` y `consent`, pero no fija los nombres de entrada.
- **Versión de los términos:** la spec dice que la API guarda `terms_version` con el valor de `MEMORIES_TERMS_VERSION` (`api-010` RN-23). **No dice que la app la envíe.** Pendiente / por confirmar con backend.

Respuesta 201 (`api-010` CA-01): `id`, `status` (`submitted`), `opinion` (texto o NULL), `created_at` y `resubmitted_count` (0). Sin URL de imagen.

### 3.3 `GET /api/v1/visitor/memories` · `visitor.memories.index` · 200

Definido en `api-010` CA-06.

- Solo las peticiones de la cuenta activa, de la más reciente a la más antigua, con un máximo de 50 (`api-010` RN-11). No hay paginación en esta versión.
- Campos por elemento: `id`, `status`, `opinion`, `created_at`, `reviewed_at`, `resubmitted_count`.
- Si `status` es `rejected`: además `rejection_reason` y `rejected_fields` (lista con `image`, `content` o ambos; `api-010` RN-20).
- Si `status` es `accepted`: además `published_until` e `is_published`. `is_published` es verdadero mientras `published_until` sea posterior a ahora (`api-010` CA-06, CA-31). El plazo lo fija la API al aceptar (`MEMORIES_PUBLICATION_DAYS`, 7 días por defecto desde el 2026-11-12; `api-010` RN-21). La app no lo calcula ni lo conoce: muestra `published_until` tal como llega.
- Bloque `meta`: `can_submit`, `next_submission_at` (fecha desde la que puede enviar, o `null` si puede ahora) y `open_request_id` (id de la petición abierta, o `null`).
- No incluye nombres, correos ni datos del revisor (`api-010` CA-06).
- No incluye ningún campo de imagen. CA-06 solo enumera los campos anteriores.
- Envoltorio `data` y forma de la lista vacía: Pendiente / por confirmar con backend. La spec no lo fija. La forma `{"data": [...]}` aparece en la lectura pública (`api-012`), no en esta ruta.

### 3.4 `POST /api/v1/visitor/memories/{id}/resubmit` · `visitor.memories.resubmit` · 200

Definido en `api-010` CA-26 y CA-27. Es la misma petición: no crea una nueva.

- Solo si la petición está `rejected` y es del visitante. Efectos: pasa a `submitted`; `resubmitted_count` aumenta en 1; `rejection_reason` y `rejected_fields` quedan en NULL; `consent_at` y `terms_version` se actualizan; el historial conserva la decisión anterior (`visitor_memory_reviews`). **No cuenta para el límite semanal** (RN-17).
- **Reglas según `rejected_fields`** (CA-27):
  - Si incluye `image`: hay que enviar un archivo nuevo y válido. Si su hash coincide con el de la foto rechazada, 422 en `errors.image` con «Sube una foto distinta a la que fue rechazada.».
  - Si incluye `content`: la opinión (sin espacios al inicio y al final) debe ser distinta de la guardada. Si no, 422 en `errors.opinion` con «Cambia la opinión antes de reenviarla.». La opinión debe enviarse.
  - Si solo incluye `content`: la imagen es opcional. Si se envía, sustituye a la anterior.
  - La casilla de consentimiento es obligatoria en todos los casos.
- Respuesta 200: la spec no describe sus campos. Pendiente / por confirmar con backend (se supone la misma forma que el 201, sin confirmar).

### 3.5 Errores

| HTTP y clave | Cuándo | Texto exacto | Fuente |
|---|---|---|---|
| 401 | Sin sesión de visitante | Sin texto definido. Pendiente / por confirmar con backend | `api-010` CA-05 |
| 403 `email_not_verified` | Correo sin verificar | Sin texto definido en `api-010`. Pendiente / por confirmar con backend. La app lleva a la verificación (`mobile-010` CA-09) | `api-010` CA-05; `api-004` CA-04 |
| 404 | Petición inexistente o de otra cuenta (resubmit) | «Petición no encontrada.» | `api-010` CA-26, Flujos y errores |
| 422 `errors.image` | No es JPG, PNG o WebP; pesa más de 5 MB; no se puede procesar | Sin texto definido. Pendiente / por confirmar con backend | `api-010` CA-02 |
| 422 `errors.image` | Reenvío por `image` con la misma foto | «Sube una foto distinta a la que fue rechazada.» | `api-010` CA-27 |
| 422 `errors.opinion` | Opinión de más de 300 caracteres. Sin texto definido | Pendiente / por confirmar con backend | `api-010` CA-03 |
| 422 `errors.opinion` | Reenvío por `content` con la opinión igual | «Cambia la opinión antes de reenviarla.» | `api-010` CA-27 |
| 422 `errors.consent` | Sin la casilla marcada | «Confirma que tienes permiso para compartir esta foto y que aceptas los términos.» | `api-010` CA-04 |
| 422 `errors.open_request` | Ya hay una petición abierta (`submitted`, `in_review` o `rejected`) | «Ya tienes una petición abierta. Espera la revisión o corrígela si fue rechazada.» Incluye `open_request_id`. Dónde va ese campo: pendiente de confirmar | `api-010` CA-24 |
| 422 `errors.status` | Resubmit de una petición que no está `rejected` | «Solo puedes corregir una petición rechazada.» | `api-010` CA-26 |
| 429 `weekly_limit_reached` | Menos de 7 días desde el `created_at` de la última petición nueva | «Solo puedes enviar un momento por semana. Podrás enviar otro a partir del {fecha y hora}.» (zona de `APP_TIMEZONE`). Incluye `next_submission_at` (ISO 8601 UTC) y la cabecera `Retry-After` en segundos | `api-010` CA-23 |
| 413 / 415 | Límites del servidor (tamaño o tipo) | Sin texto en la spec. La app muestra su mensaje de tamaño o formato (`mobile-010` CA-09). Pendiente / por confirmar con backend | `api-010` Flujos y errores; `infra/README.md` |
| 5xx | Fallo de disco u otro | Sin texto definido. No se crea petición ni archivo | `api-010` RN-16 |

Notas sobre los errores:
- El orden de comprobación en el envío es: sesión (CA-05), campos (CA-02 a CA-04), petición abierta (CA-24) y, al final, límite semanal (CA-23) (`api-010` CA-24).
- En dos envíos simultáneos, uno gana y el otro responde 422 (`errors.open_request`) o 429, según el orden del bloqueo (`api-010` CA-25).
- Ninguna respuesta de error debe llevar a la app a decir que la petición se guardó (`mobile-010` CA-09).

### 3.6 Límites que la app debe reflejar

La API decide. La app solo muestra lo que devuelve.

- **Una petición abierta a la vez.** Una rechazada cuenta como abierta y bloquea envíos nuevos hasta que se corrija (`api-010` RN-18, Pregunta 2). No hay cancelación en esta versión (`api-010` «Fuera de alcance»).
- **Un envío nuevo cada 7 días.** La ventana se cuenta desde el `created_at` de la última petición nueva, sea rechazada, revisada o aceptada. Exactamente 7 días después, el envío es válido (`api-010` CA-23, RN-17). La app no calcula la ventana (`mobile-010` RN-11).
- **Reenvíos sin límite de número** (`api-010` RN-19, Pregunta 2). Los reenvíos no abren ni cuentan la ventana semanal.
- **Imagen:** JPG, PNG o WebP; una imagen; máximo 5 MB (5 120 KB) (`api-010` RN-05). `mobile-010` dice «más de 5 MB»: hay que alinear el límite exacto en bytes (divergencia D10).
- **Opinión:** opcional. Si se envía, 1 a 300 caracteres. Texto plano; la API no lo filtra (`api-010` RN-06, «Datos, privacidad y auditoría»).
- **Límite por IP o por dispositivo:** no definido en `api-010` (riesgos). Pendiente.

### 3.7 Lo que la app no recibe ni debe pedir

- Ninguna URL ni ruta de imagen de una petición del visitante (`api-010` CA-01, CA-06).
- Ningún dato de revisión (`reviewed_by`, nombres de personal) ni de otros visitantes (`api-010` CA-06, RN-09).
- Los campos internos (`image_path`, `published_image_path`, `image_sha256`, `rejected_image`, `rejected_content`) no aparecen en la API del visitante. La spec solo expone `rejected_fields` como lista (`docs/database/requests/DBR-012-visitor-memories.md`, «Tabla visitor_memories»).

## 4. Qué debe construir `mobile`

Los CA de esta lista son de `mobile-010`. La app debe cumplirlos cuando `mobile-010` esté Aprobada.

| Pieza | Qué construir | Referencia | Bloqueo |
|---|---|---|---|
| Entrada al módulo | Lugar de entrada en la navegación | `mobile-010` P8 (Q1) | Delegado al encargado de móvil |
| Formulario de envío | Control de imagen, campo de opinión con contador (máximo 300, anunciado a lectores de pantalla), casilla con su texto completo y botón «Enviar petición». El botón se desactiva mientras falten datos o haya bloqueo | `mobile-010` CA-02 | Ver divergencia D1 (opinión) |
| Envío único | Un indicador que tapa la pantalla. Un segundo toque no lanza otra petición | `mobile-010` CA-05; `mobile-004` CA-05 | — |
| Resultado y errores | «Enviada» con su texto. Errores en su campo (422), texto de límite (422 `open_request` y 429), redirección a verificación (401 o 403 `email_not_verified`), mensaje de permiso o de no encontrado (403 y 404), mensaje de tamaño o formato (413 y 415) | `mobile-010` CA-04, CA-09 | Textos de 401, 403, 413 y 415: pendientes |
| Límite semanal y petición abierta | Texto con la fecha, sin formulario hasta esa hora; enlace a su estado si hay petición abierta | `mobile-010` CA-14, CA-15 | Tras la hora de `next_submission_at`, la forma de volver a consultar no está definida (pendiente) |
| Lista «Mis momentos» | Tarjetas con estado en español, consultadas al abrir la pantalla. Solo la cuenta activa | `mobile-010` CA-06, RN-02 | Formato de fechas: pendiente |
| Motivo y campos | Motivo con etiqueta «Motivo». Campos marcados con texto, no solo con color | `mobile-010` CA-07, CA-12 | — |
| Aceptada y plazo | «Publicada … hasta el {fecha}.» o «La publicación terminó el {fecha}…» según `is_published` | `mobile-010` CA-08 | Zona horaria (divergencia D3) |
| Corrección y reenvío | Formulario precargado con la opinión; resalta lo marcado («Cambia la foto: el zoológico no la aceptó.» y «Cambia la opinión: el zoológico pide otro texto.»); pide consentimiento otra vez; llama a `resubmit`. Usa los datos de la lista, sin pedirla otra vez | `mobile-010` CA-16, CA-17, CA-18 | — |
| Sin conexión | «Sin conexión». No guarda la imagen ni la encola. No dice que se envió | `mobile-010` CA-10, RN-06 | — |
| Selector de imágenes | Elegir un archivo del teléfono. **Requiere un ADR aprobado antes de instalar la dependencia** (Constitución I; `mobile-010` RN-10). No existe ADR de selector en `docs/adr/` (búsqueda del 2026-11-12). El ADR 0022 cubre `expo-camera` solo para QR | `mobile-010` P9 (Q2); `docs/adr/0022-expo-camera-qr-scan.md` | Q2 abierta |
| Captura con cámara | Fuera de alcance. Si se quiere, se decide en una revisión de `mobile-010` | `mobile-010` «Fuera de alcance» | — |
| Casilla y términos | Texto completo de la casilla y referencia a los términos. **El texto lo redacta y aprueba el zoológico.** Hasta entonces el texto de referencia no se publica en producción | `mobile-010` RN-07; `api-010` RN-08, RN-23, Pregunta 6 | Q3 abierta |
| Cliente de red | Métodos y tipos de momentos en `packages/api-client/visitor.ts`, y soporte multipart para envío de imagen. Sin lógica de negocio | `mobile-010` «Apps/paquetes afectados»; `api-010` CA-21 | Pendiente: quién lo implementa en el paquete |
| Arquitectura | Pantallas sin red. Hooks como ViewModels. Acceso a la API con `@arca/api-client` (en modo Bearer). Ver divergencia D4 sobre la capa de Repository | `mobile-010` CA-11; `AGENTS.md` raíz (MVVM); `apps/mobile/AGENTS.md` | — |
| Sesión | Tokens solo en `expo-secure-store`. Nada de tokens fuera de ese almacenamiento | `mobile-004` RN-04, CA-12; ADR 0011 | — |
| Diseño | Colores y estilos con `@arca/tokens`. No fijar colores de marca en componentes | `apps/mobile/AGENTS.md`; `AGENTS.md` raíz (tokens semánticos) | — |
| Accesibilidad | Nombres en español en los controles. Estados de envío, errores, límite semanal y campos anunciados. Consentimiento con un toque y su estado anunciado | `mobile-010` CA-12 | Probar con lector de pantalla y dejar evidencia |
| Textos | Todo en español. Identificadores, rutas y campos en inglés | `mobile-010` RN-09; Constitución VI | — |
| Permisos del dispositivo | Pedir galería al elegir la imagen. No leer la galería completa ni guardar copias permanentes | `mobile-010` RN-08 | — |
| Pruebas | Al menos un test Jest por CA-01 a CA-18 de `mobile-010`, con cliente simulado. Cobertura mínima de `mobile-011` | `mobile-010` CA-13; `apps/mobile/specs/011-mobile-service-coverage-ci.md` | — |
| Documentación local | Permisos y flujos de la app en `apps/mobile/docs/` | `apps/mobile/AGENTS.md` | — |

## 5. Cambios en otras specs que tocan a `mobile`

Estas dos specs están **Implementadas**. Cambiarlas exige enmienda aprobada antes de tocar código. Nada de esto está aprobado todavía. Lo autorizó, en principio, la pregunta 5 de `api-010` (2026-11-11): «se avisa a sus responsables antes de aprobar».

### 5.1 `api-004`: `DELETE /api/v1/visitor/me` con `memories_policy`

Estado actual (`apps/api/specs/004-visitor-authentication.md`): CA-14 borra la cuenta con `password` correcta, responde 204 y borra en cascada cuenta, tokens, códigos y progreso.

Cambio que pide `api-010`:
- El cuerpo de `DELETE /api/v1/visitor/me` añade `memories_policy` con valor `keep` o `delete`.
- Es obligatorio solo si el visitante tiene peticiones (`api-010` CA-32). Si falta o tiene otro valor, 422 en `errors.memories_policy`, y no se borra nada.
- **`keep`:** las filas quedan con `visitor_id` en NULL; no se borran; las aceptadas siguen publicadas hasta su vencimiento; los archivos no cambian; las abiertas siguen en revisión. Activitylog registra `visitor-memories-policy-applied` con la elección y el número de filas.
- **`delete`:** las filas reciben `deleted_at` y `visitor_id` en NULL; dejan de aparecer en el portal y en la revisión; los archivos se borran después del commit. Activitylog registra la elección y el número de filas.
- La eliminación física de `visitors` no falla por la clave foránea, porque `visitor_id` tiene `ON DELETE SET NULL` (DBR-012).
- La cascada de `api-004` CA-14 ya no describe todo: los momentos no se borran en cascada, se tratan según la elección.

Cambio de registro (`api-010` Pregunta 5 y divergencia 3): la aceptación de términos en el registro (RN-23). Pendiente / por confirmar con backend: nombre del campo en la petición, dónde se guarda (si en `visitors`, hace falta cambio de DBR-003) y si aplica también a `api-004` CA-01.

Referencias erróneas en `api-010` que hay que corregir al enmendar:
- `api-010` cita «`api-004` CA-14 y RN-10» para el borrado. El RN-10 de `api-004` es la lista de Actions, no la regla de borrado. La regla de borrado está en CA-14 y RN-08.
- `api-010` cita «`api-004` CA-04» para el registro con términos. El registro está en CA-01 y CA-02. CA-04 es el login.

### 5.2 `mobile-004`: pantalla de borrado de cuenta (CA-10 y RN-07)

Estado actual (`apps/mobile/specs/004-visitor-account.md`): CA-10 confirma con la contraseña, llama `DELETE me`, limpia el almacenamiento seguro y la cola local, y vuelve al login. RN-07: «El borrado de cuenta es definitivo e inmediato; la app lo comunica claramente antes de pedir la contraseña.»

Cambio que pide `api-010`:
- Antes de pedir la contraseña, una elección obligatoria **sin opción por defecto** entre conservar (`keep`) y eliminar (`delete`) los momentos, cuando el visitante tiene peticiones (`api-010` CA-32, RN-22).
- El aviso de la sección «Datos, privacidad y auditoría» de `api-010` y su enlace a los términos y condiciones del zoológico.
- RN-07 debe precisar que el borrado de la cuenta es definitivo. Los momentos siguen la elección, no se borran siempre.
- Casilla de términos en el registro (`mobile-004` CA-02), por RN-23 de `api-010`.

Pendiente: **cómo sabe la app que el visitante tiene peticiones**. Opciones que menciona la spec: nada explícito. Posibles caminos: llamar a `GET /api/v1/visitor/memories` antes de borrar (la lista tiene un máximo de 50 y no pagina), o que la API responda 422 `errors.memories_policy` y la app pida la elección entonces. Decidir antes de la enmienda.

Nota: el texto del aviso está marcado en `api-010` como «propuesta de texto, aprobado por el zoológico», pero su Pregunta 6 dice que el texto es de referencia hasta que el zoológico lo apruebe (divergencia D8).

### 5.3 Quién avisa a quién

| Quién | A quién | Motivo |
|---|---|---|
| Jonathan, responsable de `api-010` | Aksel | Aksel aprobó `api-004` y `mobile-004` y es el aprobador funcional de `mobile-010` (`api-010` Pregunta 5) |
| Jonathan | Víctor Adrián, responsable de BD de `api-004` (según su spec) | Si la aceptación de términos necesita columna, hace falta DBR (Constitución V) |
| Aksel | Encargado de móvil | Enmienda de `mobile-004` y cambios en el cliente |
| Responsable de backend de `api-004` | Aksel | Enmienda de `api-004`. La spec no nombra responsable de backend (pendiente) |

## 6. Responsabilidades, dependencias y preguntas

### 6.1 Tabla de responsabilidades

| Elemento | Responsable | Estado a 2026-11-12 | Necesario antes de |
|---|---|---|---|
| Spec `api-010` | Jonathan (backend; aprobación funcional 2026-11-12) | Aprobada 2026-11-12. Falta plan y tasks | Implementar la fase 2 y la app |
| Plan y tasks de `api-010` | Jonathan | No existen | Implementar |
| Spec `mobile-010` | Aksel (aprobación funcional); encargado de móvil | Borrador. «Aprobado por: (pendiente, nombre del compañero)» | Implementar la app |
| Plan y tasks de `mobile-010` | Encargado de móvil | No existen (por crear) | Implementar la app (`apps/mobile/AGENTS.md`: trabaja solo con spec aprobada y tareas) |
| DBR-012 | Víctor Adrián (BD) | Aplicada en `arca_pruebas` 2026-11-11. Lista para backend. Staging y producción pendientes | Fase 2 |
| `api-013` | Jonathan (solicitante y responsable de backend) | Aprobada 2026-11-12. ADR 0026 Aceptado 2026-11-12 | Subir imágenes de momentos a `media/`; fase 1 |
| `api-012` | Jonathan (responsable de backend) | Aprobada 2026-11-12. Solo lo consume el portal | Portal, no la app |
| ADR 0026 | Jonathan | Aceptado 2026-11-12 | Almacenamiento de momentos |
| ADR 0027 | Jonathan | Aceptado 2026-11-12. Excepción para la galería del portal | Portal (`web-010`), no la app |
| Enmienda de `api-004` | Aksel (aprobador de `api-004`); backend por confirmar | No iniciada | `DELETE` con `memories_policy` y términos en el registro |
| Enmienda de `mobile-004` | Aksel | No iniciada | Pantalla de borrado y casilla de términos |
| ADR de selector de imágenes | Encargado de móvil propone; aprobador por confirmar | No existe | Instalar el selector (Q2) |
| Texto de la casilla y de los términos | Zoológico (redacta y aprueba) | Pendiente | Producción (`api-010` Pregunta 6; `mobile-010` RN-07) |
| `packages/api-client/visitor.ts` | Por confirmar | Sin métodos de momentos. Sin multipart. `deleteAccount` sin `memories_policy` | Cualquier llamada de la app a momentos |
| Seeder de `memories.review` | Jonathan | Pendiente | Dashboard (`dashboard-008`), no la app |

### 6.2 Dependencias de specs y ADR

- `api-004` (sesión y correo verificado; Implementada), `api-007` (2FA y Activitylog; solo para revisión), `api-008` (validación de imagen y retiro de metadatos), `api-011` (CORS y paginación; solo portal), `api-012`, `api-013`.
- DBR-012 (requiere DBR-001 y DBR-003).
- ADR 0001 (Sanctum), ADR 0011 (sesión móvil y `expo-secure-store`), ADR 0004 (Expo y React Native), ADR 0022 (`expo-camera` solo para QR), ADR 0026 y 0027.
- Ningún ADR autoriza un selector de imágenes. Hace falta uno antes de instalarlo.

### 6.3 Preguntas abiertas que dependen de `mobile` (`mobile-010`)

- **Q1 (P8): entrada del módulo en la app.** Delegada al encargado de móvil. Decidir antes de escribir el plan de `mobile-010`.
- **Q2 (P9): selector de imágenes.** Delegado al encargado de móvil. Requiere ADR aprobado. Sin ADR no hay selector de archivos.
- **Q3: texto de la casilla y de los términos.** Lo aprueba el zoológico (`api-010` Pregunta 6). Hasta entonces, el texto es de referencia y no se publica en producción.

## 7. Divergencias conocidas (no corregidas)

Esta guía no corrige specs. Estas divergencias quedan para la revisión de `api-010` y de `mobile-010`.

- **D1. Opinión: obligatoria o no.** `mobile-010` (Decisiones tomadas, CA-02, Flujos 4, «Problema y contexto») pide opinión y bloquea el botón sin ella. `api-010` (Pregunta 7, RN-06, CA-01, CA-03) la hace opcional desde el 2026-11-11. `mobile-010` no se ha actualizado.
- **D2. Quién envía la versión de términos.** La spec dice que la API la guarda desde `MEMORIES_TERMS_VERSION` (RN-23). Sin embargo, el contrato de envío de la app no la menciona. Pendiente de confirmar.
- **D3. Zona horaria de las fechas.** `mobile-010` CA-08 dice «en la zona horaria de la API (`api-010` CA-06)». `api-010` CA-06 no fija zona. CA-23 usa `APP_TIMEZONE` solo en el texto del mensaje, y `next_submission_at` va en ISO 8601 UTC. Falta definir cómo se formatean las fechas en la app.
- **D4. Capa de Repository.** `mobile-010` CA-11 dice «un hook ViewModel que llama a `@arca/api-client`». `mobile-004` CA-12 y `apps/mobile/docs/estandares-integracion-api.md` (sección 2) piden «ViewModel → Repository → `@arca/api-client`». Hay que elegir una.
- **D5. ADR de `expo-camera`.** `mobile-010` RN-10 dice que el ADR 0004 cubre `expo-camera`. El ADR que lo autoriza para QR es el 0022. `apps/mobile/AGENTS.md` exige specs propias para cámara. Es un tema interno de `mobile-010`.
- **D6. Imprecisiones en las referencias de `api-010`** al borrado de cuenta y al registro (ver 5.1).
- **D7. Eliminación de la cuenta: cómo se sabe si hay peticiones.** `api-010` CA-32 habla de peticiones «de cualquier estado, incluidas las eliminadas lógicamente». `mobile-010` dice que la app pide `memories_policy` «cuando el visitante tiene peticiones». No hay forma definida para saberlo (ver 5.2).
- **D8. Etiqueta del aviso de borrado.** `api-010` «Datos, privacidad y auditoría» dice «propuesta de texto, aprobado por el zoológico», y Pregunta 6 dice que el texto es de referencia hasta su aprobación. Son contradictorias.
- **D9. Numeración cruzada.** `mobile-010` cita «pregunta 3» para el texto de la casilla. `api-010` lo llama «pregunta 6» (y «P7» en su historial). Son referencias del mismo tema con numeración distinta.
- **D10. Límite de imagen.** `api-010` RN-05: 5 MB, que son 5 120 KB. `mobile-010` CA-03: «más de 5 MB». Alinear el límite exacto en bytes en las dos specs.
- **D11. Comprobación de «foto distinta» en el reenvío.** `mobile-010` CA-17 comprueba solo que se eligió un archivo nuevo. La comparación por hash es de la API (`api-010` CA-27). Es coherente, pero conviene que la app no prometa más de lo que valida.
- **D12. Texto de «En proceso».** `mobile-010` RN-02 da el nombre del estado, pero ninguna spec define el texto de la tarjeta.

## 8. Lista de verificación para el encargado de móvil

Antes de abrir el PR de `mobile-010`:

- [ ] `api-010` está **Aprobada** (por Jonathan, 2026-11-12) y su plan y tasks existen.
- [ ] `mobile-010` está **Aprobada** (aprobación funcional) y tiene `plan/` y `tasks/` con el mismo `NNN-slug`.
- [ ] Q1, Q2 y Q3 resueltas (ver 6.3). Si Q2 implica una dependencia, el ADR está aprobado antes de instalarla.
- [ ] Divergencias D1 a D4 resueltas en las specs, no solo en el código.
- [ ] Los textos de la casilla y de los términos están aprobados por el zoológico, o la app no se publica con el texto de referencia (`mobile-010` RN-07).
- [ ] Cada CA-01 a CA-18 de `mobile-010` tiene al menos un test Jest que lo nombra (CA-13). Cobertura mínima según `mobile-011`.
- [ ] Los tests usan un cliente simulado. Ningún test hace red real.
- [ ] Ningún componente, pantalla ni hook usa `fetch` ni `axios` (`mobile-010` CA-11).
- [ ] Ningún token sale de `expo-secure-store` (`mobile-004` RN-04).
- [ ] El permiso de galería se pide solo al elegir la imagen (`mobile-010` RN-08).
- [ ] Textos en español. Identificadores en inglés (`mobile-010` RN-09).
- [ ] Accesibilidad probada con lector de pantalla en dispositivo, con evidencia (`mobile-010` CA-12). Limitaciones del simulador registradas (`apps/mobile/AGENTS.md`).
- [ ] La app no apunta a producción. Solo se usa `EXPO_PUBLIC_API_URL` de `arca_pruebas`. No hay secretos en el paquete (`apps/mobile/AGENTS.md`, RN-05 de `mobile-004`).
- [ ] `packages/api-client` no tiene lógica de negocio; el cambio multipart y los métodos de momentos están en el cliente, no en las pantallas.
- [ ] `apps/mobile/docs/` actualizado con permisos y flujos de la app (`apps/mobile/AGENTS.md`).
- [ ] Ejecutado `/verify` para `apps/mobile` (lo ejecuta quien tenga shell; esta guía no lo ejecuta).
- [ ] El PR enlaza `mobile-010`, su plan y sus tasks; el commit cita `mobile-NNN` (`AGENTS.md` raíz, paso 5).
- [ ] Si la app necesita `api-004` o `mobile-004` cambiados, esos cambios están aprobados antes del PR.

## 9. Referencias

Documentos de referencia (rutas relativas a `apps/api/docs/`):

- Reglas: [CONSTITUTION.md](../../../CONSTITUTION.md), [AGENTS.md](../../../AGENTS.md), [docs/05-flujo-sdd.md](../../../docs/05-flujo-sdd.md), [apps/mobile/AGENTS.md](../../mobile/AGENTS.md), [apps/api/AGENTS.md](../AGENTS.md), [docs/03-roles-y-permisos.md](../../../docs/03-roles-y-permisos.md).
- Specs de la API: [api-004](../specs/004-visitor-authentication.md), [api-010](../specs/010-visitor-memory-requests.md), [api-012](../specs/012-public-memories-read.md), [api-013](../specs/013-object-storage-images.md).
- Specs de la app: [mobile-010](../../mobile/specs/010-visitor-memory-requests.md), [mobile-004](../../mobile/specs/004-visitor-account.md), [mobile-011](../../mobile/specs/011-mobile-service-coverage-ci.md).
- Plan y tasks de la app de cuenta (referencia): [mobile-004 plan](../../mobile/plan/004-visitor-account.md), [mobile-004 tasks](../../mobile/tasks/004-visitor-account.md).
- Estándares de integración móvil: [estandares-integracion-api.md](../../mobile/docs/estandares-integracion-api.md).
- Contrato de sesión del visitante: [visitante-autenticacion.md](visitante-autenticacion.md).
- ADR: [0001](../../../docs/adr/0001-api-central-laravel.md), [0004](../../../docs/adr/0004-mobile-react-native.md), [0011](../../../docs/adr/0011-visitor-identity-and-mobile-session.md), [0022](../../../docs/adr/0022-expo-camera-qr-scan.md), [0026](../../../docs/adr/0026-object-storage-s3-images.md), [0027](../../../docs/adr/0027-dynamic-public-memories-gallery.md).
- Base de datos: [DBR-003](../../../docs/database/requests/DBR-003-visitor-accounts.md), [DBR-012](../../../docs/database/requests/DBR-012-visitor-memories.md).
- Despliegue: [infra/README.md](../../../infra/README.md) (límites de subida y medios de prueba).
- Cliente: [packages/api-client/visitor.ts](../../../packages/api-client/visitor.ts).
- Consumidores que no son la app: [dashboard-008](../../dashboard/specs/008-memory-moderation.md), [web-010](../../web/specs/010-dynamic-memories.md).

Por crear (no existen todavía):

- `apps/api/plan/010-visitor-memory-requests.md` y `apps/api/tasks/010-visitor-memory-requests.md` (por crear).
- `apps/mobile/plan/010-visitor-memory-requests.md` y `apps/mobile/tasks/010-visitor-memory-requests.md` (por crear).
- Enmiendas de `api-004` y `mobile-004` (por crear).
- ADR de selector de imágenes (por crear, si se elige una librería).

## 10. Pendiente / por confirmar con backend

Lo que las specs no fijan. No implementar sin respuesta.

1. Nombres de los campos de entrada del envío (archivo, opinión, casilla) y del reenvío.
2. Si la app envía `terms_version` o la API la toma solo de `MEMORIES_TERMS_VERSION` (D2).
3. Envoltorio `data` de la lista y forma de la lista vacía.
4. Forma de la respuesta 200 del reenvío.
5. Textos de 401, 403 `email_not_verified`, 413 y 415, y los 422 de `errors.image` y `errors.opinion` que no tienen literal.
6. Dónde va `open_request_id` en el 422 y `next_submission_at` en el 429 (clave de error y estructura del cuerpo).
7. Formato de fechas y zona horaria en las respuestas (D3).
8. Cómo sabe la app que el visitante tiene peticiones antes de borrar la cuenta (D7 y 5.2).
9. Dónde se guarda la aceptación de términos en el registro y si requiere DBR (5.1).
10. Texto de la tarjeta «En proceso» (D12).
11. Texto de los términos y de la versión visible: `api-004` CA-15 sirve solo el aviso de privacidad; no hay endpoint para los términos de momentos.
12. Límite por IP o por dispositivo en los envíos (no definido en `api-010`).
13. Cómo vuelve a consultar la app cuando pasa la hora de `next_submission_at` (`mobile-010` CA-14).
14. Quién implementa los métodos y el multipart en `packages/api-client/visitor.ts`.
15. Responsable de backend de `api-004` (la spec no lo nombra).
16. Fase 1 y fase 2: aprobar o cambiar la división de la sección 2.2.
17. Ejemplos JSON reales de respuesta para pruebas (sección 2.4).
