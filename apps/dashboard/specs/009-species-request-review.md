# 009 · species-request-review

- App dueña: `dashboard`
- Apps/paquetes afectados: `dashboard` (sección «Solicitudes de especies», solo con `species.review`); `packages/api-client` (métodos y tipos de solicitudes); `api` (dueña de reglas, estados, permisos, auditoría: `api-014`); `packages/ui` (solo si falta componente)
- Estado: Borrador
- Solicitante / responsable funcional: (por designar)
- Aprobación funcional: (pendiente)
- Dependencias de contrato: `api-014` (Aprobada 2026-11-12) y DBR-013 (`species_publication_requests`, aprobada por BD y backend el 2026-11-12; aplicada en `arca_pruebas`, lote 5, verificada el 2026-11-12; «Lista para backend»)

> **Integrada en dashboard-010 (2026-11-11).** Las solicitudes de especie pasan a `apps/dashboard/specs/010-public-content-management.md`, que la absorbe y añade la edición de la solicitud antes de aceptarla (`dashboard-010` CA-07 a CA-10) y el efecto en TulanPedia. Esta spec no se borra; su texto sigue como referencia hasta la aprobación de `dashboard-010`. Cada CA de la sección A de `dashboard-010` indica entre paréntesis el CA de esta spec del que procede.
>
> **Cambio de modelo (2026-11-11): fuente de verdad, `dashboard-010`.** La solicitud ya no propone una especie nueva que se crea al aceptar. Propone la **publicación de una especie existente** (`api-014`). «Aceptar» pasa a «Aceptar y publicar»: actualiza la especie, no la crea. El nombre común no es editable. Los textos de este documento que hablen de crear la especie, de «Aceptada» como único estado visible o de la ruta `admin/species-requests` quedan superados por `dashboard-010`.

## Problema y contexto

Los veterinarios envían solicitudes de nuevas especies para el catálogo público desde la PWA (`pwa-005`). La Dirección del Zoológico (`zoo-admin`) necesita una sección en el dashboard para revisar estas solicitudes, ver la foto y decidir aceptarlas (publicarlas en el catálogo) o rechazarlas (con motivo). Solo `zoo-admin` revisa estas solicitudes; `admin` no tiene acceso.

## Objetivos

- Que `zoo-admin` vea una lista de solicitudes filtrada por estado (todas, pendiente, aceptada, rechazada).
- Que pueda abrir una solicitud, ver la foto completa, datos de la especie y el nombre del veterinario solicitante.
- Que pueda aceptar la solicitud → publica la especie en el catálogo público.
- Que pueda rechazar con motivo → se registra la decisión, no se publica nada.
- Que cada decisión quede registrada sin necesidad de recargar la página.

## Fuera de alcance

- Edición de solicitudes rechazadas.
- Reenvío o corrección por el veterinario desde esta sección.
- Eliminación de especies publicadas una vez aceptadas (corresponde a otra feature).
- Cambios al catálogo público fuera de la aceptación de solicitudes.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| `zoo-admin` (Dirección) | Revisar, aceptar, rechazar solicitudes | `species.review` y 2FA confirmado |
| `admin` (Presidencia) | Sin acceso | Ninguno; se excluye de `species.review` |
| `executive`, `cashier`, `veterinarian` | Sin acceso | — |

## Historias de usuario

- Como `zoo-admin`, quiero ver las solicitudes de nuevas especies pendientes para revisarlas antes de publicarlas en el catálogo.
- Como `zoo-admin`, quiero ver la foto adjunta y los datos de la especie para decidir si es apropiada.
- Como `zoo-admin`, quiero aceptar una solicitud para que se publique en el catálogo visible a los visitantes.
- Como `zoo-admin`, quiero rechazar una solicitud con un motivo para que el veterinario sepa qué no se aceptó (aunque no reciba notificación directa).

## Criterios de aceptación

### Navegación y estructura

- **CA-01:** Dada una sesión con `species.review` en sus permisos y 2FA confirmado, cuando se presenta la navegación del dashboard, entonces aparece la sección «Solicitudes de especies». Sin ese permiso, la sección no aparece; si se abre por URL directo, la vista muestra «No tienes permiso para revisar solicitudes de especies.»

- **CA-02:** Dada la sección abierta, cuando carga, entonces no muestra aviso de demostración; los datos provienen de `GET /api/v1/admin/species-requests`.

### Lista de solicitudes

- **CA-03:** Dada la sección, cuando carga, entonces muestra lista paginada con 10 solicitudes por página, ordenadas por fecha de envío descendente (más recientes primero), con filtro por estado (Todas, Pendiente, Aceptada, Rechazada). Columnas: nombre común, nombre científico, veterinario solicitante, fecha de envío, estado.

- **CA-04:** Dado el filtro de estado, cuando cambia, entonces la vista consulta la API sin filtrar en el cliente; solo paginación y filtro van al backend.

- **CA-05:** Dada una fila, cuando se muestra, entonces incluye: nombre común, nombre científico (máx. 60 caracteres, truncado con «…» si es más largo), nombre del veterinario, fecha de envío formateada, etiqueta de estado en español (Pendiente, Aceptada, Rechazada) con color/icono distintivo.

- **CA-06:** Dada una fila, cuando está en estado Pendiente o Aceptada, entonces muestra un botón «Revisar» accesible que abre el detalle. Si está Rechazada, muestra solo un botón «Ver» de lectura.

- **CA-07:** Dadas listas vacías, estados de error y paginación, cuando se presentan, entonces muestran «No hay solicitudes con este estado.» si está vacía, un estado de carga mientras llega la API, un aviso de error con botón «Reintentar» si falla, y controles «Anterior»/«Siguiente» según `meta.has_more`.

### Detalle de solicitud

- **CA-08:** Dada una solicitud, cuando se abre el detalle, entonces la vista pide `GET /api/v1/admin/species-requests/{id}` y muestra:
  - Nombre común, nombre científico, origen, hábitat (datos de texto).
  - Veterinario solicitante, fecha de envío.
  - La foto completa y centrada, sin recorte ni ampliación.
  - Según estado: Pendiente → botones Aceptar/Rechazar; Aceptada → solo lectura con texto «Publicada en el catálogo»; Rechazada → solo lectura con motivo visible.

- **CA-09:** Dada la imagen de una solicitud, cuando se muestra el detalle, entonces la vista la obtiene por `GET /api/v1/admin/species-requests/{id}/image` (ruta autenticada, binario) y la muestra como blob centrado, sin URL expuesta, con `alt="Foto de {common_name}"`. Si la API responde `404` (foto faltante), muestra un marcador: «No se pudo cargar la foto.»

- **CA-10:** Dada una solicitud en Pendiente, cuando se muestra, entonces ofrece dos botones: «Aceptar» (primario) y «Rechazar» (secundario).

### Aceptar

- **CA-11:** Dada una solicitud en Pendiente, cuando se pulsa «Aceptar», entonces se abre un diálogo de confirmación que dice «¿Aceptar esta solicitud? La especie se publicará en el catálogo público visible para los visitantes.» Solo «Confirmar» llama a `POST .../accept`.

- **CA-12:** Al éxito (`200`), la solicitud pasa a Aceptada, se muestra el texto «Publicada en el catálogo» en el detalle, se ocultan los botones de acción, y se muestra un aviso accesible: «Solicitud aceptada. La especie es ahora visible en el catálogo público.»

- **CA-13:** Si la API responde `422` («Esta solicitud ya fue revisada.»), el detalle se recarga con el estado actual y no cambia nada.

### Rechazar

- **CA-14:** Dada una solicitud en Pendiente, cuando se pulsa «Rechazar», entonces se abre un diálogo con un campo de motivo (obligatorio, 1-500 caracteres, con contador). La casilla de confirmación fue reemplazada por el diálogo obligatorio de `dashboard-010` CA-13 (decisión del usuario 2026-11-11). El botón «Confirmar» está deshabilitado si el motivo está vacío. Al confirmar, llama a `POST .../reject` con `{rejection_reason}`.

- **CA-15:** Dado el diálogo de rechazo, cuando se escribe el motivo, entonces muestra un contador de caracteres (p. ej. «245/500») y el botón «Confirmar» se habilita solo si hay 1+ caracteres.

- **CA-16:** Al éxito (`200`), la solicitud pasa a Rechazada, el detalle muestra el motivo en lectura, se ocultan los botones de acción, y se muestra un aviso: «Solicitud rechazada. No se publicó en el catálogo.» Un botón «Volver a la lista» cierra el detalle.

- **CA-17:** Si la API responde `422` con error de motivo (faltante, fuera de rango), se muestra el error junto al campo sin cerrar el diálogo.

### Calidad y accesibilidad

- **CA-18:** Dada la lista y los detalles, cuando se usan con teclado y en anchos de 360 a 1366 px, entonces todos los botones tienen foco visible, los diálogos tienen `role="dialog"` con nombre accesible, mantienen el foco dentro, se cierran con Escape sin enviar a la API, y no hay desbordamiento horizontal.

- **CA-19:** Dada la interfaz, cuando se revisa su estilo, entonces usa tokens semánticos y no fija colores de marca en hexadecimal. Los estados se distinguen por icono y texto, no solo por color.

- **CA-20:** Dada la sección, cuando se revisa el código, entonces todos los hooks ViewModel llaman a `@arca/api-client`, ningún componente de `views/` o `components/` usa `fetch`/`axios`, no hay cálculo de estados ni transiciones en el cliente, y existe una prueba de Vitest por cada CA-01 a CA-19.

- **CA-21:** Dado cualquier `401` en esta sección, cuando lo detecta el estado de sesión, entonces el dashboard vuelve al login con «Tu sesión expiró.»

## Reglas de negocio

- **RN-01:** La sección es solo presentación. La autorización real la aplica la API (`api-014`). Ocultar la sección no protege los endpoints.

- **RN-02:** Estados en español: Pendiente, Aceptada, Rechazada. La API es la única que valida transiciones; el dashboard solo presenta las acciones permitidas.

- **RN-03:** Aceptar publica la especie en el catálogo público; requiere confirmación explícita.

- **RN-04:** Rechazar requiere motivo de 1-500 caracteres; el dashboard valida longitud (1+ caracteres, máx. 500) antes de enviar, la API valida de nuevo.

- **RN-05:** La foto se muestra solo en el detalle, por ruta autenticada, como blob sin URL expuesta.

- **RN-06:** Mensajes en español; identificadores y rutas en inglés (Constitución VI).

- **RN-07:** Sin almacenamiento de solicitudes, fotos ni datos en el navegador (excepto en memoria durante la sesión).

- **RN-08:** Patrón MVVM: vistas como componentes React, lógica en hooks ViewModel, datos por `@arca/api-client`.

- **RN-09:** El rechazo no notifica al veterinario (solicitud solo administrativa para auditoría).

## Datos, privacidad y auditoría

- La foto de la solicitud se muestra solo a quien tenga `species.review`; no se almacena en el navegador, solo se descarga como blob.
- La decisión (aceptación/rechazo) la registra la API en auditoría: quién, cuándo, motivo si hay.
- No se guardan datos en localStorage, sessionStorage ni cookies.

## Flujos y errores

1. `zoo-admin` entra al dashboard con `species.review`.
2. Abre «Solicitudes de especies»; carga lista de Pendientes.
3. Filtra o pagina según sea necesario.
4. «Revisar» abre el detalle con foto y datos.
5. Acepta → diálogo de confirmación → solicitud Aceptada, especie publicada.
6. O Rechaza → diálogo con motivo → solicitud Rechazada, foto borrada del almacén.
7. Vuelve a la lista; la fila muestra el nuevo estado.
8. Errores: 401 → login; 403 → aviso de sin permiso; 404 → solicitud no encontrada; 422 → error de lógica (ya revisada, foto faltante); fallo de red → reintentar.

## Dependencias, riesgos y preguntas

- **Dependencias:**
  - `api-014` (Aprobada 2026-11-12; requiere implementación backend, que espera a «Lista para backend» de DBR-013).
  - DBR-013 (`species_publication_requests`, tabla nueva, y columnas de publicación en `species`).
  - `api-013` (almacenamiento de imágenes, rutas autenticadas).
  - Permiso `species.review` nuevo.

- **Riesgos:**
  - Dos admins revisan a la vez → CA-13 resuelve con error `422`.
  - Foto grande tarda en cargar → mostrar spinner.
  - Motivo con datos personales → revisor debe leer antes de aceptar (no se filtra en el cliente).

- **Preguntas abiertas:**
  1. ¿El tamaño de página es 10, igual que otras listas administrativas? Propuesta: sí.
  2. ¿Se puede ver el historial de solicitudes rechazadas indefinidamente, o se purgan? Propuesta: indefinido, auditoría completa.
  3. ¿Notificar al veterinario por email si se acepta su solicitud? Propuesta: No en V1; futura integración de notificaciones.

## Revisión

- Aprobadores y fecha: (pendiente)
- Estado: Borrador (requiere aprobación técnica y de API antes de En progreso)
- Historial: 2026-11-11, nota de cambio de modelo (publicación de especie existente, no especie nueva). Fuente de verdad: `dashboard-010`. Esta spec no cambia sus CA; quedan como referencia histórica hasta su integración.
