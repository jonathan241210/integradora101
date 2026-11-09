# Tareas · 011 · mobile-service-coverage-ci

- Spec: `apps/mobile/specs/011-mobile-service-coverage-ci.md`
- Plan: `apps/mobile/plan/011-mobile-service-coverage-ci.md`
- Estado: Implementada
- Plan aprobado: usuario solicitante, 2026-11-09

## Implementación

- [x] **T-01** (CA-01, CA-04): actualizar `apps/mobile/jest.config.js` para medir `src/services/**/*.ts` y `src/repositories/**/*.ts`, conservando cobertura actual de ViewModels y excluyendo tests, fixtures, dependencias y archivos generados; configurar reporteros `text`, `lcov` y `html`.
- [x] **T-02** (CA-01, CA-03): modificar el job `mobile-tests` de `.github/workflows/ci.yml` para correr `npm run test:coverage --workspace=apps/mobile -- --runInBand`, conservando `CI: true` y el fallo del job ante pruebas fallidas.
- [x] **T-03** (CA-02, CA-03): agregar la carga de `apps/mobile/coverage/` como artifact `mobile-coverage-report` con `actions/upload-artifact@v4`, ejecutada tras el test incluso si el job falla, ignorando archivos ausentes y sin ocultar el estado fallido.

## Pruebas automatizadas

- [x] **T-04** (CA-01, CA-04): ejecutar la suite móvil completa con cobertura; verificar en salida y en `lcov.info`/HTML que cada servicio y repositorio está incluido, junto con los ViewModels ya configurados, sin `node_modules`, `__tests__` ni código generado. Evidencia local: los 16 archivos de servicios/repositorios aparecen en LCOV; 52 suites y 224 tests aprobaron, 3 suites/tests fallaron. La ejecución normal sin cobertura reportó los mismos tres fallos. En Actions también quedaron bajo el umbral preexistente del 80% `useVisitorProfile`, `useCameraPermissionSetting`, `useVisitorProgress`, `useQrScanViewModel`, `useArTourViewModel`, `useLocationViewModel` e `src/repositories/index.ts`.
- [x] **T-05** (CA-02): la ejecución [42703309235](https://github.com/jonathan241210/integradora101/actions/runs/42703309235) publicó `mobile-coverage-report`; se descargó y verificó que contiene `lcov-report/index.html` y `lcov.info`.
- [x] **T-06** (CA-03): en la misma ejecución, el job móvil quedó rojo por fallos en `mapViewport.test.tsx`, `mapAccessibility.test.tsx` y `architecture.test.ts`; el paso de upload se ejecutó y pasó, conservando el resultado fallido del job.

## Calidad y entrega

- [x] **T-07** (CA-01..CA-04): ejecutar verificaciones disponibles y `git diff --check`; revisar que no cambian dependencias, lockfiles, servicios funcionales ni otros jobs. `/verify` no aplica scripts por estar el manifiesto en `apps/mobile/package.json` (no `apps/mobile/src/package.json`); se ejecutó el script workspace `test:coverage` manualmente. Mobile no declara lint/types/format.
- [x] **T-08** (CA-01..CA-04): actualizar spec/plan/tasks con resultados, evidencia de cobertura y limitación de verificación remota.

## Aprobación

- Spec aprobada por el usuario solicitante, 2026-11-09.
- Plan aprobado por el usuario solicitante, 2026-11-09.
- Aprobación de tasks: usuario solicitante, 2026-11-09.

## Estado y evidencia

- Los reportes locales se generaron en `apps/mobile/coverage/lcov-report/index.html` y `apps/mobile/coverage/lcov.info` (ambos ignorados por Git).
- `git diff --check`: sin errores.
- El artifact remoto `mobile-coverage-report` fue descargado a `/tmp/mobile-coverage-report` para comprobar su contenido.
- Evidencia de Actions: [ejecución 42703309235](https://github.com/jonathan241210/integradora101/actions/runs/42703309235).
