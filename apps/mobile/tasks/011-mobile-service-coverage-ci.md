# Tareas · 011 · mobile-service-coverage-ci

- Spec: `apps/mobile/specs/011-mobile-service-coverage-ci.md`
- Plan: `apps/mobile/plan/011-mobile-service-coverage-ci.md`
- Estado: En progreso
- Plan aprobado: usuario solicitante, 2026-11-09

## Implementación

- [x] **T-01** (CA-01, CA-04): actualizar `apps/mobile/jest.config.js` para medir `src/services/**/*.ts` y `src/repositories/**/*.ts`, conservando cobertura actual de ViewModels y excluyendo tests, fixtures, dependencias y archivos generados; configurar reporteros `text`, `lcov` y `html`.
- [x] **T-02** (CA-01, CA-03): modificar el job `mobile-tests` de `.github/workflows/ci.yml` para correr `npm run test:coverage --workspace=apps/mobile -- --runInBand`, conservando `CI: true` y el fallo del job ante pruebas fallidas.
- [x] **T-03** (CA-02, CA-03): agregar la carga de `apps/mobile/coverage/` como artifact `mobile-coverage-report` con `actions/upload-artifact@v4`, ejecutada tras el test incluso si el job falla, ignorando archivos ausentes y sin ocultar el estado fallido.

## Pruebas automatizadas

- [x] **T-04** (CA-01, CA-04): ejecutar la suite móvil completa con cobertura; verificar en salida y en `lcov.info`/HTML que cada servicio y repositorio está incluido, junto con los ViewModels ya configurados, sin `node_modules`, `__tests__` ni código generado. Evidencia local: los 16 archivos de servicios/repositorios aparecen en LCOV; la suite reportó 52 suites y 224 tests aprobados, 3 suites/tests fallidos. La ejecución normal sin cobertura reportó los mismos tres fallos; `src/repositories/index.ts` queda bajo el umbral preexistente del 80% (LCOV: 21/29 líneas, 14/22 ramas).
- [ ] **T-05** (CA-02): pendiente de ejecución de Actions para comprobar el artifact descargable `mobile-coverage-report`; el job móvil aún tiene fallos preexistentes, por lo que no se ha observado una ejecución exitosa.
- [ ] **T-06** (CA-03): pendiente de ejecución remota para comprobar que el upload se ejecuta después del fallo y no cambia el estado rojo del job.

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
- Acciones pendientes: T-05 y T-06 requieren ejecutar el workflow en GitHub después de subir estos cambios.
