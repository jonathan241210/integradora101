# Plan técnico · 007 · ci-workflow

- Spec: `apps/api/specs/007-ci-workflow.md`
- Estado de spec: Aprobada
- Aprobación del plan: aprobada por el usuario solicitante el 2026-10-26
- Actualización del plan: workflow manual de fallo controlado solicitado y autorizado por el usuario el 2026-10-26
- Responsable técnico: pendiente de revisión del equipo

## Diseño de solución

Crear un workflow de CI en `.github/workflows/ci.yml` con nombre y pasos visibles en español. Se activa en `push` y `pull_request` hacia `main` y `DevOps`. Define permisos mínimos de solo lectura y dos jobs independientes: PHPUnit Unit en PHP 8.4 y Jest móvil usando Node.js y el lockfile compartido del monorepo. Añadir un segundo archivo, `.github/workflows/prueba-fallo-controlado.yml`, activado únicamente por `workflow_dispatch` y con un paso explícito que termina con código 1.

La API instalará dependencias con `composer install` desde `apps/api/src` usando `composer.lock`, y ejecutará únicamente `vendor/bin/phpunit --testsuite=Unit`. No se define `.env`, credenciales, servicio MySQL ni variables de conexión. Mobile instalará desde la raíz con `npm ci`, que consume el `package-lock.json` compartido conforme al README móvil, y ejecutará `npm test --workspace apps/mobile -- --runInBand`.

Los jobs propagan los códigos de salida originales para que cualquier instalación o prueba fallida marque el job y el workflow como fallidos. El workflow demostrativo imprime que el fallo es deliberado y sale con código 1; no responde a push o pull request. No se suben artefactos, capturas ni secretos.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| API | `.github/workflows/ci.yml`; `apps/api/src/composer.lock` como fuente de dependencias | Ejecutar suite PHPUnit `Unit` en PHP 8.4, aislada de la base de datos |
| Mobile / monorepo | `.github/workflows/ci.yml`; `package-lock.json` compartido | Instalar workspace y ejecutar Jest móvil en modo CI |
| Evidencia de fallo | `.github/workflows/prueba-fallo-controlado.yml` | Permitir iniciar manualmente una ejecución que falla de forma intencional |
| Documentación | `apps/api/specs/007-ci-workflow.md`, `apps/api/plan/007-ci-workflow.md`, `apps/api/tasks/007-ci-workflow.md` | Registrar alcance, decisiones y trazabilidad SDD |

## Contrato y datos

- Endpoints con rutas nombradas, autenticación y permisos: no aplica.
- Validación/Form Requests, Actions, Resources y Policies: no aplica.
- DBR relacionada (`docs/database/requests/DBR-NNN-slug.md`) y estado; migraciones, `BaseModel`, auditoría y SoftDeletes las crea el responsable de BD: no aplica; los jobs no se conectan a bases de datos ni ejecutan migraciones.
- Errores y compatibilidad: cada job falla ante error de instalación o prueba. PHPUnit se ejecuta sobre PHP 8.4, versión requerida por las dependencias fijadas en `composer.lock`; Mobile usa Node 22 LTS. La ejecución no requiere archivos `.env` ni secretos.

## Seguridad, offline y operación

- Permisos del workflow limitados a `contents: read`.
- Sin secretos, tokens de base de datos, servicios MySQL o acceso a red privada.
- Sin comandos de migración, seed, despliegue o escritura en repositorio.
- Checkout y acciones oficiales de setup para Node; setup PHP de terceros aprobado por uso técnico en CI, sujeto a fijar la versión estable actual al implementar.
- `npm ci` desde la raíz utiliza el lockfile compartido; no genera ni cambia manifests.
- La ejecución de PHP Unit no ejecuta pruebas Feature que usen `arca_pruebas`.

## Mapeo de criterios a pruebas

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | Ejecuciones de `push` y `pull_request` dirigidas a `main` y `DevOps`; verificar nombres de workflow/jobs en la ejecución | GitHub Actions, `.github/workflows/ci.yml` |
| CA-02 | PHPUnit Unit ejecutado sin variables/secretos DB; suite `Unit` | API, `apps/api/src/tests/Unit/` |
| CA-03 | Jest ejecutado por el comando workspace con `CI=true` | Mobile, `apps/mobile/__tests__/` |
| CA-04 | Los comandos de PHPUnit y Jest propagan fallo al job; inspección de estado del job en ejecuciones de prueba | GitHub Actions, ambos jobs |
| CA-05 | Revisión automatizada de los pasos del workflow y de su contexto sin credenciales DB; confirmación en logs de que no se ejecutan migraciones | GitHub Actions, `.github/workflows/ci.yml` |
| CA-06 | Ejecutar manualmente el workflow y observar el job fallido con mensaje explícito | GitHub Actions, `.github/workflows/prueba-fallo-controlado.yml` |

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | Usa runtimes ya declarados por API y Mobile; no agrega dependencia a las aplicaciones. Las acciones auxiliares solo configuran CI. |
| II. La spec manda | Sí, sujeto a aprobación del plan y tasks | Spec 007 aprobada; implementación queda bloqueada hasta aprobar este plan y sus tasks. |
| III. Lógica separada de la interfaz | Sí | No cambia lógica ni interfaces de apps. |
| IV. Un test por criterio | Propuesto | El workflow ejecuta Unit y Jest y valida su estado; las CA de disparadores/aislamiento se evidencian desde ejecuciones y configuración. El equipo debe aceptar estas verificaciones de CI como pruebas del propio workflow. |
| V. Una sola fuente de verdad para los datos | Sí | No hay acceso ni cambios de datos o esquema. |
| VI. Código en inglés, personas en español | Sí | Nombre, jobs y pasos visibles en español; archivo y sintaxis siguen convenciones técnicas de GitHub. |

Ninguna excepción se implementa sin revisión y acuerdo requeridos. Si algo no cumple, detenerse y resolverlo antes del código.

## Riesgos y decisiones

- ADR requerido/aprobado: no se agrega tecnología de aplicación ni dependencia del producto. GitHub Actions y acciones auxiliares se limitan a CI; confirmar en revisión técnica si el equipo exige un ADR para esta automatización.
- Alternativas y mitigaciones:
  - Las pruebas Feature requieren una estrategia MySQL aprobada; se excluyen para evitar acceso a Aiven/producción o migraciones no autorizadas.
  - La suite móvil puede descubrir fallos de entorno limpio; el job debe mostrarlos sin enmascararlos.
  - El lockfile móvil es el compartido en la raíz (`package-lock.json`), según `apps/mobile/README.md`; no existe lockfile propio de Mobile.

## Orden y aprobación

1. Revisar y aprobar este plan técnico, en particular que las ejecuciones CI sirvan como validación automatizada de CA-01, CA-04 y CA-05.
2. Tras aprobación, crear tasks atómicas para el workflow, su validación y verificación de jobs.
3. Implementar únicamente después de aprobación de plan y tasks.
4. Aprobar técnicamente por el equipo; la aceptación funcional de la spec ya fue dada por el usuario solicitante el 2026-10-26.
