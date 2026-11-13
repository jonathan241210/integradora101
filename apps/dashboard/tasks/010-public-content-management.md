# Tareas · 010 · public-content-management

- Spec: `apps/dashboard/specs/010-public-content-management.md` (Estado: **Aprobada**, Jonathan, 2026-11-12).
- Plan: `apps/dashboard/plan/010-public-content-management.md` (Estado: **Aprobado**, Jonathan, 2026-11-13).
- Estado: **Aprobado** (Jonathan, responsable de backend, 2026-11-13). Implementación pendiente de iniciar; coordinación en `docs/trabajo-paralelo-momentos-especies.md`.
- Checklist: ninguna tarea está marcada como hecha. Cada T-xx se marca solo con evidencia (PR, salida de `npm test`, nota de verificación manual o enlace a la prueba de la otra app).
- Alcance: solo publicación de especies (TulanPedia). Los momentos son de `dashboard-008` y no se tratan aquí. CA-18 a CA-38 están retirados: no se cubren.
- Dependencias: `api-014` y `api-015` aprobadas, **sin implementar**; DBR-013 en «Lista para backend» desde el 2026-11-12 (migración aplicada en `arca_pruebas`, lote 5). Las tareas de base de datos (DBR, migración, pruebas y evidencia) pertenecen al responsable de BD y a `apps/api`; esta lista no las incluye. Solo aparecen como precondición en T-01.
- Inicio: las tareas de cliente (T-02 a T-22) pueden empezar con pruebas de contrato simuladas. DBR-013 ya cumple «Lista para backend» (2026-11-12). La integración (T-27) y el cierre requieren además `api-014` y `api-015` implementadas (pregunta 3 del plan resuelta el 2026-11-13: sí).

## Trazabilidad

| Criterio / regla | Tareas que lo cubren |
|---|---|
| CA-01 | T-05, T-15 |
| CA-02 | T-02, T-06 |
| CA-03 | T-07 |
| CA-04 | T-06 |
| CA-05 | T-02, T-08, T-09 |
| CA-06 | T-02, T-08 |
| CA-07 | T-02, T-10, T-11 |
| CA-08 | T-04, T-10, T-11 |
| CA-09 | T-10 |
| CA-10 | T-10, T-12, T-20 |
| CA-11 | T-02, T-12, T-14 |
| CA-12 | T-12 |
| CA-13 | T-02, T-13 |
| CA-14 | T-13 |
| CA-15 | T-07, T-09 |
| CA-16 | T-14, T-19, T-27 |
| CA-17 | T-04, T-15 |
| CA-40 | T-23 (cruzado; evidencia en `api-015` y `web-011`) |
| CA-41 | T-23 (cruzado) |
| CA-42 | T-23 (cruzado; `web-011`) |
| CA-43 | T-24 (documental; PHPUnit de `api-014`) |
| CA-44 | T-08, T-22 |
| CA-45 | T-22 (regresión) |
| CA-46 | T-21, T-25 |
| CA-47 | T-24 (documental) |
| CA-48 | T-23 (cruzado; `web-011`) |
| CA-49 | T-04, T-10, T-11 |
| CA-50 | T-05 |
| CA-51 | T-03, T-16 |
| CA-52 | T-17 |
| CA-53 | T-18, T-19 |
| CA-54 | T-18, T-19 |
| CA-55 | T-20 |
| CA-56 | T-03, T-18, T-19 |
| CA-57 | T-17, T-18 |
| CA-58 | T-04, T-21 |
| CA-59 | T-19, T-27 |
| CA-60 | T-21 |
| CA-61 | T-08, T-09 |
| CA-62 | T-12, T-14 |
| RN-01 | T-01, T-21 |
| RN-02 | T-05 |
| RN-03 | T-04, T-07, T-16 |
| RN-04 | T-10 |
| RN-05 | T-01, T-12 |
| RN-06 | T-13 |
| RN-07 | T-02, T-03, T-08, T-22 |
| RN-08 | Retirada (momentos, `dashboard-008`); sin tarea |
| RN-09 | T-13 |
| RN-10 | T-04, T-22 |
| RN-11 | T-04, T-27 (revisión de textos) |
| RN-12 | T-21, T-26 |
| RN-13 | T-13, T-14 |
| RN-14 | T-10, T-11, T-20 |
| RN-15 | T-11, T-20 |
| RN-16 | T-19 |

Cobertura: CA vigentes sin tarea = 0 (40 de 40: CA-01 a CA-17, CA-40 a CA-62). RN vigentes sin tarea = 0 (RN-08 retirada).

## Precondiciones

- [ ] **T-01** (RN-01, RN-05; precondición de CA-46): verificar el estado de las dependencias y registrar la decisión en el PR.
  - Contenido: (a) `api-014` y `api-015` Aprobadas con el contrato del plan («Endpoints consumidos» y «Tipos»); (b) enmiendas G-1 (`publication_status` en la fila de la lista), G-2 (`species_id` en el detalle), G-3 (`current.publication_status` en el detalle) pedidas a `api-014` y respondidas; (c) respuestas a las preguntas 1 a 8 del plan; (d) estado de DBR-013 y de la migración en `arca_pruebas`, con fecha.
  - Archivos: ninguno (sin código).
  - Hecho cuando: el PR o el hilo de aprobación enlaza las respuestas; G-1 a G-3 están aceptadas o rechazadas explícitamente; el estado de DBR-013 consta por fecha. **Nota (2026-11-12, sin marcar):** en el punto (d), la migración está aplicada en `arca_pruebas` (lote 5), verificada por consulta de solo lectura de backend; fecha y responsable de la aplicación: por registrar por BD. Los puntos (a) a (c) siguen abiertos. Si G-1 o G-3 se rechazan, T-07 y T-09 se marcan como bloqueadas, no se resuelven en la UI. Decisiones registradas en el plan el 2026-11-13: G-1 a G-3 incorporadas en `api-014` (2026-11-13); preguntas 1 a 8 resueltas salvo la 7.

## Cliente de API (`packages/api-client`)

- [ ] **T-02** (CA-02, CA-05, CA-06, CA-07, CA-11, CA-13; RN-07): métodos y tipos de `speciesPublicationRequests` (`list`, `get`, `update`, `accept`, `reject`, `image`).
  - Archivos: `packages/api-client/admin-types.ts` (DTO y entradas del plan), `packages/api-client/admin.ts` (namespace `speciesPublicationRequests`; `update` usa `contentFormData(…, "PATCH")` con archivo), `packages/api-client/index.ts` (exports de tipos nuevos).
  - Test: `apps/dashboard/src/tests/species-api-client.test.tsx` con `fetch` simulado. Nombres: `CA-02 species-api-client: list envía status solo si hay filtro y page`, `CA-05 species-api-client: get usa la ruta del detalle`, `CA-06 species-api-client: image devuelve blob por ruta autenticada, sin image_url`, `CA-07 species-api-client: update sin archivo es PATCH JSON; con archivo es POST con _method=PATCH y published_fields como cadena JSON`, `CA-11 species-api-client: accept envía {publish: true} o {publish: false}`, `CA-13 species-api-client: reject envía {rejection_reason}`.
  - Hecho cuando: `npm run types` sin errores y las pruebas nombradas en verde.

- [ ] **T-03** (CA-51, CA-53, CA-54, CA-55, CA-56; RN-07): métodos y tipos de `publishedSpecies` (`list`, `get`, `update`, `unpublish`, `republish`, `removePublication`, `image`).
  - Archivos: `packages/api-client/admin-types.ts`, `packages/api-client/admin.ts` (namespace `publishedSpecies`), `packages/api-client/index.ts`.
  - Test: en `species-api-client.test.tsx`. Nombres: `CA-51 species-api-client: list envía status y category solo si hay filtro`, `CA-53 species-api-client: unpublish es POST sin cuerpo`, `CA-54 species-api-client: republish es POST sin cuerpo`, `CA-55 species-api-client: update de la ficha es PATCH sin archivo y POST con _method con archivo`, `CA-56 species-api-client: removePublication es DELETE /species/{id}/publication`.
  - Hecho cuando: pruebas en verde y `npm run types` sin errores.

## Base compartida y shell

- [ ] **T-04** (RN-03, RN-10, RN-11; CA-08, CA-17, CA-49, CA-58): helpers compartidos del ViewModel.
  - Contenido: `viewmodels/species-publication-shared.ts` con (a) etiquetas en español de estados de solicitud (Pendiente, Publicada, Rechazada), de estado de especie (Publicada, Despublicada, Pendiente), de tipo de solicitud («Primera publicación», «Actualización») y de categoría (Mamífero, Ave, Reptil, Anfibio, Pez, Invertebrado; propuestas, plan R-9); (b) validador de texto (quitar espacios sobrantes; máximo 150 en correcciones; 1 a 500 en motivo); (c) validador de foto (JPG o PNG, máximo 5 MB; mensajes «Elige una imagen JPG o PNG.» y «La foto no puede superar 5 MB.»); (d) mapeo de `ApiError` por sección (401 sin mensaje propio; 403 con el mensaje de la sección; 404 con «Solicitud no encontrada.», «Especie no encontrada.»; red o 5xx con «Reintentar»; 422 con `errors` por campo); (e) contador de generación para descartar respuestas tardías.
  - Archivos: `apps/dashboard/src/viewmodels/species-publication-shared.ts`. No reutiliza `image-field.ts` (acepta WebP y el límite es distinto).
  - Test: `apps/dashboard/src/tests/species-shared.test.tsx`. Nombres: `CA-08 species-shared: máximo 150 en correcciones y espacios sobrantes quitados`, `CA-17 species-shared: mapeo de 403, 404, 5xx y red por sección`, `CA-49 species-shared: foto JPG o PNG de hasta 5 MB; mensajes exactos`, `CA-58 species-shared: mensajes de la sección de publicadas`.
  - Hecho cuando: pruebas en verde; ningún otro archivo define estas etiquetas.

- [ ] **T-05** (CA-01, CA-50; RN-02): navegación y composición de las dos secciones.
  - Archivos: `apps/dashboard/src/viewmodels/dashboard-shell.ts` (`species-requests` y `published-species` en `DashboardSection`), `apps/dashboard/src/viewmodels/navigation.ts` (dos candidatos con `species.review`: «Solicitudes de especies» y «Especies publicadas»), `apps/dashboard/src/App.tsx` (títulos y render de las secciones; por ahora contenedores vacíos hasta T-07 y T-17), `apps/dashboard/src/components/Icon.tsx` (solo si falta un icono).
  - Test: `apps/dashboard/src/tests/species-navigation.test.tsx`. Nombres: `CA-01 species-navigation: «Solicitudes de especies» solo con species.review`, `CA-50 species-navigation: «Especies publicadas» aparece junto a la anterior solo con species.review`.
  - Regresión: `administration-navigation.test.tsx` y `global-demo-banner.test.tsx` sin cambios y en verde.
  - Hecho cuando: pruebas en verde; `admin`, `executive`, `cashier` y `veterinarian` no ven ninguna de las dos entradas.

## Solicitudes de especie

- [ ] **T-06** (CA-02, CA-04; RN-05): ViewModel de la lista.
  - Archivos: `apps/dashboard/src/viewmodels/species-requests.ts` (reducer de lista y funciones con cliente inyectado: `loadList`, `changeFilter`, `changePage`), `apps/dashboard/src/viewmodels/useSpeciesRequests.ts` (hook; la parte de lista).
  - Contenido: filtro «Todas» sin `status`; Pendiente → `submitted`, Publicada → `accepted`, Rechazada → `rejected`. Cambio de filtro vuelve a pedir a la API. `hasMore` según `meta`. Sin filtrado en cliente.
  - Test: `apps/dashboard/src/tests/species-requests-list.test.tsx`. Nombres: `CA-02 species-requests-list: cambiar el filtro vuelve a pedir la API; «Todas» omite status; «Siguiente» según meta.has_more`, `CA-04 species-requests-list: vacío, cargando y error con Reintentar; sin filas anteriores`.
  - Hecho cuando: pruebas en verde.

- [ ] **T-07** (CA-03, CA-15 en la lista; RN-03): vista de la lista y la sección.
  - Archivos: `apps/dashboard/src/views/SpeciesRequestsView.tsx` (tabla desde 768 px y tarjetas por debajo; filtro con `<label>`; `HasMorePaginationBar` (pregunta 3 resuelta: `has_more`, sin total); `ListStatusMessage`), `apps/dashboard/src/components/SpeciesStatusBadge.tsx` (icono y texto), `apps/dashboard/src/sections/SpeciesRequestsSection.tsx` (llama al hook al abrirse).
  - Contenido por fila: nombre común, nombre científico (60 caracteres y «…»), tipo de animal en español, veterinario, fecha de envío, etiqueta de tipo, etiqueta «Especie despublicada» (según `publication_status` de G-1), estado con icono, botón «Revisar» (Pendiente o Publicada) o «Ver» (Rechazada).
  - Test: `species-requests-list.test.tsx`. Nombres: `CA-03 species-requests-list: fila con tipo, «Especie despublicada», truncado a 60 y estado con icono`, `CA-15 species-requests-list: Revisar en Pendiente y Publicada; Ver en Rechazada`.
  - Bloqueo de contrato levantado (2026-11-13): G-1 incorporada en `api-014` (CA-05). Sin implementar `api-014` no se marca como hecha.
  - Hecho cuando: pruebas en verde y revisión visual en 360 y 1024 px.

- [ ] **T-08** (CA-05, CA-06, CA-44, CA-61; RN-07, RN-10): carga del detalle y de la foto.
  - Archivos: `apps/dashboard/src/viewmodels/species-requests.ts` (`loadDetail`, `openRequest`, `closeDetail`), `apps/dashboard/src/viewmodels/useSpeciesRequests.ts` (detalle y foto), `apps/dashboard/src/components/SpeciesPhoto.tsx` (presentación: `alt`, estados `loading`, `ready`, `error` con «No se pudo cargar la foto.», `none` con «Sin foto»; texto «Sin foto nueva: se mantiene la foto publicada.» cuando corresponda).
  - Contenido: `GET` del detalle; foto pendiente por `speciesPublicationRequests.image` (si `proposed.has_new_photo`) y publicada por `publishedSpecies.image(species_id)` (si `current.has_image`), con `species_id` de la lista (G-2). `alt="Foto de {common_name}"` y `alt="Foto publicada de {common_name}"`. Revocación de URL `blob:` al cerrar, al cambiar de solicitud y al desmontar. Respuestas tardías descartadas.
  - Test: `species-request-detail.test.tsx`. Nombres: `CA-05 species-request-detail: muestra actual y propuesto; sin URL de foto en el DTO`, `CA-06 species-request-detail: foto como blob con alt; revocación al cerrar o cambiar; 404 muestra «No se pudo cargar la foto.»`, `CA-44 species-request-detail: la sección no usa image_url ni construye rutas de /media`, `CA-61 species-request-detail: datos de la solicitud sobre especie despublicada`.
  - Hecho cuando: pruebas en verde.

- [ ] **T-09** (CA-05, CA-15, CA-61; RN-03): vista del detalle en lectura.
  - Archivos: `apps/dashboard/src/views/SpeciesRequestDetailView.tsx` (modo lectura; dos columnas «Datos actuales» y «Datos propuestos» desde 768 px; nombre común marcado «no editable»; tipo de solicitud; etiqueta «Especie despublicada»; veterinario, fecha y estado; ficha pública en lectura; motivo si está rechazada; botón «Volver a la lista»), `apps/dashboard/src/sections/SpeciesRequestsSection.tsx` (si cambia).
  - Acciones por estado: Pendiente → «Editar», «Aceptar y publicar», «Aceptar sin publicar» (solo con `current.publication_status = unpublished`, G-3), «Rechazar»; Publicada → «Publicada en el catálogo»; Rechazada → motivo visible. Aviso «La especie no aparece en el catálogo hasta que la aceptes con «Aceptar y publicar».» cuando corresponde.
  - Test: `species-request-detail.test.tsx`. Nombres: `CA-15 species-request-detail: acciones por estado`, `CA-61 species-request-detail: aviso de catálogo en especie despublicada`.
  - Bloqueo de contrato levantado (2026-11-13): G-3 incorporada en `api-014` (CA-06).
  - Hecho cuando: pruebas en verde.

## Edición de la solicitud

- [ ] **T-10** (CA-07, CA-08, CA-09, CA-10, CA-49; RN-04, RN-14, RN-15): ViewModel de edición de la solicitud.
  - Archivos: `apps/dashboard/src/viewmodels/species-requests.ts` (borrador, `dirty`, `saveEdit`, `cancelEdit`, `chooseNewPhoto`, `cancelPhoto`), `apps/dashboard/src/viewmodels/useSpeciesRequests.ts`.
  - Contenido: el borrador se precarga con `proposed`. `saveEdit` envía solo los campos cambiados (`category` siempre que se guarde; plan pregunta 5, resuelta). `200` actualiza el detalle y muestra «Cambios guardados. La solicitud sigue pendiente.». `422` por campo muestra el error junto al campo y no cierra el formulario. `422` «Esta solicitud ya fue revisada.» recarga el detalle. Cancelar o Escape descartan sin llamar a la API. Foto elegida: vista previa `blob:` (`alt="Vista previa de la nueva foto de {common_name}"`) que se revoca al cancelar o al cambiar de solicitud. Solo editable con `status = submitted`.
  - Test: `apps/dashboard/src/tests/species-request-edit.test.tsx`. Nombres: `CA-07 species-request-edit: PATCH solo con campos cambiados; éxito deja la solicitud pendiente`, `CA-08 species-request-edit: 422 junto al campo sin cerrar; Cancelar sin llamada`, `CA-09 species-request-edit: 422 «ya fue revisada» recarga el detalle`, `CA-10 species-request-edit: dirty activo con cambios sin guardar`, `CA-49 species-request-edit: vista previa, revocación al cancelar y cambio de solicitud`.
  - Hecho cuando: pruebas en verde.

- [ ] **T-11** (CA-07, CA-08, CA-49; RN-14, RN-15): formulario compartido de ficha.
  - Archivos: `apps/dashboard/src/components/SpeciesFichaForm.tsx` (presentación: nombre común como texto sin campo; «Nombre científico», «Área de distribución natural» (`origin`), «Hábitat» con ayuda «Vacío: se mantiene el valor actual.»; selector de tipo de animal (lista cerrada de seis valores); casillas de la ficha pública (tres; marcadas por defecto en primera publicación, o las de la especie publicada); control «Cambiar foto» (JPG o PNG, máximo 5 MB) con `SpeciesPhoto`), y su uso en `SpeciesRequestDetailView.tsx`.
  - Test: `species-request-edit.test.tsx`. Nombres: `CA-07 species-request-edit: nombre común como texto y sin campo editable; casillas precargadas`, `CA-08 species-request-edit: ayuda «Vacío: se mantiene el valor actual.» junto a cada corrección`, `CA-49 species-request-edit: control de foto con mensajes de error exactos`.
  - Hecho cuando: pruebas en verde; el componente no importa `services/` ni `@arca/api-client` (lo comprueba T-21).

## Decisiones sobre la solicitud

- [ ] **T-12** (CA-10, CA-11, CA-12, CA-62; RN-05): ViewModel de aceptar.
  - Archivos: `apps/dashboard/src/viewmodels/species-requests.ts` (`acceptRequest(publish)`, bloqueo por `dirty`), `apps/dashboard/src/viewmodels/useSpeciesRequests.ts`.
  - Contenido: `accept(id, {publish})` con `publish` solo `true` o `false` según la acción. `200` no devuelve la solicitud (G-4): el ViewModel recarga el detalle y muestra el aviso de CA-11 («Especie publicada. Ya es visible en el catálogo público.») o de CA-62 («Cambios aceptados. La especie sigue despublicada.»). `422` de decisión tardía o «solo puede aceptarse publicándola» muestra el mensaje y recarga. Acciones deshabilitadas mientras `dirty` (CA-10).
  - Test: `apps/dashboard/src/tests/species-request-decisions.test.tsx`. Nombres: `CA-10 species-request-decisions: aceptar deshabilitado con cambios sin guardar`, `CA-11 species-request-decisions: publish true solo al confirmar; Cancelar no llama a la API`, `CA-12 species-request-decisions: 422 recarga y no cambia nada más`, `CA-62 species-request-decisions: especie despublicada ofrece dos acciones con publish true o false; publicada o sin publicar solo una`.
  - Hecho cuando: pruebas en verde.

- [ ] **T-13** (CA-13, CA-14; RN-06, RN-09, RN-13): ViewModel de rechazo y diálogo.
  - Archivos: `apps/dashboard/src/viewmodels/species-requests.ts` (`rejectRequest(reason)`), `apps/dashboard/src/components/RejectSpeciesRequestDialog.tsx` (sobre `ConfirmDialog`: título «Rechazar solicitud», pregunta «¿Seguro que quieres rechazar esta solicitud?», campo «Motivo» con `<label>`, contador «n/500», «Confirmar» deshabilitado con motivo vacío, «Cancelar»).
  - Contenido: `200` muestra la solicitud en Rechazada con el motivo, desaparecen las acciones y aparece «Solicitud rechazada. La especie no se publicó.» y «Volver a la lista». `422` por `rejection_reason` queda junto al campo sin cerrar; `422` de estado recarga y cierra. El texto no promete notificación al veterinario (RN-09).
  - Test: `species-request-decisions.test.tsx`. Nombres: `CA-13 species-request-decisions: motivo obligatorio, contador y Confirmar deshabilitado; Cancelar no llama`, `CA-14 species-request-decisions: éxito muestra motivo y aviso; 422 de motivo junto al campo`. RN-09 se comprueba en el mismo archivo (texto del diálogo sin «notificar» ni «avisar al veterinario»).
  - Hecho cuando: pruebas en verde.

- [ ] **T-14** (CA-11, CA-16, CA-62; RN-13): diálogos de aceptar en la vista.
  - Archivos: `apps/dashboard/src/views/SpeciesRequestDetailView.tsx` (diálogos con `ConfirmDialog`).
  - Textos: primera publicación «¿Aceptar y publicar esta especie? Quedará visible en el catálogo público para los visitantes.»; actualización «¿Aceptar esta actualización? La ficha pública cambiará: se reemplazarán la foto y los datos publicados.» (o «se reemplazarán los datos publicados» si no hay foto nueva); despublicada con «Aceptar y publicar» (mismo texto que primera publicación) y con «Aceptar sin publicar» «¿Aceptar sin publicar? Los cambios quedarán guardados, pero la especie seguirá oculta en el catálogo. Podrás republicarla desde Especies publicadas.». Cada diálogo muestra el nombre común y el científico que se publicarán.
  - Test: `species-request-decisions.test.tsx`. Nombres: `CA-16 species-request-decisions: diálogos con role dialog y nombre accesible`, `CA-62 species-request-decisions: textos de los diálogos de aceptar`.
  - Verificación manual de foco y Escape: T-27.
  - Hecho cuando: pruebas en verde.

- [ ] **T-15** (CA-01, CA-17; RN-01): errores de la sección de solicitudes.
  - Archivos: `apps/dashboard/src/viewmodels/species-requests.ts` y `useSpeciesRequests.ts` (cableado del mapeo de T-04 en lista y detalle), `apps/dashboard/src/views/SpeciesRequestsView.tsx` (aviso de denegado «No tienes permiso para revisar solicitudes de especies.» en 403; botón «Reintentar»).
  - Contenido: 401 lo atiende el manejador global («Tu sesión expiró.»), sin lógica propia del ViewModel; 403 con el mensaje de la sección; 404 con «Solicitud no encontrada.»; 5xx o red con «Reintentar». Ningún error deja filas o datos anteriores.
  - Test: `species-errors.test.tsx`. Nombres: `CA-17 species-errors: 401 sin lógica propia; 403, 404 y 5xx por sección de solicitudes`; `CA-01 species-errors: 403 en la sección muestra el aviso de denegado`.
  - Hecho cuando: pruebas en verde.

## Especies publicadas

- [ ] **T-16** (CA-51; RN-03): ViewModel de la lista de publicadas y miniaturas.
  - Archivos: `apps/dashboard/src/viewmodels/published-species.ts` (reducer de lista y funciones: `loadList`, `changeStatus`, `changeCategory`, `changePage`), `apps/dashboard/src/viewmodels/usePublishedSpecies.ts`.
  - Contenido: filtros «Todas» (sin `status`), «Publicadas» (`published`), «Despublicadas» (`unpublished`); tipo «Todos los tipos» o uno de los seis. Miniaturas: `publishedSpecies.image(id)` solo si `has_image`; revocación al cambiar de página y al desmontar. Carga diferida con `IntersectionObserver` solo si las pruebas de rendimiento lo requieren (plan R-4; decisión aquí).
  - Test: `apps/dashboard/src/tests/published-species-list.test.tsx`. Nombre: `CA-51 published-species-list: status y category en la query; paginación; «Sin foto»; vacío con «No hay especies con este estado.»`.
  - Hecho cuando: pruebas en verde.

- [ ] **T-17** (CA-52, CA-57; RN-03): vista de la lista y sección de publicadas.
  - Archivos: `apps/dashboard/src/views/PublishedSpeciesView.tsx` (tabla desde 768 px y tarjetas por debajo; miniatura; nombre; tipo; fecha de publicación; estado con icono y texto «Publicada» o «Despublicada»; «Solicitud pendiente» si `has_pending_request`), `apps/dashboard/src/sections/PublishedSpeciesSection.tsx`, `apps/dashboard/src/App.tsx` (sustituye el contenedor vacío de T-05).
  - Acciones de la lista: «Revisar» abre el detalle (T-19). Editar y Republicar deshabilitados con «Hay una solicitud pendiente para esta especie. Revísala en Solicitudes de especies.» y enlace a la sección cuando `has_pending_request` (CA-57).
  - Test: `published-species-list.test.tsx`. Nombres: `CA-52 published-species-list: acciones por estado`, `CA-57 published-species-list: Editar y Republicar deshabilitados con aviso y enlace; Despublicar y Eliminar disponibles`.
  - Hecho cuando: pruebas en verde.

- [ ] **T-18** (CA-53, CA-54, CA-56, CA-57; RN-16): ViewModel de las acciones de publicación.
  - Archivos: `apps/dashboard/src/viewmodels/published-species.ts` (`openDetail`, `unpublish`, `republish`, `removePublication`, `closeDetail`), `apps/dashboard/src/viewmodels/usePublishedSpecies.ts`.
  - Contenido: `unpublish` → `POST` solo al confirmar; `200` muestra «Especie despublicada. Ya no aparece en el catálogo público.» y actualiza la ficha; `422` «Esta especie no está publicada.» recarga. `republish` → `POST` sin cuerpo; `200` muestra «Especie republicada. Ya es visible en el catálogo público.»; `422` muestra el mensaje de la API, recarga y, si es por foto o datos publicados, añade la pista «Añade la foto con «Editar» antes de republicar.». `removePublication` → `DELETE` solo al confirmar; `200` quita la especie de publicadas y muestra «La publicación se eliminó. Para publicarla de nuevo, el veterinario debe enviar una solicitud.»; `422` «Esta especie no tiene publicación que eliminar.» recarga. Un `422` por solicitud pendiente recarga la especie (CA-57).
  - Test: `apps/dashboard/src/tests/published-species-actions.test.tsx`. Nombres: `CA-53 published-species-actions: POST de despublicar solo al confirmar; 422 recarga`, `CA-54 published-species-actions: republicar; 422 por foto o datos ausentes con pista a Editar`, `CA-56 published-species-actions: DELETE solo al confirmar`, `CA-57 published-species-actions: 422 por solicitud pendiente recarga la especie`.
  - Hecho cuando: pruebas en verde.

- [ ] **T-19** (CA-53, CA-54, CA-56, CA-59; RN-16): vista del detalle de publicada y diálogos.
  - Archivos: `apps/dashboard/src/views/PublishedSpeciesDetailView.tsx` (ficha en lectura; «Despublicar» si `is_published`; «Editar» y «Republicar» si está despublicada; bloque propio «Eliminar publicación» con el aviso «Esto elimina la foto y los datos publicados; la especie seguirá existiendo.» y el botón «Eliminar publicación»), diálogos con `ConfirmDialog`.
  - Textos exactos: despublicar «¿Despublicar esta especie? Dejará de aparecer en el catálogo público. No se borra nada: la foto y los datos se conservan.»; republicar «¿Republicar esta especie? Volverá a aparecer en el catálogo público con su foto y sus datos guardados.»; eliminar: título «¿Seguro que quieres eliminar la publicación?», texto «Esto eliminará la foto y los datos publicados de la especie y marcará sus solicitudes como eliminadas. La especie y sus animales seguirán existiendo.», botones «Eliminar publicación» y «Cancelar». Sin casilla. El texto no añade líneas sobre correcciones (RN-16).
  - Test: `published-species-actions.test.tsx`. Nombres: `CA-56 published-species-actions: bloque propio; título, texto y dos botones exactos; sin casilla`, `CA-53 published-species-actions: texto exacto del diálogo de despublicar`, `CA-54 published-species-actions: texto exacto del diálogo de republicar`, `CA-59 published-species-actions: diálogos con role dialog y nombre accesible`.
  - Verificación manual de foco y Escape: T-27.
  - Hecho cuando: pruebas en verde.

- [ ] **T-20** (CA-55, CA-10; RN-14, RN-15): edición de la ficha de una especie despublicada.
  - Archivos: `apps/dashboard/src/viewmodels/published-species.ts` (`openEdit`, `saveEdit`, `cancelEdit`), `apps/dashboard/src/viewmodels/usePublishedSpecies.ts`, y reutiliza `components/SpeciesFichaForm.tsx` (T-11) en `PublishedSpeciesDetailView.tsx`.
  - Contenido: formulario precargado con las publicadas (`publishedSpecies.get`); «Guardar cambios» → `PATCH` (con foto, `POST` con `_method`); `200` muestra «Cambios guardados. La especie sigue despublicada.» y la especie sigue despublicada (nunca se publica desde aquí). `422` por campo junto al campo sin cerrar; «Campo no editable» no puede ocurrir desde la vista. «Republicar» deshabilitado mientras haya cambios sin guardar (CA-10). Cancelar o Escape descartan sin llamada. Solo para `status = unpublished` y sin `has_pending_request`.
  - Test: `apps/dashboard/src/tests/published-species-edit.test.tsx`. Nombres: `CA-55 published-species-edit: PATCH sin publicar; 422 junto al campo; Cancelar sin llamada`, `CA-10 published-species-edit: republicar deshabilitado con cambios sin guardar`.
  - Hecho cuando: pruebas en verde.

- [ ] **T-21** (CA-58, CA-60, CA-46; RN-01, RN-12): errores de publicadas y arquitectura.
  - Archivos: `apps/dashboard/src/viewmodels/published-species.ts` y `usePublishedSpecies.ts` (mapeo de T-04: 401 global, 403 «No tienes permiso para gestionar especies publicadas.», 404 «Especie no encontrada.», 422 por campo o recarga según el caso, 5xx o red con «Reintentar»).
  - Test: `apps/dashboard/src/tests/species-errors.test.tsx` (`CA-58 species-errors: errores de publicadas por estado`) y `apps/dashboard/src/tests/species-publication-mvvm.test.tsx` (`CA-60 species-publication-mvvm: views, components y sections sin fetch ni axios ni services; sin cálculo de publication_status ni has_pending_request; hooks solo llaman a adminApi`).
  - Hecho cuando: pruebas en verde.

## Imágenes, regresión y verificación cruzada

- [ ] **T-22** (CA-44, CA-45; RN-07, RN-10): imágenes y regresión.
  - Test: `apps/dashboard/src/tests/species-publication-mvvm.test.tsx`. Nombres: `CA-44 species-publication-mvvm: en los archivos de la sección no aparece image_url ni /media`, `RN-10 species-publication-mvvm: sin localStorage ni sessionStorage en la sección`.
  - Regresión: `content-image-display.test.tsx` y `administration-quality.test.tsx` sin cambios y en verde (CA-45).
  - Hecho cuando: pruebas en verde y ambos archivos de dashboard-007 sin cambios en el diff.

- [ ] **T-23** (CA-40, CA-41, CA-42, CA-48): verificación cruzada. Sin test propio en el dashboard.
  - Contenido (enmienda 2026-11-13: CA-40, CA-41, CA-42 y CA-48 con tests automatizados, PHPUnit en la API y Vitest simulado aquí; comprobación contra la API real por la sesión principal en la integración): registrar en el PR la evidencia de `api-015` (CA-01, CA-17, CA-18), `api-014` (CA-31, CA-32), `web-011` (CA-02, CA-03, CA-04, CA-08, CA-22, CA-24) y la prueba manual en `arca_pruebas` de que una especie publicada aparece en TulanPedia y una despublicada no.
  - Archivos: ninguno en el dashboard.
  - Bloqueo: `api-014`, `api-015` y `web-011` implementadas y DBR-013 aplicada. Pregunta 7 del plan resuelta (2026-11-13): tests automatizados en lugar de evidencia manual.
  - Hecho cuando: el PR enlaza la evidencia de cada una de esas pruebas.

- [ ] **T-24** (CA-43, CA-47): revisión documental.
  - Contenido: `dashboard-009` lleva la nota «Integrada en dashboard-010» sin borrar su texto (ya presente en la revisión del 2026-11-12); `dashboard-008` no lleva nota de integración; la enmienda del ADR 0026 (2026-11-11) y las pruebas PHPUnit de `api-014` (CA-08, CA-10, CA-39) están referenciadas en el PR.
  - Archivos: ninguno. Si una nota falta, se pide autorización para editar la spec afectada; esta tarea no la edita sin autorización.
  - Hecho cuando: la revisión del PR lo confirma por escrito.

## Cobertura, documentación y entrega

- [ ] **T-25** (CA-46; RN-11): test de cobertura de criterios.
  - Archivos: `apps/dashboard/src/tests/species-publication-coverage.test.tsx`.
  - Test: `CA-46 species-publication-coverage: cada CA-01 a CA-17 y CA-49 a CA-62 de la spec aparece en al menos un test de species-*.test.tsx`; y que ningún test nombra CA-18 a CA-38 (retirados).
  - Hecho cuando: pruebas en verde.

- [ ] **T-26** (RN-12; documentación): referencia duradera del dashboard y del paquete.
  - Archivos: `apps/dashboard/docs/arquitectura.md` (secciones de solicitudes y de publicadas, endpoints consumidos, ViewModels nuevos, estado «en progreso» de dashboard-010), `packages/api-client/README.md` (métodos `speciesPublicationRequests` y `publishedSpecies`), `apps/dashboard/AGENTS.md` (solo si cambia el estado de la spec).
  - Hecho cuando: los tres archivos (o los que apliquen) reflejan lo implementado, sin marcar nada como hecho sin evidencia.

- [ ] **T-27** (CA-16, CA-59, CA-05, CA-08; RN-11): verificación manual en navegador. Requiere «Lista para backend» (T-01).
  - Contenido: (a) teclado: abrir y cerrar cada diálogo con Escape; el foco vuelve al control que lo abrió; el foco queda dentro del diálogo; (b) diseño adaptable a 360, 768, 1024 y 1366 px sin desbordamiento horizontal, con tabla o tarjetas según el ancho; (c) flujo completo contra la API real: revisar, editar, aceptar con y sin publicar, rechazar, despublicar, republicar, editar, eliminar; (d) textos en español revisados (RN-11); (e) confirmación de las etiquetas de categoría y de «Área de distribución natural» con producto (plan R-9).
  - Evidencia: capturas o notas en el PR.
  - Hecho cuando: la evidencia está en el PR y las incidencias abiertas quedan registradas.

- [ ] **T-28** (todos los CA cubiertos; DoD): verificación automatizada y CI.
  - Contenido: `npm test` (`vitest run`), `npm run types` y `npm run build` del dashboard; `git diff --check`; `/verify` del dashboard; y CI en verde en el PR. Registrar número de pruebas, aprobadas, fallidas y fallos preexistentes. Si algo no se ejecuta, se anota como no ejecutado; no se afirma que pasa.
  - Hecho cuando: los resultados están en el PR y el CI está en verde. Un CI en rojo no se mergea (Constitución IV).

- [ ] **T-29** (todos): entrega.
  - Contenido: el PR enlaza `specs/010-public-content-management.md`, `plan/010-public-content-management.md` y `tasks/010-public-content-management.md`; el commit cita `dashboard-010`; el estado de la spec pasa a «En progreso» al empezar y a «Implementada» solo con evidencia de T-27 y T-28, y con los CA cruzados (T-23) resueltos o aceptados por el equipo.
  - Hecho cuando: el PR está revisado y el estado de la spec coincide con la evidencia.
