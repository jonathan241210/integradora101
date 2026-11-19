# 013 · enclosure-qr-printing

- App dueña: `dashboard`
- Apps/paquetes afectados: `dashboard` (Recintos, diálogo del QR, hoja de impresión, catálogo de acciones y estilos); `api` (proveedor: `api-020`); `packages/api-client` (métodos y tipos de `api-020`, sin lógica). `mobile`, `web` y `pwa` no cambian.
- Estado: Aprobada (Jonathan, 2026-11-18)
- Solicitante / responsable funcional: Jonathan (decisiones de producto registradas el 2026-11-18)
- Aprobación funcional: Jonathan, 2026-11-18.
- Dependencias: `api-020` (Aprobada 2026-11-18; contrato del QR: consulta, generación y regeneración; su implementación backend es precondición de `dashboard-013`); `dashboard-012` (Aprobada; enmienda (c) a CA-32, CA-38 y RN-07, registrada en esa spec y aplicada con esta); `dashboard-003` (`ConfirmDialog` de regeneración); `api-019` (listado admin y 404 de recintos). No hay dependencias npm nuevas. No requiere ADR.

## Problema y contexto

`dashboard-012` gestiona los recintos (estado, eliminación, paginación y buscador), pero no muestra ni imprime sus códigos QR. Sin una hoja impresa, el personal no puede colocar el QR en la entrada del recinto. Además, la entrada manual de `mobile-006` (CA-03) necesita el código en texto para cuando el visitante no puede usar la cámara.

## Objetivos

- Ver, generar y regenerar el QR de un recinto desde su tarjeta, con confirmación al regenerar.
- Imprimir una hoja limpia con el QR grande, el nombre del recinto y el código en texto debajo, sin dependencias nuevas.
- Llegar al QR del recinto desde el buscador de `dashboard-012`.
- Cubrir cada CA-xx con al menos un test de Vitest que lo nombre.

## Fuera de alcance

- Generar un PDF en el servidor, descargar un archivo o imprimir varios recintos a la vez.
- Historial visual de códigos anteriores.
- Colocación física, reposición y diseño de la señalética.
- Copiar el código al portapapeles.
- Escanear desde el panel.
- Cambios en `mobile`, `web` o `pwa`.
- Modo oscuro y colores fijos de marca.
- Cambios de permisos, roles o de la navegación del perfil.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Personal con `enclosures.manage` | Ver, generar, regenerar e imprimir el QR de un recinto | `enclosures.manage` (la API lo comprueba, `api-020`) |
| Personal sin `enclosures.manage` | No aplica | Ninguno. No ve los botones ni las acciones de QR |
| Visitante del panel | No aplica | — |

Ocultar un botón no reemplaza la autorización del servidor (`apps/dashboard/AGENTS.md`).

## Historias de usuario

- Como responsable de recintos, quiero ver el QR de un recinto y mandarlo a imprimir, para colocarlo en su entrada.
- Como responsable de recintos, quiero generar el QR de un recinto que no tiene uno, con un clic.
- Como responsable de recintos, quiero regenerar el QR con una advertencia clara, para reemplazarlo si se pierde o se daña.
- Como personal del panel, quiero llegar al QR de un recinto desde el buscador del encabezado.

## Criterios de aceptación

### Tarjeta y diálogo

- **CA-01 (botón según estado):** Dada la tarjeta de un recinto con `enclosures.manage`, cuando carga la sección, entonces muestra «Ver QR» si `has_active_qr` es verdadero y «Generar QR» si es falso. Si `has_active_qr` es falso, la tarjeta muestra además la insignia de texto «Sin QR» (no solo color). El nombre accesible incluye el recinto, por ejemplo «Ver QR del recinto Lobos». Sin `enclosures.manage` no se muestra ninguno de los dos.
- **CA-02 (abrir y cargar):** Dado «Ver QR», cuando se pulsa, entonces se abre el diálogo y se llama una sola vez a `api.admin.enclosures.qr(id)`. Mientras carga, se muestra «Cargando QR…» en un elemento con `role="status"`. No se llama a generar ni a regenerar.
- **CA-03 (contenido del diálogo):** Dada una respuesta con código, cuando se muestra, entonces el diálogo tiene el título «QR del recinto «X»», el QR como imagen con texto alternativo «Código QR del recinto X», el código en texto debajo con tipografía monoespaciada, y los botones «Imprimir», «Regenerar QR» y «Cerrar». Esc y «Cerrar» cierran el diálogo y devuelven el foco al botón de la tarjeta.
- **CA-04 (generar sin confirmación):** Dado un recinto sin código activo, cuando se pulsa «Generar QR» (en la tarjeta o en el diálogo), entonces se llama una sola vez a `api.admin.enclosures.generateQr(id)` sin pedir confirmación, porque no desactiva nada. El diálogo muestra el QR generado y la tarjeta pasa a «Ver QR» sin cambiar de página ni de orden.
- **CA-05 (confirmar regenerar):** Dado un recinto con QR, cuando se pulsa «Regenerar QR», entonces se abre `ConfirmDialog` con variante de peligro, el título «¿Regenerar el QR del recinto «X»?» y el texto «Los QR impresos anteriormente dejarán de funcionar, incluidos los escaneos pendientes de sincronizar. El progreso que los visitantes ya obtuvieron se conserva. Tendrás que imprimir y colocar el nuevo.». Hasta confirmar no se llama a la API. Cancelar no cambia nada y devuelve el foco a «Regenerar QR».
- **CA-06 (regenerado):** Dada la confirmación, cuando la API responde, entonces se llama una sola vez a `api.admin.enclosures.regenerateQr(id)`. El diálogo muestra el código nuevo y el aviso «Código QR regenerado. Imprime y coloca el nuevo.» en `role="status"`. El código anterior no vuelve a mostrarse.
- **CA-07 (recinto inactivo):** Dado un recinto inactivo, cuando se abre el diálogo, entonces muestra el aviso «Este recinto está inactivo. Los visitantes no podrán escanear este código hasta que lo actives.» (texto confirmado por Jonathan, 2026-11-18). Los botones funcionan igual.

### Impresión

- **CA-08 (imprimir):** Dado el diálogo con QR, cuando se pulsa «Imprimir», entonces se llama una sola vez a `window.print()`. No se llama a generar ni a regenerar.
- **CA-09 (hoja de impresión):** Dada la hoja de impresión (elemento `#enclosure-qr-print`), cuando se revisa, entonces contiene solo el nombre del recinto como título, el QR y el código en texto debajo. No contiene botones, navegación ni datos de otros recintos.
- **CA-10 (CSS de impresión):** Dada la regla `@media print`, cuando se imprime, entonces oculta toda la interfaz salvo la hoja, y el QR mide al menos 70 mm de lado en papel carta o A4 (propuesta de tamaño). Un test lee `src/styles.css` y comprueba que la regla existe, que oculta el resto de la interfaz y que fija el tamaño mínimo. La impresión real se verifica a mano en el navegador y se registra como evidencia.

### Errores y seguridad de la vista

- **CA-11 (errores de carga):** Dada una respuesta 403, entonces el diálogo muestra «No tienes permiso para realizar esta acción.». Dada una respuesta 404, entonces muestra «Recinto no encontrado.» y cierra el diálogo. Dado un error 500 o sin conexión, entonces muestra «No pudimos cargar el QR. Inténtalo de nuevo.» con un botón «Reintentar» que vuelve a llamar solo a `qr(id)`.
- **CA-12 (errores de generar o regenerar):** Dado un error al generar, entonces la tarjeta no cambia y el diálogo muestra «No pudimos generar el QR. Inténtalo de nuevo.». Dado un error al regenerar, entonces el diálogo conserva el código anterior y muestra «No pudimos regenerar el QR. Inténtalo de nuevo.». Así no se pierde la última versión visible.
- **CA-13 (el código fuera de la lista):** Dada la sección Recintos, cuando se muestra la lista o los resultados del buscador, entonces el código no aparece en ninguna tarjeta ni en ningún resultado. Solo aparece en el diálogo. Un test comprueba el DOM de la lista y del buscador.
- **CA-14 (sin persistencia):** El código no se guarda en `localStorage`, `sessionStorage` ni cookies, no aparece en la URL ni se escribe en logs del cliente. Un test de lectura estática revisa el código de la vista y del hook.
- **CA-15 (accesibilidad):** El diálogo tiene `role="dialog"`, `aria-modal="true"` y nombre de su título. El foco inicial está en «Imprimir». El QR es una imagen con texto alternativo y el código es texto seleccionable. Esc cierra el diálogo, Tab no sale de él y el foco vuelve al disparador.

### Lista y estilos

- **CA-16 (orden y página):** Tras generar o regenerar, la página actual y el orden de la lista no cambian (`dashboard-012` CA-09). El indicador se actualiza con el nuevo valor de `has_active_qr`.
- **CA-17 (estilos):** Los estilos nuevos usan solo tokens semánticos y el tema claro. Un test lee `src/styles.css` y comprueba que los bloques nuevos no contienen valores hexadecimales ni `rgb(` fijos.

### Buscador y acciones

- **CA-18 (acción «QR del recinto»):** Dado el catálogo de acciones de `dashboard-012` (enmienda (c), CA-32), cuando se busca «qr», «código qr», «qr recinto», «imprimir qr» o «regenerar qr», entonces aparece la acción «QR del recinto» de la sección Recintos con el permiso `enclosures.manage`. Elegirla abre el diálogo del recinto (sí abre). El foco va a «Imprimir» si la consulta contiene «imprimir», a «Regenerar QR» si contiene «regenerar», y a «Ver QR» en los demás casos. No genera, no imprime ni regenera sola. Un test comprueba que no se llama a `generateQr` ni a `regenerateQr` y que no se llama a `window.print()`.
- **CA-19 (permisos del catálogo):** Dado un perfil sin `enclosures.manage`, cuando busca «qr del recinto», entonces no aparece ninguna acción de QR de recinto (`dashboard-012` CA-33).
- **CA-20 («qr» en dos acciones):** Dada la consulta «qr», cuando se buscan acciones, entonces aparece «QR del recinto» si el perfil tiene `enclosures.manage` y «Nueva venta» si tiene `tickets.create`, según los permisos del perfil (decisión de Jonathan, 2026-11-18). Un perfil con un solo permiso ve solo su acción. Un test cubre los cuatro casos de permisos.

### Cobertura

- **CA-21 (cobertura):** Dada la suite de Vitest del dashboard, cuando se ejecuta, entonces hay al menos un `describe("CA-xx enclosure-qr-printing")` con pruebas para cada CA-01 a CA-23, en `src/tests/enclosure-qr-printing.test.tsx`, y la spec 013 queda registrada en `administration-coverage.test.tsx`. Las pruebas usan un cliente simulado de `@arca/api-client`.
- **CA-22 (MVVM):** Dado el código de la vista, cuando se revisa, entonces no contiene `fetch(` ni `axios`. La vista llama solo a un hook (`useEnclosureQr`) que usa `@arca/api-client`. Un test lee los archivos y lo comprueba.
- **CA-23 (aviso de eliminar con QR, enmienda a `dashboard-012` CA-03):** Dado un recinto con QR, cuando se pulsa «Eliminar» en su tarjeta, entonces el `ConfirmDialog` de peligro incluye, después del texto de `dashboard-012` CA-03, la frase «Sus códigos QR dejarán de funcionar.». Cancelar no cambia nada. Un test comprueba el texto completo del diálogo.

## Reglas de negocio

- **RN-01 (solo presentación):** El panel muestra lo que devuelve la API (`code`, `svg`, `has_active_qr`). No genera códigos, no decide qué código es el activo y no decide permisos (`dashboard-012` RN-01).
- **RN-02 (confirmación):** Regenerar siempre pide confirmación (`ConfirmDialog`, variante de peligro). Generar no la pide porque no desactiva ningún código.
- **RN-03 (SVG sin innerHTML):** El SVG se muestra como `<img>` con un data URI (`data:image/svg+xml;charset=utf-8,` con el SVG codificado con `encodeURIComponent`). Nunca se usa `dangerouslySetInnerHTML` ni `innerHTML`.
- **RN-04 (impresión):** La impresión usa `window.print()` y la regla `@media print` de `styles.css`. No se añade librería ni se abre una ventana con HTML construido como texto (`document.write` queda prohibido).
- **RN-05 (escape):** El nombre del recinto y el código se pintan como texto de React, con escape automático.
- **RN-06 (sin persistencia):** Igual que `dashboard-012` RN-14: sin almacenamiento del navegador, sin URL y sin logs del cliente (CA-14).
- **RN-07 (acciones de QR en el buscador):** Enmienda propuesta a `dashboard-012` RN-07. Las acciones de QR de Recintos abren el diálogo del recinto y no ejecutan nada (`dashboard-012` RN-13). Imprimir y regenerar requieren que el usuario los pulse dentro del diálogo.
- **RN-08 (tokens y tema):** Tokens semánticos, tema claro, sin colores de marca fijos (`dashboard-012` RN-08; CA-17).
- **RN-09 (textos):** Todos los textos visibles están en español. Identificadores, clases y rutas en inglés.
- **RN-10 (accesibilidad):** Teclado completo, roles y nombres accesibles, foco visible y respeto de `prefers-reduced-motion` (CA-15).
- **RN-11 (catálogo sin frases):** La acción «QR del recinto» es una sola entrada. Sus sinónimos se comparan palabra a palabra con la regla de `dashboard-012` CA-35 y CA-41, sin ninguna regla nueva. La palabra «qr» coincide con esta acción y con «Nueva venta», y el perfil ve solo las que puede usar (CA-20).
- **RN-12 (datos):** No hay datos nuevos en el panel. El código es un dato operativo restringido: solo lo recibe quien tiene `enclosures.manage` y solo se muestra en el diálogo.
- **RN-13 (consistencia con la API):** Los textos de error y de aviso de este spec coinciden con los de `api-020`. Un cambio de texto en la API se refleja aquí en el mismo PR.

## Impacto de regenerar en el panel

Verificado por la sesión principal en el código (2026-11-18). Coincide con la tabla de impacto de `api-020`:

- Un QR impreso con el código anterior deja de funcionar. El aviso de CA-05 lo dice antes de confirmar.
- Los escaneos pendientes de sincronizar del código anterior también se rechazan. El aviso de CA-05 lo dice antes de confirmar.
- El progreso ya obtenido por los visitantes se conserva. El aviso de CA-05 lo dice antes de confirmar.
- La app móvil y el portal no cambian; el panel no muestra nada de eso.

## Datos, privacidad y auditoría

- No hay datos nuevos ni almacenamiento. El panel no guarda el código fuera de la vista.
- Las acciones de generar y regenerar quedan auditadas en la API (`api-020` CA-10).
- No requiere DBR por sí misma. Depende de `api-020`, que no requiere DBR mientras el esquema no cambie.

## Flujos y errores

### Flujo principal: ver e imprimir
1. El personal abre Recintos y pulsa «Ver QR» en un recinto.
2. Se abre el diálogo con el QR, el nombre y el código (CA-02, CA-03).
3. Pulsa «Imprimir». Se abre la vista de impresión del navegador, con solo la hoja (CA-08, CA-10).

### Flujo principal: regenerar
1. En el diálogo pulsa «Regenerar QR».
2. Lee el aviso y confirma. Se llama a `regenerateQr(id)` (CA-05, CA-06).
3. El diálogo muestra el código nuevo. El anterior ya no se muestra.

### Flujo principal: desde el buscador
1. El personal escribe «imprimir qr recinto lobos» en el encabezado.
2. Elige la acción «Imprimir QR del recinto Lobos». Se abre el diálogo del recinto con el foco en «Imprimir» (CA-18).

### Errores esperados
- Sin permiso → «No tienes permiso para realizar esta acción.» (CA-11).
- Recinto eliminado o inexistente → «Recinto no encontrado.» y el diálogo se cierra (CA-11).
- Error al cargar → «No pudimos cargar el QR. Inténtalo de nuevo.» con «Reintentar» (CA-11).
- Error al generar → «No pudimos generar el QR. Inténtalo de nuevo.» (CA-12).
- Error al regenerar → «No pudimos regenerar el QR. Inténtalo de nuevo.» (CA-12).
- Sin conexión → mismo mensaje de error de carga.

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:** `api-020` (Aprobada), `dashboard-012` (enmienda (c) a CA-32, CA-38 y RN-07, y enmienda a CA-03; aprobadas), `dashboard-003` (`ConfirmDialog`), `api-019` (listado, 404). Ninguna dependencia npm nueva. No requiere ADR.
- **Riesgos:**
  - **Regenerar por error:** deja sin efecto los QR impresos. La confirmación y el aviso de CA-05 lo mitigan.
  - **Colisión en el buscador:** «qr» y «imprimir» también son sinónimos de «Nueva venta» (boletos). Se muestran ambas acciones según permisos (CA-20); el orden lo decide el catálogo.
  - **Diferencias de impresión:** los márgenes y el escalado varían entre navegadores. Se verifica a mano con Chrome y Edge (CA-10).
  - **Carga del código:** el SVG viaja en la respuesta JSON. Un QR de este tipo pesa pocos KB; no se pagina.
- **Preguntas:** ninguna pendiente. Resueltas por Jonathan el 2026-11-18: «qr» muestra «QR del recinto» y «Nueva venta» según permisos (CA-18 a CA-20), y se confirma el texto del aviso de recinto inactivo (CA-07).

## Cambios por área

| Área | Archivos previstos | Propósito |
|---|---|---|
| Recintos | `src/views/EnclosuresView.tsx`, `src/viewmodels/enclosures-management.ts`, `src/viewmodels/useEnclosuresManagement.ts` | Botón «Ver QR» o «Generar QR» en la tarjeta (CA-01, CA-16) |
| Diálogo QR | `src/components/EnclosureQrDialog.tsx`, `src/viewmodels/useEnclosureQr.ts` | Diálogo, carga, generar, regenerar, imprimir (la implementación se define en el plan) |
| Catálogo | archivo del catálogo de acciones de `dashboard-012` (el plan lo ubica) | Una entrada «QR del recinto» (CA-18 a CA-20) |
| Paquete | `packages/api-client` (`admin.ts`, `admin-types.ts`) | `enclosures.qr(id)`, `enclosures.generateQr(id)`, `enclosures.regenerateQr(id)` y tipos (sin lógica) |
| Estilos | `src/styles.css` | Hoja de impresión con `@media print`, diálogo de QR (solo tokens) |
| Pruebas | `src/tests/enclosure-qr-printing.test.tsx`, `src/tests/administration-coverage.test.tsx` | `describe("CA-xx enclosure-qr-printing")` y registro en cobertura |

Nombres de métodos: el panel usa `api.admin.enclosures.qr(id)`, `api.admin.enclosures.generateQr(id)` y `api.admin.enclosures.regenerateQr(id)`, en línea con `setStatus` y `remove` de `dashboard-012`.

## Enmiendas

Aprobadas por Jonathan el 2026-11-18 con esta spec. Se aplican en el mismo PR de implementación (tareas de `apps/dashboard/tasks/013-enclosure-qr-printing.md`).

| Spec | Texto actual | Enmienda |
|---|---|---|
| `dashboard-012` CA-32 | «No incluye acciones inexistentes (por ejemplo, «QR»).» | Se añade la entrada «QR del recinto» (CA-18). «qr» aparece en Nueva venta y en «QR del recinto», según permisos (CA-20). Enmienda (c) de `dashboard-012`, sección propia. |
| `dashboard-012` CA-38 | Recintos: desactivar o activar, eliminar | Añade ver, imprimir y regenerar el QR (CA-18). |
| `dashboard-012` RN-07 | Elegir una acción abre el diálogo y no la ejecuta. | Sin cambio de principio. Las acciones de QR también abren el diálogo (RN-07 de esta spec). |

## Revisión

- Aprobadores y fecha: Jonathan, 2026-11-18 (aprobada), junto con `api-020` y la enmienda (c) de `dashboard-012`. Plan y tasks en Borrador: `apps/dashboard/plan/013-enclosure-qr-printing.md`, `apps/dashboard/tasks/013-enclosure-qr-printing.md`. Decisiones de la sesión principal aprobadas: excepción `BaseModel` cubierta por ADR 0021; texto de eliminar con «Sus códigos QR dejarán de funcionar.» (CA-23); divergencia de progreso según `api-019` CA-35.
- Decisiones de producto de Jonathan, 2026-11-18: ver, generar, regenerar e imprimir desde Recintos; hoja limpia con QR grande, nombre y código en texto; regenerar con confirmación y el aviso del CA-05; recinto inactivo visible con aviso; recinto eliminado 404.
- Evidencia/enlaces: `apps/api/specs/020-enclosure-qr-management.md` (CA-01 a CA-26, impacto de regenerar y de eliminar; `docs/database/requests/DBR-021-enclosure-qr-codes-soft-deletes.md`); `apps/dashboard/specs/012-enclosure-actions-global-search.md` (CA-09, CA-32, CA-33, CA-38, RN-07, RN-13, CA-41); `apps/dashboard/specs/003-administration-sections.md` (RN-03); `apps/mobile/specs/006-qr-scan.md` (CA-03); `apps/api/specs/019-enclosure-status-and-global-search.md`.
