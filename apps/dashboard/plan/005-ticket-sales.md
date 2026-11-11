# Plan técnico · 005 · ticket-sales

- Spec: `apps/dashboard/specs/005-ticket-sales.md`
- Estado de spec: Aprobada (revisión aprobada por Jonathan el 2026-11-05 y revisión de boletos individuales aprobada por Jonathan el 2026-11-06; estado previo: Aprobada, Jonathan, 2026-11-02)
- Responsable técnico: Jonathan (frontend)
- Contrato que consume: `apps/api/specs/009-ticket-sales.md` y su plan `apps/api/plan/009-ticket-sales.md` (endpoints `admin.tickets.*` y `admin.ticket-prices.*`)
- Estado del plan: Aprobado — Jonathan, 2026-11-02; revisión de 2026-11-05 aprobada (sección «Revisión 2026-11-05»). Aprobación de 2026-11-02 (aprueba la solución, el Constitution Check y las decisiones de márgenes por defecto y de formato de `effective_at` de la sección «Decisiones de aprobación»; revisión de 2026-11-02 de la cancelación sin `timezone` y de los errores 429 y del tope, sin cambio de CA)
- Alcance de este plan: CA y RN **vigentes** (CA-01 a CA-17, CA-21 a CA-25, CA-27 a CA-29; RN-01 a RN-03, RN-05 a RN-10, RN-12, RN-13; y, aprobadas el 2026-11-05, CA-31 a CA-34 y RN-15; y, aprobadas el 2026-11-06, CA-35 a CA-39 y RN-16). Excluidos por diferimiento (decisión 2026-11-02): CA-18, CA-19, CA-20, CA-26, CA-30; RN-04, RN-11, RN-14; centro de notificaciones, modal de acuse, polling y texto de correo.

## Revisión 2026-11-05 (aprobada por Jonathan el 2026-11-05)

Decisión de Jonathan del 2026-11-05, sobre el plan aprobado el 2026-11-02. **Aprobada por Jonathan el 2026-11-05.** Las tareas son T-51 a T-61 en `tasks/005-ticket-sales.md`.

- **Cotización en el cliente.** `packages/api-client/ticket-sales.ts` añade `sales.quote(input)` → `POST admin/tickets/quote`, con el tipo `TicketQuoteDto` en `ticket-sales-types.ts` (precios unitarios, subtotales y `total_amount`, todos como cadenas). Usa solo `http.post`. No calcula nada.
- **Estados de la venta.** `ticket-sale.ts` pasa de `idle → confirming → submitting → done | error` a `idle → quoting → quoted → submitting → done`, con `quoteError` como salida de error de la cotización. Al cerrar el diálogo vuelve a `idle`. «Confirmar venta» solo está habilitado en `quoted` (CA-31, CA-32). Implementado como `quote.status` (`loading`, `ready`, `error`) junto a los pasos existentes.
- **Respuestas tardías.** Cada apertura del diálogo crea un identificador de solicitud. Una respuesta de cotización se aplica solo si coincide con el identificador vigente y el diálogo sigue abierto; si no, se ignora (CA-33). Cerrar el diálogo invalida el identificador.
- **Confirmar con lo cotizado.** La llamada de venta usa las cantidades guardadas en el estado `quoted`, no las del formulario en ese momento (CA-34).
- **Diálogo.** `ConfirmDialog`, con la prop opcional `confirmDisabled`; `TicketSaleView` pinta el resultado de la cotización: cantidad, precio unitario, subtotal por tipo y total (CA-05). La vista no multiplica ni suma.
- **Sin reintento automático** (CA-32). Para recuperarse de un fallo, el cajero cancela el diálogo y vuelve a pulsar «Registrar venta» (pregunta 9 de la spec, resuelta).
- **Cambios de CA:** CA-04 y CA-05 reescritos; CA-31 a CA-34 nuevos. Sin cambio en el resto.

## Decisiones de aprobación (2026-11-02)

Aprobado por Jonathan el 2026-11-02. Cierran las preguntas abiertas del borrador:

- **Márgenes de impresión por defecto (decisión 2):** térmica 2 mm; carta 15 mm. El rango de márgenes es de 0 a 10 mm en térmica y de 0 a 20 mm en carta. Como 15 mm excedía el rango de 0 a 10 mm de la spec, la spec 005 se ajustó el 2026-11-02 (CA-27 y «Decisiones cerradas», pregunta 7) y se anotó como revisión.
- **Formato de `effective_at` (decisión 3):** el cliente convierte la fecha y hora locales a instante con su desfase y lo envía en ISO 8601 (con desfase u `Z`). La API guarda en UTC (`apps/api/plan/009-ticket-sales.md`, «Decisiones de aprobación»).

## Diseño de solución

Patrón MVVM explícito, igual que `dashboard-003`:

```
View (props, sin lógica) ← Section (contenedor delgado) ← hook ViewModel → reducer y funciones puras → @arca/api-client → API
```

- **View** (`src/views/*View.tsx`): solo recibe estado y manejadores por props y pinta con `@arca/ui`. No importa `services/` ni `@arca/api-client`.
- **Section** (`src/sections/*Section.tsx`): llama al hook y entrega el resultado a la View. Cada sección carga sus datos solo al abrirse.
- **ViewModel** (`src/viewmodels/<tema>.ts`): tipos de estado, reducer y funciones asíncronas que reciben el cliente como parámetro (`submitSale(api, dispatch, input)`), probadas con un cliente simulado.
- **Hook** (`src/viewmodels/use<Tema>.ts`): une el reducer con `adminApi` de `services/arca-api.ts`.

La API decide precios, totales, `cancellable` y alcance (RN-02). El cliente no multiplica, no calcula el día de cancelación y no decide permisos (CA-21).

### Revisión de 2026-11-02 (`api-009` revisada, aprobada por Jonathan)

- **Cancelación sin zona.** `history.cancel(id, { reason })` no envía `timezone`: la API fija la zona del zoológico (`api-009` RN-16). Cambia la sección «Cliente de venta» de este plan, el contrato y el mapeo de CA-12 y del cliente. El `timezone` de `history.list` no cambia.
- **Errores 429 y tope.** Un 429 (límite de frecuencia de `api-009` RN-30) y un 422 del tope de 50 boletos en total (`api-009` CA-42, aprobado el 2026-11-06) se muestran con el mensaje de la API. La venta no reintenta; la cancelación tampoco. El cliente no contiene el número del tope ni límites de frecuencia.
- **Sin cambio de CA.** Siguen 25 CA vigentes; CA-08 y CA-12 añaden su caso de error. Las tareas nuevas son T-43 a T-50 en `apps/dashboard/tasks/005-ticket-sales.md`.

### Decisiones de diseño

- **Navegación por permisos, no por perfil de demo.** `navigation.ts` deja de depender de `profile.home` para las secciones de taquilla: «Venta» con `tickets.create`, «Historial» con `tickets.view`, «Precios» con `ticket-prices.manage` (CA-01). Un `admin` con `tickets.view` y `ticket-prices.manage` ve Historial y Precios, no Venta.
- **Shell sin demo.** `viewmodels/dashboard-demo.ts` y `useDashboardDemo.ts` (estado de demo, `saleStep` ficticio y perfil `ticket`) se sustituyen por `viewmodels/dashboard-shell.ts` y `useDashboardShell.ts`, que solo guardan sección activa, menú móvil y aviso. La venta y su estado viven en `ticket-sale.ts`. Sin ese cambio, `App.tsx` seguiría mostrando datos demostrativos.
- **Cliente de venta.** `packages/api-client/ticket-sales.ts` exporta `createTicketSalesApi(http, options?)` con `options.deviceTimeZone` (mismo patrón que `createAdminApi`, `dashboard-003` RN-11). Usa solo `http.get` y `http.post` existentes; no añade métodos a `http.ts`. Métodos: `sales.quote(input)` (revisión de 2026-11-05), `sales.create(input)`, `history.list(query)`, `history.cancel(id, { reason })`, `prices.current()`, `prices.schedule(input)`. `timezone` se envía solo en `history.list` (presentación y filtros); la cancelación no lo envía porque la API fija la zona del zoológico (revisión de 2026-11-02, `api-009` RN-16). La zona la obtiene el paquete, no la vista.
- **Tipos DTO.** `packages/api-client/ticket-sales-types.ts`: `TicketSaleInput`, `TicketSaleDto` (con `qr_svg`), `TicketHistoryRowDto` (sin `qr_code`/`qr_svg`), `TicketHistoryQuery`, `TicketPriceCurrentDto`, `TicketPriceScheduleInput`. Importes como cadena; nunca se suman en el cliente.
- **Fechas.** `purchased_at`, `cancelled_at` y `effective_at` llegan en ISO 8601 UTC. `ticket-history.ts` tiene un formateador propio `formatTicketDateTime(iso, timeZone)` con `Intl.DateTimeFormat` en `dd/mm/aaaa HH:mm` (CA-13). No se reutiliza `formatDateTime` de `formatters.ts`, que trata el formato `Y-m-d H:i:s` de los reportes.
- **Fecha programada.** El formulario de precios convierte la fecha y hora locales a instante con su desfase antes de enviar (`effective_at` ISO 8601 con offset). Es conversión de entrada, no regla de negocio. La API valida que sea futura (`api-009` CA-20). Formato decidido el 2026-11-02 (decisión 3 de `api-009`): ISO 8601 con desfase.
- **Venta: total y estado.** `ticket-sale.ts` mantiene `saleStep` (`idle` → `confirming` → `submitting` → `done` | `error`; revisión de 2026-11-05: `idle` → `quoting` → `quoted` → `submitting` → `done`, con `quoteError`). Mientras `submitting`, los controles se deshabilitan y un segundo envío se ignora en el reducer (CA-07). Un fallo de red o 5xx no reintenta; muestra el texto que remite al Historial (CA-08).
- **Impresión.** Botón «Imprimir boleto» → prop `onPrint` → hook llama a `printer.print()` (inyectable: por defecto `window.print`). Las views no tocan `window`.
- **Configuración de impresión.** `viewmodels/ticket-print-settings.ts`: funciones puras `parseTicketPrintSettings(raw: unknown)` (valida campo a campo y rellena defaults; CA-28), `serializeTicketPrintSettings`, y un adaptador `storage` inyectable que envuelve `localStorage` en `try/catch`. Clave `arca:ticket-print-settings`. `useTicketPrintSettings.ts` lee al montar y escribe al cambiar. Pura y probable sin navegador.
- **Valores por defecto de impresión.** Formato «Térmica 80 mm»; ancho 80 mm; fuente normal; campos todos activos; pie «Zoológico Nicolás Bravo, Tulancingo». Márgenes (decididos el 2026-11-02): térmica 2 mm por defecto, rango de 0 a 10 mm; carta 15 mm por defecto, rango de 0 a 20 mm (la spec 005 se ajustó para carta).
- **Impresión y tokens.** `styles.css` añade un bloque «ticket-sales» con tokens semánticos (`@arca/tokens`) y `@media print`: oculta la shell y el resto de la vista, deja visible solo `.ticket-receipt` con el formato y márgenes de la configuración (variables CSS `--ticket-width`, `--ticket-margin`, `--ticket-font`).
- **Diálogos.** `@arca/ui` `Dialog` (`<dialog>` con `showModal()`, foco atrapado y Escape nativos, `dashboard-003` CA-16). Confirmación de venta reutiliza `ConfirmDialog` si admite resumen; si no, `components/SaleConfirmDialog.tsx`. Cancelación: `components/CancelTicketDialog.tsx` con campo «Motivo» obligatorio.
- **Errores.** `api-errors.ts` de `dashboard-003` (`ApiError` → `{ message, fieldErrors, unauthorized, forbidden, notFound }`). 401 lo maneja el manejador global de sesión (CA-22); los hooks nuevos no lo duplican.
- **Sin nueva dependencia (RN-07).** No se añade librería de QR ni de impresión.
- **Render del QR (decisión de 2026-11-02, duda 2 de las tasks).** `TicketReceipt` muestra el QR con un `<img>` cuyo `src` es un data URI `image/svg+xml` construido con el `qr_svg` que entrega la API. El SVG no se inyecta en el DOM. El `<img>` lleva texto alternativo en español. No añade librería (RN-07).

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| `packages/api-client` | `ticket-sales.ts` (nuevo: `createTicketSalesApi`), `ticket-sales-types.ts` (nuevo), `index.ts` (exporta), `README.md` (sección de ventas) | Contrato tipado de `api-009`; sin lógica de negocio |
| Servicios | `src/services/arca-api.ts` (exporta `ticketSalesApi`), `src/services/printer.ts` (nuevo: `print()` inyectable) | Instancia compartida y acceso a impresión |
| ViewModels base | `src/viewmodels/ticket-errors` reutiliza `api-errors.ts` (sin archivo nuevo) | Errores unificados |
| ViewModels nuevos | `ticket-sale.ts` + `useTicketSale.ts`; `ticket-history.ts` + `useTicketHistory.ts`; `ticket-prices.ts` + `useTicketPrices.ts`; `ticket-print-settings.ts` + `useTicketPrintSettings.ts`; `dashboard-shell.ts` + `useDashboardShell.ts` | Estado, reducers, llamadas, configuración local y shell |
| ViewModels a retirar | `dashboard-demo.ts`, `useDashboardDemo.ts` | Sustituidos por `dashboard-shell.ts` (sin demo) |
| Navegación | `navigation.ts` (permisos para Venta, Historial y Precios; sin perfil `ticket` demostrativo) | CA-01 |
| Secciones nuevas | `src/sections/TicketSaleSection.tsx`, `TicketHistorySection.tsx`, `TicketPricesSection.tsx` | Contenedores que llaman al hook |
| Views | `src/views/TicketSaleView.tsx` (reemplaza), `TicketHistoryView.tsx` (reemplaza), `TicketPricesView.tsx` (nueva) | Presentación con props |
| Componentes | `src/components/TicketReceipt.tsx` (boleto con formato, folio y QR siempre visibles), `PrintSettingsDialog.tsx`, `CancelTicketDialog.tsx`, `SaleConfirmDialog.tsx` (si `ConfirmDialog` no sirve) | Piezas de venta e impresión |
| Shell | `src/App.tsx` (quita `DemoBanner` y `useDashboardDemo`; rutea `tickets`, `ticket-history`, `ticket-prices` con sus secciones; navegación por permisos) | CA-01, CA-02 |
| Estilos | `src/styles.css` (bloque ticket-sales con tokens y `@media print`) | CA-23, CA-24, CA-29 |
| Componente a retirar | `src/components/DemoBanner.tsx` | CA-02 |
| Datos de muestra | `src/data/demo-data.ts`: se eliminan los datos de venta e historial | Sin datos ficticios |
| Pruebas | `src/tests/ticket-sale.test.tsx` y `ticket-history.test.tsx` (reescritas), `global-demo-banner.test.tsx` (reescrita para CA-02), `ticket-prices.test.tsx`, `ticket-print-settings.test.tsx`, `ticket-sales-api-client.test.tsx`, `ticket-sales-coverage.test.tsx`, `ticket-sales-quality.test.tsx` | Un test por CA |
| Pruebas ajustadas | `administration-navigation.test.tsx`, `real-staff-login.test.tsx` (listas de navegación de admin y cajero; `real-staff-login` lee `demo-data.ts`), `acceptance-coverage.test.tsx` (lista de archivos), `responsive.test.tsx` si referencia las vistas viejas | Coherencia con el nuevo shell |
| Documentación | `apps/dashboard/docs/arquitectura.md` (según `docs/templates/arquitectura-app.md`) y nota de vigencia en `specs/001`, `002` (RN-02) y `003` (CA-02, actores de Venta e Historial) | Referencia vigente; las notas en `001` y `002` se aplicaron el 2026-11-02 por petición expresa |

Los componentes compartidos existentes (`SalesTotals`, `DataTable`, `PaginationBar`, `ConfirmDialog`, `FieldErrors`) se reutilizan sin cambios de contrato. `SalesTotals` solo muestra totales de `api-007`.

## Contrato y datos

### Cliente (`@arca/api-client`)

- `createTicketSalesApi(http, options?)`; `options.deviceTimeZone` por defecto `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- `sales.create(input)` → `POST admin/tickets`.
- `sales.quote(input)` → `POST admin/tickets/quote` (revisión de 2026-11-05).
- `history.list(query)` → `GET admin/tickets` con `folio`, `status`, `from`, `to`, `page`, `timezone`.
- `history.cancel(id, { reason })` → `POST admin/tickets/{id}/cancel` (revisión de 2026-11-02: sin `timezone`).
- `prices.current()` → `GET admin/ticket-prices/current`.
- `prices.schedule(input)` → `POST admin/ticket-prices`.
- Compatibilidad: solo se agregan exports; `createAdminApi`, `createAuthApi`, `createVisitorApi` y `http.ts` no cambian, así que `apps/pwa` y `apps/mobile` no se ven afectados.

### ViewModels por sección

| Hook | Estados | Operaciones |
|---|---|---|
| `useTicketSale` | `idle`, `confirming`, `quoting`, `quoted`, `quoteError`, `submitting`, `done`, `error`; cantidades; cotización; boleto; errores por campo | editar cantidades, confirmar, nueva venta, imprimir |
| `useTicketHistory` | `loading`, `ready`, `empty`, `error`; filtros; página; diálogo de cancelación | consultar con filtros, paginar, cancelar con motivo |
| `useTicketPrices` | `loading`, `ready`, `error`; formulario; `twoFactorRequired` | cargar vigente y próximo, programar o aplicar ahora (con confirmación previa) |
| `useTicketPrintSettings` | configuración validada | leer al montar, escribir al cambiar, restablecer |
| `useDashboardShell` | sección activa, menú móvil, aviso | navegar (validando permisos de la lista recibida), abrir y cerrar menú |

Reglas comunes: 403, 404 y 422 se muestran en la propia vista sin cambiar la lista; 422 por campo junto al control; `two_factor_setup_required` muestra el mensaje de 2FA (CA-16 de `dashboard-003` flow); la venta nunca se reintenta automáticamente.

### Vistas y reglas de interfaz

- **Venta** (CA-03 a CA-09): campos «Adultos» y «Niños» (enteros ≥ 0), botón «Registrar venta» deshabilitado si ambos son cero; precios unitarios que devuelve la API (CA-04), sin total en la vista principal; diálogo de confirmación con cantidades, precios, subtotales y total de la cotización (CA-05, CA-31 a CA-34); boleto con `TicketReceipt`; «Imprimir boleto»; «Configurar impresión» (solo `cashier`); «Nueva venta».
- **Historial** (CA-10 a CA-13): tabla con folio, fecha y hora local, cantidades, total, estado y motivo; filtros por folio, estado y rango (consulta a la API); botón «Cancelar» solo si `cancellable`; diálogo con «Motivo» obligatorio.
- **Precios** (CA-14 a CA-17): precio vigente y próximo programado (CA-17 de `api-009`); formulario con montos, «Aplicar ahora» o «Programar», fecha y hora solo si se programa; diálogo de confirmación; aviso accesible tras éxito; sin texto de correo (diferido).
- **Impresión** (CA-27 a CA-29): formato, ancho (solo térmica), fuente, márgenes (térmica 0 a 10 mm; carta 0 a 20 mm), campos (folio y QR fijos), pie (máx. 80 caracteres); etiquetas en español; teclado.

## Seguridad, offline y operación

- Autenticación por cookie Sanctum ya resuelta en `createHttpClient`; sin tokens en `localStorage`.
- `localStorage` solo para la preferencia de impresión (RN-12). Ninguna venta, boleto, precio, historial, token ni SVG se guarda en el navegador.
- Sin datos personales en la preferencia.
- Sin modo offline: si la API no responde, la venta no se presenta como hecha (`dashboard-005` flujo 6).
- Los datos de venta solo viven en el estado de la sección abierta.

## Mapeo de criterios a pruebas

Convención: `describe("CA-NN ticket-sales", …)`. Vitest en `apps/dashboard/src/tests/`. Los ViewModels se prueban con `AdminApi`-like simulado (`vi.fn`); las Views con `renderToStaticMarkup`.

| Criterio | Prueba automatizada | Ubicación |
|---|---|---|
| CA-01 | Navegación: «Venta» solo con `tickets.create`; «Historial» con `tickets.view`; «Precios» con `ticket-prices.manage`; admin sin Venta | `administration-navigation.test.tsx` (ajustado) y `ticket-sales-navigation`, incluido en `ticket-sales-coverage.test.tsx` |
| CA-02 | Venta e Historial no renderizan aviso de demo ni datos ficticios; `App` sin `DemoBanner` | `global-demo-banner.test.tsx` (reescrito) |
| CA-03 | Campos numéricos con etiquetas; botón deshabilitado con ambos en cero | `ticket-sale.test.tsx` |
| CA-04 (revisión 2026-11-05) | Muestra precios de la API; la vista principal no calcula ni muestra total; el total solo aparece en el diálogo, con la cotización | `ticket-sale.test.tsx` (T-56) |
| CA-05 (revisión 2026-11-05) | El diálogo pide la cotización con las mismas cantidades y muestra cantidad, precio, subtotal y total; la API de venta solo al confirmar; Escape no llama a la API de venta | `ticket-sale.test.tsx` (T-56) |
| CA-06 | Boleto con folio, QR y configuración; «Imprimir boleto» llama al `printer` simulado | `ticket-sale.test.tsx` |
| CA-07 | Controles deshabilitados en `submitting`; segundo envío ignorado | `ticket-sale.test.tsx` |
| CA-08 | 422 por campo; 403 con mensaje de API; red o 5xx con texto de Historial sin reintento y sin boleto; 429 con mensaje de API sin reintento (revisión 2026-11-02); tope de 50 boletos en total llega como 422 sin constante en el cliente (revisión 2026-11-06) | `ticket-sale.test.tsx` (T-47 para el 429; T-50 para el tope) |
| CA-09 | «Nueva venta» limpia el formulario y vuelve a `idle` | `ticket-sale.test.tsx` |
| CA-10 | Lista con folio, fecha local, cantidades, total, estado y motivo; estados de carga, vacío y error con `role="alert"` | `ticket-history.test.tsx` |
| CA-11 | Filtros disparan consulta a la API con parámetros; no filtra en cliente | `ticket-history.test.tsx` |
| CA-12 | Acción solo con `cancellable`; motivo vacío no llama a la API; 422 se muestra en el diálogo; 429 se muestra en el diálogo sin reintento (revisión 2026-11-02); cancelación sin `timezone` | `ticket-history.test.tsx` (T-49); `ticket-sales-api-client.test.tsx` (T-48) |
| CA-13 | `formatTicketDateTime` convierte UTC a zona del dispositivo en `dd/mm/aaaa HH:mm` | `ticket-history.test.tsx` |
| CA-14 | Sección Precios visible solo con `ticket-prices.manage`; muestra vigente de la API | `ticket-prices.test.tsx` |
| CA-15 | Formulario con modo y fecha condicional; 422 por campo; confirmación nombra montos y vigencia | `ticket-prices.test.tsx` |
| CA-16 | 403 `two_factor_setup_required` muestra el mensaje de 2FA; la API responde 403 sin 2FA confirmado y el cliente no consulta el estado 2FA (`me` no lo expone) | `ticket-prices.test.tsx` |
| CA-17 | Tras 201, refresca el vigente y muestra aviso accesible de la sección; muestra próximo programado | `ticket-prices.test.tsx` |
| CA-21 | Ningún archivo de `views/`, `components/` o `sections/` importa `fetch`, `axios` ni `services/`; ninguno calcula totales ni permisos ni contiene el número del tope ni fija `max` en los controles de cantidad (revisión 2026-11-02) | `ticket-sales-quality.test.tsx` (T-50) |
| CA-22 | 401 en secciones nuevas dispara el manejador global y «Tu sesión expiró» | `ticket-sales-quality.test.tsx` |
| CA-23 | Marcado de diálogos con `aria-labelledby`, tablas con contenedor desplazable, `role="alert"`/`status`; el teclado y los anchos 360 a 1366 px se revisan a mano y se documentan en el PR | `ticket-sales-quality.test.tsx` + revisión manual |
| CA-24 | Hojas de estilo nuevas sin hex de marca (escaneo del bloque `ticket-sales`) y modo impresión con tokens | `ticket-sales-quality.test.tsx` |
| CA-25 | Cobertura: busca `CA-01` a `CA-17`, `CA-21` a `CA-25`, `CA-27` a `CA-29` y, con la revisión de 2026-11-05, `CA-31` a `CA-34` en las pruebas | `ticket-sales-coverage.test.tsx` (T-59) |
| CA-27 | Configuración con formato, ancho (solo térmica), fuente, márgenes (térmica 0 a 10 mm; carta 0 a 20 mm; defaults 2 y 15 mm), campos, pie ≤ 80 caracteres y pie predeterminado «Zoológico Nicolás Bravo, Tulancingo» | `ticket-print-settings.test.tsx` |
| CA-28 | Guarda en `arca:ticket-print-settings`; `localStorage` lanza excepción → defaults sin error; JSON inválido → defaults; campo inválido → conserva los válidos | `ticket-print-settings.test.tsx` |
| CA-29 | Térmica y carta muestran folio y QR con todos los opcionales desactivados; cantidades, total y QR no cambian | `ticket-print-settings.test.tsx` |
| CA-31 (revisión 2026-11-05) | Diálogo con cotización en curso: indicador, «Confirmar venta» deshabilitado y sin importes de una cotización anterior | `ticket-sale.test.tsx` (T-57) |
| CA-32 (revisión 2026-11-05) | Cotización 422, 403, 429, red o 5xx: mensaje en el diálogo, confirmar deshabilitado, sin llamada a la API de venta y sin reintento automático | `ticket-sale.test.tsx` (T-57) |
| CA-33 (revisión 2026-11-05) | Respuesta de cotización tras cerrar el diálogo o de una solicitud anterior: se ignora | `ticket-sale.test.tsx` (T-57) |
| CA-34 (revisión 2026-11-05) | «Confirmar venta» envía las cantidades cotizadas; el boleto muestra el importe real que devuelve la API | `ticket-sale.test.tsx` (T-57) |

Cliente: `ticket-sales-api-client.test.tsx` prueba que `history.list` envía `timezone` del dispositivo y que el llamador puede sobrescribirlo; que `history.cancel` envía solo el motivo (revisión de 2026-11-02, T-48); y que la venta no envía zona (soporte de CA-13 y RN-16).

Los CA diferidos (CA-18 a CA-20, CA-26, CA-30) no tienen prueba en este plan.

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | React 19, TS, Vite 7 y Tailwind 4 vigentes; cero dependencias nuevas (RN-07). QR llega en SVG desde la API (ADR 0019, Aceptado). |
| II. La spec manda | Sí | Spec 005 Aprobada (2026-11-02); este plan, `apps/dashboard/tasks/005-ticket-sales.md` y el PR enlazan los tres artefactos. Tareas sin marcar. |
| III. Lógica separada de la interfaz | Sí | Precios, total, `cancellable`, permisos y día de cancelación viven en la API; el cliente solo presenta y convierte fechas de presentación y de entrada. Verificado por CA-21. |
| IV. Un test por criterio | Sí (plan) | Tabla de mapeo con un test por CA vigente; `ticket-sales-coverage.test.tsx` lo verifica. Pendiente de ejecución en verde. |
| V. Una sola fuente de verdad para los datos | Sí | Sin persistencia local salvo la preferencia de impresión (excepción acotada de `dashboard-005` RN-12). No toca esquema. Las excepciones de V de la feature (`api-009`) constan en ADR 0021 (`docs/adr/0021-ticket-sales-constitution-exceptions.md`); esta app no añade ninguna. |
| VI. Código en inglés, personas en español | Sí | Archivos, hooks y tipos en inglés; etiquetas, avisos y errores en español. |

## Riesgos y decisiones

- **ADR requerido:** ninguno nuevo para esta app. La excepción de `dashboard-005` RN-12 (localStorage) está en la spec aprobada.
- **Dependencia de `api-009`.** Hasta que existan los endpoints, todo se desarrolla y prueba con cliente simulado (RN-08). La validación de extremo a extremo se hace contra `arca_pruebas` con `api-009` aplicada.
- **Formato de `effective_at` (decidido el 2026-11-02).** El cliente envía instante con desfase horario (decisión 3 de `api-009`).
- **Márgenes por defecto de impresión (decididos el 2026-11-02).** Térmica 2 mm y carta 15 mm (decisión 2). Rango de carta ampliado a 20 mm en la spec 005.
- **Pruebas de teclado y ancho.** No hay automatización de navegador en el repo; CA-23 se completa con revisión manual documentada en el PR (360, 768 y 1366 px).
- **Conflicto con `dashboard-003` CA-02.** La spec 003 (aprobada) exige el banner de demostración en Venta e Historial; `dashboard-005` CA-02 lo elimina. La 005 reemplaza esa parte; la nota de vigencia en 003 (CA-02) se aplicó el 2026-11-02, sin cambiar su estado ni otros CA.
- **Conflicto de navegación en tests existentes.** Las listas de navegación de `real-staff-login.test.tsx` y `administration-navigation.test.tsx` cambian (admin gana Historial y Precios). Se actualizan en el mismo cambio.
- **Equipos compartidos.** La configuración de impresión es por equipo; el segundo cajero hereda la del primero (aceptado en la spec).
- **Un fallo de red en la venta** puede dejar duda sobre si se registró; CA-08 lo mitiga, no lo elimina.
- **Revisión de 2026-11-02.** La cancelación no envía zona (la API la fija); el 429 y el tope se muestran con el mensaje de la API. Ningún CA cambia de número. Riesgo: un 429 en la cancelación deja la fila sin cambios y el usuario debe esperar el tiempo indicado; el mensaje lo muestra la API.
- **Revisión 2026-11-05 (aprobada).** (a) Precio que cambia entre cotización y confirmación: RN-15, riesgo aceptado. (b) Una cotización caída bloquea la confirmación (CA-32): el cajero no puede vender mientras la API no responde a la cotización. (c) La prueba E2E de la cotización depende del endpoint de `api-009` (T-77 y T-78 de su lista de tareas) y se incluye en T-40.
- **Alternativas descartadas:** (1) llamar los hooks desde `App.tsx` (carga datos que nadie abrió); (2) calcular totales o multiplicar precios en el cliente (viola CA-21 y Constitución III); (3) añadir librería de QR en el cliente (requeriría ADR propio y contradice RN-07); (4) reimprimir o guardar ventas en el navegador (prohibido por RN-12).

## Revisión boletos individuales (2026-11-05, aprobada por Jonathan el 2026-11-06)

Decisión de Jonathan del 2026-11-05 sobre `api-009` («Boletos individuales»), aprobada el 2026-11-06. Tareas T-62 a T-73 en `tasks/005-ticket-sales.md`. No cambia la revisión de cotización (aprobada).

- **Cliente.** `sales.create` devuelve `TicketSaleBatchDto` (`tickets[]`, `adult_quantity`, `child_quantity`, `total_amount`, `purchased_at`, `cashier_name`). `TicketSaleDto` pasa a representar un boleto (`folio`, `ticket_type`, `unit_price`, `qr_svg`, etc.). Importes como cadenas; sin suma.
- **ViewModel.** `ticket-sale.ts` guarda la lista de boletos y los totales que devuelve la API. No suma ni multiplica (CA-38).
- **Pantalla posterior.** `TicketSaleView` muestra «Venta registrada», el total de la compra, el número de boletos y la lista de folios con tipo y precio en un contenedor con desplazamiento propio; `TicketReceipt`, con su QR, se renderiza solo para la impresión (CA-35, CA-39).
- **`TicketReceipt` por boleto.** Muestra tipo («Adulto» o «Niño»), precio del boleto, folio, fecha, cajero, QR y pie. No muestra cantidades ni total (CA-36). Folio, tipo y QR se muestran siempre.
- **Configuración de impresión (CA-27 reinterpretado).** Se retiran `quantities` y `total` de `ticket-print-settings.ts` y de `PrintSettingsDialog`. Al leer una configuración guardada, las claves antiguas se ignoran y no producen error (CA-28). El precio del boleto se muestra siempre y no es configurable (R-D2, resuelta el 2026-11-06).
- **Impresión (CA-37).** `printer.print()` no cambia. El bloque `@media print` de `src/styles.css` (líneas 2237 a 2256 en la versión revisada) se rehace: oculta la shell y el resto de la vista, deja cada `.ticket-receipt` en flujo normal, sin salto forzado de página y con `break-inside: avoid` para que ningún boleto se parta entre hojas, y no usa `position: absolute`. El corte entre boletos en rollo depende de la impresora (limitación aceptada; se comprueba en T-72).
- **Riesgo.** Hasta 50 boletos con QR en la impresión (tope de 50 en total). Se mide con la venta más grande (50) en la verificación manual (T-72). Los QR no se muestran en pantalla (R-D1, resuelta).

Mapeo de criterios a pruebas (revisión de boletos individuales, aprobada el 2026-11-06):

| Criterio | Prueba automatizada | Ubicación |
|---|---|---|
| CA-35 | Resumen «Venta registrada» con total de la API, número de boletos, folios y lista de un elemento por boleto | `ticket-sale.test.tsx` (parte 5, nueva) |
| CA-36 | Cada boleto con tipo, precio, folio, fecha, cajero, QR y pie; sin cantidades ni total; folio, tipo y QR con todos los opcionales desactivados | `ticket-print-settings.test.tsx` y `ticket-sale.test.tsx` (parte 5) |
| CA-37 | Imprimir boletos llama al `printer` una vez; CSS de impresión sin `position: absolute` sobre `.ticket-receipt`, sin salto forzado y con `break-inside: avoid` | `ticket-sales-quality.test.tsx` (revisión estática) |
| CA-38 | Ningún archivo de `views/`, `components/` o `sections/` suma, multiplica ni reparte importes | `ticket-sales-quality.test.tsx` |
| CA-39 | Lista de folios con contenedor desplazable para hasta 50 boletos; la impresión incluye todos | `ticket-sale.test.tsx` (parte 5) y verificación manual |

## Orden y aprobación

**Secuencia de implementación:**

1. `packages/api-client`: `ticket-sales.ts`, `ticket-sales-types.ts` y `ticket-sales-api-client.test.tsx` con `fetch` simulado.
2. Configuración de impresión: `ticket-print-settings.ts` y su prueba (CA-27 a CA-29); servicio `printer.ts`.
3. Venta: `ticket-sale.ts`, `useTicketSale.ts`, `TicketReceipt`, `TicketSaleSection`, `TicketSaleView`, `SaleConfirmDialog` y `PrintSettingsDialog` (CA-03 a CA-09).
4. Historial: `ticket-history.ts`, `useTicketHistory.ts`, `CancelTicketDialog`, `TicketHistorySection`, `TicketHistoryView` (CA-10 a CA-13).
5. Precios: `ticket-prices.ts`, `useTicketPrices.ts`, `TicketPricesSection`, `TicketPricesView` (CA-14 a CA-17).
6. Shell: `navigation.ts`, `dashboard-shell.ts`, `useDashboardShell.ts`, `App.tsx`; retirar `dashboard-demo.ts`, `useDashboardDemo.ts`, `DemoBanner.tsx` y datos de venta de `demo-data.ts` (CA-01, CA-02).
7. Estilos: bloque `ticket-sales` con tokens y `@media print` (CA-23, CA-24, CA-29).
8. Pruebas de calidad y cobertura (CA-21 a CA-25); ajuste de las pruebas de navegación de `dashboard-001` y `dashboard-003`.
9. Documentación: `apps/dashboard/docs/arquitectura.md` (pendiente, T-41) y notas de vigencia en `001`, `002` y `003` (aplicadas el 2026-11-02).
10. Verificación: `npm run types`, `npm test` y `npm run build` en `apps/dashboard`; `/verify`; revisión manual de teclado y anchos; recorrido contra `arca_pruebas` cuando `api-009` esté desplegada.
11. Revisión de 2026-11-05 (cotización; T-51 a T-61 en tasks): `sales.quote` en el cliente, estados de cotización en `ticket-sale.ts`, diálogo con importes y pruebas de CA-04, CA-05 y CA-31 a CA-34. Puede avanzar con cliente simulado, antes que la API.

**Reparto:**
- Frontend (Jonathan): pasos 1 a 8.
- Documentador: paso 9, con petición expresa para tocar `specs/001`, `002` y `003`.
- Backend (Jonathan, `api-009`): pasos de la API; el paso 10 final depende de ellos.

**Aprobaciones requeridas:**

| Rol | Aprueba | Estado |
|---|---|---|
| Responsable funcional | Spec 005 | Jonathan, 2026-11-02 (Aprobada) |
| Equipo | Solución técnica y Constitution Check de este plan | Jonathan, 2026-11-02 (Aprobado) |
| Responsable funcional | Márgenes por defecto de impresión (2 mm térmica, 15 mm carta) | Jonathan, 2026-11-02 (Aprobado) |
| Equipo | Formato de `effective_at` enviado por el cliente (junto con `api-009`) | Jonathan, 2026-11-02 (Aprobado) |
| Responsable funcional | Revisión 2026-11-05 de la spec 005 (pregunta 1 reabierta; CA-04, CA-05, CA-31 a CA-34; RN-15) | Aprobada por Jonathan, 2026-11-05 |
| Equipo | Revisión 2026-11-05 del plan (estados de cotización y cliente `sales.quote`) | Aprobada por Jonathan, 2026-11-05 |
