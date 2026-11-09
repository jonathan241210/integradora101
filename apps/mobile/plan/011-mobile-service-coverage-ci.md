# Plan técnico · 011 · mobile-service-coverage-ci

- Spec: `apps/mobile/specs/011-mobile-service-coverage-ci.md`
- Estado de spec: Aprobada — usuario solicitante, 2026-11-09
- Estado del plan: Aprobado — usuario solicitante, 2026-11-09
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
