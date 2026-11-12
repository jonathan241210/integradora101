# 010 · public-content-management

- App dueña: `dashboard`
- Apps/paquetes afectados: `dashboard` (secciones «Solicitudes de especies» y «Momentos», navegación y vistas/hooks de revisión); `api` (dueña de reglas, estados, permisos, edición, publicación y auditoría: `api-014` para solicitudes de especie, `api-010` para momentos, `api-013` para imágenes, `api-015` para la lectura pública de especies aceptadas; contrato de edición en `api-014`); `packages/api-client` (métodos y tipos de solicitudes de especie y de momentos; sin lógica de negocio); `web` (consumidor público: `web-011` para TulanPedia y `web-010` para la galería; esta spec no cambia `web`); `pwa` (origen de las solicitudes, `pwa-005`; sin cambios); `packages/ui` (solo si falta un componente compartido).
- Estado: Borrador
- Solicitante / responsable funcional: veterinario (solicitud de publicar especies desde la PWA, 2026-11-11); responsable funcional de la revisión: por designar.
- Aprobación funcional: pendiente.
- Aprobado por: (pendiente).
- Integra: `dashboard-008` (Momentos) y `dashboard-009` (solicitudes de especie). Esas dos specs quedan con la nota «Integrada en dashboard-010» y sin borrar su contenido. Esta spec es la referencia de la sección única de contenido público de la navegación.
- Dependencias de contrato: `api-014` (Borrador; incluye la edición `PATCH` desde el 2026-11-11), `api-015` (Borrador; lectura pública de especies aceptadas, resuelve D-1), `api-010` (Borrador), `api-013` (Borrador), DBR-013 (Borrador), DBR-012 (Aplicada en `arca_pruebas`), ADR 0026 (Propuesto; enmienda del 2026-11-11 con las carpetas de especies), ADR 0027 y ADR 0028 (Propuestos), `web-011` (Borrador), `web-010` (Borrador).

## Problema y contexto

El veterinario (`pwa`) puede proponer especies nuevas para el catálogo público (`pwa-005`, `api-014`). Esas solicitudes necesitan una sección de revisión en el dashboard donde solo la Dirección (`zoo-admin`) pueda ver la foto y los datos, corregir lo necesario, y aceptar (publicar) o rechazar con un motivo.

La misma Dirección revisa también los momentos enviados por visitantes (`api-010`, `dashboard-008`). Ambas revisiones comparten navegación, permisos, forma de presentar las fotos y la regla de que el dashboard solo presenta: la API decide estados, transiciones, permisos, publicación y auditoría.

Al aceptar una especie, el catálogo de TulanPedia (`#animales` de `apps/web/src/index.html`) pasa a mostrar la especie aceptada en vez de las fichas de muestra (`web-011`). Eso exige que la lectura pública de especies devuelva solo las aceptadas, lo que especifica `api-015`.

Afectados: `zoo-admin` (revisa), `admin` (Presidencia; no tiene acceso), el veterinario (envía desde la PWA y no recibe feedback), visitantes del portal (leen TulanPedia y la galería).

## Decisiones de la solicitud (2026-11-11)

- Solo `zoo-admin` acepta, edita o rechaza solicitudes de especie y revisa momentos. `admin` (Presidencia) no tiene acceso: la API responde `403` y la sección no aparece.
- Permisos: `species.review` (nuevo; solo `zoo-admin`, con 2FA) y `memories.review` (`api-010`; solo `zoo-admin`). El seeder da hoy a `admin` todos los permisos de su arreglo salvo `tickets.create` y `tickets.cancel`, así que ambos permisos se excluyen de `admin` de forma explícita (`api-014` RN-10, `api-010` RN-07). La asignación en el seeder está pendiente de implementar (`api-014` tarea T-SEED).
- **Editar antes de aceptar:** la persona revisora puede corregir los datos de una solicitud Pendiente antes de aceptarla: nombre común, nombre científico, origen, hábitat, la selección de la ficha pública y la foto (`api-014` CA-14 a CA-19 y CA-21 a CA-23). Aceptar y rechazar siguen siendo las dos decisiones finales. La foto sí se puede reemplazar antes de aceptar (decisión del usuario 2026-11-11).
- **Rechazo de especies:** motivo obligatorio de 1 a 500 caracteres. El veterinario no recibe notificación ni ve el resultado. La confirmación del rechazo es un diálogo obligatorio, sin casilla adicional (CA-13; decisión del usuario 2026-11-11).
- **Momentos:** se integra `dashboard-008` sin cambios funcionales.
- **Imágenes (2026-11-11):** las fotos de solicitudes de especie se guardan en `media/species-requests/` (y, al aceptar, en `media/species/`). Durante pruebas, esas carpetas son públicas por `/media` (enmienda del ADR 0026). La API no devuelve URL de la foto pendiente. **Recomendación antes de producción:** cambiar a almacenamiento privado (ruta protegida con `species.review` o URL firmada) o migrar a otro almacenamiento (ver `docs/propuestas/almacenamiento-objetos-s3.md`); se configurará entonces. Es deuda y riesgo conocido: una foto pendiente es accesible por URL si se conoce.
- **Momentos (imágenes):** se guardan en la carpeta `media/` (ADR 0026, `api-013`). `dashboard-007` (presentación de imágenes de noticias y eventos) no cambia.
- **Filtros de TulanPedia (2026-11-11):** el portal filtra por hábitat, por especie y por tipo de animal con valores que salen de la API (`web-011` CA-04 y CA-22): el hábitat se arma con los valores distintos de `species.habitat` de las especies aceptadas (texto libre, normalizado); la especie, con `common_name`; el tipo de animal, con `category` (lista cerrada de DBR-004), que la solicitud captura desde el 2026-11-11 (DBR-013 pregunta 10, resuelta).
- **Eventos y noticias:** sin cambios funcionales. Se mencionan solo como parte de la navegación de contenido público.
- **Ficha pública (2026-11-11):** el veterinario elige qué mostrar y la Dirección lo ajusta al editar (`api-014` RN-13; CA-07). Los predeterminados están marcados.
- **Tipo de animal (2026-11-11):** la Dirección ve y ajusta el tipo de animal (`category`) en la solicitud, con la lista cerrada de `api-014` CA-25. Obligatorio: **por confirmar**. Se publica siempre y no es desmarcable (**propuesta por confirmar**).
- **Portal:** la especie aceptada aparece en TulanPedia (`web-011`); las fichas de muestra se retiran.

## Objetivos

- Que `zoo-admin` vea las solicitudes de especie por estado y las abra con su foto y sus datos.
- Que pueda corregir los datos de una solicitud pendiente antes de decidir, sin cambiar su estado.
- Que pueda aceptar una solicitud (la especie queda publicada) o rechazarla con un motivo (la foto se borra de la carpeta de solicitudes).
- Que pueda revisar los momentos de visitantes con la misma experiencia de revisión que hoy define `dashboard-008`.
- Que cada decisión y cada edición queden registradas en la API y se reflejen en la lista sin recargar la página.
- Que ningún error ni decisión tardía deje datos falsos en pantalla.

## Fuera de alcance

- Acceso de `admin` (Presidencia) o de cualquier otro rol a estas secciones.
- Edición de especies ya publicadas, y eliminación de especies (corresponde a otra feature).
- Edición de solicitudes Aceptadas o Rechazadas.
- Reenvío o corrección de solicitudes por el veterinario; lista «mis solicitudes» en la PWA.
- Notificaciones al veterinario (correo o aviso en la PWA) sobre la decisión.
- Solicitud de animales individuales (solo especies para el catálogo).
- Eventos y noticias: sin cambios funcionales en esta spec.
- Modelo 3D, carrusel y fichas expandibles del portal (ver `web-011`).
- Pagos (`Payments` no se implementa sin spec, ADR y proveedor).
- Retirar de la galería un momento ya publicado antes de su vencimiento (`api-010` pregunta 1).
- Búsqueda por texto, exportación o estadísticas de solicitudes.
- Cambios de estilo de `dashboard-007` o de la presentación de noticias y eventos.
- La lectura pública de especies (`GET /api/v1/accepted-species`) y su contrato: están en `api-015`, no en esta spec.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos (API) |
|---|---|---|
| `zoo-admin` (Dirección) | Revisar, editar antes de aceptar, aceptar o rechazar solicitudes de especie; revisar momentos | `species.review` y `memories.review`, con 2FA confirmado (`api-014` RN-01; `api-010` CA-14) |
| `admin` (Presidencia) | Sin acceso. La sección no aparece; si se abre por URL, la API responde `403` | Ninguno. Se excluye de `species.review` y de `memories.review` de forma explícita |
| `veterinarian` | Envía solicitudes desde la PWA (`pwa-005`); no revisa | Sesión válida y rol `veterinarian` (`api-014` CA-01). No ve el resultado de su solicitud |
| `executive`, `cashier` | Sin acceso | — |
| Visitante del portal | Ve las especies aceptadas (TulanPedia) y los momentos aceptados y vigentes | Ninguno; contenido público (`web-011`, `web-010`) |

## Historias de usuario

- Como `zoo-admin`, quiero ver las solicitudes de especie pendientes para revisarlas antes de publicarlas en el catálogo.
- Como `zoo-admin`, quiero ver la foto y los datos de la especie para decidir si es apropiada.
- Como `zoo-admin`, quiero corregir el nombre, el origen o el hábitat de una solicitud antes de aceptarla, para publicar datos correctos sin pedir al veterinario que la reenvíe.
- Como `zoo-admin`, quiero aceptar una solicitud con una confirmación clara de que la especie quedará visible en el catálogo público.
- Como `zoo-admin`, quiero rechazar una solicitud con un motivo, para que quede registrado por qué no se publicó.
- Como `zoo-admin`, quiero revisar los momentos de visitantes con su foto y su opinión, y decidir si se publican en la galería durante su plazo.

## Criterios de aceptación

### A. Solicitudes de especie (absorbe `dashboard-009`)

- **CA-01 (visibilidad):** Dada una sesión con `species.review` y 2FA confirmado, cuando se muestra la navegación, entonces aparece «Solicitudes de especies». Sin ese permiso la sección no aparece, y si se abre por URL la vista muestra «No tienes permiso para revisar solicitudes de especies.». El dashboard no protege la ruta: la autorización es la de la API.
- **CA-02 (lista y filtro):** Dada la sección, cuando carga, entonces pide `GET /api/v1/admin/species-requests` con `status` según el filtro (Todas, Pendiente → `submitted`, Aceptada → `accepted`, Rechazada → `rejected`) y `page`. Muestra 10 por página, ordenadas por fecha de envío descendente, y controles «Anterior» y «Siguiente» según `meta.has_more`. Al cambiar el filtro, vuelve a consultar la API; no filtra en el cliente.
- **CA-03 (fila):** Dada una fila, cuando se muestra, entonces incluye nombre común, nombre científico (máximo 60 caracteres; más largo se trunca con «…»), tipo de animal (etiqueta en español), nombre del veterinario, fecha de envío formateada y la etiqueta del estado en español (Pendiente, Aceptada, Rechazada) con icono, no solo color.
- **CA-04 (estados de la lista):** Dadas listas vacías o estados de error, cuando se presentan, entonces muestra «No hay solicitudes con este estado.» si está vacía; un estado de carga mientras llega la API; y un aviso de error con botón «Reintentar» si falla. Ningún error deja filas anteriores visibles como si fueran actuales.
- **CA-05 (detalle):** Dada una solicitud, cuando se abre, entonces pide `GET /api/v1/admin/species-requests/{id}` y muestra nombre común, nombre científico, origen, hábitat, tipo de animal (etiqueta en español), nombre del veterinario, fecha de envío y el estado. El JSON no contiene URL de la foto.
- **CA-06 (foto de solicitud):** Dada una solicitud abierta, cuando se muestra su foto, entonces la vista la obtiene por `GET /api/v1/admin/species-requests/{id}/image` (binario, ruta autenticada) y la muestra como blob en memoria, completa y centrada según `dashboard-007`, con `alt="Foto de {common_name}"`. La URL `blob:` se revoca al cerrar el detalle y al cambiar de solicitud. Si la API responde `404`, muestra «No se pudo cargar la foto.». La vista nunca construye ni muestra una URL de `/media`, aunque en pruebas la carpeta sea pública (ver «Datos, privacidad y auditoría»).
- **CA-07 (editar antes de aceptar):** Dada una solicitud en Pendiente, cuando se pulsa «Editar», entonces se abre un formulario con nombre común, nombre científico, origen, hábitat, tipo de animal (selector con la lista cerrada de `api-014` CA-25) y el bloque «Qué mostrar en la ficha pública» (casillas de `api-014` RN-13; «Nombre científico», «Origen» y «Hábitat» marcadas por defecto), precargados con lo guardado. Desmarcar una casilla solo evita que el campo se muestre en el portal; el dato sigue guardado y visible para la Dirección. El formulario muestra la foto actual (blob, como CA-06) y el control «Cambiar foto» (JPG o PNG, máx. 5 MB). Al guardar, llama a `PATCH /api/v1/admin/species-requests/{id}` como multipart, con los campos cambiados y la foto solo si se eligió una (`api-014` CA-15, CA-21 a CA-23). Al éxito (`200`), muestra los datos guardados, mantiene el estado Pendiente y muestra el aviso «Cambios guardados. La solicitud sigue pendiente.». La foto nueva se ve antes de guardar (CA-49).
- **CA-08 (validación de edición):** Dado el formulario de edición, cuando se valida, entonces nombre común y nombre científico son obligatorios (1 a 150 caracteres); origen y hábitat son opcionales (máximo 150 caracteres; resuelto el 2026-11-11). El tipo de animal es un selector de la lista cerrada, obligatorio (**por confirmar**); un `422` de `category` se muestra junto al selector. Los espacios sobrantes se quitan antes de enviar. Un `422` de la API se muestra junto al campo que lo causó (`api-014` CA-16) y el formulario no se cierra. «Cancelar» o Escape descartan los cambios sin llamar a la API. La foto se valida en el cliente como en el envío (JPG o PNG, máx. 5 MB; `pwa-005` CA-04), y la API valida de nuevo. Un `422` de foto (`api-014` CA-23) se muestra junto al control de foto.
- **CA-09 (edición solo en Pendiente):** Dada una solicitud Aceptada o Rechazada, cuando se muestra su detalle, entonces no ofrece «Editar». Dada una solicitud Pendiente que otra persona ya revisó, cuando la API responde `422` («Esta solicitud ya fue revisada.», `api-014` CA-17), entonces la vista recarga el detalle con el estado actual y no cambia nada más.
- **CA-10 (aceptar con datos guardados):** Dada una solicitud Pendiente con cambios de edición sin guardar (también una foto elegida y no guardada), cuando se pulsa «Aceptar», entonces el diálogo no se abre y la vista pide guardar primero con el texto «Guarda los cambios antes de aceptar.» (propuesta; pregunta 1). Así la confirmación muestra lo que se publicará.
- **CA-11 (aceptar):** Dada una solicitud Pendiente sin cambios sin guardar, cuando se pulsa «Aceptar», entonces se abre un diálogo que dice «¿Aceptar esta solicitud? La especie se publicará en el catálogo público visible para los visitantes.» y muestra el nombre común y el científico que se publicarán. Solo «Confirmar» llama a `POST /api/v1/admin/species-requests/{id}/accept`. Al éxito (`200`), la solicitud pasa a Aceptada, el detalle muestra «Publicada en el catálogo», se ocultan los botones de acción y aparece el aviso «Solicitud aceptada. La especie es ahora visible en el catálogo público.». «Cancelar» no llama a la API.
- **CA-12 (decisión tardía al aceptar):** Dada una solicitud que la API ya no tiene en Pendiente, cuando se confirma la aceptación y la API responde `422` («Esta solicitud ya fue revisada.»), entonces el detalle se recarga con el estado actual y no cambia nada más.
- **CA-13 (rechazar con confirmación y motivo):** Dada una solicitud Pendiente, cuando se pulsa «Rechazar», entonces se abre un diálogo con la pregunta «¿Seguro que quieres rechazar esta solicitud?», el campo «Motivo» (obligatorio, 1 a 500 caracteres), un contador («245/500») y dos botones: «Confirmar» y «Cancelar». «Confirmar» está deshabilitado mientras el motivo esté vacío, y no llama a la API. Al confirmar, llama a `POST /api/v1/admin/species-requests/{id}/reject` con `{rejection_reason}`. «Cancelar» cierra el diálogo sin llamar a la API. La confirmación es obligatoria y no hay casilla adicional: reemplaza la casilla de `dashboard-009` CA-14 (decisión del usuario 2026-11-11).
- **CA-14 (rechazo: éxito y error):** Al éxito (`200`), la solicitud pasa a Rechazada, el detalle muestra el motivo en lectura y las opciones de acción desaparecen; aparece el aviso «Solicitud rechazada. No se publicó en el catálogo.» y el botón «Volver a la lista». Un `422` de motivo se muestra junto al campo sin cerrar el diálogo.
- **CA-15 (acciones según estado):** Dada una solicitud Pendiente, cuando se muestra, entonces ofrece «Editar», «Aceptar» (primario) y «Rechazar» (secundario). Dada una solicitud Aceptada, solo lectura con «Publicada en el catálogo». Dada una solicitud Rechazada, solo lectura con el motivo visible. En la lista, Pendiente y Aceptada muestran «Revisar»; Rechazada muestra «Ver».
- **CA-16 (diálogos accesibles):** Dado cualquier diálogo de esta sección, cuando se abre, entonces tiene `role="dialog"` y nombre accesible, mantiene el foco dentro, devuelve el foco al control que lo abrió al cerrarse, y se cierra con Escape sin llamar a la API.
- **CA-17 (errores):** Dada una respuesta de error en estas secciones, cuando llega, entonces: `401` vuelve al login con «Tu sesión expiró.» (`dashboard-002` CA-08); `403` muestra «No tienes permiso para revisar solicitudes de especies.» o «No tienes permiso para revisar momentos.»; `404` muestra «Solicitud no encontrada.» o «Petición no encontrada.»; un fallo de red o `5xx` muestra un error con «Reintentar».

### B. Momentos (integra `dashboard-008`)

Cada criterio equivale al de `dashboard-008` indicado entre paréntesis. El texto de `dashboard-008` queda como referencia detallada hasta la aprobación de esta spec.

- **CA-18 (visibilidad; 008 CA-01):** Con `memories.review`, aparece «Momentos» en la navegación. Sin ese permiso no aparece, y la vista muestra «No tienes permiso para revisar momentos.» si se abre por otra vía.
- **CA-19 (lista; 008 CA-02 y CA-03):** La sección muestra `GET /api/v1/admin/memories` con 10 por página, «Anterior» y «Siguiente» según `meta.has_more`, y filtro Todas, Enviada, En proceso, Aceptada, Rechazada. El filtro consulta la API con `status`. Vacío: «No hay peticiones con este estado.».
- **CA-20 (fila; 008 CA-04):** Cada fila muestra fecha de envío, estado en español, un fragmento de la opinión como texto y «Revisar». La lista no muestra datos personales del visitante. Si hubo reenvíos, muestra «Reenviada {n} veces».
- **CA-21 (detalle y En proceso; 008 CA-05):** Al abrir una petición Enviada, la vista pide `GET /api/v1/admin/memories/{id}`; la API la pasa a En proceso. Al volver a la lista, la fila muestra En proceso sin recargar la página completa.
- **CA-22 (imagen y opinión antes de decidir; 008 CA-06):** El detalle muestra la imagen completa y centrada (`dashboard-007`), con `alt` «Foto enviada por un visitante», y la opinión como texto, nunca como HTML. Si la imagen falla, muestra «No se pudo cargar la imagen.».
- **CA-23 (acciones según estado; 008 CA-07):** Enviada o En proceso: «Aceptar» y «Rechazar». Rechazada: solo lectura con el motivo, las opciones marcadas y «Esperando la corrección del visitante.». Aceptada: solo lectura con la fecha de publicación y el plazo (CA-35 y CA-38).
- **CA-24 (aceptar con plazo; 008 CA-08):** El diálogo de aceptar dice que la foto y la opinión se publicarán en la galería durante {publication_days} días desde la aceptación. Solo «Confirmar» llama a `POST /api/v1/admin/memories/{id}/accept`. Al éxito muestra `published_until` y un aviso accesible.
- **CA-25 (rechazar con motivo y campos; 008 CA-09):** El diálogo pide el motivo (1 a 500 caracteres, con contador) y dos casillas, «La foto» (`image`) y «La opinión» (`content`), de las que hay que marcar al menos una. «Confirmar» está deshabilitado mientras falte el motivo o ninguna casilla. Un `422` se muestra junto a `errors.rejection_reason` o `errors.rejected_fields`.
- **CA-26 (decisión tardía; 008 CA-10):** Ante `422` por decisión ya tomada, la vista muestra el mensaje de la API, recarga el detalle y no cambia nada más.
- **CA-27 (errores; 008 CA-11):** `401` vuelve al login; `403` muestra el aviso de sin permiso; `404` muestra «Petición no encontrada.»; `422` muestra el mensaje junto al campo; red o `5xx` muestra error con «Reintentar». Ningún error deja datos anteriores visibles como actuales.
- **CA-28 (diálogos; 008 CA-12):** Igual que CA-16 para los diálogos de aceptar y rechazar de momentos.
- **CA-29 (teclado y adaptación; 008 CA-13):** Controles con foco visible; la lista tiene desplazamiento propio o diseño apilado; sin desbordamiento horizontal de 360 a 1366 px.
- **CA-30 (solo presentación; 008 CA-14):** Ningún componente de `views/` o `components/` llama a la API ni a `fetch`, ni calcula estados, transiciones, plazos ni permisos. Las llamadas van por hooks ViewModel con `@arca/api-client`.
- **CA-31 (estilo; 008 CA-15):** Tokens semánticos, sin hexadecimales de marca. Los estados se distinguen también por texto.
- **CA-32 (cobertura de pruebas; 008 CA-16):** Existe al menos una prueba de Vitest, con cliente simulado de `@arca/api-client`, que nombra cada CA de momentos (CA-18 a CA-38).
- **CA-33 (imagen sin persistencia; 008 CA-17):** La imagen de revisión se pide por `@arca/api-client` a través del proxy de mismo origen; la vista la muestra con una URL `blob:` creada por el ViewModel; la URL se revoca al cerrar, al cambiar de petición y al desmontar; y nada se escribe en `localStorage`, `sessionStorage`, IndexedDB ni cookies.
- **CA-34 (imagen no disponible; 008 CA-18):** Si la API responde `404` para la imagen, «Aceptar» queda deshabilitado con «No se puede aceptar sin la imagen.»; «Rechazar» sigue disponible.
- **CA-35 (plazo visible; 008 CA-19):** Una petición Aceptada muestra «Publicada en la galería hasta el {fecha}.» si `published_until` es posterior a ahora, o «La publicación venció el {fecha}.» si ya pasó. El estado sigue siendo Aceptada.

Nota de correspondencia: CA-18 a CA-35 cubren 008 CA-01 a CA-19 (CA-19 agrupa 008 CA-02 y CA-03; CA-23 agrupa 008 CA-07). CA-36 y CA-37 son propuestas de esta spec que no tienen equivalente en 008 y están pendientes de confirmar (pregunta de privacidad de 008 y CA-07).

- **CA-36 (sin datos personales en la revisión; 008 pregunta 1):** La lista y el detalle de momentos no muestran nombre, correo ni apodo del visitante. Se verifica en la prueba de la vista del detalle.
- **CA-37 (sin acciones sobre Rechazada en la lista; 008 CA-07):** En la lista, una petición Rechazada no ofrece acciones de decisión, solo «Revisar» de lectura.
- **CA-38 (estado Aceptada en la lista):** La fila de una petición Aceptada muestra «Aceptada» y no ofrece acciones de decisión.

### C. Efecto en el portal

- **CA-40 (especie aceptada en TulanPedia):** Dada una solicitud aceptada, cuando el visitante carga TulanPedia en el ambiente con la API pública disponible (`api-015`), entonces la especie aparece en `#animales`. Verificación: prueba de contrato en `web-011` (CA-01) y evidencia manual en `arca_pruebas`. Esta spec no la verifica en el dashboard.
- **CA-41 (no publicadas fuera del portal):** Dada una solicitud Pendiente o Rechazada, cuando el visitante carga TulanPedia, entonces no aparece. Verificación: `api-015` (CA-01), `api-014` (CA-05 y RN-07) y `web-011` (CA-02).
- **CA-42 (fichas de muestra retiradas):** Tras esta feature, TulanPedia no muestra las fichas de muestra ni el aviso «Fichas de muestra». Verificación en `web-011` (CA-08).

### D. Imágenes (`media/`)

- **CA-43 (carpetas de especies):** Dada una solicitud aceptada, cuando se publica, entonces la foto pasa de `media/species-requests/` a `media/species/` (pública) según `api-014` CA-08; dada una solicitud rechazada, la foto se borra según `api-014` CA-10. Las dos carpetas están previstas en la enmienda del ADR 0026 (2026-11-11). Verificación: PHPUnit en `api-014` y revisión del ADR.
- **CA-44 (la sección no usa la URL de la foto pendiente):** Dada una foto de solicitud pendiente, cuando la sección la muestra, entonces la API no incluye su URL en ninguna respuesta (`api-014` CA-05 y CA-06) y la vista solo usa el blob de `GET .../image`. Verificación: test del cliente que comprueba que el detalle no usa `image_url` ni construye rutas de `/media` (CA-06 de esta spec). Una foto pendiente sigue siendo alcanzable por URL en pruebas (riesgo aceptado; ver «Datos, privacidad y auditoría»).
- **CA-45 (no cambia la presentación de noticias y eventos):** Dada la presentación de imágenes de noticias y eventos, cuando se revisa esta feature, entonces `dashboard-007` no cambia y sus pruebas siguen en verde.

### E. Transversales

- **CA-46 (MVVM y pruebas):** Dada la sección de solicitudes de especie, cuando se revisa, entonces ningún componente de `views/` o `components/` llama a `fetch`/`axios`; cada hook ViewModel llama a `@arca/api-client`; no hay cálculo de estados ni transiciones en el cliente; y existe una prueba de Vitest por cada CA-01 a CA-17 de esta spec (la cobertura de momentos, CA-18 a CA-38, va en CA-32).
- **CA-47 (trazabilidad documental):** Dada la revisión del PR, cuando se revisa la documentación, entonces `dashboard-008` y `dashboard-009` contienen la nota «Integrada en dashboard-010» sin borrar contenido, y `api-014` CA-06 usa `species.review`. Verificación: revisión documental, no automatizada.
- **CA-48 (filtros de TulanPedia):** Dado el filtro de hábitat, el de especie y el de tipo de animal de TulanPedia, cuando se abren, entonces sus opciones salen de las especies aceptadas (hábitat: `species.habitat`; especie: `common_name`; tipo de animal: `category`), como exigen `web-011` CA-04 y CA-22. Verificación en `web-011` (CA-03, CA-04 y CA-22); esta spec solo lo referencia.
- **CA-49 (edición con foto nueva):** Dada una solicitud Pendiente con el formulario de edición abierto, cuando se elige una foto válida, entonces la vista muestra la vista previa de la nueva imagen (blob creado en memoria, con `alt` «Vista previa de la nueva foto de {common_name}») junto a la actual, sin subirla. La foto se envía solo al guardar. «Cancelar» o el cambio de solicitud revocan la URL `blob:` y descartan la foto. Tras guardar, la API borra la foto anterior y no la conserva (`api-014` CA-23; decisión del usuario 2026-11-11): la vista no ofrece deshacer ni recuperarla. Un archivo que no sea JPG o PNG, o que supere 5 MB, se rechaza en la vista con «Elige una imagen JPG o PNG.» o con «La foto no puede superar 5 MB.» (`pwa-005` CA-04). Verificación: prueba de Vitest con cliente simulado, que comprueba que la URL `blob:` se revoca.

## Reglas de negocio

- **RN-01 (solo presentación):** Las pantallas no deciden permisos, estados, transiciones, plazos, ediciones válidas ni publicación. La API es la única autoridad (`api-014` RN-05, `api-010` RN-02). Ocultar una sección no la protege.
- **RN-02 (acceso):** Solo `zoo-admin` tiene `species.review` y `memories.review`, ambos con 2FA. `admin`, `executive`, `cashier` y `veterinarian` no los tienen (`api-014` RN-01 y RN-10, `api-010` RN-07).
- **RN-03 (estados en español):** Solicitudes: Pendiente = `submitted`, Aceptada = `accepted`, Rechazada = `rejected`. Momentos: Enviada = `submitted`, En proceso = `in_review`, Aceptada = `accepted`, Rechazada = `rejected`. El texto en español lo pone la vista.
- **RN-04 (edición previa):** La edición solo es posible en Pendiente. No cambia el estado, no publica y no reenvía. La API valida de nuevo los campos y la unicidad del nombre común (`api-014` RN-03 y CA-16), también en la edición. Cada cambio queda en auditoría (`api-014` RN-12).
- **RN-05 (aceptar publica):** Aceptar publica la especie en el catálogo público y requiere confirmación explícita. No se acepta con cambios sin guardar (CA-10, propuesta).
- **RN-06 (motivo de rechazo):** El motivo de rechazo es obligatorio, de 1 a 500 caracteres. El dashboard lo ayuda con el contador y el botón deshabilitado; la API valida de nuevo (`api-014` CA-10 y CA-11).
- **RN-07 (fotos de solicitudes):** La API no devuelve URL de la foto de una solicitud pendiente. La sección la muestra solo en el detalle, por ruta autenticada, como blob en memoria. Al aceptar, la foto pasa a `media/species/` (pública por diseño); al rechazar, se borra (`api-014` RN-04, RN-08). En pruebas, la carpeta de pendientes es alcanzable por `/media` si se conoce la URL: riesgo aceptado (ver «Datos, privacidad y auditoría»).
- **RN-08 (momentos: motivo y campos):** Rechazar un momento exige motivo y al menos una casilla (`image` o `content`); la API valida que haya al menos una (`api-010` RN-20).
- **RN-09 (sin feedback al veterinario):** El rechazo no notifica al veterinario y la PWA no muestra el resultado (`api-014` RN-07, `pwa-005` CA-07).
- **RN-10 (sin almacenamiento local):** La sección no guarda solicitudes, fotos, motivos ni opiniones en el navegador. La imagen existe solo en memoria como blob mientras se ve.
- **RN-11 (textos):** Todos los textos visibles están en español; identificadores, rutas y campos están en inglés (Constitución VI).
- **RN-12 (MVVM):** Componentes como Views, hooks como ViewModels, datos mediante `@arca/api-client` (`apps/dashboard/AGENTS.md`).
- **RN-13 (confirmación de rechazo):** Rechazar exige un diálogo de confirmación obligatorio y el motivo; no hay casilla adicional (CA-13).
- **RN-14 (ficha pública):** La Dirección ve y ajusta la selección de campos solo mientras la solicitud está Pendiente. La lista de campos y los predeterminados los define la API (`api-014` RN-13); la vista no decide qué se publica (RN-01). Predeterminados: «Nombre científico», «Origen» y «Hábitat» marcados. Desmarcar un campo solo evita que se muestre en el portal; el dato sigue guardado en la solicitud y visible para la Dirección en esta sección. El tipo de animal no es desmarcable: se publica siempre (propuesta por confirmar; `api-014` RN-13).

## Datos, privacidad y auditoría

- **Solicitudes de especie:** datos de la especie, foto de un animal o de una especie, y el nombre del veterinario que envía (dato de personal, visible solo a `zoo-admin`). No hay datos personales de visitantes.
- **Momentos:** foto y opinión de visitantes, que pueden mostrar personas, incluidos menores. La aceptación previa es la barrera (`api-010`). La sección no muestra nombre, correo ni apodo (CA-36).
- **Auditoría:** la API registra en Activitylog cada decisión (aceptar, rechazar), cada edición de una solicitud pendiente (valores anteriores y nuevos; `api-014` RN-12; el historial concreto depende de DBR-013 pregunta 1) y cada revisión de momento (`api-010` CA-19). El dashboard no escribe auditoría.
- **Privacidad de fotos de solicitudes (2026-11-11):**
  - Las fotos de solicitudes pendientes no tienen URL en las respuestas de la API.
  - En pruebas, `media/species-requests/` se publica por `/media` (enmienda del ADR 0026, riesgo m). Quien conozca la URL puede ver una foto pendiente. La sección no lo evita.
  - **Recomendación antes de producción:** cambiar a almacenamiento privado (ruta protegida con `species.review` o URL firmada) o migrar a otro almacenamiento (ver `docs/propuestas/almacenamiento-objetos-s3.md`); se configurará entonces (`api-014`, «Recomendación antes de producción»).
- **Privacidad de momentos:** las de momentos siguen el riesgo del ADR 0026 (carpeta `media/` publicada por `/media`), que esta sección no resuelve.
- No se guarda nada en el navegador (RN-10).
- Requiere DBR: sí, para `species_requests` y los cambios de `species` (ver DBR-013, Borrador). Los momentos ya tienen DBR-012 aplicada en `arca_pruebas`.

## Flujos y errores

### Solicitudes de especie

1. `zoo-admin` entra con `species.review` y 2FA. Ve «Solicitudes de especies».
2. La lista carga las solicitudes Pendientes (o el filtro elegido).
3. «Revisar» abre el detalle con la foto y los datos.
4. Opcional: «Editar» → cambios → «Guardar cambios» (la solicitud sigue Pendiente).
5. «Aceptar» (sin cambios sin guardar) → diálogo → «Confirmar» → Aceptada; la especie queda publicada (`api-015` y `web-011`).
6. O «Rechazar» → motivo → «Confirmar» → Rechazada; la foto se borra.
7. Errores: `401` → login; `403` → aviso; `404` → no encontrada; `422` → recarga o error junto al campo; red → «Reintentar».

### Momentos

Igual que `dashboard-008` (flujos 1 a 7 de esa spec): lista, detalle con paso a En proceso, aceptar con plazo, rechazar con motivo y campos, decisión tardía y errores.

## Dependencias pendientes

Estas dependencias bloquean la aprobación de esta spec. Su estado a 2026-11-11 es el de cada línea.

- **D-1 · Lectura pública de especies aceptadas: resuelta en contrato (Borrador).** Se especifica en `api-015` (`GET /api/v1/accepted-species`, con filtros `habitat` y `name`). No se amplía `api-006`, que compone la ficha desde `animals` y `enclosures`. Queda pendiente de aprobación de `api-015` y de su pregunta 1 (ruta). Afecta a CA-40, CA-41 y `web-011`.
- **D-2 · Edición de la solicitud pendiente: resuelta en contrato (Borrador).** `api-014` amplía `PATCH /api/v1/admin/species-requests/{id}` (CA-14 a CA-19, RN-09 a RN-12). Queda pendiente de su aprobación. Afecta a CA-07 a CA-10.
- **D-3 · Carpetas de especies en el ADR 0026: resuelta por decisión del usuario (2026-11-11), pendiente de aprobación formal.** La enmienda del ADR 0026 añade `species/` y `species-requests/` dentro de `media/`, con las dos carpetas públicas durante pruebas. `api-014` se ajusta (CA-02, CA-06, CA-08, CA-10, RN-04). Se mantiene la recomendación antes de producción. Afecta a CA-43 y CA-44.
- **D-4 · DBR-013:** tabla `species_requests` y elementos en `species`, en Borrador. No hay implementación de la API antes de su aprobación ni de `Lista para backend` (`docs/database/requests/README.md`, reglas 4 y 6).
- **D-5 · ADR 0028 (Propuesto):** excepción del portal para TulanPedia (`web-011`). Hasta su aprobación, `web-011` no puede implementarse.

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:** D-1 a D-5; `api-014` (Borrador), `api-015` (Borrador), `api-010` (Borrador), `api-013` (Borrador), `dashboard-002` (sesión y 401), `dashboard-007` (imagen completa), `api-007` (2FA y rutas `/api/v1/admin`), `pwa-005` (origen de solicitudes). No hay dependencia nueva de npm: si se necesita un icono, se añade en `components/Icon.tsx` del dashboard.
- **Riesgos:**
  - Dos personas revisan a la vez: CA-12 y CA-26 resuelven la decisión tardía sin duplicar la acción.
  - Edición concurrente: si otra persona cambia la solicitud mientras se edita o se decide, la API responde `422` y la vista recarga (CA-09; `api-014` CA-19).
  - La edición cambia datos que se publicarán: la confirmación de aceptar muestra los datos guardados (CA-10 y CA-11).
  - Foto pendiente alcanzable por `/media` en pruebas si se conoce su URL (D-3; ADR 0026, riesgo m). La sección no lo evita. Recomendación antes de producción en «Datos, privacidad y auditoría».
  - Una foto grande tarda en cargar: se muestra el estado de carga (CA-06 y CA-22).
  - Mientras `api-015` no esté aprobada, el portal no mostrará especies aceptadas y TulanPedia quedará vacía (ver `web-011`).
- **Preguntas pendientes** (máximo 8 por ronda):
  1. **Edición de la solicitud pendiente.**
     - **Resuelta, decisión del usuario 2026-11-11 (parte de campos):** los campos editables antes de aceptar son nombre común, nombre científico, origen y hábitat (CA-07 y CA-08; `api-014` CA-15 y CA-16).
     - **Resuelta, decisión del usuario 2026-11-11 (foto):** la foto sí se puede reemplazar antes de aceptar (`api-014` CA-23).
     - **Abierta:** (b) ¿Se confirma CA-10 (no aceptar con cambios sin guardar)? Propuesta vigente, no decidida. (c) ¿El historial de edición va en Activitylog o en tabla propia? (`api-014` pregunta 5; DBR-013 pregunta 1).
  2. **Contrato público y de edición.** **Resuelta, decisión del usuario 2026-11-11:** la lectura pública es una spec nueva, `api-015`, y no se amplía `api-006`. La edición es el `PATCH` de `api-014`. Queda abierta la ruta de `api-015` (pregunta 1 de esa spec).
  3. **Foto pendiente en `/media`.** **Resuelta, decisión del usuario 2026-11-11:** `media/species-requests/` es pública en pruebas, con la enmienda del ADR 0026 y la recomendación antes de producción (`api-014`, ADR 0026 y «Datos, privacidad y auditoría»). Riesgo aceptado para pruebas; no aplica a producción.
  4. **Origen y campo público.** **Pendiente: responsable de BD** (ver `docs/database/requests/DBR-013-species-requests.md`, «Decisiones para el responsable de BD», 2a). Afecta a `api-015` RN-06.
  5. **Imagen de la especie.** **Pendiente: responsable de BD** (ver DBR-013, «Decisiones para el responsable de BD», 2b). Afecta a `api-015` RN-07.
  6. **Casilla de confirmación del rechazo.** **Resuelta, decisión del usuario 2026-11-11:** la confirmación es obligatoria, en un diálogo con «Confirmar» y «Cancelar», sin casilla (CA-13).
  7. **Contenido de la ficha pública.** **Resuelta, decisión del usuario 2026-11-11:** el veterinario elige qué mostrar, con predeterminados marcados (nombre científico, origen y hábitat) y opcionales desmarcados (`pwa-005` CA-09; `api-014` RN-13). La Dirección lo ajusta al editar (CA-07). **Sigue abierta** la fuente de los campos extra (`api-014` pregunta 3; DBR-013 pregunta 8).
  8. **Opciones de filtro en TulanPedia.** **Resuelta, decisión del usuario 2026-11-11:** «Hábitat» se arma con los valores distintos de `species.habitat` de las especies aceptadas (texto libre normalizado, longitud 150). «Especie» se arma con `common_name` de las especies aceptadas. Tipo de animal: **resuelto, decisión del usuario (2026-11-11):** hay filtro por `category` (lista cerrada de DBR-004, `VARCHAR(30)` NULL; la usan `api-006` y mobile). La solicitud la captura (DBR-013 pregunta 10, resuelta). Aplicado en `web-011` CA-03, CA-04, CA-19, CA-22 y RN-11, y en CA-48 de esta spec.

## Revisión

- Aprobadores y fecha: pendiente. Aprobado por: (pendiente).
- Estado: Borrador. No pasa a Aprobada mientras no se respondan la pregunta 1 (puntos b y c), no decida BD las preguntas 4 y 5 (DBR-013, 2a y 2b), no se resuelva la fuente de los campos extra (pregunta 7), y no se aprueben `api-014` ampliada (D-2), `api-015` (D-1), la enmienda de ADR 0026 (D-3), DBR-013 (D-4) y ADR 0028 (D-5).
- Historial: borrador del 2026-11-11, redactado a partir de la solicitud de la sesión principal, `dashboard-008`, `dashboard-009`, `api-014`, `pwa-005` y `web-010`. Ampliación del mismo día con las decisiones del usuario: edición con `PATCH`, lectura pública en `api-015`, fotos en carpeta pública durante pruebas con recomendación, filtros de TulanPedia derivados de la API y permisos por seeder. Segunda ampliación del mismo día: foto reemplazable (CA-07, CA-08, CA-49), selección de la ficha pública (CA-07, RN-14), rechazo con diálogo obligatorio (CA-13) y decisiones de origen e imagen pendientes de BD. Tercera ampliación del mismo día: predeterminados de la ficha con origen marcado (CA-07, RN-14) y foto anterior borrada sin conservarla (CA-49). Cuarta ampliación del mismo día (tipo de animal): CA-03, CA-05, CA-07, CA-08, CA-48, RN-14 y pregunta 8 resuelta; obligatoriedad y publicación siempre, por confirmar.
- Evidencia/enlaces: `apps/dashboard/specs/008-memory-moderation.md`, `apps/dashboard/specs/009-species-request-review.md`, `apps/dashboard/specs/007-content-image-display.md`, `apps/api/specs/014-species-requests.md`, `apps/api/specs/015-public-species-read.md`, `apps/api/specs/010-visitor-memory-requests.md`, `apps/api/specs/006-public-catalog-read.md`, `apps/api/specs/013-object-storage-images.md`, `apps/pwa/specs/005-species-request-submission.md`, `apps/web/specs/010-dynamic-memories.md`, `apps/web/specs/011-dynamic-tulanpedia.md`, `docs/adr/0026-object-storage-s3-images.md`, `docs/adr/0027-dynamic-public-memories-gallery.md`, `docs/adr/0028-dynamic-tulanpedia-catalog.md`, `docs/database/requests/DBR-012-visitor-memories.md`, `docs/database/requests/DBR-013-species-requests.md`, `docs/propuestas/almacenamiento-objetos-s3.md`.
