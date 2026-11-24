# Tareas · 015 · step-up-confirmation

- Solicitada: 2026-11-20
- Aprobada: 2026-11-20
- Spec: `apps/dashboard/specs/015-step-up-confirmation.md`
- Plan: `apps/dashboard/plan/015-step-up-confirmation.md` (Aprobado)
- Dependencias: `apps/api/tasks/021-staff-step-up-confirmation.md` (contrato y endpoints; T-06, T-08 a T-14 para integración real). Las brechas B-1, B-3, B-4 y B-8 de api-021 quedan resueltas.

Plan aprobado. Implementación: T-01 a T-15 marcadas con evidencia de Vitest del dashboard (64 archivos, 637 pruebas) y `tsc --noEmit`; todas contra respuestas simuladas. Pendientes: T-16 (faltan `npm run types` y `npm run build` con las herramientas del propio dashboard: `typescript` no está instalado en `apps/dashboard`; se usó el `tsc` de `apps/pwa` y `vite build` a un directorio temporal), T-17 (PR y estado de la spec) e integración contra la API real (api-021 T-06, T-08 a T-14) sin verificar. Ninguna tarea se marca hecha sin evidencia. No se hace ninguna llamada real a la API en las pruebas: todas usan respuestas simuladas.

## Cliente (packages/api-client)

- [x] **T-01** (CA-01, CA-02, CA-09): en `packages/api-client`, `types.ts` (`ApiErrorPayload.mode?: "window" | "always"`); `http.ts` (`apiError` copia `mode` si es válido; `createHttpClient` acepta `onTwoFactorSetupRequired?` aditivo); `admin.ts` (`passwordConfirmation.confirm(password)`, `users.update` y `users.resetTwoFactor` con `password?` en el cuerpo, `users.resetPassword(id, password, currentPassword)` (B-1: `current_password` es la confirmación; CA-17); `ticket-sales.ts` (`prices.schedule` con `password?`); `index.ts` (exportar tipos); `README.md` (endpoints y `mode`). Sin lógica de negocio. Verificar que PWA y mobile no cambian su comportamiento. Test: `api-client-admin.test.tsx` y `api-client-auth.test.tsx` (regresión), y los tests de CA-02 y CA-06 en el paso de hook.

## Lógica (ViewModel puro y hook)

- [x] **T-02** (CA-01, CA-03, CA-04, CA-06): `src/viewmodels/step-up.ts`: `readPasswordConfirmationRequirement(error)` (403 con `code` y `mode` válido; otro caso, `null`) y `runWithStepUp(operation, deps)` con el orden de RN-10 (primera llamada sin contraseña; ventana: confirmar y un reintento; siempre: reenviar con contraseña; 422 y 429 según spec; cancelación lanza `StepUpCancelledError`; error de red sin reintento). Actualizar `src/viewmodels/api-errors.ts` con `code` y `mode`. Tests en `src/tests/step-up-confirmation.test.tsx`: `describe("CA-01 …")`, `describe("CA-03 …")`, `describe("CA-04 …")`, `describe("CA-06 …")`.
- [x] **T-03** (CA-01, CA-02, CA-03, CA-04, CA-05, CA-06): `src/viewmodels/useStepUpConfirmation.ts` (hook): `runProtected`, estado del diálogo (`idle`, `submitting`, `wrong-password`, `rate-limited`, `error`, `confirmed`), resolver en `useRef`, sin guardar la contraseña en el estado, cancelación al desmontar. Tests `describe("CA-02 …")` (una llamada a `confirm`, cierre al 200, un reintento), `describe("CA-05 …")` (dos operaciones de Ventana dentro de la ventana sin diálogo; 403 posterior reabre el diálogo) y `describe("CA-06 …")` (`confirm` no se llama, el reenvío lleva `password`).

## Vista del diálogo

- [x] **T-04** (CA-01, CA-03, CA-04, CA-08): `src/components/StepUpConfirmationDialog.tsx` sobre `Dialog` de `@arca/ui`. Campo `type="password"` con `autocomplete="current-password"` y etiqueta «Contraseña»; foco inicial en el campo; «Confirmar» deshabilitado si está vacío o durante `rate-limited`; «Cancelar» y Esc cancelan; foco al disparador al cerrar (la vista guarda `document.activeElement` al abrir). 422 en `role="alert"` junto al campo y campo vacío; 429 con el mensaje de la API y botón deshabilitado durante `Retry-After`. Tests de markup (`describe("CA-01 …")`, `describe("CA-03 …")`, `describe("CA-04 …")`, `describe("CA-08 …")`).
- [x] **T-11** (CA-07, CA-13, CA-15): accesibilidad y textos. Verificar `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, `aria-live` en errores; textos en español (título «Confirma tu contraseña», botones «Confirmar» y «Cancelar», mensajes de la API sin traducir). Lectura estática de la vista, el hook y `step-up.ts`: sin `localStorage`, `sessionStorage`, `document.cookie`, `history` ni `console`; el campo se vacía al enviar y al cerrar. Tests `describe("CA-07 …")`, `describe("CA-13 …")` y `describe("CA-15 …")`.

## Operaciones

- [x] **T-05** (CA-01, CA-02, CA-05, CA-08): cancelar boleto desde Historial. `useTicketHistory.ts` y `ticket-history.ts` (línea 234, `history.cancel`) envuelven la llamada con `runProtected` (Ventana, sin contraseña en la llamada). `CancelTicketDialog.tsx` no cambia de lógica. Tests `describe("CA-01 …")` en el flujo de Historial, `describe("CA-02 …")` (cancelación reintentada una vez), `describe("CA-05 …")` (segunda cancelación dentro de la ventana sin diálogo) y `describe("CA-08 …")` (cancelar el diálogo no cancela el boleto). Verificar `ticket-history.test.tsx` (regresión).
- [x] **T-06** (CA-06, CA-08): precios. `useTicketPrices.ts` y `ticket-prices.ts` (línea 320, `prices.schedule`) con `runProtected` en modo Siempre; la contraseña va solo en el cuerpo del reenvío. Sustituir `isTwoFactorRequired` por el manejador común de `onTwoFactorSetupRequired` (T-09). Tests `describe("CA-06 …")` en `ticket-prices.test.tsx` y regresión.
- [x] **T-07** (CA-06, CA-12, CA-17): usuarios (dashboard-017). `useStaffAccounts.ts` y `staff-accounts.ts`: `create` (Ventana, línea 301), `update` (dinámico: Siempre si cambia `role`, Ventana si no; línea 300), `setStatus` (Ventana; línea 339), `remove` (Ventana), `resetTwoFactor` (Siempre; línea 351). `resetPassword` (línea 346) con `current_password` (B-1 resuelta; `describe("CA-17 …")`). Tests `describe("CA-06 …")` para cambio de rol y restablecer 2FA, y `describe("CA-12 …")` para los flujos sin diálogo. Excepción de dashboard-004 RN-01 aplicada solo al diálogo. Verificar `staff-accounts.test.tsx` (regresión).
- [x] **T-08** (CA-02, CA-05, CA-12): recintos. `enclosure-qr.ts` (`regenerateQr`, línea 217): Ventana si el recinto tiene QR; sin diálogo cuando la API responde 201/200 sin pedir confirmación (B-3). `enclosures-management.ts` (`remove`, línea 245): Ventana. `create` (línea 86), `rename` (línea 77) y `setStatus` (línea 229) sin diálogo (No pide, decisión B-4; CA-12). `generateQr` (primera generación) no abre el diálogo (CA-12). Tests `describe("CA-02 …")`, `describe("CA-05 …")` y `describe("CA-12 …")` (generar QR por primera vez). Ajustar `enclosure-qr-printing.test.tsx` (regenerar con QR ahora pasa por el diálogo).

## Enrolamiento y sesión

- [x] **T-09** (CA-09, CA-10, CA-11): cablear `onTwoFactorSetupRequired` en `src/services/arca-api.ts` al estado de `useAuthSession` (`src/viewmodels/auth-session.ts`), de modo que un 403 `two_factor_setup_required` en taquilla o administración muestre el enrolamiento (dashboard-002 CA-05) y no Venta ni Historial. `src/App.tsx` pasa `notice` a `TwoFactorSetupView` cuando el perfil incluye `cashier`; `src/views/TwoFactorSetupView.tsx` acepta `notice?` (aditivo) y muestra el texto exacto de CA-10. Cajero con 2FA confirmado: reto de dashboard-002 CA-04 sin aviso. Tests en `src/tests/step-up-two-factor.test.tsx`: `describe("CA-09 …")`, `describe("CA-10 …")` y `describe("CA-11 …")`.
- [x] **T-12** (CA-14): cierre y nuevo inicio de sesión. El hook y el estado del diálogo se limpian al cerrar sesión (`signOut` en `auth-session.ts`); tras volver a entrar, la primera operación de Ventana recibe 403 y abre el diálogo (no hay confirmación previa en cliente). Test `describe("CA-14 …")` en `step-up-two-factor.test.tsx`.

## No pide

- [x] **T-10** (CA-12): confirmar que venta, cotización, exportación de reportes, regenerar el QR sin QR previo, crear, editar o cambiar el estado de recintos (B-3, B-4), noticias, eventos, recuerdos, especies, PWA y lecturas no usan `runProtected`. Test `describe("CA-12 …")` en `step-up-confirmation.test.tsx` con respuestas 200 y 201 que no abren el diálogo. Revisar que ningún ViewModel no listado envuelva estas operaciones.

## Cobertura, regresión y documentación

- [x] **T-13** (CA-16): un `describe("CA-xx step-up-…")` por CA-01 a CA-17 en los dos archivos de la tabla del plan, y registro de la spec 015 en `src/tests/administration-coverage.test.tsx`. Test de cobertura que compruebe que cada CA-01 a CA-15 aparece en algún `describe`.
- [x] **T-14** (regresión): actualizar los mocks de cajeros sin 2FA de dashboard-005 (`ticket-history.test.tsx`, `ticket-prices.test.tsx`, `ticket-sales-api-client.test.tsx`, `ticket-sales-coverage.test.tsx`) y las firmas cambiadas (`api-client-admin.test.tsx`, `staff-accounts.test.tsx`, `enclosure-qr-printing.test.tsx`). No relajar aserciones.
- [x] **T-15**: documentación local. `apps/dashboard/docs/manual-demo.md` (cajero: enrolamiento obligatorio y aviso; diálogo de contraseña en cancelar, precios, usuarios y recintos) y `apps/dashboard/docs/arquitectura.md` (`step-up.ts`, hook `useStepUpConfirmation`, diálogo y frontera con `@arca/api-client`).
- [ ] **T-16**: verificaciones del dashboard y del paquete, con salida real aportada por la sesión principal: `npm test` en `apps/dashboard` (todas las suites), `npm run types`, `npm run build`. El dashboard no define lint; registrarlo. Sin evidencia no se marca como hecho.
- [ ] **T-17**: PR que enlaza `apps/dashboard/specs/015-step-up-confirmation.md`, `apps/dashboard/plan/015-step-up-confirmation.md`, `apps/dashboard/tasks/015-step-up-confirmation.md` y `apps/api/specs/021-staff-step-up-confirmation.md`. Cita `dashboard-015` en el commit (los commits los hace el equipo con el comando acordado). Estado de la spec a «En progreso» al iniciar y «Implementada» solo con enlace al PR y resultados de Vitest para CA-01 a CA-16.

Cada tarea de código nombra sus CA-xx y cada CA-xx (CA-01 a CA-17) tiene al menos un test automatizado: CA-01 a CA-08 en T-02 a T-05; CA-09 a CA-11 y CA-14 en T-09 y T-12; CA-12 en T-07, T-08 y T-10; CA-13, CA-15 y CA-07 en T-11; CA-16 en T-13; CA-17 en T-07. Sin tests reales de API en esta app.

## Revisión (salida desde 2FA y PWA)

- [x] **T-18** (CA-18): botón «Cerrar sesión y volver al inicio» en `TwoFactorSetupView.tsx` (QR y código; oculto con códigos de recuperación; desactivado con `submitting`), conectado en `App.tsx`. Test `describe("CA-18 …")` en `step-up-two-factor.test.tsx`.
- [x] **T-19** (CA-19): mismo botón en `PwaRedirectView.tsx` conectado a `session.logout`. Test `describe("CA-19 …")` en `step-up-two-factor.test.tsx`. Firmas de vistas actualizadas en `real-staff-login.test.tsx`.
- [x] **T-20** (CA-20): `PwaRedirectView` recibe `error` (conectado en `App.tsx`) y lo muestra con `Alert`; `TwoFactorSetupView` ya mostraba el error. Test `describe("CA-20 …")` en `step-up-two-factor.test.tsx`.

## Revisión (contador de bloqueo)

- [x] **T-21** (CA-21, CA-22, CA-25): `viewmodels/countdown.ts` (`formatCountdown`, `rateLimitText`, `startCountdown`), `viewmodels/useCountdown.ts` y `components/LockoutNotice.tsx`. Tests `describe("CA-21 …")`, `CA-22` y `CA-25` en `step-up-lockout-countdown.test.tsx`.
- [x] **T-22** (CA-21, CA-23, CA-24): `retryAfterSeconds` en `auth-session.ts`; `LoginView`, `TwoFactorChallengeView` y `StepUpConfirmationDialog` con contador, botón deshabilitado y fallback al mensaje de la API; `App.tsx` conecta la prop. Tests `CA-23` y `CA-24`.
- [x] **T-23** (CA-04, CA-16): ajuste sin relajar del CA-04 de `step-up-confirmation.test.tsx` y del test de cobertura CA-21 a CA-25 en `administration-coverage.test.tsx`.
