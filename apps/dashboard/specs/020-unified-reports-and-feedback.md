# 020 · unified-reports-and-feedback

- App dueña: `dashboard`
- Apps/paquetes afectados: `dashboard` únicamente. Sin cambios en `api`, `packages/api-client`, `packages/ui`, `apps/web`, `apps/pwa` ni `apps/mobile`. Dependencias de API ya aprobadas y no modificadas por esta spec: `api-007` (reporte de boletos), `api-009` (historial de boletos y `tickets.view-all`, RN-17), `api-019` (búsqueda global), `api-022` (cancelaciones y exportación), `api-023` (`tickets.view-all`, CA-08).
- Estado: Implementada
- Solicitada: 2026-11-21
- Aprobada: 2026-11-21
- Aprobación funcional: Aprobada
- Relación: consolida la navegación de administración de `dashboard-003` (reporte de boletos), la entrada «Historial» de `dashboard-005` (solo para el cajero), la página de `dashboard-016` (cancelaciones) y la gestión de avisos de `dashboard-014`, `dashboard-017` y `dashboard-018`. No cambia los CA de esas specs; cada una recibe una nota de revisión que apunta aquí.

## Problema y contexto

El menú de administración tiene tres entradas que tratan de boletos y que se solapan: «Reporte de boletos» (`dashboard-003`, con `reports.view`), «Cancelaciones» (`dashboard-016`, con `reports.cancellations.view`) e «Historial» (`dashboard-005`, con `tickets.view`). Con `api-023`, el historial completo de boletos pasa a depender de `tickets.view-all`, que tienen `admin` y `zoo-admin`. El cajero sigue usando el historial propio junto a «Venta».

Además, las pantallas de reportes no se parecen entre sí. «Reporte de boletos» exporta con tres botones y usa botones para el periodo. «Cancelaciones» exporta con un selector de formato y usa un selector desplegable para el periodo. Y los mensajes de éxito y error no siguen una regla común: algunos aparecen en el aviso emergente de `DashboardNotifications` y otros en línea, con el estilo anterior (por ejemplo, en la gestión de usuarios del administrador).

Esta spec unifica la navegación de boletos en un único apartado «Reportes» con pestañas, comparte los controles de exportación y periodo entre pestañas y define una única regla para los mensajes.

## Objetivos

- Que `admin`, `zoo-admin` y `executive` encuentren todos los reportes de boletos en un solo apartado «Reportes», con cada pestaña visible solo con su permiso.
- Que `admin` vea el historial completo de boletos en solo lectura, sin acción de cancelar.
- Que el cajero conserve «Venta» y «Historial» juntos, sin cambios.
- Que las pestañas de reportes compartan exportación, periodo, totales, tablas y estados de vista.
- Que cada éxito o error general de una acción aparezca una sola vez, como aviso emergente, y que los errores de campo y los de diálogo sigan en su lugar.

## Fuera de alcance

- Cambios de API, de permisos, de roles, de base de datos o de contratos de `packages/api-client`.
- Nuevas pestañas o reportes distintos de los tres indicados.
- Persistir la pestaña o la sección en `localStorage`, cookies, base de datos o URL. La navegación sigue por estado de la SPA (ADR 0002).
- Cambiar el contenido de los reportes: totales, conciliación, alertas y minutos siguen viniendo de la API.
- Rediseño visual general del panel. Solo se unifican los controles de los reportes y los mensajes.
- Cambiar los mensajes de carga y de vacío de las secciones que no pertenecen a reportes, salvo lo indicado en RN-07.
- Cambiar la confirmación de contraseña (`dashboard-015`) o el flujo de 2FA.
- Mensajes de los formularios de dominio de noticias, eventos, recintos, momentos y TulanPedia, salvo los errores generales de acción listados en CA-26 y CA-28.
- Avisos de tipos nuevos o tiempo real.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos (API) | Pestañas o entradas que ve |
|---|---|---|---|
| `admin` (Presidencia e Informática) | Consultar boletos, cancelaciones e historial completo en solo lectura | `reports.view`, `reports.cancellations.view`, `tickets.view-all` | Reportes: Boletos, Cancelaciones, Historial |
| `zoo-admin` (Dirección del zoológico) | Consultar boletos e historial completo | `reports.view`, `tickets.view-all` | Reportes: Boletos, Historial |
| `executive` («Consulta directiva») | Consultar el reporte de boletos en solo lectura | `reports.view` | Reportes: Boletos |
| `cashier` (taquilla) | Vender, consultar su historial y cancelar sus boletos | `tickets.create`, `tickets.view`, `tickets.cancel` | Venta, Historial (taquilla) |
| `communications`, `veterinarian` | Sin acceso a reportes de boletos | — | Ninguna |

La interfaz solo oculta opciones. La autorización real la aplica la API en cada endpoint.

## Historias de usuario

- Como `admin`, quiero un solo apartado «Reportes» con pestañas para boletos, cancelaciones e historial, para encontrar cada consulta sin recorrer tres entradas.
- Como `zoo-admin`, quiero ver el historial completo de boletos dentro de «Reportes», sin entradas que no me correspondan.
- Como `executive`, quiero que «Reportes» me muestre solo el reporte de boletos, en solo lectura, para no ver secciones sin acceso.
- Como `cashier`, quiero seguir encontrando «Venta» e «Historial» juntos para vender y cancelar sin cambios en mi flujo.
- Como persona usuaria de cualquier sección, quiero que los éxitos y los errores de mis acciones aparezcan igual en todo el panel, para no tener que buscar dónde se muestran.

## Criterios de aceptación

### Navegación y pestañas

- **CA-01:** Dada una sesión con `reports.view`, `reports.cancellations.view` o `tickets.view-all`, cuando se presenta la navegación, entonces aparece una única entrada «Reportes» y no aparecen «Reporte de boletos» ni «Cancelaciones» como entradas separadas.
- **CA-02:** Dada la entrada «Reportes», cuando se abre, entonces muestra las pestañas «Boletos» (con `reports.view`), «Cancelaciones» (con `reports.cancellations.view`) e «Historial» (con `tickets.view-all`), y cada pestaña aparece solo si su permiso está presente.
- **CA-03:** Dados los perfiles de la tabla de actores, cuando se presenta «Reportes», entonces `admin` ve las pestañas Boletos, Cancelaciones e Historial; `zoo-admin` ve Boletos e Historial; `executive` ve solo Boletos. Ninguna otra cuenta ve la entrada «Reportes».
- **CA-04:** Dadas las pestañas permitidas, cuando se muestran, entonces siguen el orden Boletos, Cancelaciones, Historial, y la pestaña que se abre por defecto es la primera permitida de ese orden.
- **CA-05:** Dada una pestaña seleccionada, cuando el usuario elige otra pestaña permitida, entonces cambia la vista sin recargar el panel y sin llamar a la API de la pestaña anterior. Mientras la sesión siga en «Reportes», la pestaña elegida se conserva; al salir de la sección y volver, se abre la pestaña por defecto.
- **CA-06:** Dada una pestaña que la cuenta no tiene permitida, cuando se intenta seleccionar por teclado, por estado o por cualquier enlace interno, entonces la selección se ignora y la vista no cambia.
- **CA-07:** Dada una cuenta `executive`, cuando usa «Reportes», entonces no ve la pestaña «Cancelaciones», no ve el historial completo y el panel no llama a `GET` de cancelaciones.
- **CA-08:** Dada la pestaña «Historial» de «Reportes», cuando muestra filas, entonces ninguna fila presenta la acción «Cancelar boleto», aunque la API marque `cancellable` como verdadero, porque la cuenta no tiene `tickets.cancel`.
- **CA-09:** Dada una cuenta `cashier`, cuando abre la navegación, entonces «Venta» e «Historial» aparecen juntos y en ese orden, el historial conserva la acción de cancelar en las filas que la API marca como cancelables, y no aparece la entrada «Reportes».
- **CA-10:** Dada una cuenta que tiene a la vez `tickets.create` y `tickets.view-all` (no existe hoy), cuando abre la navegación, entonces aparece la entrada de taquilla «Historial» y no aparece la pestaña «Historial» dentro de «Reportes» (decisión de RN-05).
- **CA-11:** Dada la navegación de cualquier perfil, cuando se revisa, entonces no existe ninguna entrada, título ni identificador de sección «Reporte de boletos» o «Cancelaciones» fuera de «Reportes».
- **CA-12:** Dadas la búsqueda global y las acciones rápidas de la shell, cuando un resultado o una acción de boleto, de exportación o de cancelación se abre, entonces lleva a una pestaña permitida dentro de «Reportes» o a la entrada «Historial» de taquilla, y nunca a una sección que no está en la navegación de la cuenta.

### Componentes compartidos de reportes

- **CA-13:** Dadas las pestañas Boletos y Cancelaciones con datos, cuando se muestra la exportación, entonces usan el mismo componente y muestran tres botones en este orden y con estas etiquetas: «Exportar CSV», «Exportar Excel» y «Exportar PDF».
- **CA-14:** Dada una exportación en curso, cuando se muestra, entonces el grupo de botones está deshabilitado, el botón del formato activo muestra «Descargando…» y el archivo se descarga con el nombre que devuelve la API. Un 422 de formato o de tope de filas se muestra junto al grupo de exportación; un fallo de red o un 5xx se muestra como aviso emergente (RN-07).
- **CA-15:** Dadas las pestañas Boletos y Cancelaciones, cuando se elige el periodo, entonces usan el mismo selector con los botones «Semanal», «Mensual» y «Rango personalizado» (con `aria-pressed`), los botones «Periodo anterior» y «Periodo siguiente», y, para el rango, los campos «Fecha desde» y «Fecha hasta» con «Aplicar rango». El valor por defecto es «Semanal». Un 422 de periodo se muestra junto al selector.
- **CA-16:** Dada una respuesta con totales y filas, cuando se muestra en Boletos o en Cancelaciones, entonces los totales usan el mismo componente y las tablas usan el mismo estilo (`DataTable` con `caption`). Los totales y los desgloses vienen de la API y la pestaña no suma filas.
- **CA-17:** Dada una pestaña de reportes en carga, vacía o con error, cuando se muestra, entonces los tres estados usan el mismo componente y el error ofrece reintentar, en ambas pestañas.
- **CA-18:** Dados los componentes compartidos de exportación, periodo, totales y estados, cuando se revisa su estilo, entonces usan solo tokens semánticos de `@arca/ui` y no fijan colores de marca. Ningún componente calcula totales, periodos ni permisos.

### Regla de mensajes

- **CA-19:** Dada cualquier acción de una sección (crear, editar, activar, desactivar, eliminar, cambiar estado, decidir, guardar, exportar, cancelar, cambiar precio, marcar un aviso como leído o restablecer una contraseña), cuando termina con éxito o con un error general, entonces aparece un único aviso emergente de `DashboardNotifications` fuera de diálogos (RN-07).
- **CA-20:** Dado un error general de acción fuera de un diálogo, cuando se muestra, entonces el texto aparece una sola vez en la pantalla. `ActionError` no repite el mensaje en línea cuando existe el proveedor de avisos, excepto dentro de un diálogo o de una confirmación en línea.
- **CA-21:** Dado un error de validación por campo (422 con campo), cuando se muestra, entonces aparece junto a su campo con `FormField` o `FieldErrors`, y no pasa a aviso emergente.
- **CA-22:** Dado un diálogo o una confirmación en línea (`ConfirmDialog`, `InlineConfirm`, `DialogFormFooter`, `CancelTicketDialog`, diálogos de 2FA y de contraseña), cuando hay un error de la acción, entonces el error se muestra dentro del diálogo o de la confirmación, no como aviso emergente.
- **CA-23:** Dado un error de carga de una vista o un 403 de la página, cuando se muestra, entonces aparece como estado de la vista (`ListStatusMessage` o el estado equivalente de la vista) con su reintento si lo tiene, y no como aviso emergente.
- **CA-24:** Dado el inventario de mensajes de `plan/020-unified-reports-and-feedback.md`, cuando se revisa tras implementar, entonces cada entrada está en la categoría que indica la tabla de esa plan, con su archivo y texto.

### Migración por sección

- **CA-25 (Usuarios):** Dada la sección Usuarios, cuando falla una alta, una edición, una acción sobre una cuenta o el restablecimiento de contraseña con un error general, entonces el error aparece como aviso emergente. Un fallo al cargar los roles disponibles (`optionsError`) aparece como estado de la vista con reintento. Los errores de campo y los 403 del formulario siguen junto al formulario (`dashboard-017` CA-06).
- **CA-26 (Eventos, Noticias, Precios y Venta):** Dadas estas secciones, cuando una acción devuelve un error general, entonces el error es un aviso emergente. Esto incluye el aviso de «pendiente no encontrado» de Eventos y el error general de guardar un cambio de precio. El mensaje de configurar 2FA de `dashboard-005` CA-16 se mantiene en la sección como estado, porque indica el paso a seguir.
- **CA-27 (Cancelaciones):** Dada la pestaña Cancelaciones, cuando una exportación falla por red o 5xx, entonces aparece un aviso emergente; cuando la página recibe 403 para la cuenta, entonces aparece como estado de la pestaña (`dashboard-016` CA-02); los 422 de periodo y de formato siguen junto a su control.
- **CA-28 (Avisos de consola y ficha de especie):** Dado el aviso de cambios por consola (`dashboard-017` CA-11), cuando falla marcarlo como leído, entonces el error aparece como aviso emergente. Dado el formulario de ficha de especie de TulanPedia, cuando hay un error general de guardado, entonces aparece como aviso emergente; los errores de cada campo siguen junto a su campo.

### Transversales

- **CA-29:** Dado el cambio, cuando se revisa, entonces no se añade ni se modifica ningún endpoint, parámetro ni payload de `packages/api-client`, y ninguna llamada nueva sale del dashboard.
- **CA-30:** Dado el código nuevo, cuando se revisa, entonces las decisiones de pestañas, permisos y política de mensajes viven en viewmodels puros; los componentes solo presentan, no llaman `fetch` ni `axios` y no deciden por nombre de rol.
- **CA-31:** Dadas las pestañas, cuando se usan con teclado y en anchos de 360 a 1366 px, entonces tienen rol de pestaña (`tablist`, `tab`, `tabpanel`), `aria-selected`, foco visible, navegación con flechas, Inicio y Fin, y la página no tiene desbordamiento horizontal.
- **CA-32:** Dada la suite de Vitest del dashboard con entorno `node`, cuando se ejecuta, entonces existe al menos una prueba que nombra cada CA-01 a CA-31 y una prueba de cobertura que comprueba que ninguno falta (Constitución IV).

### Revisión (b) (aprobada)

Dos cambios pedidos por el responsable funcional. Los CA siguen al último (CA-32) y no renumeran nada. Sustituyen en lo que choquen a CA-22 y CA-25 (el nombre «confirmación en línea» pasa a ser «diálogo de confirmación»; el error general de restablecer contraseña va dentro del diálogo, D-3) y a `dashboard-004` CA-08 a CA-12 y RN-02 (confirmaciones en línea).

**Confirmaciones en ventana modal (patrón de Noticias: `ConfirmDialog`).**

- **CA-33 (Usuarios):** Dada la sección Usuarios, cuando se activa, desactiva, elimina o se restablece la contraseña o el 2FA de una cuenta, entonces la confirmación es un diálogo modal (`ConfirmDialog`) con el mismo título, mensaje, botón peligroso y estado «Procesando…» que tenía la confirmación en línea; la fila de la tabla no muestra detalle en línea.
- **CA-34 (Noticias y Eventos):** Dadas las tarjetas de Noticias y de Eventos, cuando se activa, desactiva o elimina un elemento, entonces la confirmación es un diálogo modal con el mismo texto; `ContentCardActions` solo trae los botones.
- **CA-35 (errores y éxito):** Dado un diálogo de confirmación, cuando la acción falla, entonces el error general aparece dentro del diálogo (D-3) y el de campo junto a su campo (en «Restablecer contraseña», el campo de contraseña nueva está dentro del diálogo, con «Mostrar contraseña» y sus errores por campo); cuando tiene éxito, el diálogo se cierra y el mensaje sale como aviso emergente.
- **CA-36 (contraseña del administrador):** Dada una acción que pide la contraseña del administrador (`dashboard-015`), cuando se confirma, entonces el diálogo de contraseña se abre encima del diálogo de la acción sin cerrarlo; al cancelar la contraseña la acción sigue abierta y sin error, y al confirmarla la acción se completa y ambos se cierran.
- **CA-37 (foco y componentes):** Dado el cierre de un diálogo de confirmación, cuando se cancela o se confirma, entonces el foco vuelve al botón que lo abrió (`useInlineFocus`; tras eliminar, al aviso). `InlineConfirm` e `InlinePasswordReset` se eliminan junto con sus pruebas; ninguna sección los usa.

**Área y rol de una cuenta.**

- **CA-38:** Dado el formulario de alta o edición de una cuenta, cuando se elige el área, entonces el rol se llena con el `suggested_role` que devuelve `GET admin/users/options` para esa área; al editar una cuenta existente el rol nunca cambia solo (ni al abrir ni al cambiar el área): solo se muestra el aviso de CA-41, porque cambiar el rol pide contraseña (`api-021`).
- **CA-39:** Dado que el administrador cambió el rol a mano, cuando cambia el área después, entonces el rol elegido no se pisa; la elección manual se descarta al guardar, cancelar o abrir otra edición.
- **CA-40:** Dado el formulario, cuando se muestra, entonces junto a los campos Área y Rol aparece el texto fijo «El área es dónde trabaja la persona; el rol define qué puede hacer en el sistema.»
- **CA-41:** Dado un rol elegido distinto del sugerido para el área, cuando se muestra el formulario, entonces aparece un aviso informativo que no bloquea («El rol sugerido para Taquilla es Cajero. Puedes asignar otro si la persona lo necesita.»); sin rol sugerido para el área, sin rol elegido o con el rol sugerido, no hay aviso.
- **CA-42:** Dada la regla de CA-38 a CA-41, cuando se revisa el código, entonces vive en un viewmodel puro (`viewmodels/staff-role-suggestion.ts` y el reductor de `staff-accounts.ts`) y la vista no calcula nada. Sin cambios en `apps/api` ni en `packages/api-client`.

### Revisión (c) (aprobada): paginación unificada

Todo el dashboard usa un solo paginador, con el diseño de Recintos. Los CA siguen al último (CA-42) y no renumeran nada.

- **CA-43:** Dado el dashboard, cuando se revisa el código, entonces existe un único componente `components/Pagination.tsx` con su lógica pura en `viewmodels/pagination.ts`, y ninguna vista conserva un paginador propio (`PaginationBar` y `HasMorePaginationBar` se eliminan).
- **CA-44 (con total):** Dada una lista cuya API entrega `current_page`/`last_page`/`total` (Usuarios, Historial, Boletos) o que se pagina en cliente (Recintos, Noticias, Eventos), cuando se muestra, entonces el paginador dice «Página N de M · T en total» y trae «Anterior», los números de página (con «…» si hay más de 7) y «Siguiente»; el número actual lleva `aria-current="page"`.
- **CA-45 (solo `has_more`):** Dada una lista con `meta.has_more` (TulanPedia Solicitudes y Publicadas, Momentos), cuando se muestra, entonces el paginador dice «Página N» y trae solo «Anterior» y «Siguiente»; «Siguiente» se deshabilita sin `has_more`.
- **CA-46 (accesibilidad):** Dado el paginador, cuando se usa con teclado, entonces es un `nav` con `aria-label="Paginación"`, «Anterior» se deshabilita en la primera página, «Siguiente» en la última, todo se deshabilita mientras carga, y el foco visible usa `--ring`. Solo usa tokens de `@arca/ui`.
- **CA-47 (comportamiento conservado):** Dada cada pantalla que ya paginaba, cuando se migra, entonces conserva su tamaño de página y el reinicio a la página 1 al filtrar (la decisión sigue en su viewmodel).
- **CA-48 (listas sin paginar):** Dada una lista sin paginación cuya API no entrega páginas (Cancelaciones, `reports/cancellations`), cuando se revisa, entonces no se cambia la API ni se pagina en cliente; queda como pendiente de API. El CSS de paginaciones viejas sin uso se elimina.

### Revisión (d) (aprobada): componentes compartidos en `@arca/ui` y paginación con total

Lo que usa más de una app pasa a `packages/ui` y las listas con `meta` con total (api-012 rev., api-014 rev., api-022 rev.) usan números de página. Los CA siguen al último (CA-48) y no renumeran nada. CA-43 cambia de lugar (el componente único vive en `@arca/ui`); CA-45 queda como respaldo; CA-48 queda superado en lo de Cancelaciones (CA-53).

- **CA-49 (componentes compartidos):** Dado `@arca/ui`, cuando se revisa, entonces exporta `Pagination` (con su lógica pura `buildPagination` y `pageItems`), el contador de bloqueo (`formatCountdown`, `startCountdown`, `useCountdown`, `LockoutNotice`) y `ConfirmDialog`; son genéricos, accesibles, sin dependencias nuevas, solo con tokens, sin lógica de negocio, y están documentados en el README del paquete. No cambia nada visible.
- **CA-50 (`ConfirmDialog`):** Dado el diálogo de confirmación, cuando se usa, entonces la parte genérica vive en `@arca/ui` (recibe el error ya resuelto) y el dashboard conserva un envoltorio delgado (`components/ConfirmDialog.tsx`) que aporta `ActionError` y el ancho propio.
- **CA-51 (TulanPedia):** Dadas «Solicitudes» y «Publicadas», cuando se muestran, entonces paginan «con total» («Página N de M · T en total», números y «…» con más de 7 páginas) usando `meta.current_page`, `last_page` y `total`.
- **CA-52 (Momentos):** Dado Momentos, cuando se muestra, entonces pagina con total y deja de leer `meta.page` y `meta.limit` (ya no existen; el tamaño de página es `per_page`).
- **CA-53 (Cancelaciones):** Dado el reporte de Cancelaciones, cuando tiene más de 50 filas, entonces las pagina de 50 en 50 con `meta` hermano de `data`; al cambiar filtros o periodo vuelve a la página 1; los totales y la conciliación no cambian entre páginas; la exportación no se pagina. Sustituye a CA-48 en lo de Cancelaciones.
- **CA-54 (`@arca/api-client`):** Dado el cliente, cuando se revisa, entonces el cambio es solo aditivo: `ListPageMeta` y `TotalPage` (con `has_more` opcional), `limit` en la consulta de Momentos y `page` en `CancellationReportQuery` con `meta` en `CancellationReportDto`.
- **CA-55 (sin copias):** Dadas las apps, cuando se revisa el código, entonces ni `apps/dashboard` ni `apps/pwa` conservan copias locales del contador, del aviso de bloqueo ni de la paginación; importan de `@arca/ui`.

## Revisión (e): esqueletos de carga

Aprobada. Cada pantalla que carga datos muestra, al cargar, un esqueleto con su forma real en lugar del texto «Cargando…». Los CA siguen al último (CA-55) y no renumeran nada. No cambia la API ni la lógica de carga de ningún ViewModel.

- **CA-56 (componentes compartidos):** Dado `@arca/ui`, cuando se revisa, entonces exporta `Skeleton` (variantes `text`, `title`, `avatar`, `image` y `button`), `SkeletonRegion`, `SkeletonTable` (encabezado, columnas y filas configurables), `SkeletonCards` (rejilla con imagen opcional), `SkeletonForm` (campos y botones), `useDelayedFlag` y `startDelayedFlag`; sin dependencias nuevas y documentados en el README del paquete.
- **CA-57 (accesibilidad):** Dado un esqueleto, cuando se renderiza, entonces su contenedor lleva `aria-busy="true"` y un texto oculto «Cargando…» (o el de la pantalla) con `role="status"`, y los bloques llevan `aria-hidden="true"`.
- **CA-58 (movimiento):** Dado el brillo (shimmer), cuando se revisa el CSS, entonces solo anima bajo `prefers-reduced-motion: no-preference`; con «reducir movimiento» queda un bloque estático; usa solo tokens y medidas en `rem`.
- **CA-59 (sin parpadeo):** Dada una carga que tarda menos de 150 ms, cuando termina, entonces no se muestra el esqueleto; antes de 150 ms solo existe el aviso accesible y después aparecen los bloques (`useDelayedFlag`, `startDelayedFlag`).
- **CA-60 (inventario):** Dadas Usuarios, Reportes (Boletos y Cancelaciones), Historial de taquilla, TulanPedia (Solicitudes y Publicadas), Momentos, Noticias, Eventos, Recintos, Panel principal, detalles de especie, solicitud y recuerdo, Precios y Venta, cuando cargan, entonces cada una muestra un esqueleto compartido y no el indicador de texto.
- **CA-61 (tablas):** Dadas las pantallas con tabla, cuando cargan, entonces el esqueleto repite el encabezado, el número de columnas y la envoltura de la tabla real (en Reportes, también las de totales por cajero y motivo, conciliación y semáforo).
- **CA-62 (tarjetas):** Dadas Noticias, Eventos, Recintos y TulanPedia Publicadas, cuando cargan, entonces el esqueleto usa la misma rejilla y, en Publicadas, la imagen 4:3.
- **CA-63 (panel, detalles, formularios y precios):** Dados el Panel principal, los detalles, los formularios de la ficha y Precios y Venta, cuando cargan, entonces el esqueleto muestra métricas y gráfica, foto y datos, campos y botones, y las tarjetas de precio vigente.
- **CA-64 (sin cambiar la lógica):** Dada una recarga en segundo plano o con filas ya visibles (por ejemplo Usuarios), cuando ocurre, entonces se mantienen los datos y no hay esqueleto; el esqueleto solo sustituye lo que antes era el estado «cargando» de la vista.
- **CA-65 (unidades y dependencias):** Dado el CSS de los esqueletos, cuando se revisa, entonces usa `rem` y no `px`, y los componentes solo importan React.

Nota: el esqueleto de Reportes sustituye al genérico anterior (`report-loading*`) y al contador de segundos del indicador.

## Reglas de negocio

- **RN-01 (la API decide):** Los permisos los entrega `me`; la API autoriza cada endpoint. La interfaz solo elige qué pestañas y acciones presenta.
- **RN-02 (presentación de datos):** Los totales, las filas, los periodos válidos, las exportaciones y los catálogos vienen de la API. Esta spec no añade cálculos en el cliente.
- **RN-03 (orden y default):** El orden de pestañas es Boletos, Cancelaciones, Historial. La pestaña por defecto es la primera permitida (CA-04).
- **RN-04 (historial de reportes sin cancelar):** La pestaña «Historial» de «Reportes» no ofrece cancelar. La presentación se decide por `tickets.cancel`, no por `cancellable` (CA-08).
- **RN-05 (cuenta mixta):** Si una cuenta tiene `tickets.create` y `tickets.view-all`, la navegación muestra el historial de taquilla (`tickets.view` junto a `tickets.create`) y no la pestaña del historial de «Reportes». El alcance de los boletos lo decide la API (CA-10).
- **RN-06 (cajero sin cambio):** El cajero conserva «Venta» e «Historial» junto a ella, con cancelación según `cancellable` (CA-09). Esta spec no cambia `dashboard-005` salvo la nota de revisión.
- **RN-07 (regla de mensajes):** Los mensajes del panel siguen cuatro categorías y no hay otras:
  1. *Aviso emergente:* éxito o error general de una acción fuera de un diálogo. Se muestra una vez mediante `DashboardNotifications`, en el orden de llegada (`dashboard-018` RN-14).
  2. *Junto al campo:* error de validación de un campo (422 con campo). Usa `FormField` o `FieldErrors`.
  3. *Dentro del diálogo:* confirmaciones y errores de una acción dentro de un diálogo, de una confirmación en línea o de un formulario en diálogo. No pasan a aviso emergente.
  4. *Estado de la vista:* carga, vacío, error de carga y 403 de la página. Usa `ListStatusMessage` o el estado equivalente, con reintento cuando lo ofrece.
  Los avisos de tono informativo de `dashboard-018` (pendientes) y el aviso de cambios por consola de `dashboard-017` (CA-10) siguen su propia spec.
- **RN-08 (estado en memoria):** La pestaña activa vive en la memoria de la shell. No se guarda en URL, `localStorage`, cookies ni base de datos (`dashboard-005` RN-12 no aplica a esto).
- **RN-09 (sin cambios de API):** Esta spec no requiere endpoints nuevos ni cambios de contrato. Si una implementación los necesita, se detiene y se marca como bloqueante antes de codificar.
- **RN-10 (Consulta directiva):** `executive` no ve Cancelaciones ni el historial completo, en ninguna pestaña ni en la búsqueda global.
- **RN-11 (idioma):** Etiquetas y mensajes en español; identificadores del código en inglés (Constitución VI).
- **RN-12 (sin React Router):** Las pestañas se cambian por estado de la SPA (ADR 0002).

## Datos, privacidad y auditoría

- No se añaden datos nuevos. Los reportes muestran folios, importes, cajeros y motivos, como hoy, solo a quien la API autoriza.
- No hay almacenamiento local nuevo: el estado de pestaña vive en memoria (RN-08).
- La exportación la audita la API (`api-022` CA-21). La interfaz no escribe auditoría.
- No requiere DBR ni consulta de esquema: no toca datos.

## Flujos y errores

1. **Entrar a Reportes:** la navegación muestra «Reportes» si la cuenta tiene al menos uno de los tres permisos → se abre la primera pestaña permitida (CA-01 a CA-04).
2. **Cambiar de pestaña:** se selecciona una pestaña permitida → la vista cambia y llama solo a su API (CA-05, CA-06).
3. **Exportar:** el usuario elige un formato → la API devuelve el archivo o un error → descarga, o error según RN-07 (CA-13, CA-14).
4. **Cambiar periodo:** el usuario elige un periodo o un rango → la pestaña vuelve a consultar la API → muestra totales y tablas (CA-15, CA-16).
5. **Acción de una sección:** la acción termina → éxito o error general como aviso emergente; errores de campo junto al campo; diálogos dentro del diálogo (RN-07).
6. **Errores de red o 5xx de consulta:** estado de la vista con reintento (CA-17). Error de exportación por red o 5xx: aviso emergente (CA-14).
7. **Sesión caducada:** 401 vuelve al login con «Tu sesión expiró» (`dashboard-002` CA-08).

## Inventario de mensajes (referencia)

El inventario completo, con archivos, textos y categoría prevista, está en `apps/dashboard/plan/020-unified-reports-and-feedback.md`, sección «Inventario de mensajes». Esta spec fija la regla (RN-07) y los CA de migración (CA-19 a CA-28).

## Dependencias, riesgos y preguntas

- **Dependencias:** `api-007`, `api-009` (historial y `tickets.view-all`, RN-17), `api-019` (búsqueda global), `api-022` (cancelaciones y exportación), `api-023` (`tickets.view-all`, CA-08). `dashboard-003` (reporte de boletos), `dashboard-005` (historial de taquilla), `dashboard-011` (menú), `dashboard-014` (avisos), `dashboard-016` (cancelaciones), `dashboard-017` (usuarios y avisos de consola), `dashboard-018` (avisos y cola FIFO). ADR 0002.
- **Verificación previa (no bloqueante):** que `GET me` devuelve `tickets.view-all` en `profile.permissions` para `admin` y `zoo-admin`. Si no lo devuelve, la pestaña Historial de «Reportes» no puede aparecer: es bloqueante para CA-02 y se resuelve en la API (`api-023`), no en esta spec. Se comprueba en la tarea T-01 del plan.
- **Riesgos:**
  - Duplicado visible de errores (CA-20): hoy `ActionError` muestra el texto en línea además del aviso. El cambio altera la pantalla de varias secciones.
  - Enlaces de búsqueda global a «Historial» que ya no está en el menú de admin (CA-12).
  - Cambio de etiquetas de periodo de «Semana»/«Mes» (`dashboard-016` CA-04) a «Semanal»/«Mensual» (CA-15), y del selector de formato a botones (`dashboard-016` CA-17). Se anota en la nota de revisión de `dashboard-016`.
- **Decisiones de redacción pendientes de confirmación explícita del responsable funcional** (propuestas del redactor; el plan las lista como D-1 a D-5; si el responsable funcional las cambia, se revisa esta spec antes de implementar lo que dependa de ellas):
  1. RN-05 y CA-10: cuenta mixta de `tickets.create` y `tickets.view-all` (no existe hoy).
  2. CA-23 y RN-07 (4): los errores de carga quedan como estado de la vista, no como aviso emergente.
  3. CA-22 y RN-07 (3): los errores dentro de un diálogo se quedan en el diálogo.
  4. CA-26: el mensaje de 2FA de `dashboard-005` CA-16 se mantiene como estado de la sección.
  5. CA-15: etiquetas «Semanal», «Mensual» y «Rango personalizado».

## Revisión

- Confirmación de decisiones: la sesión principal confirmó las decisiones 1 a 5 de redacción y D-7 (exportación con tres botones iguales en todas las pestañas); quedan sujetas a veto del responsable funcional.
- Aprobadores: responsable funcional, para las decisiones 1 a 5 del encargo. Las decisiones de redacción de la sección anterior quedan pendientes de su confirmación.
- Evidencia/enlaces: `apps/dashboard/src/viewmodels/navigation.ts`, `apps/dashboard/src/viewmodels/dashboard-shell.ts`, `apps/dashboard/src/App.tsx`, `apps/dashboard/src/views/TicketReportView.tsx`, `apps/dashboard/src/views/CancellationReportView.tsx`, `apps/dashboard/src/views/TicketHistoryView.tsx`, `apps/dashboard/src/views/UsersView.tsx`, `apps/dashboard/src/components/DashboardNotifications.tsx`, `apps/dashboard/src/viewmodels/dashboard-notifications.ts`, `apps/api/specs/023-fixed-roles-and-console-admins.md`, `apps/api/specs/009-ticket-sales.md`, `apps/api/specs/022-ticket-cancellation-report.md`.
- Notas de revisión que apuntan a esta spec: `dashboard-003`, `dashboard-004`, `dashboard-005`, `dashboard-014`, `dashboard-016` y `dashboard-017`.
- Revisión (b): aprobada; CA-33 a CA-42 (confirmaciones en ventana modal en Usuarios, Noticias y Eventos; área sugiere rol).
- Nota (TulanPedia): `dashboard-010` adopta este patrón (encabezado fijo con pestañas debajo, clases `section-tab*`, teclado de CA-31 y gap compartido). Ver `dashboard-010` CA-66 a CA-73. Las pestañas de «Reportes» pasan a las clases neutrales `section-tabs`, `section-tab` y `section-tab-panel` sin cambio de comportamiento.
- Revisión (c): aprobada; CA-43 a CA-48 (paginación unificada). Ver `plan/020` y `tasks/020` (T-24 a T-26).
- Revisión (d): aprobada; CA-49 a CA-55 (componentes compartidos en `@arca/ui`; paginación con total en TulanPedia, Momentos y Cancelaciones). Ver `plan/020` y `tasks/020` (T-27 a T-31).
- Revisión (e): aprobada; CA-56 a CA-65 (esqueletos de carga en todas las pantallas). Ver `plan/020` y `tasks/020` (T-32 a T-35).
