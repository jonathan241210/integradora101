# Tareas · 018 · production-build-hardening

- Solicitada: 2026-11-23
- Aprobada: 2026-11-23
- Spec: `apps/mobile/specs/018-production-build-hardening.md`
- Plan: `apps/mobile/plan/018-production-build-hardening.md`

## Build y configuración

- [x] **T-01** (CA-01): Agregar el perfil `production` a `eas.json` sin `EXPO_USE_CLEARTEXT` y con `EXPO_PUBLIC_API_URL` en `https://` (marcador documentado).
- [x] **T-02** (CA-02, CA-08): Crear `src/config/runtime.ts` con `resolveApiBaseUrl()` e `isMockDataEnabled()`; reemplazar los respaldos `10.0.2.2` en `apiAnimalRepository`, `apiMapRepository` y `apiZooRepository` y usar `isMockDataEnabled()` en las factorías.

## Datos reales del visitante

- [x] **T-03** (CA-03, CA-04, CA-05, CA-08): Reescribir `useUserViewModel` sobre `useVisitorProgress` y `useVisitorProfile` con `status`, `error` y `refresh`; conservar el camino de mocks solo con mocks habilitados o repositorio inyectado; derivar hitos de los logros.
- [x] **T-04** (CA-04, CA-05): Crear `VisitorDataGate`/`VisitorDataNotice` y conectar inicio, perfil, juego, misiones, logros, detalles y colección.
- [x] **T-05** (CA-06): Obtener la cuenta de `/visitor/me` (`useVisitorContentViewModel`, ruta de cuenta); retirar `getAccount` con datos fijos fuera de mocks.

## Fichas de recinto

- [x] **T-06** (CA-07, CA-08): Limitar `ENCLOSURE_ANIMALS_CATALOG` y `MOCK_ANIMALS` a mocks habilitados; mostrar «Sin ejemplares para mostrar»; tomar la curiosidad de `fun_fact` y no de `characteristics`.

## Pruebas (CA-xx)

- [x] **T-07** (CA-01, CA-02, CA-08): `__tests__/hardening/build-config.test.ts`.
- [x] **T-08** (CA-03, CA-04, CA-05, CA-08): `__tests__/hardening/visitor-data.test.tsx`.
- [x] **T-09** (CA-06, CA-07, CA-08): `__tests__/hardening/account-and-enclosure.test.tsx`; ajustar pruebas existentes que usaban `characteristics`.
- [x] **T-10** (CA-01..CA-08): Ejecutar `npm run test:coverage`, `tsc --noEmit` y registrar resultados. El 2026-11-24 pasaron las 476 pruebas de 73 suites, con 98,17 % de cobertura de líneas y cero errores de TypeScript.

## Calidad y entrega

- [x] **T-11** (CA-01, CA-02): Documentar en `apps/mobile/docs/018-production-build-hardening.md` el marcador de URL y la sustitución en EAS.
- [x] **T-12** (CA-02): Alinear la política HTTP de `preview` entre Android y JavaScript y cubrir la resolución de la URL en un bundle compilado sin `__DEV__`.
  - `expo config --type introspect` confirmó la política de `preview` y `production`. `expo export --platform android` generó el bundle Hermes. El arranque del APK instalado sigue pendiente en [mobile-002 T-62](002-mobile-ui-base-visitor-journey.md).
