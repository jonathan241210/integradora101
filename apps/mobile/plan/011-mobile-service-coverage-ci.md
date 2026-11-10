# Plan técnico · 011 · mobile-service-coverage-ci

- Spec: `apps/mobile/specs/011-mobile-service-coverage-ci.md`
- Estado de spec: Aprobada — usuario solicitante, 2026-11-09
- Estado del plan: Aprobado e implementado — usuario solicitante, 2026-11-09
- Responsable técnico: usuario solicitante

## Diseño de solución

Ampliar la configuración Jest existente para recoger cobertura de todo `src/services/**/*.ts` y `src/repositories/**/*.ts`, conservando la cobertura actual de ViewModels seleccionados. Configurar reporteros de texto, LCOV y HTML. En el job `mobile-tests` de Actions, ejecutar el script ya definido `test:coverage` con `--runInBand`, y cargar `apps/mobile/coverage/` como artefacto `mobile-coverage-report`. La carga usa `if: always()` para conservar un reporte de diagnóstico si Jest lo produjo, sin alterar el código de salida fallido de las pruebas.

No se fijará un umbral global de cobertura en esta iteración. Los umbrales existentes se conservarán (incluidos los del `jest.config.js` para ViewModels y repositorios ya seleccionados). No se agregan dependencias ni se cambia la lógica de la app.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| Mobile / pruebas | `apps/mobile/jest.config.js` | Incluir los servicios y repositorios en `collectCoverageFrom`; producir texto, LCOV y HTML; excluir `__tests__`, fixtures y código generado |
| CI | `.github/workflows/ci.yml`, job `mobile-tests` | Ejecutar `npm run test:coverage --workspace=apps/mobile -- --runInBand` y subir el directorio de cobertura |
| CI / artefactos | `actions/upload-artifact@v4` | Publicar el artefacto `mobile-coverage-report` con retención predeterminada de Actions |

## Contrato y datos

- Endpoints, autenticación y permisos: no aplica.
- Validación/Form Requests, Actions, Resources y Policies: no aplica.
- DBR relacionada, migraciones, `BaseModel`, auditoría y SoftDeletes: no aplica.
- Errores y compatibilidad: `npm ci` sigue usando el lockfile. Si Jest falla, el job permanece rojo incluso si el paso `always()` sube el reporte parcial; si no existe cobertura, la carga ignora la ruta ausente.

## Seguridad, offline y operación

No se transmiten datos de usuario ni cobertura a servicios externos. El reporte contiene rutas de código y métricas; queda como artefacto de GitHub Actions, sujeto a la retención del workflow. Se conserva `permissions: contents: read` y no se agregan secretos.

## Mapeo de criterios a pruebas

| Criterio | Prueba automatizada/verificación | App/ubicación |
|---|---|---|
| CA-01 | Job `mobile-tests` ejecuta Jest con `--coverage`; resumen con porcentajes y tabla de archivos en la salida del job | GitHub Actions, `.github/workflows/ci.yml` |
| CA-02 | Acción `upload-artifact@v4` guarda `coverage/lcov-report/` y `coverage/lcov.info`; verificar presencia del artifact descargable en una ejecución | GitHub Actions, job `mobile-tests` |
| CA-03 | Jest mantiene código de salida distinto de cero ante cualquier test fallido; upload con `always()` no altera el resultado del job | `npm run test:coverage --workspace=apps/mobile -- --runInBand` |
| CA-04 | Revisar `coverage/lcov-report/index.html` y `coverage/lcov.info`: solo rutas `src/services/` y `src/repositories/` más ViewModels actualmente configurados, nunca `node_modules` ni `__tests__` | Jest, `apps/mobile/jest.config.js` |

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | Jest y `actions/upload-artifact@v4` ya están en uso; no se añade tecnología ni dependencia. |
| II. La spec manda | Sí | Cambios limitados a los CA aprobados de `mobile-011`; cambios en configuración Jest y workflow, sin lógica funcional. |
| III. Lógica separada de la interfaz | Sí | No se cambia lógica; se mide la capa de servicios/repositorios existente. |
| IV. Un test por criterio | Sí, con evidencia CI | CA-01 a CA-04 se verifican por ejecución del job, salida de Jest, publicación del artefacto y contenido del reporte. |
| V. Una sola fuente de verdad para los datos | Sí | Sin acceso a BD ni cambios de datos/esquema. |
| VI. Código en inglés, personas en español | Sí | Configuración y nombres técnicos en inglés; spec/plan en español. |

## Riesgos y decisiones

- ADR requerido/aprobado: no se requiere; se usan herramientas existentes.
- La cobertura puede revelar servicios sin pruebas o porcentajes bajos; esta iteración informa la línea base y no bloquea por porcentaje.
- El artefacto también puede existir en una ejecución fallida si Jest alcanza a generarlo; los logs mantienen el estado real del job como resultado autoritativo.
- No se cambia `apps/mobile/package.json`, el lockfile, workflows de otras apps ni servicios de producción.

## Orden y aprobación

1. Aprobar este plan técnico.
2. Crear tareas atómicas para actualizar Jest, modificar el job móvil, verificar la cobertura y actualizar documentación SDD.
3. Implementar solo después de aprobar las tasks.
4. Ejecutar `/verify` para Mobile y revisar `git diff --check`; conservar evidencia de Jest, el reporte y el artefacto Actions.

Responsable de aprobación técnica: pendiente de identificar según acuerdo del equipo. Aprobación funcional: usuario solicitante.

## Evidencia de implementación

- La corrida local produjo `lcov-report/index.html` y `lcov.info`; los 16 archivos de `src/services/` y `src/repositories/` aparecen en LCOV.
- La [ejecución 42703309235](https://github.com/jonathan241210/integradora101/actions/runs/42703309235) publicó `mobile-coverage-report`; se descargó y verificó la presencia del HTML y LCOV.
- El job móvil quedó rojo: tres suites/tests fallidos y varios umbrales de cobertura preexistentes bajo 80%. El upload del artefacto pasó y el fallo no se ocultó. CA-03 se cumple.

## Enmienda técnica aprobada — umbral de cobertura del 80 %

- Estado: aprobado por el usuario solicitante, 2026-11-09.
- La decisión funcional de conservar el 80 % está aprobada por el usuario el 2026-11-09.
- Esta enmienda sustituye la decisión anterior de no agregar umbrales nuevos. No modifica el workflow para ocultar fallos ni reduce umbrales existentes.

### Diseño propuesto

Jest conservará los reportes de texto, LCOV y HTML. En `apps/mobile/jest.config.js`, se exigirán 80 % o más en sentencias, ramas, funciones y líneas para cada archivo medido en `src/services/**/*.ts` y `src/repositories/**/*.ts`. Se mantiene el requisito existente de 80 % para cada ViewModel medido. La suite completa y el gate de cobertura deben aprobar para que el job móvil quede verde.

El artefacto `mobile-coverage-report` seguirá cargándose con `if: always()` para diagnóstico. Su presencia no cambia la conclusión del job: un test fallido o una métrica menor a 80 % mantiene el job en rojo.

### Línea base observada

| Área | Sentencias | Ramas | Funciones | Líneas |
|---|---:|---:|---:|---:|
| Servicios | 85,04 % | 72,00 % | 88,88 % | 85,00 % |
| Repositorios | 69,42 % | 56,42 % | 77,77 % | 72,94 % |
| Todos los archivos medidos | 78,93 % | 63,31 % | 83,43 % | 81,64 % |

Archivos de servicio bajo la meta observada: `scanQueue.ts` en ramas (70,58 %) y `zooSyncService.ts` en sentencias/líneas (78,57 %) y ramas (50 %). En repositorios se requieren pruebas adicionales, en especial para `apiAnimalRepository.ts`, `apiZooRepository.ts`, `httpAuthRepository.ts`, `index.ts`, `progressRepository.ts`, `sharedProgress.ts`, y archivos sin cobertura reportada como `authRepository.ts` y `userRepository.ts`.

Los ViewModels ya cubiertos por un umbral existente que fallaron incluyen `useVisitorProfile.ts`, `useCameraPermissionSetting.ts`, `useVisitorProgress.ts`, `useQrScanViewModel.ts`, `useArTourViewModel.ts` y `useLocationViewModel.ts`; `src/repositories/index.ts` también quedó debajo de 80 % en varias métricas.

### Pruebas y archivos previstos

| Área | Trabajo propuesto | Evidencia |
|---|---|---|
| Servicios | Completar pruebas unitarias de `scanQueue`, `zooSyncService` y cualquier archivo del patrón que no llegue a 80 % por métrica. | Jest y reporte HTML/LCOV por archivo |
| Repositorios | Añadir casos de éxito, errores, respuestas parciales y ramas opcionales para cada archivo medido; cubrir también los módulos actualmente en 0 %. | Jest y reporte HTML/LCOV por archivo |
| ViewModels | Cubrir las ramas faltantes de los ViewModels que ya incumplen el umbral, sin bajar el requisito. | Jest con gate existente |
| Mapa | Corregir los fallos de CA-07 y CA-17 en el marco de la spec aprobada `mobile-007`, actualizando su plan y tasks. | `mapAccessibility.test.tsx`, `architecture.test.ts`, `mapViewport.test.tsx` |
| CI | Mantener la ejecución con cobertura y el artifact de diagnóstico; un job móvil exitoso acredita suite y umbrales aprobados. | GitHub Actions y artifact descargable |

### Verificación de CA-07 y CA-17 ya aprobados

La suite actual falla porque centrar ubicación no aplica `CENTER_LOCATION_ZOOM` aunque la prueba y el plan V2.2 lo esperan. Además, los tests de arquitectura detectan colores literales dentro de componentes y pantallas. La propuesta es resolver ambas divergencias en la feature aprobada `mobile-007`, no cambiar esos criterios ni debilitar sus pruebas. Para reemplazar transparencias se añadirán únicamente los tokens semánticos que falten a `packages/tokens/index.ts`; los componentes y pantallas consumirán tokens en vez de literales hexadecimales o `rgba()`.

### Constitution Check de la enmienda

| Principio | Cumple | Evidencia propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | No se agregan dependencias ni servicios externos. |
| II. La spec manda | Sí | El umbral queda en CA-05/RN-03; el arreglo de mapa sigue CA-07/CA-17 de `mobile-007`. |
| III. Separación de lógica e interfaz | Sí | Las nuevas pruebas ejercitan servicios/repositorios; no se traslada lógica a Views. |
| IV. Un test por criterio | Sí | Se amplían suites de servicios, repositorios, ViewModels y los tests existentes de mapa. |
| V. Una fuente de verdad | Sí | No hay cambios de datos o esquema; paleta semántica central en `@arca/tokens`. |
| VI. Idiomas | Sí | Código y nombres técnicos en inglés; documentación en español. |

### Orden de ejecución

1. Añadir casos de prueba y cambios mínimos para satisfacer CA-05 y los criterios de mapa existentes.
2. Ejecutar `/verify` para Mobile y la suite con cobertura.
3. Revisar las cuatro métricas por archivo y el reporte descargable.
4. Confirmar una ejecución verde de Actions sin reducir el 80 %.

## Implementación local de la enmienda — 2026-11-09

Se reutilizaron y completaron las tres suites de repositorios ya preparadas y se añadieron cuatro suites para ViewModels, sensores/navegación, repositorios HTTP y servicios. No se modificó código de aplicación. Los callbacks de red y sensores se controlan con promesas y mocks; se comprueban resultados observables sin requerir dispositivos ni conexión real.

| Suite | Casos y módulos principales |
|---|---|
| `repositoriesCore.coverage.test.ts` | Repositorios locales, selección API/mock por ambiente, validaciones de autenticación, almacenamiento y caché compartida |
| `apiRepositories.coverage.test.ts` | Caché fresca/vencida/corrupta, revalidación, respuestas incompletas, errores HTTP y disco lleno |
| `mappers.coverage.test.ts` | Categorías, campos opcionales y coordenadas de especies, eventos y recintos |
| `viewmodelBranches.coverage.test.tsx` | Cámara, perfil, progreso y QR; cierre de sesión, desmontaje, rechazos y escaneos duplicados |
| `navigationSensors.coverage.test.tsx` | GPS sin precisión, brújula inválida/no disponible, recorrido vacío, destinos eliminados y llegada |
| `httpRepositories.coverage.test.ts` | Mapeos de errores y tokens, recuperación de cuenta, catálogos y progreso remoto |
| `services.coverage.test.ts` | Sincronización real/mock, fallos y reintentos de persistencia, cola inválida y UUID de dispositivo |

Se agregaron los globs de servicios y repositorios a `coverageThreshold`, cada uno con 80 % en sentencias, ramas, funciones y líneas. Se conservan los umbrales previos de ViewModels y repositorios específicos. La suite con cobertura aprobó 310 pruebas y todos los gates por archivo. TypeScript con la configuración completa de Mobile aprobó sin excluir pruebas.

El reporte lista `authRepository.ts` (interfaces) y `userRepository.ts` (reexportación) en 0 %, pero carecen de contadores de sentencias/ramas/funciones instrumentados; Jest no los considera incumplimientos. No se excluyeron de `collectCoverageFrom`; la reexportación se verifica en la suite de repositorios locales.

Evidencia: `apps/mobile/coverage/lcov.info` y `apps/mobile/coverage/lcov-report/index.html`, ignorados por Git; `/tmp/arca-mobile-coverage-final.log`. Pendiente evidencia remota de la nueva versión.
