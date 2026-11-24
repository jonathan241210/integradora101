# Plan técnico · 015 · step-up-confirmation

- Spec: `apps/dashboard/specs/015-step-up-confirmation.md`
- Estado de spec: Implementada
- Solicitada: 2026-11-20
- Aprobada: 2026-11-20
- Estado del plan: **Aprobado** (aprobación técnica registrada). Brechas B-1, B-3, B-4 y B-8 resueltas (sección «Decisiones»).
- Responsable técnico: `<por identificar según acuerdo del equipo>`
- Dependencias: `apps/api/specs/021-staff-step-up-confirmation.md` (regla y contrato) y su plan `apps/api/plan/021-staff-step-up-confirmation.md`. El cliente puede empezar con respuestas simuladas tras aprobar este plan; la integración real requiere los endpoints de api-021 T-06, T-08 a T-14.
- Otras dependencias de spec: `dashboard-002` (login, reto y enrolamiento), `dashboard-005` (venta, historial, precios), `dashboard-012` y `dashboard-013` (recintos y QR), `dashboard-017` (usuarios, usa este diálogo).
- Brechas heredadas de api-021 que afectan al cliente: **B-1** (campo de la contraseña de confirmación en `PUT users/{user}/password`), **B-3** (regenerar sin QR), **B-4** (alta, edición y estado de recintos sin clasificar), **B-8** (texto del 403). Resueltas.
- ADR: ninguno. Sin dependencias npm nuevas. `packages/ui` no se modifica (su `Dialog` ya sirve).

## Diseño de solución

El panel presenta y pide. No decide qué operación pide contraseña (RN-01): reacciona al 403 `password_confirmation_required` y usa `mode` del cuerpo. No guarda la contraseña fuera de la petición (RN-02). No calcula la ventana de 10 minutos (RN-03).

Tres capas, siguiendo MVVM explícito:

1. **Lógica pura (ViewModel sin React)**: `src/viewmodels/step-up.ts`.
   - `readPasswordConfirmationRequirement(error)`: devuelve `{ mode: "window" | "always" }` si el error es 403 con `code: "password_confirmation_required"` y `mode` válido; `null` en otro caso (un `mode` desconocido no abre el diálogo: se trata como error genérico).
   - `runWithStepUp(operation, deps)`: orquestador. `operation(password?: string)` es la llamada original; `deps.askPassword(mode, feedback)` devuelve la contraseña escrita o `null` si se cancela; `deps.confirm(password)` llama a `POST admin/password-confirmation`. Reglas:
     - Primera llamada **sin** contraseña (`operation(undefined)`). Para Siempre, la API responde 403 `mode: always` y se pide la contraseña; para Ventana se confirma y se reintenta.
     - `window`: `askPassword` → `confirm` → si 200, **un** reintento `operation(undefined)` (CA-02, RN-10). Si ese reintento vuelve a responder 403, se reabre el diálogo; cada confirmación exitosa da exactamente un reintento. Si 422, `askPassword` con `feedback: "wrong-password"` (CA-03). Si 429, `askPassword` con `feedback: "rate-limited"` y segundos (CA-04).
     - `always`: `askPassword` → `operation(password)` directamente, sin `confirm` (CA-06). Si 422, vuelve a pedir con `wrong-password`. Si 429 (cuenta bloqueada), `rate-limited`.
     - Cancelación (`null`): lanza `StepUpCancelledError` sin llamar a la API (CA-08).
     - Errores de red o 5xx: se reporta `error` y no se reintenta la operación (spec, «Errores»).
     - 401: lo atiende el manejador global de sesión (dashboard-002); no hay diálogo.
   - Estados del diálogo (RN-08): `idle`, `submitting`, `wrong-password`, `rate-limited`, `error`, `confirmed`. El orquestador los emite; la vista los presenta.

2. **Hook (ViewModel React)**: `src/viewmodels/useStepUpConfirmation.ts`.
   - Expone `runProtected(operation)` (devuelve la promesa del resultado), `dialog` (estado: `open`, `mode`, `status`, `message`, `retryAfterSeconds`) y `submit(password)` / `cancel()` que la vista llama.
   - Guarda en `useRef` el resolver de la promesa pendiente del diálogo. La contraseña no se guarda en el estado del hook: se pasa como argumento de `submit` al resolver y se descarta (RN-02).
   - Sin efectos globales, sin `localStorage` ni contexto persistente. Al desmontar la vista o cerrar sesión, el hook cancela la promesa pendiente y limpia el estado (CA-14).
   - Los ViewModels de cada módulo llaman al hook; no llaman a `fetch` ni a `@arca/api-client` desde la vista.

3. **Vista (View)**: `src/components/StepUpConfirmationDialog.tsx`.
   - Usa `Dialog` de `@arca/ui` (`<dialog>` nativo, `aria-modal="true"`, `aria-labelledby` del título, Esc → `onClose`). Foco inicial en el campo de contraseña; foco al disparador al cerrar: la vista guarda `document.activeElement` al abrir y lo restaura al cerrar (CA-08, CA-13).
   - Campo `type="password"`, `autocomplete="current-password"`, etiqueta «Contraseña». Mensajes de error con `role="alert"`; estado de envío con `role="status"`.
   - La contraseña vive en `useState` local del componente durante la petición; se vacía al enviar y al cerrar (CA-07).
   - Botón «Confirmar» deshabilitado si el campo está vacío (única validación de cliente: «no vacía», RN-06) o durante `rate-limited` (CA-04). Botón «Cancelar».
   - Textos en español (CA-15). Los mensajes de la API se muestran tal cual llegan.
   - Sin temporizador visual (RN-03). El tiempo de espera de 429 viene de `Retry-After` y solo sirve para deshabilitar el botón durante la espera; la API sigue siendo la autoridad.

**Aviso de cajero sin 2FA (CA-09, CA-10, CA-11):** reutiliza el enrolamiento de `dashboard-002` CA-05 (RN-05). `TwoFactorSetupView` (dashboard-002) recibe una prop opcional `notice`; cuando el perfil incluye el rol `cashier`, el shell le pasa el texto de CA-10. No hay lógica nueva de roles en el cliente: el dato viene de `me.two_factor_setup_required` (api-021 CA-01). Un 403 `two_factor_setup_required` recibido en cualquier pantalla de taquilla o administración devuelve el estado del shell a la pantalla de enrolamiento (CA-09). Esto se resuelve con un manejador opcional en el cliente HTTP (ver «Cliente»), no con lógica por pantalla.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| Paquete | `packages/api-client/types.ts`: `ApiErrorPayload.mode?: "window" \| "always"` | Tipo del 403 (CA-01) |
| Paquete | `packages/api-client/http.ts`: `apiError` copia `mode` si es válido; `createHttpClient` acepta `onTwoFactorSetupRequired?` (opcional, aditivo) | Contrato y CA-09 sin romper PWA ni mobile |
| Paquete | `packages/api-client/admin.ts`: `passwordConfirmation.confirm(password)` → `POST …/admin/password-confirmation` (devuelve `data.confirmed_until`); `users.update(id, input & { password? })`; `users.resetTwoFactor(id, password?)` con cuerpo en `DELETE`; `users.resetPassword(id, password, currentPassword)` (B-1: `current_password` es la confirmación, `password` la nueva; CA-17) | Llamadas sin lógica |
| Paquete | `packages/api-client/ticket-sales.ts`: `prices.schedule(input & { password? })` | Siempre de precios |
| Paquete | `packages/api-client/index.ts` (exportar tipos); `packages/api-client/README.md` (endpoints y `mode`) | Documentación del paquete |
| Dashboard / lógica | `src/viewmodels/step-up.ts` (nuevo, puro) | Clasificación del 403 y orquestación (CA-01 a CA-06, CA-08) |
| Dashboard / hook | `src/viewmodels/useStepUpConfirmation.ts` (nuevo) | ViewModel React del diálogo (CA-01 a CA-08) |
| Dashboard / vista | `src/components/StepUpConfirmationDialog.tsx` (nuevo) | Diálogo (CA-13, CA-15) |
| Dashboard / errores | `src/viewmodels/api-errors.ts`: campos `code` y `mode` en `DescribedApiError` | Clasificación compartida |
| Dashboard / taquilla | `src/viewmodels/useTicketHistory.ts` y `ticket-history.ts` (cancelar con `runProtected`, Ventana); `src/components/CancelTicketDialog.tsx` sin cambios de lógica | CA-01, CA-02, CA-05 |
| Dashboard / precios | `src/viewmodels/useTicketPrices.ts` y `ticket-prices.ts` (`prices.schedule` con `runProtected`, Siempre); `isTwoFactorRequired` de `ticket-prices.ts` se sustituye por el manejador común | CA-06, CA-09 |
| Dashboard / usuarios (dashboard-017) | `src/viewmodels/useStaffAccounts.ts` y `staff-accounts.ts`: `create` (Ventana), `update` (dinámico: Siempre si cambia `role`, Ventana si no), `setStatus` (Ventana), `remove` (Ventana), `resetTwoFactor` (Siempre), `resetPassword` (Siempre, con `current_password`; B-1) | CA-06, CA-12 y excepción de Usuarios |
| Dashboard / recintos (dashboard-012, 013) | `src/viewmodels/enclosure-qr.ts` (`regenerateQr`: Ventana si hay QR; sin QR previo, No pide según B-3) y `enclosures-management.ts` (`remove`: Ventana); `create`, `rename` y `setStatus` sin diálogo (No pide, decisión B-4) | CA-02, CA-05, CA-12 |
| Dashboard / autenticación | `src/viewmodels/auth-session.ts` (estado de enrolamiento desde `me` y 403; `isTwoFactorSetupRequired` ya existe en la línea 160), `src/App.tsx` (prop `notice` a `TwoFactorSetupView`), `src/views/TwoFactorSetupView.tsx` (prop opcional `notice`) | CA-09, CA-10, CA-11 |
| Dashboard / arranque | `src/services/arca-api.ts`: cablear `onTwoFactorSetupRequired` al estado de `useAuthSession` | CA-09 |
| Dashboard / pruebas | `src/tests/step-up-confirmation.test.tsx` (CA-01 a CA-08, CA-12, CA-13, CA-15); `src/tests/step-up-two-factor.test.tsx` (CA-09, CA-10, CA-11, CA-14); registro en `src/tests/administration-coverage.test.tsx` (CA-16) | Un `describe` por CA |
| Dashboard / pruebas (regresión) | `src/tests/ticket-history.test.tsx`, `ticket-prices.test.tsx`, `staff-accounts.test.tsx`, `enclosure-qr-printing.test.tsx`, `api-client-admin.test.tsx`, `ticket-sales-api-client.test.tsx`, `api-client-auth.test.tsx` | Firmas y flujos que cambian (cajeros sin 2FA en mocks de dashboard-005) |
| Dashboard / documentación | `apps/dashboard/docs/manual-demo.md` (cajero: enrolamiento; diálogo de contraseña), `apps/dashboard/docs/arquitectura.md` (`step-up.ts`, hook, diálogo) | Referencia vigente |
| Dashboard / estilos | `src/styles.css`: clases del diálogo con tokens semánticos, sin hex ni `rgb(` | RN-07 |

## Cliente HTTP y contrato

- **Forma del 403 que consume el cliente:** `{ message, code: "password_confirmation_required", mode: "window" | "always" }`. El cliente no lee el texto para decidir (RN-01).
- **Confirmación:** `POST /api/v1/admin/password-confirmation` con `{ password }` → `{ data: { confirmed_until } }`. El cliente ignora `confirmed_until` (RN-03); se devuelve para pruebas y depuración.
- **Siempre:** la operación se envía con `password` en el cuerpo. Nunca se envía sin que la API lo haya pedido (la primera llamada no lleva contraseña).
- **429:** `Retry-After` llega como `error.retryAfterSeconds` (ya lo lee `http.ts`).
- **Manejador opcional `onTwoFactorSetupRequired`:** se invoca cuando la respuesta es 403 con `code: "two_factor_setup_required"`. Es aditivo: PWA y mobile no lo pasan y no cambian.
- **Errores de red:** `describeApiError` ya devuelve el mensaje de conexión.

## Seguridad, offline y operación

- **La contraseña:** solo en `useState` del diálogo durante la petición y en el argumento de la operación. No va a `localStorage`, `sessionStorage`, cookies, URL, estado global ni logs (CA-07). Los tests de lectura estática lo comprueban en la vista, el hook y el orquestador.
- **Datos de prueba:** las pruebas usan contraseñas ficticias (no credenciales reales).
- **Permisos:** la UI no oculta el diálogo por permiso: aparece solo si la API lo pide. Las acciones de Ventana/Siempre se muestran con los permisos que ya filtran los botones de cada módulo; no hay lógica nueva de permisos.
- **Reintento:** solo una vez tras una confirmación exitosa (RN-10). No se reintenta una operación aceptada.
- **Accesibilidad:** `Dialog` nativo con `aria-modal`, foco inicial en el campo, Esc y botón «Cancelar», foco de vuelta al disparador, errores en `role="alert"`, estado en `role="status"`.
- **Offline:** no aplica. Sin conexión, el error de red se muestra y no se reintenta.
- **Sin dependencias:** no se añade npm ni se toca `packages/ui`.

## Mapeo de criterios a pruebas

Vitest con cliente simulado (`vi.mock("@arca/api-client")`) y respuestas de API simuladas. Cada CA tiene un `describe("CA-xx step-up-confirmation")` o `describe("CA-xx step-up-two-factor")`. En entorno node, foco, Esc y Tab se verifican por lectura estática del markup y de `Dialog` (misma limitación que `dashboard-013`).

| Criterio | Prueba automatizada | Archivo | Tareas |
|---|---|---|---|
| CA-01 | 403 `window` abre el diálogo con campo enfocado; la operación no se ejecuta; no hay error genérico | `step-up-confirmation.test.tsx` | T-02, T-03, T-04, T-05 |
| CA-02 | Contraseña correcta → una llamada a `passwordConfirmation.confirm`, cierre al 200, un reintento automático | idem | T-03, T-05 |
| CA-03 | 422 → mensaje junto al campo con `role="alert"`, campo vacío, diálogo abierto, sin reintento | idem | T-03, T-04 |
| CA-04 | 429 → mensaje de la API, botón deshabilitado durante `retryAfterSeconds`, sin reintento automático | idem | T-03, T-04 |
| CA-05 | Dos operaciones de Ventana dentro de 10 min (API acepta) sin diálogo; tras 403 posterior, el diálogo vuelve a abrirse | idem | T-03, T-05 |
| CA-06 | 403 `always` → diálogo; reenvío con `password` en el cuerpo; no llama a `confirm`; cada operación pide de nuevo | idem | T-03, T-06 |
| CA-07 | Lectura estática de la vista, el hook y el orquestador sin `localStorage`, `sessionStorage`, `document.cookie`, `history` ni logs; el campo se vacía al cerrar | idem | T-11 |
| CA-08 | Cancelar o Esc: no hay petición, la operación no se ejecuta y el foco vuelve al disparador | idem | T-04, T-05 |
| CA-09 | 403 `two_factor_setup_required` → enrolamiento; no muestra Venta ni Historial | `step-up-two-factor.test.tsx` | T-09 |
| CA-10 | Cajero sin 2FA → `TwoFactorSetupView` con el texto exacto de CA-10 y la confirmación de dashboard-002 CA-05 | idem | T-09 |
| CA-11 | Cajero con 2FA → reto TOTP o recuperación (dashboard-002 CA-04), sin aviso de CA-10 | idem | T-09 |
| CA-12 | Operaciones «No pide» con 200 o 201 no abren el diálogo (venta, cotización, exportación, QR por primera vez, noticias, eventos, recuerdos, especies) | `step-up-confirmation.test.tsx` | T-10 |
| CA-13 | Lectura de markup: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, `type="password"`, `autocomplete="current-password"`, `aria-live` en errores; foco de retorno | idem | T-11 |
| CA-14 | Tras cerrar sesión y entrar de nuevo, la primera operación de Ventana recibe 403 y abre el diálogo; el hook no conserva confirmaciones | `step-up-two-factor.test.tsx` | T-12 |
| CA-15 | Textos del diálogo, del aviso y de errores en español; mensajes de la API sin traducir | `step-up-confirmation.test.tsx` | T-11 |
| CA-16 | Cobertura: un `describe` por CA-01 a CA-17 y registro en `administration-coverage.test.tsx` | `administration-coverage.test.tsx` | T-13 |
| CA-17 | `describe("CA-17 step-up-confirmation")`: `resetPassword` envía `current_password` y `password`; sin `password` como confirmación | `step-up-confirmation.test.tsx` | T-07 |

Pruebas de regresión en el mismo PR: `ticket-history`, `ticket-prices`, `staff-accounts`, `enclosure-qr-printing` y los tests de cliente. Sus mocks de cajero sin 2FA se ajustan (dashboard-005).

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | Sin dependencias npm nuevas; `Dialog` de `@arca/ui` existente. Sin servicios de nube. |
| II. La spec manda | Parcial | Spec 015 Aprobada; plan y tasks con el mismo NNN-slug. Depende de api-021 (plan en Borrador) y de las brechas B-1, B-3, B-4 y B-8. |
| III. Lógica separada de la interfaz | Sí | La clasificación y la orquestación viven en `step-up.ts` (VM puro); el hook es ViewModel; la vista solo presenta. Ninguna vista llama a `fetch` o `axios` (test de lectura estática). Ningún cálculo de permisos ni de ventana en el cliente. |
| IV. Un test por criterio | Sí (planificado) | Mapeo CA-01 a CA-16 con `describe` por criterio. Evidencia pendiente (sin shell). |
| V. Una sola fuente de verdad para los datos | Sí | El cliente no persiste nada; la ventana y los intentos viven en la API (api-021). |
| VI. Código en inglés, personas en español | Sí | Identificadores en inglés (`runWithStepUp`, `password_confirmation_required`, `two_factor_setup_required`); textos de UI y mensajes en español. |

Ninguna excepción. La excepción de Usuarios (diálogo permitido, dashboard-004 RN-01) está en la spec y no es una excepción de este plan.

## Riesgos y decisiones

- **Operación repetida:** el reintento automático ocurre solo tras una confirmación de Ventana, cuando la API ya rechazó la operación (no se ejecutó). Siempre no se reintenta: el usuario confirma cada vez.
- **Cajeros sin 2FA:** quedan fuera de la taquilla hasta enrolarse (api-021 RN-14). El aviso previo es operativo.
- **Mocks de pruebas existentes:** `enclosure-qr-printing` (regenerar) cambia de flujo cuando el recinto tiene QR (Ventana). El test debe reflejar la respuesta 403 y la confirmación.
- **Temporizador de 429:** usa `Retry-After` solo para deshabilitar el botón (CA-04). La API decide la expiración (RN-03); el cliente no la duplica.
- **Diálogo en Usuarios:** excepción aprobada en la spec; el resto de interacciones de Usuarios siguen sin modales (dashboard-004).
- **Ambigüedad de textos:** el texto de confirmación y el texto de Siempre («Confirma tu contraseña para realizar esta acción») son propuestas de copy. Aceptados (B-8).

## Decisiones (aprobación técnica)

- **B-1 (`PUT users/{user}/password`):** la confirmación va en `current_password`; `password` es la nueva contraseña. Cliente: `users.resetPassword(id, password, currentPassword)`. Spec: CA-17, RN-11. Tarea: T-07.
- **B-2 (cuentas no admin):** el diálogo solo aparece para la Ventana de cuentas no admin (incluidas `zoo-admin`). Las cuentas `admin` no tienen acciones en la interfaz (`dashboard-017` CA-04), así que el diálogo no se abre para ellas.
- **B-3 (regenerar QR sin código previo):** No pide. Sin QR previo, `regenerateQr` no abre el diálogo (primera generación). Con QR, sigue Ventana. Spec: CA-12 enmendado. Tarea: T-08.
- **B-4 (alta, edición y estado de recintos):** No pide. `create`, `rename` y `setStatus` no abren el diálogo. Spec: CA-12 enmendado. Tarea: T-08 y T-10.
- **B-7 (aciertos y contador):** no afecta al cliente; la API borra los fallos previos (`api-021` CA-41).
- **B-8 (textos y forma de respuesta):** aceptados. Textos de Siempre y de 2FA sin cambio de copy; `mode` y envoltorio `data` del 200 tal como los describe la API.
- Propuestas del plan aceptadas, incluidas las del hook, la vista y el reintento único.

## Orden y aprobación

1. Aprobado (B-1, B-3, B-4 y B-8 resueltas para las partes afectadas por `api-021`).
2. Cliente (`packages/api-client`): T-01.
3. Lógica pura y hook: T-02, T-03.
4. Vista del diálogo y accesibilidad: T-04, T-11.
5. Operaciones: T-05 (taquilla), T-06 (precios), T-07 (usuarios), T-08 (recintos), T-10 (No pide).
6. Enrolamiento y sesión: T-09, T-12.
7. Cobertura, regresión, documentación y verificación: T-13, T-14, T-15, T-16; PR en T-17.

- Revisión técnica: aprobada (aprobación técnica del plan).
- Aprobador funcional: responsable funcional (spec aprobada).
- Evidencias: pendientes de la sesión principal (`npm test`, `tsc`, `npm run build` en `apps/dashboard`; el dashboard no define lint). Esta sesión no tiene shell y no afirma que pasen.

## Divergencias de implementación

- **Controlador y proveedor.** Para poder probar la orquestación sin renderizar React, el estado del diálogo vive en `createStepUpController` (en `step-up.ts`, puro); `useStepUpConfirmation` lo envuelve y un único `StepUpProvider` (`src/components/StepUpProvider.tsx`, con `key` del perfil) comparte `runProtected` con los ViewModels mediante `src/viewmodels/step-up-context.ts` (`useRunProtected`). Fuera del proveedor, `runProtected` ejecuta la operación sin diálogo. No cambia la regla ni el contrato.
- **Parámetro `protect` opcional** (por defecto sin diálogo) en `cancelTicket`, `submitPriceChange`, `saveStaffAccount`, `confirmStaffAction`, `regenerateEnclosureQr` y `deleteEnclosure`; las funciones puras siguen compatibles con las pruebas existentes.
- **`passwordField`.** `runWithStepUp` acepta `passwordField` (`password` por defecto, `current_password` para restablecer la contraseña de otra cuenta, CA-17) para distinguir un 422 de contraseña incorrecta de un 422 de la contraseña nueva.
- **Cancelar la contraseña** no muestra error: `runInlineOperation` y `runOperation` lo tratan como el 401 (sin mensaje); en Historial el diálogo de cancelación sigue abierto y en recintos QR se libera el estado ocupado.
- **`isTwoFactorRequired` de `ticket-prices.ts` se conserva** (aviso local del dashboard-005) además del manejador común `onTwoFactorSetupRequired`; retirarlo queda como limpieza opcional para no alterar pruebas de dashboard-005.
- **Verificación sin `typescript` propio.** `apps/dashboard` no tiene `typescript` instalado; el chequeo de tipos se hizo con el `tsc` de `apps/pwa` sobre el `tsconfig.json` del dashboard.
- **Pruebas de nivel hook.** Sin `@testing-library`, las pruebas de CA-02, CA-05, CA-06 y CA-08 usan `createStepUpController` y las funciones de ViewModel con el controlador; el cableado `useRunProtected()` en cada hook está verificado por tipos y lectura, no por render.

## Nota de revisión (CA-18, CA-19)

`TwoFactorSetupView` y `PwaRedirectView` reciben `onSignOut` (MVVM: `App.tsx` lo conecta con `session.logout`, es decir `signOut`); el botón es `Button variant="secondary"`, se oculta con `recoveryCodes` y se desactiva con `submitting`. Sin cambios en `signOut`, la API ni `@arca/api-client`. Tests en `src/tests/step-up-two-factor.test.tsx`.
CA-20: `signOut` no cambia; `PwaRedirectView` recibe `error` y muestra un `Alert` con texto fijo en español (el mensaje de `request-failed` puede no estar en español). `TwoFactorSetupView` ya mostraba su `error` en el paso del QR.
Ajuste CA-20: `apiMessage` (`auth-session.ts`) usa `error.message` solo con `error.name === "ApiError"`; si no, texto fijo en español. `PwaRedirectView` muestra `error` tal cual.

## Nota de revisión (CA-21 a CA-25)

`formatCountdown`, `rateLimitText` y `startCountdown` (puros, con reloj inyectable y cálculo contra instante final) en `src/viewmodels/countdown.ts`; el hook `useCountdown` (`useCountdown.ts`) los conecta a React y limpia el intervalo al desmontar. `LockoutNotice` (vista) pinta los dígitos con `aria-live="off"` y una región `role="status"` para el aviso inicial y el de fin. `auth-session.ts` guarda `retryAfterSeconds` en el estado (solo lo trae `request-failed`; cualquier otra acción lo limpia) y `LoginView`, `TwoFactorChallengeView` y `StepUpConfirmationDialog` lo consumen. Sin cambios en `@arca/api-client` ni en la API. Los CA-04 de `step-up-confirmation.test.tsx` se ajustaron al texto con contador. Tests en `src/tests/step-up-lockout-countdown.test.tsx` (entorno jsdom por docblock, con timers falsos de Vitest).
