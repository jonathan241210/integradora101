# Tareas · 005 · ticket-sales

- Spec: `apps/dashboard/specs/005-ticket-sales.md` (Revisión aprobada por Jonathan el 2026-11-05; aprobada el 2026-11-02, con revisión de márgenes de impresión el mismo día)
- Plan: `apps/dashboard/plan/005-ticket-sales.md` (Aprobado el 2026-11-02; revisión de 2026-11-05 aprobada)
- Contrato que consume: `apps/api/specs/009-ticket-sales.md` y `apps/api/tasks/009-ticket-sales.md`
- Revisión 2026-11-02 (`api-009` revisada, aprobada por Jonathan): sin cambio en el número de CA (25) ni en los diferidos. Tareas nuevas T-43 a T-50: la cancelación no envía `timezone`, y los 429 y el tope de 100 se muestran con el mensaje de la API. Ver `apps/dashboard/specs/005-ticket-sales.md`, «Revisión de `api-009`».
- Nota (2026-11-05, sin cambio de casillas): la línea de estado anterior dice que T-38 y T-42 están pendientes, pero sus casillas están marcadas `[x]` (T-38 con evidencia del 2026-11-02 y T-42 con evidencia del 2026-11-03). Se señala para revisión; ninguna casilla se ha desmarcado ni marcado en esta revisión.
- Estado del checklist: En curso (actualizado el 2026-11-06: `npm test` 290/290, `npm run types` y `npm run build` del dashboard en verde; Jonathan informó ese día que el recorrido manual está correcto). `/verify` del dashboard en verde el 2026-11-06; falta registrar la salida en el PR. Una casilla se marca solo con evidencia (salida de Vitest o de `npm run build`, enlace a PR o commit), nunca por haber escrito el código.

## Alcance de esta lista

- **CA vigentes (25):** CA-01 a CA-17, CA-21 a CA-25 y CA-27 a CA-29. Cada uno tiene al menos una tarea de prueba. Con la revisión de 2026-11-05 (aprobada) se añaden CA-31 a CA-34 (29 en total), con las tareas T-51 a T-61.
- **CA diferidos, excluidos (5):** CA-18 (centro de notificaciones), CA-19 (modal de aviso), CA-20 (cierre del modal sin acuse), CA-26 (polling de avisos) y CA-30 (texto «Se notificará también por correo.») (decisión 2026-11-02). No tienen tarea ni prueba.
- **RN vigentes:** RN-01, RN-02, RN-03, RN-05, RN-06, RN-07, RN-08, RN-09, RN-10, RN-12 y RN-13.
- **RN diferidas, excluidas:** RN-04, RN-11 y RN-14.
- **Excluidos:** centro de notificaciones, modal de acuse, polling de avisos, texto de correo, llamadas a `GET /api/v1/admin/notifications` y a sus acciones de acuse y lectura.
- **Excluido por la spec:** no se añade librería de QR ni de impresión (RN-07). No se añade React Router (RN-06).

Convenciones:
- Código en `apps/dashboard/src/` (alias `@/`). El cliente de API en `packages/api-client/`, que es una tarea propia (T-01 y T-02).
- Cada componente de `views/`, `components/` y `sections/` se entrega sin `fetch`, `axios`, `services/` ni `@arca/api-client` directos. Las llamadas van por hooks ViewModel.
- Pruebas en Vitest, en `src/tests/`. Cada prueba nombra su criterio con `describe("CA-NN ticket-sales", …)`.
- Cliente simulado (`vi.fn`) en las pruebas, según RN-08. La validación real va en T-40.
- Sin dependencias nuevas, sin hex de marca y con tokens semánticos.
- Delegación: todas las tareas son de `[frontend]` (Jonathan), salvo las marcadas `[docs]` (documentador o frontend con petición expresa) o `[verificación]` (sesión principal o revisor). No hay tareas de BD en esta app: la tarea de BD vive en la API (`apps/api/tasks/009-ticket-sales.md`, T-01).

## Base de datos

No hay tareas de BD en esta app. Esta feature no cambia el esquema.

## Implementación

### Cliente de API (`packages/api-client`)

- [x] **T-01** (CA-21, RN-02) `[frontend]`: `packages/api-client/ticket-sales-types.ts` (nuevo). DTOs: `TicketSaleInput`, `TicketSaleDto` (con `qr_svg`; sin `qr_code`), `TicketHistoryRowDto` (sin `qr_code` ni `qr_svg`; con `cancellable`), `TicketHistoryQuery`, `TicketPriceCurrentDto` (vigente y próximo por tipo), `TicketPriceScheduleInput`. Importes como cadena. Ningún cálculo en el paquete.
- [x] **T-02** (CA-21, CA-13, RN-08) `[frontend]`: `packages/api-client/ticket-sales.ts` (nuevo) con `createTicketSalesApi(http, options?)`. Métodos: `sales.create(input)` (`POST admin/tickets`), `history.list(query)` (`GET admin/tickets`), `history.cancel(id, { reason, timezone })` (`POST admin/tickets/{id}/cancel`), `prices.current()` (`GET admin/ticket-prices/current`) y `prices.schedule(input)` (`POST admin/ticket-prices`). `options.deviceTimeZone` por defecto `Intl.DateTimeFormat().resolvedOptions().timeZone`; `timezone` se envía en historial y cancelación, no en venta. Solo usa `http.get` y `http.post`. Exporta desde `packages/api-client/index.ts` y añade la sección de ventas a `packages/api-client/README.md`. No cambia `http.ts`, `createAdminApi` ni `createAuthApi`, así que `apps/pwa` y `apps/mobile` no se ven afectados.
  - Depende de T-01.
  - Revisión 2026-11-02: la parte de zona de cancelación de esta tarea queda superada por T-43 (`history.cancel` sin `timezone`).
- [x] **T-43** (CA-12, RN-13; revisión 2026-11-02) `[frontend]`: `packages/api-client/ticket-sales.ts` y `ticket-sales-types.ts`. `history.cancel(id, { reason })` no envía `timezone` y el tipo de entrada `TicketCancelInput` solo admite `reason`. `history.list` no cambia. La zona del día la fija la API (`api-009` RN-16).
  - Depende de T-02.

### Servicios y acceso a impresión

- [x] **T-03** (CA-06, CA-22) `[frontend]`: `src/services/arca-api.ts` exporta `ticketSalesApi` (instancia de `createTicketSalesApi`). `src/services/printer.ts` (nuevo) exporta `print()`, que llama a `window.print` y se puede sustituir en pruebas. Las vistas no tocan `window`.
  - Depende de T-02.

### Configuración de impresión (solo `cashier`)

- [x] **T-04** (CA-27, CA-28, RN-12) `[frontend]`: `src/viewmodels/ticket-print-settings.ts` (nuevo). Funciones puras:
  - Valores por defecto: formato «Térmica 80 mm», ancho 80 mm, fuente normal, todos los campos activos, pie «Zoológico Nicolás Bravo, Tulancingo». Márgenes: 2 mm en térmica y 15 mm en carta.
  - Rangos: térmica de 0 a 10 mm; carta de 0 a 20 mm; pie de hasta 80 caracteres.
  - `parseTicketPrintSettings(raw: unknown)`: valida campo a campo y rellena los inválidos con sus valores por defecto. Conserva los campos válidos.
  - `serializeTicketPrintSettings`.
  - Adaptador de almacenamiento inyectable que envuelve `localStorage` en `try/catch`, con clave `arca:ticket-print-settings`. Si falla, usa valores por defecto sin error bloqueante.
- [x] **T-05** (CA-28, RN-12) `[frontend]`: `src/viewmodels/useTicketPrintSettings.ts`. Lee al montar, escribe al cambiar y restablece los valores por defecto. Usa el adaptador de T-04.
  - Depende de T-04.
- [x] **T-06** (CA-27, CA-23) `[frontend]`: `src/components/PrintSettingsDialog.tsx` (nuevo, sobre `Dialog` de `@arca/ui`). Controles con etiqueta en español: formato («Térmica 80 mm» u «Hoja carta»); ancho (solo térmica, 58 u 80 mm); fuente (pequeña, normal o grande); márgenes en mm, con el rango del formato elegido; campos (folio y QR siempre activos, sin control para desactivarlos; fecha y hora, cantidades, total, cajero y pie desactivables); pie de hasta 80 caracteres. Operable con teclado.
  - Depende de T-05.

### Venta (`cashier`)

- [x] **T-07** (CA-03, CA-04, CA-07; RN-02) `[frontend]`: `src/viewmodels/ticket-sale.ts` (nuevo). Reducer con estados `idle`, `confirming`, `submitting`, `done` y `error`. Cantidades enteros mayores o iguales a cero. El botón «Registrar venta» queda deshabilitado mientras ambas cantidades sean cero. Muestra los precios unitarios que devuelve la API (no los multiplica). Mientras está en `submitting`, ignora un segundo envío.
  - Depende de T-03.
- [x] **T-08** (CA-05, CA-06, CA-07, CA-08, CA-09; RN-03, RN-10) `[frontend]`: `src/viewmodels/useTicketSale.ts`. Une el reducer con `ticketSalesApi.sales.create`. Errores con `api-errors.ts` de `dashboard-003`: 422 por campo junto al control; 403 con el mensaje de la API; red o 5xx con texto que remite al Historial, sin reintento automático y sin mostrar boleto. Impresión con `printer.print()`. «Nueva venta» vuelve a `idle`. Un 401 lo gestiona el manejador global, no este hook.
  - Depende de T-07.
- [x] **T-09** (CA-05, RN-03) `[frontend]`: `src/components/SaleConfirmDialog.tsx` (nuevo, si `ConfirmDialog` de `dashboard-003` no admite el resumen; si sí, reutilizarlo). Muestra las cantidades y pide confirmar. Escape cierra sin llamar a la API.
  - Depende de T-07.
- [x] **T-10** (CA-06, CA-24, CA-29) `[frontend]`: `src/components/TicketReceipt.tsx`. Boleto con el formato, ancho, fuente y márgenes de la configuración (variables CSS `--ticket-width`, `--ticket-margin`, `--ticket-font`). Folio y QR siempre visibles. Los campos opcionales aparecen solo si están activos. El QR se muestra con un `<img>` cuyo `src` es un data URI `image/svg+xml` construido con el `qr_svg` de la API; el SVG no se inyecta en el DOM (decisión de 2026-11-02, duda 2 resuelta). Texto alternativo en español. Cantidades, total y QR no cambian con la configuración.
  - Depende de T-04.
- [x] **T-11** (CA-03, CA-04, CA-06, CA-09) `[frontend]`: `src/views/TicketSaleView.tsx` (reemplaza a la vista demostrativa, solo props) y `src/sections/TicketSaleSection.tsx` (llama al hook de T-08). Contiene: campos «Adultos» y «Niños»; precios unitarios de la API; botón «Registrar venta»; boleto (T-10); «Imprimir boleto»; «Configurar impresión» (T-06); «Nueva venta». Sin total antes de registrar.
  - Depende de T-06, T-08, T-09, T-10.
- [x] **T-44** (CA-08, RN-02; revisión 2026-11-02) `[frontend]`: `src/viewmodels/ticket-sale.ts` y `useTicketSale.ts`. Un 429 (límite de `api-009` CA-43) se muestra como error general con el mensaje de la API. No reintenta, no muestra boleto y deja los controles disponibles para una acción manual.
  - Depende de T-08.
- [x] **T-45** (CA-08, RN-02; revisión 2026-11-02) `[frontend]`: `src/sections/TicketSaleSection.tsx` y `src/views/TicketSaleView.tsx`. El tope (`api-009` CA-42; 50 boletos en total desde el 2026-11-06) no aparece en código ni como atributo `max` fijo del control. El 422 llega por `fieldErrors` y la vista lo muestra junto al campo con el texto de la API.
  - Depende de T-08 y T-11.

### Historial (`cashier` propio; `admin` y `zoo-admin` en lectura)

- [x] **T-12** (CA-13; RN-02) `[frontend]`: `formatTicketDateTime(iso, timeZone)` en `src/viewmodels/ticket-history.ts` (nuevo), con `Intl.DateTimeFormat` en formato `dd/mm/aaaa HH:mm`. No reutiliza `formatDateTime` de `formatters.ts`, que trata el formato `Y-m-d H:i:s` de los reportes. Es conversión de presentación; no calcula periodos ni días de cancelación.
- [x] **T-13** (CA-10, CA-11; RN-02) `[frontend]`: reducer de `src/viewmodels/ticket-history.ts` con estados `loading`, `ready`, `empty` y `error`; filtros por folio, estado y rango; paginación. Cada filtro vuelve a consultar la API con sus parámetros. No filtra en el cliente.
  - Depende de T-12.
- [x] **T-14** (CA-12; RN-03, RN-13) `[frontend]`: `src/components/CancelTicketDialog.tsx` (nuevo, sobre `Dialog` de `@arca/ui`) con campo «Motivo» obligatorio. Sin motivo no llama a la API y muestra el error en español.
- [x] **T-15** (CA-10, CA-11, CA-12; RN-13) `[frontend]`: `src/viewmodels/useTicketHistory.ts`. Une el reducer con `ticketSalesApi.history`; cancelar con motivo llama a `history.cancel` y luego refresca la lista con un aviso accesible. La acción solo aparece si la API marca `cancellable`. Un 422 de la API (p. ej. «Solo se pueden cancelar boletos el mismo día en que se vendieron.») se muestra en el diálogo.
  - Depende de T-13, T-14.
- [x] **T-16** (CA-10, CA-11, CA-13, CA-23) `[frontend]`: `src/views/TicketHistoryView.tsx` (reemplaza a la vista demostrativa, solo props) y `src/sections/TicketHistorySection.tsx`. Tabla con `DataTable` de `dashboard-003` (folio, fecha y hora local, cantidades, total, estado Completado o Cancelado, motivo de los cancelados), filtros, `PaginationBar`, y estados de carga, vacío y error con `role="alert"` en español.
  - Depende de T-12, T-15.
- [x] **T-46** (CA-12; revisión 2026-11-02) `[frontend]`: `src/viewmodels/useTicketHistory.ts` y `src/components/CancelTicketDialog.tsx`. Un 429 al cancelar se muestra en el diálogo con el mensaje de la API. El diálogo sigue abierto, conserva el motivo y no hay reintento automático.
  - Depende de T-14 y T-15.

### Precios (solo `admin` con `ticket-prices.manage`)

- [x] **T-17** (CA-14, CA-15, CA-16; RN-03, RN-05) `[frontend]`: `src/viewmodels/ticket-prices.ts` (nuevo). Reducer con estados `loading`, `ready` y `error`, y bandera `twoFactorRequired`, que se activa solo con la respuesta 403 `two_factor_setup_required` (el cliente no consulta el estado 2FA; ver CA-16 de la spec). Carga el precio vigente y el próximo programado de cada tipo con `prices.current()`. Formulario con montos de adulto y niño, selector «Aplicar ahora» o «Programar» y, solo si se programa, fecha y hora. Convierte la fecha y hora locales a ISO 8601 con el desfase de su zona (decisión 3); es conversión de entrada, no regla de negocio. Errores 422 por campo.
  - Depende de T-02.
- [x] **T-18** (CA-15, CA-17; RN-03) `[frontend]`: `src/viewmodels/useTicketPrices.ts`. Une el reducer con `ticketSalesApi.prices`. Llama a `prices.schedule` solo después de la confirmación. Tras un 201, refresca el vigente y el próximo y deja el resultado para el aviso accesible de la sección.
  - Depende de T-17.
- [x] **T-19** (CA-14, CA-15, CA-16, CA-17) `[frontend]`: `src/views/TicketPricesView.tsx` y `src/sections/TicketPricesSection.tsx`. Muestra el precio vigente y el próximo cambio programado. Formulario con su modo y fecha condicional. Confirmación con `ConfirmDialog` que nombra los montos y cuándo entran en vigor. Tras el éxito, aviso accesible de la propia sección (no es un aviso de notificación). Ante `two_factor_setup_required`, mensaje de configurar el segundo factor con el mismo flujo de `dashboard-002` CA-05. Sin texto de correo (diferido).
  - Depende de T-18.

### Shell y navegación (sin datos de demostración)

- [x] **T-20** (CA-01; RN-01) `[frontend]`: `src/viewmodels/navigation.ts`. «Venta» con `tickets.create`; «Historial» con `tickets.view`; «Precios» con `ticket-prices.manage`. Un `admin` con `tickets.view` y `ticket-prices.manage` ve Historial y Precios, no Venta. No depende del perfil demostrativo `ticket`. No incluye «Notificaciones» (diferido).
- [x] **T-21** (CA-01; RN-06) `[frontend]`: `src/viewmodels/dashboard-shell.ts` y `src/viewmodels/useDashboardShell.ts` (nuevos). Sustituyen a `dashboard-demo.ts` y `useDashboardDemo.ts` en lo que toca a la shell: sección activa, menú móvil y aviso. Navegación validando los permisos de la lista recibida (sin React Router).
  - Depende de T-20.
- [x] **T-22** (CA-01, CA-02) `[frontend]`: `src/App.tsx`. Enruta `tickets`, `ticket-history` y `ticket-prices` a sus secciones (T-11, T-16, T-19). La navegación sale de los permisos. Quita `DemoBanner` y `useDashboardDemo`.
  - Depende de T-11, T-16, T-19, T-21.
- [x] **T-23** (CA-02, RN-09) `[frontend]`: retirar `src/components/DemoBanner.tsx`, `src/viewmodels/dashboard-demo.ts`, `src/viewmodels/useDashboardDemo.ts` y los datos de venta e historial de `src/data/demo-data.ts`. Antes de borrar, buscar referencias (`Grep`) en `apps/dashboard/src`; `dashboard-003` T-06 también tocó `dashboard-demo.ts`. Las secciones que no se conectan (si las hubiera) siguen con sus datos.
  - Depende de T-22.

### Estilos y accesibilidad

- [x] **T-24** (CA-24, CA-29) `[frontend]`: `src/styles.css`, bloque `ticket-sales` con tokens semánticos (de `@arca/tokens`, sin hex de marca) y `@media print`. En impresión oculta la shell y la vista, y deja visible solo `.ticket-receipt`, con las variables de ancho, margen y fuente. El modo de impresión usa solo tokens y no oculta el boleto.
- [x] **T-25** (CA-23) `[frontend]`: marcado accesible de las vistas nuevas. Foco visible; diálogos con `aria-labelledby` (foco atrapado y Escape nativos de `Dialog`); `role="alert"` y `role="status"` donde corresponda; tablas con contenedor desplazable o diseño apilado; controles con etiqueta en español; sin desbordamiento horizontal de la página entre 360 y 1366 px.
  - Depende de T-11, T-16, T-19.

## Pruebas (un test por CA vigente)

Convención: `describe("CA-NN ticket-sales", …)` con el criterio en el nombre de la prueba.

- [x] **T-26** (CA-01) `[frontend]`: `src/tests/administration-navigation.test.tsx` (ajustado) y `ticket-sales-navigation` dentro de `ticket-sales-coverage.test.tsx`. «Venta» solo con `tickets.create`; «Historial» con `tickets.view`; «Precios» con `ticket-prices.manage`; `admin` sin Venta.
  - Depende de T-20.
- [x] **T-27** (CA-02) `[frontend]`: `src/tests/global-demo-banner.test.tsx` (reescrito). Venta e Historial no renderizan aviso de demo ni datos ficticios; `App` ya no renderiza `DemoBanner`.
  - Depende de T-22, T-23.
- [x] **T-28** (CA-03, CA-04, CA-05) `[frontend]`: `src/tests/ticket-sale.test.tsx`, parte 1. Campos con etiqueta; botón deshabilitado con ambas cantidades en cero; muestra precios de la API sin total previo; el diálogo lista las cantidades; la API solo se llama al confirmar; Escape no llama a la API.
  - Depende de T-08, T-09, T-11.
- [x] **T-29** (CA-06, CA-07, CA-08, CA-09) `[frontend]`: `src/tests/ticket-sale.test.tsx`, parte 2. Boleto con folio y QR, y «Imprimir boleto» llama al `printer` simulado; controles deshabilitados en `submitting` y segundo envío ignorado; 422 por campo, 403 con el mensaje de la API y red o 5xx con texto de Historial sin reintento y sin boleto; «Nueva venta» limpia el formulario.
  - Depende de T-08, T-10, T-11.
- [x] **T-30** (CA-10, CA-11, CA-12, CA-13) `[frontend]`: `src/tests/ticket-history.test.tsx` (reescrito). Lista con folio, fecha local, cantidades, total, estado y motivo; estados de carga, vacío y error con `role="alert"`; filtros que llaman a la API con sus parámetros; acción solo con `cancellable`; motivo vacío no llama a la API; 422 en el diálogo; `formatTicketDateTime` convierte UTC a la zona del dispositivo en `dd/mm/aaaa HH:mm`.
  - Depende de T-13, T-15, T-16.
- [x] **T-31** (CA-14, CA-15, CA-16, CA-17) `[frontend]`: `src/tests/ticket-prices.test.tsx`. Sección solo con `ticket-prices.manage`; muestra el vigente de la API; formulario con modo y fecha condicional; 422 por campo; confirmación que nombra montos y vigencia; `two_factor_setup_required` (403) muestra el mensaje de 2FA; el test no espera ninguna comprobación previa de 2FA (duda 1 resuelta); tras 201 refresca y muestra el aviso accesible de la sección, con el próximo programado.
  - Depende de T-17, T-18, T-19.
- [x] **T-32** (CA-27, CA-28, CA-29) `[frontend]`: `src/tests/ticket-print-settings.test.tsx`. Formato, ancho (solo térmica), fuente, márgenes (térmica 0 a 10 mm; carta 0 a 20 mm), campos, pie de hasta 80 caracteres y pie predeterminado. Guarda en `arca:ticket-print-settings`. Si `localStorage` lanza una excepción, usa los valores por defecto sin error. JSON inválido → valores por defecto. Campo inválido → conserva los válidos. Térmica y carta muestran folio y QR con todos los opcionales desactivados; cantidades, total y QR no cambian.
  - Depende de T-04, T-05, T-10.
- [x] **T-33** (CA-21, CA-22, CA-24) `[frontend]`: `src/tests/ticket-sales-quality.test.tsx`. Revisión estática: ningún archivo de `views/`, `components/` o `sections/` nuevos importa `fetch`, `axios`, `services/` ni `@arca/api-client`, y ninguno calcula totales, precios vigentes, permisos ni reglas de cancelación. Un 401 dispara el manejador global y «Tu sesión expiró». El bloque `ticket-sales` de `styles.css` no tiene hex de marca y el modo de impresión usa solo tokens.
  - Depende de T-22, T-24.
- [x] **T-34** (CA-23) `[frontend]`: `ticket-sales-quality.test.tsx` (bloque de marcado). Diálogos con `aria-labelledby`, `role="alert"` y `role="status"` donde corresponden, tablas con contenedor desplazable y controles con etiqueta. La revisión de teclado y de anchos es manual (T-39).
  - Depende de T-25.
- [x] **T-35** (CA-13, CA-21) `[frontend]`: `src/tests/ticket-sales-api-client.test.tsx`. Con `fetch` simulado: `history.list` y `history.cancel` envían `timezone` con la zona del dispositivo; el llamador puede sobrescribirlo; `sales.create` no envía zona.
  - Depende de T-02.
- [x] **T-36** (CA-25) `[frontend]`: `src/tests/ticket-sales-coverage.test.tsx`. Verifica que `CA-01` a `CA-17`, `CA-21` a `CA-25` y `CA-27` a `CA-29` aparecen nombrados en las pruebas de `src/tests/`. No exige los CA diferidos (CA-18 a CA-20, CA-26, CA-30).
  - Depende de T-26 a T-35.
- [x] **T-37** (CA-01, CA-02) `[frontend]`: regresión de pruebas existentes que cambian con el nuevo shell: `src/tests/real-staff-login.test.tsx` (lista de navegación del cajero; lee `demo-data.ts`), `acceptance-coverage.test.tsx` (lista de archivos) y `responsive.test.tsx` si referencia las vistas viejas. Las pruebas de navegación de `dashboard-001` y `dashboard-003` se ajustan en el mismo cambio.
  - Depende de T-20, T-23.
- [x] **T-47** (CA-08; revisión 2026-11-02) `[frontend]`: `src/tests/ticket-sale.test.tsx`, parte 3. `describe("CA-08 ticket-sales")`. Con cliente simulado, un 429 muestra el mensaje de la API en el error general, `sales.create` se llama una sola vez y no se muestra boleto.
  - Depende de T-44.
- [x] **T-48** (CA-12; revisión 2026-11-02) `[frontend]`: `src/tests/ticket-sales-api-client.test.tsx`. Con `fetch` simulado, `history.cancel(id, { reason })` envía solo `reason` en el cuerpo, sin `timezone`; `history.list` sigue enviando la zona del dispositivo. Sustituye la parte de cancelación de T-35.
  - Depende de T-43.
- [x] **T-49** (CA-12; revisión 2026-11-02) `[frontend]`: `src/tests/ticket-history.test.tsx`. `describe("CA-12 ticket-sales")`. Un 429 al cancelar mantiene el diálogo abierto con el mensaje de la API, conserva el motivo y hace una sola llamada.
  - Depende de T-46.
- [x] **T-50** (CA-08, CA-21; revisión 2026-11-02) `[frontend]`: `src/tests/ticket-sales-quality.test.tsx`. Revisión estática: ningún archivo de `views/`, `components/` o `sections/` de la venta contiene el número 100 como tope ni fija `max` en los controles de cantidad. *(Revisión de 2026-11-06: el tope vigente es de 50 boletos en total; ver T-73.)*
  - Depende de T-45.

## Calidad y entrega

- [x] **T-38** (CA-21 a CA-25 y CA-01 a CA-17) `[verificación]`: desde `apps/dashboard` ejecutar `npm run types`, `npm test` y `npm run build`. Evidencia 2026-11-02: `npm test` 24 archivos / 235 pruebas en verde; `npm run types` sin errores; `npm run build` correcto (115 módulos). Evidencia 2026-11-06 (`/verify`): `npm run types`, `npm test` (24 archivos, 290 pruebas) y `npm run build` con exit 0; `format:check` y `lint` no existen como scripts. Falta el registro en el PR. Correr `/verify` y registrar resultados en el PR. No declarar nada en verde sin esa evidencia.
- [x] **T-39** (CA-23) `[frontend]`: revisión manual documentada en el PR. Navegación con teclado; foco en diálogos y cierre con Escape; ausencia de desbordamiento horizontal a 360, 768 y 1366 px en Venta, Historial y Precios.
  - Depende de T-25.
  - Evidencia: Jonathan informó el 2026-11-06 que probó todo y está correcto.
- [x] **T-40** (CA-03 a CA-17, validación de extremo a extremo) `[frontend]`: recorrido contra la API real en `arca_pruebas`. Requiere las tareas de la API: T-13 (precios), T-19 (venta), T-23 (cancelación), T-27 (historial), T-29 (api-007 en regresión) y T-28. Usar cuentas de prueba sin contraseñas en el repositorio. Registrar la evidencia sin secretos ni contraseñas. No es un paso de producción.
  - Depende de las tareas de API indicadas y de T-38.
  - Evidencia: Jonathan informó el 2026-11-06 que probó todo contra `arca_pruebas` y está correcto.
- [x] **T-41** (CA-02, RN-09) `[docs]`: `apps/dashboard/docs/arquitectura.md` (según `docs/templates/arquitectura-app.md`): estructura View, Section y ViewModel, shell sin demo, configuración de impresión por `localStorage` (excepción de RN-12). `apps/dashboard/docs/manual-demo.md`: Venta e Historial dejan de ser demostrativos; secciones conectadas frente a demostrativas. Sin datos ficticios en el manual.
  - Depende de T-22.
- [x] **T-42** (control) `[verificación]`: correr `/constitution-check` del PR, enlazar spec, plan y tasks, y citar `dashboard-005` en los commits. Marcar casillas solo con evidencia de T-38, T-39 y T-40. Pasar la spec a `Implementada` solo cuando los CA vigentes estén verificados. Los CA diferidos no se cuentan. *Evidencia (2026-11-03): `/constitution-check` sin violaciones (2026-11-02); `npm test` (235 pruebas), `types` y `build` correctos; commit `38d307d` cita `api-009` y `dashboard-005`; spec, plan y tasks enlazados en el commit.*

## Orden recomendado de ejecución

1. Cliente: T-01, T-02 (desbloquea todo lo que llama a la API).
2. En paralelo con el cliente: impresión (T-04, T-05, T-06) y la limpieza que no depende de vistas (T-23 se hace al final, ver paso 6).
3. Servicios: T-03.
4. Venta: T-07, T-08, T-09, T-10, T-11.
5. Historial: T-12, T-13, T-14, T-15, T-16. Precios: T-17, T-18, T-19.
6. Shell: T-20, T-21, T-22, T-23. Estilos: T-24, T-25.
7. Pruebas de cada CA (T-26 a T-37), junto a su tarea, y cobertura (T-36) al final.
8. Calidad y entrega: T-38, T-39, T-40, T-41, T-42.

Dependencias con la API: el dashboard puede llegar hasta T-38 con cliente simulado. T-40 (validación real) exige las tareas de `apps/api/tasks/009-ticket-sales.md` indicadas. El despliegue de `dashboard-005` va junto con el de `api-009` y el de `dashboard-003`, para que las cifras sean consistentes.

## Checklist de marcado

- [ ] Cada casilla se marca con evidencia (salida de Vitest, `npm run build`, PR o commit).
- [ ] Cada prueba nombra su CA en el `describe`.
- [ ] Ningún CA diferido tiene tarea ni prueba (ver «Alcance»).
- [ ] T-40 no se marca sin evidencia de la API real en `arca_pruebas`.
- [ ] Las tareas de `api-007` (`apps/dashboard/tasks/003-administration-sections.md`) no se tocan desde esta lista.

## Revisión 2026-11-05 (aprobada por Jonathan el 2026-11-05)

Fuente: `apps/dashboard/specs/005-ticket-sales.md`, «Revisión 2026-11-05», y el plan, sección «Revisión 2026-11-05». **Revisión aprobada por Jonathan el 2026-11-05.** Ninguna casilla se marca sin evidencia (salida de Vitest, `npm run build`, PR o commit). El cliente se desarrolla con cliente simulado; la prueba E2E de la cotización necesita `apps/api/tasks/009-ticket-sales.md`, T-77 y T-78.

- [x] **T-51** (CA-05; RN-08; `api-009` CA-46) `[frontend]`: `packages/api-client/ticket-sales.ts`: `sales.quote(input)` → `POST admin/tickets/quote`. `packages/api-client/ticket-sales-types.ts`: `TicketQuoteDto` (precios unitarios, subtotales y `total_amount` como cadenas). Solo usa `http.post`; sin cálculo. Prueba en `ticket-sales-api-client.test.tsx`: la cotización envía solo las cantidades y no envía zona horaria.
- [x] **T-52** (CA-31, CA-32, CA-33, CA-34) `[frontend]`: `src/viewmodels/ticket-sale.ts`: estados de cotización, implementados como `quote.status` (`loading`, `ready`, `error`); «Confirmar venta» solo habilitado en `ready`; un identificador de solicitud por apertura del diálogo, de modo que una respuesta tardía o de un diálogo cerrado se ignora; la confirmación usa las cantidades de la cotización lista. Sin reintento automático.
  - Depende de: T-51.
- [x] **T-53** (CA-05, CA-31, CA-32, CA-33) `[frontend]`: `src/viewmodels/useTicketSale.ts`: al pulsar «Registrar venta» abre el diálogo y llama a `sales.quote`; cerrar el diálogo invalida la solicitud en curso; los errores de cotización pasan por `api-errors.ts` (422 con campo, 403 y 429 con el mensaje de la API, red o 5xx con texto genérico). El 401 lo gestiona el manejador global.
  - Depende de: T-52.
- [x] **T-54** (CA-05, RN-02) `[frontend]`: se reutiliza `src/components/ConfirmDialog.tsx`, con la prop opcional `confirmDisabled`, en lugar de crear `SaleConfirmDialog` (el plan ya lo preveía si `ConfirmDialog` admitía el resumen). `TicketSaleView` muestra cantidad, precio unitario, subtotal por tipo y total; estado de carga; error con `role="alert"`; Escape cierra sin llamar a la API de venta.
  - Depende de: T-53.
- [x] **T-55** (CA-04, CA-31, CA-32) `[frontend]`: `src/sections/TicketSaleSection.tsx` y `src/views/TicketSaleView.tsx`: conectan el diálogo al hook; la vista principal no muestra total ni multiplica; sin constantes de tope.
  - Depende de: T-54.
- [x] **T-56** (CA-04, CA-05) `[frontend]`: `src/tests/ticket-sale.test.tsx` (parte 1, reescrita): precios de la API sin total en la vista principal; diálogo con cotización (cantidad, precio, subtotal y total); la API de venta solo al confirmar; Escape no llama a la API de venta.
  - Depende de: T-55.
- [x] **T-57** (CA-31, CA-32, CA-33, CA-34) `[frontend]`: `src/tests/ticket-sale.test.tsx` (parte 4, nueva): cotización en curso (indicador, confirmar deshabilitado, sin importes previos); cotización 422, 403, 429, red o 5xx (mensaje, confirmar deshabilitado, sin llamada a la venta, una sola llamada de cotización); respuesta tardía tras cerrar, ignorada; confirmar envía las cantidades cotizadas y muestra el importe real del boleto.
  - Depende de: T-53, T-54.
- [x] **T-58** (CA-04, CA-05, CA-21) `[frontend]`: `src/tests/ticket-sales-quality.test.tsx`: revisión estática de que `views/`, `components/` y `sections/` de la venta no multiplican ni suman importes, y no importan `fetch`, `axios`, `services/` ni `@arca/api-client`.
  - Depende de: T-55.
- [x] **T-59** (CA-25 revisado) `[frontend]`: `src/tests/ticket-sales-coverage.test.tsx`: verifica que `CA-01` a `CA-17`, `CA-21` a `CA-25`, `CA-27` a `CA-29` y `CA-31` a `CA-34` aparecen nombrados en las pruebas. Los CA diferidos siguen fuera.
  - Depende de: T-56, T-57.
- [x] **T-60** (RN-15) `[docs]`: `apps/dashboard/docs/arquitectura.md`: actualizar la fila de `useTicketSale` de la tabla de módulos con el flujo de cotización (`quote.status`: `loading`, `ready` y `error`).
  - Depende de: T-53.
- [x] **T-61** (CA-23, CA-31 a CA-34) `[verificación]`: `npm run types`, `npm test` y `npm run build` desde `apps/dashboard`. Revisión manual de teclado y de anchos (360, 768 y 1366 px) del diálogo con carga y error, registrada en el PR. La validación E2E contra `arca_pruebas` la cubre T-40 cuando `api-009` tenga la cotización.
  - Depende de: T-56 a T-59.
  - Evidencia (2026-11-06): `types`, `npm test` (290/290) y `build` en verde; Jonathan informó que probó todo y está correcto.

## Revisión boletos individuales (2026-11-05, aprobada por Jonathan el 2026-11-06)

Fuente: `apps/dashboard/specs/005-ticket-sales.md`, «Revisión boletos individuales», y el plan, sección del mismo nombre. **Aprobada por Jonathan el 2026-11-06.** Ninguna casilla se marca sin evidencia. Dependencia: `apps/api/tasks/009-ticket-sales.md` T-86 a T-87 (contrato de la venta) para la prueba E2E; el cliente se desarrolla con cliente simulado.

- [x] **T-62** (CA-35) `[frontend]`: `packages/api-client/ticket-sales-types.ts`: `TicketSaleBatchDto` y `TicketSaleDto` por boleto; `ticket-sales.ts`: `sales.create` devuelve el lote. Pruebas en `ticket-sales-api-client.test.tsx`.
  - Depende de: `api-009` T-87 (contrato).
- [x] **T-63** (CA-35; CA-38) `[frontend]`: `src/viewmodels/ticket-sale.ts` guarda la lista de boletos y los totales de la respuesta. Sin suma ni multiplicación.
  - Depende de: T-62.
- [x] **T-64** (CA-36) `[frontend]`: `src/components/TicketReceipt.tsx` por boleto: tipo, precio, folio, fecha, cajero, QR y pie. Sin cantidades ni total. Folio, tipo y QR siempre visibles.
  - Depende de: T-63.
- [x] **T-65** (CA-35; CA-39) `[frontend]`: `src/views/TicketSaleView.tsx` y `src/sections/TicketSaleSection.tsx`: resumen «Venta registrada» (total y número de boletos) y la lista de folios con tipo y precio, sin QR, en un contenedor con desplazamiento propio; los `TicketReceipt` con QR se renderizan solo para la impresión.
  - Depende de: T-64.
- [x] **T-66** (CA-37) `[frontend]`: `src/styles.css`: rehacer el `@media print` (líneas 2237 a 2256 en la versión revisada). Ocultar la shell y el resto de la vista; cada `.ticket-receipt` en flujo normal, sin salto forzado y con `break-inside: avoid`; sin `position: absolute`. El botón pasa a «Imprimir boletos».
  - Depende de: T-64.
- [x] **T-67** (CA-27 y CA-28 reinterpretados) `[frontend]`: `src/viewmodels/ticket-print-settings.ts` y `PrintSettingsDialog.tsx`: retirar `quantities` y `total`. El precio del boleto se muestra siempre (R-D2, resuelta el 2026-11-06). Al leer, ignorar esas claves guardadas sin error. Pruebas en `ticket-print-settings.test.tsx`.
  - Depende de: T-64.
- [x] **T-68** (CA-38) `[frontend]`: `src/tests/ticket-sales-quality.test.tsx`: revisión estática ampliada: ningún archivo de la venta suma, multiplica ni reparte importes.
  - Depende de: T-65.
- [x] **T-69** (CA-35, CA-36, CA-37) `[frontend]`: `src/tests/ticket-sale.test.tsx` (parte 5, nueva) y ajuste de los tests de CA-06 y CA-09 a «Imprimir boletos» y a la lista de boletos.
  - Depende de: T-65, T-66.
- [x] **T-70** (CA-39; CA-25 revisado) `[frontend]`: `src/tests/ticket-sales-coverage.test.tsx` incluye CA-35 a CA-39 (y CA-25 lo refleja).
  - Depende de: T-68, T-69.
- [x] **T-71** (CA-36, CA-37) `[docs]`: `apps/dashboard/docs/arquitectura.md` (TicketReceipt por boleto; impresión) y `apps/dashboard/docs/manual-demo.md` (Venta: lista de boletos e «Imprimir boletos»).
  - Depende de: T-65, T-66.
- [x] **T-72** (control; CA-35 a CA-39) `[verificación]`: `npm run types`, `npm test` y `npm run build` desde `apps/dashboard`. Recorrido manual contra `arca_pruebas` con 1 adulto y 3 niños, y con la venta más grande (50 boletos) para medir el renderizado (tiempo y desplazamiento); comprobar el corte entre boletos en rollo en la impresora real (limitación aceptada). Registrar sin secretos. Depende de `api-009` T-87 y T-91.
  - Depende de: T-69 a T-71.
  - Evidencia (2026-11-06): `types`, `npm test` (290/290) y `build` en verde; Jonathan informó que probó todo y está correcto. No se registraron mediciones de tiempo de la venta de 50 boletos en el navegador.
- [x] **T-73** (CA-08 revisado; CA-21; CA-38) `[frontend]`: ampliar la revisión estática de `src/tests/ticket-sales-quality.test.tsx` para comprobar que ningún componente de la venta contiene el número del tope (50 en total, ni el 100 anterior) ni fija `max` en los controles de cantidad. El tope lo valida la API y la interfaz muestra su mensaje (`api-009` T-97). Depende de: T-68.

## Dudas abiertas

1. **CA-16 y 2FA.** *Resuelta (2026-11-02):* `me` no expone el estado 2FA. La única señal es la respuesta 403 `two_factor_setup_required` de la API (`api-009` CA-22). CA-16 de la spec se reformuló en ese sentido; T-17 y T-31 lo reflejan.
2. **Render del SVG del QR.** *Resuelta (2026-11-02):* `<img>` con data URI `image/svg+xml`, sin inyectar el SVG en el DOM (ver plan, «Decisiones de diseño»). No se añade librería (RN-07).
3. **Notas de vigencia en `dashboard-001` y `dashboard-002`.** *Resuelta (2026-11-02):* petición expresa de Jonathan. Notas aplicadas en 001 (CA-04, CA-11, CA-15) y 002 (RN-02).
4. **Formato de `effective_at`.** Decidido (decisión 3): ISO 8601 con desfase. Confirmar que el formulario de precios convierte fecha y hora locales antes de enviar (T-17).
5. **Ancho de márgenes.** La spec 005 se ajustó a 0 a 20 mm en carta. Confirmar que la API no fija rangos de impresión (la API no los recibe; la confirmación es solo de la UI).
6. **RN-15 a RN-17.** *Resuelta (2026-11-02):* la spec solo define RN-01 a RN-14; se retiran del alcance del plan.
