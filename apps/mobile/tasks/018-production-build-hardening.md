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
- [ ] **T-10** (CA-01..CA-08): Ejecutar `npm run test:coverage`, `tsc --noEmit` y registrar resultados. **Pendiente: las dependencias de `apps/mobile` no están instaladas en este entorno (sin `node_modules` de jest-expo/typescript).**

## Calidad y entrega

- [x] **T-11** (CA-01, CA-02): Documentar en `apps/mobile/docs/018-production-build-hardening.md` el marcador de URL y la sustitución en EAS.
