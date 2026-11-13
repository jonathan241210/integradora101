# 005 · species-request-submission (solicitud de publicación o actualización de especie)

- App dueña: `pwa`
- Apps/paquetes afectados: `pwa` (formulario, selector, lista «Mis solicitudes»), `api` (`api-014` species-requests: selector, envío, lista propia y reglas), `packages/ui`
- Estado: Borrador
- Solicitante / responsable funcional: (por designar)
- Aprobación funcional: (pendiente)

## Historial del cambio de modelo (2026-11-11 y 2026-11-12)

- **Versión anterior (incorrecta):** el veterinario registraba una especie **nueva** y la Dirección la creaba al aceptarla.
- **Modelo actual (2026-11-11):** el veterinario **elige una especie existente** de una lista (selector) y envía una **solicitud de publicación** con foto, tipo de animal, selección de la ficha pública y **correcciones** a los datos de la especie. No puede proponer una especie nueva desde aquí.
- **Segunda ronda (2026-11-11):** el tipo de animal es **obligatorio**; el nombre común no es editable; el envío puede ser de **actualización** (`update`) sobre una especie publicada, y la foto es opcional en ese caso; se añade la lista **«Mis solicitudes»** del veterinario (CA-16 a CA-18), que sustituye la afirmación anterior de que no había seguimiento (antes CA-07).
- **Tercera ronda (2026-11-12):** el veterinario también puede enviar una **actualización sobre una especie despublicada** (la Dirección la verá en su bandeja con la etiqueta «Especie despublicada»). El selector y «Mis solicitudes» muestran el estado «Despublicada» y permiten enviar. Una especie con solicitud viva (`pending`) sigue bloqueada.
- **Cuarta ronda (2026-11-12, decisiones del usuario):** el motivo de rechazo se muestra **completo**, máximo 500 caracteres, sin truncar (CA-18; se descarta el extracto de 120 caracteres). Eliminar la publicación de una especie hace que sus solicitudes dejen de aparecer en «Mis solicitudes» (`api-014` CA-38; CA-16). Ver la pregunta 1.
- **Numeración:** CA-01 a CA-15 conservan su número. Cambian de contenido CA-01 a CA-07, CA-09, CA-12, CA-13, CA-14 y CA-18 (cuarta ronda). Nuevos: CA-16 (lista «Mis solicitudes»), CA-17 (estados de la lista), CA-18 (motivo en la lista y en el selector) y CA-19 (sesión, errores y cobertura de la lista propia).

## Decisiones tomadas

- **Especie existente, no nueva.** El formulario no tiene alta de especie. El selector lista las especies de `api-014` CA-26.
- **El tipo de envío lo decide la API.** El veterinario no elige si envía una primera publicación o una actualización. La PWA muestra el `next_request_type` que devuelve la API (`publish` o `update`) y no calcula elegibilidad (RN-07).
- **Tipo de animal obligatorio (decidido 2026-11-11).** Selector con la lista cerrada de DBR-004 (CA-12). Sin este campo la especie publicada quedaría sin tipo y no contaría en las misiones ni en el filtro de TulanPedia.
- **Foto obligatoria solo en la primera publicación.** En una actualización es opcional: sin foto nueva, la actualización conserva la foto publicada (`api-014` CA-04, CA-32).
- **Foto reemplazable por la Dirección.** El veterinario no edita la solicitud después de enviarla. La Dirección puede cambiar la foto antes de decidir (`api-014` CA-23).
- **Ficha pública.** El veterinario elige qué mostrar, con los predeterminados marcados (CA-09 a CA-11). En una actualización, las casillas se precargan con la selección de la especie publicada. Nombre común y foto siempre se muestran.
- **Correcciones precargadas (CA-14).** Nombre científico, hábitat, área de distribución natural (campo `origin`) y tipo de animal vienen con los valores actuales de la especie y son editables. La etiqueta «Área de distribución natural» es deliberada: DBR-013 (2a=A) guarda `origin` y, al aceptar, lo copia a `species.distribution`, que es el área natural de la especie, no la procedencia del ejemplar. El nombre común no es editable (decidido 2026-11-11).
- **Estado de publicación en el selector (CA-13).** Ver la tabla de estados más abajo.
- **Avisos en v1 por consulta (decidido 2026-11-11).** No hay push ni correo. El veterinario ve el resultado en «Mis solicitudes» (CA-16) y el motivo completo en el selector (CA-18). Las alternativas de push o correo son opción futura (ver «Riesgos»).
- **Foto en `media/species-requests/`** durante pruebas (ADR 0026, enmienda de 2026-11-11). La API no devuelve su URL y la PWA no la muestra.

### Estados del selector (2026-11-12)

| Estado (`publication_status`) | Texto en el selector | ¿Se puede elegir? | Tipo de envío (`next_request_type`) |
|---|---|---|---|
| `not_published` | «Disponible» | Sí | `publish` → «Primera publicación» |
| `published` | «Publicada» | Sí | `update` → «Actualización» |
| `unpublished` | «Despublicada» | Sí | `update` → «Actualización» |
| `pending` | «Pendiente de revisión» | No | `null` |

La PWA se guía por `next_request_type`: si viene `null`, la opción aparece deshabilitada. La regla es de la API (`api-014` CA-26, CA-27).

## Problema y contexto

El módulo veterinario (`pwa`) registra animales individuales (`pwa-004`), y cada alta crea una especie por nombre libre con datos de relleno. No hay un paso en el que el veterinario proponga que una especie existente aparezca en el catálogo público (TulanPedia, `web-011`) con su foto, su tipo de animal y datos corregidos, ni que proponga corregirla después.

Esta spec añade ese paso. La Dirección del Zoológico (`zoo-admin`) revisa la solicitud en el dashboard (`dashboard-010`, `api-014`) y la publica, la rechaza, o la acepta sin publicar cuando la especie está despublicada.

## Objetivos

- Que el veterinario elija una especie existente de una lista, con su estado de publicación.
- Que envíe la solicitud con foto (cuando es primera publicación), tipo de animal, selección de la ficha y correcciones, sin crear especies.
- Que pueda proponer la actualización de una especie publicada o despublicada.
- Que la solicitud quede pendiente, sin publicarse automáticamente.
- Que el veterinario consulte en «Mis solicitudes» el estado y el motivo completo de cada una de sus solicitudes.

## Fuera de alcance

- Crear una especie nueva desde la PWA (decisión tomada; la especie debe existir antes).
- Edición de la solicitud por el veterinario después de enviarla, y cancelación de una solicitud.
- Enviar una solicitud sobre una especie con solicitud viva (`pending`).
- Notificaciones push o correo (opción futura; ver «Riesgos»).
- Solicitud de animales individuales (solo especies para el catálogo).
- Cambio del alta de animal (`pwa-004`): es un seguimiento recomendado, en una spec aparte.
- Exportación o descarga de fotos desde la PWA.
- Integración con el módulo de diagnósticos.
- Cambios de esquema de base de datos (dependen de `api-014` y DBR-013).
- Editar o despublicar especies desde la PWA (acciones de la Dirección en `dashboard-010`).

## Actores y historias de usuario

| Actor/rol | Necesidad |
|---|---|
| `veterinarian` | Elegir una especie existente y enviar una solicitud de publicación o de actualización; consultar sus solicitudes y su resultado |
| `zoo-admin` | Revisar, corregir, publicar, aceptar sin publicar o rechazar en el dashboard (`dashboard-010`) |
| `admin` | Sin acceso a esta función |
| Visitante | No ve solicitudes; solo el catálogo publicado (`api-015`, `web-011`) |

- Como veterinario, quiero elegir una especie existente de la lista y proponer su publicación con foto, tipo y datos corregidos, para que la Dirección la revise antes de publicarla.
- Como veterinario, quiero proponer la actualización de una especie publicada o despublicada, para corregir su foto o sus datos.
- Como veterinario, quiero ver en «Mis solicitudes» si cada solicitud está pendiente, publicada o rechazada, y por qué, para saber qué hacer después.

## Criterios de aceptación

### Selector y formulario

- **CA-01 (formulario con selector de especie):** Dado el formulario «Solicitar publicación de especie», cuando carga, entonces muestra: «Especie» (selector con las especies de `api-014` CA-26 y su estado de CA-13), el tipo de envío que indica la API («Primera publicación» o «Actualización»), los campos de corrección «Nombre científico», «Hábitat» y «Área de distribución natural» (campo `origin`, CA-14), «Tipo de animal» (selector, CA-12), «Foto» (obligatoria solo en primera publicación, CA-04) y el bloque «Qué mostrar en la ficha pública» (CA-09). El nombre común aparece como texto de solo lectura al elegir la especie; no es un campo editable (CA-15). Cada campo valida y muestra su error en español.
  - Verificación: test de Vitest que nombra CA-01.

- **CA-02 (envío):** Dados datos válidos, una especie elegible (`next_request_type` no nulo) y una foto soportada cuando es necesaria, cuando se envía el formulario, entonces la PWA llama a `POST /api/v1/veterinarian/species-publication-requests` con Sanctum y CSRF, incluye la foto como multipart cuando hay una, y conserva los datos del formulario si hay error HTTP.
  - Verificación: test de Vitest con cliente simulado que nombra CA-02.

- **CA-03 (respuestas):** Ante `201`, la PWA limpia el formulario, vuelve a cargar el selector (la especie enviada pasa a «Pendiente de revisión») y muestra el aviso que corresponde al tipo de envío:
  - `publish`: «Solicitud enviada. La Dirección la revisará.»
  - `update`: «Actualización enviada. La ficha publicada no cambia hasta que la Dirección la acepte.»
  
  Ante `422`, muestra cada error junto a su campo en español y conserva los datos. Ante `401` (sesión vencida), muestra «Tu sesión expiró.» sin limpiar y sin informar éxito. Ante error de red o `500`, muestra error genérico sin limpiar.
  - Verificación: test de Vitest con cliente simulado que nombra CA-03.

- **CA-04 (foto):** El tamaño máximo es 5 MB; si se excede, la PWA rechaza la subida con «La foto no puede superar 5 MB.» sin enviar a la API. Solo se aceptan JPG y PNG; otro tipo muestra «Elige una imagen JPG o PNG.». En una primera publicación, si no hay foto, la PWA muestra «Elige una foto para la primera publicación.» sin enviar. En una actualización, la foto es opcional y el formulario lo dice junto al control: «Sin foto nueva se mantiene la foto publicada.».
  - Verificación: test de Vitest que nombra CA-04.

### Campos de la solicitud

- **CA-05 (campos enviados):** La solicitud incluye: `species_id` (la especie elegida), `scientific_name`, `habitat`, `origin` (correcciones, CA-14), `category` (tipo de animal, obligatorio, CA-12), `published_fields` (CA-10) y la foto (binario, cuando hay). Se envía como `multipart/form-data`. No envía nombre común, ningún campo de alta de especie ni el tipo de envío: lo decide la API.
  - Verificación: test de Vitest que nombra CA-05.

- **CA-06 (especie no elegible):** Dado el selector, cuando se muestra la lista, entonces las opciones con `next_request_type` nulo (`pending`) aparecen deshabilitadas con su estado en texto y no se pueden enviar. Si la API responde `422` porque la especie cambió entre la carga y el envío («Ya hay una solicitud pendiente para esta especie.», `api-014` CA-27), la PWA muestra el mensaje junto al selector y recarga la lista.
  - Verificación: test de Vitest que nombra CA-06.

- **CA-07 (resultado después del envío):** Tras un envío exitoso, la PWA no muestra el resultado en el momento: el veterinario lo consulta en «Mis solicitudes» (CA-16). No hay notificación activa (v1, decidido 2026-11-11). Una solicitud rechazada muestra su motivo completo en «Mis solicitudes» y en el selector (CA-18), no en el formulario.
  - Verificación: test de Vitest que nombra CA-07 (el formulario no muestra el estado de la solicitud enviada; la pantalla de «Mis solicitudes» muestra el estado devuelto).

- **CA-08 (foto no procesable):** Si la foto no se puede procesar (formato inválido, corrupta), la API responde `422` con «No se pudo procesar la foto. Intenta con otro archivo.», y la PWA lo muestra junto al campo de foto (mismo texto que `api-014` CA-03 y CA-23).
  - Verificación: test de Vitest que nombra CA-08.

### Ficha pública

- **CA-09 (qué mostrar en la ficha pública):** Dado el formulario, cuando carga, entonces muestra el bloque «Qué mostrar en la ficha pública» con estas casillas:
  - En una primera publicación, marcadas por defecto: «Nombre científico», «Área de distribución natural» y «Hábitat».
  - En una actualización, precargadas con la selección que tiene la especie publicada (`published_fields` de la especie, que trae el selector); si la especie está despublicada, con la misma selección guardada.
  - Desmarcadas por defecto: «Estado de conservación», «Tamaño», «Gestación», «Alimentación», «Esperanza de vida» y «Características».
  - «Nombre común», «Tipo de animal» (el selector de CA-12) y «Foto» aparecen siempre, sin casilla.
  - Las etiquetas y los predeterminados coinciden con `api-014` RN-13. Desmarcar solo evita que se muestre en el portal: el dato sigue guardado en la solicitud y es visible para `zoo-admin`.
  - Verificación: test de Vitest que nombra CA-09.

- **CA-10 (envío de la selección):** Dado el envío, cuando el veterinario deja las casillas como están o cambia alguna, entonces la PWA envía `published_fields` como cadena JSON con las claves marcadas (por ejemplo, `["scientific_name","origin","habitat"]`), o `[]` si no hay ninguna. Si la API responde `422` por una clave no permitida o por formato (`api-014` CA-21), la PWA muestra el mensaje junto al bloque y conserva las casillas y los demás datos.
  - Verificación: test de Vitest que nombra CA-10.

- **CA-11 (fuentes pendientes):** Mientras DBR-013 pregunta 8 esté abierta, las casillas de CA-09 que no tienen fuente en la solicitud («Estado de conservación», «Tamaño», «Gestación», «Alimentación», «Esperanza de vida» y «Características») no se muestran. «Área de distribución natural» sí se muestra, porque la solicitud ya guarda `origin`.
  - Verificación: test de Vitest que nombra CA-11.

- **CA-12 (tipo de animal obligatorio):** Dado el formulario, cuando carga, entonces muestra «Tipo de animal» como selector (no como texto libre) con las seis opciones de DBR-004 y estas etiquetas: Mamífero (`mammal`), Ave (`bird`), Reptil (`reptile`), Anfibio (`amphibian`), Pez (`fish`) e Invertebrado (`invertebrate`). El valor enviado es la clave en inglés (`category`), como exige `api-014` CA-25. Si la especie ya tiene tipo, el selector viene con ese valor (CA-14). Si el selector queda vacío, la PWA muestra «Tipo de animal requerido.» junto al campo y no envía (decidido 2026-11-11). Si la API responde `422` por `category`, la PWA muestra el mensaje junto al selector y conserva los demás datos.
  - Verificación: test de Vitest que nombra CA-12.

- **CA-13 (selector de especie):** Dada la sección, cuando carga, entonces pide `GET /api/v1/veterinarian/species` (`api-014` CA-26) y muestra cada especie con su nombre común y su estado: «Disponible», «Publicada», «Despublicada» o «Pendiente de revisión», según la tabla de «Estados del selector». Son elegibles las que tienen `next_request_type` no nulo (`Disponible`, `Publicada` y `Despublicada`); «Pendiente de revisión» no se puede elegir. Mientras carga muestra «Cargando especies…» con `role="status"`. Si la petición falla, muestra «No pudimos cargar las especies. Inténtalo más tarde.» con botón «Reintentar», y no permite enviar. Si la lista llega vacía, muestra «Aún no hay especies registradas. Regístralas primero con un animal.» (texto propuesto).
  - Verificación: test de Vitest que nombra CA-13.

- **CA-14 (precarga y correcciones):** Dada una especie elegida en el selector, cuando se elige, entonces el formulario precarga «Nombre científico», «Hábitat», «Área de distribución natural» y «Tipo de animal» con los valores que trae la lista, y la selección de la ficha según CA-09. El veterinario puede cambiarlos. Al enviar, la PWA manda los valores del formulario; la API guarda NULL los que no cambien (`api-014` RN-16, CA-30). Cambiar de especie reemplaza la precarga y descarta las correcciones anteriores, con confirmación si ya se había escrito algo.
  - Verificación: test de Vitest que nombra CA-14.

- **CA-15 (sin alta de especie):** Dada la sección, cuando se revisa, entonces no hay ningún control para crear, escribir o proponer una especie nueva, ni campo de nombre común editable. Si la especie buscada no está en el selector, el texto de ayuda dice que primero debe registrarse con un animal (`pwa-004`). Verificación: prueba estática del formulario que comprueba la ausencia de campos de alta de especie.
  - Verificación: test de Vitest que nombra CA-15.

### Mis solicitudes (2026-11-11, decidido)

- **CA-16 (lista «Mis solicitudes»):** Dado un veterinario con sesión, cuando abre «Mis solicitudes», entonces la PWA llama a `GET /api/v1/veterinarian/species-publication-requests` (`api-014` CA-33) y muestra cada solicitud con:
  - Nombre común de la especie.
  - Tipo de envío: «Primera publicación» (`publish`) o «Actualización» (`update`).
  - Estado de la solicitud: «Pendiente de revisión» (`submitted`); «Publicada» (`accepted` de `publish`) o «Actualización publicada» (`accepted` de `update`); «Rechazada» (`rejected`), con el motivo (CA-18).
  - Estado actual de la especie cuando es `unpublished`: la etiqueta «Despublicada» junto al nombre. No se muestra cuando es `published` o `not_published`.
  - Fecha de envío (y de decisión, si la hay).
  - Solo las propias, ordenadas de la más reciente a la más antigua. Sin fotos ni datos de la persona que revisó.
  - Verificación: test de Vitest con cliente simulado que nombra CA-16.

- **CA-17 (estados de la lista):** Dada la lista, cuando se presenta, entonces muestra «Cargando tus solicitudes…» con `role="status"` mientras llega la respuesta; «Aún no has enviado solicitudes.» si está vacía; y «No pudimos cargar tus solicitudes. Inténtalo más tarde.» con «Reintentar» si falla. Ningún error deja datos anteriores visibles como actuales. Paginación: 10 por página con «Anterior» y «Siguiente» según `meta.has_more`.
  - Verificación: test de Vitest que nombra CA-17.

- **CA-18 (motivo de rechazo completo):** Dada una solicitud `rejected`, cuando se muestra en «Mis solicitudes» o en el selector, entonces muestra el motivo completo que devuelve la API (`rejection_reason`, máximo 500 caracteres, sin truncar; resuelta, decisión del usuario 2026-11-12, pregunta 1 de esta spec y pregunta 17 de `api-014`). No se muestra ningún extracto. En el selector, la especie cuyo último envío propio fue rechazado muestra «Última solicitud rechazada: {motivo}» (`last_rejection_reason`, `api-014` CA-26) bajo su nombre, con la especie elegible si su estado lo permite. La PWA no decide qué motivo es el último.
  - Verificación: test de Vitest que nombra CA-18, con un motivo de 500 caracteres mostrado íntegro en la lista y en el selector.

- **CA-19 (sesión, errores y cobertura):** Ante `401` en «Mis solicitudes» o en el selector, la PWA lleva a inicio de sesión con «Tu sesión expiró.». Ante `403` (sin rol `veterinarian`), muestra «No tienes permiso para ver esta sección.». Las llamadas van por hooks ViewModel con `@arca/api-client`; ningún componente de vista llama a `fetch`. Verificación: test de Vitest que nombra CA-19 con cliente simulado.

## Reglas de negocio

- **RN-01 (acceso):** Solo personal con rol `veterinarian` puede enviar solicitudes y ver «Mis solicitudes», por regla de rol (`api-014` RN-01; no hay permiso propio de envío). Sin ese rol, la sección no aparece; si se abre por URL, la PWA muestra «No tienes permiso para ver esta sección.». La API es la que aplica esta regla.
- **RN-02 (estado inicial):** La solicitud se guarda como pendiente en estado `submitted`. No crea ni publica especies, y no cambia la especie elegida (`api-014` CA-02, CA-31).
- **RN-03 (foto):** La foto se almacena en `media/species-requests/` en la API (`api-014` RN-04). En pruebas esa carpeta se publica por `/media` (ADR 0026, enmienda de 2026-11-11): la API no devuelve su URL y la PWA no la muestra.
- **RN-04 (sesión):** La sesión debe ser válida (Sanctum cookie + CSRF); no se guardan credenciales en el cliente.
- **RN-05 (textos):** Mensajes en español, identificadores en inglés; la foto no requiere consentimiento adicional (se entiende que el veterinario la carga bajo autorización).
- **RN-06 (sin alta de especie):** La PWA no crea ni propone especies nuevas. Solo elige una existente de la lista (CA-13, CA-15). El alta de especie ocurre al registrar un animal (`pwa-004`) y es un seguimiento aparte.
- **RN-07 (elegibilidad la decide la API):** La PWA muestra el `publication_status` y el `next_request_type` que devuelve la API (`api-014` CA-26) y no calcula elegibilidad. La regla (primera publicación, actualización o bloqueo) es de la API (`api-014` CA-27).
- **RN-08 (solo propias):** «Mis solicitudes» muestra solo las solicitudes del propio veterinario. La filtra la API (`api-014` CA-33), no la PWA.
- **RN-09 (sin notificación activa en v1):** El aviso del resultado es la consulta de «Mis solicitudes» y del selector. No hay push ni correo (decidido 2026-11-11).
- **RN-10 (actualización):** Una actualización sobre una especie publicada o despublicada no cambia lo que se ve en el portal hasta que la Dirección la acepta (`api-014` CA-32). La PWA lo dice en el aviso de CA-03.

## Datos, privacidad y auditoría

- La foto se guarda sin URL en las respuestas de la API hasta su publicación; no aparece en búsquedas públicas ni en el catálogo web. En pruebas, la carpeta de pendientes es alcanzable por `/media` si se conoce la URL (riesgo aceptado, `api-014` y ADR 0026, riesgo m).
- El nombre del veterinario que envía se registra en `created_by` para auditoría. «Mis solicitudes» muestra solo sus propias filas.
- No se recogen datos personales de visitantes, solo de la especie.

## Flujos y errores

1. Veterinario abre «Solicitar publicación de especie» en la PWA.
2. La PWA carga el selector (CA-13). Si falla, muestra error con «Reintentar».
3. Elige una especie elegible; el formulario muestra el tipo de envío y precarga las correcciones y la ficha (CA-09, CA-14).
4. Corrige lo que haga falta, elige tipo de animal, la selección de la ficha y, si es primera publicación, la foto (máx. 5 MB).
5. Envía; la PWA valida campos y tamaño de foto.
6. Si es válido, envía a `POST /api/v1/veterinarian/species-publication-requests`.
7. Respuesta `201` → aviso según el tipo (CA-03), formulario limpio y selector actualizado.
8. Respuesta `422` → errores junto a cada campo; si es de elegibilidad, recarga la lista (CA-06).
9. Después, el veterinario abre «Mis solicitudes» (CA-16) para ver si está pendiente, publicada, actualizada o rechazada, con el motivo.
10. Respuesta `401` → «Tu sesión expiró.»; `500` o red → error genérico sin limpiar.

## Dependencias, riesgos y preguntas

- **Dependencias:** `api-014` (selector, envío, lista propia y reglas), `api-013` (almacenamiento de imágenes), `dashboard-010` (revisión, publicación, actualización, aceptar sin publicar, rechazo, despublicación y republicación), DBR-013 (`species_publication_requests` con `request_type` y columnas de `species`; aprobada por BD el 2026-11-12, pendiente de aplicar en `arca_pruebas` y de la aprobación de backend).
- **Seguimiento recomendado (fuera de esta spec):** el alta de animal (`pwa-004`, `AnimalController::store`) sigue creando especies por nombre libre con datos de relleno. Se recomienda una spec aparte para que el registro elija una especie de la lista, en vez de crearla a ciegas. Anotado también en DBR-013.
- **Riesgos:**
  - Una foto corrupta o en formato no soportado causa error `422` después de enviar; debe reintentar el veterinario.
  - **Sin notificación activa:** el veterinario sabe el resultado solo si consulta «Mis solicitudes». Opción futura: push o correo. Push necesita service worker (hoy la PWA solo tiene manifest), tabla de suscripciones, claves VAPID y una dependencia de envío que exige ADR aprobado (`AGENTS.md`). Correo necesita la configuración de correo del ambiente (`MAIL_*` y el checklist de `infra/README.md`). Cualquiera de las dos exige spec nueva.
  - Foto pendiente alcanzable por URL en pruebas (ADR 0026, riesgo m).
  - Tipo de animal: obligatorio y validado en la API (CA-12). Si la lista de DBR-004 cambia, cambia el selector.
  - **Actualización de una especie despublicada:** el veterinario puede enviarla y la especie seguirá oculta hasta que la Dirección la acepte; el estado «Despublicada» lo indica (CA-13, CA-16).
  - **Eliminar la publicación borra el historial visible** de las solicitudes de esa especie (`api-014` CA-38; pregunta 18, resuelta el 2026-11-12: se marcan todas las solicitudes). Consecuencia asumida: CA-16 no muestra esas solicitudes.
  - Correcciones que cambian la fila compartida: al publicarse afectan también a la app móvil (`api-006`) y a los animales de esa especie. La PWA debe avisar de que la corrección cambia el dato de la especie (texto de ayuda). El área natural llega a `species.distribution`, que `api-006` ya expone.
  - **Significado del campo de área (DBR-013 2a=A):** la etiqueta debe decir área natural de la especie, no procedencia del ejemplar. Un veterinario que lo lea como procedencia corregiría un dato que no le corresponde. Mitigación: la etiqueta de CA-01, CA-09 y CA-14.
  - Si el selector muestra una especie sin datos (relleno), el veterinario puede publicar un dato de relleno como si fuera real. La revisión de la Dirección es la barrera (`api-014` CA-06).
- **Preguntas abiertas:**
  1. **Límite del motivo en «Mis solicitudes».** **Resuelta, decisión del usuario 2026-11-12** (`api-014` pregunta 17): motivo completo, máximo 500 caracteres, sin truncar (CA-18). Descartado el extracto de 120 caracteres.
  2. **Fuentes de campos extra.** **Abierta (BD).** DBR-013 pregunta 8 y `api-014` pregunta 3. Hasta responderla, las seis casillas extra de CA-09 no se muestran (CA-11).
  3. **Aceptar sin publicar.** **Resuelta, decisión del usuario 2026-11-12** (`api-014` pregunta 22). El veterinario no decide nada de esto: la Dirección elige «Aceptar y publicar» o «Aceptar sin publicar» en el dashboard.
  - Resueltas el 2026-11-11 y 2026-11-12: envío por rol (`api-014` pregunta 6); el tipo de animal es obligatorio; la foto de una actualización es opcional; el envío sobre una especie despublicada está permitido (`api-014` pregunta 16); no hay push ni correo en v1 (`api-014` pregunta 2). La etiqueta de `origin` como área natural (DBR-013 2a=A, 2026-11-12).

## Revisión

- Aprobadores y fecha: (pendiente)
- Estado: Borrador. DBR-013 aprobada por BD (2026-11-12). Antes de En progreso: aprobación de backend de DBR-013, migración aplicada en `arca_pruebas` con evidencia y validación técnica de API.
- Historial: 2026-11-11, RN-01 confirmada como regla de rol; RN-03 y «Datos» actualizados por la decisión de la foto en carpeta pública durante pruebas. 2026-11-11 (2): selección de la ficha pública (CA-09 a CA-11) y foto reemplazable por la Dirección. 2026-11-11 (3): «Origen» marcado por defecto; pregunta abierta sobre la ampliación del formulario. 2026-11-11 (4): campo «Tipo de animal» (selector de lista cerrada; CA-12). 2026-11-11 (5), cambio de modelo: de «registrar especie nueva» a «solicitud de publicación de especie existente» (CA-13 a CA-15). **2026-11-11 (6), segunda ronda:** tipo de animal obligatorio (CA-12); envío de **actualización** sobre especie publicada con foto opcional (CA-01, CA-04, CA-09, CA-14, RN-10); **lista «Mis solicitudes»** (CA-16 a CA-19, RN-08, RN-09) en lugar de «sin seguimiento» (CA-07 reescrito); avisos en v1 por consulta y opción futura push o correo (Riesgos, pregunta 2 de `api-014`). **2026-11-12, tercera ronda:** actualización también sobre especie **despublicada** (CA-02, CA-06, CA-13, RN-07, CA-16, tabla de estados); la especie con solicitud viva sigue bloqueada; acción «Aceptar sin publicar» resuelta en `api-014` pregunta 22 (solo afecta al dashboard). **2026-11-12, cuarta ronda (decisiones del usuario):** límite del motivo resuelto (CA-18, pregunta 1: completo, 500 caracteres, sin extracto); las solicitudes de una especie cuya publicación se elimina dejan de aparecer en «Mis solicitudes» (riesgos; `api-014` pregunta 18). **2026-11-12, quinta ronda (DBR-013 aprobada por BD):** etiqueta de `origin` «Área de distribución natural» (CA-01, CA-09, CA-11, CA-14 y Riesgos); sin cambio de CA ni de RN. La fuente de campos extra sigue abierta (pregunta 8 de DBR-013).
- Evidencia/enlaces: `apps/api/specs/014-species-requests.md`, `apps/dashboard/specs/010-public-content-management.md`, `apps/pwa/specs/004-animal-registration.md`, `apps/api/specs/015-public-species-read.md`, `docs/database/requests/DBR-013-species-requests.md`, `docs/adr/0026-object-storage-s3-images.md`.
