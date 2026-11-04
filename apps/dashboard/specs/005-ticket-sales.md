# 005 · ticket-sales

- App dueña: `dashboard`
- Apps/paquetes afectados: `dashboard`, `packages/api-client` (cliente de venta, historial y precios; avisos diferidos); `packages/ui` (solo si falta un componente compartido); `api` (dependencia: `api-009`, que incluye el impacto en `api-007`; el cambio de API no es de esta app)
- Estado: Aprobada
- Aprobación funcional: Jonathan, 2026-11-02 (aprueba el contenido y acepta los supuestos vigentes, convertidos en decisiones cerradas; ver «Decisiones cerradas»)
- Solicitante / responsable funcional: Jonathan
- Reemplaza: `apps/dashboard/specs/001-admin-dashboard-prototype.md` CA-04 (Venta de boletos), CA-11 (Historial de boletos) y CA-15 (banner) para las vistas de Venta e Historial. Las actualizaciones de 001, 002 (RN-02) y 003 (CA-02 sobre el banner y actores de Venta e Historial): la nota de vigencia de 003 se aplicó el 2026-11-02; las de 001 y 002 se aplicaron el 2026-11-02 por petición expresa de Jonathan.
- Última edición: 2026-11-02 (aprobación; supuestos vigentes cerrados; pie predeterminado del boleto corregido a «Zoológico Nicolás Bravo, Tulancingo»; revisión de márgenes de impresión, ver «Revisión»; centro de notificaciones, modal de acuse, polling y texto de correo siguen diferidos; revisión de 2026-11-02 de la cancelación sin `timezone` y de los errores 429 y del tope de cantidad, según `api-009`, aprobada por Jonathan)

## Revisión (2026-11-02)

- Decisión de Jonathan sobre márgenes de impresión (`apps/dashboard/plan/005-ticket-sales.md`, «Decisiones de aprobación»): valores por defecto térmica 2 mm y carta 15 mm. Como el rango de 0 a 10 mm no admitía 15 mm en carta, el rango de carta pasa a 0 a 20 mm. El rango de térmica no cambia (0 a 10 mm).
- Cambian solo CA-27 (letra d) y la pregunta 7 de «Decisiones cerradas». No cambian CA, RN ni el alcance de los demás criterios.

## Revisión de `api-009` (2026-11-02, aprobada por Jonathan)

- La revisión de `api-009` fija la zona del día de cancelación en la del zoológico y retira `timezone` del cuerpo de cancelar (`api-009` RN-16, CA-31). Por eso el cliente deja de enviar `timezone` al cancelar. El `timezone` del historial sigue para presentación y filtros (CA-13).
- `api-009` añade un tope de 100 boletos por tipo (CA-42) y límites de frecuencia que responden 429 (CA-43, CA-44). La vista muestra esos mensajes de la API; no fija el tope ni el límite en su código (RN-02).
- Cambian solo CA-08, CA-12, RN-02, RN-13 y el flujo 6 de «Flujos y errores». No se añade ni se retira ningún CA: siguen 25 vigentes y los mismos diferidos.
- Las tareas afectadas están en `apps/dashboard/tasks/005-ticket-sales.md` (T-43 a T-50) y el plan en `apps/dashboard/plan/005-ticket-sales.md`.

Convención: tras la aprobación del 2026-11-02, los puntos que eran «Supuesto por defecto» de los CA y RN vigentes son **decisiones cerradas** y se citan como «decisión 2026-11-02, pregunta N». Los elementos diferidos conservan su numeración y su texto, y siguen sin cerrar.

## Alcance de esta iteración (decisión de 2026-11-02)

El centro de notificaciones, el modal de acuse, el polling de avisos y el texto «Se notificará también por correo.» quedan **diferidos**: se conserva toda su documentación, pero no se implementan en esta iteración. Se mantienen la numeración y el texto de los CA y RN.

- **Vigente (se implementa y se prueba): 25 CA.** CA-01 a CA-17, CA-21 a CA-25 y CA-27 a CA-29. Incluye la navegación de Venta, Historial y Precios; la venta con boleto imprimible; el historial con cancelación; los precios (inmediato o programado) sin efectos de notificación; la impresión configurable y los criterios transversales. En CA-01, la entrada «Notificaciones» y su contador quedan diferidos; el resto del criterio sigue vigente.
- **Diferido (decisión 2026-11-02): 5 CA.** CA-18, CA-19, CA-20, CA-26 y CA-30.
- **RN diferidas:** RN-04, RN-11 y RN-14 (partes de avisos y correo).
- **Consultas diferidas:** `GET /api/v1/admin/notifications` y las acciones de leído y acuse de `api-009`. Esta app no las llama en esta iteración.
- **Efecto en lo vigente:** el cambio de precio (CA-17) confirma el resultado dentro de la propia sección, sin aviso de notificación ni texto de correo. El cajero conoce el precio vigente porque la vista de Venta lo carga de la API (CA-04).
- **Regla de trazabilidad:** los CA diferidos no requieren test ni tarea hasta que una futura revisión de esta spec los reactive.

## Decisiones cerradas (aprobación de 2026-11-02)

- **Pregunta 1 (total antes de confirmar):** no se muestra. Se muestran las cantidades en el diálogo y el total tras registrar, como se decidió (CA-04, CA-05). Mostrarlo antes exige un endpoint de cotización que no existe en `api-009`.
- **Pregunta 2 (próximo cambio programado):** la sección Precios muestra el vigente y el próximo programado que devuelve `api-009` CA-17, sin listado completo ni edición de programados.
- **Pregunta 3 (formato de fecha del historial):** `dd/mm/aaaa HH:mm` en la zona del dispositivo (CA-13).
- **Pregunta 5 (textos del boleto):** el pie predeterminado es **«Zoológico Nicolás Bravo, Tulancingo»**, editable hasta 80 caracteres (CA-27). No lleva leyenda de validez; el texto de contacto no se incluye.
- **Pregunta 7 (dimensiones de impresión):** anchos 58 mm y 80 mm para térmica; fuente pequeña, normal o grande; márgenes de 0 a 10 mm en térmica y de 0 a 20 mm en carta (revisión de 2026-11-02, ver «Revisión»); pie de hasta 80 caracteres (CA-27).
- **Pregunta 4 (numeración):** cerrada el 2026-11-01 (ver «Preguntas resueltas»).

Las preguntas 6 y 8 corresponden al modal de avisos y al texto del correo (diferidos) y **no están cerradas**.

## Decisiones incorporadas (2026-11-01)

- **Quién vende (segunda ronda):** solo `cashier` ve la sección Venta y vende. `admin` y `zoo-admin` no ven Venta; sí ven el Historial en lectura (`tickets.view`, sin acción de cancelar, `api-009` CA-15). Esto cierra la antigua pregunta 4.
- **Cancelación:** solo se muestra la acción en boletos que la API marca como cancelables para el cajero (`api-009` CA-14 y RN-16). La regla de mismo día y de dueño la aplica la API.
- **Avisos de precio (diferido, decisión 2026-11-02):** el cajero recibe un modal con acuse; no bloquea la venta y reaparece hasta que acuse. El dashboard consulta avisos al entrar y cada 60 s (CA-19, CA-20, CA-26).
- **Impresión:** el cajero elige formato térmica 80 mm (por defecto) u hoja carta, y ajusta ancho, fuente, márgenes, campos y pie (CA-27 y CA-29). La configuración es por equipo, en `localStorage`, con respaldo de valores por defecto; no va a la API ni a la base de datos (CA-28, RN-12).
- **Correo de avisos de precio (2026-11-02; diferido):** además del aviso en el dashboard, la API envía el aviso por correo (`api-009` RN-10 y RN-20 a RN-28). El dashboard solo lo indica con un texto en la sección Precios (CA-30); no envía, configura ni muestra el estado del correo.

## Problema y contexto

Venta e Historial de la taquilla son demostrativos (`dashboard-001`): no registran ventas, no cancelan boletos y no leen datos reales. Sin esta feature la taquilla no puede operar y el Panel y el Reporte de administración (`dashboard-003`) siguen en cero.

`api-009` entrega la venta en efectivo, el QR en SVG, la cancelación con motivo, el historial del cajero, los precios con vigencia y los avisos. Esta spec define cómo los presenta el dashboard: venta con boleto imprimible y configurable, historial real con cancelación, sección de precios para `admin`, centro de notificaciones para `zoo-admin` y `admin`, y aviso emergente con acuse para `cashier` (ambos diferidos por decisión de 2026-11-02).

## Objetivos

- Registrar una venta en efectivo y mostrar el boleto con folio, fecha y hora, cantidades, total y QR, listo para imprimir según la configuración del equipo.
- Consultar el historial real del cajero con filtros, y cancelar un boleto del mismo día pidiendo motivo.
- Cambiar precios de adulto y niño (inmediato o programado) desde una sección solo visible para `admin`, con confirmación y 2FA.
- *(Diferido, decisión 2026-11-02.)* Mostrar avisos de cambio de precio: centro de notificaciones para `zoo-admin` y `admin`; aviso emergente con acuse para `cashier`, consultado al entrar y cada 60 s. El mismo aviso llega también por correo, enviado por la API (`api-009` RN-10).
- Mantener MVVM, accesibilidad, diseño adaptable (360 a 1366 px) y tokens semánticos.

## Fuera de alcance

- Arqueo y cierres de caja (`cash-closings.*`).
- Pagos electrónicos y cobro con tarjeta.
- Sección Venta para `admin` y `zoo-admin` (decisión de 2026-11-01: solo `cashier` vende).
- Validación del QR en el torniquete.
- Reimpresión de boletos desde el historial.
- Cálculo de totales, precios vigentes, permisos o reglas de cancelación en el cliente.
- Cambios de estilo de marca o nuevas dependencias (ver RN-07).
- React Router (ADR 0002): la navegación sigue por estado de la SPA.
- Impresión directa a impresoras, selección de impresora o envío de datos a dispositivos (RN-10).
- Guardar en el navegador ventas, historiales, precios o avisos. Solo se guarda la preferencia de impresión (RN-12).
- Listado completo o edición de cambios de precio programados (decisión 2026-11-02, pregunta 2).
- Cambios en `apps/web`, `apps/pwa` y `apps/mobile`.
- Configuración del servidor de correo, plantillas, preferencias de correo o estado de entrega de los correos en la interfaz (`api-009` RN-20 a RN-28).
- Autorización en el cliente: las pantallas solo presentan lo que la API permite.
- *Diferido (decisión 2026-11-02):* centro de notificaciones, modal de acuse, polling de avisos (CA-18 a CA-20 y CA-26) y texto «Se notificará también por correo.» (CA-30).

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos (API) |
|---|---|---|
| `cashier` | Venta, historial propio, cancelación de sus boletos del mismo día con motivo, impresión configurable y acuse de avisos de precio *(diferido)* | `tickets.create`, `tickets.view`, `tickets.cancel` (solo este rol, `api-009` RN-12) |
| `admin` | Sección Precios; centro de notificaciones *(diferido)*; historial en lectura. Sin sección Venta | `ticket-prices.manage` + 2FA; `tickets.view` (lectura); avisos del panel *(diferido)*. Sin `tickets.create` |
| `zoo-admin` | Centro de notificaciones *(diferido)*; historial de todos los boletos en lectura. Sin sección Venta | `tickets.view`; avisos del panel *(diferido)*. Sin `tickets.create` |
| `executive`, `veterinarian` | Sin estas secciones | — |

## Historias de usuario

- Como `cashier`, quiero elegir cuántos boletos de adulto y de niño vendo, confirmar la venta y obtener el boleto para imprimirlo.
- Como `cashier`, quiero elegir si imprimo en ticket térmico de 80 mm o en hoja carta, y ajustar qué datos aparecen, para usar la impresora de mi equipo.
- Como `cashier`, quiero ver mis boletos con su estado y cancelar uno del mismo día indicando el motivo.
- Como `admin`, quiero cambiar el precio de adulto y de niño ahora o en una fecha futura, con confirmación clara.
- *(Diferida, decisión 2026-11-02.)* Como `zoo-admin` y `admin`, quiero ver los avisos de cambio de precio en un centro de notificaciones.
- *(Diferida, decisión 2026-11-02.)* Como `cashier`, quiero que un aviso de cambio de precio aparezca sin que tenga que recargar la página y que pueda confirmar que lo leí, sin que el aviso me impida vender.

## Criterios de aceptación

### Navegación y acceso

- **CA-01:** Dada una sesión con permisos, cuando se presenta la navegación, entonces muestra «Venta» y «Historial» si tiene `tickets.create` y `tickets.view` respectivamente, «Precios» solo con `ticket-prices.manage`, y «Notificaciones» con contador de avisos sin leer para los roles que la API declara destinatarios del panel *(entrada «Notificaciones» y contador diferidos, decisión 2026-11-02)*. Ningún rol ve secciones sin permiso. Por decisión de 2026-11-01, solo `cashier` ve «Venta»: `admin` y `zoo-admin` no la ven.
- **CA-02:** Dadas las vistas Venta e Historial, cuando se presentan, entonces no muestran el aviso de demostración ni datos ficticios. Esto reemplaza `dashboard-001` CA-04, CA-11 y CA-15 para estas vistas.

### Venta

- **CA-03:** Dada la vista Venta, cuando se abre, entonces ofrece dos campos numéricos etiquetados («Adultos» y «Niños») con enteros mayores o iguales a cero, operables con teclado. El botón «Registrar venta» está deshabilitado mientras ambas cantidades sean cero.
- **CA-04:** Dada la vista Venta, cuando carga, entonces muestra el precio unitario vigente de cada tipo tal como lo devuelve la API (`api-009` CA-17). La vista no multiplica precios por cantidades; el total aparece solo cuando la API lo devuelve tras registrar la venta (decisión 2026-11-02, pregunta 1). Ejemplo de referencia con el precio inicial: adulto $25.00 y niño $16.00 (`api-009` CA-02).
- **CA-05:** Dada una venta lista para registrar, cuando se pulsa «Registrar venta», entonces se abre un diálogo accesible que muestra las cantidades y pide confirmar. Solo al confirmar se llama a la API. Escape cierra el diálogo sin llamar a la API.
- **CA-06:** Dada una venta registrada (201), cuando la respuesta llega, entonces la vista muestra el boleto con el formato y los campos de la configuración del equipo (CA-27), con folio y QR siempre visibles, y un botón «Imprimir boleto» que llama a la impresión del navegador (`window.print`). Al imprimir, solo se imprime el boleto (estilos `@media print` con tokens).
- **CA-07:** Dada una venta en curso, cuando la solicitud no ha terminado, entonces los controles de registro están deshabilitados, y no se crean dos ventas por doble pulsación.
- **CA-08:** Dada una respuesta de error a la venta, cuando llega, entonces: 422 muestra cada mensaje junto a su campo; 403 muestra el mensaje de la API; un fallo de red o un 5xx muestra un error con texto que indica consultar el Historial antes de volver a vender, sin reintentar automáticamente y sin mostrar boleto. *Revisión de 2026-11-02:* un 429 (límite de frecuencia, `api-009` CA-43) muestra el mensaje de la API, sin reintento automático y sin mostrar boleto. El tope de 100 por tipo (`api-009` CA-42) llega como 422 en el campo afectado; la vista no fija ese tope en código ni en atributos del control.
- **CA-09:** Dado un boleto mostrado, cuando el cajero pulsa «Nueva venta», entonces la vista limpia el formulario y vuelve a estado inicial.

### Historial

- **CA-10:** Dada la vista Historial, cuando carga, entonces muestra la lista real de la API con folio, fecha y hora, cantidades, total, estado (Completado o Cancelado) y el motivo de los cancelados, con paginación y estados de carga, vacío y error (`role="alert"` en español).
- **CA-11:** Dados filtros por folio, estado o rango de fechas, cuando se aplican, entonces la vista vuelve a consultar la API con esos filtros; no filtra en el cliente.
- **CA-12:** Dado un boleto del historial marcado por la API como cancelable (`api-009` CA-14), cuando se pulsa «Cancelar», entonces se abre un diálogo accesible con un campo «Motivo» obligatorio. Sin motivo no se llama a la API y se muestra el error en español. Al confirmar, la API cambia el estado y la lista se refresca con un aviso accesible. Los boletos sin `cancellable` no muestran la acción. Un 422 de la API (p. ej. «Solo se pueden cancelar boletos el mismo día en que se vendieron.») se muestra en el diálogo. *Revisión de 2026-11-02:* la llamada de cancelación envía solo el motivo, sin `timezone`; la zona del día la fija la API (`api-009` RN-16). Un 429 (`api-009` RN-30) se muestra en el diálogo con el mensaje de la API, sin reintento automático.
- **CA-13:** Dada la lista del historial, cuando se presentan fecha y hora, entonces se muestran en la zona horaria del dispositivo a partir de la hora UTC de la API (`api-009` CA-29). El formato es `dd/mm/aaaa HH:mm` (decisión 2026-11-02, pregunta 3). La conversión es de presentación; el dashboard no calcula periodos, totales ni el día de cancelación.

### Precios (solo `admin`)

- **CA-14:** Dado un usuario con `ticket-prices.manage`, cuando abre la sección Precios, entonces ve el precio vigente de adulto y de niño devuelto por la API. Sin el permiso, la sección no aparece.
- **CA-15:** Dado el formulario de precios, cuando se completa, entonces tiene montos de adulto y de niño, un selector «Aplicar ahora» o «Programar», y, solo si se programa, fecha y hora. Los errores 422 se muestran por campo. Antes de enviar, un diálogo de confirmación nombra los montos y cuándo entran en vigor.
- **CA-16:** Dada una respuesta 403 con `two_factor_setup_required`, cuando llega, entonces la sección muestra un mensaje en español que indica configurar el segundo factor, con el mismo flujo de `dashboard-002` CA-05. El dashboard no conoce el estado 2FA de la cuenta (`me` no lo expone): sin 2FA confirmado, la API responde 403 (`api-009` CA-22) y la sección muestra ese mensaje; no hay comprobación previa en el cliente.
- **CA-17:** Dado un cambio de precio guardado, cuando la API responde 201, entonces la sección refresca el precio vigente y confirma con un aviso accesible de la propia sección (no es un aviso de notificación; estos quedan diferidos). Un cambio programado se muestra como programado: la sección muestra el próximo cambio que devuelve `api-009` CA-17 (decisión 2026-11-02, pregunta 2).

- **CA-30:** *Diferido (decisión 2026-11-02).* Dada la sección Precios (solo con `ticket-prices.manage`), cuando se muestra el formulario, entonces incluye el texto informativo «Se notificará también por correo.»; y, tras un cambio guardado (201), la confirmación de CA-17 repite ese texto junto al aviso accesible. El texto no añade controles ni llamadas a la API; el envío lo hace la API (`api-009` RN-20 a RN-28). Si el cambio responde 403 o 422, el texto de confirmación no aparece (texto propuesto — pregunta 8, sin cerrar).

### Notificaciones (diferido, decisión 2026-11-02)

- **CA-18:** *Diferido (decisión 2026-11-02).* Dada la sección Notificaciones (`admin` y `zoo-admin`), cuando carga, entonces lista los avisos con su estado (leído o sin leer), permite marcar uno como leído, y muestra estados de carga, vacío y error. El contador de CA-01 coincide con los avisos sin leer.
- **CA-19:** *Diferido (decisión 2026-11-02).* Dado un `cashier` con avisos `price-change` sin acuse, cuando abre el dashboard o llega una consulta periódica de CA-26 que los incluye, entonces se abre un diálogo modal accesible (`role="dialog"`, foco atrapado, anunciado a tecnologías de asistencia) que muestra, por cada aviso, el tipo de boleto, el monto nuevo y la fecha y hora de entrada en vigor. El botón «Entendido» llama a la API para acusar; al éxito el aviso desaparece. El modal aparece en cualquier vista del dashboard (pregunta 6, sin cerrar).
- **CA-20:** *Diferido (decisión 2026-11-02).* Dado el modal de CA-19, cuando el cajero cierra sin acusar (con Escape o con el botón de cerrar), entonces no se llama a la API para acusar y el aviso sigue pendiente. El modal no bloquea el botón «Registrar venta» (`api-009` CA-33). El aviso reaparece en la siguiente consulta periódica, como máximo 60 s después, hasta que se acuse (pregunta 6, sin cerrar).

### Complementarios: avisos en sesión (diferido) e impresión

- **CA-26:** *Diferido (decisión 2026-11-02).* Dado un usuario con sesión y acceso a avisos (`cashier`, `admin` o `zoo-admin`), cuando el dashboard está abierto, entonces consulta `GET /api/v1/admin/notifications` al entrar y cada 60 s (polling, sin tiempo real), y actualiza el contador de CA-01 y el modal de CA-19 con cada respuesta. Si una consulta periódica falla, no muestra un error bloqueante y reintenta en el siguiente ciclo. Un 401 sigue CA-22.
- **CA-27:** Dado un `cashier` (único rol con `tickets.create`), cuando abre «Configurar impresión» desde la vista Venta, entonces puede elegir: (a) formato «Térmica 80 mm» (por defecto) u «Hoja carta»; (b) ancho de papel, solo para térmica: 58 mm u 80 mm; (c) tamaño de fuente: pequeño, normal o grande; (d) márgenes en mm, con valores por defecto distintos para térmica (2 mm) y carta (15 mm) y rangos de 0 a 10 mm en térmica y de 0 a 20 mm en carta (revisión de 2026-11-02, decisión de Jonathan); (e) campos visibles: folio, fecha y hora, cantidades, total, cajero, QR y pie; (f) pie de texto libre de hasta 80 caracteres, con valor predeterminado «Zoológico Nicolás Bravo, Tulancingo». Folio y QR no se pueden desactivar; el pie puede quedar vacío. Los controles son operables con teclado y tienen etiqueta en español. Las opciones y límites de este CA son decisiones cerradas de la pregunta 7 y de la pregunta 5 (2026-11-02).
- **CA-28:** Dada una configuración de impresión, cuando se cambia, entonces se guarda en `localStorage` del navegador del equipo (clave `arca:ticket-print-settings`). Ni la API ni la base de datos la reciben. La lectura y la escritura van en `try/catch`: si `localStorage` no está disponible o lanza excepción, si el valor guardado no es JSON válido o si tiene campos inválidos, entonces se usan los valores por defecto sin mostrar un error bloqueante, y los campos válidos guardados se conservan. La configuración no contiene datos de venta, tokens ni SVG.
- **CA-29:** Dado un boleto mostrado o impreso, cuando se aplica la configuración de CA-27, entonces el boleto muestra el formato y el ancho elegidos, folio y QR siempre, y solo los campos activados. Un test verifica que folio y QR están presentes en térmica y en carta, incluso con todos los campos opcionales desactivados. La configuración no cambia cantidades, total ni QR.

### Transversales

- **CA-21:** Dado el código del dashboard, cuando se revise, entonces toda llamada a la API pasa por `@arca/api-client` desde hooks ViewModel (un hook por sección: venta, historial, precios, notificaciones y avisos de cajero). Ningún componente de `views/` o `components/` usa `fetch`/`axios` ni calcula totales, precios vigentes, permisos o reglas de cancelación.
- **CA-22:** Dado cualquier 401 en estas secciones, cuando lo detecta el estado de sesión, entonces el dashboard vuelve al login con «Tu sesión expiró» (`dashboard-002` CA-08).
- **CA-23:** Dadas las vistas nuevas, cuando se usan con teclado y en anchos de 360 a 1366 px, entonces conservan foco visible, diálogos con foco atrapado y cierre con Escape (cuando el CA lo permita), tablas con desplazamiento propio o diseño apilado, y no hay desbordamiento horizontal de la página.
- **CA-24:** Dada la interfaz, cuando se revisa su estilo, entonces usa tokens semánticos, no fija hex de marca, y el modo de impresión usa solo tokens y no oculta el boleto.
- **CA-25:** Dada la suite de Vitest con un cliente simulado de `@arca/api-client`, cuando se ejecuta, entonces existe al menos una prueba que nombra cada CA vigente (CA-01 a CA-17, CA-21 a CA-25 y CA-27 a CA-29). Los CA diferidos (CA-18 a CA-20, CA-26 y CA-30) no requieren prueba hasta su reactivación. Las pruebas de `ticket-sale.test.tsx`, `ticket-history.test.tsx` y `global-demo-banner.test.tsx` se reescriben para estos criterios, y se añaden pruebas para la configuración de impresión y la persistencia local con fallo (las pruebas de polling quedan diferidas).

## Reglas de negocio

- **RN-01:** El mapa permiso → sección es solo presentación; la autorización real la aplica `api-009`. Ocultar una sección no la protege.
- **RN-02:** Precios vigentes, totales, estados, filtros y `cancellable` vienen de la API (los avisos, diferidos). El cliente no reimplementa ninguna regla de `api-009`. *Revisión de 2026-11-02:* los topes de cantidad (`api-009` CA-42, RN-29) y los límites de frecuencia (`api-009` RN-30) también los comunica la API en sus respuestas 422 y 429; el cliente no los fija ni los reimplementa.
- **RN-03:** Cancelar un boleto y cambiar un precio siempre piden confirmación explícita antes de llamar a la API.
- **RN-04:** *Diferido (decisión 2026-11-02).* Los avisos son presentación; el acuse lo registra la API (`api-009` RN-11).
- **RN-05:** Mensajes y etiquetas en español; identificadores del código en inglés (Constitución VI).
- **RN-06:** Sin React Router: la navegación entre vistas sigue por estado de la SPA (ADR 0002).
- **RN-07:** Sin nuevas dependencias en el cliente. El QR llega ya renderizado en SVG desde la API (generado con la librería del ADR 0019 en `api-009`). Si se necesitara una librería de render en el cliente, se requiere ADR antes de implementarla.
- **RN-08:** Esta feature depende de `api-009`. Mientras no esté implementada, el desarrollo usa un cliente simulado en tests.
- **RN-09:** El diseño visual no cambia; se reutilizan los componentes y patrones de `@arca/ui` y de las pantallas existentes (`dashboard-003` RN-09).
- **RN-10:** La impresión solo presenta el boleto con `window.print`, según la configuración de CA-27; no elige impresora ni envía datos a dispositivos.
- **RN-11:** *Diferido (decisión 2026-11-02).* Avisos en sesión: el dashboard consulta avisos al entrar y cada 60 s (CA-26); no hay tiempo real. Cerrar el modal sin acuse no equivale a acusar (CA-20).
- **RN-12:** Excepción acotada a `dashboard-001` RN-09: la preferencia de impresión (CA-27 y CA-28) se guarda en `localStorage` del navegador del equipo. Esta excepción reemplaza `dashboard-001` RN-09 únicamente para esa preferencia. Siguen prohibidos el almacenamiento local, las cookies o la base de datos para ventas, historiales, precios, avisos, boletos, tokens y SVG. La preferencia no contiene datos personales ni de ventas.
- **RN-13:** Cancelar: la vista muestra la acción solo si `cancellable` es verdadero. La regla de mismo día y de dueño la aplica `api-009` (RN-16); la vista no la calcula. La llamada de cancelación no envía zona horaria (revisión de 2026-11-02).
- **RN-14:** *Diferido (decisión 2026-11-02).* Correo de avisos de precio: lo envían la API y su cola (`api-009` RN-20 a RN-28). El dashboard no envía, no configura ni reintenta correos, no muestra destinatarios ni estado de entrega y no añade lógica de correo en el cliente (CA-21). Solo muestra el texto de CA-30.

## Datos, privacidad y auditoría

El dashboard muestra folios, cantidades, totales, nombres de cajeros en el historial (solo si la API los devuelve); los avisos de precio quedan diferidos (decisión 2026-11-02). No almacena ventas, precios, avisos ni boletos fuera de la memoria de la sesión. No guarda el SVG del QR en almacenamiento local. La única excepción de almacenamiento local es la preferencia de impresión (RN-12), que no contiene datos personales ni de ventas. La auditoría la escribe la API (`api-009` CA-28).

## Flujos y errores

1. **Venta:** el cajero ajusta cantidades → confirma en diálogo → la API registra → se muestra el boleto con su configuración de impresión → imprime o inicia una nueva venta.
2. **Historial:** filtros → consulta a la API → lista → cancelar con motivo (si `cancellable`) → refresca.
3. **Precios:** el admin completa el formulario → confirma → la API responde → refresca la sección.
4. **Avisos (diferido, decisión 2026-11-02):** el cajero entra → el dashboard consulta avisos → aparece el modal si hay pendientes → acusa → desaparece. Cada 60 s se repite la consulta y, si sigue sin acuse, el modal vuelve. El admin y el zoo-admin ven el aviso en el centro.
5. **Impresión:** el cajero abre «Configurar impresión» → elige formato y campos → se guarda en el equipo → el boleto se muestra con esa configuración. Si el almacenamiento local falla, se usan los valores por defecto (CA-28).
6. **Errores:** 401 → login con «Tu sesión expiró»; 403, 404, 422 o 429 → mensaje en español (o el de la API) en la propia vista, sin cambiar la lista y sin reintento automático en la venta (429 de la revisión de 2026-11-02); `two_factor_setup_required` → mensaje de 2FA (CA-16); fallo de red en venta → error sin reintento automático (CA-08); fallo de la consulta periódica de avisos (diferido) → sin error bloqueante, reintento en el siguiente ciclo (CA-26).

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:** `api-009` (requisito; sin ella el desarrollo usa cliente simulado; incluye `cancellable`, `cashier_name` y el próximo cambio programado en `current`), `api-007` (impacto de exclusión de cancelados: sin cambio de código en esta app, las cifras de `dashboard-003` cambian al desplegar), `dashboard-002` (login, 401, 2FA), `dashboard-003` (patrones de administración), DBR-006 (en el lado de la API), ADR 0002, ADR 0020 (correo de avisos de precio, Propuesto y diferido por decisión de 2026-11-02; lo usaría solo la API, sin impacto en el cliente).
- **Riesgos:**
  - Sin `api-009`, la taquilla sigue demostrativa; esta spec no puede cerrarse sin ella.
  - (Diferido) Polling cada 60 s: una petición por minuto por cada dashboard abierto; el aviso tarda hasta 60 s en aparecer.
  - Un fallo de red justo al registrar una venta puede dejar duda sobre si se registró (CA-08 lo mitiga, no lo elimina).
  - Equipos compartidos entre cajeros: la configuración de impresión es por equipo, no por usuario; el segundo cajero hereda la configuración del primero.
  - (Diferido) Correo y aviso in-app: el correo del cajero puede llegar más tarde que el aviso del dashboard si nadie consulta avisos después de la entrada en vigor (`api-009` pregunta 14).
- **Preguntas resueltas (2026-11-01 y 2026-11-02):** la antigua pregunta 4 (venta para `admin`) queda cerrada: solo `cashier` ve y usa la sección Venta. Las preguntas 1, 2, 3, 5 y 7 quedan cerradas por la aprobación del 2026-11-02 (ver «Decisiones cerradas»).
- **Preguntas diferidas, sin cerrar (avisos y correo; no bloquean lo vigente):**
  6. *(Diferida.)* **Modal de avisos:** propuesta — el modal aparece en cualquier vista del dashboard, no solo en Venta, y reaparece en la siguiente consulta periódica (hasta 60 s) mientras no se acuse (CA-19, CA-20).
  8. *(Diferida.)* **Texto del correo en Precios:** propuesta — el texto informativo y de confirmación es «Se notificará también por correo.» (CA-30); no lista destinatarios ni estado de envío.
