# 008 · memory-moderation

- App dueña: `dashboard`
- Apps/paquetes afectados: `dashboard` (sección «Momentos», solo con `memories.review`); `packages/api-client` (métodos y tipos de revisión de peticiones, incluida la descarga de la imagen de revisión; sin lógica de negocio); `api` (dueña de reglas, estados, permisos, vigencia y auditoría: `api-010`; ruta de imagen de revisión: `api-013`); `packages/ui` (solo si falta un componente compartido).
- Estado: Borrador
- Solicitante / responsable funcional: Aksel (decisión del 2026-11-10). Respuestas del responsable: Jonathan (2026-11-10).
- Aprobación funcional: pendiente.
- Aprobado por: (pendiente, nombre del compañero)
- Dependencias de contrato: `api-010` (Borrador; validación técnica/BD aprobada el 2026-11-11) y DBR-012 (Aprobada y aplicada en `arca_pruebas` el 2026-11-11; Lista para backend). La sección no se implementa hasta que la API esté disponible en el ambiente de pruebas con el permiso asignado.

## Problema y contexto

Los visitantes podrán enviar desde la app una foto con una opinión corta (`api-010`, `mobile-010`). Hasta ahora no hay dónde revisarlas. La Dirección (`zoo-admin`) necesita una sección en el dashboard para ver las peticiones, abrir cada una, ver la foto y la opinión, y decidir: aceptarla, con publicación durante un plazo, o rechazarla indicando qué falló (la foto, la opinión o ambas) y un motivo. Al aceptar, la foto y la opinión se publican en la galería del portal (`web-010`) hasta su vencimiento.

Solo `zoo-admin` revisa. La Presidencia (`admin`) no tiene acceso a esta sección: el permiso `memories.review` no se le asigna. Aun así, si intenta abrirla, la API responde 403 (`api-010` CA-14).

El dashboard solo presenta. Los estados, las transiciones, los plazos y la autorización los decide la API.

## Decisiones tomadas (2026-11-10)

- La sección «Momentos» aparece solo si la API indica el permiso `memories.review`.
- Lista paginada con filtro por estado.
- Al abrir el detalle, la petición pasa de Enviada a En proceso en la API, sin acción adicional de la persona revisora.
- **Previsualización antes de decidir (P13):** el detalle muestra la imagen completa y la opinión. Así la persona revisora decide con ambas a la vista.
- **Imagen de revisión (P13; `api-013` D-06):** la imagen llega por la ruta autenticada de la API (`admin.memories.image`), con proxy de mismo origen. El dashboard la recibe como blob en memoria, a través de `@arca/api-client`, y la libera al cerrar el detalle (CA-17).
- **Aceptar (P5):** el diálogo dice que la foto y la opinión se publicarán en la galería del portal durante el plazo vigente (`publication_days`), y el detalle de una aceptada muestra hasta cuándo está publicada (CA-08, CA-19).
- **Rechazar con motivos (P3, P6):** el diálogo pide un motivo de 1 a 500 caracteres (aprobado) y marcar **una o más** opciones: «La foto» (`image`) y «La opinión» (`content`). Sin motivo o sin ninguna opción, no se puede confirmar (CA-09).
- **Decisión final por revisión (P3):** aceptar o rechazar solo es posible en Enviada o En proceso. Una rechazada espera la corrección del visitante; el dashboard no ofrece acciones sobre ella (CA-07, CA-10).
- Patrón MVVM: componentes como Views, hooks como ViewModels, datos mediante `@arca/api-client`.

## Objetivos

- Que `zoo-admin` vea las peticiones por estado, de la más reciente a la más antigua.
- Que pueda abrir una petición, ver la imagen y la opinión, y decidir.
- Que al rechazar pueda decir qué falló, para que el visitante sepa qué corregir.
- Que cada decisión quede registrada en la API y se refleje en la lista sin recargar la página.
- Que un error o una decisión tardía no dejen la pantalla con datos falsos.

## Fuera de alcance

- Acceso de `admin` (Presidencia) o de otros roles a la sección. Ver `dashboard-002` y `api-010` CA-14.
- Retirar de la galería una foto ya publicada antes de su vencimiento (pregunta 1 de `api-010`).
- Editar la petición, la opinión o la imagen desde el dashboard.
- Varias imágenes por petición.
- Búsqueda por texto, exportación o estadísticas.
- Notificaciones al visitante (correo o push).
- Moderación automática.
- Ver datos personales del visitante en la sección (pregunta 1).
- Cambios de estilo de marca: se usan tokens semánticos.
- Descargar la imagen a disco o copiarla desde la sección.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos (API) |
|---|---|---|
| `zoo-admin` (Dirección) | Revisar, ver la imagen, aceptar o rechazar peticiones | `memories.review` y 2FA confirmado (`api-007` CA-25) |
| `admin` (Presidencia) | Sin acceso. La sección no aparece; si llega por URL, la API responde 403 y la vista muestra un mensaje de sin permiso | Ninguno. Se excluye de `memories.review` (`api-010` RN-07) |
| `executive`, `cashier`, `veterinarian` | Sin acceso | — |

## Historias de usuario

- Como `zoo-admin`, quiero ver las peticiones de visitantes filtradas por estado, para saber cuáles faltan por revisar.
- Como `zoo-admin`, quiero abrir una petición y ver su imagen completa y su opinión, para decidir si la publico.
- Como `zoo-admin`, quiero aceptar una petición con una confirmación clara que me diga durante cuánto tiempo se publicará, para que aparezca en la galería del portal.
- Como `zoo-admin`, quiero rechazar una petición con un motivo y marcar si falla la foto, la opinión o ambas, para que el visitante sepa qué corregir.

## Criterios de aceptación

- **CA-01 (visibilidad):** Dada una sesión con `memories.review` en sus permisos, cuando se muestra la navegación, entonces aparece la sección «Momentos». Sin ese permiso, la sección no aparece, y la vista de «Momentos» responde con «No tienes permiso para revisar momentos.» si se abre por otra vía. El dashboard no protege la sección por sí mismo: la autorización real es la de la API (RN-01).
- **CA-02 (lista paginada):** Dada la sección «Momentos», cuando carga, entonces muestra la lista que devuelve `GET /api/v1/admin/memories`, con 10 peticiones por página, paginación con «Anterior» y «Siguiente» según `meta.has_more`, y estados de carga, vacío («No hay peticiones con este estado.») y error.
- **CA-03 (filtro por estado):** Dado el filtro de estado (Todas, Enviada, En proceso, Aceptada, Rechazada), cuando cambia, entonces la vista vuelve a consultar la API con ese `status` y no filtra en el cliente. La etiqueta de Rechazada es «Rechazada» en el filtro y en la fila; el texto «espera la corrección del visitante» aparece solo en el detalle (CA-07).
- **CA-04 (fila de la lista):** Dada una fila, cuando se muestra, entonces incluye la fecha de envío, la etiqueta del estado en español, un fragmento de la opinión como texto y un control accesible «Revisar» que abre el detalle. La lista no muestra datos personales del visitante (pregunta 1). Si la petición tiene reenvíos, muestra «Reenviada {n} veces».
- **CA-05 (detalle y En proceso):** Dada una petición en Enviada, cuando se abre el detalle, entonces la vista pide `GET /api/v1/admin/memories/{id}`, muestra la opinión y la imagen completa (CA-06), y la API la pasa a En proceso. Al volver a la lista, la fila muestra En proceso sin recargar la página completa.
- **CA-06 (imagen y previsualización):** Dada la imagen de una petición, cuando se muestra el detalle, entonces se ve completa y centrada, sin recorte ni ampliación (criterio de `dashboard-007`), con `alt` que describe la petición como «Foto enviada por un visitante». La persona revisora ve la foto y la opinión antes de elegir «Aceptar» o «Rechazar». La opinión se muestra como texto, nunca como HTML. Si la imagen falla al cargar, se muestra un marcador con texto «No se pudo cargar la imagen.».
- **CA-07 (acciones según estado):**
  - Dada una petición en Enviada o En proceso, cuando se muestra el detalle, entonces ofrece «Aceptar» y «Rechazar».
  - Dada una petición Rechazada, cuando se muestra, entonces solo lectura: el motivo, las opciones marcadas («La foto», «La opinión») y el texto «Esperando la corrección del visitante.». Ninguna acción.
  - Dada una petición Aceptada, cuando se muestra, entonces solo lectura: la fecha de publicación y el texto de vigencia de CA-19. Ninguna acción.
- **CA-08 (aceptar):** Dada una petición en Enviada o En proceso, cuando se pulsa «Aceptar», entonces se abre un diálogo de confirmación que dice que la foto y la opinión se publicarán en la galería del portal durante {publication_days} días desde la aceptación, y que después dejarán de mostrarse (texto de `api-010` CA-30 y CA-31). Solo «Confirmar» llama a `POST .../accept`. Al éxito, la petición pasa a Aceptada, muestra su fecha de vencimiento (`published_until`) y se muestra un aviso accesible de confirmación. Cancelar no llama a la API.
- **CA-09 (rechazar con motivo y campos):** Dada una petición en Enviada o En proceso, cuando se pulsa «Rechazar», entonces se abre un diálogo con:
  - el campo «Motivo» obligatorio (de 1 a 500 caracteres, con contador);
  - dos casillas, «La foto» y «La opinión», de las que hay que marcar al menos una.

  «Confirmar» está deshabilitado mientras falte el motivo o ninguna casilla, y no se llama a la API. Al éxito, la petición pasa a Rechazada y muestra el motivo y las opciones marcadas. Un 422 se muestra junto al campo que lo causó (`errors.rejection_reason` o `errors.rejected_fields`).
- **CA-10 (decisión tardía):** Dada una petición que otra persona ya aceptó, rechazó o dejó en Rechazada mientras se revisaba, cuando la API responde 422 (`api-010` CA-13), entonces la vista muestra el mensaje de la API («Esta petición ya fue revisada.» o «Esta petición está rechazada y espera la corrección del visitante.»), vuelve a cargar el detalle con el estado actual y no cambia nada más.
- **CA-11 (errores):** Dada una respuesta de error, cuando llega, entonces: 401 vuelve al login con «Tu sesión expiró» (`dashboard-002` CA-08); 403 muestra «No tienes permiso para revisar momentos.»; 404 muestra «Petición no encontrada.»; 422 muestra el mensaje de la API junto al campo; un fallo de red o un 5xx muestra un error con botón «Reintentar». Ningún error deja datos anteriores visibles como si fueran actuales.
- **CA-12 (diálogos accesibles):** Dado un diálogo de confirmación o de motivo, cuando se abre, entonces tiene `role="dialog"` y nombre accesible, mantiene el foco dentro, devuelve el foco al control que lo abrió al cerrarse y se cierra con Escape sin llamar a la API.
- **CA-13 (teclado y adaptación):** Dada la sección, cuando se usa con teclado y en anchos de 360 a 1366 px, entonces todos los controles tienen foco visible, la tabla o la lista tiene desplazamiento propio o diseño apilado, y no hay desbordamiento horizontal de la página.
- **CA-14 (solo presentación):** Dado el código de la sección, cuando se revisa, entonces ningún componente de `views/` o `components/` llama a la API ni a `fetch`, y ninguno calcula estados, transiciones, plazos ni permisos. Las llamadas van por hooks ViewModel con `@arca/api-client`.
- **CA-15 (estilo):** Dadas las vistas nuevas, cuando se revisa su estilo, entonces usan tokens semánticos y no fijan colores de marca en hexadecimal. Los estados (Enviada, En proceso, Aceptada, Rechazada) se distinguen también por texto, no solo por color.
- **CA-16 (cobertura de pruebas):** Dada la suite de Vitest con un cliente simulado de `@arca/api-client`, cuando se ejecuta, entonces existe al menos una prueba que nombra cada CA-01 a CA-19.
- **CA-17 (imagen de revisión sin persistencia):** Dada la imagen de una petición en revisión, cuando el ViewModel la pide a `@arca/api-client` (`GET /api/v1/admin/memories/{id}/image` por proxy de mismo origen, con las credenciales de sesión del dashboard), entonces:
  - la vista la muestra con una URL `blob:` creada por el ViewModel;
  - esa URL se revoca al cerrar el detalle, al cambiar de petición y al desmontar la vista;
  - la imagen no se escribe en `localStorage`, `sessionStorage`, IndexedDB ni cookies, y no aparece en la URL de navegación;
  - ningún componente hace la petición de imagen.
- **CA-18 (imagen no disponible):** Dada una petición en revisión cuya imagen la API no encuentra (404), cuando se muestra el detalle, entonces la vista muestra «No se pudo cargar la imagen.» y la acción «Aceptar» queda deshabilitada con el texto «No se puede aceptar sin la imagen.». «Rechazar» sigue disponible, para que la persona revisora pueda indicar el problema. La API también rechaza aceptar sin imagen (`api-010` CA-11).
- **CA-19 (plazo visible):** Dada una petición Aceptada, cuando se muestra su detalle, entonces dice «Publicada en la galería hasta el {fecha}.» si `published_until` es posterior a ahora, o «La publicación venció el {fecha}.» si ya pasó. El estado sigue siendo Aceptada en ambos casos.

## Reglas de negocio

- **RN-01 (presentación):** El mapa permiso → sección es solo presentación. La API aplica la autorización (`api-010` CA-14). Ocultar la sección no la protege.
- **RN-02 (estados en español):** La API devuelve el código de estado. La vista lo traduce: Enviada, En proceso, Aceptada, Rechazada. Una rechazada espera la corrección del visitante.
- **RN-03 (transiciones de la API):** El paso a En proceso, aceptar y rechazar los decide la API (`api-010` RN-02). El dashboard no calcula transiciones ni decide si una acción está permitida más allá de mostrar las acciones de CA-07 y CA-18.
- **RN-04 (publicación con plazo):** Aceptar publica en la galería del portal durante el plazo que devuelve la API (`api-010` RN-21). Los textos del diálogo y del detalle lo dicen así. El plazo no lo calcula el dashboard.
- **RN-05 (motivo y campos):** El motivo de rechazo es obligatorio, de 1 a 500 caracteres (`api-010` RN-04). Las casillas «La foto» y «La opinión» equivalen a `image` y `content` (`api-010` RN-20); la API valida que haya al menos una. El cliente solo ayuda con el contador y con el botón deshabilitado.
- **RN-06 (textos):** Todos los textos van en español; identificadores y rutas en inglés (Constitución VI).
- **RN-07 (sin almacenamiento local):** La sección no guarda peticiones, imágenes ni opiniones en el navegador. La imagen de revisión existe solo en memoria como blob mientras se ve (CA-17).
- **RN-08 (MVVM):** Componentes como Views, hooks como ViewModels (un hook para la lista, otro para el detalle y, si hace falta, otro para la imagen), datos mediante `@arca/api-client` (`AGENTS.md` del dashboard).
- **RN-09 (imagen por proxy de mismo origen):** La imagen de revisión se pide a una ruta relativa del mismo origen del dashboard, que el servidor o el entorno de desarrollo reenvía a la API (`api-013` D-06). No hay CORS para esa ruta. El plan fija el proxy.

## Datos, privacidad y auditoría

- La sección muestra la opinión y la imagen de la petición. No muestra datos personales del visitante (pregunta 1).
- La imagen y la opinión se muestran solo al personal con `memories.review`. La imagen llega por la ruta autenticada `admin.memories.image` (`api-010` CA-08), nunca por URL pública del almacenamiento. La carpeta `media/memories/` sí se publica por `/media` (`api-013` RN-16): esa es una limitación de la API y del almacenamiento que esta sección no resuelve.
- Las acciones de revisión (En proceso, aceptar, rechazar) quedan en Activitylog por la API (`api-010` CA-19).
- No se guarda nada en el navegador (RN-07).
- No requiere DBR propia.

## Flujos y errores

1. `zoo-admin` entra al dashboard. Si tiene `memories.review`, ve la sección «Momentos».
2. La lista carga la primera página de Enviadas (o de la opción elegida en el filtro).
3. «Revisar» abre el detalle. La API pasa la petición a En proceso (CA-05). La opinión y la imagen se muestran (CA-06).
4. «Aceptar» abre el diálogo con el plazo (CA-08). «Rechazar» abre el diálogo con motivo y casillas (CA-09). La API decide (CA-10 si ya estaba revisada).
5. Al volver a la lista, la fila muestra el estado nuevo.
6. Si la imagen no está (CA-18), no se puede aceptar; sí se puede rechazar.
7. Errores según CA-11.

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:**
  - `api-010` (endpoints `admin/memories*`, permiso, vigencia y auditoría; Borrador).
  - `api-013` (Borrador) y ADR 0026 (Propuesto): la imagen de revisión llega por ruta autenticada sin URL en el JSON, con proxy de mismo origen (`api-013` D-06).
  - DBR-012 (`docs/database/requests/DBR-012-visitor-memories.md`; Aprobada y aplicada en `arca_pruebas` el 2026-11-11; Lista para backend).
  - `dashboard-002` (sesión, `me` con permisos, 401).
  - `dashboard-007` (criterio de imagen completa y centrada).
  - `api-007` (2FA y rutas `/api/v1/admin`).
  - `web-010` y `api-012`: la aceptación se refleja en la galería durante el plazo.
  - `@arca/api-client`: métodos nuevos de lista, detalle, imagen (blob), aceptar y rechazar con `rejected_fields`. Tipos de `publication_days`, `published_until` e `is_published`.
  - No hay ADR nuevo ni dependencia nueva. Si se necesita un icono nuevo, se añade en `components/Icon.tsx` del dashboard, sin dependencia.
- **Riesgos:**
  - Dos personas revisan a la vez: CA-10 lo resuelve sin duplicar decisiones.
  - La decisión de aceptar no se revierte en esta versión (`api-010` pregunta 1, retirada). El diálogo lo dice (CA-08).
  - Opinión con datos personales que el revisor debe leer antes de aceptar. Esta sección no la filtra.
  - Una imagen grande tarda en cargar: se muestra el estado de carga (CA-06).
  - La imagen en memoria (blob) ocupa memoria mientras se ve; se libera al cerrar (CA-17).
  - La imagen pendiente es alcanzable por `/media` si se conoce su URL (`api-013` RN-16). La sección no lo evita.
- **Preguntas pendientes:**
  1. ¿La lista o el detalle deben mostrar el nombre o el correo del visitante para que `zoo-admin` pueda revisar? Propuesta: no (privacidad y RN del portal); la revisión se hace solo con la foto y la opinión.
  2. ¿El tamaño de página es 10? Propuesta: sí, igual que el resto de listas de administración.
  3. ¿Se añade el botón «Retirar de la galería» en esta sección? Propuesta: no. Retirar antes del vencimiento está fuera de alcance de esta versión (`api-010` pregunta 1).

## Nota de almacenamiento (2026-11-10)

Decisión del responsable pendiente de aprobación formal del equipo. Esta spec no cambia su estado (Borrador).

- **CA-06 (imagen):** por la decisión del responsable (`api-013` D-02), los momentos están en la carpeta versionada `media/memories/`. La imagen de revisión llega por la ruta autenticada `admin.memories.image` (`api-013` CA-10), sin URL en el JSON, y se usa por proxy de mismo origen como blob en memoria (CA-17). Si el archivo falta (flujo 8 de `api-013`), la vista muestra «No se pudo cargar la imagen.» (CA-18).
- **Tipos:** si la respuesta de revisión añade un campo nuevo, `@arca/api-client` lo recoge en sus tipos. No hay lógica de negocio en el cliente (CA-14).
- **CORS:** no necesario para esa ruta: el dashboard la consume por proxy de mismo origen (`api-013` RN-12, D-06).

## Revisión

- Aprobadores y fecha: pendiente.
- Aprobado por: (pendiente, nombre del compañero)
- Historial: borrador del 2026-11-10 → revisión del 2026-11-10 con las respuestas del responsable (decisión final por revisión, rechazo con motivos marcados, previsualización, plazo de publicación visible, imagen por proxy de mismo origen y CA-17 a CA-19).
- Evidencia/enlaces: `apps/api/specs/010-visitor-memory-requests.md`, `apps/api/specs/013-object-storage-images.md`, `apps/mobile/specs/010-visitor-memory-requests.md`, `apps/web/specs/010-dynamic-memories.md`, `apps/dashboard/specs/005-ticket-sales.md` (patrón de historial y diálogos), `apps/dashboard/specs/007-content-image-display.md` (imagen completa), `apps/dashboard/specs/002-real-staff-login.md` (sesión y 401), `apps/api/specs/007-administration-management.md` (permisos y 2FA de `/api/v1/admin`), `docs/database/requests/DBR-012-visitor-memories.md`.
