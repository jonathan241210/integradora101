# Tareas · 011 · mobile-service-coverage-ci

- Spec: `apps/mobile/specs/011-mobile-service-coverage-ci.md`
- Plan: `apps/mobile/plan/011-mobile-service-coverage-ci.md`
- Estado: En progreso — enmienda del 80 % validada localmente; pendiente Actions
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

## Enmienda de tasks aprobada — requisito del 80 %

- Estado: tasks aprobadas por el usuario solicitante, 2026-11-09.
- Se conserva la implementación original documentada arriba; las siguientes tasks cubren el nuevo alcance aprobado funcionalmente.

### Pruebas de cobertura y fallos actuales

- [x] **T-09** (CA-05): añadir casos unitarios para cada servicio que tenga sentencias, ramas, funciones o líneas debajo de 80 %, con foco inicial en `scanQueue.ts` y `zooSyncService.ts`.
- [x] **T-10** (CA-05): añadir pruebas para todos los repositorios medidos, incluyendo ramas de error y archivos actualmente en 0 %; alcanzar al menos 80 % en cada métrica y archivo.
- [x] **T-11** (CA-05): completar pruebas de ramas de los ViewModels que actualmente incumplen los umbrales existentes, incluyendo la configuración de permisos de cámara.
- [x] **T-12** (CA-05): configurar en Jest los umbrales de 80 % para sentencias, ramas, funciones y líneas en cada archivo de servicios y repositorios; conservar los umbrales existentes de ViewModels y repositorios sin reducirlos.
- [x] **T-13** (CA-06; mobile-007 CA-07, CA-17): corregir las divergencias detectadas en centrar el mapa y en colores fijos, actualizando plan y tasks de `mobile-007`; mantener las pruebas existentes como criterio de aceptación.
- [x] **T-14** (CA-05, CA-06): ejecutar la suite completa con cobertura, confirmar al menos 80 % en las cuatro métricas de todos los archivos cubiertos y revisar el reporte por archivo.
- [ ] **T-15** (CA-02, CA-03, CA-06): verificar en Actions una ejecución verde, confirmar que se conserva `mobile-coverage-report` y actualizar la evidencia SDD con el enlace de la corrida.

### Aprobación de la enmienda

- Requisito funcional del 80 %: aprobado por el usuario solicitante, 2026-11-09.
- Alcance técnico y tasks T-09 a T-15: aprobados por el usuario solicitante, 2026-11-09.

## Evidencia local de T-09 a T-14 — 2026-11-09

- `npm run test:coverage --workspace=apps/mobile -- --runInBand --silent`: exit 0; 62 suites, 310 pruebas y 1 snapshot aprobados; 21,327 s. No se excluyeron pruebas, fuentes ni se redujeron umbrales.
- Sentencias: **98,03 %**; ramas: **94,51 %**; funciones: **96,49 %**; líneas: **98,61 %**. Todos los archivos con código instrumentado cumplen el mínimo del 80 % en cada métrica.
- `./node_modules/.bin/tsc --noEmit --project apps/mobile/tsconfig.json`: exit 0, usando todas las pruebas, incluidas las tres suites antes no versionadas. Se corrigió en su fixture la restauración de `NODE_ENV` y se usó el estado contractual `unlocked` para logros.
- T-13 ya fue publicada en `8f144b9` y sus pruebas de arquitectura/mapa continúan pasando en la suite completa.
- `/verify`: Mobile declara `test` y `test:coverage` en `apps/mobile/package.json`; se ejecutó el segundo y TypeScript disponible. No hay scripts lint/format/types declarados. No se instalaron dependencias, no cambiaron lockfiles ni se accedió a BD.
- Reporte HTML y LCOV presentes en `apps/mobile/coverage/`, sin versionar archivos generados. La evidencia remota de T-15 queda pendiente.
