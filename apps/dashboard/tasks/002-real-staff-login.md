# Tareas · 002 · real-staff-login

- Spec: `apps/dashboard/specs/002-real-staff-login.md`
- Plan: `apps/dashboard/plan/002-real-staff-login.md`

Precondición: `api-003` implementada y cuentas demo sembradas en `arca_pruebas`. Esta feature no requiere cambios de base de datos.

## Implementación

- [ ] **T-01** (CA-03, CA-11): implementar `@arca/api-client` (`http.ts`, `auth.ts`, `types.ts`, `index.ts`, `package.json` con `main`/`types`) y agregarlo al dashboard como `file:../../packages/api-client`.
- [ ] **T-02** (CA-03, CA-11): `src/tests/api-client-auth.test.tsx` con `fetchImpl` falso: CSRF previo a POST, `X-XSRF-TOKEN`, `credentials: 'include'`, errores 422/429/401 normalizados (nombra `CA-03 real-staff-login` y `CA-11 real-staff-login`).
- [ ] **T-03** (CA-11): configurar en `vite.config.ts` el puerto 5174 con `strictPort` y el proxy de `/api` y `/sanctum`; crear `src/services/arca-api.ts`.
- [ ] **T-04** (CA-03, CA-04, CA-05, CA-07, CA-08, CA-09): crear `viewmodels/auth-session.ts` (reducer y orquestación).
- [ ] **T-05** (CA-07, CA-08): crear `viewmodels/useAuthSession.ts`.
- [ ] **T-06** (CA-06): crear `viewmodels/navigation.ts` (perfil y secciones por `home` y permisos).
- [ ] **T-07** (CA-01, CA-10): limpiar el demo: quitar acciones de login ficticio de `dashboard-demo.ts`, añadir `start-session` y perfil `executive`; retirar credenciales de `demo-data.ts`.
- [ ] **T-08** (CA-01, CA-02, CA-03, CA-12, CA-13): reescribir `LoginView` (correo, contraseña, mostrar/ocultar accesible, alerta, «Ingresando…»).
- [ ] **T-09** (CA-04, CA-05, CA-07): crear `TwoFactorChallengeView`, `TwoFactorSetupView` y `PwaRedirectView`.
- [ ] **T-10** (CA-06, CA-09): integrar `useAuthSession` en `App.tsx`, con nombre real en el encabezado, «Salir» con logout y `DemoBanner` solo en secciones demostrativas.
- [ ] **T-11** (CA-14): actualizar `dashboard-001`: marcar CA-01, CA-10, CA-13 y el login de CA-12 como reemplazados por `dashboard-002` en su spec, plan y tasks; ajustar `login.test.tsx` y `acceptance-coverage.test.tsx`.

## Pruebas (cada una nombra su CA)

- [ ] **T-12** (CA-01): `CA-01 real-staff-login` en `src/tests/real-staff-login.test.tsx`.
- [ ] **T-13** (CA-02): `CA-02 real-staff-login`.
- [ ] **T-14** (CA-03): `CA-03 real-staff-login` (vista y reducer).
- [ ] **T-15** (CA-04): `CA-04 real-staff-login`.
- [ ] **T-16** (CA-05): `CA-05 real-staff-login` (casos `admin` y `zoo-admin`).
- [ ] **T-17** (CA-06): `CA-06 real-staff-login` (`admin`, `zoo-admin`, `executive`, `cashier`).
- [ ] **T-18** (CA-07): `CA-07 real-staff-login`.
- [ ] **T-19** (CA-08): `CA-08 real-staff-login`.
- [ ] **T-20** (CA-09): `CA-09 real-staff-login`.
- [ ] **T-21** (CA-10): `CA-10 real-staff-login`.
- [ ] **T-22** (CA-11): `CA-11 real-staff-login` (escaneo de `views/`, `components/` y `App.tsx` sin `fetch`/`axios`).
- [ ] **T-23** (CA-12): `CA-12 real-staff-login`.
- [ ] **T-24** (CA-13): `CA-13 real-staff-login`.
- [ ] **T-25** (CA-14): `CA-14 real-staff-login` en `src/tests/real-staff-login-coverage.test.tsx`.

## Calidad y entrega

- [ ] **T-26**: actualizar `apps/dashboard/docs/arquitectura.md` (autenticación actual, endpoints consumidos, diagramas), `docs/manual-demo.md` y `packages/api-client/README.md`.
- [ ] **T-27**: ejecutar `npm run types`, `npm test` y `npm run build` en `apps/dashboard`, y `/verify`; registrar resultados.
- [ ] **T-28**: prueba manual con las cuentas demo contra la API local: `presidencia@` (admin) y `direccion_zoo@` (zoo-admin) con enrolamiento 2FA y reto en un segundo acceso; `ejecutivo@` solo lectura; `boletaje@` taquilla; `veterinario@` redirección a la PWA; logout y sesión expirada.
- [ ] **T-29**: actualizar el estado de la spec (`En progreso` / `Implementada`), enlazar spec, plan y tasks en el PR y citar `dashboard-002` en el commit.
