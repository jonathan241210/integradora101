# Plan técnico · 012 · monorepo-ci-validation

- Spec: `apps/mobile/specs/012-monorepo-ci-validation.md`
- Estado de spec: Aprobada
- Estado del plan: Aprobado — usuario solicitante, 2026-11-09
- Solicitante y aprobador: usuario solicitante

## Diseño de solución

Ampliar `.github/workflows/ci.yml` con jobs independientes para pruebas, tipos y build, reutilizando scripts y herramientas existentes. Cada job tendrá su propio checkout, instalación reproducible y código de salida. La ejecución seguirá activándose en push y pull request a `main` y `DevOps`.

| Job | Comando principal | Resultado comprobable |
|---|---|---|
| `api-unit` (existente) | `vendor/bin/phpunit --testsuite=Unit` en `apps/api/src` | Suite unitaria con PHP 8.4, tras Composer install sin scripts |
| `mobile-tests` (existente) | `npm run test:coverage --workspace=apps/mobile -- --runInBand` | Jest y umbrales actuales; artefacto de cobertura diagnóstico |
| `dashboard-types` (nuevo) | `npm run types --workspace=@arca/dashboard` | Script de tipos existente |
| `dashboard-tests` (nuevo) | `npm run test --workspace=@arca/dashboard` | Suite Vitest existente |
| `dashboard-build` (existente) | `npm run build --workspace=@arca/dashboard` | TypeScript y Vite; validación y ZIP existentes |
| `pwa-tests` (nuevo) | `npm run test --workspace=apps/pwa` | Suite Vitest existente |
| `pwa-build` (nuevo) | `npm run build --workspace=apps/pwa` | TypeScript y Vite; comprobación de `apps/pwa/dist/index.html` |

Se eliminará `needs: [api-unit, mobile-tests]` de `dashboard-build` para obtener evidencia de build incluso cuando fallen otras apps. Ningún job usará `continue-on-error`; cada fallo contribuirá al resultado fallido del workflow. Los jobs independientes seguirán ejecutándose.

Los jobs Node usarán Node.js 22, `npm ci`, caché npm con `package-lock.json`, checkout y setup-node en las versiones ya usadas. Se fijará timeout de 20 minutos y `CI: true` para las pruebas nuevas. Los artefactos existentes de Dashboard y Mobile conservarán su comportamiento.

## Cambios por área

| Área | Archivo | Cambio |
|---|---|---|
| CI transversal | `.github/workflows/ci.yml` | Agregar cuatro jobs y desacoplar build de Dashboard |
| SDD | `apps/mobile/{specs,plan,tasks}/012-monorepo-ci-validation.md` | Aprobaciones, trazabilidad y evidencia de verificación |

## Contrato y datos

No cambian rutas, endpoints, autenticación, Actions, Models, interfaz, offline ni contratos de clientes. No hay DBR ni migraciones: la API conserva exclusivamente la suite Unit y no se incorpora acceso a BD. Las dependencias se instalan desde los lockfiles existentes, sin actualizarlos.

## Seguridad y operación

Se conserva `permissions: contents: read`; no se añaden secretos, servicios ni despliegues. Composer mantiene `--no-scripts` para evitar ejecutar scripts de inicialización. El workflow no utilizará `arca_zoo` ni ejecutará migraciones. No se agrega un requisito de servidor de aplicación, por lo que no cambia el checklist de despliegue de `infra/README.md`.

## Mapeo de criterios a pruebas

| Criterio | Verificación automatizada prevista | Evidencia |
|---|---|---|
| CA-01 | Job `api-unit`: instalación Composer y PHPUnit con PHP 8.4 | Logs de Actions y resultado del job |
| CA-02 | Jobs `dashboard-types`, `dashboard-tests`, `dashboard-build` | Salidas de TypeScript, Vitest y Vite; ZIP validado |
| CA-03 | Jobs `pwa-tests` y `pwa-build` | Vitest, TypeScript/Vite y `test -f` de salida |
| CA-04 | Job existente `mobile-tests`, con gate Jest y upload `always()` | Resultado del job y artefacto HTML/LCOV |
| CA-05 | Ejecución completa de los siete jobs sin `needs` ni tolerancia a fallos | Estados independientes de los jobs y conclusión agregada de Actions |
| CA-06 | Inicialización automática de Actions muestra permisos de token; instalaciones congeladas validan lockfiles | Logs de permisos e instalación y revisión del diff sin cambios de manifests |

Los jobs ejecutan suites automatizadas existentes; no se añadirán tests que solo reproduzcan la estructura YAML. La verificación local usará los scripts existentes de Dashboard/PWA y la validación de formato del diff. Una validación YAML se realizará con herramientas ya disponibles. Los jobs conservados de API/Mobile se comprobarán en Actions si se publica el cambio; los fallos funcionales preexistentes se registrarán sin ampliar esta feature para corregirlos.

## Constitution Check

| Principio | Cumple | Evidencia prevista |
|---|---|---|
| I. Stack mínimo y portable | Sí | PHP 8.4, Node 22, TypeScript, Vite y runners existentes; sin dependencias nuevas |
| II. La spec manda | Sí | Alcance limitado a CA-01..CA-06 de la spec aprobada `mobile-012` |
| III. Lógica separada de la interfaz | Sí | Solo CI y documentos; sin cambios de lógica de aplicación |
| IV. Un test por criterio | Sí | Mapeo anterior a suites y verificaciones automáticas de los jobs; fallos conservan salida distinta de cero |
| V. Una fuente de verdad | Sí | Sin datos, conexiones ni esquema nuevos; API Unit sin migraciones |
| VI. Idiomas | Sí | IDs y comandos en inglés; nombres visibles y documentación en español |

## Riesgos y decisiones

- Los nuevos jobs pueden revelar fallos actuales de tests o builds; no se reducirán requisitos para ocultarlos.
- Instalar el monorepo por job consume más tiempo, a cambio de resultados independientes; se reutiliza caché npm.
- PWA comprueba tipos durante `build` (`tsc -b`); no tiene un script `types` separado.
- No se requiere ADR porque no se incorporan herramientas ni dependencias.
- Web y E2E quedan pendientes de una futura spec, como se aprobó funcionalmente.
- Otros workflows quedan fuera de esta modificación; el resultado de este workflow no certifica el resto de Actions del repositorio.

## Orden y aprobación

1. Aprobar este plan técnico.
2. Redactar y aprobar tasks trazables antes de implementar, conforme al flujo SDD.
3. Modificar el workflow y ejecutar las verificaciones locales disponibles sin instalar dependencias.
4. Registrar resultados y, si se publica el cambio, evidencia de la corrida de Actions.

Aprobación técnica: usuario solicitante, 2026-11-09, en este chat. Workflow ampliado localmente; verificación remota pendiente.

## Evidencia local

La implementación sigue el diseño de siete jobs. Dashboard y PWA aprobaron sus verificaciones locales; API Unit también aprobó. Los resultados y límites están documentados en `tasks/012-monorepo-ci-validation.md`. No se han instalado dependencias ni se han ejecutado migraciones. La corrida remota queda pendiente.
