# 010 · public-content-management: publicación de especies en TulanPedia

- App dueña: `dashboard`
- Apps/paquetes afectados: `dashboard` (secciones «Solicitudes de especies» y «Especies publicadas», navegación y vistas/hooks de revisión); `api` (dueña de reglas, estados, permisos, edición, publicación y auditoría: `api-014` para solicitudes de publicación y para la gestión de la publicación, `api-013` para imágenes, `api-015` para la lectura pública de especies publicadas); `packages/api-client` (métodos y tipos; sin lógica de negocio); `web` (consumidor público: `web-011` para TulanPedia; esta spec no cambia `web`); `pwa` (origen de las solicitudes, `pwa-005`; sin cambios aquí); `packages/ui` (solo si falta un componente compartido).
- Estado: Borrador
- Solicitante / responsable funcional de la revisión: (por designar)
- Aprobación funcional: pendiente.
- Aprobado por: (pendiente).
- Integra: `dashboard-009` (solicitudes de especie), que queda con la nota «Integrada en dashboard-010» y sin borrar su contenido. Esta spec es la referencia de la sección de publicación de especies de la navegación.
- Dependencias de contrato: `api-014` (Borrador; publicación, actualización, edición `PATCH`, selector, lista de publicadas y acciones de publicación), `api-015` (Borrador; lectura pública de especies publicadas), `api-013` (Borrador), DBR-013 (Borrador), ADR 0026 (Propuesto; enmienda del 2026-11-11 con las carpetas de especies), ADR 0028 (Propuesto), `web-011` (Borrador).

## Historial del cambio de modelo (2026-11-11 y 2026-11-12)

- **Versión anterior (incorrecta):** cada solicitud de especie era una especie **nueva** que se creaba en el catálogo al aceptarla.
- **Modelo actual (2026-11-11):** la solicitud es de **publicación de una especie existente**. El `zoo-admin` ve los datos actuales y los que se publicarán, los corrige si hace falta (sin cambiar el nombre común) y **publica** o rechaza. La especie no se crea.
- **Segunda ronda (2026-11-11):** la sección de especies gana «Especies publicadas» (publicar, despublicar, republicar, editar una especie despublicada y eliminar la publicación) y la solicitud puede ser de **actualización** de una especie publicada.
- **Tercera ronda (2026-11-12):**
  - La solicitud puede ser **sobre una especie despublicada**. Esa solicitud se marca con la etiqueta «Especie despublicada» y se ofrecen dos acciones: «Aceptar y publicar» y «Aceptar sin publicar» (CA-62). Para especies publicadas o sin publicar solo existe «Aceptar y publicar».
  - La regla de guardar antes de publicar (CA-10) queda **decidida**: aplica a «Aceptar y publicar», «Aceptar sin publicar» y «Republicar».
- **Numeración:** CA-01 a CA-17, CA-40 a CA-49 y CA-50 a CA-62 conservan su número. Cambian de contenido CA-02, CA-03, CA-05, CA-06, CA-07, CA-10, CA-11, CA-15, CA-17, CA-41, CA-46 y CA-47. Nuevos: sección F (CA-50 a CA-62). CA-18 a CA-38 quedan retirados (momentos, ver la siguiente ronda); CA-39 no se usa.
- **Cuarta ronda (2026-11-12, decisión del usuario): separación de momentos.** Los momentos para recordar (fotos de visitantes, `api-010`, `dashboard-008`, `web-010`, ADR 0027, permiso `memories.review`) y la publicación de especies en TulanPedia (solicitudes del veterinario, `api-014`, `species.review`) son flujos distintos. Esta spec se queda solo con las especies. La antigua sección B (momentos) sale de esta spec; sus CA, RN y menciones se retiran, y `dashboard-008` vuelve a ser una spec propia y vigente.

## Problema y contexto

El veterinario (`pwa`) propone la publicación o la actualización de especies existentes (`pwa-005`, `api-014`). Esas solicitudes necesitan una sección de revisión en el dashboard donde solo la Dirección (`zoo-admin`) pueda ver la foto, comparar los datos actuales con los propuestos, corregir lo necesario, y publicar, aceptar sin publicar o rechazar con un motivo. Las especies ya publicadas también necesitan gestión: despublicarlas, republicarlas, corregir su ficha cuando están ocultas y eliminar su publicación.

Regla de la sección: el dashboard solo presenta; la API decide estados, transiciones, permisos, publicación y auditoría.

Al publicar una especie, el catálogo de TulanPedia (`#animales` de `apps/web/src/index.html`) pasa a mostrar la especie publicada (`web-011`). Eso exige que la lectura pública devuelva solo las publicadas, lo que especifica `api-015`.

Afectados: `zoo-admin` (revisa y gestiona), `admin` (Presidencia; no tiene acceso), el veterinario (envía desde la PWA y consulta su lista), visitantes del portal (leen TulanPedia y la galería).

## Decisiones (2026-11-11 y 2026-11-12)

- Solo `zoo-admin` revisa, publica, edita, despublica, republica o elimina publicaciones de especie. `admin` (Presidencia) no tiene acceso: la API responde `403` y la sección no aparece.
- **Permisos (resuelta, decisión del usuario 2026-11-12):** un único permiso, `species.review`, cubre revisar, despublicar, republicar, editar una especie despublicada y eliminar la publicación. Se excluye de `admin` de forma explícita (`api-014` RN-10). La asignación en el seeder está pendiente (`api-014` tarea T-SEED).
- **Editar antes de publicar:** la persona revisora puede corregir los datos de una solicitud pendiente antes de decidir: nombre científico, hábitat, origen, tipo de animal, la selección de la ficha pública y la foto (`api-014` CA-14 a CA-23, CA-25). **El nombre común no es editable** (decidido; `api-014` RN-15).
- **Aceptar (resuelta, decisión del usuario 2026-11-12):**
  - Especie **despublicada** con solicitud viva: «Aceptar y publicar» (aplica los cambios y deja la especie publicada) y «Aceptar sin publicar» (aplica los cambios y la especie sigue despublicada, republicable después desde «Publicadas»).
  - Especie **publicada** (actualización): solo «Aceptar y publicar».
  - Especie **sin publicar** (primera publicación): solo «Aceptar y publicar».
  - Ver `api-014` CA-08 (parámetro `publish`) y CA-62 de esta spec.
- **Guardar antes de publicar (decidido; CA-10):** «Aceptar y publicar», «Aceptar sin publicar» y «Republicar» están deshabilitados mientras haya cambios sin guardar. Hay que guardar primero y después publicar. Es distinto de despublicar (CA-53).
- **Rechazo de especies:** motivo obligatorio de 1 a 500 caracteres. El veterinario no recibe notificación activa; ve el resultado y el motivo en «Mis solicitudes» (`pwa-005` CA-16). La confirmación del rechazo es un diálogo obligatorio, sin casilla adicional (CA-13).
- **Despublicar** oculta la especie del portal sin borrar nada (CA-53). **Republicar** vuelve a mostrarla sin solicitud nueva (CA-54). **Editar una especie despublicada** y luego republicar (resuelta, decisión del usuario 2026-11-12; CA-55). **Eliminar la publicación** borra foto y datos publicados, marca las solicitudes como eliminadas y deja la especie (CA-56). Eliminar no revierte las correcciones ya aplicadas a `species` (resuelta, decisión del usuario 2026-11-12).
- **Publicar = aceptar.** Publicar actualiza la especie existente en el catálogo público (`api-014` RN-14). No crea especies.
- **Imágenes (2026-11-11):** las fotos de solicitudes se guardan en `media/species-requests/` y las publicadas en `media/species/`. En pruebas, esas carpetas son públicas por `/media` (enmienda del ADR 0026). **El dashboard no usa `/media`:** todas las fotos de esta sección (pendientes y publicadas) llegan por rutas autenticadas (`GET .../{id}/image`, `api-014` CA-06 y CA-40). Recomendación antes de producción: almacenamiento privado (`api-014`, «Recomendación antes de producción»).
- **Noticias y eventos (imágenes):** `dashboard-007` (presentación de imágenes de noticias y eventos) no cambia.
- **Filtros de TulanPedia (2026-11-11):** el portal filtra por hábitat, por especie y por tipo de animal con valores que salen de la API (`web-011` CA-04 y CA-22).
- **Eventos y noticias:** sin cambios funcionales.
- **Ficha pública (2026-11-11):** el veterinario elige qué mostrar y la Dirección lo ajusta al editar (`api-014` RN-13; CA-07).
- **Tipo de animal (2026-11-11):** obligatorio en la solicitud y se publica siempre (decidido; `api-014` CA-25). No es desmarcable.
- **Portal:** la especie publicada aparece en TulanPedia (`web-011`); la despublicada o la eliminada no aparece (`api-015` CA-18); las fichas de muestra se retiran.

## Objetivos

- Que `zoo-admin` vea las solicitudes de publicación por estado y las abra con su foto y sus datos.
- Que distinga «Primera publicación», «Actualización» y «Especie despublicada» en cada solicitud.
- Que compare los datos actuales de la especie con los que se publicarán antes de decidir.
- Que corrija los datos de una solicitud pendiente antes de decidir, sin cambiar su estado.
- Que acepte con «Aceptar y publicar» o, si la especie está despublicada, con «Aceptar sin publicar»; o que rechace con un motivo.
- Que gestione las especies publicadas y despublicadas: despublicar, republicar, editar una despublicada y eliminar la publicación, con confirmación y auditoría.
- Que cada decisión y cada edición queden registradas en la API y se reflejen en la lista sin recargar la página.
- Que ningún error ni decisión tardía deje datos falsos en pantalla.

## Fuera de alcance

- Acceso de `admin` (Presidencia) o de cualquier otro rol a estas secciones.
- Crear especies desde esta sección o al publicar.
- Editar la ficha de una especie **publicada** sin despublicarla antes (CA-55). Para cambiarla, se despublica, se edita y se republica.
- Cambio del nombre común y eliminación de la especie (la especie nunca se borra; solo se elimina su publicación, CA-56).
- Edición de solicitudes publicadas o rechazadas.
- Reenvío o corrección de solicitudes por el veterinario; cancelación por el veterinario.
- Notificaciones push o correo al veterinario (opción futura; `pwa-005` riesgos).
- Solicitud de animales individuales (solo especies para el catálogo).
- Eventos y noticias: sin cambios funcionales.
- Modelo 3D, carrusel y fichas expandibles del portal (ver `web-011`).
- Pagos (`Payments` no se implementa sin spec, ADR y proveedor).
- Momentos para recordar: spec propia `dashboard-008`; son un flujo distinto, de visitantes, con el permiso `memories.review`.
- Búsqueda por texto, exportación o estadísticas de solicitudes.
- Cambios de estilo de `dashboard-007` o de la presentación de noticias y eventos.
- La lectura pública de especies (`GET /api/v1/published-species`) y su contrato: están en `api-015`.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos (API) |
|---|---|---|
| `zoo-admin` (Dirección) | Revisar, editar, aceptar (con o sin publicar), rechazar, despublicar, republicar, editar una especie despublicada y eliminar la publicación | `species.review`, con 2FA confirmado (`api-014` RN-01) |
| `admin` (Presidencia) | Sin acceso. La sección no aparece; si se abre por URL, la API responde `403` | Ninguno. Se excluye de `species.review` de forma explícita |
| `veterinarian` | Envía solicitudes desde la PWA (`pwa-005`); no revisa | Sesión válida y rol `veterinarian` (`api-014` CA-01 y CA-33). Consulta su lista en la PWA |
| `executive`, `cashier` | Sin acceso | — |
| Visitante del portal | Ve las especies publicadas (TulanPedia) | Ninguno; contenido público (`web-011`) |

## Historias de usuario

- Como `zoo-admin`, quiero ver las solicitudes de publicación pendientes para revisarlas antes de publicarlas en el catálogo.
- Como `zoo-admin`, quiero distinguir si una solicitud es de primera publicación, de actualización o sobre una especie despublicada.
- Como `zoo-admin`, quiero ver la foto y, lado a lado, los datos actuales de la especie y los que se publicarán, para decidir si son apropiados.
- Como `zoo-admin`, quiero corregir el nombre científico, el hábitat, el origen o el tipo de una solicitud antes de decidir.
- Como `zoo-admin`, quiero publicar una solicitud con una confirmación clara, o aceptarla sin publicarla si la especie está despublicada y quiero revisarla antes.
- Como `zoo-admin`, quiero rechazar una solicitud con un motivo.
- Como `zoo-admin`, quiero despublicar una especie para ocultarla sin perder su foto ni sus datos, republicarla después, o corregir su ficha mientras está oculta.
- Como `zoo-admin`, quiero eliminar la publicación de una especie cuando ya no debe estar en el catálogo, sabiendo que la especie y sus animales siguen existiendo.

## Criterios de aceptación

### A. Solicitudes de especie (absorbe `dashboard-009`)

- **CA-01 (visibilidad):** Dada una sesión con `species.review` y 2FA confirmado, cuando se muestra la navegación, entonces aparece «Solicitudes de especies». Sin ese permiso la sección no aparece, y si se abre por URL la vista muestra «No tienes permiso para revisar solicitudes de especies.». El dashboard no protege la ruta: la autorización es la de la API.

- **CA-02 (lista y filtro):** Dada la sección, cuando carga, entonces pide `GET /api/v1/admin/species-publication-requests` con `status` según el filtro (Todas, Pendiente → `submitted`, Publicada → `accepted`, Rechazada → `rejected`) y `page`. Muestra 10 por página, ordenadas por fecha de envío descendente, y controles «Anterior» y «Siguiente» según `meta.has_more`. Al cambiar el filtro, vuelve a consultar la API; no filtra en el cliente.

- **CA-03 (fila):** Dada una fila, cuando se muestra, entonces incluye nombre común de la especie, nombre científico propuesto (máximo 60 caracteres; más largo se trunca con «…»), tipo de animal (etiqueta en español), nombre del veterinario, fecha de envío formateada, la etiqueta del tipo de solicitud («Primera publicación» o «Actualización», `request_type`), la etiqueta **«Especie despublicada»** cuando la especie está despublicada (`api-014` CA-06, `current.is_published = false` con `current.published_at` no nulo), y la etiqueta del estado en español (Pendiente, Publicada, Rechazada) con icono, no solo color.

- **CA-04 (estados de la lista):** Dadas listas vacías o estados de error, cuando se presentan, entonces muestra «No hay solicitudes con este estado.» si está vacía; un estado de carga mientras llega la API; y un aviso de error con botón «Reintentar» si falla. Ningún error deja filas anteriores visibles como si fueran actuales.

- **CA-05 (detalle: actual frente a propuesto):** Dada una solicitud, cuando se abre, entonces pide `GET /api/v1/admin/species-publication-requests/{id}` y muestra:
  - Nombre común (de la especie, solo lectura y marcado «no editable»).
  - Tipo de solicitud: «Primera publicación» o «Actualización», y, si la especie está despublicada, la etiqueta «Especie despublicada».
  - Dos columnas comparadas: «Datos actuales» (lo que tiene la especie ahora: en una actualización, la versión publicada; en una despublicada, la última versión guardada) y «Datos propuestos» (lo que se publicará), para nombre científico, hábitat, origen y tipo de animal (etiqueta en español).
  - Foto: la pendiente (`has_new_photo`, CA-06) y, si la especie tiene foto publicada (`current.has_image`), la actual, con el texto «Sin foto nueva: se mantiene la foto publicada.» cuando la solicitud no trae foto.
  - Veterinario solicitante, fecha de envío y estado.
  - Ficha pública: las claves que la solicitud marca, en lectura.
  - El JSON no contiene URL de ninguna foto.

- **CA-06 (fotos de la solicitud y de la especie):** Dada una solicitud abierta, cuando se muestra su foto, entonces la vista obtiene la pendiente por `GET /api/v1/admin/species-publication-requests/{id}/image` y la publicada por `GET /api/v1/admin/species/{id}/image` (binarios, rutas autenticadas), y las muestra como blob en memoria, completas y centradas según `dashboard-007`, con `alt="Foto de {common_name}"` (pendiente) o `alt="Foto publicada de {common_name}"` (publicada). Las URL `blob:` se revocan al cerrar el detalle y al cambiar de solicitud. Si la API responde `404`, muestra «No se pudo cargar la foto.». La vista nunca construye ni muestra una URL de `/media`.

- **CA-07 (editar antes de decidir):** Dada una solicitud en Pendiente, cuando se pulsa «Editar», entonces se abre un formulario con nombre científico, hábitat, origen, tipo de animal (selector con la lista cerrada de `api-014` CA-25) y el bloque «Qué mostrar en la ficha pública» (casillas de `api-014` RN-13; «Nombre científico», «Origen» y «Hábitat» marcadas por defecto en una primera publicación, y las de la especie publicada en una actualización), precargados con lo que se publicará. El nombre común se muestra como texto, sin campo de edición. Desmarcar una casilla solo evita que el campo se muestre en el portal; el dato sigue guardado y visible para la Dirección. El formulario muestra la foto actual (CA-06) y el control «Cambiar foto» (JPG o PNG, máx. 5 MB). Al guardar, llama a `PATCH /api/v1/admin/species-publication-requests/{id}` como multipart, con los campos cambiados y la foto solo si se eligió una (`api-014` CA-15, CA-21 a CA-23). Al éxito (`200`), muestra los datos guardados, mantiene el estado Pendiente y muestra el aviso «Cambios guardados. La solicitud sigue pendiente.». La foto nueva se ve antes de guardar (CA-49).

- **CA-08 (validación de edición):** Dado el formulario de edición, cuando se valida, entonces nombre científico, hábitat y origen son opcionales (máximo 150 caracteres cada uno). Un campo vacío significa «sin corrección»: se mantiene el valor actual de la especie, y el formulario lo dice junto al campo («Vacío: se mantiene el valor actual.»). El tipo de animal es un selector de la lista cerrada, obligatorio (decidido); un `422` de `category` se muestra junto al selector. Los espacios sobrantes se quitan antes de enviar. Un `422` de la API se muestra junto al campo que lo causó (`api-014` CA-16) y el formulario no se cierra. «Cancelar» o Escape descartan los cambios sin llamar a la API. La foto se valida en el cliente como en el envío (JPG o PNG, máx. 5 MB; `pwa-005` CA-04), y la API valida de nuevo. Un `422` de foto (`api-014` CA-23) se muestra junto al control de foto.

- **CA-09 (edición solo en Pendiente):** Dada una solicitud Publicada o Rechazada, cuando se muestra su detalle, entonces no ofrece «Editar». Dada una solicitud Pendiente que otra persona ya revisó, cuando la API responde `422` («Esta solicitud ya fue revisada.», `api-014` CA-17), entonces la vista recarga el detalle con el estado actual y no cambia nada más.

- **CA-10 (guardar antes de publicar; decidido 2026-11-12):** Dada una solicitud Pendiente con cambios de edición sin guardar (también una foto elegida y no guardada), cuando la vista muestra «Aceptar y publicar» o «Aceptar sin publicar», entonces ambos botones están **deshabilitados** y muestran el aviso «Guarda los cambios antes de publicar.». Cuando se guardan los cambios, los botones se habilitan. La misma regla aplica a «Republicar» y a la edición de una especie despublicada (CA-54, CA-55). Es distinta de despublicar (CA-53), que no depende de cambios sin guardar. Así la confirmación muestra lo que se publicará.

- **CA-11 (publicar o actualizar):** Dada una solicitud Pendiente sin cambios sin guardar, cuando se pulsa «Aceptar y publicar», entonces se abre un diálogo. Para primera publicación dice «¿Aceptar y publicar esta especie? Quedará visible en el catálogo público para los visitantes.»; para actualización dice «¿Aceptar esta actualización? La ficha pública cambiará: se reemplazarán la foto y los datos publicados.» (si la solicitud trae foto nueva; si no, «se reemplazarán los datos publicados»). El diálogo muestra el nombre común y el nombre científico que se publicarán. Solo «Confirmar» llama a `POST /api/v1/admin/species-publication-requests/{id}/accept` con `{"publish": true}`. Al éxito (`200`), la solicitud pasa a Publicada, el detalle muestra «Publicada en el catálogo», se ocultan los botones de acción y aparece el aviso «Especie publicada. Ya es visible en el catálogo público.». «Cancelar» no llama a la API.

- **CA-12 (decisión tardía al publicar):** Dada una solicitud que la API ya no tiene en Pendiente, cuando se confirma la publicación o la aceptación y la API responde `422` («Esta solicitud ya fue revisada.»), entonces el detalle se recarga con el estado actual y no cambia nada más.

- **CA-13 (rechazar con confirmación y motivo):** Dada una solicitud Pendiente, cuando se pulsa «Rechazar», entonces se abre un diálogo con la pregunta «¿Seguro que quieres rechazar esta solicitud?», el campo «Motivo» (obligatorio, 1 a 500 caracteres), un contador («245/500») y dos botones: «Confirmar» y «Cancelar». «Confirmar» está deshabilitado mientras el motivo esté vacío, y no llama a la API. Al confirmar, llama a `POST /api/v1/admin/species-publication-requests/{id}/reject` con `{rejection_reason}`. «Cancelar» cierra el diálogo sin llamar a la API. La confirmación es obligatoria y no hay casilla adicional.

- **CA-14 (rechazo: éxito y error):** Al éxito (`200`), la solicitud pasa a Rechazada, el detalle muestra el motivo en lectura y las opciones de acción desaparecen; aparece el aviso «Solicitud rechazada. La especie no se publicó.» y el botón «Volver a la lista». Un `422` de motivo se muestra junto al campo sin cerrar el diálogo.

- **CA-15 (acciones según estado):** Dada una solicitud Pendiente, cuando se muestra, entonces ofrece «Editar», «Aceptar y publicar» (primario), «Aceptar sin publicar» (solo si la especie está despublicada, CA-62) y «Rechazar» (secundario). Dada una solicitud Publicada, solo lectura con «Publicada en el catálogo». Dada una solicitud Rechazada, solo lectura con el motivo visible. En la lista, Pendiente y Publicada muestran «Revisar»; Rechazada muestra «Ver».

- **CA-16 (diálogos accesibles):** Dado cualquier diálogo de esta sección, cuando se abre, entonces tiene `role="dialog"` y nombre accesible, mantiene el foco dentro, devuelve el foco al control que lo abrió al cerrarse, y se cierra con Escape sin llamar a la API.

- **CA-17 (errores):** Dada una respuesta de error en estas secciones, cuando llega, entonces: `401` vuelve al login con «Tu sesión expiró.» (`dashboard-002` CA-08); `403` muestra «No tienes permiso para revisar solicitudes de especies.»; `404` muestra «Solicitud no encontrada.», «Especie no encontrada.» o «Petición no encontrada.»; un fallo de red o `5xx` muestra un error con «Reintentar».

### B. Retirado de esta spec (momentos, 2026-11-12)

- **CA-18 a CA-38: retirados de esta spec.** Eran la sección de momentos (visibilidad, lista, detalle, imagen, aceptar con plazo, rechazar, errores, diálogos, accesibilidad, MVVM, estilo, cobertura, imagen sin persistencia y plazo visible). Esa sección vive solo en `dashboard-008`, spec propia y vigente, con sus CA-01 a CA-19. Los números no se reutilizan y no hay CA de momentos en esta spec.
### C. Efecto en el portal

- **CA-40 (especie publicada en TulanPedia):** Dada una solicitud aceptada con publicación, cuando el visitante carga TulanPedia en el ambiente con la API pública disponible (`api-015`), entonces la especie aparece en `#animales`. Verificación: prueba de contrato en `web-011` (CA-01) y evidencia manual en `arca_pruebas`.
- **CA-41 (no publicadas fuera del portal):** Dada una solicitud Pendiente o Rechazada, o una especie despublicada o eliminada, cuando el visitante carga TulanPedia, entonces la especie no aparece por esa causa (`api-015` CA-01 y CA-18; la visibilidad depende de `species.is_published`). Una solicitud viva sobre una especie despublicada tampoco la hace aparecer. Verificación: `api-015` (CA-01, CA-17, CA-18), `api-014` (CA-31, CA-32) y `web-011` (CA-02, CA-24).
- **CA-42 (fichas de muestra retiradas):** Tras esta feature, TulanPedia no muestra las fichas de muestra ni el aviso «Fichas de muestra». Verificación en `web-011` (CA-08).

### D. Imágenes (`media/`)

- **CA-43 (carpetas de especies):** Dada una solicitud aceptada con publicación, cuando se publica, entonces la foto pasa de `media/species-requests/` a `media/species/` según `api-014` CA-08; dada una solicitud rechazada, la foto se borra según `api-014` CA-10. Las dos carpetas están previstas en la enmienda del ADR 0026 (2026-11-11). Verificación: PHPUnit en `api-014` y revisión del ADR.
- **CA-44 (la sección no usa rutas de `/media`):** Dada una foto de solicitud pendiente o de especie publicada, cuando la sección la muestra, entonces la API no incluye su URL en ninguna respuesta (`api-014` CA-05, CA-06 y CA-40) y la vista solo usa el blob de `GET .../image` (CA-06). Verificación: test del cliente que comprueba que el detalle y la lista no usan `image_url` ni construyen rutas de `/media`. Una foto pendiente sigue siendo alcanzable por URL en pruebas (riesgo aceptado).
- **CA-45 (no cambia la presentación de noticias y eventos):** Dada la presentación de imágenes de noticias y eventos, cuando se revisa esta feature, entonces `dashboard-007` no cambia y sus pruebas siguen en verde.

### E. Transversales

- **CA-46 (MVVM y pruebas):** Dada la sección de solicitudes de especie, cuando se revisa, entonces ningún componente de `views/` o `components/` llama a `fetch`/`axios`; cada hook ViewModel llama a `@arca/api-client`; no hay cálculo de estados ni transiciones en el cliente; y existe una prueba de Vitest por cada CA-01 a CA-17 y CA-50 a CA-62 de esta spec.
- **CA-47 (trazabilidad documental):** Dada la revisión del PR, cuando se revisa la documentación, entonces `dashboard-009` contiene la nota «Integrada en dashboard-010» sin borrar contenido, `dashboard-009` contiene la nota del cambio de modelo que remite a esta spec, y `dashboard-008` no lleva nota de integración: es una spec propia y vigente. Verificación: revisión documental, no automatizada.
- **CA-48 (filtros de TulanPedia):** Dado el filtro de hábitat, el de especie y el de tipo de animal de TulanPedia, cuando se abren, entonces sus opciones salen de las especies publicadas (hábitat: `species.habitat`; especie: `common_name`; tipo de animal: `category`), como exigen `web-011` CA-03, CA-04 y CA-22. Verificación en `web-011`; esta spec solo lo referencia.
- **CA-49 (edición con foto nueva):** Dada una solicitud Pendiente con el formulario de edición abierto, cuando se elige una foto válida, entonces la vista muestra la vista previa de la nueva imagen (blob en memoria, con `alt` «Vista previa de la nueva foto de {common_name}») junto a la actual, sin subirla. La foto se envía solo al guardar. «Cancelar» o el cambio de solicitud revocan la URL `blob:` y descartan la foto. Tras guardar, la API borra la foto anterior y no la conserva (`api-014` CA-23). Un archivo que no sea JPG o PNG, o que supere 5 MB, se rechaza en la vista con «Elige una imagen JPG o PNG.» o con «La foto no puede superar 5 MB.» (`pwa-005` CA-04).

### F. Especies publicadas y despublicadas (2026-11-11 y 2026-11-12)

La sección «Especies publicadas» es la gestión de la publicación de especies existentes (`api-014` CA-35 a CA-40). Solo `zoo-admin` con `species.review` y 2FA la ve. Ninguna acción de esta sección crea ni borra especies.

- **CA-50 (visibilidad):** Dada una sesión con `species.review` y 2FA, cuando se muestra la navegación, entonces aparece «Especies publicadas» junto a «Solicitudes de especies». Sin ese permiso no aparece, y si se abre por URL la vista muestra «No tienes permiso para gestionar especies publicadas.».
  - Verificación: test de Vitest que nombra CA-50.

- **CA-51 (lista de publicadas y despublicadas):** Dada la sección, cuando carga, entonces pide `GET /api/v1/admin/published-species` con `status` (Todas, Publicadas → `published`, Despublicadas → `unpublished`) y `category` (Todos los tipos o uno de los seis de DBR-004), y `page`. Muestra 10 por página con «Anterior» y «Siguiente» según `meta.has_more`. Cada fila muestra la miniatura (blob de `GET /api/v1/admin/species/{id}/image`, `api-014` CA-40; «Sin foto» si no hay), nombre común, tipo de animal, fecha de publicación (`published_at`), estado («Publicada» o «Despublicada») y, si aplica, «Solicitud pendiente». Al cambiar un filtro, vuelve a consultar la API; no filtra en el cliente. Vacío: «No hay especies con este estado.».
  - Verificación: test de Vitest que nombra CA-51.

- **CA-52 (acciones según estado):** Dada una especie en la lista o en su detalle, cuando se muestra, entonces:
  - Publicada: «Despublicar» y «Eliminar publicación». No ofrece «Editar»: para editarla hay que despublicarla antes (CA-55).
  - Despublicada: «Editar», «Republicar» y «Eliminar publicación».
  - Cualquiera con `has_pending_request` = true: «Editar» y «Republicar» deshabilitados con el texto «Hay una solicitud pendiente para esta especie. Revísala en Solicitudes de especies.» (CA-57).
  - Verificación: test de Vitest que nombra CA-52.

- **CA-53 (despublicar):** Dada una especie Publicada, cuando se pulsa «Despublicar», entonces se abre un diálogo con el texto «¿Despublicar esta especie? Dejará de aparecer en el catálogo público. No se borra nada: la foto y los datos se conservan.» y «Confirmar» y «Cancelar». Solo «Confirmar» llama a `POST /api/v1/admin/species/{id}/unpublish`. Al éxito (`200`), la especie pasa a Despublicada en la lista y el detalle, y aparece el aviso «Especie despublicada. Ya no aparece en el catálogo público.». Un `422` («Esta especie no está publicada.») muestra el mensaje, recarga la especie y no cambia nada más. Este botón no depende de cambios sin guardar (CA-10).
  - Verificación: test de Vitest que nombra CA-53.

- **CA-54 (republicar):** Dada una especie Despublicada sin solicitud pendiente, cuando se pulsa «Republicar» (y no hay cambios sin guardar, CA-10), entonces se abre un diálogo con el texto «¿Republicar esta especie? Volverá a aparecer en el catálogo público con su foto y sus datos guardados.». Solo «Confirmar» llama a `POST /api/v1/admin/species/{id}/republish`. Al éxito (`200`), la especie pasa a Publicada y aparece el aviso «Especie republicada. Ya es visible en el catálogo público.». Un `422` muestra el mensaje de la API («No se puede republicar: falta la foto publicada.», «Esta especie ya está publicada.», «Hay una solicitud pendiente para esta especie. Decide sobre ella antes de republicar.» o «Esta especie no tiene una ficha publicada para restaurar.») y recarga la especie. Republicar no crea solicitud (`api-014` CA-36).
  - Verificación: test de Vitest que nombra CA-54.

- **CA-55 (editar una especie despublicada, luego republicar):** Dada una especie Despublicada sin solicitud pendiente, cuando se pulsa «Editar», entonces se abre un formulario con nombre científico, hábitat, origen, tipo de animal (lista cerrada), la selección de la ficha pública (casillas de `api-014` RN-13, precargadas con las publicadas) y el control «Cambiar foto» (JPG o PNG, máx. 5 MB), con la foto actual (CA-06). El nombre común se muestra como texto y no es editable (`api-014` RN-15). «Guardar cambios» llama a `PATCH /api/v1/admin/species/{id}/publication`; el estado sigue siendo Despublicada y **no se publica nada**. Tras guardar (`200`), aparece «Cambios guardados. La especie sigue despublicada.» y se habilita «Republicar» (CA-10 y CA-54). «Cancelar» o Escape descartan los cambios sin llamar a la API. Un `422` se muestra junto al campo que lo causó (`api-014` CA-37, CA-21, CA-23 y CA-25), sin cerrar el formulario.
  - Verificación: test de Vitest que nombra CA-55, con cliente simulado y comprobación de que «Republicar» está deshabilitado con cambios sin guardar.

- **CA-56 (eliminar la publicación):** Dada una especie Publicada o Despublicada, cuando se abre la sección «Eliminar publicación» (un bloque propio dentro del detalle, separado de «Despublicar» y de «Editar»), entonces muestra el aviso «Esto elimina la foto y los datos publicados; la especie seguirá existiendo.» y la casilla «Entiendo que se borran la foto y los datos publicados» (propuesta por confirmar, pregunta 23). «Confirmar» solo se habilita con la casilla marcada. Un diálogo de confirmación repite el texto del aviso y tiene «Confirmar» y «Cancelar». Solo «Confirmar» llama a `DELETE /api/v1/admin/species/{id}/publication`. Al éxito (`200`), la especie sale de la lista de publicadas (`publication_status` = `not_published`) y aparece el aviso «La publicación se eliminó. Para publicarla de nuevo, el veterinario debe enviar una solicitud.». Tras la acción no se muestra la foto ni los datos publicados. No hay forma de deshacerla desde la sección. Un `422` («Esta especie no tiene publicación que eliminar.») recarga la especie.
  - Verificación: test de Vitest que nombra CA-56, con la casilla deshabilitada y el texto exacto.

- **CA-57 (bloqueo con solicitud viva):** Dada una especie con `has_pending_request` = true, cuando se muestra la sección, entonces «Editar» y «Republicar» aparecen deshabilitados con el aviso de CA-52 y un enlace a «Solicitudes de especies». «Despublicar» y «Eliminar publicación» siguen disponibles. Si la API responde `422` por solicitud pendiente, la vista muestra el mensaje y recarga la especie.
  - Verificación: test de Vitest que nombra CA-57.

- **CA-58 (errores de la sección):** Dada una respuesta de error en esta sección, cuando llega, entonces: `401` vuelve al login con «Tu sesión expiró.»; `403` muestra «No tienes permiso para gestionar especies publicadas.»; `404` muestra «Especie no encontrada.»; `422` muestra el mensaje junto al campo o, si es de estado, recarga la especie; un fallo de red o `5xx` muestra un error con «Reintentar». Ningún error deja datos anteriores visibles como actuales.
  - Verificación: test de Vitest que nombra CA-58.

- **CA-59 (diálogos accesibles):** Igual que CA-16 para los diálogos de despublicar, republicar y eliminar la publicación.
  - Verificación: test de Vitest que nombra CA-59.

- **CA-60 (MVVM y pruebas de la sección F):** Ningún componente de `views/` o `components/` de la sección F llama a `fetch`/`axios` ni calcula estados, permisos o elegibilidad (`publication_status` y `has_pending_request` llegan de la API). Las llamadas van por hooks ViewModel con `@arca/api-client`. Cada CA-50 a CA-62 tiene al menos una prueba de Vitest que lo nombra (CA-46).
  - Verificación: test de Vitest que nombra CA-60 y revisión de imports.

- **CA-61 (datos de la solicitud sobre especie despublicada):** Dada una solicitud `update` sobre una especie despublicada, cuando se abre el detalle, entonces muestra la etiqueta «Especie despublicada» (CA-03, CA-05), «Datos actuales» con la última versión guardada y «Datos propuestos» con lo que se publicará, y el aviso «La especie no aparece en el catálogo hasta que la aceptes con «Aceptar y publicar».».
  - Verificación: test de Vitest que nombra CA-61.

- **CA-62 (aceptar una solicitud sobre especie despublicada; resuelta, decisión del usuario 2026-11-12):** Dada una solicitud Pendiente sobre una especie despublicada, cuando la Dirección pulsa aceptar, entonces ofrece dos acciones:
  - «Aceptar y publicar» (primaria): aplica los cambios, deja la especie publicada y llama a `POST /api/v1/admin/species-publication-requests/{id}/accept` con `{"publish": true}`. Diálogo: «¿Aceptar y publicar esta especie? Quedará visible en el catálogo público para los visitantes.».
  - «Aceptar sin publicar» (secundaria): aplica los cambios y la especie sigue despublicada, republicable después desde «Publicadas» (CA-54). Llama al mismo endpoint con `{"publish": false}`. Diálogo: «¿Aceptar sin publicar? Los cambios quedarán guardados, pero la especie seguirá oculta en el catálogo. Podrás republicarla desde Especies publicadas.». Al éxito, aparece el aviso «Cambios aceptados. La especie sigue despublicada.».
  - Para una especie **publicada** (actualización) o **sin publicar** (primera publicación) solo existe «Aceptar y publicar» (CA-11). No aparece «Aceptar sin publicar».
  - Ambas acciones respetan CA-10: deshabilitadas mientras haya cambios sin guardar, con el aviso «Guarda los cambios antes de publicar.».
  - Un `422` («Esta solicitud ya fue revisada.» o «Esta solicitud solo puede aceptarse publicándola.») se muestra y recarga el detalle (CA-12). Un `422` por `publish` no booleano no puede ocurrir desde la vista.
  - Verificación: test de Vitest que nombra CA-62 con cliente simulado: en una especie despublicada aparecen las dos acciones y envían `publish` true o false; en una publicada o sin publicar solo aparece «Aceptar y publicar».

## Reglas de negocio

- **RN-01 (solo presentación):** Las pantallas no deciden permisos, estados, transiciones, plazos, ediciones válidas, elegibilidad ni publicación. La API es la única autoridad (`api-014` RN-05, `api-010` RN-02). Ocultar una sección no la protege.
- **RN-02 (acceso):** Solo `zoo-admin` tiene `species.review`, con 2FA. `admin`, `executive`, `cashier` y `veterinarian` no lo tienen (`api-014` RN-01 y RN-10).
- **RN-03 (estados en español):** Solicitudes: Pendiente = `submitted`, Publicada = `accepted`, Rechazada = `rejected`. Especie: Publicada, Despublicada, Pendiente (`publication_status` de `api-014` RN-18). El texto en español lo pone la vista.
- **RN-04 (edición previa):** La edición de una solicitud solo es posible en Pendiente; la edición de una especie solo es posible en Despublicada. Ninguna cambia el estado de publicación ni publica por sí sola. La API valida de nuevo (`api-014` CA-16, CA-37). Cada cambio queda en auditoría (`api-014` RN-12).
- **RN-05 (publicar y aceptar):** Publicar o aceptar hace visible la especie en el catálogo público (salvo «Aceptar sin publicar», CA-62) y requiere confirmación explícita. No se publica con cambios sin guardar (CA-10, decidido). Publicar no crea especies (`api-014` RN-14).
- **RN-06 (motivo de rechazo):** El motivo de rechazo es obligatorio, de 1 a 500 caracteres. El dashboard lo ayuda con el contador y el botón deshabilitado; la API valida de nuevo (`api-014` CA-10 y CA-11).
- **RN-07 (fotos):** La API no devuelve URL de ninguna foto. La sección las muestra por ruta autenticada, como blob en memoria (`api-014` RN-04, RN-08). Al publicar, la foto pasa a `media/species/` (pública por diseño); al rechazar, se borra. En pruebas, la carpeta de pendientes es alcanzable por `/media` si se conoce la URL: riesgo aceptado (ver «Datos, privacidad y auditoría»).
- **RN-08 (retirada, 2026-11-12):** La regla de motivo y campos de momentos sale de esta spec. Vive en `dashboard-008` (CA-09) y `api-010` (RN-20). El número se conserva para no renumerar.
- **RN-09 (sin feedback activo al veterinario):** El rechazo no notifica al veterinario por aviso activo; el veterinario lo consulta en «Mis solicitudes» (`pwa-005` CA-16). La PWA no muestra el resultado en el momento del envío (`pwa-005` CA-07).
- **RN-10 (sin almacenamiento local):** La sección no guarda solicitudes, fotos, motivos, opiniones ni especies en el navegador. La imagen existe solo en memoria como blob mientras se ve.
- **RN-11 (textos):** Todos los textos visibles están en español; identificadores, rutas y campos están en inglés (Constitución VI).
- **RN-12 (MVVM):** Componentes como Views, hooks como ViewModels, datos mediante `@arca/api-client` (`apps/dashboard/AGENTS.md`).
- **RN-13 (confirmación de rechazo):** Rechazar exige un diálogo de confirmación obligatorio y el motivo; no hay casilla adicional (CA-13).
- **RN-14 (ficha pública):** La Dirección ve y ajusta la selección de campos solo mientras la solicitud está Pendiente, o la de una especie Despublicada (CA-55). La lista de campos y los predeterminados los define la API (`api-014` RN-13); la vista no decide qué se publica (RN-01). El tipo de animal se publica siempre y no es desmarcable (decidido; `api-014` RN-13).
- **RN-15 (nombre común no editable; decidido):** El nombre común es la identidad de la especie, de la fila de `species` que lee `mobile` (`api-006`) y de los animales. La vista lo muestra como texto y no ofrece campo de edición (CA-07, CA-55; `api-014` RN-15).
- **RN-16 (eliminar no revierte):** Eliminar la publicación no revierte las correcciones ya aplicadas a la especie (nombre científico, hábitat, origen, tipo). La vista lo dice en el diálogo de CA-56 si hay correcciones aplicadas (texto propuesto: «Las correcciones ya aplicadas a la ficha de la especie se conservan.»). Decidido 2026-11-12.

## Datos, privacidad y auditoría

- **Solicitudes de especie:** datos de la especie, foto de un animal o de una especie, y el nombre del veterinario que envía (dato de personal, visible solo a `zoo-admin`). No hay datos personales de visitantes.
- **Especies publicadas y despublicadas:** nombre común, tipo, fechas, foto publicada y ficha pública. Son datos del zoológico, no personales.
- **Auditoría:** la API registra en Activitylog cada publicación, actualización, aceptación sin publicar, rechazo, edición, despublicación, republicación, edición de especie despublicada y eliminación de publicación (`api-014` RN-12; historial en Activitylog, decidido). El dashboard no escribe auditoría.
- **Privacidad de fotos:**
  - Las fotos de solicitudes pendientes no tienen URL en las respuestas de la API. La vista las pide por ruta autenticada.
  - En pruebas, `media/species-requests/` y `media/species/` se publican por `/media` (enmienda del ADR 0026, riesgo m). Quien conozca la URL puede ver una foto pendiente o de una especie despublicada. La sección no lo evita.
  - **Recomendación antes de producción:** almacenamiento privado (`api-014`, «Recomendación antes de producción»).
- No se guarda nada en el navegador (RN-10).
- Requiere DBR: sí, para `species_publication_requests` y las columnas de `species` (ver DBR-013, Borrador).

## Flujos y errores

### Solicitudes de especie

1. `zoo-admin` entra con `species.review` y 2FA. Ve «Solicitudes de especies».
2. La lista carga las solicitudes Pendientes (o el filtro elegido).
3. «Revisar» abre el detalle con la foto, el tipo de solicitud, la etiqueta de especie despublicada si aplica, y la comparación de datos actuales y propuestos.
4. Opcional: «Editar» → cambios → «Guardar cambios» (la solicitud sigue Pendiente).
5. Con cambios guardados: «Aceptar y publicar» → diálogo → «Confirmar» → Publicada; la especie queda visible (`api-015` y `web-011`). Si la especie está despublicada, también «Aceptar sin publicar» → diálogo → «Confirmar» → la especie sigue despublicada (CA-62).
6. O «Rechazar» → motivo → «Confirmar» → Rechazada; la foto se borra.
7. Errores: `401` → login; `403` → aviso; `404` → no encontrada; `422` → recarga o error junto al campo; red → «Reintentar».

### Especies publicadas

1. `zoo-admin` abre «Especies publicadas» y filtra por estado y tipo (CA-51).
2. Sobre una publicada: «Despublicar» (CA-53) u «Eliminar publicación» (CA-56).
3. Sobre una despublicada: «Editar» → «Guardar cambios» (CA-55) → «Republicar» (CA-54), o «Eliminar publicación» (CA-56).
4. Con solicitud pendiente: «Editar» y «Republicar» deshabilitados (CA-57); la decisión se toma en «Solicitudes de especies».

## Dependencias pendientes

Estas dependencias bloquean la aprobación de esta spec. Su estado a 2026-11-12 es el de cada línea.

- **D-1 · Lectura pública de especies publicadas: en contrato (Borrador).** `api-015` (`GET /api/v1/published-species`), que lee `species` con `is_published = 1`. Afecta a CA-40, CA-41 y `web-011`.
- **D-2 · Solicitud, edición y gestión de publicación: en contrato (Borrador).** `api-014` (CA-14 a CA-19, CA-26 a CA-41). Afecta a CA-07 a CA-10 y a la sección F.
- **D-3 · Carpetas de especies en el ADR 0026: resuelta por decisión del usuario (2026-11-11), pendiente de aprobación formal.** Afecta a CA-43 y CA-44.
- **D-4 · DBR-013:** tabla `species_publication_requests` (con `request_type`) y columnas de `species` (`is_published`, `published_at`, `unpublished_at`, `image_path`, `published_fields`). Pendiente de BD (ver DBR-013). No hay implementación de la API antes de su aprobación ni de `Lista para backend`.
- **D-5 · ADR 0028 (Propuesto):** excepción del portal para TulanPedia (`web-011`). Hasta su aprobación, `web-011` no puede implementarse.

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:** D-1 a D-5; `api-014` (Borrador), `api-015` (Borrador), `api-013` (Borrador), `dashboard-002` (sesión y 401), `dashboard-007` (imagen completa), `api-007` (2FA y rutas `/api/v1/admin`), `pwa-005` (origen de solicitudes). No hay dependencia nueva de npm: si se necesita un icono, se añade en `components/Icon.tsx` del dashboard.
- **Riesgos:**
  - Dos personas revisan a la vez: CA-12 resuelve la decisión tardía sin duplicar la acción.
  - Edición concurrente: si otra persona cambia la solicitud o la especie mientras se edita o se decide, la API responde `422` o `404` y la vista recarga (CA-09, CA-12, CA-58; `api-014` CA-41).
  - **Publicar cambia la especie compartida:** la confirmación de publicar muestra lo que se guardará (CA-10 y CA-11). La publicación es solo del portal: mobile no la recibe. Lo compartido es la fila de `species` que lee la app móvil (`api-006`), así que las correcciones le llegan, y afectan a los animales de esa especie. Una `category` asignada cuenta en las misiones de `mobile-005`. Eliminar la publicación no las revierte (RN-16).
  - **Aceptar sin publicar** deja cambios aplicados con la especie oculta: la Dirección debe recordar republicarla. La lista de publicadas la muestra como Despublicada.
  - **Eliminar la publicación** borra la foto y los datos publicados; el veterinario deja de ver esas solicitudes en «Mis solicitudes» (`api-014` pregunta 18).
  - La vista compara datos actuales y propuestos, pero no calcula cuál es correcto: la decisión es de la Dirección.
  - Foto pendiente o de especie despublicada alcanzable por `/media` en pruebas si se conoce su URL (D-3; ADR 0026, riesgo m). La sección no lo evita.
  - Una foto grande tarda en cargar: se muestra el estado de carga (CA-06 y CA-22).
  - Mientras `api-015` no esté aprobada, el portal no mostrará especies publicadas y TulanPedia quedará vacía (ver `web-011`).
- **Preguntas pendientes** (las resueltas van marcadas):
  1. **Edición de la solicitud pendiente.** **Resuelta, decisión del usuario 2026-11-11** (campos: CA-07 y CA-08; foto: CA-49). El nombre común no es editable (decidido). **Resuelta:** la regla de guardar antes de publicar es decidida (CA-10, decisión del usuario 2026-11-12).
  2. **Contrato público y de edición.** **Resuelta, decisión del usuario 2026-11-11:** la lectura pública es `api-015`; la edición es el `PATCH` de `api-014`.
  3. **Foto pendiente en `/media`.** **Resuelta, decisión del usuario 2026-11-11:** `media/species-requests/` es pública en pruebas, con la enmienda del ADR 0026 y la recomendación antes de producción.
  4. **Origen y campo público.** **Pendiente: responsable de BD** (DBR-013, 2a). Afecta a `api-015` RN-06.
  5. **Imagen de la especie.** **Resuelta por diseño (2026-11-11), BD puede objetar:** columna `species.image_path` (DBR-013, 2b).
  6. **Casilla de confirmación del rechazo.** **Resuelta, decisión del usuario 2026-11-11:** sin casilla (CA-13).
  7. **Contenido de la ficha pública.** **Resuelta, decisión del usuario 2026-11-11:** `pwa-005` CA-09 y `api-014` RN-13. **Sigue abierta** la fuente de los campos extra (`api-014` pregunta 3; DBR-013 pregunta 8): pendiente de BD.
  8. **Opciones de filtro en TulanPedia.** **Resuelta, decisión del usuario 2026-11-11.**
  9. **(a) Despublicar una especie.** **Resuelta, decisión del usuario 2026-11-11** (CA-53).
  10. **(b) Nueva publicación para actualizar la foto.** **Resuelta, decisión del usuario 2026-11-11:** sí, con `update` (`api-014` pregunta 10).
  11. **(c) Nombre común no editable.** **Resuelta, decisión del usuario 2026-11-11** (`api-014` RN-15).
  12. **(d) Especie despublicada y solicitud.** **Resuelta, decisión del usuario 2026-11-12:** el veterinario puede enviar sobre una especie despublicada; la solicitud aparece en la bandeja de la Dirección con la etiqueta de CA-03 (`api-014` pregunta 16).
  13. **(e) Aceptar sin publicar.** **Resuelta, decisión del usuario 2026-11-12** (CA-62; `api-014` pregunta 22).
  14. **(f) Permiso único.** **Resuelta, decisión del usuario 2026-11-12** (`api-014` pregunta 14).
  15. **(g) Editar una especie despublicada.** **Resuelta, decisión del usuario 2026-11-12** (CA-55; `api-014` pregunta 15).
  16. **(h) Foto nueva de una especie despublicada.** **Abierta, propuesta por confirmar** (`api-014` pregunta 15, punto c). Propuesta: se guarda en `media/species/` y la anterior se borra tras confirmar (CA-55).
  17. **(i) Límite del motivo.** **Abierta, propuesta por confirmar** (`api-014` pregunta 17). Afecta a `pwa-005` CA-18 y CA-33 de `api-014`.
  18. **(j) Republicar exige foto y datos publicados.** **Abierta, propuesta por confirmar** (`api-014` pregunta 20). Afecta a CA-54.
  19. **(k) Historial del veterinario tras eliminar.** **Abierta, propuesta por confirmar** (`api-014` pregunta 18). Afecta a CA-56 y a `pwa-005`.
  20. **(l) Nombres de endpoints.** **Abierta, propuesta por confirmar** (`api-014` pregunta 19).
  21. **(m) `published_at` de una actualización.** **Abierta, propuesta por confirmar** (`api-014` pregunta 21).
  22. **(n) Texto de la casilla de CA-56.** **Abierta, propuesta por confirmar.** Propuesta: «Entiendo que se borran la foto y los datos publicados». Si se quiere confirmación por escrito, se cambia en CA-56.
  23. **(o) Casilla de confirmación de eliminar.** **Abierta, propuesta por confirmar.** Propuesta: la casilla de CA-56 es obligatoria; alternativa: diálogo sin casilla.

## Revisión

- Aprobadores y fecha: pendiente. Aprobado por: (pendiente).
- Estado: Borrador. No pasa a Aprobada mientras no se respondan las preguntas abiertas funcionales (16 a 23), no decida BD la pregunta 4 y la de campos extra (DBR-013), no se aprueben `api-014` (D-2), `api-015` (D-1), la enmienda de ADR 0026 (D-3), DBR-013 (D-4) y ADR 0028 (D-5).
- Historial: borrador del 2026-11-11, redactado a partir de la solicitud de la sesión principal, `dashboard-008`, `dashboard-009`, `api-014`, `pwa-005` y `web-010`. Ampliaciones del mismo día: edición con `PATCH`, lectura pública en `api-015`, fotos en carpeta pública durante pruebas, filtros de TulanPedia derivados de la API, permisos por seeder, foto reemplazable, selección de la ficha pública, rechazo con diálogo obligatorio, foto anterior borrada, tipo de animal. **2026-11-11, cambio de modelo:** la solicitud es de publicación de una especie existente; sección A reescrita (CA-05, CA-07, CA-11, CA-15). **2026-11-11 (segunda ronda):** sección F nueva (especies publicadas: despublicar, republicar, editar una despublicada, eliminar la publicación; CA-50 a CA-61); solicitud de actualización (CA-03, CA-05, CA-06, CA-61). **2026-11-12 (tercera ronda, decisiones del usuario):** «Especie despublicada» en las solicitudes (CA-03, CA-05, CA-61) y solicitud de especie despublicada; **CA-10 decidido** (guardar antes de publicar, aplica también a «Aceptar sin publicar» y «Republicar»); **CA-62 nuevo** (aceptar con «Aceptar y publicar» o «Aceptar sin publicar» sobre especie despublicada); permiso único `species.review` y edición de especie despublicada resueltos; eliminar no revierte correcciones (RN-16); CA-41 y CA-46 actualizados. **2026-11-12 (cuarta ronda, decisión del usuario): separación de momentos.** Momentos para recordar sale de esta spec: se retiran la antigua sección B (CA-18 a CA-38, marcados como retirados), la historia, el objetivo, el flujo, los actores de `memories.review`, las dependencias de `api-010`, `web-010`, ADR 0027 y DBR-012, y RN-08 queda como retirada. CA-46 y CA-47 se ajustan. Esta spec trata solo la publicación de especies en TulanPedia. `dashboard-008` vuelve a ser spec propia y vigente, con su contenido intacto. **Mobile (decisión del usuario 2026-11-12):** la publicación de especies es solo del portal web. Mobile no recibe esta función ni pantallas nuevas; despublicar o eliminar la publicación no quita la especie de la app móvil (`api-006` no filtra por `is_published`, a propósito; `api-014` pregunta 23 resuelta).
- Evidencia/enlaces: `apps/dashboard/specs/009-species-request-review.md`, `apps/dashboard/specs/007-content-image-display.md`, `apps/api/specs/014-species-requests.md`, `apps/api/specs/015-public-species-read.md`, `apps/api/specs/006-public-catalog-read.md`, `apps/api/specs/013-object-storage-images.md`, `apps/pwa/specs/005-species-request-submission.md`, `apps/web/specs/011-dynamic-tulanpedia.md`, `docs/adr/0026-object-storage-s3-images.md`, `docs/adr/0028-dynamic-tulanpedia-catalog.md`, `docs/database/requests/DBR-013-species-requests.md`.
