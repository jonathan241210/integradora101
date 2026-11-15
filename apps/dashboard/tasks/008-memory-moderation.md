# Tareas · 008 · memory-moderation

- Spec: `apps/dashboard/specs/008-memory-moderation.md` (Estado: **Aprobada**, Jonathan, 2026-11-12).
- Plan: `apps/dashboard/plan/008-memory-moderation.md` (Estado: **Aprobado**, Jonathan, 2026-11-13).
- Estado del checklist: **En progreso** (actualizado 2026-11-13; plan y tasks aprobados por Jonathan, responsable de backend). Coordinación en `docs/trabajo-paralelo-momentos-especies.md`.
- Checklist: cada T-xx marcada tiene su evidencia en la misma línea (salida de `npm test`, `npm run types`, `npm run build`, o enlace a la prueba). Ningún agente marca una tarea sin evidencia de la sesión principal.
- Alcance: sección «Momentos» del dashboard (revisión de peticiones de visitantes, `zoo-admin` con `memories.review` y 2FA). Solo presentación: la API decide estados, plazos, permisos y auditoría. No incluye la publicación de especies (`dashboard-010`), ni el envío de momentos (`mobile-010`), ni retirar una foto aceptada antes del vencimiento (fuera de alcance).
- Dependencias: `api-010` fase 1 y `api-013` Aprobadas, **sin implementar**; DBR-012 Lista para backend. Las tareas de base de datos (DBR, migración, pruebas, seeder de `memories.review`) pertenecen al responsable de BD y a `apps/api`; esta lista no las incluye. Solo aparecen como precondición en T-01.
- Inicio: las tareas de cliente (T-02 a T-16) pueden empezar con contratos simulados. La integración (T-17) y el cierre (T-18, T-19) requieren además `api-010` fase 1 implementada en `arca_pruebas` y datos de prueba (preguntas 1 y 6 del plan, resueltas el 2026-11-13: los datos los crea el backend).
- Coordinación: T-03, T-04 y T-06 tocan puntos compartidos con `dashboard-010` (shell, `Icon.tsx`, `HasMorePage`, `HasMorePaginationBar`, `blob-preview.ts`). Ver la tabla «Coordinación» del plan antes de integrar.
- Convención de tests: el nombre empieza por el CA y el prefijo `memory-` (`CA-xx memory-…: …`). Los tests de cobertura solo leen archivos `memory-*`.

## Trazabilidad

| Criterio / regla | Tareas que lo cubren |
|---|---|
| CA-01 | T-03, T-15 |
| CA-02 | T-02, T-05, T-06 |
| CA-03 | T-05 |
| CA-04 | T-04, T-06 |
| CA-05 | T-02, T-07, T-08 |
| CA-06 | T-07, T-08, T-17 |
| CA-07 | T-08 |
| CA-08 | T-02, T-09 |
| CA-09 | T-04, T-10 |
| CA-10 | T-09, T-10, T-11 |
| CA-11 | T-04, T-11 |
| CA-12 | T-09, T-10, T-12, T-17 |
| CA-13 | T-06, T-12, T-17 |
| CA-14 | T-13 |
| CA-15 | T-08, T-13 |
| CA-16 | T-14 |
| CA-17 | T-02, T-07, T-13 |
| CA-18 | T-07, T-08 |
| CA-19 | T-08 |
| RN-01 | T-03, T-11, T-13, T-15 |
| RN-02 | T-04, T-08 |
| RN-03 | T-05, T-09, T-10 |
| RN-04 | T-08, T-09 |
| RN-05 | T-04, T-10 |
| RN-06 | T-08, T-17 |
| RN-07 | T-02, T-07, T-13 |
| RN-08 | T-03, T-05, T-07, T-13 |
| RN-09 | T-02, T-07 |

Cobertura: CA vigentes sin tarea = **0** (19 de 19: CA-01 a CA-19). RN vigentes sin tarea = **0** (9 de 9: RN-01 a RN-09). Tareas: **19** (T-01 a T-19); de ellas, T-01 no tiene código.

## Precondiciones

- [ ] **T-01** (RN-01, RN-07, RN-08; precondición de CA-16): verificar dependencias y contratos, y registrar las decisiones en el PR o en el hilo de aprobación.
  - Nota S3 (2026-11-13): pendiente de integración (S1): api-010 fase 1 está en la rama de S2.
  - Contenido: (a) `api-010` fase 1 Aprobada con el contrato del plan («Endpoints consumidos» y «Tipos»); (b) M-1 (campos de la fila de la lista), M-2 (envolturas `{data}` y `{data, meta:{page,limit,has_more}}`) y M-3 (`published_at` en el detalle, pregunta 2) confirmados o rechazados explícitamente; (c) respuestas a las preguntas 1 a 8 del plan, incluida la coordinación de la shell con `dashboard-010` (pregunta 4) y la paginación compartida (pregunta 3); (d) `api-013` CA-10 (ruta de imagen) confirmada para el proxy de mismo origen; (e) estado de DBR-012 (Lista para backend) y datos de prueba acordados (pregunta 6). **Registrado en el plan el 2026-11-13:** M-1 y M-2 aceptadas; M-3 aceptada como `published_at` (incorporada en `api-010` el 2026-11-13); preguntas 1 a 8 resueltas. Falta la evidencia en el PR.
  - Archivos: ninguno (sin código).
  - Hecho cuando: el PR o el hilo enlaza las respuestas; M-1 a M-3 están aceptadas o rechazadas. Si M-1 o M-2 se rechazan, T-02 se marca como bloqueada, no se resuelve en la UI. Si M-3 se rechaza, T-08 muestra solo `published_until`.

## Cliente de API (`packages/api-client`)

- [x] **T-02** (CA-02, CA-05, CA-08, CA-17; RN-07, RN-08, RN-09): tipos y métodos de `memoryReview` (`list`, `get`, `image`, `accept`, `reject`) y `HasMorePage<T>`.
  - Archivos: `packages/api-client/admin-types.ts` (tipos del plan: `MemoryReviewStatus`, `MemoryRejectedField`, `HasMorePage<T>`, `MemoryReviewListQuery`, `MemoryReviewSummaryDto`, `MemoryReviewDetailDto`, `MemoryRejectInput`), `packages/api-client/admin.ts` (namespace `memoryReview`; `image` usa `http.download`; `accept` y `reject` usan `http.post`), `packages/api-client/index.ts` (exports de tipos nuevos), `apps/dashboard/src/viewmodels/admin-types.ts` (reexport).
  - Test: `apps/dashboard/src/tests/memory-api-client.test.tsx` con `fetch` simulado. Nombres: `CA-02 memory-api-client: list envía status solo con filtro y page; no envía limit`, `CA-05 memory-api-client: get usa la ruta del detalle`, `CA-08 memory-api-client: accept es POST sin cuerpo`, `CA-17 memory-api-client: image pide la ruta relativa del mismo origen, devuelve blob y no hay URL absoluta`, `RN-09 memory-api-client: la imagen usa /api/v1/admin/memories/{id}/image sin CORS`, `RN-05 memory-api-client: reject envía rejection_reason y rejected_fields como array`.
  - Bloqueo: M-1 y M-2 (T-01), resueltas en el plan el 2026-11-13; la tarea sigue sin hacer hasta tener evidencia en el PR.
  - Hecho cuando: `npm run types` sin errores y las pruebas nombradas en verde.

## Base compartida y shell

- [x] **T-03** (CA-01; RN-01, RN-08): navegación y composición de la sección «Momentos».
  - Archivos: `apps/dashboard/src/viewmodels/dashboard-shell.ts` (añade `"memories"` a `DashboardSection`), `apps/dashboard/src/viewmodels/navigation.ts` (candidato `memories`: etiqueta «Momentos», icono `camera`, permiso `memories.review`, después de «Usuarios»), `apps/dashboard/src/App.tsx` (clave `memories` en `sectionTitles` y render de `MemoriesSection`, que puede ser un contenedor vacío hasta T-06), `apps/dashboard/src/components/Icon.tsx` (nombre `camera`).
  - Coordinación: añadir solo líneas. Si `dashboard-010` ya integró sus claves, `App.tsx` debe incluir ambas o no compila (pregunta 4 resuelta: 008 se integra primero).
  - Test: `apps/dashboard/src/tests/memory-navigation.test.tsx`. Nombres: `CA-01 memory-navigation: «Momentos» aparece solo con memories.review`, `CA-01 memory-navigation: admin, executive, cashier y veterinarian no ven «Momentos»`, `CA-01 memory-navigation: el orden de las secciones existentes no cambia`.
  - Regresión: `administration-navigation.test.tsx` y `real-staff-login.test.tsx` sin cambios y en verde.
  - Hecho cuando: pruebas en verde y `npm run types` sin errores.

- [x] **T-04** (CA-04, CA-09, CA-11; RN-02, RN-05): helpers compartidos del ViewModel.
  - Contenido de `apps/dashboard/src/viewmodels/memory-review-shared.ts`: (a) etiquetas en español de estados (Enviada, En proceso, Aceptada, Rechazada) y de casillas («La foto», «La opinión»); (b) `canConfirmRejection(reason, fields)`: motivo de 1 a 500 caracteres tras quitar espacios sobrantes y al menos una casilla; (c) `excerpt(opinion)` de 120 caracteres con «…» y «Sin opinión» si es `null`; (d) texto de «Reenviada 1 vez» y «Reenviada {n} veces»; (e) copys de los diálogos de aceptar (con `publication_days`, singular «1 día») y de rechazar; (f) mapeo de `ApiError` por código (401 sin mensaje propio; 403, 404, 422 por campo o sin campo, 5xx y red); (g) contador de generación; (h) tipo `BlobPreview` (`create(blob: Blob)`, `revoke(url)`). `services/blob-preview.ts` (nuevo) implementa `BlobPreview` con `URL.createObjectURL` y `URL.revokeObjectURL`; no se modifica `image-field.ts` ni `image-preview.ts`.
  - Test: `apps/dashboard/src/tests/memory-shared.test.tsx`. Nombres: `CA-04 memory-shared: fragmento de 120 caracteres; «Sin opinión» si es null; «Reenviada 1 vez» y «Reenviada n veces»`, `CA-09 memory-shared: motivo de 1 a 500 sin espacios sobrantes y al menos una casilla; canConfirmRejection falso en esos casos`, `CA-11 memory-shared: mapeo de 401, 403, 404, 422, 5xx y red; 401 sin mensaje propio`, `RN-05 memory-shared: rechazo solo con image o content; valores fuera de la lista no pasan`, `RN-02 memory-shared: etiquetas de estado en español`.
  - Hecho cuando: pruebas en verde; ningún otro archivo define estas etiquetas ni la validación del motivo.

## Lista

- [x] **T-05** (CA-02, CA-03; RN-03, RN-08): ViewModel de la lista.
  - Archivos: `apps/dashboard/src/viewmodels/memory-review.ts` (reducer de lista y funciones con cliente inyectado: `loadList`, `changeFilter`, `changePage`), `apps/dashboard/src/viewmodels/useMemoryReviewList.ts` (hook).
  - Contenido: filtro «Todas» sin `status`; Enviada → `submitted`, En proceso → `in_review`, Aceptada → `accepted`, Rechazada → `rejected`. Cambiar el filtro vuelve a la página 1 y pide a la API. `hasMore` según `meta.has_more`. Sin filtrado en cliente. Contador de generación para descartar respuestas tardías.
  - Test: `apps/dashboard/src/tests/memory-list.test.tsx` (parte de ViewModel). Nombres: `CA-02 memory-list: pide page y status solo con filtro; «Siguiente» según has_more`, `CA-03 memory-list: cambiar el filtro vuelve a pedir la API; «Todas» omite status; no filtra en cliente`, `RN-03 memory-list: el ViewModel no calcula estados ni transiciones`.
  - Hecho cuando: pruebas en verde.

- [x] **T-06** (CA-02, CA-04, CA-13; RN-06): vista de la lista, sección y paginación.
  - Archivos: `apps/dashboard/src/views/MemoriesView.tsx` (`h1` «Momentos», filtro con `<label>` y `<select>`, tabla desde 768 px o tarjetas por debajo, estados de carga, vacío y error), `apps/dashboard/src/sections/MemoriesSection.tsx` (llama a `useMemoryReviewList` solo al abrirse; guarda `selectedId`), `apps/dashboard/src/components/MemoryStatusBadge.tsx` (icono y texto), `apps/dashboard/src/components/HasMorePaginationBar.tsx` (nuevo, compartido con `dashboard-010`: «Página {n}», «Anterior», «Siguiente» según `has_more`, sin total), `apps/dashboard/src/styles.css` (bloque `memory-review__*` con tokens semánticos).
  - Contenido por fila: fecha de envío, estado con icono y texto, fragmento de la opinión, «Reenviada…» si aplica, botón «Revisar» con `aria-label` que incluye la fecha. Textos: «No hay peticiones con este estado.», «Cargando peticiones…», «No se pudieron cargar las peticiones.» con «Reintentar» (propuesta, pregunta 8), «No tienes permiso para revisar momentos.» en 403.
  - Coordinación: si `HasMorePaginationBar` ya existe por `dashboard-010`, se reutiliza sin cambios.
  - Test: `apps/dashboard/src/tests/memory-list.test.tsx` (marcado). Nombres: `CA-02 memory-list: vacío, cargando y error con Reintentar; sin filas anteriores`, `CA-04 memory-list: fila con fecha, estado, fragmento y «Revisar»; sin datos del visitante`, `CA-13 memory-list: tabla desde 768 px y tarjetas por debajo; sin anchos fijos en la sección`.
  - Verificación visual de CA-13: T-17.
  - Hecho cuando: pruebas en verde; `memory-list.test.tsx` no encuentra nombre ni correo del visitante en el marcado.

## Detalle

- [x] **T-07** (CA-05, CA-17, CA-18; RN-07, RN-08, RN-09): ViewModel del detalle y de la imagen.
  - Archivos: `apps/dashboard/src/viewmodels/memory-review.ts` (`openDetail`, `closeDetail`, `loadImage`, con cliente y `BlobPreview` inyectados), `apps/dashboard/src/viewmodels/useMemoryReviewDetail.ts` (hook del detalle, la imagen y las decisiones; llama a `adminApi.memoryReview.get` y `.image`), `apps/dashboard/src/sections/MemoryDetailSection.tsx` (llama al hook solo cuando hay `selectedId`).
  - Contenido: `get` pasa la petición a En proceso (api-010 CA-08; el ViewModel no envía nada más). `image` se pide después del detalle; si `blob.type` no empieza por `image/`, estado `error`. 404 de imagen → estado `not-found`. Al cerrar, cambiar de petición o desmontar, se revoca la URL `blob:` y se limpia el estado (CA-17). Contador de generación: la respuesta de una petición anterior no escribe. Errores de detalle: 404 «Petición no encontrada.», 403 «No tienes permiso para revisar momentos.», red o 5xx «No se pudo cargar la petición.» con «Reintentar».
  - Test: `apps/dashboard/src/tests/memory-image.test.tsx` (CA-17) y `apps/dashboard/src/tests/memory-detail.test.tsx` (parte de ViewModel). Nombres: `CA-05 memory-detail: abrir pide el detalle una vez por petición`, `CA-17 memory-image: blob creado por el ViewModel; revocado al cerrar, al cambiar y al desmontar`, `CA-17 memory-image: sin localStorage, sessionStorage, IndexedDB ni cookies; sin imagen en la URL`, `CA-18 memory-detail: 404 de imagen deja el estado not-found y no abre la URL`, `RN-09 memory-image: la sección no construye rutas de /media`.
  - Bloqueo: M-3 no bloquea este ViewModel.
  - Hecho cuando: pruebas en verde.

- [x] **T-08** (CA-05, CA-06, CA-07, CA-15, CA-18, CA-19; RN-02, RN-04, RN-06): vista del detalle e imagen.
  - Archivos: `apps/dashboard/src/views/MemoryReviewDetailView.tsx` (opinión como texto, estado, fecha y reenvíos; bloque de decisión según estado; «Volver a la lista»; textos de CA-19 según `is_published`), `apps/dashboard/src/components/MemoryImage.tsx` (estados `loading`, `ready`, `error`, `not-found`; `alt="Foto enviada por un visitante"`; `object-fit: contain`), `apps/dashboard/src/styles.css` (bloque `memory-review__*`).
  - Contenido: `submitted` e `in_review` → «Aceptar» y «Rechazar»; «Aceptar» deshabilitado con «No se puede aceptar sin la imagen.» si `not-found`, y también mientras carga y ante error 5xx o red (pregunta 5 resuelta el 2026-11-13). `rejected` → «Esperando la corrección del visitante.», motivo y «La foto» / «La opinión». `accepted` → «Publicada en la galería hasta el {fecha}.» si `is_published`, «La publicación venció el {fecha}.» si no. «Fecha de publicación» desde `published_at` del detalle (M-3 resuelta el 2026-11-13; incorporada en `api-010`).
  - Test: `apps/dashboard/src/tests/memory-detail.test.tsx` (marcado). Nombres: `CA-05 memory-detail: muestra la opinión y la imagen antes de decidir`, `CA-06 memory-detail: imagen completa con alt «Foto enviada por un visitante»; opinión como texto, no HTML`, `CA-06 memory-detail: error de imagen muestra «No se pudo cargar la imagen.»`, `CA-07 memory-detail: acciones por estado; Rechazada y Aceptada solo lectura`, `CA-15 memory-detail: estados con icono y texto`, `CA-18 memory-detail: Aceptar deshabilitado con «No se puede aceptar sin la imagen.»; Rechazar disponible`, `CA-19 memory-detail: texto de vigencia según is_published; el estado sigue Aceptada`, `RN-06 memory-detail: textos de la vista en español`.
  - Hecho cuando: pruebas en verde.

## Decisiones sobre la petición

- [x] **T-09** (CA-08, CA-10, CA-12; RN-03, RN-04): aceptar.
  - Archivos: `apps/dashboard/src/viewmodels/memory-review.ts` (`acceptRequest`, con guard de imagen `ready`), `apps/dashboard/src/viewmodels/useMemoryReviewDetail.ts` (acción y recarga), `apps/dashboard/src/views/MemoryReviewDetailView.tsx` (diálogo de aceptar sobre `ConfirmDialog`: título «¿Aceptar esta petición?», texto con `publication_days`, «Confirmar» y «Cancelar»).
  - Contenido: solo «Confirmar» llama a `accept(id)`. Éxito (`200`): recarga el detalle y muestra el aviso «Petición aceptada.» y la vigencia. 422 con `errors.image` se muestra dentro del diálogo sin cerrarlo. 422 sin campo (decisión tardía, CA-10) muestra el mensaje de la API en `role="alert"` y recarga el detalle; nada más cambia. Cancelar y Escape no llaman a la API. Si falta `publication_days`, «Aceptar» queda deshabilitado (decisión del plan; pregunta 5).
  - Test: `apps/dashboard/src/tests/memory-decisions.test.tsx`. Nombres: `CA-08 memory-decisions: diálogo con plazo; solo Confirmar llama a accept`, `CA-08 memory-decisions: éxito recarga el detalle y muestra published_until`, `CA-08 memory-decisions: Cancelar no llama a la API`, `CA-10 memory-decisions: 422 de decisión tardía muestra el mensaje de la API y recarga`, `CA-12 memory-decisions: Escape cierra sin llamar a la API`, `RN-04 memory-decisions: el texto del diálogo dice el plazo que devuelve la API y no lo calcula`.
  - Hecho cuando: pruebas en verde.

- [x] **T-10** (CA-09, CA-10, CA-12; RN-03, RN-05): rechazar con motivo y casillas.
  - Archivos: `apps/dashboard/src/viewmodels/memory-review.ts` (`rejectRequest(input)` con validación por `canConfirmRejection`), `apps/dashboard/src/viewmodels/useMemoryReviewDetail.ts`, `apps/dashboard/src/components/MemoryRejectDialog.tsx` (sobre `ConfirmDialog`: título «Rechazar petición», texto propuesto, `<label>` «Motivo», `<textarea>`, contador «n/500», `<fieldset>` con `<legend>` «¿Qué falló?» y casillas «La foto» y «La opinión»).
  - Contenido: «Confirmar» deshabilitado (`confirmDisabled`) mientras `canConfirmRejection` sea falso; sin llamada a la API en ese caso. Solo `reject` tras confirmar, con `{ rejection_reason, rejected_fields }`. 422 de `errors.rejection_reason` o `errors.rejected_fields` junto al campo y el diálogo sigue abierto. 422 sin campo (CA-10) recarga y cierra. Éxito: recarga el detalle; aparece el motivo y las opciones marcadas.
  - Test: `apps/dashboard/src/tests/memory-decisions.test.tsx`. Nombres: `CA-09 memory-decisions: Confirmar deshabilitado sin motivo ni casillas; no llama a la API`, `CA-09 memory-decisions: motivo de 500 caracteres aceptado; 501 no`, `CA-09 memory-decisions: 422 de rechazo junto al campo sin cerrar`, `CA-10 memory-decisions: 422 de estado recarga y cierra el diálogo`, `RN-05 memory-decisions: rejected_fields solo image y content; al menos uno`, `CA-12 memory-decisions: Cancelar no llama a la API`.
  - Hecho cuando: pruebas en verde.

- [x] **T-11** (CA-10, CA-11; RN-01): errores de la sección.
  - Archivos: `apps/dashboard/src/viewmodels/memory-review.ts` y `useMemoryReviewList.ts` / `useMemoryReviewDetail.ts` (cableado del mapeo de T-04 en lista, detalle, imagen y decisiones), `apps/dashboard/src/views/MemoriesView.tsx` y `MemoryReviewDetailView.tsx` (avisos y botones «Reintentar»).
  - Contenido: 401 lo atiende el manejador global; sin mensaje propio en el ViewModel. 403 → «No tienes permiso para revisar momentos.». 404 de detalle → «Petición no encontrada.». 422 por campo junto al campo; 422 sin campo recarga. 5xx o red → «Reintentar». Ningún error deja filas ni datos anteriores visibles como actuales.
  - Test: `apps/dashboard/src/tests/memory-errors.test.tsx`. Nombres: `CA-11 memory-errors: 401 sin mensaje propio; el manejador global lo atiende`, `CA-11 memory-errors: 403 muestra el aviso de denegado en lista y detalle`, `CA-11 memory-errors: 404 de detalle muestra «Petición no encontrada.»`, `CA-11 memory-errors: 422 por campo y 5xx o red con Reintentar; sin datos anteriores`, `CA-10 memory-errors: 422 de estado recarga el detalle con el estado actual`, `RN-01 memory-errors: ninguna respuesta de error decide permisos en la UI`.
  - Hecho cuando: pruebas en verde.

- [x] **T-12** (CA-12, CA-13; RN-06): diálogos accesibles y marcado de la sección.
  - Archivos: `apps/dashboard/src/components/MemoryRejectDialog.tsx` y `apps/dashboard/src/views/MemoryReviewDetailView.tsx` (nombre accesible, `aria-describedby` y `aria-invalid` en campos, `aria-live` de avisos).
  - Contenido: `role="dialog"` con nombre accesible en todos los diálogos (heredado de `ConfirmDialog`). Escape y Cancelar sin llamada (probado en T-09 y T-10). Foco y retorno de foco: solo verificación manual (T-17).
  - Test: `apps/dashboard/src/tests/memory-a11y.test.tsx`. Nombres: `CA-12 memory-a11y: diálogos de aceptar y rechazar con role dialog y nombre accesible`, `CA-12 memory-a11y: el motivo tiene label y el contador se lee como texto`, `CA-13 memory-a11y: controles con etiqueta y botones con texto visible o aria-label`.
  - Verificación manual: foco y Escape en T-17.
  - Hecho cuando: pruebas en verde.

## Transversal

- [x] **T-13** (CA-14, CA-15, CA-17; RN-01, RN-07, RN-08): arquitectura, tokens y ausencia de almacenamiento local.
  - Test: `apps/dashboard/src/tests/memory-mvvm.test.tsx`. Nombres: `CA-14 memory-mvvm: views, components y sections sin fetch, axios, services ni @arca/api-client`, `CA-14 memory-mvvm: los hooks solo llaman a adminApi.memoryReview`, `CA-15 memory-mvvm: sin hex ni rgb() en los archivos nuevos de memory-review`, `RN-07 memory-mvvm: sin localStorage, sessionStorage ni IndexedDB en la sección`, `RN-07 memory-mvvm: sin dangerouslySetInnerHTML; la opinión se muestra como texto`, `RN-01 memory-mvvm: el código no calcula permisos, estados ni plazos`, `RN-08 memory-mvvm: los hooks de memory-review existen y son ViewModels`.
  - Archivos: solo lectura de `apps/dashboard/src/views/Memor*`, `components/Memory*`, `sections/Memor*`, `viewmodels/memory-review*` y `useMemoryReview*`.
  - Hecho cuando: pruebas en verde.

- [x] **T-14** (CA-16): cobertura de criterios.
  - Archivos: `apps/dashboard/src/tests/memory-coverage.test.tsx`.
  - Test: `CA-16 memory-coverage: cada CA-01 a CA-19 aparece en al menos un test memory-*.test.tsx`. Lee solo los archivos `memory-*.test.tsx` (no los `acceptance-coverage` ni `real-staff-login-coverage`, que leen todos los tests).
  - Hecho cuando: pruebas en verde y el test falla si falta un CA.

- [x] **T-15** (CA-01; RN-01): regresión de la shell y de la seguridad en el cliente.
  - Contenido: `administration-navigation.test.tsx`, `real-staff-login.test.tsx`, `ticket-sales-quality.test.tsx`, `content-image-display.test.tsx` y `responsive.test.tsx` sin cambios en el diff y en verde. Si `real-staff-login.test.tsx` cambiara su fixture para incluir `memories.review`, la expectativa exacta de navegación de `zoo-admin` requiere autorización explícita (riesgo R-11).
  - Archivos: ninguno (solo verificación).
  - Hecho cuando: el diff de esos archivos está vacío y su suite pasa.

## Documentación y entrega

- [x] **T-16** (RN-08; documentación): referencia duradera del dashboard y del paquete.
  - Archivos: `apps/dashboard/docs/arquitectura.md` (sección «Momentos», endpoints `memories` de `api-010`, ViewModels, `HasMorePaginationBar` y `blob-preview.ts` si son de 008), `packages/api-client/README.md` (namespace `memoryReview`).
  - Contenido: no se edita ninguna sección de `dashboard-010` en `arquitectura.md`. No hay requisito nuevo de servidor: `infra/README.md` no cambia (el proxy de `/api` ya existe).
  - Hecho cuando: los archivos reflejan lo implementado y no marcan nada como hecho sin evidencia.

- [ ] **T-17** (CA-06, CA-12, CA-13; RN-06): verificación manual en navegador contra la API en `arca_pruebas`. Requiere `api-010` fase 1 implementada y datos de prueba (preguntas 1 y 6).
  - Nota S3 (2026-11-13): pendiente de integración (S1): navegador contra la API real; foco y retorno de foco sin probar.
  - Contenido: (a) teclado: abrir y cerrar cada diálogo con Escape; el foco queda dentro; el foco vuelve al botón que lo abrió; (b) diseño adaptable a 360, 768, 1024 y 1366 px sin desbordamiento horizontal, con tabla o tarjetas según el ancho; (c) imagen completa y centrada (CA-06) con una foto real; (d) flujo completo contra la API: lista y filtros, revisar (pasa a En proceso), aceptar, rechazar con motivo y casillas, decisión tardía con dos sesiones; (e) con `admin` (Presidencia): la sección no aparece y, si la API responde 403, se muestra el aviso; (f) textos en español revisados (RN-06); (g) la imagen no aparece en la URL ni en el almacenamiento del navegador (DevTools).
  - Evidencia: notas o capturas en el PR. Incidencias abiertas, registradas.
  - Pendiente: verificación manual en navegador.
  - Hecho cuando: la evidencia está en el PR y las incidencias quedan registradas. Sin datos de prueba, esta tarea queda pendiente y no se marca.

- [ ] **T-18** (todos los CA; DoD): verificación automatizada y CI.
  - Nota S3 (2026-11-13): pendiente de integración (S1): CI.
  - Ejecutado (2026-11-13, sesión principal): `npm test` 455/455 aprobadas; `npm run types` y `npm run build` OK. Pendiente: `git diff --check`, `/verify` y CI en el PR; no se marca hasta tenerlos.
  - Contenido: `npm test` (`vitest run`), `npm run types` (`tsc --noEmit`) y `npm run build` del dashboard; `git diff --check`; `/verify` del dashboard; CI en verde en el PR. Registrar número de pruebas, aprobadas, fallidas y fallos preexistentes. Si algo no se ejecuta, se anota como no ejecutado; no se afirma que pasa.
  - Hecho cuando: los resultados están en el PR y el CI está en verde. Un CI en rojo no se mergea (Constitución IV).

- [ ] **T-19** (todos): entrega.
  - Nota S3 (2026-11-13): pendiente de integración (S1).
  - Contenido: el PR enlaza `specs/008-memory-moderation.md`, `plan/008-memory-moderation.md` y `tasks/008-memory-moderation.md`; el commit cita `dashboard-008`; el estado de la spec pasa a «En progreso» al empezar y a «Implementada» solo con evidencia de T-17 y T-18 y con el visto bueno del responsable. `apps/dashboard/AGENTS.md` se actualiza solo en ese momento.
  - Hecho cuando: el PR está revisado y el estado de la spec coincide con la evidencia.
  - Pendiente: PR, commit citando `dashboard-008` y estado de la spec (integración S1). La spec sigue Aprobada.

## Verificación (2026-11-13)

- Tests: `npm test` 455/455 en verde (suite del dashboard, sesión principal). `npm run types` y `npm run build` OK.
- Tests con nombre por CA: CA-01 a CA-19 aparecen en `memory-*.test.tsx` (cobertura en `memory-coverage.test.tsx`, CA-16).
- Regresión (T-15): el diff vacío de `administration-navigation.test.tsx`, `real-staff-login.test.tsx`, `ticket-sales-quality.test.tsx`, `content-image-display.test.tsx` y `responsive.test.tsx` no se pudo comprobar desde esta sesión (sin shell); la suite completa pasa.
- Pendientes: T-17 (verificación manual en navegador), T-18 (`git diff --check`, `/verify` y CI), T-19 (PR y estado de la spec), T-01 (registro en el PR).

Estado final de estas tareas: **En progreso** (plan y tasks aprobados por Jonathan, 2026-11-13). La spec sigue **Aprobada**.
